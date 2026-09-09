# Hogwarts Validation Responsibility Registry

> Human-readable companion to `VALIDATION_RESPONSIBILITY_REGISTRY.json`.
> Update both files in the same owning-system change; JSON remains authority.

Registry version: 1

## Mechanism Boundary

| Mechanism | Owns | Forbidden |
| --- | --- | --- |
| `regex_shape` | Character shape and explicitly finite grammar. | Natural-language intent, truth, injury, perception, relationship, Item, Spell, Calendar or other prose meaning. |
| `embedding_retrieval` | Candidate recall and ranking over committed canonical records. | Truth, equality, provenance, authorization, rejection or State mutation. |
| `local_semantic_model` | Bounded natural-language interpretation emitted as structured proposals with source references. | Direct State writes, invented authority, automatic repair or semantic regex fallback. |
| `paid_narrative_model` | Player-facing narrative and explicitly registered legacy proposal tasks. | Direct State authority or unregistered validation semantics. |
| `deterministic_schema` | Exact shape, key sets, types, enums and size bounds. | Guessing missing prose meaning. |
| `deterministic_guard` | IDs, references, evidence, ACL, provenance, arithmetic, idempotency and legal transitions. | Replacing semantic interpretation with keywords or similarity thresholds. |
| `reducer` | Sole atomic State settlement for an approved domain. | Accepting unvalidated model, embedding or regex claims. |
| `legacy_state_writer` | Frozen current workflow-owned settlement recorded only to expose migration debt. | Any new contract or promotion to compliant status. |
| `no_state_writer` | Display-only or candidate-only output that cannot write world State. | Implicit persistence or later promotion without a registered contract revision. |

## Registered Writer Owners

| Writer owner | Mechanism |
| --- | --- |
| `none` | `no_state_writer` |
| `character_setup_workflow` | `legacy_state_writer` |
| `opening_world_reducer` | `reducer` |
| `calendar_reducer` | `reducer` |
| `calendar_medium_horizon_workflow` | `legacy_state_writer` |
| `interior_map_reducer` | `reducer` |
| `interior_map_generation_workflow` | `legacy_state_writer` |
| `pacing_reducer` | `reducer` |
| `pacing_failure_workflow` | `legacy_state_writer` |
| `turn_reducer` | `reducer` |
| `scene_transition_reducer` | `reducer` |
| `scene_opening_message_writer` | `legacy_state_writer` |
| `social_v3_reducer` | `reducer` |
| `social_memory_workflow` | `legacy_state_writer` |
| `map_reducer` | `reducer` |
| `turn_precondition_settlement` | `legacy_state_writer` |
| `turn_post_observation_settlement` | `legacy_state_writer` |
| `item_reducer` | `reducer` |
| `memory_synapse_reducer` | `reducer` |
| `translation_table_writer` | `reducer` |
| `spell_reducer` | `reducer` |
| `identity_reducer` | `reducer` |
| `migration_writers` | `legacy_state_writer` |
| `event_boundary_reducer` | `reducer` |

## Registered Semantic Owners

