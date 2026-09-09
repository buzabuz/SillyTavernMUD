# Thinking-Neutral Requests And Foreground Progress PRD

## 1. Change ID and Status

- Change ID: `hogwarts-thinking-neutral-progress`
- Status: completed
- Change kind: fix
- Feature delta: 0
- Core change: yes
- Scope level: explicit partial capability for Hogwarts role requests and
  foreground waiting UI; SillyTavern remains implementation scaffolding.

Related artifacts:

- [Technical spec](./spec.md)
- [Tasks](./tasks.md)
- [Checklist](./checklist.md)
- [Progress](./progress.md)
- [Runtime field contract](../hogwarts-runtime-contracts/state-fields.md)
- [Model field routes](../hogwarts-runtime-contracts/model-field-routes.md)

## 2. Problem and Evidence

The latest Low Post request used `glm-5.3`, fit its selected capacity
(`20,396 / 298,080` characters), and still failed twice. The shared backend
recognized a named Hogwarts JSON Schema and forcibly added:

```text
thinking.type=disabled
enable_thinking=false
reasoning_effort=none
```

The provider returned HTTP 400 because this model always reasons and rejects
disabled thinking. Scene Performance had already succeeded, so the existing
safety contract correctly preserved the Scene as `post_unsettled`.

The model adapter also accumulates `response.reasoning` and may use it as a
fallback JSON source. That creates a second, forbidden response authority:
hidden reasoning could reach the parser when final content is empty.

Foreground model tasks expose inconsistent waiting feedback. Scene Performance
has a live card, while Post, Opening, Transition, Interior generation,
character polish and map expansion use separate or incomplete busy states.

## 3. Before

| User workflow | Visible result | Request and State result |
| --- | --- | --- |
| Forced-thinking model handles a named Hogwarts Schema | Provider rejects the forced-disabled request. | One failed call; no model output reaches Schema. |
| Provider returns reasoning and final content | Adapter retains both and can fall back to reasoning. | Reasoning may become parser input when content is empty. |
| Long foreground task | Progress varies by workflow and usually has no elapsed time. | Existing task runs; no common ephemeral activity view. |
| Low Post fails after Scene | Scene is preserved with explicit retry/discard. | No Post-derived State commits. |

## 4. After

| User workflow | Visible result | Request and State result |
| --- | --- | --- |
| Forced-thinking GLM-5 handles a named Hogwarts OpenAI/Custom request | The extra Hogwarts forced-disable override is absent. | Exactly one request; existing provider/Profile behavior otherwise remains unchanged. |
| Provider returns reasoning and final content | UI shows only finite activity metadata; final content alone is parsed. | Reasoning is discarded and writes nothing. |
| Foreground blocking task waits | Owning surface shows current finite phase and elapsed wait. | Ephemeral UI session only; no persistence or network call. |
| Foreground task completes/fails/cancels | Activity clears or becomes the existing failure/recovery surface. | Existing domain settlement remains unchanged. |
| Low Post fails after Scene | Same `post_unsettled` card, retry and discard. | No Post-derived State commits. |

## 5. In Scope

- Remove the Hogwarts-specific GLM-5 forced-disabled thinking trio from
  OpenAI and Custom named-Schema request shaping.
- Leave every other provider and Profile request behavior unchanged.
- Make final response `content` the only model text accepted by Hogwarts
  parsers; discard reasoning from the Hogwarts business path.
- Show finite task identity/phase and elapsed wait for every active
  `blocking=true` Hogwarts role task.
- Reuse each workflow's existing owning surface; no global modal or raw
  reasoning panel.
- Cover character polish, bootstrap world/opening, Pacing, Scene Performance,
  selected Low Post and explicit Post retry, Scene Transition/Opening,
  Interior generation, Calendar/Timeline Moment foreground execution and
  explicit Map expansion.

## 6. Non-Goals

- No Profile thinking setting or migration.
- No generic SillyTavern behavior change outside Hogwarts-classified requests.
- No raw reasoning display, gameplay storage, translation, browser history,
  chat, Knowledge or archive content.
