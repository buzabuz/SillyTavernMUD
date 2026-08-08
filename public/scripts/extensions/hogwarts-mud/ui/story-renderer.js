export function createStoryRenderer(ports) {
    const {
        refs,
        session,
    } = ports;

    const {
        ARCHIVE_LIST_PAGE_SIZE,
        ARCHIVE_TRANSCRIPT_PAGE_SIZE,
        CURRENT_SCENE_PAGE_SIZE,
        closeMovementPicker,
        closeSpellPicker,
        createFallbackNextSceneIntent,
        createGenerationStatusCard,
        findSceneDestination,
        getAvailableTurnRollbackCheckpoint,
        getContext,
        getCurrentSceneMessageEntries,
        getFailedPlayerTurn,
        getMudState,
        getRoomName,
        getWorldState,
        initializeOpeningWorld,
        jobRegistry,
        projectPeoplePanel,
        renderAuthorQuillCard,
        renderComposerAddressing,
        renderInspector,
        renderLiveSceneStream,
        renderMessage,
        renderMiniMap,
        retryFailedPlayerTurn,
        validateNextSceneIntent,
    } = ports;

    const {
        root,
        storyElement,
        composerInput,
        sceneTransitionDialog,
        sceneArchiveDialog,
    } = refs;

    function initials(name) {
        return String(name || '?')
            .split(/\s+/)
            .map(part => part[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }

    function getPeopleDisplay(state, person) {
        const { actor, profile } = person;
        const displayName =
            profile?.name ||
            actor?.name ||
            profile?.nameEn ||
            actor?.nameEn ||
            person.id;
        const roomName = getRoomName(
            state,
            actor?.mapId ||
                state.map.activeMapId,
            actor?.roomId ||
                state.map
                    .currentLocalNodeId,
        );
        return {
            displayName,
            detail: [
                roomName,
                actor?.currentActivity ||
                    actor?.role ||
                    profile?.role,
            ].filter(Boolean).join(' · '),
            intent: actor?.currentIntent || '',
        };
    }

    function renderHeaderAndScene() {
        const context = getContext();
        const state = getWorldState();
        const playerName = state.character?.identity?.name || context.name1 || 'Player';

        root.querySelector('#hpmud_location').textContent = state.location;
        root.querySelector('#hpmud_chapter').textContent = state.chapter;
        root.querySelector('#hpmud_clock').textContent = state.clock;
        root.querySelector('#hpmud_character').textContent = initials(playerName);

        const people = root.querySelector('#hpmud_people');
        people.replaceChildren();
        const peopleProjection =
            projectPeoplePanel(state);
        if (!peopleProjection.activePeople.length) {
            const status = document.createElement('div');
            status.className = 'hpmud-people-pending';
            status.textContent =
                state.phase ===
                    'initialization_failed'
                    ? '首幕编排失败'
                    : state.phase === 'playing'
                        ? '当前没有互动人物'
                        : '世界导演正在确认人物…';
            people.append(status);
        } else {
            peopleProjection
                .activePeople
                .forEach(personData => {
                    const {
                        displayName,
                        detail,
                        intent,
                    } = getPeopleDisplay(
                        state,
                        personData,
                    );
                    const person =
                        document.createElement(
                            'button',
                        );
                    person.type = 'button';
                    person.className =
                        `hpmud-person${
                            session.selectedActorId ===
                            personData.id
                                ? ' active'
                                : ''
                        }`;
                    person.dataset.actorId =
                        personData.id;
                    person.setAttribute(
                        'aria-pressed',
                        String(
                            session.selectedActorId ===
                            personData.id,
                        ),
                    );
                    person.innerHTML = `
                    <span class="hpmud-person-avatar">${initials(displayName)}</span>
                    <span><strong></strong><small></small></span>
                `;
                    person.querySelector(
                        'strong',
                    ).textContent =
                        displayName;
                    person.querySelector(
                        'small',
                    ).textContent = detail;
                    person.title = intent;
                    person.addEventListener(
                        'click',
                        () => {
                            session.selectedActorId =
                                personData.id;
                            renderHeaderAndScene();
                            renderInspector(
                                'actor',
                            );
                        },
                    );
                    people.append(person);
                });
        }
        root.querySelector(
            '#hpmud_people_count',
        ).textContent = String(
            peopleProjection
                .activePeople.length,
        );
        const localPeople = root.querySelector(
            '#hpmud_local_people',
        );
        const localCohorts = root.querySelector(
            '#hpmud_local_cohorts',
        );
        localPeople.replaceChildren();
        localCohorts.replaceChildren();
        peopleProjection.localPeople.forEach(
            personData => {
                const {
                    displayName,
                    detail,
                } = getPeopleDisplay(
                    state,
                    personData,
                );
                const person =
                    document.createElement(
                        'div',
                    );
                person.className =
                    'hpmud-local-person';
                person.innerHTML = `
                <span class="hpmud-local-person-mark" aria-hidden="true"></span>
                <span><strong></strong><small></small></span>
            `;
                person.querySelector(
                    'strong',
                ).textContent = displayName;
                person.querySelector(
                    'small',
                ).textContent = detail;
                localPeople.append(person);
            },
        );
        peopleProjection.cohorts.forEach(
            cohort => {
                const summary =
                    document.createElement('p');
                summary.textContent =
                    `另有 ${cohort.label} 成员若干`;
                localCohorts.append(summary);
            },
        );
        if (
            !peopleProjection.localPeople
                .length &&
            !peopleProjection.cohorts.length
        ) {
            const empty =
                document.createElement('p');
            empty.className =
                'hpmud-local-people-empty';
            empty.textContent =
                peopleProjection
                    .localPresenceValid
                    ? '暂无其他已确认人物'
                    : '地点人物尚未确认';
            localCohorts.append(empty);
        }
        root.querySelector(
            '#hpmud_local_people_count',
        ).textContent = String(
            peopleProjection
                .localPeople.length,
        );
        if (composerInput) {
            renderComposerAddressing();
        }
        const agenda = root.querySelector('#hpmud_agenda');
        agenda.replaceChildren();
        const entries = state.scene?.timelineEntries?.length
            ? state.scene.timelineEntries.slice(-4)
            : [{
                clock: state.clock,
                label: state.phase === 'playing' ? state.scene?.summary || '当前场景' : '世界导演编排首幕',
            }];
        agenda.setAttribute(
            'aria-label',
            `当前场景现场记录：${entries
                .map(entry => `${entry.clock || ''} ${entry.label || ''}`)
                .join('；')}`,
        );
        entries.forEach(entry => {
            const row = document.createElement('span');
            const time = document.createElement('time');
            time.textContent = entry.timeLabel || String(entry.clock || '').split(' · ').at(-1) || '现在';
            row.append(time, document.createTextNode(` ${entry.label || ''}`));
            agenda.append(row);
        });
        renderSceneArchiveList(state);
        renderMiniMap(state);
    }

    function renderSceneArchiveList(state) {
        const list = root.querySelector('#hpmud_scene_archive_list');
        const archive = state.sceneArchive || [];
        const current = root.querySelector('#hpmud_current_scene_card');
        root.querySelector('#hpmud_scene_archive_count').textContent = String(archive.length);
        current.replaceChildren();
        const currentLabel = document.createElement('small');
        const currentTitle = document.createElement('strong');
        const currentMeta = document.createElement('span');
        currentLabel.textContent = 'CURRENT SCENE';
        currentTitle.textContent = state.scene?.name ||
            state.scene?.nameEn ||
            '当前场景';
        currentMeta.textContent = [
            String(state.scene?.startedClock || state.clock || '')
                .split(' · ')
                .at(-1),
            state.location,
        ].filter(Boolean).join(' · ');
        current.append(currentLabel, currentTitle, currentMeta);
        list.replaceChildren();
        if (!archive.length) {
            const empty = document.createElement('div');
            empty.className = 'hpmud-scene-archive-empty';
            empty.textContent = '首个场景结束后会在这里生成只读档案。';
            list.append(empty);
            return;
        }
        const visibleArchive = [...archive]
            .reverse()
            .slice(0, session.archiveListLimit);
        visibleArchive.forEach(scene => {
            const button = document.createElement('button');
            button.type = 'button';
            const marker = document.createElement('i');
            const content = document.createElement('span');
            const title = document.createElement('strong');
            const meta = document.createElement('small');
            title.textContent = scene.name || scene.nameEn || '未命名场景';
            meta.textContent = [
                String(scene.endedClock || '').split(' · ').at(-1),
                scene.location,
            ].filter(Boolean).join(' · ');
            content.append(title, meta);
            button.append(marker, content);
            button.addEventListener('click', () => openSceneArchive(scene.id));
            list.append(button);
        });
        if (visibleArchive.length < archive.length) {
            const more = document.createElement('button');
            more.type = 'button';
            more.className = 'hpmud-archive-more';
            more.textContent = `加载更早场景 · 还剩 ${archive.length - visibleArchive.length}`;
            more.addEventListener('click', () => {
                session.archiveListLimit += ARCHIVE_LIST_PAGE_SIZE;
                renderSceneArchiveList(state);
            });
            list.append(more);
        }
    }

    function renderSceneArchiveTranscript(scene, preserveScrollAnchor = false) {
        const transcript = root.querySelector('#hpmud_archive_transcript');
        const scroll = transcript.closest('.hpmud-dialog-scroll');
        const previousHeight = scroll?.scrollHeight || 0;
        transcript.replaceChildren();
        const context = getContext();
        const messageIds = scene.messageIds || [];
        const visibleIds = messageIds.slice(-session.archiveTranscriptLimit);
        if (visibleIds.length < messageIds.length) {
            const more = document.createElement('button');
            more.type = 'button';
            more.className = 'hpmud-load-earlier';
            more.textContent =
                `↑ 向上加载更早记录 · 还剩 ${messageIds.length - visibleIds.length}`;
            more.addEventListener('click', () => {
                session.archiveTranscriptLimit += ARCHIVE_TRANSCRIPT_PAGE_SIZE;
                renderSceneArchiveTranscript(scene, true);
            });
            transcript.append(more);
        }
        visibleIds.forEach(messageId => {
            const message = context.chat[messageId];
            if (message) {
                transcript.append(renderMessage(message, messageId));
            }
        });
        const quillCard = renderAuthorQuillCard(
            {
                authorQuill: scene.authorQuill,
                authorQuillEn: scene.authorQuillEn,
            },
            {
                mes:
                    scene.authorQuillEn ||
                    scene.authorQuill ||
                    '',
            },
        );
        if (quillCard) {
            quillCard.classList.add('is-archive');
            transcript.append(quillCard);
        }
        if (!transcript.childElementCount) {
            const empty = document.createElement('div');
            empty.className = 'hpmud-scene-archive-empty';
            empty.textContent = scene.closureSummary || scene.summary ||
                '该场景没有可显示的现场转录。';
            transcript.append(empty);
        }
        if (preserveScrollAnchor && scroll) {
            scroll.scrollTop += scroll.scrollHeight - previousHeight;
        }
    }

    function openSceneArchive(sceneId) {
        const state = getWorldState();
        const scene = state.sceneArchive.find(item => item.id === sceneId);
        if (!scene) {
            toastr.warning('该场景档案不存在或尚未完成封存。');
            return;
        }
        session.archiveTranscriptLimit = ARCHIVE_TRANSCRIPT_PAGE_SIZE;
        root.querySelector('#hpmud_archive_title').textContent =
            scene.name || scene.nameEn || '场景档案';
        const meta = root.querySelector('#hpmud_archive_meta');
        meta.replaceChildren();
        [
            ['时间', `${scene.startedClock || '未知'} → ${scene.endedClock || '未知'}`],
            ['地点', scene.location || scene.roomId || '未知地点'],
            ['结算', scene.tier === 'high' ? '高档重大转折' : '中档普通切场'],
        ].forEach(([label, detail]) => {
            const card = document.createElement('div');
            const strong = document.createElement('strong');
            const small = document.createElement('small');
            strong.textContent = label;
            small.textContent = detail;
            card.append(strong, small);
            meta.append(card);
        });
        const timeline = root.querySelector('#hpmud_archive_timeline');
        timeline.replaceChildren();
        const timelineEntries = scene.timelineEntries || [];
        timeline.setAttribute(
            'aria-label',
            `已封存现场记录：${timelineEntries
                .map(entry => `${entry.clock || ''} ${entry.label || ''}`)
                .join('；')}`,
        );
        timelineEntries.forEach(entry => {
            const row = document.createElement('span');
            const time = document.createElement('time');
            time.textContent = entry.timeLabel ||
                String(entry.clock || '').split(' · ').at(-1) ||
                '未知';
            row.append(
                time,
                document.createTextNode(` ${entry.label || ''}`),
            );
            timeline.append(row);
        });
        renderSceneArchiveTranscript(scene);
        sceneArchiveDialog.showModal();
    }

    function updateSceneDestinationStatus() {
        const state = getMudState();
        const input = root.querySelector('#hpmud_transition_destination');
        const status = root.querySelector('#hpmud_transition_destination_status');
        const intent = state?.scene?.nextSceneIntent;
        const usesDefault = input.value.trim() ===
            String(input.dataset.defaultValue || '').trim();
        const destination = usesDefault && intent
            ? {
                mapId: intent.mapId,
                roomId: intent.roomId,
                roomName: getRoomName(
                    state,
                    intent.mapId,
                    intent.roomId,
                ),
            }
            : findSceneDestination(input.value, state);
        status.textContent = destination
            ? `${usesDefault ? '导演预排' : '用户覆盖'} · ${destination.roomName || destination.roomId} (${destination.roomId})`
            : '用户覆盖未匹配固定房间；结算时导演会在现有地图中选择最合适的位置。';
    }

    function formatNextSceneIntent(intent) {
        return [
            intent?.title || intent?.titleEn,
            intent?.summary || intent?.summaryEn,
        ].filter(Boolean).join('：');
    }

    function openSceneTransitionDialog() {
        const state = getWorldState();
        if (state.phase !== 'playing' || !state.scene) {
            toastr.warning('当前没有可以封存的活动场景。');
            return;
        }
        if (jobRegistry.sceneTransitionActive || jobRegistry.turnActive) {
            toastr.warning('世界状态仍在结算，请稍候。');
            return;
        }
        const intent = validateNextSceneIntent(
            state.scene.nextSceneIntent,
            state,
        ).valid
            ? state.scene.nextSceneIntent
            : createFallbackNextSceneIntent(state);
        root.querySelector('#hpmud_transition_scene_name').textContent =
            state.scene.name || state.scene.nameEn || '当前场景';
        root.querySelector('#hpmud_transition_scene_meta').textContent =
            `${state.clock} · ${state.location}`;
        const input = root.querySelector('#hpmud_transition_destination');
        input.dataset.defaultValue = formatNextSceneIntent(intent);
        input.value = state.sceneTransition?.status === 'failed' &&
            state.sceneTransition.destinationHint
            ? state.sceneTransition.destinationHint
            : input.dataset.defaultValue;
        const selectedTier = state.sceneTransition?.status === 'failed'
            ? state.sceneTransition.tier
            : intent.tier;
        root.querySelector(
            `input[name="scene_transition_tier"][value="${selectedTier}"]`,
        ).checked = true;
        updateSceneDestinationStatus();
        sceneTransitionDialog.showModal();
    }

    function renderStory(preserveScrollAnchor = false) {
        const context = getContext();
        const state = getWorldState();
        const sceneId = state.scene?.id || '';
        if (session.renderedSceneId !== sceneId) {
            session.renderedSceneId = sceneId;
            session.currentSceneMessageLimit = CURRENT_SCENE_PAGE_SIZE;
            session.archiveListLimit = ARCHIVE_LIST_PAGE_SIZE;
        }
        const entries = getCurrentSceneMessageEntries(context, state);
        const visibleEntries = entries.slice(-session.currentSceneMessageLimit);
        const previousHeight = storyElement.scrollHeight;
        const wasNearBottom = storyElement.scrollHeight - storyElement.scrollTop - storyElement.clientHeight < 100;
        storyElement.replaceChildren();

        if (state.phase === 'playing' && state.scene) {
            const heading = document.createElement('section');
            heading.className = 'hpmud-current-scene-heading';
            const eyebrow = document.createElement('small');
            const title = document.createElement('h2');
            const summary = document.createElement('p');
            const meta = document.createElement('span');
            eyebrow.textContent = 'CURRENT SCENE · 当前场景';
            title.textContent = state.scene.name ||
                state.scene.nameEn ||
                '未命名场景';
            summary.textContent = state.scene.summary ||
                state.scene.summaryEn ||
                '场景已经建立，等待下一步行动。';
            meta.textContent = [
                state.scene.startedClock || state.clock,
                state.location,
            ].filter(Boolean).join(' · ');
            heading.append(eyebrow, title, summary, meta);
            storyElement.append(heading);
        }

        if (visibleEntries.length < entries.length) {
            const more = document.createElement('button');
            more.type = 'button';
            more.className = 'hpmud-load-earlier';
            more.textContent =
                `↑ 向上加载当前场景更早记录 · 还剩 ${entries.length - visibleEntries.length}`;
            more.addEventListener('click', () => {
                session.currentSceneMessageLimit += CURRENT_SCENE_PAGE_SIZE;
                renderStory(true);
            });
            storyElement.append(more);
        }

        if (!visibleEntries.length) {
            const empty = document.createElement('div');
            if (state.phase === 'playing') {
                empty.className = 'hpmud-empty hpmud-current-scene-empty';
                empty.textContent = '当前场景尚无现场记录。';
            } else {
                empty.className = `hpmud-empty hpmud-opening-state phase-${state.phase}`;
            }
            if (state.phase === 'playing') {
                // The current-scene heading already provides the scene context.
            } else if (state.phase === 'initialization_failed') {
                empty.innerHTML = `
                <small>OPENING TRANSACTION PAUSED</small>
                <strong>首幕编排没有提交</strong>
                <span></span>
                <button id="hpmud_retry_opening" type="button">重新编排首幕</button>
            `;
                empty.querySelector('span').textContent = state.opening?.error || '世界导演调用失败。';
                empty.querySelector('#hpmud_retry_opening').addEventListener('click', () => {
                    void initializeOpeningWorld().catch(error => {
                        console.error('[Hogwarts MUD] Opening retry failed', error);
                        toastr.error(String(error?.cause?.message || error?.message || error));
                    });
                });
            } else {
                const hasCommittedWorld = Boolean(state.opening?.package);
                empty.innerHTML = `
                <small>WORLD OPENING TRANSACTION</small>
                <strong>${hasCommittedWorld ? '场景已固化，正在书写第一幕' : '世界导演正在编排你的开场'}</strong>
                <span>${hasCommittedWorld
        ? '时间、地点、地图、人物与隐藏故事线已经提交。中档编排场景、低档生成对白可能需要数分钟，请保持页面开启。'
        : '正在根据人物背景确定时间、家庭场景、在场人物与戏剧冲突。导演接口可能需要数分钟，请保持页面开启。'}</span>
                <ol>
                    <li class="${hasCommittedWorld ? 'done' : 'active'}">世界导演建立场景</li>
                    <li class="${hasCommittedWorld ? 'active' : ''}">中档编排场景 · 低档生成对白</li>
                    <li>等待你的第一个行动</li>
                </ol>
            `;
            }
            storyElement.append(empty);
        } else {
            visibleEntries.forEach(({ message, messageId }) =>
                storyElement.append(renderMessage(message, messageId)));
        }

        const failedPlayerTurn =
            getFailedPlayerTurn(
                context.chat,
                state.turn,
            );
        if (
            failedPlayerTurn &&
            !jobRegistry.turnActive
        ) {
            const failure =
                document.createElement(
                    'div',
                );
            failure.className =
                'hpmud-system-turn hpmud-turn-failure';
            const title =
                document.createElement(
                    'strong',
                );
            const detail =
                document.createElement(
                    'span',
                );
            const retry =
                document.createElement(
                    'button',
                );
            title.textContent =
                '回复生成失败，玩家消息已保存';
            detail.textContent =
                failedPlayerTurn.error ||
                '低档没有提交有效的场景回复。';
            retry.type = 'button';
            retry.className =
                'hpmud-retry-turn';
            retry.textContent =
                '重试本回合';
            retry.addEventListener(
                'click',
                () => {
                    retry.disabled = true;
                    retry.classList.add(
                        'is-loading',
                    );
                    retry.textContent =
                        '正在重试';
                    void retryFailedPlayerTurn();
                },
            );
            failure.append(
                title,
                detail,
                retry,
            );
            storyElement.append(failure);
        }

        if (jobRegistry.sceneTransitionActive && state.phase === 'playing') {
            const highTier =
                state.sceneTransition?.tier === 'high';
            storyElement.append(createGenerationStatusCard({
                tier: highTier ? 'high' : 'medium',
                eyebrow: highTier
                    ? 'WORLD DIRECTOR · ATOMIC'
                    : 'SCENE DIRECTOR · ATOMIC',
                title: highTier
                    ? '高档正在结算重大转折'
                    : '中档正在封存场景并建立下一幕',
                detail: '结构化状态将在完整校验后一次提交；旧场景在此之前保持可玩。',
                steps: [
                    '收束旧场景',
                    '确认人物与地点',
                    '预写下一幕',
                    '原子提交',
                ],
                activeStep: 1,
            }));
        } else if (jobRegistry.turnActive && state.phase === 'playing') {
            if (state.directorFoundation?.status === 'building') {
                storyElement.append(createGenerationStatusCard({
                    tier: 'high',
                    eyebrow: 'WORLD DIRECTOR · PRIVATE',
                    title: '正在建立人物库与隐藏故事线',
                    detail: '角色秘密、知识边界和线索图只在完整校验后写入存档。',
                    steps: [
                        '读取角色背景',
                        '建立人物关系',
                        '预写隐藏线索',
                        '提交世界状态',
                    ],
                    activeStep: 2,
                }));
            } else if (state.dailyDirector?.status === 'building') {
                storyElement.append(createGenerationStatusCard({
                    tier: 'medium',
                    eyebrow: 'DAILY DIRECTOR · ONCE PER DAY',
                    title: '中档正在编排今日人物计划',
                    detail: '正在整理人物动机、线索机会与本日时间策略。',
                    steps: [
                        '回顾昨日事件',
                        '更新人物目标',
                        '安排线索机会',
                        '提交日计划',
                    ],
                    activeStep: 1,
                }));
            } else if (
                state.memoryDirector?.status ===
                    'consolidating'
            ) {
                storyElement.append(createGenerationStatusCard({
                    tier: 'medium',
                    eyebrow: 'MEMORY DIRECTOR · PERIODIC',
                    title: '中档正在整理共同记忆',
                    detail: '合并重复小事、提炼近期大事，并判断哪些经历真正留下长期印记。',
                    steps: [
                        '回看共同经历',
                        '合并日常碎片',
                        '提炼重要事件',
                        '更新人物印象',
                    ],
                    activeStep: 1,
                }));
            } else if (
                state.pacingDirector?.status === 'assessing'
            ) {
                storyElement.append(createGenerationStatusCard({
                    tier: 'medium',
                    eyebrow: 'PACING DIRECTOR · LIVE CHECK',
                    title: '中档正在检查场景节奏',
                    detail: '判断是否需要新人物、公开危机或主线转机。',
                    steps: [
                        '检查重复阵容',
                        '衡量场景压力',
                        '选择介入方式',
                        '提交公开转机',
                    ],
                    activeStep: 1,
                }));
            } else if (session.liveSceneStream) {
                storyElement.append(renderLiveSceneStream());
            } else {
                storyElement.append(createGenerationStatusCard({
                    tier: 'low',
                    eyebrow: 'ON-SCENE PERFORMER · CONNECTING',
                    title: '低档正在接管现场',
                    detail: '正在读取玩家行动、空间关系与导演指令。',
                    steps: [
                        '读取行动',
                        '书写现场',
                        '译入中文',
                        '提交状态',
                    ],
                    activeStep: 0,
                }));
            }
        }
        if (!jobRegistry.sceneTransitionActive &&
            state.sceneTransition?.status === 'failed') {
            const failure = document.createElement('div');
            failure.className = 'hpmud-system-turn hpmud-transition-failure';
            const title = document.createElement('strong');
            const detail = document.createElement('span');
            const retry = document.createElement('button');
            title.textContent = '场景封存失败';
            detail.textContent = state.sceneTransition.error ||
                '结算包未通过规则校验。';
            retry.type = 'button';
            retry.textContent = '重新打开结算';
            retry.addEventListener('click', openSceneTransitionDialog);
            failure.append(title, detail, retry);
            storyElement.append(failure);
        }

        if (preserveScrollAnchor) {
            storyElement.scrollTop += storyElement.scrollHeight - previousHeight;
        } else if (wasNearBottom || jobRegistry.turnActive || jobRegistry.sceneTransitionActive) {
            storyElement.scrollTop = storyElement.scrollHeight;
        }
    }

    function syncComposerState(state) {
        const foundationBuilding = state.directorFoundation?.status === 'building';
        const dailyDirectorBuilding = state.dailyDirector?.status === 'building';
        const pacingDirectorBuilding =
            state.pacingDirector?.status === 'assessing';
        const memoryDirectorBuilding =
            state.memoryDirector?.status ===
                'consolidating';
        const sceneTransitionBuilding = jobRegistry.sceneTransitionActive ||
            state.sceneTransition?.status === 'resolving';
        const failedPlayerTurn =
            getFailedPlayerTurn(
                getContext().chat,
                state.turn,
            );
        const ready = state.phase === 'playing' &&
            !foundationBuilding &&
            !dailyDirectorBuilding &&
            !pacingDirectorBuilding &&
            !memoryDirectorBuilding &&
            !sceneTransitionBuilding &&
            !failedPlayerTurn &&
            !jobRegistry.turnActive;
        const composer = root.querySelector('#hpmud_composer');
        composer.classList.toggle('locked', !ready);
        composer.querySelectorAll('textarea, input, button').forEach(control => {
            control.disabled = !ready;
        });
        const rollbackButton =
            root.querySelector(
                '#hpmud_rollback_turn',
            );
        const rollbackCheckpoint =
            getAvailableTurnRollbackCheckpoint(
                state,
                getContext().chat,
            );
        rollbackButton.disabled =
            !ready;
        rollbackButton.title =
            rollbackCheckpoint
                ? '删除上一组玩家/场景消息，并恢复该回合提交前的世界状态'
                : '回滚上一轮；旧存档会从已提交事务重建回合前状态';
        if (!ready) {
            closeMovementPicker();
            closeSpellPicker();
        }
        composerInput.placeholder = ready
            ? '写下你的行动、台词或想法……'
            : failedPlayerTurn
                ? '上一条玩家消息已保存，请先在上方重试本回合'
                : foundationBuilding
                    ? '世界导演正在建立出场角色库与隐藏故事线，请稍候'
                    : dailyDirectorBuilding
                        ? '中档正在执行本日唯一一次日结，请稍候'
                        : memoryDirectorBuilding
                            ? '中档正在整理人物印象与共同记忆，请稍候'
                            : pacingDirectorBuilding
                                ? '中档正在检查场景节奏与人物变化，请稍候'
                                : sceneTransitionBuilding
                                    ? '正在封存当前场景并建立下一幕，请稍候'
                                    : jobRegistry.turnActive
                                        ? '低档正在表演本轮动作、场景与对白，请稍候'
                                        : state.phase === 'initialization_failed'
                                            ? '首幕编排失败，请先在上方重试'
                                            : '世界正在建立，首幕完成后即可行动';
    }

    return {
        initials,
        getPeopleDisplay,
        renderHeaderAndScene,
        renderSceneArchiveList,
        renderSceneArchiveTranscript,
        openSceneArchive,
        updateSceneDestinationStatus,
        formatNextSceneIntent,
        openSceneTransitionDialog,
        renderStory,
        syncComposerState,
    };
}
