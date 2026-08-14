# Hogwarts Prompt Payload Consolidation PRD

## 1. Change ID and Status

- Change ID: `hogwarts-prompt-payload-consolidation`
- Artifact revision: `4`
- Status: Revision 4 implemented; acceptance passed

Related artifacts:

- [Technical spec](./spec.md)
- [Tasks](./tasks.md)
- [Checklist](./checklist.md)
- [Progress](./progress.md)
- [Runtime field contract](../hogwarts-runtime-contracts/state-fields.md)

### Revision 3 incident correction

The first real Tina turn after Revision 2 failed after two low-tier calls.
Production evidence in message 212 proves:

- initial Scene Performance used `50,293 / 80,000` characters, so this was not
  a Prompt-budget or scheduler failure;
- the first response was rejected for an absent Item operation, two
  `memoryUpdate` writes and two unsupported historical claims;
- the second response fixed every issue except
  `canon_harry_james_potter.memoryUpdate`;
- the Low System Schema explicitly requested
  `social_hint.impressionOfPlayerEn/memoryUpdate`, while the settlement fold
  consumed only `firstImpressionOfPlayerEn` and the validator whitelist
  rejected the other two fields;
- after repair, `ensureMentionedKnownActorMemories()` deterministically
  reintroduced Harry's `memoryUpdate`, making a valid retry impossible.

Revision 3 makes the Low contract exact:

- Low may propose Actor activity, same-map movement, entrance/exit, one pending
  first impression, Item operation or temporary Actor admission;
- Low may not propose current impression, Appraisal, memory, relationship,
  clue, hidden fact or Social evidence;
- mentioned-known-Actor admission guarantees presence and reaction only; it
  never creates an Everyday memory;
- Every active Low task performs exactly one model call. Bootstrap Scene
  Opening, Scene Performance and post-transition Scene Opening report parse,
  settlement, authority, provenance or validation failure immediately and
  leave the operation failed for explicit user retry.

### Revision 4 scheduler persistence correction

The first real event-boundary turn after scheduler integration failed after a
valid single Low response:

- Scene Performance made one `50,271 / 80,000` request and passed with 303
  words, seven segments and zero validation errors;
- the post-turn Appraisal proposer returned zero proposals;
- scheduler attempt/outcome persistence advanced live `stateRevision`, while
  the Appraisal guard compared against a stale pre-scheduler State object and
  threw `Rejected stale post-turn Appraisal result.`;
- scheduler outcome counters were written to the stale object, so persisted
  rows showed `attempted > 0` but `succeeded = 0`;
- the affected Task 8 harness still used pre-scheduler ports and failed before
  reaching its Appraisal assertions.

Revision 4 requires scheduler outcome writes to reacquire the current live
State after persistence. Appraisal and Memory guards accept only contiguous
revision changes whose revision history proves they changed
`modelTaskRuntime` alone; any world, Item, Identity, timeline, turn, Scene or
boundary change remains stale. Turn commit preserves the latest live task
ledger. Prompt field budget impact: None; no Prompt, Schema, response parser or
model-call count changes.

## 2. Problem and Evidence

The production inventory contains 15 role-model tasks, five local generative
tasks and one separate native SillyTavern System Prompt injection. Deterministic
settlement, Social resolution, retrieval and embedding are not text-generation
Prompts.

Revision 2 traced every task's caller and trigger. Model orchestration is
currently distributed across setup UI, Opening, turn, Scene Transition,
Calendar Moment, map UI and playable-state preparation. A task can call another
task through wrapper code, so the system has no single answer for:

- which event triggered a model task;
- which task or user action emitted that event;
- how many medium calls are permitted in one turn or Scene;
- how many calls succeeded, held, failed or were skipped;
- which budget policy governed the call.

The merge and frequency audit proves:

1. `applyOpeningWorldPackage()` already commits Actor Library, Story Arc and
   sets `directorFoundation.status=ready`. `Director Foundation` is a second
   recovery writer for an incomplete playing State, not a normal independent
   Director. Tina's historical opening required it because the old Opening
   package lacked Actor Library/Story Arc; the current Opening contract already
   asks for both.
2. Opening Scene Plan runs once after Opening World and then invokes a second
   low Dialogue Performer. Its `elapsedMinutes/publicEventEn` outputs are never
   consumed. The existing low Scene Opening Performer can render an already
   committed opening State with narration and dialogue in one call.
