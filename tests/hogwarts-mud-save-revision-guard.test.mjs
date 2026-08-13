/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
    MAX_IDENTITY_CHANGES,
    MAX_ITEM_CHANGES,
    MAX_REVISION_HISTORY,
    buildSaveRevisionDiff,
    createNewSaveRevisionState,
    migrateSaveRevisionState,
    prepareSaveRevisionCommit,
} from '../public/scripts/extensions/hogwarts-mud/domain/save-revision.js';
import {
    createSaveRevisionGuard,
    createSaveRevisionStorageAdapter,
} from '../public/scripts/extensions/hogwarts-mud/runtime/save-revision-guard.js';

function createStorage() {
    const values = new Map();
    return {
        get length() {
            return values.size;
        },
        key(index) {
            return [
                ...values.keys(),
            ][index] ?? null;
        },
        getItem(key) {
            return values.get(key) ?? null;
        },
        setItem(key, value) {
            values.set(key, String(value));
        },
        removeItem(key) {
            values.delete(key);
        },
        keys() {
            return [
                ...values.keys(),
            ];
        },
    };
}

function createInterleavedStorageHarness() {
    const values = new Map();
    let interleave = null;
    let pageAReads = 0;
    return {
        storageFor: page => ({
            get length() {
                return values.size;
            },
            key(index) {
                return [
                    ...values.keys(),
                ][index] ?? null;
            },
            getItem(key) {
                const value =
                    values.get(key) ??
                    null;
                if (
                    page === 'a' &&
                    interleave &&
                    (pageAReads += 1) === 2
                ) {
                    const operation =
                        interleave;
                    interleave = null;
                    operation();
                }
                return value;
            },
            setItem(key, value) {
                values.set(
                    key,
                    String(value),
                );
            },
            removeItem(key) {
                values.delete(key);
            },
        }),
        arm(operation) {
            interleave =
                operation;
        },
        keys() {
            return [
                ...values.keys(),
            ];
        },
    };
}

function durable(value) {
    return {
        durable: true,
        value,
    };
}

function createItem(
    id = 'borrowed_quill',
    {
        holderId = 'player',
        state = 'intact',
    } = {},
) {
    return {
        id,
        labelEn: 'Private narrative label',
        ownerId: 'canon_harry_james_potter',
        holderId,
        location: {
            mapId: 'hogwarts_castle',
            roomId: 'charms_classroom',
            placement: 'with_holder',
        },
        state,
        secretNote: 'must not enter revision history',
    };
}

function createState(
    {
        revision = 0,
        clock = '1991-09-02 · 11:30',
        holderId = 'player',
        history = [],
        timelineEpoch =
        'timeline_test',
    } = {},
) {
    return {
        saveRevisionVersion: 1,
        timelineEpoch,
        stateRevision: revision,
        revisionHistory: history,
        clock,
        items: [
            createItem(
                'borrowed_quill',
                {
                    holderId,
                },
            ),
        ],
        actorLibrary: [{
            id: 'canon_harry_james_potter',
            privateGoal: 'not revision history',
            identity: {
                version: 1,
                gender: {
                    code: 'male',
                    label: '男',
                },
                birth: {
                    date: '1980-07-31',
                    year: null,
                    precision: 'exact',
                },
                education: [],
                lineage: {
                    status: 'half_blood',
                },
                body: {
                    hairColor: 'black',
                    injuries: [],
                },
                provenance: {
                    source: 'book',
                    secretToken: 'must not enter revision history',
                },
            },
        }],
    };
}

function createHistoryEntry(revision) {
    return {
        id: `revision_${revision}`,
        baseRevision: revision - 1,
        revision,
        source: 'test',
        committedAt: '1991-09-02T11:30:00.000Z',
        changedDomains: ['world'],
        itemChanges: [],
        identityChanges: [],
    };
}

test('legacy revision migration is deterministic and byte-stable', () => {
    const legacy = {
        clock: '1991-09-01 · 08:00',
        character: {
            identity: {
                name: 'Tina Zhang',
            },
        },
        items: [],
        actorLibrary: [],
    };
    const first = migrateSaveRevisionState(
        legacy,
        {
            timelineKey: 'tina-chat',
        },
    );
    const repeated = migrateSaveRevisionState(
        first.state,
        {
            timelineKey: 'tina-chat',
        },
    );
    const otherTimeline = migrateSaveRevisionState(
        legacy,
        {
            timelineKey: 'other-chat',
        },
    );

    assert.equal(first.changed, true);
    assert.equal(first.state.saveRevisionVersion, 1);
    assert.match(first.state.timelineEpoch, /^legacy_[a-f0-9]{16}$/u);
    assert.equal(first.state.stateRevision, 0);
    assert.deepEqual(first.state.revisionHistory, []);
    assert.equal(repeated.changed, false);
    assert.equal(
        JSON.stringify(repeated.state),
        JSON.stringify(first.state),
    );
    assert.notEqual(
        otherTimeline.state.timelineEpoch,
        first.state.timelineEpoch,
    );

    const firstNew = createNewSaveRevisionState({
        epochFactory: () => 'timeline_new_a',
    });
    const secondNew = createNewSaveRevisionState({
        epochFactory: () => 'timeline_new_b',
    });
    assert.equal(firstNew.stateRevision, 0);
    assert.notEqual(
        firstNew.timelineEpoch,
        secondNew.timelineEpoch,
    );
});

