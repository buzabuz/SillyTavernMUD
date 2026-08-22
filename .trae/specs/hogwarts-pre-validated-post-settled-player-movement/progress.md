# Progress

## 2026-08-21 - Discovery and Specification

- Fixed PM classified the work as L2 and named the partial capability
  `pre-validated, post-settled player movement`.
- User confirmed failure semantics: preserve paid narration, create an
  uncommitted state, and permit only manual Post-only retry against saved text.
- Production mapping confirmed:
  - Pre currently commits direct and follow movement before paid narration.
  - Low Scene currently receives a protected committed movement result.
  - Post has no player movement candidate.
  - Post failure falls back conservatively and can still commit.
  - `spatial-reconciliation` can replay a move on reload/retry.
  - current retry/reload paths can rerun the paid Scene.
- Prompt baseline was recorded in [prompt-baseline.md](./prompt-baseline.md).
  The existing follow-only Pre path is already over the configured 4,096-token
  limit; the approved design removes that model branch rather than adding to
  it.
- No production code, test, real save, migration, or runtime contract was
  changed in this phase.

## Current Phase

`implementation and deterministic verification`

Implemented:

- deterministic `MovementPreflightV2` for explicit markers;
- Post `playerMovement` descriptor plus evidence/preflight guard;
- Movement Reducer position/time/history settlement;
- saved `movement_unsettled` envelope and manual Post-only retry;
- composer lock, static localized recovery card, and reload replay retirement;
- retired Pre movement-intent contract and destination substring validator.

Focused verification passed:

```text
node --test tests/hogwarts-mud-post-settled-player-movement.test.mjs
node --test tests/hogwarts-mud-post-provider-selection.test.mjs
node --test tests/hogwarts-mud-turn-recovery.test.mjs
node --test tests/hogwarts-mud-turn-validation.test.mjs
node --test tests/hogwarts-mud-spatial-reconciliation.test.mjs
node --test tests/hogwarts-mud-task5-workflows.test.mjs
node --test tests/hogwarts-mud-turn-protocol.test.mjs
node --test tests/hogwarts-mud-task8-call-budget.test.mjs
node --test tests/hogwarts-mud-local-semantic-recall.test.mjs
node --test tests/hogwarts-mud-current-turn-post-translation-parallel.test.mjs
```

All listed tests passed. Lint and JavaScript syntax checks passed for changed
production and focused test files.

Browser acceptance is blocked in this workspace: `127.0.0.1:8000` currently
serves a rollback probe page rather than the SillyTavern UI, and the discovered
port `3000` is unreachable from the browser. No gameplay action was submitted
to either endpoint.

The first independent acceptance Agent was stopped after repeated non-response
without producing a result. A fresh replacement acceptance Agent is running;
no independent acceptance result is claimed yet.

Independent acceptance later found and prompted fixes for stale pending
revision acceptance, retired no-move fact persistence, public replay resolver,
and opening-prose location repair. The remaining acceptance finding is the
workflow-inactive but still exported `settleFollowMovementIntent` legacy helper and
its three historical direct-writer tests. It must be deleted with those test
migrations before the sole-writer criterion can pass.

That final legacy cutover is now complete:

- deleted `settleFollowMovementIntent` and its model-intent/evidence helpers;
- deleted all three direct-writer follow tests;
- removed the stale ports from workflow and call-budget harnesses;
- confirmed no `settleFollowMovementIntent` or `resolvePlayerMovement` symbol
  remains in production or tests;
- reran 49 focused movement/workflow/call-budget tests successfully, with lint,
  syntax, and diff checks passing.

## Open Decisions

None. PM initial discovery and production-informed recheck both returned PASS.

## Evidence

- [Product requirements](./prd.md)
- [Technical design](./spec.md)
- [Prompt baseline](./prompt-baseline.md)
- [Task plan](./tasks.md)
- [Acceptance checklist](./checklist.md)
- [Prompt measurement](./prompt-measurement.md)
