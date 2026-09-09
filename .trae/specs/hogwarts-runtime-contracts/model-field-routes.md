# Hogwarts Model Field-Route Registry

## Status and Scope

This is the readable route authority for fields that cross a Hogwarts model
task, Prompt projection, output Schema, model router, validator carrier, or
Reducer boundary.

- `state-fields.md` remains authoritative for persisted State meaning and
  writers.
- This registry records model-facing source, audience, admission, route edges,
  consumers, validation, and no-change/failure behavior.
- A field is not interchangeable with a same-named or related field unless
  this document explicitly says so.
- This initial revision backfills the current Immediate Post Item/Identity
  chain. It is not a claim that every model task in the repository is already
  registered. Any new or changed route must add its rows before implementation.

## Reading a Route

| Column | Meaning |
| --- | --- |
| `ID` | Stable route identifier used by code/module headers, PRDs, Specs, tests, and reviews. |
| `Source` | Canonical State/message/derived/model source. |
| `Admission` | Deterministic condition for including the field. |
| `Audience` | Exact task/provider/model boundary that sees it. |
| `Edge / consumers` | Immediate readers and every later model task it can wake. |
| `Validation / writer` | Parser/guard and the only State writer, or explicit no-State result. |

## Current Immediate Post Routes

| ID | Field / source | Meaning and admission | Audience | Edge / consumers | Validation / writer / failure | Focused owner |
| --- | --- | --- | --- | --- | --- | --- |
| `vcon013.input.playerAction` | Current player message text. | Raw action context, not proof that an Item operation succeeded. Always included; max 8,000 only on the Dynamic Inventory contract. | Selected Low or Local VCON-013; retained Local Dynamic Inventory. | Low/Local Post; Dynamic Item evidence source. Does not wake a task itself. | Protected Prompt input. Item evidence guard checks exact source substring. No writer. | Post provider and Inventory contract suites. |
| `vcon013.input.narrativeSegments` | Paid `transaction.segments[].textEn`. | Already-written narration evidence; not a State proposal or route decision. Current segments are included atomically. | Selected Low or Local VCON-013; Local shared Dynamic Turn. | Post evidence; Dynamic Item/Identity evidence. Does not wake a task itself. | Protected Prompt input. Item/Identity evidence guards require exact source substring. No writer. | Post, Dynamic Inventory, Dynamic Identity suites. |
| `vcon013.input.targetActorIds` | Addressing IDs plus `checkResolution.target.actorId`. | Bounded known Actor context for core Post; it is not proof of injury. Empty when no known target. | Selected Low or Local VCON-013. | Core Post; current Check target also participates in Dynamic Identity routing. | Existing Actor/target guards. No writer. | Post contract and Identity route suites. |
| `vcon013.input.itemCandidates` | Canonical `state.items[]` through `selectPostItemContext()`. | Provider-neutral deterministic subset: independent room-material `whole/remains` Items, or holder-followed Items directly identified by action/narration or exact directive. It is Item context, never Item evidence or State. | Low VCON-013 only. | Low may reference only supplied stable IDs in `inventoryUpdates[]`; it wakes no model task. | Low strict transport + Dynamic Inventory input Zod/guard/projector; Item Reducer only. Invalid proposals write no Item. | Post Item context and provider suites. |
| `vcon013.input.identityTargetActorIds` | Valid current `checkResolution.target.actorId`, constrained to supplied Actors. | Direct-injury eligibility for Low only, not evidence that an Actor is injured. `inspectionTargetActorIds` is the narrower no-visible-injury set. | Low VCON-013 only. | Low may emit bounded `identityObservations[]`; it wakes no model task. | Low strict transport + Dynamic Identity target/narration/inspection guards; Identity Reducer only. | Post provider and Dynamic Identity suites. |
| `vcon013.input.inspectionTargetActorIds` | Current perception Check target intersected with `identityTargetActorIds`. | Eligibility for a Low `no_visible_injury` proposal only; it is not proof of an examination or health. | Low VCON-013 only. | Constrains Low Identity output; it wakes no model task. | Dynamic Identity inspection guard; Identity Reducer only. | Post provider and Dynamic Identity suites. |
| `vcon013.result.materialEvents` | Selected Post final-content JSON. | Independent candidate physical changes; each record is proposal-only and must be grounded in current action/narration. | Low or Local VCON-013 settlement. | Accepted records enter `turnTransaction.materialEvents`; no model task wake. | Family-local Schema/language/evidence/ID guards; Material Reducer only. Invalid records are omitted and cannot fail sibling families. | Post failure-isolation and Material suites. |
| `vcon013.result.actorUpdates` | Selected Post final-content JSON. | Independent candidate NPC activity/presence/location changes; never a player update. | Low or Local VCON-013 settlement. | Accepted records enter `turnTransaction.actorUpdates`; no model task wake. | Family-local Schema/language/Actor/room/evidence guards; Actor/Presence Reducers only. Invalid records are omitted and cannot fail sibling families. | Post failure-isolation and Actor/Presence suites. |
| `vcon013.result.inventoryObservationRequired` | Boolean in the Local core VCON-013 result; Low always returns `false`. | Local-only route request: true means completed action/narration may establish an Item operation or durable candidate. It is not an Item proposal and never writes State. | Local VCON-013. | Only Local `true` wakes `local_dynamic_turn_observer` with its Inventory section. Low never consumes it. | Family-local Boolean parse; missing/invalid normalizes to `false`. Dynamic failure omits auxiliary proposals; no writer. | Post failure-isolation, Post provider and Dynamic Turn suites. |
| `vcon013.result.perception` | Selected Post final-content JSON. | One optional perception proposal for witness/Event derivation. Its participant list is NPC-only at persistence boundaries; reserved `player`, duplicates and unknown IDs are removed. | Low or Local VCON-013 settlement. | Accepted perception may derive witness resolution and one observed Event; no model task wake. | Family-local Schema/evidence/concealment guard and request-Actor ID normalization; Event reducer only. Invalid perception omits the complete perception/witness/Event family without failing sibling families. | Post failure-isolation and witness resolver suites. |
| `vcon013.result.temporalClaims` | Selected Post final-content JSON. | Independent narrative time assertions used only for validation diagnostics; never elapsed-time, clock or Calendar authority. | Low or Local VCON-013 settlement. | No model task wake and no State writer. | Per-record Schema/evidence/normalization guard. Invalid claims are omitted individually and cannot fail sibling families. | Post failure-isolation and time suites. |
| `vcon013.result.playerMovement` | Selected Post final-content JSON constrained by deterministic `MovementPreflightV2`. | Candidate description of whether an explicit eligible movement completed; absent authority when no marker exists. | Low or Local VCON-013 settlement. | Accepted candidate enters the Movement Reducer; no model task wake. | No marker discards candidate; ineligible/already-there preflight settles deterministic no movement; harmless extras normalize away; missing/evidence/destination/required-guide uncertainty for eligible movement blocks the whole Post. Movement Reducer is sole writer. | Post failure-isolation and movement settlement suites. |
| `dynamic.requestedTasks` | Derived from `inventoryObservationRequired` and valid Check target. | Names exactly `inventory` and/or `identity` sections requested for one completed turn. It is not model evidence or State. | Shared Local `local_dynamic_turn_observer` System/User request. | Determines whether one shared 4B request starts. Empty means zero model calls. | Dynamic request builder; no writer. Failure omits requested auxiliary proposals. | Dynamic Turn observer suite. |
| `dynamic.inventory.items` | `selectPostItemContext()` over canonical `state.items[]`. | Same provider-neutral selected subset as `vcon013.input.itemCandidates`; it is context only, not evidence. | Local shared Dynamic Inventory section only. | Lets Local 4B reuse stable Item IDs in `inventoryUpdates[]`. It does not wake the Dynamic task; Local `inventoryObservationRequired` does. | Input Zod validates shape/unique IDs. Item evidence/transition guard and Item Reducer remain authority. Failure writes no Item. | Dynamic Inventory and Post Item context suites. |
| `dynamic.identityTargetActorIds` | Valid `checkResolution.target.actorId`, constrained to supplied Actors. | Direct-injury observation route eligibility, not evidence that the Actor is injured. `inspectionTargetActorIds` is the narrower no-visible-injury eligibility set. | Current Local shared Dynamic Identity section. | Valid nonempty target starts the shared 4B Identity section. | Input Zod target membership; narration/segment/confidence/inspection guards; Identity Reducer only. Failure writes no Identity. | Dynamic Identity suite. |
| `dynamic.result.inventoryUpdates` | Dynamic 4B result using `INVENTORY_OBSERVATION_RESULT_DESCRIPTOR`. | Candidate Item operations only. Each requires stable ID/evidence item text/evidence source/confidence; not accepted State. | Local Dynamic result -> client adapter. | Projected into `turnTransaction.itemUpdates[]`; no model task wake. | Descriptor/Zod, evidence, English, ID, custody, transition and Item guards; Item Reducer sole writer. Invalid candidates are omitted. | Dynamic Inventory and Item reducer suites. |
| `dynamic.result.identityObservations` | Dynamic 4B result using `DYNAMIC_IDENTITY_RESULT_DESCRIPTOR`. | Candidate direct visible-injury or deliberate no-visible-injury observation. Not broad Identity extraction and not accepted State. | Local Dynamic result -> client adapter. | Normalized into `turnTransaction.identityObservations[]`; no model task wake. | Descriptor/Zod, route Actor, narration segment, inspection and confidence guards; Identity Reducer sole writer. Invalid candidates are omitted. | Dynamic Identity and Identity reducer suites. |
| `vcon013.result.inventoryUpdates` | Low final-content JSON using `INVENTORY_OBSERVATION_RESULT_DESCRIPTOR`-compatible records. | Candidate Item operations grounded in current action/narration. It is not accepted State. | Low settlement endpoint -> client adapter. | Projected into `turnTransaction.itemUpdates[]`; it never wakes Dynamic 4B. | Family-local Schema plus Dynamic Inventory evidence/language/ID/transition guards; Item Reducer only. Invalid records are omitted and cannot fail sibling families. | Post failure-isolation, Post provider and Dynamic Inventory suites. |
| `vcon013.result.identityObservations` | Low final-content JSON using `DYNAMIC_IDENTITY_RESULT_DESCRIPTOR`-compatible records. | Candidate direct visible-injury or deliberate no-visible-injury observation. It is not broad Identity extraction or accepted State. | Low settlement endpoint -> client adapter. | Normalized into `turnTransaction.identityObservations[]`; it never wakes Dynamic 4B. | Family-local Schema plus Dynamic Identity target/narration/inspection/confidence guards; Identity Reducer only. Invalid records are omitted and cannot fail sibling families. | Post failure-isolation, Post provider and Dynamic Identity suites. |
| `turnTransaction.itemUpdates` | Existing transient turn carrier after Item proposal projection. | Validated Item operations awaiting turn settlement. It is not `state.items[]`. | Turn validation/reducer only. | Existing Item partition/validation. Does not wake a model. | `validateItemUpdates` plus Item authority; Item Reducer only. Invalid entries write nothing. | Turn validation and Item reducer suites. |
| `turnTransaction.identityObservations` | Existing transient turn carrier after Identity normalizer. | Validated direct injury observations awaiting settlement. It is not full Actor Identity State. | Turn validation/reducer only. | Existing Identity validation. Does not wake a model. | `normalizeNpcIdentityObservation` and Identity guards; Identity Reducer only. Invalid entries write nothing. | Turn validation and Identity reducer suites. |
| `scene.itemStates` | Derived snapshot from `state.items[]`; State meaning is in `state-fields.md`. | Scene/archive snapshot of formal Item state. Current projector follows player `carried/equipped` Items to the current map/room. | Scene/Archive consumers; may be used by their documented prompt projections. | It is not a current Post/Dynamic Item input and wakes no Post task. | Derived only; no writer. It must not be substituted for `dynamic.inventory.items`. | Inventory projection suite. |
| `sceneTransition.result.languageSkipped` | Transient result from `generateSceneTransitionPackage()` after language adoption rejects non-English authority fields. | `true` means no transition package exists; diagnostics explain the rejected fields but are not State or player-visible raw error text. | Ordinary Scene Transition and Calendar/Timeline Moment workflows. | Stops the current transition before Scene Opening; wakes no model task. | Language-adoption check; no State writer. The caller must leave Scene, clock, Calendar, archive, and chat unchanged, without retry or fallback. | Scene Transition and Calendar Moment suites. |

