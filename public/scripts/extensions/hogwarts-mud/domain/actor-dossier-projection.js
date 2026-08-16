import {
    actorDossierProjectionVersion,
} from './actor-context-schema.js';
import {
    buildNpcIdentityPromptProjection,
} from './npc-identity-prompt-projection.js';
import {
    buildSocialAudienceProjection,
} from './social-projection.js';
import {
    SOCIAL_RELATIONSHIP_DIMENSIONS,
} from './social-schema.js';
import {
    projectActorItems,
} from './item-projection.js';
import {
    buildNpcIdentityDossierViewModel,
} from './npc-identity-dossier.js';
import {
    getStaticLocaleText,
    normalizeDisplayLocale,
} from './localized-view-model.js';

function asArray(value) {
    return Array.isArray(value)
        ? value
        : [];
}

function text(value) {
    return String(value ?? '')
        .normalize('NFKC')
        .replace(/\s+/gu, ' ')
        .trim();
}

function staticText(
    displayLocale,
    staticKey,
    sourceTextEn,
) {
    return getStaticLocaleText(
        staticKey,
        normalizeDisplayLocale(
            displayLocale,
        ),
    ) ||
        sourceTextEn;
}

function clone(value) {
    return structuredClone(value);
}

function actorCore(state, actorId) {
    return asArray(
        state?.actorLibrary,
    ).find(actor =>
        actor?.id === actorId) ||
        null;
}

function actorRuntime(state, actorId) {
    return asArray(
        state?.actors,
    ).find(actor =>
        actor?.id === actorId) ||
        null;
}

function relationshipEvidenceView(
    evidence,
    {
        appraisals,
        events,
        viewerId,
        displayLocale,
    },
) {
    const appraisal =
        appraisals.get(
            evidence?.appraisalId,
        );
    const event =
        events.get(
            evidence?.eventId,
        );
    const appraisalVisible =
        Boolean(
            appraisal &&
            (
                viewerId ===
                    'authority' ||
                appraisal.observerId ===
                    viewerId ||
                appraisal.targetId ===
                    viewerId
            ),
        );
    const eventVisible =
        eventVisibleToViewer(
            event,
            viewerId,
        );
    if (
        !appraisalVisible &&
        !eventVisible
    ) {
        return null;
    }
    return {
        recordId:
            text(evidence?.id),
        sourceRecordType:
            appraisalVisible
                ? 'appraisal'
                : 'event',
        sourceRecordId:
            appraisalVisible
                ? text(
                    appraisal?.id,
                )
                : text(
                    event
                        ?.eventId,
                ),
        summary:
            text(
                appraisalVisible
                    ? appraisal
                        .summaryEn
                    : event
                        ?.summaryEn,
            ),
        clock:
            text(
                appraisalVisible
                    ? appraisal
                        .committedClock
                    : event?.clock ||
                        evidence?.clock,
            ),
        sceneId:
            text(event?.sceneId),
        sourceMessageIds:
            event?.eventKind ===
                'observed'
                ? asArray(
                    event
                        .sourceMessageIds,
                )
                    .map(Number)
                    .filter(
                        Number.isInteger,
                    )
                : [],
    };
}

function emptyRelationship(
    sourceActorId,
    targetActorId,
    displayLocale,
) {
    return {
        sourceActorId,
        targetActorId,
        labels: [
            staticText(
                displayLocale,
                'ui.inspector.relationship.none',
                'No relationship',
            ),
        ],
        dimensions:
            Object.fromEntries(
                SOCIAL_RELATIONSHIP_DIMENSIONS
                    .map(dimension => [
                        dimension,
                        0,
                    ]),
            ),
        activeSentiments: [],
        evidenceRefs: [],
        structuralTags: [],
    };
}

/**
 * Build the only viewer-scoped relationship projection used by actor UI.
 *
 * @param {object} state Canonical V1 world state.
 * @param {string} viewerId Viewing actor ID.
 * @returns {object} Detached relationship projection.
 */
