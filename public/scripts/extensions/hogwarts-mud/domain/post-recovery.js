import { POST_BOOKKEEPING_PROPERTIES } from './post-bookkeeping-contract.js';
import { validatePostPlayerMovement } from './movement-post-settlement.js';
import { MATERIAL_EVENT_DEFINITIONS } from '../material-schema.js';
import { matchesPostRecordTarget } from './post-record-target.js';

/** Field routes: turn.recovery.accepted/failures/supplement, vcon013.input.recoveryTargets/acceptedConstraints. */
export const POST_RECOVERY_FAMILIES = Object.freeze([
    'materialEvents', 'actorUpdates', 'perception', 'temporalClaims',
    'playerMovement', 'inventoryUpdates', 'identityObservations',
    ...Object.keys(POST_BOOKKEEPING_PROPERTIES),
]);

export function narrativeSourceIdentity(segments) {
    const source = JSON.stringify((segments || []).map(segment => ({
        type: segment.type, actorId: segment.actorId || '',
        text: segment.textEn || segment.rawText || '',
    })));
    let hash = 0xcbf29ce484222325n;
    for (let i = 0; i < source.length; i++) {
        hash = globalThis.BigInt.asUintN(64, (hash ^ globalThis.BigInt(source.charCodeAt(i))) * 0x100000001b3n);
    }
    return `${source.length}:${hash.toString(16)}`;
}

export function createPostRecovery(observation, transaction, previous = null) {
    const diagnostics = observation?.observation?.diagnostics || {};
    const rejected = observation?.postSettlementFailure
        ? POST_RECOVERY_FAMILIES.map(family => ({ family, reasonCode: observation.failureCode }))
        : (diagnostics.familyRejections || []).filter(entry =>
            POST_RECOVERY_FAMILIES.includes(entry.family) && entry.disposition !== 'normalize');
    const groups = new Map();
    for (const rejection of rejected) {
        const family = rejection.family;
        const group = groups.get(family) || { id: family, families: [family], count: 0, reasons: [], slots: [] };
        group.count += rejection.rejectedCount || 1;
        if (!group.reasons.includes(rejection.reasonCode)) group.reasons.push(rejection.reasonCode);
        if (Number.isInteger(rejection.recordIndex)) group.slots.push({
            id: `${family}:${rejection.recordIndex}`, index: rejection.recordIndex,
            ...(rejection.target ? { target: structuredClone(rejection.target) } : {}),
        });
        else if (rejection.disposition === 'discard_record') {
            for (let index = 0; index < Math.min(16, rejection.rejectedCount || 1); index++) {
                group.slots.push({ id: `${family}:unresolved_${group.slots.length}`,
                    ...(rejection.target ? { target: structuredClone(rejection.target) } : {}) });
            }
        }
        groups.set(family, group);
    }
    const movement = validatePostPlayerMovement(
        transaction.movementPreflight, observation?.observation?.result?.playerMovement, transaction.segments,
    );
    if (!movement.valid && !groups.has('playerMovement')) groups.set('playerMovement', {
        id: 'playerMovement', families: ['playerMovement'], count: 1, reasons: [movement.reasonCode],
    });
    if (groups.has('temporaryActors')) {
        const dependentFamilies = ['actorUpdates', 'inventoryUpdates', 'perception', 'identityObservations', 'materialEvents'];
        const promotion = groups.get('temporaryActors');
        for (const family of dependentFamilies) {
            if (groups.has(family) && rejected.some(entry =>
                entry.family === family && entry.dependsOn === 'temporaryActors')) {
                promotion.families.push(family);
                promotion.count += groups.get(family).count;
                promotion.slots.push(...groups.get(family).slots);
                groups.delete(family);
            }
        }
    }
    const accepted = structuredClone(observation || emptyPostObservation(transaction));
    accepted.observation ??= { result: {}, diagnostics: {} };
    accepted.observation.result = { ...emptyPostObservation(transaction).observation.result,
        ...accepted.observation.result };
    if (!movement.valid) accepted.observation.result.playerMovement = null;
    delete accepted.narrativeText;
    return {
        sourceIdentity: narrativeSourceIdentity(transaction.segments),
        accepted,
        groups: [...groups.values()],
        blockingMovement: !movement.valid,
        supplement: previous?.supplement || { status: 'available', attemptId: '', selectedGroupIds: [] },
    };
}

