import fs from 'node:fs';
import path from 'node:path';

import express from 'express';
import { sync as writeFileAtomicSync } from 'write-file-atomic';

import {
    adjudicateTurn,
    getLocalSemanticStatus,
    observeTurn,
    translateText,
} from '../hogwarts-mud/local-semantic-adjudicator.js';
import {
    runSocialDirectorGraph,
    validateCommittedEventWitnessInput,
} from '../hogwarts-mud/social-director-graph.js';
import { runTurnSettlementGraph } from '../hogwarts-mud/turn-settlement-graph.js';
import { clientRelativePath, isPathUnderParent } from '../util.js';

export const router = express.Router();

const KNOWLEDGE_CATEGORIES = new Set(['actors', 'scenes', 'events', 'clues']);
const MAX_RECORDS_PER_SYNC = 200;
const MAX_TEXT_LENGTH = 100_000;

function normalizeId(value, fallback = 'unknown') {
    const normalized = String(value || '')
        .normalize('NFKD')
        .replace(/[^\w.-]+/g, '_')
        .replace(/^[_\-.]+|[_\-.]+$/g, '')
        .slice(0, 96);
    return normalized || fallback;
}

function getTimelineRoot(request, timelineId) {
    const knowledgeRoot = path.join(request.user.directories.files, 'hogwarts-mud');
    const timelineRoot = path.join(knowledgeRoot, normalizeId(timelineId, 'timeline'));
    if (!isPathUnderParent(knowledgeRoot, timelineRoot)) {
        throw new Error('Invalid Hogwarts MUD timeline path.');
    }
    return timelineRoot;
}

function normalizeRecord(record) {
    const category = String(record?.category || '');
    if (!KNOWLEDGE_CATEGORIES.has(category)) {
        throw new Error(`Invalid Hogwarts MUD knowledge category: ${category}`);
    }
    const id = normalizeId(record.id);
    const text = String(record.text || '').slice(0, MAX_TEXT_LENGTH);
    if (!text.trim()) {
        throw new Error(`Knowledge record ${category}/${id} has no retrieval text.`);
    }
    return {
        version: 1,
        category,
        id,
        title: String(record.title || id).slice(0, 300),
        text,
        entityIds: Array.isArray(record.entityIds)
            ? [...new Set(record.entityIds.map(value => normalizeId(value)).filter(Boolean))].slice(0, 64)
            : [],
        tags: Array.isArray(record.tags)
            ? [...new Set(record.tags.map(value => normalizeId(value)).filter(Boolean))].slice(0, 64)
            : [],
        updatedAt: String(record.updatedAt || new Date().toISOString()),
        data: record.data && typeof record.data === 'object' ? record.data : {},
    };
}

function readIndex(timelineRoot) {
    const indexPath = path.join(timelineRoot, 'index.json');
    if (!fs.existsSync(indexPath)) return { version: 1, records: {} };
    try {
        const parsed = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        return parsed && typeof parsed === 'object'
            ? { version: 1, records: parsed.records || {} }
            : { version: 1, records: {} };
    } catch {
        return { version: 1, records: {} };
    }
}

function readRecord(timelineRoot, entry) {
    const recordPath = path.join(timelineRoot, entry.category, `${entry.id}.json`);
    if (!isPathUnderParent(timelineRoot, recordPath) || !fs.existsSync(recordPath)) return null;
    try {
        return JSON.parse(fs.readFileSync(recordPath, 'utf8'));
    } catch {
        return null;
    }
}