## Scene Narrative Admission Routes

| ID | Field / source | Meaning and admission | Audience | Edge / consumers | Validation / writer / failure | Focused owner |
| --- | --- | --- | --- | --- | --- |
| `scene_opening.bootstrap.result.segments` | Low `scene_opening` bootstrap response parsed by `generateBootstrapSceneOpening()`. | Player-visible initial narration. Segment and total-word ranges are Prompt-quality targets, never rejection grounds. Each retained segment must have an allowed shape, nonempty text, valid language evidence, and a present speaker when dialogue. | Bootstrap opening workflow. | Existing opening message writer only; wakes no model task. | Shape/language/speaker checks remain hard. The opening message writer is the sole writer of `extra.hogwartsMud.segments[]`; invalid shape writes no message. | Opening workflow and validation suites. |
| `scene_opening.transition.result.segments` | Low `scene_opening` response parsed by `generateSceneTransitionOpening()`. | Player-visible opening for an already-valid next Scene. Segment count is a Prompt-quality target, never a rejection ground. | Ordinary, Calendar, and Timeline Scene Transition workflows. | Attached to `nextScene.openingSegments`, then consumed by the Scene Transition reducer/message writer; wakes no model task. | Shape/language/present-speaker and narrative-authority checks remain hard. On a retained hard failure, no opening or transition commits. | Scene Transition and Calendar Moment suites. |
| `scene_transition.result.globalChronicleSummaryEn` | Medium/High `scene_transition` response. | English cross-Scene chronicle prose. Word/character ranges are Prompt-quality targets, never rejection grounds. | Scene Transition validator and archive reducer. | Written once to `globalChronicle.entries[].summaryEn`; wakes no model task. | Nonempty English authority and existing archive/transition guards remain hard. Invalid authority writes no Scene/archive/chronicle. | Scene Transition suite. |
| `scene_transition.result.authorQuillEn` | Medium/High `scene_transition` response. | Optional player-facing editorial commentary for the closing Scene. Word range is a Prompt-quality target, never a rejection ground. | Archive/message projection. | Stored only with the closing Scene/archive presentation; wakes no model task. | Existing language/shape checks remain hard. It never writes world facts or changes any reducer decision. | Scene Transition suite. |
| `scene_transition.result.nextScene.explorationHookEn` | Medium/High `scene_transition` response under `nextScene`. | Optional English interaction cue for the next Scene. Absence and word range are never rejection grounds; absence remains absent, and supplied prose is subject to English authority adoption. | Scene Transition reducer and Low Scene Opening Prompt. | Written to `scene.explorationHookEn` only when supplied; read as optional opening context and wakes no model task. | It cannot itself create Item, relationship, map, Calendar, or Event State. Destination/Scene guards remain hard. | Scene Transition suite. |

