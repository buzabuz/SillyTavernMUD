/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import test from 'node:test';

import { createModelAdapter } from '../public/scripts/extensions/hogwarts-mud/adapters/model.js';
import { createTranslationController } from '../public/scripts/extensions/hogwarts-mud/ui/translation-controller.js';
import {
    createUiSessionState,
} from '../public/scripts/extensions/hogwarts-mud/ui/session-state.js';
import { createTurnController } from '../public/scripts/extensions/hogwarts-mud/ui/turn-controller.js';
import {
    SaveRevisionConflictError,
    createGuardedSavePorts,
} from '../public/scripts/extensions/hogwarts-mud/runtime/guarded-save-ports.js';
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

function seedClaimedHead(
    storage,
    {
        timelineEpoch,
        claimId,
        expiresAt,
        malformedChoosing = false,
    },
) {
    const namespace =
        'hogwartsMud.saveRevision';
    const encodedEpoch =
        encodeURIComponent(
            timelineEpoch,
        );
    const prefix =
        `${namespace}.mutex:${
            encodedEpoch
        }:`;
    storage.setItem(
        `${namespace}:${encodedEpoch}`,
        JSON.stringify({
            saveRevisionVersion: 1,
            timelineEpoch,
            stateRevision: 1,
            claimId,
            claimBaseRevision: 0,
        }),
    );
    storage.setItem(
        `${prefix}choosing:${
            encodeURIComponent(
                claimId,
            )
        }`,
        malformedChoosing
            ? '{"claimId":'
            : JSON.stringify({
                claimId,
                expiresAt,
            }),
    );
    storage.setItem(
        `${prefix}ticket:${
            encodeURIComponent(
                claimId,
            )
        }`,
        JSON.stringify({
            ticket: 1,
            claimId,
            expiresAt,
        }),
    );
    storage.setItem(
        `${prefix}owner`,
        JSON.stringify({
            ticket: 1,
            claimId,
            expiresAt,
        }),
    );
    return {
        namespace,
        prefix,
    };
}

function createRecoveryPorts(
    host,
    storage,
    {
        clock,
        lockManager = null,
        pageId,
    },
    conflicts = [],
) {
    const adapter =
        createSaveRevisionStorageAdapter(
            storage,
            {
                now: () => clock,
                leaseDurationMs:
                    1_000,
                heartbeatIntervalMs:
                    250,
            },
        );
    return {
        adapter,
        ports:
            createGuardedSavePorts({
                getContext: () =>
                    host.context,
                guard:
                    createSaveRevisionGuard({
                        storageAdapter:
                            adapter,
                        lockManager,
                        createClaimId:
                            () => pageId,
                        now: () =>
                            '1991-09-02T12:00:00.000Z',
                    }),
                onConflict:
                    (conflict, message) =>
                        conflicts.push({
                            conflict,
                            message,
                        }),
            }),
    };
}

function createWorldState(
    {
        revision = 0,
        clock = '1991-09-02 · 11:30',
        timelineEpoch =
        'timeline_integration',
    } = {},
) {
    return {
        saveRevisionVersion: 1,
        timelineEpoch,
        stateRevision: revision,
        revisionHistory: [],
        clock,
        items: [{
            id: 'borrowed_quill',
            ownerId: 'player',
            holderId: 'player',
            location: {
                mapId:
                    'hogwarts_castle',
                roomId:
                    'charms_classroom',
                placement:
                    'with_holder',
            },
            state: 'intact',
        }],
        actorLibrary: [],
    };
}

function createHostContext(
    state,
    {
        chatId =
        'integration-chat',
    } = {},
) {
    const metadataSaves = [];
    const chatSaves = [];
    const context = {
        chatId,
        chatMetadata: {
            hogwartsMud:
                structuredClone(state),
        },
        chat: [{
            mes: 'A lesson begins.',
            is_user: false,
            extra: {},
        }],
        async saveMetadata() {
            metadataSaves.push(
                structuredClone(
                    this.chatMetadata
                        .hogwartsMud,
                ),
            );
            return {
                durable: true,
            };
        },
        async saveChat() {
            chatSaves.push({
                state:
                    structuredClone(
                        this.chatMetadata
                            .hogwartsMud,
                    ),
                chat:
                    structuredClone(
                        this.chat,
                    ),
            });
            return {
                durable: true,
            };
        },
    };
    return {
        context,
        metadataSaves,
        chatSaves,
    };
}

function createPagePorts(
    host,
    storage,
    pageId,
    conflicts = [],
) {
    let claim = 0;
    return createGuardedSavePorts({
        getContext: () =>
            host.context,
        guard:
            createSaveRevisionGuard({
                storage,
                lockManager: null,
                createClaimId: () =>
                    `${
                        pageId
                    }_${
                        claim += 1
                    }`,
                now: () =>
                    '1991-09-02T12:00:00.000Z',
            }),
        onConflict:
            (conflict, message) =>
                conflicts.push({
                    conflict,
                    message,
                }),
    });
}