3. Daily is checked before every turn and after clock-changing commits, although
   its model runs only when the in-world date changes. Its outputs duplicate
   existing owners: time policy is deterministic, actor intent belongs to
   Actor Runtime/Scene Transition, mood/interpretation belongs to
   Appraisal/Schema, and clue unlock belongs to committed evidence.
4. Scene Transition is the necessary Scene-boundary State writer. Combining
   Opening prose or Daily maintenance into its Prompt would make it fatter and
   mix different commit boundaries.
5. Pacing is checked before every turn. Tina contains 23 consumed Pacing beats
   across 99 committed turns, proving at least 23 successful calls
   (`>=23.2%`; hold/failure calls are not recorded). Fourteen beats are
   `new_actor/mixed`, so Pacing is a major source of call and cast expansion.
6. Social is checked after every turn and during playable-state/transition
   catch-up, but its model gate is event-boundary based with a minimum ten-turn
   review interval. Exact historical call count cannot be reconstructed because
   no model-task ledger exists.
7. The latest 48 revision records contain two High Calendar and two Medium
   Calendar commits. Medium Calendar has no Tina explicit-commitment hits; it is
   not the main frequency problem, but its guard is still evaluated after every
   turn and transition.
8. Tina has two persisted generated interiors. Their exact container binding
   (`parentMapId + parentRoomId/sourceContainerKey`) is written correctly and
   movement re-entry uses it. The hierarchy is nevertheless broken in readers:
   map UI, Calendar location options and Scene destination discovery flatten
   every custom map; `parentWorldNodeId` is treated as a world anchor while the
   real room mount is ignored. Generated interiors also persist the same
   binding twice in `interiorMapBindings` and the child map.

The final model-free Tina run used the production builders against the active
Revision 4 save. The source archive remained byte- and mtime-identical:

- SHA-256: `d73dd33922f1775477ca6882117f5eb15e4a84fe5cdfa195953162d473c81b0f`
- bytes: `6,728,739`
- active role ceiling: `298,080` Prompt characters for low, medium and high
- local semantic context: `4,096` tokens; translation override: `8,192`

The main measured defects are:

1. Scene Transition is `152,019` characters. It injects all 23 Actor Cores as
   `actorLibrary` (`51,217`), a full 76-room active map projection
   (`mapAuthority`, `39,045` serialized), a second runtime actor projection,
   Authority Snapshot and Actor continuity side by side.
2. Daily is `101,785` characters. It sends all 23 Actor Cores (`51,217`) even
   though the output contract requires only present actors, plus `24,733`
   characters of recent raw messages.
3. Pacing is `111,077` characters. Full map authority, known absent actors and
   three complete Scene archives consume `89,665` characters.
4. Medium Calendar is `86,035` characters. The same schedules occur in
   `schedulableStoryBeats`, `planningWindowSchedules`,
   `currentAndFutureMediumEntries` and `highEntries`; measured exact repeated
   strings consume at least `4,562` characters.
5. Map Expansion sends both `mapAuthority` and raw `currentMapState`, totalling
   `68,359` serialized field characters for the same map domain.
6. Authority Snapshot already owns current Item, Material, Room and Actor
   state. Low Performance and Scene Opening inject Material/Item/Actor sibling
   copies again. Scene Opening repeats `currentMaterialState` exactly
   (`2,939` characters).
7. Scene Opening repair nests the full `originalRequest`, then repeats
   `authoritySnapshot` (`13,041`) and `memoryActivationCapsules` (`876`)
   outside it. Pacing, Calendar and Scene Transition repairs also resend the
   full original User payload and the entire original System Prompt under
   `requiredSchema`.
8. Social transmits `94,778` message characters plus a separate `6,168`
   character JSON Schema. Its System Prompt also embeds a prose Schema. The
   payload includes `39,650` characters of exact source evidence, `14,479` of
   full Social calibration, `13,030` of narrative Authority Snapshot and
   `12,808` of Events.
9. Local post-turn observation sends the same narrative as both
   `narrativeSegments` (`2,235`) and `narrativeText` (`1,899`). Its `4,010`
   character JSON Schema is embedded in System text and sent again as Ollama
   `format`. The actual Prompt is `16,334` characters, approximately `5,445`
   tokens, above configured `num_ctx=4096`.
10. Active legacy Prompt language remains: local pre-turn uses
    `recentTimeline`; Low System instructions refer to Social `statements`;
    generic trimming still knows the removed `addressedActorKnowledge` alias.
