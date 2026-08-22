import {
    SAVE_REVISION_VERSION,
    getSaveRevisionHead,
    hasWorldStateChanges,
    migrateSaveRevisionState,
    prepareSaveRevisionCommit,
} from '../domain/save-revision.js';

const CLAIM_PHASE_PENDING =
    'pending';
const CLAIM_PHASE_HOST_SAVE_STARTED =
    'host_save_started';

export class HostSaveDurabilityError extends Error {
    constructor(
        {
            acknowledgement,
            cause,
            confirmedFailure =
            false,
            source = 'unknown',
        } = {},
    ) {
        const causeMessage =
            cause?.message
                ? `: ${cause.message}`
                : '';
        super(
            `Host save durability was not acknowledged${causeMessage}`,
        );
        this.name =
            'HostSaveDurabilityError';
        this.code =
            'host_save_not_durable';
        this.source =
            String(source || 'unknown')
                .slice(0, 120);
        this.confirmedFailure =
            confirmedFailure === true;
        this.acknowledgement =
            acknowledgement ?? null;
        if (cause) {
            this.cause = cause;
        }
    }
}

function normalizeHead(value, timelineEpoch) {
    if (
        !value ||
        value.timelineEpoch !==
            timelineEpoch ||
        !Number.isSafeInteger(
            value.stateRevision,
        ) ||
        value.stateRevision < 0
    ) {
        return null;
    }
    const claimId =
        String(
            value.claimId || '',
        );
    const head = {
        saveRevisionVersion:
            SAVE_REVISION_VERSION,
        timelineEpoch,
        stateRevision:
            value.stateRevision,
        claimId,
    };
    if (claimId) {
        head.claimBaseRevision =
            Number.isSafeInteger(
                value
                    .claimBaseRevision,
            ) &&
            value.claimBaseRevision >= 0 &&
            value.claimBaseRevision <=
                value.stateRevision
                ? value
                    .claimBaseRevision
                : Math.max(
                    0,
                    value.stateRevision -
                        1,
                );
        head.claimPhase =
            value.claimPhase ===
                CLAIM_PHASE_HOST_SAVE_STARTED
                ? CLAIM_PHASE_HOST_SAVE_STARTED
                : CLAIM_PHASE_PENDING;
        head.claimFence =
            Number.isSafeInteger(
                value.claimFence,
            ) &&
            value.claimFence > 0
                ? value.claimFence
                : 0;
    }
    return head;
}

