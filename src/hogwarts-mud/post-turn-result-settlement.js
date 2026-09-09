import { z } from 'zod';
import { postBookkeepingSchemas } from './post-bookkeeping-schema.js';
import { postRecordTarget } from '../../public/scripts/extensions/hogwarts-mud/domain/post-record-target.js';

import {
    actorUpdateSchema,
    materialEventSchema,
    playerMovementSchema,
    temporalClaimSchema,
} from './post-turn-transport-contract.js';

/**
 * Field routes: vcon013.result.materialEvents,
 * vcon013.result.actorUpdates,
 * vcon013.result.inventoryObservationRequired,
 * vcon013.result.perception, vcon013.result.temporalClaims,
 * vcon013.result.playerMovement, vcon013.result.inventoryUpdates,
 * vcon013.result.identityObservations.
 * See .trae/specs/hogwarts-runtime-contracts/model-field-routes.md.
 */

const SCHEMA_VERSION = 2;
const MAX_DIAGNOSTIC_RECORDS = 64;

export class PostTurnResultEnvelopeError
    extends TypeError {}
export const postTurnRootEnvelopeSchema =
    z.object({
        schemaVersion:
            z.literal(SCHEMA_VERSION),
    }).passthrough();

const perceptionSchema =
    z.object({
        version: z.literal(1),
        visualScope:
            z.enum([
                'none',
                'target',
                'nearby',
                'room',
                'area',
            ]),
        audibleScope:
            z.enum([
                'none',
                'target',
                'nearby',
                'room',
                'adjacent',
            ]),
        salience:
            z.enum([
                'subtle',
                'normal',
                'notable',
                'major',
            ]),
        attribution:
            z.enum([
                'clear',
                'ambiguous',
                'unknown',
            ]),
        concealment:
            z.enum([
                'none',
                'attempted',
                'successful',
            ]),
        directParticipantActorIds:
            z.array(
                z.string().max(96),
            ).max(16),
        evidenceText:
            z.string()
                .min(1)
                .max(500),
        confidence:
            z.number()
                .min(0)
                .max(1),
        source:
            z.literal(
                'post_turn_observer',
            ),
    }).strict();

function parsePostTurnRawObject(
    rawResult,
) {
    if (
        rawResult &&
        typeof rawResult ===
            'object' &&
        !Array.isArray(rawResult)
    ) {
        return rawResult;
    }
    if (
        typeof rawResult !== 'string' ||
        !rawResult.trim()
    ) {
        throw new PostTurnResultEnvelopeError(
            'Post-turn model result must be one JSON object.',
        );
    }
    try {
        return JSON.parse(rawResult);
    } catch {
        throw new PostTurnResultEnvelopeError(
            'Post-turn model result must be one JSON object.',
        );
    }
}

export function recordPostFamilyRejection(
    rejections,
    family,
    disposition,
    reasonCode,
    rejectedCount = 1,
    recordIndex = null,
    record = null,
) {
    if (
        rejections.length >=
        MAX_DIAGNOSTIC_RECORDS
    ) {
        return;
    }
    rejections.push({
        family:
            String(family || '')
                .slice(0, 64),
        disposition:
            String(disposition || '')
                .slice(0, 32),
        reasonCode:
            String(reasonCode || '')
                .slice(0, 64),
        rejectedCount:
            Math.max(
                0,
                Number(rejectedCount) || 0,
            ),
        ...(Number.isInteger(recordIndex) ? { recordIndex } : {}),
        ...(postRecordTarget(family, record) ? { target: postRecordTarget(family, record) } : {}),
    });
}

function parsePostArrayFamily(
    source,
    family,
    recordSchema,
    maximum,
    rejections,
) {
    const raw = source?.[family];
    if (!Array.isArray(raw)) {
        recordPostFamilyRejection(
            rejections,
            family,
            'discard_family',
            raw === undefined
                ? 'missing_family'
                : 'invalid_family_shape',
        );
        return [];
    }
    const accepted = [];
    raw.forEach((record, index) => {
        if (index >= maximum) {
            recordPostFamilyRejection(
                rejections,
                family,
                'discard_record',
                'family_limit_exceeded',
            );
            return;
        }
        const parsed =
            recordSchema.safeParse(record);
        if (!parsed.success) {
            recordPostFamilyRejection(
                rejections,
                family,
                'discard_record',
                'invalid_record_shape',
                1,
                index,
                record,
            );
            return;
        }
        accepted.push(parsed.data);
    });
    return accepted;
}

