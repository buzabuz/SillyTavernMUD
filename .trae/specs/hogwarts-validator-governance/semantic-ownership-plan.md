# Semantic Ownership Registry

Status: Phase 1 authority for ownership registration; Phase 2 implementation
is pending and unapproved.

## Permanent Boundary

| Mechanism | Authority |
| --- | --- |
| Regex | character shape and finite grammar only |
| Embedding | candidate recall/ranking only |
| Local small model | natural-language semantic proposals |
| Paid large model | player-facing narrative正文 |
| Deterministic code | references, evidence, ACL, arithmetic and legal transitions |
| Reducer | sole State writer |

No regex may infer prose meaning. No embedding result or model output may write
State directly.

## Inventory

```text
accepted_lexical:   355
semantic_runtime:   195
semantic_migration:  26
dead_or_retired:      2
semantic total:      221
unclassified:          0
```

Row-level authority is
[`regex-classification.json`](./regex-classification.json). The immutable
only-decrease baseline is
[`regex-semantic-baseline.json`](./regex-semantic-baseline.json).
Approved removals append to
[`regex-semantic-retirements.json`](./regex-semantic-retirements.json).

## Registered Semantic Owners

| Owner ID | Rows | Semantic responsibility | Deterministic settlement |
| --- | ---: | --- | --- |
| `dynamic_4b_inventory` | 46 | Item significance, operation, custody, type, story role and physical form | Item references, transition legality, holder/location, existence invariant and Item Reducer |
| `local_pre_turn_1_7b` | 40 | check need/mode, movement intent, elapsed-time intent and Calendar commitment | check arithmetic, route/access, clock legality, Calendar validation and Reducers |
| `local_post_core_1_7b` | 42 | departure, presence, location, event boundaries, general narrative facts and follow-up routing | Actor/room/Event/perception evidence and ID guards plus owning Reducers |
| `local_appraisal_1_7b` | 35 | system-role identity, relationship, impression, Actor/Social/Appraisal categories | Actor/Social/Appraisal schemas, evidence/ID checks and Reducers |
| `deterministic_migration_no_model` | 26 | no semantic model; missing prose-only facts stay unknown or use an approved conservative default | owning domain migration |
| `dynamic_4b_spell` | 8 | Spell observation, teaching, learning, experiment and custom proposal meaning | catalog identity, check/XP/rank rules and Spell Reducer |
| `deterministic_error_code_registry` | 8 | Appraisal rejection reason | typed validation error code and deterministic mapping |
| `local_translation_4b` | 7 | contextual Latin-literal role in translated prose | source-token provenance and translation acceptance |
| `dynamic_4b_identity` | 3 | routed injury and Identity observations | Actor Identity evidence/ID guards and Reducer |
| `embedding_candidate_retrieval` | 3 | semantic candidate recall only | canonical hydration, ACL, timeline, revision, clock, source and supersession gates |
| `deterministic_sensitive_field_registry` | 2 | sensitive field ownership | explicit save/diagnostics field registry |
| `deterministic_process_health_protocol` | 1 | Ollama process readiness/failure | exit status and explicit health protocol |
| **Total** | **221** |  |  |

The paid large model is not a semantic State owner. Its narrative is consumed
as正文 and may supply evidence input to registered local semantic tasks.

## Phase 2 Turn Flow

```text
player action
-> exact finite DSL parsing
-> pre-turn 1.7B
-> deterministic check / movement / time / commitment resolution
-> existing paid narrative request
-> post core 1.7B
-> optional one dynamic 4B Schema containing only requested sections:
   Inventory / Spell / Identity
-> optional same-resident 4B destroy-form micro-decision
-> deterministic evidence and authority guards
-> owning Reducers
```

Rules:

- post runs before optional work because it routes that work;
- local models run serially with one loaded model slot;
- ordinary turns do not load 4B;
- Inventory, Spell and Identity share one dynamic 4B request when multiple
  sections are required;
- perception remains in post core and uses a stable narrative-segment
  reference;
- model failure does not invoke regex semantics, retry or repair.

## Owner Contracts

### `local_pre_turn_1_7b`

May propose:

```text
check.required/rule/rollMode/target/item
movement.requested/destination/guide/evidence
time intent
calendar commitment/actors/window/evidence
```

Cannot decide:

- route existence, access or route minutes;
- check arithmetic or outcome;
- clock transition legality;
- Calendar State settlement.

Failure stops or omits the affected precondition according to the future
approved Phase 2 contract. It never activates a prose-regex fallback.

### `local_post_core_1_7b`