test('revision diff stores bounded Item and Identity fields without secrets', () => {
    const before = createState();
    const after = structuredClone(before);
    after.items[0].holderId =
        'canon_hermione_jean_granger';
    after.items[0].location.roomId =
        'library';
    after.items[0].state = 'damaged';
    after.actorLibrary[0].identity.body.hairColor =
        'green';
    after.actorLibrary[0].identity.provenance.secretToken =
        'changed secret';

    const diff = buildSaveRevisionDiff(
        before,
        after,
    );
    assert.deepEqual(
        diff.itemChanges,
        [{
            itemId: 'borrowed_quill',
            before: {
                ownerId: 'canon_harry_james_potter',
                holderId: 'player',
                location: {
                    mapId: 'hogwarts_castle',
                    roomId: 'charms_classroom',
                    placement: 'with_holder',
                },
                state: 'intact',
            },
            after: {
                ownerId: 'canon_harry_james_potter',
                holderId: 'canon_hermione_jean_granger',
                location: {
                    mapId: 'hogwarts_castle',
                    roomId: 'library',
                    placement: 'with_holder',
                },
                state: 'damaged',
            },
        }],
    );
    assert.deepEqual(
        diff.identityChanges,
        [{
            actorId: 'canon_harry_james_potter',
            fieldPath: 'body.hairColor',
            before: 'black',
            after: 'green',
        }],
    );
    assert.doesNotMatch(
        JSON.stringify(diff),
        /Private narrative label|secret|privateGoal/u,
    );

    const largeBefore = createState();
    largeBefore.items = Array.from(
        {
            length: MAX_ITEM_CHANGES + 8,
        },
        (_, index) =>
            createItem(`item_${index}`),
    );
    largeBefore.actorLibrary = Array.from(
        {
            length: MAX_IDENTITY_CHANGES + 8,
        },
        (_, index) => ({
            id: `actor_${index}`,
            identity: {
                version: 1,
                body: {
                    hairColor: 'black',
                },
            },
        }),
    );
    const largeAfter =
        structuredClone(largeBefore);
    largeAfter.items.forEach(item => {
        item.holderId = 'npc';
    });
    largeAfter.actorLibrary.forEach(actor => {
        actor.identity.body.hairColor = 'green';
    });
    const bounded = buildSaveRevisionDiff(
        largeBefore,
        largeAfter,
    );
    assert.equal(
        bounded.itemChanges.length,
        MAX_ITEM_CHANGES,
    );
    assert.equal(
        bounded.identityChanges.length,
        MAX_IDENTITY_CHANGES,
    );
});

test('revision Identity diff tracks exact-to-year Birth changes without legacy range paths', () => {
    const before = createState();
    const after =
        structuredClone(before);
    after.actorLibrary[0]
        .identity.birth = {
            date: '',
            year: 1980,
            precision: 'year',
        };

    const diff =
        buildSaveRevisionDiff(
            before,
            after,
        );
    assert.deepEqual(
        diff.identityChanges,
        [{
            actorId:
                'canon_harry_james_potter',
            fieldPath:
                'birth.date',
            before: '1980-07-31',
            after: '',
        }, {
            actorId:
                'canon_harry_james_potter',
            fieldPath:
                'birth.precision',
            before: 'exact',
            after: 'year',
        }, {
            actorId:
                'canon_harry_james_potter',
            fieldPath:
                'birth.year',
            before: null,
            after: 1980,
        }],
    );
    assert.doesNotMatch(
        JSON.stringify(
            diff.identityChanges,
        ),
        /range|earliest|latest/u,
    );
});

test('rollback commits above the current revision and history stays bounded', () => {
    const current = createState({
        revision: 20,
        holderId: 'canon_harry_james_potter',
        history: [
            createHistoryEntry(20),
        ],
    });
    const olderStoryState = createState({
        revision: 4,
        clock: '1991-09-01 · 18:00',
        holderId: 'player',
        history: [],
    });
    const rollback = prepareSaveRevisionCommit({
        currentState: current,
        nextState: olderStoryState,
        source: 'rollback',
        committedAt: '1991-09-02T12:00:00.000Z',
    });

    assert.equal(rollback.changed, true);
    assert.equal(rollback.state.timelineEpoch, 'timeline_test');
    assert.equal(rollback.state.stateRevision, 21);
    assert.equal(rollback.entry.baseRevision, 20);
    assert.equal(rollback.entry.revision, 21);
    assert.equal(rollback.entry.source, 'rollback');
    assert.equal(
        rollback.state.revisionHistory.at(-1).revision,
        21,
    );

    let state = createState();
    for (
        let revision = 1;
        revision <= MAX_REVISION_HISTORY + 5;
        revision += 1
    ) {
        const next = structuredClone(state);
        next.clock = `1991-09-02 · 12:${
            String(revision).padStart(2, '0')
        }`;
        state = prepareSaveRevisionCommit({
            currentState: state,
            nextState: next,
            source: 'turn',
            committedAt: '1991-09-02T12:00:00.000Z',
        }).state;
    }
    assert.equal(
        state.revisionHistory.length,
        MAX_REVISION_HISTORY,
    );
    assert.equal(
        state.revisionHistory.at(-1).revision,
        MAX_REVISION_HISTORY + 5,
    );
});