| Owner | Mechanism | Semantic responsibility | Deterministic settlement |
| --- | --- | --- | --- |
| `dynamic_4b_inventory` | `local_semantic_model` | Item significance, operation, custody, type, story role and physical form. | Item references, transition legality, holder/location, existence invariant and Item Reducer. |
| `local_pre_turn_1_7b` | `local_semantic_model` | Check need/mode, elapsed-time intent and Calendar commitment. | Check arithmetic, clock legality, Calendar validation and owning Reducers; deterministic MovementPreflightV2 owns route/access without a model proposal. |
| `local_post_core_1_7b` | `local_semantic_model` | Existing Material events, Inventory route, Actor activity/departure/presence/location, perception, narrative temporal claims and bounded player-movement candidate. | Movement preflight/evidence/ID guard and Movement Reducer; Material, Actor/room/presence, witness/ACL and temporal guards; Item route delegates to VCON-014. |
| `post_turn_semantic_provider` | `local_semantic_model` | Low performs the complete VCON-013 core/Item/direct-injury proposal once; Local performs the existing core proposal and may route one shared Dynamic 4B follow-up. | Provider-aware strict descriptor, server settlement, existing Item/Identity guards, language/evidence/ID/temporal/perception guards and existing owning Reducers. |
| `gliner2_base_zero_shot_research` | `local_semantic_model` | Research-only zero-shot proposals for the existing Material, Inventory route, Actor/Presence, perception and temporal-claim families. | Detached benchmark scoring through existing guards; no Reducer commit or State writer. |
| `background_event_1_7b` | `local_semantic_model` | One bounded Event breathing-boundary proposal over exactly ten committed turns. | Checkpoint cadence, committed evidence, stale-result and sole Event-boundary Reducer guards. |
| `local_appraisal_1_7b` | `local_semantic_model` | System-role identity, relationship, impression, Actor, Social and Appraisal categories. | Actor, Social and Appraisal schemas, evidence checks and owning Reducers. |
| `deterministic_migration_no_model` | `deterministic_guard` | Explicit structured legacy values or an approved conservative default; no prose interpretation. | Owning one-time atomic migration. |
| `dynamic_4b_spell` | `local_semantic_model` | Spell observation, teaching, learning, experiment and custom proposal meaning. | Catalog identity, check result, XP, rank, duplicate and Spell Reducer rules. |
| `deterministic_error_code_registry` | `deterministic_guard` | Typed rejection reason ownership instead of parsing error prose. | Explicit error code mapping. |
| `local_translation_4b` | `local_semantic_model` | Contextual source-backed literal role during translation. | Exact source-token provenance and translation acceptance. |
| `dynamic_4b_identity` | `local_semantic_model` | Routed injury and Identity observations. | Actor target, source evidence, access and Identity Reducer rules. |
| `embedding_candidate_retrieval` | `embedding_retrieval` | Semantic candidate recall and ranking only. | Canonical hydration, ACL, timeline, revision, clock, source and supersession gates. |
| `deterministic_sensitive_field_registry` | `deterministic_guard` | Explicit sensitive-field ownership instead of key-name inference. | Save and diagnostics field registry. |
| `deterministic_process_health_protocol` | `deterministic_guard` | Process readiness and failure from structured health evidence. | Exit status and explicit Ollama health protocol. |

## Contract Table

