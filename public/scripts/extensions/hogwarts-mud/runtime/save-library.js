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
        ensureSceneLifecycleState =
        () => false,
        flushPendingMetadataSave =
        async () => {},
        getCharacters,
        getConnectionProfiles,
        getContext,
        getMudState,
        getRequestHeaders,
        getSettings,
        guardedSaveMetadata =
        async () => null,
        initials,
        isSaveRevisionBlocked =
        () => false,
        isGameStarted,
        migrateLoadedSocialGraph,
        normalizeCampaign,
        normalizeModelSlots,
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
        return collections
            .flat()
            .filter(entry => entry?.chat_metadata?.hogwartsMud?.character?.confirmed)
            .sort((left, right) => new Date(right.last_mes).getTime() - new Date(left.last_mes).getTime())
            .map(entry => {
                const state = entry.chat_metadata.hogwartsMud;
                const campaign = normalizeCampaign(state.campaign);
                return {
                    fileName: entry.file_name,
                    storageCharacterId: entry.storageCharacterId,
                    characterName: state.character.identity?.name || '未命名角色',
                    campaignName: campaign.presetName,
                    difficultyName: campaign.difficultyName,
                    chapter: state.chapter || '未知章节',
                    clock: state.clock || '时间未知',
                    location: state.location || '地点未知',
                    messageCount: Number(entry.chat_items || 0),
                    preview: String(entry.mes || '').trim(),
                    updatedAt: entry.last_mes,
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
        button.querySelector('small').textContent = isCurrent ? '当前时间线' : new Date(save.updatedAt).toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
        button.querySelector('strong').textContent = save.characterName;
        button.querySelector('.hpmud-save-copy > span').textContent =
            `${save.campaignName} · ${save.difficultyName} · ${save.chapter} · ${save.location}`;
        button.querySelector('em').textContent = `${save.messageCount} 条记录${save.preview ? ` · ${save.preview}` : ''}`;
        button.addEventListener('click', () => void loadHogwartsSave(save));
        return button;
    }

    async function renderSaveLibrary() {
        const requestId = ++session.saveListRequest;
        const list = root.querySelector('#hpmud_save_list');
        list.innerHTML = '<div class="hpmud-save-empty">正在检索魔法档案…</div>';
        try {
            const saves = await getHogwartsSaves();
            if (requestId !== session.saveListRequest || session.activeScreen !== 'home') {
                return;
            }
            list.replaceChildren();
            const currentChatId = String(getContext().chatId || '');
            if (!saves.length) {
                list.innerHTML = '<div class="hpmud-save-empty"><strong>还没有旧档案</strong><span>建立第一个角色后，时间线会出现在这里。</span></div>';
            } else {
                saves.forEach(save => {
                    const normalized = save.fileName.replace(/\.jsonl$/i, '');
                    list.append(createSaveCard(save, normalized === currentChatId || save.fileName === currentChatId));
                });
            }
            root.querySelector('#hpmud_save_count').textContent = `${saves.length} 个档案`;
        } catch (error) {
            console.error('[Hogwarts MUD] Failed to list saves', error);
            list.innerHTML = '<div class="hpmud-save-empty"><strong>无法读取档案</strong><span>请检查酒馆连接后刷新。</span></div>';
            root.querySelector('#hpmud_save_count').textContent = '读取失败';
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
                );
                if (
                    !isSaveRevisionBlocked()
                ) {
                    await migrateLoadedWorld(
                        currentContext,
                    );
                    await repairLoadedModelConfiguration(
                        currentContext,
                    );
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
            const loadedState =
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
        } finally {
            automaticWork.suppressed =
                previousSuppression;
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
        loadHogwartsSave,
    };
}
