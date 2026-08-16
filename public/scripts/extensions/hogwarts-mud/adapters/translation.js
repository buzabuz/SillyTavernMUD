import {
    getSpellDefinitions,
} from '../spell-catalog.js';

function escapeRegExp(
    value,
) {
    return String(value)
        .replace(
            /[.*+?^${}()|[\]\\]/gu,
            '\\$&',
        );
}

export function findAvoidableEnglishTokens(
    text,
    allowedTerms = [],
) {
    let remaining =
        String(text || '')
            .replace(
                /https?:\/\/\S+/giu,
                '',
            );
    [
        ...new Set(
            (allowedTerms || [])
                .map(term =>
                    String(
                        term ||
                        '',
                    ).trim())
                .filter(Boolean),
        ),
    ]
        .sort((left, right) =>
            right.length -
            left.length)
        .forEach(term => {
            remaining =
                remaining.replace(
                    new RegExp(
                        escapeRegExp(
                            term,
                        ),
                        'giu',
                    ),
                    '',
                );
        });
    return [
        ...new Set(
            remaining.match(
                /[A-Za-z][A-Za-z'-]*/gu,
            ) ||
            [],
        ),
    ];
}

export function findSourceBackedLatinLiteralTerms(
    sourceText,
) {
    const source =
        String(sourceText || '');
    const terms = new Set();
    const patterns = [
        /\b[Cc]ompartment\s+([A-Z])\b/gu,
        /\b(?:[Ll]etter|[Ii]nitial)\s+([A-Z])\b/gu,
        /\b([A-Z])(?:-|\s+)[Ss]haped\b/gu,
        /\b(?:[Pp]ale|[Ff]aint)\s+([A-Z])\b/gu,
        /\b(?:[Ss]igned?|[Ss]igning|[Ss]ignature|[Aa]utograph|[Cc]rooked|[Ww]rote|[Ww]rite|[Ww]ritten)\b[^.!?\n]{0,48}?\b([A-Z])\b/gu,
        /\b(?:[Ee]ven\s+just|[Jj]ust|[Oo]nly|[Bb]arely)(?:\s+an?)?\s+([A-Z])\b/gu,
        /\b([A-Z])\b[^.!?\n]{0,48}?\b(?:[Ss]igned?|[Ss]ignature|[Aa]utograph|faced outward)\b/gu,
    ];
    for (const pattern of patterns) {
        for (
            const match of
            source.matchAll(pattern)
        ) {
            const term =
                String(
                    match[1] || '',
                );
            if (
                /^[A-Z]$/u.test(
                    term,
                )
            ) {
                terms.add(term);
            }
        }
    }
    return [...terms];
}

export function stripAllowedTranslationTerms(
    text,
    allowedTerms = [],
) {
    return (allowedTerms || [])
        .reduce(
            (
                value,
                term,
            ) =>
                value.replace(
                    new RegExp(
                        escapeRegExp(
                            term,
                        ),
                        'giu',
                    ),
                    '',
                ),
            String(text || ''),
        );
}

export function createTranslationAdapter(ports) {
    const {
        TRANSLATION_TERM_GLOSSARY,
        applyTranslationGlossaryTargets,
        buildActorTranslationTerms,
        createTranslationBatches,
        getMudState,
        getRequestHeaders,
        getSettings,
        normalizeLocalTranslationText,
        normalizeTranslationProvider,
        protectTranslationTerms,
        restoreTranslationTerms,
        runLocalModelTask =
        async (
            _taskId,
            invoke,
        ) =>
            invoke(),
        shouldTranslateToChinese =
        value => {
            const source =
                String(
                    value ||
                    '',
                ).replace(
                    /\s+/gu,
                    '',
                );
            const latin =
                (
                    source.match(
                        /[A-Za-z]/gu,
                    ) ||
                    []
                ).length;
            const cjk =
                (
                    source.match(
                        /[\u3400-\u9FFF]/gu,
                    ) ||
                    []
                ).length;
            return latin >= 8 &&
                latin > cjk;
        },
        splitTranslationChunks,
    } = ports;

    function getTranslationGlossary() {
        const state = getMudState();
        const dynamicTerms = [];
        const addTerm = (source, target) => {
            const normalizedSource = String(source || '').trim();
            const normalizedTarget = String(target || '').trim();
            if (normalizedSource && normalizedTarget && normalizedSource !== normalizedTarget) {
                dynamicTerms.push({
                    source: normalizedSource,
                    target: normalizedTarget,
                });
            }
        };
        dynamicTerms.push(
            ...buildActorTranslationTerms([
                ...(state?.actorLibrary || []),
                ...(state?.actors || []),
            ]),
        );
        const localizedAlias =
            aliases =>
                (aliases || [])
                    .find(alias =>
                        /[\u3400-\u9FFF]/u
                            .test(
                                String(alias),
                            ));
        (state?.map?.customLocalMaps || [])
            .forEach(map => {
                addTerm(
                    map.nameEn,
                    localizedAlias(
                        map.aliases,
                    ),
                );
                (map.nodes || [])
                    .forEach(room =>
                        addTerm(
                            room.nameEn,
                            localizedAlias(
                                room.aliases,
                            ),
                        ));
            });
        const protectedSpellTerms =
            getSpellDefinitions(
                state,
            )
                .flatMap(spell => [
                    spell.incantation,
                    ...String(
                        spell.incantation ||
                        '',
                    ).split(
                        /\s+/u,
                    ),
                ])
                .map(term =>
                    String(
                        term ||
                        '',
                    ).trim())
                .filter(term =>
                    term.length > 1)
                .map(term => ({
                    source: term,
                    target: term,
                }));
        return [
            ...TRANSLATION_TERM_GLOSSARY,
            ...dynamicTerms,
            ...protectedSpellTerms,
        ];
    }

    function selectLocalTranslationGlossary(
        text,
        glossary,
    ) {
        const source =
        String(
            text || '',
        ).toLocaleLowerCase();
        return (
            glossary ||
        []
        )
            .filter(entry =>
                String(
                    entry?.source ||
                '',
                ).trim() &&
            String(
                entry?.target ||
                '',
            ).trim() &&
            source.includes(
                String(
                    entry.source,
                ).toLocaleLowerCase(),
            ))
            .slice(0, 96)
            .map(entry => ({
                source:
                String(
                    entry.source,
                ),
                target:
                String(
                    entry.target,
                ),
            }));
    }

    function getLocalTranslationNameGlossary() {
        const state =
        getMudState();
        const actorTerms =
        buildActorTranslationTerms([
            ...(state?.actorLibrary || []),
            ...(state?.actors || []),
        ]);
        return [
            ...actorTerms,
            ...TRANSLATION_TERM_GLOSSARY
                .filter(entry =>
                    [
                        'tina',
                        'tina zhang',
                    ].includes(
                        entry.source
                            .toLocaleLowerCase(),
                    )),
        ];
    }

    async function translateOpeningValues(values) {
        const output = values.slice();
        const glossary = getTranslationGlossary();
        const nameGlossary =
        getLocalTranslationNameGlossary();
        const provider =
        getSettings().translationProvider;
        if (provider === 'local') {
            const translatedParts =
            values.map(() => []);
            const tasks = values.flatMap(
                (value, valueIndex) =>
                    splitTranslationChunks(
                        String(value || ''),
                        3600,
                    ).map(
                        (text, partIndex) => ({
                            valueIndex,
                            partIndex,
                            text,
                        }),
                    ),
            );
            for (
                let taskIndex = 0;
                taskIndex < tasks.length;
                taskIndex++
            ) {
                const task =
                tasks[taskIndex];
                const taskGlossary =
                selectLocalTranslationGlossary(
                    task.text,
                    glossary,
                );
                const prelocalizedGlossary =
                selectLocalTranslationGlossary(
                    task.text,
                    nameGlossary,
                );
                translatedParts[
                    task.valueIndex
                ][
                    task.partIndex
                ] =
                await requestTranslation(
                    applyTranslationGlossaryTargets(
                        task.text,
                        prelocalizedGlossary,
                    ),
                    provider,
                    {
                        unload:
                            taskIndex ===
                            tasks.length -
                                1,
                        glossary:
                            taskGlossary,
                    },
                );
            }
            translatedParts.forEach(
                (parts, index) => {
                    const translated =
                    parts
                        .filter(Boolean)
                        .join('\n\n')
                        .trim();
                    if (translated) {
                        output[index] =
                        normalizeLocalTranslationText(
                            values[index],
                            translated,
                        );
                    }
                },
            );
            return output;
        }
        const batchLength =
        provider === 'bing'
            ? 900
            : 4700;
        const protectedValues =
        values.map(value =>
            protectTranslationTerms(
                value,
                glossary,
            ));
        const translatedParts = values.map(() => []);
        const batches =
        createTranslationBatches(
            protectedValues,
            batchLength,
        );
        for (
            let batchIndex = 0;
            batchIndex <
            batches.length;
            batchIndex++
        ) {
            const translated =
            await requestTranslation(
                batches[
                    batchIndex
                ],
                provider,
                {
                    unload:
                        batchIndex ===
                        batches.length -
                            1,
                },
            );
            const pattern = /\[\[\s*HPMUD_(\d+)_(\d+)\s*]]\s*([\s\S]*?)(?=\[\[\s*HPMUD_\d+_\d+\s*]]|$)/g;
            for (const match of translated.matchAll(pattern)) {
                const valueIndex = Number(match[1]);
                const partIndex = Number(match[2]);
                const value = match[3].trim();
                if (valueIndex >= 0 && valueIndex < output.length && value) {
                    translatedParts[valueIndex][partIndex] = value;
                }
            }
        }
        translatedParts.forEach((parts, index) => {
            const translated = parts.filter(Boolean).join('\n\n').trim();
            if (translated) {
                output[index] =
                restoreTranslationTerms(
                    translated,
                    glossary,
                );
            }
        });
        return output;
    }

    async function requestTranslation(
        text,
        provider = getSettings().translationProvider,
        {
            unload = true,
            glossary = [],
        } = {},
    ) {
        const resolvedProvider =
        normalizeTranslationProvider(provider);
        if (resolvedProvider === 'off') {
            return String(text || '');
        }
        const endpoint =
        resolvedProvider ===
            'local'
            ? '/api/hogwarts-mud/local/translate'
            : `/api/translate/${resolvedProvider}`;
        const response =
            await runLocalModelTask(
                'local_translation',
                () =>
                    fetch(
                        endpoint,
                        {
                            method: 'POST',
                            headers:
                                getRequestHeaders(),
                            body:
                                JSON.stringify({
                                    text,
                                    lang:
                                        getSettings()
                                            .targetLanguage,
                                    source: 'en',
                                    unload,
                                    glossary,
                                }),
                        },
                    ),
                {
                    eventType:
                        'localization.idle_batch_requested',
                    emittedBy:
                        'translation.adapter',
                },
            );
        if (!response.ok) {
            throw new Error(
                `${resolvedProvider} translation returned ${response.status}`,
            );
        }
        return response.text();
    }

    async function translateWithProvider(
        text,
        provider = getSettings().translationProvider,
    ) {
        const resolvedProvider =
        normalizeTranslationProvider(provider);
        const glossary = getTranslationGlossary();
        const nameGlossary =
        getLocalTranslationNameGlossary();
        const protectedText =
        resolvedProvider ===
            'local'
            ? String(text || '')
            : protectTranslationTerms(
                text,
                glossary,
            );
        const chunks = splitTranslationChunks(
            protectedText,
            resolvedProvider === 'bing'
                ? 900
                : resolvedProvider ===
                'local'
                    ? 3600
                    : 4700,
        );
        const translated = [];
        for (
            let index = 0;
            index < chunks.length;
            index++
        ) {
            const chunkGlossary =
            resolvedProvider ===
                'local'
                ? selectLocalTranslationGlossary(
                    chunks[index],
                    glossary,
                )
                : [];
            const prelocalizedGlossary =
            resolvedProvider ===
                'local'
                ? selectLocalTranslationGlossary(
                    chunks[index],
                    nameGlossary,
                )
                : [];
            translated.push(
                await requestTranslation(
                    resolvedProvider ===
                    'local'
                        ? applyTranslationGlossaryTargets(
                            chunks[index],
                            prelocalizedGlossary,
                        )
                        : chunks[index],
                    resolvedProvider,
                    {
                        unload:
                        index ===
                        chunks.length -
                            1,
                        glossary:
                        chunkGlossary,
                    },
                ),
            );
        }
        const joined =
        translated.join('\n\n');
        return resolvedProvider ===
        'local'
            ? joined
            : restoreTranslationTerms(
                joined,
                glossary,
            );
    }

    async function translateLocalizationBatch({
        providerId,
        candidates,
    }) {
        const parts =
            candidates.flatMap((
                candidate,
                index,
            ) => {
                const chunks =
                    splitTranslationChunks(
                        candidate
                            .sourceText,
                        1_200,
                    );
                return (
                    chunks.length
                        ? chunks
                        : [
                            candidate
                                .sourceText,
                        ]
                ).map((
                    text,
                    partIndex,
                ) => ({
                    index,
                    partIndex,
                    text,
                }));
            });
        const source =
            parts.map(part =>
                `[[HPMUD_${part.index}_${part.partIndex}]] ${part.text}`)
                .join('\n');
        const glossary =
            selectLocalTranslationGlossary(
                source,
                getTranslationGlossary(),
            );
        const protectedSource =
            providerId === 'local'
                ? source
                : protectTranslationTerms(
                    source,
                    glossary,
                );
        const translated =
            await requestTranslation(
                protectedSource,
                providerId,
                {
                    unload: true,
                    glossary,
                },
            );
        const translatedParts =
            new Map();
        const pattern =
            /\[\[\s*HPMUD_(\d+)_(\d+)\s*\]\]\s*([\s\S]*?)(?=\[\[\s*HPMUD_\d+_\d+\s*\]\]|$)/gu;
        for (const match of
            translated.matchAll(
                pattern,
            )) {
            translatedParts.set(
                `${
                    Number(
                        match[1],
                    )
                }:${
                    Number(
                        match[2],
                    )
                }`,
                match[3].trim(),
            );
        }
        if (
            translatedParts.size !==
            parts.length
        ) {
            const error =
                new Error(
                    'Translation batch changed protected markers.',
                );
            error.code =
                'MARKER_MISMATCH';
            throw error;
        }
        return candidates.map((
            candidate,
            index,
        ) => {
            const translatedText =
                restoreTranslationTerms(
                    parts
                        .filter(part =>
                            part.index ===
                                index)
                        .map(part =>
                            translatedParts
                                .get(
                                    `${part.index}:${part.partIndex}`,
                                ))
                        .join(
                            '\n\n',
                        ),
                    glossary,
                );
            const allowedTerms =
                [
                    ...glossary
                        .filter(entry =>
                            entry.source ===
                                entry.target)
                        .map(entry =>
                            entry.target),
                    ...findSourceBackedLatinLiteralTerms(
                        candidate
                            .sourceText,
                    ),
                ];
            const avoidableEnglish =
                findAvoidableEnglishTokens(
                    translatedText,
                    allowedTerms,
                );
            // #region debug-point A-D:author-quill-leak
            if (
                candidate.recordKind ===
                    'author_quill' &&
                String(
                    candidate.recordId,
                ) === '210' &&
                avoidableEnglish.length
            ) {
                void fetch(
                    'http://127.0.0.1:7777/event',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type':
                                'application/json',
                        },
                        body:
                            JSON.stringify({
                                sessionId:
                                    'author-quill-english-leak',
                                runId:
                                    'post-fix',
                                hypothesisId:
                                    'A-D',
                                location:
                                    'adapters/translation.js:translateLocalizationBatch',
                                msg:
                                    '[DEBUG] Author Quill avoidable English tokens',
                                data: {
                                    tokens:
                                        avoidableEnglish,
                                    sourceMatches:
                                        avoidableEnglish
                                            .filter(
                                                token =>
                                                    candidate
                                                        .sourceText
                                                        .toLocaleLowerCase()
                                                        .includes(
                                                            token
                                                                .toLocaleLowerCase(),
                                                        ),
                                            ),
                                    translatedLength:
                                        translatedText
                                            .length,
                                },
                                ts:
                                    Date.now(),
                            }),
                    },
                ).catch(() => {});
            }
            // #endregion
            const targetLocaleText =
                stripAllowedTranslationTerms(
                    translatedText,
                    allowedTerms,
                );
            const targetMismatch =
                shouldTranslateToChinese(
                    targetLocaleText,
                );
            const emptyTranslation =
                !translatedText.trim();
            // #region debug-point A-D:translation-error-43
            if (
                globalThis.location
                    ?.hostname ===
                    '127.0.0.1'
            ) {
                void fetch(
                    'http://127.0.0.1:7778/event',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type':
                                'application/json',
                        },
                        body:
                            JSON.stringify({
                                sessionId:
                                'translation-error-43',
                                runId: 'post-fix',
                                hypothesisId:
                                'A-D',
                                location:
                                'adapters/translation.js:translateLocalizationBatch',
                                msg:
                                '[DEBUG] Translation quality decision',
                                data: {
                                    identity:
                                    `${
                                        candidate
                                            .recordKind
                                    }/${
                                        candidate
                                            .recordId
                                    }/${
                                        candidate
                                            .fieldPath
                                    }`,
                                    recordKind:
                                    candidate
                                        .recordKind,
                                    sourceLength:
                                    candidate
                                        .sourceText
                                        .length,
                                    translatedLength:
                                    translatedText
                                        .length,
                                    hanCharacters:
                                    (
                                        targetLocaleText
                                            .match(
                                                /[\u3400-\u9fff]/gu,
                                            ) ||
                                        []
                                    ).length,
                                    latinLetters:
                                    (
                                        targetLocaleText
                                            .match(
                                                /[A-Za-z]/gu,
                                            ) ||
                                        []
                                    ).length,
                                    emptyTranslation,
                                    targetMismatch,
                                    tokens:
                                    avoidableEnglish,
                                    sourceMatches:
                                    avoidableEnglish
                                        .filter(
                                            token =>
                                                candidate
                                                    .sourceText
                                                    .toLocaleLowerCase()
                                                    .includes(
                                                        token
                                                            .toLocaleLowerCase(),
                                                    ),
                                        ),
                                    generatedTokens:
                                    avoidableEnglish
                                        .filter(
                                            token =>
                                                !candidate
                                                    .sourceText
                                                    .toLocaleLowerCase()
                                                    .includes(
                                                        token
                                                            .toLocaleLowerCase(),
                                                    ),
                                        ),
                                    tokenContexts:
                                    avoidableEnglish
                                        .map(
                                            token => {
                                                const index =
                                                    translatedText
                                                        .toLocaleLowerCase()
                                                        .indexOf(
                                                            token
                                                                .toLocaleLowerCase(),
                                                        );
                                                return index <
                                                    0
                                                    ? token
                                                    : translatedText
                                                        .slice(
                                                            Math.max(
                                                                0,
                                                                index -
                                                                    36,
                                                            ),
                                                            index +
                                                                token
                                                                    .length +
                                                                36,
                                                        );
                                            },
                                        ),
                                    targetSample:
                                    targetMismatch
                                        ? translatedText
                                            .slice(
                                                0,
                                                240,
                                            )
                                        : '',
                                    sourceHasJsonShape:
                                    /[{}]|\b[A-Za-z][A-Za-z0-9]*\s*:/u
                                        .test(
                                            candidate
                                                .sourceText,
                                        ),
                                },
                                ts: Date.now(),
                            }),
                    },
                ).catch(() => {});
            }
            // #endregion
            const invalid =
                emptyTranslation ||
                targetMismatch ||
                avoidableEnglish.length >
                    0;
            return {
                ...candidate,
                translatedText:
                    invalid
                        ? ''
                        : translatedText,
                translationStatus:
                    invalid
                        ? 'error'
                        : 'ready',
                errorCode:
                    emptyTranslation
                        ? 'EMPTY_TRANSLATION'
                        : targetMismatch
                            ? 'TARGET_LOCALE_MISMATCH'
                            : avoidableEnglish
                                .length
                                ? 'SOURCE_LOCALE_LEAK'
                                : '',
            };
        });
    }

    return {
        getTranslationGlossary,
        selectLocalTranslationGlossary,
        getLocalTranslationNameGlossary,
        translateOpeningValues,
        requestTranslation,
        translateLocalizationBatch,
        translateWithProvider,
    };
}
