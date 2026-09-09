import fs from 'node:fs';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { setConfigFilePath, getConfigValue } from '../src/util.js';
import { callStructuredModel, createPostTurnModelRequest, enqueueLocalSemanticOperation } from '../src/hogwarts-mud/local-semantic-adjudicator.js';

const [requestPath, outputPath] = process.argv.slice(2);
setConfigFilePath('config.yaml');
getConfigValue('hogwartsMud.localSemantic.enabled', true, 'boolean');
if (!outputPath?.startsWith('/tmp/hpmud-nfp-')) throw new Error('Private output path required.');
const request = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
const input = JSON.parse(request.messages[1].content);
const sourcePath = 'data/default-user/chats/Hogwarts_World_Director/Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl';
const before = fs.readFileSync(sourcePath, 'utf8');
const ledger = '.trae/specs/hogwarts-narrative-first-post-settlement/evidence/provider-calls.jsonl';
const used = fs.readFileSync(ledger, 'utf8').trim().split('\n').map(JSON.parse).filter(e => e.stage === 'reserved').length;
if (used >= 10) throw new Error('Shared ten-call ceiling reached.');
const id = used + 1;
const record = entry => fs.appendFileSync(ledger, `${JSON.stringify({ id, mode: 'local', ...entry })}\n`);
let generationCalls = 0;
let captured = null;
const proxy = createServer(async (req, res) => {
    try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const body = Buffer.concat(chunks);
        if (req.url === '/api/chat' && ++generationCalls !== 1) throw new Error('Unexpected duplicate generation.');
        const response = await fetch(`http://127.0.0.1:11434${req.url}`, {
            method: req.method, ...(body.length ? { body } : {}), headers: { 'Content-Type': 'application/json' },
        });
        const bytes = await response.text();
        if (req.url === '/api/chat') {
            const result = JSON.parse(bytes);
            captured = {
                finalCharacters: String(result.message?.content || '').length,
                doneReason: result.done_reason, evalCount: result.eval_count, promptEvalCount: result.prompt_eval_count,
            };
            fs.writeFileSync(outputPath, result.message?.content || '', { mode: 0o600 });
        }
        res.writeHead(response.status, { 'Content-Type': 'application/json' }).end(bytes);
    } catch (error) {
        res.writeHead(502).end(JSON.stringify({ error: error.message }));
    }
});
await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
process.env.HOGWARTS_OLLAMA_URL = `http://127.0.0.1:${proxy.address().port}`;
record({ stage: 'reserved', at: new Date().toISOString(), model: 'configured_local',
    requestHash: createHash('sha256').update(JSON.stringify(request.messages)).digest('hex') });
const start = Date.now();
try {
    const result = await enqueueLocalSemanticOperation(() => callStructuredModel(createPostTurnModelRequest(input)));
    record({ stage: 'received', elapsedMs: Date.now() - start, ...captured, diagnostics: result.diagnostics });
    console.log(JSON.stringify({ generationCalls, ...captured, diagnostics: result.diagnostics }, null, 2));
} catch (error) {
    record({ stage: 'failed', elapsedMs: Date.now() - start, ...captured, error: error.message });
    console.error(JSON.stringify({ generationCalls, ...captured, error: error.message }, null, 2));
    process.exitCode = 1;
} finally {
    delete process.env.HOGWARTS_OLLAMA_URL;
    await new Promise(resolve => proxy.close(resolve));
    if (fs.readFileSync(sourcePath, 'utf8') !== before) {
        console.error('Source save changed during isolated Local verification.');
        process.exitCode = 1;
    }
}
