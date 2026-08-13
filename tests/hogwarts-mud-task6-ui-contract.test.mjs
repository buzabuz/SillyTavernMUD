/* eslint-disable playwright/expect-expect */
import assert from 'node:assert/strict';
import {
    readFile,
    readdir,
} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
    fileURLToPath,
} from 'node:url';

import { createActionPorts } from '../public/scripts/extensions/hogwarts-mud/runtime/action-ports.js';
import { createHostEventBindings } from '../public/scripts/extensions/hogwarts-mud/runtime/host-events.js';
import {
    canOpenCurrentV2SaveReadOnly,
    shouldTranslateRenderedMessage,
} from '../public/scripts/extensions/hogwarts-mud/runtime/read-only-policy.js';
import { createUiSessionState } from '../public/scripts/extensions/hogwarts-mud/ui/session-state.js';
import {
    resolveNewAssistantStoryMessageId,
    resolveStoryScrollMode,
} from '../public/scripts/extensions/hogwarts-mud/ui/story-scroll.js';

const PROJECT_ROOT = fileURLToPath(
    new URL('../', import.meta.url),
);
const CLIENT_ROOT = path.join(
    PROJECT_ROOT,
    'public/scripts/extensions/hogwarts-mud',
);

function lineCount(source) {
    return (
        source.match(/\n/gu)?.length || 0
    ) + (
        source.endsWith('\n') ? 0 : 1
    );
}

test('read-only loading policy preserves the v2 cursor contract', () => {
    const save = {
        fileName: 'Tina.jsonl',
        storageCharacterId: 7,
    };
    const state = {
        socialGraph: {
            version: 2,
            extractorVersion: 6,
            lastProcessedMessageId: 11,
        },
    };
    assert.equal(
        canOpenCurrentV2SaveReadOnly(
            save,
            {
                currentChatId: 'Tina',
                characterId: '7',
                chatLength: 12,
                state,
            },
        ),
        true,
    );
    assert.equal(
        canOpenCurrentV2SaveReadOnly(
            save,
            {
                currentChatId: 'Tina',
                characterId: 7,
                chatLength: 13,
                state,
            },
        ),
        false,
    );
    assert.equal(
        shouldTranslateRenderedMessage(
            11,
            state,
        ),
        false,
    );
    assert.equal(
        shouldTranslateRenderedMessage(
            12,
            state,
        ),
        true,
    );
});

test('UI session state is instance-local and excludes world authority', () => {
    const left = createUiSessionState({
        campaign: {
            presetId: 'left',
        },
    });
    const right = createUiSessionState({
        campaign: {
            presetId: 'right',
        },
    });
    left.selectedActorId = 'ron';
    left.liveSceneStream = {
        phase: 'receiving',
    };

    assert.equal(right.selectedActorId, '');
    assert.equal(right.liveSceneStream, null);
    assert.equal(
        right.latestStoryMessageId,
        null,
    );
    assert.deepEqual(
        {
            date: right.calendarSelectedDate,
            month: right.calendarDisplayMonth,
            entry: right.calendarSelectedEntryId,
            scene: right.calendarSelectedSceneId,
            timelineEpoch: right.calendarTimelineEpoch,
        },
        {
            date: '',
            month: '',
            entry: '',
            scene: '',
            timelineEpoch: '',
        },
    );
    for (const authorityKey of [
        'character',
        'clock',
        'scene',
        'actors',
        'actorLibrary',
        'socialGraph',
        'items',
        'spellbook',
        'turn',
    ]) {
        assert.equal(
            Object.hasOwn(left, authorityKey),
            false,
        );
    }
});

test('live generation stays loading-only until a final message is committed', async () => {
    const source =
        await readFile(
            path.join(
                CLIENT_ROOT,
                'ui',
                'message-renderer.js',
            ),
            'utf8',
        );
    const liveRenderer =
        source.slice(
            source.indexOf(
                'function renderLiveSceneStream()',
            ),
            source.indexOf(
                'function renderMessage(',
            ),
        );

    assert.match(
        liveRenderer,
        /createGenerationStatusCard/u,
    );
    assert.match(
        liveRenderer,
        /正文将在校验并提交后一次显示/u,
    );
    assert.doesNotMatch(
        liveRenderer,
        /renderSegmentedMessage/u,
    );
    assert.doesNotMatch(
        liveRenderer,
        /hpmud-streaming-turn|段已落笔/u,
    );
});