test('Web Locks guard rejects a stale page without invoking its save', async () => {
    const storage = createStorage();
    const lockCalls = [];
    const diagnostics = [];
    const lockManager = {
        request(name, options, operation) {
            lockCalls.push({
                name,
                options,
            });
            return operation();
        },
    };
    let claim = 0;
    const guard = createSaveRevisionGuard({
        storage,
        lockManager,
        createClaimId: () => `claim_${claim += 1}`,
        now: () => '1991-09-02T12:00:00.000Z',
        onDiagnostic: diagnostic =>
            diagnostics.push(diagnostic),
    });
    const pageA = createState({
        revision: 12,
    });
    const pageB = structuredClone(pageA);
    guard.registerHead(pageA);

    const nextA = structuredClone(pageA);
    nextA.clock = '1991-09-02 · 11:45';
    let savedA;
    const resultA = await guard.guardedSave({
        currentState: pageA,
        nextState: nextA,
        source: 'turn',
        save: state => {
            savedA = state;
            return durable();
        },
    });
    let pageBSaveCalls = 0;
    const nextB = structuredClone(pageB);
    nextB.clock = '1991-09-02 · 11:50';
    const resultB = await guard.guardedSave({
        currentState: pageB,
        nextState: nextB,
        source: 'translation',
        save: () => {
            pageBSaveCalls += 1;
        },
    });

    assert.equal(resultA.ok, true);
    assert.equal(savedA.stateRevision, 13);
    assert.equal(resultB.ok, false);
    assert.equal(resultB.status, 'stale_save');
    assert.deepEqual(
        resultB.conflict,
        {
            code: 'stale_save',
            timelineEpoch: 'timeline_test',
            expectedRevision: 12,
            actualRevision: 13,
            source: 'translation',
            recoverable: true,
        },
    );
    assert.equal(pageBSaveCalls, 0);
    assert.deepEqual(
        diagnostics,
        [
            resultB.conflict,
        ],
    );
    assert.equal(lockCalls.length, 2);
    assert.equal(
        lockCalls[0].options.mode,
        'exclusive',
    );
});

test('registerHead synchronously recovers persisted fallback heads with or without Web Locks', () => {
    const current =
        createState({
            revision: 7,
        });
    const calls = [];
    const storageAdapter = {
        recoverHead(head) {
            calls.push([
                'recover',
                head.stateRevision,
            ]);
            return {
                ...head,
                claimId: '',
            };
        },
        registerHead(head) {
            calls.push([
                'register',
                head.stateRevision,
            ]);
            return {
                ...head,
                claimId: '',
            };
        },
    };
    const fallbackGuard =
        createSaveRevisionGuard({
            storageAdapter,
            lockManager: null,
        });
    const fallbackHead =
        fallbackGuard.registerHead(
            current,
        );

    assert.deepEqual(
        fallbackHead,
        {
            saveRevisionVersion: 1,
            timelineEpoch:
                'timeline_test',
            stateRevision: 7,
            claimId: '',
        },
    );
    assert.equal(
        typeof fallbackHead?.then,
        'undefined',
    );
    assert.deepEqual(
        calls,
        [
            [
                'recover',
                7,
            ],
        ],
    );

    const webLocksGuard =
        createSaveRevisionGuard({
            storageAdapter,
            lockManager: {
                request() {
                    throw new Error(
                        'registerHead must not request a Web Lock',
                    );
                },
            },
        });
    webLocksGuard.registerHead(
        current,
    );
    assert.deepEqual(
        calls,
        [
            [
                'recover',
                7,
            ],
            [
                'recover',
                7,
            ],
        ],
    );
});

test('Web Locks keep a persistent mutex record while a native claim is pending', async () => {
    const storage =
        createStorage();
    const timelineEpoch =
        'timeline_native_pending';
    const baseAdapter =
        createSaveRevisionStorageAdapter(
            storage,
        );
    let releaseClaim;
    const claimReleased =
        new Promise(resolve => {
            releaseClaim =
                resolve;
        });
    let markClaimPending;
    const claimPending =
        new Promise(resolve => {
            markClaimPending =
                resolve;
        });
    const ownerAdapter = {
        ...baseAdapter,
        async claimHead(...args) {
            const claimed =
                await baseAdapter
                    .claimHead(
                        ...args,
                    );
            markClaimPending();
            await claimReleased;
            return claimed;
        },
    };
    const lockManager = {
        request(
            _name,
            _options,
            operation,
        ) {
            return operation();
        },
    };
    const current =
        createState({
            timelineEpoch,
        });
    const next =
        structuredClone(current);
    next.clock =
        '1991-09-02 · 11:45';
    const owner =
        createSaveRevisionGuard({
            storageAdapter:
                ownerAdapter,
            lockManager,
            createClaimId:
                () =>
                    'native_owner',
        });
    const observer =
        createSaveRevisionGuard({
            storageAdapter:
                createSaveRevisionStorageAdapter(
                    storage,
                ),
            lockManager,
            createClaimId:
                () =>
                    'native_observer',
        });
    owner.registerHead(
        current,
    );
    const pendingSave =
        owner.guardedSave({
            currentState:
                current,
            nextState: next,
            source:
                'native_owner',
            save() {
                return durable();
            },
        });
    await claimPending;

    const observed =
        observer.registerHead(
            current,
        );
    assert.deepEqual(
        observed,
        {
            saveRevisionVersion: 1,
            timelineEpoch,
            stateRevision: 1,
            claimId:
                'native_owner',
            claimBaseRevision: 0,
            claimPhase:
                'pending',
            claimFence: 1,
        },
    );
    releaseClaim();
    const result =
        await pendingSave;
    assert.equal(
        result.ok,
        true,
    );
});