- No Prompt, named Schema, parser shape, guard or Reducer semantic change.
- No model/provider replacement, capability probe, automatic retry, repair,
  provider fallback or Local fallback.
- No foreground takeover for background Calendar, Social or Event tasks.

## 7. Runtime Contract Impact

Gameplay State impact: None.

New ephemeral UI-session projection:

```text
session.foregroundModelActivity = {
  taskId,
  phase,
  startedAt
} | null
```

It is owned by the active `blocking=true` role-task lifecycle, cleared on
success/failure/cancel/navigation, and never persisted. It cannot contain
Prompt text, response text, reasoning text, secrets or domain proposals.

Model response authority changes:

- `response.content`: sole parser input.
- `response.reasoning` and `chunk.state.reasoning`: discarded at the Hogwarts
  adapter boundary and forbidden from every downstream writer.

## 8. Migration and Compatibility

No save migration and no Profile migration.

Existing saves, Profiles and `modelSlots` remain unchanged. Existing pending
Post records remain valid. Generic Tavern requests keep their current behavior.

## 9. Prompt Field Budget

No Prompt field changes. System, User and named Schema bytes remain unchanged.
The provider-visible request removes only Hogwarts-injected thinking controls.

Normal and worst call counts remain exactly as before:

| Workflow | Calls before | Calls after | Execution |
| --- | ---: | ---: | --- |
| One role task invocation | 1 | 1 | Existing selected provider |
| Bootstrap | 2 | 2 | World then Scene opening |
| Scene Transition | 2; 3 with required Interior | unchanged | Existing serial flow |
| Player turn | Existing Pre/Pacing/Scene/Post/localization routes | unchanged | Existing concurrency and FIFO |
| Explicit Post retry | 1 | 1 | Post only |
| Post discard | 0 | 0 | Deterministic |

Provider-default reasoning may increase provider latency and billed reasoning
tokens. No extra model becomes resident and no extra request is added.

## 10. Frontend Field Whitelist

Allowed:

- `session.foregroundModelActivity.taskId`
- `session.foregroundModelActivity.phase`
- `session.foregroundModelActivity.startedAt`

All visible labels resolve through finite static locale keys. Raw reasoning,
Prompt text, response text and internal errors remain forbidden.

## 11. Acceptance Criteria

1. Named Hogwarts GLM-5 OpenAI/Custom requests no longer inject the extra
   forced-disabled thinking trio.
2. Generic non-Hogwarts Tavern requests retain existing request shaping.
3. `glm-5.3` can reach provider execution without the observed disabled-
   thinking HTTP 400.
4. Reasoning-only output cannot satisfy any Hogwarts structured task.
5. Final content follows the unchanged Schema, parser, guard and Reducer path.
6. Every invoked task makes at most one provider request; no retry, repair or
   fallback is added.
7. Every `blocking=true` role task exposes its real finite phase and elapsed
   wait on its owning foreground surface.
8. Background `blocking=false` tasks do not create foreground activity.
9. Activity clears on success, failure, cancellation and navigation and does
   not restore after reload.
10. Raw reasoning is absent from DOM/accessibility text, State, chat,
    TranslationTable, Knowledge, archives and browser storage.
11. Post failure preserves the Scene and existing `post_unsettled` recovery.
12. Real rendered desktop/mobile acceptance and blind structured-output
    simulation pass.

## 12. Risks and Rollback

- Provider-default reasoning can cost more tokens or latency. This is explicit
  user-approved behavior and remains one request.
- A provider may place valid JSON only in reasoning. The task must fail rather
  than promote reasoning into authority.
- Foreground timers can become stale if lifecycle cleanup misses an exception
  path. Acceptance covers success, failure, cancel and reload.

Rollback restores the former request shaping and response extraction plus
removes the ephemeral activity projection. It does not touch saves or Profiles.

## 13. Approval

The fixed PM classified the combined change L2. After production review and a
replacement PM re-run, both business and production-informed verdicts are
PASS. The user approved removal of the GLM-5 forced-disable override,
final-content-only authority, activity-only foreground progress and no generic
Tavern compatibility work on 2026-09-08, then explicitly approved artifact
revision 1 for implementation.