/**
 * @param {unknown} rawResult
 * @param {{
 *   inventoryUpdateSchema?: import('zod').ZodTypeAny | null,
 *   identityObservationSchema?: import('zod').ZodTypeAny | null,
 * }} [options]
 */
export function settlePostTurnResultFamilies(
    rawResult,
    {
        inventoryUpdateSchema = null,
        identityObservationSchema = null,
    } = {},
) {
    const source =
        parsePostTurnRawObject(rawResult);
    if (
        !source ||
        typeof source !== 'object' ||
        Array.isArray(source) ||
        source.schemaVersion !==
            SCHEMA_VERSION
    ) {
        throw new PostTurnResultEnvelopeError(
            'Post-turn model result has an unusable root envelope.',
        );
    }
    const rejections = [];
    const parseObjectFamily = (
        family,
        schema,
        fallback,
    ) => {
        const parsed =
            schema.safeParse(
                source[family],
            );
        if (parsed.success) {
            return parsed.data;
        }
        recordPostFamilyRejection(
            rejections,
            family,
            'discard_family',
            source[family] === undefined
                ? 'missing_family'
                : 'invalid_family_shape',
        );
        return fallback;
    };
    const inventoryObservationRequired =
        typeof source
            .inventoryObservationRequired ===
        'boolean'
            ? source
                .inventoryObservationRequired
            : false;
    if (
        typeof source
            .inventoryObservationRequired !==
        'boolean'
    ) {
        recordPostFamilyRejection(
            rejections,
            'inventoryObservationRequired',
            'normalize',
            source
                .inventoryObservationRequired ===
                undefined
                ? 'missing_family'
                : 'invalid_family_shape',
        );
    }
    const result = {
        schemaVersion:
            SCHEMA_VERSION,
        materialEvents:
            parsePostArrayFamily(
                source,
                'materialEvents',
                materialEventSchema,
                16,
                rejections,
            ),
        actorUpdates:
            parsePostArrayFamily(
                source,
                'actorUpdates',
                actorUpdateSchema,
                16,
                rejections,
            ),
        inventoryObservationRequired,
        perception:
            parseObjectFamily(
                'perception',
                perceptionSchema,
                null,
            ),
        temporalClaims:
            parsePostArrayFamily(
                source,
                'temporalClaims',
                temporalClaimSchema,
                16,
                rejections,
            ),
        playerMovement:
            parseObjectFamily(
                'playerMovement',
                playerMovementSchema,
                null,
            ),
    };
    for (const [family, schema] of Object.entries(postBookkeepingSchemas)) {
        result[family] = schema instanceof z.ZodArray
            ? parsePostArrayFamily(source, family, schema.element, family === 'temporaryActors' ? 2 : 16, rejections)
            : parseObjectFamily(family, schema, null);
    }
    if (inventoryUpdateSchema) {
        result.inventoryUpdates =
            parsePostArrayFamily(
                source,
                'inventoryUpdates',
                inventoryUpdateSchema,
                8,
                rejections,
            );
    }
    if (identityObservationSchema) {
        result.identityObservations =
            parsePostArrayFamily(
                source,
                'identityObservations',
                identityObservationSchema,
                4,
                rejections,
            );
    }
    const knownKeys =
        new Set(
            Object.keys(result),
        );
    const unknownFamilyCount =
        Object.keys(source)
            .filter(key =>
                !knownKeys.has(key))
            .length;
    if (unknownFamilyCount) {
        recordPostFamilyRejection(
            rejections,
            'root',
            'discard_family',
            'unknown_family',
            unknownFamilyCount,
        );
    }
    return {
        result,
        rejections,
    };
}
