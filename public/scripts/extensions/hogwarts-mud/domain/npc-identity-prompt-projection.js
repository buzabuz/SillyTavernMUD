import {
    normalizeNpcIdentity,
    projectNpcIdentity,
} from './npc-identity-schema.js';
import {
    getCanonIdentity,
} from './npc-identity-canon.js';
import {
    buildSocialAudienceProjection,
} from './social-projection.js';

export const NPC_IDENTITY_PROMPT_BOUNDARY = `
Identity prompt boundary:
- identityProjection is observer-scoped and clock-scoped. authority is available only to the matching subject actor; claims are attributed statements, never objective truth.
- A model may use only claims visible inside its matching observer capsule. Never transfer one observer's Identity knowledge to another actor or the narrator.
- Model output cannot write authority Identity, person reference resolution, or a formal family edge. It may only repeat evidence-grounded attributed claims through committed reported Events.
- Current goal, mood, intent, and activity are dynamic actor state outside Identity. Never propose or store them as Identity fields.`;

const PROMPT_RUNTIME_ACTOR_FIELDS =
    Object.freeze([
        'id',
        'canonCatalogId',
        'name',
        'nameEn',
        'aliases',
        'role',
        'roleEn',
        'present',
        'lifeStatus',
        'temporary',
        'mapId',
        'roomId',
        'firstImpressionOfPlayer',
        'firstImpressionOfPlayerEn',
        'currentGoal',
        'currentGoalEn',
        'currentMood',
        'currentMoodEn',
        'currentIntent',
        'currentIntentEn',
        'currentActivity',
        'currentActivityEn',
    ]);

function clockValue(
    value,
    {
        endOfDay = false,
    } = {},
) {
    const match =
        String(value || '')
            .match(
                /(-?\d{4,6})-(\d{2})-(\d{2})(?:[^\d]+(\d{1,2}):(\d{2}))?/u,
            );
    if (!match) return null;
    const [
        ,
        rawYear,
        rawMonth,
        rawDay,
        rawHour,
        rawMinute,
    ] = match;
    const year = Number(rawYear);
    const month = Number(rawMonth);
    const day = Number(rawDay);
    const hasTime =
        rawHour !== undefined;
    const hour = hasTime
        ? Number(rawHour)
        : endOfDay
            ? 23
            : 0;
    const minute = hasTime
        ? Number(rawMinute)
        : endOfDay
            ? 59
            : 0;
    if (
        !Number.isInteger(year) ||
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > 31 ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        return null;
    }
    return Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute,
    );
}

function isRecordEffectiveAtClock(
    record,
    clock,
) {
    const current =
        clockValue(clock);
    const effectiveFrom =
        clockValue(
            record?.effectiveFrom,
        );
    const effectiveTo =
        clockValue(
            record?.effectiveTo,
            {
                endOfDay: true,
            },
        );
    if (
        current === null &&
        (
            effectiveFrom !== null ||
            effectiveTo !== null
        )
    ) {
        return false;
    }
    return (
        (
            effectiveFrom === null ||
            current >= effectiveFrom
        ) &&
        (
            effectiveTo === null ||
            current <= effectiveTo
        )
    );
}

function occurredByClock(
    value,
    clock,
) {
    const eventClock =
        clockValue(value);
    const current =
        clockValue(clock);
    return (
        eventClock === null ||
        current !== null &&
        eventClock <= current
    );
}

function fieldPathParts(
    value,
) {
    return String(value || '')
        .replace(/^identity\./u, '')
        .split(/[.[\]]/u)
        .map(part => part.trim())
        .filter(Boolean);
}

function getPathValue(
    source,
    parts,
) {
    let value = source;
    for (const part of parts) {
        if (
            !value ||
            typeof value !== 'object'
        ) {
            return undefined;
        }
        value = value[part];
    }
    return value;
}

function setPathValue(
    target,
    parts,
    value,
) {
    if (!parts.length) return;
    let cursor = target;
    for (
        let index = 0;
        index < parts.length - 1;
        index++
    ) {
        const part = parts[index];
        if (
            !cursor[part] ||
            typeof cursor[part] !==
                'object'
        ) {
            return;
        }
        cursor = cursor[part];
    }
    cursor[parts.at(-1)] =
        value === undefined
            ? null
            : structuredClone(value);
}

function filterAuthorityByClock(
    source,
    clock,
) {
    const identity =
        normalizeNpcIdentity(
            source,
        );
    const unknown =
        normalizeNpcIdentity();
    const recordsByPath =
        new Map();
    for (const record of (
        identity.provenance
            .records || []
    )) {
        const path =
            String(
                record.fieldPath ||
                '',
            ).replace(
                /^identity\./u,
                '',
            );
        if (!path) continue;
        const records =
            recordsByPath.get(path) ||
            [];
        records.push(record);
        recordsByPath.set(
            path,
            records,
        );
    }
    for (const [
        path,
        records,
    ] of recordsByPath) {
        if (
            records.some(record =>
                isRecordEffectiveAtClock(
                    record,
                    clock,
                ))
        ) {
            continue;
        }
        const parts =
            fieldPathParts(path);
        setPathValue(
            identity,
            parts,
            getPathValue(
                unknown,
                parts,
            ),
        );
    }
    return projectNpcIdentity(
        identity,
        {
            clock,
        },
    );
}

