/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    migrateLegacyFamilyEdges,
    normalizeLegacySocialStatements,
    reconcileSocialFamilyRelationships,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-claims-reducer.js';
import {
    normalizeSocialGraph,
} from '../public/scripts/extensions/hogwarts-mud/domain/social-migration.js';
import {
    validateReportedClaims,
} from '../src/hogwarts-mud/social-director-v3-claims.js';

function reportedEvent({
    eventId = 'reported_event_ivy_brother',
    speakerId = 'original_ivy',
    recipientIds = ['player'],
} = {}) {
    return {
        version: 2,
        eventKind: 'reported',
        eventId,
        sceneId: 'library_evening',
        clock: '1991-09-03 · 19:12',
        summaryEn:
            'Ivy claims that an unknown student is her brother.',
        report: {
            speakerId,
            recipientIds,
        },
    };
}

function extraction() {
    return {
        personReferences: [{
            id: 'ivy_brother_ref',
            label: 'Ivy brother',
        }],
        identityClaims: [{
            localReportId: 'report_ivy_brother',
            subjectId: 'original_ivy',
            fieldPath: 'lineage.status',
            value: 'pure_blood',
            sourceKind: 'self',
        }],
        relationshipClaims: [{
            localReportId: 'report_ivy_brother',
            subjectId: 'original_ivy',
            relationshipKind: 'sibling',
            targetRefId: 'ivy_brother_ref',
            sourceKind: 'self',
        }],
    };
}

test('Social V3 converts reported claims into reference-only stores', () => {
    const rejected = [];
    const result =
        validateReportedClaims(
            {
                existingGraph:
                    normalizeSocialGraph({}),
                extraction:
                    extraction(),
            },
            new Map([
                [
                    'report_ivy_brother',
                    reportedEvent(),
                ],
            ]),
            rejected,
        );

    assert.deepEqual(rejected, []);
    assert.equal(
        result.identityClaims.length,
        1,
    );
    assert.equal(
        result.relationshipClaims
            .length,
        1,
    );
    assert.deepEqual(
        result.personReferences,
        [{
            id: 'ivy_brother_ref',
            label: 'Ivy brother',
            status: 'unresolved',
            actorId: '',
        }],
    );
    assert.equal(
        result.identityClaims[0]
            .reportedEventId,
        'reported_event_ivy_brother',
    );
    assert.equal(
        result.relationshipClaims[0]
            .reportedEventId,
        'reported_event_ivy_brother',
    );
    for (const claim of [
        result.identityClaims[0],
        result.relationshipClaims[0],
    ]) {
        for (const retiredField of [
            'speakerId',
            'sourceMessageIds',
            'witnessedBy',
            'clock',
            'textEn',
        ]) {
            assert.equal(
                Object.hasOwn(
                    claim,
                    retiredField,
                ),
                false,
            );
        }
    }
});

test('Social V3 rejects claims without a matching attributed reported Event', () => {
    const rejected = [];
    const wrongAttribution =
        extraction();
    wrongAttribution
        .identityClaims[0]
        .subjectId =
        'canon_ronald_bilius_weasley';
    wrongAttribution
        .relationshipClaims[0]
        .localReportId =
        'missing_report';

    const result =
        validateReportedClaims(
            {
                existingGraph:
                    normalizeSocialGraph({}),
                extraction:
                    wrongAttribution,
            },
            new Map([
                [
                    'report_ivy_brother',
                    reportedEvent(),
                ],
            ]),
            rejected,
        );

    assert.deepEqual(
        result.identityClaims,
        [],
    );
    assert.deepEqual(
        result.relationshipClaims,
        [],
    );
    assert.deepEqual(
        rejected.map(entry => [
            entry.kind,
            entry.reason,
        ]),
        [
            [
                'identity_claim',
                'invalid_report_reference',
            ],
            [
                'relationship_claim',
                'invalid_report_reference',
            ],
        ],
    );
});

test('only resolved authority family evidence creates a formal family edge', () => {
    const migrated =
        migrateLegacyFamilyEdges({
            relationships: [{
                id: 'legacy_family_edge',
                sourceActorId:
                    'original_ivy',
                targetActorId:
                    'original_ivy_brother',
                structuralTags: [
                    'family',
                ],
            }],
            relationshipClaims: [],
            personReferences: [],
        });
    const reconciled =
        reconcileSocialFamilyRelationships(
            [],
            migrated
                .relationshipClaims,
            migrated.personReferences,
        );

    assert.equal(reconciled.length, 1);
    assert.deepEqual(
        reconciled[0]
            .structuralTags,
        ['family'],
    );
    assert.equal(
        migrated
            .relationshipClaims[0]
            .sourceKind,
        'authority',
    );
    assert.equal(
        migrated
            .relationshipClaims[0]
            .authoritySourceRef,
        'legacy_relationship_edge:legacy_family_edge',
    );

    const unresolved =
        reconcileSocialFamilyRelationships(
            [],
            [{
                id: 'reported_family_claim',
                subjectId:
                    'original_ivy',
                relationshipKind:
                    'sibling',
                targetRefId:
                    'unresolved_ref',
                sourceKind: 'self',
                reportedEventId:
                    'reported_event_ivy_brother',
                authoritySourceRef: '',
            }],
            [{
                id: 'unresolved_ref',
                label: 'Ivy brother',
                status: 'unresolved',
                actorId: '',
            }],
        );
    assert.deepEqual(unresolved, []);
});

test('legacy statement normalization is bounded and tolerates malformed witness lists', () => {
    const normalized =
        normalizeLegacySocialStatements([
            {
                id: 'statement_valid',
                subjectId: 'original_ivy',
                speakerId: 'original_ivy',
                textEn:
                    'I have a brother.',
                witnessedBy:
                    'not_an_array',
            },
            {
                id: 'statement_missing_text',
                subjectId: 'original_ivy',
                speakerId: 'original_ivy',
            },
        ]);

    assert.deepEqual(
        normalized,
        [{
            id: 'statement_valid',
            subjectId: 'original_ivy',
            speakerId: 'original_ivy',
            textEn:
                'I have a brother.',
            witnessedBy: [],
        }],
    );
});
