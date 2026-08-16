# Hogwarts Validator Governance Technical Spec

## Status and Authority

- Change ID: `hogwarts-validator-governance`
- Artifact revision: `7-cross-mechanism-registry`
- Status: Phase 1 governance baseline and benchmark-only Phase 2 Identity
  research gate independently accepted; permanent cross-mechanism
  responsibility table established; no production implementation
- Product authority: [prd.md](./prd.md)
- Runtime authority:
  [state-fields.md](../hogwarts-runtime-contracts/state-fields.md)

Supporting evidence:

- [Regex row registry](./regex-classification.json)
- [Semantic-regex baseline](./regex-semantic-baseline.json)
- [Regex inventory](./regex-inventory.md)
- [Semantic ownership plan](./semantic-ownership-plan.md)
- [Permanent validation responsibility registry](../../skills/hogwarts-change-governance/VALIDATION_RESPONSIBILITY_REGISTRY.json)
- [Human validation responsibility table](../../skills/hogwarts-change-governance/VALIDATION_RESPONSIBILITY_REGISTRY.md)
- [Ollama concurrency report](./ollama-concurrency-merge-report.md)
- [Phase 2 Identity independent acceptance](./acceptance/phase2-identity-research-report-attempt-3.md)
- [Prompt baseline](./prompt-baseline.md)
- [Implementation impact research](./implementation-impact.md)

Revision 4's all-paid-task response ledger and global response panel were not
approved. They remain historical research. Phase 3 is now explicitly limited
to paid large-model narrative正文 and requires a future revision.

## Phase 1 Semantic Invariants

### Mechanism ownership

```text
character shape / finite grammar
-> regex or deterministic parser

candidate recall
-> exact or embedding retrieval
-> deterministic canonical hydration and authorization

free-language meaning
-> registered local semantic model
-> bounded structured proposal plus stable source reference
-> deterministic evidence/ID/authority validation
-> owning Reducer

player-facing narrative
-> paid large model
-> visible正文
-> no direct State authority
```

Regex cannot decide intent, truth, current-vs-historical meaning, injury,
perception, departure, movement, concealment, relationship, Item significance
or form, Spell teaching or Calendar commitment.

Embedding cannot decide truth, equality, contradiction, provenance,
authorization, rejection or State writes.

Local and paid models cannot write State. The owning Reducer is the sole
settlement writer.

## Phase 1 Artifacts

### Complete row registry

`regex-classification.json` is the row-level registry for both production
roots:

```text
public/scripts/extensions/hogwarts-mud/**/*.js
src/hogwarts-mud/**/*.js
```

Each of 578 rows contains:

```text
id
file / line / column / owner
literal-or-dynamic source identity
category
rationale
targetOwner
deterministicOwner
phase2Action
```

Current categories:

```text
accepted_lexical:   355
semantic_runtime:   195
semantic_migration:  26
dead_or_retired:      2
unclassified:         0
```

The exact 54-row correction from the rejected file-level classification and
the first two independent acceptance attempts is
recorded in
[`regex-review-corrections.json`](./regex-review-corrections.json).

### Registered semantic owners

| Target owner | Rows | Meaning |
| --- | ---: | --- |
| `dynamic_4b_inventory` | 46 | Item significance, operation, custody, type and physical form |
| `local_pre_turn_1_7b` | 40 | checks, time, movement, commitment and pre-route meaning |
| `local_post_core_1_7b` | 42 | departure, presence, location, event and general narrative interpretation |
| `local_appraisal_1_7b` | 35 | Actor, system-role, relationship, Social and Appraisal meaning |
| `deterministic_migration_no_model` | 26 | explicit legacy values or approved conservative defaults |
| `dynamic_4b_spell` | 8 | Spell observation, teaching, learning and custom proposal meaning |
| `deterministic_error_code_registry` | 8 | typed Appraisal rejection reasons instead of error-prose parsing |
| `local_translation_4b` | 7 | contextual Latin-literal role decisions during translation |
| `dynamic_4b_identity` | 3 | injury/Identity observations |
| `embedding_candidate_retrieval` | 3 | candidate recall only; deterministic hydration remains authority |
| `deterministic_sensitive_field_registry` | 2 | explicit sensitive-field ownership instead of key-name inference |
| `deterministic_process_health_protocol` | 1 | process exit/health evidence instead of stderr-prose inference |
| **Total** | **221** | all current semantic regex violations |