## Role Slot Capacity Routes

| ID | Field / source | Meaning and admission | Audience | Edge / consumers | Validation / writer / failure | Focused owner |
| --- | --- | --- | --- | --- | --- |
| `role_capacity.input.slot` | `modelSlots.<low|medium|high>.contextSize/maxResponseLength` through `createContextBudgetPlan(...).maxPromptCharacters`. | User-configured selected-role total Prompt capacity; admitted only by `modelEventScheduler.runRoleTask()` after task/tier validation. It is not a task-specific static budget or a Local `num_ctx` setting. | Every active role request through the public scheduler. | The scheduler is the only consumer; the adapter exposes only its scheduler-bound invoker and receives the unchanged approved request. It wakes no extra task. | Complete-request measurement must fit this capacity. On no-fit: zero provider calls, no retry/fallback, no business State write. | Role-slot capacity eligibility suite. |
| `role_capacity.measurement.completeRequest` | `measurePromptMessages()` over System, User, transport Schema, and runtime wrapper from `createRoleTransportEnvelope()`. | Complete provider-visible request size; not a Prompt projection and not persisted Prompt text. | Public scheduler and bounded turn diagnostics. | The scheduler measures the envelope and the adapter sends that same envelope. Compared only to `role_capacity.input.slot`; static policy targets may be diagnostic metadata but cannot gate role dispatch. | Runtime capacity is the sole hard comparator. Bounded diagnostics record sizes only; no writer of business State. | Role-slot capacity eligibility suite. |