test('storage fallback preserves rollback monotonicity and rejects the old head', async () => {
    const storage = createStorage();
    let claim = 0;
    const guard = createSaveRevisionGuard({
        storage,
        lockManager: null,
        createClaimId: () => `fallback_${claim += 1}`,
        now: () => '1991-09-02T12:00:00.000Z',
    });
    const revision20 = createState({
        revision: 20,
        clock: '1991-09-02 · 12:00',
        holderId: 'canon_harry_james_potter',
    });
    guard.registerHead(revision20);
    const olderStoryState = createState({
        revision: 6,
        clock: '1991-09-01 · 18:00',
        holderId: 'player',
    });
    const rollback = await guard.guardedSave({
        currentState: revision20,
        nextState: olderStoryState,
        source: 'rollback',
        save: () => durable(),
    });
    const stale = await guard.guardedSave({
        currentState: revision20,
        nextState: {
            ...revision20,
            clock: '1991-09-02 · 12:15',
        },
        source: 'turn',
        save: () => {
            throw new Error(
                'stale callback must not run',
            );
        },
    });

    assert.equal(rollback.ok, true);
    assert.equal(rollback.state.stateRevision, 21);
    assert.equal(stale.ok, false);
    assert.equal(stale.conflict.actualRevision, 21);
});

test('[defect-probing] storage fallback lets only one interleaved guard invoke persistence', async () => {
    const harness =
        createInterleavedStorageHarness();
    const pageA =
        createState({
            revision: 12,
        });
    const pageB =
        structuredClone(pageA);
    const guardA =
        createSaveRevisionGuard({
            storage:
                harness
                    .storageFor('a'),
            lockManager: null,
            createClaimId:
                () => 'page_a_claim',
            now:
                () =>
                    '1991-09-02T12:00:00.000Z',
        });
    const guardB =
        createSaveRevisionGuard({
            storage:
                harness
                    .storageFor('b'),
            lockManager: null,
            createClaimId:
                () => 'page_b_claim',
            now:
                () =>
                    '1991-09-02T12:00:00.000Z',
        });
    guardA.registerHead(pageA);
    guardB.registerHead(pageB);

    const nextA =
        structuredClone(pageA);
    nextA.clock =
        '1991-09-02 · 11:45';
    const nextB =
        structuredClone(pageB);
    nextB.clock =
        '1991-09-02 · 11:50';
    const saves = [];
    let pageBResult;
    harness.arm(() => {
        pageBResult =
            guardB.guardedSave({
                currentState:
                    pageB,
                nextState:
                    nextB,
                source:
                    'page_b',
                save: () => {
                    saves.push(
                        'page_b',
                    );
                    return durable();
                },
            });
    });

    const pageAResult =
        await guardA.guardedSave({
            currentState:
                pageA,
            nextState:
                nextA,
            source: 'page_a',
            save: () => {
                saves.push(
                    'page_a',
                );
                return durable();
            },
        });
    const resolvedB =
        await pageBResult;

    assert.equal(
        saves.length,
        1,
    );
    assert.equal(
        [
            pageAResult,
            resolvedB,
        ].filter(result =>
            result.ok).length,
        1,
    );
    assert.deepEqual(
        harness.keys()
            .filter(key =>
                key.includes(
                    '.mutex:',
                )),
        [],
    );
});

test('storage fallback rejects adapters without cross-page mutex capabilities', async () => {
    const values = new Map();
    const guard =
        createSaveRevisionGuard({
            storage: {
                getItem(key) {
                    return values
                        .get(key) ??
                        null;
                },
                setItem(key, value) {
                    values.set(
                        key,
                        String(value),
                    );
                },
            },
            lockManager: null,
            createClaimId:
                () =>
                    'unsupported_storage',
        });
    const current =
        createState();
    const next =
        structuredClone(current);
    next.clock =
        '1991-09-02 · 11:45';
    guard.registerHead(current);
    let saveCalls = 0;

    await assert.rejects(
        guard.guardedSave({
            currentState:
                current,
            nextState: next,
            source:
                'unsupported_storage',
            save: () => {
                saveCalls += 1;
            },
        }),
        /lacks cross-page mutex capabilities/u,
    );
    assert.equal(saveCalls, 0);
});

test('expired and half-written mutex records recover a crashed head and leave no tickets', async () => {
    const storage =
        createStorage();
    const namespace =
        'test.saveRevision';
    const timelineEpoch =
        'timeline_crash_recovery';
    const prefix =
        `${namespace}.mutex:${
            encodeURIComponent(
                timelineEpoch,
            )
        }:`;
    let clock = 10_000;
    const adapter =
        createSaveRevisionStorageAdapter(
            storage,
            {
                namespace,
                now:
                    () => clock,
                leaseDurationMs:
                    1_000,
                heartbeatIntervalMs:
                    250,
            },
        );
    storage.setItem(
        `${namespace}:${
            encodeURIComponent(
                timelineEpoch,
            )
        }`,
        JSON.stringify({
            saveRevisionVersion: 1,
            timelineEpoch,
            stateRevision: 5,
            claimId:
                'half_written',
            claimBaseRevision: 4,
        }),
    );
    storage.setItem(
        `${prefix}choosing:half_written`,
        '{"claimId":',
    );
    storage.setItem(
        `${prefix}ticket:crashed_page`,
        JSON.stringify({
            ticket: 1,
            claimId:
                'crashed_page',
            expiresAt:
                clock - 1,
        }),
    );
    storage.setItem(
        `${prefix}ticket:half_written`,
        '{"ticket":',
    );
    const guard =
        createSaveRevisionGuard({
            storageAdapter:
                adapter,
            lockManager: null,
            createClaimId:
                () =>
                    'recovery_page',
            now:
                () =>
                    '1991-09-02T12:00:00.000Z',
        });
    const current =
        createState({
            revision: 4,
            timelineEpoch,
        });
    const next =
        structuredClone(current);
    next.clock =
        '1991-09-02 · 11:45';

    const result =
        await guard.guardedSave({
            currentState:
                current,
            nextState: next,
            source:
                'crash_recovery',
            save: () => durable(),
        });

    assert.equal(result.ok, true);
    assert.equal(
        result.state.stateRevision,
        5,
    );
    assert.deepEqual(
        adapter.readHead(
            timelineEpoch,
        ),
        {
            saveRevisionVersion: 1,
            timelineEpoch,
            stateRevision: 5,
            claimId: '',
        },
    );
    assert.deepEqual(
        storage.keys()
            .filter(key =>
                key.startsWith(
                    prefix,
                )),
        [],
    );
    clock += 1;
});

