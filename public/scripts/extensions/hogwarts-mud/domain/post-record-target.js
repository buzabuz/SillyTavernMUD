import { MATERIAL_EVENT_DEFINITIONS } from '../material-schema.js';

/** Field route: turn.recovery.failures. Bounded target identity, never rejected prose or State authority. */
export function postRecordTarget(family, record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
    const fields = {
        actorUpdates: ['actorId'],
        temporaryActors: ['id'],
        firstImpressions: ['actorId'],
        identityObservations: ['actorId'],
        inventoryUpdates: ['id'],
        materialEvents: ['actorId', 'objectTextEn', 'targetTextEn'],
        historicalClaims: ['actorId', 'segmentIndex'],
        temporalClaims: ['kind'],
    }[family] || [];
    const target = {};
    for (const field of fields) {
        const value = record[field];
        if (field === 'segmentIndex' && Number.isInteger(value) && value >= 0) target[field] = value;
        else if (typeof value === 'string' && value.trim() && value.length <= 500) target[field] = value;
    }
    if (family === 'materialEvents' && MATERIAL_EVENT_DEFINITIONS[record.type]) {
        target.type = record.type;
    }
    return Object.keys(target).length ? target : null;
}

export function matchesPostRecordTarget(family, record, target) {
    if (!target) return false;
    const candidate = postRecordTarget(family, record);
    return candidate && Object.entries(target).every(([field, value]) => candidate[field] === value);
}