The paid large model is deliberately absent from this table. It owns narrative
generation, not semantic State settlement.

### Immutable only-decrease baseline

`regex-semantic-baseline.json` freezes:

- the exact 221 semantic row IDs;
- each row's runtime/migration category;
- semantic owner;
- deterministic owner;
- Phase 2 disposition.

`regex-semantic-retirements.json` is append-only. Each approved Phase 2 source
removal appends the retired ID, change ID, date and source-removal evidence.
The exact bytes of the complete manifest, semantic baseline and retirement
ledger, plus retirement event count, are SHA-256 anchored inside
`inventory-regex.mjs`; changing any governed history requires a visible
reviewed anchor update.

`inventory-regex.mjs --require-classified` enforces:

1. persisted manifest top-level metadata and every row's ID, file, line,
   column, code owner, kind, pattern, flags, source and occurrence match the
   AST scan; no rebuilt temporary view may hide stale rows;
2. no row remains unclassified;
3. every row has complete ownership metadata;
4. a current semantic ID must exist in the Phase 1 baseline;
5. every non-retired baseline ID must still exist as semantic source;
6. disappearance without an appended retirement event fails;
7. any retired ID reappearing in any category fails;
8. owner/category/action metadata cannot mutate;
9. lexical category/owner and semantic rationale history cannot mutate without
   a visible full-manifest anchor revision.

Therefore:

```text
current semantic IDs
= immutable baseline IDs
- append-only retired IDs
```

The broad file-level classifier was removed after independent acceptance
proved it unsafe. `apply-regex-review.mjs` contains only the exact reviewed
54-row correction and refuses to run after the baseline exists. New rows must
be explicitly reviewed and registered.

## Phase 1 Data Flow

Phase 1 does not enter a runtime data flow.

```text
source inspection
-> Acorn AST scan
-> row registry
-> immutable semantic baseline
-> governance verification
```

No Prompt, Schema, parser, normalizer, validator, Reducer, persistence, UI,
model adapter, scheduler or save path imports these governance artifacts at
runtime.

## Permanent Cross-Mechanism Registry

### Authority

The registry authority is:

```text
.trae/skills/hogwarts-change-governance/
  VALIDATION_RESPONSIBILITY_REGISTRY.json
```

The adjacent Markdown table is the human-readable companion. Each owning
system updates both files in the same change.

The registry is cross-change authority. This change directory owns its initial
inventory and acceptance evidence, but future domain PRDs update the permanent
registry in the same change that adds or changes a validation contract.

### Contract granularity

A row represents one model-output or semantic-settlement contract, not every
helper whose function name starts with `validate`. Each row records:

```text
contractId and domain
current lifecycle/compliance status
runtime model task IDs
output class and State field references
Prompt/Schema sources
parse/adopt/normalize/resolve sources
deterministic validator/authority sources
sole writer or explicit no-State-write policy
semantic and retrieval owners
current legacy debt and required target
model-call, retry and fallback policy
focused verification owners
```

Every row contains stable responsibility IDs for:

```text
shape
semantics
retrieval
authority/evidence
settlement
failure
```

The `legacy_registered` status is a frozen inventory of current contracts. It
does not make their duplication or retry/fallback behavior acceptable. No new
contract may enter with that status. A new domain starts as
`planned_unapproved`, then may become `compliant` only after its owning PRD,
domain-owned tests and independent acceptance pass.

### Maintenance and system-owned verification

1. A new system updates or appends its `VCON-*` row before implementation.
2. The row names Schema, transforms, semantic/retrieval owners, deterministic
   guards, State fields, sole writer, failure behavior and call budget.
3. The new system creates a new domain-named focused test file. Existing
   unrelated tests and a generic registry test cannot satisfy this gate.
