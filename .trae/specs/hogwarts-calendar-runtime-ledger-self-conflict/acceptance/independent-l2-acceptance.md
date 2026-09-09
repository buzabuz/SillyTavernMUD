# Independent L2 Acceptance

## Execution Contract

- Agent context: fresh, read-only, with no implementation conversation fork.
- Product goal: Calendar must commit after only its scheduler runtime ledger
  advanced State; genuine world edits must remain strict conflicts.
- Prohibited operations: Provider request, browser Calendar action, real-save
  mutation, and workspace edits.

## Result

PASS for the approved runtime behavior.

| PRD criterion | Result | Evidence |
| --- | --- | --- |
| Scheduler-backed `341 -> 346` commit | PASS | Focused test runs Medium and Low task routes, four runtime saves, then one final Calendar save. |
| Contiguous exclusive runtime history | PASS | Production predicate and focused history assertions require exact source/domain entries. |
| Preserve ledger and atomic opening message | PASS | Focused workflow asserts both task outcomes, one final message, and final Scene. |
| Zero paid call/retry/fallback | PASS | Acceptance uses deterministic in-process task transport only. |
| World and mixed revisions remain conflicts | PASS | Focused world-revision regression plus independent probe reject without final Calendar/chat write. |
| Missing, non-contiguous, cross-timeline history | PASS | Focused direct guard regression rejects each case. |
| Correct incident conclusion | PASS | [`progress.md`](../progress.md) records runtime-ledger self-conflict and states cache was not causal. |

## Commands

- `node --test tests/hogwarts-mud-calendar-runtime-ledger.test.mjs`
- `node --test tests/hogwarts-mud-calendar-moment.test.mjs`
- `node --test tests/hogwarts-mud-save-revision-integration.test.mjs`
- `node --test tests/hogwarts-mud-save-revision-guard.test.mjs`
- `node --test tests/hogwarts-mud-model-adapter.test.mjs`
- `npx eslint public/scripts/extensions/hogwarts-mud/runtime/guarded-save-ports.js tests/hogwarts-mud-calendar-runtime-ledger.test.mjs`
- `git diff --check`

All acceptance commands passed. No Provider request, browser Calendar action,
or real-save mutation was made.

## Residual Risk

`calendar-moment.js` currently posts debug telemetry to a local
`127.0.0.1:7777` endpoint. It is outside this persistence fix and is tracked
as `HTD-017`; acceptance disabled that telemetry to keep the provider-free
test boundary free of unrelated network side effects.
