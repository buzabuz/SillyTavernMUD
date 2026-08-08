export function createMapRenderer(ports) {
    const {
        refs,
        session,
    } = ports;

    const {
        LOCAL_MAP_CATALOG,
        MAP_DIRECTOR_TRIGGERS,
        PRESET_WORLD_MAP,
        applyMapProposal,
        buildLocalMapModel,
        buildMapAuthorityContext,
        buildMapModel,
        createInspectorCard,
        getLocalMapDefinition,
        getMudState,
        getWorldState,
        initials,
        parseJsonObject,
        renderInspector,
        resolveLocalMapId,
        resolveRoleSlots,
        saveMetadataDebounced,
        sendRoleRequest,
        validateMapProposal,
    } = ports;

    const {
        root,
        inspectorElement,
    } = refs;

    function createSvgElement(name, attributes = {}) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', name);
        Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
        return element;
    }

    function renderWorldMap(container, mapState = null, options = {}) {
        container.replaceChildren();
        const compact = Boolean(options.compact);
        const model = buildMapModel(mapState || {}, options.currentLocation, Boolean(options.revealAll));
        container.classList.toggle('compact', compact);
        const svg = createSvgElement('svg', {
            viewBox: '0 0 100 100',
            role: 'img',
            'aria-label': '英国魔法世界地点与路线图',
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
                label.textContent = region.name;
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
            title.textContent = `${node.name} · ${node.summary}`;
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
                label.textContent = node.name;
                group.append(label);
            }
            nodesLayer.append(group);
        });
        svg.append(nodesLayer);
        container.append(svg);

        if (!compact) {
            const legend = document.createElement('div');
            legend.className = 'hpmud-map-legend';
            legend.innerHTML = '<span class="current">当前位置</span><span class="discovered">已发现</span><span class="known">地图已知</span><span class="generated">世界生成</span>';
            container.append(legend);
        }
    }

    function getMapPositionMarkers(state, mapId) {
        const markers = [];
        if (state.map?.activeMapId === mapId &&
            state.map?.currentLocalNodeId) {
            markers.push({
                id: 'player',
                type: 'player',
                name: state.character?.identity?.name || '玩家',
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
                markers.push({
                    id: actor.id,
                    type: 'actor',
                    name: profile?.name || actor.name ||
                        profile?.nameEn || actor.nameEn || actor.id,
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
        container.classList.toggle('compact', compact);
        const svg = createSvgElement('svg', {
            viewBox: '0 0 100 100',
            role: 'img',
            'aria-label': `${model.name} · ${model.levels.find(level => level.id === model.levelId)?.name || ''} MUD 地图`,
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
            title.textContent = `${room.name} · ${room.description || room.kind}`;
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
                label.textContent = room.name;
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
                title.textContent = `${position.name} · ${room.name}`;
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
            const legend = document.createElement('div');
            legend.className = 'hpmud-map-legend';
            legend.innerHTML = '<span class="player">玩家</span><span class="actor">人物</span><span class="discovered">固定房间</span><span class="known">未发现秘密</span>';
            container.append(legend);
        }
        return model;
    }

    function populateMapScopeSelect(select, selectedValue, includeAuto = false, mapState = {}) {
        select.replaceChildren();
        if (includeAuto) {
            select.add(new Option('跟随当前位置', 'auto'));
        }
        select.add(new Option('英国魔法世界总览', 'world'));
        LOCAL_MAP_CATALOG.forEach(item => {
            select.add(new Option(`${item.name} · ${item.nodeCount} 节点`, item.id));
        });
        (mapState.customLocalMaps || []).forEach(map => {
            select.add(new Option(`${map.name} · ${map.nodes.length} 个固化房间`, map.id));
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
        map.levels.forEach(level => select.add(new Option(level.name, level.id)));
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
        return room?.name || room?.nameEn || roomId || '位置未知';
    }

    function renderMiniMap(state) {
        const container = root.querySelector('#hpmud_map_mini');
        const localMapId = resolveLocalMapId(state.map, state.location);
        if (!localMapId && state.phase !== 'playing') {
            container.replaceChildren();
            const pending = document.createElement('div');
            pending.className = 'hpmud-map-pending';
            pending.innerHTML = '<span>⌁</span><strong>家庭场景生成中</strong><small>房间与出口将在规则校验后固化</small>';
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
                currentLocation: state.location,
            });
        }
        const caption = document.createElement('span');
        caption.className = 'hpmud-map-caption';
        const localMap = getLocalMapDefinition(localMapId, state.map);
        const localLevel = localMap?.levels.find(level => level.id === state.map?.currentLevelId);
        caption.textContent = localMap
            ? `${localMap.name}${localLevel ? ` · ${localLevel.name}` : ''}`
            : state.location;
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', '展开世界地图');
        button.textContent = '↗';
        button.addEventListener('click', () => renderInspector('map'));
        container.append(caption, button);
    }

    async function requestMapExpansion(trigger = 'exploration') {
        const state = getMudState();
        const slots = resolveRoleSlots(state?.modelSlots);
        const roleSlot = slots.high;
        const profileId = roleSlot.profileId;
        if (!MAP_DIRECTOR_TRIGGERS.includes(trigger)) {
            throw new Error('无效的地图演算触发条件。');
        }
        if (!profileId) {
            toastr.warning('未配置高档“世界导演”Connection Profile。');
            return;
        }

        const button = inspectorElement.querySelector('#hpmud_expand_map');
        if (button) {
            button.disabled = true;
            button.textContent = '世界演算中…';
        }
        try {
            const response = await sendRoleRequest(roleSlot, [
                {
                    role: 'system',
                    content: `You are the World Director for a persistent Harry Potter RPG. First search the supplied preset world and local-map catalog. Propose a new top-level location only when no preset room or location can represent the physical place created by the event. Output one JSON object and no prose:
{"id":"string","reason":"string","changes":[{"operation":"add|update","node":{"id":"snake_case","regionId":"existing region id","name":"Chinese display name","kind":"string","summary":"Chinese summary","access":"public|student|restricted|dangerous|forbidden","x":0,"y":0}}]}
Never delete or rename a preset location. Ordinary movement and scene description require no proposal.`,
                },
                {
                    role: 'user',
                    content: JSON.stringify({
                        trigger,
                        currentLocation: state.location,
                        character: state.character,
                        mapAuthority: buildMapAuthorityContext(state),
                        currentMapState: state.map,
                    }),
                },
            ], { json: true });
            const proposal = parseJsonObject(response?.content);
            const validation = validateMapProposal(proposal, {
                trigger,
                baseMap: PRESET_WORLD_MAP,
                generatedNodes: state.map?.generatedNodes,
            });
            if (!validation.valid) {
                throw new Error(`地图提案被规则层拒绝：${validation.errors.join('；')}`);
            }
            state.map = applyMapProposal(state.map, proposal);
            saveMetadataDebounced();
            renderInspector('map');
            renderMiniMap(getWorldState());
            toastr.success('世界导演的地图提案已通过校验并提交。');
        } catch (error) {
            console.error('[Hogwarts MUD] Map expansion failed', error);
            toastr.error(String(error?.cause?.message || error?.message || error));
            if (button) {
                button.disabled = false;
                button.textContent = '申请结构影响演算';
            }
        }
    }

    function renderInspectorMap(state) {
        const controls = document.createElement('div');
        controls.className = 'hpmud-map-selectors';
        const scopeSelect = document.createElement('select');
        scopeSelect.setAttribute('aria-label', '地图地点');
        populateMapScopeSelect(scopeSelect, session.inspectorMapScope, true, state.map);
        session.inspectorMapScope = scopeSelect.value;
        const levelSelect = document.createElement('select');
        levelSelect.setAttribute('aria-label', '地图楼层');
        const resolvedMapId = resolveLocalMapId(state.map, state.location);
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
        let title = `${getMudState()?.campaign?.startYear || 1991} · 英国魔法世界`;
        let fixedCount = PRESET_WORLD_MAP.nodes.length;
        if (effectiveScope === 'world') {
            renderWorldMap(map, state.map, { currentLocation: state.location });
        } else {
            const model = renderLocalMap(map, effectiveScope, state.map, {
                levelId: session.inspectorMapLevel,
                positions: getMapPositionMarkers(state, effectiveScope),
            });
            title = `${model?.name || '地点'} · ${model?.levels.find(level => level.id === model.levelId)?.name || ''}`;
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
        count.textContent = `固定拓扑 ${fixedCount} 节点 · 运行时只保存结构差异`;
        const recalculate = document.createElement('button');
        recalculate.id = 'hpmud_expand_map';
        recalculate.type = 'button';
        recalculate.textContent = '申请结构影响演算';
        recalculate.addEventListener('click', () => void requestMapExpansion('world_event'));
        director.append(count, recalculate);
        inspectorElement.append(createInspectorCard('世界导演', director));
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
