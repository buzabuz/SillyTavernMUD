# Regex Governance Inventory

Status: Phase 1 governed baseline; Phase 2 removal is not approved.

## Mechanical Baseline

An Acorn AST scan of:

```text
public/scripts/extensions/hogwarts-mud/**/*.js
src/hogwarts-mud/**/*.js
```

found:

```text
578 regex literals or dynamic RegExp constructions
source fingerprint:
6927d5e1ba93d5ae6114741adc181da818fb0206beae0861d87f4457e21836a5
```

The original `VREG-001..013` list is a high-risk sample, not an exhaustive
inventory.

Largest owners:

| File | Regex count |
| --- | ---: |
| `domain/item-schema.js` | 35 |
| `domain/narrative-authority.js` | 28 |
| `adapters/translation.js` | 23 |
| `domain/checks.js` | 22 |
| `core/json-recovery.js` | 19 |
| `domain/translation.js` | 19 |
| `domain/scene-transition.js` | 18 |
| `domain/actor-memory.js` | 16 |
| `domain/appearance.js` | 14 |
| `adapters/local-semantic.js` | 13 |
| `domain/spatial-foundation.js` | 13 |
| `domain/spell-proposals.js` | 12 |
| `domain/turn-time.js` | 12 |
| `src/hogwarts-mud/local-semantic-adjudicator.js` | 12 |
| `domain/inventory.js` | 11 |

Count alone does not indicate a violation. Translation placeholders and JSON
recovery are mostly legal character grammar; one semantic fallback regex is a
violation regardless of count.

## Classification Rule

### Accepted regex

Truth is fully defined by characters or a finite formal grammar:

- stable ID and slug syntax;
- ISO/world date and clock syntax;
- integer/decimal syntax;
- exact JSON fence/balanced-object recovery;
- whitespace, punctuation and sentence-boundary tokenization;
- exact UI/Prompt markers and structured directives;
- exact placeholders and URLs;
- source-script/language-character checks;
- exact finite enum code/token matching;
- escaping characters for a later exact lookup.

### Forbidden semantic regex

Truth requires interpreting what free language means:

- intent, attempt, success, uncertainty or check requirement;
- present fact vs recollection, belief, hypothetical or dialogue;
- actor presence, departure, destination, activity or relationship;
- injury, perception, concealment, witness scope or event boundary;
- Item kind, significance, acquisition, operation, destruction form,
  ownership or transfer meaning;
- Spell observation, teaching, learning, independence or effect;
- commitment, promise, schedule intention or scene closure;
- appearance/outfit/held-object meaning extracted from prose;
- relationship/impression/tags inferred from prose;
- migration facts inferred from archived prose.

Exact word-boundary matching does not make a semantic rule lexical.

## Active Semantic Families

| ID | Current files | Current consequence | Target |
| --- | --- | --- | --- |
| RSEM-01 | `checks.js`, `spatial-foundation.js`, `turn-time.js`, local pre-turn fallback | chooses check, target, modifier, elapsed time and action class | local pre-turn structured decision; failure before paid request, no semantic fallback |
| RSEM-02 | `narrative-authority.js` | hard-rejects paid narrative by interpreting current/history/belief/action/possession/life/room meaning | remove prose hard-rejection; structured State proposals remain deterministic |
| RSEM-03 | `scene-transition.js` opening rules | hard-rejects paid opening for promise/secret/relationship/Item meaning | remove semantic hard-rejection; opening has no direct State authority |
| RSEM-04 | `item-schema.js`, `inventory.js`, `item-reducer.js` | infers Item kind/significance/operation/form and may write State | local Inventory structured proposal; deterministic Item invariants |
| RSEM-05 | `adapters/local-semantic.js` | regex rechecks/overrides local event boundary, injury, departure, concealment and room meaning | trust validated local semantic fields; exact evidence/ID/path checks only |
| RSEM-06 | `presence-witness-contract.js` | semantic deterministic fallback may override local perception and witness scope | local perception proposal only; no semantic fallback |
| RSEM-07 | `spell-state.js`, `spell-proposals.js` | infers observation, teaching, source, learning and custom-spell semantics | structured local Spell proposal plus catalog/check validation |
| RSEM-08 | `medium-calendar-director.js` | decides whether Calendar Director runs from promise/future meaning | local pre-turn structured commitment decision |
| RSEM-09 | `local-semantic-adjudicator.js` inventory gate | suppresses specialized Item semantic call | local post-turn structured routing decision |
| RSEM-10 | `actor-memory.js`, `initial-world.js` | derives impression, relationship tags and opening edges from prose | explicit structured relationship fields; no prose inference |
| RSEM-11 | `appearance.js` | extracts/removes outfit and held-object meaning from descriptions | structured Presentation/Material fields; prose remains display evidence |
| RSEM-12 | `npc-identity-migration.js` and observation migrations | infers injury/student/identity facts during migration | explicit legacy fields or conservative unknown; migrations do not call models |
| RSEM-13 | `movement.js`, `spatial-foundation.js` | infers movement/travel authority and destination from free action | exact movement directive or local semantic movement proposal |
| RSEM-14 | `item-migration.js`, legacy inventory migration | infers story role, transfer mode, ownership and physical form from prose | explicit legacy field or conservative neutral/default migration |
| RSEM-15 | causal/pacing/scene heuristics outside exact codes | may schedule/shape model tasks from prose meaning | existing local/role semantic task emits bounded trigger |