test('head recovery requires a matching live ticket and owner and cleans half-written claims', async () => {
    const storage = createStorage();
    const namespace =
        'test.saveRevision';
    const timelineEpoch =
        'timeline_explicit_recovery';
    const encodedEpoch =
        encodeURIComponent(
            timelineEpoch,
        );
    const headKey =
        `${namespace}:${encodedEpoch}`;
    const prefix =
        `${namespace}.mutex:${encodedEpoch}:`;
    const clock = 10_000;
    const adapter =
        createSaveRevisionStorageAdapter(
            storage,
            {
                namespace,
                now: () => clock,
                leaseDurationMs: 1_000,
                heartbeatIntervalMs: 250,
            },
        );
    const writeClaim = claimId => {
        storage.setItem(
            headKey,
            JSON.stringify({
                saveRevisionVersion: 1,
                timelineEpoch,
                stateRevision: 8,
                claimId,
                claimBaseRevision: 7,
            }),
        );
    };
    const hostHead = {
        saveRevisionVersion: 1,
        timelineEpoch,
        stateRevision: 7,
        claimId: '',
    };
    const recoverAndAssertClean =
        claimId => {
            adapter.recoverHead(
                hostHead,
            );
            assert.equal(
                adapter.readHead(
                    timelineEpoch,
                ).stateRevision,
                7,
            );
            assert.deepEqual(
                storage.keys()
                    .filter(key =>
                        key.startsWith(
                            prefix,
                        )),
                [],
                claimId,
            );
        };

    writeClaim('no_records');
    recoverAndAssertClean(
        'no_records',
    );

    writeClaim('ticket_only');
    storage.setItem(
        `${prefix}ticket:ticket_only`,
        JSON.stringify({
            ticket: 2,
            claimId: 'ticket_only',
            expiresAt: clock + 500,
        }),
    );
    recoverAndAssertClean(
        'ticket_only',
    );

    writeClaim('owner_only');
    storage.setItem(
        `${prefix}owner`,
        JSON.stringify({
            ticket: 4,
            claimId: 'owner_only',
            expiresAt: clock + 500,
        }),
    );
    recoverAndAssertClean(
        'owner_only',
    );

    writeClaim('malformed_owner');
    storage.setItem(
        `${prefix}ticket:malformed_owner`,
        JSON.stringify({
            ticket: 5,
            claimId: 'malformed_owner',
            expiresAt: clock + 500,
        }),
    );
    storage.setItem(
        `${prefix}owner`,
        '{"claimId":',
    );
    recoverAndAssertClean(
        'malformed_owner',
    );

    writeClaim('active');
    storage.setItem(
        `${prefix}choosing:active`,
        JSON.stringify({
            claimId: 'active',
            expiresAt: clock - 1,
        }),
    );
    for (const key of [
        `${prefix}ticket:active`,
        `${prefix}owner`,
    ]) {
        storage.setItem(
            key,
            JSON.stringify({
                ticket: 3,
                claimId: 'active',
                expiresAt: clock + 500,
            }),
        );
    }
    adapter.recoverHead(
        hostHead,
    );
    assert.equal(
        adapter.readHead(
            timelineEpoch,
        ).claimId,
        'active',
    );
    assert.equal(
        storage.getItem(
            `${prefix}choosing:active`,
        ),
        null,
    );
    assert.notEqual(
        storage.getItem(
            `${prefix}ticket:active`,
        ),
        null,
    );
    assert.notEqual(
        storage.getItem(
            `${prefix}owner`,
        ),
        null,
    );
});

test('persistent host-save fence blocks takeover after a fallback lease expires without heartbeat', async () => {
    const storage =
        createStorage();
    const timelineEpoch =
        'timeline_suspended_heartbeat';
    let clock = 10_000;
    const createGuard = pageId => {
        const storageAdapter =
            createSaveRevisionStorageAdapter(
                storage,
                {
                    now: () => clock,
                    leaseDurationMs:
                        100,
                    heartbeatIntervalMs:
                        25,
                    setIntervalFn:
                        () => ({
                            unref() {},
                        }),
                    clearIntervalFn:
                        () => {},
                },
            );
        return createSaveRevisionGuard({
            storageAdapter,
            lockManager: null,
            createClaimId:
                () =>
                    `${pageId}_claim`,
        });
    };
    const current =
        createState({
            timelineEpoch,
        });
    const nextA =
        structuredClone(current);
    const nextB =
        structuredClone(current);
    nextA.clock =
        '1991-09-02 · 11:45';
    nextB.clock =
        '1991-09-02 · 11:50';
    const guardA =
        createGuard('page_a');
    const guardB =
        createGuard('page_b');
    guardA.registerHead(
        current,
    );
    guardB.registerHead(
        current,
    );
    let releaseHostSave;
    const hostSaveReleased =
        new Promise(resolve => {
            releaseHostSave =
                resolve;
        });
    let markHostSaveStarted;
    const hostSaveStarted =
        new Promise(resolve => {
            markHostSaveStarted =
                resolve;
        });
    const callbacks = [];
    const pendingA =
        guardA.guardedSave({
            currentState:
                current,
            nextState: nextA,
            source:
                'suspended_page_a',
            async save() {
                callbacks.push(
                    'page_a',
                );
                markHostSaveStarted();
                await hostSaveReleased;
                return durable();
            },
        });
    await hostSaveStarted;

    clock += 101;
    const resultB =
        await guardB.guardedSave({
            currentState:
                current,
            nextState: nextB,
            source:
                'takeover_page_b',
            save() {
                callbacks.push(
                    'page_b',
                );
            },
        });

    assert.equal(
        resultB.ok,
        false,
    );
    assert.deepEqual(
        callbacks,
        [
            'page_a',
        ],
    );
    releaseHostSave();
    const resultA =
        await pendingA;
    assert.equal(
        resultA.ok,
        true,
    );
    assert.deepEqual(
        callbacks,
        [
            'page_a',
        ],
    );
    assert.deepEqual(
        createSaveRevisionStorageAdapter(
            storage,
        ).readHead(
            timelineEpoch,
        ),
        {
            saveRevisionVersion: 1,
            timelineEpoch,
            stateRevision: 1,
            claimId: '',
        },
    );
});

