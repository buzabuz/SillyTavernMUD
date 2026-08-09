import {
    createItemCard,
    createItemLedger,
} from './item-components.js';

export function createInspectorController(ports) {
    const {
        refs,
        session,
    } = ports;

    const {
        SPELL_LEARNING_SOURCE_LABELS,
        buildActorAppearanceView,
        buildSocialAudienceProjection,
        createItemReferenceDirective,
        getKnownSpellMap,
        getRoomName,
        getSpellDefinition,
        getSpellProficiency,
        getWorldState,
        initials,
        insertAtCursor,
        normalizeActorMemoryProfile,
        projectActorItems,
        projectItemLedger,
        projectPeoplePanel,
        renderInspectorMap,
        setComposerAddressTarget,
        setComposerSpell,
    } = ports;

    const {
        root,
        inspectorElement,
    } = refs;

    function createInspectorCard(title, content) {
        const card = document.createElement('section');
        card.className = 'hpmud-inspector-card';
        if (title) {
            const heading = document.createElement('h3');
            heading.textContent = title;
            card.append(heading);
        }
        card.append(content);
        return card;
    }

    function createList(entries, emptyText = '暂无') {
        const list = document.createElement('ul');
        list.className = 'hpmud-inspector-list';
        if (!entries.length) {
            const item = document.createElement('li');
            item.textContent = emptyText;
            list.append(item);
            return list;
        }
        for (const entry of entries) {
            const item = document.createElement('li');
            if (typeof entry === 'string') {
                item.textContent = entry;
            } else {
                item.textContent = entry.label || entry.name || '';
                if (entry.detail) {
                    const detail = document.createElement('small');
                    detail.textContent = entry.detail;
                    item.append(detail);
                }
            }
            list.append(item);
        }
        return list;
    }

    function renderActorImpression(profile, actor) {
        const dynamic = normalizeActorMemoryProfile(
            profile || {},
            actor || {},
        );
        const panel = document.createElement('div');
        panel.className = 'hpmud-impression';
        const quote = document.createElement('p');
        quote.textContent =
            dynamic.impressionOfPlayer ||
            dynamic.impressionOfPlayerEn ||
            '对方还没有形成清晰看法。';
        const meta = document.createElement('small');
        const updatedClock =
            dynamic.impressionUpdatedClock ||
            '等待新的共同经历';
        meta.textContent =
            dynamic.impressionUpdatedTurn
                ? `TURN ${dynamic.impressionUpdatedTurn} · ${updatedClock}`
                : updatedClock;
        panel.append(quote, meta);
        return panel;
    }

    function renderSharedMemoryLedger(profile, actor) {
        const dynamic = normalizeActorMemoryProfile(
            profile || {},
            actor || {},
        );
        const ledger = document.createElement('div');
        ledger.className = 'hpmud-memory-ledger';
        const tiers = [
            {
                id: 'core',
                label: '最深刻的',
                hint: '长期留存',
            },
            {
                id: 'recent',
                label: '近期大事',
                hint: '仍在影响当下',
            },
            {
                id: 'everyday',
                label: '日常小事',
                hint: '相处留下的细节',
            },
        ];
        tiers.forEach(tier => {
            const memories =
                dynamic.sharedMemories[tier.id] || [];
            const section = document.createElement('section');
            section.className =
                `hpmud-memory-tier tier-${tier.id}`;
            const header = document.createElement('header');
            const title = document.createElement('strong');
            const count = document.createElement('span');
            const hint = document.createElement('small');
            title.textContent = tier.label;
            count.textContent = String(memories.length);
            hint.textContent = tier.hint;
            header.append(title, count, hint);
            const entries = document.createElement('div');
            entries.className = 'hpmud-memory-entries';
            if (!memories.length) {
                const empty = document.createElement('p');
                empty.className = 'hpmud-memory-empty';
                empty.textContent =
                    tier.id === 'core'
                        ? '还没有足以长久留下的共同经历。'
                        : '这一层暂时没有记录。';
                entries.append(empty);
            } else {
                [...memories].reverse().forEach(memory => {
                    const entry = document.createElement('article');
                    const summary = document.createElement('p');
                    const time = document.createElement('time');
                    summary.textContent =
                        memory.summary ||
                        memory.summaryEn;
                    time.textContent =
                        memory.lastClock ||
                        memory.firstClock ||
                        '时间未记';
                    entry.append(summary, time);
                    entries.append(entry);
                });
            }
            section.append(header, entries);
            ledger.append(section);
        });
        return ledger;
    }

    function getSocialActorName(
        state,
        actorId,
    ) {
        if (actorId === 'player') {
            return '你';
        }
        const actor = [
            ...(state.actorLibrary || []),
            ...(state.actors || []),
        ].find(entry =>
            entry.id === actorId);
        return actor?.name ||
            actor?.nameEn ||
            actorId;
    }

    function renderActorSocialStatements(
        state,
        actorId,
    ) {
        const categoryLabels = {
            family: '家庭',
            origin: '出身',
            education: '教育',
            wealth: '经济',
            occupation: '职业',
            identity: '身份',
            history: '经历',
            preference: '偏好',
            other: '公开说法',
        };
        const statements =
            buildSocialAudienceProjection(
                state,
                'player',
            )
                .statements
                .filter(statement =>
                    statement.subjectId ===
                        actorId)
                .map(statement => ({
                    label: [
                        categoryLabels[
                            statement.category
                        ] ||
                        '公开说法',
                        statement.speakerId !==
                            actorId
                            ? `由 ${getSocialActorName(
                                state,
                                statement.speakerId,
                            )} 提及`
                            : '',
                    ].filter(Boolean)
                        .join(' · '),
                    detail:
                        statement.text ||
                        statement.textEn,
                }));
        return createList(
            statements,
            '你还没有亲耳得知此人的家庭或背景声明。',
        );
    }

    function renderActorSocialRelationships(
        state,
        actorId,
    ) {
        const projection =
            buildSocialAudienceProjection(
                state,
                'player',
            );
        const edgeByDirection =
            new Map(
                projection.relationships
                    .map(edge => [
                        `${edge.sourceActorId}->${edge.targetActorId}`,
                        edge,
                    ]),
            );
        const dimensions = [
            ['familiarity', '熟悉'],
            ['closeness', '亲近'],
            ['warmth', '温暖'],
            ['trust', '信任'],
            ['respect', '尊重'],
            ['influence', '影响'],
            ['tension', '张力'],
            ['resentment', '积怨'],
            ['fear', '恐惧'],
            ['protectiveness', '保护'],
        ];
        const formatEdge = edge => {
            const sourceName =
                getSocialActorName(
                    state,
                    edge.sourceActorId,
                );
            const targetName =
                getSocialActorName(
                    state,
                    edge.targetActorId,
                );
            const labels =
                (edge.labels || [])
                    .join(' / ');
            const activeEmotions =
                (edge.activeEmotions || [])
                    .map(emotion =>
                        `${emotion.emotion} ${emotion.intensity}`)
                    .join('、');
            const latestEvidence =
                edge.latestEvidence
                    ?.summary ||
                edge.latestEvidence
                    ?.summaryEn ||
                '';
            return {
                label: [
                    `${sourceName} → ${targetName}`,
                    labels,
                ].filter(Boolean).join(' · '),
                detail: [
                    dimensions
                        .map(([key, label]) =>
                            `${label} ${Math.round(
                                Number(
                                    edge[key] ||
                                    0,
                                ),
                            )}`)
                        .join(' · '),
                    activeEmotions &&
                        `短期情绪：${activeEmotions}`,
                    latestEvidence &&
                        `最新 evidence：${latestEvidence}`,
                ].filter(Boolean).join(' · '),
            };
        };
        const directDirections = [
            [actorId, 'player'],
            ['player', actorId],
        ];
        const relationships =
            directDirections.map(
                ([sourceActorId, targetActorId]) => {
                    const edge =
                        edgeByDirection.get(
                            `${sourceActorId}->${targetActorId}`,
                        );
                    if (edge) {
                        return formatEdge(edge);
                    }
                    return {
                        label:
                            `${getSocialActorName(
                                state,
                                sourceActorId,
                            )} → ${getSocialActorName(
                                state,
                                targetActorId,
                            )}`,
                        detail:
                            '尚无玩家可知记录。',
                    };
                },
            );
        projection.relationships
            .filter(edge =>
                (
                    edge.sourceActorId ===
                        actorId ||
                    edge.targetActorId ===
                        actorId
                ) &&
                !directDirections.some(
                    ([sourceActorId, targetActorId]) =>
                        edge.sourceActorId ===
                            sourceActorId &&
                        edge.targetActorId ===
                            targetActorId,
                ))
            .map(formatEdge)
            .forEach(entry =>
                relationships.push(entry));
        return createList(
            relationships,
            '还没有形成你可知的人际关系记录。',
        );
    }

    function renderInspector(tab = 'character') {
        const state = getWorldState();
        const character = state.character;
        inspectorElement.replaceChildren();
        root.querySelectorAll('[data-hpmud-tab]').forEach(button => {
            button.classList.toggle('active', button.dataset.hpmudTab === tab);
        });

        if (tab === 'actor') {
            const actor = state.actors.find(item => item.id === session.selectedActorId);
            const profile = state.actorLibrary.find(item => item.id === session.selectedActorId);
            if (!actor && !profile) {
                session.selectedActorId = '';
                renderInspector('character');
                return;
            }
            const name =
                profile?.name ||
                actor?.name ||
                profile?.nameEn ||
                actor?.nameEn ||
                '未知人物';
            const identity = document.createElement('div');
            identity.className = 'hpmud-profile hpmud-actor-profile';
            identity.innerHTML = `
            <span class="hpmud-profile-avatar">${initials(name)}</span>
            <span><h2></h2><p></p></span>
        `;
            identity.querySelector('h2').textContent = name;
            identity.querySelector('p').textContent = [
                profile?.role || actor?.role || profile?.roleEn,
                profile?.relationshipToPlayer || actor?.relationshipToPlayer,
            ].filter(Boolean).join(' · ');
            inspectorElement.append(createInspectorCard('', identity));
            if (
                projectPeoplePanel(state)
                    .activePeople
                    .some(person =>
                        person.id ===
                        session.selectedActorId)
            ) {
                const addressAction =
                    document.createElement(
                        'button',
                    );
                addressAction.type = 'button';
                addressAction.className =
                    'hpmud-tool-button';
                addressAction.textContent =
                    '插入对话块';
                addressAction.addEventListener(
                    'click',
                    () => {
                        setComposerAddressTarget(
                            profile?.name ||
                            actor?.name ||
                            profile?.nameEn ||
                            actor?.nameEn ||
                            actor.id,
                        );
                        toastr.success(
                            '已插入定向台词。',
                        );
                    },
                );
                inspectorElement.append(
                    createInspectorCard(
                        '',
                        addressAction,
                    ),
                );
            }
            inspectorElement.append(createInspectorCard(
                '对你的印象',
                renderActorImpression(profile, actor),
            ));
            inspectorElement.append(createInspectorCard(
                '共同记忆',
                renderSharedMemoryLedger(profile, actor),
            ));
            inspectorElement.append(createInspectorCard(
                '家庭与背景声明',
                renderActorSocialStatements(
                    state,
                    session.selectedActorId,
                ),
            ));
            inspectorElement.append(createInspectorCard(
                '已知人物关系',
                renderActorSocialRelationships(
                    state,
                    session.selectedActorId,
                ),
            ));
            const graphAction =
                document.createElement('button');
            graphAction.type = 'button';
            graphAction.className =
                'hpmud-tool-button';
            graphAction.textContent =
                '在关系星图中查看';
            graphAction.addEventListener(
                'click',
                () => void refs.relationshipGraphController
                    ?.open({
                        actorId:
                            session.selectedActorId,
                    }),
            );
            inspectorElement.append(
                createInspectorCard(
                    '',
                    graphAction,
                ),
            );
            inspectorElement.append(createInspectorCard('当前状态', createList([
                {
                    label: '所在位置',
                    detail: getRoomName(
                        state,
                        actor?.mapId || state.map.activeMapId,
                        actor?.roomId,
                    ),
                },
                {
                    label: '正在做',
                    detail:
                        actor?.currentActivity ||
                        actor?.currentActivityEn ||
                        '不在当前场景。',
                },
                {
                    label: '身份关系',
                    detail:
                        profile?.relationshipToPlayer ||
                        actor?.relationshipToPlayer ||
                        '尚未建立关系。',
                },
            ])));
            const appearance =
                buildActorAppearanceView(
                    state,
                    session.selectedActorId,
                );
            const currentPresentation = [
                appearance.presentation
                    .outfit
                    ? {
                        label: '服装',
                        detail:
                            appearance
                                .presentation
                                .outfit,
                    }
                    : null,
                appearance.presentation
                    .wornItems.length
                    ? {
                        label: '正式穿戴',
                        detail:
                            appearance
                                .presentation
                                .wornItems
                                .join(' · '),
                    }
                    : null,
                appearance.presentation
                    .accessories.length
                    ? {
                        label:
                            '隐含饰品',
                        detail:
                            appearance
                                .presentation
                                .accessories
                                .join(' · '),
                    }
                    : null,
                appearance.presentation
                    .hair
                    ? {
                        label: '当前发型',
                        detail:
                            appearance
                                .presentation
                                .hair,
                    }
                    : null,
                appearance.presentation
                    .visibleConditions
                    .length
                    ? {
                        label: '可见状态',
                        detail:
                            appearance
                                .presentation
                                .visibleConditions
                                .join(' · '),
                    }
                    : null,
                ...appearance.presentation
                    .heldItems.map(
                        entry => ({
                            label:
                                entry.hand ===
                                    'left'
                                    ? '左手'
                                    : entry
                                        .hand ===
                                        'right'
                                        ? '右手'
                                        : entry
                                            .hand ===
                                            'both'
                                            ? '双手'
                                            : '手持物',
                            detail:
                                entry.item,
                        }),
                    ),
            ].filter(Boolean);
            inspectorElement.append(
                createInspectorCard(
                    '当前呈现',
                    createList(
                        currentPresentation,
                        '没有记录到动态服装、发型或手持物。',
                    ),
                ),
            );
            const formalItems =
                projectActorItems(
                    state,
                    session
                        .selectedActorId,
                );
            if (
                formalItems.length
            ) {
                const itemList =
                    document.createElement(
                        'div',
                    );
                itemList.className =
                    'hpmud-item-grid hpmud-actor-item-grid';
                formalItems
                    .forEach(item =>
                        itemList.append(
                            createItemCard(
                                item,
                                {
                                    compact:
                                        true,
                                },
                            ),
                        ));
                inspectorElement
                    .append(
                        createInspectorCard(
                            '正式物品',
                            itemList,
                        ),
                    );
            }
            inspectorElement.append(createInspectorCard('公开档案', createList([
                {
                    label: '固定外貌',
                    detail:
                        appearance
                            .physicalDescription,
                },
                {
                    label: '已知背景',
                    detail: profile?.publicBackground || '你还不了解此人的过去。',
                },
                {
                    label: '性格',
                    detail: profile?.personality || '仍需通过交往了解。',
                },
                {
                    label: '说话方式',
                    detail: profile?.speechStyle || '仍需通过交谈了解。',
                },
            ])));
            return;
        }

        if (tab === 'character') {
            const profile = document.createElement('div');
            profile.className = 'hpmud-profile';
            profile.innerHTML = `
            <span class="hpmud-profile-avatar">${initials(character?.identity?.name)}</span>
            <span><h2></h2><p></p></span>
        `;
            profile.querySelector('h2').textContent = character?.identity?.name || '未命名角色';
            profile.querySelector('p').textContent = [
                character?.background?.bloodStatus,
                character?.aptitudes?.strongDomain && `优势：${character.aptitudes.strongDomain}`,
            ].filter(Boolean).join(' · ') || '一年级新生';
            inspectorElement.append(createInspectorCard('', profile));

            const tags = document.createElement('div');
            tags.className = 'hpmud-tags';
            Object.entries(character?.attributes || {}).forEach(([key, value]) => {
                const tag = document.createElement('span');
                const names = {
                    physique: '体魄',
                    agility: '灵巧',
                    perception: '感知',
                    intellect: '智识',
                    willpower: '意志',
                    charisma: '魅力',
                };
                tag.textContent = `${names[key] || key} ${value}`;
                tags.append(tag);
            });
            inspectorElement.append(createInspectorCard('基础属性', tags));
            inspectorElement.append(createInspectorCard('人物背景', createList([
                { label: '欲望', detail: character?.background?.desire || '未记录' },
                { label: '恐惧', detail: character?.background?.fear || '未记录' },
            ])));
            return;
        }

        if (tab === 'map') {
            renderInspectorMap(state);
            return;
        }

        if (tab === 'spells') {
            const knownById =
                getKnownSpellMap(
                    state,
                );
            const ledger =
                document.createElement(
                    'div',
                );
            ledger.className =
                'hpmud-spellbook-ledger';
            if (!knownById.size) {
                const empty =
                    document.createElement(
                        'p',
                    );
                empty.className =
                    'hpmud-memory-empty';
                empty.textContent =
                    '还没有已学咒语。课堂、自学和实验都会写入这里。';
                ledger.append(empty);
            } else {
                [
                    ...knownById
                        .values(),
                ]
                    .sort((left, right) =>
                        right
                            .proficiencyXp -
                        left
                            .proficiencyXp)
                    .forEach(entry => {
                        const spell =
                            getSpellDefinition(
                                entry.spellId,
                            );
                        if (!spell) {
                            return;
                        }
                        const rank =
                            getSpellProficiency(
                                entry
                                    .proficiencyXp,
                            );
                        const card =
                            document.createElement(
                                'article',
                            );
                        const heading =
                            document.createElement(
                                'header',
                            );
                        const title =
                            document.createElement(
                                'strong',
                            );
                        const use =
                            document.createElement(
                                'button',
                            );
                        const detail =
                            document.createElement(
                                'p',
                            );
                        const meta =
                            document.createElement(
                                'small',
                            );
                        title.textContent =
                            spell.incantation ||
                            spell.nameEn;
                        use.type =
                            'button';
                        use.textContent =
                            '插入';
                        use.addEventListener(
                            'click',
                            () =>
                                setComposerSpell(
                                    spell.id,
                                ),
                        );
                        detail.textContent =
                            `${spell.name} · ${spell.effect}`;
                        meta.textContent = [
                            rank.label,
                            `${
                                entry
                                    .proficiencyXp
                            } XP`,
                            SPELL_LEARNING_SOURCE_LABELS[
                                entry
                                    .learnedSource
                            ] ||
                            entry
                                .learnedSource,
                            `尝试 ${
                                entry.attempts
                            } 次`,
                        ].join(' · ');
                        heading.append(
                            title,
                            use,
                        );
                        card.append(
                            heading,
                            detail,
                            meta,
                        );
                        ledger.append(card);
                    });
            }
            inspectorElement.append(
                createInspectorCard(
                    '已学咒语',
                    ledger,
                ),
            );
            inspectorElement.append(
                createInspectorCard(
                    '学习规则',
                    createList([
                        {
                            label:
                                '课程年级仅供参考',
                            detail:
                                '不会阻断自学、私授或自行实验。',
                        },
                        {
                            label:
                                '所有结构化施法必定骰点',
                            detail:
                                '成功、失败和重大成功都会改变熟练度。',
                        },
                    ]),
                ),
            );
            return;
        }
        if (tab === 'items') {
            const referenceItem =
                item => {
                    const directive =
                        createItemReferenceDirective(
                            item,
                        );
                    if (!directive) {
                        return;
                    }
                    insertAtCursor(
                        directive,
                    );
                    root.classList.remove(
                        'hpmud-inspector-open',
                    );
                    root.querySelector(
                        '#hpmud_character',
                    )?.setAttribute(
                        'aria-expanded',
                        'false',
                    );
                    toastr.success(
                        `已引用 ${item.label} · ${item.id}`,
                    );
                };
            inspectorElement.append(
                createInspectorCard(
                    '',
                    createItemLedger(
                        projectItemLedger(
                            state,
                        ),
                        {
                            onReferenceItem:
                                referenceItem,
                        },
                    ),
                ),
            );
            return;
        }

        const map = {
            clues: ['线索', state.clues.filter(clue => clue.discovered === true)],
            status: ['状态', state.status],
        };
        const [title, entries] = map[tab] ?? map.clues;
        inspectorElement.append(createInspectorCard(title, createList(entries)));
        if (tab === 'status') {
            const knowledge = state.knowledgeBase || {};
            const counts = knowledge.categories || {};
            inspectorElement.append(createInspectorCard('本地世界档案', createList([
                {
                    label: knowledge.vectorStatus === 'ready' ? 'RAG 索引就绪' : 'RAG 索引待同步',
                    detail: `人物 ${counts.actors || 0} · 场景 ${counts.scenes || 0} · 事件 ${counts.events || 0} · 线索 ${counts.clues || 0}`,
                },
                {
                    label: '本地目录',
                    detail: knowledge.rootPath || '首次同步后生成',
                },
            ])));
        }
    }

    return {
        createInspectorCard,
        createList,
        renderActorImpression,
        renderSharedMemoryLedger,
        getSocialActorName,
        renderActorSocialStatements,
        renderActorSocialRelationships,
        renderInspector,
    };
}
