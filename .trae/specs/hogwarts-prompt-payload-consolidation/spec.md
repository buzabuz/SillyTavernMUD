# Hogwarts Prompt Payload Consolidation Technical Spec

## Status and Authority

- Change ID: `hogwarts-prompt-payload-consolidation`
- Artifact revision: `4`
- Status: Revision 4 implemented; acceptance passed
- Product authority: [prd.md](./prd.md)
- Runtime authority: [state-fields.md](../hogwarts-runtime-contracts/state-fields.md)

## Production Map

### Role-model calls

| Task | Tier | Builder/call | Retry | Consumer |
| --- | --- | --- | --- | --- |
| Character polish | medium | `setup-controller.js::polishCharacterBackground()` | none | setup text only |
| Opening World | high | `opening.js::createOpeningDirectorPrompt()` | one repair | `applyOpeningWorldPackage()` |
| Director Foundation | high | `opening.js::createDirectorFoundationPrompt()` | one repair | `applyDirectorFoundation()` |
| Opening Scene Plan | medium | `opening.js::createOpeningScenePlanPrompt()` | none | opening segment planner |
| Opening Dialogue | low | `opening.js::generatePlannedDialogueLines()` | none | opening segment merger |
| High Calendar | high | `createHighCalendarDirectorPrompt()` | one repair | High Calendar reducer |
| Medium Calendar | medium | `createMediumCalendarDirectorPrompt()` | one repair | Medium Calendar reducer |
| Interior Map | medium | `createInteriorMapPrompt()` | one repair | interior-map reducer |
| Daily | medium | `createDailyDirectorPrompt()` | one repair | Daily state reducer |
| Pacing | medium | `createPacingDirectorPrompt()` | one repair | Pacing reducer |
| Scene Performance | low | `createScenePerformancePrompt()` | none; validation fails immediately | turn settlement graph |
| Scene Transition | medium/high | `createSceneTransitionPrompt()` | up to two repairs; Chronicle errors do not retry | transition reducer |
| Scene Opening | low | bootstrap or `generateSceneTransitionOpening()` | none; validation fails immediately | opening message |
| Social | medium | `createMemoryConsolidationPrompt()` | none | Social V3 graph/reducer |
| Map Expansion | high | `map-renderer.js::requestMapExpansion()` | none | map proposal reducer |

### Current trigger map

| Task | Current emitter/timing |
| --- | --- |
| Character Polish | setup button |
| Opening World | setup start/retry when `opening.package` is absent |
| Director Foundation | every turn preparation and playable-state preparation; guard runs only for incomplete playing State |
| Opening Scene Plan | directly inside Opening initialization after package commit |
| Opening Dialogue | directly inside Opening Scene Plan completion |
| High Calendar | directly after Opening/Foundation and high Scene Transition |
| Medium Calendar | directly after Opening/Foundation, every turn commit, every Scene Transition and Calendar/Timeline Moment |
| Interior Map | playable-state preparation and Scene Transition completion |
| Daily | every turn before performance, playable-state preparation and every clock-changing transition; date guard may skip |
| Pacing | every player turn before local adjudication/low performance |
| Scene Performance | every player turn |
| Scene Transition | explicit close, Calendar Moment or Timeline Moment |
| Scene Opening | directly after accepted Scene Transition package |
| Social | every turn after commit, playable-state preparation and transition catch-up; Event/cursor guard may skip |
| Map Expansion | explicit map UI action |

`model.js::sendRoleRequest()` applies the role ceiling, structured JSON response
option and Connection Profile generation preset. The preset changes generation
settings; it does not append Hogwarts Prompt content.

### Local generative calls

| Endpoint | Function | Model work |
| --- | --- | --- |
| `/local/adjudicate` | `adjudicateTurn()` | pre-turn duration/check |
| `/local/observe` | `observeTurn()` | post-turn material/event/identity/perception |
| `/local/observe` conditional | inventory branch | Item proposal extraction |
| `/local/appraise` | `proposeTurnAppraisals()` | subjective Appraisal proposals |
| `/local/translate` | `translateText()` | English to Simplified Chinese |

### Separate paths

- `app-controller.js::applySystemPrompt()` writes one native SillyTavern System
  injection. Role requests do not consume it.
- `/turn/settle`, `/social/resolve`, reducers, validators and migrations are
  deterministic.