test('post-host crash recovery keeps the persistent fence until the host revision proves the commit', async () => {
    const storage =
        createStorage();
    const timelineEpoch =
        'timeline_post_host_fence';
    const adapter =
        createSaveRevisionStorageAdapter(
            storage,
        );
    const baseHead = {
        saveRevisionVersion: 1,
        timelineEpoch,
        stateRevision: 4,
        claimId: '',
    };
    adapter.registerHead(
        baseHead,
    );
    assert.equal(
        await adapter.claimHead(
            baseHead,
            5,
            'crashed_after_host',
        ),
        true,
    );
    assert.equal(
        await adapter.beginHostSave(
            timelineEpoch,
            5,
            'crashed_after_host',
        ),
        true,
    );

    const beforeHostReload =
        adapter.recoverHead(
            baseHead,
        );
    assert.deepEqual(
        beforeHostReload,
        {
            saveRevisionVersion: 1,
            timelineEpoch,
            stateRevision: 5,
            claimId:
                'crashed_after_host',
            claimBaseRevision: 4,
            claimPhase:
                'host_save_started',
            claimFence: 1,
        },
    );
    const persistedHead = {
        ...baseHead,
        stateRevision: 5,
    };
    const afterHostReload =
        adapter.recoverHead(
            persistedHead,
        );
    assert.deepEqual(
        afterHostReload,
        {
            saveRevisionVersion: 1,
            timelineEpoch,
            stateRevision: 5,
            claimId: '',
        },
    );
});

test('[defect-probing] host-save phase cannot be restored to the claim base without a confirmed failure', async () => {
    const storage =
        createStorage();
    const timelineEpoch =
        'timeline_restore_fence';
    const adapter =
        createSaveRevisionStorageAdapter(
            storage,
        );
    const baseHead = {
        saveRevisionVersion: 1,
        timelineEpoch,
        stateRevision: 6,
        claimId: '',
    };
    adapter.registerHead(
        baseHead,
    );
    assert.equal(
        await adapter.claimHead(
            baseHead,
            7,
            'started_host_save',
        ),
        true,
    );
    assert.equal(
        await adapter.beginHostSave(
            timelineEpoch,
            7,
            'started_host_save',
        ),
        true,
    );

    assert.equal(
        adapter.restoreHead(
            baseHead,
            7,
            'started_host_save',
        ),
        false,
    );
    assert.deepEqual(
        adapter.readHead(
            timelineEpoch,
        ),
        {
            saveRevisionVersion: 1,
            timelineEpoch,
            stateRevision: 7,
            claimId:
                'started_host_save',
            claimBaseRevision: 6,
            claimPhase:
                'host_save_started',
            claimFence: 1,
        },
    );
});

test('[defect-probing] a resolved callback without durable acknowledgement leaves the persistent fence', async () => {
    const storage =
        createStorage();
    const adapter =
        createSaveRevisionStorageAdapter(
            storage,
        );
    const timelineEpoch =
        'timeline_missing_ack';
    const current =
        createState({
            revision: 2,
            timelineEpoch,
        });
    const next =
        structuredClone(current);
    next.clock =
        '1991-09-02 · 11:45';
    const guard =
        createSaveRevisionGuard({
            storageAdapter:
                adapter,
            lockManager: null,
            createClaimId:
                () =>
                    'missing_ack',
        });
    guard.registerHead(
        current,
    );

    await assert.rejects(
        guard.guardedSave({
            currentState:
                current,
            nextState: next,
            source:
                'missing_ack',
            save() {},
        }),
        error => {
            assert.equal(
                error?.code,
                'host_save_not_durable',
            );
            assert.equal(
                error
                    ?.confirmedFailure,
                false,
            );
            return true;
        },
    );
    assert.deepEqual(
        adapter.readHead(
            timelineEpoch,
        ),
        {
            saveRevisionVersion: 1,
            timelineEpoch,
            stateRevision: 3,
            claimId:
                'missing_ack',
            claimBaseRevision: 2,
            claimPhase:
                'host_save_started',
            claimFence: 1,
        },
    );
});

