import {
    buildSocialAudienceProjection,
} from './domain/social-projection.js';
import {
    findCanonCharacter,
} from './canon-characters.js';

const CYTOSCAPE_CDN_URL =
    'https://cdn.jsdelivr.net/npm/cytoscape@3.34.0/dist/cytoscape.min.js';
const CYTOSCAPE_SCRIPT_ID = 'hpmud_cytoscape_runtime';
const PREFERENCE_VERSION = 1;
const PREFERENCE_PREFIX = 'hpmud.relationshipGraph';

const DIMENSION_LABELS = Object.freeze({
    familiarity: '熟悉',
    closeness: '亲近',
    warmth: '温暖',
    trust: '信任',
    respect: '尊重',
    influence: '影响',
    tension: '张力',
    resentment: '积怨',
    fear: '恐惧',
    protectiveness: '保护',
});

const STRUCTURAL_LABELS = Object.freeze({
    family: '家庭',
    authority: '权威',
    classmate: '同学',
    rivalry: '竞争者',
    rival: '竞争者',
    mentor: '导师',
    friend: '朋友',
    romantic_interest: '青涩好感',
    enemy: '敌对',
});

const HOUSE_COLORS = Object.freeze({
    gryffindor: '#9f3a43',
    slytherin: '#3c765d',
    ravenclaw: '#3f668d',
    hufflepuff: '#b88a38',
    格兰芬多: '#9f3a43',
    斯莱特林: '#3c765d',
    拉文克劳: '#3f668d',
    赫奇帕奇: '#b88a38',
});

const HOUSE_NAMES = Object.freeze({
    gryffindor: 'Gryffindor',
    slytherin: 'Slytherin',
    ravenclaw: 'Ravenclaw',
    hufflepuff: 'Hufflepuff',
    格兰芬多: '格兰芬多',
    斯莱特林: '斯莱特林',
    拉文克劳: '拉文克劳',
    赫奇帕奇: '赫奇帕奇',
});

let cytoscapeLoadPromise = null;

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function asFiniteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, asFiniteNumber(value)));
}

function firstText(...values) {
    return values
        .map(value => String(value || '').trim())
        .find(Boolean) || '';
}

function uniqueStrings(values) {
    return [
        ...new Set(
            values
                .flatMap(value => asArray(value))
                .map(value => String(value || '').trim())
                .filter(Boolean),
        ),
    ];
}

function escapeXml(value) {
    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll('\'', '&apos;');
}

function initials(value) {
    const text = String(value || '?').trim();
    if (!text) return '?';
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
        return words
            .slice(0, 2)
            .map(word => word[0])
            .join('')
            .toLocaleUpperCase();
    }
    return [...text].slice(0, 2).join('').toLocaleUpperCase();
}