| Contract | Domain | Status | Runtime tasks | Schema authority | Semantic owners | Retrieval owners | Writer | Failure target | Call target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `VCON-001` | `setup_character_polish`<br>Character polish setup input | `legacy_registered` | character_polish | `free_text_setup_input` | model_task:character_polish | none | `character_setup_workflow` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=character_draft_unchanged | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-002` | `opening_world`<br>Opening world package | `legacy_registered` | opening_world | `prompt_literal_duplicated` | model_task:opening_world | none | `opening_world_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=opening_package_not_committed | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-003` | `calendar_high`<br>High Calendar proposal | `legacy_registered` | calendar_high | `prompt_literal_with_shared_child_constants` | model_task:calendar_high | none | `calendar_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=calendar_unchanged | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-004` | `calendar_medium`<br>Medium Calendar proposal | `legacy_registered` | calendar_medium | `prompt_literal_with_shared_child_constants` | model_task:calendar_medium<br>local_pre_turn_1_7b | none | `calendar_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=calendar_entries_unchanged | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-005` | `interior_cartographer`<br>Generated interior map | `legacy_registered` | interior_cartographer | `prompt_literal_duplicated` | model_task:interior_cartographer | none | `interior_map_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=map_unchanged_and_generation_status_written_by_VCON_022 | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-006` | `pacing_director`<br>Causal pacing assessment | `legacy_registered` | pacing_director | `prompt_literal_with_defaulting_normalizer` | model_task:pacing_director | none | `pacing_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=accepted_pacing_state_unchanged_and_failure_status_written_by_VCON_023 | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-007` | `scene_performance`<br>Preserved prose and message-local speakers | `implementation_in_progress` | scene_performance | `prose_preservation_with_separate_authority_adoption` | model_task:scene_performance | embedding_candidate_retrieval | `turn_message_writer` | prose saved before auxiliary validation; world proposals owned by Post; no automatic retry/fallback | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-008` | `scene_transition`<br>Scene transition package | `legacy_registered` | scene_transition | `prompt_literal_with_transforming_normalizer` | model_task:scene_transition<br>local_post_core_1_7b | embedding_candidate_retrieval | `scene_transition_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; language skip stops ordinary and Moment transitions before opening/save; failure=transition_not_committed | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-009` | `scene_opening`<br>Player-visible Scene opening | `legacy_registered` | scene_opening | `prompt_literal_duplicated` | model_task:scene_opening | embedding_candidate_retrieval | `scene_opening_message_writer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=opening_message_not_committed | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-010` | `social_director`<br>Social Director transient proposal and V3 settlement | `legacy_registered` | social_director | `transport_json_schema_with_transient_refs` | model_task:social_director<br>local_appraisal_1_7b | embedding_candidate_retrieval | `social_v3_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=proposal_state_unchanged_and_lifecycle_status_written_by_VCON_024 | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-011` | `map_expansion`<br>World Map expansion proposal | `legacy_registered` | map_expansion | `prompt_literal_duplicated` | model_task:map_expansion | none | `map_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=map_unchanged | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-012` | `local_pre_turn`<br>Local pre-turn time, check and Calendar commitment proposal | `implementation_in_progress` | local_pre_turn_adjudicator | `json_schema_plus_zod_duplicated` | local_pre_turn_1_7b | none | `turn_precondition_settlement` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; movement is deterministic eligibility only and never a Pre outcome or State write | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-013` | `post_turn_semantic_proposal`<br>Unified ordinary-turn structured settlement and one manual supplement | `implementation_in_progress` | post_turn_semantic_proposal | `provider_aware_strict_transport_with_family_local_settlement` | post_turn_semantic_provider | none | `turn_post_observation_settlement` + `movement_reducer` | accepted records frozen; player selects failed groups for one supplement or conservative defaults; immutable prose; no automatic retry/fallback; movement/revision/persistence can block State | Initial Low 1 / 0 Dynamic; initial Local 1 + 0..1 shared Dynamic; at most one manual selected Post supplement / 0 Dynamic; serial / 1 loaded |
| `VCON-014` | `local_inventory`<br>Local-core-routed, stable-ID-guarded dynamic 4B Inventory proposal | `compliant` | local_inventory_observer<br>local_dynamic_turn_observer | `shared_executable_descriptor` | dynamic_4b_inventory | none | `item_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=invalid_item_operations_not_written; Low never invokes this contract | Local: 0 unrouted / 1 routed / serial shared 4B / 1 loaded; Low: 0 |
| `VCON-015` | `local_appraisal`<br>Local Appraisal proposal | `legacy_registered` | local_appraisal_proposer | `json_schema_plus_zod_duplicated` | local_appraisal_1_7b<br>deterministic_error_code_registry | none | `memory_synapse_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=invalid_appraisal_not_written | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-016` | `local_translation`<br>Local display translation | `legacy_registered` | local_translation | `json_schema_plus_zod_duplicated` | local_translation_4b | none | `translation_table_writer` | current-turn P0 retry=forbidden; provider fallback=forbidden; semantic regex fallback=forbidden; failure=world_state_unchanged_translation_error_record_only; legacy explicit retranslation remains user-triggered only | 0 unrouted / current-turn P0 exactly 1 selected-provider request; legacy non-P0 chunks unchanged / selected provider starts independently; local tasks share FIFO / 1 loaded |
| `VCON-017` | `knowledge_candidate_retrieval`<br>Knowledge bounded direct candidate retrieval and canonical hydration | `legacy_registered` | none | `deterministic_retrieval_contract` | none | embedding_candidate_retrieval | `none` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=no_state_write_and_paid_request_stops_when_required_retrieval_fails | 0 unrouted / 0 routed / deterministic_and_embedding_backend / 0 loaded |
| `VCON-018` | `phase2_dynamic_inventory`<br>Planned dynamic 4B Inventory section | `planned_unapproved` | none | `benchmark_executable_descriptor` | dynamic_4b_inventory | none | `item_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=inventory_proposal_not_written | 0 unrouted / 1 routed / serial_shared_dynamic_4b_call / 1 loaded |
| `VCON-019` | `phase2_dynamic_spell`<br>Planned dynamic 4B Spell section | `planned_unapproved` | none | `benchmark_executable_descriptor` | dynamic_4b_spell | none | `spell_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=spell_proposal_not_written | 0 unrouted / 1 routed / serial_shared_dynamic_4b_call / 1 loaded |
| `VCON-020` | `phase2_dynamic_identity`<br>Local structured Check-targeted direct-injury proposal | `compliant` | local_dynamic_identity_observer<br>local_dynamic_turn_observer | `shared_executable_descriptor` | dynamic_4b_identity | none | `identity_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=identity_observation_not_written; Low never invokes this contract | Local: 0 unrouted / 1 routed / serial shared 4B / 1 loaded; Low: 0 |
| `VCON-021` | `calendar_medium_horizon_settlement`<br>Medium Calendar horizon settlement | `legacy_registered` | none | `deterministic_runtime_contract` | none | none | `calendar_medium_horizon_workflow` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=calendar_horizon_unchanged | 0 unrouted / 0 routed / deterministic / 0 loaded |
| `VCON-022` | `interior_map_generation_status`<br>Interior Map generation lifecycle status | `legacy_registered` | none | `deterministic_runtime_contract` | deterministic_process_health_protocol | none | `interior_map_generation_workflow` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=failed_status_and_bounded_error_are_written | 0 unrouted / 0 routed / deterministic / 0 loaded |
| `VCON-023` | `pacing_workflow_status`<br>Pacing workflow lifecycle status | `legacy_registered` | none | `deterministic_runtime_contract` | deterministic_process_health_protocol | none | `pacing_failure_workflow` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=failed_status_error_and_reassessment_metadata_are_written | 0 unrouted / 0 routed / deterministic / 0 loaded |
| `VCON-024` | `social_memory_workflow_status`<br>Social and Memory Director lifecycle status | `legacy_registered` | none | `deterministic_runtime_contract` | deterministic_process_health_protocol | none | `social_memory_workflow` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=failed_or_pending_lifecycle_status_and_bounded_error_are_written | 0 unrouted / 0 routed / deterministic / 0 loaded |
| `VCON-025` | `deterministic_migration`<br>Prose-free deterministic migration settlement | `legacy_registered` | none | `explicit_or_conservative_migration` | deterministic_migration_no_model | none | `migration_writers` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=atomic_migration_not_committed | 0 unrouted / 0 routed / deterministic / 0 loaded |
| `VCON-026` | `sensitive_field_registry`<br>Explicit sensitive field ownership | `legacy_registered` | none | `explicit_sensitive_field_registry_target` | deterministic_sensitive_field_registry | none | `none` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=sensitive_payload_omitted_or_rejected | 0 unrouted / 0 routed / deterministic / 0 loaded |
| `VCON-027` | `background_event_boundary`<br>Asynchronous ten-turn Event breathing-boundary proposal | `implemented_acceptance_pending` | local_event_boundary_observer | `shared_executable_descriptor` | background_event_1_7b | none | `event_boundary_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=event boundary unchanged and checkpoint attempt recorded | 0 off-checkpoint / 1 checkpoint / serial background / 1 loaded |
| `VCON-028` | `post_gliner2_zero_shot_research`<br>Research-only off-the-shelf GLiNER2 comparison; attempts 1/2 reject for no positive-family/mixed improvement and lower Inventory/Actor recall; exact negative-safe metrics unaccepted and user stopped recalculation | `planned_unapproved` | none | `benchmark_executable_descriptor` | gliner2_base_zero_shot_research | none | `none` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=benchmark case failed and no State write | 0 unrouted / 1 benchmark case / serial / 1 loaded |
| `VCON-029` | `post_gliner2_temporal_schema_ablation_research`<br>Research-only combined versus temporalClaims-only GLiNER2 diagnostic | `planned_unapproved` | none | `benchmark_executable_descriptor` | gliner2_base_zero_shot_research | none | `none` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=diagnostic case failed and no State write | 0 unrouted / 2 benchmark forwards / serial in one model residency / 1 loaded |
| `VCON-030` | `post_qwen_temporal_gliner_raw_hint_research`<br>Research-only temporal Qwen comparison with non-authoritative raw GLiNER2 hints; completed diagnostic net worse (`4/10 -> 2/10`) | `planned_unapproved` | none | `benchmark_executable_descriptor` | local_post_core_1_7b<br>gliner2_base_zero_shot_research | none | `none` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=diagnostic branch failed and no State write | 0 unrouted / 3 benchmark calls / serial / 1 loaded |
| `VCON-031` | `role_slot_prompt_eligibility`<br>Shared role-request capacity gate | `implemented_acceptance_pending` | all active `low`/`medium`/`high` role tasks | `deterministic_runtime_contract` | none | none | `none` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; only selected role capacity may reject complete Prompt dispatch | 0 over-capacity / 1 within capacity / serial existing task / 1 loaded |
| `VCON-032` | `role_response_channel_authority`<br>Hogwarts GLM-5 thinking compatibility and final-content-only response boundary | `compliant` | all active `low`/`medium`/`high` role tasks | `deterministic_runtime_contract` | none | none | `none` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; empty/invalid final content uses the existing no-write task failure and Post preserves paid Scene | 0 unrouted / 1 routed / serial existing task / 1 loaded |