export function buildRelationshipProjection(
    state = {},
    viewerId = 'player',
    displayLocale =
    'zh-CN',
) {
    const projection =
        buildSocialAudienceProjection(
            state,
            viewerId,
            {
                displayLocale,
            },
        );
    const directories = {
        appraisals:
            appraisalDirectory(
                state,
            ),
        events:
            eventDirectory(state),
        viewerId,
    };
    const relationships =
        projection.relationships
            .map(edge => ({
                sourceActorId:
                    edge.sourceActorId,
                targetActorId:
                    edge.targetActorId,
                labels:
                    asArray(
                        edge.labels,
                    ).map(text)
                        .filter(Boolean),
                dimensions:
                    Object.fromEntries(
                        SOCIAL_RELATIONSHIP_DIMENSIONS
                            .map(dimension => [
                                dimension,
                                Number(
                                    edge[
                                        dimension
                                    ] || 0,
                                ),
                            ]),
                    ),
                activeSentiments:
                    clone(
                        asArray(
                            edge
                                .activeEmotions,
                        ),
                    ),
                evidenceRefs:
                    asArray(
                        edge.evidence,
                    ).map(
                        evidence =>
                            relationshipEvidenceView(
                                evidence,
                                directories,
                            ),
                    ).filter(Boolean),
                structuralTags:
                    asArray(
                        edge
                            .structuralTags,
                    ).map(text)
                        .filter(Boolean),
            }));
    return {
        schemaVersion: 1,
        viewerId:
            text(viewerId),
        relationships,
    };
}

function selectActorRelationship(
    relationshipProjection,
    actorId,
    viewerId,
    displayLocale,
) {
    return relationshipProjection
        .relationships
        .find(edge =>
            edge.sourceActorId ===
                actorId &&
            edge.targetActorId ===
                viewerId) ||
        emptyRelationship(
            actorId,
            viewerId,
            displayLocale,
        );
}

function appraisalDirectory(state) {
    return new Map(
        asArray(
            state?.memorySynapse
                ?.appraisals,
        )
            .filter(appraisal =>
                appraisal?.id)
            .map(appraisal => [
                appraisal.id,
                appraisal,
            ]),
    );
}

function eventDirectory(state) {
    return new Map(
        asArray(
            state?.eventKnowledge,
        )
            .filter(event =>
                event?.eventId)
            .map(event => [
                event.eventId,
                event,
            ]),
    );
}

function eventVisibleToViewer(
    event,
    viewerId,
) {
    return viewerId ===
        'authority' ||
        asArray(
            event?.participantActorIds,
        ).includes(viewerId) ||
        asArray(
            event?.witnessActorIds,
        ).includes(viewerId) ||
        event?.knownToPlayer === true;
}

function hydrateMemoryRef(
    reference,
    {
        appraisals,
        events,
        viewerId,
        displayLocale,
    },
) {
    const recordType =
        text(reference?.recordType);
    const recordId =
        text(reference?.recordId);
    if (
        recordType === 'event'
    ) {
        const event =
            events.get(recordId);
        if (
            !event ||
            !eventVisibleToViewer(
                event,
                viewerId,
            )
        ) {
            return null;
        }
        return {
            recordId,
            recordType,
            summary:
                text(event.summaryEn),
            clock:
                text(
                    event.clock ||
                    reference.addedClock,
                ),
            sourceBadge:
                event.eventKind ===
                    'reported'
                    ? staticText(
                        displayLocale,
                        'ui.inspector.memory.source.reported',
                        'Reported',
                    )
                    : staticText(
                        displayLocale,
                        'ui.inspector.memory.source.event',
                        'Shared event',
                    ),
        };
    }
    if (
        recordType ===
            'appraisal'
    ) {
        const appraisal =
            appraisals.get(
                recordId,
            );
        if (
            !appraisal ||
            asArray(
                appraisal.contextTags,
            ).includes(
                'migrated_current_impression',
            ) ||
            (
                viewerId !==
                    'authority' &&
                (
                    appraisal.targetId !==
                        viewerId ||
                    asArray(
                        appraisal
                            .contextTags,
                    ).includes(
                        'migrated_temporary_memory',
                    )
                )
            )
        ) {
            return null;
        }
        return {
            recordId,
            recordType,
            summary:
                text(
                    appraisal
                        .summaryEn,
                ),
            clock:
                text(
                    appraisal
                        .committedClock ||
                    reference.addedClock,
                ),
            sourceBadge:
                staticText(
                    displayLocale,
                    'ui.inspector.memory.source.appraisal',
                    'Character appraisal',
                ),
        };
    }
    return null;
}

