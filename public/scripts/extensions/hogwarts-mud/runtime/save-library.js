import {
    getLocalMapDefinition,
    getMapRooms,
} from '../domain/map-access.js';
import {
    createLocalMapRoomField,
} from '../domain/map-localization.js';
import {
    migrateLanguageAuthorityV1,
} from '../domain/language-authority-migration.js';
import {
    seedLanguageAuthorityTranslations,
} from '../domain/language-authority-seeding.js';
import {
    createCharacterInputLocalizationField,
} from '../domain/localization-candidates.js';

export function repairLoadedModelSlots({
    loadedSlots,
    configuredSlots,
    profiles,
    normalizeModelSlots,
}) {
    const repaired =
        normalizeModelSlots(
            loadedSlots,
        );
    const configured =
        normalizeModelSlots(
            configuredSlots,
        );
    configured.medium.profileId ||=
        configured.low.profileId;
    configured.high.profileId ||=
        configured.medium.profileId;
    const validIds =
        new Set(
            (profiles || [])
                .map(profile =>
                    String(
                        profile?.id ||
                        '',
                    ))
                .filter(id =>
                    id &&
                    !id.startsWith(
                        'hpmud-runtime-',
                    )),
        );
    const repairedRoles = [];
    for (const role of [
        'low',
        'medium',
        'high',
    ]) {
        const currentId =
            repaired[role]
                .profileId;
        if (
            !currentId ||
            validIds.has(currentId)
        ) {
            continue;
        }
        const fallbackId =
            configured[role]
                .profileId;
        if (
            !fallbackId ||
            !validIds.has(fallbackId)
        ) {
            continue;
        }
        repaired[role].profileId =
            fallbackId;
        repairedRoles.push(role);
    }
    return {
        changed:
            repairedRoles.length > 0,
        modelSlots:
            repaired,
        repairedRoles,
    };
}