## Auxiliary Observation Normalization

- `VCON-014`: standalone Inventory retains the `local_inventory` 9,000-character
  gate. Shared Dynamic Turn composes its Inventory section without component
  admission, then applies the final `local_dynamic_turn` 20,000-character
  limit before its one shared request.
- `VCON-015`: the Appraisal transport parser admits finite nonnegative numeric
  confidence. Deterministic normalization preserves decimal `0..1`, converts
  `>1..100` percentage notation and clamps larger values to `1`; existing
  decimal Appraisal validation and reducers remain State authority.

## Revision 12 Prompt Tuning Result

Production-effect evidence found positive-recall debt in the existing
`VCON-012` and `VCON-013` semantic owners:

| Contract | Current evidence | Planned change | Unchanged boundary |
| --- | --- | --- | --- |
| `VCON-012` | pre-turn one-shot `4/6`; explicit Calendar commitment and historical progression positives were missed | retain Calendar tuning; Revision 18 removes the non-State progression classifier and adds one static paid narrative rule | Calendar/Check/time/movement settlement and one-call policy |
| `VCON-013` | active holdout: Inventory positive `0/5`; Actor positive `2/3`, negative `0/3`; temporal positive `0/1`; zero parse failures | tune the exact existing Material/Item-route/Actor/perception/temporal contract; immediate Event remains absent | Schema fields, evidence/ID/ACL guards, owning domain Reducers and one-call policy |

