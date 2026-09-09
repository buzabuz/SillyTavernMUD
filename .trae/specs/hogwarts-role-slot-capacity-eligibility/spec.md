# Role-Slot Capacity Eligibility Spec

## Scope

This change replaces the shared scheduler's role-request double gate with one
hard eligibility boundary: the selected role slot's runtime capacity.

```text
role task + selected low/medium/high slot
  -> complete request measurement
  -> createContextBudgetPlan(slot.contextSize, slot.maxResponseLength)
  -> runtime maxPromptCharacters
  -> one provider request, or one no-dispatch capacity failure
```

The full measurement includes System messages, User payload, transport JSON
Schema, and runtime wrappers.

## Current Failure

`createTaskPromptBudget()` computes:

```text
effectiveMaximumCharacters =
  min(static task maximum, runtime maximum)
```

`modelEventScheduler` rejects when the complete request exceeds that value.
The product composition root enables this behavior for all role requests.

## Target Design

1. `runRoleTask()` determines its effective tier before computing prompt
   eligibility.
2. `modelEventScheduler.runRoleTask()` is the sole role-Prompt eligibility
   authority. For `low`, `medium`, and `high`, it compares the complete
   request only with the selected slot's runtime capacity, then forwards that
   exact measured request through the adapter's scheduler-bound invoker.
3. Static task `maximumCharacters` and `sectionPriority` remain readable
   policy metadata. The scheduler never reads their effective value as a role
   eligibility gate.
4. `runLocalTask()` and every Local-only direct prompt contract retain their
   existing capacity behavior.
5. Existing turn diagnostics retain only task ID, tier, complete measurement,
   selected capacity, trigger, and outcome. They never retain Prompt text,
   model output, or secrets.

## Ownership

| Concern | Current owner | Target owner |
| --- | --- | --- |
| Slot capacity source | `modelSlots` + `createContextBudgetPlan` | Unchanged |
| Complete request measurement | `measurePromptMessages` | Unchanged, used for role eligibility |
| Role eligibility | static policy plus scheduler runtime check | Scheduler runtime capacity only |
| Adapter role transport | `adapters/model.js` | Adapter exposes only a scheduler-bound invoker; it receives the already-approved Prompt unchanged and performs no role capacity or trimming decision |
| Static policy metadata | `prompt-budget-allocator.js` | Retained as nonblocking policy metadata |
| Local eligibility | Local task contracts and `runLocalTask` | Unchanged |
| Business commit | Existing validators and Reducers | Unchanged |

## Field Route

| Route ID | Source | Audience | Rule | Failure |
| --- | --- | --- | --- | --- |
| `role_capacity.input.slot` | `modelSlots.<tier>.contextSize/maxResponseLength` | Selected role request | Derive the complete-request hard maximum with `createContextBudgetPlan`. | No provider request when complete request exceeds this maximum. |
| `role_capacity.measurement.completeRequest` | System/User/Schema/runtime-wrapper measurement | Scheduler and bounded diagnostics | Compare only with the selected role runtime maximum. | No business State write, no retry, no fallback. |

The living `model-field-routes.md`, `state-fields.md`, and validation
responsibility entries will be updated in the implementation task before the
production code changes.

## Verification Design

- Scheduler contract: active role tasks exceed their former static maximum but
  fit their selected runtime capacity, so each invokes exactly once.
- Scheduler failure: a request over selected runtime capacity invokes zero
  times and writes no task attempt or business State.
- Local regression: Local-only capacity semantics are unchanged.
- Real-save build-only: capture complete measurement, selected capacity, and
  section sizes for the current Calendar Moment without provider dispatch.
- Runtime: execute one safe affected Calendar Moment; confirm exactly one
  Medium request if the selected capacity fits.
- Independent L2 acceptance: evaluate every PRD criterion from the user goal,
  with a fresh read-only agent.
