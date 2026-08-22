# Tasks: Incremental Knowledge Index Sync

## KIS-01 - Establish the backend manifest contract

Status: completed

- Read current JSON and Qdrant backend behavior and direct tests.
- Define a bounded Qdrant payload manifest using stable record ID and checksum.
- Verify that no collection generation, API, State, or chat migration is
  required.
- Expected files: `src/hogwarts-mud/knowledge-qdrant-backend.js`,
  `src/hogwarts-mud/knowledge-vector-service.js`,
  focused Knowledge test owner.

## KIS-02 - Preserve JSON full reconciliation and add Qdrant delta mutation

Status: completed

- Keep complete snapshot and `replace=true` behavior for JSON exact.
- Classify Qdrant points as retain, upsert, or delete from the snapshot and
  manifest.
- Restrict embedding to upsert records; retain deterministic point IDs and
  current payload filtering.
- Expected files: JSON/Qdrant/vector-service backends.

## KIS-03 - Preserve failure, rebuild, and diagnostics semantics

Status: completed

- Keep full rebuild for missing/incompatible collection and explicit rebuild.
- Preserve JSON-first degradation after any Qdrant failure.
- Add bounded reconciliation diagnostics without new State fields.
- Expected files: Qdrant/vector-service backend and runtime contract.

## KIS-04 - Add focused regression coverage

Status: completed

- Add a domain-owned incremental Knowledge synchronization test file because
  the current broad Knowledge V2 test owner exceeds the size limit.
- Cover unchanged reuse, changed replacement, deletion, interrupted Qdrant
  write recovery, full rebuild, and unchanged revision.
- Run direct Knowledge V2 and affected Qdrant suites.

## KIS-05 - Revision 1 evidence and closeout

Status: completed

- Restart the Node server and verify current Knowledge API contract through a
  real health request.
- Run an active-save normal changed sync and record manifest/embedding counts.
- Verify archive immutability, JSON fallback, Qdrant ACL/hydration regression,
  lint, syntax, focused tests, and affected regressions.
- Update runtime contract, checklist, progress, technical-debt ledger, and
  product registry at implementation completion.

## KIS-06 - Release the completed turn after JSON exact

Status: completed

- Split server sync into synchronous JSON exact reconciliation and queued
  Qdrant repair.
- Keep the browser contract version and full canonical snapshot unchanged.
- Ensure `syncLocalKnowledge()` returns after JSON exact handoff rather than
  after Qdrant embedding.
- Expected files: Knowledge endpoint/service, Knowledge adapter, turn workflow
  regression owner.

## KIS-07 - Add resumable Qdrant repair checkpoints and failures

Status: completed

- Batch deterministic Qdrant reconciliation and use the Qdrant manifest as the
  durable completed-work proof.
- Store only bounded derived repair state and precise failed
  operation/method/path/status/error metadata.
- Coalesce stale queued snapshots and resume the latest snapshot after
  endpoint restart/reload.
- Expected files: Qdrant backend, repair coordinator, runtime contract,
  focused Knowledge tests.

## KIS-08 - Prove background repair and no-turn-blocking behavior

Status: in_progress

- Test JSON exact release while Qdrant is blocked, partial batch failure,
  resume, stale supersession, and no authority State/chat writes.
- Restart Node, verify the current API contract, and perform real active-save
  repair evidence.
- Update checklist, progress, runtime contract, product registry, and debt
  ledger after the Revision 2 acceptance result.
