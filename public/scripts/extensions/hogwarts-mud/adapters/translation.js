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
        addTerm(state?.scene?.nameEn, state?.scene?.name);
        (state?.map?.customLocalMaps || []).forEach(map =>
            addTerm(map.nameEn, map.name),
        );
        return [
            ...TRANSLATION_TERM_GLOSSARY,
            ...dynamicTerms,
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
                        'translation.requested',
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

    return {
        getTranslationGlossary,
        selectLocalTranslationGlossary,
        getLocalTranslationNameGlossary,
        translateOpeningValues,
        requestTranslation,
        translateWithProvider,
    };
}
