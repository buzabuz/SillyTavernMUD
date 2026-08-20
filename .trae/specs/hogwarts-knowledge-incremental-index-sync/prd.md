# Hogwarts Incremental Knowledge Index Sync

## Change ID and Status

- Change ID: `hogwarts-knowledge-incremental-index-sync`
- Status: Revision 1 approved; implementation in progress
- Complexity: L2
- Change kind: fix
- Feature delta: 0
- Core change: yes
- PM discovery: PASS on 2026-08-20

## Problem and Evidence

Normal committed turns construct the full authoritative Knowledge V2 projection
and currently pass all records to a healthy Qdrant backend. The backend
re-embeds every supplied record before upsert.

The measured active timeline contains 143 records, including 69 Scene chunks
and about 428,838 characters. One normal synchronization spent 210,909ms in
embedding; JSON exact writing took 739ms and Qdrant point writing took 227ms.
The same-sized prior batch took 205,412ms. This is the open HTD-001 Knowledge
latency debt.

The full projection remains necessary for deletion reconciliation, recovery,
and rebuild. The defect is treating a full authoritative snapshot as a command
to regenerate every unchanged vector.

## Before

| Runtime event | Current visible and operational result | Authority result |
| --- | --- | --- |
| One Event or Scene record changes | The current turn waits while every current Knowledge record is re-embedded. | State and the committed message are already authoritative; Qdrant is only an index. |
| A record is deleted | `replace=true` removes the record from JSON and Qdrant receives a broad replacement input. | Deleted records must not remain candidates. |
| Qdrant write fails after JSON succeeds | JSON remains usable, but the next sync has no explicit Qdrant content reconciliation. | State/chat remain committed; Qdrant may be incomplete. |
| Collection is absent or generation changes | Full rebuild is required. | All vectors must be recreated from State plus committed chat. |

The current player-visible `committing` phase also includes post-sync full-chat
persistence. That separate persistence latency is not changed by this PRD.

## After

| Runtime event | Target operational result | Authority result |
| --- | --- | ---|
| One Event or Scene record changes | Build the complete authoritative snapshot, compare it with the current Qdrant manifest, and embed only records that are missing or whose `contentChecksum` changed. | State/chat remain the only authority. |
| A record is deleted | Delete every Qdrant point present in the manifest but absent from the current snapshot. | Deleted records cannot be returned as candidates. |
| Qdrant write fails after JSON succeeds | Continue with healthy JSON exact retrieval. A later healthy sync compares its manifest again and repairs only missing or changed points. | No State/chat rollback, rewrite, or model retry. |
| Collection is absent, incompatible, or explicitly rebuilt | Embed the complete current snapshot once. | Full rebuild remains deterministic and authoritative-source-only. |

The user no longer pays an all-record embedding cost for unchanged Knowledge
records. This PRD does not promise a total `committing` duration because the
separate local translation and full-chat persistence waits remain out of scope.

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

## Non-Goals

- Moving Knowledge synchronization out of the current turn's `committing`
  chain.
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
| `knowledgeBase` | Knowledge adapter/projector | No new State field. Existing bounded diagnostics may report delta/rebuild counts. |
| Qdrant payload | Qdrant backend | Existing stable point ID plus payload checksum form the backend manifest. |

No State or message migration is required. The living Knowledge runtime contract
must be updated in the implementation task to state manifest-based incremental
Qdrant reconciliation and its rebuild boundary.

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

No dual-read, dual-write, or fallback State field is introduced.

## Prompt Field Budget

None. This change does not alter any Prompt, output Schema, model request, or
Prompt projection.

## Frontend Field Whitelist

None. This change does not add or alter frontend dynamic values. Existing
turn-progress text remains outside this scope.

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

## Risks and Rollback

- A false manifest match could preserve a stale vector. Mitigation: compare
  both stable ID and deterministic checksum, not ID or revision alone.
- A partial Qdrant failure could leave missing points. Mitigation: compare the
  next full snapshot with the backend manifest; JSON exact remains available.
- A collection generation change could be mistaken for a normal delta.
  Mitigation: collection absence/incompatibility always triggers full rebuild.

Rollback is a code rollback only. No State/chat migration is applied. Existing
indexes may be rebuilt from current State plus committed chat if rollback or
recovery requires it.

## Approval

The user approved Revision 1 on 2026-08-20 after PM double-check.
