# Hogwarts Prompt Payload Consolidation Progress

## Current Status

- Change ID: `hogwarts-prompt-payload-consolidation`
- Artifact revision: `4`
- Phase: Revision 4 complete
- Active task: none
- Approval: Revision 2 approved with `开始进行`; Revision 3 explicitly
  requested on 2026-08-14; Revision 4 explicitly requested with
  `把这个bug修好`

## Decisions

- This change owns the general Prompt duplication work explicitly deferred by `compact-timeline-appraisal-lifecycle`.
- Investigation uses production builders and a real representative save without model calls.
- No compatibility layer, dual-read, dual-write or additive duplicate projection is presumed.
- The protected LowTier extra 203 characters remain unchanged.
- Revision 2 uses a bounded task ledger and normalized Interior mount State.

## Evidence

### 2026-08-13 - Production call graph

- Inventoried 15 role-model tasks, five local generative tasks, native System
  injection and all repair paths.
- Separated deterministic `/turn/settle`, `/social/resolve`, reducers,
  retrieval and embedding from text-generation Prompts.
- Confirmed Connection Profile presets change generation settings and do not
  append Hogwarts Prompt text.

### 2026-08-13 - Real Tina build-only

- Measurement command:
  `node .trae/specs/hogwarts-prompt-payload-consolidation/measure-prompts.mjs`
- The active save was externally advanced to Revision 4 during reconnaissance.
  Final measurement used SHA-256
  `d73dd33922f1775477ca6882117f5eb15e4a84fe5cdfa195953162d473c81b0f`,
  `6,728,739` bytes and the same pre/post mtime.
- Final cutover check is a no-op. The active save contains 12 Chronicle
  entries, 9 Events, 35 Appraisals, 13 receipts and 0 Statements.
- Active low/medium/high role ceiling is `298,080` characters.
- Largest current role Prompts:
  - Scene Transition `152,019`; repair `154,403`;
  - Pacing `111,077`; repair `111,950`;
  - Daily `101,785`;
  - Social `94,778` message chars plus `6,168` transport Schema;
  - Opening Scene Plan `93,470`;
  - Medium Calendar `86,035`;
  - Map Expansion `71,414`;
  - Scene Performance `58,883`;
  - Scene Opening `47,727`;
  - native System injection `40,592`.
- Local post-turn is `16,334` Prompt characters / approximately `5,445`
  tokens against configured `4096`; other measured local calls remain within
  their context.

### 2026-08-13 - Duplicate and legacy audit

- Scene Transition full Actor projection: `51,217` characters; 23 actors,
  including `24,134` aggregate Identity projection characters.
- Full map projection serializes to `39,045` as a User field; raw projection
  contains active map `22,241` and runtime diff `7,840`.
- Medium Calendar exact repeated strings account for at least `4,562`
  characters across overlapping schedule collections.
- Authority Snapshot current Material is semantically identical to direct
  `buildCurrentMaterialState()` (`2,939`); current Room is exactly duplicated
  (`3,868`) where both are sent.
- Native System injection repeats `playerPosition` inside and outside mandatory
  Scene state (`2,480`).
- Post-turn duplicates narrative segments as joined `narrativeText` (`1,899`).
- Opening/Pacing still use old flat Actor proposal fields. Their Schema omits
  fields required by validators, and Actor V1 normalization discards old flat
  profile/performance fields.
- Shared medium Actor arrays use `identityObserver=self`, exposing every
  projected Actor's authority Identity in one request.

### 2026-08-13 - Revision 1 artifacts

- Completed PRD Before/After, exact scope/non-goals, runtime impact, no-migration
  cutover, Prompt targets, frontend `None`, acceptance and rollback.
- Completed subtractive technical design and finite implementation tasks.
- Registered current Prompt projection gaps in the living runtime contract.
- No production code or production Prompt was modified.

### Revision 2 - Model-task ownership and trigger evidence

- All 20 model tasks were assigned a caller, trigger phase and disposition.
- Current ordinary-turn orchestration checks Daily and Pacing before low
  generation, then Social and Medium Calendar after commit.
- Opening World already writes Actor foundation and marks
  `directorFoundation=ready`; the independent Foundation path is recovery-only.
- Opening Scene Plan emits `elapsedMinutes/publicEventEn` that are not consumed,
  then invokes a separate low Dialogue Performer.
- Daily model output ownership overlaps deterministic time policy, Actor
  Runtime/Scene Transition, Appraisal/Schema and evidence-gated clue reveal.
- Revision 2 recommends 16 active tasks: retire Foundation, Opening Scene Plan,
  Opening Dialogue and Daily.

