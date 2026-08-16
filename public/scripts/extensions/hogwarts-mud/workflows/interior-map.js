import {
    getInteriorMount,
} from '../domain/interior-mount.js';
import {
    adoptEnglishFields,
} from '../domain/model-language-adoption.js';

function adoptInteriorMapLanguage(
    payload,
) {
    const diagnostics = [];
    const root =
        adoptEnglishFields(
            payload || {},
            {
                taskId:
                    'interior_cartographer',
                recordId:
                    payload?.id,
                requiredFields: [
                    'nameEn',
                ],
            },
        );
    diagnostics.push(
        ...root.diagnostics,
    );
    const levels =
        (
            Array.isArray(
                payload?.levels,
            )
                ? payload.levels
                : []
        )
            .map(level => {
                const result =
                    adoptEnglishFields(
                        level,
                        {
                            taskId:
                                'interior_cartographer',
                            recordId:
                                level?.id,
                            requiredFields: [
                                'nameEn',
                            ],
                        },
                    );
                diagnostics.push(
                    ...result
                        .diagnostics,
                );
                return result.admissible
                    ? result.accepted
                    : null;
            })
            .filter(Boolean);
    const rooms =
        (
            Array.isArray(
                payload?.rooms,
            )
                ? payload.rooms
                : []
        )
            .map(room => {
                const result =
                    adoptEnglishFields(
                        room,
                        {
                            taskId:
                                'interior_cartographer',
                            recordId:
                                room?.id,
                            requiredFields: [
                                'nameEn',
                                'descriptionEn',
                            ],
                        },
                    );
                diagnostics.push(
                    ...result
                        .diagnostics,
                );
                return result.admissible
                    ? result.accepted
                    : null;
            })
            .filter(Boolean);
    const accepted = {
        ...root.accepted,
        levels,
        rooms,
    };
    delete accepted.display;
    return {
        payload: accepted,
        diagnostics,
        admissible:
            root.admissible &&
            levels.length ===
                (
                    payload?.levels ||
                    []
                ).length &&
            rooms.length ===
                (
                    payload?.rooms ||
                    []
                ).length,
    };
}

