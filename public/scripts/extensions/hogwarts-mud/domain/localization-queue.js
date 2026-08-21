import {
    TRANSLATION_TABLE_LIMITS,
} from './localization-contract.js';

export const LOCALIZATION_QUEUE_VERSION = 1;

export const LOCALIZATION_PRIORITIES =
    Object.freeze({
        CURRENT_MESSAGE: 0,
        VISIBLE_CURRENT: 1,
        RECENT_CHANGED: 2,
        LATEST_ARCHIVE: 3,
        OLDER_ARCHIVE: 4,
    });

export const LOCALIZATION_PROVIDER_LIMITS =
    Object.freeze({
        local: 3600,
        google: 4700,
        bing: 900,
    });

function normalizeCandidate(
    candidate,
) {
    const key =
        String(
            candidate?.key ||
            '',
        ).trim();
    const sourceText =
        String(
            candidate?.sourceText ||
            '',
        ).trim();
    const sourceHash =
        String(
            candidate?.sourceHash ||
            '',
        ).trim();
    const priority =
        Number(
            candidate?.priority,
        );
    if (
        !key ||
        !sourceText ||
        !sourceHash ||
        !Number.isInteger(
            priority,
        ) ||
        priority < 0 ||
        priority > 4
    ) {
        throw new TypeError(
            'Invalid localization queue candidate.',
        );
    }
    return {
        ...candidate,
        key,
        sourceText,
        sourceHash,
        priority,
        status: 'pending',
        errorCode: '',
    };
}

export function createLocalizationQueue() {
    const byKey =
        new Map();
    let activeBatch = null;

    function enqueue(
        candidates,
    ) {
        for (const source of (
            candidates || []
        )) {
            const candidate =
                normalizeCandidate(
                    source,
                );
            const current =
                byKey.get(
                    candidate.key,
                );
            if (
                current &&
                current.sourceHash ===
                    candidate.sourceHash
            ) {
                current.priority =
                    Math.min(
                        current.priority,
                        candidate.priority,
                    );
                continue;
            }
            byKey.set(
                candidate.key,
                candidate,
            );
        }
    }

    function raisePriority(
        keys,
        priority,
    ) {
        for (const key of (
            keys || []
        )) {
            const candidate =
                byKey.get(key);
            if (candidate) {
                candidate.priority =
                    Math.min(
                        candidate.priority,
                        priority,
                    );
            }
        }
    }

    function selectBatch(
        providerId,
        allowedKeys = null,
    ) {
        if (activeBatch) {
            return [];
        }
        const allowedKeySet =
            allowedKeys === null
                ? null
                : new Set(
                    allowedKeys,
                );
        const limit =
            LOCALIZATION_PROVIDER_LIMITS[
                providerId
            ];
        if (!limit) {
            throw new TypeError(
                `Unsupported localization provider ${providerId || '?'}.`,
            );
        }
        const ordered = [
            ...byKey.values(),
        ]
            .filter(candidate =>
                candidate.status ===
                    'pending' &&
                (
                    allowedKeySet ===
                        null ||
                    allowedKeySet.has(
                        candidate.key,
                    )
                ))
            .sort((left, right) =>
                left.priority -
                    right.priority ||
                Number(
                    right.changedAt ||
                    0,
                ) -
                    Number(
                        left.changedAt ||
                        0,
                    ) ||
                left.key.localeCompare(
                    right.key,
                ));
        const batch = [];
        let characters = 0;
        for (const candidate of
            ordered) {
            if (
                batch.length >=
                TRANSLATION_TABLE_LIMITS
                    .maxUpsertRows
            ) {
                break;
            }
            if (
                batch.length &&
                characters +
                    candidate
                        .sourceText
                        .length >
                    limit
            ) {
                break;
            }
            if (
                candidate.sourceText
                    .length > limit
            ) {
                candidate.status =
                    'error';
                candidate.errorCode =
                    'SOURCE_TOO_LARGE';
                continue;
            }
            batch.push(candidate);
            characters +=
                candidate.sourceText
                    .length;
        }
        return batch.map(
            candidate => ({
                ...candidate,
            }),
        );
    }

    function nextBatch(
        providerId,
    ) {
        return selectBatch(
            providerId,
        );
    }

    function nextBatchForKeys(
        providerId,
        keys,
    ) {
        return selectBatch(
            providerId,
            keys || [],
        );
    }

    function beginBatch(
        candidates,
    ) {
        if (
            activeBatch ||
            !candidates?.length
        ) {
            return false;
        }
        activeBatch =
            candidates.map(
                candidate =>
                    candidate.key,
            );
        for (const key of
            activeBatch) {
            const candidate =
                byKey.get(key);
            if (candidate) {
                candidate.status =
                    'active';
            }
        }
        return true;
    }

    function completeBatch(
        keys,
    ) {
        for (const key of (
            keys || []
        )) {
            byKey.delete(key);
        }
        activeBatch = null;
    }

    function failBatch(
        keys,
        errorCode,
    ) {
        for (const key of (
            keys || []
        )) {
            const candidate =
                byKey.get(key);
            if (candidate) {
                candidate.status =
                    'error';
                candidate.errorCode =
                    String(
                        errorCode ||
                        'TRANSLATION_FAILED',
                    ).slice(0, 64);
            }
        }
        activeBatch = null;
    }

    function snapshot() {
        return {
            version:
                LOCALIZATION_QUEUE_VERSION,
            activeBatch:
                activeBatch
                    ? [...activeBatch]
                    : null,
            entries: [
                ...byKey.values(),
            ].map(candidate => ({
                ...candidate,
            })),
        };
    }

    return Object.freeze({
        enqueue,
        raisePriority,
        nextBatch,
        nextBatchForKeys,
        beginBatch,
        completeBatch,
        failBatch,
        snapshot,
    });
}