test('custom spell candidates reuse deterministic accept and ignore UI flow', async () => {
    const [
        messageSource,
        spellComponentSource,
        appControllerSource,
        workflowSource,
    ] = await Promise.all([
        readFile(
            path.join(
                CLIENT_ROOT,
                'ui',
                'message-renderer.js',
            ),
            'utf8',
        ),
        readFile(
            path.join(
                CLIENT_ROOT,
                'ui',
                'spell-components.js',
            ),
            'utf8',
        ),
        readFile(
            path.join(
                CLIENT_ROOT,
                'ui',
                'app-controller.js',
            ),
            'utf8',
        ),
        readFile(
            path.join(
                CLIENT_ROOT,
                'workflows',
                'application.js',
            ),
            'utf8',
        ),
    ]);

    assert.match(
        messageSource,
        /turnTransaction[\s\S]*?spellCandidates/u,
    );
    assert.match(
        messageSource,
        /createSpellCandidateCard/u,
    );
    assert.match(
        spellComponentSource,
        /发现新咒语/u,
    );
    assert.match(
        spellComponentSource,
        /收录/u,
    );
    assert.match(
        spellComponentSource,
        /忽略/u,
    );
    assert.match(
        appControllerSource,
        /pendingSpellProposals:/u,
    );
    assert.match(
        appControllerSource,
        /spellProposalDecisions:/u,
    );
    assert.match(
        workflowSource,
        /acceptSpellCandidate/u,
    );
    assert.doesNotMatch(
        workflowSource.slice(
            workflowSource.indexOf(
                'async function decideSpellCandidate',
            ),
            workflowSource.indexOf(
                'const acceptSpellCandidate',
            ),
        ),
        /syncLocalKnowledge|sendRoleRequest/u,
    );
});

test('a newly committed assistant message anchors at its top exactly once', () => {
    const latestAssistant = {
        messageId: 200,
        message: {
            is_user: false,
            is_system: false,
        },
    };
    const newAssistantMessageId =
        resolveNewAssistantStoryMessageId(
            199,
            latestAssistant,
        );

    assert.equal(
        newAssistantMessageId,
        200,
    );
    assert.equal(
        resolveNewAssistantStoryMessageId(
            null,
            latestAssistant,
        ),
        null,
    );
    assert.equal(
        resolveNewAssistantStoryMessageId(
            200,
            latestAssistant,
        ),
        null,
    );
    assert.equal(
        resolveNewAssistantStoryMessageId(
            199,
            {
                messageId: 200,
                message: {
                    is_user: true,
                },
            },
        ),
        null,
    );
    assert.equal(
        resolveStoryScrollMode({
            preserveScrollAnchor:
                false,
            newAssistantMessageId,
            wasNearBottom: false,
        }),
        'new-assistant-top',
    );
    assert.equal(
        resolveStoryScrollMode({
            preserveScrollAnchor:
                false,
            newAssistantMessageId:
                null,
            wasNearBottom: false,
        }),
        'retain',
    );
    assert.equal(
        resolveStoryScrollMode({
            preserveScrollAnchor:
                false,
            newAssistantMessageId:
                null,
            wasNearBottom: true,
        }),
        'bottom',
    );
    assert.equal(
        resolveStoryScrollMode({
            preserveScrollAnchor:
                true,
            newAssistantMessageId,
            wasNearBottom: true,
        }),
        'preserve',
    );
    assert.equal(
        resolveStoryScrollMode({
            preserveScrollAnchor:
                false,
            initialSceneLoad:
                true,
            newAssistantMessageId:
                null,
            wasNearBottom:
                true,
        }),
        'retain',
    );
});

test('action ports bind workflows to UI without importing the composition root', () => {
    const ports = createActionPorts([
        'renderAll',
    ]);
    assert.throws(
        () => ports.actions.renderAll(),
        /UI action is not bound: renderAll/u,
    );
    let renders = 0;
    ports.bind({
        renderAll() {
            renders++;
            return 'rendered';
        },
    });
    assert.equal(
        ports.actions.renderAll(),
        'rendered',
    );
    assert.equal(renders, 1);
    ports.unbind();
    assert.throws(
        () => ports.actions.renderAll(),
        /UI action is not bound: renderAll/u,
    );
});

