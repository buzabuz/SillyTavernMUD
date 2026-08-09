export function createComposerController(ports) {
    const {
        refs,
        session,
    } = ports;

    const {
        SPELL_CATALOG,
        SPELL_LEARNING_SOURCE_LABELS,
        createSpellDirective,
        findLocalRoomPath,
        getLocalMapDefinition,
        getRoomName,
        getSpellDefinition,
        getSpellProficiency,
        getWorldState,
        parseExplicitMovementDirective,
        parseSpellCastDirectives,
        projectPeoplePanel,
        removeSpellCastDirectives,
        resolvePlayerAddressing,
        stripExplicitAddressTargets,
    } = ports;

    const {
        root,
        composerInput,
    } = refs;

    function insertAtCursor(text, caretOffset = text.length) {
        const start = composerInput.selectionStart ?? composerInput.value.length;
        const end = composerInput.selectionEnd ?? start;
        const before = composerInput.value.slice(0, start);
        const after = composerInput.value.slice(end);
        const separator = before && !before.endsWith('\n') ? '\n' : '';
        composerInput.value = `${before}${separator}${text}${after}`;
        const caret = start + separator.length + caretOffset;
        composerInput.dispatchEvent(new Event('input'));
        composerInput.focus();
        composerInput.setSelectionRange(caret, caret);
    }

    function getMovementPickerOptions(
        state = getWorldState(),
    ) {
        const mapId =
            state.map?.activeMapId;
        const currentRoomId =
            state.map?.currentLocalNodeId;
        const map =
            getLocalMapDefinition(
                mapId,
                state.map,
            );
        if (
            !map ||
            !mapId ||
            !currentRoomId
        ) {
            return [];
        }
        const rooms = [
            ...(map.nodes || []),
            ...(state.map
                ?.generatedLocalNodes ||
                [])
                .filter(room =>
                    room.mapId === mapId),
        ];
        const roomById = new Map(
            rooms.map(room => [
                room.id,
                room,
            ]),
        );
        const currentRoom =
            roomById.get(currentRoomId);
        const levels = new Map(
            (map.levels || [])
                .map((level, index) => [
                    level.id,
                    {
                        name:
                            level.name ||
                            level.nameEn ||
                            level.id,
                        order:
                            Number.isFinite(
                                Number(level.z),
                            )
                                ? Number(
                                    level.z,
                                )
                                : index,
                    },
                ]),
        );
        const discovered = new Set(
            state.map
                ?.discoveredLocalNodeIds ||
            [],
        );
        const accessLabels = {
            public: '公开区域',
            student: '学生区域',
            class: '教学区域',
            private: '私人区域',
            discovered: '已发现',
        };
        return rooms
            .filter(room =>
                room.id !== currentRoomId)
            .filter(room => {
                const access =
                    String(
                        room.access ||
                        '',
                    );
                const restricted =
                    /^(?:private|staff|house_|forbidden|locked|restricted)/u
                        .test(access);
                return !restricted ||
                    discovered.has(room.id) ||
                    discovered.has(
                        `${mapId}:${room.id}`,
                    );
            })
            .map(room => {
                const path =
                    findLocalRoomPath(
                        mapId,
                        currentRoomId,
                        room.id,
                        state.map,
                    );
                if (!path) return null;
                const level =
                    levels.get(
                        room.levelId,
                    ) || {
                        name:
                            room.levelId ||
                            '未分层',
                        order: 999,
                    };
                const label =
                    room.name ||
                    room.nameEn ||
                    room.id;
                return {
                    id: room.id,
                    label,
                    nameEn:
                        room.nameEn ||
                        '',
                    aliases:
                        room.aliases ||
                        [],
                    kind:
                        room.kind ||
                        'room',
                    accessLabel:
                        accessLabels[
                            room.access
                        ] ||
                        '可通行',
                    levelId:
                        room.levelId ||
                        '',
                    levelName:
                        level.name,
                    levelOrder:
                        level.order,
                    currentLevel:
                        room.levelId ===
                        currentRoom
                            ?.levelId,
                    hops: Math.max(
                        1,
                        path.roomIds
                            .length - 1,
                    ),
                };
            })
            .filter(Boolean)
            .sort((left, right) =>
                Number(
                    right.currentLevel,
                ) -
                    Number(
                        left.currentLevel,
                    ) ||
                left.levelOrder -
                    right.levelOrder ||
                left.hops - right.hops ||
                left.label.localeCompare(
                    right.label,
                    'zh-CN',
                ));
    }

    function closeMovementPicker() {
        const panel =
            root.querySelector(
                '#hpmud_movement_panel',
            );
        const button =
            root.querySelector(
                '#hpmud_insert_movement',
            );
        panel.hidden = true;
        root.classList.remove(
            'movement-picker-open',
        );
        button.setAttribute(
            'aria-expanded',
            'false',
        );
    }

    function setComposerMovementDestination(
        destinationLabel,
    ) {
        const marker =
            `→【${destinationLabel}】`;
        const currentValue =
            composerInput.value;
        const directive =
            parseExplicitMovementDirective(
                currentValue,
            );
        if (directive) {
            composerInput.value =
                currentValue.slice(
                    0,
                    directive.start,
                ) +
                marker +
                currentValue.slice(
                    directive.end,
                );
            composerInput.dispatchEvent(
                new Event('input'),
            );
            const caret =
                directive.start +
                marker.length;
            composerInput.focus();
            composerInput.setSelectionRange(
                caret,
                caret,
            );
        } else {
            insertAtCursor(marker);
        }
        closeMovementPicker();
    }

    function renderMovementPicker(
        query = '',
    ) {
        const state =
            getWorldState();
        const options =
            getMovementPickerOptions(
                state,
            );
        const normalizedQuery =
            String(query || '')
                .normalize('NFKC')
                .trim()
                .toLocaleLowerCase();
        const visibleOptions =
            normalizedQuery
                ? options.filter(option =>
                    [
                        option.label,
                        option.nameEn,
                        option.id,
                        option.levelName,
                        ...option.aliases,
                    ]
                        .join(' ')
                        .normalize('NFKC')
                        .toLocaleLowerCase()
                        .includes(
                            normalizedQuery,
                        ))
                : options;
        const origin =
            root.querySelector(
                '#hpmud_movement_origin',
            );
        origin.textContent = [
            getRoomName(
                state,
                state.map?.activeMapId,
                state.map
                    ?.currentLocalNodeId,
            ),
            `${visibleOptions.length} 个地点`,
        ].join(' · ');
        const container =
            root.querySelector(
                '#hpmud_movement_options',
            );
        container.replaceChildren();
        if (!visibleOptions.length) {
            const empty =
                document.createElement(
                    'div',
                );
            empty.className =
                'hpmud-movement-empty';
            empty.textContent =
                normalizedQuery
                    ? '没有匹配的可达地点'
                    : '当前没有可达地点';
            container.append(empty);
            return;
        }
        const groups = new Map();
        visibleOptions.forEach(option => {
            if (!groups.has(
                option.levelId,
            )) {
                groups.set(
                    option.levelId,
                    {
                        name:
                            option.levelName,
                        current:
                            option
                                .currentLevel,
                        options: [],
                    },
                );
            }
            groups.get(
                option.levelId,
            ).options.push(option);
        });
        groups.forEach(group => {
            const section =
                document.createElement(
                    'section',
                );
            section.className =
                'hpmud-movement-group';
            const heading =
                document.createElement(
                    'header',
                );
            const name =
                document.createElement(
                    'strong',
                );
            const count =
                document.createElement(
                    'small',
                );
            name.textContent =
                group.current
                    ? `${group.name} · 当前层`
                    : group.name;
            count.textContent =
                `${group.options.length}`;
            heading.append(name, count);
            section.append(heading);
            group.options.forEach(option => {
                const button =
                    document.createElement(
                        'button',
                    );
                button.type = 'button';
                button.className =
                    'hpmud-movement-option';
                const marker =
                    document.createElement(
                        'i',
                    );
                const copy =
                    document.createElement(
                        'span',
                    );
                const title =
                    document.createElement(
                        'strong',
                    );
                const meta =
                    document.createElement(
                        'small',
                    );
                marker.textContent = '→';
                title.textContent =
                    option.label;
                meta.textContent = [
                    option.accessLabel,
                    `${option.hops} 段路径`,
                    option.id,
                ].join(' · ');
                copy.append(title, meta);
                button.append(
                    marker,
                    copy,
                );
                button.addEventListener(
                    'click',
                    () =>
                        setComposerMovementDestination(
                            option.label,
                        ),
                );
                section.append(button);
            });
            container.append(section);
        });
    }

    function openMovementPicker() {
        const panel =
            root.querySelector(
                '#hpmud_movement_panel',
            );
        const button =
            root.querySelector(
                '#hpmud_insert_movement',
            );
        const search =
            root.querySelector(
                '#hpmud_movement_search',
            );
        const opening =
            panel.hidden;
        if (!opening) {
            closeMovementPicker();
            return;
        }
        closeSpellPicker();
        search.value = '';
        renderMovementPicker();
        panel.style.left = '0px';
        panel.hidden = false;
        root.classList.add(
            'movement-picker-open',
        );
        button.setAttribute(
            'aria-expanded',
            'true',
        );
        const rect =
            panel.getBoundingClientRect();
        const viewportPadding = 12;
        let offset = 0;
        if (
            rect.right >
            window.innerWidth -
                viewportPadding
        ) {
            offset -=
                rect.right -
                (
                    window.innerWidth -
                    viewportPadding
                );
        }
        if (
            rect.left + offset <
            viewportPadding
        ) {
            offset +=
                viewportPadding -
                (
                    rect.left +
                    offset
                );
        }
        panel.style.left =
            `${offset}px`;
        search.focus();
    }

    function getKnownSpellMap(
        state = getWorldState(),
    ) {
        return new Map(
            (
                state.spellbook
                    ?.known ||
                []
            ).map(entry => [
                entry.spellId,
                entry,
            ]),
        );
    }

    function getSpellProgressPercent(
        entry,
    ) {
        if (!entry) {
            return 0;
        }
        const current =
            getSpellProficiency(
                entry.proficiencyXp,
            );
        const ranks = [
            {
                minimumXp: 0,
            },
            {
                minimumXp: 20,
            },
            {
                minimumXp: 60,
            },
            {
                minimumXp: 140,
            },
            {
                minimumXp: 300,
            },
        ];
        const currentIndex =
            ranks.findIndex(rank =>
                rank.minimumXp ===
                current.minimumXp);
        const next =
            ranks[
                currentIndex + 1
            ];
        if (!next) {
            return 100;
        }
        const span =
            next.minimumXp -
            current.minimumXp;
        return Math.max(
            4,
            Math.min(
                100,
                Math.round(
                    (
                        (
                            entry
                                .proficiencyXp -
                            current
                                .minimumXp
                        ) /
                        span
                    ) *
                        100,
                ),
            ),
        );
    }

    function closeSpellPicker() {
        const panel =
            root.querySelector(
                '#hpmud_spell_panel',
            );
        const button =
            root.querySelector(
                '#hpmud_insert_spell',
            );
        if (
            !panel ||
            !button
        ) {
            return;
        }
        panel.hidden = true;
        button.setAttribute(
            'aria-expanded',
            'false',
        );
    }

    function getSpellCastTemplate(
        spell,
    ) {
        const marker =
            createSpellDirective(
                spell.id,
            );
        const needsTarget =
            [
                'person',
                'creature',
                'object',
                'effect',
            ].includes(
                spell.target,
            );
        const targetText =
            needsTarget
                ? '对准目标，'
                : '';
        const text =
            `${marker} *我举起魔杖，${targetText}念出：“${spell.incantation}！”*`;
        return {
            text,
            selection:
                needsTarget
                    ? {
                        start:
                            text.indexOf(
                                '目标',
                            ),
                        end:
                            text.indexOf(
                                '目标',
                            ) +
                            2,
                    }
                    : null,
        };
    }

    function setComposerSpell(
        spellId,
    ) {
        const spell =
            getSpellDefinition(
                spellId,
            );
        if (!spell) {
            return;
        }
        const template =
            getSpellCastTemplate(
                spell,
            );
        const existing =
            parseSpellCastDirectives(
                composerInput.value,
            )[0];
        if (existing) {
            const lineStart =
                composerInput.value
                    .lastIndexOf(
                        '\n',
                        existing.index,
                    ) +
                1;
            const nextBreak =
                composerInput.value
                    .indexOf(
                        '\n',
                        existing.index,
                    );
            const lineEnd =
                nextBreak < 0
                    ? composerInput
                        .value
                        .length
                    : nextBreak;
            composerInput.value =
                composerInput.value.slice(
                    0,
                    lineStart,
                ) +
                template.text +
                composerInput.value.slice(
                    lineEnd,
                );
            composerInput.dispatchEvent(
                new Event('input'),
            );
            if (
                template.selection
            ) {
                composerInput.setSelectionRange(
                    lineStart +
                        template
                            .selection
                            .start,
                    lineStart +
                        template
                            .selection
                            .end,
                );
            }
        } else {
            const insertionStart =
                composerInput
                    .selectionStart ??
                composerInput.value
                    .length;
            const before =
                composerInput.value
                    .slice(
                        0,
                        insertionStart,
                    );
            const separator =
                before &&
                !before.endsWith(
                    '\n',
                )
                    ? '\n'
                    : '';
            insertAtCursor(
                template.text,
            );
            if (
                template.selection
            ) {
                const start =
                    insertionStart +
                    separator.length +
                    template
                        .selection
                        .start;
                composerInput.setSelectionRange(
                    start,
                    start +
                        2,
                );
            }
        }
        composerInput.focus();
        closeSpellPicker();
    }

    function renderSpellPicker(
        query = '',
    ) {
        const state =
            getWorldState();
        const knownById =
            getKnownSpellMap(
                state,
            );
        const normalizedQuery =
            String(query || '')
                .normalize('NFKC')
                .trim()
                .toLocaleLowerCase();
        const source =
            session.spellPickerShowAll
                ? SPELL_CATALOG
                : SPELL_CATALOG
                    .filter(spell =>
                        knownById.has(
                            spell.id,
                        ));
        const visible =
            source
                .filter(spell =>
                    !normalizedQuery ||
                    [
                        spell.incantation,
                        spell.name,
                        spell.nameEn,
                        spell.effect,
                        spell.effectEn,
                        spell.id,
                    ]
                        .join(' ')
                        .normalize(
                            'NFKC',
                        )
                        .toLocaleLowerCase()
                        .includes(
                            normalizedQuery,
                        ))
                .sort((left, right) =>
                    Number(
                        !knownById.has(
                            left.id,
                        ),
                    ) -
                        Number(
                            !knownById.has(
                                right.id,
                            ),
                        ) ||
                    left.curriculumYear -
                        right.curriculumYear ||
                    left.incantation
                        .localeCompare(
                            right.incantation,
                        ));
        const title =
            root.querySelector(
                '#hpmud_spell_panel_title',
            );
        const count =
            root.querySelector(
                '#hpmud_spell_count',
            );
        const toggle =
            root.querySelector(
                '#hpmud_spell_show_all',
            );
        title.textContent =
            session.spellPickerShowAll
                ? '全部常见咒语'
                : '已学咒语';
        count.textContent =
            `${visible.length} 个 · 年级不限制学习`;
        toggle.textContent =
            session.spellPickerShowAll
                ? '只看已学咒语'
                : '尝试未学咒语';
        const container =
            root.querySelector(
                '#hpmud_spell_options',
            );
        container.replaceChildren();
        if (!visible.length) {
            const empty =
                document.createElement(
                    'div',
                );
            empty.className =
                'hpmud-spell-empty';
            empty.textContent =
                session.spellPickerShowAll
                    ? '没有匹配的咒语'
                    : '尚未学会咒语；可以切换到全部目录进行自学或实验。';
            container.append(empty);
            return;
        }
        visible.forEach(spell => {
            const learned =
                knownById.get(
                    spell.id,
                );
            const rank =
                learned
                    ? getSpellProficiency(
                        learned
                            .proficiencyXp,
                    )
                    : null;
            const button =
                document.createElement(
                    'button',
                );
            button.type = 'button';
            button.className =
                'hpmud-spell-option';
            const copy =
                document.createElement(
                    'span',
                );
            const name =
                document.createElement(
                    'strong',
                );
            const meta =
                document.createElement(
                    'small',
                );
            const badge =
                document.createElement(
                    'em',
                );
            const progress =
                document.createElement(
                    'span',
                );
            const fill =
                document.createElement(
                    'i',
                );
            progress.className =
                'hpmud-spell-progress';
            name.textContent =
                `${
                    spell.incantation ||
                    spell.nameEn
                } · ${spell.name}`;
            meta.textContent = [
                spell.effect,
                learned
                    ? SPELL_LEARNING_SOURCE_LABELS[
                        learned
                            .learnedSource
                    ] ||
                    learned.learnedSource
                    : '未学 · 可直接实验',
                spell.curriculumYear >
                    0
                    ? `常规课程 ${spell.curriculumYear} 年级`
                    : '非标准课程',
            ].join(' · ');
            badge.textContent =
                learned
                    ? `${rank.label} · ${learned.proficiencyXp} XP`
                    : '未学 · 难度 +2';
            fill.style.width =
                `${
                    getSpellProgressPercent(
                        learned,
                    )
                }%`;
            copy.append(
                name,
                meta,
            );
            progress.append(fill);
            button.append(
                copy,
                badge,
                progress,
            );
            button.addEventListener(
                'click',
                () =>
                    setComposerSpell(
                        spell.id,
                    ),
            );
            container.append(button);
        });
    }

    function openSpellPicker() {
        const panel =
            root.querySelector(
                '#hpmud_spell_panel',
            );
        const button =
            root.querySelector(
                '#hpmud_insert_spell',
            );
        const search =
            root.querySelector(
                '#hpmud_spell_search',
            );
        if (!panel.hidden) {
            closeSpellPicker();
            return;
        }
        closeMovementPicker();
        session.spellPickerShowAll =
            false;
        search.value = '';
        renderSpellPicker();
        panel.style.left = '0px';
        panel.hidden = false;
        button.setAttribute(
            'aria-expanded',
            'true',
        );
        const rect =
            panel.getBoundingClientRect();
        const padding = 12;
        let offset = 0;
        if (
            rect.right >
            window.innerWidth -
                padding
        ) {
            offset -=
                rect.right -
                (
                    window.innerWidth -
                    padding
                );
        }
        if (
            rect.left + offset <
            padding
        ) {
            offset +=
                padding -
                (
                    rect.left +
                    offset
                );
        }
        panel.style.left =
            `${offset}px`;
        search.focus();
    }

    function clearComposerSpell() {
        composerInput.value =
            removeSpellCastDirectives(
                composerInput.value,
            );
        composerInput.dispatchEvent(
            new Event('input'),
        );
        composerInput.focus();
    }

    function renderComposerSpellPreview() {
        const preview =
            root.querySelector(
                '#hpmud_spell_preview',
            );
        const cast =
            parseSpellCastDirectives(
                composerInput.value,
            )[0];
        if (!cast) {
            preview.hidden = true;
            return;
        }
        const spell =
            getSpellDefinition(
                cast.spellId,
            );
        const learned =
            getKnownSpellMap()
                .get(
                    cast.spellId,
                );
        const rank =
            learned
                ? getSpellProficiency(
                    learned
                        .proficiencyXp,
                )
                : null;
        preview.querySelector(
            'strong',
        ).textContent =
            `${spell.incantation} · ${spell.name}`;
        preview.querySelector(
            'small',
        ).textContent =
            learned
                ? `${
                    SPELL_LEARNING_SOURCE_LABELS[
                        learned
                            .learnedSource
                    ] ||
                    learned.learnedSource
                } · ${rank.label} ${
                    learned.proficiencyXp
                } XP · 本回合必定进行施法检定`
                : '尚未学会 · 本次按自行实验结算 · 本回合必定进行施法检定';
        preview.hidden = false;
    }

    function setComposerAddressTarget(
        label,
    ) {
        const currentValue =
            composerInput.value;
        const selectionStart =
            composerInput.selectionStart ??
            currentValue.length;
        const selectionEnd =
            composerInput.selectionEnd ??
            selectionStart;
        const selected =
            currentValue.slice(
                selectionStart,
                selectionEnd,
            );
        const useSelection =
            Boolean(selected.trim()) &&
            !/[\r\n]/u.test(selected);
        const insertionEnd =
            useSelection
                ? selectionEnd
                : selectionStart;
        const before =
            currentValue.slice(
                0,
                selectionStart,
            );
        const after =
            currentValue.slice(
                insertionEnd,
            );
        const speech =
            useSelection
                ? selected.trim()
                : '……';
        const prefix =
            `@${label}：`;
        const block =
            `${prefix}${speech}`;
        const separatorBefore =
            before &&
            !before.endsWith('\n')
                ? '\n'
                : '';
        const separatorAfter =
            after &&
            !after.startsWith('\n')
                ? '\n'
                : '';
        composerInput.value =
            `${before}${separatorBefore}${block}${separatorAfter}${after}`;
        const blockStart =
            before.length +
            separatorBefore.length;
        const selectStart =
            blockStart +
            prefix.length;
        const selectEnd =
            selectStart +
            speech.length;
        composerInput.dispatchEvent(
            new Event('input'),
        );
        composerInput.focus();
        composerInput
            .setSelectionRange(
                selectStart,
                selectEnd,
            );
    }

    function clearComposerAddressTarget() {
        composerInput.value =
            stripExplicitAddressTargets(
                composerInput.value,
            );
        composerInput.dispatchEvent(
            new Event('input'),
        );
        composerInput.focus();
    }

    function getActiveAddressingState(state) {
        const activeIds = new Set(
            projectPeoplePanel(state)
                .activePeople
                .map(person => person.id),
        );
        return {
            ...state,
            actors: (state?.actors || [])
                .map(actor => ({
                    ...actor,
                    present:
                        activeIds.has(actor.id),
                })),
        };
    }

    function renderComposerAddressing() {
        const state = getWorldState();
        const addressing =
            resolvePlayerAddressing(
                getActiveAddressingState(
                    state,
                ),
                composerInput.value,
            );
        const preview = root.querySelector(
            '#hpmud_address_preview',
        );
        const title =
            preview.querySelector('strong');
        const detail =
            preview.querySelector('small');
        preview.hidden =
            !addressing.attempted;
        preview.classList.toggle(
            'is-warning',
            !addressing.valid,
        );
        if (addressing.attempted) {
            const blockCount =
                addressing.blocks.length;
            const targetLabels = [
                ...new Set(
                    addressing.blocks.map(
                        block =>
                            block.mode ===
                                'broadcast'
                                ? '全场'
                                : block
                                    .targetLabel,
                    ),
                ),
            ];
            title.textContent =
                addressing.valid
                    ? addressing.mode ===
                        'broadcast'
                        ? blockCount > 1
                            ? `${blockCount} 段对全场发言`
                            : '对全场发言'
                        : addressing.mode ===
                            'direct'
                            ? blockCount > 1
                                ? `${blockCount} 段对 ${targetLabels[0]} 说`
                                : `对 ${targetLabels[0]} 说`
                            : `${blockCount} 段定向台词 · ${targetLabels.join(' / ')}`
                    : '受话对象无效';
            detail.textContent =
                addressing.valid
                    ? '以“@人物：”开头的行是台词；其他行按动作与叙述处理'
                    : addressing.error;
        }

        const options = root.querySelector(
            '#hpmud_address_options',
        );
        options.replaceChildren();
        const createOption = (
            label,
            actorId = '',
        ) => {
            const button =
                document.createElement('button');
            button.type = 'button';
            button.textContent = label;
            button.classList.toggle(
                'active',
                actorId
                    ? addressing
                        .actorIds
                        .includes(actorId)
                    : addressing.blocks
                        .some(block =>
                            block.mode ===
                                'broadcast'),
            );
            button.addEventListener(
                'click',
                () => {
                    setComposerAddressTarget(
                        label,
                    );
                    root.querySelector(
                        '#hpmud_address_menu',
                    ).removeAttribute('open');
                },
            );
            options.append(button);
        };
        createOption('全场');
        projectPeoplePanel(state)
            .activePeople
            .forEach(person => {
                const { actor, profile } =
                    person;
                createOption(
                    profile?.name ||
                    actor?.name ||
                    profile?.nameEn ||
                    actor?.nameEn ||
                    person.id,
                    person.id,
                );
            });
    }

    return {
        insertAtCursor,
        getMovementPickerOptions,
        closeMovementPicker,
        setComposerMovementDestination,
        renderMovementPicker,
        openMovementPicker,
        getKnownSpellMap,
        getSpellProgressPercent,
        closeSpellPicker,
        getSpellCastTemplate,
        setComposerSpell,
        renderSpellPicker,
        openSpellPicker,
        clearComposerSpell,
        renderComposerSpellPreview,
        setComposerAddressTarget,
        clearComposerAddressTarget,
        getActiveAddressingState,
        renderComposerAddressing,
    };
}