## Role Response Channel Routes

| ID | Field / source | Meaning and admission | Audience | Edge / consumers | Validation / writer / failure | Focused owner |
| --- | --- | --- | --- | --- | --- | --- |
| `role_response.finalContent` | Final provider `content` returned through Connection Manager. | Sole model text eligible for a Hogwarts task parser. Empty content remains empty even when the provider emits reasoning. | Every active Low/Medium/High Hogwarts role task. | Exact owning task parser, then its existing Schema/guards/Reducer. It wakes no additional task. | Existing task parser and validator remain authority. Empty/invalid content follows the original one-call no-write failure; no reasoning fallback, retry, repair or provider fallback. | Model adapter response-authority suite plus affected task suites. |
| `role_response.reasoning` | Provider reasoning channel, including `response.reasoning` and `chunk.state.reasoning`. | Transport-only text discarded at the Hogwarts adapter boundary. It is never task output, evidence, activity copy or fallback content. | No Prompt, parser, validator, Reducer or player-facing semantic audience. | No consumer and no task wake. Foreground progress uses finite scheduler activity metadata only. | No writer. Must be absent from State, chat, TranslationTable, Knowledge, archive, DOM/accessibility tree and browser storage. | Model adapter response-authority suite and foreground activity acceptance. |

## Non-Substitutability Rule

