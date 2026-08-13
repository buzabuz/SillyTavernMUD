import {
    createItemCard,
    createItemLedger,
} from './item-components.js';
import {
    IDENTITY_SOURCE_LABELS,
} from './npc-identity-dossier.js';
import {
    buildActorDossierViewModel,
} from '../domain/actor-dossier-projection.js';

export function createInspectorController(ports) {
    const {
        refs,
        session,
    } = ports;

    const {
        SPELL_LEARNING_SOURCE_LABELS,
        createItemReferenceDirective,
        getKnownSpellMap,
        getRoomName,
        getSpellDefinition,
        getSpellProficiency,
        getWorldState,
        initials,
        insertAtCursor,
        projectItemLedger,
        renderInspectorMap,
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
                const label =
                    document.createElement(
                        'span',
                    );
                label.className =
                    'hpmud-inspector-entry-label';
                label.textContent =
                    entry.label ||
                    entry.name ||
                    '';
                item.append(label);
                const sourceLabel =
                    IDENTITY_SOURCE_LABELS[
                        entry.sourceKind
                    ];
                if (sourceLabel) {
                    const source =
                        document.createElement(
                            'span',
                        );
                    source.className =
                        `hpmud-identity-source is-${entry.sourceKind}`;
                    source.textContent =
                        sourceLabel;
                    item.append(source);
                }
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

    function renderMemoryLedger(memories) {
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
            const entriesForTier =
                memories[tier.id] || [];
            const section = document.createElement('section');
            section.className =
                `hpmud-memory-tier tier-${tier.id}`;
            const header = document.createElement('header');
            const title = document.createElement('strong');
            const count = document.createElement('span');
            const hint = document.createElement('small');
            title.textContent = tier.label;
            count.textContent = String(entriesForTier.length);
            hint.textContent = tier.hint;
            header.append(title, count, hint);
            const entries = document.createElement('div');
            entries.className = 'hpmud-memory-entries';
            if (!entriesForTier.length) {
                const empty = document.createElement('p');
                empty.className = 'hpmud-memory-empty';
                empty.textContent =
                    tier.id === 'core'
                        ? '还没有足以长久留下的共同经历。'
                        : '这一层暂时没有记录。';
                entries.append(empty);
            } else {
                [...entriesForTier].reverse().forEach(memory => {
                    const entry = document.createElement('article');
                    const summary = document.createElement('p');
                    const time = document.createElement('time');
                    summary.textContent =
                        memory.summary;
                    time.textContent =
                        [
                            memory.sourceBadge,
                            memory.clock,
                        ].filter(Boolean)
                            .join(' · ') ||
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

    function renderRelationship(relationship) {
        const panel =
            document.createElement('div');
        panel.className =
            'hpmud-dossier-relationship';
        const subsection = (
            title,
            content,
        ) => {
            const section =
                document.createElement(
                    'section',
                );
            section.className =
                'hpmud-relationship-subsection';
            const heading =
                document.createElement(
                    'h4',
                );
            heading.textContent = title;
            section.append(
                heading,
                content,
            );
            return section;
        };
        const labels =
            document.createElement('div');
        labels.className =
            'hpmud-tags';
        relationship.labels
            .forEach(label => {
                const tag =
                    document.createElement(
                        'span',
                    );
                tag.textContent = label;
                labels.append(tag);
            });
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
        const metricList =
            createList(
                dimensions.map(
                    ([key, label]) => ({
                        label,
                        detail: String(
                            Math.round(
                                Number(
                                    relationship
                                        .dimensions[
                                            key
                                        ] || 0,
                                ),
                            ),
                        ),
                    }),
                ),
            );
        const impressions =
            createList([
                {
                    label: '初见印象',
                    detail:
                        relationship
                            .firstImpression
                            ?.summary ||
                        '尚无初见印象记录。',
                },
                {
                    label: '当前看法',
                    detail:
                        relationship
                            .currentSchema
                            ?.interpretation ||
                        '尚未形成稳定看法。',
                },
                {
                    label: '行为预期',
                    detail:
                        relationship
                            .currentSchema
                            ?.expectation ||
                        '暂无稳定预期。',
                },
                relationship
                    .currentSchema
                    ? {
                        label:
                            'Schema 依据',
                        detail:
                            `${Math.round(
                                relationship
                                    .currentSchema
                                    .confidence *
                                100,
                            )}% · ` +
                            `${relationship.currentSchema.status} · ` +
                            `${relationship.currentSchema.supportingCount} 条支持 · ` +
                            `${relationship.currentSchema.counterexampleCount} 条反例`,
                    }
                    : null,
            ].filter(Boolean));
        const sentiments =
            relationship
                .activeSentiments
                .map(sentiment => ({
                    label:
                        sentiment.emotion ||
                        '短期情绪',
                    detail:
                        String(
                            sentiment
                                .intensity ??
                            '',
                        ),
                }));
        const evidence =
            relationship
                .evidenceRefs
                .map(reference => ({
                    label:
                        [
                            '关系证据',
                            reference.clock,
                        ].filter(Boolean)
                            .join(' · '),
                    detail:
                        reference.summary,
                }));
        panel.append(
            labels,
            subsection(
                '印象与预期',
                impressions,
            ),
            subsection(
                '关系维度',
                metricList,
            ),
            subsection(
                '当前情绪',
                createList(
                    sentiments,
                    '当前没有活跃情绪。',
                ),
            ),
            subsection(
                '关系证据',
                createList(
                    evidence,
                    '尚无玩家可见的关系证据。',
                ),
            ),
        );
        return panel;
    }

    function renderIdentity(identity) {
        const panel =
            document.createElement('div');
        panel.className =
            'hpmud-dossier-identity';
        identity.groups
            .forEach(group => {
                const heading =
                    document.createElement(
                        'h4',
                    );
                heading.textContent =
                    group.title;
                panel.append(
                    heading,
                    createList(
                        group.entries
                            .map(entry => ({
                                label:
                                    entry.label,
                                detail:
                                    [
                                        entry.value,
                                        entry.detail,
                                    ].filter(Boolean)
                                        .join(' · '),
                                sourceKind:
                                    entry
                                        .sourceKind,
                            })),
                        group.emptyText ||
                        '暂无',
                    ),
                );
            });
        const claimsHeading =
            document.createElement('h4');
        claimsHeading.textContent =
            '关系说法';
        panel.append(
            claimsHeading,
            createList(
                identity.claims,
                '暂无已知关系说法。',
            ),
        );
        return panel;
    }

    function renderInspector(tab = 'character') {
        const state = getWorldState();
        const character = state.character;
        inspectorElement.replaceChildren();
        root.querySelectorAll('[data-hpmud-tab]').forEach(button => {
            button.classList.toggle('active', button.dataset.hpmudTab === tab);
        });

        if (tab === 'actor') {
            const dossier =
                buildActorDossierViewModel(
                    state,
                    session.selectedActorId,
                    'player',
                    {
                        getRoomName,
                    },
                );
            if (!dossier) {
                session.selectedActorId = '';
                renderInspector('character');
                return;
            }
            inspectorElement.append(
                createInspectorCard(
                    '人物本色',
                    createList([
                        {
                            label: '公开背景',
                            detail:
                                dossier.core
                                    .publicBackground ||
                                '暂无公开背景。',
                        },
                        {
                            label: '性格',
                            detail:
                                dossier.core
                                    .personality ||
                                '暂无性格记录。',
                        },
                        {
                            label: '说话方式',
                            detail:
                                dossier.core
                                    .speechStyle ||
                                '暂无说话方式记录。',
                        },
                        {
                            label: '可见外貌',
                            detail:
                                dossier.core
                                    .visibleDescription ||
                                '暂无外貌记录。',
                        },
                    ]),
                ),
            );
            inspectorElement.append(
                createInspectorCard(
                    '身份与已知说法',
                    renderIdentity(
                        dossier.identity,
                    ),
                ),
            );
            const presentation =
                dossier.current
                    .presentation;
            const currentPresentation = [
                presentation.outfit
                    ? {
                        label: '服装',
                        detail:
                            presentation
                                .outfit,
                    }
                    : null,
                presentation.wornItemIds
                    .length
                    ? {
                        label:
                            '正式穿戴 Item',
                        detail:
                            presentation
                                .wornItemIds
                                .join(' · '),
                    }
                    : null,
                presentation.accessories
                    .length
                    ? {
                        label:
                            '帽子与饰品',
                        detail:
                            presentation
                                .accessories
                                .join(' · '),
                    }
                    : null,
                presentation.heldItemIds
                    .length
                    ? {
                        label: '手持 Item',
                        detail:
                            presentation
                                .heldItemIds
                                .join(' · '),
                    }
                    : null,
            ].filter(Boolean);
            inspectorElement.append(
                createInspectorCard(
                    '当前状态',
                    createList([
                        {
                            label: '所在位置',
                            detail:
                                dossier.current
                                    .location ||
                                '位置未知',
                        },
                        {
                            label: '正在做',
                            detail:
                                dossier.current
                                    .activity ||
                                '当前没有活动记录。',
                        },
                        {
                            label: '当前意图',
                            detail:
                                dossier.current
                                    .intent ||
                                '当前没有意图记录。',
                        },
                        {
                            label: '生命状态',
                            detail: {
                                alive: '存活',
                                injured: '受伤',
                                incapacitated:
                                    '失去行动能力',
                                missing: '失踪',
                                dead: '死亡',
                            }[
                                dossier.current
                                    .lifeStatus
                            ] ||
                                dossier.current
                                    .lifeStatus ||
                                '未知',
                        },
                        {
                            label: '状态说明',
                            detail:
                                dossier.current
                                    .lifeStatusDetail ||
                                '暂无状态说明。',
                        },
                        ...currentPresentation,
                    ]),
                ),
            );
            inspectorElement.append(
                createInspectorCard(
                    '对你的关系',
                    renderRelationship(
                        dossier
                            .relationship,
                    ),
                ),
            );
            inspectorElement.append(
                createInspectorCard(
                    '共同经历',
                    renderMemoryLedger(
                        dossier.memories,
                    ),
                ),
            );
            const itemList =
                document.createElement(
                    'div',
                );
            itemList.className =
                'hpmud-item-grid hpmud-actor-item-grid';
            if (dossier.items.length) {
                dossier.items
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
            } else {
                itemList.append(
                    createList(
                        [],
                        '暂无玩家可见的正式物品。',
                    ),
                );
            }
            inspectorElement.append(
                createInspectorCard(
                    '正式物品',
                    itemList,
                ),
            );
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
                                state,
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
        renderInspector,
    };
}