export function createSaveRevisionStorageAdapter(
    storage,
    {
        namespace = 'hogwartsMud.saveRevision',
        settleClaim = () =>
            new Promise(resolve =>
                setTimeout(resolve, 0)),
        now = () => Date.now(),
        leaseDurationMs = 30_000,
        heartbeatIntervalMs =
        Math.max(
            10,
            Math.floor(
                leaseDurationMs / 3,
            ),
        ),
        setIntervalFn =
        globalThis.setInterval
            ?.bind(globalThis),
        clearIntervalFn =
        globalThis.clearInterval
            ?.bind(globalThis),
    } = {},
) {
    if (
        typeof storage?.getItem !==
            'function' ||
        typeof storage?.setItem !==
            'function'
    ) {
        throw new TypeError(
            'A synchronous storage adapter is required.',
        );
    }

    const keyFor = timelineEpoch =>
        `${namespace}:${
            encodeURIComponent(
                timelineEpoch,
            )
        }`;
    const fenceKeyFor =
        timelineEpoch =>
            `${namespace}.fence:${
                encodeURIComponent(
                    timelineEpoch,
                )
            }`;
    const lockPrefixFor =
        timelineEpoch =>
            `${namespace}.mutex:${
                encodeURIComponent(
                    timelineEpoch,
                )
            }:`;
    const supportsMutex =
        typeof storage.key ===
            'function' &&
        typeof storage.removeItem ===
            'function' &&
        Number.isSafeInteger(
            storage.length,
        ) &&
        typeof setIntervalFn ===
            'function' &&
        typeof clearIntervalFn ===
            'function';
    if (
        !Number.isSafeInteger(
            leaseDurationMs,
        ) ||
        leaseDurationMs <= 0 ||
        !Number.isSafeInteger(
            heartbeatIntervalMs,
        ) ||
        heartbeatIntervalMs <= 0 ||
        heartbeatIntervalMs >=
            leaseDurationMs
    ) {
        throw new RangeError(
            'Storage mutex lease and heartbeat durations are invalid.',
        );
    }

    function currentTime() {
        const value =
            Number(now());
        if (!Number.isFinite(value)) {
            throw new TypeError(
                'Storage mutex clock must return a finite millisecond value.',
            );
        }
        return value;
    }

    function listKeys(prefix) {
        const keys = new Set();
        for (
            let pass = 0;
            pass < 3;
            pass += 1
        ) {
            const length =
                storage.length;
            for (
                let index = 0;
                index < length;
                index += 1
            ) {
                const key =
                    storage.key(index);
                if (
                    typeof key ===
                        'string' &&
                    key.startsWith(prefix)
                ) {
                    keys.add(key);
                }
            }
        }
        return [...keys];
    }

    function readMutexRecord(key) {
        const serialized =
            storage.getItem(key);
        if (!serialized) {
            return null;
        }
        try {
            const value =
                JSON.parse(serialized);
            if (
                typeof value
                    ?.claimId !==
                    'string' ||
                !value.claimId ||
                !Number.isFinite(
                    value.expiresAt,
                )
            ) {
                return null;
            }
            return value;
        } catch {
            return null;
        }
    }

    function readTickets(prefix) {
        return listKeys(
            `${prefix}ticket:`,
        ).flatMap(key => {
            const value =
                readMutexRecord(key);
            return (
                Number.isSafeInteger(
                    value?.ticket,
                ) &&
                value.ticket > 0
            )
                ? [value]
                : [];
        });
    }

    function readHead(timelineEpoch) {
        const serialized =
            storage.getItem(
                keyFor(
                    timelineEpoch,
                ),
            );
        if (!serialized) {
            return null;
        }
        try {
            return normalizeHead(
                JSON.parse(serialized),
                timelineEpoch,
            );
        } catch {
            return null;
        }
    }

    function headsMatch(
        first,
        second,
    ) {
        if (!first || !second) {
            return first === second;
        }
        return (
            first.timelineEpoch ===
                second.timelineEpoch &&
            first.stateRevision ===
                second.stateRevision &&
            first.claimId ===
                second.claimId &&
            (
                first.claimBaseRevision ??
                null
            ) ===
                (
                    second
                        .claimBaseRevision ??
                    null
                ) &&
            (
                first.claimPhase ??
                null
            ) ===
                (
                    second
                        .claimPhase ??
                    null
                ) &&
            (
                first.claimFence ??
                null
            ) ===
                (
                    second
                        .claimFence ??
                    null
                )
        );
    }

    function writeHead(
        head,
        {
            allowRevisionRollback =
            false,
        } = {},
    ) {
        const current =
            readHead(
                head.timelineEpoch,
            );
        if (
            current &&
            head.stateRevision <
                current.stateRevision &&
            !allowRevisionRollback
        ) {
            return false;
        }
        storage.setItem(
            keyFor(
                head.timelineEpoch,
            ),
            JSON.stringify(head),
        );
        return true;
    }

    function compareAndSwapHead(
        expected,
        next,
        options,
    ) {
        if (
            !headsMatch(
                readHead(
                    expected
                        .timelineEpoch,
                ),
                expected,
            )
        ) {
            return false;
        }
        if (
            !writeHead(
                next,
                options,
            )
        ) {
            return false;
        }
        return headsMatch(
            readHead(
                next.timelineEpoch,
            ),
            normalizeHead(
                next,
                next.timelineEpoch,
            ),
        );
    }

    function issueFenceToken(
        timelineEpoch,
    ) {
        const key =
            fenceKeyFor(
                timelineEpoch,
            );
        const current =
            Number(
                storage.getItem(
                    key,
                ),
            );
        const previous =
            Number.isSafeInteger(
                current,
            ) &&
            current >= 0
                ? current
                : 0;
        if (
            previous >=
            Number.MAX_SAFE_INTEGER
        ) {
            throw new RangeError(
                'Save revision fence token is exhausted.',
            );
        }
        const next =
            previous + 1;
        storage.setItem(
            key,
            String(next),
        );
        if (
            Number(
                storage.getItem(
                    key,
                ),
            ) !== next
        ) {
            throw new Error(
                'Save revision fence token allocation was lost.',
            );
        }
        return next;
    }

    function removeOwnedRecord(
        key,
        claimId,
    ) {
        const current =
            readMutexRecord(key);
        if (
            !current ||
            current.claimId ===
                claimId
        ) {
            storage.removeItem(key);
        }
    }

    function reconcileClaimedHead(
        timelineEpoch,
        hostHead = null,
    ) {
        const current =
            readHead(timelineEpoch);
        if (!current?.claimId) {
            return current;
        }
        const hostRevision =
            hostHead
                ?.timelineEpoch ===
                timelineEpoch &&
            Number.isSafeInteger(
                hostHead
                    ?.stateRevision,
            ) &&
            hostHead.stateRevision >= 0
                ? hostHead
                    .stateRevision
                : null;
        const prefix =
            lockPrefixFor(
                timelineEpoch,
            );
        const encodedClaimId =
            encodeURIComponent(
                current.claimId,
            );
        const choosingKey =
            `${prefix}choosing:${encodedClaimId}`;
        const ticketKey =
            `${prefix}ticket:${encodedClaimId}`;
        const ownerKey =
            `${prefix}owner`;
        const checkedAt =
            currentTime();
        const ticket =
            readMutexRecord(ticketKey);
        const owner =
            readMutexRecord(ownerKey);
        const validTicket =
            ticket?.claimId ===
                current.claimId &&
            Number.isSafeInteger(
                ticket.ticket,
            ) &&
            ticket.ticket > 0 &&
            ticket.expiresAt >
                checkedAt;
        const validOwner =
            owner?.claimId ===
                current.claimId &&
            Number.isSafeInteger(
                owner.ticket,
            ) &&
            owner.ticket > 0 &&
            owner.expiresAt >
                checkedAt;
        if (
            validTicket &&
            validOwner &&
            ticket.ticket ===
                owner.ticket
        ) {
            const choosing =
                readMutexRecord(
                    choosingKey,
                );
            if (
                !choosing ||
                choosing.expiresAt <=
                    checkedAt
            ) {
                removeOwnedRecord(
                    choosingKey,
                    current.claimId,
                );
            }
            return current;
        }
        for (
            const key of
            listKeys(prefix)
        ) {
            const record =
                readMutexRecord(key);
            let recordClaimId =
                record?.claimId || '';
            if (
                !recordClaimId &&
                (
                    key.startsWith(
                        `${prefix}choosing:`,
                    ) ||
                    key.startsWith(
                        `${prefix}ticket:`,
                    )
                )
            ) {
                try {
                    recordClaimId =
                        decodeURIComponent(
                            key.slice(
                                key.lastIndexOf(':') +
                                    1,
                            ),
                        );
                } catch {
                    recordClaimId = '';
                }
            }
            if (
                recordClaimId ===
                current.claimId
            ) {
                storage.removeItem(key);
            }
        }
        const latest =
            readHead(timelineEpoch);
        if (
            !headsMatch(
                latest,
                current,
            )
        ) {
            return latest;
        }
        if (
            current.claimPhase ===
                CLAIM_PHASE_HOST_SAVE_STARTED &&
            (
                hostRevision === null ||
                hostRevision <
                    current.stateRevision
            )
        ) {
            return current;
        }
        const recoveredRevision =
            Math.max(
                current
                    .claimBaseRevision,
                hostRevision ??
                    current
                        .claimBaseRevision,
            );
        const recoveredHead = {
            saveRevisionVersion:
                SAVE_REVISION_VERSION,
            timelineEpoch,
            stateRevision:
                recoveredRevision,
            claimId: '',
        };
        compareAndSwapHead(
            current,
            recoveredHead,
            {
                allowRevisionRollback:
                    current
                        .claimPhase ===
                    CLAIM_PHASE_PENDING,
            },
        );
        return readHead(
            timelineEpoch,
        );
    }

    function cleanupMutex(
        timelineEpoch,
        prefix,
        hostHead = null,
    ) {
        const expiresBefore =
            currentTime();
        for (
            const key of
            listKeys(prefix)
        ) {
            const record =
                readMutexRecord(key);
            if (
                record &&
                record.expiresAt >
                    expiresBefore
            ) {
                continue;
            }
            storage.removeItem(key);
        }
        reconcileClaimedHead(
            timelineEpoch,
            hostHead,
        );
    }

    async function runExclusive(
        timelineEpoch,
        claimId,
        operation,
    ) {
        if (!supportsMutex) {
            throw new TypeError(
                'Storage adapter lacks cross-page mutex capabilities: length, key, removeItem, and timers are required.',
            );
        }
        if (
            !claimId ||
            typeof operation !==
                'function'
        ) {
            throw new TypeError(
                'Storage mutex requires a unique claim ID and operation.',
            );
        }
        const prefix =
            lockPrefixFor(
                timelineEpoch,
            );
        const encodedClaimId =
            encodeURIComponent(
                claimId,
            );
        const choosingKey =
            `${prefix}choosing:${
                encodedClaimId
            }`;
        const ticketKey =
            `${prefix}ticket:${
                encodedClaimId
            }`;
        const ownerKey =
            `${prefix}owner`;
        cleanupMutex(
            timelineEpoch,
            prefix,
        );
        const choosingLease = {
            claimId,
            expiresAt:
                currentTime() +
                leaseDurationMs,
        };
        storage.setItem(
            choosingKey,
            JSON.stringify(
                choosingLease,
            ),
        );
        await settleClaim();
        const ticket =
            Math.max(
                0,
                ...readTickets(
                    prefix,
                ).map(value =>
                    value.ticket),
            ) + 1;
        storage.setItem(
            ticketKey,
            JSON.stringify({
                ticket,
                claimId,
                expiresAt:
                    currentTime() +
                    leaseDurationMs,
            }),
        );
        removeOwnedRecord(
            choosingKey,
            claimId,
        );
        await settleClaim();
        let leaseLost = false;
        let ownerClaimed = false;
        let heartbeat = null;

        const renewLease = () => {
            if (leaseLost) {
                return false;
            }
            const current =
                readMutexRecord(
                    ticketKey,
                );
            const renewedAt =
                currentTime();
            if (
                current?.claimId !==
                    claimId ||
                current.ticket !==
                    ticket ||
                current.expiresAt <=
                    renewedAt
            ) {
                leaseLost = true;
                return false;
            }
            storage.setItem(
                ticketKey,
                JSON.stringify({
                    ticket,
                    claimId,
                    expiresAt:
                        renewedAt +
                        leaseDurationMs,
                }),
            );
            const verified =
                readMutexRecord(
                    ticketKey,
                );
            if (
                verified?.claimId !==
                    claimId ||
                verified.ticket !==
                    ticket ||
                verified.expiresAt <=
                    renewedAt
            ) {
                leaseLost = true;
                return false;
            }
            if (ownerClaimed) {
                const owner =
                    readMutexRecord(
                        ownerKey,
                    );
                if (
                    owner?.claimId !==
                        claimId ||
                    owner.ticket !==
                        ticket ||
                    owner.expiresAt <=
                        renewedAt
                ) {
                    leaseLost = true;
                    return false;
                }
                storage.setItem(
                    ownerKey,
                    JSON.stringify({
                        ticket,
                        claimId,
                        expiresAt:
                            renewedAt +
                            leaseDurationMs,
                    }),
                );
            }
            return true;
        };
        try {
            heartbeat =
                setIntervalFn(
                    renewLease,
                    heartbeatIntervalMs,
                );
            heartbeat?.unref?.();
            let clearPasses = 0;
            while (true) {
                cleanupMutex(
                    timelineEpoch,
                    prefix,
                );
                if (!renewLease()) {
                    throw new Error(
                        'Storage mutex lease was lost before the operation started.',
                    );
                }
                const choosing =
                    listKeys(
                        `${prefix}choosing:`,
                    ).some(key => {
                        const value =
                            readMutexRecord(
                                key,
                            );
                        return (
                            value &&
                            value.claimId !==
                                claimId
                        );
                    });
                const precedes =
                    readTickets(
                        prefix,
                    ).some(value =>
                        value.claimId !==
                            claimId &&
                        (
                            value.ticket <
                                ticket ||
                            (
                                value.ticket ===
                                    ticket &&
                                value.claimId <
                                    claimId
                            )
                        ));
                if (
                    !choosing &&
                    !precedes
                ) {
                    clearPasses += 1;
                    if (
                        clearPasses >= 2
                    ) {
                        break;
                    }
                } else {
                    clearPasses = 0;
                }
                await settleClaim();
            }
            while (!ownerClaimed) {
                cleanupMutex(
                    timelineEpoch,
                    prefix,
                );
                if (!renewLease()) {
                    throw new Error(
                        'Storage mutex lease was lost before final ownership confirmation.',
                    );
                }
                const owner =
                    readMutexRecord(
                        ownerKey,
                    );
                if (
                    owner &&
                    owner.claimId !==
                        claimId
                ) {
                    await settleClaim();
                    continue;
                }
                storage.setItem(
                    ownerKey,
                    JSON.stringify({
                        ticket,
                        claimId,
                        expiresAt:
                            currentTime() +
                            leaseDurationMs,
                    }),
                );
                await settleClaim();
                const firstConfirmation =
                    readMutexRecord(
                        ownerKey,
                    );
                if (
                    firstConfirmation
                        ?.claimId !==
                        claimId ||
                    firstConfirmation
                        .ticket !==
                        ticket
                ) {
                    await settleClaim();
                    continue;
                }
                await settleClaim();
                const finalConfirmation =
                    readMutexRecord(
                        ownerKey,
                    );
                ownerClaimed =
                    finalConfirmation
                        ?.claimId ===
                        claimId &&
                    finalConfirmation
                        .ticket ===
                        ticket;
            }
            if (!renewLease()) {
                throw new Error(
                    'Storage mutex lease was lost before the operation started.',
                );
            }
            const fenceToken =
                issueFenceToken(
                    timelineEpoch,
                );
            const lease =
                Object.freeze({
                    claimId,
                    ticket,
                    fenceToken,
                    assertOwned:
                        renewLease,
                });
            return await operation(
                lease,
            );
        } finally {
            if (heartbeat !== null) {
                clearIntervalFn(
                    heartbeat,
                );
            }
            removeOwnedRecord(
                ticketKey,
                claimId,
            );
            removeOwnedRecord(
                choosingKey,
                claimId,
            );
            removeOwnedRecord(
                ownerKey,
                claimId,
            );
        }
    }

    function registerHead(head) {
        const current =
            readHead(
                head.timelineEpoch,
            );
        if (
            current &&
            (
                current.claimId ||
                current.stateRevision >=
                    head.stateRevision
            )
        ) {
            return current;
        }
        const registered = {
            ...head,
            claimId: '',
        };
        writeHead(registered);
        return (
            readHead(
                head.timelineEpoch,
            ) ||
            registered
        );
    }

    function recoverHead(hostHead) {
        const prefix =
            lockPrefixFor(
                hostHead.timelineEpoch,
            );
        cleanupMutex(
            hostHead.timelineEpoch,
            prefix,
            hostHead,
        );
        return registerHead(hostHead);
    }

    function hasLiveClaimMutex(
        timelineEpoch,
        claimId,
    ) {
        const prefix =
            lockPrefixFor(
                timelineEpoch,
            );
        const encodedClaimId =
            encodeURIComponent(claimId);
        const ticket =
            readMutexRecord(
                `${prefix}ticket:${encodedClaimId}`,
            );
        const owner =
            readMutexRecord(
                `${prefix}owner`,
            );
        const checkedAt =
            currentTime();
        return Boolean(
            ticket?.claimId === claimId &&
            owner?.claimId === claimId &&
            Number.isSafeInteger(ticket.ticket) &&
            ticket.ticket > 0 &&
            owner.ticket === ticket.ticket &&
            ticket.expiresAt > checkedAt &&
            owner.expiresAt > checkedAt,
        );
    }

    function replaceHead(hostHead) {
        const current =
            readHead(
                hostHead.timelineEpoch,
            );
        if (
            current?.claimId &&
            (
                current.claimPhase !==
                    CLAIM_PHASE_HOST_SAVE_STARTED ||
                hasLiveClaimMutex(
                    hostHead.timelineEpoch,
                    current.claimId,
                )
            )
        ) {
            return current;
        }
        const replacement = {
            ...hostHead,
            claimId: '',
        };
        writeHead(
            replacement,
            {
                allowRevisionRollback:
                    true,
            },
        );
        return (
            readHead(
                hostHead.timelineEpoch,
            ) ||
            replacement
        );
    }

    async function claimHead(
        head,
        nextRevision,
        claimId,
        fenceToken,
    ) {
        const current =
            readHead(
                head.timelineEpoch,
            );
        if (
            !current ||
            current.claimId ||
            current.stateRevision !==
                head.stateRevision
        ) {
            return false;
        }
        const resolvedFence =
            Number.isSafeInteger(
                fenceToken,
            ) &&
            fenceToken > 0
                ? fenceToken
                : issueFenceToken(
                    head.timelineEpoch,
                );
        const claimed = {
            ...head,
            stateRevision:
                nextRevision,
            claimId,
            claimBaseRevision:
                head.stateRevision,
            claimPhase:
                CLAIM_PHASE_PENDING,
            claimFence:
                resolvedFence,
        };
        if (
            !compareAndSwapHead(
                current,
                claimed,
            )
        ) {
            return false;
        }
        await settleClaim();
        const verified =
            readHead(
                head.timelineEpoch,
            );
        return Boolean(
            verified &&
            verified.stateRevision ===
                nextRevision &&
            verified.claimId ===
                claimId &&
            verified.claimPhase ===
                CLAIM_PHASE_PENDING &&
            verified.claimFence ===
                resolvedFence,
        );
    }

    async function beginHostSave(
        timelineEpoch,
        revision,
        claimId,
        fenceToken,
    ) {
        const current =
            readHead(
                timelineEpoch,
            );
        const expectedFence =
            Number.isSafeInteger(
                fenceToken,
            ) &&
            fenceToken > 0
                ? fenceToken
                : current
                    ?.claimFence;
        if (
            current?.stateRevision !==
                revision ||
            current.claimId !==
                claimId ||
            current.claimPhase !==
                CLAIM_PHASE_PENDING ||
            current.claimFence !==
                expectedFence
        ) {
            return false;
        }
        const hostSaveHead = {
            ...current,
            claimPhase:
                CLAIM_PHASE_HOST_SAVE_STARTED,
        };
        if (
            !compareAndSwapHead(
                current,
                hostSaveHead,
            )
        ) {
            return false;
        }
        await settleClaim();
        const entered =
            readHead(
                timelineEpoch,
            );
        return Boolean(
            entered
                ?.stateRevision ===
                revision &&
            entered.claimId ===
                claimId &&
            entered.claimPhase ===
                CLAIM_PHASE_HOST_SAVE_STARTED &&
            entered.claimFence ===
                expectedFence,
        );
    }

    function finalizeHead(
        timelineEpoch,
        revision,
        claimId,
        fenceToken,
    ) {
        const current =
            readHead(
                timelineEpoch,
            );
        const expectedFence =
            Number.isSafeInteger(
                fenceToken,
            ) &&
            fenceToken > 0
                ? fenceToken
                : current
                    ?.claimFence;
        if (
            current?.stateRevision !==
                revision ||
            current.claimId !==
                claimId ||
            current.claimPhase !==
                CLAIM_PHASE_HOST_SAVE_STARTED ||
            current.claimFence !==
                expectedFence
        ) {
            return false;
        }
        const finalizedHead = {
            saveRevisionVersion:
                SAVE_REVISION_VERSION,
            timelineEpoch,
            stateRevision:
                revision,
            claimId: '',
        };
        return compareAndSwapHead(
            current,
            finalizedHead,
        );
    }

    function restoreHead(
        previousHead,
        claimedRevision,
        claimId,
        fenceToken,
    ) {
        const current =
            readHead(
                previousHead
                    .timelineEpoch,
            );
        const expectedFence =
            Number.isSafeInteger(
                fenceToken,
            ) &&
            fenceToken > 0
                ? fenceToken
                : current
                    ?.claimFence;
        if (
            current?.stateRevision !==
                claimedRevision ||
            current.claimId !==
                claimId ||
            current.claimPhase !==
                CLAIM_PHASE_PENDING ||
            current.claimFence !==
                expectedFence
        ) {
            return false;
        }
        return compareAndSwapHead(
            current,
            {
                ...previousHead,
                claimId: '',
            },
            {
                allowRevisionRollback:
                    true,
            },
        );
    }

    function rejectHostSave(
        previousHead,
        claimedRevision,
        claimId,
        fenceToken,
    ) {
        const current =
            readHead(
                previousHead
                    .timelineEpoch,
            );
        const expectedFence =
            Number.isSafeInteger(
                fenceToken,
            ) &&
            fenceToken > 0
                ? fenceToken
                : current
                    ?.claimFence;
        if (
            current?.stateRevision !==
                claimedRevision ||
            current.claimId !==
                claimId ||
            current.claimPhase !==
                CLAIM_PHASE_HOST_SAVE_STARTED ||
            current.claimFence !==
                expectedFence
        ) {
            return false;
        }
        return compareAndSwapHead(
            current,
            {
                ...previousHead,
                claimId: '',
            },
            {
                allowRevisionRollback:
                    true,
            },
        );
    }

    return {
        readHead,
        beginHostSave,
        recoverHead,
        replaceHead,
        registerHead,
        claimHead,
        finalizeHead,
        rejectHostSave,
        restoreHead,
        runExclusive,
    };
}