router.post('/knowledge/sync', (request, response) => {
    try {
        const records = Array.isArray(request.body.records) ? request.body.records : [];
        if (!request.body.timelineId || records.length > MAX_RECORDS_PER_SYNC) {
            return response.sendStatus(400);
        }
        const timelineRoot = getTimelineRoot(request, request.body.timelineId);
        fs.mkdirSync(timelineRoot, { recursive: true });
        const index = readIndex(timelineRoot);
        const normalizedRecords =
            records.map(
                normalizeRecord,
            );
        const incomingKeys =
            new Set(
                normalizedRecords.map(
                    record =>
                        `${record.category}:${record.id}`,
                ),
            );
        const saved = [];

        for (const record of normalizedRecords) {
            const categoryRoot = path.join(timelineRoot, record.category);
            fs.mkdirSync(categoryRoot, { recursive: true });
            const recordPath = path.join(categoryRoot, `${record.id}.json`);
            if (!isPathUnderParent(categoryRoot, recordPath)) {
                throw new Error('Invalid Hogwarts MUD record path.');
            }
            writeFileAtomicSync(recordPath, JSON.stringify(record, null, 2), 'utf8');
            const key = `${record.category}:${record.id}`;
            index.records[key] = {
                category: record.category,
                id: record.id,
                title: record.title,
                entityIds: record.entityIds,
                tags: record.tags,
                updatedAt: record.updatedAt,
                path: clientRelativePath(request.user.directories.root, recordPath),
            };
            saved.push(index.records[key]);
        }

        const removed = [];
        if (request.body.replace === true) {
            for (const [key, entry] of Object.entries(index.records)) {
                if (incomingKeys.has(key)) {
                    continue;
                }
                const category =
                    String(
                        entry?.category ||
                        '',
                    );
                const id =
                    normalizeId(
                        entry?.id,
                    );
                if (
                    KNOWLEDGE_CATEGORIES
                        .has(category)
                ) {
                    const categoryRoot =
                        path.join(
                            timelineRoot,
                            category,
                        );
                    const recordPath =
                        path.join(
                            categoryRoot,
                            `${id}.json`,
                        );
                    if (
                        isPathUnderParent(
                            categoryRoot,
                            recordPath,
                        )
                    ) {
                        fs.rmSync(
                            recordPath,
                            {
                                force: true,
                            },
                        );
                    }
                    removed.push({
                        category,
                        id,
                    });
                }
                delete index.records[key];
            }
        }

        writeFileAtomicSync(
            path.join(timelineRoot, 'index.json'),
            JSON.stringify(index, null, 2),
            'utf8',
        );
        return response.json({
            root: clientRelativePath(request.user.directories.root, timelineRoot),
            records: saved,
            removed,
        });
    } catch (error) {
        console.error('[Hogwarts MUD] Knowledge sync failed', error);
        return response.sendStatus(500);
    }
});

router.post('/knowledge/list', (request, response) => {
    try {
        if (!request.body.timelineId) return response.sendStatus(400);
        const timelineRoot = getTimelineRoot(request, request.body.timelineId);
        const categories = new Set(
            Array.isArray(request.body.categories)
                ? request.body.categories.filter(category => KNOWLEDGE_CATEGORIES.has(category))
                : KNOWLEDGE_CATEGORIES,
        );
        const index = readIndex(timelineRoot);
        const records = Object.values(index.records)
            .filter(entry => categories.has(entry.category))
            .map(entry => readRecord(timelineRoot, entry))
            .filter(Boolean);
        return response.json({ records });
    } catch (error) {
        console.error('[Hogwarts MUD] Knowledge list failed', error);
        return response.sendStatus(500);
    }
});

router.post('/knowledge/search', (request, response) => {
    try {
        if (!request.body.timelineId) return response.sendStatus(400);
        const timelineRoot = getTimelineRoot(request, request.body.timelineId);
        const index = readIndex(timelineRoot);
        const query = String(request.body.query || '').trim().toLocaleLowerCase();
        const queryTokens = new Set(query.split(/[^\p{L}\p{N}_-]+/u).filter(token => token.length > 1));
        const entityIds = new Set(
            Array.isArray(request.body.entityIds)
                ? request.body.entityIds.map(value => normalizeId(value))
                : [],
        );
        const categories = new Set(
            Array.isArray(request.body.categories)
                ? request.body.categories.filter(category => KNOWLEDGE_CATEGORIES.has(category))
                : KNOWLEDGE_CATEGORIES,
        );
        const limit = Math.min(20, Math.max(1, Number(request.body.limit) || 8));
        const records = Object.values(index.records)
            .filter(entry => categories.has(entry.category))
            .map(entry => readRecord(timelineRoot, entry))
            .filter(Boolean)
            .map(record => {
                let score = 0;
                if (entityIds.has(record.id)) score += 120;
                score += record.entityIds.filter(id => entityIds.has(id)).length * 80;
                const haystack = `${record.id} ${record.title} ${record.text}`.toLocaleLowerCase();
                for (const token of queryTokens) {
                    if (haystack.includes(token)) score += token === record.id ? 40 : 5;
                }
                return { record, score };
            })
            .filter(item => item.score > 0)
            .sort((left, right) => right.score - left.score)
            .slice(0, limit)
            .map(item => item.record);
        return response.json({ records });
    } catch (error) {
        console.error('[Hogwarts MUD] Knowledge search failed', error);
        return response.sendStatus(500);
    }
});

