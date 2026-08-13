import {
    EVENT_KNOWLEDGE_SCHEMA_VERSION,
    REPORTED_EVENT_STATEMENT_KIND_VALUES,
} from './presence-witness-schema.js';
import {
    createStableContractId,
    normalizeStableContractId,
} from './stable-contract-id.js';

function stableCompare(left, right) {
    return String(left)
        .localeCompare(
            String(right),
            'en',
        );
}

function normalizeIds(values) {
    return [
        ...new Set(
            (
                Array.isArray(values)
                    ? values
                    : []
            )
                .map(
                    normalizeStableContractId,
                )
                .filter(Boolean),
        ),
    ].sort(stableCompare);
}

function normalizeMessageIds(values) {
    return [
        ...new Set(
            (
                Array.isArray(values)
                    ? values
                    : []
            )
                .map(Number)
                .filter(
                    Number.isSafeInteger,
                ),
        ),
    ].sort((left, right) =>
        left - right);
}

function allowedActorIds(options) {
    return new Set([
        ...(
            options.actors || []
        ).map(actor =>
            normalizeStableContractId(
                actor?.id,
            )),
        ...(
            options.knownActorIds ||
            []
        ).map(
            normalizeStableContractId,
        ),
    ].filter(Boolean));
}

export function normalizeSourceSegmentRefs(
    values,
) {
    const byKey = new Map();
    for (
        const value of Array.isArray(values)
            ? values
            : []
    ) {
        const messageId =
            Number(value?.messageId);
        const segmentIndex =
            Number(value?.segmentIndex);
        if (
            !Number.isSafeInteger(
                messageId,
            ) ||
            messageId < 0 ||
            !Number.isSafeInteger(
                segmentIndex,
            ) ||
            segmentIndex < -1
        ) {
            continue;
        }
        byKey.set(
            `${messageId}:${segmentIndex}`,
            {
                messageId,
                segmentIndex,
            },
        );
    }
    return [...byKey.values()]
        .sort((left, right) =>
            left.messageId -
                right.messageId ||
            left.segmentIndex -
                right.segmentIndex)
        .slice(0, 16);
}

export function getEventKnowledgeSourceMessageIds(
    eventKnowledge,
) {
    if (
        eventKnowledge?.eventKind ===
            'reported'
    ) {
        return normalizeMessageIds(
            (
                eventKnowledge.report
                    ?.sourceSegmentRefs ||
                []
            ).map(reference =>
                reference.messageId),
        );
    }
    return normalizeMessageIds(
        eventKnowledge
            ?.sourceMessageIds,
    );
}

export function createReportedEventKnowledgeId(
    {
        sceneId,
        sourceSegmentRefs,
        speakerId,
        recipientIds,
        statementKind,
        sourceStatementText,
    } = {},
) {
    return createStableContractId(
        'reported_event',
        {
            sceneId:
                normalizeStableContractId(
                    sceneId,
                ),
            sourceSegmentRefs:
                normalizeSourceSegmentRefs(
                    sourceSegmentRefs,
                ),
            speakerId:
                normalizeStableContractId(
                    speakerId,
                ),
            recipientIds:
                normalizeIds(
                    recipientIds,
                ),
            statementKind:
                String(
                    statementKind || '',
                ),
            sourceStatementText:
                String(
                    sourceStatementText ||
                    '',
                )
                    .normalize('NFKC')
                    .replace(/\s+/gu, ' ')
                    .trim(),
        },
    );
}

export function normalizeReportedEvent(
    eventKnowledge,
    options = {},
) {
    const sceneId =
        normalizeStableContractId(
            eventKnowledge.sceneId,
        );
    const clock =
        String(
            eventKnowledge.clock || '',
        ).trim();
    const summaryEn =
        String(
            eventKnowledge.summaryEn ||
            '',
        )
            .replace(/\s+/gu, ' ')
            .trim()
            .slice(0, 600);
    const reportSource =
        eventKnowledge.report;
    if (
        !reportSource ||
        typeof reportSource !==
            'object' ||
        Array.isArray(reportSource)
    ) {
        return null;
    }
    const allowedRoleIds =
        allowedActorIds(options);
    allowedRoleIds.add('player');
    const speakerId =
        normalizeStableContractId(
            reportSource.speakerId,
        );
    const recipientIds =
        normalizeIds(
            reportSource.recipientIds,
        )
            .filter(id =>
                allowedRoleIds.has(id) &&
                id !== speakerId);
    const subjectIds =
        normalizeIds(
            reportSource.subjectIds,
        ).filter(id =>
            allowedRoleIds.has(id));
    const sourceSegmentRefs =
        normalizeSourceSegmentRefs(
            reportSource
                .sourceSegmentRefs,
        );
    const sourceMessageIds =
        normalizeMessageIds(
            sourceSegmentRefs.map(
                reference =>
                    reference.messageId,
            ),
        );
    const statementKind =
        REPORTED_EVENT_STATEMENT_KIND_VALUES
            .includes(
                reportSource
                    .statementKind,
            )
            ? reportSource
                .statementKind
            : '';
    const aboutEventId =
        normalizeStableContractId(
            reportSource.aboutEventId,
        );
    const parentReportedEventId =
        normalizeStableContractId(
            reportSource
                .parentReportedEventId,
        );
    const distortionLevel =
        Number(
            reportSource
                .distortionLevel,
        );
    const npcAllowedIds =
        allowedActorIds(options);
    const npcRoleIds =
        normalizeIds([
            speakerId,
            ...recipientIds,
        ]).filter(id =>
            npcAllowedIds.has(id));
    const witnessBasis =
        Object.fromEntries(
            npcRoleIds.map(id => [
                id,
                id === speakerId
                    ? 'direct'
                    : 'reported',
            ]),
        );
    if (
        !sceneId ||
        !clock ||
        !summaryEn ||
        !speakerId ||
        !recipientIds.length ||
        !sourceSegmentRefs.length ||
        sourceMessageIds.length !== 1 ||
        !statementKind ||
        (
            [
                'correction',
                'retraction',
            ].includes(
                statementKind,
            ) &&
            !parentReportedEventId
        ) ||
        !Number.isInteger(
            distortionLevel,
        ) ||
        distortionLevel < 0 ||
        distortionLevel > 3 ||
        ![
            'social_event_boundary',
            'migration',
        ].includes(
            eventKnowledge.source,
        ) ||
        !normalizeStableContractId(
            eventKnowledge.eventId,
        )
    ) {
        return null;
    }
    return {
        version:
            EVENT_KNOWLEDGE_SCHEMA_VERSION,
        eventKind: 'reported',
        eventId:
            normalizeStableContractId(
                eventKnowledge.eventId,
            ),
        sceneId,
        clock,
        summaryEn,
        activationSchemaIds:
            normalizeIds(
                eventKnowledge
                    .activationSchemaIds,
            ).slice(0, 64),
        participantActorIds:
            npcRoleIds,
        witnessActorIds:
            npcRoleIds,
        witnessCohortIds: [],
        witnessBasis,
        knownToPlayer: false,
        source:
            eventKnowledge.source,
        report: {
            statementKind,
            sourceSegmentRefs,
            speakerId,
            recipientIds,
            subjectIds,
            aboutEventId,
            parentReportedEventId,
            distortionLevel,
        },
    };
}
