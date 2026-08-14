# Hogwarts Prompt Payload Consolidation Checklist

## Governance

- [x] Stable change ID is distinct from the completed timeline/Appraisal lifecycle change.
- [x] Five authoritative change files exist.
- [x] Production call graph is complete.
- [x] Living runtime contract is reconciled.
- [x] Revision 2 receives explicit implementation approval.

## Model Call Inventory

- [x] Every role-model initial call is inventoried.
- [x] Every role-model repair/retry call is inventoried.
- [x] Every local semantic model call is inventoried.
- [x] Translation model calls are inventoried.
- [x] Prompt-less embedding, retrieval and deterministic calls are separated from generative calls.
- [x] All 20 current tasks have caller, trigger phase and keep/retire disposition.
- [x] Current direct task-to-task call chains are mapped.

## Real Prompt Measurement

- [x] Active Tina runtime ceilings are derived from model slots.
- [x] Every production builder and repair path is built without a model call.
- [x] System, User, embedded/transport Schema and total sizes are recorded.
- [x] Per-field serialized sizes and largest fields are recorded.
- [x] Generic trimming order and protected fields are verified; active Tina role Prompts do not trigger trimming.
- [x] Local post-turn `4096` context overflow is recorded separately from role ceilings.
- [x] Tina SHA-256, bytes and mtime are unchanged.

## Audit Findings

- [x] Every injected semantic fact names one authority owner.
- [x] Active legacy Prompt names and old Actor proposal fields are identified.
- [x] Full Actor Library, map State, Social calibration and archive injections are measured.
- [x] Repeated Event/relationship/Identity/Calendar/Item/Scene payloads are quantified.
- [x] Shared self-Identity and hidden-Item exposure risks are mapped.
- [x] Opening/Pacing Prompt Schema, validator and Actor V1 reducer mismatch is mapped.
- [x] Repair subtree duplication is measured.
- [x] Opening World is proven to own Foundation on successful commit.
- [x] Opening Plan and Dialogue are proven to be removable in favor of low Scene Opening.
- [x] Daily responsibilities are mapped to deterministic/existing owners.
- [x] Pacing and Social are proven to require separate temporal contracts.
- [x] Tina proves at least 23 successful Pacing calls in 99 turns.
- [x] Exact Social call count is proven unavailable without a task ledger.
- [x] Interior container write, binding, movement and flattened-reader paths are mapped.

## Implementation Acceptance

- [x] Sixteen active tasks are registered; four retired tasks have no runtime entry.
- [x] Scheduler is the sole model-task caller and records emitter/event/phase.
- [x] Task ledger is bounded, reload-idempotent and stores no Prompt/response.
- [x] Events sharing one player `actionId` cannot synchronously invoke more than one medium task.
- [x] Bootstrap uses Opening World + Scene Opening only.
- [x] Foundation, Opening Plan, Opening Dialogue and Daily have no caller/fallback.
- [x] Pacing is causal-only and at most once per Scene.
- [x] Social uses the shared medium quota without merging its Prompt into Pacing.
- [x] Medium Calendar has no direct per-turn caller and no date-only trigger.
- [x] Interior mount uses one `worldAnchorId + mount` authority.
- [x] `interiorMapBindings/sourceContainerKey/parentMapId/parentRoomId` legacy fields are removed after atomic migration.
- [x] Map UI, Calendar and Scene destination readers preserve parent-room hierarchy.
- [x] Registered preset containers do not invoke Interior Cartographer.
- [x] No full Actor Library, raw Social Graph, raw Memory ledger, raw map State or full Scene archive enters a Prompt.
- [x] Every task uses one actor-ID whitelist and one task Actor card per actor.
- [x] Medium/low tasks cannot read unrelated Actor self-Identity or hidden Item.
- [x] Authority Snapshot has no Item/Material/Room sibling duplicate.
- [x] Medium Calendar has one existing-schedule collection.
- [x] Map Expansion has one map authority payload.
- [x] Daily/Pacing use compact committed history rather than raw transcript/archive.
- [x] Social uses batch-relevant calibration and one machine Schema.
- [x] Local structured calls carry one Schema; post-turn carries one narrative copy.
- [x] Opening/Low temporary Actor proposals use the approved V1 nested contract; Pacing creates no Actor.
- [x] Prompt Schema required fields equal validator required fields.
- [x] Repair envelopes contain each semantic subtree once.
- [x] All PRD role/local/repair/native budgets pass.
- [x] Full-cap `8,000` character retrieval projections pass affected task budgets.
- [x] Protected System, output Schema, player action and Authority Snapshot are never truncated.
- [x] LowTier extra 203 characters remain byte-identical.
- [x] Focused tests and Hogwarts regressions pass.
- [x] Approved real affected workflow succeeds.

## Revision 3 Low Contract

- [x] Real Tina failure evidence identifies initial and repair validation
  errors without modifying the save.
- [x] Low Prompt exposes no `impressionOfPlayerEn` or `memoryUpdate`.
- [x] Mentioned-known-Actor admission creates no memory/Appraisal proposal.
- [x] Every Low proposal type has exactly the fields consumed by settlement and
  accepted by validation.
- [x] `sceneProgression` and `pacingBeatRealized` requiredness matches the
  validator.
- [x] Invalid Low output performs one role call and zero repair calls.
- [x] Scene Performance and Scene Opening repair captures are absent from
  build-only inventory.
- [x] Real Tina Prompt budget and protected Low System content pass.

## Revision 4 Scheduler Persistence

- [x] Latest Tina evidence proves Low succeeded and Appraisal guard caused the
  failure without modifying the save.
- [x] Scheduler success/failure writes reacquire the current live State after
  attempt persistence.
- [x] `model_task_runtime` revisions are separately identified in revision
  history and do not carry `world` domain.
- [x] Appraisal and Memory guards accept only contiguous ledger-only revision
  deltas while rejecting genuine business staleness.
- [x] Turn reducer refreshes its live base and preserves the latest task ledger.
- [x] Task 8 and every scheduler/application-port harness use current ports and
  reach their intended business assertions.
- [x] Latest failed-turn production harness commits with one Low call and no
  repair.
- [x] Focused regressions, real-save no-write verification and `git diff
  --check` pass.

## Approval

- [x] PRD Before/After, scope, budgets, migration, frontend whitelist and acceptance criteria are complete.
- [x] Technical spec maps every removal and replacement.
- [x] Implementation started only after explicit Revision 2 approval.
- [x] Revision 3 implementation was explicitly requested on 2026-08-14.
- [x] Revision 4 implementation was explicitly requested on 2026-08-14.
