import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { LOW_POST_TURN_TRANSPORT_JSON_SCHEMA } from '../public/scripts/extensions/hogwarts-mud/domain/post-turn-semantic-contract.js';

const [mode, requestPath, outputPath] = process.argv.slice(2);
if (!['scene', 'low', 'low-supplement'].includes(mode) || !requestPath || !outputPath) {
    throw new Error('Usage: <scene|low|low-supplement> <request.json> <private-output.json>');
}
if (!resolve(outputPath).startsWith('/tmp/hpmud-nfp-')) throw new Error('Response output must remain private temporary evidence.');
const ledgerPath = '.trae/specs/hogwarts-narrative-first-post-settlement/evidence/provider-calls.jsonl';
const entries = fs.existsSync(ledgerPath)
    ? fs.readFileSync(ledgerPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const reserved = entries.filter(entry => entry.stage === 'reserved').length;
if (reserved >= 10) throw new Error('Ten-call authorization exhausted.');
const sourcePath = 'data/default-user/chats/Hogwarts_World_Director/Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl';
const source = fs.readFileSync(sourcePath, 'utf8');
const state = JSON.parse(source.split('\n')[0]).chat_metadata.hogwartsMud;
const settings = JSON.parse(fs.readFileSync('data/default-user/settings.json', 'utf8'));
const profile = settings.extension_settings.connectionManager.profiles.find(p => p.id === state.modelSlots.low.profileId);
if (profile?.api !== 'custom' || !profile['secret-id']) throw new Error('Current custom profile is unavailable.');
const request = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
const requestHash = createHash('sha256').update(JSON.stringify(request.messages)).digest('hex');
const body = {
    chat_completion_source: profile.api,
    custom_url: profile['api-url'],
    secret_id: profile['secret-id'],
    model: profile.model,
    messages: request.messages,
    max_tokens: state.modelSlots.low.maxResponseLength,
    stream: false,
    response_format: { type: 'json_object' },
    ...(request.outputSchema ? { json_schema: {
        name: LOW_POST_TURN_TRANSPORT_JSON_SCHEMA.name, strict: true, value: request.outputSchema,
    } } : {}),
};
const id = reserved + 1;
const record = entry => fs.appendFileSync(ledgerPath, `${JSON.stringify({ id, mode, ...entry })}\n`);
record({ stage: 'reserved', at: new Date().toISOString(), requestHash, model: profile.model });
const started = Date.now();
try {
    const response = await fetch('http://127.0.0.1:8004/api/backends/chat-completions/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(240000),
    });
    const payload = await response.json();
    if (!response.ok || payload.error) throw new Error(`Provider transport failed (${response.status}).`);
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('Provider returned no final content.');
    fs.writeFileSync(outputPath, content, { mode: 0o600 });
    const report = {
        stage: 'received', httpStatus: response.status, elapsedMs: Date.now() - started,
        finalCharacters: content.length, responseHash: createHash('sha256').update(content).digest('hex'),
        finishReason: payload.choices?.[0]?.finish_reason || '', usage: payload.usage || null,
    };
    record(report);
    console.log(JSON.stringify({ id, mode, ...report }, null, 2));
} catch (error) {
    record({ stage: 'failed', elapsedMs: Date.now() - started, error: String(error.message).slice(0, 180) });
    throw error;
} finally {
    if (fs.readFileSync(sourcePath, 'utf8') !== source) {
        console.error('Source game save changed during isolated provider verification.');
        process.exitCode = 1;
    }
}