4. The owning tests prove valid settlement, rejection with no State write,
   hypothetical/no-op behavior, no Regex/Embedding semantic fallback, no
   automatic repair/fallback and normal/worst call counts.
5. The owning PRD/Spec and independent acceptance verify the row against
   production. The central table records responsibility but does not execute
   runtime validation or replace domain acceptance.

### New-domain flow

For a future Money system, registration precedes production code:

```text
structured route says Money work is needed
-> registered local semantic owner proposes operation + source reference
-> shared executable descriptor supplies Prompt Schema and validator shape
-> deterministic code checks currency, integer minor units, balance,
   conservation, authorization, idempotency and revision
-> one Money Reducer writes atomically
```

Hypothetical prose produces no proposal. Invalid output or insufficient funds
leaves Money State unchanged. Regex may validate only currency/amount syntax.
Embedding is not needed unless a future approved design retrieves candidate
accounts or records, and even then it cannot decide the transaction.

The default is zero calls when not routed, one serial local call when routed,
one loaded model, no paid call, no retry and no fallback. Any different cost
requires explicit PRD approval and measured evidence in the owning system.

## Phase 2 Registered Design

Phase 2 is a future implementation phase, not current behavior:

```text
exact finite DSL parsing
-> pre-turn 1.7B semantic proposal
-> deterministic pre-turn resolution
-> exactly one existing paid narrative request
-> post core 1.7B semantic proposal
-> optional one dynamic 4B request containing only requested
   Inventory / Spell / Identity sections
-> optional same-resident 4B remains|absent micro-decision
-> deterministic guards
-> owning Reducers
```

Scheduling rules:

- Dynamic routing is derived without a model call from structured paid
  proposals, explicit directives and pre-turn signals; expected answers and
  prose regex are forbidden route inputs.
- `post` runs before the optional dynamic 4B call but does not choose its
  sections.
- `OLLAMA_NUM_PARALLEL=1`.
- `OLLAMA_MAX_LOADED_MODELS=1`.
- No two-model resident parallelism.
- No giant merged 1.7B post/Inventory/Spell request.
- Optional 4B work is omitted on ordinary turns.
- Model failure never falls back to prose regex.
- No automatic model retry or repair request.

Suggested context values from research:

```text
post core: 2048
dynamic 4B: 2048
destroy micro: 1024
```

These values do not become runtime configuration until Phase 2 approval.

### Phase 2 model contracts

`local_pre_turn_1_7b` proposes only bounded check, movement, time and Calendar
commitment semantics. Deterministic code owns path/access, check arithmetic,
clock legality and Calendar settlement.

`local_post_core_1_7b` proposes Actor/event/perception facts, stable narrative
segment references and optional follow-up routes. It does not own Identity
injury assessment in the target design. Actor movement Schema excludes the
current room from destination candidates for one routed focal Actor.

`dynamic_4b_inventory` owns Item prose meaning. The Item Reducer owns stable
IDs, evidence, transition legality, holder/location and the permanent Item
existence invariant.

`dynamic_4b_spell` owns Spell prose meaning. Catalog identity, check result,
XP, rank, duplicates and writes remain deterministic.

`dynamic_4b_identity` owns routed injury/Identity observation meaning. Actor
IDs are restricted to structured route targets; stable segment references,
evidence resolution and Identity settlement remain deterministic.

`local_appraisal_1_7b` owns relationship/impression meaning. Actor/Social and
Appraisal schemas and Reducers remain deterministic.

`embedding_candidate_retrieval` owns candidate recall only. Canonical
hydration, ACL, timeline, revision, clock, source and supersession gates remain
deterministic.

`deterministic_migration_no_model` uses explicit structured legacy values or
the approved neutral/default result. It never invokes a model or interprets
prose.

`local_translation_4b` owns contextual decisions such as whether `H`, `A-F`
or `V` is a source-backed literal with the same semantic role. Character
presence alone is not sufficient.

`deterministic_error_code_registry`,
`deterministic_sensitive_field_registry` and
`deterministic_process_health_protocol` replace prose/key/log keyword
classification with explicit structured protocols. They do not add model
calls.

