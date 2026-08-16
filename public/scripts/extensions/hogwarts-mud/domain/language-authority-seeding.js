import {
    TRANSLATION_TABLE_LIMITS,
    createTranslationRowKey,
} from './localization-contract.js';

function chunks(
    values,
    size,
) {
    const output = [];
    for (
        let index = 0;
        index < values.length;
        index += size
    ) {
        output.push(
            values.slice(
                index,
                index + size,
            ),
        );
    }
    return output;
}

function assertAdapter(adapter) {
    for (const method of [
        'createReadyRow',
        'upsertRows',
        'queryRows',
    ]) {
        if (
            typeof adapter?.[method] !==
            'function'
        ) {
            throw new TypeError(
                `Language migration seeding requires localizationTable.${method}.`,
            );
        }
    }
}

function assertCandidate(
    candidate,
) {
    if (
        !candidate ||
        typeof candidate !==
            'object' ||
        !String(
            candidate.recordKind ||
            '',
        ).trim() ||
        !String(
            candidate.recordId ||
            '',
        ).trim() ||
        !String(
            candidate.fieldPath ||
            '',
        ).trim() ||
        !String(
            candidate.sourceText ||
            '',
        ).trim() ||
        !String(
            candidate.translatedText ||
            '',
        ).trim()
    ) {
        throw new TypeError(
            'Invalid language migration translation candidate.',
        );
    }
}

export async function seedLanguageAuthorityTranslations({
    timelineEpoch,
    candidates,
    localizationTable,
    providerId = 'local',
    translatorVersion = 1,
    glossaryVersion = 1,
}) {
    assertAdapter(
        localizationTable,
    );
    if (
        !String(
            timelineEpoch ||
            '',
        ).trim() ||
        !Array.isArray(
            candidates,
        )
    ) {
        throw new TypeError(
            'Language migration seeding requires a timeline and candidates.',
        );
    }
    candidates.forEach(
        assertCandidate,
    );
    const prepared =
        await Promise.all(
            candidates.map(
                candidate =>
                    localizationTable
                        .createReadyRow({
                            timelineEpoch,
                            recordKind:
                                candidate
                                    .recordKind,
                            recordId:
                                candidate
                                    .recordId,
                            fieldPath:
                                candidate
                                    .fieldPath,
                            sourceText:
                                candidate
                                    .sourceText,
                            translatedText:
                                candidate
                                    .translatedText,
                            providerId,
                            translatorVersion,
                            glossaryVersion,
                        }),
            ),
        );
    const byKey =
        new Map();
    for (const entry of prepared) {
        if (
            !entry?.key ||
            !entry?.row ||
            byKey.has(
                entry.key,
            )
        ) {
            throw new TypeError(
                'Language migration produced an invalid or duplicate translation row.',
            );
        }
        byKey.set(
            entry.key,
            entry.row,
        );
    }
    let upsertBatchCount = 0;
    for (
        const batch
        of chunks(
            prepared,
            TRANSLATION_TABLE_LIMITS
                .maxUpsertRows,
        )
    ) {
        await localizationTable
            .upsertRows(
                timelineEpoch,
                batch.map(entry =>
                    entry.row),
            );
        upsertBatchCount += 1;
    }
    const queried =
        new Map();
    let queryBatchCount = 0;
    for (
        const keyBatch
        of chunks(
            [
                ...byKey.keys(),
            ],
            TRANSLATION_TABLE_LIMITS
                .maxQueryKeys,
        )
    ) {
        const response =
            await localizationTable
                .queryRows(
                    timelineEpoch,
                    keyBatch,
                );
        for (const row of (
            response?.rows ||
            []
        )) {
            const key =
                await createTranslationRowKey(
                    row,
                );
            queried.set(
                key,
                row,
            );
        }
        queryBatchCount += 1;
    }
    for (
        const [
            key,
            expected,
        ] of byKey
    ) {
        const actual =
            queried.get(key);
        if (
            !actual ||
            actual.status !==
                'ready' ||
            actual.sourceHash !==
                expected.sourceHash ||
            actual.translatedText !==
                expected.translatedText ||
            actual.recordKind !==
                expected.recordKind ||
            actual.recordId !==
                expected.recordId ||
            actual.fieldPath !==
                expected.fieldPath
        ) {
            throw new Error(
                `Translation seed read-back mismatch for ${key}.`,
            );
        }
    }
    return {
        rowCount:
            byKey.size,
        keys: [
            ...byKey.keys(),
        ],
        upsertBatchCount,
        queryBatchCount,
    };
}
