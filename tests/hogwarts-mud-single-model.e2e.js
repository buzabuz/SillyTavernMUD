import { createHash } from 'node:crypto';
/* global window */
/* eslint-disable playwright/no-conditional-in-test, playwright/no-conditional-expect */

import {
    existsSync,
    readFileSync,
    readdirSync,
    rmSync,
    statSync,
    unlinkSync,
    utimesSync,
    writeFileSync,
} from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';

import {
    expect,
    test,
} from '@playwright/test';

const REAL_ACCEPTANCE_ENABLED =
    process.env.HOGWARTS_REAL_MODEL_ACCEPTANCE === '1';
const PREFLIGHT_ONLY =
    process.env.HOGWARTS_ACCEPTANCE_PREFLIGHT_ONLY === '1';
const REAL_LOCAL_SEMANTIC_ENABLED =
    process.env.HOGWARTS_ACCEPTANCE_REAL_LOCAL === '1';
const ACCEPTANCE_TEST_ENABLED =
    REAL_ACCEPTANCE_ENABLED || PREFLIGHT_ONLY;
const GENERATE_BUDGET =
    Number(process.env.HOGWARTS_ACCEPTANCE_GENERATE_BUDGET || 0);
const TINA_CHAT_PATH = new URL(
    '../data/default-user/chats/Hogwarts_World_Director/Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl',
    import.meta.url,
);
const CHAT_DIRECTORY =
    new URL('../data/default-user/chats/Hogwarts_World_Director/', import.meta.url);
const KNOWLEDGE_DIRECTORY =
    new URL('../data/default-user/user/files/hogwarts-mud/', import.meta.url);
const BACKUP_DIRECTORY =
    new URL('../data/default-user/backups/', import.meta.url);
const SETTINGS_PATH =
    new URL('../data/default-user/settings.json', import.meta.url);
const SECRETS_PATH =
    new URL('../data/default-user/secrets.json', import.meta.url);
const EVIDENCE_PATH =
    new URL('./test-results/hogwarts-mud-single-model-evidence.json', import.meta.url);
const PREFLIGHT_TIMEOUT = 10_000;
const EXPECT_TIMEOUT = 20_000;
const TURN_TIMEOUT = 240_000;
const PLAYER_ACTION =
    '我把课本轻轻放正，低头抄写羽毛咒的第一行课堂笔记。';

function sha256(value) {
    return createHash('sha256')
        .update(value)
        .digest('hex');
}

function readFileStatus(filePath) {
    const contents = readFileSync(filePath);
    return {
        sha256: sha256(contents),
        mtimeMs: statSync(filePath).mtimeMs,
        bytes: contents.length,
    };
}

function readMudState(filePath) {
    const [headerLine] =
        readFileSync(
            filePath,
            'utf8',
        ).split('\n');
    return JSON.parse(
        headerLine,
    ).chat_metadata.hogwartsMud;
}

function withoutKnowledgeMetadata(state) {
    const copy =
        structuredClone(state);
    delete copy.knowledgeBase;
    return copy;
}

function changedTopLevelKeys(
    before,
    after,
) {
    return [
        ...new Set([
            ...Object.keys(before),
            ...Object.keys(after),
        ]),
    ]
        .filter(key =>
            JSON.stringify(
                before[key],
            ) !==
            JSON.stringify(
                after[key],
            ))
        .sort();
}

function listFiles(directory) {
    if (!existsSync(directory)) return [];
    return readdirSync(directory, {
        recursive: true,
        withFileTypes: true,
    })
        .filter(entry => entry.isFile())
        .map(entry => path.join(entry.parentPath, entry.name));
}

function createQaFixture(runId) {
    const qaDisplayName = `Task 8 QA ${runId}`;
    const qaFileBase = `Hogwarts World Director - Task8-QA-${runId}`;
    const qaFilePath = new URL(`${qaFileBase}.jsonl`, CHAT_DIRECTORY);
    const qaTimelineId = `Task8_QA_${runId}`;
    const qaKnowledgePath = new URL(`${qaTimelineId}/`, KNOWLEDGE_DIRECTORY);
    const source = readFileSync(TINA_CHAT_PATH, 'utf8');
    const lines = source.split('\n');
    const header = JSON.parse(lines[0]);
    const state = header.chat_metadata.hogwartsMud;
    const messageCount = lines.filter(Boolean).length - 1;
    const currentTurn = Number(state.turn?.count || 0);
    const sharedProfileId =
        state.modelSlots?.low
            ?.profileId ||
        '';

    state.character.inputEvidence
        .identity.name =
        qaDisplayName;
    state.character.canonicalEn
        .identity.nameEn =
        qaDisplayName;
    for (const tier of [
        'low',
        'medium',
        'high',
    ]) {
        state.modelSlots[tier].profileId =
            sharedProfileId;
    }
    state.turn = {
        ...(state.turn || {}),
        status: 'idle',
        error: '',
    };
    state.directorFoundation = {
        ...(state.directorFoundation || {}),
        status: 'ready',
        error: '',
    };
    state.dailyDirector = {
        ...(state.dailyDirector || {}),
        status: 'ready',
        error: '',
    };
    state.pacingDirector = {
        ...(state.pacingDirector || {}),
        status: 'ready',
        error: '',
        lastAssessedTurn: currentTurn,
        lastAssessedSceneId: state.scene?.id || '',
        reassessAfterTurns: 6,
        pendingBeat: null,
    };
    state.memoryDirector = {
        ...(state.memoryDirector || {}),
        status: 'ready',
        error: '',
        lastReviewedTurn: currentTurn,
        pendingEventBoundary: null,
        reviewAfterTurns: 10,
    };
    state.socialGraph = {
        ...(state.socialGraph || {}),
        status: 'ready',
        error: '',
        lastProcessedMessageId: messageCount - 1,
        lastRunTurn: currentTurn,
        lastRunSceneId: state.scene?.id || '',
        lastRunClock: state.clock,
        backfillPendingSceneId: '',
    };
    state.sceneTransition = {
        ...(state.sceneTransition || {}),
        status: 'idle',
        error: '',
        requestedAt: null,
    };
    if (state.map?.interiorMapGeneration) {
        state.map.interiorMapGeneration.status = 'ready';
        state.map.interiorMapGeneration.error = '';
    }
    state.knowledgeBase = {
        ...(state.knowledgeBase || {}),
        timelineId: qaTimelineId,
        rootPath: '',
        lastSyncedAt: null,
        recordHashes: {},
        lastError: '',
    };
    header.chat_metadata.hogwartsMud = state;
    lines[0] = JSON.stringify(header);
    writeFileSync(qaFilePath, lines.join('\n'));

    return {
        qaDisplayName,
        qaFileBase,
        qaFilePath,
        qaTimelineId,
        qaKnowledgePath,
        messageCount,
    };
}