Revision 12 was approved and executed, but Prompt-only tuning failed its
unseen per-family acceptance threshold. Pre ended at `18/24` on the final
holdout; the best post candidate ended at `17/24` on development with
Actor/Event positive recall `0/3` each. Experimental Prompts were rolled back,
so no semantic owner, State writer, retry, fallback, Regex or model call
changed in production. Evidence is recorded under the active PRD acceptance
directory.

### Narrative-First Ownership Update

Approved `hogwarts-narrative-first-post-settlement` Revision 1 is implemented
but not acceptance-complete. This replaces the earlier immediate-omission
description for ordinary Post failures:

- `VCON-007` writes display segments, message-local speaker declarations and the
  guarded pending envelope, not world proposals. Its preservation validator is
  `domain/narrative-preservation.js`; State adoption belongs to Post and the
  existing domain reducers. Canonical ID collisions cannot grant speaker ACL.
- `VCON-013` owns migrated Actor creation, first impression, progression, pacing
  realization and historical annotations alongside its prior families. Shared
  bookkeeping descriptor, family parser, bookkeeping guard and recovery merge
  are registered in JSON. Accepted results remain frozen drafts until the player
  chooses one combined supplement or defaults. Optional unresolved results write
  nothing; movement/revision/reducer/persistence failures can still block State.
- `VCON-006` retains pacing assessment ownership. Only exact accepted Post beat
  realization can consume a pending beat at commit; no-write retains it.
- `VCON-014/020` retain their guards/reducers. Initial Local may invoke one shared
  Dynamic request; Low and manual Post supplements invoke zero Dynamic requests.
  Initial Dynamic failures enter Post recovery, never automatic Dynamic retry.
- Current evidence: focused bookkeeping/recovery/integration and provider tests,
  plus `tests/hogwarts-mud-post-recovery.e2e.mjs`. Full product acceptance remains
  pending; older research/debt snapshots below are not current failure policy.

Revision 14 changes the `VCON-013` settlement boundary without adding a model
task or State writer: a structured individual NPC departure uses its own exact
Actor/evidence/room/path guards and no longer requires or implies
`eventBoundary.ended`. Event completion and the existing
`pendingEventBoundary` cadence remain independent.

Revision 16 removes paid `signals.eventEnded` and post `eventBoundary` from
immediate contracts. `VCON-027` becomes the only Event-boundary semantic
authority: one nonblocking qwen3:1.7b request at turns 10/20/30/... over exactly
ten committed turns. `VCON-012` retains enactment/evidence semantics but
deterministic code owns duration grammar and arithmetic. `VCON-013` owns
immediate departure with explicit `locationKnown` settlement and no Event
field.

The pre-validated, post-settled movement change retires Revision 17's
pre-committed movement behavior. A deterministic preflight owns marker,
route/access and bounded candidates only; `VCON-007` depicts the result and
`VCON-013` proposes evidence-bound completion. The Movement Reducer is the
sole writer of `moved/already_there/failed`, positions, travel minutes and
`movementOutcome`. The selected-Post capacity safety revision extends pending
recovery to every selected Post no-fit/provider/schema/guard failure:
paid narration remains visible in `post_unsettled`, while only explicit
Post-only retry or discard is allowed. No automatic retry, 4B route or semantic
Regex fallback is added.

