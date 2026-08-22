# Progress

## 2026-08-22 - Discovery

- Runtime reproduction measured a selected Low Post request at `16,803`
  characters and recorded a pre-call RangeError from the legacy `10,500`
  product budget.
- PM established that System plus Schema are already `11,397` characters;
  dynamic payload trimming alone cannot satisfy the old cap.
- User decided every selected Post failure blocks new player input. Paid
  narration remains visible; retry is Post-only and discard is explicit.
- The governance Skill now requires provider-aware complete-request
  measurement and structured capacity degradation.

## 2026-08-22 - Implementation Approval

- User approved the current capacity and universal settlement-safety contract.
- The governance Skill and durable prompt-assembly companion now require
  provider-visible measurement, deterministic structured compaction, protected
  sections, and explicit no-fit settlement safety.
- Initial implementation added canonical Post assembly, typed
  `postSettlementFailure`, and the generic pending-settlement domain helper.
  Workflow, recovery, UI, migration, and verification are still in progress.

## 2026-08-22 - Implementation

- Added `post-turn-prompt-assembly.js`: one canonical Post payload, complete
  message plus transport-schema measurement, provider-specific capacity,
  deterministic atomic compaction, bounded diagnostics, and no-fit result.
- Low now uses the selected Low role capacity. The old `10,500` policy remains
  diagnostic metadata only and cannot reject a fitting selected-Low request.
  `preservePrompt` prevents the model adapter from applying a second
  string-truncation pass after structured Post assembly.
- Local now uses a separate Ollama contract: `num_ctx=4096` and
  `num_predict=1024`; it does not inherit Low capacity.
- Added `PendingPostSettlementV1`, universal `post_unsettled`, Post-only
  retry, zero-model discard, composer lock, migration from legacy
  movement-only pending records, and reload protection against automatic
  model calls.
- Registered the provider-aware assembly rules in the governance Skill,
  durable prompt companion, VCON-013, runtime fields, frontend field registry,
  PRD and product registry.

## Verification To Date

- `node --test tests/hogwarts-mud-turn-validation.test.mjs tests/hogwarts-mud-post-settlement-safety.test.mjs tests/hogwarts-mud-post-provider-selection.test.mjs tests/hogwarts-mud-post-settled-player-movement.test.mjs tests/hogwarts-mud-turn-recovery.test.mjs`
  and the direct turn-workflow regression suite passed: `66/66`.
- Targeted ESLint for every changed production JavaScript file passed.
- `node --check` and `git diff --check` passed.
- Full repository lint remains blocked by 8 existing errors outside this
  change, including `event-boundary-reducer.js`, `item-schema.js`,
  `spell-proposals.js`, `time-environment.js`, and
  `background-event-boundary.js`.

## Remaining Acceptance

- Build and record a real active-save Low and Local provider-visible prompt
  measurement.
- Exercise the rendered `post_unsettled` card, composer lock, Retry Post and
  Discard turn against a non-destructive acceptance save.
- Run the required fresh-context blind model simulation and independent
  acceptance review.

## Independent Source Review

- Fresh-context source review passed after correcting wrapper measurement,
  post-guard failure capture, retained Actor/room filtering, composer/scene
  transition lock, and legacy discard-only migration.
- The review remains runtime-blocked because the current `8004` process predates
  the worktree changes. Evidence:
  [independent source review](./acceptance/independent-source-review.md).

## Current Phase

`implementation in progress`

## 2026-08-22 - Runtime Retry Repair

- A real `post_unsettled` turn had pending revision 294, then received an
  empty metadata revision and a lifecycle migration. The Retry Post guard
  incorrectly rejected that safe sequence and the renderer hid the error.
- The guard now accepts that exact safe sequence only; substantive world or
  Item revisions remain blocking. The retry UI now surfaces a rejection.
- After reload, the saved Retry Post call passed perception and temporal
  guards and committed the original Scene once: turn 108 moved to 109 and
  status changed from `post_unsettled` to `idle`.

## Evidence

- [Product requirements](./prd.md)
- [Technical design](./spec.md)
- [Tasks](./tasks.md)
- [Checklist](./checklist.md)