May propose:

```text
material/event boundary
Actor activity/presence/room/departure
perception/concealment/salience/attribution
stable evidenceSegmentIndex
requested dynamic 4B sections
```

Identity injury interpretation is removed from this owner in the target
design. It is routed to `dynamic_4b_identity`.

Deterministic code verifies exact segment references, Actor/room IDs, movement
legality, event references and State transitions.

### `dynamic_4b_inventory`

May propose:

```text
durable Item significance
operation
Item type
holder/target holder/transfer mode
story roles
visibility/equipped/held
physicalForm
```

For destroy:

```text
physicalForm = remains | absent
```

The same resident 4B may run the measured 1024-context binary micro-decision.
The Item Reducer retains all existence, ID, transition and holder/location
authority.

### `dynamic_4b_spell`

May propose:

```text
observed / taught / demonstrated / self_study / experiment
spellId
custom Spell incantation/effect
stable evidence reference
```

Catalog identity, check result, XP, rank, duplicates and State writes remain
deterministic.

### `dynamic_4b_identity`

May propose routed injury/Identity observations only when a structured injury
or inspection signal exists.

It must not run on an un-routed negative case. Independent positive
micro-testing passed 10/10, but the integrated dynamic Schema remains a Phase
2 TODO.

Acceptance blocker:

```text
Identity + Inventory + Spell + post integrated matrix = 100%
```

### `local_appraisal_1_7b`

May propose relationship, impression and Actor/Social/Appraisal categories
from bounded evidence.

It cannot invent Actor IDs or directly write graph, memory or relationship
State.

### `embedding_candidate_retrieval`

Embedding returns candidates only. The original query may be sent directly to
exact/vector retrieval; an optional local planner may produce bounded
subqueries.

No regex decides query meaning. No similarity score establishes truth.

### `deterministic_migration_no_model`

Migrations do not call a model and do not inspect prose for meaning.

| Missing legacy fact | Conservative result |
| --- | --- |
| destroyed Item `physicalForm` | `remains` |
| Item type | `other` |
| Item story roles | `[]` |
| Item transfer mode | `none` |
| relationship kind/tags | `other` / `[]` unless explicit structured tags exist |
| Actor injury observation | no observation / `unknown` |
| temporary Actor name | preserve existing structured name |
| movement/clock inferred only from prose | preserve structured Map/Scene/clock |
| Actor impression inferred only from prose | preserve prose as display evidence; no derived tag |

Current structured values are preserved exactly.

### `local_translation_4b`

Owns the contextual decision that a Latin token such as `H`, `A-F` or `V` is
source-backed in the same semantic role. Character presence and nearby keyword
regex are not sufficient.

Translation acceptance still checks exact source tokens and locale output
deterministically.

### Structured deterministic protocol owners

These owners add no model call:

- `deterministic_error_code_registry` replaces parsing Appraisal error prose
  with typed error codes;
- `deterministic_sensitive_field_registry` replaces sensitive key-name
  inference with explicit governed fields;
- `deterministic_process_health_protocol` replaces stderr word inference with
  process exit and Ollama health/readiness signals.

## Only-Decrease Disposition

Every semantic registry row has one of these Phase 2 actions:

```text
remove_and_replace_with_registered_semantic_owner
remove_and_use_embedding_candidate_retrieval
remove_and_use_explicit_or_conservative_migration
remove_and_use_explicit_structured_protocol
```

Accepted lexical rows use:

```text
retain_shape_only
```

No semantic row may be reclassified into the lexical bucket while its source
regex remains. It must be physically removed or replaced in the same approved
Phase 2 owner task, with its ID appended to the retirement ledger. A retired
ID may never reappear. Manifest, baseline and retirement-ledger bytes plus
event count are anchored in the enforcement script, and complete persisted row
identities are compared directly with the AST scan.

## Performance Evidence

Measured Phase 2 candidate:

```text
post-chain average: 10.44 s
peak Ollama RSS: 3.06 GB
peak loaded models: 1
integrated checks: 97.8%
```

Rejected:

```text
mixed true parallel: 6.43-7.58 GB
giant merged 1.7B: 11.43 s, 39.6%
```

Proposed settings:

```text
OLLAMA_NUM_PARALLEL=1
OLLAMA_MAX_LOADED_MODELS=1
post context=2048
dynamic 4B context=2048
destroy micro context=1024
```

These settings are not current runtime authority. Phase 2 cannot start until
Identity reaches 100% integrated acceptance and the final candidate passes on
a physical 8 GB machine.
