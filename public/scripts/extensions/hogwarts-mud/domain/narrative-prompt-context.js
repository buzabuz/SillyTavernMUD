import {
    buildNarrativeAuthoritySnapshot,
} from './narrative-authority.js';
import {
    buildSealedActivationCapsules,
} from './relational-synapse-retrieval.js';

const SUBJECTIVE_NODE_TYPES =
    new Set([
        'appraisal',
        'schema',
    ]);
const SUBJECTIVE_CATEGORIES =
    new Set([
        'appraisals',
        'schemas',
    ]);
const MEDIUM_INACCESSIBLE_FIELDS =
    new Set([
        'privateGoal',
        'privateGoalEn',
        'privateGoals',
        'privateGoalsEn',
        'secret',
        'secretEn',
        'secrets',
        'secretsEn',
        'privateMotive',
        'privateMotiveEn',
        'privateMotives',
        'privateMotivesEn',
        'storyArcs',
        'hiddenStoryArc',
        'hiddenStoryArcs',
        'activeStoryArc',
        'activeStoryArcs',
        'hiddenFact',
        'hiddenFactEn',
        'lockedClue',
        'lockedClues',
        'lockedFact',
        'lockedFacts',
        'unlockCondition',
        'unlockConditionEn',
    ]);

export const NARRATIVE_PROMPT_ACCESS =
    Object.freeze({
        MEDIUM: 'medium',
        DEDICATED_HIGH:
            'dedicated_high',
    });

export const NARRATIVE_AUTHORITY_PROMPT_CONTRACT = `Narrative authority contract:
- authoritySnapshot is binding and has the highest precedence. Current structured State and Reducer projections override current-scene Events, earlier Events or archives, actor-scoped Appraisals or Schemas, and raw historical evidence, in that order.
- memoryActivationCapsules is sealed by observerId. Use expectationEn to shape actor behavior, including anticipation, shorthand, boundaries, and initiative, without reciting labelEn or diagnosing the Schema.
- A concrete prior time, place, action, or quotation may be claimed only when a supporting Event with sourceRefs is present in that same actor's capsule. Without a supporting Event, act only on the expectation's gist and invent no episode details.
- Every segment that makes such a concrete historical claim must include historicalClaims. Each entry must quote the exact claimTextEn substring and list sourceEventIds from supportingEvents[].sourceRefs where type is "event". Omit historicalClaims for current action, non-specific familiarity, or expectation-driven behavior that claims no episode.
- Unmarked narration in the story's default literary past tense describes the current turn, not historical recall. Narrator history must use an explicit prior-time or recall marker and can never consume an actor-private supporting Event.
- Never let another actor, the narrator, or common context read or repeat an observer capsule. Never cross actor boundaries between capsules.
- counterexample is live contrary evidence. Let it temper confidence and behavior instead of erasing either the expectation or its supporting Events.
- historicalKnowledgeEvidence is attributed historical or superseded evidence only. It may explain how the current state arose but can never override authoritySnapshot, itemDirectives, or current actor knowledge.`;

function stableActorIds(
    actorIds,
) {
    return [
        ...new Set(
            (
                Array.isArray(actorIds)
                    ? actorIds
                    : []
            )
                .map(actorId =>
                    String(
                        actorId || '',
                    ).trim())
                .filter(Boolean),
        ),
    ].sort((left, right) =>
        left.localeCompare(
            right,
            'en',
        ));
}

function cloneJsonValue(
    value,
    fallback,
) {
    try {
        const serialized =
            JSON.stringify(value);
        return serialized ===
            undefined
            ? fallback
            : JSON.parse(
                serialized,
            );
    } catch {
        return fallback;
    }
}

function isLockedPromptRecord(
    value,
) {
    if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value)
    ) {
        return false;
    }
    const visibility =
        value.visibility;
    const visibilityScope =
        typeof visibility ===
            'string'
            ? visibility
            : visibility?.scope;
    return (
        visibilityScope ===
            'locked' ||
        value.scope ===
            'locked' ||
        value.access ===
            'locked' ||
        value.locked ===
            true ||
        value.isLocked ===
            true
    );
}