11. Opening and Pacing still request flat pre-V1 Actor fields such as
    `publicDescriptionEn`, `personalityEn`, `privateGoalEn` and `knowledgeEn`.
    Actor V1 normalization reads nested `publicProfile`, `performanceCore`,
    `identity` and `privateFacts`, so generated detail is discarded.
12. Opening and Pacing validators require `birthDate`, `settingTags` and/or
    `firstImpressionOfPlayerEn` that their output Schemas do not request. A
    conforming model response can therefore fail every repair attempt.
13. `projectActorLibraryForContext(... identityObserver: "self")` exposes full
    self Identity authority for every Actor in one shared medium Prompt.
    Actor-specific Identity is not sealed against cross-actor use.

## 3. Before

Each workflow independently decides whether to call a model, assembles its own
payload and directly invokes another wrapper when follow-up maintenance is
needed. One ordinary turn checks Daily and Pacing before generation, then
Social and Medium Calendar after commit. In the worst case one user action can
produce four medium calls.

Generic character-count trimming activates only above `298,080` characters, so
none of the measured duplicate Prompts is trimmed. Local Ollama calls have no
equivalent preflight budget gate.

Actor creation still has a second, old model-facing field contract even though
persisted Actor State is already V1. Repair envelopes frequently copy the
initial request rather than referencing one canonical bounded request shape.

## 4. After

All 20 current model tasks SHALL be accounted for in one governance catalog.
The runtime registry contains only active tasks; retired tasks remain documented
with their replacement, not executable as disabled compatibility entries.

One deterministic event scheduler SHALL be the only runtime caller of active
model tasks. Every task registration names its kind, family, allowed tier,
trigger events, phase, caller, guard, idempotency key, quota group, budget
policy, Prompt builder, Schema, validator, reducer, retry and failure policy.

Revision 2 disposition:

| Current task | Disposition |
| --- | --- |
| Character Polish | keep, explicit user utility |
| Opening World | keep as the sole bootstrap World/Foundation writer |
| Director Foundation | retire; incomplete State fails explicitly instead of invoking a second writer |
| Opening Scene Plan | retire; committed Opening State goes to low Scene Opening |
| Opening Dialogue | retire; low Scene Opening writes both narration and dialogue |
| High Calendar | keep |
| Medium Calendar | keep; remove day-change trigger and direct per-turn caller |
| Interior Cartographer | keep only for unknown missing containers, once per mount |
| Daily | retire; split responsibilities to deterministic policy and existing authorities |
| Pacing | keep only for rare causal-collapse intervention, at most once per Scene |
| Scene Performance | keep |
| Scene Transition | keep as the sole Scene-boundary State writer, medium/high modes |
| Scene Opening | keep; add bootstrap rendering mode |
| Social | keep as post-commit, deferrable Scene/Event consolidation |
| World Map Expansion | keep, explicit user action |
| Local pre-turn adjudicator | keep |
| Local post-turn observer | keep |
| Local inventory observer | keep, conditional |
| Local Appraisal proposer | keep |
| Local translator | keep |

The active runtime therefore falls from 20 to 16 model tasks without replacing
them with one larger medium Prompt.

Every remaining task SHALL have one explicit audience-scoped projection. A
semantic fact may appear once per request:

- Actor Core and Runtime are merged into one task-specific Actor card, limited
  to IDs the task may act on.
- Identity uses public/player-visible projection by default. A shared medium
  Prompt never receives every Actor's self-authority Identity.
- Authority Snapshot is the only current Item/Material/Room authority. Sibling
  copies are removed.
- Map projection has three bounded modes: current Scene, Calendar location
  directory and World Expansion. World Expansion receives one map payload, not
  `mapAuthority + currentMapState`.
- Calendar sends each existing schedule once.
- Pacing uses compact committed Event/Scene summaries, not raw transcript or
  complete archives.
- Social receives a compact Social authority stamp and batch-relevant
  relationship calibration, not Narrative Authority Snapshot or the full
  graph.
- Repair contains validation errors, bounded invalid output and the minimum
  canonical request fields once. No semantic subtree is repeated outside
  `originalRequest`.
- Local structured calls send JSON Schema through Ollama `format` once; they do
  not duplicate it in System text. Post-turn derives `narrativeText` from
  `narrativeSegments` locally.
- Opening and Low temporary-Actor proposals use one nested
  `ActorCreationProposalV1` that maps directly to Actor Core/Runtime V1.
  Reducer-owned `cast`, provenance and defaults remain reducer-owned.