function readProfilePreflight() {
    const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
    const secrets = JSON.parse(readFileSync(SECRETS_PATH, 'utf8'));
    const tinaHeader = JSON.parse(
        readFileSync(TINA_CHAT_PATH, 'utf8').split('\n')[0],
    );
    const slots = tinaHeader.chat_metadata.hogwartsMud.modelSlots;
    const profileId = slots.low.profileId;
    const profile = settings.extension_settings
        ?.connectionManager
        ?.profiles
        ?.find(item => item.id === profileId);
    const customSecrets = secrets.api_key_custom || [];
    const secret = customSecrets.find(item =>
        item.id === profile?.['secret-id']);
    const slotProfileIds = [
        slots.low.profileId,
        slots.medium.profileId ||
            slots.low.profileId,
        slots.high.profileId ||
            slots.low.profileId,
    ];

    return {
        profileId,
        profileName: profile?.name || '',
        mode: profile?.mode || '',
        api: profile?.api || '',
        model: profile?.model || '',
        upstreamBaseUrl: profile?.['api-url'] || '',
        slotProfileIds,
        profileExists: Boolean(profile),
        secretConfigured: Boolean(
            secret?.active && secret?.value,
        ),
        profileSetSha256: sha256(JSON.stringify(
            settings.extension_settings.connectionManager.profiles,
        )),
        translationProvider:
            settings.extension_settings?.hogwartsMud?.translationProvider,
        translationEnabled:
            settings.extension_settings?.hogwartsMud?.translationEnabled,
        runtimeProfileIds:
            settings.extension_settings.connectionManager.profiles
                .filter(item =>
                    String(item.id || '')
                        .startsWith('hpmud-runtime-'))
                .map(item => item.id)
                .sort(),
    };
}

function restoreAcceptanceSettings(
    originalContents,
    originalStatus,
) {
    const currentContents = readFileSync(SETTINGS_PATH);
    const currentSettings = JSON.parse(currentContents.toString('utf8'));
    const originalSettings = JSON.parse(originalContents.toString('utf8'));
    const originalProfileIds = new Set(
        originalSettings.extension_settings
            ?.connectionManager?.profiles
            ?.map(item => item.id) || [],
    );
    const temporaryProfiles = currentSettings.extension_settings
        ?.connectionManager?.profiles
        ?.filter(item =>
            String(item.id || '').startsWith('hpmud-runtime-') &&
            !originalProfileIds.has(item.id)) || [];
    if (sha256(currentContents) !== originalStatus.sha256) {
        writeFileSync(SETTINGS_PATH, originalContents);
    }
    const currentStats = statSync(SETTINGS_PATH);
    utimesSync(
        SETTINGS_PATH,
        new Date(currentStats.atimeMs),
        new Date(originalStatus.mtimeMs),
    );
    return {
        temporaryProfilesRemoved:
            temporaryProfiles.map(item => item.id),
        status: readFileStatus(SETTINGS_PATH),
    };
}

function disableAcceptanceTranslationSettings() {
    const settings =
        JSON.parse(
            readFileSync(
                SETTINGS_PATH,
                'utf8',
            ),
        );
    settings.extension_settings
        .hogwartsMud ??= {};
    settings.extension_settings
        .hogwartsMud
        .translationProvider =
        'off';
    settings.extension_settings
        .hogwartsMud
        .translationEnabled =
        false;
    writeFileSync(
        SETTINGS_PATH,
        JSON.stringify(
            settings,
            null,
            4,
        ),
    );
}

function restoreAcceptanceFile(
    filePath,
    originalContents,
    originalStatus,
) {
    const currentContents = readFileSync(filePath);
    if (sha256(currentContents) !== originalStatus.sha256) {
        writeFileSync(filePath, originalContents);
    }
    const currentStats = statSync(filePath);
    utimesSync(
        filePath,
        new Date(currentStats.atimeMs),
        new Date(originalStatus.mtimeMs),
    );
    return readFileStatus(filePath);
}