Revision 18 removes the non-State pre `progression` classifier and assigns
immediate concrete-step narration to one static paid System Prompt rule.
The pre builder also omits full follow-NPC instructions when
`movementContext=null`; the complete supplied-ID/evidence supplement is added
only for unresolved follow tags. This changes no call count, output field set,
guard, Reducer or State writer.

Fresh `qwen3:1.7b` evidence still misses valid Chinese Calendar commitments
when the date/time precedes the first-person commitment clause. This remains
an explicit `VCON-012` blocker. No semantic Regex, 4B fallback, retry or
relaxed acceptance threshold is approved.

Revision 19 moves that Calendar miss to stable future task
`HVG-P2-03R-CALENDAR-TODO` without calling it passed. The current pre
movement/time/progression-subtraction candidate is accepted for production.

Revision 19 also reopens `VCON-013` as the only active implementation task.
The contract preserves the live `materialEvents -> materialEventLog` path,
routes existing Item meaning to `VCON-014`, and retains existing Actor,
perception and temporal-claim authorities. Named no-change Actor narration
must write nothing. No Event field, model call, retry, fallback, State field
or new Material/Item/Actor meaning is added.

The first Revision 19 post round did not promote a candidate. Focused mandatory
assessments reached Item `2/2`, Actor `6/6`, Material `5/6` and temporal `4/4`,
but merging those domains into one qwen3:1.7b request reintroduced Item,
Material, temporal and injury/quotation false positives. All experimental
Prompt/Schema candidates were withdrawn; the safe one-request production
contract remains active and HTD-014 stays open.

Revision 20 is research-only until a later implementation approval. It may
compose one post Schema from bounded candidate groups, but candidate code owns
recall only:

```text
allowed recall:
stable IDs, structured paid proposals/directives, segment roles/types,
finite temporal shapes, exact names/aliases, existing room/map IDs

forbidden candidate authority:
truth, enactment, quotation/hypothesis/negation, injury interpretation,
Item/Material change, Actor activity/departure, temporal assertion
```

The one post 1B remains semantic owner; existing domain guards/Reducers remain
State authority. Candidate miss fails acceptance. Prior matrices are
non-scoring diagnostics and cannot establish Revision 20 quality.

Fresh Revision 20 development rejected every branch. A/B reached complete
Inventory/Actor/temporal candidate recall but `0/13` Material candidate
recall. C made Material always-on and produced `26/48` parse/transport
failures. D requires a new paid candidate output and was not tested with
oracle data. No branch entered blind or production; the safe VCON-013 contract
remains active.

## New Domain Gate

A new domain must be registered before implementation. It cannot use
`legacy_registered`. Its contract must include:

1. Stable contract and six responsibility IDs.
2. Runtime task and route ownership.
3. One executable Schema authority.
4. Parse/adopt/normalize/resolve boundaries.
5. Semantic and optional retrieval owners.
6. Deterministic evidence, ID, ACL, arithmetic and transition guards.
7. One State writer or an explicit no-State-write declaration.
8. Zero work when unrouted, one serial model request by default, and at most one loaded model.
9. No automatic model retry, repair, provider fallback or semantic regex fallback.
10. Focused deterministic tests, blind simulation when applicable, and fresh independent acceptance.

Registration is necessary but not implementation approval. The owning
PRD, living runtime fields and Prompt budget remain mandatory.

## Money System Example

| Player event | Semantic owner | Deterministic owner | State result |
| --- | --- | --- | --- |
| Player pays five Galleons | Local semantic model proposes payer, recipient, currency, integer minor units and source ref | Currency enum, balance, conservation, ACL, idempotency and revision guards | One Money Reducer atomically debits and credits |
| Player says "if I had money" | Semantic model returns no enacted transaction | No transaction is validated | Money State unchanged |
| Balance is insufficient or output is invalid | Proposal cannot settle | Deterministic guard rejects it | Money State unchanged; no retry or regex guess |
| No Money route exists | No Money model work | Router proves absence | Zero Money-specific calls |

When a planned system enters implementation, its own PRD/Spec must update the
row and add a new domain-owned test file. Existing unrelated tests cannot be
claimed as coverage.
