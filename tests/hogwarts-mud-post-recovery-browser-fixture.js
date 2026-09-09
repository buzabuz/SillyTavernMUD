/* global document, location */
import { createStoryRenderer } from '../public/scripts/extensions/hogwarts-mud/ui/story-renderer.js';
import { createUiSessionState } from '../public/scripts/extensions/hogwarts-mud/ui/session-state.js';
import { createPendingPostSettlement } from '../public/scripts/extensions/hogwarts-mud/domain/pending-post-settlement.js';
import { createPostRecovery, emptyPostObservation } from '../public/scripts/extensions/hogwarts-mud/domain/post-recovery.js';
import { createMessageRenderer } from '../public/scripts/extensions/hogwarts-mud/ui/message-renderer.js';
import { preserveSceneNarrative } from '../public/scripts/extensions/hogwarts-mud/domain/narrative-preservation.js';
import { normalizeTranslationProvider } from '../public/scripts/extensions/hogwarts-mud/domain/translation.js';

const state = {
    phase: 'playing', timelineEpoch: 'browser_fixture', stateRevision: 0,
    turn: { status: 'post_unsettled', count: 0 }, scene: { id: 'fixture_scene' },
    actors: [], actorLibrary: [], clock: '1991-09-01',
};
const transaction = {
    narrativeFirst: true, protocolVersion: 3, elapsedMinutes: 15,
    segments: [{ type: 'narration', textEn: 'The letter rests on the table.' }],
};
const observation = emptyPostObservation(transaction);
observation.observation.diagnostics.familyRejections = ['actorUpdates', 'sceneProgression'].map(family => ({
    family, disposition: 'discard_family', reasonCode: 'missing_family',
}));
const pending = createPendingPostSettlement({
    state, playerMessageId: 0, sceneMessageId: 1, transactionDraft: transaction,
    preTurnCheckpoint: { version: 1, baseState: structuredClone(state) },
    recovery: createPostRecovery(observation, transaction),
});
const scenario = new URLSearchParams(location.search).get('scenario');
if (scenario === 'spent' || scenario === 'reserved') pending.recovery.supplement.status = scenario;
if (scenario === 'movement') pending.recovery.blockingMovement = true;
if (scenario === 'legacy') { pending.version = 1; delete pending.recovery; }
const context = { chat: [
    { is_user: true, mes: 'Wait.', extra: { hogwartsMud: { role: 'player_turn' } } },
    { is_user: false, mes: transaction.segments[0].textEn,
        extra: { hogwartsMud: { role: 'scene_turn', segments: transaction.segments, pendingPostSettlement: pending } } },
] };
const session = createUiSessionState();
if (scenario?.startsWith('speaker')) {
    const speakers = [{ id: 'temp_delivery_person', displayNameEn: 'Letter Carrier' }];
    if (scenario === 'speaker_canonical_collision') {
        state.actors.push({ id: 'temp_delivery_person', nameEn: 'Known Canon Actor' });
    }
    if (scenario === 'speaker_collision') speakers.push({ ...speakers[0], displayNameEn: 'Different Person' });
    Object.assign(context.chat[1].extra.hogwartsMud, preserveSceneNarrative({
        segments: [{ type: 'dialogue', actorId: 'temp_delivery_person', textEn: 'A letter for you.' }], speakers,
    }));
}
context.messageFormatting = text => {
    const element = document.createElement('span');
    element.textContent = text;
    return element.innerHTML;
};
const messageRenderer = createMessageRenderer({
    session, getWorldState: () => state, getContext: () => context, getSettings: () => ({}),
    normalizeTranslationProvider,
    initials: name => name.slice(0, 1),
    getLocalizedField: field => {
        if (field.recordKind === 'message_segment') return { text: '有你的一封信。', status: 'translated' };
        if (field.recordKind === 'message_speaker') {
            if (field.recordId !== 'message:1:speaker:temp_delivery_person' || field.fieldPath !== 'displayNameEn') {
                throw new Error('Unexpected local speaker translation identity');
            }
            return scenario === 'speaker_translated'
                ? { text: '送信人', status: 'translated' } : { text: '', status: 'pending' };
        }
        return { text: '', status: 'translated' };
    },
    ensureLocalizedFields: async fields => {
        if (fields.some(f => f.recordKind === 'actor_core' && f.recordId === 'temp_delivery_person')) {
            throw new Error('Message-local speaker must not use a Canon Actor translation identity');
        }
    },
});
const jobRegistry = {};
if (scenario === 'unsaved') {
    const message = context.chat.pop();
    jobRegistry.unsavedPostNarrative = { chat: context.chat, message, messageId: 1 };
}
const storyElement = document.querySelector('#story');
let renderer;
renderer = createStoryRenderer({
    refs: { root: document.querySelector('#hpmud_app'), storyElement },
    session, CURRENT_SCENE_PAGE_SIZE: 20, ARCHIVE_LIST_PAGE_SIZE: 6,
    getContext: () => context, getWorldState: () => state,
    getCurrentSceneMessageEntries: () => context.chat[1] ? [{ messageId: 1, message: context.chat[1] }] : [],
    getLocalizedField: () => ({ text: '现场', status: 'translated' }),
    getFailedPlayerTurn: () => null, jobRegistry,
    isSaveRevisionBlocked: () => scenario === 'conflict',
    renderMessage: (message, messageId) => {
        if (scenario?.startsWith('speaker')) return messageRenderer.renderSegmentedMessage(
            message, messageId, message.extra.hogwartsMud.segments,
        );
        const p = document.createElement('p');
        p.textContent = '信封放在桌上。';
        return p;
    },
    renderAll: () => renderer.renderStory(),
    retryPendingPostSettlement: async options => {
        document.querySelector('#result').textContent = JSON.stringify(options);
        if (options.saveOnly) {
            context.chat.push(jobRegistry.unsavedPostNarrative.message);
            delete jobRegistry.unsavedPostNarrative;
            return { settled: false, narrativeSaved: true };
        }
        pending.recovery.supplement.status = 'spent';
    },
});
document.querySelector('#redraw').addEventListener('click', () => renderer.renderStory());
renderer.renderStory();