function removeNewQaBackups(beforeFiles, fixture) {
    const removed = [];
    for (const filePath of listFiles(BACKUP_DIRECTORY)) {
        if (beforeFiles.has(filePath)) continue;
        let containsQaMarker = false;
        try {
            const stats = statSync(filePath);
            if (stats.size <= 20 * 1024 * 1024) {
                const contents = readFileSync(filePath, 'utf8');
                containsQaMarker =
                    contents.includes(fixture.qaDisplayName) ||
                    contents.includes(fixture.qaFileBase) ||
                    contents.includes(fixture.qaTimelineId);
            }
        } catch {
            continue;
        }
        if (containsQaMarker) {
            unlinkSync(filePath);
            removed.push(filePath);
        }
    }
    return removed;
}

function createOneShotProxy(upstreamBaseUrl, evidence) {
    const sockets = new Set();
    const hopByHopHeaders = new Set([
        'connection',
        'keep-alive',
        'proxy-authenticate',
        'proxy-authorization',
        'te',
        'trailer',
        'transfer-encoding',
        'upgrade',
    ]);
    const server = http.createServer((request, response) => {
        if (request.method !== 'POST') {
            response.writeHead(405, {
                'content-type': 'application/json',
            });
            response.end('{"error":"POST required"}');
            return;
        }
        evidence.proxy.attempts++;
        if (evidence.proxy.forwarded >= GENERATE_BUDGET) {
            evidence.proxy.blocked++;
            response.writeHead(429, {
                'content-type': 'application/json',
            });
            response.end('{"error":"Task 8 upstream budget exhausted"}');
            return;
        }

        const chunks = [];
        request.on('data', chunk => chunks.push(chunk));
        request.on('end', () => {
            const body = Buffer.concat(chunks);
            const suffix = request.url?.startsWith('/')
                ? request.url
                : `/${request.url || ''}`;
            const upstreamUrl = new URL(
                `${upstreamBaseUrl.replace(/\/$/u, '')}${suffix}`,
            );
            const headers = {
                ...request.headers,
            };
            for (const name of Object.keys(headers)) {
                if (hopByHopHeaders.has(name) || name === 'host') {
                    delete headers[name];
                }
            }
            headers['content-length'] = String(body.length);
            evidence.proxy.forwarded++;
            evidence.proxy.requestBodySha256 = sha256(body);
            evidence.proxy.forwardedHeaderNames =
                Object.keys(headers).sort();
            evidence.proxy.authorizationPreserved =
                Boolean(request.headers.authorization) &&
                headers.authorization === request.headers.authorization;
            evidence.proxy.upstreamPath = upstreamUrl.pathname;

            const transport =
                upstreamUrl.protocol === 'https:'
                    ? https
                    : http;
            const upstreamRequest = transport.request(
                upstreamUrl,
                {
                    method: 'POST',
                    headers,
                },
                upstreamResponse => {
                    evidence.proxy.upstreamConfirmed++;
                    evidence.proxy.upstreamStatus =
                        upstreamResponse.statusCode || 0;
                    const responseHeaders = {
                        ...upstreamResponse.headers,
                    };
                    delete responseHeaders['transfer-encoding'];
                    response.writeHead(
                        upstreamResponse.statusCode || 502,
                        responseHeaders,
                    );
                    upstreamResponse.pipe(response);
                },
            );
            upstreamRequest.setTimeout(TURN_TIMEOUT, () => {
                upstreamRequest.destroy(
                    new Error('Task 8 upstream timeout'),
                );
            });
            upstreamRequest.on('error', error => {
                evidence.proxy.error = String(error.message || error);
                if (!response.headersSent) {
                    response.writeHead(502, {
                        'content-type': 'application/json',
                    });
                }
                response.end(JSON.stringify({
                    error: 'Task 8 upstream proxy failure',
                }));
            });
            upstreamRequest.end(body);
        });
    });
    server.on('connection', socket => {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
    });

    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            resolve({
                url: `http://127.0.0.1:${address.port}`,
                close: () => new Promise(closeResolve => {
                    server.close(() => closeResolve());
                    for (const socket of sockets) socket.destroy();
                }),
            });
        });
    });
}

async function setTranslationOff(page) {
    await page.evaluate(() => {
        const context = SillyTavern.getContext();
        context.extensionSettings.hogwartsMud ??= {};
        context.extensionSettings.hogwartsMud.translationProvider = 'off';
        context.extensionSettings.hogwartsMud.translationEnabled = false;
    });
}

async function getStateSummary(page, rememberBefore = false) {
    return page.evaluate(async remember => {
        const context = SillyTavern.getContext();
        const state = context.chatMetadata.hogwartsMud;
        if (remember) {
            window.__task8QaBeforeState = structuredClone(state);
        }
        return {
            chatLength: context.chat.length,
            playerMessages: context.chat.filter(message =>
                message.is_user && !message.is_system).length,
            assistantMessages: context.chat.filter(message =>
                !message.is_user && !message.is_system).length,
            clock: state.clock,
            turnCount: state.turn?.count,
            turnStatus: state.turn?.status,
            turnError:
                state.turn?.error ||
                '',
            lastElapsedMinutes:
                state.turn?.lastElapsedMinutes,
            sceneId: state.scene?.id,
            activeInteractionActorIds:
                state.activeInteractionActorIds,
            localPresence:
                state.localPresence
                    ? {
                        version:
                            state.localPresence
                                .version,
                        mapId:
                            state.localPresence
                                .mapId,
                        roomId:
                            state.localPresence
                                .roomId,
                        occupantActorIds:
                            state.localPresence
                                .occupantActorIds,
                        cohortIds:
                            state.localPresence
                                .cohortIds,
                        updatedTurn:
                            state.localPresence
                                .updatedTurn,
                    }
                    : null,
            socialCursor:
                state.socialGraph?.lastProcessedMessageId,
            lastMessageRole:
                context.chat.at(-1)?.extra?.hogwartsMud?.role || '',
            lastTransaction:
                context.chat.at(-1)?.extra?.hogwartsMud
                    ?.turnTransaction || null,
        };
    }, rememberBefore);
}

