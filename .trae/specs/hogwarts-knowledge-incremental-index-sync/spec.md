# Technical Specification: Incremental Knowledge Index Sync

## Status

Revision 2 is approved for implementation. It supersedes Revision 1 only for
the Qdrant reconciliation scheduling boundary.

## Design Goal

Keep the full authoritative Knowledge snapshot for reconciliation while making
vector computation proportional to semantic record changes, not snapshot size.
No index can become a State/chat authority.

## Current Data Flow

```text
State + committed chat
-> buildKnowledgeRecords()
-> full records[] + replace=true
-> JSON exact upsert
-> Qdrant embed every record
-> Qdrant upsert every point
```

The JSON exact backend needs the complete snapshot to remove absent records.
The current Qdrant backend receives that same input and unnecessarily treats
every record as requiring a new vector.

## Target Data Flow

```text
State + committed chat
-> full canonical Knowledge V2 snapshot
-> JSON exact full reconciliation
-> current turn continues through its existing Calendar/Social completion path
-> server-side Qdrant repair coordinator:
     current Qdrant manifest
     -> classify current snapshot
     -> embed + upsert bounded batches
     -> persist batch/checkpoint diagnostics
     -> delete stale points
```

The snapshot is always complete. Only the Qdrant embedding work is
incremental and asynchronous after JSON exact succeeds.

## Revision 2 Scheduling Contract

`syncKnowledgeBase()` remains the turn-owned JSON exact operation. The
existing `/knowledge/sync` server boundary must acknowledge JSON exact success
without awaiting preferred Qdrant reconciliation.

The endpoint hands the same immutable snapshot to a server-side repair
coordinator. The coordinator is keyed by user files root plus timeline ID and
coalesces newer snapshots over older queued snapshots. It owns only derived
Qdrant work:

```text
JSON exact succeeds
-> enqueue current snapshot
-> persist queued checkpoint
-> Qdrant manifest read
-> deterministic upsert/delete batches
-> persist completed batch count or precise failed request
-> retry after the bounded 5s, 15s, 60s cadence
-> on Node startup, reload unfinished jobs from current JSON exact record files
   and re-enqueue only the latest snapshot
```

Qdrant collection health is one transport attempt. It must not consume
internal HTTP retries before the repair coordinator records the failure and
owns the 5s/15s/60s background cadence.

Qdrant uses a dedicated non-keepalive HTTP transport. Each request opens a
fresh socket so a peer-closed idle connection cannot abort an otherwise valid
point batch before Qdrant receives it.

The current `state_settled` ordering remains unchanged apart from no longer
awaiting Qdrant work. Calendar, Social, Post, translation, and chat-save
ordering are not moved by this change.

## Identity and Reconciliation Contract

| Concept | Meaning | Rule |
| --- | --- | --- |
| `recordId` | Stable Knowledge record identity | Determines point ID and first half of equality. |
| `contentChecksum` | Deterministic semantic record content identity | Determines second half of equality; excludes `stateRevision`. |
| JSON exact index | Deterministic full snapshot baseline | Receives and reconciles every current record. |
| Qdrant manifest | Current collection's bounded point identity view | Contains at least point ID/record ID/checksum needed to classify vectors. |
| `stateRevision` | Candidate provenance and stale-write context | Does not by itself trigger a vector refresh. |

An unchanged vector is legal only when the manifest has the same stable
record ID and checksum. ACL, source references, effective clock, Scene, tags,
entities, and payload data are covered because they contribute to the existing
checksum.

## Backend Behavior

### JSON Exact

`JsonKnowledgeBackend.upsert()` continues to receive the complete snapshot
with `replace=true`. It continues to:

1. reject stale authoritative writes;
2. write current records;
3. delete records absent from the snapshot;
4. publish current projection fingerprint and removed IDs.

It must additionally expose the prior-to-write checksum comparison required
for diagnostics and focused tests. JSON exact is not the sole Qdrant delta
authority because a Qdrant failure can leave its collection behind JSON.

### Healthy Qdrant

The Qdrant backend reads a bounded collection manifest before mutation. It
classifies the full current snapshot against that manifest:

```text
same recordId + same checksum -> retain vector
missing recordId               -> embed and upsert
same recordId + new checksum   -> embed and replace point
manifest recordId absent now   -> delete point
```