router.post('/social/resolve', async (request, response) => {
    try {
        const input = request.body;
        const messageSceneIds =
            input?.messageSceneIds;
        const witnessesByMessage =
            input
                ?.witnessActorIdsByMessageId;
        if (
            !input ||
            typeof input !== 'object' ||
            Array.isArray(input) ||
            !Array.isArray(input.actorIds) ||
            input.actorIds.length > 64 ||
            !Array.isArray(input.allowedMessageIds) ||
            input.allowedMessageIds.length > 200 ||
            input.allowedMessageIds.some(id =>
                !Number.isInteger(
                    Number(id),
                )) ||
            !Array.isArray(
                input.eventKnowledge,
            ) ||
            input.eventKnowledge.length > 200 ||
            (
                (
                    !messageSceneIds ||
                    typeof messageSceneIds !==
                        'object' ||
                    Array.isArray(
                        messageSceneIds,
                    ) ||
                    Object.keys(
                        messageSceneIds,
                    ).length > 200 ||
                    input.allowedMessageIds
                        .some(id =>
                            !Object.hasOwn(
                                messageSceneIds,
                                id,
                            ) ||
                            !String(
                                messageSceneIds[
                                    id
                                ] ||
                                '',
                            ).trim())
                )
            ) ||
            (
                (
                    !witnessesByMessage ||
                    typeof witnessesByMessage !==
                        'object' ||
                    Array.isArray(
                        witnessesByMessage,
                    ) ||
                    Object.keys(
                        witnessesByMessage,
                    ).length > 200 ||
                    Object.values(
                        witnessesByMessage,
                    ).some(value =>
                        !Array.isArray(value) ||
                        value.length > 65) ||
                    input.allowedMessageIds
                        .some(id =>
                            !Object.hasOwn(
                                witnessesByMessage,
                                id,
                            ))
                )
            ) ||
            !input.existingGraph ||
            typeof input.existingGraph !==
                'object' ||
            Array.isArray(
                input.existingGraph,
            ) ||
            Number(
                input.existingGraph
                    .version,
            ) !== 2 ||
            !input.extraction ||
            typeof input.extraction !==
                'object' ||
            Array.isArray(
                input.extraction,
            ) ||
            !Array.isArray(
                input.extraction
                    .statements,
            ) ||
            input.extraction
                .statements.length > 100 ||
            !Array.isArray(
                input.extraction
                    .relationshipEvidence,
            ) ||
            input.extraction
                .relationshipEvidence
                .length > 200 ||
            input.extraction
                .relationshipEvidence
                .some(evidence =>
                    !evidence ||
                    typeof evidence !==
                        'object' ||
                    (
                        Array.isArray(
                            evidence
                                .dimensionDeltas,
                        ) &&
                        evidence
                            .dimensionDeltas
                            .length > 20
                    ) ||
                    (
                        Array.isArray(
                            evidence
                                .emotionAppraisals,
                        ) &&
                        evidence
                            .emotionAppraisals
                            .length > 12
                    ) ||
                    (
                        Array.isArray(
                            evidence
                                .structuralTags,
                        ) &&
                        evidence
                            .structuralTags
                            .length > 20
                    )) ||
            !Array.isArray(
                input.extraction.reviews,
            ) ||
            input.extraction
                .reviews.length > 16 ||
            JSON.stringify(input)
                .length > 500_000
        ) {
            return response.sendStatus(400);
        }
        const committedWitnessValidation =
            validateCommittedEventWitnessInput(
                input,
            );
        if (
            !committedWitnessValidation
                .valid
        ) {
            return response.sendStatus(400);
        }
        input.messageSceneIds =
            committedWitnessValidation
                .messageSceneIds;
        input
            .witnessActorIdsByMessageId =
            committedWitnessValidation
                .witnessActorIdsByMessageId;
        const result = await runSocialDirectorGraph(input);
        return response.json(result);
    } catch (error) {
        console.error('[Hogwarts MUD] Social director graph failed', error);
        return response.sendStatus(500);
    }
});