async function validateCommittedTurn(page, before, action) {
    return page.evaluate(async ({ baseline, playerAction }) => {
        const context = SillyTavern.getContext();
        const state = context.chatMetadata.hogwartsMud;
        const beforeState = window.__task8QaBeforeState;
        const assistant = [...context.chat]
            .reverse()
            .find(message =>
                !message.is_user &&
                !message.is_system &&
                message.extra?.hogwartsMud?.role === 'scene_turn');
        const transaction =
            assistant?.extra?.hogwartsMud?.turnTransaction;
        const diagnosticEvents =
            assistant?.extra?.hogwartsMud
                ?.turnDiagnostics?.events ||
            [];
        const milestone = stage =>
            diagnosticEvents.find(event =>
                event.stage === stage)
                ?.data?.elapsedMs ??
            null;
        const {
            validateScenePerformance,
            validateTurnTransaction,
        } = await import(
            '/scripts/extensions/hogwarts-mud/domain/turn-validation.js'
        );
        const {
            createTurnPerformanceBudget,
        } = await import(
            '/scripts/extensions/hogwarts-mud/domain/turn-time.js'
        );
        const {
            advanceWorldClock,
        } = await import(
            '/scripts/extensions/hogwarts-mud/domain/time-environment.js'
        );
        const budget = createTurnPerformanceBudget(
            playerAction,
            beforeState.dailyDirector?.plan?.timePolicy,
            {
                activeNamedActorCount:
                    (beforeState.actors || [])
                        .filter(actor => actor.present !== false)
                        .length,
                adjudicatedMinutes:
                    transaction?.elapsedMinutes,
            },
        );
        const sceneValidation = validateScenePerformance(
            transaction,
            beforeState,
            budget,
            null,
            transaction?.checkResolution || null,
            null,
            playerAction,
        );
        const transactionValidation = validateTurnTransaction(
            transaction,
            beforeState,
            playerAction,
        );
        const expectedClock = transaction
            ? advanceWorldClock(
                beforeState.clock,
                transaction.elapsedMinutes,
            )
            : '';
        const runtimeProfileIds =
            context.extensionSettings.connectionManager.profiles
                .filter(profile =>
                    String(profile.id || '')
                        .startsWith('hpmud-runtime-'))
                .map(profile => profile.id)
                .sort();

        return {
            chatLengthDelta:
                context.chat.length - baseline.chatLength,
            playerMessageDelta:
                context.chat.filter(message =>
                    message.is_user && !message.is_system).length -
                baseline.playerMessages,
            assistantMessageDelta:
                context.chat.filter(message =>
                    !message.is_user && !message.is_system).length -
                baseline.assistantMessages,
            turnCountDelta:
                Number(state.turn?.count || 0) -
                Number(baseline.turnCount || 0),
            turnStatus: state.turn?.status,
            clock: state.clock,
            expectedClock,
            elapsedMinutes: transaction?.elapsedMinutes,
            lastElapsedMinutes: state.turn?.lastElapsedMinutes,
            segmentCount: transaction?.segments?.length || 0,
            sceneValidation,
            transactionValidation,
            localSemanticFallback:
                transaction?.settlementWarnings?.some(warning =>
                    warning.code === 'local_semantic_fallback') || false,
            perceptionSource:
                transaction?.perception?.source || '',
            localObserverTaskId:
                transaction
                    ?.materialExtraction
                    ?.taskId ||
                '',
            localObserverModel:
                transaction
                    ?.materialExtraction
                    ?.model ||
                '',
            perceptionRejected:
                transaction
                    ?.materialExtraction
                    ?.perceptionRejected ===
                true,
            temporalClaimsRejected:
                Number(
                    transaction
                        ?.materialExtraction
                        ?.temporalClaimsRejected ||
                    0,
                ),
            narrativeVisibleMs:
                milestone(
                    'narrative_visible',
                ),
            stateSettledMs:
                milestone(
                    'state_settled',
                ),
            runtimeProfileIds,
        };
    }, {
        baseline: before,
        playerAction: action,
    });
}

test.use({
    channel: 'chrome',
    launchOptions: {
        args: [
            '--disable-breakpad',
            '--disable-crash-reporter',
        ],
    },
});