function defaultClaimId() {
    if (
        typeof globalThis.crypto
            ?.randomUUID ===
        'function'
    ) {
        return globalThis.crypto
            .randomUUID();
    }
    throw new Error(
        'Secure randomness is required to claim a save revision.',
    );
}

function makeConflict(
    {
        timelineEpoch,
        expectedRevision,
        actualRevision,
        source,
        code = 'stale_save',
    },
) {
    return {
        code,
        timelineEpoch,
        expectedRevision,
        actualRevision,
        source:
            String(
                source || 'unknown',
            ).slice(0, 120),
        recoverable: true,
    };
}

export function createSaveRevisionGuard(
    {
        storageAdapter,
        storage = globalThis.localStorage,
        lockManager = globalThis.navigator?.locks,
        now = () =>
            new Date()
                .toISOString(),
        createClaimId = defaultClaimId,
        onDiagnostic = () => {},
    } = {},
) {
    const heads =
        storageAdapter ||
        createSaveRevisionStorageAdapter(
            storage,
        );

    function registerHead(worldState) {
        const head =
            getSaveRevisionHead(
                worldState,
            );
        if (!head) {
            throw new TypeError(
                'World state is required to register a revision head.',
            );
        }
        if (
            typeof heads.recoverHead ===
                'function'
        ) {
            return heads.recoverHead(
                head,
            );
        }
        return heads.registerHead(
            head,
        );
    }

    async function recoverHead(worldState) {
        const head =
            getSaveRevisionHead(
                worldState,
            );
        if (!head) {
            throw new TypeError(
                'World state is required to recover a revision head.',
            );
        }
        if (
            typeof heads.recoverHead ===
                'function'
        ) {
            return heads.recoverHead(
                head,
            );
        }
        return heads.registerHead(
            head,
        );
    }

    async function replaceHead(worldState) {
        const head =
            getSaveRevisionHead(
                worldState,
            );
        if (!head) {
            throw new TypeError(
                'World state is required to replace a revision head.',
            );
        }
        if (
            typeof heads.replaceHead ===
                'function'
        ) {
            return heads.replaceHead(
                head,
            );
        }
        return heads.registerHead(
            head,
        );
    }

    async function runExclusive(
        timelineEpoch,
        claimId,
        operation,
    ) {
        if (
            typeof lockManager
                ?.request ===
            'function'
        ) {
            return lockManager.request(
                `hogwartsMud.saveRevision:${
                    timelineEpoch
                }`,
                {
                    mode: 'exclusive',
                },
                () => {
                    if (
                        typeof heads
                            .runExclusive ===
                        'function'
                    ) {
                        return heads
                            .runExclusive(
                                timelineEpoch,
                                claimId,
                                operation,
                            );
                    }
                    return operation({
                        claimId,
                        ticket: 0,
                        assertOwned:
                            () => true,
                    });
                },
            );
        }
        if (
            typeof heads
                .runExclusive ===
            'function'
        ) {
            return heads.runExclusive(
                timelineEpoch,
                claimId,
                operation,
            );
        }
        throw new TypeError(
            'Save revision fallback requires a cross-page mutual exclusion adapter.',
        );
    }

    function rejectConflict(details) {
        const conflict =
            makeConflict(details);
        onDiagnostic(conflict);
        return {
            ok: false,
            status:
                conflict.code,
            conflict,
        };
    }

    async function guardedSave(
        {
            currentState,
            nextState = currentState,
            source = 'unknown',
            kind = 'metadata',
            save,
            timelineKey = '',
            changedDomains = [],
            consumeRevision = false,
        },
    ) {
        if (
            typeof save !==
            'function'
        ) {
            throw new TypeError(
                'Guarded save requires a save callback.',
            );
        }
        const current =
            migrateSaveRevisionState(
                currentState,
                {
                    timelineKey,
                },
            ).state;
        if (!current) {
            throw new TypeError(
                'Guarded save requires a current world state.',
            );
        }
        const claimId =
            String(
                createClaimId(),
            );
        return runExclusive(
            current.timelineEpoch,
            claimId,
            async mutex => {
                if (
                    typeof mutex
                        ?.assertOwned !==
                    'function'
                ) {
                    throw new TypeError(
                        'Save revision mutex must expose ownership confirmation.',
                    );
                }
                const expectedHead =
                    getSaveRevisionHead(
                        current,
                    );
                let actualHead =
                    heads.readHead(
                        current
                            .timelineEpoch,
                    );
                if (!actualHead) {
                    actualHead =
                        heads.registerHead(
                            expectedHead,
                        );
                }
                if (
                    actualHead
                        .stateRevision !==
                    expectedHead
                        .stateRevision
                ) {
                    return rejectConflict({
                        timelineEpoch:
                            current
                                .timelineEpoch,
                        expectedRevision:
                            expectedHead
                                .stateRevision,
                        actualRevision:
                            actualHead
                                .stateRevision,
                        source,
                    });
                }
                if (actualHead.claimId) {
                    return rejectConflict({
                        timelineEpoch:
                            current
                                .timelineEpoch,
                        expectedRevision:
                            expectedHead
                                .stateRevision,
                        actualRevision:
                            actualHead
                                .stateRevision,
                        source,
                        code:
                            'save_in_progress',
                    });
                }
                if (
                    kind ===
                        'chat-only' &&
                    hasWorldStateChanges(
                        current,
                        nextState,
                    )
                ) {
                    throw new Error(
                        'Chat-only save cannot include world state changes.',
                    );
                }
                const prepared =
                    prepareSaveRevisionCommit({
                        currentState:
                            current,
                        nextState,
                        source,
                        committedAt:
                            now(),
                        timelineKey,
                        changedDomains,
                        forceCommit:
                            consumeRevision,
                    });
                if (
                    kind ===
                    'chat-only'
                ) {
                    prepared.changed =
                        false;
                    prepared.entry =
                        null;
                    prepared.state
                        .stateRevision =
                        current
                            .stateRevision;
                    prepared.state
                        .revisionHistory =
                        current
                            .revisionHistory;
                }
                const nextRevision =
                    prepared.changed
                        ? prepared.state
                            .stateRevision
                        : expectedHead
                            .stateRevision;
                const claimed =
                    await heads
                        .claimHead(
                            expectedHead,
                            nextRevision,
                            claimId,
                            mutex
                                .fenceToken,
                        );
                if (!claimed) {
                    actualHead =
                        heads.readHead(
                            current
                                .timelineEpoch,
                        ) ||
                        expectedHead;
                    return rejectConflict({
                        timelineEpoch:
                            current
                                .timelineEpoch,
                        expectedRevision:
                            expectedHead
                                .stateRevision,
                        actualRevision:
                            actualHead
                                .stateRevision,
                        source,
                        code:
                            actualHead
                                .claimId
                                ? 'save_in_progress'
                                : 'stale_save',
                    });
                }
                if (!mutex.assertOwned()) {
                    actualHead =
                        heads.readHead(
                            current
                                .timelineEpoch,
                        ) ||
                        expectedHead;
                    return rejectConflict({
                        timelineEpoch:
                            current
                                .timelineEpoch,
                        expectedRevision:
                            expectedHead
                                .stateRevision,
                        actualRevision:
                            actualHead
                                .stateRevision,
                        source,
                        code:
                            'save_claim_lost',
                    });
                }
                if (
                    typeof heads
                        .beginHostSave !==
                    'function'
                ) {
                    throw new TypeError(
                        'Save revision storage requires a persistent host-save fence.',
                    );
                }
                const enteredHostSave =
                    await heads
                        .beginHostSave(
                            current
                                .timelineEpoch,
                            nextRevision,
                            claimId,
                            mutex
                                .fenceToken,
                        );
                if (!enteredHostSave) {
                    actualHead =
                        heads.readHead(
                            current
                                .timelineEpoch,
                        ) ||
                        expectedHead;
                    return rejectConflict({
                        timelineEpoch:
                            current
                                .timelineEpoch,
                        expectedRevision:
                            expectedHead
                                .stateRevision,
                        actualRevision:
                            actualHead
                                .stateRevision,
                        source,
                        code:
                            'save_claim_lost',
                    });
                }
                try {
                    const acknowledgement =
                        await save(
                            prepared.state,
                            {
                                revisionChanged:
                                    prepared
                                        .changed,
                                entry:
                                    prepared
                                        .entry,
                            },
                        );
                    if (
                        acknowledgement
                            ?.durable !==
                        true
                    ) {
                        const confirmedFailure =
                            acknowledgement
                                ?.durable ===
                                false &&
                            acknowledgement
                                ?.confirmedFailure ===
                                true;
                        if (
                            confirmedFailure
                        ) {
                            if (
                                typeof heads
                                    .rejectHostSave !==
                                'function'
                            ) {
                                throw new TypeError(
                                    'Save revision storage requires explicit host-save rejection support.',
                                );
                            }
                            const rejected =
                                heads
                                    .rejectHostSave(
                                        expectedHead,
                                        nextRevision,
                                        claimId,
                                        mutex
                                            .fenceToken,
                                    );
                            if (!rejected) {
                                actualHead =
                                    heads
                                        .readHead(
                                            current
                                                .timelineEpoch,
                                        ) ||
                                    expectedHead;
                                return rejectConflict({
                                    timelineEpoch:
                                        current
                                            .timelineEpoch,
                                    expectedRevision:
                                        expectedHead
                                            .stateRevision,
                                    actualRevision:
                                        actualHead
                                            .stateRevision,
                                    source,
                                    code:
                                        'save_claim_lost',
                                });
                            }
                        }
                        throw new HostSaveDurabilityError({
                            acknowledgement,
                            confirmedFailure,
                            source,
                        });
                    }
                    const finalized =
                        heads.finalizeHead(
                            current
                                .timelineEpoch,
                            nextRevision,
                            claimId,
                            mutex
                                .fenceToken,
                        );
                    if (
                        !finalized
                    ) {
                        actualHead =
                            heads.readHead(
                                current
                                    .timelineEpoch,
                            ) ||
                            expectedHead;
                        return rejectConflict({
                            timelineEpoch:
                                current
                                    .timelineEpoch,
                            expectedRevision:
                                expectedHead
                                    .stateRevision,
                            actualRevision:
                                actualHead
                                    .stateRevision,
                            source,
                            code:
                                'save_claim_lost',
                        });
                    }
                    return {
                        ok: true,
                        status: 'saved',
                        state:
                            prepared.state,
                        entry:
                            prepared.entry,
                        value:
                            acknowledgement
                                .value,
                    };
                } catch (error) {
                    if (
                        error instanceof
                        HostSaveDurabilityError
                    ) {
                        throw error;
                    }
                    throw new HostSaveDurabilityError({
                        cause: error,
                        confirmedFailure:
                            false,
                        source,
                    });
                }
            },
        );
    }

    return {
        registerHead,
        recoverHead,
        replaceHead,
        guardedSave,
    };
}
