/* eslint-disable playwright/expect-expect */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    findAvoidableEnglishTokens,
    findSourceBackedLatinLiteralTerms,
    stripAllowedTranslationTerms,
} from '../public/scripts/extensions/hogwarts-mud/adapters/translation.js';
import {
    collectChatLocalizationCandidates,
    collectStateLocalizationCandidates,
    createCharacterInputLocalizationField,
} from '../public/scripts/extensions/hogwarts-mud/domain/localization-candidates.js';

test('character input fields translate English display text but preserve Chinese input', () => {
    assert.deepEqual(
        createCharacterInputLocalizationField(
            'identity.name',
            'Tina Zhang',
        ),
        {
            recordKind:
                'character_input',
            recordId: 'player',
            fieldPath:
                'identity.name',
            sourceTextEn:
                'Tina Zhang',
            rawText: '',
        },
    );
    assert.deepEqual(
        createCharacterInputLocalizationField(
            'identity.name',
            '蒂娜·张',
        ),
        {
            recordKind:
                'character_input',
            recordId: 'player',
            fieldPath:
                'identity.name',
            sourceTextEn: '',
            rawText:
                '蒂娜·张',
        },
    );
});

test('state localization candidates use the same identities as frontend readers', () => {
    const candidates =
        collectStateLocalizationCandidates({
            chapterEn:
                'The Letter',
            character: {
                inputEvidence: {
                    identity: {
                        name:
                            'Tina Zhang',
                    },
                    background: {
                        desire:
                            'A good husband',
                        fear:
                            'Spider',
                    },
                },
            },
            scene: {
                id: 'scene_1',
                timelineEntries: [{
                    summaryEn:
                        'The bell rings.\n"pacingBeatRealized":true',
                }],
            },
            memorySynapse: {
                personSchemas: [{
                    id: 'schema_1',
                    interpretationEn:
                        'She expects trouble.',
                    expectationEn:
                        'Tina will interrupt.',
                }],
            },
            sceneArchive: [{
                id: 'archive_1',
                timelineEntries: [{
                    summaryEn:
                        'The class ends.',
                }],
            }],
        });
    const identities =
        candidates.map(candidate =>
            [
                candidate.recordKind,
                candidate.recordId,
                candidate.fieldPath,
            ].join('/'));

    assert.ok(
        identities.includes(
            'world_state/root/chapterEn',
        ),
    );
    assert.ok(
        identities.includes(
            'character_input/player/identity.name',
        ),
    );
    assert.ok(
        identities.includes(
            'character_input/player/background.desire',
        ),
    );
    assert.ok(
        identities.includes(
            'character_input/player/background.fear',
        ),
    );
    assert.ok(
        identities.includes(
            'scene_timeline/scene_1:0/summaryEn',
        ),
    );
    assert.equal(
        candidates.find(candidate =>
            candidate.recordKind ===
                'scene_timeline' &&
            candidate.recordId ===
                'scene_1:0')
            ?.sourceText,
        'The bell rings.',
    );
    assert.ok(
        identities.includes(
            'scene_timeline/archive_1:0/summaryEn',
        ),
    );
    assert.ok(
        identities.includes(
            'person_schema/schema_1/interpretationEn',
        ),
    );
    assert.ok(
        identities.includes(
            'person_schema/schema_1/expectationEn',
        ),
    );
});

test('chat localization candidates cover every visible semantic reader', () => {
    const candidates =
        collectChatLocalizationCandidates([
            {
                mes:
                    'System notice',
                is_system: true,
            },
            {
                mes:
                    'Unsegmented assistant prose',
                is_user: false,
            },
            {
                mes: '',
                extra: {
                    hogwartsMud: {
                        authorQuillEn:
                            'Chapter note',
                        segments: [{
                            textEn:
                                'Narration',
                        }, {
                            textEn:
                                'Dialogue',
                        }],
                        turnTransaction: {
                            itemCandidates: [{
                                item: {
                                    id: 'item_1',
                                    labelEn:
                                        'Signed parchment',
                                    appearanceEn:
                                        'A crooked H.',
                                },
                            }],
                            spellCandidates: [{
                                definition: {
                                    id: 'spell_1',
                                    custom: true,
                                    nameEn:
                                        'Custom Spell',
                                    effectEn:
                                        'Creates mist.',
                                },
                            }],
                        },
                    },
                },
            },
        ]);
    const identities =
        candidates.map(candidate =>
            [
                candidate.recordKind,
                candidate.recordId,
                candidate.fieldPath,
            ].join('/'));

    assert.ok(
        identities.includes(
            'system_message/0/mes',
        ),
    );
    assert.ok(
        identities.includes(
            'message/1/mes',
        ),
    );
    assert.ok(
        identities.includes(
            'message_segment/message:2:segment:0/textEn',
        ),
    );
    assert.ok(
        identities.includes(
            'message_segment/message:2:segment:1/textEn',
        ),
    );
    assert.ok(
        identities.includes(
            'author_quill/2/authorQuillEn',
        ),
    );
    assert.ok(
        identities.includes(
            'item/item_1/labelEn',
        ),
    );
    assert.ok(
        identities.includes(
            'spell_definition/spell_1/effectEn',
        ),
    );
});

test('Chinese display validation rejects leaked English but allows exact incantations', () => {
    assert.deepEqual(
        findAvoidableEnglishTokens(
            '第二年：陈旧的信件',
        ),
        [],
    );
    assert.deepEqual(
        findAvoidableEnglishTokens(
            'Year 2：陈旧的信件',
        ),
        [
            'Year',
        ],
    );
    assert.deepEqual(
        findAvoidableEnglishTokens(
            '她完成了 flick 动作。',
        ),
        [
            'flick',
        ],
    );
    assert.deepEqual(
        findAvoidableEnglishTokens(
            '歪歪扭扭的 H 签名',
            findSourceBackedLatinLiteralTerms(
                'Harry signed a crooked H autograph.',
            ),
        ),
        [],
    );
    assert.deepEqual(
        findSourceBackedLatinLiteralTerms(
            'Rear Compartment A and a pale V-shaped wake.',
        ),
        [
            'A',
            'V',
        ],
    );
    assert.deepEqual(
        findSourceBackedLatinLiteralTerms(
            'A student carried a standard book.',
        ),
        [],
    );
    assert.deepEqual(
        findAvoidableEnglishTokens(
            '她念出 Wingardium Leviosa，羽毛随即升起。',
            [
                'Wingardium Leviosa',
            ],
        ),
        [],
    );
    assert.equal(
        stripAllowedTranslationTerms(
            '自定义咒语 · Nebula Verto',
            [
                'Nebula Verto',
            ],
        ),
        '自定义咒语 · ',
    );
});
