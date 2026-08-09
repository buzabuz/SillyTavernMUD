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
        getMudState,
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
        root.querySelector('#hpmud_reopen_setup').hidden = !showGame;
        if (showHome) {
            root.querySelector('#hpmud_location').textContent = '档案大厅';
            root.querySelector('#hpmud_chapter').textContent = 'Hogwarts MUD';
            root.querySelector('#hpmud_clock').textContent = '选择一条时间线';
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
        root.querySelector('#hpmud_campaign_summary').textContent =
            `${session.activeCampaign.startYear} · ${session.activeCampaign.grade} 年级 · ${session.activeCampaign.difficultyName}难度`;
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
        const mapContext = mandatorySceneState
            ? `\n\nCURRENT AUTHORITATIVE POSITION:
${JSON.stringify(mandatorySceneState.playerPosition)}

Detailed topology is supplied only to role requests that need it. Never invent or rename a map or room.`
            : '';
        const sceneContext = state?.scene ? `CURRENT COMMITTED SCENE (binding JSON):
${JSON.stringify(mandatorySceneState)}

Continue from this exact state. Perform present NPCs using the supplied personality, speech style, private goal, fear, and knowledge boundary. behavioralEnvironment is binding current context: embody materially relevant time, daylight, fatigue, curfew, weather, clothing, shelter, and activity effects without reciting it as a checklist. Current scene, location, and environment override stale daily directives. Detailed memories, map topology, hidden arcs, and locked clues are supplied only to role requests authorized to use them. Never invent or disclose absent private state. The SillyTavern storage character is infrastructure and never exists inside the story.` : '';
        setExtensionPrompt(
            PROMPT_KEY,
            `${buildSystemPrompt(settings.worldPrompt)}${campaignContext ? `\n\n${campaignContext}` : ''}${characterContext ? `\n\n${characterContext}` : ''}${mapContext}${sceneContext ? `\n\n${sceneContext}` : ''}`,
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
        refs.launcher.setAttribute('aria-label', '打开 Hogwarts MUD');
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
        return {
            phase: state.phase || 'initializing',
            location: state.location || '世界建档中',
            chapter: state.chapter || '正在编排首幕',
            clock: state.clock || `${state.campaign?.startYear || 1991} · 时间待定`,
            character: state.character || null,
            campaign: state.campaign || null,
            modelSlots: state.modelSlots || getSettings().modelSlots,
            map: state.map || {},
            scene: state.scene || null,
            actors: Array.isArray(state.actors) ? state.actors : [],
            actorLibrary: Array.isArray(state.actorLibrary) ? state.actorLibrary : [],
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
            agenda: Array.isArray(state.agenda) ? state.agenda : [],
            timeline: Array.isArray(state.timeline) ? state.timeline : [],
            turn: state.turn || null,
            dailyDirector: state.dailyDirector || null,
            pacingDirector: state.pacingDirector || null,
            causalCollapse:
                state.causalCollapse ||
                null,
            memoryDirector: state.memoryDirector || null,
            socialGraph:
                normalizeSocialGraph(
                    state.socialGraph,
                ),
            sceneArchive: Array.isArray(state.sceneArchive) ? state.sceneArchive : [],
            sceneTransition: state.sceneTransition || null,
            spatial: state.spatial || null,
            knowledgeBase: state.knowledgeBase || null,
            directorFoundation: state.directorFoundation || null,
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
    };
}