function makeSigil(name, isPlayer) {
    const monogram = escapeXml(initials(name));
    const fill = isPlayer ? '#d9bd70' : '#e8dfc2';
    const ring = isPlayer ? '#f1d98d' : '#8f82b5';
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
            <defs>
                <radialGradient id="g" cx="45%" cy="38%" r="70%">
                    <stop offset="0" stop-color="#332b59"/>
                    <stop offset="1" stop-color="#0a0b1d"/>
                </radialGradient>
            </defs>
            <circle cx="48" cy="48" r="46" fill="url(#g)" stroke="${ring}" stroke-width="2"/>
            <path d="M48 8l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="${ring}" opacity=".75"/>
            <path d="M17 55l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="${ring}" opacity=".45"/>
            <path d="M79 51l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="${ring}" opacity=".45"/>
            <text x="48" y="58" fill="${fill}" font-family="Georgia,serif" font-size="27"
                text-anchor="middle">${monogram}</text>
        </svg>
    `;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getMetric(edge, dimension, fallback = 0) {
    return asFiniteNumber(
        edge?.[dimension] ??
        edge?.dimensions?.[dimension] ??
        edge?.metrics?.[dimension],
        fallback,
    );
}

function getEdgeEndpoints(edge) {
    return {
        sourceId: firstText(
            edge?.sourceActorId,
            edge?.sourceId,
            edge?.from,
            edge?.actorId,
        ),
        targetId: firstText(
            edge?.targetActorId,
            edge?.targetId,
            edge?.to,
            edge?.subjectId,
        ),
    };
}

function hasPlayerWitness(value) {
    return value?.playerKnown === true ||
        value?.knownToPlayer === true ||
        value?.visibility === 'player' ||
        asArray(value?.witnessedBy).includes('player') ||
        asArray(value?.knownTo).includes('player');
}

function evidenceTimestamp(evidence, index) {
    return asFiniteNumber(
        evidence?.turn ??
        evidence?.createdTurn ??
        evidence?.messageId ??
        asArray(evidence?.sourceMessageIds).at(-1),
        index,
    );
}

function normalizeEvidence(evidence, index) {
    return {
        id: firstText(evidence?.id, `evidence_${index}`),
        summary: firstText(
            evidence?.summary,
            evidence?.summaryEn,
            evidence?.statement,
            evidence?.text,
        ),
        clock: firstText(
            evidence?.clock,
            evidence?.worldClock,
            evidence?.createdClock,
        ),
        sceneId: firstText(evidence?.sceneId, evidence?.scene?.id),
        sourceMessageIds: asArray(evidence?.sourceMessageIds)
            .map(value => Number(value))
            .filter(Number.isInteger),
        witnessedBy: asArray(evidence?.witnessedBy),
        playerKnown: hasPlayerWitness(evidence),
        timestamp: evidenceTimestamp(evidence, index),
        raw: evidence,
    };
}

function edgeStructuralTags(edge) {
    return uniqueStrings([
        edge?.structuralTags,
        edge?.relationshipTags,
        edge?.tags,
        edge?.labels,
    ]);
}

function deriveCloseness(edge, familiarity, warmth, trust, protectiveness) {
    const explicit = edge?.closeness ??
        edge?.dimensions?.closeness ??
        edge?.metrics?.closeness;
    if (Number.isFinite(Number(explicit))) {
        return clamp(explicit, 0, 100);
    }
    return clamp(
        Math.min(
            familiarity,
            Math.round(
                Math.max(0, warmth) * 0.45 +
                Math.max(0, trust) * 0.35 +
                protectiveness * 0.2,
            ),
        ),
        0,
        100,
    );
}

function deriveRelationshipLabel(dimensions, tags) {
    const {
        familiarity,
        closeness,
        warmth,
        trust,
        respect,
        tension,
        resentment,
        fear,
        protectiveness,
    } = dimensions;
    const tagSet = new Set(tags);

    if (
        tagSet.has('family') &&
        (resentment >= 35 || trust <= -20 || warmth <= -20)
    ) {
        return '疏远的亲人';
    }
    if (
        (tagSet.has('rivalry') || tagSet.has('rival')) &&
        (resentment >= 50 || tension >= 50)
    ) {
        return '宿敌';
    }
    if (fear >= 35 && respect >= 20) return '敬畏';
    if (respect >= 20 && trust <= -20) return '尊敬但不信任';
    if (protectiveness >= 50) return '保护者';
    if (warmth <= -35 || resentment >= 50 || tension >= 70) return '敌对';
    if (familiarity >= 20 && warmth <= -20) return '反感的熟人';
    if (closeness >= 70 && resentment < 35) return '知己';
    if (
        closeness >= 50 &&
        warmth >= 35 &&
        trust >= 40 &&
        resentment < 35
    ) {
        return '密友';
    }
    if (closeness >= 35 && resentment >= 35) return '疏远的朋友';
    if (closeness >= 35) return '朋友';
    if (closeness >= 20 || familiarity >= 35) return '熟人';
    if (familiarity >= 10) return '初识';
    if (tagSet.has('authority')) return '权威';
    if (tagSet.has('mentor')) return '导师';
    if (tagSet.has('classmate')) return '同学';
    return '关系未定';
}

function classifySentiment(dimensions) {
    const positive = Math.max(
        dimensions.warmth,
        dimensions.trust,
        dimensions.respect,
        dimensions.protectiveness,
        0,
    );
    const negative = Math.max(
        -dimensions.warmth,
        -dimensions.trust,
        -dimensions.respect,
        dimensions.tension,
        dimensions.resentment,
        dimensions.fear,
        0,
    );
    if (positive >= 20 && negative >= 20) return 'complex';
    if (negative >= 15 && negative > positive) return 'negative';
    if (positive >= 10) return 'positive';
    return 'neutral';
}

function getDominantDimension(dimensions) {
    const candidates = [
        ['resentment', dimensions.resentment],
        ['tension', dimensions.tension],
        ['fear', dimensions.fear],
        ['warmth-negative', Math.max(0, -dimensions.warmth)],
        ['trust-negative', Math.max(0, -dimensions.trust)],
        ['warmth', Math.max(0, dimensions.warmth)],
        ['trust', Math.max(0, dimensions.trust)],
        ['respect', Math.max(0, dimensions.respect)],
        ['protectiveness', dimensions.protectiveness],
    ];
    const dominant =
        candidates.sort((left, right) =>
            right[1] - left[1])[0];
    return dominant[1] > 0
        ? dominant[0]
        : 'neutral';
}

function dominantColor(dimension) {
    if (dimension === 'neutral') return '#7f879c';
    if (dimension === 'trust') return '#77aee8';
    if (dimension === 'respect') return '#d9e0e7';
    if (dimension === 'fear') return '#a784df';
    if (dimension === 'protectiveness') return '#73b88c';
    if (
        dimension === 'resentment' ||
        dimension === 'tension' ||
        dimension.endsWith('-negative')
    ) {
        return '#d46b6b';
    }
    return '#d8b65e';
}

function actorKnownToPlayer(actor) {
    const memories = actor?.sharedMemories || {};
    return actor?.id === 'player' ||
        actor?.playerKnown === true ||
        actor?.knownToPlayer === true ||
        actor?.present === true ||
        Boolean(
            actor?.introducedClock ||
            actor?.introducedTurn ||
            actor?.lastSeenClock ||
            asArray(memories?.core).length ||
            asArray(memories?.recent).length ||
            asArray(memories?.everyday).length,
        );
}

function affiliationText(value) {
    if (Array.isArray(value)) {
        return value
            .map(affiliationText)
            .filter(Boolean)
            .join(' ');
    }
    if (value && typeof value === 'object') {
        return [
            value.house,
            value.houseEn,
            value.name,
            value.nameEn,
            value.label,
            value.labelEn,
        ]
            .map(affiliationText)
            .filter(Boolean)
            .join(' ');
    }
    return String(value || '').trim();
}

function getActorHouse(actor) {
    const canonIdentity = findCanonCharacter(
        firstText(
            actor?.canonCatalogId,
            actor?.id,
        ),
    );
    const explicitHouse = firstText(
        actor?.house,
        actor?.houseEn,
        actor?.affiliation?.house,
        actor?.affiliation?.houseEn,
        actor?.background?.house,
        actor?.background?.houseEn,
        actor?.identity?.house,
        actor?.canonIdentity?.house,
        canonIdentity?.house,
    );
    if (explicitHouse) return explicitHouse;

    const affiliations = [
        actor?.affiliation,
        actor?.affiliationEn,
        actor?.affiliations,
        actor?.affiliationsEn,
        actor?.background?.affiliation,
        actor?.background?.affiliations,
        actor?.role,
        actor?.roleEn,
    ]
        .map(affiliationText)
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase();
    const match = Object.keys(HOUSE_NAMES)
        .find(house => affiliations.includes(house));
    return match ? HOUSE_NAMES[match] : '';
}

function actorCategories(actor, relatedTags) {
    const categories = new Set();
    const role = [
        actor?.role,
        actor?.roleEn,
        actor?.relationshipToPlayer,
        actor?.relationshipToPlayerEn,
        ...relatedTags,
    ].filter(Boolean).join(' ');
    const house = getActorHouse(actor);
    if (house) categories.add('house');
    if (/(?:family|parent|guardian|sibling|relative|家庭|家人|父亲|母亲|监护人|兄弟|姐妹)/i.test(role)) {
        categories.add('family');
    }
    if (/(?:classmate|student|同学|学生)/i.test(role)) {
        categories.add('classmate');
    }
    if (/(?:professor|teacher|headmaster|教授|教师|老师|校长)/i.test(role)) {
        categories.add('professor');
    }
    return [...categories];
}

function mergeActorDirectory(state, graph) {
    const directory = new Map();
    const add = actor => {
        const id = firstText(actor?.id, actor?.actorId);
        if (!id) return;
        directory.set(id, {
            ...(directory.get(id) || {}),
            ...actor,
            id,
        });
    };
    asArray(graph?.nodes).forEach(add);
    asArray(graph?.actors).forEach(add);
    asArray(state?.actorLibrary).forEach(add);
    asArray(state?.actors).forEach(add);
    add({
        id: 'player',
        name: firstText(
            state?.character?.identity?.name,
            state?.character?.name,
            '你',
        ),
        role: '玩家角色',
        playerKnown: true,
    });
    return directory;
}

function normalizeEdge(edge, index, evidenceById) {
    const { sourceId, targetId } = getEdgeEndpoints(edge);
    if (!sourceId || !targetId || sourceId === targetId) return null;
    const familiarity = clamp(getMetric(edge, 'familiarity'), 0, 100);
    const warmth = clamp(
        getMetric(edge, 'warmth'),
        -100,
        100,
    );
    const trust = clamp(getMetric(edge, 'trust'), -100, 100);
    const protectiveness = clamp(getMetric(edge, 'protectiveness'), 0, 100);
    const dimensions = {
        familiarity,
        closeness: deriveCloseness(
            edge,
            familiarity,
            warmth,
            trust,
            protectiveness,
        ),
        warmth,
        trust,
        respect: clamp(getMetric(edge, 'respect'), -100, 100),
        influence: clamp(getMetric(edge, 'influence'), -100, 100),
        tension: clamp(getMetric(edge, 'tension'), 0, 100),
        resentment: clamp(getMetric(edge, 'resentment'), 0, 100),
        fear: clamp(getMetric(edge, 'fear'), 0, 100),
        protectiveness,
    };
    const embeddedEvidence = asArray(edge?.evidence)
        .map((item, evidenceIndex) =>
            normalizeEvidence(item, index * 1000 + evidenceIndex));
    const evidence = [
        ...asArray(edge?.evidenceIds)
            .map(id => evidenceById.get(String(id)))
            .filter(Boolean),
        ...embeddedEvidence,
    ].filter((item, itemIndex, values) =>
        values.findIndex(candidate => candidate.id === item.id) === itemIndex);
    const playerKnown =
        edge?.audienceVisible === true ||
        hasPlayerWitness(edge) ||
        evidence.some(item => item.playerKnown);
    if (!playerKnown) return null;
    const visibleEvidence = evidence
        .filter(item =>
            edge?.audienceVisible === true ||
            item.playerKnown)
        .sort((left, right) => right.timestamp - left.timestamp);
    const tags = edgeStructuralTags(edge);
    const dominantDimension = getDominantDimension(dimensions);
    const labels =
        uniqueStrings([
            edge?.labels,
        ]);
    if (!labels.length) {
        labels.push(
            deriveRelationshipLabel(
                dimensions,
                tags,
            ),
        );
    }
    return {
        id: firstText(edge?.id, `relationship_${index}`),
        elementId: `hpmud_relationship_${index}`,
        sourceId,
        targetId,
        dimensions,
        tags,
        labels,
        label: labels.join(' · '),
        activeEmotions:
            asArray(edge?.activeEmotions),
        sentiment: classifySentiment(dimensions),
        dominantDimension,
        color: dominantColor(dominantDimension),
        width: 1.2 + dimensions.closeness / 18,
        opacity: 0.28 + dimensions.familiarity / 150,
        evidence: visibleEvidence,
        raw: edge,
    };
}

function inferHouseColor(house) {
    const key = String(house || '').trim().toLocaleLowerCase();
    return HOUSE_COLORS[key] || '#71669b';
}

function createNode(actor, id, edges, relatedTags) {
    const name = id === 'player'
        ? firstText(actor?.name, '你')
        : firstText(actor?.name, actor?.nameEn, id);
    const familiarity = edges.reduce(
        (maximum, edge) =>
            Math.max(maximum, edge.dimensions.familiarity),
        0,
    );
    const relevance = Math.max(
        familiarity,
        asFiniteNumber(actor?.narrativeImportance),
        actor?.present === true ? 55 : 0,
        id === 'player' ? 100 : 0,
    );
    const house = getActorHouse(actor);
    return {
        id,
        name,
        role: firstText(
            actor?.role,
            actor?.roleEn,
            actor?.relationshipToPlayer,
            id === 'player' ? '玩家角色' : '已知人物',
        ),
        house,
        categories: actorCategories(actor, relatedTags),
        familiarity,
        relevance,
        size: 46 + Math.min(22, relevance / 5),
        ringColor: inferHouseColor(house),
        sigil: makeSigil(name, id === 'player'),
        raw: actor,
    };
}

function addCurveDistances(edges) {
    const pairCounts = new Map();
    edges.forEach(edge => {
        const pair = [edge.sourceId, edge.targetId].sort().join('::');
        pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
    });
    return edges.map(edge => {
        const pair = [edge.sourceId, edge.targetId].sort().join('::');
        if ((pairCounts.get(pair) || 0) < 2) {
            return { ...edge, curveDistance: 0 };
        }
        // Reversing an edge also reverses Cytoscape's curve normal.
        // The same signed distance therefore separates reciprocal edges.
        return { ...edge, curveDistance: 42 };
    });
}

export function buildPlayerKnownRelationshipProjection(state = {}) {
    const audienceProjection =
        buildSocialAudienceProjection(
            state,
            'player',
        );
    const graph = {
        ...(state?.socialGraph || {}),
        version:
            audienceProjection.version,
    };
    const evidence = asArray(
        audienceProjection
            .relationshipEvidence,
    ).map(normalizeEvidence);
    const evidenceById = new Map(
        evidence.map(item => [String(item.id), item]),
    );
    const rawEdges = asArray(
        audienceProjection
            .relationships,
    );
    const edges = addCurveDistances(
        rawEdges
            .map((edge, index) =>
                normalizeEdge(edge, index, evidenceById))
            .filter(Boolean),
    );
    const directory = mergeActorDirectory(state, graph);
    const visibleActorIds = new Set(['player']);
    edges.forEach(edge => {
        visibleActorIds.add(edge.sourceId);
        visibleActorIds.add(edge.targetId);
    });
    directory.forEach((actor, id) => {
        if (actorKnownToPlayer(actor)) visibleActorIds.add(id);
    });
    const nodes = [...visibleActorIds]
        .map(id => {
            const actor = directory.get(id);
            if (!actor && id !== 'player') return null;
            const actorEdges = edges.filter(edge =>
                edge.sourceId === id || edge.targetId === id);
            const relatedTags = actorEdges.flatMap(edge => edge.tags);
            return createNode(
                actor || { id, name: id },
                id,
                actorEdges,
                relatedTags,
            );
        })
        .filter(Boolean)
        .sort((left, right) => {
            if (left.id === 'player') return -1;
            if (right.id === 'player') return 1;
            return right.relevance - left.relevance ||
                left.name.localeCompare(right.name, 'zh-CN');
        });
    const nodeById = new Map(nodes.map(node => [node.id, node]));
    const visibleEdges = edges.filter(edge =>
        nodeById.has(edge.sourceId) &&
        nodeById.has(edge.targetId));
    const edgeByDirection = new Map(
        visibleEdges.map(edge => [
            `${edge.sourceId}->${edge.targetId}`,
            edge,
        ]),
    );
    return {
        version: asFiniteNumber(graph?.version, 1),
        nodes,
        edges: visibleEdges,
        nodeById,
        edgeByDirection,
    };
}

function loadCytoscape() {
    if (typeof globalThis.cytoscape === 'function') {
        return Promise.resolve(globalThis.cytoscape);
    }
    if (cytoscapeLoadPromise) return cytoscapeLoadPromise;
    cytoscapeLoadPromise = new Promise((resolve, reject) => {
        let script = document.querySelector(`#${CYTOSCAPE_SCRIPT_ID}`);
        const complete = () => {
            if (typeof globalThis.cytoscape === 'function') {
                resolve(globalThis.cytoscape);
            } else {
                reject(new Error('Cytoscape.js 已加载，但没有注册运行时。'));
            }
        };
        if (script) {
            script.addEventListener('load', complete, { once: true });
            script.addEventListener(
                'error',
                () => reject(new Error('Cytoscape.js 加载失败。')),
                { once: true },
            );
            return;
        }
        script = document.createElement('script');
        script.id = CYTOSCAPE_SCRIPT_ID;
        script.src = CYTOSCAPE_CDN_URL;
        script.crossOrigin = 'anonymous';
        script.addEventListener('load', complete, { once: true });
        script.addEventListener(
            'error',
            () => reject(new Error('Cytoscape.js 加载失败。')),
            { once: true },
        );
        document.head.append(script);
    });
    return cytoscapeLoadPromise;
}

