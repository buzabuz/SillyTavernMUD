# Role-Slot Capacity Eligibility PRD

## Change ID and Status

- Change ID: `hogwarts-role-slot-capacity-eligibility`
- Status: L2 approved; implementation in progress
- Change kind: fix
- Feature delta: 0
- Core change: yes

## Problem and Evidence

The model-event scheduler currently applies two hard total-Prompt gates to
role-model requests:

1. the selected role slot's runtime capacity; and
2. a static task policy character maximum.

The lower value wins. In the active Calendar Moment, a Medium Scene Transition
Prompt measured 102,997 characters. It fits the selected Medium slot's runtime
capacity (120,000 context tokens and a 12,000-token response reserve), but
was rejected before any provider request by the static 95,000-character
`scene_transition` policy.

The user has decided that selected `low`, `medium`, and `high` role-slot
capacity is the sole hard total-Prompt eligibility boundary. Static task
character values must not reject a role request that fits the selected slot.

## Before

| Workflow | Player-visible result | Call and State result |
| --- | --- | --- |
| Calendar Moment builds a 102,997-character Medium Scene Transition request | Generic failure; the Scene cannot open. | Zero provider calls, no Scene/clock/Calendar write. |
| Any active role request exceeds its static task maximum but fits its selected role slot | The requested workflow can fail before the model is contacted. | Zero provider calls; existing no-write failure result. |
| A request exceeds the selected slot's actual runtime capacity | Request is rejected. | Zero provider calls and existing no-write failure result. |

## After

| Workflow | Player-visible result | Call and State result |
| --- | --- | --- |
| Calendar Moment builds a 102,997-character Medium Scene Transition request that fits the selected slot | The transition runs normally. | One existing Medium provider call; existing validation decides whether any State commits. |
| An active role request exceeds a former static task maximum but fits its selected role slot | The existing workflow runs normally. | One existing provider call; no new call, retry, fallback, or writer. |
| A request exceeds the selected slot's actual runtime capacity | Request is rejected with the existing failure behavior. | Zero provider calls and no business State write. |

## Operational Effect

| Case | Before calls | After calls | Provider / residency | User-visible latency and cost |
| --- | ---: | ---: | --- | --- |
| Request below static and role capacity | 1 | 1 | Existing selected role provider only | Unchanged |
| Request above static but within role capacity | 0 | 1 | Existing selected role provider only | One already-configured provider call now occurs |
| Request above role capacity | 0 | 0 | No provider is contacted | Unchanged no-dispatch failure |
| Parse/Schema/authority failure after dispatch | 1 | 1 | Existing selected role provider only | Existing failure result; no repair or fallback |

No workflow gains concurrency, a second request, provider replacement, model
residency, or a Local-model load.

## In Scope

- Every active role request dispatched through `modelEventScheduler` with
  `tier` `low`, `medium`, or `high`.
- The shared scheduler's total-Prompt eligibility decision, including System
  messages, User payload, transport JSON Schema, and runtime wrappers.
- `modelEventScheduler.runRoleTask()` as the only role-Prompt eligibility
  authority; no workflow, allocator, or adapter receives a parallel
  role-capacity gate.
- Role-slot capacity from
  `modelSlots.<low|medium|high>.contextSize/maxResponseLength` through
  `createContextBudgetPlan(...).maxPromptCharacters`.
- Role task diagnostics that record actual complete-request size and the
  selected runtime capacity without recording Prompt text or secrets.
- A read-only inventory of static task policies; their section priority may
  remain metadata but their character maximum cannot reject a role request.
- The following active role tasks: `character_polish`, `opening_world`,
  `calendar_high`, `calendar_medium`, `interior_cartographer`,
  `pacing_director`, `scene_performance`, `scene_transition`,
  `scene_opening`, `social_director`, `map_expansion`, and the Low branch of
  `post_turn_semantic_proposal`.

## Scope Matrix