function projectMediumPromptValue(
    value,
) {
    if (Array.isArray(value)) {
        return value
            .filter(child =>
                !isLockedPromptRecord(
                    child,
                ))
            .map(
                projectMediumPromptValue,
            )
            .filter(child =>
                child !== undefined);
    }
    if (
        !value ||
        typeof value !== 'object'
    ) {
        return value;
    }
    if (isLockedPromptRecord(value)) {
        return undefined;
    }
    return Object.fromEntries(
        Object.entries(value)
            .filter(([key]) =>
                !MEDIUM_INACCESSIBLE_FIELDS
                    .has(key))
            .map(([
                key,
                child,
            ]) => [
                key,
                projectMediumPromptValue(
                    child,
                ),
            ])
            .filter(([
                ,
                child,
            ]) =>
                child !== undefined),
    );
}

export function projectNarrativePromptInput(
    value,
    {
        access =
        NARRATIVE_PROMPT_ACCESS
            .MEDIUM,
    } = {},
) {
    const fallback =
        Array.isArray(value)
            ? []
            : {};
    const cloned =
        cloneJsonValue(
            value,
            fallback,
        );
    if (
        access ===
        NARRATIVE_PROMPT_ACCESS
            .DEDICATED_HIGH
    ) {
        return cloned;
    }
    return (
        projectMediumPromptValue(
            cloned,
        ) ??
        fallback
    );
}

function deepFreeze(value) {
    if (
        !value ||
        typeof value !== 'object' ||
        Object.isFrozen(value)
    ) {
        return value;
    }
    for (
        const child
        of Object.values(value)
    ) {
        deepFreeze(child);
    }
    return Object.freeze(value);
}

export function getNarrativeKnowledgeRecords(
    retrieval,
) {
    if (Array.isArray(retrieval)) {
        return retrieval;
    }
    return Array.isArray(
        retrieval?.records,
    )
        ? retrieval.records
        : [];
}

function rankedKnowledgeEntries(
    records,
) {
    return records.map(
        (
            record,
            index,
        ) => ({
            record,
            score:
                records.length -
                index,
            hop: 0,
            path: [],
            sourceRefs:
                record?.sourceRefs ||
                [],
        }),
    );
}

function projectActivationCapsules(
    actorIds,
    filtered,
) {
    const byActorId =
        Object.fromEntries(
            actorIds.map(actorId => [
                actorId,
                filtered
                    .byActorId[
                        actorId
                    ],
            ]),
        );
    return deepFreeze(
        cloneJsonValue(
            {
                version:
                    Number(
                        filtered.version,
                    ) || 1,
                common:
                    filtered.common,
                byActorId,
            },
            filtered,
        ),
    );
}

export function getHistoricalKnowledgeRecords(
    retrieval,
    {
        includeLocked = false,
    } = {},
) {
    return getNarrativeKnowledgeRecords(
        retrieval,
    ).filter(record => {
        if (
            SUBJECTIVE_NODE_TYPES
                .has(
                    record?.nodeType,
                ) ||
            SUBJECTIVE_CATEGORIES
                .has(
                    record?.category,
                )
        ) {
            return false;
        }
        const scope =
            record?.visibility
                ?.scope;
        return (
            !scope ||
            scope === 'public' ||
            (
                includeLocked &&
                scope === 'locked'
            )
        );
    });
}

export function buildNarrativePromptContext(
    worldState,
    retrieval,
    {
        actorIds = [],
    } = {},
) {
    const normalizedActorIds =
        stableActorIds(actorIds);
    const records =
        getNarrativeKnowledgeRecords(
            retrieval,
        );
    const suppliedActivationCapsules =
        retrieval
            ?.activationCapsules;
    const actorKnowledgeFiltered =
        suppliedActivationCapsules
            ?.byActorId &&
        typeof suppliedActivationCapsules
            .byActorId ===
            'object'
            ? suppliedActivationCapsules
            : buildSealedActivationCapsules(
                rankedKnowledgeEntries(
                    records,
                ),
                {
                    actorIds:
                        normalizedActorIds,
                    timelineEpoch:
                        String(
                            worldState
                                ?.timelineEpoch ||
                            '',
                        ),
                    stateRevision:
                        worldState
                            ?.stateRevision,
                    clock:
                        String(
                            worldState
                                ?.clock ||
                            '',
                        ),
                },
            );
    return deepFreeze({
        authoritySnapshot:
            buildNarrativeAuthoritySnapshot(
                worldState,
            ),
        memoryActivationCapsules:
            projectActivationCapsules(
                normalizedActorIds,
                actorKnowledgeFiltered,
            ),
    });
}