function defaultPreferences() {
    return {
        version: PREFERENCE_VERSION,
        scope: 'mine',
        sentiment: 'all',
        category: 'all',
        query: '',
        positions: {},
    };
}

function normalizePreferences(value) {
    const fallback = defaultPreferences();
    const source = value && typeof value === 'object' ? value : {};
    return {
        version: PREFERENCE_VERSION,
        scope: ['mine', 'all'].includes(source.scope)
            ? source.scope
            : fallback.scope,
        sentiment: ['all', 'positive', 'negative', 'complex']
            .includes(source.sentiment)
            ? source.sentiment
            : fallback.sentiment,
        category: ['all', 'house', 'family', 'classmate', 'professor']
            .includes(source.category)
            ? source.category
            : fallback.category,
        query: String(source.query || '').slice(0, 80),
        positions:
            source.positions &&
            typeof source.positions === 'object'
                ? source.positions
                : {},
    };
}

function preferenceKey(timelineKey) {
    return `${PREFERENCE_PREFIX}.${encodeURIComponent(timelineKey || 'unknown')}`;
}

function readPreferences(timelineKey) {
    try {
        const raw = localStorage.getItem(preferenceKey(timelineKey));
        return normalizePreferences(raw ? JSON.parse(raw) : null);
    } catch {
        return defaultPreferences();
    }
}