| Entity / field | Classification | Authority and target result |
| --- | --- | --- |
| `modelSlots.<tier>.contextSize/maxResponseLength` | in scope | User-selected role capacity is the hard total-Prompt boundary. |
| `modelSlots.<tier>.profileId/presetName/regexPresetId/responseHeadroomVersion` | unchanged | Existing profile and migration ownership remains. |
| `PromptBudgetPolicy.maximumCharacters` for role tasks | in scope | Nonblocking metadata only; never lowers role eligibility. |
| `PromptBudgetPolicy.sectionPriority` | unchanged | May describe future compaction order; cannot reject or silently compact this change's request. |
| System/User/Schema/runtime-wrapper measurements | in scope | Measured together against the selected role capacity. |
| `turnDiagnostics` bounded metrics | in scope | May record capacity and measurement, never Prompt or model text. |
| Task trigger/tier/quota/call count | unchanged | Existing one-call serial behavior remains. |
| Domain State and Reducers | unchanged | Existing writers alone decide successful commit. |
| Local model capacities and Local-only task policies | non-goal | Retain their current dedicated contracts. |
| Chinese raw-message input handling | non-goal | Separate Prompt-integrity change. |

## Non-Goals

- No Local-only task behavior, `num_ctx`, or Local Dynamic budget change.
- No Prompt-content, retrieval, Schema, parser, reducer, provider, retry,
  fallback, cache, residency, save, or migration change.
- No automatic compaction below the selected role capacity.
- No fix for Chinese raw-message reinjection; that is a separate confirmed
  Prompt-integrity defect.
- No change to field-level admission bounds that are not total-Prompt
  eligibility gates.

## Runtime Contract Impact

`modelSlots.<low|medium|high>.contextSize/maxResponseLength` becomes the
sole hard total-Prompt eligibility authority for the matching role request.
`modelTaskRuntime` remains the bounded task-attempt ledger. Existing
`turnDiagnostics` records the complete request measurement and selected runtime
ceiling, never Prompt or response content. Business State writers remain
unchanged.

## Migration and Compatibility

No State migration or compatibility reader is needed. Existing saved
`modelSlots` already contain the authoritative capacity configuration. Existing
static policy values become nonblocking metadata for role requests; Local-only
paths retain their current contracts.

## Prompt Field Budget

Baseline production evidence for the affected Calendar Moment:

| Task | Complete request | Former hard gate | Selected runtime ceiling | Outcome |
| --- | ---: | ---: | ---: | --- |
| `scene_transition` / Medium | 102,997 chars | 95,000 chars | 298,080 chars | Incorrectly rejected before provider call |

No Prompt field is added or removed in this change. Future Prompt additions or
removals must measure the complete provider-visible request against the
selected role slot at build time. Static historical values may inform a soft
optimization target only; they cannot reject a request that fits the selected
runtime capacity.

## Frontend Field Whitelist

None. Existing workflow-specific errors and status renderers remain unchanged.

## Acceptance Criteria

1. Every active role request that exceeds its old static task maximum but fits
   the selected role runtime capacity reaches exactly one existing provider
   call.
2. A role request over the selected runtime capacity makes zero provider calls
   and preserves existing no-write failure behavior.
3. The complete request measurement includes System, User, transport Schema,
   and runtime wrapper characters.
4. The active Calendar Moment's 102,997-character Medium Scene Transition is
   eligible under its selected 298,080-character runtime ceiling.
5. Local-only task eligibility is unchanged, including HTD-016's existing
   deferred status.
6. No affected workflow gains a retry, fallback, model switch, extra call, or
   new business State writer.
7. A real-save build-only measurement and a real affected workflow prove the
   selected role capacity is the decisive hard boundary.

## Risks and Rollback

Requests that formerly failed before dispatch may now incur the one provider
call that the selected role configuration permits. This can increase latency
and provider cost for those requests, but does not add calls beyond the
existing one-call workflow. If a request exceeds true configured capacity, it
continues to fail before dispatch. Rollback restores the prior scheduler
eligibility rule without changing persisted State.

## Approval

Fixed PM re-discovery classified this as L2 on 2026-08-22. The user explicitly
requested role-model eligibility to follow configured token capacity and
rejected static total-Prompt rejection gates. The user's instruction to begin
when PM found no issue approves this unchanged specification.