function buildMemories(
    state,
    actorId,
    viewerId,
    displayLocale,
) {
    const entry =
        state?.actorMemoryIndex
            ?.byActorId?.[
                actorId
            ] || {};
    const directories = {
        appraisals:
            appraisalDirectory(
                state,
            ),
        events:
            eventDirectory(state),
        viewerId,
        displayLocale,
    };
    return Object.fromEntries(
        [
            'core',
            'recent',
            'everyday',
        ].map(tier => [
            tier,
            asArray(entry[tier])
                .map(reference =>
                    hydrateMemoryRef(
                        reference,
                        directories,
                    ))
                .filter(Boolean),
        ]),
    );
}

function buildFirstImpression(
    state,
    actorId,
    viewerId,
) {
    const reference =
        state?.actorMemoryIndex
            ?.byActorId?.[
                actorId
            ]
            ?.firstImpressionRef;
    const appraisal =
        appraisalDirectory(
            state,
        ).get(reference);
    if (
        !appraisal ||
        (
            viewerId !==
                'authority' &&
            appraisal.targetId !==
                viewerId
        )
    ) {
        return null;
    }
    return {
        recordId:
            text(appraisal.id),
        summary:
            text(
                appraisal.summaryEn,
            ),
        confidence:
            Number(
                appraisal.confidence ||
                0,
            ),
        clock:
            text(
                appraisal
                    .committedClock,
            ),
    };
}

function buildCurrentSchema(
    state,
    actorId,
    viewerId,
) {
    const schema =
        asArray(
            state?.memorySynapse
                ?.personSchemas,
        )
            .filter(candidate =>
                candidate
                    ?.observerId ===
                    actorId &&
                candidate?.targetId ===
                    viewerId &&
                [
                    'active',
                    'contested',
                ].includes(
                    candidate.status,
                ))
            .sort((left, right) =>
                text(
                    right.updatedClock,
                ).localeCompare(
                    text(
                        left.updatedClock,
                    ),
                    'en',
                ))[0];
    if (!schema) return null;
    return {
        schemaId:
            text(schema.id),
        interpretation:
            text(
                schema
                    .interpretationEn,
            ),
        expectation:
            text(
                schema
                    .expectationEn,
            ),
        confidence:
            Number(
                schema.confidence ||
                0,
            ),
        status:
            text(schema.status),
        supportingCount:
            asArray(
                schema
                    .supportAppraisalIds,
            ).length,
        counterexampleCount:
            asArray(
                schema
                    .counterAppraisalIds,
            ).length,
    };
}

function buildIdentity(
    state,
    actorId,
    viewerId,
    displayLocale,
) {
    const dossier =
        buildNpcIdentityDossierViewModel({
            worldState: state,
            actorId,
            displayLocale,
            buildIdentityProjection:
                (
                    worldState,
                    subjectActorId,
                    _observerActorId,
                    options,
                ) =>
                    buildNpcIdentityPromptProjection(
                        worldState,
                        subjectActorId,
                        viewerId,
                        options,
                    ),
        });
    return {
        groups:
            clone(dossier.groups),
        claims:
            clone(
                dossier
                    .relationshipClaims,
            ),
    };
}

function presentationView(
    state,
    actorId,
) {
    const source =
        state
            ?.actorPresentations
            ?.[actorId] || {};
    return {
        outfit:
            text(
                source.outfitEn,
            ),
        accessories:
            Object.values(
                source.accessories ||
                {},
            ).map(text)
                .filter(Boolean),
        wornItemIds:
            asArray(
                source.wornItemIds,
            ).map(text)
                .filter(Boolean),
        heldItemIds:
            asArray(
                source.heldItemIds,
            ).map(text)
                .filter(Boolean),
        visibleConditions:
            asArray(
                source
                    .visibleConditions,
            ).map(condition =>
                text(
                    typeof condition ===
                        'string'
                        ? condition
                        : condition
                            ?.valueEn ||
                            condition
                                ?.resultTextEn,
                ))
                .filter(Boolean),
    };
}

