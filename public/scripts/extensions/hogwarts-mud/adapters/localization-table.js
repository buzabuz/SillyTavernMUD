import {
    TRANSLATION_API_CONTRACT_VERSION,
    TRANSLATION_RECORD_SCHEMA_VERSION,
    TRANSLATION_TABLE_LIMITS,
    TRANSLATION_TABLE_SCHEMA_VERSION,
    createTranslationRowKey,
    hashTranslationSource,
} from '../domain/localization-contract.js';

function assertTimelineEpoch(
    timelineEpoch,
) {
    const normalized =
        String(
            timelineEpoch || '',
        ).trim();
    if (
        !normalized ||
        normalized.length > 256
    ) {
        throw new Error(
            'A valid translation timeline epoch is required.',
        );
    }
    return normalized;
}

function assertServerEnvelope(
    result,
    timelineEpoch,
) {
    if (
        !result ||
        typeof result !== 'object' ||
        Number(
            result
                .translationApiContractVersion,
        ) !==
            TRANSLATION_API_CONTRACT_VERSION ||
        Number(
            result.tableSchemaVersion,
        ) !==
            TRANSLATION_TABLE_SCHEMA_VERSION ||
        result.timelineEpoch !==
            timelineEpoch
    ) {
        throw new Error(
            'Translation table contract mismatch.',
        );
    }
    return result;
}

export function createLocalizationTableAdapter({
    getRequestHeaders,
    fetchImpl =
    globalThis.fetch,
}) {
    if (
        typeof getRequestHeaders !==
            'function' ||
        typeof fetchImpl !==
            'function'
    ) {
        throw new TypeError(
            'Localization table adapter ports are required.',
        );
    }

    async function request(
        path,
        {
            timelineEpoch,
            method = 'POST',
            body,
        } = {},
    ) {
        const epoch =
            assertTimelineEpoch(
                timelineEpoch,
            );
        const url =
            method === 'GET'
                ? `${path}?${
                    new URLSearchParams({
                        translationApiContractVersion:
                            String(
                                TRANSLATION_API_CONTRACT_VERSION,
                            ),
                        timelineEpoch:
                            epoch,
                    })
                }`
                : path;
        const response =
            await fetchImpl(
                url,
                {
                    method,
                    headers:
                        getRequestHeaders(),
                    body:
                        method === 'GET'
                            ? undefined
                            : JSON.stringify({
                                translationApiContractVersion:
                                    TRANSLATION_API_CONTRACT_VERSION,
                                timelineEpoch:
                                    epoch,
                                ...body,
                            }),
                },
            );
        if (!response.ok) {
            let code =
                `HTTP_${response.status}`;
            try {
                code =
                    (
                        await response
                            .json()
                    )?.error ||
                    code;
            } catch {
                // The bounded status code is enough.
            }
            const error =
                new Error(
                    `Translation table request failed: ${code}`,
                );
            error.code = code;
            error.status =
                response.status;
            throw error;
        }
        return assertServerEnvelope(
            await response.json(),
            epoch,
        );
    }

    return Object.freeze({
        async getHealth(
            timelineEpoch,
        ) {
            return request(
                '/api/hogwarts-mud/localization/health',
                {
                    timelineEpoch,
                    method: 'GET',
                },
            );
        },

        async queryRows(
            timelineEpoch,
            keys,
        ) {
            if (
                !Array.isArray(keys) ||
                keys.length >
                    TRANSLATION_TABLE_LIMITS
                        .maxQueryKeys
            ) {
                throw new Error(
                    'Invalid translation query.',
                );
            }
            const result =
                await request(
                    '/api/hogwarts-mud/localization/query',
                    {
                        timelineEpoch,
                        body: {
                            keys,
                        },
                    },
                );
            if (!Array.isArray(
                result.rows,
            )) {
                throw new Error(
                    'Translation table query contract mismatch.',
                );
            }
            return result;
        },

        async upsertRows(
            timelineEpoch,
            rows,
        ) {
            if (
                !Array.isArray(rows) ||
                rows.length >
                    TRANSLATION_TABLE_LIMITS
                        .maxUpsertRows
            ) {
                throw new Error(
                    'Invalid translation upsert.',
                );
            }
            return request(
                '/api/hogwarts-mud/localization/upsert',
                {
                    timelineEpoch,
                    body: {
                        rows,
                    },
                },
            );
        },

        async requestRetranslation(
            timelineEpoch,
            keys,
        ) {
            if (
                !Array.isArray(keys) ||
                keys.length >
                    TRANSLATION_TABLE_LIMITS
                        .maxUpsertRows
            ) {
                throw new Error(
                    'Invalid retranslation request.',
                );
            }
            return request(
                '/api/hogwarts-mud/localization/retranslate',
                {
                    timelineEpoch,
                    body: {
                        keys,
                    },
                },
            );
        },

        async createReadyRow({
            timelineEpoch,
            recordKind,
            recordId,
            fieldPath,
            sourceText,
            translatedText,
            targetLocale =
            'zh-CN',
            providerId,
            translatorVersion,
            glossaryVersion,
        }) {
            const row = {
                schemaVersion:
                    TRANSLATION_RECORD_SCHEMA_VERSION,
                timelineEpoch:
                    assertTimelineEpoch(
                        timelineEpoch,
                    ),
                recordKind,
                recordId,
                fieldPath,
                sourceHash:
                    await hashTranslationSource(
                        sourceText,
                    ),
                sourceLocale: 'en',
                targetLocale,
                providerId,
                translatorVersion,
                glossaryVersion,
                translatedText,
                status: 'ready',
                errorCode: '',
            };
            return {
                key:
                    await createTranslationRowKey(
                        row,
                    ),
                row,
            };
        },

        async createErrorRow({
            timelineEpoch,
            recordKind,
            recordId,
            fieldPath,
            sourceText,
            targetLocale =
            'zh-CN',
            providerId,
            translatorVersion,
            glossaryVersion,
            errorCode,
        }) {
            const row = {
                schemaVersion:
                    TRANSLATION_RECORD_SCHEMA_VERSION,
                timelineEpoch:
                    assertTimelineEpoch(
                        timelineEpoch,
                    ),
                recordKind,
                recordId,
                fieldPath,
                sourceHash:
                    await hashTranslationSource(
                        sourceText,
                    ),
                sourceLocale: 'en',
                targetLocale,
                providerId,
                translatorVersion,
                glossaryVersion,
                translatedText: '',
                status: 'error',
                errorCode:
                    String(
                        errorCode ||
                        'TRANSLATION_FAILED',
                    ).slice(0, 64),
            };
            return {
                key:
                    await createTranslationRowKey(
                        row,
                    ),
                row,
            };
        },
    });
}
