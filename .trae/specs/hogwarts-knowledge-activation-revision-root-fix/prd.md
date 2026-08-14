# Hogwarts Knowledge Activation Revision Root Fix

Artifact revision: 1

Status: implemented and verified under the user's approved 2026-08-14 `/goal`
instruction.

## Why

The latest committed Tina turn sent three sealed Memory capsules to the Low
Performer, but every capsule contained zero expectations and zero hydrated
Events. This was not a legitimate no-match result:

- authoritative State contained 10 Events;
- Harry, Hermione and Lavender each retained five relevant Event references;
- a model-free canonical exact query selected the current Scene and multiple
  quill Events;
- the production retrieval returned `selectedRecords=[]`.

The same failure class has appeared repeatedly as stale post-turn results,
stale Knowledge, old index versions and scheduler ledger revisions. The root
problem is that unrelated version concepts were treated as one global number,
and refactors were accepted through synthetic fixtures instead of the real
composition root.

## Production Incident

The active Tina evidence at investigation time was:

- State revision: 88.
- Knowledge disk index: legacy `version=1`, 103 records.
- Qdrant records: Knowledge V2 projected at State revision 41.
- Node server start: 2026-08-11.
- current Knowledge V2 server implementation commit: 2026-08-13.
- `knowledgeBase.lastError`: `Local knowledge sync failed with 500`.
- Low retrieval: zero planner/backend records and empty capsules.
- canonical model-free exact retrieval: multiple relevant quill Events.
- Person Schemas: zero.
- Appraisals: 35, all with `sourceEventIds=[]`.
- `social_director` attempts: zero.

The active archive fingerprint before implementation is:

```text
SHA-256 3062bc06d331a8532a508e4eaacaca20272f8f80496492e6d15dc8b9152df6fa
Bytes   7,123,497
```

## Root Cause

### 1. Version concepts were collapsed

`stateRevision` currently means all of the following:

- optimistic save concurrency;
- world business changes;
- scheduler ledger persistence;
- Knowledge projection time;
- Knowledge read eligibility.

Knowledge records written at revision N are rejected as soon as any save moves
State to N+1, even when the projected knowledge content is byte-identical.
`syncLocalKnowledge()` also saves Knowledge metadata after writing the index,
so a successful synchronization can invalidate itself immediately.

### 2. Client/server format had no handshake

The browser loaded new client modules while the long-running Node process still
served an older Knowledge API. The client could not detect the mismatch. The
old process rewrote the disk index as V1, the new request received HTTP 500,
and runtime code converted the failure into an empty result.

### 3. Canonical hydration was placed after an exact-revision gate

JSON and Qdrant are candidate indexes, not authority. The safe flow is:

```text
candidate record ID
-> current State/chat canonical record
-> current ACL/clock/source-ref hydration
-> sealed capsule
```

Instead, old candidate records were rejected before current canonical hydration
could replace them. The server-built capsule was then trusted by the client
even though the server does not own current browser State.

### 4. Actor Memory ID expansion was disconnected

Before the relational-memory refactor, Low received
`buildActorContinuityCapsules()` from authoritative State. Commit `ab74d04c8`
replaced this input with retrieval activation capsules. `application.js`
continued passing `buildActorContinuityCapsules`, but
`turn-performance.js` stopped consuming it.

The approved `ActorMemoryIndex -> Prompt continuity` and exact-only ID
expansion path therefore became dead wiring. When RAG returned nothing, retained
Event references could not recover the canonical Events.

### 5. Acceptance tested prepared answers

Prompt tests supplied handcrafted activation capsules and explicitly stubbed
`buildActorContinuityCapsules` as `() => []`. Knowledge tests used fresh
in-memory V2 indexes. No acceptance test covered:

```text
legacy disk index
-> real server sync/rebuild
-> save revision advance
-> real retrieval
-> current canonical hydration
-> production Low builder
```

The old checklist claim that exact-only and Event ID expansion worked was not
supported by production evidence.

## Product Semantics

### Version taxonomy

The system SHALL keep four meanings separate:

| Concept | Meaning | Changes when |
| --- | --- | --- |
| `knowledgeApiContractVersion` | client/server request and response contract | API shape or semantics change |
| `formatVersion/projectorVersion` | persisted Knowledge record/index format | persisted format changes |
| `timelineEpoch` | authoritative story branch identity | timeline branch changes |
| `stateRevision` | monotonic State save/concurrency provenance | State is saved |
| `projectionFingerprint` | deterministic Knowledge content identity | projected record IDs or checksums change |