test('host event registration is idempotent, removable, and reusable', () => {
    const events = {
        APP_READY: 'app_ready',
        CHAT_CHANGED: 'chat_changed',
        CONNECTION_PROFILE_CREATED:
            'profile_created',
        CONNECTION_PROFILE_DELETED:
            'profile_deleted',
        CONNECTION_PROFILE_UPDATED:
            'profile_updated',
        CHARACTER_MESSAGE_RENDERED:
            'character_rendered',
        USER_MESSAGE_RENDERED:
            'user_rendered',
        MESSAGE_UPDATED: 'message_updated',
        MESSAGE_SWIPED: 'message_swiped',
        MESSAGE_DELETED: 'message_deleted',
    };
    const registered = [];
    const removed = [];
    const eventSource = {
        on(event, listener) {
            registered.push({
                event,
                listener,
                last: false,
            });
        },
        makeLast(event, listener) {
            registered.push({
                event,
                listener,
                last: true,
            });
        },
        removeListener(event, listener) {
            removed.push({
                event,
                listener,
            });
        },
    };
    const session = {
        activeScreen: 'game',
        calendarSelectedDate: '1991-09-02',
        calendarDisplayMonth: '1991-09-01',
        calendarSelectedEntryId: 'old_entry',
        calendarSelectedSceneId: 'old_scene',
    };
    const bindings = createHostEventBindings({
        refs: {
            root: {
                hidden: false,
            },
        },
        session,
        eventSource,
        event_types: events,
        applySystemPrompt() {},
        getMudState: () => null,
        resetCalendarSelection() {
            session.calendarSelectedDate = '';
            session.calendarDisplayMonth = '';
            session.calendarSelectedEntryId = '';
            session.calendarSelectedSceneId = '';
        },
        renderSaveLibrary() {},
        scheduleRender() {},
        setUiVisible() {},
        shouldTranslateRenderedMessage:
            () => false,
        syncModelSlotControls() {},
        translateMessage() {},
    });

    const firstDispose =
        bindings.registerHostEvents();
    const secondDispose =
        bindings.registerHostEvents();
    assert.equal(firstDispose, secondDispose);
    assert.equal(registered.length, 10);
    assert.equal(
        registered.filter(entry =>
            entry.last).length,
        1,
    );
    registered.find(entry =>
        entry.event === events.CHAT_CHANGED).listener();
    assert.deepEqual(
        {
            date: session.calendarSelectedDate,
            month: session.calendarDisplayMonth,
            entry: session.calendarSelectedEntryId,
            scene: session.calendarSelectedSceneId,
        },
        {
            date: '',
            month: '',
            entry: '',
            scene: '',
        },
        'CHAT_CHANGED clears every Calendar selection before rendering the next chat',
    );

    firstDispose();
    assert.equal(removed.length, 10);
    registered.forEach((entry, index) => {
        assert.equal(
            removed[index].event,
            entry.event,
        );
        assert.equal(
            removed[index].listener,
            entry.listener,
        );
    });

    bindings.registerHostEvents();
    assert.equal(registered.length, 20);
});