### Revision 2 - Call-frequency evidence

- Tina has 99 committed turns and 23 transactions containing a consumed Pacing
  beat. Each consumed beat requires a successful intervening Pacing assessment,
  so the proven lower bound is 23 calls / 99 turns (`>=23.2%`).
- Pacing kinds: 8 `new_actor`, 6 `mixed`, 4 `existing_actor_action`, 2
  `minor_mishap`, 1 `complication`, 1 `environmental_hook`, 1
  `causal_collision`.
- Fourteen new/mixed interventions prove that Pacing is a major cast-expansion
  writer, not merely a rare pacing safety valve.
- Social's exact historical calls cannot be reconstructed: State retains its
  cursor/review boundary but no task call ledger. Current normal review requires
  an Event boundary and at least ten turns; catch-up can loop up to five model
  batches.
- Retained revision history contains two High Calendar and two Medium Calendar
  commits; Tina has zero explicit Calendar commitment text hits.

### Revision 2 - Interior mount evidence

- Tina has two generated interiors and two matching
  `interiorMapBindings` entries.
- Generation and movement use the correct exact room binding:
  `parentMapId + parentRoomId/sourceContainerKey`.
- The same relation is persisted twice: on the child map and in
  `interiorMapBindings`.
- Map selector, Calendar locations and Scene destination discovery iterate all
  custom maps as flat peers and do not preserve the parent-room hierarchy.
- `parentWorldNodeId` is a world anchor, not the exact mount. Its fallback to
  `parentMapId` can produce a fake world-node ID for a custom parent map.
- Revision 2 proposes one `worldAnchorId + mount` authority and a derived
  runtime index.

### Revision 2 - Recommendation

- One static model-task registry and one deterministic event scheduler own all
  active model invocations.
- Pacing and Social remain separate but share a medium Scene quota and ledger.
- Pacing becomes causal-only and at most once per Scene.
- Medium Calendar loses direct per-turn/date-only triggering.
- Known preset container interiors do not call Interior Cartographer.
- No production code was changed during this investigation.

### Revision 2 - Implementation approval

- User explicitly approved Revision 2 with `开始进行`.
- Implementation starts with HPC-10; only one task is active at a time.

### HPC-10 - Authority and Actor proposal contracts

- Added one strict nested `ActorCreationProposalV1` normalizer/validator and
  Core/Runtime projectors.
- Opening World now proposes each Actor exactly once in `actorProposals[]`;
  old `actors + actorLibrary` output is rejected.
- Low temporary Actors use the same proposal contract with empty private and
  relationship facts.
- Low Performance and Scene Opening/Transition removed sibling
  Item/Material/Room payloads already owned by Authority Snapshot.
- Authority Snapshot omits hidden Items for low/medium audiences and removes
  duplicate room `materialEffects`.
- Tina build-only: Low System `27,221` (protected ceiling unchanged), Low User
  `23,117` (Before `33,294`), Low total `50,338`; Scene Opening total `38,450`;
  Medium Transition total `145,705`; zero model calls.
- Focused Revision 2 contract tests: 3/3 passed. Narrative Authority and Actor
  lifecycle focused suite: 32/32 passed.

### HPC-11/HPC-12 - Registry, scheduler, ledger and budgets

- Added one catalog accounting for all 20 current tasks: 16 active and four
  explicit retirement targets.
- Role API calls outside the raw model adapter were replaced with task-scoped
  scheduler requests. Local pre/post/Appraisal/translation and server inventory
  calls carry registered task IDs.
- Added bounded `modelTaskRuntime` counters, trigger/emitter/action/Scene
  diagnostics and one-medium-task-per-action quota.
- Added deterministic per-task budget policies and a section allocator that
  preserves protected sections and removes only whole oldest records.
- Focused registry/scheduler/allocator plus Narrative context suite: 16/16
  passed.

### HPC-13 - Bootstrap consolidation and Daily retirement

- Opening World is the sole bootstrap World/Actor/Story writer. The committed
  State now goes directly to low `scene_opening`; Opening Scene Plan and
  standalone Opening Dialogue have no caller or fallback.
- Director Foundation and Daily model paths were deleted. Incomplete bootstrap
  State fails explicitly, and all turn timing uses one deterministic policy.
- High Calendar bootstrap trigger is `opening_world`; the old task trigger and
  skip reason were removed.
- `modelTaskRuntime.byTaskId` contains exactly the 16 active tasks and no row
  for the four retired tasks. Lifecycle only deletes the two retired persisted
  State fields.
- Bootstrap Scene Opening Prompt and validator both enforce 2-6 segments and
  180-420 English words.
