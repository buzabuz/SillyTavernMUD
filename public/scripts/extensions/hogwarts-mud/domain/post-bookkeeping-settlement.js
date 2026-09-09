import { validateTemporaryActorEntrances } from './turn-authority.js';
import { collectNonEnglishAuthorityFields } from './model-language-adoption.js';
import { isValidFirstImpression } from './actor-memory.js';
import { buildSpatialContext } from './spatial-reconciliation.js';
import { postRecordTarget } from './post-record-target.js';

/** Field routes: vcon013.result.temporaryActors/firstImpressions/sceneProgression/pacingRealization/historicalClaims. */
export function settlePostBookkeeping(result, state, transaction, { acceptedActorIds = [] } = {}) {
    const rejections = [];
    const segments = transaction.segments || [];
    const sourceTexts = segments.map(segment => segment.textEn || '').filter(Boolean);
    const grounded = text => typeof text === 'string' && text.trim()
        && sourceTexts.some(source => source.includes(text));
    const reject = (family, recordIndex, reasonCode) => rejections.push({
        family, recordIndex, disposition: 'discard_record', reasonCode, rejectedCount: 1,
        target: postRecordTarget(family, result[family]?.[recordIndex]),
    });
    const english = value => collectNonEnglishAuthorityFields(value).length === 0;
    const actorIds = new Set([...(state.actors || []), ...(state.actorLibrary || [])].map(a => a.id));
    const declarations = new Map((transaction.speakers || []).map(s => [s.id, s]));
    const collisions = new Set([...declarations.keys()].filter(id => actorIds.has(id) && !acceptedActorIds.includes(id)));
    const temporaryActors = [];
    for (const [index, actor] of (result.temporaryActors || []).entries()) {
        const policy = transaction.postContext?.temporaryActorPromotionPolicy;
        const validation = validateTemporaryActorEntrances([...temporaryActors, actor], state);
        const selected = policy?.mode === 'promote_selected_anonymous_interaction';
        if (!selected || !declarations.has(actor.id) || actorIds.has(actor.id)
            || actor.nameEn !== declarations.get(actor.id)?.displayNameEn
            || actor.runtime.roomId !== (state.map?.currentLocalNodeId || state.scene?.roomId)
            || actor.runtime.present !== true
            || !segments.some(s => s.type === 'dialogue' && s.actorId === actor.id)
            || !validation.valid || !english(actor)) {
            reject('temporaryActors', index, 'actor_promotion_not_authorized');
            continue;
        }
        temporaryActors.push(actor);
        actorIds.add(actor.id);
    }
    for (const speaker of declarations.values()) {
        if ((!actorIds.has(speaker.id) || collisions.has(speaker.id))
            && !rejections.some(r => r.family === 'temporaryActors')) {
            reject('temporaryActors', null, 'speaker_promotion_missing');
        }
    }
    const unresolved = new Set([...declarations.keys()].filter(id => !actorIds.has(id) || collisions.has(id)));
    const dependent = { ...result };
    for (const [family, fields] of [
        ['actorUpdates', ['actorId']], ['inventoryUpdates', ['ownerId', 'holderId', 'targetHolderId']],
        ['identityObservations', ['actorId']], ['materialEvents', ['actorId']],
    ]) {
        dependent[family] = (result[family] || []).filter((record, index) => {
            if (!fields.some(field => unresolved.has(record[field]))) return true;
            rejections.push({
                family, recordIndex: index, disposition: 'discard_record',
                reasonCode: 'speaker_admission_required', rejectedCount: 1, dependsOn: 'temporaryActors',
                target: postRecordTarget(family, record),
            });
            return false;
        });
    }
    if (result.perception?.directParticipantActorIds?.some(id => unresolved.has(id))) {
        dependent.perception = null;
        rejections.push({
            family: 'perception', disposition: 'discard_family', reasonCode: 'speaker_admission_required',
            rejectedCount: 1, dependsOn: 'temporaryActors',
        });
    }
    const firstImpressions = [];
    for (const [index, hint] of (result.firstImpressions || []).entries()) {
        const actor = (state.actors || []).find(a => a.id === hint.actorId);
        const eligible = transaction.postContext?.firstMeetingActorIds?.includes(hint.actorId);
        const visible = buildSpatialContext(state).actors.find(a => a.id === hint.actorId)?.canSeePlayer;
        if (!actor || unresolved.has(hint.actorId) || !eligible || !visible || !grounded(hint.evidenceText) || !english(hint)
            || !isValidFirstImpression(hint.firstImpressionOfPlayerEn)
            || state.actorMemoryIndex?.byActorId?.[hint.actorId]?.firstImpressionRef) {
            reject('firstImpressions', index, 'first_meeting_not_authorized');
            continue;
        }
        firstImpressions.push(hint);
    }
    let sceneProgression = result.sceneProgression;
    if (sceneProgression && (!grounded(sceneProgression.evidenceText)
        || !sceneProgression.summaryEn.trim() || !english(sceneProgression))) {
        reject('sceneProgression', null, 'progression_evidence_invalid');
        sceneProgression = null;
    }
    let pacingRealization = result.pacingRealization;
    const beat = transaction.pacingBeat;
    if (pacingRealization && (!beat || pacingRealization.beatId !== beat.id
        || (pacingRealization.realized && !grounded(pacingRealization.evidenceText)))) {
        reject('pacingRealization', null, 'pacing_evidence_invalid');
        pacingRealization = null;
    }
    const historicalClaims = [];
    for (const [index, claim] of (result.historicalClaims || []).entries()) {
        const segment = segments[claim.segmentIndex];
        const allowed = transaction.postContext?.historicalSupport?.[claim.actorId] || [];
        if (unresolved.has(claim.actorId) || segment?.type !== 'dialogue' || segment.actorId !== claim.actorId
            || !claim.claimTextEn.trim() || !segment.textEn?.includes(claim.claimTextEn)
            || !claim.sourceEventIds.length || !claim.sourceEventIds.every(id => allowed.includes(id))) {
            reject('historicalClaims', index, 'historical_support_invalid');
            continue;
        }
        historicalClaims.push(claim);
    }
    return {
        result: { ...dependent, temporaryActors, firstImpressions, sceneProgression, pacingRealization, historicalClaims },
        rejections,
    };
}

