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

## Registered Semantic Owners

| Owner | Mechanism | Semantic responsibility | Deterministic settlement |
| --- | --- | --- | --- |
| `dynamic_4b_inventory` | `local_semantic_model` | Item significance, operation, custody, type, story role and physical form. | Item references, transition legality, holder/location, existence invariant and Item Reducer. |
| `local_pre_turn_1_7b` | `local_semantic_model` | Check need/mode, movement intent, elapsed-time intent and Calendar commitment. | Check arithmetic, route/access, clock legality, Calendar validation and owning Reducers. |
| `local_post_core_1_7b` | `local_semantic_model` | Departure, presence, location, event boundaries, perception and general narrative facts. | Actor, room, Event, perception evidence and ID guards plus owning Reducers. |
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
| `VCON-007` | `scene_performance`<br>Player-visible Scene performance and turn proposal | `legacy_registered` | scene_performance | `prompt_literal_and_multiple_allowlists` | model_task:scene_performance<br>local_post_core_1_7b<br>dynamic_4b_inventory<br>dynamic_4b_spell<br>dynamic_4b_identity | embedding_candidate_retrieval | `turn_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=turn_transaction_not_committed | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-008` | `scene_transition`<br>Scene transition package | `legacy_registered` | scene_transition | `prompt_literal_with_transforming_normalizer` | model_task:scene_transition<br>local_post_core_1_7b | embedding_candidate_retrieval | `scene_transition_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=transition_not_committed | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-009` | `scene_opening`<br>Player-visible Scene opening | `legacy_registered` | scene_opening | `prompt_literal_duplicated` | model_task:scene_opening | embedding_candidate_retrieval | `scene_opening_message_writer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=opening_message_not_committed | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-010` | `social_director`<br>Social Director transient proposal and V3 settlement | `legacy_registered` | social_director | `transport_json_schema_with_transient_refs` | model_task:social_director<br>local_appraisal_1_7b | embedding_candidate_retrieval | `social_v3_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=proposal_state_unchanged_and_lifecycle_status_written_by_VCON_024 | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-011` | `map_expansion`<br>World Map expansion proposal | `legacy_registered` | map_expansion | `prompt_literal_duplicated` | model_task:map_expansion | none | `map_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=map_unchanged | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-012` | `local_pre_turn`<br>Local pre-turn semantic proposal | `legacy_registered` | local_pre_turn_adjudicator | `json_schema_plus_zod_duplicated` | local_pre_turn_1_7b | none | `turn_precondition_settlement` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=affected_precondition_omitted_or_turn_stopped | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-013` | `local_post_turn`<br>Local post-turn event, presence and perception proposal | `legacy_registered` | local_post_turn_observer | `json_schema_plus_zod_duplicated` | local_post_core_1_7b<br>dynamic_4b_identity | none | `turn_post_observation_settlement` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=affected_observation_not_written | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-014` | `local_inventory`<br>Local Inventory proposal | `legacy_registered` | local_inventory_observer | `json_schema_plus_zod_duplicated` | dynamic_4b_inventory | none | `item_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=invalid_item_operations_not_written | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-015` | `local_appraisal`<br>Local Appraisal proposal | `legacy_registered` | local_appraisal_proposer | `json_schema_plus_zod_duplicated` | local_appraisal_1_7b<br>deterministic_error_code_registry | none | `memory_synapse_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=invalid_appraisal_not_written | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-016` | `local_translation`<br>Local display translation | `legacy_registered` | local_translation | `json_schema_plus_zod_duplicated` | local_translation_4b | none | `translation_table_writer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=world_state_unchanged_translation_error_record_only | 0 unrouted / 1 routed / serial / 1 loaded |
| `VCON-017` | `knowledge_candidate_retrieval`<br>Knowledge candidate retrieval and canonical hydration | `legacy_registered` | none | `deterministic_retrieval_contract` | none | embedding_candidate_retrieval | `none` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=no_state_write_and_paid_request_stops_when_required_retrieval_fails | 0 unrouted / 0 routed / deterministic_and_embedding_backend / 0 loaded |
| `VCON-018` | `phase2_dynamic_inventory`<br>Planned dynamic 4B Inventory section | `planned_unapproved` | none | `benchmark_executable_descriptor` | dynamic_4b_inventory | none | `item_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=inventory_proposal_not_written | 0 unrouted / 1 routed / serial_shared_dynamic_4b_call / 1 loaded |
| `VCON-019` | `phase2_dynamic_spell`<br>Planned dynamic 4B Spell section | `planned_unapproved` | none | `benchmark_executable_descriptor` | dynamic_4b_spell | none | `spell_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=spell_proposal_not_written | 0 unrouted / 1 routed / serial_shared_dynamic_4b_call / 1 loaded |
| `VCON-020` | `phase2_dynamic_identity`<br>Planned dynamic 4B Identity section | `planned_unapproved` | none | `benchmark_executable_descriptor` | dynamic_4b_identity | none | `identity_reducer` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=identity_observation_not_written | 0 unrouted / 1 routed / serial_shared_dynamic_4b_call / 1 loaded |
| `VCON-021` | `calendar_medium_horizon_settlement`<br>Medium Calendar horizon settlement | `legacy_registered` | none | `deterministic_runtime_contract` | none | none | `calendar_medium_horizon_workflow` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=calendar_horizon_unchanged | 0 unrouted / 0 routed / deterministic / 0 loaded |
| `VCON-022` | `interior_map_generation_status`<br>Interior Map generation lifecycle status | `legacy_registered` | none | `deterministic_runtime_contract` | deterministic_process_health_protocol | none | `interior_map_generation_workflow` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=failed_status_and_bounded_error_are_written | 0 unrouted / 0 routed / deterministic / 0 loaded |
| `VCON-023` | `pacing_workflow_status`<br>Pacing workflow lifecycle status | `legacy_registered` | none | `deterministic_runtime_contract` | deterministic_process_health_protocol | none | `pacing_failure_workflow` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=failed_status_error_and_reassessment_metadata_are_written | 0 unrouted / 0 routed / deterministic / 0 loaded |
| `VCON-024` | `social_memory_workflow_status`<br>Social and Memory Director lifecycle status | `legacy_registered` | none | `deterministic_runtime_contract` | deterministic_process_health_protocol | none | `social_memory_workflow` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=failed_or_pending_lifecycle_status_and_bounded_error_are_written | 0 unrouted / 0 routed / deterministic / 0 loaded |
| `VCON-025` | `deterministic_migration`<br>Prose-free deterministic migration settlement | `legacy_registered` | none | `explicit_or_conservative_migration` | deterministic_migration_no_model | none | `migration_writers` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=atomic_migration_not_committed | 0 unrouted / 0 routed / deterministic / 0 loaded |
| `VCON-026` | `sensitive_field_registry`<br>Explicit sensitive field ownership | `legacy_registered` | none | `explicit_sensitive_field_registry_target` | deterministic_sensitive_field_registry | none | `none` | retry=forbidden; provider fallback=forbidden; semantic regex=forbidden; failure=sensitive_payload_omitted_or_rejected | 0 unrouted / 0 routed / deterministic / 0 loaded |

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