test('explicitly confirmed resolved host failure restores the revision for retry', async () => {
    const storage =
        createStorage();
    const host =
        createHostContext(
            createWorldState(),
        );
    let hostSaveCalls = 0;
    host.context.saveMetadata =
        async () => {
            hostSaveCalls += 1;
            return {
                durable: false,
                confirmedFailure:
                    true,
            };
        };
    const {
        adapter,
        ports,
    } = createRecoveryPorts(
        host,
        storage,
        {
            clock: 9_000,
            pageId:
                'resolved_failure',
        },
    );
    const context =
        ports.getContext();
    await ports
        .registerSaveRevisionHead();
    context.chatMetadata
        .hogwartsMud.clock =
        '1991-09-02 · 11:45';

    await assert.rejects(
        context.saveMetadata({
            source:
                'resolved_host_failure',
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

    assert.equal(
        hostSaveCalls,
        1,
    );
    assert.deepEqual(
        adapter.readHead(
            'timeline_integration',
        ),
        {
            saveRevisionVersion: 1,
            timelineEpoch:
                'timeline_integration',
            stateRevision: 0,
            claimId: '',
        },
    );
    assert.equal(
        context.chatMetadata
            .hogwartsMud
            .stateRevision,
        0,
    );
});

test('saveMetadata swallowing an error cannot acknowledge durability or permit an old-page callback', async () => {
    const storage =
        createStorage();
    const initial =
        createWorldState();
    const pageA =
        createHostContext(
            initial,
        );
    let hostSaveCalls = 0;
    pageA.context.saveMetadata =
        async () => {
            hostSaveCalls += 1;
            return {
                durable: false,
            };
        };
    const {
        adapter,
        ports: portsA,
    } = createRecoveryPorts(
        pageA,
        storage,
        {
            clock: 9_500,
            pageId:
                'swallowed_error_a',
        },
    );
    const contextA =
        portsA.getContext();
    await portsA
        .registerSaveRevisionHead();
    contextA.chatMetadata
        .hogwartsMud.clock =
        '1991-09-02 · 11:45';

    await assert.rejects(
        contextA.saveMetadata({
            source:
                'swallowed_host_error',
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
    assert.equal(
        hostSaveCalls,
        1,
    );
    assert.equal(
        portsA
            .isSaveRevisionBlocked(),
        true,
    );
    assert.equal(
        contextA.chatMetadata
            .hogwartsMud
            .stateRevision,
        1,
    );
    assert.deepEqual(
        adapter.readHead(
            'timeline_integration',
        ),
        {
            saveRevisionVersion: 1,
            timelineEpoch:
                'timeline_integration',
            stateRevision: 1,
            claimId:
                'swallowed_error_a',
            claimBaseRevision: 0,
            claimPhase:
                'host_save_started',
            claimFence: 1,
        },
    );

    const oldPage =
        createHostContext(
            initial,
        );
    let duplicateCallbacks = 0;
    oldPage.context.saveMetadata =
        async () => {
            duplicateCallbacks += 1;
            return {
                durable: true,
            };
        };
    const {
        ports: oldPorts,
    } = createRecoveryPorts(
        oldPage,
        storage,
        {
            clock: 9_501,
            pageId:
                'swallowed_error_old',
        },
    );
    const oldContext =
        oldPorts.getContext();
    oldContext.chatMetadata
        .hogwartsMud.clock =
        '1991-09-02 · 11:50';
    await assert.rejects(
        oldContext.saveMetadata({
            source:
                'swallowed_error_retry',
        }),
        SaveRevisionConflictError,
    );
    assert.equal(
        duplicateCallbacks,
        0,
    );
    assert.equal(
        adapter.readHead(
            'timeline_integration',
        ).stateRevision,
        1,
    );
});

test('[defect-probing] a persisted host write that throws keeps its fence and blocks an old page callback', async () => {
    const storage =
        createStorage();
    const initial =
        createWorldState();
    const pageA =
        createHostContext(
            initial,
        );
    let persistedState = null;
    pageA.context.saveMetadata =
        async function saveMetadata() {
            persistedState =
                structuredClone(
                    this.chatMetadata
                        .hogwartsMud,
                );
            throw new Error(
                'persisted then failed',
            );
        };
    const {
        adapter,
        ports: portsA,
    } = createRecoveryPorts(
        pageA,
        storage,
        {
            clock: 10_000,
            pageId:
                'persisted_throw_a',
        },
    );
    const contextA =
        portsA.getContext();
    await portsA
        .registerSaveRevisionHead();
    contextA.chatMetadata
        .hogwartsMud.clock =
        '1991-09-02 · 11:45';

    await assert.rejects(
        contextA.saveMetadata({
            source:
                'persisted_then_throw',
        }),
        /persisted then failed/u,
    );

    assert.equal(
        persistedState
            .stateRevision,
        1,
    );
    assert.equal(
        contextA.chatMetadata
            .hogwartsMud
            .stateRevision,
        1,
    );
    assert.deepEqual(
        adapter.readHead(
            'timeline_integration',
        ),
        {
            saveRevisionVersion: 1,
            timelineEpoch:
                'timeline_integration',
            stateRevision: 1,
            claimId:
                'persisted_throw_a',
            claimBaseRevision: 0,
            claimPhase:
                'host_save_started',
            claimFence: 1,
        },
    );

    const oldPage =
        createHostContext(
            initial,
        );
    let duplicateCallbacks = 0;
    oldPage.context.saveMetadata =
        async () => {
            duplicateCallbacks += 1;
            return {
                durable: true,
            };
        };
    const {
        ports: oldPorts,
    } = createRecoveryPorts(
        oldPage,
        storage,
        {
            clock: 10_001,
            pageId:
                'persisted_throw_old',
        },
    );
    const oldContext =
        oldPorts.getContext();
    assert.equal(
        oldPorts
            .isSaveRevisionBlocked(),
        true,
    );
    oldContext.chatMetadata
        .hogwartsMud.clock =
        '1991-09-02 · 11:50';
    await assert.rejects(
        oldContext.saveMetadata({
            source:
                'old_page_retry',
        }),
        SaveRevisionConflictError,
    );
    assert.equal(
        duplicateCallbacks,
        0,
    );

    const reloaded =
        createHostContext(
            persistedState,
        );
    const {
        ports: reloadedPorts,
    } = createRecoveryPorts(
        reloaded,
        storage,
        {
            clock: 10_002,
            pageId:
                'persisted_throw_reload',
        },
    );
    reloadedPorts.getContext();
    assert.equal(
        reloadedPorts
            .isSaveRevisionBlocked(),
        false,
    );
    assert.deepEqual(
        adapter.readHead(
            'timeline_integration',
        ),
        {
            saveRevisionVersion: 1,
            timelineEpoch:
                'timeline_integration',
            stateRevision: 1,
            claimId: '',
        },
    );
});

test('first observation reports active, stale, and unresolved host-save heads without hiding conflicts', () => {
    const scenarios = [{
        name:
            'active lease',
        expectedCode:
            'save_in_progress',
        hostRevision: 0,
        prepare(storage) {
            seedClaimedHead(
                storage,
                {
                    timelineEpoch:
                        'timeline_integration',
                    claimId:
                        'active_crashed_page',
                    expiresAt:
                        20_500,
                },
            );
        },
        expectedHead: {
            stateRevision: 1,
            claimId:
                'active_crashed_page',
            claimBaseRevision: 0,
            claimPhase: 'pending',
            claimFence: 0,
        },
    }, {
        name:
            'local head ahead',
        expectedCode:
            'stale_save',
        hostRevision: 1,
        prepare(storage) {
            storage.setItem(
                'hogwartsMud.saveRevision:timeline_integration',
                JSON.stringify({
                    saveRevisionVersion:
                        1,
                    timelineEpoch:
                        'timeline_integration',
                    stateRevision: 2,
                    claimId: '',
                }),
            );
        },
        expectedHead: {
            stateRevision: 2,
            claimId: '',
        },
    }, {
        name:
            'unresolved host save',
        expectedCode:
            'save_in_progress',
        hostRevision: 1,
        prepare(storage) {
            storage.setItem(
                'hogwartsMud.saveRevision:timeline_integration',
                JSON.stringify({
                    saveRevisionVersion:
                        1,
                    timelineEpoch:
                        'timeline_integration',
                    stateRevision: 2,
                    claimId:
                        'host_save_unknown',
                    claimBaseRevision:
                        1,
                    claimPhase:
                        'host_save_started',
                }),
            );
        },
        expectedHead: {
            stateRevision: 2,
            claimId:
                'host_save_unknown',
            claimBaseRevision: 1,
            claimPhase:
                'host_save_started',
            claimFence: 0,
        },
    }];

    for (
        const scenario of
        scenarios
    ) {
        const storage =
            createStorage();
        scenario.prepare(
            storage,
        );
        const host =
            createHostContext(
                createWorldState({
                    revision:
                        scenario
                            .hostRevision,
                }),
            );
        const conflicts = [];
        const {
            adapter,
            ports,
        } = createRecoveryPorts(
            host,
            storage,
            {
                clock: 20_000,
                pageId:
                    `observer_${
                        scenario.name
                    }`,
            },
            conflicts,
        );

        ports.getContext();

        assert.equal(
            ports
                .isSaveRevisionBlocked(),
            true,
            scenario.name,
        );
        assert.equal(
            ports
                .getSaveRevisionConflict()
                ?.code,
            scenario.expectedCode,
            scenario.name,
        );
        assert.equal(
            conflicts.length,
            1,
            scenario.name,
        );
        assert.deepEqual(
            adapter.readHead(
                'timeline_integration',
            ),
            {
                saveRevisionVersion:
                    1,
                timelineEpoch:
                    'timeline_integration',
                ...scenario
                    .expectedHead,
            },
            scenario.name,
        );
    }
});

test('registering a reloaded save recovers an expired pre-host-save claim before the next metadata save', async () => {
    const storage = createStorage();
    const host =
        createHostContext(
            createWorldState({
                revision: 0,
            }),
        );
    const clock = 10_000;
    const { prefix } =
        seedClaimedHead(
            storage,
            {
                timelineEpoch:
                    'timeline_integration',
                claimId:
                    'crashed_before_host',
                expiresAt:
                    clock - 1,
                malformedChoosing:
                    true,
            },
        );
    const conflicts = [];
    const { adapter, ports } =
        createRecoveryPorts(
            host,
            storage,
            {
                clock,
                pageId:
                    'reloaded_before_host',
            },
            conflicts,
        );

    const context = ports.getContext();
    assert.equal(
        ports.getSaveRevisionConflict(),
        null,
    );
    assert.equal(
        ports.isSaveRevisionBlocked(),
        false,
    );
    assert.equal(
        conflicts.length,
        0,
    );
    const registration =
        await ports
            .registerSaveRevisionHead();

    assert.equal(
        registration.conflict,
        null,
    );
    assert.equal(
        ports.isSaveRevisionBlocked(),
        false,
    );
    assert.equal(
        conflicts.length,
        0,
    );
    context.chatMetadata
        .hogwartsMud.clock =
        '1991-09-02 · 11:45';
    const result =
        await context.saveMetadata({
            source:
                'reload_recovery',
        });

    assert.equal(result.ok, true);
    assert.equal(
        host.metadataSaves.length,
        1,
    );
    assert.deepEqual(
        adapter.readHead(
            'timeline_integration',
        ),
        {
            saveRevisionVersion: 1,
            timelineEpoch:
                'timeline_integration',
            stateRevision: 1,
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
});

test('first getContext recovers an expired fallback claim before Web Locks can publish a conflict', async () => {
    const storage =
        createStorage();
    const host =
        createHostContext(
            createWorldState(),
        );
    const clock = 12_000;
    const { prefix } =
        seedClaimedHead(
            storage,
            {
                timelineEpoch:
                    'timeline_integration',
                claimId:
                    'crashed_fallback_page',
                expiresAt:
                    clock - 1,
            },
        );
    const lockCalls = [];
    const lockManager = {
        request(
            name,
            options,
            operation,
        ) {
            lockCalls.push({
                name,
                options,
            });
            return operation();
        },
    };
    const conflicts = [];
    const { adapter, ports } =
        createRecoveryPorts(
            host,
            storage,
            {
                clock,
                lockManager,
                pageId:
                    'native_lock_page',
            },
            conflicts,
        );

    const context =
        ports.getContext();
    assert.equal(
        ports.getSaveRevisionConflict(),
        null,
    );
    assert.equal(
        ports.isSaveRevisionBlocked(),
        false,
    );
    assert.equal(
        conflicts.length,
        0,
    );
    assert.deepEqual(
        adapter.readHead(
            'timeline_integration',
        ),
        {
            saveRevisionVersion: 1,
            timelineEpoch:
                'timeline_integration',
            stateRevision: 0,
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
    assert.deepEqual(
        lockCalls,
        [],
    );

    context.chatMetadata
        .hogwartsMud.clock =
        '1991-09-02 · 11:45';
    const result =
        await context.saveMetadata({
            source:
                'native_lock_recovery',
        });
    assert.equal(
        result.ok,
        true,
    );
    assert.equal(
        host.metadataSaves.length,
        1,
    );
    assert.equal(
        lockCalls.length,
        1,
    );
});

test('concurrent real ports registration recovers an expired claim and permits exactly one metadata save', async () => {
    const storage = createStorage();
    const pageA =
        createHostContext(
            createWorldState(),
        );
    const pageB =
        createHostContext(
            createWorldState(),
        );
    const clock = 15_000;
    const { prefix } =
        seedClaimedHead(
            storage,
            {
                timelineEpoch:
                    'timeline_integration',
                claimId:
                    'expired_contended_claim',
                expiresAt:
                    clock - 1,
            },
        );
    const conflictsA = [];
    const conflictsB = [];
    const { ports: portsA } =
        createRecoveryPorts(
            pageA,
            storage,
            {
                clock,
                pageId: 'page_a',
            },
            conflictsA,
        );
    const { ports: portsB } =
        createRecoveryPorts(
            pageB,
            storage,
            {
                clock,
                pageId: 'page_b',
            },
            conflictsB,
        );

    const contextA = portsA.getContext();
    const contextB = portsB.getContext();
    assert.equal(
        portsA.isSaveRevisionBlocked(),
        false,
    );
    assert.equal(
        portsB.isSaveRevisionBlocked(),
        false,
    );
    assert.equal(
        portsA.getSaveRevisionConflict(),
        null,
    );
    assert.equal(
        portsB.getSaveRevisionConflict(),
        null,
    );
    assert.deepEqual(
        [
            conflictsA.length,
            conflictsB.length,
        ],
        [0, 0],
    );
    const registrations =
        await Promise.all([
            portsA.registerSaveRevisionHead(),
            portsB.registerSaveRevisionHead(),
        ]);
    assert.deepEqual(
        registrations.map(
            registration =>
                registration.conflict,
        ),
        [null, null],
    );
    assert.equal(
        portsA.isSaveRevisionBlocked(),
        false,
    );
    assert.equal(
        portsB.isSaveRevisionBlocked(),
        false,
    );
    assert.deepEqual(
        [
            conflictsA.length,
            conflictsB.length,
        ],
        [0, 0],
    );
    contextA.chatMetadata
        .hogwartsMud.clock =
        '1991-09-02 · 11:45';
    contextB.chatMetadata
        .hogwartsMud.clock =
        '1991-09-02 · 11:50';

    const results =
        await Promise.allSettled([
            contextA.saveMetadata({
                source: 'contention_a',
            }),
            contextB.saveMetadata({
                source: 'contention_b',
            }),
        ]);

    assert.equal(
        results.filter(result =>
            result.status ===
                'fulfilled').length,
        1,
    );
    const rejected =
        results.filter(result =>
            result.status ===
                'rejected');
    assert.equal(rejected.length, 1);
    assert.ok(
        rejected[0].reason instanceof
            SaveRevisionConflictError,
    );
    assert.equal(
        pageA.metadataSaves.length +
            pageB.metadataSaves.length,
        1,
    );
    assert.deepEqual(
        storage.keys()
            .filter(key =>
                key.startsWith(
                    prefix,
                )),
        [],
    );
});

test('getContext recovers half-written and recordless claims before registration without conflicts', async () => {
    const recoveryScenarios = [{
        scenario:
            'half_written',
        malformedChoosing:
            true,
        prepareRecords({
            storage,
            prefix,
        }) {
            storage.setItem(
                `${prefix}owner`,
                '{"claimId":',
            );
        },
    }, {
        scenario:
            'no_records',
        malformedChoosing:
            false,
        prepareRecords({
            storage,
            prefix,
        }) {
            for (
                const key of
                storage.keys()
                    .filter(key =>
                        key.startsWith(
                            prefix,
                        ))
            ) {
                storage.removeItem(
                    key,
                );
            }
        },
    }];

    for (
        const {
            malformedChoosing,
            prepareRecords,
            scenario,
        } of recoveryScenarios
    ) {
        const storage =
            createStorage();
        const timelineEpoch =
            `timeline_${scenario}`;
        const host =
            createHostContext(
                createWorldState({
                    timelineEpoch,
                }),
            );
        const clock = 17_500;
        const {
            namespace,
            prefix,
        } = seedClaimedHead(
            storage,
            {
                timelineEpoch,
                claimId: scenario,
                expiresAt:
                    clock + 500,
                malformedChoosing,
            },
        );
        prepareRecords({
            storage,
            prefix,
        });
        const conflicts = [];
        const {
            adapter,
            ports,
        } = createRecoveryPorts(
            host,
            storage,
            {
                clock,
                pageId:
                    `reload_${scenario}`,
            },
            conflicts,
        );

        const context =
            ports.getContext();
        assert.equal(
            ports
                .getSaveRevisionConflict(),
            null,
            scenario,
        );
        assert.equal(
            ports
                .isSaveRevisionBlocked(),
            false,
            scenario,
        );
        assert.equal(
            conflicts.length,
            0,
            scenario,
        );

        const registration =
            await ports
                .registerSaveRevisionHead();
        assert.equal(
            registration.conflict,
            null,
            scenario,
        );
        assert.equal(
            ports
                .isSaveRevisionBlocked(),
            false,
            scenario,
        );
        assert.equal(
            conflicts.length,
            0,
            scenario,
        );

        context.chatMetadata
            .hogwartsMud.clock =
            '1991-09-02 · 11:45';
        const result =
            await context
                .saveMetadata({
                    source:
                        `recover_${scenario}`,
                });

        assert.equal(
            result.ok,
            true,
            scenario,
        );
        assert.equal(
            host.metadataSaves
                .length,
            1,
            scenario,
        );
        assert.deepEqual(
            adapter.readHead(
                timelineEpoch,
            ),
            {
                saveRevisionVersion:
                    1,
                timelineEpoch,
                stateRevision: 1,
                claimId: '',
            },
            scenario,
        );
        assert.deepEqual(
            storage.keys()
                .filter(key =>
                    key.startsWith(
                        prefix,
                    )),
            [],
            scenario,
        );
        assert.notEqual(
            storage.getItem(
                `${namespace}:${
                    encodeURIComponent(
                        timelineEpoch,
                    )
                }`,
            ),
            null,
            scenario,
        );
        assert.equal(
            conflicts.length,
            0,
            scenario,
        );
    }
});

test('registering after a host save crash preserves the persisted revision and commits the next revision once', async () => {
    const storage = createStorage();
    const host =
        createHostContext(
            createWorldState({
                revision: 1,
            }),
        );
    const clock = 20_000;
    const { prefix } =
        seedClaimedHead(
            storage,
            {
                timelineEpoch:
                    'timeline_integration',
                claimId:
                    'crashed_after_host',
                expiresAt:
                    clock - 1,
                malformedChoosing:
                    true,
            },
        );
    const conflicts = [];
    const { adapter, ports } =
        createRecoveryPorts(
            host,
            storage,
            {
                clock,
                pageId:
                    'reloaded_after_host',
            },
            conflicts,
        );

    const context = ports.getContext();
    assert.equal(
        ports.getSaveRevisionConflict(),
        null,
    );
    assert.equal(
        ports.isSaveRevisionBlocked(),
        false,
    );
    assert.equal(
        conflicts.length,
        0,
    );
    const registration =
        await ports
            .registerSaveRevisionHead();

    assert.equal(
        registration.conflict,
        null,
    );
    assert.equal(
        adapter.readHead(
            'timeline_integration',
        ).stateRevision,
        1,
    );
    assert.equal(
        conflicts.length,
        0,
    );
    context.chatMetadata
        .hogwartsMud.clock =
        '1991-09-02 · 11:50';
    const result =
        await context.saveMetadata({
            source:
                'reload_after_host',
        });

    assert.equal(result.ok, true);
    assert.equal(
        result.state.stateRevision,
        2,
    );
    assert.equal(
        host.metadataSaves.length,
        1,
    );
    assert.deepEqual(
        adapter.readHead(
            'timeline_integration',
        ),
        {
            saveRevisionVersion: 1,
            timelineEpoch:
                'timeline_integration',
            stateRevision: 2,
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
});

test('registering a reloaded save preserves an active claim and blocks the host save', async () => {
    const storage = createStorage();
    const host =
        createHostContext(
            createWorldState({
                revision: 0,
            }),
        );
    const clock = 30_000;
    const claimId =
        'active_other_page';
    const { prefix } =
        seedClaimedHead(
            storage,
            {
                timelineEpoch:
                    'timeline_integration',
                claimId,
                expiresAt:
                    clock + 500,
            },
        );
    const liveRecords =
        storage.keys()
            .filter(key =>
                key.startsWith(
                    prefix,
                ))
            .map(key => [
                key,
                storage.getItem(key),
            ]);
    const conflicts = [];
    const { ports } =
        createRecoveryPorts(
            host,
            storage,
            {
                clock,
                pageId:
                    'blocked_reload',
            },
            conflicts,
        );

    const context = ports.getContext();
    assert.equal(
        ports.isSaveRevisionBlocked(),
        true,
    );
    assert.equal(
        ports
            .getSaveRevisionConflict()
            .code,
        'save_in_progress',
    );
    assert.equal(
        conflicts.length,
        1,
    );
    assert.equal(
        conflicts[0].conflict.code,
        'save_in_progress',
    );
    const registration =
        await ports
            .registerSaveRevisionHead();

    assert.equal(
        registration.conflict.code,
        'save_in_progress',
    );
    assert.equal(
        conflicts.length,
        1,
    );
    context.chatMetadata
        .hogwartsMud.clock =
        '1991-09-02 · 11:55';
    await assert.rejects(
        context.saveMetadata({
            source:
                'blocked_active_claim',
        }),
        SaveRevisionConflictError,
    );
    assert.equal(
        host.metadataSaves.length,
        0,
    );
    assert.deepEqual(
        storage.keys()
            .filter(key =>
                key.startsWith(
                    prefix,
                ))
            .map(key => [
                key,
                storage.getItem(key),
            ]),
        liveRecords,
    );
});

test('recovery keeps the claim base when the reloaded host revision is older', async () => {
    const storage = createStorage();
    const host =
        createHostContext(
            createWorldState({
                revision: 3,
            }),
        );
    const clock = 40_000;
    const timelineEpoch =
        'timeline_integration';
    const encodedEpoch =
        encodeURIComponent(
            timelineEpoch,
        );
    storage.setItem(
        `hogwartsMud.saveRevision:${encodedEpoch}`,
        JSON.stringify({
            saveRevisionVersion: 1,
            timelineEpoch,
            stateRevision: 6,
            claimId: 'stale_claim',
            claimBaseRevision: 5,
        }),
    );
    const conflicts = [];
    const { adapter, ports } =
        createRecoveryPorts(
            host,
            storage,
            {
                clock,
                pageId:
                    'older_reload',
            },
            conflicts,
        );

    ports.getContext();
    assert.equal(
        ports.isSaveRevisionBlocked(),
        true,
    );
    assert.equal(
        ports
            .getSaveRevisionConflict()
            .code,
        'stale_save',
    );
    assert.equal(
        ports
            .getSaveRevisionConflict()
            .actualRevision,
        5,
    );
    assert.equal(
        conflicts.length,
        1,
    );
    const registration =
        await ports
            .registerSaveRevisionHead();

    assert.equal(
        registration.conflict.code,
        'stale_save',
    );
    assert.equal(
        registration.conflict
            .actualRevision,
        5,
    );
    assert.equal(
        conflicts.length,
        1,
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
    assert.equal(
        host.metadataSaves.length,
        0,
    );
    assert.deepEqual(
        storage.keys()
            .filter(key =>
                key.includes(
                    `.mutex:${
                        encodedEpoch
                    }:`,
                )),
        [],
    );
});

test('calendar metadata no-op consumes its revision once and a stale repeat never reaches the host', async () => {
    const storage =
        createStorage();
    const pageA =
        createHostContext(
            createWorldState({
                revision: 4,
            }),
        );
    const pageB =
        createHostContext(
            createWorldState({
                revision: 4,
            }),
        );
    const portsA =
        createPagePorts(
            pageA,
            storage,
            'calendar_page_a',
        );
    const portsB =
        createPagePorts(
            pageB,
            storage,
            'calendar_page_b',
        );
    await portsA
        .registerSaveRevisionHead();
    await portsB
        .registerSaveRevisionHead();

    const saveOptions = {
        source:
            'calendar_high_director',
        changedDomains: [
            'calendar',
        ],
        consumeRevision:
            true,
    };
    const first =
        await portsA
            .getContext()
            .saveMetadata(
                saveOptions,
            );

    assert.equal(
        first.ok,
        true,
    );
    assert.equal(
        first.state
            .stateRevision,
        5,
    );
    assert.equal(
        pageA.metadataSaves.length,
        1,
    );

    await assert.rejects(
        portsB
            .getContext()
            .saveMetadata(
                saveOptions,
            ),
        SaveRevisionConflictError,
    );
    assert.equal(
        pageB.metadataSaves.length,
        0,
    );
});

test('two pages share the head and the stale metadata save never reaches the host', async () => {
    const storage = createStorage();
    const pageA = createHostContext(
        createWorldState({
            revision: 12,
        }),
    );
    const pageB = createHostContext(
        createWorldState({
            revision: 12,
        }),
    );
    const conflicts = [];
    const portsA =
        createPagePorts(
            pageA,
            storage,
            'page_a',
        );
    const portsB =
        createPagePorts(
            pageB,
            storage,
            'page_b',
            conflicts,
        );
    await portsA
        .registerSaveRevisionHead();
    await portsB
        .registerSaveRevisionHead();

    const contextA =
        portsA.getContext();
    contextA.chatMetadata
        .hogwartsMud.clock =
        '1991-09-02 · 11:45';
    await contextA.saveMetadata({
        source: 'turn',
    });

    const contextB =
        portsB.getContext();
    contextB.chatMetadata
        .hogwartsMud.clock =
        '1991-09-02 · 11:50';
    await assert.rejects(
        contextB.saveMetadata({
            source: 'turn',
        }),
        SaveRevisionConflictError,
    );

    assert.equal(
        pageA.metadataSaves.length,
        1,
    );
    assert.equal(
        pageA.metadataSaves[0]
            .stateRevision,
        13,
    );
    assert.equal(
        pageB.metadataSaves.length,
        0,
    );
    assert.equal(
        conflicts.length,
        1,
    );
    assert.equal(
        conflicts[0]
            .conflict
            .expectedRevision,
        12,
    );
    assert.equal(
        conflicts[0]
            .conflict
            .actualRevision,
        13,
    );
    assert.match(
        conflicts[0].message,
        /刷新/u,
    );
    assert.equal(
        portsB
            .isSaveRevisionBlocked(),
        true,
    );
    assert.equal(
        pageB.context
            .chatMetadata
            .hogwartsMud
            .clock,
        '1991-09-02 · 11:30',
    );
});

test('storage fallback finishes a chat-only host write before a competing metadata save enters', async () => {
    const storage = createStorage();
    const pageA =
        createHostContext(
            createWorldState(),
        );
    const pageB =
        createHostContext(
            createWorldState(),
        );
    const portsA =
        createPagePorts(
            pageA,
            storage,
            'chat_race_a',
        );
    const portsB =
        createPagePorts(
            pageB,
            storage,
            'chat_race_b',
        );
    await portsA
        .registerSaveRevisionHead();
    await portsB
        .registerSaveRevisionHead();

    const originalSaveChat =
        pageA.context.saveChat;
    let markHostSaveStarted;
    let releaseHostSave;
    const hostSaveStarted =
        new Promise(resolve => {
            markHostSaveStarted =
                resolve;
        });
    const hostSaveReleased =
        new Promise(resolve => {
            releaseHostSave =
                resolve;
        });
    pageA.context.saveChat =
        async function saveChat() {
            markHostSaveStarted();
            await hostSaveReleased;
            return originalSaveChat
                .call(this);
        };

    const pendingChatSave =
        portsA.getContext()
            .saveChat({
                source: 'translation',
            });
    await hostSaveStarted;

    const contextB =
        portsB.getContext();
    contextB.chatMetadata
        .hogwartsMud.clock =
        '1991-09-02 · 11:45';
    const pendingMetadataSave =
        contextB.saveMetadata({
            source: 'turn',
        });
    await new Promise(resolve =>
        setTimeout(resolve, 10));
    assert.equal(
        pageB.metadataSaves.length,
        0,
    );

    releaseHostSave();
    await pendingChatSave;
    const metadataResult =
        await pendingMetadataSave;

    assert.equal(
        metadataResult.ok,
        true,
    );
    assert.equal(
        pageA.chatSaves.length,
        1,
    );
    assert.equal(
        pageB.metadataSaves.length,
        1,
    );
    assert.equal(
        pageB.context
            .chatMetadata
            .hogwartsMud
            .clock,
        '1991-09-02 · 11:45',
    );
    assert.equal(
        pageB.metadataSaves[0]
            .stateRevision,
        1,
    );
});

test('display localization performs no chat or metadata save on a stale page', async () => {
    const storage = createStorage();
    const pageA = createHostContext(
        createWorldState({
            revision: 4,
        }),
    );
    const pageB = createHostContext(
        createWorldState({
            revision: 4,
        }),
    );
    const portsA =
        createPagePorts(
            pageA,
            storage,
            'translation_a',
        );
    const portsB =
        createPagePorts(
            pageB,
            storage,
            'translation_b',
        );
    await portsA
        .registerSaveRevisionHead();
    await portsB
        .registerSaveRevisionHead();

    const contextA =
        portsA.getContext();
    contextA.chatMetadata
        .hogwartsMud.clock =
        '1991-09-02 · 11:45';
    await contextA.saveMetadata({
        source: 'turn',
    });

    const translation =
        createTranslationController({
            getMudState: () =>
                portsB
                    .getContext()
                    .chatMetadata
                    .hogwartsMud,
            getSettings: () => ({
                translationProvider:
                    'local',
            }),
            idleLocalizationScheduler: {
                schedule: () => {},
            },
            localizationQueue: {
                raisePriority:
                    () => {},
            },
            localizationTable: {
                queryRows:
                    async () => ({
                        rows: {},
                    }),
                requestRetranslation:
                    async () => {},
            },
            renderAll: () => {},
            scheduleRender: () => {},
            session:
                createUiSessionState(),
            storage: {
                getItem:
                    () => 'zh-CN',
                setItem:
                    () => {},
            },
        });
    await translation
        .translateMessage(0);

    assert.equal(
        pageB.chatSaves.length,
        0,
    );
    assert.equal(
        pageB.metadataSaves
            .length,
        0,
    );
});

test('a failed stream is surfaced after one save guard and one model request', async () => {
    const profiles = [{
        id: 'low',
    }];
    let requestChecks = 0;
    let modelCalls = 0;
    const adapter =
        createModelAdapter({
            beforeRequest: () => {
                requestChecks += 1;
                if (
                    requestChecks > 1
                ) {
                    throw new SaveRevisionConflictError({
                        code:
                            'stale_save',
                        timelineEpoch:
                            'timeline_integration',
                        expectedRevision:
                            4,
                        actualRevision:
                            5,
                        source:
                            'translation',
                    });
                }
            },
            getConnectionProfiles:
                () => profiles,
            applyRegexPresetById:
                async () => {},
            createContextBudgetPlan:
                () => null,
            limitMessagesToContext:
                value => value,
            parseCompleteJsonObject:
                JSON.parse,
            uuidv4: () => 'request',
            ConnectionManagerRequestService: {
                async sendRequest() {
                    modelCalls += 1;
                    throw new Error(
                        'stream disconnected',
                    );
                },
            },
        });

    await assert.rejects(
        adapter.sendRoleRequest(
            {
                profileId: 'low',
            },
            [],
            {
                stream: true,
            },
        ),
        /stream disconnected/u,
    );

    assert.equal(
        requestChecks,
        1,
    );
    assert.equal(
        modelCalls,
        1,
    );
    assert.deepEqual(
        profiles,
        [{
            id: 'low',
        }],
    );
});

test('a stale player chat is removed locally and never starts the turn workflow', async () => {
    const storage = createStorage();
    const pageAState =
        createWorldState({
            revision: 8,
        });
    const pageBState =
        structuredClone(
            pageAState,
        );
    pageAState.phase = 'playing';
    pageBState.phase = 'playing';
    pageAState.turn = {};
    pageBState.turn = {};
    const pageA =
        createHostContext(
            pageAState,
        );
    const pageB =
        createHostContext(
            pageBState,
        );
    const portsA =
        createPagePorts(
            pageA,
            storage,
            'turn_a',
        );
    const portsB =
        createPagePorts(
            pageB,
            storage,
            'turn_b',
        );
    await portsA
        .registerSaveRevisionHead();
    await portsB
        .registerSaveRevisionHead();
    const contextA =
        portsA.getContext();
    contextA.chatMetadata
        .hogwartsMud.clock =
        '1991-09-02 · 11:45';
    await contextA.saveMetadata({
        source: 'turn',
    });

    const composerInput = {
        value: '我举起魔杖。',
        style: {
            height: '40px',
        },
        dispatchEvent() {},
        focus() {},
    };
    let workflowCalls = 0;
    const initialChatLength =
        pageB.context.chat.length;
    const controller =
        createTurnController({
            refs: {
                composerInput,
            },
            applySystemPrompt:
                () => {},
            createLegacyTurnRollbackCheckpoint:
                () => null,
            getActiveAddressingState:
                state => state,
            getAvailableTurnRollbackCheckpoint:
                () => null,
            getContext:
                portsB.getContext,
            getFailedPlayerTurn:
                () => null,
            getMudState: () =>
                portsB
                    .getContext()
                    .chatMetadata
                    .hogwartsMud,
            jobRegistry: {
                turnActive: false,
                sceneTransitionActive:
                    false,
                interiorMap: null,
            },
            parseSpellCastDirectives:
                () => [],
            renderAll: () => {},
            renderComposerAddressing:
                () => {},
            resolvePlayerAddressing:
                () => ({
                    valid: true,
                }),
            restoreTurnRetryCheckpoint:
                value => value,
            runStructuredTurn:
                async () => {
                    workflowCalls += 1;
                },
            syncLocalKnowledge:
                async () => {},
        });
    await controller.submitTurn();

    assert.equal(
        pageB.context.chat.length,
        initialChatLength,
    );
    assert.equal(
        pageB.chatSaves.length,
        0,
    );
    assert.equal(
        composerInput.value,
        '我举起魔杖。',
    );
    assert.equal(
        workflowCalls,
        0,
    );
});

test('an event transaction commits one revision with the authoritative Item diff', async () => {
    const storage = createStorage();
    const host =
        createHostContext(
            createWorldState(),
        );
    const ports =
        createPagePorts(
            host,
            storage,
            'event',
        );
    await ports
        .registerSaveRevisionHead();

    const context =
        ports.getContext();
    const item =
        context.chatMetadata
            .hogwartsMud
            .items[0];
    item.holderId =
        'canon_hermione_jean_granger';
    item.location.roomId =
        'library';
    item.state = 'damaged';
    const result =
        await context.saveMetadata({
            source:
                'event_transaction',
            changedDomains: [
                'event',
            ],
        });

    assert.equal(result.ok, true);
    assert.equal(
        result.state
            .stateRevision,
        1,
    );
    assert.equal(
        host.metadataSaves.length,
        1,
    );
    const entry =
        host.metadataSaves[0]
            .revisionHistory
            .at(-1);
    assert.equal(
        entry.source,
        'event_transaction',
    );
    assert.deepEqual(
        entry.changedDomains,
        [
            'event',
            'item',
        ],
    );
    assert.deepEqual(
        entry.itemChanges,
        [{
            itemId:
                'borrowed_quill',
            before: {
                ownerId: 'player',
                holderId: 'player',
                location: {
                    mapId:
                        'hogwarts_castle',
                    roomId:
                        'charms_classroom',
                    placement:
                        'with_holder',
                },
                state: 'intact',
            },
            after: {
                ownerId: 'player',
                holderId:
                    'canon_hermione_jean_granger',
                location: {
                    mapId:
                        'hogwarts_castle',
                    roomId:
                        'library',
                    placement:
                        'with_holder',
                },
                state: 'damaged',
            },
        }],
    );
});

test('new timeline initialization creates a fresh epoch at revision zero', () => {
    const storage = createStorage();
    const host =
        createHostContext(
            createWorldState(),
        );
    const ports =
        createPagePorts(
            host,
            storage,
            'new_timeline',
        );
    const first =
        ports
            .initializeNewTimelineState(
                {
                    phase:
                        'initializing',
                },
                {
                    epochFactory:
                        () =>
                            'timeline_new_a',
                },
            );
    const second =
        ports
            .initializeNewTimelineState(
                {
                    phase:
                        'initializing',
                },
                {
                    epochFactory:
                        () =>
                            'timeline_new_b',
                },
            );

    assert.equal(
        first.stateRevision,
        0,
    );
    assert.deepEqual(
        first.revisionHistory,
        [],
    );
    assert.notEqual(
        first.timelineEpoch,
        second.timelineEpoch,
    );
});

test('an observed legacy revision migration remains pending until head registration persists it', async () => {
    const storage = createStorage();
    const host =
        createHostContext({
            clock:
                '1991-09-02 · 11:30',
            items: [],
            actorLibrary: [],
        });
    const ports =
        createPagePorts(
            host,
            storage,
            'legacy_load',
        );

    const observed =
        ports.getContext();
    assert.equal(
        observed.chatMetadata
            .hogwartsMud
            .saveRevisionVersion,
        1,
    );
    assert.equal(
        host.metadataSaves.length,
        0,
    );

    await ports
        .registerSaveRevisionHead();

    assert.equal(
        host.metadataSaves.length,
        1,
    );
    assert.equal(
        host.metadataSaves[0]
            .stateRevision,
        0,
    );
    assert.deepEqual(
        host.metadataSaves[0]
            .revisionHistory,
        [],
    );
});