/**
 * Build ActorDossierViewModelV1 from canonical V1 stores.
 *
 * @param {object} state Canonical V1 world state.
 * @param {string} actorId Actor ID.
 * @param {string} viewerId Viewer ID.
 * @param {object} options Projection adapters.
 * @returns {object|null} Detached dossier or null for an unknown actor.
 */
export function buildActorDossierViewModel(
    state = {},
    actorId,
    viewerId = 'player',
    {
        getRoomName = (
            _state,
            _mapId,
            roomId,
        ) => roomId,
        getLocalizedField,
        displayLocale = 'zh-CN',
        relationshipProjection =
        buildRelationshipProjection(
            state,
            viewerId,
            displayLocale,
        ),
    } = {},
) {
    const locale =
        normalizeDisplayLocale(
            displayLocale,
        );
    const core =
        actorCore(
            state,
            actorId,
        );
    if (!core) return null;
    const runtime =
        actorRuntime(
            state,
            actorId,
        ) || {};
    const relationship =
        selectActorRelationship(
            relationshipProjection,
            actorId,
            viewerId,
            locale,
        );
    const projected = {
        schemaVersion:
            actorDossierProjectionVersion,
        actorId:
            text(actorId),
        header: {
            name:
                text(core.nameEn) ||
                text(actorId),
            role:
                text(core.roleEn),
            portrait: '',
            present:
                runtime.present ===
                true,
            presenceLabel:
                runtime.present
                    ? staticText(
                        locale,
                        'ui.inspector.presence.present',
                        'Currently present',
                    )
                    : staticText(
                        locale,
                        'ui.inspector.presence.absent',
                        'Currently absent',
                    ),
        },
        core: {
            publicBackground:
                text(
                    core.publicProfile
                        ?.backgroundEn,
                ),
            personality:
                text(
                    core.performanceCore
                        ?.temperamentEn,
                ),
            speechStyle:
                text(
                    core.performanceCore
                        ?.speechStyleEn,
                ),
            visibleDescription:
                text(
                    core.publicProfile
                        ?.descriptionEn,
                ),
        },
        identity:
            buildIdentity(
                state,
                actorId,
                viewerId,
                locale,
            ),
        current: {
            location:
                text(
                    getRoomName(
                        state,
                        runtime.mapId,
                        runtime.roomId,
                    ),
                ),
            activity:
                text(
                    runtime
                        .currentActivityEn,
                ),
            intent:
                text(
                    runtime
                        .currentIntentEn,
                ),
            lifeStatus:
                text(
                    runtime.lifeStatus,
                ),
            lifeStatusDetail:
                text(
                    runtime
                        .lifeStatusDetailEn,
                ),
            presentation:
                presentationView(
                    state,
                    actorId,
                ),
        },
        relationship: {
            labels:
                clone(
                    relationship.labels,
                ),
            dimensions:
                clone(
                    relationship
                        .dimensions,
                ),
            activeSentiments:
                clone(
                    relationship
                        .activeSentiments,
                ),
            firstImpression:
                buildFirstImpression(
                    state,
                    actorId,
                    viewerId,
                ),
            currentSchema:
                buildCurrentSchema(
                    state,
                    actorId,
                    viewerId,
                ),
            evidenceRefs:
                clone(
                    relationship
                        .evidenceRefs,
                ),
        },
        memories:
            buildMemories(
                state,
                actorId,
                viewerId,
                locale,
            ),
        items:
            clone(
                projectActorItems(
                    state,
                    actorId,
                    locale,
                    {
                        getLocalizedField,
                        getRoomName,
                    },
                ),
            ),
    };
    return clone(projected);
}

export function buildActorDossierDirectory(
    state = {},
    viewerId = 'player',
    options = {},
) {
    const relationshipProjection =
        buildRelationshipProjection(
            state,
            viewerId,
            options
                .displayLocale,
        );
    return asArray(
        state?.actorLibrary,
    )
        .filter(core =>
            viewerId ===
                'authority' ||
            Boolean(
                core?.cast
                    ?.introducedClock,
            ))
        .map(core =>
            buildActorDossierViewModel(
                state,
                core?.id,
                viewerId,
                {
                    ...options,
                    relationshipProjection,
                },
            ))
        .filter(Boolean);
}