- Focused registry/bootstrap/High/Medium tests: 28/28 passed.
- Real Tina build-only after retirement:
  - Opening World `9,279`;
  - bootstrap Scene Opening `20,588`;
  - High Calendar opening-world trigger `14,299`;
  - Scene Performance System `27,221`, preserving the protected LowTier
    baseline;
  - save SHA-256, bytes and mtime unchanged.
- Broader legacy suites still contain task-port harnesses that must be updated
  during the owning tasks. Two previously recorded Revision 4 fixture failures
  remain: local legal-observer expectation and incomplete lifecycle cutover
  source boundary.

### HPC-14 - Causal-only Pacing and deferrable Social

- Pacing trigger analysis now emits only `causal_collapse_opportunity`; actor
  requests, roster gaps, repeated cast, long Scene, periodic review and filler
  reasons were removed.
- A Scene can be assessed at most once. The causal-only contract accepts
  `hold` or one `this_turn causal_collision` and rejects Actor admission,
  entrances, temporary Actors, mishaps and environmental filler.
- Pacing no longer retrieves local knowledge or sends full maps, absent Actor
  libraries, Scene archives or raw chat. It receives one causal slot, compact
  current Scene/location, relevant Actor directory, optional Item, eight
  committed Event summaries and eight prior causal facts.
- Real Tina Pacing fell from `111,077` to `7,569` characters; repair fell from
  `111,950` to `5,621`. The source save SHA-256, bytes and mtime were unchanged.
- Social handles `MODEL_TASK_DEFERRED` as `pending` with no failure/error and
  retains its derivable Event boundary. Catch-up performs at most one batch per
  invocation, and ordinary turns choose either one backfill batch or one normal
  review.
- Ordinary turns no longer call Medium Calendar directly. Date rollover was
  removed as a trigger; horizon, explicit commitment, successful High planning
  and manual execution remain.
- Causal reducer tests prove a valid intervention changes no Actor Core or
  Runtime count and only surfaces its matching causal record when consumed.
- Focused Pacing/Social/Medium and Social V3 tests: 31/31 passed.

### HPC-15 - Interior mount authority

- Added one atomic migration from generated-child
  `parentWorldNodeId/parentMapId/parentRoomId/sourceContainerKey` plus
  `interiorMapBindings` to `worldAnchorId + mount`.
- Migration validates every parent map/room, binding-to-child match, duplicate
  mount and world anchor before returning a cloned State. A second run is a
  no-op; any conflict leaves the source object unchanged.
- Interior generation and preset entry now persist only `worldAnchorId` and
  `mount`. The reverse lookup index is derived from custom maps.
- Movement, re-entry, label normalization, playable-state inspector reset,
  Scene destination discovery, map selector and Calendar location options all
  read the same mount authority.
- Map and Calendar selectors render child interiors under the mounted parent
  room. Existing mapId/roomId references remain stable.
- A registered `preset_interior_map:<id>` enters its topology with zero
  Cartographer calls; a missing registered preset fails explicitly instead of
  invoking the model.
- Real Tina clone migration: two mounted interiors and two removed legacy
  bindings; source SHA-256, bytes and mtime unchanged.
- Combined mount, scheduler, Pacing/Social, Calendar UI and facade tests:
  61/61 passed. Production legacy-field search now returns only the one-time
  migration reader/removal code.

### HPC-16/HPC-17 - Prompt, repair, local and native consolidation

- Scene Transition replaced the full Actor Library/current actor pair with one
  12-ID maximum `transitionActorCards` projection and replaced full map
  authority with a mounted location directory.
- Medium Calendar now receives one `existingSchedules` collection, compact
  story-beat slot refs, admitted Actor directory and location directory.
- Social now receives `socialAuthorityStamp`, batch-relevant graph/Event
  calibration and one transport JSON Schema; Narrative Authority and prose
  Schema copies were removed.
- Map Expansion sends one map authority payload and no raw `currentMapState`.
- Local structured calls send Schema only through Ollama `format`; post-turn
  sends narrative segments once and derives joined text server-side.
- Repair requests contain one canonical original request and no full System
  under `requiredSchema`; Scene Opening no longer repeats Authority/activation
  outside its original request.
- Native System uses one 13-key compact committed State, merged Actor cards,
  compact current Items and one player position. It excludes raw Items,
  itemStates, private Actor knowledge, full maps, Memory and Social Graph.
- Scheduler product targets now match the approved PRD and include transport
  Schema characters. Production enforcement is enabled before model calls.
