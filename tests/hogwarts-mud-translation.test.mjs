/* eslint-disable playwright/expect-expect */
import {
    buildActorNameAliases,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-identity.js';
import {
    normalizeActorMemoryProfile,
} from '../public/scripts/extensions/hogwarts-mud/domain/actor-memory.js';
import {
    applyTranslationGlossaryTargets,
    buildActorTranslationTerms,
    createTranslationBatches,
    normalizeLocalTranslationText,
    normalizeTranslationProvider,
    protectTranslationTerms,
    restoreTranslationTerms,
    shouldTranslateToChinese,
    splitTranslationChunks,
} from '../public/scripts/extensions/hogwarts-mud/domain/translation.js';
import assert from 'node:assert/strict';
import test from 'node:test';

test('translation chunks preserve paragraph boundaries when possible', () => {
    const chunks = splitTranslationChunks('First paragraph.\n\nSecond paragraph.\n\nThird paragraph.', 35);
    assert.deepEqual(chunks, ['First paragraph.\n\nSecond paragraph.', 'Third paragraph.']);
    assert.equal(chunks.join('\n\n'), 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.');
});

test('translation chunks split oversized prose without breaking words', () => {
    const source = 'one two three four five six seven eight nine ten eleven twelve';
    const chunks = splitTranslationChunks(source, 32);
    assert.ok(chunks.length > 1);
    assert.deepEqual(
        chunks.join(' ').split(/\s+/),
        source.split(/\s+/),
    );
    assert.ok(chunks.every(chunk => chunk.length <= 32));
});

test('translation batches keep complete structured fields together', () => {
    const values = [
        'First complete field stays together beside the kitchen table.',
        'Second complete field stays together beside the cooling kettle.',
        'Third complete field stays together beside the patient owl.',
    ];
    const batches = createTranslationBatches(values, 128);
    assert.ok(batches.length > 1);
    assert.ok(batches.every(batch => batch.length <= 128));
    values.forEach((value, index) => {
        assert.ok(batches.some(batch =>
            batch.includes(`[[HPMUD_${index}_0]] ${value}`),
        ));
    });
});

test('translation batches preserve a full long scene within the Google text limit', () => {
    const value = `${'Long scene context remains together. '.repeat(110)}`;
    assert.ok(value.length > 3500);
    assert.ok(value.length < 4600);
    const batches =
        createTranslationBatches([value]);
    assert.equal(batches.length, 1);
    assert.match(
        batches[0],
        /^\[\[HPMUD_0_0]] Long scene context/,
    );
});

test('actor translation terms preserve full and short authoritative names', () => {
    const terms = buildActorTranslationTerms([{
        nameEn: 'Seamus Finnigan',
        name: '谢莫斯·芬尼根',
        aliases: [
            'Seamus Finnigan',
            'Seamus',
            'Finnigan',
            '谢莫斯·芬尼根',
            '谢莫斯',
            '芬尼根',
        ],
    }]);
    assert.deepEqual(
        terms,
        [
            {
                source: 'Seamus Finnigan',
                target: '谢莫斯·芬尼根',
            },
            {
                source: 'Seamus',
                target: '谢莫斯',
            },
            {
                source: 'Finnigan',
                target: '芬尼根',
            },
        ],
    );
});

test('local translation inputs receive authoritative glossary targets without placeholders', () => {
    const localized =
        applyTranslationGlossaryTargets(
            'Dean found Lavender\'s Sorting parchment in the Charms classroom.',
        );
    assert.equal(
        localized,
        '迪安 found 拉文德\'s 分院羊皮纸 in the 魔咒课教室.',
    );
    assert.doesNotMatch(
        localized,
        /HPMUD_TERM|⟦术语/u,
    );
    assert.equal(
        applyTranslationGlossaryTargets(
            'The first Charms lesson begins for the first-year Gryffindors.',
        ),
        'The 第一节魔咒课 begins for the 格兰芬多一年级新生.',
    );
    assert.equal(
        applyTranslationGlossaryTargets(
            'Tina joined Lavender.',
        ),
        '蒂娜 joined 拉文德.',
    );
    assert.equal(
        applyTranslationGlossaryTargets(
            'She tucked them under one arm and dragged Lavender to Charms class so fast the ink was still wet.',
        ),
        'She 把三本书夹在一只胳膊下 and 以飞快的速度拽着拉文德赶去魔咒课，墨水甚至还没干.',
    );
});

test('translation glossary prelocalizes runtime-proven leak phrases', () => {
    assert.equal(
        applyTranslationGlossaryTargets(
            'Alex read Braithwaite\'s Pasties — 2 Sickles each in Diagon Alley.',
        ),
        '亚历克斯 read 布雷思韦特馅饼——每个 2 西可 in 对角巷.',
    );
    assert.equal(
        applyTranslationGlossaryTargets(
            '{quietly, through her teeth} So? SO?',
        ),
        '{压低声音，咬着牙} 所以呢？所以呢？',
    );
    assert.equal(
        applyTranslationGlossaryTargets(
            'She raised the holly wand near the conductor’s podium.',
        ),
        'She raised the 冬青木魔杖 near the 指挥台.',
    );
    assert.equal(
        applyTranslationGlossaryTargets(
            'Bilabibili-bo and WING',
        ),
        '比拉比利博 and 翼',
    );
    assert.equal(
        applyTranslationGlossaryTargets(
            'Student',
        ),
        '学生',
    );
    assert.equal(
        applyTranslationGlossaryTargets(
            'She looked over the mulberry bolt barricade.',
        ),
        'She looked over the 桑葚色布卷 路障.',
    );
});

test('local short-label translations drop an unsolicited parenthetical alternative', () => {
    assert.equal(
        normalizeLocalTranslationText(
            'First Charms Lesson',
            '第一节魔咒课\n\n（第一堂魔咒课）',
        ),
        '第一节魔咒课',
    );
    assert.equal(
        normalizeLocalTranslationText(
            'First Charms Lesson (Year One)',
            '第一节魔咒课（一年级）',
        ),
        '第一节魔咒课（一年级）',
    );
    assert.equal(
        normalizeLocalTranslationText(
            'Lavender still wants details.',
            '拉文德 仍想了解细节。',
        ),
        '拉文德仍想了解细节。',
    );
});

test('translation term placeholders restore canonical Chinese terms', () => {
    const source = 'Professor McGonagall welcomed Hermione Jean Granger, a Muggle-born student, to Hogwarts.';
    const protectedText = protectTranslationTerms(source);
    assert.doesNotMatch(protectedText, /McGonagall|Muggle-born|Hogwarts/);
    assert.match(
        protectedText,
        /⟦术语\d+⟧/u,
    );

    const restored = restoreTranslationTerms(protectedText);
    assert.match(restored, /麦格教授/);
    assert.match(
        restored,
        /赫敏·格兰杰/,
    );
    assert.match(restored, /麻瓜出身/);
    assert.match(restored, /霍格沃茨/);

    const spaced = protectTranslationTerms('要求 McGonagall 安排');
    assert.equal(restoreTranslationTerms(spaced), '要求麦格安排');

    const lavender =
        protectTranslationTerms(
            'Lavender Brown joined the first-years.',
        );
    assert.doesNotMatch(
        lavender,
        /Lavender Brown/,
    );
    assert.match(
        restoreTranslationTerms(lavender),
        /拉文德·布朗/,
    );

    const schoolTerms = protectTranslationTerms(
        'A third-year prefect watched the Sorting Hat during the Sorting in the Great Hall.',
    );
    assert.equal(
        restoreTranslationTerms(schoolTerms),
        'A 三年级学生级长 watched the 分院帽 during 分院仪式 in the 礼堂.',
    );

    assert.equal(
        restoreTranslationTerms(
            '你好。 世界 ！ “ 测试 ”',
            [],
        ),
        '你好。世界！“测试”',
    );
});

test('actor aliases retain full and short English and Chinese names', () => {
    assert.deepEqual(
        buildActorNameAliases(
            'Hermione Jean Granger',
            '赫敏·简·格兰杰',
        ),
        [
            'Hermione Jean Granger',
            'Hermione',
            'Jean',
            'Granger',
            '赫敏·简·格兰杰',
            '赫敏',
            '格兰杰',
        ],
    );
    const profile =
        normalizeActorMemoryProfile({
            id:
                'canon_hermione_jean_granger',
            nameEn:
                'Hermione Jean Granger',
            name: '赫敏·简·格兰杰',
        });
    assert.ok(
        profile.aliases.includes(
            '赫敏',
        ),
    );
    assert.ok(
        profile.aliases.includes(
            'Hermione',
        ),
    );
});

test('translation only runs for predominantly English content', () => {
    assert.equal(shouldTranslateToChinese('Rodolphus lowered his voice and accepted the oath.'), true);
    assert.equal(shouldTranslateToChinese('他压低声音，接受了誓言。'), false);
    assert.equal(shouldTranslateToChinese(''), false);
});

test('translation provider settings accept local, Google, Bing and off with a stable fallback', () => {
    assert.equal(
        normalizeTranslationProvider('LOCAL'),
        'local',
    );
    assert.equal(
        normalizeTranslationProvider('google'),
        'google',
    );
    assert.equal(
        normalizeTranslationProvider('BING'),
        'bing',
    );
    assert.equal(
        normalizeTranslationProvider('off'),
        'off',
    );
    assert.equal(
        normalizeTranslationProvider(
            'unknown',
            'bing',
        ),
        'bing',
    );
});
