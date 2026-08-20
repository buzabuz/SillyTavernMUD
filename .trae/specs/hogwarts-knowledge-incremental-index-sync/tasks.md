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

## KIS-05 - Real service verification and governance closeout

Status: in_progress

- Restart the Node server and verify current Knowledge API contract through a
  real health request.
- Run an active-save normal changed sync and record manifest/embedding counts.
- Verify archive immutability, JSON fallback, Qdrant ACL/hydration regression,
  lint, syntax, focused tests, and affected regressions.
- Update runtime contract, checklist, progress, technical-debt ledger, and
  product registry at implementation completion.
