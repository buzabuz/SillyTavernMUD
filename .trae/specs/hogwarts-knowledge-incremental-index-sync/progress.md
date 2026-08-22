# Progress: Incremental Knowledge Index Sync

## Current Status

Revision 2 is approved and implementation is in progress. It reopens the
previously completed incremental-sync change because real active-save evidence
proved a failed Qdrant reconciliation can still block a completed player turn.

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

Implement JSON-exact handoff, resumable Qdrant repair, and bounded
request-failure diagnostics. Then verify a real active-save turn completes
without waiting for Qdrant repair.

## 2026-08-22 - Revision 2 Real-Save Reopen

- A user-initiated normal turn took 308,832ms. Scene Performer used 49.4s,
  selected Post used 24.8s, and approximately 207s elapsed in Knowledge sync
  after State/message commit. Chat persistence calls measured 0.2-3.1s.
- JSON exact had 147 records. The active Qdrant manifest had 143 points and
  100 mismatched checksums; reconciliation eventually reported `fetch failed`.
- This proves Revision 1 incremental reuse cannot prevent player-visible
  blocking when a stale repair is large or transport work fails.
- The user approved a narrow Revision 2: current-turn JSON exact stays
  synchronous; Qdrant repair continues automatically in the background from
  manifest truth, records bounded failed-request diagnostics, and never
  requires player action.
- Dynamic Inventory (`9544 > 9000`) and Appraisal confidence-schema errors
  were independently investigated and are explicitly outside this change.

## 2026-08-22 - Revision 2 Implementation and Runtime Evidence

- Replacement PM production-informed follow-up returned PASS: the scope is
  limited to post-JSON-exact Qdrant repair; State/chat and Post, Calendar,
  Social, translation, and chat-persistence ordering remain unchanged.
- `/knowledge/sync` against the active 147-record snapshot returned `200` in
  `743ms` with JSON exact complete and `qdrantRepair.status=queued`; the
  Qdrant batch then ran independently.
- A real active repair failure persisted `operation=point_upsert`,
  `method=PUT`, the collection point-write path, `status=null`, and a bounded
  network error. No record text, State/chat, Prompt, or credential was written
  to `qdrant-repair.json`.
- The coordinator now uses 5s/15s/60s retry delays, Qdrant manifest points as
  the durable batch checkpoint, latest-snapshot coalescing, and Node-start
  recovery from current JSON exact record files. A no-new-sync Node restart
  advanced the existing checkpoint from attempt 8 to attempt 9.
- Focused Knowledge/Qdrant coverage passed `31/31`, including queued return,
  stale active-batch supersession, restart recovery, null network status,
  checksum-batch reuse, single-attempt collection health, and safe diagnostic
  rejection. Syntax, lint, and diff checks passed.
- The active collection health and manifest scroll both succeed. An isolated
  scratch collection accepted a 768-dimensional point write through the same
  Node fetch protocol. The active batch records the precise transport failure
  `fetch failed [ECONNRESET] read ECONNRESET`; it no longer blocks the
  completed JSON exact operation.
- Browser normal-turn acceptance is deferred: the currently loaded user save
  is intentionally in `post_unsettled`, so no player action, retry, or discard
  was automated for this change.

## 2026-08-22 - Independent Acceptance Finding

- Fresh independent acceptance found that the failure counter was incremented
  before retry-delay lookup, skipping the required initial 5s delay. The
  scheduler now indexes `attempt - 1`, and the coordinator test asserts the
  first failed attempt schedules exactly 5,000ms.
- A new fresh acceptance recheck is required after this correction. Real
  normal-turn `state_settled` evidence remains deferred because the active
  browser timeline is `post_unsettled` and was not mutated.

## 2026-08-22 - Second Independent Acceptance Finding

- Fresh acceptance proved that raw `error.message` could persist arbitrary
  record text in the checkpoint. Diagnostics now store only a fixed safe
  category plus HTTP status or a whitelisted transport code; the focused test
  injects `RECORD_TEXT_SHOULD_NOT_PERSIST` and proves neither it nor the raw
  socket message reaches disk.
- A new fresh acceptance recheck is required after this confidentiality fix.

## 2026-08-22 - Third Independent Acceptance Finding

- Fresh acceptance found that diagnostic operation/method/path and transport
  code also needed whitelisting, collection health retried before reaching the
  coordinator, and browser degraded diagnostics lacked a completed-repair read
  path. All three are corrected: every diagnostic field is now validated,
  collection health is a single attempt, and health returns the sanitized
  current checkpoint for matching-fingerprint degraded clearance.
- A new fresh acceptance recheck is required after these corrections. Real
  normal-turn `state_settled` evidence remains deferred because the active
  browser timeline is `post_unsettled` and was not mutated.

## 2026-08-22 - Final Independent Acceptance

- A fresh independent acceptance found no remaining target-code failure.
  It passed hostile diagnostic-field rejection, one-attempt collection health,
  `5s/15s/60s` cadence, manifest continuation, stale supersession, restart
  recovery, checkpoint health reporting, browser degraded clearance, and the
  JSON-exact handoff. Its fresh affected suite passed `36/36`.
- Acceptance is blocked only on the approved real player workflow: the active
  browser save is `post_unsettled`, so the verifier did not trigger, retry, or
  discard a turn. The required observation remains a completed turn reaching
  `state_settled` while a Qdrant repair stays in the background.

## 2026-08-22 - Active Repair Transport Fix

- Real repair batches were structurally valid: 8 finite 768-dimensional
  vectors and 96,911-387,259 byte bodies. Equivalent payloads, active
  collection single-point writes, and Qdrant health/manifest requests all
  succeeded outside the running repair.
- The native fetch point-write socket reset before Qdrant accepted the
  request. Qdrant now uses a dedicated non-keepalive transport.
- The active repair then completed 13 batches with `embedded=99`,
  `reused=143`, `pending=0`, `lastFailure=null`. JSON exact and Qdrant both
  report 146 current records/points.