test('a resolved durable false without explicit failure confirmation keeps the persistent fence', async () => {
    const storage =
        createStorage();
    const adapter =
        createSaveRevisionStorageAdapter(
            storage,
        );
    const timelineEpoch =
        'timeline_unconfirmed_failure';
    const current =
        createState({
            revision: 2,
            timelineEpoch,
        });
    const next =
        structuredClone(current);
    next.clock =
        '1991-09-02 · 11:45';
    const guard =
        createSaveRevisionGuard({
            storageAdapter:
                adapter,
            lockManager: null,
            createClaimId:
                () =>
                    'unconfirmed_failure',
        });
    guard.registerHead(
        current,
    );

    await assert.rejects(
        guard.guardedSave({
            currentState:
                current,
            nextState: next,
            source:
                'unconfirmed_failure',
            save() {
                return {
                    durable: false,
                };
            },
        }),
        error => {
            assert.equal(
                error?.code,
                'host_save_not_durable',
            );
            assert.equal(
                error
                    ?.confirmedFailure,
                false,
            );
            return true;
        },
    );
    assert.deepEqual(
        adapter.readHead(
            timelineEpoch,
        ),
        {
            saveRevisionVersion: 1,
            timelineEpoch,
            stateRevision: 3,
            claimId:
                'unconfirmed_failure',
            claimBaseRevision: 2,
            claimPhase:
                'host_save_started',
            claimFence: 1,
        },
    );
});

test('expired pre-host lease takeover fences the resumed page before either callback can duplicate', async () => {
    const storage =
        createStorage();
    const timelineEpoch =
        'timeline_pre_host_takeover';
    let clock = 10_000;
    const adapterA =
        createSaveRevisionStorageAdapter(
            storage,
            {
                now: () => clock,
                leaseDurationMs:
                    100,
                heartbeatIntervalMs:
                    25,
                setIntervalFn:
                    () => ({
                        unref() {},
                    }),
                clearIntervalFn:
                    () => {},
            },
        );
    const adapterB =
        createSaveRevisionStorageAdapter(
            storage,
            {
                now: () => clock,
                leaseDurationMs:
                    100,
                heartbeatIntervalMs:
                    25,
                setIntervalFn:
                    () => ({
                        unref() {},
                    }),
                clearIntervalFn:
                    () => {},
            },
        );
    let releasePageA;
    const pageAReleased =
        new Promise(resolve => {
            releasePageA =
                resolve;
        });
    let markPageAPaused;
    const pageAPaused =
        new Promise(resolve => {
            markPageAPaused =
                resolve;
        });
    const pausedAdapter = {
        ...adapterA,
        async beginHostSave(
            ...args
        ) {
            markPageAPaused();
            await pageAReleased;
            return adapterA
                .beginHostSave(
                    ...args,
                );
        },
    };
    const current =
        createState({
            timelineEpoch,
        });
    const nextA =
        structuredClone(current);
    const nextB =
        structuredClone(current);
    nextA.clock =
        '1991-09-02 · 11:45';
    nextB.clock =
        '1991-09-02 · 11:50';
    const guardA =
        createSaveRevisionGuard({
            storageAdapter:
                pausedAdapter,
            lockManager: null,
            createClaimId:
                () =>
                    'pre_host_page_a',
        });
    const guardB =
        createSaveRevisionGuard({
            storageAdapter:
                adapterB,
            lockManager: null,
            createClaimId:
                () =>
                    'pre_host_page_b',
        });
    guardA.registerHead(
        current,
    );
    const callbacks = [];
    const pendingA =
        guardA.guardedSave({
            currentState:
                current,
            nextState: nextA,
            source:
                'pre_host_page_a',
            save() {
                callbacks.push(
                    'page_a',
                );
                return durable();
            },
        });
    await pageAPaused;

    clock += 101;
    const resultB =
        await guardB.guardedSave({
            currentState:
                current,
            nextState: nextB,
            source:
                'pre_host_page_b',
            save() {
                callbacks.push(
                    'page_b',
                );
                return durable();
            },
        });
    releasePageA();
    const resultA =
        await pendingA;

    assert.equal(
        resultB.ok,
        true,
    );
    assert.equal(
        resultA.ok,
        false,
    );
    assert.equal(
        resultA.status,
        'save_claim_lost',
    );
    assert.deepEqual(
        callbacks,
        [
            'page_b',
        ],
    );
    assert.deepEqual(
        adapterB.readHead(
            timelineEpoch,
        ),
        {
            saveRevisionVersion: 1,
            timelineEpoch,
            stateRevision: 1,
            claimId: '',
        },
    );
    assert.equal(
        storage.getItem(
            `hogwartsMud.saveRevision.fence:${
                encodeURIComponent(
                    timelineEpoch,
                )
            }`,
        ),
        '2',
    );
});

test('a failed final claim confirmation never reports save success', async () => {
    const storage =
        createStorage();
    const adapter =
        createSaveRevisionStorageAdapter(
            storage,
        );
    const current =
        createState({
            revision: 3,
            timelineEpoch:
                'timeline_final_claim',
        });
    const next =
        structuredClone(current);
    next.clock =
        '1991-09-02 · 11:45';
    const failingAdapter = {
        ...adapter,
        finalizeHead(
            timelineEpoch,
            revision,
        ) {
            storage.setItem(
                `hogwartsMud.saveRevision:${
                    encodeURIComponent(
                        timelineEpoch,
                    )
                }`,
                JSON.stringify({
                    saveRevisionVersion:
                        1,
                    timelineEpoch,
                    stateRevision:
                        revision + 1,
                    claimId:
                        'other_page',
                    claimBaseRevision:
                        revision,
                }),
            );
            return false;
        },
    };
    const guard =
        createSaveRevisionGuard({
            storageAdapter:
                failingAdapter,
            lockManager: null,
            createClaimId:
                () =>
                    'losing_page',
        });
    guard.registerHead(current);
    let saveCalls = 0;

    const result =
        await guard.guardedSave({
            currentState:
                current,
            nextState: next,
            source:
                'final_claim_loss',
            save: () => {
                saveCalls += 1;
                return durable();
            },
        });

    assert.equal(saveCalls, 1);
    assert.equal(result.ok, false);
    assert.equal(
        result.status,
        'save_claim_lost',
    );
    assert.equal(
        result.conflict
            .actualRevision,
        5,
    );
    assert.deepEqual(
        storage.keys()
            .filter(key =>
                key.includes(
                    '.mutex:',
                )),
        [],
    );
});

