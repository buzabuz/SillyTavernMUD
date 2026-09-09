import { partitionModelSegments } from './model-language-adoption.js';

/**
 * Field routes: vcon007.result.segments, vcon007.result.speakers.
 * Message evidence is preserved independently from Post's world authority.
 */
export function preserveSceneNarrative(source, { reservedActorIds = [] } = {}) {
    if (!source || typeof source !== 'object' || Array.isArray(source)
        || !Array.isArray(source.segments)) {
        throw new TypeError('Scene response has no displayable segments.');
    }
    const recovered = [];
    for (const segment of source.segments) {
        if (!segment || typeof segment !== 'object' || Array.isArray(segment)) continue;
        const text = typeof segment.textEn === 'string' && segment.textEn.trim()
            ? segment.textEn
            : typeof segment.rawText === 'string' && segment.rawText.trim()
                ? segment.rawText
                : null;
        if (text === null) continue;
        const dialogue = segment.type === 'dialogue';
        recovered.push({
            type: dialogue ? 'dialogue' : 'narration',
            ...(dialogue ? {
                actorId: typeof segment.actorId === 'string' ? segment.actorId : '',
            } : {}),
            textEn: text,
        });
    }
    if (!recovered.length) {
        throw new TypeError('Scene response has no displayable segments.');
    }
    const partition = partitionModelSegments(recovered, { taskId: 'scene_performance' });
    partition.displaySegments.forEach((segment, index) => {
        if (Object.hasOwn(segment, 'rawText')) segment.rawText = recovered[index].textEn;
        else segment.textEn = recovered[index].textEn;
    });
    const declarations = new Map();
    const reserved = new Set(reservedActorIds);
    const conflicting = new Set();
    for (const speaker of Array.isArray(source.speakers) ? source.speakers : []) {
        if (reserved.has(speaker?.id)) {
            conflicting.add(speaker.id);
            continue;
        }
        if (!speaker || typeof speaker.id !== 'string'
            || !/^[a-z][a-z0-9_]{0,95}$/u.test(speaker.id)
            || speaker.id === 'player'
            || typeof speaker.displayNameEn !== 'string'
            || !speaker.displayNameEn.trim() || speaker.displayNameEn.length > 160) continue;
        if (declarations.has(speaker.id)) {
            declarations.set(speaker.id, null);
        } else {
            declarations.set(speaker.id, {
                id: speaker.id,
                displayNameEn: speaker.displayNameEn,
            });
        }
    }
    for (const segment of partition.displaySegments) {
        if (conflicting.has(segment.actorId)) segment.actorId = '';
    }
    return {
        protocolVersion: 3,
        settlementSource: 'narrative_preservation',
        segments: partition.displaySegments,
        speakers: [...declarations.values()].filter(Boolean),
        modelLanguageDiagnostics: partition.diagnostics,
        publicEventEn: '',
        sceneProgression: null,
        pacingBeatRealized: false,
        actorUpdates: [],
        temporaryActorEntrances: [],
        itemUpdates: [],
        revealedClues: [],
        settlementWarnings: [],
    };
}

export function validatePreservedSceneNarrative(source) {
    try {
        preserveSceneNarrative(source);
        return { valid: true, errors: [] };
    } catch (error) {
        return { valid: false, errors: [error.message] };
    }
}