test.describe('Task 8 single real-model acceptance', () => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(
        !ACCEPTANCE_TEST_ENABLED,
        'Requires explicit real acceptance or preflight-only opt-in; default is a zero-cost skip.',
    );

    test('commits exactly one disposable ordinary turn and survives refresh', async ({
        page,
    }, testInfo) => {
        test.setTimeout(360_000);
        const runId = `${Date.now()}-${process.pid}`;
        const tinaBefore = readFileStatus(TINA_CHAT_PATH);
        const settingsBeforeContents = readFileSync(SETTINGS_PATH);
        const settingsBefore = readFileStatus(SETTINGS_PATH);
        const secretsBeforeContents = readFileSync(SECRETS_PATH);
        const secretsBefore = readFileStatus(SECRETS_PATH);
        const backupFilesBefore = new Set(listFiles(BACKUP_DIRECTORY));
        const profile = readProfilePreflight();
        const evidence = {
            runId,
            optIn: REAL_ACCEPTANCE_ENABLED,
            preflightOnly: PREFLIGHT_ONLY,
            realLocalSemantic:
                REAL_LOCAL_SEMANTIC_ENABLED,
            configuredBudget: GENERATE_BUDGET,
            testRetry: testInfo.retry,
            profile: {
                profileId: profile.profileId,
                profileName: profile.profileName,
                mode: profile.mode,
                api: profile.api,
                model: profile.model,
                endpointProtocol: profile.upstreamBaseUrl
                    ? new URL(profile.upstreamBaseUrl).protocol
                    : '',
                profileExists: profile.profileExists,
                secretConfigured: profile.secretConfigured,
                slotProfileIds: profile.slotProfileIds,
                preexistingRuntimeProfileCount:
                    profile.runtimeProfileIds.length,
            },
            browser: {
                phase: 'preflight',
                preTurnGenerateAttempts: 0,
                turnGenerateAttempts: 0,
                refreshGenerateAttempts: 0,
                blockedGenerateAttempts: 0,
                firstRequest: null,
                localAdjudicateAttempts: 0,
                localObserveAttempts: 0,
                localForwardedToServer: 0,
                localAppraisalAttempts: 0,
                translationAttempts: 0,
                socialAttempts: 0,
                directOllamaAttempts: 0,
                vectorAttemptsBlocked: 0,
            },
            proxy: {
                attempts: 0,
                forwarded: 0,
                blocked: 0,
                upstreamConfirmed: 0,
                upstreamStatus: 0,
                requestBodySha256: '',
                forwardedHeaderNames: [],
                authorizationPreserved: false,
                upstreamPath: '',
                error: '',
            },
            fixture: null,
            beforeTurn: null,
            committedTurn: null,
            afterRefresh: null,
            cleanup: null,
            tinaBefore,
            tinaAfter: null,
            profileSetUnchanged: false,
            translationSettingsRestored: false,
            secretsUnchanged: false,
            result: 'running',
            error: '',
        };
        let fixture = null;
        let proxy = null;
        let failure = null;
        const pageErrors = [];
        page.on('pageerror', error => pageErrors.push(error.message));

        try {
            expect(GENERATE_BUDGET).toBe(1);
            expect(testInfo.retry).toBe(0);
            expect(existsSync(TINA_CHAT_PATH)).toBe(true);
            expect(profile.profileExists).toBe(true);
            expect(profile.mode).toBe('cc');
            expect(profile.api).toBe('custom');
            expect(profile.model).not.toBe('');
            expect(new URL(profile.upstreamBaseUrl).protocol).toBe('https:');
            expect(profile.secretConfigured).toBe(true);
            expect(new Set(profile.slotProfileIds)).toEqual(
                new Set([profile.profileId]),
            );

            fixture = createQaFixture(runId);
            evidence.fixture = {
                qaDisplayName: fixture.qaDisplayName,
                qaFileBase: fixture.qaFileBase,
                qaTimelineId: fixture.qaTimelineId,
                sourceMessageCount: fixture.messageCount,
            };
            expect(readFileStatus(TINA_CHAT_PATH)).toEqual(tinaBefore);
            disableAcceptanceTranslationSettings();
            proxy = await createOneShotProxy(
                profile.upstreamBaseUrl,
                evidence,
            );

            await page.route('**/*', async route => {
                const request = route.request();
                const url = new URL(request.url());
                const isPost = request.method() === 'POST';
                const isGenerate = isPost &&
                    /^\/api\/backends\/(?:chat|text)-completions\/generate$/u
                        .test(url.pathname);
                if (isGenerate) {
                    const phase = evidence.browser.phase;
                    const phaseKey = phase === 'turn'
                        ? 'turnGenerateAttempts'
                        : phase === 'refresh'
                            ? 'refreshGenerateAttempts'
                            : 'preTurnGenerateAttempts';
                    evidence.browser[phaseKey]++;
                    if (
                        phase !== 'turn' ||
                        evidence.browser.turnGenerateAttempts > GENERATE_BUDGET
                    ) {
                        evidence.browser.blockedGenerateAttempts++;
                        await route.fulfill({
                            status: 429,
                            contentType: 'application/json',
                            body: '{"error":{"message":"Task 8 browser budget exhausted"}}',
                        });
                        return;
                    }
                    const body = request.postDataJSON();
                    evidence.browser.firstRequest = {
                        pathname: url.pathname,
                        stream: Boolean(body.stream),
                        source:
                            body.chat_completion_source || body.api_type || '',
                        model: String(body.model || ''),
                        maxTokens: Number(body.max_tokens || 0),
                        originalEndpointProtocol: body.custom_url
                            ? new URL(body.custom_url).protocol
                            : '',
                        requestBodySha256:
                            sha256(request.postData() || ''),
                    };
                    if (url.pathname.includes('/chat-completions/')) {
                        expect(body.chat_completion_source).toBe('custom');
                        expect(body.custom_url).toBe(profile.upstreamBaseUrl);
                        body.custom_url = proxy.url;
                    } else {
                        body.api_server = proxy.url;
                    }
                    const headers = {
                        ...request.headers(),
                    };
                    delete headers['content-length'];
                    await route.continue({
                        headers,
                        postData: JSON.stringify(body),
                    });
                    return;
                }
                if (
                    isPost &&
                    url.pathname === '/api/hogwarts-mud/local/adjudicate'
                ) {
                    evidence.browser.localAdjudicateAttempts++;
                    if (
                        REAL_LOCAL_SEMANTIC_ENABLED
                    ) {
                        evidence.browser
                            .localForwardedToServer++;
                        await route.continue();
                        return;
                    }
                    await route.fulfill({
                        status: 503,
                        contentType: 'application/json',
                        body: '{"error":"Task 8 deterministic adjudication fallback"}',
                    });
                    return;
                }
                if (
                    isPost &&
                    url.pathname === '/api/hogwarts-mud/local/observe'
                ) {
                    evidence.browser.localObserveAttempts++;
                    if (
                        REAL_LOCAL_SEMANTIC_ENABLED
                    ) {
                        evidence.browser
                            .localForwardedToServer++;
                        await route.continue();
                        return;
                    }
                    await route.fulfill({
                        status: 503,
                        contentType: 'application/json',
                        body: '{"error":"Task 8 deterministic observation fallback"}',
                    });
                    return;
                }
                if (
                    isPost &&
                    url.pathname ===
                        '/api/hogwarts-mud/local/appraise'
                ) {
                    evidence.browser
                        .localAppraisalAttempts++;
                    await route.fulfill({
                        status: 503,
                        contentType:
                            'application/json',
                        body:
                            '{"error":"Task 8 Appraisal work prohibited"}',
                    });
                    return;
                }
                if (
                    isPost &&
                    (
                        url.pathname === '/api/hogwarts-mud/local/translate' ||
                        url.pathname.startsWith('/api/translate/')
                    )
                ) {
                    evidence.browser.translationAttempts++;
                    await route.fulfill({
                        status: 503,
                        contentType: 'application/json',
                        body: '{"error":"Task 8 translation disabled"}',
                    });
                    return;
                }
                if (
                    isPost &&
                    url.pathname.startsWith('/api/hogwarts-mud/social/')
                ) {
                    evidence.browser.socialAttempts++;
                    await route.fulfill({
                        status: 503,
                        contentType: 'application/json',
                        body: '{"error":"Task 8 social work prohibited"}',
                    });
                    return;
                }
                if (
                    isPost &&
                    url.pathname.startsWith('/api/vector/')
                ) {
                    evidence.browser.vectorAttemptsBlocked++;
                    await route.fulfill({
                        status: 503,
                        contentType: 'application/json',
                        body: '{"error":"Task 8 disposable vector write blocked"}',
                    });
                    return;
                }
                if (url.port === '11434') {
                    evidence.browser.directOllamaAttempts++;
                    await route.abort('blockedbyclient');
                    return;
                }
                await route.continue();
            });

            await page.goto('/', {
                waitUntil: 'domcontentloaded',
                timeout: PREFLIGHT_TIMEOUT,
            });
            await expect(page.locator('#preloader')).toHaveCount(0, {
                timeout: PREFLIGHT_TIMEOUT,
            });
            await setTranslationOff(page);
            const qaSave = page.locator(
                '#hpmud_save_list .hpmud-save-card',
            ).filter({
                hasText: fixture.qaDisplayName,
            });
            await expect(qaSave).toHaveCount(1, {
                timeout: PREFLIGHT_TIMEOUT,
            });
            await qaSave.click({ timeout: PREFLIGHT_TIMEOUT });
            await expect(page.locator('#hpmud_workspace')).toBeVisible({
                timeout: PREFLIGHT_TIMEOUT,
            });
            await expect(page.locator('#hpmud_input')).toBeEditable({
                timeout: PREFLIGHT_TIMEOUT,
            });
            const submitTurnButton = page.getByRole('button', {
                name: '提交回合',
                exact: true,
            });
            await expect(submitTurnButton).toHaveCount(1, {
                timeout: PREFLIGHT_TIMEOUT,
            });
            await expect(submitTurnButton).toBeVisible({
                timeout: PREFLIGHT_TIMEOUT,
            });
            await expect(submitTurnButton).toBeEnabled({
                timeout: PREFLIGHT_TIMEOUT,
            });

            evidence.beforeTurn = await getStateSummary(page, true);
            expect(evidence.beforeTurn.turnStatus).toBe('idle');
            expect(evidence.browser.preTurnGenerateAttempts).toBe(0);
            expect(evidence.browser.translationAttempts).toBe(0);
            expect(evidence.browser.socialAttempts).toBe(0);
            if (PREFLIGHT_ONLY) {
                evidence.result = 'preflight_passed';
                return;
            }

            evidence.browser.phase = 'turn';
            await page.locator('#hpmud_input').fill(PLAYER_ACTION);
            await expect(submitTurnButton).toBeEnabled({
                timeout: PREFLIGHT_TIMEOUT,
            });
            await submitTurnButton.click({
                timeout: PREFLIGHT_TIMEOUT,
            });
            await expect.poll(
                async () => page.evaluate(() =>
                    SillyTavern.getContext()
                        .chatMetadata.hogwartsMud.turn?.status),
                {
                    timeout: EXPECT_TIMEOUT,
                    intervals: [250, 500, 1_000],
                },
            ).toBe('resolving');
            await expect.poll(
                () => evidence.browser.turnGenerateAttempts,
                {
                    timeout: EXPECT_TIMEOUT,
                    intervals: [250, 500, 1_000],
                },
            ).toBeGreaterThanOrEqual(1);
            await expect.poll(
                async () => page.evaluate(() => {
                    const status = SillyTavern.getContext()
                        .chatMetadata.hogwartsMud.turn?.status;
                    return ['idle', 'failed'].includes(status)
                        ? status
                        : 'pending';
                }),
                {
                    timeout: TURN_TIMEOUT,
                    intervals: [1_000, 2_000, 3_000],
                },
            ).not.toBe('pending');
            evidence.terminalTurn =
                await getStateSummary(
                    page,
                    false,
                );
            expect(
                evidence.terminalTurn
                    .turnStatus,
            ).toBe('idle');
            await expect(submitTurnButton).toBeEnabled({
                timeout: TURN_TIMEOUT,
            });

            evidence.committedTurn = await validateCommittedTurn(
                page,
                evidence.beforeTurn,
                PLAYER_ACTION,
            );
            const persistedAfterTurn =
                await getStateSummary(page, false);
            const persistedFileAfterTurn =
                readFileStatus(fixture.qaFilePath);
            const mudStateAfterTurn =
                readMudState(
                    fixture.qaFilePath,
                );
            evidence.fixture.persistedFileAfterTurn =
                persistedFileAfterTurn;

            expect(evidence.browser.turnGenerateAttempts).toBe(1);
            expect(evidence.proxy.attempts).toBe(1);
            expect(evidence.proxy.forwarded).toBe(1);
            expect(evidence.proxy.upstreamConfirmed).toBe(1);
            expect(evidence.proxy.upstreamStatus).toBeGreaterThanOrEqual(200);
            expect(evidence.proxy.upstreamStatus).toBeLessThan(300);
            expect(evidence.proxy.authorizationPreserved).toBe(true);
            expect(evidence.browser.localAdjudicateAttempts).toBe(1);
            expect(evidence.browser.localObserveAttempts).toBe(1);
            expect(
                evidence.browser
                    .localForwardedToServer,
            ).toBe(
                REAL_LOCAL_SEMANTIC_ENABLED
                    ? 2
                    : 0,
            );
            expect(evidence.browser.directOllamaAttempts).toBe(0);
            expect(evidence.browser.translationAttempts).toBe(0);
            expect(evidence.browser.socialAttempts).toBe(0);
            expect(
                evidence.browser
                    .localAppraisalAttempts,
            ).toBe(1);
            expect(evidence.committedTurn).toMatchObject({
                chatLengthDelta: 2,
                playerMessageDelta: 1,
                assistantMessageDelta: 1,
                turnCountDelta: 1,
                turnStatus: 'idle',
            });
            if (
                REAL_LOCAL_SEMANTIC_ENABLED
            ) {
                expect(
                    evidence.committedTurn
                        .localObserverTaskId,
                ).toBe(
                    'post_turn_semantic_proposal',
                );
                expect(
                    evidence.committedTurn
                        .localObserverModel,
                ).toBe('qwen3:1.7b');
            } else {
                expect(
                    evidence.committedTurn
                        .localSemanticFallback,
                ).toBe(true);
                expect(
                    evidence.committedTurn
                        .perceptionSource,
                ).toBe(
                    'deterministic_fallback',
                );
            }
            expect(
                evidence.committedTurn
                    .narrativeVisibleMs,
            ).toBeGreaterThan(0);
            expect(
                evidence.committedTurn
                    .stateSettledMs,
            ).toBeGreaterThanOrEqual(
                evidence.committedTurn
                    .narrativeVisibleMs,
            );
            expect(evidence.committedTurn.runtimeProfileIds).toEqual(
                profile.runtimeProfileIds,
            );
            expect(evidence.committedTurn.segmentCount).toBeGreaterThan(0);
            expect(evidence.committedTurn.sceneValidation).toEqual({
                valid: true,
                errors: [],
            });
            expect(evidence.committedTurn.transactionValidation).toEqual({
                valid: true,
                errors: [],
            });
            expect(evidence.committedTurn.clock).toBe(
                evidence.committedTurn.expectedClock,
            );
            expect(evidence.committedTurn.lastElapsedMinutes).toBe(
                evidence.committedTurn.elapsedMinutes,
            );
            expect(pageErrors).toEqual([]);

            evidence.browser.phase = 'refresh';
            await page.reload({
                waitUntil: 'domcontentloaded',
                timeout: EXPECT_TIMEOUT,
            });
            await expect(page.locator('#preloader')).toHaveCount(0, {
                timeout: EXPECT_TIMEOUT,
            });
            await setTranslationOff(page);
            const refreshedQaSave = page.locator(
                '#hpmud_save_list .hpmud-save-card',
            ).filter({
                hasText: fixture.qaDisplayName,
            });
            await expect(refreshedQaSave).toHaveCount(1, {
                timeout: EXPECT_TIMEOUT,
            });
            await refreshedQaSave.click();
            await expect(page.locator('#hpmud_workspace')).toBeVisible({
                timeout: EXPECT_TIMEOUT,
            });
            evidence.afterRefresh = await getStateSummary(page, false);
            const persistedFileAfterRefresh =
                readFileStatus(fixture.qaFilePath);
            const mudStateAfterRefresh =
                readMudState(
                    fixture.qaFilePath,
                );
            evidence.fixture.persistedFileAfterRefresh =
                persistedFileAfterRefresh;
            evidence.refreshPersistence = {
                changedTopLevelKeys:
                    changedTopLevelKeys(
                        mudStateAfterTurn,
                        mudStateAfterRefresh,
                    ),
                worldStateBeforeSha256:
                    sha256(
                        JSON.stringify(
                            withoutKnowledgeMetadata(
                                mudStateAfterTurn,
                            ),
                        ),
                    ),
                worldStateAfterSha256:
                    sha256(
                        JSON.stringify(
                            withoutKnowledgeMetadata(
                                mudStateAfterRefresh,
                            ),
                        ),
                    ),
            };
            expect(evidence.browser.refreshGenerateAttempts).toBe(0);
            expect(evidence.afterRefresh).toEqual(persistedAfterTurn);
            if (
                REAL_LOCAL_SEMANTIC_ENABLED
            ) {
                expect(
                    withoutKnowledgeMetadata(
                        mudStateAfterRefresh,
                    ),
                ).toEqual(
                    withoutKnowledgeMetadata(
                        mudStateAfterTurn,
                    ),
                );
                expect(
                    evidence
                        .refreshPersistence
                        .changedTopLevelKeys,
                ).toEqual(
                    ['knowledgeBase'],
                );
            } else {
                expect(
                    persistedFileAfterRefresh,
                ).toEqual(
                    persistedFileAfterTurn,
                );
            }
            evidence.result = 'passed';
        } catch (error) {
            failure = error;
            evidence.result = 'failed';
            evidence.error = String(error?.stack || error?.message || error);
        } finally {
            evidence.browser.phase = 'cleanup';
            if (proxy) await proxy.close();
            try {
                await page.evaluate(({ provider, enabled }) => {
                    const settings = SillyTavern.getContext()
                        .extensionSettings.hogwartsMud;
                    settings.translationProvider = provider;
                    settings.translationEnabled = enabled;
                }, {
                    provider: profile.translationProvider,
                    enabled: profile.translationEnabled,
                });
                await new Promise(resolve => setTimeout(resolve, 1_500));
            } catch {
                // Filesystem restoration below remains authoritative.
            }
            if (!page.isClosed()) {
                await page.close({ runBeforeUnload: false });
            }
            const settingsCleanup = restoreAcceptanceSettings(
                settingsBeforeContents,
                settingsBefore,
            );
            const secretsAfter = restoreAcceptanceFile(
                SECRETS_PATH,
                secretsBeforeContents,
                secretsBefore,
            );
            const removed = {
                chat: false,
                knowledge: false,
                backups: [],
            };
            if (fixture?.qaFilePath && existsSync(fixture.qaFilePath)) {
                unlinkSync(fixture.qaFilePath);
                removed.chat = true;
            }
            if (
                fixture?.qaKnowledgePath &&
                existsSync(fixture.qaKnowledgePath)
            ) {
                rmSync(fixture.qaKnowledgePath, {
                    recursive: true,
                    force: true,
                });
                removed.knowledge = true;
            }
            if (fixture) {
                removed.backups = removeNewQaBackups(
                    backupFilesBefore,
                    fixture,
                );
            }
            const residue = fixture
                ? [
                    ...listFiles(CHAT_DIRECTORY),
                    ...listFiles(KNOWLEDGE_DIRECTORY),
                    ...listFiles(BACKUP_DIRECTORY),
                ].filter(filePath =>
                    filePath.includes(fixture.qaFileBase) ||
                    filePath.includes(fixture.qaTimelineId))
                : [];
            evidence.cleanup = {
                proxyClosed: Boolean(proxy),
                removed,
                residue,
                temporaryProfilesRemaining: 0,
                temporaryProfilesRemovedFromSettings:
                    settingsCleanup.temporaryProfilesRemoved,
            };
            evidence.profileSetUnchanged =
                settingsCleanup.status.sha256 === settingsBefore.sha256;
            evidence.translationSettingsRestored =
                settingsCleanup.status.sha256 === settingsBefore.sha256;
            evidence.tinaAfter = readFileStatus(TINA_CHAT_PATH);
            evidence.secretsUnchanged =
                secretsAfter.sha256 ===
                    secretsBefore.sha256 &&
                secretsAfter.bytes ===
                    secretsBefore.bytes &&
                Math.abs(
                    secretsAfter.mtimeMs -
                    secretsBefore.mtimeMs,
                ) < 1;
            writeFileSync(
                EVIDENCE_PATH,
                `${JSON.stringify(evidence, null, 2)}\n`,
            );
            await testInfo.attach(
                'hogwarts-mud-single-model-evidence',
                {
                    body: Buffer.from(
                        JSON.stringify(evidence, null, 2),
                    ),
                    contentType: 'application/json',
                },
            );
        }

        expect(evidence.cleanup.residue).toEqual([]);
        expect(evidence.cleanup.temporaryProfilesRemaining).toBe(0);
        expect(evidence.profileSetUnchanged).toBe(true);
        expect(evidence.translationSettingsRestored).toBe(true);
        expect(evidence.tinaAfter).toEqual(tinaBefore);
        expect(evidence.secretsUnchanged).toBe(true);
        if (failure) throw failure;
    });
});
