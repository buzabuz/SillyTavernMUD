/* eslint-disable playwright/expect-expect */
import {
    migrateCalendarState,
} from '../public/scripts/extensions/hogwarts-mud/domain/calendar-migration.js';
import {
    advanceWorldClock,
    getWorldDate,
} from '../public/scripts/extensions/hogwarts-mud/domain/time-environment.js';
import {
    applyTurnTransaction,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-reducer.js';
import {
    createTurnPerformanceBudget,
    estimateTurnMinutes,
} from '../public/scripts/extensions/hogwarts-mud/domain/turn-time.js';
import {
    createCurrentPlayingState,
} from './hogwarts-mud-test-fixtures.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

function createCurrentCalendarEntry(
    id,
    startClock,
    endClock,
) {
    return {
        id,
        parentId: '',
        entryType: 'event',
        title: id,
        titleEn: id,
        summary:
            `${id} 的公开安排。`,
        summaryEn:
            `Public schedule for ${id}.`,
        tags: [],
        startClock,
        endClock,
        participantIds: [],
        mapId: 'zhang_home',
        roomId: 'kitchen',
        status: 'planned',
        planningTier: 'medium',
        relatedSceneIds: [],
        createdClock:
            '1991-07-24 · 09:15',
        updatedClock:
            '1991-07-24 · 09:15',
    };
}

function migrateCurrentCalendarFixture(
    state,
    entries,
) {
    const migration =
        migrateCalendarState({
            ...state,
            calendar: {
                version: 1,
                entries,
                horizon:
                    state.clock,
            },
        });
    return migration.state;
}

function addCurrentExpiredStoryBeat(
    state,
    id,
) {
    const next =
        structuredClone(state);
    const storylineId =
        `${id}_storyline`;
    next.calendar.storylines.push({
        id: storylineId,
        title: storylineId,
        titleEn: storylineId,
        summary:
            '用于统一时钟结算回归的公开故事线。',
        summaryEn:
            'A public storyline for shared clock-settlement regression.',
        tags: [],
        startClock:
            '1991-07-24 · 09:00',
        endClock:
            '1992-06-30 · 23:59',
        participantIds: [],
        status: 'active',
        createdClock:
            '1991-07-24 · 09:15',
        updatedClock:
            '1991-07-24 · 09:15',
    });
    next.calendar.storyBeats.push({
        id,
        storylineId,
        title: id,
        titleEn: id,
        summary:
            '正文错误地宣称四个场景已经全部完成。',
        summaryEn:
            'The prose incorrectly claims that all four Scenes are complete.',
        tags: [],
        termKey:
            `${id}_term`,
        sequence: 1,
        windowStartClock:
            '1991-07-24 · 09:00',
        windowEndClock:
            '1991-07-24 · 09:45',
        sceneTarget: 4,
        status: 'active',
        relatedSceneIds: [],
        createdClock:
            '1991-07-24 · 09:15',
        updatedClock:
            '1991-07-24 · 09:15',
    });
    return next;
}

test('an explicitly instantaneous magical action may advance less than fifteen minutes', () => {
    const state =
        createCurrentPlayingState();
    state.clock =
        '1991-07-24 · 09:15';
    const transaction = {
        elapsedMinutes: 2,
        instantaneousMagic: true,
        exceptionReasonEn: 'A single wand reaction resolves instantly.',
        publicEventEn: 'A brief spark jumps from the wand.',
        segments: [{ type: 'narration', textEn: 'A spark flashes and vanishes.' }],
        actorUpdates: [],
        revealedClues: [],
    };
    const magical = applyTurnTransaction(state, transaction, '我举起魔杖施法。');
    const mundane = applyTurnTransaction(
        state,
        {
            ...transaction,
            instantaneousMagic: false,
            exceptionReasonEn: '',
        },
        '我看向桌子。',
    );
    assert.equal(advanceWorldClock('1991-12-31 · 23:55', 15), '1992-01-01 · 00:10');
    assert.equal(magical.clock, '1991-07-24 · 09:17');
    assert.equal(mundane.clock, '1991-07-24 · 09:30');
});

test('ordinary turns settle active and fully crossed Calendar intervals after advancing the clock', () => {
    const state =
        createCurrentPlayingState();
    state.clock =
        '1991-07-24 · 09:15';
    const migratedState =
        addCurrentExpiredStoryBeat(
            migrateCurrentCalendarFixture(
                state,
                [
                    createCurrentCalendarEntry(
                        'crossed_turn_event',
                        '1991-07-24 · 09:30',
                        '1991-07-24 · 10:00',
                    ),
                    createCurrentCalendarEntry(
                        'active_turn_event',
                        '1991-07-24 · 10:30',
                        '1991-07-24 · 11:00',
                    ),
                ],
            ),
            'ordinary_turn_expired_beat',
        );
    const next =
        applyTurnTransaction(
            migratedState,
            {
                elapsedMinutes: 90,
                publicEventEn:
                    'The morning passes during a long conversation.',
                segments: [{
                    type: 'narration',
                    textEn:
                        'The conversation continues through the morning.',
                }],
                actorUpdates: [],
                revealedClues: [],
            },
            '我继续聊了一整个上午。',
        );

    assert.equal(
        next.clock,
        '1991-07-24 · 10:45',
    );
    assert.deepEqual(
        next.calendar.entries
            .map(entry => [
                entry.id,
                entry.status,
            ]),
        [
            [
                'crossed_turn_event',
                'completed',
            ],
            [
                'active_turn_event',
                'active',
            ],
        ],
    );
    assert.equal(
        next.calendar.storyBeats
            .find(beat =>
                beat.id ===
                'ordinary_turn_expired_beat')
            .status,
        'deferred',
        'ordinary turns use the shared local beat settlement',
    );
});

test('daily time policy advances ordinary turns locally without a per-turn director decision', () => {
    const policy = {
        defaultMinutes: 15,
        movementMinutes: 20,
        investigationMinutes: 35,
        extendedActionMinutes: 90,
        instantaneousMagicMinutes: 2,
    };
    assert.equal(
        getWorldDate(
            '1991-07-24 · 09:30',
        ),
        '1991-07-24',
    );
    assert.equal(
        estimateTurnMinutes(
            '我回答了麦格的问题。',
            policy,
        ),
        15,
    );
    assert.equal(
        estimateTurnMinutes(
            '我前往厨房。',
            policy,
        ),
        20,
    );
    assert.equal(
        estimateTurnMinutes(
            '我仔细检查照片。',
            policy,
        ),
        35,
    );
    assert.equal(
        estimateTurnMinutes(
            '我练习魔药一整个下午。',
            policy,
        ),
        90,
    );
    assert.equal(
        estimateTurnMinutes(
            '我举起魔杖施法。',
            policy,
        ),
        2,
    );
},
);

test('turn performance budgets scale prose to the locally decided duration', () => {
    const policy = {
        defaultMinutes: 15,
        movementMinutes: 20,
        investigationMinutes: 35,
        extendedActionMinutes: 90,
        instantaneousMagicMinutes: 2,
    };
    assert.deepEqual(createTurnPerformanceBudget('我回答麦格教授。', policy), {
        elapsedMinutes: 15,
        minimumWords: 240,
        maximumWords: 560,
    });
    assert.deepEqual(createTurnPerformanceBudget('我练习魔药一整个下午。', policy), {
        elapsedMinutes: 90,
        minimumWords: 540,
        maximumWords: 860,
    });
    assert.deepEqual(createTurnPerformanceBudget('我举起魔杖施法。', policy), {
        elapsedMinutes: 2,
        minimumWords: 60,
        maximumWords: 380,
    });
    assert.deepEqual(
        createTurnPerformanceBudget(
            '你等下一起上课吗？',
            policy,
            {
                adjudicatedMinutes:
                    15,
            },
        ),
        {
            elapsedMinutes: 15,
            minimumWords: 240,
            maximumWords: 560,
        },
    );
    assert.deepEqual(
        createTurnPerformanceBudget(
            '我在人群里和大家说话。',
            policy,
            {
                activeNamedActorCount: 6,
            },
        ),
        {
            elapsedMinutes: 15,
            minimumWords: 420,
            maximumWords: 860,
            activeNamedActorCount: 6,
            ensemble: true,
            minimumSegments: 6,
            maximumSegments: 20,
            primaryProgressionShare:
                0.4,
            maximumIndividuatedSecondaryActors:
                2,
        },
    );
    assert.deepEqual(
        createTurnPerformanceBudget(
            '我举起魔杖施法。',
            policy,
            {
                activeNamedActorCount: 6,
            },
        ),
        {
            elapsedMinutes: 2,
            minimumWords: 60,
            maximumWords: 380,
        },
    );
});