export function createInteriorMapWorkflow(ports) {
    const {
        applyGeneratedInteriorMap,
        applySystemPrompt,
        enterBoundInteriorMap,
        extractRoleResponseText,
        getContext,
        getInspectorMapScope,
        getInteriorMapRequest,
        getLocalMapDefinition,
        getMudState,
        jobRegistry,
        parseJsonObject,
        renderAll,
        resetInspectorMapScope,
        resolveRoleSlots,
        sendModelTaskRequest,
        validateGeneratedInteriorMap,
    } = ports;

    function createInteriorMapPrompt(
        state,
        request,
    ) {
        return [
            {
                role: 'system',
                content: `You are the medium-tier Interior Cartographer for a persistent Harry Potter RPG. Create one stable local topology for the supplied container and return exactly one JSON object with no Markdown.

Rules:
- Use exactly the requested map ID. This map is generated once and then persisted.
- Model only the physical interior of the supplied container, not the surrounding castle, station, street, or world.
- Preserve the committed scene facts and visible furnishings. Do not create characters, items, clues, secrets, plot events, schedules, relationships, or state changes.
- Use 1–4 levels and 2–16 connected rooms. Every room must be reachable from currentRoomId.
- Room IDs and level IDs must be lowercase snake_case.
- Coordinates must be between 5 and 95.
- Choose currentRoomId as the room where the committed scene is currently taking place.
- For a dormitory, beds are furnishings within a dorm room rather than separate map rooms. Include only useful stable spaces such as the stair landing, the relevant year dormitory, a washroom, or a shared storage alcove when supported.

Schema:
{
  "version":2,
  "id":"exact_requested_map_id",
  "nameEn":"English interior map name",
  "currentLevelId":"level_id",
  "currentRoomId":"room_id",
  "levels":[
    {"id":"level_id","nameEn":"English level name","z":0}
  ],
  "rooms":[
    {
      "id":"room_id",
      "nameEn":"English room name",
      "levelId":"level_id",
      "kind":"room|landing|dormitory|washroom|storage|corridor",
      "descriptionEn":"concrete stable physical description",
      "x":50,
      "y":50,
      "access":"public|student|house_gryffindor|staff",
      "aliases":["optional alias"]
    }
  ],
  "exits":[
    {
      "from":"room_id",
      "to":"room_id",
      "direction":"up|down|north|south|east|west|passage",
      "kind":"stairs|door|corridor|passage",
      "minutes":1
    }
  ]
}`,
            },
            {
                role: 'user',
                content: JSON.stringify({
                    requestedMapId:
                    request
                        .suggestedMapId,
                    container: request,
                    currentScene: {
                        id:
                        state.scene?.id,
                        nameEn:
                        state.scene
                            ?.nameEn,
                        summaryEn:
                        state.scene
                            ?.summaryEn,
                        openingFactsEn:
                        getContext().chat
                            .slice(-4)
                            .filter(message =>
                                !message
                                    .is_user)
                            .flatMap(message =>
                                (
                                    message.extra
                                        ?.hogwartsMud
                                        ?.segments ||
                                    []
                                ).filter(
                                    segment =>
                                        segment.type ===
                                        'narration',
                                ).map(
                                    segment =>
                                        segment
                                            .textEn,
                                ))
                            .slice(-4),
                    },
                }),
            },
        ];
    }

    async function generateInteriorMapPackage(
        roleSlot,
        state,
        request,
    ) {
        const prompt =
        createInteriorMapPrompt(
            state,
            request,
        );
        const response =
            await sendModelTaskRequest(
                roleSlot,
                prompt,
                {
                    json: true,
                },
            );
        const adoption =
            adoptInteriorMapLanguage(
                parseJsonObject(
                    extractRoleResponseText(
                        response,
                    ),
                ),
            );
        if (!adoption.admissible) {
            return {
                languageSkipped: true,
                diagnostics:
                    adoption
                        .diagnostics,
            };
        }
        const validation =
            validateGeneratedInteriorMap(
                adoption.payload,
                state,
                request,
            );
        if (!validation.valid) {
            throw new Error(
                validation.errors
                    .join('；'),
            );
        }
        return adoption.payload;
    }

    async function ensureCurrentInteriorMap() {
        if (jobRegistry.interiorMap) {
            return jobRegistry.interiorMap;
        }
        const context = getContext();
        let state = getMudState();
        const activeMap =
        getLocalMapDefinition(
            state.map?.activeMapId,
            state.map,
        );
        let inspectorScopeChanged =
        false;
        const activeMount =
            getInteriorMount(
                activeMap,
            );
        if (
            activeMount &&
        getInspectorMapScope() ===
            activeMount.parentMapId
        ) {
            resetInspectorMapScope();
            inspectorScopeChanged =
            true;
        }
        const request =
        getInteriorMapRequest(state);
        if (!request) {
            if (inspectorScopeChanged) {
                renderAll();
            }
            return state;
        }
        if (
            request.status ===
            'ready'
        ) {
            const next =
            enterBoundInteriorMap(
                state,
                request,
            );
            next.map.interiorMapGeneration = {
                status: 'ready',
                error: '',
                bindingKey:
                request.bindingKey,
                mapId:
                request.boundMapId,
                settledAt:
                new Date()
                    .toISOString(),
            };
            context.chatMetadata
                .hogwartsMud = next;
            resetInspectorMapScope();
            await context.saveMetadata();
            applySystemPrompt();
            renderAll();
            return next;
        }
        if (
            request.status ===
                'preset_missing'
        ) {
            state.map
                .interiorMapGeneration = {
                    status: 'failed',
                    error:
                    `Registered preset interior ${request.presetInteriorMapId} is missing.`,
                    bindingKey:
                    request.bindingKey,
                    mapId:
                    request
                        .presetInteriorMapId,
                    settledAt:
                    new Date()
                        .toISOString(),
                };
            await context.saveMetadata();
            renderAll();
            return null;
        }
        const previousGeneration =
        state.map
            ?.interiorMapGeneration;
        if (
            previousGeneration
                ?.status === 'failed' ||
            previousGeneration
                ?.status ===
                'language_skipped'
        ) {
            if (
                previousGeneration
                    ?.bindingKey ===
                request.bindingKey
            ) {
                return null;
            }
        }
        const slots =
        resolveRoleSlots(
            state.modelSlots,
        );
        if (!slots.medium.profileId) {
            state.map
                .interiorMapGeneration = {
                    status:
                'waiting_for_profile',
                    error:
                '未配置中档 Connection Profile。',
                    bindingKey:
                request.bindingKey,
                    mapId: '',
                    settledAt: null,
                };
            await context.saveMetadata();
            renderAll();
            return null;
        }
        jobRegistry.interiorMap =
        (async () => {
            state = getMudState();
            state.map
                .interiorMapGeneration = {
                    status: 'generating',
                    error: '',
                    bindingKey:
                    request.bindingKey,
                    mapId: '',
                    requestedAt:
                    new Date()
                        .toISOString(),
                    settledAt: null,
                };
            await context.saveMetadata();
            renderAll();
            try {
                const generatedMap =
                    await generateInteriorMapPackage(
                        slots.medium,
                        state,
                        request,
                    );
                if (
                    generatedMap
                        ?.languageSkipped
                ) {
                    state =
                        getMudState();
                    state.map
                        .interiorMapGeneration = {
                            status:
                                'language_skipped',
                            error: '',
                            bindingKey:
                                request
                                    .bindingKey,
                            mapId: '',
                            languageMismatchCount:
                                generatedMap
                                    .diagnostics
                                    .length,
                            settledAt:
                                new Date()
                                    .toISOString(),
                        };
                    await context
                        .saveMetadata();
                    renderAll();
                    return null;
                }
                const next =
                    applyGeneratedInteriorMap(
                        state,
                        generatedMap,
                        request,
                    );
                next.map
                    .interiorMapGeneration = {
                        status: 'ready',
                        error: '',
                        bindingKey:
                        request.bindingKey,
                        mapId:
                        generatedMap.id,
                        settledAt:
                        new Date()
                            .toISOString(),
                    };
                context.chatMetadata
                    .hogwartsMud = next;
                resetInspectorMapScope();
                await context
                    .saveMetadata();
                applySystemPrompt();
                renderAll();
                return next;
            } catch (error) {
                state = getMudState();
                state.map
                    .interiorMapGeneration = {
                        status: 'failed',
                        error:
                        String(
                            error?.cause
                                ?.message ||
                            error?.message ||
                            error,
                        ),
                        bindingKey:
                        request.bindingKey,
                        mapId: '',
                        settledAt:
                        new Date()
                            .toISOString(),
                    };
                await context
                    .saveMetadata();
                renderAll();
                console.warn(
                    '[Hogwarts MUD] Interior cartographer failed; keeping the committed parent room',
                    error,
                );
                return null;
            }
        })().finally(() => {
            jobRegistry.interiorMap =
                null;
            renderAll();
        });
        return jobRegistry.interiorMap;
    }

    return {
        createInteriorMapPrompt,
        generateInteriorMapPackage,
        ensureCurrentInteriorMap,
    };
}
