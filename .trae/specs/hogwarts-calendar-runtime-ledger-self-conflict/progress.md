# Progress

## 2026-08-23 - Discovery and Production Trace

- Real Calendar Moment telemetry recorded:
  - initial State revision `341`;
  - successful Medium Scene Transition;
  - successful Low Scene Opening;
  - successful deterministic Scene transition;
  - final `SaveRevisionConflictError` with `code=stale_save`.
- State revision history showed the same Calendar operation persisted only
  scheduler `model_task_runtime` metadata through revisions `342` to `345`.
- Root cause: the final Calendar transaction compared its captured State
  snapshot at `341` directly against live State at `345`, treating its own
  runtime ledger as a cross-page world edit.
- Cache was investigated but is not causal for this failure.
- The prior Calendar harness used an isolated State and direct save guard. It
  did not exercise the scheduler, proxied host metadata save, live State
  replacement, or production guarded transaction.

## Evidence

- Sanitized runtime telemetry:
  `.dbg/trae-debug-log-calendar-scene-open-telemetry.ndjson`
  filtered by trace `calendar-1787464801539`.
- Runtime ownership:
  [`state-fields.md`](../hogwarts-runtime-contracts/state-fields.md).
- Calendar transaction:
  [`spec.md`](../hogwarts-runtime-contracts/spec.md).
- Current product intent:
  [`prd.md`](./prd.md).

## Current Status

- PM L2 discovery and production-informed follow-up: PASS.
- User approved the bounded fix and provider-free regression on 2026-08-23.
- The guarded transaction now rebases only across matching-epoch, contiguous,
  exclusive `model_task_runtime` history and carries forward the live runtime
  ledger before the final Calendar commit.
- Added `tests/hogwarts-mud-calendar-runtime-ledger.test.mjs`. It runs real
  Calendar workflow, scheduler, proxied host metadata saves, and guarded
  transaction with deterministic in-process responses.
- The focused acceptance proves `341 -> 342 -> 343 -> 344 -> 345 -> 346`,
  one final opening message, two task invocations, four ledger saves, no
  retry, no fallback, and no Provider request.
- Negative coverage proves strict rejection for intervening world,
  mixed-domain, missing-history, non-contiguous, and cross-timeline changes;
  rejected cases leave the final Calendar transaction State and chat unchanged.
- Final provider-free regression: `69 passed, 0 failed`.
- Lint, syntax checks, and `git diff --check`: passed.
- Fresh independent L2 acceptance: PASS. Evidence:
  [`independent-l2-acceptance.md`](./acceptance/independent-l2-acceptance.md).
- Incremental coverage percentage is unavailable: Node produced V8 JSON but
  the configured `utree` parser accepts XML only. This did not block the
  focused behavioral acceptance.
- `HTD-017` records the unrelated localhost debug-telemetry side effect found
  during independent acceptance.
- Implementation and acceptance are complete. Awaiting the required user
  decision on core-change technical-debt reinventory before formal closeout.
