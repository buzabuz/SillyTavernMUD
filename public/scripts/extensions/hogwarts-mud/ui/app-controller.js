export function createAppController(ports) {
    const {
        refs,
        session,
    } = ports;

    const {
        CAMPAIGN_PRESETS,
        PROMPT_KEY,
        buildCampaignContext,
        buildCharacterContext,
        buildMandatorySceneState,
        buildSystemPrompt,
        extension_prompt_roles,
        extension_prompt_types,
        extractStreamingSceneSegments,
        getContext,
        getLocalizedField =
        field => ({
            text:
                    field.sourceTextEn ||
                    '',
        }),
        getMudState,
        getRoomName =
        (_state, _mapId, roomId) =>
            roomId || '',
        getSettings,
        hasOpeningNarrative,
        initializeOpeningWorld,
        loadSetupDraft,
        normalizeCampaign,
        normalizeSocialGraph,
        preparePlayableState,
        renderComposerSpellPreview,
        renderHeaderAndScene,
        renderInspector,
        renderSaveLibrary,
        renderStory,
        saveSettingsDebounced,
        setExtensionPrompt,
        showSetupStep,
        syncComposerState,
        updateMessageBlock,
    } = ports;

    const {
        root,
        homeElement,
        setupElement,
        workspaceElement,
    } = refs;
    let foregroundActivityTimer =
        null;

    const foregroundTaskLabels =
        Object.freeze({
            character_polish: [
                'ui.model_activity.task.character_polish',
                'Character',
            ],
            opening_world: [
                'ui.model_activity.task.opening_world',
                'World',
            ],
            interior_cartographer: [
                'ui.model_activity.task.interior_cartographer',
                'Interior',
            ],
            pacing_director: [
                'ui.model_activity.task.pacing_director',
                'Pacing',
            ],
            scene_performance: [
                'ui.model_activity.task.scene_performance',
                'Scene',
            ],
            scene_transition: [
                'ui.model_activity.task.scene_transition',
                'Transition',
            ],
            scene_opening: [
                'ui.model_activity.task.scene_opening',
                'Opening',
            ],
            map_expansion: [
                'ui.model_activity.task.map_expansion',
                'Map',
            ],
            post_turn_semantic_proposal: [
                'ui.model_activity.task.post_turn_semantic_proposal',
                'Post',
            ],
        });

    function activityText(
        staticKey,
        sourceTextEn,
    ) {
        return getLocalizedField({
            staticKey,
            sourceTextEn,
        }).text ||
            sourceTextEn;
    }

    function renderForegroundModelActivity() {
        const element =
            root.querySelector(
                '#hpmud_model_activity',
            );
        if (!element) return;
        const activity =
            session
                .foregroundModelActivity;
        element.hidden =
            !activity;
        if (!activity) {
            element.textContent = '';
            root.querySelector(
                '.hpmud-place',
            )?.append(element);
            return;
        }
        const activeDialog =
            Array.from(
                root.querySelectorAll(
                    'dialog[open]',
                ),
            ).at(-1);
        const host =
            activeDialog
                ?.querySelector(
                    '.hpmud-dialog-frame > header',
                ) ||
            root.querySelector(
                '.hpmud-place',
            );
        if (
            host &&
            element.parentElement !==
                host
        ) {
            const closeButton =
                activeDialog
                    ? host.querySelector(
                        ':scope > button',
                    )
                    : null;
            host.insertBefore(
                element,
                closeButton,
            );
        }
        const [
            taskKey,
            taskFallback,
        ] =
            foregroundTaskLabels[
                activity.taskId
            ] || [
                'ui.model_activity.task.generic',
                'Model task',
            ];
        const seconds =
            Math.max(
                0,
                Math.floor(
                    (
                        Date.now() -
                        Number(
                            activity
                                .startedAt ||
                            Date.now(),
                        )
                    ) /
                    1_000,
                ),
            );
        element.textContent =
            activityText(
                'ui.model_activity.elapsed',
                '{task} · {seconds}s',
            )
                .replace(
                    '{task}',
                    activityText(
                        taskKey,
                        taskFallback,
                    ),
                )
                .replace(
                    '{seconds}',
                    String(seconds),
                );
    }

    function clearForegroundActivityTimer() {
        if (
            foregroundActivityTimer !==
            null
        ) {
            clearInterval(
                foregroundActivityTimer,
            );
            foregroundActivityTimer =
                null;
        }
    }

    function setForegroundModelActivity(
        activity,
    ) {
        clearForegroundActivityTimer();
        session.foregroundModelActivity = {
            taskId:
                String(
                    activity?.taskId ||
                    '',
                ),
            phase:
                String(
                    activity?.phase ||
                    'requesting',
                ),
            startedAt:
                Number(
                    activity?.startedAt,
                ) ||
                Date.now(),
        };
        renderForegroundModelActivity();
        foregroundActivityTimer =
            setInterval(
                renderForegroundModelActivity,
                1_000,
            );
    }

    function clearForegroundModelActivity(
        taskId = '',
    ) {
        if (
            taskId &&
            session
                .foregroundModelActivity
                ?.taskId !==
                taskId
        ) {
            return;
        }
        clearForegroundActivityTimer();
        session.foregroundModelActivity =
            null;
        renderForegroundModelActivity();
    }

    function isGameStarted() {
        const state = getMudState();
        return [
            'initializing',
            'opening_narration',
            'initialization_failed',
            'playing',
        ].includes(state?.phase) && state?.character?.confirmed === true;
    }

    function setAppScreen(
        screen,
        {
            allowAutomaticModelWork =
            true,
        } = {},
    ) {
        if (
            session.activeScreen &&
            session.activeScreen !==
                screen
        ) {
            clearForegroundModelActivity();
        }
        session.activeScreen = screen;
        const showHome = screen === 'home';
        const showSetup = screen === 'setup';
        const showGame = screen === 'game';
        homeElement.hidden = !showHome;
        setupElement.hidden = !showSetup;
        workspaceElement.hidden = !showGame;
        root.classList.toggle('home-mode', showHome);
        root.classList.toggle('setup-mode', showSetup);
        root.querySelector('#hpmud_focus').hidden = !showGame;
        root.querySelector('#hpmud_calendar').hidden = !showGame;
        root.querySelector('#hpmud_reopen_setup').hidden = !showGame;
        if (showHome) {
            root.querySelector('#hpmud_location').textContent =
                getLocalizedField({
                    staticKey:
                        'ui.nav.archive_hall',
                    sourceTextEn:
                        'Archive Hall',
                }).text;
            root.querySelector('#hpmud_chapter').textContent = 'Hogwarts MUD';
            root.querySelector('#hpmud_clock').textContent =
                getLocalizedField({
                    staticKey:
                        'ui.home.select_timeline',
                    sourceTextEn:
                        'Choose a timeline',
                }).text;
            root.querySelector('#hpmud_character').textContent = 'HP';
            syncCampaignUi();
            void renderSaveLibrary();
        } else if (showSetup) {
            loadSetupDraft();
            showSetupStep(session.activeSetupStep);
        } else if (showGame) {
            renderAll();
            const state = getMudState();
            const canResumeOpening = state?.character?.confirmed &&
                state.phase !== 'initialization_failed' &&
                state.opening?.status !== 'ready' &&
                !hasOpeningNarrative();
            if (
                allowAutomaticModelWork &&
                canResumeOpening
            ) {
                void initializeOpeningWorld().catch(error => {
                    console.error('[Hogwarts MUD] Opening initialization failed', error);
                    toastr.error(String(error?.cause?.message || error?.message || error));
                });
            } else if (
                allowAutomaticModelWork &&
                state?.phase === 'playing'
            ) {
                void preparePlayableState();
            }
        }
    }

    function syncCampaignUi() {
        const settings = getSettings();
        session.activeCampaign = normalizeCampaign(settings.campaignDraft || session.activeCampaign);
        const preset = CAMPAIGN_PRESETS[session.activeCampaign.presetId];
        root.querySelectorAll('[data-campaign]').forEach(button => {
            const selected = button.dataset.campaign === session.activeCampaign.presetId;
            button.classList.toggle('active', selected);
            button.setAttribute('aria-checked', String(selected));
        });
        const year = root.querySelector('#hpmud_campaign_year');
        const grade = root.querySelector('#hpmud_campaign_grade');
        year.value = String(session.activeCampaign.startYear);
        year.disabled = preset.lockedYear;
        grade.value = String(session.activeCampaign.grade);
        grade.disabled = preset.lockedGrade;
        root.querySelectorAll('[data-difficulty]').forEach(button => {
            const selected = button.dataset.difficulty === session.activeCampaign.difficulty;
            button.classList.toggle('active', selected);
            button.setAttribute('aria-checked', String(selected));
        });
        const difficultyName =
            getLocalizedField({
                staticKey:
                    `difficulty.${session.activeCampaign.difficulty}.name`,
                sourceTextEn:
                    session
                        .activeCampaign
                        .difficulty,
            }).text;
        root.querySelector('#hpmud_campaign_summary').textContent =
            session.displayLocale === 'en'
                ? `${session.activeCampaign.startYear} · Grade ${session.activeCampaign.grade} · ${difficultyName}`
                : `${session.activeCampaign.startYear} · ${session.activeCampaign.grade} 年级 · ${difficultyName}难度`;
    }

    function updateCampaign(patch = {}) {
        const current = normalizeCampaign({ ...session.activeCampaign, ...patch });
        session.activeCampaign = current;
        getSettings().campaignDraft = {
            presetId: current.presetId,
            startYear: current.startYear,
            grade: current.grade,
            difficulty: current.difficulty,
        };
        saveSettingsDebounced();
        syncCampaignUi();
    }

    function selectCampaign(presetId) {
        const preset = CAMPAIGN_PRESETS[presetId] || CAMPAIGN_PRESETS.canon_1991;
        updateCampaign({
            presetId: preset.id,
            startYear: preset.startYear,
            grade: preset.grade,
        });
    }

    function applySystemPrompt() {
        const settings = getSettings();
        if (!settings.enabled) {
            setExtensionPrompt(PROMPT_KEY, '', extension_prompt_types.NONE, 0);
            return;
        }
        const state = getContext().chatMetadata?.hogwartsMud;
        const characterContext = buildCharacterContext(state?.character);
        const campaignContext = characterContext ? buildCampaignContext(state?.campaign) : '';
        const mandatorySceneState = state?.scene
            ? buildMandatorySceneState(state)
            : null;
        const sceneContext = state?.scene ? `CURRENT COMMITTED SCENE (binding JSON):
${JSON.stringify(mandatorySceneState)}

Continue from this exact state. actorCards contain the only shared NPC performance guidance. behavioralEnvironment is binding current context: embody materially relevant time, daylight, fatigue, curfew, weather, clothing, shelter, and activity effects without reciting it as a checklist. Current scene, location, and environment override stale guidance. Detailed memories, map topology, private facts, hidden arcs, and locked clues are supplied only to role requests authorized to use them. Never invent or disclose absent private state. The SillyTavern storage character is infrastructure and never exists inside the story.` : '';
        setExtensionPrompt(
            PROMPT_KEY,
            `${buildSystemPrompt(settings.worldPrompt)}${campaignContext ? `\n\n${campaignContext}` : ''}${characterContext ? `\n\n${characterContext}` : ''}${sceneContext ? `\n\n${sceneContext}` : ''}`,
            extension_prompt_types.IN_PROMPT,
            0,
            false,
            extension_prompt_roles.SYSTEM,
        );
    }

    function setUiVisible(visible) {
        getSettings().uiEnabled = visible;
        root.hidden = !visible;
        if (refs.launcher) {
            refs.launcher.hidden = visible;
        }
        document.body.classList.toggle('hpmud-mode', visible);
        saveSettingsDebounced();
        if (visible) {
            setAppScreen('home');
        }
    }

    let launcherDisposer = null;

    function addLauncherButton() {
        if (launcherDisposer) {
            return launcherDisposer;
        }
        refs.launcher = document.querySelector('#hpmud_launcher');
        if (refs.launcher) {
            return () => {};
        }
        refs.launcher = document.createElement('button');
        refs.launcher.id = 'hpmud_launcher';
        refs.launcher.type = 'button';
        refs.launcher.className = 'hpmud-launcher';
        refs.launcher.setAttribute(
            'aria-label',
            getLocalizedField({
                staticKey:
                    'ui.game.launcher.open',
                sourceTextEn:
                    'Open Hogwarts MUD',
            }).text,
        );
        refs.launcher.innerHTML = '<i class="fa-solid fa-hat-wizard"></i><span>Hogwarts MUD</span>';
        const onClick = () => setUiVisible(true);
        refs.launcher.addEventListener('click', onClick);
        document.body.append(refs.launcher);
        launcherDisposer = () => {
            refs.launcher?.removeEventListener(
                'click',
                onClick,
            );
            refs.launcher?.remove();
            refs.launcher = null;
            launcherDisposer = null;
        };
        return launcherDisposer;
    }

    function scheduleRender() {
        clearTimeout(session.renderTimer);
        session.renderTimer = setTimeout(renderAll, 40);
    }

    function beginLiveSceneStream(checkResolution = null) {
        session.liveSceneStream = {
            phase: 'connecting',
            rawLength: 0,
            segments: [],
            checkResolution: checkResolution
                ? structuredClone(checkResolution)
                : null,
            startedAt: Date.now(),
        };
        scheduleRender();
    }

    function updateLiveSceneStream(
        rawText,
        phase = 'receiving',
    ) {
        session.liveSceneStream ??= {
            phase,
            rawLength: 0,
            segments: [],
            startedAt: Date.now(),
        };
        session.liveSceneStream.phase = phase;
        session.liveSceneStream.rawLength = String(rawText || '').length;
        session.liveSceneStream.segments =
            extractStreamingSceneSegments(rawText);
        scheduleRender();
    }

    function setLiveSceneStreamPhase(phase, segments = null) {
        if (!session.liveSceneStream) {
            beginLiveSceneStream();
        }
        session.liveSceneStream.phase = phase;
        if (Array.isArray(segments)) {
            session.liveSceneStream.segments = structuredClone(segments);
        }
        scheduleRender();
    }

    function getWorldState() {
        const context = getContext();
        const state = context.chatMetadata?.hogwartsMud ?? {};
        const mapId =
            state.scene?.mapId ||
            state.map?.activeMapId ||
            '';
        const roomId =
            state.scene?.roomId ||
            state.map
                ?.currentLocalNodeId ||
            '';
        const chapterEn =
            state.chapterEn ||
            'Opening World';
        return {
            phase: state.phase || 'initializing',
            location:
                mapId &&
                roomId
                    ? getRoomName(
                        state,
                        mapId,
                        roomId,
                    )
                    : getLocalizedField({
                        staticKey:
                            'map.status.world_setup',
                        sourceTextEn:
                            'World setup in progress',
                    }).text,
            chapter:
                getLocalizedField({
                    ...(
                        state.scene?.id
                            ? {}
                            : {
                                staticKey:
                                    'story.chapter.opening_world',
                            }
                    ),
                    recordKind:
                        'world_state',
                    recordId: 'root',
                    fieldPath:
                        'chapterEn',
                    sourceTextEn:
                        chapterEn,
                }).text ||
                chapterEn,
            chapterEn,
            clock: state.clock || `${state.campaign?.startYear || 1991} · Time pending`,
            character: state.character || null,
            campaign: state.campaign || null,
            modelSlots: state.modelSlots || getSettings().modelSlots,
            map: state.map || {},
            scene: state.scene || null,
            actors: Array.isArray(state.actors) ? state.actors : [],
            actorLibrary: Array.isArray(state.actorLibrary) ? state.actorLibrary : [],
            actorMemoryIndex:
                state.actorMemoryIndex || {
                    version: 1,
                    byActorId: {},
                },
            memorySynapse:
                state.memorySynapse || {
                    version: 1,
                    appraisals: [],
                    personSchemas: [],
                },
            eventKnowledge:
                Array.isArray(
                    state.eventKnowledge,
                )
                    ? state.eventKnowledge
                    : [],
            ...(
                Object.prototype
                    .hasOwnProperty.call(
                        state,
                        'activeInteractionActorIds',
                    )
                    ? {
                        activeInteractionActorIds:
                            state
                                .activeInteractionActorIds,
                    }
                    : {}
            ),
            localPresence:
                state.localPresence || null,
            cohorts: Array.isArray(state.cohorts)
                ? state.cohorts
                : [],
            actorPresentations:
                state.actorPresentations &&
                typeof state.actorPresentations ===
                    'object'
                    ? state.actorPresentations
                    : {},
            storyArcs: Array.isArray(state.storyArcs) ? state.storyArcs : [],
            conflict: state.conflict || null,
            turn: state.turn || null,
            pacingDirector: state.pacingDirector || null,
            causalCollapse:
                state.causalCollapse ||
                null,
            memoryDirector: state.memoryDirector || null,
            socialGraph:
                normalizeSocialGraph(
                    state.socialGraph,
                ),
            calendar:
                state.calendar || {
                    version: 2,
                    storylines: [],
                    storyBeats: [],
                    entries: [],
                    horizon:
                        state.clock || '',
                },
            sceneArchive: Array.isArray(state.sceneArchive) ? state.sceneArchive : [],
            sceneTransition: state.sceneTransition || null,
            spatial: state.spatial || null,
            knowledgeBase: state.knowledgeBase || null,
            opening: state.opening || null,
            clues: Array.isArray(state.clues) ? state.clues : [],
            items: Array.isArray(state.items) ? state.items : [],
            pendingItemProposals:
                Array.isArray(
                    state
                        .pendingItemProposals,
                )
                    ? state
                        .pendingItemProposals
                    : [],
            itemProposalDecisions:
                Array.isArray(
                    state
                        .itemProposalDecisions,
                )
                    ? state
                        .itemProposalDecisions
                    : [],
            pendingSpellProposals:
                Array.isArray(
                    state
                        .pendingSpellProposals,
                )
                    ? state
                        .pendingSpellProposals
                    : [],
            spellProposalDecisions:
                Array.isArray(
                    state
                        .spellProposalDecisions,
                )
                    ? state
                        .spellProposalDecisions
                    : [],
            spellbook:
                state.spellbook ||
                {
                    known: [],
                },
            status: Array.isArray(state.status) ? state.status : [],
        };
    }

    function renderAll() {
        if (!root || root.hidden) {
            return;
        }
        if (session.activeScreen === 'home' || session.activeScreen === 'setup') {
            return;
        }
        if (!isGameStarted()) {
            setAppScreen('home');
            return;
        }
        renderHeaderAndScene();
        renderStory();
        syncComposerState(getWorldState());
        renderComposerSpellPreview();
        const activeTab = session.selectedActorId
            ? 'actor'
            : root.querySelector('[data-hpmud-tab].active')?.dataset.hpmudTab || 'character';
        renderInspector(activeTab);
        if (refs.calendarDialog?.open) {
            ports.renderCalendar();
        }
        void refs.relationshipGraphController?.refresh();
    }

    function updateNativeMessageBlock(messageId, message) {
        if (document.querySelector(`#chat .mes[mesid="${Number(messageId)}"]`)) {
            updateMessageBlock(messageId, message);
        }
    }

    function getInspectorMapScope() {
        return session.inspectorMapScope;
    }

    function resetInspectorMapScope() {
        session.inspectorMapScope = 'auto';
        session.inspectorMapLevel = '';
    }

    function clearLiveSceneStream() {
        session.liveSceneStream = null;
    }

    return {
        isGameStarted,
        setAppScreen,
        syncCampaignUi,
        updateCampaign,
        selectCampaign,
        applySystemPrompt,
        setUiVisible,
        addLauncherButton,
        removeLauncherButton() {
            launcherDisposer?.();
        },
        scheduleRender,
        beginLiveSceneStream,
        updateLiveSceneStream,
        setLiveSceneStreamPhase,
        getWorldState,
        renderAll,
        updateNativeMessageBlock,
        getInspectorMapScope,
        resetInspectorMapScope,
        clearLiveSceneStream,
        setForegroundModelActivity,
        clearForegroundModelActivity,
        renderForegroundModelActivity,
    };
}