test('storage fallback completes 128 two-guard races with zero double saves', async () => {
    const storage =
        createStorage();
    const rounds = 128;

    for (
        let round = 0;
        round < rounds;
        round += 1
    ) {
        const timelineEpoch =
            `timeline_stress_${round}`;
        const current =
            createState({
                timelineEpoch,
            });
        const nextA =
            structuredClone(current);
        const nextB =
            structuredClone(current);
        nextA.clock =
            '1991-09-02 · 11:45';
        nextB.clock =
            '1991-09-02 · 11:50';
        const guardA =
            createSaveRevisionGuard({
                storage,
                lockManager: null,
                createClaimId:
                    () =>
                        `stress_a_${round}`,
            });
        const guardB =
            createSaveRevisionGuard({
                storage,
                lockManager: null,
                createClaimId:
                    () =>
                        `stress_b_${round}`,
            });
        guardA.registerHead(
            current,
        );
        guardB.registerHead(
            current,
        );
        const saves = [];
        const attempts = [{
            guard: guardA,
            next: nextA,
            page: 'a',
        }, {
            guard: guardB,
            next: nextB,
            page: 'b',
        }];

        const results =
            await Promise.all(
                attempts.map(
                    ({
                        guard,
                        next,
                        page,
                    }) =>
                        guard
                            .guardedSave({
                                currentState:
                                    current,
                                nextState:
                                    next,
                                source:
                                    `stress_${page}`,
                                async save() {
                                    saves.push(
                                        page,
                                    );
                                    await Promise
                                        .resolve();
                                    return durable();
                                },
                            }),
                ),
            );

        assert.equal(
            saves.length,
            1,
            `round ${round} entered ${saves.length} save callbacks`,
        );
        assert.equal(
            results.filter(
                result =>
                    result.ok,
            ).length,
            1,
            `round ${round} reported an invalid winner count`,
        );
    }

    assert.deepEqual(
        storage.keys()
            .filter(key =>
                key.includes(
                    '.mutex:',
                )),
        [],
    );
});

test('chat-only and idempotent saves check the head without adding revisions', async () => {
    const storage = createStorage();
    const adapter =
        createSaveRevisionStorageAdapter(
            storage,
        );
    const guard = createSaveRevisionGuard({
        storageAdapter: adapter,
        lockManager: null,
        createClaimId: () => 'unused',
        now: () => '1991-09-02T12:00:00.000Z',
    });
    const current = createState({
        revision: 7,
        history: [
            createHistoryEntry(7),
        ],
    });
    guard.registerHead(current);
    let saved;
    const chatOnly = await guard.guardedSave({
        currentState: current,
        nextState: structuredClone(current),
        source: 'chat',
        kind: 'chat-only',
        save: state => {
            saved = state;
            return durable();
        },
    });
    const idempotent =
        prepareSaveRevisionCommit({
            currentState: saved,
            nextState: structuredClone(saved),
            source: 'noop',
        });

    assert.equal(chatOnly.ok, true);
    assert.equal(saved.stateRevision, 7);
    assert.equal(saved.revisionHistory.length, 1);
    assert.equal(idempotent.changed, false);
    assert.equal(idempotent.state.stateRevision, 7);
    assert.equal(
        adapter.readHead('timeline_test').stateRevision,
        7,
    );

    const changed = structuredClone(current);
    changed.clock = '1991-09-02 · 11:45';
    await assert.rejects(
        guard.guardedSave({
            currentState: current,
            nextState: changed,
            source: 'chat',
            kind: 'chat-only',
            save: () => {},
        }),
        /Chat-only save cannot include world state changes/u,
    );
});

test('confirmed failed persistence restores the claimed storage head', async () => {
    const storage = createStorage();
    const adapter =
        createSaveRevisionStorageAdapter(
            storage,
        );
    const guard = createSaveRevisionGuard({
        storageAdapter: adapter,
        lockManager: null,
        createClaimId: () => 'failed_claim',
        now: () => '1991-09-02T12:00:00.000Z',
    });
    const current = createState({
        revision: 9,
    });
    guard.registerHead(current);
    const next = structuredClone(current);
    next.clock = '1991-09-02 · 11:45';

    await assert.rejects(
        guard.guardedSave({
            currentState: current,
            nextState: next,
            source: 'turn',
            save: () => {
                return {
                    durable:
                        false,
                    confirmedFailure:
                        true,
                };
            },
        }),
        error => {
            assert.equal(
                error?.code,
                'host_save_not_durable',
            );
            assert.equal(
                error
                    ?.confirmedFailure,
                true,
            );
            return true;
        },
    );
    assert.deepEqual(
        adapter.readHead('timeline_test'),
        {
            saveRevisionVersion: 1,
            timelineEpoch: 'timeline_test',
            stateRevision: 9,
            claimId: '',
        },
    );
    assert.deepEqual(
        storage.keys()
            .filter(key =>
                key.includes(
                    '.mutex:',
                )),
        [],
    );
});
