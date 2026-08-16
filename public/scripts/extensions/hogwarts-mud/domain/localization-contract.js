export const TRANSLATION_API_CONTRACT_VERSION = 1;
export const TRANSLATION_TABLE_SCHEMA_VERSION = 1;
export const TRANSLATION_RECORD_SCHEMA_VERSION = 1;

export const TRANSLATION_TABLE_LIMITS =
    Object.freeze({
        maxRowsPerTimeline: 100_000,
        maxTableBytes: 256 * 1024 * 1024,
        maxJournalBytesBeforeCompaction:
            32 * 1024 * 1024,
        maxQueryKeys: 1_000,
        maxUpsertRows: 256,
        maxRequestBytes: 4 * 1024 * 1024,
        maxTranslatedTextCharacters:
            20_000,
    });

export const TRANSLATION_TARGET_LOCALES =
    Object.freeze([
        'zh-CN',
    ]);

export const TRANSLATION_PROVIDERS =
    Object.freeze([
        'local',
        'google',
        'bing',
        'migration',
    ]);

export const TRANSLATION_RECORD_STATUSES =
    Object.freeze([
        'ready',
        'error',
    ]);

const SHA256_PATTERN =
    /^[a-f0-9]{64}$/u;
const IDENTIFIER_PATTERN =
    /^[a-z0-9][a-z0-9_.:-]*$/iu;

function boundedString(
    value,
    maximum,
) {
    const normalized =
        String(value || '').trim();
    return (
        normalized &&
        normalized.length <= maximum
    )
        ? normalized
        : '';
}

function nonNegativeInteger(value) {
    const number = Number(value);
    return Number.isSafeInteger(number) &&
        number >= 0
        ? number
        : null;
}

export function canonicalTranslationIdentity(
    row,
) {
    return JSON.stringify([
        String(row?.timelineEpoch || ''),
        String(row?.recordKind || ''),
        String(row?.recordId || ''),
        String(row?.fieldPath || ''),
        String(row?.sourceHash || ''),
        String(row?.sourceLocale || ''),
        String(row?.targetLocale || ''),
        String(row?.providerId || ''),
        Number(row?.translatorVersion),
        Number(row?.glossaryVersion),
    ]);
}

async function sha256(value) {
    const subtle =
        globalThis.crypto?.subtle;
    if (!subtle) {
        throw new Error(
            'Web Crypto SHA-256 is unavailable.',
        );
    }
    const digest =
        await subtle.digest(
            'SHA-256',
            new TextEncoder()
                .encode(
                    String(value || ''),
                ),
        );
    return Array.from(
        new Uint8Array(digest),
        byte => byte
            .toString(16)
            .padStart(2, '0'),
    ).join('');
}

export async function hashTranslationSource(
    sourceText,
) {
    return sha256(
        String(sourceText || ''),
    );
}

export async function createTranslationRowKey(
    row,
) {
    return sha256(
        canonicalTranslationIdentity(
            row,
        ),
    );
}

export function normalizeTranslationRecord(
    row,
    {
        timelineEpoch,
        now = Date.now(),
    } = {},
) {
    if (
        !row ||
        typeof row !== 'object' ||
        Array.isArray(row)
    ) {
        return null;
    }
    const expectedTimelineEpoch =
        boundedString(
            timelineEpoch,
            256,
        );
    const rowTimelineEpoch =
        boundedString(
            row.timelineEpoch,
            256,
        );
    const recordKind =
        boundedString(
            row.recordKind,
            64,
        );
    const recordId =
        boundedString(
            row.recordId,
            256,
        );
    const fieldPath =
        boundedString(
            row.fieldPath,
            256,
        );
    const sourceHash =
        boundedString(
            row.sourceHash,
            64,
        ).toLowerCase();
    const sourceLocale =
        boundedString(
            row.sourceLocale,
            16,
        );
    const targetLocale =
        boundedString(
            row.targetLocale,
            16,
        );
    const providerId =
        boundedString(
            row.providerId,
            32,
        );
    const translatorVersion =
        nonNegativeInteger(
            row.translatorVersion,
        );
    const glossaryVersion =
        nonNegativeInteger(
            row.glossaryVersion,
        );
    const status =
        boundedString(
            row.status,
            16,
        );
    const translatedText =
        String(
            row.translatedText || '',
        );
    const errorCode =
        boundedString(
            row.errorCode,
            128,
        );
    if (
        Number(row.schemaVersion) !==
            TRANSLATION_RECORD_SCHEMA_VERSION ||
        !expectedTimelineEpoch ||
        rowTimelineEpoch !==
            expectedTimelineEpoch ||
        !IDENTIFIER_PATTERN.test(
            recordKind,
        ) ||
        !recordId ||
        !fieldPath ||
        !SHA256_PATTERN.test(
            sourceHash,
        ) ||
        sourceLocale !== 'en' ||
        !TRANSLATION_TARGET_LOCALES
            .includes(targetLocale) ||
        !TRANSLATION_PROVIDERS
            .includes(providerId) ||
        translatorVersion === null ||
        glossaryVersion === null ||
        !TRANSLATION_RECORD_STATUSES
            .includes(status) ||
        translatedText.length >
            TRANSLATION_TABLE_LIMITS
                .maxTranslatedTextCharacters ||
        (
            status === 'ready' &&
            !translatedText.trim()
        ) ||
        (
            status === 'error' &&
            !errorCode
        )
    ) {
        return null;
    }
    const timestamp =
        nonNegativeInteger(now) ??
        Date.now();
    return {
        schemaVersion:
            TRANSLATION_RECORD_SCHEMA_VERSION,
        timelineEpoch:
            rowTimelineEpoch,
        recordKind,
        recordId,
        fieldPath,
        sourceHash,
        sourceLocale,
        targetLocale,
        providerId,
        translatorVersion,
        glossaryVersion,
        translatedText:
            status === 'ready'
                ? translatedText
                : '',
        status,
        updatedAt: timestamp,
        lastAccessedAt:
            nonNegativeInteger(
                row.lastAccessedAt,
            ) ??
            timestamp,
        errorCode:
            status === 'error'
                ? errorCode
                : '',
    };
}

export function isTranslationRowKey(value) {
    return SHA256_PATTERN.test(
        String(value || ''),
    );
}