- Old Prompt-only names and instructions are removed in the same change.
- Pacing and Social remain separate because they observe different commit
  boundaries, but share one medium Scene quota and call ledger.
- Known canonical interiors should use preset topology; Interior Cartographer
  is not called for a registered preset container.

No new memory layer, retrieval backend or model call is introduced. The only
new persisted data is the bounded task ledger and normalized map mount
authority described below.

## 5. In Scope

- Role Prompt builders and repair paths in `workflows/`, setup and map UI.
- Local pre-turn, post-turn, inventory, Appraisal and translation Prompt
  assembly.
- Native Hogwarts System Prompt injection.
- Actor creation output contracts used by Opening and Low temporary Actor
  proposals.
- Audience-safe Actor, Authority, map, Calendar and Social Prompt projectors.
- Build-only measurement and regression tests for all inventoried calls.
- One `MODEL_TASK_REGISTRY`, deterministic event scheduler, task call ledger and
  tier/workflow budget policies.
- Removal of Director Foundation, Opening Scene Plan, Opening Dialogue and
  Daily model calls.
- Narrowing Pacing triggers and centralizing Pacing/Social/Calendar call quota.
- Interior-map mount authority and all direct readers.

## 6. Non-Goals

- No change to Event/Appraisal/Receipt retention or Revision 4 migration.
- No language-display unification.
- No unrelated frontend redesign; only mounted-map hierarchy readers change.
- No Qdrant, embedding or retrieval-ranking redesign. Existing retrieval output
  remains bounded to ten records and `8,000` formatted characters.
- No change to the protected LowTier extra 203 characters.
- No cross-project generic workflow framework.
- No merging of pre-turn Pacing and post-commit Social into one Prompt.
- No model-generated replacement for deterministic Daily time policy.

## 7. Runtime Contract Impact

Persisted runtime field impact:

- add bounded `modelTaskRuntime.version/byTaskId` counters and last-trigger
  diagnostics so call frequency and idempotency survive reload;
- atomically replace generated custom-map parent aliases with
  `worldAnchorId` plus one `mount { parentMapId, parentRoomId }`;
- remove persisted `map.interiorMapBindings` and derive the mount index from
  custom maps.

The static `MODEL_TASK_REGISTRY` and event definitions are code contracts, not
State.

The change modifies deterministic, non-persisted Prompt projections and model
proposal Schemas. Existing State authorities remain:

| Semantic fact | Authority |
| --- | --- |
| stable Actor | `actorLibrary[]` ActorCoreV1 |
| current Actor | `actors[]` ActorRuntimeV1 |
| Identity | `actorLibrary[].identity` |
| relationship | `socialGraph.relationships[]` and V3 receipts |
| subjective interpretation | `memorySynapse.appraisals[]/personSchemas[]` |
| hard fact | `eventKnowledge[]` |
| Item/Material/Room | Item, presentation, material and map reducers through Authority Snapshot |
| Calendar | `calendar.storylines/storyBeats/entries` |
| transcript evidence | committed chat message segments |

`modelTaskRuntime.byTaskId[taskId]` is bounded to registered active task IDs and
stores counters plus `lastTriggerKey/lastEmitter/lastActionId/
lastAttemptedRevision/lastCompletedRevision/lastTurn/lastSceneId/
nextEligibleTurn`. It stores no Prompt, response, secret or State snapshot.

`LowTierContextV1` keeps its six top-level fields. Its internal Actor cards and
`sceneFacts` become subtractive V1 projections; no old and new copy coexist.

## 8. Migration and Compatibility

One atomic State migration is required:

1. initialize the bounded model-task ledger from current State without guessing
   historical counts;
2. convert each generated interior's
   `parentWorldNodeId/parentMapId/parentRoomId/sourceContainerKey` to
   `worldAnchorId + mount`;
3. prove every `interiorMapBindings` entry resolves to exactly one child map;
4. remove `interiorMapBindings` and old parent aliases after validation;
5. fail without changing State on missing or conflicting mount authority.

Prompt and response contracts cut over atomically:

- old flat Actor proposal fields are rejected after the cutover;
- no dual output Schema, alias reader or fallback projector is retained;
- existing story facts remain unchanged; the task-ledger/mount migration is the
  only persisted cutover;
- validation failure leaves State and chat unchanged;
- migration failure restores the untouched pre-migration State;
- retired model tasks have no compatibility caller or fallback.

## 9. Prompt Field Budget

Runtime ceiling and product targets are separate. The configured role-model
ceiling remains `298,080` characters. Revision 2 proposes these lower product
targets:

| Prompt | Baseline chars | Largest measured fields | Proposed hard target |
| --- | ---: | --- | ---: |
| Character polish | 2,524 | character 2,289 | 4,000 |
| Opening World | 8,801 | player 2,289; catalog 962 | 20,000 |
| Director Foundation | 33,772 recovery baseline | actors 11,387; old opening 11,108 | retired |
| Opening Scene Plan | 51,218 reconstructed bootstrap baseline | opening package 26,256; five Actor profiles 12,770 | retired |
| Opening Dialogue | 7,630 | Actor profiles 2,132 | retired |
| High Calendar | 14,357 | beats 5,075 | 20,000 |
| Medium Calendar | 86,035 | map 39,045; duplicate schedules 28,671 | 50,000 |
| Interior Map | 4,201 | current Scene 2,054 | 10,000 |
| Daily | 101,785 | Actor library 51,217; messages 24,733 | retired |
| Pacing | 111,077 | map 39,045; absent Actors 26,510; archives 24,110 | 65,000 |
| Scene Performance | 58,883 | sceneFacts 24,206; System 27,199 | 80,000 and User <= 50 KiB |
| Scene Transition | 152,019 | Actors 60,576; map 39,045 | 95,000 |
| Scene Opening | 47,727 | authority 13,041; continuity 6,310 | 40,000 |
| Social | 94,778 messages / 100,946 with transport Schema | evidence 39,650; graph 14,479 | 80,000 including transport Schema |
| Map Expansion | 71,414 | map authority 39,045; raw map 29,314 | 45,000 |
| Native System injection | 40,592 | mandatory Scene 27,715 | 20,000 |

Call-frequency budgets:

- at most one synchronous medium task for one player action, across all events
  sharing the same `actionId`;
- Pacing at most once per Scene and only for a causal-collapse opportunity;
- Social at most once per eligible event/Scene boundary and remains deferrable;
- Medium Calendar runs only for insufficient horizon, explicit player
  commitment, successful High Calendar planning or explicit manual request;
- Interior Cartographer runs once per unresolved mount and never for a preset
  container;
- follow-up model tasks are scheduled from a new event, never called directly
  inside another task wrapper.

Repair hard targets are: Pacing `75,000`, Medium Calendar `60,000` and Scene
Transition `110,000`; every other retained High/Medium repair is `<= 30,000`.
Active Low tasks have no automatic repair call or fallback prose. System,
output Schema, player action, Authority Snapshot and current-scene Actor
contract remain protected.

Local model targets:

| Local Prompt | Baseline prompt chars / estimated tokens | Target |
| --- | ---: | ---: |
| pre-turn | 7,948 / 2,650 | <= 9,000 chars |
| post-turn | 16,334 / 5,445 | <= 10,500 chars and <= 3,500 estimated tokens |
| inventory | 10,287 / 3,429 | <= 9,000 chars |
| Appraisal | 3,055 / 1,019 | <= 3,500 chars |
| translation sample | 2,650 / 884 | <= 20,000 chars under 8,192-token override |

Retrieval was empty in the model-free capture. Its production formatter has an
independent hard maximum of `8,000` characters; acceptance measures both zero
retrieval and a full-cap retrieval payload.

## 10. Frontend Field Whitelist

Frontend may read:

- `map.customLocalMaps[].worldAnchorId`
- `map.customLocalMaps[].mount.parentMapId`
- `map.customLocalMaps[].mount.parentRoomId`

Map and Calendar location selectors render mounted interiors under their parent
room rather than as flat sibling maps. No frontend writer or UI session field is
added.

## 11. Acceptance Criteria

1. All 20 current model tasks have an explicit keep/retire disposition; all 16
   active tasks are registered in `MODEL_TASK_REGISTRY`.
2. No production workflow or UI controller calls `sendRoleRequest()` or a local
   generative endpoint outside the scheduler/model adapter boundary.
3. Every attempted task records trigger event, emitter, phase, task ID, tier,
   budget policy and bounded outcome counters.
4. Director Foundation, Opening Scene Plan, Opening Dialogue and Daily have no
   executable caller or compatibility fallback.
5. Bootstrap uses one High Opening World call and one Low Scene Opening call.
6. Events from one player action share an `actionId` and cannot synchronously
   invoke more than one medium model in total.
7. Pacing no longer handles actor insertion, roster gaps, repeated cast,
   long-scene filler, minor mishaps or generic existing-actor action.