test('narrow layouts expose the inspector as a UI-only drawer', async () => {
    const [
        bindingsSource,
        itemComponentsSource,
        storyRendererSource,
        styleSource,
    ] = await Promise.all([
        readFile(
            path.join(
                CLIENT_ROOT,
                'ui',
                'bindings.js',
            ),
            'utf8',
        ),
        readFile(
            path.join(
                CLIENT_ROOT,
                'ui',
                'item-components.js',
            ),
            'utf8',
        ),
        readFile(
            path.join(
                CLIENT_ROOT,
                'ui',
                'story-renderer.js',
            ),
            'utf8',
        ),
        readFile(
            path.join(
                CLIENT_ROOT,
                'style.css',
            ),
            'utf8',
        ),
    ]);
    assert.match(
        bindingsSource,
        /classList\.toggle\(\s*'hpmud-inspector-open'/u,
    );
    assert.match(
        styleSource,
        /\.hpmud-app\.hpmud-inspector-open \.hpmud-inspector/u,
    );
    assert.match(
        styleSource,
        /\.hpmud-topbar \{[\s\S]*?position: relative;[\s\S]*?z-index: 30;/u,
    );
    assert.match(
        styleSource,
        /\.hpmud-more:not\(\[open\]\) > \.hpmud-more-menu,[\s\S]*?\.hpmud-insert-menu:not\(\[open\]\) > div \{[\s\S]*?display: none;/u,
    );
    assert.match(
        storyRendererSource,
        /classList\.add\(\s*'hpmud-inspector-open'/u,
    );
    assert.doesNotMatch(
        storyRendererSource,
        /setTimeout\([\s\S]*?\.hpmud-item-candidate:last-of-type[\s\S]*?100,/u,
    );
    assert.match(
        itemComponentsSource,
        /accept\.addEventListener\(\s*'click'/u,
    );
    assert.match(
        itemComponentsSource,
        /ignore\.addEventListener\(\s*'click'/u,
    );
    assert.match(
        itemComponentsSource,
        /hpmud-item-candidate-details/u,
    );
    assert.match(
        itemComponentsSource,
        /aria-expanded/u,
    );
    assert.match(
        itemComponentsSource,
        /actions\.replaceChildren\(\s*info/u,
    );
    assert.match(
        itemComponentsSource,
        /toastr\.success\(\s*'已收录到物品档案'/u,
    );
    assert.match(
        styleSource,
        /\.hpmud-item-candidate:hover \.hpmud-item-candidate-details[\s\S]*?\.hpmud-item-candidate:focus-within \.hpmud-item-candidate-details/u,
    );
    assert.match(
        styleSource,
        /\.hpmud-item-candidate-details \{[\s\S]*?position: absolute/u,
    );
    assert.match(
        styleSource,
        /\.hpmud-item-candidate-details \{[\s\S]*?pointer-events: none/u,
    );
    assert.match(
        styleSource,
        /\.hpmud-item-candidate\.decision-accepted[\s\S]*?\.hpmud-item-candidate-summary small \{[\s\S]*?color: var\(--hp-success\)/u,
    );
    assert.doesNotMatch(
        styleSource,
        /hpmud-item-candidate-details[\s\S]{0,700}pointer-events: auto/u,
    );
    assert.match(
        styleSource,
        /@media \(max-width: 420px\)[\s\S]*?\.hpmud-item-grid[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/u,
    );
    assert.match(
        styleSource,
        /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.hpmud-item-candidate/u,
    );
    assert.doesNotMatch(
        bindingsSource,
        /chatMetadata.*hpmud-inspector-open/su,
    );
});

test('Item operation UI separates operation choice from stable Item references', async () => {
    const [
        panelSource,
        bindingsSource,
        inspectorSource,
        itemComponentsSource,
        workflowApplicationSource,
        performanceSource,
        observerSource,
        styleSource,
        appControllerSource,
    ] = await Promise.all([
        readFile(
            path.join(
                CLIENT_ROOT,
                'panel.html',
            ),
            'utf8',
        ),
        readFile(
            path.join(
                CLIENT_ROOT,
                'ui',
                'bindings.js',
            ),
            'utf8',
        ),
        readFile(
            path.join(
                CLIENT_ROOT,
                'ui',
                'inspector-controller.js',
            ),
            'utf8',
        ),
        readFile(
            path.join(
                CLIENT_ROOT,
                'ui',
                'item-components.js',
            ),
            'utf8',
        ),
        readFile(
            path.join(
                CLIENT_ROOT,
                'workflows',
                'application.js',
            ),
            'utf8',
        ),
        readFile(
            path.join(
                CLIENT_ROOT,
                'workflows',
                'turn-performance.js',
            ),
            'utf8',
        ),
        readFile(
            path.join(
                PROJECT_ROOT,
                'src',
                'hogwarts-mud',
                'local-semantic-adjudicator.js',
            ),
            'utf8',
        ),
        readFile(
            path.join(
                CLIENT_ROOT,
                'style.css',
            ),
            'utf8',
        ),
        readFile(
            path.join(
                CLIENT_ROOT,
                'ui',
                'app-controller.js',
            ),
            'utf8',
        ),
    ]);
    assert.deepEqual(
        [
            ...panelSource.matchAll(
                /data-hpmud-item-operation="([^"]+)"/gu,
            ),
        ].map(match =>
            match[1]),
        [
            'acquire',
            'carry',
            'place',
            'equip',
            'unequip',
            'give',
            'lend',
            'consume',
            'damage',
            'clean',
            'lose',
            'destroy',
        ],
    );
    assert.match(
        bindingsSource,
        /createItemOperationDirective/u,
    );
    assert.match(
        bindingsSource,
        /renderInspector\(\s*'items'/u,
    );
    assert.match(
        itemComponentsSource,
        /onReferenceItem/u,
    );
    assert.match(
        itemComponentsSource,
        /引用到输入/u,
    );
    assert.match(
        inspectorSource,
        /createItemReferenceDirective/u,
    );
    assert.equal(
        (
            workflowApplicationSource
                .match(
                    /parseItemOperationDirectives/gu,
                ) ||
            []
        ).length,
        3,
    );
    assert.match(
        workflowApplicationSource,
        /createTurnPerformanceWorkflow\(\{[\s\S]*?parseItemOperationDirectives[\s\S]*?\}\)/u,
    );
    assert.match(
        workflowApplicationSource,
        /createTurnWorkflow\(\{[\s\S]*?parseItemOperationDirectives[\s\S]*?\}\)/u,
    );
    assert.match(
        performanceSource,
        /itemDirectives/u,
    );
    assert.match(
        performanceSource,
        /not as proof of success/u,
    );
    assert.match(
        observerSource,
        /authoritative player intent and object selection/u,
    );
    assert.match(
        styleSource,
        /\.hpmud-item-operation-options/u,
    );
    assert.match(
        styleSource,
        /\.hpmud-item-reference/u,
    );
    assert.match(
        appControllerSource,
        /pendingItemProposals:/u,
    );
    assert.match(
        appControllerSource,
        /itemProposalDecisions:/u,
    );
});

test('Task 6 modules preserve composition order and maintenance boundaries', async () => {
    const indexPath =
        path.join(CLIENT_ROOT, 'index.js');
    const indexSource =
        await readFile(indexPath, 'utf8');
    assert.ok(
        lineCount(indexSource) <= 600,
        'index.js must stay within 600 lines',
    );
    const initializeSource =
        indexSource.slice(
            indexSource.indexOf(
                'async function initialize()',
            ),
        );
    const orderedMarkers = [
        'renderExtensionTemplateAsync',
        'getUiDomRefs',
        'createWorkflowApplication',
        'createUiApplication',
        'registerUiBindings',
        'registerHostEvents',
        'renderAll',
    ];
    let previous = -1;
    for (const marker of orderedMarkers) {
        const current =
            initializeSource.indexOf(marker);
        assert.ok(
            current > previous,
            `${marker} is out of initialization order`,
        );
        previous = current;
    }

    const directories = [
        'runtime',
        'workflows',
        'ui',
    ];
    for (const directory of directories) {
        const directoryPath =
            path.join(CLIENT_ROOT, directory);
        const files = (
            await readdir(directoryPath)
        ).filter(file =>
            file.endsWith('.js'));
        for (const file of files) {
            const filePath =
                path.join(directoryPath, file);
            const source =
                await readFile(
                    filePath,
                    'utf8',
                );
            assert.doesNotMatch(
                source,
                /from ['"]\.\.\/index\.js['"]/u,
                `${directory}/${file} imports index.js`,
            );
            assert.ok(
                lineCount(source) < 2000,
                `${directory}/${file} exceeds 2000 lines`,
            );
        }
    }

    const bindingsSource = await readFile(
        path.join(
            CLIENT_ROOT,
            'ui/bindings.js',
        ),
        'utf8',
    );
    assert.match(
        bindingsSource,
        /function registerUiBindings\(\)/u,
    );
    assert.match(
        bindingsSource,
        /function unregisterUiBindings\(\)/u,
    );
    assert.match(
        bindingsSource,
        /removeEventListener/u,
    );
});