function writePreferences(timelineKey, preferences) {
    try {
        localStorage.setItem(
            preferenceKey(timelineKey),
            JSON.stringify(normalizePreferences(preferences)),
        );
    } catch {
        // The graph remains usable when storage is unavailable.
    }
}

function createElement(tag, className = '', text = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
}

function formatDimensionValue(value) {
    const rounded = Math.round(asFiniteNumber(value));
    return rounded > 0 ? `+${rounded}` : String(rounded);
}

function structuralText(tags) {
    return tags
        .map(tag => STRUCTURAL_LABELS[tag] || tag)
        .filter(Boolean)
        .join(' · ');
}

function edgeMatchesCategory(edge, projection, category) {
    if (category === 'all') return true;
    if (category === 'house') {
        return [edge.sourceId, edge.targetId].some(id =>
            projection.nodeById.get(id)?.categories.includes('house'));
    }
    if (
        category === 'family' &&
        edge.tags.includes('family')
    ) {
        return true;
    }
    if (
        category === 'classmate' &&
        edge.tags.includes('classmate')
    ) {
        return true;
    }
    return [edge.sourceId, edge.targetId].some(id =>
        projection.nodeById.get(id)?.categories.includes(category));
}

function nodeMatchesCategory(node, category) {
    return category === 'all' || node.categories.includes(category);
}

export function filterRelationshipGraphProjection(
    projection,
    preferences,
) {
    const filters = normalizePreferences(preferences);
    const query = filters.query.trim().toLocaleLowerCase();
    const queryMatches = new Set(
        projection.nodes
            .filter(node =>
                !query ||
                [
                    node.name,
                    node.role,
                    node.house,
                ].join(' ').toLocaleLowerCase().includes(query))
            .map(node => node.id),
    );
    let edges = projection.edges.filter(edge => {
        if (
            filters.scope === 'mine' &&
            edge.sourceId !== 'player' &&
            edge.targetId !== 'player'
        ) {
            return false;
        }
        if (
            filters.sentiment !== 'all' &&
            edge.sentiment !== filters.sentiment
        ) {
            return false;
        }
        return edgeMatchesCategory(edge, projection, filters.category);
    });
    if (query) {
        edges = edges.filter(edge =>
            queryMatches.has(edge.sourceId) ||
            queryMatches.has(edge.targetId));
    }
    const nodeIds = new Set();
    edges.forEach(edge => {
        [edge.sourceId, edge.targetId]
            .filter(id =>
                filters.category === 'all' ||
                nodeMatchesCategory(
                    projection.nodeById.get(id),
                    filters.category,
                ))
            .forEach(id => nodeIds.add(id));
    });
    projection.nodes.forEach(node => {
        if (
            (
                node.id === 'player' &&
                filters.category === 'all'
            ) ||
            (
                nodeMatchesCategory(node, filters.category) &&
                (!query || queryMatches.has(node.id)) &&
                filters.scope === 'all'
            )
        ) {
            nodeIds.add(node.id);
        }
    });
    if (query) {
        projection.nodes
            .filter(node =>
                queryMatches.has(node.id) &&
                nodeMatchesCategory(node, filters.category))
            .forEach(node => nodeIds.add(node.id));
    }
    return {
        nodes: projection.nodes.filter(node => nodeIds.has(node.id)),
        edges,
        nodeIds,
        edgeIds: new Set(edges.map(edge => edge.elementId)),
    };
}