router.get('/local/status', async (_request, response) => {
    return response.json(
        await getLocalSemanticStatus(),
    );
});

router.post('/local/adjudicate', async (request, response) => {
    try {
        const input =
            request.body?.input;
        if (
            !input ||
            typeof input !== 'object' ||
            Array.isArray(input) ||
            !Array.isArray(
                input.playerTurnSequence,
            ) ||
            input.playerTurnSequence
                .length > 32 ||
            JSON.stringify(input)
                .length > 100_000
        ) {
            return response
                .sendStatus(400);
        }
        return response.json(
            await adjudicateTurn(
                input,
            ),
        );
    } catch (error) {
        console.warn(
            '[Hogwarts MUD] Local pre-turn adjudication unavailable',
            error,
        );
        return response.status(503).json({
            error:
                String(
                    error?.message ||
                    error,
                ).slice(0, 1_000),
        });
    }
});

router.post('/local/translate', async (request, response) => {
    try {
        const text =
            String(
                request.body?.text ||
                '',
            );
        if (
            !text.trim() ||
            text.length > 12_000 ||
            (
                request.body
                    ?.glossary !==
                    undefined &&
                (
                    !Array.isArray(
                        request.body
                            .glossary,
                    ) ||
                    request.body
                        .glossary
                        .length > 96
                )
            )
        ) {
            return response
                .sendStatus(400);
        }
        const result =
            await translateText(
                text,
                {
                    unload:
                        request.body
                            ?.unload !==
                        false,
                    glossary:
                        request.body
                            ?.glossary ||
                        [],
                },
            );
        return response
            .type('text/plain')
            .send(
                result.translation,
            );
    } catch (error) {
        console.warn(
            '[Hogwarts MUD] Local translation unavailable',
            error,
        );
        return response.status(503).json({
            error:
                String(
                    error?.message ||
                    error,
                ).slice(0, 1_000),
        });
    }
});

router.post('/local/observe', async (request, response) => {
    try {
        const input =
            request.body?.input;
        if (
            !input ||
            typeof input !== 'object' ||
            Array.isArray(input) ||
            !Array.isArray(
                input.narrativeSegments,
            ) ||
            input.narrativeSegments
                .length > 24 ||
            JSON.stringify(input)
                .length > 150_000
        ) {
            return response
                .sendStatus(400);
        }
        return response.json(
            await observeTurn(
                input,
            ),
        );
    } catch (error) {
        console.warn(
            '[Hogwarts MUD] Local post-turn observation unavailable',
            error,
        );
        return response.status(503).json({
            error:
                String(
                    error?.message ||
                    error,
                ).slice(0, 1_000),
        });
    }
});

router.post('/turn/settle', async (request, response) => {
    try {
        const input = request.body;
        const payload = input?.payload;
        if (
            !input ||
            typeof input !== 'object' ||
            !input.worldState ||
            typeof input.worldState !==
                'object' ||
            !payload ||
            typeof payload !==
                'object' ||
            Array.isArray(payload) ||
            (
                payload.segments !==
                    undefined &&
                (
                    !Array.isArray(
                        payload.segments,
                    ) ||
                    payload.segments
                        .length > 24
                )
            ) ||
            (
                payload.stateProposals !==
                    undefined &&
                (
                    !Array.isArray(
                        payload
                            .stateProposals,
                    ) ||
                    payload
                        .stateProposals
                        .length > 24
                )
            ) ||
            (
                input.admittedActors !==
                    undefined &&
                (
                    !Array.isArray(
                        input
                            .admittedActors,
                    ) ||
                    input
                        .admittedActors
                        .length > 4
                )
            )
        ) {
            return response
                .sendStatus(400);
        }
        const performance =
            await runTurnSettlementGraph(
                input,
            );
        return response.json({
            performance,
        });
    } catch (error) {
        console.error(
            '[Hogwarts MUD] Turn settlement graph failed',
            error,
        );
        return response.sendStatus(500);
    }
});