8. Tina's historical 23/99 Pacing intervention rate is locked as the Before
   baseline; target fixtures prove at most one Pacing call per Scene.
9. Social and Pacing have separate Schemas/reducers but one quota ledger.
10. Medium Calendar is not evaluated by a direct post-turn model call and does
   not trigger on date change alone.
11. Interior mount migration is atomic; every child has one parent room, parent
   re-entry works, UI/Calendar hierarchy is nested and stale flat bindings are
   absent.
12. All 15 role tasks, five local tasks, native System injection and every
   retained repair path are present in the build-only report or marked retired.
13. Tina source SHA, bytes and mtime remain unchanged; build-only performs zero
   role/local model calls.
14. Every initial and repair Prompt passes the applicable product target and
   runtime ceiling without trimming System, output Schema, player action or
   Authority Snapshot.
15. No request contains raw full Actor Library, raw Social Graph, raw map State,
   full Memory ledger, full Scene archive or unbounded transcript.
16. Actor, Item/Material/Room, Calendar schedule and Event text have one semantic
   source per request. Exact duplicate checks and explicit structural checks
   both pass.
17. Low Performance and Scene Opening contain no Material, Item or Room sibling
   copy already present in Authority Snapshot.
18. Shared medium Prompts contain no self-authority Identity bundle for unrelated
   actors and no hidden Item.
19. Opening and Low temporary Actor valid fixtures map one-to-one to
   non-empty ActorCoreV1/ActorRuntimeV1 fields. Their Prompt Schema and validator
   required fields are identical.
20. Active Prompts contain no `recentTimeline`, Social `statements`,
   `addressedActorKnowledge`, `relationshipUpdates`, `worldChanges`,
   `gossipPacks`, `worldNews` or old flat Actor creation contract.
21. Local post-turn sends narrative content once and remains below the
    4,096-token target; local JSON Schema is not embedded and transported twice.
22. Repair Prompts contain no duplicated `originalRequest` subtrees or full
    System Prompt under a misleading `requiredSchema` field.
23. The protected LowTier extra 203 characters are byte-identical to commit
    `329631952`.
24. Focused tests, Hogwarts regression tests and at least one approved real
    affected workflow pass.
25. Low Scene Performance Prompt, settlement fold and validator expose exactly
    the same Actor proposal fields. `impressionOfPlayerEn`, `memoryUpdate`,
    `requireEverydayMemory` and Low clue writes are absent from the active path.
26. A malformed or invalid response from any active Low task produces one
    model attempt, one validation error and zero automatic repair or fallback
    calls.
27. Scheduler attempt/success/failure counters survive a persistence layer
    that replaces the live State object.
28. Ledger-only `modelTaskRuntime` revisions do not invalidate post-turn
    Appraisal or Memory results; any non-ledger revision still does.
29. A successful event-boundary turn commits after one Low call even when the
    local Appraisal batch is empty.
30. Every harness affected by scheduler/application-port refactoring is updated
    and reaches its intended business assertion without missing-port or stale
    export failures.

## 12. Risks and Rollback

| Risk | Control |
| --- | --- |
| compact map projection omits a legal destination | mode-specific contract tests enumerate every allowed map/room ID |
| Actor projection removes a needed private fact | audience matrix tests prove high-only access and medium/low denial |
| Actor proposal cutover drops generated detail | Schema/validator equality and reducer round-trip tests require non-empty V1 fields |
| Low output cannot be repaired automatically | failure remains explicit and atomic; the user may explicitly retry the failed operation |
| local `format` support differs by Ollama version | existing production Ollama structured-output integration test; rollback by code revert |
| product target is too low | build-only fails before model call; no protected-field truncation |
| scheduler becomes another orchestration layer | direct model-call search must return only scheduler/adapter boundaries; old callers removed in the same task |
| scheduler persistence replaces the State object | reacquire live State before outcome writes and preserve the live ledger in the final reducer State |
| ledger saves trip stale business guards | accept only contiguous revision-history entries proven to be `model_task_runtime`-only |
| deferred Social loses a committed boundary | due status remains derivable from Event/Memory State and ledger; no unbounded queue |
| map mount migration strands a player | validate child/parent references and current active map before atomic replacement |

Rollback restores the pre-change State snapshot and code together because
Revision 2 changes persisted scheduler and map-mount fields.

## 13. Approval

Revision 2 was explicitly approved for implementation by the user with
`开始进行`.

Revision 4 was explicitly approved for implementation on 2026-08-14 with
`把这个bug修好`.
