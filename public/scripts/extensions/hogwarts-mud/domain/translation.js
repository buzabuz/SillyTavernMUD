import {
    CANON_PLAYABLE_CHARACTER_CATALOG,
    getCanonNameAliases,
} from '../canon-characters.js';

export function splitTranslationChunks(text, maxLength = 4700) {
    const source = String(text ?? '').trim();
    if (!source) {
        return [];
    }

    const safeMaxLength = Math.max(32, Number(maxLength) || 4700);
    const splitOversizedParagraph = paragraph => {
        const pieces = [];
        let remaining = paragraph.trim();
        while (remaining.length > safeMaxLength) {
            const window = remaining.slice(0, safeMaxLength + 1);
            let cut = 0;
            const sentenceBoundary = /[.!?。！？](?:["'”’)\]]*)\s+/g;
            for (const match of window.matchAll(sentenceBoundary)) {
                cut = match.index + match[0].trimEnd().length;
            }
            if (!cut) {
                const whitespaceBoundary = /\s+/g;
                for (const match of window.matchAll(whitespaceBoundary)) {
                    if (match.index > 0) {
                        cut = match.index;
                    }
                }
            }
            if (!cut) {
                const nextWhitespace = remaining.slice(safeMaxLength).search(/\s/);
                if (nextWhitespace < 0) {
                    pieces.push(remaining);
                    return pieces;
                }
                cut = safeMaxLength + nextWhitespace;
            }
            pieces.push(remaining.slice(0, cut).trim());
            remaining = remaining.slice(cut).trimStart();
        }
        if (remaining) {
            pieces.push(remaining);
        }
        return pieces;
    };

    const paragraphs = source.split(/\n{2,}/).map(paragraph => paragraph.trim()).filter(Boolean);
    const chunks = [];
    let current = '';

    const flush = () => {
        if (current) {
            chunks.push(current);
            current = '';
        }
    };

    for (const paragraph of paragraphs) {
        if (paragraph.length > safeMaxLength) {
            flush();
            chunks.push(...splitOversizedParagraph(paragraph));
            continue;
        }

        const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
        if (candidate.length > safeMaxLength) {
            flush();
            current = paragraph;
        } else {
            current = candidate;
        }
    }

    flush();
    return chunks;
}

export const TRANSLATION_PROVIDER_IDS = Object.freeze([
    'local',
    'google',
    'bing',
    'off',
]);

export function normalizeTranslationProvider(value, fallback = 'local') {
    const normalized = String(value || '').trim().toLocaleLowerCase();
    if (TRANSLATION_PROVIDER_IDS.includes(normalized)) {
        return normalized;
    }
    const normalizedFallback = String(fallback || '').trim().toLocaleLowerCase();
    return TRANSLATION_PROVIDER_IDS.includes(normalizedFallback)
        ? normalizedFallback
        : 'local';
}

export const TRANSLATION_TERM_GLOSSARY = Object.freeze([
    ...CANON_PLAYABLE_CHARACTER_CATALOG
        .flatMap(character =>
            [
                ...new Set(
                    getCanonNameAliases(
                        character,
                    ).filter(alias =>
                        !/[\p{Script=Han}]/u
                            .test(alias)),
                ),
            ].map(source =>
                Object.freeze({
                    source,
                    target:
                        character
                            .nameZh,
                }))),
    Object.freeze({ source: 'Hogwarts School of Witchcraft and Wizardry', target: '霍格沃茨魔法学校' }),
    Object.freeze({ source: 'Hogwarts Express', target: '霍格沃茨特快' }),
    Object.freeze({ source: 'Hogwarts uniform handbook', target: '霍格沃茨校服手册' }),
    Object.freeze({ source: 'Tina\'s first morning at Hogwarts', target: '蒂娜在霍格沃茨的第一个早晨' }),
    Object.freeze({ source: 'egg on her hand, egg on her wrist, egg on her robe, and egg on her civic duty', target: '手上沾着鸡蛋，手腕上沾着鸡蛋，袍子上沾着鸡蛋，连公民义务上也沾着鸡蛋' }),
    Object.freeze({ source: 'dragged Lavender to Charms class so fast the ink was still wet', target: '以飞快的速度拽着拉文德赶去魔咒课，墨水甚至还没干' }),
    Object.freeze({ source: 'tucked them under one arm', target: '把三本书夹在一只胳膊下' }),
    Object.freeze({ source: 'arranged a signed parchment between them', target: '把一张签名羊皮纸摆在两人之间' }),
    Object.freeze({ source: 'mulberry bolt', target: '桑葚色布卷' }),
    Object.freeze({ source: 'barricade', target: '路障' }),
    Object.freeze({ source: 'Platform Nine and Three-Quarters', target: '九又四分之三站台' }),
    Object.freeze({ source: 'Diagon Alley', target: '对角巷' }),
    Object.freeze({ source: 'Flourish and Blotts', target: '丽痕书店' }),
    Object.freeze({ source: 'Braithwaite\'s Pasties — 2 Sickles each', target: '布雷思韦特馅饼——每个 2 西可' }),
    Object.freeze({ source: 'Braithwaite\'s Pasties', target: '布雷思韦特馅饼' }),
    Object.freeze({ source: 'Standard Book of Spells', target: '《标准咒语》' }),
    Object.freeze({ source: 'Sorting notes parchment', target: '分院笔记羊皮纸' }),
    Object.freeze({ source: 'Sorting parchment', target: '分院羊皮纸' }),
    Object.freeze({ source: 'egg-glossed handshake', target: '沾着鸡蛋的握手' }),
    Object.freeze({ source: 'terrier with a rag', target: '叼着破布的梗犬' }),
    Object.freeze({ source: 'rafters', target: '房梁' }),
    Object.freeze({ source: 'Sorting Hat', target: '分院帽' }),
    Object.freeze({ source: 'Sorting Stool', target: '分院凳' }),
    Object.freeze({ source: 'the Sorting', target: '分院仪式' }),
    Object.freeze({ source: 'Great Hall', target: '礼堂' }),
    Object.freeze({ source: 'Entrance Hall', target: '门厅' }),
    Object.freeze({ source: 'Gryffindor common room', target: '格兰芬多公共休息室' }),
    Object.freeze({ source: 'common room', target: '公共休息室' }),
    Object.freeze({ source: 'girls\' staircase', target: '女生宿舍楼梯' }),
    Object.freeze({ source: 'portrait hole', target: '肖像洞口' }),
    Object.freeze({ source: 'staff table', target: '教师席' }),
    Object.freeze({ source: 'House Cup', target: '学院杯' }),
    Object.freeze({ source: 'Deputy Headmistress', target: '副校长' }),
    Object.freeze({ source: 'Headmaster', target: '校长' }),
    Object.freeze({ source: 'Student', target: '学生' }),
    Object.freeze({ source: 'first-years', target: '一年级新生' }),
    Object.freeze({ source: 'first-year', target: '一年级新生' }),
    Object.freeze({ source: 'third-years', target: '三年级学生' }),
    Object.freeze({ source: 'third-year', target: '三年级学生' }),
    Object.freeze({ source: 'fifth-years', target: '五年级学生' }),
    Object.freeze({ source: 'fifth-year', target: '五年级学生' }),
    Object.freeze({ source: 'sixth-former', target: '六年级学生' }),
    Object.freeze({ source: 'prefects', target: '级长们' }),
    Object.freeze({ source: 'prefect', target: '级长' }),
    Object.freeze({ source: 'treacle tart', target: '糖浆馅饼' }),
    Object.freeze({ source: 'pumpkin juice', target: '南瓜汁' }),
    Object.freeze({ source: 'holly wand', target: '冬青木魔杖' }),
    Object.freeze({ source: 'Carriage', target: '车厢' }),
    Object.freeze({ source: 'Compartment', target: '隔间' }),
    Object.freeze({ source: 'Hermione Jean Granger', target: '赫敏·简·格兰杰' }),
    Object.freeze({ source: 'Hermione Granger', target: '赫敏·格兰杰' }),
    Object.freeze({ source: 'Hermione', target: '赫敏' }),
    Object.freeze({ source: 'Lavender Brown', target: '拉文德·布朗' }),
    Object.freeze({ source: 'Lavender', target: '拉文德' }),
    Object.freeze({ source: 'Eddie Cooper', target: '埃迪·库珀' }),
    Object.freeze({ source: 'Eddie', target: '埃迪' }),
    Object.freeze({ source: 'Dean', target: '迪安' }),
    Object.freeze({ source: 'Madam Malkin', target: '摩金夫人' }),
    Object.freeze({ source: 'Malkin', target: '摩金' }),
    Object.freeze({ source: 'Professor Minerva McGonagall', target: '米勒娃·麦格教授' }),
    Object.freeze({ source: 'Professor McGonagall', target: '麦格教授' }),
    Object.freeze({ source: 'Professor of Charms and Head of Ravenclaw', target: '魔咒课教授兼拉文克劳院长' }),
    Object.freeze({ source: 'Minerva McGonagall', target: '米勒娃·麦格' }),
    Object.freeze({ source: 'Quill of Acceptance', target: '接纳之笔' }),
    Object.freeze({ source: 'Ministry of Magic', target: '魔法部' }),
    Object.freeze({ source: 'Scottish Highlands', target: '苏格兰高地' }),
    Object.freeze({ source: 'King’s Cross', target: '国王十字车站' }),
    Object.freeze({ source: 'King\'s Cross', target: '国王十字车站' }),
    Object.freeze({ source: 'Muggle-born', target: '麻瓜出身' }),
    Object.freeze({ source: 'first Charms lesson', target: '第一节魔咒课' }),
    Object.freeze({ source: 'first-year Gryffindors', target: '格兰芬多一年级新生' }),
    Object.freeze({ source: 'Transfiguration After Break', target: '课间休息后的变形术课' }),
    Object.freeze({ source: 'Charms classroom', target: '魔咒课教室' }),
    Object.freeze({ source: 'swish and flick', target: '一挥一抖' }),
    Object.freeze({ source: 'Charms', target: '魔咒课' }),
    Object.freeze({ source: 'Transfiguration', target: '变形术' }),
    Object.freeze({ source: 'McGonagall', target: '麦格' }),
    Object.freeze({ source: 'Most Creative Misuse of Stationery', target: '最具创意文具误用奖' }),
    Object.freeze({ source: 'Most Spineless Couch Performance', target: '最没骨气沙发表演奖' }),
    Object.freeze({ source: 'Boy Who Lived', target: '大难不死的男孩' }),
    Object.freeze({ source: 'conductor’s podium', target: '指挥台' }),
    Object.freeze({ source: 'conductor\'s podium', target: '指挥台' }),
    Object.freeze({ source: 'podium', target: '讲台' }),
    Object.freeze({ source: 'aggressively winking', target: '拼命地眨眼' }),
    Object.freeze({ source: '{quietly, through her teeth}', target: '{压低声音，咬着牙}' }),
    Object.freeze({ source: 'nitwit, blubber, oddment, tweak', target: '笨蛋！哭鼻子！残渣！拧！' }),
    Object.freeze({ source: 'equal parts amusement and professional caution', target: '既觉得好笑又保持职业警惕' }),
    Object.freeze({ source: 'Uses \'right\' as an all-purpose intensifier', target: '把“对”当作万能的加强语' }),
    Object.freeze({ source: 'mildly amused', target: '略感好笑' }),
    Object.freeze({ source: 'in the meantime', target: '与此同时' }),
    Object.freeze({ source: 'oversized robes', target: '过大的长袍' }),
    Object.freeze({ source: 'twitched one ear', target: '一只耳朵抽动了一下' }),
    Object.freeze({ source: 'territorial squawk', target: '领地性的尖叫' }),
    Object.freeze({ source: 'live grenade', target: '一枚活手榴弹' }),
    Object.freeze({ source: 'So? SO?', target: '所以呢？所以呢？' }),
    Object.freeze({ source: 'Bilabibili-bo', target: '比拉比利博' }),
    Object.freeze({ source: 'WING', target: '翼' }),
    Object.freeze({ source: 'Yorkshire puddings', target: '约克郡布丁' }),
    Object.freeze({ source: 'Minmin', target: '敏敏' }),
    Object.freeze({ source: 'Tina Zhang', target: '蒂娜·张' }),
    Object.freeze({ source: 'Tina', target: '蒂娜' }),
    Object.freeze({ source: 'Alex Zhang', target: '亚历克斯·张' }),
    Object.freeze({ source: 'Alex', target: '亚历克斯' }),
    Object.freeze({ source: 'Zhang', target: '张' }),
    Object.freeze({ source: 'Miss', target: '小姐' }),
    Object.freeze({ source: 'Mr', target: '先生' }),
    Object.freeze({ source: 'Player', target: '玩家' }),
    Object.freeze({ source: 'Hogwarts', target: '霍格沃茨' }),
    Object.freeze({ source: 'Gryffindor', target: '格兰芬多' }),
    Object.freeze({ source: 'Slytherin', target: '斯莱特林' }),
    Object.freeze({ source: 'Ravenclaw', target: '拉文克劳' }),
    Object.freeze({ source: 'Hufflepuff', target: '赫奇帕奇' }),
    Object.freeze({ source: 'Muggles', target: '麻瓜' }),
    Object.freeze({ source: 'Muggle', target: '麻瓜' }),
    Object.freeze({ source: 'Galleons', target: '加隆' }),
    Object.freeze({ source: 'Galleon', target: '加隆' }),
    Object.freeze({ source: 'Sickles', target: '西可' }),
    Object.freeze({ source: 'Sickle', target: '西可' }),
    Object.freeze({ source: 'literally', target: '确实' }),
    Object.freeze({ source: 'halfway', target: '半途' }),
    Object.freeze({ source: 'amusement', target: '好笑' }),
    Object.freeze({ source: 'amused', target: '被逗乐' }),
    Object.freeze({ source: 'owl', target: '猫头鹰' }),
]);

function normalizeTranslationGlossary(glossary) {
    const seen = new Set();
    return (Array.isArray(glossary) ? glossary : [])
        .map(entry => ({
            source: String(entry?.source || '').trim(),
            target: String(entry?.target || '').trim(),
        }))
        .filter(entry => entry.source && entry.target && !seen.has(entry.source.toLocaleLowerCase()) &&
            seen.add(entry.source.toLocaleLowerCase()))
        .sort((left, right) => right.source.length - left.source.length);
}

export function buildActorTranslationTerms(actors = []) {
    const terms = [];
    const seen = new Set();
    const addTerm = (source, target) => {
        const normalizedSource = String(source || '').trim();
        const normalizedTarget = String(target || '').trim();
        const key = normalizedSource.toLocaleLowerCase();
        if (
            !normalizedSource ||
            !normalizedTarget ||
            normalizedSource === normalizedTarget ||
            seen.has(key)
        ) {
            return;
        }
        seen.add(key);
        terms.push({
            source: normalizedSource,
            target: normalizedTarget,
        });
    };

    (Array.isArray(actors) ? actors : []).forEach(actor => {
        const nameEn = String(actor?.nameEn || '').trim();
        const name = String(
            actor?.name ||
            actor?.display?.name ||
            '',
        ).trim();
        addTerm(nameEn, name);

        const sourceParts =
            nameEn.split(/\s+/).filter(Boolean);
        const targetParts =
            name.split('·').filter(Boolean);
        if (
            sourceParts.length > 1 &&
            sourceParts.length ===
                targetParts.length
        ) {
            sourceParts.forEach(
                (sourcePart, index) =>
                    addTerm(
                        sourcePart,
                        targetParts[index],
                    ),
            );
        } else if (targetParts.length > 1) {
            addTerm(
                sourceParts[0],
                targetParts[0],
            );
            addTerm(
                sourceParts.at(-1),
                targetParts.at(-1),
            );
        }
    });

    return terms;
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function applyTranslationGlossaryTargets(
    text,
    glossary = TRANSLATION_TERM_GLOSSARY,
) {
    let localizedText =
        String(text ?? '');
    normalizeTranslationGlossary(
        glossary,
    ).forEach(entry => {
        const pattern =
            new RegExp(
                `(?<![\\p{L}\\p{N}_])${escapeRegExp(entry.source)}(?![\\p{L}\\p{N}_])`,
                'giu',
            );
        localizedText =
            localizedText.replace(
                pattern,
                entry.target,
            );
    });
    return localizedText;
}

export function normalizeLocalTranslationText(
    source,
    translated,
) {
    const sourceText =
        String(source ?? '').trim();
    const translatedText =
        restoreTranslationTerms(
            translated,
            [],
        ).trim();
    if (
        sourceText.length <= 160 &&
        !sourceText.includes('\n') &&
        !/[()（）]/u.test(
            sourceText,
        )
    ) {
        return translatedText
            .replace(
                /\n+\s*[（(][^()（）\n]{1,160}[）)]\s*$/u,
                '',
            )
            .trim();
    }
    return translatedText;
}

export function protectTranslationTerms(text, glossary = TRANSLATION_TERM_GLOSSARY) {
    let protectedText = String(text ?? '');
    normalizeTranslationGlossary(glossary).forEach((entry, index) => {
        const pattern = new RegExp(
            `(?<![\\p{L}\\p{N}_])${escapeRegExp(entry.source)}(?![\\p{L}\\p{N}_])`,
            'giu',
        );
        protectedText = protectedText.replace(
            pattern,
            `⟦术语${index}⟧`,
        );
    });
    return protectedText;
}

export function restoreTranslationTerms(text, glossary = TRANSLATION_TERM_GLOSSARY) {
    let restoredText = String(text ?? '');
    normalizeTranslationGlossary(glossary).forEach((entry, index) => {
        const marker =
            new RegExp(
                `⟦\\s*术语\\s*${index}\\s*⟧`,
                'gu',
            );
        restoredText = restoredText.replace(marker, entry.target);
    });
    return restoredText
        .replace(
            /([\u3400-\u9FFF])[ \t\u00A0]+(?=[\u3400-\u9FFF])/g,
            '$1',
        )
        .replace(
            /([，。！？；：、”’）】》])[ \t\u00A0]+/g,
            '$1',
        )
        .replace(
            /[ \t\u00A0]+(?=[，。！？；：、”’）】》])/g,
            '',
        )
        .replace(
            /([“‘（【《])[ \t\u00A0]+/g,
            '$1',
        );
}

export function createTranslationBatches(
    values,
    maxLength = 4700,
    {
        maxRecords =
        Number
            .POSITIVE_INFINITY,
    } = {},
) {
    const safeMaxLength = Math.max(128, Number(maxLength) || 4700);
    const safeMaxRecords =
        Number.isFinite(
            maxRecords,
        )
            ? Math.max(
                1,
                Math.floor(
                    maxRecords,
                ),
            )
            : Number
                .POSITIVE_INFINITY;
    const records = [];
    (Array.isArray(values) ? values : []).forEach((value, valueIndex) => {
        const parts = splitTranslationChunks(
            String(value ?? ''),
            Math.max(64, safeMaxLength - 48),
        );
        (parts.length ? parts : ['']).forEach((part, partIndex) => {
            records.push(`[[HPMUD_${valueIndex}_${partIndex}]] ${part}`);
        });
    });

    const batches = [];
    let current = '';
    let currentRecords = 0;
    records.forEach(record => {
        const candidate = current ? `${current}\n\n${record}` : record;
        if (
            current &&
            (
                candidate.length >
                    safeMaxLength ||
                currentRecords >=
                    safeMaxRecords
            )
        ) {
            batches.push(current);
            current = record;
            currentRecords = 1;
        } else {
            current = candidate;
            currentRecords += 1;
        }
    });
    if (current) {
        batches.push(current);
    }
    return batches;
}

export function shouldTranslateToChinese(text) {
    const source = String(text ?? '').replace(/\s+/g, '');
    if (!source) {
        return false;
    }
    const latin = (source.match(/[A-Za-z]/g) || []).length;
    const cjk = (source.match(/[\u3400-\u9FFF]/g) || []).length;
    return latin >= 8 && latin > cjk;
}