export function getRelationshipGraphStyles({
    reducedMotion = false,
} = {}) {
    const transitionDuration =
        reducedMotion ? '0ms' : '180ms';
    return [
        {
            selector: 'node',
            style: {
                'width': 'data(size)',
                'height': 'data(size)',
                'background-color': '#101126',
                'background-image': 'data(sigil)',
                'background-fit': 'cover',
                'border-width': 3,
                'border-color': 'data(ringColor)',
                'label': 'data(label)',
                'color': '#e8dfc2',
                'font-family': 'Georgia, "Songti SC", serif',
                'font-size': 10,
                'text-valign': 'bottom',
                'text-margin-y': 9,
                'text-background-color': '#090a18',
                'text-background-opacity': 0.82,
                'text-background-padding': 3,
                'text-background-shape': 'roundrectangle',
                'overlay-opacity': 0,
                'transition-property': 'opacity, border-width, border-color',
                'transition-duration': transitionDuration,
            },
        },
        {
            selector: 'node[player = "true"]',
            style: {
                'border-width': 5,
                'border-color': '#e1c477',
                'underlay-color': '#d8b65e',
                'underlay-opacity': 0.2,
                'underlay-padding': 8,
            },
        },
        {
            selector: 'edge',
            style: {
                'width': 'data(width)',
                'line-color': 'data(color)',
                'target-arrow-color': 'data(color)',
                'target-arrow-shape': 'triangle',
                'arrow-scale': 0.8,
                'curve-style': 'unbundled-bezier',
                'control-point-distances': 'data(curveDistance)',
                'control-point-weights': 0.5,
                'opacity': 'data(opacity)',
                'line-cap': 'round',
                'overlay-opacity': 0,
                'transition-property': 'opacity, width',
                'transition-duration': transitionDuration,
            },
        },
        {
            selector: '.hpmud-graph-hidden',
            style: {
                'display': 'none',
            },
        },
        {
            selector: '.hpmud-graph-muted',
            style: {
                'opacity': 0.08,
            },
        },
        {
            selector: '.hpmud-graph-focus',
            style: {
                'opacity': 1,
                'z-index': 20,
            },
        },
        {
            selector: 'node.hpmud-graph-focus',
            style: {
                'border-width': 6,
                'border-color': '#f0d98e',
                'underlay-color': '#bca9ff',
                'underlay-opacity': 0.34,
                'underlay-padding': 11,
            },
        },
        {
            selector: 'edge.hpmud-graph-focus',
            style: {
                'width': 'mapData(width, 1, 8, 3, 10)',
            },
        },
    ];
}

function projectionElements(projection) {
    return [
        ...projection.nodes.map(node => ({
            group: 'nodes',
            data: {
                id: node.id,
                label: node.name,
                sigil: node.sigil,
                size: node.size,
                relevance: node.relevance,
                ringColor: node.ringColor,
                player: String(node.id === 'player'),
            },
        })),
        ...projection.edges.map(edge => ({
            group: 'edges',
            data: {
                id: edge.elementId,
                source: edge.sourceId,
                target: edge.targetId,
                relationId: edge.id,
                color: edge.color,
                width: edge.width,
                opacity: edge.opacity,
                curveDistance: edge.curveDistance,
            },
        })),
    ];
}