These three fields describe related Items but serve different audiences:

| Field | Source / selector | May substitute for another? |
| --- | --- | --- |
| `scene.itemStates` | Scene snapshot; player carried/equipped Item follows into current room. | No. It is unsafe as Post context because it includes holder-followed Items. |
| `dynamic.inventory.items` | Provider-neutral selected formal Item context used by Local Dynamic only. | No. Its audience is Local Dynamic; Low receives `vcon013.input.itemCandidates` directly. |
| `vcon013.input.itemCandidates` | Provider-neutral selected formal Item context used by Low. | No. Its audience is Low VCON-013; it cannot be replaced by the Scene snapshot or full State Inventory. |

## Maintenance Checklist

Approved implementation in progress:
[Narrative-First Post Settlement Revision 1](../hogwarts-narrative-first-post-settlement/spec.md#3-field-routes).
The following rows register the replacement boundary before code cutover.
They supersede the overlapping Scene/Post duties when that implementation lands;
the progress file records which boundaries have actually migrated.

| Route ID | Source / selector / schema | Audience and consumers | Guard / sole writer / failure | Test owner |
| --- | --- | --- | --- | --- |
| `vcon007.result.segments` | Parsed final Scene object; all nonempty string display segments, ordered | Message display, localization and frozen current-turn recovery; no new model edge | Preservation before auxiliary validation; message writer only until commit; no synthetic text | narrative-preservation |
| `vcon007.result.speakers` | Optional message-local `{id,displayNameEn}` declarations | Message labels and Post promotion input, not Actor Library | Invalid/colliding label uses unresolved display; no identity/ACL admission | narrative-preservation |
| `vcon013.input.sceneAuthority` | Bounded current Actor/room, Check, movement preflight and pending beat from canonical context | Initial and supplement Post; no additional task | Protected snapshot and revision/source guards; no State writer | post-recovery |
| `vcon013.input.speakerDeclarations` | Frozen Scene local labels | Post temporary-Actor family | Evidence only; cannot substitute for admitted Actor or inherit knowledge | post-recovery |
| `vcon013.input.historicalSupport` | Bounded same-speaker authorized Event refs from Scene context | Post historical-claim validation | Exact source/ACL lookup; not shared private history; no writer | post-recovery |
| `vcon013.result.temporaryActors` | Post ActorCreationProposal with source reference | Existing Actor promotion then dependent updates | Existing promotion guards; one Actor writer; invalid dependencies grouped | post-recovery |
| `vcon013.result.firstImpressions` | Post existing first-meeting hint | Existing initial-impression adopter | First-meeting/evidence guards only; no arbitrary Social update | post-recovery |
| `vcon013.result.sceneProgression` | Post type/summary and exact segment evidence | Committed timeline/Event only after admission | Invalid -> no semantic progression; excerpt not authority | post-recovery |
| `vcon013.result.pacingRealization` | Post pending beat ID, Boolean and evidence | Existing consumePacingBeat, only at commit | Exact beat and validated true; missing/false retains pending | post-recovery |
| `vcon013.result.historicalClaims` | Post segment/speaker/claim/source Event IDs | Existing reported-provenance route | Same-speaker authorized evidence; invalid metadata omitted, dialogue retained | post-recovery |
| `vcon013.input.recoveryTargets` | Workflow-issued unresolved slot/group IDs, bounded reasons and available target identity from `post-record-target.js` | One manual selected Post; defines output allowlist and record matching | Each supplied target field must match; unrelated targets cannot consume a known failed slot; accepted records immutable; shape/language/domain rejection preserves target before filtering | post-recovery, post-bookkeeping |
| `vcon013.input.acceptedConstraints` | Valid frozen operation identities and dependency refs | Supplement, read-only | Reject collisions; no regeneration of accepted results | post-recovery |
| `turn.recovery.accepted/failures` | Parsed/guarded draft records and unresolved group descriptors, including language-rejected records and incomplete Local Inventory routing | Recovery UI and final assembler | Pending only; never committed Knowledge or State by itself; invalid Local route creates an Inventory recovery family, not automatic Dynamic or completed assessment | post-recovery, post-bookkeeping |
| `turn.recovery.supplement` | Persisted available/reserved/spent attempt and selected groups | Explicit recovery command; no automatic edge | Atomic reserve before dispatch; refresh/double click cannot reissue | post-recovery |
| `turn.recovery.fallbackExcerpt` | Exact last narration excerpt, max48 whitespace words | Message-local display only | Never publicEventEn, verified Event, witness or Appraisal input | post-recovery |

Existing `vcon013.result.actorUpdates` and `inventoryUpdates` become the sole
structured sources for their former Scene equivalents. Their owning domain guards
and Item/Presence authority stay unchanged. Initial Low has no Dynamic call;
initial Local may route one shared Dynamic; supplement has no Dynamic route.

For every changed route:

1. add or update its row here and its `state-fields.md` link when persisted;
2. add the route ID to the affected module header;
3. list source, selector, Schema, route edge, consumers, guard, writer, and
   failure behavior in the PRD/Spec;
4. add direct focused tests for important inclusion/exclusion and any model-call
   edge;
5. delete obsolete rows only after their caller, Schema path, and tests are
   retired in the same approved change.