- Knowledge exact search, Qdrant/Vectra retrieval and embedding are retrieval
  operations, not text-generation Prompts. Only bounded retrieved records may
  enter a role Prompt.

## Revision 2 Task Registry

One source-owned `MODEL_TASK_REGISTRY` contains the 16 active tasks. A separate
compile-time disposition table accounts for all 20 current tasks and proves the
four removals; retired tasks are not registered as disabled runtime entries.

Each registration contains:

```text
{
  taskId,
  family,
  kind,
  allowedTiers,
  triggerEvents,
  phase,
  blocking,
  idempotencyPolicy,
  quotaGroup,
  budgetPolicyId,
  promptBuilder,
  responseSchema,
  validator,
  reducer,
  retryPolicy,
  failurePolicy
}
```

Valid kinds are `director`, `performer`, `local_observer` and `utility`.
Registry initialization fails on duplicate task IDs, unknown trigger events,
missing budget policies or a model task without Schema/validator/reducer
ownership.

### Event scheduler

The deterministic scheduler is the only owner allowed to invoke active model
tasks. Workflows emit bounded domain events instead of calling another model
task:

```text
{
  eventId,
  eventType,
  phase,
  emittedBy,
  actionId,
  timelineEpoch,
  stateRevision,
  turn,
  sceneId
}
```

Initial event types:

- `setup.character_polish_requested`
- `world.bootstrap_requested`
- `world.bootstrap_committed`
- `turn.pre_generation`
- `turn.post_commit`
- `scene.close_requested`
- `scene.transition_committed`
- `memory.event_boundary_committed`
- `calendar.horizon_low`
- `calendar.player_commitment`
- `map.container_entered`
- `map.expansion_requested`

Due work remains derivable from committed State. No generic persisted event
queue is added. Re-emitting the same event is idempotent through task policy and
the task ledger.

### Call ledger and quota

`modelTaskRuntime.byTaskId` stores bounded counters and the last
trigger/emitter/action ID, revision, turn, Scene and eligibility boundary. It
stores no Prompt or response.

The scheduler enforces:

- at most one synchronous medium task across every event sharing one player
  `actionId`;
- no task-to-task direct model call;
- Pacing at most once per Scene;
- Social at most once per eligible boundary;
- no five-batch catch-up loop inside one user action;
- Calendar and Social maintenance may defer because their due condition remains
  in authoritative State.

Pacing and Social use separate Prompt/Schema/reducer contracts but the same
`medium_scene` quota ledger.

## Task Consolidation

### Opening World and Director Foundation

`applyOpeningWorldPackage()` already writes Actor Core/Runtime, Story Arc,
Conflict, map and `directorFoundation=ready`. Director Foundation is removed as
a model task and writer. Incomplete playing State fails validation explicitly;
it is not repaired by inventing a second foundation.

### Opening Scene Plan, Daily and Scene Transition

These are not merged into one Prompt:

- Opening Scene Plan and Opening Dialogue are removed. `world.bootstrap_committed`
  invokes Scene Opening in `bootstrap` mode to render both narration and
  dialogue from the committed Opening package.
- Daily is removed. Time policy becomes deterministic configuration; Scene
  Transition owns scene-boundary actor intent; Appraisal/Schema owns subjective
  mood; clue reveal requires committed unlock evidence.
- Scene Transition remains the sole medium/high Scene-boundary State proposal.
  It does not absorb prose rendering or daily maintenance.

### Pacing and Social

Pacing no longer handles explicit actor admission, cast quotas, repeated cast,
long scenes, minor mishaps, environmental filler or generic existing-actor
initiative. Those are deterministic Actor admission/cast policy, low Performer
agency or Scene Transition responsibilities.

Pacing remains only for a grounded causal-collapse opportunity, with one call
maximum per Scene. Social remains post-commit and deferrable. If both become due
from adjacent phases, the scheduler records and applies their separate quota;
they are never combined into a predictive/extractive Prompt.

## Writer and Reader Ownership