Every one of the 578 AST rows is now classified as:

```text
accepted_lexical
semantic_runtime
semantic_migration
dead_or_retired
```

Current result:

```text
accepted_lexical:   355
semantic_runtime:   195
semantic_migration:  26
dead_or_retired:      2
unclassified:         0
```

The original file-level `349/191/38/0` result failed independent acceptance.
The combined exact 54-row correction from independent acceptance attempts is
recorded in `regex-review-corrections.json`; the corrected semantic total is
221.

Authority artifacts:

- `regex-classification.json`: row-level fingerprint, source owner, category,
  rationale, semantic owner, deterministic owner and Phase 2 action;
- `regex-semantic-baseline.json`: immutable list of all 221 current semantic
  IDs and owners;
- `regex-semantic-retirements.json`: append-only evidence for each approved
  source removal;
- `inventory-regex.mjs`: deterministic AST scan, source-drift,
  persisted-manifest, file-anchor, zero-unclassified, only-decrease and
  no-resurrection gate;
- `regex-review-corrections.json` and `apply-regex-review.mjs`: exact reviewed
  correction evidence; the broad automatic classifier was deleted.

Registered semantic owners:

| Target owner | Rows |
| --- | ---: |
| `dynamic_4b_inventory` | 46 |
| `local_pre_turn_1_7b` | 40 |
| `local_post_core_1_7b` | 42 |
| `local_appraisal_1_7b` | 35 |
| `deterministic_migration_no_model` | 26 |
| `dynamic_4b_spell` | 8 |
| `deterministic_error_code_registry` | 8 |
| `local_translation_4b` | 7 |
| `dynamic_4b_identity` | 3 |
| `embedding_candidate_retrieval` | 3 |
| `deterministic_sensitive_field_registry` | 2 |
| `deterministic_process_health_protocol` | 1 |
| **Total** | **221** |

Verification:

```text
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs \
  --self-test-semantic-gate
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs \
  --require-classified
```

The row-level re-review covered the independent findings and the surrounding
families. Structured kind normalization, whitespace/sentence tokenization,
stable IDs/dates, exact finite catalog aliases, explicit DSL and exact
generated markers remain lexical. Translation literal roles, free-language
relationship/Item/Spell/world meaning, error-prose categories, sensitive-key
inference and process-log severity remain semantic.

## Migration Semantics

Runtime semantic regex:

```text
semantic model proposal
-> exact evidence substring
-> deterministic IDs/enums/provenance/authority
-> Reducer
```

Migration semantic regex:

```text
explicit structured legacy value
-> deterministic migration

missing/ambiguous prose-only value
-> conservative unknown/default allowed by product invariant
-> never infer meaning from prose
```

Migrations do not call a model.

For Item `destroyed + missing physicalForm`, the permanent Item invariant and
the new regex rule now imply `remains`: there is no higher-authority evidence
for `absent`, and prose regex cannot supply it.

## Only-Decrease Enforcement

Phase 1 enforcement now requires:

1. persisted manifest metadata and full row identities match the AST scan;
2. every changed/new fingerprint is unclassified until explicit review;
3. complete manifest bytes match the reviewed script anchor;
4. no current semantic ID exists outside the 221-row baseline;
5. baseline and retirement-ledger bytes/event count match reviewed script
   anchors;
6. a baseline semantic row still present in source cannot be relabelled;
7. category, rationale, semantic/deterministic owner and action history cannot
   mutate silently;
8. a semantic ID cannot disappear without an appended retirement event;
9. a retired ID cannot reappear in any category;
10. the broad automatic classifier does not exist.

Phase 2 closeout additionally requires:

1. `semantic_runtime=0`;
2. `semantic_migration=0`;
3. `unclassified=0`;
4. no semantic regex fallback, override or repair path;
5. independent review derives adversarial meaning cases rather than trusting
   pattern names.
