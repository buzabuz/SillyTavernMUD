# Calendar Runtime-Ledger Self-Conflict Technical Spec

## Scope and Authority

This change implements the existing save-revision contract at the Calendar
transaction boundary. It does not redefine State ownership:

| Concern | Owner | Required behavior |
| --- | --- | --- |
| Model task attempt/outcome | `modelEventScheduler` | Mutates and persists `modelTaskRuntime` before and after each world-ledger task. |
| Revision allocation/history | guarded save commit | Advances `stateRevision` and appends the source/domain history entry. |
| Calendar Scene transaction | `createCalendarMomentWorkflow()` | Builds the Scene, Clock, Calendar, archive, and opening-message candidate from its captured State. |
| Stale-save decision | `guardedSaveTransaction()` | Rejects every changed live world State unless the only intervening revisions are proven runtime-ledger metadata. |

## Production Data Flow

```text
Calendar captures State revision 341
  -> Medium scene_transition scheduler task
  -> runtime attempt save 342
  -> runtime success save 343
  -> Low scene_opening scheduler task
  -> runtime attempt save 344
  -> runtime success save 345
  -> Calendar derives final Scene candidate from captured 341
  -> guardedSaveTransaction observes live 345
  -> prove revisions 342..345 are contiguous runtime-only
  -> rebase transaction onto live 345
  -> commit Calendar world State and opening message at 346
```

The guarded transaction may rebase only when all of these conditions hold:

1. captured and live `timelineEpoch` are equal;
2. every revision after the captured revision through the live revision exists;
3. every entry has contiguous `baseRevision` and `revision` values;
4. every entry has exactly
   `source=model_task_runtime` and
   `changedDomains=["model_task_runtime"]`;
5. the final candidate copies the live revision fields and
   `modelTaskRuntime` before the existing guard commits it.

Any false condition preserves the existing `SaveRevisionConflictError`.

## Verification Design

The focused provider-free acceptance must construct:

1. a live host context at revision `341`;
2. real `createGuardedSavePorts()` and real `getContext().saveMetadata()`;
3. real `createModelEventScheduler()` with deterministic response transport;
4. `scene_transition` and `scene_opening` request functions created by that
   scheduler;
5. real `createCalendarMomentWorkflow()` calling those scheduler-backed
   functions.

The acceptance must assert:

- four runtime metadata commits before the Calendar transaction;
- final revision `346`;
- both scheduler task outcomes survive;
- exactly one final opening message;
- zero Provider transport calls outside the deterministic local transport;
- no retry or fallback;
- strict rejection with no Calendar write when an intervening non-runtime
  revision is injected.

The direct guarded-save regression remains supplemental. It proves predicate
behavior but cannot substitute for the full Calendar/scheduler/host-save path.

## Files and Boundaries

| Path | Role |
| --- | --- |
| `public/scripts/extensions/hogwarts-mud/runtime/guarded-save-ports.js` | Narrow runtime-only rebase at final transaction boundary. |
| `public/scripts/extensions/hogwarts-mud/domain/save-revision.js` | Existing contiguous metadata-only predicate; no broadened field semantics. |
| `public/scripts/extensions/hogwarts-mud/workflows/calendar-moment.js` | Existing caller; no workflow or model-call policy change. |
| `public/scripts/extensions/hogwarts-mud/runtime/model-event-scheduler.js` | Existing runtime ledger writer; exercised by acceptance, not redesigned. |
| `tests/hogwarts-mud-calendar-runtime-ledger.test.mjs` | New focused provider-free workflow regression, separate from the oversized Calendar Moment suite. |

## No Migration or Prompt Change

This change has no State migration, compatibility reader, Prompt projection,
model response change, or frontend dynamic field. No model-field-route or
validation-responsibility row changes because model inputs, outputs, validators,
and State writer ownership remain unchanged.