export function applyPostBookkeeping(transaction, result) {
    transaction.temporaryActorEntrances = structuredClone(result.temporaryActors || []);
    transaction.sceneProgression = result.sceneProgression ? {
        type: result.sceneProgression.type, summaryEn: result.sceneProgression.summaryEn,
    } : null;
    transaction.publicEventEn = transaction.sceneProgression?.summaryEn || '';
    transaction.pacingBeatRealized = result.pacingRealization?.realized === true;
    for (const hint of result.firstImpressions || []) {
        const update = transaction.actorUpdates.find(a => a.id === hint.actorId);
        if (update) update.firstImpressionOfPlayerEn = hint.firstImpressionOfPlayerEn;
        else transaction.actorUpdates.push({
            id: hint.actorId, currentActivityEn: hint.currentActivityEn,
            firstImpressionOfPlayerEn: hint.firstImpressionOfPlayerEn,
        });
    }
    for (const segment of transaction.segments) delete segment.historicalClaims;
    for (const claim of result.historicalClaims || []) {
        const segment = transaction.segments[claim.segmentIndex];
        segment.historicalClaims ??= [];
        segment.historicalClaims.push({
            claimTextEn: claim.claimTextEn, sourceEventIds: claim.sourceEventIds,
        });
    }
}

export function projectPostActorState(state, temporaryActors = []) {
    const existingIds = new Set([...(state.actors || []), ...(state.actorLibrary || [])].map(actor => actor.id));
    const additions = temporaryActors.filter(actor => {
        if (existingIds.has(actor.id)) return false;
        existingIds.add(actor.id);
        return true;
    });
    return {
        ...state,
        actors: [...(state.actors || []), ...additions.map(actor => ({
            id: actor.id, nameEn: actor.nameEn, roleEn: actor.roleEn,
            ...actor.runtime, mapId: state.map?.activeMapId || '',
        }))],
        actorLibrary: [...(state.actorLibrary || []), ...additions],
    };
}