### Phase 2 blockers

- ACCEPTED RESEARCH GATE: fresh independent attempt 3 verified the
  structured route, all 45 chains, `740/800` raw checks and `800/800`
  post-guard checks with zero route or parse failures.
- TODO: pass fresh context-free blind production-chain acceptance.
- TODO: run the candidate on a physical 8 GB machine with SillyTavern and the
  normal browser workload.
- TODO: obtain explicit Phase 2 implementation approval.
- Until the physical test passes, no 8 GB or low-memory support claim is
  permitted.

## Phase 3 Registered Boundary

Phase 3 is a separate future narrative-preservation change:

```text
paid large-model narrative正文 received
-> append-only preselection ledger write
->正文 remains visible
-> parse / validate / reduce State proposal separately
-> accepted State OR rejected State proposal
```

Military rules:

-正文 is never erased or hidden by downstream failure;
- only the State proposal may be rejected;
- rejected正文 cannot become State, Prompt, Knowledge or retrieval authority;
- no automatic retry, repair or provider fallback;
- no regex guesses prose meaning;
- once the ledger contains a response, repair is forward-only;
- internal structured Director JSON is outside this narrowed Phase 3 unless a
  later explicit PRD expands the scope.

No Phase 3 persistence, API, runtime field, UI or localization contract is
approved by this Spec.

## Runtime Contract Impact

Phase 1 and Revision 7 registry runtime field impact: None.

No field in `state-fields.md` changes. Future Phase 2 and Phase 3 revisions
must reconcile every affected field before implementation.

## Prompt And Call Budget

Phase 1:

```text
Prompt fields added: 0
Prompt fields removed: 0
model calls added: 0
model calls removed: 0
concurrency changes: 0
context/residency changes: 0
```

Revision 7 has the same zero Prompt and call impact. The permanent registry is
governance-only and is not imported by production runtime code.

Phase 2 evidence is authoritative only as research and is incorporated into
PRD Section 9. Measured candidates:

```text
Item + Spell:
  post-chain average: 10.44 s
  peak Ollama RSS: 3.06 GB
  integrated checks before Identity: 97.8%

Identity + Item + Spell worst case:
  post-chain average: 22.76 s
  peak Ollama RSS: 3.04 GB
  peak loaded models: 1
  integrated route + semantic checks: 800 / 800
  maximum prompt + output: 1673 / 2048 tokens
```

These post-chain measurements exclude existing pre-turn and unchanged
Appraisal/translation work.

## Failure Handling

Phase 1 verification failure:

- manifest/source mismatch: fail with no write;
- unclassified row: fail;
- new semantic ID: fail;
- semantic disappearance without a retirement event: fail;
- retired semantic ID resurrection: fail;
- semantic relabel or owner mutation: fail;
- missing baseline or retirement ledger: fail.

No runtime fallback is introduced.

Future Phase 2 local failure omits or blocks the affected semantic proposal
according to its approved owner contract; it never invokes regex semantics or
an automatic model retry.

Future Phase 3 narrative failure preserves正文 while State remains unchanged
unless an independent deterministic transaction passes.

## Verification

Required Phase 1 verification:

```text
node --check .trae/specs/hogwarts-validator-governance/inventory-regex.mjs
node --check .trae/specs/hogwarts-validator-governance/apply-regex-review.mjs
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs \
  --self-test-semantic-gate
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs \
  --require-classified
```

Additional checks:

- 578 unique registry IDs;
- exact `355/195/26/2/0` category split;
- 221 baseline IDs and zero initial retirements;
- owner totals reconcile to 221;
- synthetic gate proves unregistered deletion, new semantic ID, relabel,
  owner mutation, stale/forged persisted identity, lexical/rationale rewrite,
  file tamper and retired-ID resurrection all fail;
- Revision 7 diff contains no production/runtime/test/save file;
- no Ollama request is made.
- JSON and Markdown responsibility tables are reviewed together;
- every future system must update its row and add its own focused test file
  before implementation.
