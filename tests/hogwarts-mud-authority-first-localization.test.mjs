/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import {
    readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
    createOpeningWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/opening.js';
import {
    createSceneTransitionWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/scene-transition.js';
import {
    createTurnWorkflow,
} from '../public/scripts/extensions/hogwarts-mud/workflows/turn.js';

function composeSegments(
    segments,
    actorLibrary,
) {
    const names =
        new Map(
            (actorLibrary || [])
                .map(actor => [
                    actor.id,
                    actor.nameEn,
                ]),
        );
    return (segments || [])
        .map(segment => {
            const text =
                segment.textEn ||
                segment.rawText ||
                '';
            return segment.type ===
                'dialogue'
                ? `${names.get(segment.actorId) || segment.actorId}: “${text}”`
                : text;
        })
        .join('\n\n');
}

function assertNoPersistedTranslation(
    message,
) {
    const serialized =
        JSON.stringify(message);
    for (const field of [
        'sourceEn',
        'textZh',
        'translatedZh',
        'display_text',
        'provider',
        'translatedAt',
        'translationVersion',
    ]) {
        assert.equal(
            serialized.includes(
                `"${field}"`,
            ),
            false,
            field,
        );
    }
}

test('Opening message composition displays raw non-English evidence without relabeling it as English', () => {
    const workflow =
        createOpeningWorkflow({});
    const text =
        workflow.composeSceneSegments(
            [{
                type: 'dialogue',
                actorId: 'hermione',
                rawText:
                    '“先别碰它。”',
                language: 'non_en',
                authority:
                    'model_output_evidence',
            }],
            [{
                id: 'hermione',
                nameEn:
                    'Hermione Granger',
            }],
        );

    assert.equal(
        text,
        'Hermione Granger: ““先别碰它。””',
    );
});

test('new turn messages persist Message Language V1 without display translation fields', () => {
    const workflow =
        createTurnWorkflow({
            composeSceneSegments:
                composeSegments,
        });
    const message =
        workflow.buildSceneMessage(
            {
                segments: [{
                    type: 'narration',
                    textEn:
                        'Hermione closes the book.',
                }],
            },
            {
                scene: {
                    id: 'scene_one',
                },
                actorLibrary: [],
                actors: [],
            },
        );

    assert.equal(
        message.mes,
        'Hermione closes the book.',
    );
    assert.equal(
        message.extra.hogwartsMud
            .languageVersion,
        1,
    );
    assertNoPersistedTranslation(
        message,
    );
});

test('new Scene Transition messages persist English authority before any display localization', () => {
    const workflow =
        createSceneTransitionWorkflow({
            composeSceneSegments:
                composeSegments,
            synchronizeHeldItemLocations:
                state => state,
        });
    const message =
        workflow
            .buildSceneTransitionMessage(
                {
                    closureSummaryEn:
                        'The old scene closes.',
                    authorQuillEn:
                        'Transition committed.',
                    transitionMinutes:
                        15,
                    nextScene: {
                        id: 'scene_two',
                        openingSegments: [{
                            type:
                                'narration',
                            textEn:
                                'The corridor is quiet.',
                        }],
                        actorStates: [],
                    },
                },
                {
                    actors: [],
                    actorLibrary: [],
                    activeInteractionActorIds:
                        [],
                    items: [],
                },
            );

    assert.equal(
        message.mes,
        'The corridor is quiet.',
    );
    assert.equal(
        message.extra.hogwartsMud
            .languageVersion,
        1,
    );
    assertNoPersistedTranslation(
        message,
    );
});

test('canonical workflows contain no awaited localization or locale-field writer', async () => {
    const files = [
        'opening.js',
        'turn-performance.js',
        'turn.js',
        'scene-transition.js',
        'social-memory.js',
        'calendar-moment.js',
        'interior-map.js',
    ];
    for (const file of files) {
        const source =
            await readFile(
                new URL(
                    `../public/scripts/extensions/hogwarts-mud/workflows/${file}`,
                    import.meta.url,
                ),
                'utf8',
            );
        assert.doesNotMatch(
            source,
            /localize(?:OpeningPackage|SceneSegments|TurnTransaction|SceneTransitionPackage|MemoryConsolidation)|translateOpeningValues/u,
            file,
        );
        assert.doesNotMatch(
            source,
            /(?:textZh|translatedZh|display_text|translationProvider|translationVersion)\s*[:=]/u,
            file,
        );
    }
});