- Final build-only hard-budget evidence:
  - Scene Transition `73,832`; repair `60,932`;
  - Medium Calendar `36,950`; repair `33,687`;
  - Scene Opening `29,939`; repair `19,001`;
  - Scene Performance `49,531`; repair `23,974`;
  - Social `76,624` including transport Schema;
  - Map Expansion `42,081`;
  - native System `19,724`;
  - local post-turn `10,385` / approximately `3,462` tokens.
- Initial/repair/native/local targets and conservative full `8,000` retrieval
  additions are executable assertions in `measure-prompts.mjs`.
- Protected LowTier System is exactly `27,221`; Tina source SHA-256, bytes and
  mtime remain unchanged.
- Repair/provenance/Narrative focused suite: 45/45 passed. Task 5 now has only
  the two previously recorded Revision 4 baseline fixture failures.

### HPC-18 - Final acceptance and fake API chain

- Syntax validation passed for every changed tracked/untracked JavaScript and
  MJS file; `git diff --check` passed.
- Real Tina build-only performed zero role/local calls, left SHA-256
  `d73dd33922f1775477ca6882117f5eb15e4a84fe5cdfa195953162d473c81b0f`,
  `6,728,739` bytes and mtime unchanged, and passed executable assertions for:
  - 24 retained role/repair/native captures;
  - five local Prompt targets;
  - three conservative full `8,000`-character retrieval variants;
  - exact LowTier System size `27,221`.
- Core scheduler, Prompt, repair, ACL, Calendar, mount, Social V3, local
  observer and witness regressions: 131/131 passed.
- Task 5: 16/18 passed. The two remaining failures are the pre-existing
  Revision 4 legal-observer expectation and incomplete synthetic lifecycle
  cutover boundary already recorded before this change.
- The assistant-authored fake API chain ran through real production builders,
  scheduler guards, validators and reducers:
  1. High Opening World: `7,344 / 20,000`;
  2. Low bootstrap Scene Opening: `5,263 / 40,000`;
  3. Medium causal Pacing: `3,737 / 65,000`;
  4. Low Scene Performance: `35,060 / 80,000`;
  5. Medium Scene Transition: `51,326 / 95,000`;
  6. Low post-transition Scene Opening: `17,788 / 40,000`.
- The fake chain ended in playing phase at turn 7, clock
  `1991-07-24 · 08:40`, Scene `hallway_second_delivery`, room `hallway`, with
  three Actors, one surfaced causal record and two committed opening Events.
- No production save or chat file was modified by acceptance.

### Revision 3 incident - Low contract mismatch

- The user explicitly approved full Low Prompt correction and removal of the
  automatic retry on 2026-08-14.
- Real failed turn evidence:
  - initial request `50,293 / 80,000`;
  - first response rejected for absent Item use, two `memoryUpdate` writes and
    two unproven historical claims;
  - repair fixed every issue except Harry's `memoryUpdate`;
  - turn remained 99 and no assistant message committed.
- Root contract mismatch:
  - Low Schema requests `impressionOfPlayerEn/memoryUpdate`;
  - proposal folding consumes only `firstImpressionOfPlayerEn`;
  - validator permits only first impression;
  - `ensureMentionedKnownActorMemories()` then reintroduces an Everyday
    `memoryUpdate` after settlement sanitation.
- Revision 3 pre-edit Tina build-only:
  - source SHA-256
    `8cc54cee4183433fcf8e7927e44d403f2140ef7498970274e462eca51ed1a2d3`;
  - bytes `6,713,154`, mtime unchanged by investigation;
  - Scene Performance `49,531`;
  - obsolete repair `23,974`;
  - Low System `27,221`.

### HPC-19 - Exact Low contract and single-call failure

- Scene Performance raw output is exactly
  `segments/stateProposals/signals`. Current impression, `memoryUpdate`,
  Appraisal, relationship, clue and legacy top-level update aliases are
  rejected before settlement.
- Same-response JSON recovery now emits only the current three-field contract.
  Settlement folds proposals once; the prior double-fold dependency on legacy
  `actorUpdates/itemUpdates` was removed.
- `social_hint` contains only
  `actorId/currentActivityEn/firstImpressionOfPlayerEn`. Mentioned-known-Actor
  admission guarantees presence/reaction only and creates no memory.
- `sceneProgression` and `pacingBeatRealized` conditional requirements are
  enforced by the raw contract and final validator.
- Bootstrap Scene Opening, Scene Performance and post-transition Scene Opening
  each perform one Low call. Parse, authority, provenance or validation failure
  throws immediately; no Low repair Prompt or fallback prose remains.