function findIdentityAuthority(
    worldState,
    subjectActorId,
) {
    const profile =
        (
            worldState
                ?.actorLibrary ||
            []
        ).find(actor =>
            actor.id ===
            subjectActorId);
    if (profile?.identity) {
        return profile.identity;
    }
    const runtimeActor = (
        worldState?.actors ||
        []
    ).find(actor =>
        actor.id ===
        subjectActorId);
    return (
        runtimeActor?.identity ||
        getCanonIdentity(
            profile ||
            runtimeActor ||
            subjectActorId,
        )
    );
}

function cloneRecords(
    values,
) {
    return structuredClone(
        values || [],
    );
}

function claimOccurredByClock(
    claim,
    worldState,
    clock,
) {
    if (
        claim?.sourceKind ===
            'authority'
    ) {
        return true;
    }
    const event =
        (
            worldState
                ?.eventKnowledge ||
            []
        ).find(candidate =>
            candidate.eventId ===
                claim
                    ?.reportedEventId);
    return (
        event?.eventKind ===
            'reported' &&
        occurredByClock(
            event.clock,
            clock,
        )
    );
}

export function buildNpcIdentityPromptProjection(
    worldState = {},
    subjectActorId,
    observerActorId,
    {
        clock =
        worldState?.clock ||
        '',
    } = {},
) {
    const subjectId =
        String(
            subjectActorId ||
            '',
        ).trim();
    const observerId =
        String(
            observerActorId ||
            '',
        ).trim();
    const social =
        buildSocialAudienceProjection(
            worldState,
            observerId,
        );
    const identityClaims =
        social.identityClaims
            .filter(claim =>
                claim.subjectId ===
                    subjectId &&
                claimOccurredByClock(
                    claim,
                    worldState,
                    clock,
                ));
    const relationshipClaims =
        social.relationshipClaims
            .filter(claim =>
                claim.subjectId ===
                    subjectId &&
                claimOccurredByClock(
                    claim,
                    worldState,
                    clock,
                ));
    const visibleReferenceIds =
        new Set(
            relationshipClaims
                .map(claim =>
                    claim.targetRefId),
        );
    const authority =
        (
            observerId === subjectId ||
            observerId === 'authority'
        )
            ? findIdentityAuthority(
                worldState,
                subjectId,
            )
            : null;
    return {
        subjectId,
        observerActorId:
            observerId,
        clock,
        authority: authority
            ? filterAuthorityByClock(
                authority,
                clock,
            )
            : null,
        claims: {
            identityClaims:
                cloneRecords(
                    identityClaims,
                ),
            relationshipClaims:
                cloneRecords(
                    relationshipClaims,
                ),
            personReferences:
                cloneRecords(
                    social
                        .personReferences
                        .filter(reference =>
                            visibleReferenceIds
                                .has(
                                    reference.id,
                                )),
                ),
        },
    };
}

export function buildNpcIdentityKnowledgeForObserver(
    worldState = {},
    observerActorId,
    {
        clock =
        worldState?.clock ||
        '',
    } = {},
) {
    const social =
        buildSocialAudienceProjection(
            worldState,
            observerActorId,
        );
    const subjectIds =
        new Set([
            observerActorId,
            ...social.identityClaims
                .map(claim =>
                    claim.subjectId),
            ...social.relationshipClaims
                .map(statement =>
                    statement.subjectId),
        ].filter(Boolean));
    return [
        ...subjectIds,
    ]
        .map(subjectId =>
            buildNpcIdentityPromptProjection(
                worldState,
                subjectId,
                observerActorId,
                {
                    clock,
                },
            ))
        .filter(projection =>
            projection.authority ||
            projection.claims
                .identityClaims
                .length ||
            projection.claims
                .relationshipClaims
                .length);
}

export function projectNpcRuntimeActorsForPrompt(
    worldState = {},
    {
        actorIds = null,
        presentOnly = false,
    } = {},
) {
    const allowedIds =
        actorIds
            ? new Set(actorIds)
            : null;
    return (
        worldState?.actors ||
        []
    )
        .filter(actor =>
            (
                !allowedIds ||
                allowedIds.has(
                    actor.id,
                )
            ) &&
            (
                !presentOnly ||
                actor.present !== false
            ))
        .map(actor =>
            Object.fromEntries(
                PROMPT_RUNTIME_ACTOR_FIELDS
                    .filter(field =>
                        actor[field] !==
                            undefined)
                    .map(field => [
                        field,
                        structuredClone(
                            actor[field],
                        ),
                    ]),
            ));
}
