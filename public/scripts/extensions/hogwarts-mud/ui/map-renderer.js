import {
    getInteriorMount,
    listMapsByMountHierarchy,
} from '../domain/interior-mount.js';
import {
    projectCharacterForPrompt,
} from '../domain/character.js';
import {
    getMapRooms,
} from '../domain/map-access.js';
import {
    adoptMapProposalLanguage,
} from '../domain/maps.js';
import {
    createLocalMapField,
    createLocalMapLevelField,
    createLocalMapRoomField,
    createWorldMapNodeField,
    createWorldRegionField,
} from '../domain/map-localization.js';
import {
    getActorDisplayName,
} from '../domain/actor-display-name.js';
import {
    createCharacterInputLocalizationField,
} from '../domain/localization-candidates.js';

export function createMapRenderer(ports) {
    const {
        refs,
        session,
    } = ports;

    const {
        MAP_DIRECTOR_TRIGGERS,
        PRESET_WORLD_MAP,
        applyMapProposal,
        buildLocalMapModel,
        buildMapAuthorityContext,
        buildMapModel,
        createInspectorCard,
        ensureLocalizedFields =
        async () => [],
        getLocalMapDefinition,
        getLocalizedField =
        field => ({
            text:
                field.sourceTextEn ||
                '',
        }),
        getMudState,
        getWorldState,
        initials,
        parseJsonObject,
        requestFieldRetranslation =
        async () => [],
        renderInspector,
        resolveLocalMapId,
        resolveRoleSlots,
        saveMetadataDebounced,
        sendMapExpansionRequest,
        validateMapProposal,
    } = ports;

    const {
        root,
        inspectorElement,
    } = refs;

    function displayField(
        field,
    ) {
        return getLocalizedField(
            field,
        ).text ||
            field.sourceTextEn;
    }

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

    function openMapInspector() {
        root.classList.add(
            'hpmud-inspector-open',
        );
        root.querySelector(
            '#hpmud_character',
        )?.setAttribute(
            'aria-expanded',
            'true',
        );
        renderInspector('map');
    }

    function createMapLegend(
        entries,
    ) {
        const legend =
            document.createElement(
                'div',
            );
        legend.className =
            'hpmud-map-legend';
        entries.forEach(([
            className,
            staticKey,
            sourceTextEn,
        ]) => {
            const item =
                document.createElement(
                    'span',
                );
            item.className =
                className;
            item.textContent =
                staticText(
                    staticKey,
                    sourceTextEn,
                );
            legend.append(item);
        });
        return legend;
    }

    function ensureMapFields(
        fields,
    ) {
        void Promise.resolve(
            ensureLocalizedFields(
                fields,
                {
                    priority: 1,
                },
            ),
        ).catch(error =>
            console.warn(
                '[Hogwarts MUD] Map localization query failed',
                error,
            ));
    }

    function appendLocalizationStatus(
        container,
        fields,
    ) {
        const statuses =
            (fields || [])
                .filter(field =>
                    String(
                        field
                            ?.sourceTextEn ||
                        '',
                    ).trim())
                .map(field =>
                    getLocalizedField(
                        field,
                    ).status);
        const status =
            statuses.includes(
                'error',
            )
                ? 'error'
                : statuses.includes(
                    'pending',
                )
                    ? 'pending'
                    : '';
        if (!status) {
            return;
        }
        const indicator =
            document.createElement(
                'small',
            );
        indicator.className =
            `hpmud-map-localization-status is-${status}`;
        indicator.setAttribute(
            'role',
            'status',
        );
        indicator.textContent =
            getLocalizedField({
                staticKey:
                    `translation.status.${status}`,
                sourceTextEn:
                    status === 'error'
                        ? 'Translation unavailable'
                        : 'Translating',
            }).text;
        container.append(
            indicator,
        );
        if (
            status === 'error'
        ) {
            const retry =
                document.createElement(
                    'button',
                );
            retry.type = 'button';
            retry.className =
                'hpmud-map-localization-retry';
            retry.textContent =
                getLocalizedField({
                    staticKey:
                        'translation.action.retranslate',
                    sourceTextEn:
                        'Retranslate',
                }).text;
            retry.addEventListener(
                'click',
                async () => {
                    retry.disabled =
                        true;
                    try {
                        await requestFieldRetranslation(
                            fields.filter(field =>
                                getLocalizedField(
                                    field,
                                ).status ===
                                    'error'),
                            {
                                priority: 1,
                            },
                        );
                    } finally {
                        retry.disabled =
                            false;
                    }
                },
            );
            container.append(
                retry,
            );
        }
    }

    function createSvgElement(name, attributes = {}) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', name);
        Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
        return element;
    }

    function renderWorldMap(container, mapState = null, options = {}) {
        container.replaceChildren();
        const compact = Boolean(options.compact);
        const model = buildMapModel(mapState || {}, options.currentLocation, Boolean(options.revealAll));
        const regionFields =
            new Map(
                model.regions.map(
                    region => [
                        region.id,
                        createWorldRegionField(
                            region,
                        ),
                    ],
                ),
            );
        const nodeFields =
            new Map(
                model.nodes.map(node => [
                    node.id,
                    {
                        name:
                            createWorldMapNodeField(
                                node,
                                'nameEn',
                            ),
                        summary:
                            createWorldMapNodeField(
                                node,
                                'summaryEn',
                            ),
                    },
                ]),
            );
        const localizationFields = [
            ...regionFields.values(),
            ...[
                ...nodeFields.values(),
            ].flatMap(fields => [
                fields.name,
                fields.summary,
            ]),
        ];
        ensureMapFields(
            localizationFields,
        );
        container.classList.toggle('compact', compact);
        const svg = createSvgElement('svg', {
            viewBox: '0 0 100 100',
            role: 'img',
            'aria-label':
                staticText(
                    'ui.map.world_aria',
                    'British Wizarding World locations and routes',
                ),
            preserveAspectRatio: 'xMidYMid meet',
        });
        svg.innerHTML = `
        <defs>
            <filter id="hpmud-map-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="1.4" result="blur"></feGaussianBlur>
                <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
            </filter>
            <pattern id="hpmud-map-grid" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="currentColor" stroke-width=".12"></path>
            </pattern>
        </defs>
        <rect class="hpmud-map-grid" x="0" y="0" width="100" height="100" fill="url(#hpmud-map-grid)"></rect>
        <path class="hpmud-map-coast" d="M21 57 C15 48 18 35 26 27 C33 20 43 18 50 22 C56 13 68 8 78 12 C89 17 90 28 84 38 C91 46 88 57 81 62 C86 72 80 87 68 90 C56 93 48 85 45 78 C35 82 22 75 21 57 Z"></path>
    `;
        const regionsLayer = createSvgElement('g', { class: 'hpmud-map-regions' });
        model.regions.forEach(region => {
            const group = createSvgElement('g', { class: `hpmud-map-region region-${region.id}` });
            group.append(
                createSvgElement('ellipse', {
                    cx: region.x,
                    cy: region.y,
                    rx: compact ? 17 : 20,
                    ry: compact ? 13 : 16,
                }),
            );
            if (!compact) {
                const label = createSvgElement('text', {
                    x: region.x,
                    y: region.y - 11,
                    class: 'hpmud-map-region-label',
                    'text-anchor': 'middle',
                });
                label.textContent =
                    displayField(
                        regionFields.get(
                            region.id,
                        ),
                    );
                group.append(label);
            }
            regionsLayer.append(group);
        });
        svg.append(regionsLayer);

        const edgesLayer = createSvgElement('g', { class: 'hpmud-map-edges' });
        model.edges.forEach(edge => {
            edgesLayer.append(createSvgElement('line', {
                x1: edge.source.mapX,
                y1: edge.source.mapY,
                x2: edge.target.mapX,
                y2: edge.target.mapY,
                class: `${edge.visibility} mode-${edge.mode}`,
            }));
        });
        svg.append(edgesLayer);

        const nodesLayer = createSvgElement('g', { class: 'hpmud-map-nodes' });
        model.nodes.forEach(node => {
            const group = createSvgElement('g', {
                class: `hpmud-map-node ${node.visibility}${node.locked === false ? ' generated' : ''}`,
                transform: `translate(${node.mapX} ${node.mapY})`,
                'data-node-id': node.id,
            });
            const title = createSvgElement('title');
            const fields =
                nodeFields.get(
                    node.id,
                );
            title.textContent =
                `${displayField(fields.name)} · ${displayField(fields.summary)}`;
            group.append(title);
            if (node.visibility === 'current') {
                group.append(createSvgElement('circle', { class: 'pulse', r: compact ? 4.2 : 4.8 }));
            }
            group.append(createSvgElement('circle', { class: 'dot', r: compact ? 1.8 : 2.1 }));
            if (!compact) {
                const label = createSvgElement('text', {
                    x: 0,
                    y: -3.8,
                    'text-anchor': 'middle',
                });
                label.textContent =
                    displayField(
                        fields.name,
                    );
                group.append(label);
            }
            nodesLayer.append(group);
        });
        svg.append(nodesLayer);
        container.append(svg);

        if (!compact) {
            container.append(
                createMapLegend([
                    [
                        'current',
                        'ui.map.legend.current',
                        'Current location',
                    ],
                    [
                        'discovered',
                        'ui.map.legend.discovered',
                        'Discovered',
                    ],
                    [
                        'known',
                        'ui.map.legend.known',
                        'Mapped',
                    ],
                    [
                        'generated',
                        'ui.map.legend.generated',
                        'World-generated',
                    ],
                ]),
            );
        }
        appendLocalizationStatus(
            container,
            localizationFields,
        );
    }

    function getMapPositionMarkers(state, mapId) {
        const markers = [];
        if (state.map?.activeMapId === mapId &&
            state.map?.currentLocalNodeId) {
            const playerName =
                state.character
                    ?.inputEvidence
                    ?.identity
                    ?.name ||
                '';
            const playerNameField =
                createCharacterInputLocalizationField(
                    'identity.name',
                    playerName,
                );
            if (playerName) {
                ensureMapFields([
                    playerNameField,
                ]);
            }
            markers.push({
                id: 'player',
                type: 'player',
                name:
                    (
                        playerName
                            ? displayField(
                                playerNameField,
                            )
                            : ''
                    ) ||
                    staticText(
                        'ui.map.legend.player',
                        'Player',
                    ),
                roomId: state.map.currentLocalNodeId,
            });
        }
        (state.actors || [])
            .filter(actor =>
                actor.present !== false &&
                (actor.mapId || state.map?.activeMapId) === mapId &&
                actor.roomId)
            .forEach(actor => {
                const profile = state.actorLibrary?.find(item =>
                    item.id === actor.id);
                const actorField = {
                    recordKind:
                        'actor_core',
                    recordId:
                        actor.id,
                    fieldPath:
                        'nameEn',
                    sourceTextEn:
                        profile?.nameEn ||
                        actor.nameEn ||
                        actor.id,
                };
                ensureMapFields([
                    actorField,
                ]);
                markers.push({
                    id: actor.id,
                    type: 'actor',
                    name:
                        getActorDisplayName({
                            actorId:
                                actor.id,
                            nameEn:
                                actorField
                                    .sourceTextEn,
                            displayLocale:
                                session
                                    .displayLocale,
                            getLocalizedField,
                        }),
                    roomId: actor.roomId,
                });
            });
        return markers;
    }

    function renderLocalMap(container, mapId, mapState = {}, options = {}) {
        container.replaceChildren();
        const compact = Boolean(options.compact);
        const model = buildLocalMapModel(mapId, mapState || {}, options.levelId || '');
        if (!model) {
            renderWorldMap(container, mapState, options);
            return null;
        }
        const localMapField =
            createLocalMapField(
                model,
            );
        const levelFields =
            new Map(
                model.levels.map(
                    level => [
                        level.id,
                        createLocalMapLevelField(
                            mapId,
                            level,
                        ),
                    ],
                ),
            );
        const roomFields =
            new Map(
                model.nodes.map(room => [
                    room.id,
                    {
                        name:
                            createLocalMapRoomField(
                                mapId,
                                room,
                            ),
                        description:
                            createLocalMapRoomField(
                                mapId,
                                room,
                                'descriptionEn',
                            ),
                    },
                ]),
            );
        const localizationFields = [
            localMapField,
            ...levelFields.values(),
            ...[
                ...roomFields.values(),
            ].flatMap(fields => [
                fields.name,
                fields.description,
            ]),
        ];
        ensureMapFields(
            localizationFields,
        );
        container.classList.toggle('compact', compact);
        const svg = createSvgElement('svg', {
            viewBox: '0 0 100 100',
            role: 'img',
            'aria-label': `${displayField(localMapField)} · ${displayField(levelFields.get(model.levelId))} ${staticText(
                'ui.map.local_aria_suffix',
                'MUD map',
            )}`,
            preserveAspectRatio: 'xMidYMid meet',
        });
        svg.innerHTML = `
        <defs>
            <filter id="hpmud-local-map-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="1.2" result="blur"></feGaussianBlur>
                <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
            </filter>
            <pattern id="hpmud-local-map-grid" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="currentColor" stroke-width=".12"></path>
            </pattern>
        </defs>
        <rect class="hpmud-map-grid" x="0" y="0" width="100" height="100" fill="url(#hpmud-local-map-grid)"></rect>
        <rect class="hpmud-local-map-frame" x="4" y="4" width="92" height="92" rx="4"></rect>
    `;
        const edgeLayer = createSvgElement('g', { class: 'hpmud-map-edges hpmud-local-edges' });
        const nodeById = new Map(model.nodes.map(room => [room.id, room]));
        model.exits.forEach(route => {
            const source = nodeById.get(route.from);
            const target = nodeById.get(route.to);
            if (!source || !target) {
                return;
            }
            edgeLayer.append(createSvgElement('line', {
                x1: source.x,
                y1: source.y,
                x2: target.x,
                y2: target.y,
                class: `${route.generated ? 'generated' : 'discovered'}${route.runtime?.blocked ? ' blocked' : ''} mode-${route.kind}`,
            }));
        });
        svg.append(edgeLayer);

        const nodeLayer = createSvgElement('g', { class: 'hpmud-map-nodes hpmud-local-nodes' });
        model.nodes.forEach(room => {
            const runtimeStatus = room.runtime?.status ? ` state-${room.runtime.status}` : '';
            const group = createSvgElement('g', {
                class: `hpmud-map-node ${room.visibility}${room.generated ? ' generated' : ''}${runtimeStatus}`,
                transform: `translate(${room.x} ${room.y})`,
                'data-node-id': room.id,
            });
            const title = createSvgElement('title');
            const fields =
                roomFields.get(
                    room.id,
                );
            title.textContent =
                `${displayField(fields.name)} · ${
                    displayField(
                        fields.description,
                    ) ||
                    staticText(
                        'ui.map.room_generic',
                        'Room',
                    )
                }`;
            group.append(title);
            if (room.visibility === 'current') {
                group.append(createSvgElement('circle', { class: 'pulse', r: compact ? 4 : 4.8 }));
            }
            group.append(createSvgElement('circle', { class: 'dot', r: compact ? 1.8 : 2.2 }));
            if (!compact) {
                const label = createSvgElement('text', {
                    x: 0,
                    y: -3.8,
                    'text-anchor': 'middle',
                });
                label.textContent =
                    displayField(
                        fields.name,
                    );
                group.append(label);
            }
            nodeLayer.append(group);
        });
        svg.append(nodeLayer);

        const positions = Array.isArray(options.positions)
            ? options.positions
            : [];
        const positionLayer = createSvgElement('g', {
            class: 'hpmud-map-positions',
        });
        const byRoom = new Map();
        positions.forEach(position => {
            if (!byRoom.has(position.roomId)) byRoom.set(position.roomId, []);
            byRoom.get(position.roomId).push(position);
        });
        const offsets = [
            [0, -7],
            [6, -4],
            [7, 3],
            [0, 7],
            [-7, 3],
            [-6, -4],
        ];
        byRoom.forEach((roomPositions, roomId) => {
            const room = nodeById.get(roomId);
            if (!room) return;
            roomPositions.slice(0, offsets.length).forEach((position, index) => {
                const [offsetX, offsetY] = offsets[index];
                const marker = createSvgElement('g', {
                    class: `hpmud-map-position ${position.type}`,
                    transform: `translate(${room.x + offsetX} ${room.y + offsetY})`,
                    'data-position-id': position.id,
                });
                const title = createSvgElement('title');
                title.textContent =
                    `${position.name} · ${displayField(
                        roomFields.get(
                            room.id,
                        ).name,
                    )}`;
                marker.append(title);
                if (position.type === 'player') {
                    marker.append(createSvgElement('path', {
                        class: 'badge',
                        d: compact
                            ? 'M 0 -3 L 3 0 L 0 3 L -3 0 Z'
                            : 'M 0 -3.5 L 3.5 0 L 0 3.5 L -3.5 0 Z',
                    }));
                } else {
                    marker.append(createSvgElement('circle', {
                        class: 'badge',
                        r: compact ? 3 : 3.5,
                    }));
                    const label = createSvgElement('text', {
                        x: 0,
                        y: .8,
                        'text-anchor': 'middle',
                    });
                    label.textContent = initials(position.name).slice(0, 2);
                    marker.append(label);
                }
                positionLayer.append(marker);
            });
        });
        svg.append(positionLayer);
        container.append(svg);

        if (!compact) {
            container.append(
                createMapLegend([
                    [
                        'player',
                        'ui.map.legend.player',
                        'Player',
                    ],
                    [
                        'actor',
                        'ui.map.legend.actor',
                        'Character',
                    ],
                    [
                        'discovered',
                        'ui.map.legend.fixed_room',
                        'Fixed room',
                    ],
                    [
                        'known',
                        'ui.map.legend.hidden_secret',
                        'Undiscovered secret',
                    ],
                ]),
            );
        }
        appendLocalizationStatus(
            container,
            localizationFields,
        );
        return model;
    }

    function populateMapScopeSelect(select, selectedValue, includeAuto = false, mapState = {}) {
        select.replaceChildren();
        if (includeAuto) {
            select.add(
                new Option(
                    staticText(
                        'ui.map.scope.follow_current',
                        'Follow current location',
                    ),
                    'auto',
                ),
            );
        }
        select.add(
            new Option(
                staticText(
                    'ui.map.scope.world',
                    'British Wizarding World Overview',
                ),
                'world',
            ),
        );
        const hierarchy =
            listMapsByMountHierarchy(
                mapState,
            );
        const mapsById =
            new Map(
                hierarchy.map(entry => [
                    entry.map.id,
                    entry.map,
                ]),
            );
        hierarchy.forEach(({
            map,
            depth,
        }) => {
            const mount =
                getInteriorMount(map);
            const parentRoom =
                mount
                    ? getMapRooms(
                        mapsById.get(
                            mount.parentMapId,
                        ),
                        mapState,
                    ).find(room =>
                        room.id ===
                            mount.parentRoomId)
                    : null;
            const mapNameField =
                createLocalMapField(
                    map,
                );
            const parentRoomField =
                parentRoom
                    ? createLocalMapRoomField(
                        mount.parentMapId,
                        parentRoom,
                    )
                    : null;
            ensureMapFields([
                mapNameField,
                parentRoomField,
            ].filter(Boolean));
            const label = [
                depth
                    ? `${'  '.repeat(depth)}↳`
                    : '',
                parentRoom
                    ? `${displayField(
                        parentRoomField,
                    ) || staticText(
                        'map.location.unknown',
                        'Unknown location',
                    )} /`
                    : '',
                displayField(
                    mapNameField,
                ) ||
                    staticText(
                        'map.location.unknown',
                        'Unknown location',
                    ),
                `· ${(map.nodes || []).length} ${staticText(
                    'ui.map.nodes',
                    'nodes',
                )}`,
            ].filter(Boolean)
                .join(' ');
            select.add(
                new Option(
                    label,
                    map.id,
                ),
            );
        });
        select.value = selectedValue;
        if (!select.value) {
            select.value = includeAuto ? 'auto' : 'world';
        }
    }

    function populateLevelSelect(select, mapId, selectedValue, mapState = {}) {
        const map = getLocalMapDefinition(mapId, mapState);
        select.replaceChildren();
        if (!map) {
            select.hidden = true;
            return '';
        }
        const fields =
            map.levels.map(level =>
                createLocalMapLevelField(
                    mapId,
                    level,
                ));
        ensureMapFields(fields);
        map.levels.forEach((
            level,
            index,
        ) =>
            select.add(
                new Option(
                    displayField(
                        fields[index],
                    ),
                    level.id,
                ),
            ));
        select.value = map.levels.some(level => level.id === selectedValue)
            ? selectedValue
            : map.defaultLevelId;
        select.hidden = map.levels.length <= 1;
        return select.value;
    }

    function getRoomName(state, mapId, roomId) {
        const map = getLocalMapDefinition(mapId, state.map);
        const room = [
            ...(map?.nodes || []),
            ...(state.map?.generatedLocalNodes || [])
                .filter(item => item.mapId === mapId),
        ].find(item => item.id === roomId);
        if (!room) {
            return staticText(
                'map.location.unknown',
                'Unknown location',
            );
        }
        const field =
            createLocalMapRoomField(
                mapId,
                room,
            );
        ensureMapFields([
            field,
        ]);
        return displayField(field) ||
            roomId ||
            staticText(
                'map.location.unknown',
                'Unknown location',
            );
    }

    function renderMiniMap(state) {
        const container = root.querySelector('#hpmud_map_mini');
        const localMapId =
            resolveLocalMapId(
                state.map,
            );
        if (!localMapId && state.phase !== 'playing') {
            container.replaceChildren();
            const pending = document.createElement('div');
            pending.className = 'hpmud-map-pending';
            const symbol =
                document.createElement(
                    'span',
                );
            symbol.textContent = '⌁';
            const title =
                document.createElement(
                    'strong',
                );
            title.textContent =
                staticText(
                    'ui.map.pending.home_title',
                    'Generating the home Scene',
                );
            const detail =
                document.createElement(
                    'small',
                );
            detail.textContent =
                staticText(
                    'ui.map.pending.home_detail',
                    'Rooms and exits become fixed after rules validation',
                );
            pending.append(
                symbol,
                title,
                detail,
            );
            container.append(pending);
            return;
        }
        if (localMapId) {
            renderLocalMap(container, localMapId, state.map, {
                compact: true,
                levelId: state.map?.currentLevelId,
                positions: getMapPositionMarkers(state, localMapId),
            });
        } else {
            renderWorldMap(container, state.map, {
                compact: true,
            });
        }
        const caption = document.createElement('span');
        caption.className = 'hpmud-map-caption';
        const localMap = getLocalMapDefinition(localMapId, state.map);
        const localLevel = localMap?.levels.find(level => level.id === state.map?.currentLevelId);
        const localMapField =
            localMap
                ? createLocalMapField(
                    localMap,
                )
                : null;
        const localLevelField =
            localMap &&
                localLevel
                ? createLocalMapLevelField(
                    localMap.id,
                    localLevel,
                )
                : null;
        const worldNode = [
            ...PRESET_WORLD_MAP.nodes,
            ...(
                state.map
                    ?.generatedNodes ||
                []
            ),
        ].find(node =>
            node.id ===
                state.map
                    ?.currentNodeId);
        const worldNodeField =
            worldNode
                ? createWorldMapNodeField(
                    worldNode,
                )
                : null;
        ensureMapFields([
            localMapField,
            localLevelField,
            worldNodeField,
        ].filter(Boolean));
        caption.textContent = localMap
            ? [
                displayField(
                    localMapField,
                ),
                localLevelField
                    ? displayField(
                        localLevelField,
                    )
                    : '',
            ].filter(Boolean)
                .join(' · ')
            : worldNodeField
                ? displayField(
                    worldNodeField,
                )
                : staticText(
                    'map.location.unknown',
                    'Unknown location',
                );
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute(
            'aria-label',
            staticText(
                'ui.map.expand_aria',
                'Expand world map',
            ),
        );
        button.textContent = '↗';
        button.addEventListener(
            'click',
            openMapInspector,
        );
        container.append(caption, button);
    }

    async function requestMapExpansion(trigger = 'exploration') {
        const state = getMudState();
        const slots = resolveRoleSlots(state?.modelSlots);
        const roleSlot = slots.high;
        const profileId = roleSlot.profileId;
        if (!MAP_DIRECTOR_TRIGGERS.includes(trigger)) {
            throw new Error(
                staticText(
                    'ui.map.expansion.invalid_trigger',
                    'Invalid Map calculation trigger.',
                ),
            );
        }
        if (!profileId) {
            toastr.warning(
                staticText(
                    'ui.map.expansion.missing_profile',
                    'Configure a high-tier World Director Connection Profile first.',
                ),
            );
            return;
        }

        const button = inspectorElement.querySelector('#hpmud_expand_map');
        if (button) {
            button.disabled = true;
            button.textContent =
                staticText(
                    'ui.map.expansion.running',
                    'Calculating world structure...',
                );
        }
        try {
            const response = await sendMapExpansionRequest(roleSlot, [
                {
                    role: 'system',
                    content: `You are the World Director for a persistent Harry Potter RPG. First search the supplied preset world and local-map catalog. Propose a new top-level location only when no preset room or location can represent the physical place created by the event. Use English for every semantic prose field. Output one JSON object and no prose:
{"id":"string","reasonEn":"English reason","changes":[{"operation":"add|update","node":{"id":"snake_case","regionId":"existing region id","nameEn":"English canonical name","kind":"string","summaryEn":"English canonical summary","access":"public|student|restricted|dangerous|forbidden","x":0,"y":0}}]}
Never delete or rename a preset location. Ordinary movement and scene description require no proposal.`,
                },
                {
                    role: 'user',
                    content: JSON.stringify({
                        trigger,
                        currentLocation: {
                            mapId:
                                state.map
                                    ?.activeMapId ||
                                '',
                            roomId:
                                state.map
                                    ?.currentLocalNodeId ||
                                '',
                        },
                        character:
                            projectCharacterForPrompt(
                                state
                                    .character,
                            ),
                        mapAuthority:
                            buildMapAuthorityContext(
                                state,
                                {
                                    purpose:
                                        'expansion',
                                },
                            ),
                    }),
                },
            ], { json: true });
            const parsed =
                parseJsonObject(
                    response?.content,
                );
            const adoption =
                adoptMapProposalLanguage(
                    parsed,
                );
            if (
                adoption.diagnostics
                    .length &&
                !adoption.proposal
                    .changes.length
            ) {
                toastr.info(
                    staticText(
                        'ui.map.expansion.language_skipped',
                        'The Map proposal was not written to world State.',
                    ),
                );
                return {
                    status:
                        'language_skipped',
                    diagnostics:
                        adoption
                            .diagnostics,
                };
            }
            const proposal =
                adoption.proposal;
            const validation = validateMapProposal(proposal, {
                trigger,
                baseMap: PRESET_WORLD_MAP,
                generatedNodes: state.map?.generatedNodes,
            });
            if (!validation.valid) {
                throw new Error(
                    `${staticText(
                        'ui.map.expansion.rejected',
                        'The rules layer rejected the Map proposal',
                    )}: ${validation.errors.join(
                        '; ',
                    )}`,
                );
            }
            if (!proposal.changes.length) {
                return {
                    status:
                        'no_change',
                    diagnostics:
                        adoption
                            .diagnostics,
                };
            }
            state.map = applyMapProposal(state.map, proposal);
            saveMetadataDebounced();
            renderInspector('map');
            renderMiniMap(getWorldState());
            toastr.success(
                staticText(
                    'ui.map.expansion.committed',
                    'The World Director Map proposal passed validation and was committed.',
                ),
            );
            return {
                status: 'committed',
                diagnostics:
                    adoption
                        .diagnostics,
            };
        } catch (error) {
            console.error('[Hogwarts MUD] Map expansion failed', error);
            toastr.error(String(error?.cause?.message || error?.message || error));
            if (button) {
                button.disabled = false;
                button.textContent =
                    staticText(
                        'ui.map.inspector.recalculate',
                        'Request structural impact calculation',
                    );
            }
        }
    }

    function renderInspectorMap(state) {
        const controls = document.createElement('div');
        controls.className = 'hpmud-map-selectors';
        const scopeSelect = document.createElement('select');
        scopeSelect.setAttribute(
            'aria-label',
            staticText(
                'ui.map.inspector.scope_aria',
                'Map location',
            ),
        );
        populateMapScopeSelect(scopeSelect, session.inspectorMapScope, true, state.map);
        session.inspectorMapScope = scopeSelect.value;
        const levelSelect = document.createElement('select');
        levelSelect.setAttribute(
            'aria-label',
            staticText(
                'ui.map.inspector.level_aria',
                'Map level',
            ),
        );
        const resolvedMapId =
            resolveLocalMapId(
                state.map,
            );
        const effectiveScope = session.inspectorMapScope === 'auto'
            ? resolvedMapId || 'world'
            : session.inspectorMapScope;
        session.inspectorMapLevel = effectiveScope === 'world'
            ? ''
            : populateLevelSelect(levelSelect, effectiveScope, session.inspectorMapLevel || state.map?.currentLevelId, state.map);
        if (effectiveScope === 'world') {
            levelSelect.hidden = true;
        }
        controls.append(scopeSelect, levelSelect);
        inspectorElement.append(createInspectorCard('', controls));

        const map = document.createElement('div');
        map.className = 'hpmud-inspector-map';
        let title = `${
            getMudState()
                ?.campaign
                ?.startYear ||
            1991
        } · ${staticText(
            'ui.setup.review.world',
            'British Wizarding World',
        )}`;
        let fixedCount = PRESET_WORLD_MAP.nodes.length;
        if (effectiveScope === 'world') {
            renderWorldMap(
                map,
                state.map,
            );
        } else {
            const model = renderLocalMap(map, effectiveScope, state.map, {
                levelId: session.inspectorMapLevel,
                positions: getMapPositionMarkers(state, effectiveScope),
            });
            const level =
                model?.levels.find(
                    candidate =>
                        candidate.id ===
                        model.levelId,
                );
            const mapField =
                model
                    ? createLocalMapField(
                        model,
                    )
                    : null;
            const levelField =
                model &&
                    level
                    ? createLocalMapLevelField(
                        model.id,
                        level,
                    )
                    : null;
            ensureMapFields([
                mapField,
                levelField,
            ].filter(Boolean));
            title = [
                mapField
                    ? displayField(
                        mapField,
                    )
                    : staticText(
                        'ui.map.inspector.location',
                        'Location',
                    ),
                levelField
                    ? displayField(
                        levelField,
                    )
                    : '',
            ].filter(Boolean)
                .join(' · ');
            fixedCount = getLocalMapDefinition(effectiveScope, state.map)?.nodes.length || 0;
        }
        inspectorElement.append(createInspectorCard(title, map));

        scopeSelect.addEventListener('change', () => {
            session.inspectorMapScope = scopeSelect.value;
            session.inspectorMapLevel = '';
            renderInspector('map');
        });
        levelSelect.addEventListener('change', () => {
            session.inspectorMapLevel = levelSelect.value;
            renderInspector('map');
        });

        const director = document.createElement('div');
        director.className = 'hpmud-map-director';
        const count = document.createElement('small');
        count.textContent =
            `${staticText(
                'ui.map.inspector.fixed_topology',
                'Fixed topology',
            )} ${fixedCount} ${staticText(
                'ui.map.nodes',
                'nodes',
            )} · ${staticText(
                'ui.map.inspector.runtime_differences',
                'Runtime stores only structural differences',
            )}`;
        const recalculate = document.createElement('button');
        recalculate.id = 'hpmud_expand_map';
        recalculate.type = 'button';
        recalculate.textContent =
            staticText(
                'ui.map.inspector.recalculate',
                'Request structural impact calculation',
            );
        recalculate.addEventListener('click', () => void requestMapExpansion('world_event'));
        director.append(count, recalculate);
        inspectorElement.append(
            createInspectorCard(
                staticText(
                    'ui.map.inspector.world_director',
                    'World Director',
                ),
                director,
            ),
        );
    }

    return {
        createSvgElement,
        renderWorldMap,
        getMapPositionMarkers,
        renderLocalMap,
        populateMapScopeSelect,
        populateLevelSelect,
        getRoomName,
        renderMiniMap,
        requestMapExpansion,
        renderInspectorMap,
    };
}