export function createSaveLibrary(ports) {
    const {
        refs,
        session,
    } = ports;

    const {
        applyNativeRoleSettings,
        applySystemPrompt,
        automaticWork,
        canOpenCurrentSocialSaveReadOnly,
        createDefaultCharacterDraft,
        doNewChat,
        enqueueLocalizationCandidates =
        async () => ({
            enqueued: 0,
            skipped: 0,
            errorCode: '',
        }),
        ensureLocalizedFields =
        async () => [],
        ensureSceneLifecycleState =
        () => false,
        flushPendingMetadataSave =
        async () => {},
        getCharacters,
        getConnectionProfiles,
        getContext,
        getLocalizedField =
        field => ({
            text:
                    field.sourceTextEn ||
                    '',
        }),
        getMudState,
        getRequestHeaders,
        getSettings,
        guardedRewriteTimeline,
        guardedSaveMetadata =
        async () => null,
        idleLocalizationScheduler,
        initials,
        isSaveRevisionBlocked =
        () => false,
        isGameStarted,
        migrateLoadedSocialGraph,
        normalizeCampaign,
        normalizeModelSlots,
        localizationTable,
        projectActorSocialRelationships,
        registerSaveRevisionHead =
        async () => null,
        saveMetadataDebounced =
        () => {},
        saveSettingsDebounced,
        selectCharacterById,
        setAppScreen,
    } = ports;

    const {
        root,
    } = refs;

    function staticText(
        staticKey,
        sourceTextEn,
    ) {
        return getLocalizedField({
            staticKey,
            sourceTextEn,
        }).text ||
            sourceTextEn;
    }

    async function migrateLoadedLanguageAuthority(
        context,
    ) {
        const currentState =
            context
                ?.chatMetadata
                ?.hogwartsMud;
        if (
            !currentState ||
            currentState
                .languageAuthorityVersion ===
                1
        ) {
            return {
                changed: false,
                report: null,
                seed: null,
            };
        }
        if (
            typeof guardedRewriteTimeline !==
                'function' ||
            !localizationTable
        ) {
            throw new TypeError(
                'Language Authority migration ports are unavailable.',
            );
        }
        const currentChat =
            structuredClone(
                context.chat,
            );
        const plan =
            migrateLanguageAuthorityV1({
                worldState:
                    currentState,
                chat:
                    currentChat,
            });
        const translationProvider =
            String(
                getSettings?.()
                    ?.translationProvider ||
                'local',
            );
        const seed =
            await seedLanguageAuthorityTranslations({
                timelineEpoch:
                    currentState
                        .timelineEpoch,
                candidates:
                    plan
                        .translationCandidates,
                localizationTable,
                providerId:
                    translationProvider ===
                    'off'
                        ? 'local'
                        : translationProvider,
            });
        await guardedRewriteTimeline({
            currentState:
                structuredClone(
                    currentState,
                ),
            nextState:
                plan.nextState,
            currentChat,
            nextChat:
                plan.nextChat,
            source:
                'language_authority_v1',
            changedDomains: [
                'calendar',
                'character',
                'item',
                'language_authority',
                'map',
                'material',
                'message',
                'spell',
                'timeline',
            ],
        });
        return {
            changed: true,
            report:
                plan.report,
            seed,
        };
    }

    async function migrateLoadedWorld(
        context,
    ) {
        const state =
            context
                ?.chatMetadata
                ?.hogwartsMud;
        if (
            !state ||
            !ensureSceneLifecycleState(
                state,
            )
        ) {
            return false;
        }
        saveMetadataDebounced({
            source:
                'lifecycle_migration',
            changedDomains: [
                'migration',
            ],
        });
        await flushPendingMetadataSave();
        return true;
    }

    async function repairLoadedModelConfiguration(
        context,
    ) {
        const state =
            context
                ?.chatMetadata
                ?.hogwartsMud;
        if (!state) {
            return {
                changed: false,
                repairedRoles: [],
            };
        }
        const repair =
            repairLoadedModelSlots({
                loadedSlots:
                    state.modelSlots,
                configuredSlots:
                    getSettings()
                        .modelSlots,
                profiles:
                    getConnectionProfiles(),
                normalizeModelSlots,
            });
        if (!repair.changed) {
            return repair;
        }
        state.modelSlots =
            structuredClone(
                repair.modelSlots,
            );
        await guardedSaveMetadata({
            source:
                'model_profile_rebind',
            changedDomains: [
                'model_slots',
            ],
        });
        toastr.info(
            `存档中的 ${repair.repairedRoles.join(' / ')} 档 AI Profile 已失效，已改用当前 AI 配置。`,
        );
        return repair;
    }

    function populateNarratorCharacterForm(formData, character = null) {
        formData.set('ch_name', 'Hogwarts World Director');
        formData.set('file_name', 'Hogwarts_World_Director');
        formData.set('description', 'Private save container for Hogwarts MUD persistent worlds.');
        formData.set('personality', 'Neutral infrastructure container.');
        formData.set('scenario', 'Hogwarts MUD persistent world storage.');
        formData.set('first_mes', '');
        formData.set('mes_example', '');
        formData.set('creator_notes', '');
        formData.set('system_prompt', '');
        formData.set('post_history_instructions', '');
        formData.set('creator', 'Hogwarts MUD');
        formData.set('character_version', '1.0');
        formData.set('tags', '');
        formData.set('talkativeness', '0.5');
        formData.set('fav', 'false');
        formData.set('world', '');
        formData.set('depth_prompt_prompt', '');
        formData.set('depth_prompt_depth', '4');
        formData.set('depth_prompt_role', 'system');
        formData.set('extensions', JSON.stringify({ hogwartsMudNarrator: true }));
        if (character) {
            formData.set('avatar_url', character.avatar);
            formData.set('chat', String(character.chat || '').replace(/\.jsonl$/i, ''));
            formData.set('create_date', character.create_date || new Date().toISOString());
            formData.set('json_data', JSON.stringify(character));
        }
    }

    async function repairNarratorCharacter(storageCharacterId) {
        let context = getContext();
        const character = context.characters?.[storageCharacterId];
        if (!character || (
            character?.data?.extensions?.hogwartsMudNarrator !== true &&
            character?.name !== 'Hogwarts World Director'
        )) {
            return storageCharacterId;
        }
        const scalarFields = [
            character.first_mes,
            character.mes_example,
            character.personality,
            character.scenario,
            character.data?.first_mes,
            character.data?.mes_example,
            character.data?.system_prompt,
            character.data?.post_history_instructions,
            character.data?.creator_notes,
            character.data?.extensions?.depth_prompt?.prompt,
        ];
        if (scalarFields.every(value => typeof value === 'string')) {
            return storageCharacterId;
        }
        const avatar = character.avatar;
        const chat = String(character.chat || '').replace(/\.jsonl$/i, '');
        const response = await fetch('/api/characters/merge-attributes', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({
                avatar,
                first_mes: '',
                mes_example: '',
                personality: 'Neutral infrastructure container.',
                scenario: 'Hogwarts MUD persistent world storage.',
                creatorcomment: '',
                chat,
                talkativeness: 0.5,
                tags: [],
                data: {
                    first_mes: '',
                    mes_example: '',
                    personality: 'Neutral infrastructure container.',
                    scenario: 'Hogwarts MUD persistent world storage.',
                    creator_notes: '',
                    system_prompt: '',
                    post_history_instructions: '',
                    tags: [],
                    creator: 'Hogwarts MUD',
                    character_version: '1.0',
                    extensions: {
                        talkativeness: 0.5,
                        fav: false,
                        world: '',
                        depth_prompt: {
                            prompt: '',
                            depth: 4,
                            role: 'system',
                        },
                        hogwartsMudNarrator: true,
                    },
                },
            }),
        });
        if (!response.ok) {
            throw new Error(`无法修复 Hogwarts 存档容器：${response.status}`);
        }
        await getCharacters();
        context = getContext();
        const repairedIndex = context.characters.findIndex(item => item.avatar === avatar);
        if (repairedIndex < 0) {
            throw new Error('Hogwarts 存档容器修复后未能重新载入。');
        }
        return repairedIndex;
    }

    async function ensureNarratorCharacter() {
        let context = getContext();
        const existingIndex = context.characters.findIndex(character =>
            character?.data?.extensions?.hogwartsMudNarrator === true ||
            character?.name === 'Hogwarts World Director',
        );
        if (existingIndex >= 0) {
            const healthyIndex = await repairNarratorCharacter(existingIndex);
            await selectCharacterById(healthyIndex, { switchMenu: false });
            return;
        }

        const formData = new FormData();
        populateNarratorCharacterForm(formData);
        const response = await fetch('/api/characters/create', {
            method: 'POST',
            headers: getRequestHeaders({ omitContentType: true }),
            body: formData,
        });
        if (!response.ok) {
            throw new Error(`无法创建 Hogwarts 世界叙事者：${response.status}`);
        }
        const avatarId = await response.text();
        await getCharacters();
        context = getContext();
        const createdIndex = context.characters.findIndex(character => character?.avatar === avatarId);
        if (createdIndex < 0) {
            throw new Error('世界叙事者已创建，但酒馆没有返回角色索引。');
        }
        const healthyIndex = await repairNarratorCharacter(createdIndex);
        await selectCharacterById(healthyIndex, { switchMenu: false });
    }

    async function getHogwartsSaves() {
        const context = getContext();
        const collections = await Promise.all(context.characters.map(async (character, storageCharacterId) => {
            if (!character?.avatar) {
                return [];
            }
            const response = await fetch('/api/characters/chats', {
                method: 'POST',
                headers: getRequestHeaders(),
                body: JSON.stringify({
                    avatar_url: character.avatar,
                    metadata: true,
                }),
            });
            if (!response.ok) {
                return [];
            }
            const data = await response.json();
            return Array.isArray(data)
                ? data.map(entry => ({ ...entry, storageCharacterId }))
                : [];
        }));
        const saves = collections
            .flat()
            .filter(entry => entry?.chat_metadata?.hogwartsMud?.character?.confirmed)
            .sort((left, right) => new Date(right.last_mes).getTime() - new Date(left.last_mes).getTime())
            .map(entry => {
                const state = entry.chat_metadata.hogwartsMud;
                const campaign = normalizeCampaign(state.campaign);
                const timelineEpoch =
                    String(
                        state.timelineEpoch ||
                        '',
                    );
                const mapId =
                    state.scene?.mapId ||
                    state.map
                        ?.activeMapId ||
                    '';
                const roomId =
                    state.scene?.roomId ||
                    state.map
                        ?.currentLocalNodeId ||
                    '';
                const map =
                    getLocalMapDefinition(
                        mapId,
                        state.map,
                    );
                const room =
                    getMapRooms(
                        map,
                        state.map,
                    ).find(candidate =>
                        candidate.id ===
                        roomId);
                const chapterField = {
                    ...(
                        state.scene?.id
                            ? {}
                            : {
                                staticKey:
                                    'story.chapter.opening_world',
                            }
                    ),
                    timelineEpoch,
                    recordKind:
                        'world_state',
                    recordId: 'root',
                    fieldPath:
                        'chapterEn',
                    sourceTextEn:
                        state.chapterEn ||
                        'Opening World',
                };
                const locationField =
                    room
                        ? {
                            ...createLocalMapRoomField(
                                mapId,
                                room,
                            ),
                            timelineEpoch,
                        }
                        : {
                            staticKey:
                                'map.location.unknown',
                            timelineEpoch,
                            recordKind:
                                'local_map_room',
                            recordId:
                                `${mapId}:${roomId}`,
                            fieldPath:
                                'nameEn',
                            sourceTextEn:
                                roomId ||
                                'Unknown location',
                        };
                const previewText =
                    String(
                        entry.mes ||
                        '',
                    ).trim();
                const previewField = {
                    timelineEpoch,
                    recordKind:
                        'save_preview',
                    recordId:
                        String(
                            entry.file_name ||
                            '',
                        ),
                    fieldPath: 'textEn',
                    sourceTextEn:
                        /[\u3400-\u9fff]/u
                            .test(
                                previewText,
                            )
                            ? ''
                            : previewText,
                    rawText:
                        /[\u3400-\u9fff]/u
                            .test(
                                previewText,
                            )
                            ? previewText
                            : '',
                };
                const characterName =
                    state.character
                        .inputEvidence
                        ?.identity
                        ?.name ||
                    state.character
                        .canonicalEn
                        ?.identity
                        ?.nameEn ||
                    '';
                const characterNameField = {
                    ...createCharacterInputLocalizationField(
                        'identity.name',
                        characterName,
                        {
                            timelineEpoch,
                        },
                    ),
                };
                return {
                    fileName: entry.file_name,
                    storageCharacterId: entry.storageCharacterId,
                    campaignName:
                        getLocalizedField({
                            staticKey:
                                `campaign.${campaign.presetId}.name`,
                            sourceTextEn:
                                campaign
                                    .presetId,
                        }).text,
                    difficultyName:
                        getLocalizedField({
                            staticKey:
                                `difficulty.${campaign.difficulty}.name`,
                            sourceTextEn:
                                campaign
                                    .difficulty,
                        }).text,
                    clock:
                        state.clock ||
                        staticText(
                            'ui.archive.time_unknown',
                            'Time unknown',
                        ),
                    messageCount: Number(entry.chat_items || 0),
                    updatedAt: entry.last_mes,
                    localizationFields: [
                        chapterField,
                        locationField,
                        previewField,
                        characterNameField,
                    ],
                };
            });
        await ensureLocalizedFields(
            saves.flatMap(save =>
                save.localizationFields),
            {
                priority: 4,
            },
        );
        return saves.map(save => {
            const [
                chapterField,
                locationField,
                previewField,
                characterNameField,
            ] = save
                .localizationFields;
            const statuses = [
                getLocalizedField(
                    chapterField,
                ),
                getLocalizedField(
                    locationField,
                ),
                getLocalizedField(
                    previewField,
                ),
                getLocalizedField(
                    characterNameField,
                ),
            ];
            const result = {
                ...save,
            };
            delete result
                .localizationFields;
            return {
                ...result,
                chapter:
                    statuses[0].text ||
                    chapterField
                        .sourceTextEn,
                location:
                    statuses[1].text ||
                    locationField
                        .sourceTextEn,
                preview:
                    statuses[2].text ||
                    '',
                characterName:
                    statuses[3].text ||
                    staticText(
                        'ui.archive.unnamed_character',
                        'Unnamed character',
                    ),
                localizationStatus:
                    statuses.some(field =>
                        field.status ===
                        'error')
                        ? 'error'
                        : statuses.some(field =>
                            field.status ===
                            'pending')
                            ? 'pending'
                            : '',
            };
        });
    }

    function createSaveCard(save, isCurrent) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `hpmud-save-card${isCurrent ? ' current' : ''}`;
        button.innerHTML = `
        <span class="hpmud-save-monogram"></span>
        <span class="hpmud-save-copy">
            <small></small>
            <strong></strong>
            <span></span>
            <em></em>
        </span>
        <span class="hpmud-save-arrow">→</span>
    `;
        button.querySelector('.hpmud-save-monogram').textContent = initials(save.characterName);
        const timestamp = isCurrent
            ? staticText(
                'ui.archive.current_timeline',
                'Current timeline',
            )
            : new Date(
                save.updatedAt,
            ).toLocaleString(
                session
                    .displayLocale ===
                    'en'
                    ? 'en-GB'
                    : 'zh-CN',
                {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                },
            );
        const localizationStatus =
            save.localizationStatus
                ? getLocalizedField({
                    staticKey:
                        `translation.status.${save.localizationStatus}`,
                    sourceTextEn:
                        save
                            .localizationStatus ===
                            'error'
                            ? 'Translation unavailable'
                            : 'Translating',
                }).text
                : '';
        button.querySelector('small').textContent =
            [
                timestamp,
                localizationStatus,
            ].filter(Boolean)
                .join(' · ');
        button.querySelector('strong').textContent = save.characterName;
        button.querySelector('.hpmud-save-copy > span').textContent =
            `${save.campaignName} · ${save.difficultyName} · ${save.chapter} · ${save.location}`;
        button.querySelector('em').textContent =
            `${save.messageCount} ${staticText(
                'ui.archive.records',
                'records',
            )}${save.preview ? ` · ${save.preview}` : ''}`;
        button.addEventListener('click', () => void loadHogwartsSave(save));
        return button;
    }

    async function renderSaveLibrary() {
        const requestId = ++session.saveListRequest;
        const list = root.querySelector('#hpmud_save_list');
        list.innerHTML =
            `<div class="hpmud-save-empty">${staticText(
                'ui.archive.loading',
                'Searching magical archives...',
            )}</div>`;
        try {
            const saves = await getHogwartsSaves();
            if (requestId !== session.saveListRequest || session.activeScreen !== 'home') {
                return;
            }
            list.replaceChildren();
            const currentChatId = String(getContext().chatId || '');
            if (!saves.length) {
                list.innerHTML =
                    `<div class="hpmud-save-empty"><strong>${staticText(
                        'ui.archive.empty_title',
                        'No archived timelines yet',
                    )}</strong><span>${staticText(
                        'ui.archive.empty_detail',
                        'Create a character and its timeline will appear here.',
                    )}</span></div>`;
            } else {
                saves.forEach(save => {
                    const normalized = save.fileName.replace(/\.jsonl$/i, '');
                    list.append(createSaveCard(save, normalized === currentChatId || save.fileName === currentChatId));
                });
            }
            root.querySelector('#hpmud_save_count').textContent =
                `${saves.length} ${staticText(
                    'ui.archive.archives',
                    'archives',
                )}`;
        } catch (error) {
            console.error('[Hogwarts MUD] Failed to list saves', error);
            list.innerHTML =
                `<div class="hpmud-save-empty"><strong>${staticText(
                    'ui.archive.error_title',
                    'Unable to read archives',
                )}</strong><span>${staticText(
                    'ui.archive.error_detail',
                    'Check the tavern connection and refresh.',
                )}</span></div>`;
            root.querySelector('#hpmud_save_count').textContent =
                staticText(
                    'ui.archive.read_failed',
                    'Read failed',
                );
        }
    }

    async function beginNewGame() {
        const button = root.querySelector('#hpmud_new_game');
        button.disabled = true;
        try {
            await ensureNarratorCharacter();
            const context = getContext();
            if (!context.characters?.[context.characterId]) {
                throw new Error('没有可用于保存世界的酒馆角色。');
            }
            await doNewChat();
            await repairNarratorCharacter(getContext().characterId);
            const settings = getSettings();
            const characterDraft = createDefaultCharacterDraft();
            characterDraft.identity.age = 10 + session.activeCampaign.grade;
            settings.setupDraft = characterDraft;
            settings.campaignDraft = {
                presetId: session.activeCampaign.presetId,
                startYear: session.activeCampaign.startYear,
                grade: session.activeCampaign.grade,
                difficulty: session.activeCampaign.difficulty,
            };
            saveSettingsDebounced();
            session.activeSetupStep = 'identity';
            setAppScreen('setup');
        } catch (error) {
            console.error('[Hogwarts MUD] Failed to create save', error);
            toastr.error(String(error?.message || error));
        } finally {
            button.disabled = false;
        }
    }

    async function openExistingHogwartsSave(
        save,
        characterIndex,
    ) {
        const chatId =
            String(save?.fileName || '')
                .replace(/\.jsonl$/i, '');
        let context =
            getContext();
        const character =
            context.characters?.[
                characterIndex
            ];
        if (
            !character?.avatar ||
            !chatId
        ) {
            throw new Error(
                '存档容器或文件名无效。',
            );
        }
        character.chat =
            chatId;
        if (
            String(context.characterId) ===
            String(characterIndex)
        ) {
            await context.openCharacterChat(
                chatId,
            );
        } else {
            await selectCharacterById(
                characterIndex,
                {
                    switchMenu: false,
                },
            );
        }
        context = getContext();
        const loadedChatId =
            String(
                context
                    .getCurrentChatId?.() ||
                context.chatId ||
                '',
            ).replace(/\.jsonl$/i, '');
        if (
            String(context.characterId) !==
                String(characterIndex) ||
            loadedChatId !== chatId
        ) {
            throw new Error(
                '存档容器切换失败，未载入目标聊天。',
            );
        }
        return context;
    }

    async function loadHogwartsSave(save) {
        const list = root.querySelector('#hpmud_save_list');
        const previousSuppression =
            automaticWork.suppressed;
        let scheduleLoadedLocalization =
            false;
        automaticWork.suppressed =
            true;
        list.classList.add('loading');
        try {
            const currentContext =
                getContext();
            if (
                canOpenCurrentSocialSaveReadOnly(
                    save,
                    {
                        currentChatId:
                            currentContext
                                .getCurrentChatId?.() ||
                            currentContext.chatId,
                        characterId:
                            currentContext
                                .characterId,
                        chatLength:
                            currentContext.chat
                                .length,
                        state: getMudState(),
                    },
                )
            ) {
                await registerSaveRevisionHead(
                    currentContext,
                    {
                        persistMigration:
                            false,
                    },
                );
                if (
                    !isSaveRevisionBlocked()
                ) {
                    await migrateLoadedLanguageAuthority(
                        currentContext,
                    );
                    await migrateLoadedWorld(
                        currentContext,
                    );
                    await repairLoadedModelConfiguration(
                        currentContext,
                    );
                    await enqueueLocalizationCandidates();
                    scheduleLoadedLocalization =
                        true;
                }
                applySystemPrompt();
                setAppScreen(
                    'game',
                    {
                        allowAutomaticModelWork:
                            false,
                    },
                );
                toastr.success(
                    `已读取 ${save.characterName} 的时间线。`,
                );
                return;
            }
            const healthyIndex =
                await repairNarratorCharacter(
                    save.storageCharacterId,
                );
            const loadedContext =
                await openExistingHogwartsSave(
                    save,
                    healthyIndex,
                );
            let loadedState =
                loadedContext
                    .chatMetadata
                    ?.hogwartsMud;
            if (
                loadedState
                    ?.character
                    ?.confirmed !== true ||
                ![
                    'initializing',
                    'opening_narration',
                    'initialization_failed',
                    'playing',
                ].includes(
                    loadedState?.phase,
                )
            ) {
                throw new Error(
                    '该聊天不包含有效的 Hogwarts MUD 世界状态。',
                );
            }
            await registerSaveRevisionHead(
                loadedContext,
                {
                    persistMigration:
                        false,
                },
            );
            if (
                isSaveRevisionBlocked()
            ) {
                applySystemPrompt();
                setAppScreen(
                    'game',
                    {
                        allowAutomaticModelWork:
                            false,
                    },
                );
                return;
            }
            await migrateLoadedLanguageAuthority(
                loadedContext,
            );
            loadedState =
                loadedContext
                    .chatMetadata
                    ?.hogwartsMud;
            await migrateLoadedWorld(
                loadedContext,
            );
            await repairLoadedModelConfiguration(
                loadedContext,
            );
            const socialGraphMigration =
                migrateLoadedSocialGraph(
                    loadedState.socialGraph,
                    {
                        chatLength:
                            loadedContext.chat
                                .length,
                        sceneId:
                            loadedState.scene
                                ?.id ||
                            '',
                    },
                );
            const projectedActorLibrary =
                projectActorSocialRelationships(
                    loadedState.actorLibrary,
                    socialGraphMigration
                        .graph,
                );
            const actorProjectionChanged =
                JSON.stringify(
                    loadedState.actorLibrary ||
                    [],
                ) !==
                JSON.stringify(
                    projectedActorLibrary,
                );
            if (
                socialGraphMigration.changed ||
                actorProjectionChanged
            ) {
                loadedState.socialGraph =
                    socialGraphMigration
                        .graph;
                loadedState.actorLibrary =
                    projectedActorLibrary;
                await loadedContext
                    .saveMetadata();
            }
            automaticWork.suppressed =
                !socialGraphMigration
                    .allowAutomaticModelWork;
            if (!isGameStarted()) {
                throw new Error('该聊天不包含有效的 Hogwarts MUD 世界状态。');
            }
            const state = getMudState();
            const lowSlot = normalizeModelSlots(state?.modelSlots).low;
            const profileId = lowSlot.profileId;
            if (
                !automaticWork.suppressed &&
                !isSaveRevisionBlocked() &&
                profileId &&
                getConnectionProfiles().some(profile => profile.id === profileId)
            ) {
                await applyNativeRoleSettings(lowSlot);
            }
            await enqueueLocalizationCandidates();
            scheduleLoadedLocalization =
                true;
            applySystemPrompt();
            setAppScreen(
                'game',
                {
                    allowAutomaticModelWork:
                        false,
                },
            );
            toastr.success(`已读取 ${save.characterName} 的时间线。`);
        } catch (error) {
            console.error('[Hogwarts MUD] Failed to load save', error);
            toastr.error(String(error?.message || error));
            if (
                getMudState()
                    ?.languageAuthorityVersion !==
                1
            ) {
                setAppScreen(
                    'home',
                    {
                        allowAutomaticModelWork:
                            false,
                    },
                );
            }
        } finally {
            automaticWork.suppressed =
                getMudState()
                    ?.languageAuthorityVersion ===
                    1
                    ? previousSuppression
                    : true;
            if (
                scheduleLoadedLocalization &&
                !automaticWork.suppressed
            ) {
                idleLocalizationScheduler
                    ?.schedule();
            }
            list.classList.remove('loading');
        }
    }

    return {
        populateNarratorCharacterForm,
        repairNarratorCharacter,
        ensureNarratorCharacter,
        getHogwartsSaves,
        createSaveCard,
        renderSaveLibrary,
        beginNewGame,
        openExistingHogwartsSave,
        migrateLoadedLanguageAuthority,
        loadHogwartsSave,
    };
}
