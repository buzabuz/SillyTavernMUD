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
        getSettings,
        jobRegistry,
        normalizeGeneratedInteriorMapLabels,
        parseJsonObject,
        renderAll,
        resetInspectorMapScope,
        resolveRoleSlots,
        sendRoleRequest,
        translateOpeningValues,
        validateGeneratedInteriorMap,
    } = ports;

    async function localizeGeneratedInteriorMapPackage(
        generatedMap,
    ) {
        if (!getSettings().translationEnabled) {
            return generatedMap;
        }
        const values = [
            generatedMap.nameEn,
            ...generatedMap.levels
                .map(level =>
                    level.nameEn),
            ...generatedMap.rooms
                .flatMap(room => [
                    room.nameEn,
                    room.descriptionEn,
                ]),
        ];
        const translated =
        await translateOpeningValues(
            values,
        );
        let cursor = 0;
        return {
            ...generatedMap,
            display: {
                mapName:
                translated[cursor++],
                levelNames:
                generatedMap.levels
                    .map(() =>
                        translated[
                            cursor++
                        ]),
                roomNames:
                generatedMap.rooms
                    .map(() => {
                        const name =
                            translated[
                                cursor++
                            ];
                        cursor += 1;
                        return name;
                    }),
            },
        };
    }

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
  "version":1,
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
        let response =
        await sendRoleRequest(
            roleSlot,
            prompt,
            { json: true },
        );
        let raw =
        extractRoleResponseText(
            response,
        );
        let lastError = null;
        for (
            let attempt = 0;
            attempt < 2;
            attempt++
        ) {
            try {
                let payload =
                parseJsonObject(raw);
                const validation =
                validateGeneratedInteriorMap(
                    payload,
                    state,
                    request,
                );
                if (!validation.valid) {
                    throw new Error(
                        validation.errors
                            .join('；'),
                    );
                }
                try {
                    payload =
                    await localizeGeneratedInteriorMapPackage(
                        payload,
                    );
                } catch (
                    translationError
                ) {
                    console.warn(
                        '[Hogwarts MUD] Interior map translation failed; using English labels',
                        translationError,
                    );
                }
                return payload;
            } catch (error) {
                lastError = error;
                if (attempt > 0) {
                    break;
                }
                response =
                await sendRoleRequest(
                    roleSlot,
                    [
                        {
                            role:
                                'system',
                            content:
                                'Repair the interior map JSON. Use the exact requested map ID, 1–4 levels, 2–16 fully connected rooms, valid snake_case IDs, and coordinates from 5 to 95. Do not add characters, items, events, or facts. Return JSON only.',
                        },
                        {
                            role: 'user',
                            content:
                                JSON.stringify({
                                    validationError:
                                        String(
                                            error
                                                ?.message ||
                                            error,
                                        ),
                                    invalidOutput:
                                        raw,
                                    originalRequest:
                                        JSON.parse(
                                            prompt[1]
                                                .content,
                                        ),
                                    requiredSchema:
                                        prompt[0]
                                            .content,
                                }),
                        },
                    ],
                    { json: true },
                );
                raw =
                extractRoleResponseText(
                    response,
                );
            }
        }
        throw new Error(
            `中档室内制图连续两次无效：${String(lastError?.message || lastError)}`,
        );
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
        if (
            activeMap
                ?.sourceContainerKey &&
        getInspectorMapScope() ===
            activeMap.parentMapId
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
            let next =
            enterBoundInteriorMap(
                state,
                request,
            );
            const normalized =
            normalizeGeneratedInteriorMapLabels(
                next,
            );
            next = normalized.state;
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
        const previousGeneration =
        state.map
            ?.interiorMapGeneration;
        if (
            previousGeneration
                ?.status === 'failed' &&
        previousGeneration
            ?.bindingKey ===
            request.bindingKey
        ) {
            return null;
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
                let next =
                    applyGeneratedInteriorMap(
                        state,
                        generatedMap,
                        request,
                    );
                const normalized =
                    normalizeGeneratedInteriorMapLabels(
                        next,
                    );
                next = normalized.state;
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
        localizeGeneratedInteriorMapPackage,
        createInteriorMapPrompt,
        generateInteriorMapPackage,
        ensureCurrentInteriorMap,
    };
}