No reader may use `stateRevision` equality as a substitute for Knowledge content
identity.

### Knowledge read authority

JSON/Qdrant results SHALL be candidate identifiers only. Candidate records:

- must have the same timeline epoch;
- must not come from a future State revision;
- may come from an earlier State revision;
- must be rehydrated from current canonical State/chat before Prompt use;
- must be suppressed when the current canonical record is missing or fails
  ACL, clock, source-ref or supersession checks.

Only current canonical records may build the capsule delivered to a model.

### Fast and slow memory paths

The approved architecture remains:

```text
active/contested Person Schema
-> expectation fast path

ActorMemoryIndex / Schema support IDs
-> exact candidate IDs
-> canonical Event hydration
-> detail slow path
```

For each in-scope actor:

- active/contested Schema IDs are deterministic Knowledge seeds;
- bounded Core/Recent/Everyday MemoryRef IDs are deterministic Knowledge seeds;
- Appraisal IDs may seed graph expansion but raw Appraisal prose is not emitted
  as a Low supporting Event;
- only hydrated Event records may authorize concrete prior details;
- the existing Low limits remain three Events per actor and eight globally.

The 35 Tina legacy Appraisals SHALL NOT be heuristically assigned source Events
or converted into Schemas. They lack legal Event provenance. Schema expectation
remains empty until valid source-grounded Appraisals satisfy the existing
three-Appraisal/two-Scene rule.

### Failure behavior

- A stale/mismatched Knowledge API contract fails before a paid Low request and
  tells the operator to restart the SillyTavern server.
- A JSON exact sync or retrieval failure fails explicitly.
- Qdrant failure may degrade only to a healthy JSON exact backend.
- Retrieval returning zero matches from a healthy backend remains legal.
- No automatic model repair, retry or fallback call is added.

## Requirements

1. Add a shared Knowledge API contract version and require it on health, sync,
   rebuild, list and search.
2. Add a deterministic projection fingerprint derived from sorted
   `recordId + contentChecksum` pairs.
3. Persist and report the fingerprint in JSON index/backend diagnostics.
4. Keep stale-write rejection monotonic, but change query eligibility from
   exact revision to same timeline plus `recordRevision <= currentRevision`.
5. Change Qdrant filters from revision equality to an upper-bound range.
6. Rebuild capsules client-side from current canonical records; never inject a
   server capsule directly.
7. Restore bounded State-backed Schema and ActorMemoryIndex seed IDs in the
   production Low retrieval path.
8. Replace swallowed exact-backend errors with explicit pre-Low failures.
9. Automatically rebuild a V1/missing exact index when a current-contract
   `replace=true` synchronization reaches the current server.
10. Rebuild Tina JSON exact and Qdrant projections from the current archive
    without changing world facts, messages, Items, Social, Memory or clock.
11. Keep the six-field Low payload and existing 50 KiB User Payload cap.
12. Do not change the protected Low System Prompt ceiling of 27,221 characters.

## Acceptance

- A V1 disk index is rebuilt to the current index format in one replace sync.
- Client and server contract mismatch produces one explicit error and zero Low
  model calls.
- A record projected at N remains eligible as a candidate at N+1 when content
  is unchanged.
- A future record remains rejected.
- A deleted or ACL-invalid candidate is suppressed by current canonical
  hydration.
- Projection fingerprint is stable across scheduler/metadata-only revisions and
  changes when canonical Knowledge content changes.
- Qdrant revision 41 candidates can be safely rehydrated against current Tina
  State without injecting stale text.
- The current Tina action retrieves at least the relevant quill Event IDs.
- Harry, Hermione and Lavender receive actor-scoped supporting Events permitted
  by their EventRefs/ACL.
- Schema expectations remain empty with an explicit `no_legal_schema` reason;
  no legacy Appraisal is guessed into a Schema.
- The production Low builder stays within all Prompt budgets.
- Invalid retrieval infrastructure fails before the one Low request.
- A fresh context-free sub-agent receives only the captured production Low
  messages and produces a response that passes the production one-attempt
  contract without repair.
- The active Tina archive is byte-identical during build-only/retrieval tests;
  any intentional Knowledge metadata save is separately backed up and verified.

## Out Of Scope

- correcting the Tina quill `remains/absent` State incident;
- language contract and Chinese `textEn` validation;
- changing Person Schema evidence thresholds;
- inventing provenance for legacy Appraisals;
- adding a second Low/Medium/High call;
- redesigning Item, Social, Calendar, Map or Actor lifecycle contracts.
