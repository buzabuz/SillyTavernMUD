# Hogwarts Incremental Knowledge Index Sync

## Change ID and Status

- Change ID: `hogwarts-knowledge-incremental-index-sync`
- Status: Revision 2 approved; implementation in progress
- Complexity: L2
- Change kind: fix
- Feature delta: 0
- Core change: yes
- PM discovery: PASS on 2026-08-20

## Problem and Evidence

The active save proves that a Qdrant repair is currently on the player-turn
critical path. The measured turn took 308,832ms: Scene Performer used 49.4s,
selected Post used 24.8s, and 207s elapsed inside Knowledge synchronization
after State/message commit. Chat persistence took 0.2-3.1s per save.

The current JSON exact index has 147 records. The configured Qdrant
collection has 143 points, including 100 mismatched content checksums.
Qdrant reconciliation attempted the expensive repair, then recorded
`fetch failed` and left the stale manifest behind. The next turn would repeat
the same repair.

The full projection remains necessary for JSON exact reconciliation,
deletion detection, recovery, and rebuild. Qdrant is a non-authoritative
derived index and must not keep an otherwise settled player turn locked.

## Before

| Runtime event | Current visible and operational result | Authority result |
| --- | --- | --- |
| One Event or Scene record changes | The current turn waits for JSON exact and Qdrant embedding/reconciliation. | State and the committed message are already authoritative; Qdrant is only an index. |
| A record is deleted | `replace=true` removes the record from JSON and Qdrant receives a broad replacement input. | Deleted records must not remain candidates. |
| Qdrant write fails after JSON succeeds | JSON remains usable, but the current turn waits and the next sync can repeat the same expensive repair. | State/chat remain committed; Qdrant may be incomplete. |
| Collection is absent or generation changes | Full rebuild is required. | All vectors must be recreated from State plus committed chat. |

The current player-visible `committing` phase also includes post-sync full-chat
persistence. That separate persistence latency is not changed by this PRD.

## After

| Runtime event | Target operational result | Authority result |
| --- | --- | ---|
| One Event or Scene record changes | The current turn completes JSON exact work. A server-side Qdrant repair continues from the current manifest after the turn. | State/chat remain the only authority. |
| A record is deleted | Delete every Qdrant point present in the manifest but absent from the current snapshot. | Deleted records cannot be returned as candidates. |
| Qdrant write fails after JSON succeeds | Continue with healthy JSON exact retrieval and persist a bounded failed-request/checkpoint record. A later repair resumes from points successfully written before the failure. | No State/chat rollback, rewrite, or model retry. |
| Collection is absent, incompatible, or explicitly rebuilt | Embed the complete current snapshot once. | Full rebuild remains deterministic and authoritative-source-only. |

The user no longer waits for Qdrant embedding or repair after JSON exact has
completed. Existing Calendar, Social, Post, translation, and chat persistence
settlement ordering remain unchanged.

## In Scope

1. Preserve complete Knowledge V2 snapshot construction for JSON exact writes,
   Qdrant reconciliation, deletion detection, and full rebuild.
2. Reconcile healthy Qdrant points by stable `recordId` and
   `contentChecksum`.
3. Reuse a point's existing vector only when both identifiers match.
4. Embed and upsert only missing or content-changed records.
5. Delete points absent from the current authoritative snapshot.
6. Preserve full rebuild for missing/incompatible collection generation and
   explicit rebuild paths.
7. Preserve JSON-first degradation, canonical hydration, timeline/ACL/clock
   filtering, API contract 3, and stale-write rejection.
8. Add focused tests and real-service evidence for normal delta, deletion,
   recovery after an interrupted Qdrant write, and full rebuild.
9. Move only Qdrant repair out of the current-turn completion path. JSON exact
   Knowledge construction and write remain part of the existing turn path.
10. Persist bounded, non-authoritative Qdrant repair progress and the exact
    failed request metadata; resume from the Qdrant manifest after a process,
    reload, or transport interruption.

## Non-Goals

- Moving JSON exact Knowledge synchronization, Calendar, Social, Post,
  translation, or chat persistence out of their current settlement ordering.
- Changing `saveMetadata()` or full-chat persistence behavior.
- Changing translation scheduling, Ollama residency, ONNX/WASM threading, or
  embedding model configuration.
- Changing State, chat transaction, Prompt, Reducer, ACL, retrieval ranking,
  or canonical hydration semantics.
- Adding a paid model call, retry, fallback model, or background semantic
  inference.

## Runtime Contract Impact

Reviewed fields:

| Field or projection | Current owner | Impact |
| --- | --- | --- |
| Knowledge V2 `records[]` | Knowledge Projector V2 | No schema change; full snapshot remains the reconciliation authority. |
| `contentChecksum` | Knowledge Projector V2 | Existing semantic-content identity becomes the Qdrant vector reuse key. It continues to exclude save-only `stateRevision`. |
| `knowledgeBase.diagnostics.qdrantRepair` | Knowledge adapter/projector | Bounded non-authoritative repair status and latest failed Qdrant request summary; never carries record text, world facts, or Prompt data. |
| Qdrant payload | Qdrant backend | Existing stable point ID plus payload checksum form the backend manifest. |
| Qdrant repair checkpoint | Server-side Knowledge runtime | Per-timeline derived checkpoint; records snapshot fingerprint, generation, batch progress, and latest failed request only. It is rebuilt from JSON exact plus the Qdrant manifest and cannot write State/chat. |

No authoritative State or message migration is required. The living Knowledge
runtime contract must state the post-JSON-exact Qdrant repair boundary, its
checkpoint, and failure semantics.

## Migration and Compatibility

There is no authoritative-data migration. Existing JSON exact files, Qdrant
collections, State, and chat remain valid.

On the first sync after deployment:

- a point with matching `recordId` and `contentChecksum` is retained without
  re-embedding;
- a missing checksum, mismatched checksum, missing point, or incompatible
  collection is treated as requiring an embedding;
- a point not represented by the current snapshot is deleted;
- missing collection/generation or explicit rebuild embeds the entire current
  snapshot.
- each successful Qdrant batch becomes durable through the collection manifest;
  a later repair recomputes the current manifest and only embeds still-missing
  or changed records.

No dual-read, dual-write, or fallback authority State field is introduced.

## Prompt Field Budget

None. This change does not alter any paid model Prompt, output Schema, or
Prompt projection. It may invoke the existing local embedding runtime only
after the turn's JSON exact completion boundary.

## Frontend Field Whitelist

None. This change does not add a player-facing repair control or dynamic UI
value. Existing turn-progress text remains outside this scope.

## Acceptance Criteria

1. A healthy Qdrant sync receives the complete authoritative snapshot for
   reconciliation but calls the embedder only for missing or checksum-changed
   records.
2. A record whose `stateRevision` changes without a checksum change is not
   re-embedded; candidate eligibility and final canonical hydration remain
   unchanged.
3. A changed `text`, visibility, source reference, clock, Scene, tag, entity,
   or record data checksum results in exactly one replacement vector.
4. A record absent from the current snapshot is deleted from JSON and Qdrant.
5. A Qdrant point missing after a prior degraded write is detected by manifest
   reconciliation and restored on the next healthy sync.
6. Missing collection, changed generation, and explicit rebuild embed the full
   snapshot.
7. Qdrant failure after JSON exact success leaves State/chat unchanged and
   keeps JSON exact retrieval available.
8. API contract 3, stable point IDs, `recordRevision <= currentRevision`
   candidate eligibility, ACL/clock/source/supersession hydration, and stale
   write rejection remain covered by existing and focused tests.
9. A running Node service and a real active-save sync demonstrate that
   unchanged records are not re-embedded in an ordinary changed turn.
10. Verification helpers and temporary Qdrant smoke collections do not write
    the active archive. A player-initiated normal-turn acceptance may append
    its expected chat/State transaction, but no migration or index operation
    may rewrite unrelated archive data.
11. A completed turn reaches its existing `state_settled` boundary without
    waiting for Qdrant embedding, point writes, or repair retry.
12. A Qdrant request failure records bounded method/path/operation/error
    diagnostics and resumes from the post-failure manifest on the next
    background attempt without player action.
13. A stale queued snapshot cannot overwrite, delay, or alter newer
    State/message/JSON exact results.

## Risks and Rollback

- A false manifest match could preserve a stale vector. Mitigation: compare
  both stable ID and deterministic checksum, not ID or revision alone.
- A partial Qdrant failure could leave missing points. Mitigation: compare the
  next full snapshot with the backend manifest; JSON exact remains available.
- A collection generation change could be mistaken for a normal delta.
  Mitigation: collection absence/incompatibility always triggers full rebuild.
- A server restart can interrupt background repair. Mitigation: Qdrant manifest
  points are the durable batch checkpoint; startup rebuilds only unfinished
  derived jobs from the current JSON exact record files and immediately
  re-enqueues the newest snapshot without a player action.

Rollback is a code rollback only. No State/chat migration is applied. Existing
indexes may be rebuilt from current State plus committed chat if rollback or
recovery requires it.

## Approval

The user approved Revision 1 on 2026-08-20 after PM double-check.