export function emptyPostObservation(transaction) {
    const result = Object.fromEntries(POST_RECOVERY_FAMILIES.map(family => [
        family, ['perception', 'playerMovement', 'sceneProgression', 'pacingRealization'].includes(family) ? null : [],
    ]));
    return {
        observation: { result: { ...result, schemaVersion: 2 }, diagnostics: {} },
        narrativeText: (transaction.segments || []).map(s => s.textEn || '').join('\n'),
        materialEvents: [], itemUpdates: [], identityObservations: [],
        temporalClaims: [], temporalDiagnostics: { accepted: 0, rejected: 0 },
        perception: null, targetActorIds: [],
    };
}

function recordKey(family, record) {
    if (family === 'materialEvents') {
        const definition = MATERIAL_EVENT_DEFINITIONS[record.type];
        const target = definition?.category === 'appearance_change'
            ? record.actorId
            : String(record.objectTextEn || record.targetTextEn || '').trim().toLowerCase();
        return JSON.stringify([definition?.category, target, definition?.aspect || record.type]);
    }
    if (family === 'actorUpdates') return record.actorId;
    if (family === 'temporaryActors') return record.id;
    if (family === 'firstImpressions' || family === 'identityObservations') return record.actorId;
    if (family === 'inventoryUpdates') return record.id || `${record.operation}:${record.evidenceText}`;
    if (family === 'historicalClaims') return `${record.segmentIndex}:${record.claimTextEn}`;
    return JSON.stringify(record);
}

function appendUnchanged(family, accepted, proposed, slots = []) {
    const keys = new Set(accepted.map(record => recordKey(family, record)));
    const remaining = [...slots];
    return [...accepted, ...proposed.filter(record => {
        const key = recordKey(family, record);
        if (keys.has(key)) return false;
        if (slots.length) {
            const index = remaining.findIndex(slot => matchesPostRecordTarget(family, record, slot.target));
            if (index < 0) return false;
            remaining.splice(index, 1);
        }
        keys.add(key);
        return true;
    }).slice(0, slots.length || 16)];
}

export function mergePostSupplement(recovery, incoming, selectedGroupIds, transaction) {
    if (recovery.sourceIdentity !== narrativeSourceIdentity(transaction.segments)) {
        throw new Error('Saved narrative changed before Post recovery.');
    }
    const selected = new Set(selectedGroupIds);
    const families = new Set(recovery.groups.filter(g => selected.has(g.id)).flatMap(g => g.families));
    const merged = structuredClone(recovery.accepted);
    merged.narrativeText = emptyPostObservation(transaction).narrativeText;
    delete merged.postSettlementFailure;
    delete merged.failureCode;
    if (incoming?.postSettlementFailure) return merged;
    const next = incoming || emptyPostObservation(transaction);
    const target = merged.observation.result;
    for (const family of families) {
        const value = next.observation?.result?.[family];
        const slots = recovery.groups.find(g => g.families.includes(family))?.slots
            ?.filter(slot => slot.id.startsWith(`${family}:`));
        if (Array.isArray(target[family]) && Array.isArray(value)) {
            target[family] = appendUnchanged(family, target[family], value, slots);
        } else if (target[family] == null && value != null) {
            target[family] = structuredClone(value);
        }
    }
    for (const [family, field] of [
        ['materialEvents', 'materialEvents'], ['inventoryUpdates', 'itemUpdates'],
        ['identityObservations', 'identityObservations'], ['temporalClaims', 'temporalClaims'],
    ]) {
        if (families.has(family)) {
            const slots = recovery.groups.find(g => g.families.includes(family))?.slots
                ?.filter(slot => slot.id.startsWith(`${family}:`));
            merged[field] = appendUnchanged(family, merged[field] || [], next[field] || [], slots);
        }
    }
    if (families.has('perception') && !merged.perception) merged.perception = next.perception;
    return merged;
}

export function postRecoveryTargets(recovery, selectedGroupIds) {
    const selected = new Set(selectedGroupIds);
    const groups = recovery.groups.filter(group => selected.has(group.id));
    if (!groups.length) throw new Error('No failed Post fields selected.');
    return {
        families: [...new Set(groups.flatMap(group => group.families))],
        groups: structuredClone(groups),
    };
}