It must perform deletion and upsert with the existing deterministic point ID.
It may use Qdrant payload-only pagination or equivalent deterministic point
lookup, but must not load vectors merely to compare checksums.

Repair embeddings and point upserts are bounded deterministic batches. A batch
is considered checkpointed only after its Qdrant point write succeeds; the
next repair re-reads the manifest and therefore never trusts an in-memory
cursor as vector truth.

### Full Rebuild

Qdrant receives the full snapshot for embedding only when:

- its collection is missing;
- its generation is incompatible with the configured embedding model or
  dimension;
- an explicit rebuild endpoint is invoked; or
- the manifest cannot be safely read or validated under the existing
  degradation policy.

The full rebuild remains a deterministic projection from State plus committed
chat and never writes authority data.

### Failure and Degradation

JSON exact must complete before Qdrant mutation. If Qdrant manifest read,
embedding, delete, or upsert fails:

1. persist a derived checkpoint with current snapshot fingerprint, collection
   generation, aggregate counts, and the precise request/operation failure;
2. preserve committed State/chat and JSON exact;
3. do not invoke a paid model, mutate authority data, or keep the completed
   turn active;
4. resume on the bounded background cadence, later exact-sync enqueue, or
   Node startup from the current Qdrant manifest, repairing only missing or
   stale points.

The checkpoint records only bounded IDs/counts/checksums and error metadata.
It must not contain record text, raw State, chat bodies, model output, Prompt
content, credentials, or any data that could become a second authority.
Its error string is a fixed safe category plus an HTTP status or whitelisted
transport code; it must never persist a raw exception message or response
detail.

The browser must not take its content-unchanged fast path while its last
Knowledge diagnostics are degraded. It sends the complete snapshot again until
a healthy manifest reconciliation clears that degraded result.

## API and Persistence Compatibility

- `knowledgeApiContractVersion=3` remains unchanged because the browser still
  sends the same full snapshot and the public response shape remains
  compatible.
- Bounded browser-visible status lives under
  `knowledgeBase.diagnostics.qdrantRepair`; durable server checkpoint data
  lives beside the JSON exact timeline index and remains derived-only.
- Knowledge health returns the latest sanitized repair checkpoint. When its
  status is `completed` for the same projection fingerprint, the browser
  clears its old degraded flag without another full JSON exact write.
- JSON index format and projector version remain unchanged.
- No State, chat, or collection migration is required.
- A legacy or incomplete Qdrant payload is treated as non-matching and is
  repaired by embedding only the affected records; a missing collection still
  follows full rebuild semantics.

## Ownership

| Responsibility | Owner |
| --- | --- |
| Canonical snapshot and checksum | Knowledge Projector V2 |
| Full JSON reconciliation and removed-record proof | JSON exact backend |
| Qdrant manifest, delta classification, vector reuse, point mutation | Qdrant backend |
| JSON exact handoff and repair enqueue | Knowledge vector service / Knowledge endpoint |
| Qdrant batch/checkpoint/request diagnostics | server-side Qdrant repair coordinator |
| Backend ordering and degraded diagnostics | Knowledge vector service |
| State/chat authority and candidate hydration | Existing Knowledge runtime, unchanged |
| Current-turn loading boundary and chat persistence | Existing turn/host save workflows, out of scope |

## Verification Design

Focused tests must prove:

1. unchanged records are not passed to the embedder;
2. a changed checksum is passed exactly once;
3. a missing manifest point is restored even when JSON already has the same
   record;
4. an absent snapshot record is deleted;
5. missing collection/full rebuild embeds all records;
6. Qdrant failure preserves JSON exact and no authority writes;
7. unchanged checksum with a new state revision remains vector-reused;
8. existing API/revision/ACL/hydration behavior remains intact.
9. a content-unchanged snapshot after a degraded Qdrant result reaches
   manifest reconciliation instead of being skipped locally.
10. JSON exact completes and the turn reaches `state_settled` before a
    deliberately blocked Qdrant batch completes.
11. successful Qdrant batches are not re-embedded after a later batch fails.
12. restart/reload resumes the latest snapshot from manifest state, while a
    stale queued snapshot cannot mutate the current repair status.
13. diagnostics identify the failed Qdrant operation and request path without
    recording secret or record text.

Real-service evidence must use the active save, restart Node, verify health,
perform a normal changed synchronization, capture total/current/embedded/reused
counts, and prove the archive bytes remain unchanged.
