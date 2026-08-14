# Progress

Artifact revision: 1

Phase: complete

Active task: none

## 2026-08-14 - Production Reconnaissance

- Latest committed Tina Low retrieval produced three empty actor capsules.
- State contained 10 Events and actor-scoped retained EventRefs.
- Current exact canonical projection contained 138 records at State revision 88.
- Deterministic exact query selected the current Scene, current turn Event and
  multiple quill-related Events.
- Disk Knowledge index remained V1 with 103 records.
- Qdrant contained V2 records projected at revision 41.
- Active Node server started on 2026-08-11, before the current V2 backend code.
- Runtime stored `Local knowledge sync failed with 500` and silently continued.
- All 35 legacy Appraisals lacked `sourceEventIds`; Person Schema count was 0.
- `social_director` had never attempted a Schema consolidation in the current
  task ledger.
- `buildActorContinuityCapsules()` was passed into the Low workflow composition
  root but no longer consumed after commit `ab74d04c8`.
- Task 6 tests supplied handcrafted activation capsules and stubbed the State
  continuity path as empty.

## Root Decision

Do not add another mutable numeric Knowledge revision. Separate:

- API contract version;
- persisted format/projector version;
- timeline epoch;
- global State save revision;
- deterministic Knowledge projection fingerprint.

Candidate indexes may be older than current State but never from the future.
Only current State/chat canonical hydration may produce model input.

## Baseline

```text
Archive SHA-256:
3062bc06d331a8532a508e4eaacaca20272f8f80496492e6d15dc8b9152df6fa

Archive bytes:
7,123,497

Disk Knowledge:
version=1
records=103

Qdrant:
generation=g16b00e5647de42
record stateRevision=41

Current State:
stateRevision=88
canonical records=138
```

No code or save was modified during reconnaissance.

## 2026-08-14 - Revision Root Fix

- Added `knowledgeApiContractVersion=3` to every Knowledge request/response.
- Separated JSON index format, projector version, timeline epoch, State save
  revision and deterministic projection fingerprint.
- Backend candidate reads now accept same-epoch records at or before the
  current State revision; stale writes and future reads still fail.
- JSON V1 indexes are rebuilt atomically. No V1 dual-read or unversioned
  fallback was added.
- Qdrant uses an `lte` revision filter and the new collection generation
  `g1a452f76ff5d81`.
- Backend records are candidate IDs only. Final text, ACL, clock, source refs
  and supersession are rehydrated from current State/chat canonical records.
- Restored bounded ActorMemoryIndex/Schema seed IDs and actor ownership through
  the real turn composition root.
- Exact sync/search and API contract failures now surface before Low. Healthy
  zero-match remains legal; Qdrant degrades only to healthy JSON exact.
- Unchanged projection fingerprints skip sync/embedding and no longer save
  metadata merely to invalidate the same projection.
- Fixed the endpoint path conversion that returned HTTP 500 after a successful
  rebuild when the user root was relative and the Knowledge root absolute.

## 2026-08-14 - Production Composition Root Defect

The first real production Prompt capture failed even though canonical Event
hydration passed. The focused capsule test had supplied `queryAnchors`
manually, but `turn-performance.js -> buildNarrativePromptContext()` did not
pass the current player action. ActorMemoryIndex retained Events were therefore
discarded at the final capsule boundary.

The production Low builder now passes the address-stripped player action as the
retained-Event query anchor. A regression test and the real capture both prove
the Event reaches the final model-visible capsule.

The same harness migration exposed a second idempotence defect:
`optionalInteger(null)` normalized to `0` in `modelTaskRuntime`, causing a
second lifecycle pass to rewrite scheduler provenance. Null/unset revision and
turn fields now remain null, and runtime normalization is byte-idempotent.

## 2026-08-14 - Real Service Evidence

Running Node processes after the backend restart:

```text
npm start PID 45109
node server.js PID 45118
```

Authenticated Knowledge health:

```text
knowledgeApiContractVersion=3
preferred.backend=qdrant
preferred.ok=true
degraded=false

JSON exact:
indexFormatVersion=2
projectorVersion=2
recordCount=138
stateRevision=88
projectionFingerprint=cyrb53-11fd6b044aca7a

Qdrant:
generation=g1a452f76ff5d81
status=green
points=138
vectorSize=768
```

The previous generation `g16b00e5647de42` remains as an unreferenced rollback
asset. It is not read by contract 3 and was not deleted without a separate
operational cleanup decision.

Knowledge backup:

```text
data/default-user/backups/hogwarts-knowledge-revision-root-fix/20260814T044737Z/knowledge-before
```

Real Qdrant smoke command:

```bash
node scripts/smoke-hogwarts-qdrant.mjs \
  --archive "data/default-user/chats/Hogwarts_World_Director/Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl" \
  --config config.yaml \
  --expected-count 138 \
  --snapshots-path docker/data/qdrant/snapshots
```

Result:

- exact count before/after: `138/138`;
- public authorized count: `1`;
- actor-private authorized count: `1`;
- player and unrelated actor unauthorized counts: `0`;
- locked and missing-visibility counts: `0`;
- temporary ACL collection cleaned;
- known quill sourceRef matched;
- snapshot created and listed for generation `g1a452f76ff5d81`;
- archive SHA unchanged.

## 2026-08-14 - Real Tina Prompt

Verification command:

```bash
node .trae/specs/hogwarts-knowledge-activation-revision-root-fix/verify-production-low.mjs capture
```

Prompt capture was written mode `0600` under `/tmp`; the repository stores only
its hash and bounded metrics.

```text
capture SHA-256:
610e188b65b46e7384bf50da6a2020a8e3faec55a2b949b7ba5c425504ed4559

System:
27,202 characters
27,206 bytes

Output Schema:
2,661 characters

User:
25,804 characters
28,344 bytes

Total:
53,006 characters
55,550 bytes
13,252 estimated tokens

Top-level fields:
playerTurn
sceneFacts
actorCards
actionOpportunities
memoryActivations
prohibitions
```

User section sizes:

```text
playerTurn            1,154 chars
sceneFacts           12,448 chars
actorCards            3,217 chars
actionOpportunities   2,644 chars
memoryActivations     5,940 chars
prohibitions            298 chars
```

Final actor capsules:

```text
Harry:
expectations=0 reason=no_legal_schema
supportingEvent=events_event_gryffindor_common_room_quill_repair_1bc78241e1942a8d

Hermione:
expectations=0 reason=no_legal_schema
supportingEvent=events_event_gryffindor_common_room_quill_repair_1bc78241e1942a8d

Lavender:
expectations=0 reason=no_legal_schema
supportingEvent=events_event_gryffindor_common_room_quill_repair_1bc78241e1942a8d
```

Final archive evidence:

```text
SHA-256:
3062bc06d331a8532a508e4eaacaca20272f8f80496492e6d15dc8b9152df6fa

Bytes:
7,123,497

mtimeMs:
1786673667119.6855
```

SHA, bytes and mtime remained identical throughout build-only, blind validation
and Qdrant smoke.

## 2026-08-14 - Blind Model Gate

A new context-free sub-agent received only the exact `/tmp` production
System/User messages and the instruction to return one JSON object. It did not
receive the PRD, source, validator, expected answer, known defect or repair
feedback.

Validation command:

```bash
node .trae/specs/hogwarts-knowledge-activation-revision-root-fix/verify-production-low.mjs \
  validate \
  --response /tmp/hogwarts-knowledge-root-fix-blind-response.json
```

Result:

```text
response SHA-256:
aa501412cb2b0f3f653977d8181a3c7df252fbd1558cd78f066b1cd39542c1c7

model calls: 1
repair calls: 0
settlement: langgraph
strict Low contract: passed
historical provenance: passed
scene validation: passed
transaction validation: passed
```

No validation error was sent back to the sub-agent.

## 2026-08-14 - Regression

Passing affected suites:

```text
Knowledge/root fix:                 20/20
Low/Task 6/Task 8 affected core:    46/46
Prompt consolidation/save revision: 63/63
Total:                             129/129
```

The Task 6 real Tina build-only harness was migrated from a forced two-Prompt
repair fixture to one initial Prompt and now passes `2/2`. It uses:

- the real pre-ActorContext archive for ActorContext migration evidence;
- the real V1/V2 intermediate archive for revision-4 lifecycle evidence;
- the active Tina archive for current Prompt evidence.

All three archives remain byte/mtime unchanged.

Broader legacy suites still contain pre-existing stale contracts outside this
change:

- `tests/hogwarts-mud.test.mjs` imports retired Foundation/Daily/World Change
  facade exports and fails at module instantiation;
- old Event/Memory/Social suites import retired exports or use pre-revision-4
  Appraisal fixtures;
- two Task 5 legacy tests use stale local-observer/lifecycle expectations.

No compatibility export, fallback reader or production behavior was restored
to make those retired tests pass. These failures do not execute the Knowledge
root-fix paths and are not used as acceptance evidence.

## Completion

KAR-1 through KAR-7 are complete. No Tina Item fact, language contract,
Person-Schema threshold, legacy Appraisal provenance, Social, Calendar, Map or
Actor lifecycle behavior was changed by this Knowledge root fix.
