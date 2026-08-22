# Progress

## 2026-08-22 - Business Discovery

- User clarified that selecting the large Low Post model must replace the
  complete old semantic chain, not only the first `1.7B` Post call.
- PM classified the change as L2. Its replacement matrix covers Pre, Scene,
  selected Post, Item route, Check/Identity route, Dynamic 4B, guards,
  reducers, normal/no-change/failure workflows, and Local comparison behavior.
- User confirmed the Item boundary: a holder-carried/equipped Item remains
  absent unless the current player action or paid narration directly identifies
  it. An independently room-material Item remains eligible.
- Production review found that `scene.itemStates[]` cannot implement this
  rule: its current projector follows player carried/equipped Items into the
  current room.
- Replacement PM re-review passed after receiving that production fact. No
  business decision remains open.

## 2026-08-22 - Governance and Artifacts

- Added the Provider Replacement Chain Gate after the earlier partial Low
  provider-switch incident.
- Added the Model Field-Route Registry Gate because field source/selector and
  downstream routes previously had to be reconstructed from code.
- Created this independent L2 change rather than rewriting the historical
  Revision 25 provider-selection PRD. Revision 25 remains evidence of the
  narrower old contract; it is not authority for this replacement.
- Created the five required L2 artifacts.
- User approved implementation with `ok 开始执行`.

## 2026-08-22 - Implementation Started

- Status changed to `implementation in progress`.
- `LPR-03` is active. The provider-neutral selector and its focused fixture
  matrix are being completed before the Low contract is extended.

## 2026-08-22 - LPR-03 Complete

- Added `selectPostItemContext()` as the provider-neutral formal-Item selector.
- Its four focused cases pass: independent room Item inclusion, unmentioned
  player/NPC held Item exclusion, directive/direct-label admission, duplicate
  label exclusion, and `scene.itemStates[]` holder-follow regression.
- `LPR-04` is active: Low-specific Item/Identity contract and settlement.

## 2026-08-22 - LPR-04 and LPR-05 Complete

- Low now receives the selected `itemCandidates` plus bounded direct-injury
  route IDs and returns strict `inventoryUpdates[]` and
  `identityObservations[]`.
- The Node transport composes its Low Zod schema from the existing Dynamic
  Item and Identity proposal descriptor shapes. The existing guards normalize
  or omit invalid candidates before they reach transaction carriers.
- Low now returns direct proposal carriers and never invokes
  `requestDynamicTurnObservation()`. Local retains its core Post plus at most
  one shared Dynamic request, using the same selected Item context.
- Focused regression: 23 tests passed across Item selection, provider
  selection, Dynamic Turn, and Dynamic Inventory. The Low retry, direct
  Item/Identity, failure, and Local routed-call traces are covered.
- `LPR-06` is active: finalize runtime-contract ownership and affected test
  coverage before prompt measurement and broad regression.

## 2026-08-22 - LPR-06 Complete

- Updated the State contract, model field-route registry, VCON JSON/Markdown
  rows, and active PRD registry to describe the Low complete chain and the
  Local-only Dynamic route.
- Added route references in the selector, Prompt assembly, Low transport,
  server settlement, endpoint, adapter, and Dynamic Identity contract.
- Added a Low guard regression proving invalid Item/Identity candidates leave
  zero transaction carriers. `LPR-07` is active.

## 2026-08-22 - Active-Save Measurement

- Added and ran the model-free active-save Post measurement. It made zero
  model calls and preserved the 4,467,895-byte source archive unchanged
  (`0252e93509c030866965c8ac975af548800ab7846ade76873cf48cd3b26d255f`).
- Low complete Post passes without compaction at 19,950 / 298,080 characters.
- Local is a genuine no-fit at 15,007 / 12,288 characters after all approved
  compaction. Its protected System, Schema, action, and paid narration alone
  cannot fit the configured local capacity. No unapproved truncation,
  capacity change, fallback, or retry was applied.
- Evidence: [active-save measurement](./measurement/active-save-post-provider-measurement.md).

## 2026-08-22 - Independent Acceptance

- Fresh read-only L2 acceptance failed only on the unresolved Local active-save
  capacity boundary and the consequential absence of blind/real-workflow
  evidence. It passed the Low chain, Local routing, guard/reducer, selector,
  failure, and contract checks.
- Evidence: [independent review](./acceptance/independent-l2-review.md).
- Existing debug POST hooks from the separate save-latency investigation remain
  intentionally untouched and prevent debug-free closeout.
- `LPR-07` is blocked until the user decides the Local capacity or protected
  payload policy. No protected content was truncated and no provider fallback
  was introduced.

## 2026-08-22 - Local Capacity Decision

- User approved raising Local Post capacity to at least the measured
  requirement and using the model's real capacity as the boundary.
- Ollama `/api/show` reports `qwen3:1.7b` with `qwen3.context_length=40960`.
- The configured operating allocation is `8,192` tokens with the existing
  `1,024` response reserve. It exceeds the active-save requirement without
  reserving the model's full context.
- `LPR-07` resumed. Browser preflight, Node Post request, and `config.yaml`
  must be aligned before remeasurement.

## 2026-08-22 - Local Capacity Alignment Verified

- Aligned browser preflight, Node Post request, and `config.yaml` to the
  approved `8,192` Local context.
- Node Post now obtains its `num_ctx` override from the active local-semantic
  settings rather than a fixed request constant.
- The active-save measurement now passes without compaction: Local
  `16,789 / 28,672`, Low `19,950 / 298,080`.
- Reran 63 focused regressions and targeted ESLint successfully. The active
  archive checksum remains
  `0252e93509c030866965c8ac975af548800ab7846ade76873cf48cd3b26d255f`.
- Restarted the live server on `127.0.0.1:8004`; it loaded `config.yaml` and
  the Local semantic health endpoint reports both `qwen3:1.7b` and `qwen3:4b`
  available.

## Current Phase

`implementation in progress`

## Evidence

- [Product requirements](./prd.md)
- [Technical design](./spec.md)
- [Tasks](./tasks.md)
- [Checklist](./checklist.md)
- [Current model field routes](../hogwarts-runtime-contracts/model-field-routes.md)