export function createRelationshipGraphController({
    root,
    getState,
    getTimelineKey,
    onOpenActor,
}) {
    const dialog = root.querySelector('#hpmud_relationship_dialog');
    const trigger = root.querySelector('#hpmud_relationship_graph');
    const closeButton = root.querySelector('#hpmud_relationship_close');
    const canvas = root.querySelector('#hpmud_relationship_canvas');
    const detail = root.querySelector('#hpmud_relationship_detail');
    const textFallback = root.querySelector('#hpmud_relationship_text');
    const textNodes = root.querySelector('#hpmud_relationship_text_nodes');
    const textEdges = root.querySelector('#hpmud_relationship_text_edges');
    const search = root.querySelector('#hpmud_relationship_search');
    const scope = root.querySelector('#hpmud_relationship_scope');
    const sentiment = root.querySelector('#hpmud_relationship_sentiment');
    const category = root.querySelector('#hpmud_relationship_category');
    const reset = root.querySelector('#hpmud_relationship_reset');
    const count = root.querySelector('#hpmud_relationship_count');
    const status = root.querySelector('#hpmud_relationship_status');
    const empty = root.querySelector('#hpmud_relationship_empty');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

    let cy = null;
    let projection = buildPlayerKnownRelationshipProjection();
    let visibleProjection = filterRelationshipGraphProjection(
        projection,
        defaultPreferences(),
    );
    let timelineKey = '';
    let preferences = defaultPreferences();
    let selectedNodeId = '';
    let selectedEdgeId = '';
    let resizeObserver = null;

    function announce(message) {
        status.textContent = message;
    }

    function persistPreferences() {
        writePreferences(timelineKey, preferences);
    }

    function syncPreferenceControls() {
        search.value = preferences.query;
        scope.value = preferences.scope;
        sentiment.value = preferences.sentiment;
        category.value = preferences.category;
    }

    function loadTimelinePreferences() {
        const nextKey = String(getTimelineKey() || 'unknown');
        if (nextKey === timelineKey) return;
        timelineKey = nextKey;
        preferences = readPreferences(timelineKey);
        selectedNodeId = '';
        selectedEdgeId = '';
        syncPreferenceControls();
    }

    function clearGraphFocus() {
        if (!cy) return;
        cy.elements().removeClass(
            'hpmud-graph-muted hpmud-graph-focus',
        );
        selectedNodeId = '';
        selectedEdgeId = '';
    }

    function renderEmptyDetail() {
        detail.replaceChildren();
        const mark = createElement('span', 'hpmud-relationship-detail-mark', '✦');
        const title = createElement('h3', '', '选择一颗人物星');
        const copy = createElement(
            'p',
            '',
            '点击人物查看一跳关系，点击连线比较两个方向的关系与证据。',
        );
        detail.append(mark, title, copy);
    }

    function createMetricGrid(dimensions) {
        const grid = createElement('dl', 'hpmud-relationship-metrics');
        Object.entries(DIMENSION_LABELS).forEach(([key, label]) => {
            const item = createElement('div');
            const term = createElement('dt', '', label);
            const value = createElement(
                'dd',
                key === 'warmth' ||
                key === 'trust' ||
                key === 'respect' ||
                key === 'influence'
                    ? asFiniteNumber(dimensions[key]) < 0
                        ? 'negative'
                        : 'positive'
                    : '',
                formatDimensionValue(dimensions[key]),
            );
            item.append(term, value);
            grid.append(item);
        });
        return grid;
    }

    function createEvidenceLedger(edge) {
        const section = createElement('section', 'hpmud-relationship-evidence');
        section.append(createElement('h4', '', '最近证据'));
        if (!edge.evidence.length) {
            section.append(
                createElement(
                    'p',
                    'hpmud-relationship-evidence-empty',
                    '这条兼容关系没有可展示的玩家知情 evidence。',
                ),
            );
            return section;
        }
        edge.evidence.slice(0, 5).forEach(evidence => {
            const article = createElement('article');
            article.append(
                createElement(
                    'p',
                    '',
                    evidence.summary || '已记录一次关系变化。',
                ),
            );
            const metadata = [
                evidence.clock,
                evidence.sceneId && `场景 ${evidence.sceneId}`,
                evidence.sourceMessageIds.length &&
                    `消息 ${evidence.sourceMessageIds.join(', ')}`,
            ].filter(Boolean).join(' · ');
            article.append(
                createElement('small', '', metadata || '来源已验证'),
            );
            section.append(article);
        });
        return section;
    }

    function createDirectionDetail(edge) {
        const source = projection.nodeById.get(edge.sourceId);
        const target = projection.nodeById.get(edge.targetId);
        const section = createElement('section', 'hpmud-relationship-direction');
        const heading = createElement('header');
        const names = createElement(
            'strong',
            '',
            `${source?.name || edge.sourceId} → ${target?.name || edge.targetId}`,
        );
        const relation = createElement('span', '', edge.label);
        heading.append(names, relation);
        const tags = structuralText(edge.tags);
        section.append(heading);
        if (tags) {
            section.append(
                createElement('p', 'hpmud-relationship-tags', tags),
            );
        }
        if (edge.activeEmotions.length) {
            section.append(
                createElement(
                    'p',
                    'hpmud-relationship-tags',
                    `短期情绪：${edge.activeEmotions
                        .map(emotion =>
                            `${emotion.emotion} ${emotion.intensity}`)
                        .join(' · ')}`,
                ),
            );
        }
        section.append(
            createMetricGrid(edge.dimensions),
            createEvidenceLedger(edge),
        );
        return section;
    }

    function renderEdgeDetail(edge) {
        detail.replaceChildren();
        const reverse = projection.edgeByDirection.get(
            `${edge.targetId}->${edge.sourceId}`,
        );
        const eyebrow = createElement(
            'small',
            'hpmud-relationship-detail-eyebrow',
            'Directed relationship',
        );
        const title = createElement('h3', '', '双向关系');
        detail.append(eyebrow, title, createDirectionDetail(edge));
        if (reverse) {
            detail.append(createDirectionDetail(reverse));
        } else {
            const missing = createElement(
                'section',
                'hpmud-relationship-direction missing',
            );
            missing.append(
                createElement(
                    'p',
                    '',
                    `${projection.nodeById.get(edge.targetId)?.name || edge.targetId} → ` +
                    `${projection.nodeById.get(edge.sourceId)?.name || edge.sourceId} ` +
                    '尚无玩家可知记录。',
                ),
            );
            detail.append(missing);
        }
    }

    function selectEdge(edgeId, { announceSelection = true } = {}) {
        const edge = projection.edges.find(item =>
            item.elementId === edgeId || item.id === edgeId);
        if (!edge) return;
        selectedEdgeId = edge.elementId;
        selectedNodeId = '';
        if (cy) {
            cy.elements().removeClass(
                'hpmud-graph-muted hpmud-graph-focus',
            );
            const visible = cy.elements().not('.hpmud-graph-hidden');
            visible.addClass('hpmud-graph-muted');
            const selected = cy.getElementById(edge.elementId);
            const reverse = projection.edgeByDirection.get(
                `${edge.targetId}->${edge.sourceId}`,
            );
            selected.addClass('hpmud-graph-focus');
            selected.connectedNodes().addClass('hpmud-graph-focus');
            if (reverse) {
                cy.getElementById(reverse.elementId)
                    .addClass('hpmud-graph-focus');
            }
        }
        renderEdgeDetail(edge);
        if (announceSelection) {
            announce(
                `已选择 ${projection.nodeById.get(edge.sourceId)?.name || edge.sourceId} ` +
                `到 ${projection.nodeById.get(edge.targetId)?.name || edge.targetId} 的关系。`,
            );
        }
    }

    function renderNodeDetail(node) {
        detail.replaceChildren();
        const header = createElement('header', 'hpmud-relationship-person');
        const sigil = createElement('span', 'hpmud-relationship-person-sigil');
        sigil.style.backgroundImage = `url("${node.sigil}")`;
        const identity = createElement('div');
        identity.append(
            createElement(
                'small',
                'hpmud-relationship-detail-eyebrow',
                node.house || 'Known constellation',
            ),
            createElement('h3', '', node.name),
            createElement('p', '', node.role),
        );
        header.append(sigil, identity);
        if (node.id !== 'player') {
            const openCard = createElement(
                'button',
                'hpmud-relationship-card-link',
                '打开人物卡',
            );
            openCard.type = 'button';
            openCard.addEventListener('click', () => {
                root.classList.add(
                    'hpmud-relationship-inspector-open',
                );
                dialog.close();
                onOpenActor(node.id);
            });
            header.append(openCard);
        }
        const nodeEdges = visibleProjection.edges.filter(edge =>
            edge.sourceId === node.id || edge.targetId === node.id);
        const summary = createElement('div', 'hpmud-relationship-node-summary');
        summary.append(
            createElement(
                'span',
                '',
                `${nodeEdges.length} 条当前可见关系`,
            ),
            createElement(
                'span',
                '',
                `已知程度 ${Math.round(node.familiarity)}`,
            ),
        );
        const connections = createElement(
            'section',
            'hpmud-relationship-connections',
        );
        connections.append(createElement('h4', '', '一跳关系'));
        if (!nodeEdges.length) {
            connections.append(
                createElement(
                    'p',
                    'hpmud-relationship-evidence-empty',
                    '当前筛选下没有可见连线。',
                ),
            );
        } else {
            nodeEdges.forEach(edge => {
                const outward = edge.sourceId === node.id;
                const otherId = outward ? edge.targetId : edge.sourceId;
                const button = createElement('button');
                button.type = 'button';
                button.innerHTML = `<span>${outward ? '→' : '←'}</span>`;
                const copy = createElement('span');
                copy.append(
                    createElement(
                        'strong',
                        '',
                        projection.nodeById.get(otherId)?.name || otherId,
                    ),
                    createElement('small', '', edge.label),
                );
                button.append(copy);
                button.addEventListener('click', () =>
                    selectEdge(edge.elementId));
                connections.append(button);
            });
        }
        detail.append(header, summary, connections);
    }

    function selectNode(nodeId, { announceSelection = true } = {}) {
        const node = projection.nodeById.get(nodeId);
        if (!node || !visibleProjection.nodeIds.has(nodeId)) return;
        selectedNodeId = nodeId;
        selectedEdgeId = '';
        if (cy) {
            cy.elements().removeClass(
                'hpmud-graph-muted hpmud-graph-focus',
            );
            const visible = cy.elements().not('.hpmud-graph-hidden');
            visible.addClass('hpmud-graph-muted');
            const selected = cy.getElementById(nodeId);
            selected
                .closedNeighborhood()
                .not('.hpmud-graph-hidden')
                .removeClass('hpmud-graph-muted')
                .addClass('hpmud-graph-focus');
            selected.addClass('hpmud-graph-focus');
        }
        renderNodeDetail(node);
        if (announceSelection) {
            announce(`已选择 ${node.name}，显示一跳关系。`);
        }
    }

    function renderTextFallback() {
        textNodes.replaceChildren();
        textEdges.replaceChildren();
        if (!visibleProjection.nodes.length) {
            textNodes.append(
                createElement('li', '', '当前筛选下没有人物。'),
            );
        } else {
            visibleProjection.nodes.forEach(node => {
                const item = createElement('li');
                const button = createElement('button');
                button.type = 'button';
                button.append(
                    createElement('strong', '', node.name),
                    createElement(
                        'small',
                        '',
                        [node.role, node.house].filter(Boolean).join(' · '),
                    ),
                );
                button.addEventListener('click', () => selectNode(node.id));
                item.append(button);
                textNodes.append(item);
            });
        }
        if (!visibleProjection.edges.length) {
            textEdges.append(
                createElement('li', '', '当前筛选下没有关系边。'),
            );
        } else {
            visibleProjection.edges.forEach(edge => {
                const item = createElement('li');
                const button = createElement('button');
                button.type = 'button';
                const sourceName =
                    projection.nodeById.get(edge.sourceId)?.name ||
                    edge.sourceId;
                const targetName =
                    projection.nodeById.get(edge.targetId)?.name ||
                    edge.targetId;
                button.append(
                    createElement(
                        'strong',
                        '',
                        `${sourceName} → ${targetName}`,
                    ),
                    createElement(
                        'small',
                        '',
                        `${edge.label} · 亲近 ${Math.round(edge.dimensions.closeness)}`,
                    ),
                );
                button.addEventListener('click', () =>
                    selectEdge(edge.elementId));
                item.append(button);
                textEdges.append(item);
            });
        }
    }

    function applyFilters({ fit = true } = {}) {
        visibleProjection = filterRelationshipGraphProjection(
            projection,
            preferences,
        );
        if (cy) {
            cy.batch(() => {
                cy.nodes().forEach(node => {
                    node.toggleClass(
                        'hpmud-graph-hidden',
                        !visibleProjection.nodeIds.has(node.id()),
                    );
                });
                cy.edges().forEach(edge => {
                    edge.toggleClass(
                        'hpmud-graph-hidden',
                        !visibleProjection.edgeIds.has(edge.id()),
                    );
                });
                cy.elements().removeClass(
                    'hpmud-graph-muted hpmud-graph-focus',
                );
            });
            if (fit && visibleProjection.nodes.length) {
                cy.fit(
                    cy.elements().not('.hpmud-graph-hidden'),
                    72,
                );
            }
        }
        const nodeCount = visibleProjection.nodes.length;
        const edgeCount = visibleProjection.edges.length;
        count.textContent = `${nodeCount} 人物 · ${edgeCount} 有向关系`;
        empty.hidden = nodeCount > 1 || edgeCount > 0;
        renderTextFallback();
        if (
            selectedNodeId &&
            visibleProjection.nodeIds.has(selectedNodeId)
        ) {
            selectNode(selectedNodeId, { announceSelection: false });
        } else if (
            selectedEdgeId &&
            visibleProjection.edgeIds.has(selectedEdgeId)
        ) {
            selectEdge(selectedEdgeId, { announceSelection: false });
        } else {
            renderEmptyDetail();
        }
    }

    function applySavedPositions() {
        if (!cy) return;
        const saved = preferences.positions || {};
        cy.batch(() => {
            cy.nodes().forEach(node => {
                const position = saved[node.id()];
                if (
                    Number.isFinite(Number(position?.x)) &&
                    Number.isFinite(Number(position?.y))
                ) {
                    node.position({
                        x: Number(position.x),
                        y: Number(position.y),
                    });
                }
            });
        });
    }

    function runLayout({ clearPositions = false } = {}) {
        if (!cy) return;
        if (clearPositions) {
            preferences.positions = {};
            persistPreferences();
        }
        const shouldReduceMotion =
            reducedMotion.matches;
        cy.layout({
            name: 'concentric',
            animate: !shouldReduceMotion,
            animationDuration:
                shouldReduceMotion ? 0 : 520,
            fit: true,
            padding: 78,
            minNodeSpacing: 54,
            startAngle: -Math.PI / 2,
            clockwise: true,
            concentric: node =>
                node.id() === 'player'
                    ? 1000
                    : asFiniteNumber(node.data('relevance')),
            levelWidth: () => 28,
        }).run();
        if (!clearPositions && Object.keys(preferences.positions).length) {
            requestAnimationFrame(() => {
                applySavedPositions();
                cy.fit(
                    cy.elements().not('.hpmud-graph-hidden'),
                    72,
                );
            });
        }
    }

    function saveNodePositions() {
        if (!cy) return;
        const positions = {};
        cy.nodes().forEach(node => {
            const position = node.position();
            positions[node.id()] = {
                x: Math.round(position.x * 10) / 10,
                y: Math.round(position.y * 10) / 10,
            };
        });
        preferences.positions = positions;
        persistPreferences();
        announce('已为这条时间线保存人物星位。');
    }

    function bindCytoscapeEvents() {
        cy.on('tap', 'node', event => {
            selectNode(event.target.id());
        });
        cy.on('tap', 'edge', event => {
            selectEdge(event.target.id());
        });
        cy.on('tap', event => {
            if (event.target !== cy) return;
            clearGraphFocus();
            renderEmptyDetail();
            announce('已清除关系焦点。');
        });
        cy.on('dragfree', 'node', saveNodePositions);
    }

    function syncMotionPreference() {
        if (!cy) return;
        if (reducedMotion.matches) {
            cy.stop(true);
        }
        cy.style(
            getRelationshipGraphStyles({
                reducedMotion:
                    reducedMotion.matches,
            }),
        ).update();
    }

    async function ensureCytoscape() {
        if (cy) return cy;
        announce('正在展开关系星图。');
        canvas.classList.add('loading');
        try {
            const cytoscape = await loadCytoscape();
            if (!dialog.open) return null;
            cy = cytoscape({
                container: canvas,
                elements: projectionElements(projection),
                style: getRelationshipGraphStyles({
                    reducedMotion:
                        reducedMotion.matches,
                }),
                minZoom: 0.18,
                maxZoom: 2.6,
                boxSelectionEnabled: false,
                selectionType: 'single',
                layout: { name: 'preset' },
            });
            bindCytoscapeEvents();
            runLayout();
            applyFilters({ fit: false });
            resizeObserver = new ResizeObserver(() => {
                if (!cy || !dialog.open) return;
                cy.resize();
            });
            resizeObserver.observe(canvas);
            announce('关系星图已展开。方向键可逐颗选择人物星。');
            return cy;
        } catch (error) {
            console.error('[Hogwarts MUD] Relationship graph failed to load', error);
            textFallback.open = true;
            announce('图形运行时不可用，已切换为完整文本关系表。');
            return null;
        } finally {
            canvas.classList.remove('loading');
        }
    }

    function rebuildCytoscape() {
        if (!cy) return;
        cy.elements().remove();
        cy.add(projectionElements(projection));
        runLayout();
        applyFilters({ fit: false });
    }

    async function refresh({ focusActorId = '' } = {}) {
        loadTimelinePreferences();
        projection = buildPlayerKnownRelationshipProjection(getState() || {});
        visibleProjection = filterRelationshipGraphProjection(
            projection,
            preferences,
        );
        applyFilters({ fit: false });
        if (!dialog.open) return;
        if (cy) {
            rebuildCytoscape();
        } else {
            await ensureCytoscape();
        }
        if (focusActorId && projection.nodeById.has(focusActorId)) {
            selectNode(focusActorId);
            if (cy) {
                const actorNode =
                    cy.getElementById(focusActorId);
                const zoom =
                    Math.max(cy.zoom(), 1.05);
                if (reducedMotion.matches) {
                    cy.stop(true);
                    cy.center(actorNode);
                    cy.zoom(zoom);
                } else {
                    cy.animate({
                        center: {
                            eles: actorNode,
                        },
                        zoom,
                        duration: 280,
                    });
                }
            }
        }
    }

    async function open({ actorId = '' } = {}) {
        if (!dialog.open) {
            dialog.showModal();
        }
        await new Promise(resolve => requestAnimationFrame(resolve));
        await refresh({ focusActorId: actorId });
        canvas.focus();
    }

    function close() {
        if (dialog.open) dialog.close();
    }

    function updatePreferences() {
        preferences = normalizePreferences({
            ...preferences,
            query: search.value,
            scope: scope.value,
            sentiment: sentiment.value,
            category: category.value,
        });
        persistPreferences();
        applyFilters();
    }

    function cycleKeyboardNode(direction) {
        const nodes = visibleProjection.nodes;
        if (!nodes.length) return;
        const currentIndex = Math.max(
            0,
            nodes.findIndex(node => node.id === selectedNodeId),
        );
        const nextIndex =
            (currentIndex + direction + nodes.length) % nodes.length;
        const node = nodes[nextIndex];
        selectNode(node.id);
        if (cy) {
            const nodeElement =
                cy.getElementById(node.id);
            if (reducedMotion.matches) {
                cy.stop(true);
                cy.center(nodeElement);
            } else {
                cy.animate({
                    center: {
                        eles: nodeElement,
                    },
                    duration: 180,
                });
            }
        }
    }

    const closeLinkedInspector = () => {
        root.classList.remove(
            'hpmud-relationship-inspector-open',
        );
    };
    const openFromTrigger = () => {
        closeLinkedInspector();
        void open();
    };
    const inspectorToggle =
        root.querySelector('#hpmud_character');

    trigger.addEventListener('click', openFromTrigger);
    inspectorToggle?.addEventListener(
        'click',
        closeLinkedInspector,
    );
    if (
        typeof reducedMotion.addEventListener ===
        'function'
    ) {
        reducedMotion.addEventListener(
            'change',
            syncMotionPreference,
        );
    } else {
        reducedMotion.addListener?.(
            syncMotionPreference,
        );
    }
    closeButton.addEventListener('click', close);
    dialog.addEventListener('close', () => {
        clearGraphFocus();
        trigger.focus();
    });
    dialog.addEventListener('click', event => {
        if (event.target === dialog) close();
    });
    search.addEventListener('input', updatePreferences);
    scope.addEventListener('change', updatePreferences);
    sentiment.addEventListener('change', updatePreferences);
    category.addEventListener('change', updatePreferences);
    reset.addEventListener('click', () => {
        runLayout({ clearPositions: true });
        announce('已重置为以玩家为中心的同心星位。');
    });
    canvas.addEventListener('keydown', event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            event.preventDefault();
            cycleKeyboardNode(1);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            event.preventDefault();
            cycleKeyboardNode(-1);
        } else if (event.key === 'Enter' && selectedNodeId) {
            event.preventDefault();
            renderNodeDetail(projection.nodeById.get(selectedNodeId));
        } else if (event.key === 'Escape') {
            event.preventDefault();
            close();
        }
    });
    renderEmptyDetail();

    return {
        close,
        open,
        refresh,
        destroy() {
            resizeObserver?.disconnect();
            inspectorToggle?.removeEventListener(
                'click',
                closeLinkedInspector,
            );
            if (
                typeof reducedMotion.removeEventListener ===
                'function'
            ) {
                reducedMotion.removeEventListener(
                    'change',
                    syncMotionPreference,
                );
            } else {
                reducedMotion.removeListener?.(
                    syncMotionPreference,
                );
            }
            cy?.destroy();
            cy = null;
        },
    };
}
