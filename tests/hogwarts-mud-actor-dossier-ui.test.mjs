import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import {
    buildActorDossierViewModel,
    buildRelationshipProjection,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-dossier-projection.js';
import {
    buildPlayerKnownRelationshipProjection,
    getRelationshipGraphStyles,
} from '../public/scripts/extensions/hogwarts-mud/relationship-graph.js';

const actorId = 'canon_hermione_granger';

function fixture() {
    return {
        clock: '1991-09-03 · 17:00',
        character: {
            identity: {
                name: 'Ivy',
            },
        },
        actorLibrary: [{
            id: actorId,
            canonCatalogId:
                actorId,
            nameEn:
                'Hermione Granger',
            aliases: [],
            roleEn:
                'Gryffindor student',
            cast: {
                origin:
                    'canon_catalog',
                introducedClock:
                    '1991-09-01 · 19:00',
                introducedTurn: 1,
            },
            publicProfile: {
                descriptionEn:
                    'Bushy brown hair and an intent gaze.',
                backgroundEn:
                    'A Muggle-born first-year student.',
            },
            performanceCore: {
                temperamentEn:
                    'Precise, principled, and impatient with carelessness.',
                speechStyleEn:
                    'Quick, exact sentences with corrective detail.',
                motivesEn: [
                    'Master difficult magic.',
                ],
                socialStrategiesEn: [
                    'Offer practical help.',
                ],
                boundariesEn: [
                    'Will not tolerate deliberate cruelty.',
                ],
                vulnerabilitiesEn: [],
            },
            identity: {
                version: 1,
                gender: {
                    code: 'female',
                    label: 'Female',
                },
            },
            privateFacts: {
                secretEn:
                    'Must never enter the player dossier.',
                knowledgeEn: [
                    'Private staff-room detail.',
                ],
            },
        }],
        actors: [{
            id: actorId,
            mapId: 'hogwarts',
            roomId: 'library',
            present: true,
            lifeStatus: 'alive',
            lifeStatusPermanent:
                false,
            lifeStatusDetailEn:
                'Alive.',
            lifeStatusSinceClock:
                '',
            currentActivityEn:
                'Sorting reference books.',
            currentIntentEn:
                'Find the missing citation.',
            currentGoalEn: '',
            temporary: false,
        }],
        actorPresentations: {
            [actorId]: {
                outfit:
                    'School robes',
                accessories: {},
                wornItemIds: [],
                heldItemIds: [],
                visibleConditions: [],
            },
        },
        items: [],
        actorMemoryIndex: {
            version: 1,
            byActorId: {
                [actorId]: {
                    firstImpressionRef:
                        'appraisal_first',
                    core: [{
                        recordType: 'event',
                        recordId:
                            'event_library',
                        addedClock:
                            '1991-09-03 · 16:00',
                    }],
                    recent: [],
                    everyday: [],
                },
            },
        },
        eventKnowledge: [{
            eventId:
                'event_library',
            sceneId:
                'scene_library',
            clock:
                '1991-09-03 · 16:00',
            summaryEn:
                'Ivy and Hermione repaired a damaged index together.',
            participantActorIds: [
                actorId,
                'player',
            ],
            witnessActorIds: [],
            sourceMessageIds: [41],
        }],
        memorySynapse: {
            version: 1,
            appraisals: [{
                id:
                    'appraisal_first',
                observerId: actorId,
                targetId: 'player',
                summaryEn:
                    'Capable, but too willing to improvise.',
                sourceEventIds: [],
                confidence: 0.7,
                status: 'accepted',
                committedClock:
                    '1991-09-01 · 12:00',
            }],
            personSchemas: [{
                id: 'schema_current',
                observerId: actorId,
                targetId: 'player',
                factPatternEn:
                    'Ivy repeatedly checks dangerous shortcuts.',
                interpretationEn:
                    'Ivy is bold but responds to concrete risks.',
                expectationEn:
                    'Give Ivy exact consequences before objecting.',
                confidence: 0.82,
                supportAppraisalIds: [
                    'a1',
                    'a2',
                    'a3',
                ],
                supportEventIds: [
                    'event_library',
                ],
                counterAppraisalIds: [
                    'counter_1',
                ],
                status: 'active',
                updatedClock:
                    '1991-09-03 · 17:00',
            }],
        },
        socialGraph: {
            version: 2,
            relationshipEvidence: [{
                id: 'evidence_visible',
                sourceActorId: actorId,
                targetActorId: 'player',
                sceneId: 'scene_library',
                sourceMessageIds: [41],
                witnessedBy: ['player'],
                summaryEn:
                    'Hermione trusted Ivy with the repair.',
                dimensionDeltas: [],
            }, {
                id: 'evidence_private',
                sourceActorId: actorId,
                targetActorId: 'player',
                sceneId: 'scene_private',
                sourceMessageIds: [42],
                witnessedBy: [actorId],
                summaryEn:
                    'Private evidence.',
                dimensionDeltas: [],
            }],
            relationships: [{
                id: 'hermione_player',
                sourceActorId: actorId,
                targetActorId: 'player',
                familiarity: 54,
                closeness: 38,
                warmth: 32,
                trust: 27,
                respect: 41,
                influence: 8,
                tension: 6,
                resentment: 0,
                fear: 0,
                protectiveness: 18,
                structuralTags: [
                    'classmate',
                ],
                activeEmotions: [{
                    emotion: 'gratitude',
                    intensity: 3,
                    sourceEvidenceId:
                        'evidence_visible',
                    sourceMessageIds: [41],
                    witnessedBy: ['player'],
                    updatedTurn: 2,
                    updatedClock:
                        '1991-09-03 · 17:00',
                }],
                evidenceIds: [
                    'evidence_visible',
                    'evidence_private',
                ],
            }],
        },
    };
}

test('ActorDossierViewModelV1 has exactly eight business fields and player ACL', () => {
    const dossier =
        buildActorDossierViewModel(
            fixture(),
            actorId,
            'player',
            {
                getRoomName:
                    () => '图书馆',
            },
        );
    assert.deepEqual(
        Object.keys(dossier),
        [
            'schemaVersion',
            'actorId',
            'header',
            'core',
            'identity',
            'current',
            'relationship',
            'memories',
            'items',
        ],
    );
    assert.equal(
        dossier.schemaVersion,
        1,
    );
    assert.equal(
        dossier.core.personality,
        'Precise, principled, and impatient with carelessness.',
    );
    assert.equal(
        JSON.stringify(dossier)
            .includes('Must never enter'),
        false,
    );
    assert.deepEqual(
        dossier.relationship
            .evidenceRefs
            .map(item => item.recordId),
        ['evidence_visible'],
    );
    const gender =
        dossier.identity.groups
            .find(group =>
                group.id === 'basic')
            .entries
            .find(entry =>
                entry.label === '性别');
    assert.equal(
        gender.unknown,
        true,
    );
    const authorityDossier =
        buildActorDossierViewModel(
            fixture(),
            actorId,
            'authority',
        );
    assert.equal(
        authorityDossier.identity.groups
            .find(group =>
                group.id === 'basic')
            .entries
            .find(entry =>
                entry.label === '性别')
            .unknown,
        false,
    );
});

test('first impression and current Schema remain separate projections', () => {
    const dossier =
        buildActorDossierViewModel(
            fixture(),
            actorId,
            'player',
        );
    assert.equal(
        dossier.relationship
            .firstImpression
            .recordId,
        'appraisal_first',
    );
    assert.equal(
        dossier.relationship
            .currentSchema
            .schemaId,
        'schema_current',
    );
    assert.equal(
        dossier.relationship
            .currentSchema
            .supportingCount,
        3,
    );
    assert.equal(
        dossier.relationship
            .currentSchema
            .counterexampleCount,
        1,
    );
});

test('relationship graph reuses dossier relationship labels, dimensions and evidence', () => {
    const state = fixture();
    const relationship =
        buildRelationshipProjection(
            state,
            'player',
        ).relationships[0];
    const dossier =
        buildActorDossierViewModel(
            state,
            actorId,
            'player',
        );
    const graphEdge =
        buildPlayerKnownRelationshipProjection(
            state,
        ).edgeByDirection
            .get(`${actorId}->player`);
    assert.deepEqual(
        graphEdge.labels,
        dossier.relationship.labels,
    );
    assert.deepEqual(
        graphEdge.dimensions,
        relationship.dimensions,
    );
    assert.deepEqual(
        graphEdge.activeSentiments,
        dossier.relationship
            .activeSentiments,
    );
    assert.deepEqual(
        graphEdge.evidence
            .map(item => item.id),
        dossier.relationship
            .evidenceRefs
            .map(item =>
                item.recordId),
    );
    assert.equal(
        graphEdge.evidence.length,
        dossier.relationship
            .evidenceRefs.length,
    );
});

test('inspector and graph source enforce the six-section unified projection cutover', async () => {
    const [
        inspector,
        graph,
        style,
    ] = await Promise.all([
        fs.readFile(
            new URL(
                '../public/scripts/extensions/hogwarts-mud/ui/inspector-controller.js',
                import.meta.url,
            ),
            'utf8',
        ),
        fs.readFile(
            new URL(
                '../public/scripts/extensions/hogwarts-mud/relationship-graph.js',
                import.meta.url,
            ),
            'utf8',
        ),
        fs.readFile(
            new URL(
                '../public/scripts/extensions/hogwarts-mud/style.css',
                import.meta.url,
            ),
            'utf8',
        ),
    ]);
    const actorBranch =
        inspector.slice(
            inspector.indexOf(
                'if (tab === \'actor\')',
            ),
            inspector.indexOf(
                'if (tab === \'character\')',
            ),
        );
    assert.equal(
        (
            actorBranch.match(
                /createInspectorCard\(/gu,
            ) || []
        ).length,
        6,
    );
    for (const title of [
        '人物本色',
        '身份与已知说法',
        '当前状态',
        '对你的关系',
        '共同经历',
        '正式物品',
    ]) {
        assert.equal(
            actorBranch.includes(
                `'${title}'`,
            ),
            true,
        );
    }
    for (const legacy of [
        'renderActorImpression',
        'renderSharedMemoryLedger',
        'buildActorAppearanceView',
        'projectActorItems',
        '公开档案',
        '共同记忆',
        '当前呈现',
    ]) {
        assert.equal(
            actorBranch.includes(legacy),
            false,
        );
    }
    for (const forbidden of [
        'deriveRelationshipLabel',
        'mergeActorDirectory',
        'actorKnownToPlayer',
        'state?.actorLibrary',
        'state?.actors',
    ]) {
        assert.equal(
            graph.includes(forbidden),
            false,
        );
    }
    assert.match(
        style,
        /@media \(max-width: 760px\)[\s\S]*?\.hpmud-app\.hpmud-inspector-open \.hpmud-inspector,[\s\S]*?inset: 69px 9px 9px/u,
    );
    assert.match(
        style,
        /\.hpmud-app button:focus-visible,[\s\S]*?outline: 2px solid var\(--hp-gold\)/u,
    );
    assert.match(
        style,
        /\.hpmud-relationship-canvas:focus-visible/u,
    );
    assert.match(
        style,
        /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.hpmud-relationship-dialog \*[\s\S]*?animation: none !important[\s\S]*?transition: none !important/u,
    );
    const reducedStyles =
        getRelationshipGraphStyles({
            reducedMotion: true,
        });
    assert.equal(
        reducedStyles[0].style[
            'transition-duration'
        ],
        '0ms',
    );
});
