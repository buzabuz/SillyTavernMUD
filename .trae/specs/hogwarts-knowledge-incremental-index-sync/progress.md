# Progress: Incremental Knowledge Index Sync

## Current Status

Revision 1 was approved on 2026-08-20. KIS-03 and KIS-05 remain in progress:
the implementation and focused verification are complete, while authenticated
active-save evidence is pending.

## 2026-08-20 - Runtime Investigation

- A real current-turn trace measured 143 Knowledge records, 69 Scene chunks,
  and about 428,838 embedding characters.
- JSON exact write completed in 739ms; Qdrant health and point write completed
  in 26ms and 227ms.
- ONNX WASM embedding entered with zero queue wait and spent 210,909ms in
  execution. A prior same-sized batch took 205,412ms.
- P0 translation ran concurrently but is not the primary Knowledge cause.
- The trace also shows approximately 91 seconds after Knowledge endpoint
  completion before `syncLocalKnowledge()` returns; this is separately bounded
  to the client response/save path and is out of scope for Revision 1.

The raw timing probe was removed after these bounded measurements were copied
here. This progress entry is supporting evidence only, not product authority.

## 2026-08-20 - Product and Historical Review

- PM confirms the product-safe boundary: keep complete authoritative snapshots
  for deletion/rebuild reconciliation, but reuse vectors only when stable ID
  and deterministic checksum match.
- Historical review confirms the legacy Vectra route used changed records while
  the healthy Qdrant route received the complete snapshot and re-embedded it.
- The existing `replace=true` contract is retained for JSON exact and is not
  reclassified as a defect.
- A manifest comparison is required rather than JSON-only delta calculation:
  a prior Qdrant write can fail after JSON succeeds, and a later healthy sync
  must restore missing points without a world change.

## Open Decisions

None. The user instructed progression through governance after PM PASS.

## 2026-08-20 - Approved Implementation Boundary

- The replacement PM completed the required production-informed recheck with
  PASS.
- Manifest reconciliation is the approved delta authority; JSON-only changed
  records cannot repair a Qdrant failure that occurred after JSON exact
  succeeded.
- The browser's content-unchanged fast path must retry synchronization while
  its prior Qdrant diagnostics remain degraded.

## 2026-08-20 - Implementation and Focused Verification

- Added Qdrant payload-manifest reconciliation using stable `recordId` plus
  `contentChecksum`; unchanged vectors are reused, missing/changed vectors are
  embedded, and absent points are deleted.
- JSON exact retains full `replace=true` snapshot reconciliation. A preferred
  backend failure remains degraded to JSON exact; the browser retries a full
  manifest reconciliation after that degraded result instead of skipping an
  unchanged projection.
- Added `tests/hogwarts-mud-knowledge-incremental-sync.test.mjs` with four
  cases: unchanged reuse, service delegation, changed replacement, missing
  point repair, deletion, and missing-collection rebuild.
- Focused new test: `4/4` passed.
- Existing Knowledge V2 and Task22 Qdrant suites: `23/23` passed.
- Full Hogwarts Node suite: `807/813` passed; six existing failures are
  outside this scope (Cast registry, Prompt budget, Medium locked event,
  lifecycle, and two `turn.js` size assertions).
- Restarted Node at `http://127.0.0.1:8000/`. Unauthenticated CLI health was
  correctly rejected for missing CSRF; Qdrant `healthz` passed.
- Real Qdrant smoke used an isolated temporary collection: full rebuild wrote
  two points, the next full snapshot reconciliation returned
  `embedded=0,reused=2`, and the temporary collection was deleted.

## 2026-08-20 - Active-Save Verification

- A user-initiated normal turn synchronized the active 143-record projection
  through the restarted Node service.
- Persisted diagnostics report `backend=qdrant`, `degraded=false`,
  `embeddedRecordCount=29`, `reusedRecordCount=114`,
  `deletedRecordCount=0`, and no errors. This proves the changed turn did not
  re-embed the complete snapshot.
- The current Qdrant collection reports 143 points at the configured
  768-dimensional cosine vector shape.
- Sync diagnostics recorded revision 210; the active world later reached
  revision 212 through ordinary post-sync persistence. The checksum contract
  intentionally excludes that save-only revision change.
- The active archive's current SHA-256 is
  `e4005bff4a6d58934a0e666945c75a5b6fade4df5274264b30706d035882cea1`.
  Its change is the expected user normal-turn transaction, not an index or
  migration rewrite.

## 2026-08-20 - First Independent Acceptance Failure and Repair

- The first fresh acceptance found that a collection's existence was treated
  as compatibility: a dimension-2 collection under an expected dimension-3
  backend would attempt incremental upsert and degrade instead of rebuilding.
- `health()` now validates the collection vector size. A missing or incompatible
  collection takes the existing full rebuild path; normal healthy collections
  continue manifest reconciliation.
- Added an incompatible-collection focused regression. The focused,
  Knowledge V2, and Task22 suites now pass `28/28`.
- A real temporary Qdrant collection was intentionally created at dimension 2;
  reconcile rebuilt it at dimension 3 with `rebuilt=true,embedded=1`, then
  deleted the temporary collection.
- Node was restarted after the repair. A second fresh independent acceptance
  is required by L2 governance.

## 2026-08-20 - Second Independent Acceptance Failure and Repair

- The replacement acceptance found that normal reconciliation operations still
  inherited generic Qdrant HTTP retries. Revision 1 requires manifest read,
  point upsert, and point deletion failures to degrade after one attempt so a
  later healthy full-snapshot reconciliation owns recovery.
- Manifest scroll, point upsert, point delete, full-rebuild delete, and
  collection creation now explicitly disable automatic retries. Existing query
  and health behavior remains unchanged.
- Added a focused three-operation failure test. It proves each of manifest,
  point write, and point delete fails after exactly one request.
- Focused, Knowledge V2, and Task22 suites pass `29/29`.
- Node was restarted. A real dimension-2 temporary collection again rebuilt
  successfully to the expected dimension-3 collection with
  `rebuilt=true,embedded=1`, then was deleted.
- A third fresh independent acceptance is required by L2 governance.

## 2026-08-20 - Final Independent Acceptance

- A fresh acceptance agent executed the exact same-collection incompatibility
  probe: it created a temporary dimension-2 collection, observed
  `indexIncompatible=true`, reconciled through `rebuilt=true,embedded=1`, then
  observed `afterOk=true` and deleted the collection.
- The agent independently accepted the active-save diagnostics:
  143 total records, 29 embedded, 114 reused, zero deleted, and non-degraded
  Qdrant.
- The agent ran the focused incremental, Knowledge V2, and Task22 suites:
  `29/29` passed.
- Final independent acceptance verdict: PASS.

## Next Step

Record the user decision on core-change technical-debt re-inventory, update
HTD-001 and the Change Ledger, then close KIS-05.
