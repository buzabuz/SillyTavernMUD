# Technical Spec

Artifact revision: 1

Status: implemented and verified.

## Ownership

```text
State/chat
  -> buildKnowledgeRecords()
  -> canonical KnowledgeRecordV2[]
  -> computeKnowledgeProjectionFingerprint()
  -> JSON exact + optional Qdrant candidate indexes

player action + bounded State MemoryRef/Schema seeds
  -> Knowledge API candidate search
  -> current canonical record lookup
  -> exact current hydration
  -> buildSealedActivationCapsules()
  -> LowTierContextV1.memoryActivations
```

State/chat remain the only source of truth. Backend records never overwrite
canonical records.

## Shared Contract

Add:

```js
export const KNOWLEDGE_API_CONTRACT_VERSION = 3;
export const KNOWLEDGE_INDEX_FORMAT_VERSION = 2;
export const KNOWLEDGE_PROJECTOR_VERSION = 2;
```

Every Knowledge endpoint request and response carries:

```json
{
  "knowledgeApiContractVersion": 3
}
```

The client rejects a missing or different response version with:

```text
KNOWLEDGE_API_CONTRACT_MISMATCH
```

The error is not retried and must be raised before a paid narrative request.

## Projection Fingerprint

Add one deterministic function:

```js
computeKnowledgeProjectionFingerprint(records)
```

Input is normalized `KnowledgeRecordV2[]`. Hash input is:

```json
[
  ["record_id_1", "content_checksum_1"],
  ["record_id_2", "content_checksum_2"]
]
```

sorted by `recordId`. `stateRevision`, timestamps, backend status and ordering
outside this stable sort are excluded.

JSON index stores:

```js
{
    version: 2,
    projectorVersion: 2,
    knowledgeApiContractVersion: 3,
    timelineId,
    timelineEpoch,
    stateRevision,          // projected-at/write-order provenance
    projectionFingerprint, // content identity
    records,
}
```

Backend health and sync diagnostics return the same fields.

## Revision Policy

Extend Knowledge hydration with an explicit policy:

```text
exact       recordRevision === requestedRevision
not_future  recordRevision <= requestedRevision
```

Rules:

- backend candidate query uses `not_future`;
- current canonical final hydration uses `exact`;
- writes continue rejecting an incoming revision lower than the backend's
  latest accepted write revision for the same epoch;
- a different epoch never crosses the boundary;
- no unversioned fallback is accepted.

Qdrant payload filter changes from:

```js
match stateRevision = current
```

to:

```js
range stateRevision <= current
```

The collection generation includes `knowledgeApiContractVersion`, producing a
new collection for this query contract.

## Canonical Candidate Rehydration

`retrieveKnowledge()` performs:

1. validate API response contract version;
2. collect candidate records in backend rank order;
3. build the current canonical record map from current State/chat;
4. resolve candidates by stable record ID;
5. suppress missing records;
6. re-run current timeline, exact revision, ACL, clock, node-type and
   superseded-source hydration;
7. return only current canonical records;
8. do not copy backend `activationCapsules`.

`buildNarrativePromptContext()` then builds capsules from those current
canonical records. Server capsules remain diagnostics only and are never model
input.

## State-Backed Seed Projection

Add:

```js
buildActorMemoryKnowledgeSeedIds(
    worldState,
    actorIds,
    contextPlan,
)
```

The function returns stable Knowledge record IDs only.

For each actor:

- include up to three active/contested Schema IDs;
- include bounded refs using the existing continuity limits:
  - Core: 1;
  - Recent: 2;
  - Everyday: 1;
- map `event:<id>` to `events_<id>`;
- map `appraisal:<id>` to `appraisals_<id>`;
- exclude `migrated_current_impression`;
- dedupe and stable-sort.

The turn workflow appends these IDs to retrieval `entityIds`. It does not place
raw memory summaries in Prompt context.

`buildActorContinuityCapsules()` remains a Scene Transition/Dossier projection.
The dead Low port is removed from `createTurnPerformanceWorkflow`.

## Error Contract

`syncLocalKnowledge()` and `retrieveLocalKnowledge()`:

- record bounded diagnostics;
- rethrow exact-backend/API contract failures;
- never replace failure with `[]`.

`retrieveKnowledge()`:

- throws on non-2xx exact search;
- allows Qdrant degradation only when JSON exact completed successfully;
- returns a legal empty result only when the current-contract exact search
  succeeded and selected no candidates.

The turn workflow reaches `sendModelTaskRequest(scene_performance)` only after
retrieval succeeds.

## V1 Cutover

The JSON backend keeps no V1 reader.

```text
readIndex(version=1) -> null
health.indexMissing=true
replace sync -> rebuild current V2 index atomically
```

Tests and real verification must prove the old directory is replaced, not
dual-read. Qdrant uses the new collection generation and is rebuilt from the
current canonical projection.

## Tina Verification

The real archive is read-only input. Verification records:

- archive SHA/bytes/mtime before and after;
- current State revision and timeline epoch;
- canonical record count and fingerprint;
- exact index format/fingerprint/count;
- Qdrant collection generation/count;
- quill query selected record IDs;
- capsule expectation/supporting Event counts per actor;
- Prompt bytes and protected sections;
- Low call count for the black-box response.

The quill Item's current semantic value is reported but not changed by this
change.

## Test Matrix

1. Fingerprint stability across revision-only changes.
2. Fingerprint change for content/source-ref/ACL changes.
3. Exact versus not-future hydration.
4. Future revision rejection.
5. V1 index replace rebuild.
6. Qdrant `lte` revision filter and new generation.
7. API contract mismatch.
8. Exact sync/search failure propagation.
9. Current canonical replacement of stale candidate text.
10. Deleted/ACL-invalid candidate suppression.
11. Actor MemoryRef and active Schema seed IDs.
12. Real production turn harness reaches Low with current Tina Event capsules.
13. Empty healthy retrieval remains legal.
14. Failure before Low produces zero role calls.
15. Six-field/50 KiB/System ceiling Prompt gates.
16. Fresh context-free sub-agent one-attempt output validation.

## Files

Production:

- `public/scripts/extensions/hogwarts-mud/domain/knowledge-projector-v2.js`
- `public/scripts/extensions/hogwarts-mud/domain/knowledge-record-v2.js`
- `public/scripts/extensions/hogwarts-mud/domain/actor-knowledge.js`
- `public/scripts/extensions/hogwarts-mud/domain/narrative-prompt-context.js`
- `public/scripts/extensions/hogwarts-mud/knowledge.js`
- `public/scripts/extensions/hogwarts-mud/adapters/knowledge.js`
- `public/scripts/extensions/hogwarts-mud/workflows/turn.js`
- `public/scripts/extensions/hogwarts-mud/workflows/turn-performance.js`
- `public/scripts/extensions/hogwarts-mud/workflows/application.js`
- `src/endpoints/hogwarts-mud.js`
- `src/hogwarts-mud/knowledge-json-backend.js`
- `src/hogwarts-mud/knowledge-qdrant-backend.js`
- `src/hogwarts-mud/knowledge-vector-service.js`
- `src/hogwarts-mud/knowledge-relational-service.js`

Contracts/docs:

- `.trae/specs/hogwarts-runtime-contracts/knowledge-runtime.md`
- `.trae/skills/hogwarts-change-governance/SKILL.md`

Tests and verification:

- `tests/hogwarts-mud-knowledge-v2.test.mjs`
- `tests/hogwarts-mud-task6-narrative-context.test.mjs`
- `tests/hogwarts-mud-task8-call-budget.test.mjs`
- a focused current-change test/measurement script in this artifact directory.