| Fact | Authority writer | Current overlapping Prompt readers | Revision 2 target reader |
| --- | --- | --- | --- |
| Actor stable identity/performance | ActorCoreV1 writer | `actorLibrary`, `presentActors`, Actor profiles/cards | one task Actor card |
| Actor current state | ActorRuntimeV1 reducers | Authority Snapshot plus runtime arrays/cards | Authority Snapshot or one task card, not both |
| Identity | Identity reducer/Canon registry | full self Identity in shared Daily/Transition Actor arrays | public/player projection by default; dedicated high only when authorized |
| relationship stance | Social reducer | Actor cards, continuity capsules, Social graph calibration | one actor card or batch-relevant Social calibration |
| Event/Appraisal | Event/Memory reducers | activation, continuity, Event arrays, evidence | Event ID plus one authorized hydration |
| Item/Material/Room | Item/Material/Map reducers | Authority Snapshot plus sibling item/material/room fields | audience-safe Authority Snapshot |
| map | preset map + runtime diff | full `mapAuthority`, raw `currentMapState` | one mode-specific map projection |
| Calendar | Calendar reducers | four overlapping schedule arrays | one normalized schedule directory plus missing-slot refs |
| transcript | committed chat segments | recent messages, Scene archives, narrative text + segments | bounded exact evidence only where required |

Model output remains a proposal until its registered validator and reducer
accept it. The only new State writer is the task-ledger reducer. Map mount
migration replaces duplicate parent/binding fields atomically.

## Projection Design

### Actor Prompt Projection

Add one task projection API with an explicit actor ID set and access mode:

```text
projectActorPromptCards(state, {
  actorIds,
  access: public | player | dedicated_high,
  includeRuntime,
  includeContinuity
})
```

Each actor appears once. The projector reads ActorCoreV1, ActorRuntimeV1,
Identity, Social and Memory references and emits only task fields. Scene
Transition uses the union of current actors and `sceneCastPolicy` candidate IDs,
not all Actor Cores.

Medium/public cards do not include `identityProjection.authority` for every
actor. Dedicated high access is explicit and tested.

### Actor Creation Proposal

Opening and Low temporary Actor output use:

```text
ActorCreationProposalV1 {
  id,
  nameEn,
  aliases,
  roleEn,
  publicProfile { descriptionEn, backgroundEn },
  performanceCore {
    temperamentEn,
    speechStyleEn,
    motivesEn,
    socialStrategiesEn,
    boundariesEn,
    vulnerabilitiesEn
  },
  identity,
  privateFacts { secretEn, knowledgeEn },
  runtime {
    currentActivityEn,
    currentIntentEn,
    currentGoalEn
  }
}
```

The exact permitted subset varies by tier. `cast`,
`lifeStatusPermanent`, provenance, current map/room and `temporary` remain
reducer-owned. `settingTags` and flat pre-V1 Actor fields are removed from
Prompt Schema and validators. Canon data continues to come from the Canon
registry.

### Authority Projection

`buildNarrativeAuthoritySnapshot()` gains an access-aware projection boundary:

- low/medium excludes hidden Item and unauthorized Identity;
- current Item, Material and Room facts appear once;
- Low `sceneFacts` removes sibling `currentRoomState`,
  `currentMaterialState` and `formalItems`;
- Scene Opening removes sibling `currentMaterialState` and
  `authoritativeItems`;
- task Actor cards omit runtime fields already represented by the snapshot.

The Authority Snapshot remains protected and is never silently truncated.

### Map Projection

Replace the one full projection with three modes:

1. `current_scene`: active map/room, valid room IDs required by the task,
   relevant exits and runtime blocks only.
2. `calendar_directory`: compact `{mapId, roomId, nameEn, access}` directory;
   no coordinates, full topology, room material state or spatial history.
3. `world_expansion`: preset catalog plus current runtime diff once; removes
   raw `currentMapState`.

Scene Transition receives current-scene mode. Pacing receives current room and
adjacent/relevant locations only. Medium Calendar receives the directory.

### Calendar Projection

Medium Calendar receives:

```text
{
  schedulableBeats: [{ beat, missingSlots }],
  existingSchedules: [...one normalized union...],
  coverage,
  admittedActorDirectory,
  locationDirectory
}
```

`planningWindowSchedules`, `highEntries` and
`currentAndFutureMediumEntries` do not coexist.

### Pacing History

- Pacing replaces full `recentScenes` with compact scene ID, ended clock,
  participating actor IDs, public summary and unresolved pressure.
- Exact current player action remains once.

### Social Projection

Social replaces Narrative Authority Snapshot with:

```text
socialAuthorityStamp {
  timelineEpoch,
  stateRevision,
  clock,
  actorIds,
  currentSceneId
}
```

Existing Social calibration is filtered to pairs/Event IDs present in the
batch. Exact `sceneEvidence` remains because segment grounding is required.
Event context is reference-first and batch-relevant. The prose Schema example
is removed from System; `SOCIAL_DIRECTOR_RESPONSE_SCHEMA` remains the sole
machine Schema.

### Repair Projection

Repair builders receive one common bounded shape:

```text
{
  validationConflict,
  invalidOutput,
  originalRequest
}
```

`originalRequest` is already canonical and occurs once. `requiredSchema` never
contains the full System Prompt. Retained repair builders are High/Medium only.
Invalid output is compacted by structured field, not by cutting arbitrary JSON
bytes.

Bootstrap repairs may keep their smaller Schema-only form when they do not need
original world context.

### Local Structured Calls

`callStructuredModel()` keeps `format: jsonSchema` and removes the JSON Schema
string appended to System. Post-turn input removes `narrativeText`; the server
derives it by joining `narrativeSegments[].textEn`. Pre-turn renames
`recentTimeline` to `recentSceneTimeline`.

No automatic retry is added.

### Native System Injection

The native Prompt uses one bounded mandatory Scene projection:

- projected current Items instead of raw `items`;
- one Actor performance/current card instead of separate actor arrays;
- `playerPosition` appears once;
- no full map topology, memory ledger or Social graph.

### Interior mount contract

Generated child maps use:

```text
{
  worldAnchorId,
  mount: {
    parentMapId,
    parentRoomId
  }
}
```

`mount` is the sole containment authority. The runtime lookup index is derived
from custom maps and is not persisted as `interiorMapBindings`.

All readers use mount hierarchy:

- movement bridge and parent re-entry;
- Scene destination discovery;
- map selector hierarchy;
- Calendar location hierarchy;
- validation of current Scene/map/room.

Known registered container interiors use preset topology and do not call
Interior Cartographer. Unknown tagged containers may call it once after
`map.container_entered`. A custom parent without a valid world anchor retains
an empty `worldAnchorId`; the parent map ID is never substituted as a fake
world-node ID.

## Prompt Budget Design

`measure-prompts.mjs` reads Tina, invokes the Revision 4 cutover on a clone
(a no-op for the current save), invokes production builders with model ports
replaced by capture functions and checks the source archive before/after.

Role ceilings are derived with:

```text
createContextBudgetPlan(
  modelSlots[role].contextSize,
  modelSlots[role].maxResponseLength
).maxPromptCharacters
```

The runtime ceiling is `298,080` for all active Tina roles. Product targets are
the lower limits in PRD section 9. The measurement reports System, User,
embedded Schema, transport Schema, total, per-field sizes, exact repeated
strings and repair captures.

Retrieval has two measurements: empty active build-only input and a full
`8,000`-character formatter-cap input.

The Opening Scene Plan `93,470` active-save structural measurement is not a
reachable bootstrap baseline. Reconstructing the historical five-Actor
foundation and three present Actors produces `51,218` characters. The task is
retired in Revision 2.

## Migration and Failure Handling

### Revision 4 scheduler persistence and guard contract

`runRoleTask()` and `runLocalTask()` may persist the attempt before the model
returns. Because guarded metadata persistence replaces the live State object,
the scheduler must reacquire `getState()` before recording success or failure.
It must never write an outcome to the pre-save object.

Scheduler saves use source/domain `model_task_runtime`. Revision history marks
these changes separately from business `world`, Item and Identity changes.
`isRevisionCurrentOrModelTaskRuntimeOnly()` accepts an increased revision only
when every contiguous history entry after the captured revision contains
exactly that operational domain.

Post-turn Appraisal and Memory guards retain timeline, turn, Scene and boundary
identity checks. They use the operational-revision helper instead of raw
revision equality. Before applying the turn reducer, the workflow refreshes its
base from live State; after Appraisal it copies the latest live
`modelTaskRuntime` into the pending commit so task outcomes are not overwritten.

There is no State migration and no Prompt impact. Existing historical ledger
counts are not reconstructed.

### Revision 3 Low output contract

The active Scene Performance output has three top-level fields:
`segments/stateProposals/signals`.

Allowed proposal projections are exact:

- `actor_activity`: `actorId/currentActivityEn`;
- `actor_move|actor_enter|actor_exit`:
  `actorId/currentActivityEn/mapId/roomId`;
- `social_hint`: `actorId/currentActivityEn/firstImpressionOfPlayerEn`;
- `item_update`: one evidence-grounded Item proposal;
- `temporary_actor`: one `ActorCreationProposalV1`.

`impressionOfPlayerEn`, `memoryUpdate`, `requireEverydayMemory`, Appraisal,
relationship and clue writes have no Low writer or compatibility alias.
Post-turn Appraisal/Social workflows remain their sole owners.

Scene Performance recovery emits only
`segments/stateProposals/signals`. Settlement folds these proposals exactly
once; it does not read legacy top-level `actorUpdates/itemUpdates/revealedClues`
or signal aliases. When momentum or a committed Pacing beat requires
`sceneProgression/pacingBeatRealized`, the raw contract and final validator
enforce the same requirement.

`generateScenePerformance()` performs one scheduler call. Parse recovery may
recover JSON from the same response, and deterministic settlement may validate
it, but any resulting parse/authority/provenance/validation error is recorded
with `willRetry=false` and thrown immediately.

Bootstrap and post-transition Scene Opening also perform one scheduler call.
Their root and segment fields are exact; post-transition historical claims are
limited to `claimTextEn/sourceEventIds`. Invalid output throws immediately.
No active Low repair Prompt or deterministic prose fallback exists.

- Persisted State migration:
  - initialize versioned task-ledger rows with zero historical counters and
    current eligibility only; do not guess past calls;
  - convert generated child map parent aliases to `worldAnchorId + mount`;
  - prove each legacy binding has exactly one matching child;
  - remove `interiorMapBindings`, `sourceContainerKey`, `parentMapId`,
    `parentRoomId` and generated-child `parentWorldNodeId` only after full
    validation.
- Prompt contract cutover: atomic; no aliases or dual Schema.
- Old model response shape: validation error, State unchanged.
- Budget violation: fail before model call with field-level diagnostics.
- Local semantic failure: existing explicit workflow fallback remains; no new
  retry.
- Scene Chronicle validation continues to fail without retry.
- Retired tasks have no compatibility caller.
- Rollback restores code and the pre-migration State snapshot together.

## Verification Design

1. Static call inventory accounts for all 20 current tasks and asserts every
   active `sendRoleRequest` and local structured call is scheduler-owned.
2. Trigger tests prove event, emitter, action ID, phase, idempotency and quota
   for every registered task.
3. Tina baseline proves at least 23 consumed Pacing interventions in 99 turns,
   while target replay permits at most one causal-only Pacing call per Scene.
4. Scheduler ledger tests prove counters, reload idempotency and no Prompt or
   response persistence.
5. Bootstrap test proves one High Opening World plus one Low Scene Opening and
   no Foundation/Opening Plan/Dialogue call.
6. Daily removal tests prove deterministic time policy, retained Actor intent
   and evidence-based clue reveal.
7. Interior migration tests prove unique parent mount, nested UI/Calendar
   projection and movement re-entry without a persisted binding map.
8. Build-only captures every retained initial and High/Medium repair Prompt
   and proves Low repair captures are absent.
9. Per-task tests assert exact top-level keys, access mode and field budgets.
10. Duplicate tests compare Authority Material/Room/Item and Actor/Calendar/map
   semantic subtrees, not only equal strings.
11. Actor proposal tests compare JSON Schema required fields, validator fields
   and reducer output; non-empty nested Core/Runtime survives.
12. ACL tests include hidden Item, private Identity and actor-to-actor transfer
   negatives.
13. Local post-turn test proves one narrative copy, one Schema transport and
   target token estimate.
14. LowTier System snapshot proves the protected extra 203 characters are
   byte-identical to commit `329631952`.
15. Tina SHA/bytes/mtime and zero-model-call assertions run before and after.
16. Focused and full Hogwarts regression suites run before an approved
    end-to-end workflow.
17. Scheduler tests persist by replacing the State object and prove both
    success and failure counters survive.
18. Task 8 production harness reaches ordinary, empty-Appraisal and genuinely
    stale business-boundary assertions through current workflow ports.
19. Memory-boundary tests prove ledger-only revisions remain current while a
    missing, non-contiguous or non-ledger revision remains stale.
