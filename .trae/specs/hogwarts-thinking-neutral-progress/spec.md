# Thinking-Neutral Requests And Foreground Progress Spec

## Scope

This L2 change affects only requests classified as active Hogwarts role tasks.
Generic SillyTavern requests retain their existing request shaping.

## Request Data Flow

```text
Hogwarts role workflow
-> modelEventScheduler validates task/tier/capacity
-> createModelAdapter clones selected Connection Profile
-> ConnectionManagerRequestService
-> chat-completions backend
-> existing provider/Profile behavior without the Hogwarts GLM-5 override
-> final response content
-> task parser / named Schema / guards / Reducer
```

For named `hogwarts_mud_*` Schemas, the backend must not inject:

```text
thinking.type=disabled
enable_thinking=false
reasoning_effort=none
```

No replacement thinking parameter is injected. Other provider/Profile request
behavior remains unchanged.

## Response Authority

Model routes:

- `role_response.finalContent`: the only response text accepted by Hogwarts
  parsers.
- `role_response.reasoning`: transport-only data discarded at the Hogwarts
  adapter boundary.

`extractRoleResponseText()` must never parse, concatenate or return reasoning.
A response with empty content and JSON-looking reasoning fails exactly once.

## Foreground Activity

The model task catalog already classifies every task with `blocking`.
`modelEventScheduler` is the task-lifecycle authority.

Add one ephemeral UI-session projection:

```js
session.foregroundModelActivity = {
    taskId: 'scene_performance',
    phase: 'requesting',
    startedAt: 0,
} // or null
```

Rules:

1. `onAttempt` sets activity only for active `blocking=true` role tasks.
2. `onSuccess` clears the matching activity after the owning workflow advances
   to validation/commit UI.
3. `onFailure` clears it before the existing error/recovery UI renders.
4. Navigation, cancellation and application reset clear it.
5. `blocking=false` tasks never write it.
6. The record contains no Prompt, content, reasoning, error detail or State
   proposal.

Elapsed time is calculated in the renderer from `startedAt` using a local
one-second refresh while activity exists. A compact activity strip lives in
the existing top bar and moves into the current Hogwarts dialog header while
that dialog is the foreground surface. It is not a modal, card, or persisted
notification.

## Visible Ownership

| Foreground workflow | Existing owning surface | Target activity |
| --- | --- | --- |
| Character polish | Setup plus shared foreground strip | task label + elapsed wait |
| Opening world / Scene opening | Setup/opening plus shared foreground strip | current task + elapsed wait |
| Pacing / Scene Performance / Low Post | Story generation card plus shared foreground strip | current task + elapsed wait |
| Scene Transition / transition opening | Transition dialog header | current task + elapsed wait |
| Calendar/Timeline Moment foreground transition/opening | Calendar dialog header | current task + elapsed wait |
| Interior generation | Map/interior plus shared foreground strip | current task + elapsed wait |
| Explicit Map expansion | Map expansion plus shared foreground strip | current task + elapsed wait |

Background Calendar, Social and Event tasks remain silent.

All task names, phases, elapsed labels and failure messages use finite static
locale keys. Raw backend/provider errors remain console-only.

## Ownership

| Concern | Owner | Result |
| --- | --- | --- |
| Task blocking classification | `domain/model-task-registry.js` | Existing `blocking` authority |
| Task lifecycle | `runtime/model-event-scheduler.js` | Attempt/success/failure activity events |
| Ephemeral activity | UI session/application ports | No persistent writer |
| Thinking neutrality | `src/endpoints/backends/chat-completions.js` | No Hogwarts-specific override |
| Final-content authority | `adapters/model.js` | Content only |
| Schema/semantic validation | Existing task parser/guards | Unchanged |
| State writes | Existing domain Reducers | Unchanged |
| Post failure recovery | Pending Post workflow | Unchanged |

## Runtime And Documentation Contracts

- Add `role_response.finalContent` and `role_response.reasoning` to
  `model-field-routes.md`.
- Record `session.foregroundModelActivity` as ephemeral/no-State in
  `state-fields.md`.
- Add/update the role-response validation responsibility row in both permanent
  validation registries.
- Add a frontend registry row for finite foreground model activity.
- Update operations documentation for GLM-5 thinking compatibility and
  final-content-only parsing.

## Verification Design

### Deterministic

- GLM-5 named Hogwarts OpenAI/Custom requests no longer receive the extra
  forced-disabled trio.
- Generic non-Hogwarts requests preserve existing behavior.
- Reasoning-only responses fail; content JSON succeeds.
- No workflow gains a second call.
- Scheduler emits activity only for `blocking=true` role tasks.
- Activity is cleared on success and failure.
- No raw reasoning appears in serialized State/chat/UI projections.

### Browser

- Desktop and mobile foreground task surfaces show localized task activity and
  elapsed time without overlap.
- Post request is visibly active after Scene text appears.
- Background tasks do not replace the current foreground surface.
- Reload/cancel/error leaves no stale activity.
- Post failure still shows the existing retry/discard card.

### Blind / Provider

- Capture the real final provider-visible request for one forced-thinking
  structured task and prove no disabled-thinking override.
- One fresh model response passes through the real content-only parser, named
  Schema, guards and no-retry policy.
- A reasoning-only fixture/model response proves no authority promotion.

## Rollback

Restore the two Hogwarts-specific request overrides and the prior adapter
fallback, then remove the ephemeral activity projection and locale entries.
No save or Profile rollback is required.