- Final real Tina build-only:
  - source SHA-256
    `8cc54cee4183433fcf8e7927e44d403f2140ef7498970274e462eca51ed1a2d3`;
  - `6,713,154` bytes and mtime unchanged;
  - Scene Performance `49,509 / 80,000`;
  - Scene Opening `29,939 / 40,000`;
  - bootstrap Scene Opening `20,588 / 40,000`;
  - Low System `27,199`, below the approved `27,221` ceiling; the protected
    203-character content was not rewritten;
  - `scenePerformance.repair1` and `sceneOpening.repair1` absent.
- The fake API chain passed all six production builder/scheduler/validator/
  reducer steps and ended at turn 7 in `hallway_second_delivery`.
- Focused Low, Opening, Item and contract regressions: `71/71` passed. Current
  production-contract core regressions: `142/142` passed. Task 5 remains at
  its recorded `16/18` baseline with the same legal-observer and incomplete
  lifecycle-cutover fixture failures.
- A wider stale-harness run passed `161/171`; its ten failures are confined to
  removed Director exports, the old absent-Item Authority expectation and
  pre-scheduler port fixtures. No compatibility exports or old payload readers
  were restored for those tests.
- `git diff --check` and syntax checks for every HPC-19 production file passed.

### Revision 4 incident - scheduler self-invalidates Appraisal

- Latest real Tina archive at investigation start:
  - SHA-256
    `68aec52b641d3190c49a5200d298484a68b4902a58dc80c8d85b3cc389e4910e`;
  - `6,711,223` bytes; mtime `1786671249192.3303`;
  - turn remains 99, no assistant message committed.
- Scene Performance used one `50,271 / 80,000` request, returned 303 words in
  seven segments and passed all validation.
- `local_appraisal_proposer` returned zero proposals. The turn then failed with
  `Rejected stale post-turn Appraisal result.`
- Production root cause:
  - scheduler attempt/outcome persistence calls guarded `saveMetadata()`,
    advancing and replacing live State;
  - turn workflow retained the pre-save State object and compared exact
    `stateRevision`;
  - scheduler outcome counters were also written to the replaced object, so
    persisted task rows retained attempts but lost successes.
- Revision history advanced from 69 through 75 during operational ledger/error
  saves. Persisted Scene Performance, translation, observer and Appraisal rows
  all showed `succeeded = 0` despite successful responses.
- Task 8 contained the intended stale-Appraisal coverage but still constructed
  pre-scheduler workflow ports and failed before reaching those assertions. It
  was incorrectly excluded as a stale harness during prior acceptance.
- Investigation was read-only; final SHA/bytes/mtime matched the starting
  values exactly.

### HPC-20 - Scheduler live-State and boundary-guard repair

- Scheduler reacquires live State after attempt persistence before recording
  success or failure. Persistence-replacement tests prove attempted,
  succeeded, failed and medium quota rows survive.
- Scheduler saves use `source/domain=model_task_runtime`. Revision domain
  detection excludes the ledger from `world`.
- Appraisal and Memory guards accept a revision delta only when every
  intervening history entry is contiguous and exactly
  `model_task_runtime`-only. Timeline, turn, Scene, clock, boundary and all
  business revisions remain stale.
- Turn settlement refreshes its reducer base from live State and merges the
  latest live task ledger after Appraisal before commit.
- Task 8 was migrated from old generic model ports to current task-specific
  ports and current Event/Appraisal contracts. It now reaches and passes the
  Appraisal success, fallback, true-stale, ledger retention and Scene
  Transition assertions.
- Project governance Skill now requires scheduler/registry/application
  wiring/port/module/export changes to migrate every affected harness in the
  same task; setup failures cannot be waived as legacy acceptance.
- Verification:
  - focused scheduler/guard contract `20/20`;
  - Task 8 production harness `9/9`;
  - save-revision guard/integration `42/42`;
  - Social V3 `9/9`;
  - current core suite including Task 8 `152/152`;
  - Task 5 remains at its recorded unrelated `16/18` baseline.
- Real Tina build-only and six-step fake API chain passed. Prompt contents,
  budgets and model-call counts are unchanged; blind Prompt simulation is not
  applicable to this runtime-only change.
- Final Tina SHA-256
  `68aec52b641d3190c49a5200d298484a68b4902a58dc80c8d85b3cc389e4910e`,
  `6,711,223` bytes and mtime `1786671249192.3303`, unchanged.
- `utree flush`, production/test syntax checks and `git diff --check` passed.

## Artifacts

- [PRD](./prd.md)
- [Technical spec](./spec.md)
- [Tasks](./tasks.md)
- [Checklist](./checklist.md)
- [Living field registry](../hogwarts-runtime-contracts/state-fields.md)
- [Build-only measurement](./measure-prompts.mjs)
