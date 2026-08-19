# Hogwarts Validator Governance Technical Spec

## Status and Authority

- Change ID: `hogwarts-validator-governance`
- Artifact revision: `25-post-low-provider-selection`
- Status: Phase 1 治理基线和仅基准性质的 Phase 2 Identity 研究门禁已独立验收；
  永久跨机制责任表已建立；`HVG-P2-01` 已独立验收；Revision 11 将范围收紧为
  既有即时回合生产路径。固定 PM 已确认范围。Revision 12 已纳入生产效果失败
  证据并获用户批准实施；Prompt-only 调优未达到 unseen per-family 门槛，实验
  Prompt 已全部撤回。Revision 13 记录未来的确定性时长算术所有权和 Check
  no-write 例外；对既有 frozen holdout 的 qwen3:4b 直换实验失败，production
  pre/post 默认模型不变。Revision 14 已确认 NPC 个人离场不依赖 Event 结束；
  Event 继续作为长互动叙事呼吸口。Revision 16 的产品边界已确认：Event 后台
  每 10 committed turns 调用一次 1B；时间使用确定性 exact-duration grammar；
  未知目的地离场写 `locationKnown=false`。Revision 17 增加无地点跟随 NPC 的
  窄 pre proposal 与三态 movement outcome，并要求失败事实进入当前 paid Prompt。
  固定 PM 初审/复核通过，用户已显式批准；Revision 17 实现已进入验收阶段。
  Revision 18 删除 pre 1B `progression` proposal 与 paid 自证布尔耦合，只保留
  一条 paid System Prompt 规则和既有 `sceneProgression` 结果摘要；固定 PM
  `PASS`，用户已显式批准并完成实施。Revision 19 将 fresh 中文日期前置
  Calendar 漏判移入独立 TODO；当前 pre candidate 进入 production acceptance，
  `HVG-P2-03R-PRE` completed。post 的现有 Item route、Material、Actor/Presence、
  perception 与 temporal claim 已完成第一轮实验，immediate Event 继续排除。
  合并 post 候选未达到 per-family 门槛并已全部撤回。Revision 20 已获用户产品
  方向批准并完成固定 PM 双门禁：探索 structured candidate wake-up + one dynamic
  Schema；Regex/代码只召回候选，1B 仍是语义 owner，旧矩阵不参与选型/验收。
  fresh development 已拒绝 A/B/C，D 因没有真实 paid candidate field 且禁止
  oracle 而未运行。没有候选通过 development，因此 blind 未启动，production
  post 保持 Revision 19 safe contract。
  Revision 21 按用户最新决定比较 off-the-shelf `fastino/gliner2-base-v1`
  与 current `qwen3:1.7b`；不 fine-tuning，promotion gate 改为严格 Pareto
  “比现状强”。固定 PM 初审/复核均 `PASS`，`VCON-028` 已登记为 no-write
  research contract。用户已批准 artifacts。Attempt 1 实质结果拒绝 GLiNER2，
  但 independent acceptance 发现 invalid-candidate negative scoring、baseline
  raw evidence 与 immutable-freeze 缺口，因此 exact metrics 不可作为最终结论。
  Corrected attempt 2 使用 freeze commit 和新 corpus 完成，仍因无
  positive-family/mixed 改善及多家族 recall/safety 退步而拒绝 GLiNER2。
  第二次 independent acceptance 发现后置 guard reject 的 negative-safe scorer
  缺口；用户明确停止重算。最终报告只保留 robust no-trial 结论，不接受精确
  negative-safe metrics。Revision 23 只在 benchmark 中让 GLiNER2 raw temporal
  output 作为同一 Qwen temporal-only request 的不可信 context。结果是 Qwen A
  `4/10` semantic exact、hinted Qwen B `2/10`，所以没有 production/trial
  integration。Revision 24 将 Revision 21-23 归档为 GLiNER2 的明确排除结论，
  并完成 low-resource structured-extraction alternatives 的外部研究；没有
  新模型、Schema、task、writer 或 runtime 改造。Revision 25 取代继续
  fine-tuning 的方向：VCON-013 default 由 Low Connection Profile 执行一次，
  可显式选择 Local；用户已批准，当前进入实现与验收。
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
- [4B pre/post holdout experiment](./acceptance/phase2-4b-pre-post-holdout-experiment.md)
- [Phase 2 Identity independent acceptance](./acceptance/phase2-identity-research-report-attempt-3.md)
- [Prompt baseline](./prompt-baseline.md)
- [Implementation impact research](./implementation-impact.md)

Revision 4's all-paid-task response ledger and global response panel were not
approved. They remain historical research. Phase 3 is now explicitly limited
to paid large-model narrative正文 and requires a future revision.

Revision 11 的即时回合领域矩阵以 [prd.md](./prd.md) 为产品权威。它只改变既有
即时提案的语义解析、路由和确定性结算边界，不增加 Identity、Presentation、Item
或魔法生命周期字段。Appraisal、Social、Memory、宏观 Pacing、世界事实、线索、
隐藏 Story Arc、Opening 和 Translation 已移出本变更。

当前 `turn` workflow 仍在同一编排函数中调用既有 Pacing、Appraisal/Memory 和
Translation 工作流。本期不得修改这些调用、Prompt、模型次数、Reducer 写入或字段；
它们不是 `pre -> post -> optional dynamic -> Reducers` 即时链的改造对象，也不得
被用于本期 Regex 替换的语义 fallback。

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

Revision 7 Phase 2 production implementation was explicitly approved on
2026-08-17 and `HVG-P2-01` completed. Revision 11 records the narrowed
Immediate Turn Module boundary and was explicitly approved for the remaining
`HVG-P2-03/04/G3` work on 2026-08-17. The full target flow is:

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

Implementation and acceptance order:

```text
HVG-P2-01 dynamic Identity production contract (complete)
-> HVG-P2-03 final production call-chain cutover
-> HVG-P2-04 retire PM-confirmed immediate-turn runtime semantic Regex rows
-> HVG-P2-05 retire PM-confirmed immediate-turn migration semantic Regex rows
-> HVG-P2-02 physical 8 GB validation of that exact final candidate
-> HVG-P2-06 final deterministic, real-save, Prompt, blind and independent acceptance
```

The 8 GB run is a final integrated-product gate. It must not validate a
partial endpoint or block implementation of the code it is supposed to
measure.

Approved context values:

```text
post core: 4096
dynamic Identity 4B: 2048
ordinary-turn shared dynamic 4B: 4096
standalone Inventory contract endpoint: 4096
destroy micro: 1024
```

The 2026-08-17 quality review supersedes the earlier hard `2048` target for
post core and the shared dynamic call. These two production paths use complete
rules at `4096`; user-visible State accuracy, not a lower synthetic context
target, decides acceptance.

### HVG-P2-01 production boundary

`HVG-P2-01` productionizes the accepted Identity section without routing
ordinary turns through it:

```text
POST /api/hogwarts-mud/local/identity/observe
-> validate structured route targets and bounded input
-> zero work when identityTargetActorIds is empty
-> local_dynamic_identity_observer on qwen3:4b
-> one executable descriptor generates target-bounded Zod and transport Schema
   at exact num_ctx=2048
-> deterministic actor, segment, evidence, confidence and inspection guards
-> normalized identityObservations proposal
```

The request contains only:

```text
narrativeSegments[]
actors[] restricted to the route context
identityTargetActorIds[]
inspectionTargetActorIds[]
```

`identityTargetActorIds` and `inspectionTargetActorIds` are structured route
authority. The endpoint never derives either list from prose or Regex.
`inspectionTargetActorIds` must be a subset of Identity targets. The model
output is bounded to those Actor IDs and carries a stable
`evidenceSegmentIndex`. Deterministic code resolves evidence against that
narration segment, rejects invalid Actor/index/evidence/confidence claims and
permits `no_visible_injury` only for a structured inspection target.

`DYNAMIC_IDENTITY_RESULT_DESCRIPTOR` is the sole output-shape authority.
Both runtime Zod parsing and the actor/segment-bounded transport JSON Schema
are generated from its field map and route context; neither independently
handwrites the result keys, enums or numeric/string bounds.

One routed invocation makes exactly one local model request. A Schema, model
or transport failure propagates as an error; no repair, retry, provider
fallback or semantic Regex fallback runs. An unrouted invocation makes zero
requests. The endpoint returns transient proposals and does not write State.

Production files:

```text
src/hogwarts-mud/dynamic-identity-observer.js
src/hogwarts-mud/local-semantic-adjudicator.js
src/endpoints/hogwarts-mud.js
public/scripts/extensions/hogwarts-mud/domain/model-task-registry.js
public/scripts/extensions/hogwarts-mud/domain/model-task-runtime.js
public/scripts/extensions/hogwarts-mud/domain/prompt-budget-allocator.js
public/scripts/extensions/hogwarts-mud/runtime/model-event-scheduler.js
tests/hogwarts-mud-dynamic-identity.test.mjs
tests/hogwarts-mud-prompt-payload-consolidation.test.mjs
.trae/specs/hogwarts-runtime-contracts/state-fields.md
```

`HVG-P2-01` does not edit `turn.js`, the browser local-semantic adapter, the
Identity Reducer or the current post-turn output contract. Those removals and
ordinary-turn wiring belong to `HVG-P2-03`; physical 8 GB validation follows
the complete cutover and semantic Regex retirement.

### HVG-P2-03 Inventory route cutover

The existing Inventory observer now follows the approved current-turn order:

```text
paid narrative
-> local_post_turn_observer 1.7B
-> transient inventoryObservationRequired boolean
-> false: zero Inventory calls
-> true: include Inventory in POST /api/hogwarts-mud/local/dynamic/observe
-> local_dynamic_turn_observer on qwen3:4b at exact num_ctx=4096
-> same request also includes routed Identity when needed
-> descriptor-generated Zod and transport Schema
-> exact evidence, confidence, language and existing Item guards
-> existing Item Reducer
```

The post core no longer receives Inventory context, emits `inventoryUpdates`,
or decides the Inventory 4B call from prose Regex. The route boolean is
transient and never writes State. The dynamic endpoint receives bounded
`playerAction`, `narrativeSegments[]` and existing Item context only. A
non-routed turn makes zero dynamic calls; Inventory-only, Identity-only and
mixed Identity+Inventory routes each make exactly one shared call. Endpoint,
model, Schema or guard
failure returns zero Item proposals with no retry, Regex fallback or effect on
the already-generated narrative.

`INVENTORY_OBSERVATION_RESULT_DESCRIPTOR` is the single source for the
Inventory proposal output fields, Zod result Schema and transport JSON Schema.
The existing browser projection and Item Reducer retain authority for
candidate eligibility, Item evidence, transition legality, holder/location
and State writes. This cutover adds no Item, Presentation or lifecycle field.

### Phase 2 model contracts

`local_pre_turn_1_7b` proposes only bounded Check, movement, time and Calendar
commitment semantics. Deterministic code owns path/access, Check arithmetic,
clock legality and Calendar settlement. Revision 16 removes model arithmetic:
`basis=explicit + exact evidence` is the semantic proposal; the deterministic
duration parser owns Chinese/English/Arabic integer grammar, minute/hour/day
units, compound summation and the `1..10_080` range.

`local_post_core_1_7b` proposes existing Material events, Actor/perception
facts, stable narrative segment references, temporal claims and the transient
Inventory route. It does not own Item settlement, Identity injury assessment,
clock/Calendar settlement or Event closure. Material, Item, Actor/Presence,
witness and time guards keep their existing writers.

Revision 14 fixes the business boundary between two existing proposal families:

```text
individual Actor departure
-> Actor ID + explicit narration + confidence + room/path guards
-> existing Actor/Interaction/Presence settlement

Event boundary
-> separate local_event_boundary_observer every 10 committed turns
-> existing pendingEventBoundary narrative cadence
```

The first flow must not require the second, and the second must not infer any
Actor departure. Revision 16 removes Event fields from both immediate paid and
post contracts. Actor settlement retains Actor/evidence/room/path guards and
uses `locationKnown=false` when no valid destination exists.

`dynamic_4b_inventory` owns Item prose meaning. The Item Reducer owns stable
IDs, evidence, transition legality, holder/location and the permanent Item
existence invariant.

Dynamic Inventory does not receive an additional Actor directory in this
revision. Unknown display-name owner/holder values are rejected by the browser
stable-ID guard; they are never coerced to `player`. Adding a Prompt projection
or narrowing Actor coverage requires a later approved revision.

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

### Revision 12 pre/post 1.7B Prompt-only tuning design

Implementation result: **FAILED AND ROLLED BACK**. The design below is retained
as the approved experiment contract, not current runtime behavior. Production
continues to use the original pre/post System Prompts.

#### Scope and invariants

```text
changed:
  PRE_TURN_SYSTEM text
  POST_TURN_SYSTEM text
  domain-owned quality cases and evidence

unchanged:
  input payloads
  Zod and transport JSON Schemas
  browser guards
  Reducers and State fields
  pre/post call count and order
  dynamic 4B Prompt
  retry/fallback policy
```

The proposal cannot compensate for recall by adding a route field, another
model call, semantic Regex or deterministic prose classifier. It must improve
the existing 1.7B proposal.

#### Pre-turn Prompt structure

Replace the current long rule groups plus detached ten-example tail with this
decision order:

```text
1. Read playerTurnSequence entry types.
   action = enacted now.
   speech = spoken now, but its described future action is not enacted now.

2. Decide Calendar commitment.
   true: the player personally accepts/promises/agrees to a future attendance.
   false: question, invitation awaiting reply, wish, plan, hypothesis,
          recollection or quoted promise.

3. Decide progression.
   true: the current action asks to perform/complete one concrete practical
         step now, including open/unlock/handover/advance.
   false: discuss, inspect, remember or plan that step for later.

4. Decide Check.
   required only for an enacted uncertain attempt.
   targetActorId must be one exact supplied Actor ID or empty.

5. Decide elapsed time.
   explicit duration and route authority first; otherwise conservative
   ordinary minimum.

6. Final sparse self-check.
   requested=false => empty evidenceText.
   no Check => ruleId=none and empty targetActorId.
```

Each decision receives adjacent bilingual minimum pairs. Required pairs:

```text
commitment:
  "I promise to train with you on Saturday." -> true
  "Will you train with me on Saturday?"      -> false

progression:
  "*Open the locked archway now.*"           -> true
  "We can discuss opening it tomorrow."      -> false

Check target:
  supplied id canon_harry_james_potter       -> exact ID
  prose-only "the boy" with no matching ID   -> empty

time:
  "*wait for two hours*"                     -> 120
  speech "I might wait for two hours"        -> ordinary current turn
```

#### Post Prompt structure

Move binary route and closure decisions ahead of descriptive extraction:

```text
1. Decide inventoryObservationRequired.
   true if playerAction or completed narration establishes a possible
   acquire/carry/place/equip/unequip/give/lend/consume/damage/clean/lose/
   destroy operation on an existing or potentially durable Item.
   This is recall routing only; it does not approve the Item operation.
   false for mention, possession unchanged, question, conditional,
   hypothetical, negated operation or incidental scene prop.

2. Decide Event boundary.
   ended=true only with exact narrative evidence that the long interaction,
   bounded procedure or task itself is complete. Player intent and one
   individual's departure are not completion.

3. Decide Actor updates.
   emit only exact supplied IDs with narrative evidence of activity,
   presence or room change. Injury, Item handling and a name mention are not
   departure.

4. Extract perception, material and temporal claims.
   Existing evidence and normalization contracts remain unchanged.

5. Final sparse self-check.
   A field with no exact allowed evidence is empty/false.
```

Required post minimum pairs:

```text
Item route:
  narration "Tina placed the signed note on the desk." -> true
  speech "If I gave Harry the note..."                 -> false
  narration "Tina drank ordinary pumpkin juice."      -> false

Event/Actor:
  "Harry left through the doors; tea continues."       -> absent, ended=false
  "The tea conversation concluded; Harry stays."       -> ended=true, no departure
  "Harry's note lay on the desk."                      -> no Actor update
  "A cut was visible on Harry's palm."                 -> no departure
```

#### Offline experiment

1. Freeze exact production request hashes and current baseline outcomes.
2. Build pre and post matrices from the PRD families; do not derive scope from
   existing failed examples alone.
3. Tune pre and post independently. One candidate changes rule order and
   examples only; no Schema or input change.
4. Score raw proposal, guard rejection and final State separately.
5. Reject a candidate when any positive family loses recall, any negative
   produces State, or stable-ID acceptance is below `100%`.
6. Reserve at least `30%` Chinese/English/mixed paraphrases as unseen holdout.
7. Run each final production request once with no coaching or validation
   feedback, then run disposable-save E2E workflows.

#### Selection metrics

```text
positive recall per family: >= 95%
minimum family recall:      >= 90%
guarded incorrect State:    0
accepted stable Actor IDs:  100%
existing State tests:       158/158
Knowledge/ACL tests:         28/28
automatic retry/fallback:    0
ordinary/dynamic call count: unchanged
```

Aggregate accuracy cannot override a failed Calendar, progression or Item
family. Prompt size is reported with actual Ollama token counts and latency,
but no candidate wins by being shorter.

#### Rollback

The implementation commit must isolate the two System Prompt constants and
their focused tests. Rollback restores those constants; no save migration,
State repair, compatibility reader or dual Prompt is permitted.

Rollback was executed after:

```text
pre development: 24/24
pre final unseen holdout: 18/24
post best development: 17/24
post holdout: not opened because development failed
focused rollback regression: 31/31
```

The failures occurred with zero parse errors and sufficient output space.
Prompt-only tuning cannot close Revision 12 under the current compound
Schemas and qwen3:1.7b. A later revision must explicitly approve at least one
changed constraint: model capacity, task/Schema decomposition, deterministic
arithmetic ownership, or semantic routing architecture.

### Revision 13 benchmark-only qwen3:4b experiment

The recall benchmark now accepts `--model <name>` and passes it to the
existing `adjudicateTurn(..., { model })` and `observeTurn(..., { model })`
override ports. The CLI default is empty, so it preserves each production
setting; no production caller uses this option.

The frozen 48-case holdout ran with `qwen3:4b`, context `4096`,
`think=false`, the existing one-request policy and existing `120000 ms`
timeout. Result:

```text
overall: 22/48
pre parse/transport failures: 17/24
Check positive: 0/3
Actor positive: 2/3
Event positive: 3/3
combined action-positive recall: 5/9 (55.6%)
```

The model override is rejected as a production replacement. It cannot prove
the required individual NPC-departure behavior, and most pre requests do not
reach the paid narrative. The experiment observed one 4B instance at
`3,169,761,361` bytes `size_vram` and a sampled `llama-server` RSS peak of
about `4.05 GiB`; this is not a physical 8 GB full-application acceptance.

### Revision 14 NPC departure scope

Both fixed-PM discovery passes classify this as the partial capability
`NPC departure decoupling from Event boundary`, not an Event, Presence, Scene,
Memory or Social redesign. Current code has three coupling points: the post
Prompt calls focal departure an Event end, recovered Actor movement conditions
absence on `eventBoundary.ended`, and ordinary Actor settlement does the same.

Only the future Actor/Presence settlement condition may change. The following
remain unchanged: `eventEnded`, `pendingEventBoundary`, existing delayed
Memory/Social cadence, Scene/Calendar/Map, witness/EventKnowledge, all model
calls and all State fields. Documentation-only Revision 14 has runtime field
impact `None`.

### Revision 16 implementation design

#### Immediate Event removal

Remove, in the same task:

```text
scene_performance signals.eventEnded Prompt/validator/normalizer reader
local_post_turn eventBoundary Zod + transport Schema + Prompt rules
turn workflow isObservedEventBoundary overwrite
turn reducer immediate eventEnded -> pendingEventBoundary writer
```

Historical message `turnTransaction.eventEnded` remains readable but no new
turn writes it. EventKnowledge/perception remain immediate and independent.

#### Background Event task

Add `local_event_boundary_observer` as a world-ledger, nonblocking local task
triggered by `turn.event_checkpoint`. Its executable request contract is:

```text
input:
  checkpointTurn: positive integer divisible by 10
  windowStartTurn: checkpointTurn - 9
  windowEndTurn: checkpointTurn
  turns[10]:
    turn
    messageId
    sceneId
    clock
    publicEventEn
    closingNarrationEn (last committed narration segment, max 500 chars)

output:
  ended: boolean
  evidenceTurn: integer in window
  evidenceText: exact committed segment substring when ended=true
  confidence: 0..1
```

The browser scheduler runs only when `turn.count % 10 === 0` and the task
ledger has not attempted that checkpoint. It stores a fire-and-forget Promise
in `jobRegistry.eventBoundary`; the turn workflow does not await it.

The input projection is subtractive and bounded: it sends ten committed public
summaries plus each turn's final narration evidence, not full transcripts,
Actor libraries, EventKnowledge, Social/Memory State or raw chat. All ten rows
and their IDs are protected. The first implementation task must build this
request from the representative save without a model call and prove it fits
the existing 4096-token local context; overflow rejects the checkpoint with no
call and no truncation.

Success settlement uses one dedicated Event-boundary reducer. It verifies
timeline epoch, checkpoint, exact committed evidence and current task ledger.
`ended=true` creates the existing `pendingEventBoundary` and invokes existing
downstream Event-boundary work asynchronously. `ended=false`, invalid, stale
or failed output writes no boundary. Attempt at turn 10 prevents any retry
before turn 20.

#### Deterministic duration

The model transport temporal object no longer contains model-authored
`elapsedMinutes`. After Zod parsing:

```text
basis=route
  -> movementResolution.minutes

basis=explicit
  -> evidence must be exact enacted action text
  -> deterministic exact-duration parser

mode=instantaneous
  -> deterministic instantaneous policy

otherwise
  -> deterministic ordinary minimum
```

The parser accepts integer Arabic numerals, Chinese integer words and English
integer words followed by minute/hour/day units. Multiple exact components are
summed. Decimal/fraction/seconds/vague/range syntax, zero and totals above
10,080 are rejected without clamping. The final endpoint response adds
validated `elapsedMinutes`; the model never calculates it.

#### Unknown Actor location

`ActorRuntimeV1` adds `locationKnown`:

```text
locationKnown=true  -> mapId and roomId are legal known IDs
locationKnown=false -> mapId="" and roomId="", present=false
```

The Actor/Presence reducer may write false only for an exact named departure
proposal whose destination cannot be validated. Local Presence removes the
Actor. Spatial reconciliation preserves explicit unknown location and cannot
repair it back to the player's room. A later valid entrance/movement is the
only route back to `locationKnown=true`.

#### Harness impact

Update every constructor or fixture for:

```text
ActorRuntimeV1 exact keys
scene performance signals
local post result Schema
turn workflow ports and jobRegistry
model task registry/runtime rows
prompt measurement
recall fixtures (Event moves to its own 10-turn benchmark)
```

### Revision 17 movement implementation design

#### Semantic invariant

```text
movement tag = explicit attempt
movementIntent = bounded semantic proposal only
movementOutcome = sole committed result
player position = authoritative State
narrative = consumer, never movement authority
```

Allowed combinations:

| Outcome | Player location | `spatial.lastMovement` | Minutes | Narrative |
| --- | --- | --- | ---: | --- |
| `moved` | destination | replace with committed move | route minutes under current time policy | begin at destination |
| `already_there` | unchanged | unchanged | 15 | exact no-travel fact |
| `failed` | unchanged | unchanged | 15 | exact attempt/reason/remaining-room fact |

No movement tag means no proposal or outcome. `failed` is not equivalent to no
attempt.

#### Two pre-turn branches

```text
parse explicit movement directive
|
+- existing room resolves
|  -> existing deterministic applyPlayerMovement
|  -> movementOutcome
|  -> existing pre 1B receives committed movementResolution for time/check
|
+- no room resolves
   -> movementTrigger + bounded movementContext enter existing pre 1B
   -> movementIntent
   -> evidence/Actor/room guards
   -> existing applyPlayerMovement with validated guide options
   -> movementOutcome
```

The second branch does not add a model call. The pre result adds:

```text
movementIntent:
  requested: boolean
  guideActorId: supplied ID or ""
  destinationRoomId: supplied ID or ""
  evidenceSourceRef: supplied ref or ""
  evidenceText: exact supplied substring or ""
  confidence: 0..1
```

`movementTrigger` contains only marker kind, raw marker and its source range.
`eligibleGuideCandidates` contains at most 16 Actors from current
interaction/local Presence plus one immediately-prior committed departure
set. It does not send the Actor Library. Existing `room.rooms/exits` remains
the only room directory. `recentGuideEvidence` contains at most the last two
committed public turn facts, each at most 500 characters with stable refs.

The guard requires:

- an unresolved explicit movement marker;
- exact current-action evidence for the follow attempt;
- guide ID in the eligible candidate set;
- destination either the guide's known non-current room or exactly one
  supplied room grounded by eligible recent evidence;
- the proposal room ID to exist in the existing room projection;
- path/access/lock validation by the existing movement authority.

Any invalid or missing element maps to a deterministic failure reason; it does
not erase the tagged attempt.

#### Outcome and retry boundary

Add `MovementOutcomeV1`:

```text
version
status: moved | already_there | failed
mode: direct_room | follow_actor
guideActorId
fromMapId/fromRoomId
toMapId/toRoomId
remainingMapId/remainingRoomId
reasonCode
evidenceSourceRef/evidenceText
minutes
```

`movementPreflight` may exist on the current user message only before a
successful transaction, so a failed paid request can be diagnosed/retried.
On successful commit it is removed and
`turnTransaction.movementOutcome` becomes the sole committed authority. New
turns do not write legacy `extra.hogwartsMud.movement`.

Historical `extra.hogwartsMud.movement` remains read-only evidence for old
turns and is never injected beside a current transaction outcome. New
spatial/history readers use transaction outcome for Revision 17 turns and the
legacy reader only for messages predating the version boundary.

#### Narrative projection

`movementOutcome` continues through the existing protected
`LowTierContextV1.playerTurn.movementResolution` slot. Do not add a sibling
copy.

For `failed` and `already_there`, deterministic code creates
`movementOutcomeFactEn` from validated IDs and reason code. It is included in
the paid request. After one paid response:

```text
if exact fact already occurs in narration:
  preserve all segments
else:
  prepend one narration segment containing the exact fact
  preserve all paid segments byte-for-byte
```

This is a deterministic projection of an accepted fact, not semantic Regex,
model repair, retry or replacement prose. Successful movement retains the
existing destination-grounding validation.

#### Failure mapping

Stable categories include:

```text
movement_semantic_unavailable
movement_schema_invalid
guide_not_eligible
guide_evidence_invalid
destination_unknown
destination_conflict
destination_invalid
different_map
route_blocked
already_there
none
```

The rules layer owns reason selection. The 1B never emits reason codes.

#### Harness inventory

Update every direct constructor/stub for:

```text
pre-turn Zod and transport result
local semantic adapter request/fallback
turn workflow movement ordering and transaction builder
LowTier playerTurn movementResolution
turn settlement endpoint/fallback
movement history/retry readers
representative-save prompt measurement
recall benchmark expected full output
```

Focused owners remain movement-resolution, local-semantic-recall,
turn-protocol/validation/recovery and prompt-payload tests. A production-path
test must prove that guided options are produced by the real turn workflow,
not manually injected into `applyPlayerMovement`.

### Revision 18 pre-progression subtraction

#### Contract boundary

Remove `progression` from `LocalPreTurnResultV1`. The remaining pre result is:

```text
schemaVersion
temporal
check
calendarCommitment
movementIntent
```

There is no replacement classifier. Regex, deterministic code, 4B and a second
paid request are forbidden from deciding whether prose asks for progression.
The paid narrative request already contains the complete player action.

#### Paid narrative rule

Add exactly one static System Prompt rule:

```text
When the player explicitly requests an immediate concrete step, complete it
in this response when legal; do not stop at preparation.
```

Existing protected movement, Check, Item, path, lock and State facts remain
authoritative. "When legal" never permits narrative invention to override a
failed or absent deterministic settlement.

#### Runtime subtraction

Delete:

```text
pre result.progression
pre transport/Zod progression shape
validatePreTurnProgression
browser progression route guard
fallback progression object
progressionRejected/progressionError diagnostics
createSceneMomentumDirective(progression)
momentumDirective.explicitProgressionRequest
sceneProgression.completedRequestedStep
unconfirmed_requested_progression warning
```

Keep:

```text
sceneProgression.type
sceneProgression.summaryEn
15-minute concrete-momentum validation
Calendar/Check/time/movement pre responsibilities
10-turn asynchronous background Event
```

The paid `sceneProgression` object describes what the accepted narrative
actually advanced. It is not a semantic proposal, a completion proof or State
authority.

#### Route-scoped pre Prompt

Revision 18 follow-up measurement showed that ordinary pre requests were
carrying the complete follow-NPC instruction block even when
`movementContext=null`. The production builder now composes:

```text
common Calendar/temporal/check rules
+ empty movementIntent rule                    when movementContext=null

common Calendar/temporal/check rules
+ complete supplied-ID/evidence movement rules when movementContext exists
```

This is Prompt subtraction, not a router or call-graph change. Both paths keep
one pre request and the same output field set. The follow supplement does not
enter ordinary Calendar/time requests; no Regex, 4B, retry or fallback is
added.

The exact-duration parser distinguishes English hyphenated integers from
ranges:

```text
sixty-seven minutes -> accepted integer
2-3 hours            -> rejected range
two to three hours   -> rejected range
```

#### Verification

- exact pre request/result shape omits `progression`;
- exact paid input omits `explicitProgressionRequest`;
- paid output and protocol omit `completedRequestedStep`;
- the static System Prompt contains the single approved rule;
- progression recall fixtures are archived or removed from the active matrix;
- call count remains pre 1, paid 1, post 1 and dynamic 0/1, with no retry or
  fallback;
- focused protocol, validation, prompt measurement and full regression pass.
- fresh Calendar/time acceptance remains mandatory; the seen matrix cannot
  override a fresh family failure.

### Revision 19 pre production and post round

#### Calendar deferral

`calendarCommitment` remains in the pre Schema and existing supported
commitments continue to route through the Medium Calendar workflow. The known
date/time-prefixed Chinese miss is moved to stable task
`HVG-P2-03R-CALENDAR-TODO`.

This is an explicit acceptance-boundary change, not a quality pass:

```text
miss -> no Calendar write
retry -> 0
4B fallback -> 0
semantic Regex/code fallback -> 0
```

#### Pre status

The current production pre contract is accepted for this revision:

```text
one qwen3:1.7b request
temporal/check/calendarCommitment/movementIntent
deterministic duration arithmetic
deterministic movement/ID/evidence/route guards
no progression
```

Calendar TODO evidence remains linked and must not be deleted or overwritten by
seen-matrix scores.

#### Post exact contract

`LocalPostTurnResultV1` remains:

```text
schemaVersion
materialEvents[]
actorUpdates[]
inventoryObservationRequired
perception
temporalClaims[]
```

Ownership:

| Output | Semantic proposer | Deterministic authority / writer |
| --- | --- | --- |
| `materialEvents[]` | post 1.7B | Material evidence/transition guards and existing Material reducer |
| `actorUpdates[]` | post 1.7B | Actor ID/evidence/room/path/presence guards and Actor/Presence settlement |
| `inventoryObservationRequired` | post 1.7B | transient route only; existing shared dynamic 4B and Item guards/Reducer |
| `perception` | post 1.7B | participant, witness, room and ACL guards |
| `temporalClaims[]` | post 1.7B | narrative evidence/normalization/time-authority guard; no direct State write |

Immediate Event output remains physically absent. Background Event remains the
only Event-boundary semantic owner.

#### Post quality baseline

The current one-shot holdout has zero parse/transport failures but fails
business semantics:

```text
Inventory route: positive 0/5, negative 5/5
Actor update:    positive 2/3, negative 0/3
Temporal claim:  positive 0/1, negative 1/1
```

Actor negative failures are State-safety failures because a named no-change
sentence can survive evidence grounding and overwrite `currentActivityEn`.
Revision 19 post acceptance therefore requires both positive recall and
negative no-write precision; aggregate accuracy cannot compensate.

#### Post implementation invariants

- exactly one post qwen3:1.7b request;
- no second semantic model request, repair, provider fallback or Regex meaning
  inference;
- no Schema field, State field, Reducer or model tier change;
- no new Item, Material, Actor, Identity, Presentation or Event semantics;
- paid narrative remains visible when post or dynamic observation fails;
- Material path is preserved and tested, not silently deleted;
- any post Prompt revision is measured through the representative-save
  production builder and fresh blind model simulation.

### Revision 21 off-the-shelf GLiNER2 comparison

#### Architecture boundary

```text
frozen fresh case
├── branch current:
│   createPostTurnModelRequest()
│   -> one qwen3:1.7b response
│   -> current parser/adoption/guards
└── branch gliner2:
    canonical source-text projection
    -> one fastino/gliner2-base-v1 forward
    -> detached exact-span/ID adapter
    -> same comparison guard semantics
-> same normalized scorer
-> Pareto comparison
```

Neither branch invokes Reducer commit, endpoint, browser workflow, dynamic 4B
or persistence.

#### Frozen artifacts

| Artifact | Purpose | Freeze gate |
| --- | --- | --- |
| `benchmarks/rev21-gliner2-zero-shot-schema.json` | exact combined schema, labels, descriptions, choices and confidence threshold | before corpus generation |
| `benchmarks/rev21-gliner2-zero-shot-infer.py` | load model once; read NDJSON cases; one forward/case; return raw spans/confidence | before corpus reveal |
| `benchmarks/rev21-gliner2-zero-shot-comparison.mjs` | canonical text builder, current baseline runner, detached adapter, guards and scorer | before corpus reveal |
| `benchmarks/rev21-fresh-comparison-cases.json` | fresh hidden comparison corpus | generated only after request/schema hashes freeze |
| `benchmarks/rev21-gliner2-zero-shot-results.json` | bounded machine evidence | generated by approved run |
| `acceptance/phase2-revision21-gliner2-zero-shot-report.md` | human-readable family-first report | after run |
| `tests/hogwarts-mud-gliner2-zero-shot-research.test.mjs` | focused research-contract/no-write/call-budget test | before model run |

No artifact is imported by a production composition root.

#### Canonical source projection

The GLiNER2 model input contains only bounded current-turn source text,
joined by blank lines without visible role/segment marker tokens:

```text
<player source text>

<English authority text>
...
```

Actor, Item and room directories are not appended as narrative text. The model
extracts actor/room/item mentions as source spans; deterministic code then
maps an exact mention against the supplied case authority. This prevents an
authority directory row from becoming false event evidence.

Visible markers were rejected during the pre-corpus smoke because the
off-the-shelf model selected `NARRATIVE_SEGMENT` as evidence. Source ownership
is therefore carried only by code-side offset ranges that are never shown to
the model.

The projection records global character ranges for player action and each
narrative segment. Every extracted evidence span must resolve to exactly one
source range. Actor evidence continues to require a narrative segment; player
first-person text cannot become an NPC update.

Input is bounded to one GLiNER2 context. Truncation and long-context chunking
are forbidden; over-limit input fails the case.

#### Combined GLiNER2 schema

The frozen descriptor uses the official combined-schema surface:

```text
structures:
  material_event[]
  inventory_route[]
  actor_update[]
  perception[]
  temporal_claim[]
```

Choice fields mirror existing enums. Extracted text fields request confidence
and character spans.

Minimum mapping:

| Structure | Required semantic output |
| --- | --- |
| `material_event` | type, actor mention when applicable, object/source/target/value/result, operation, slot/hand/persistence where applicable, evidence |
| `inventory_route` | route/no_route decision plus evidence |
| `actor_update` | actor mention, activity span, presence, room mention, evidence |
| `perception` | scopes, salience, attribution, concealment, direct-participant mentions, evidence |
| `temporal_claim` | kind, evidence, clock/duration/relation spans or choices |

The adapter may perform only:

- source-span grounding;
- exact Actor/Item/room mention-to-ID resolution;
- finite number/clock/duration normalization;
- enum/shape validation;
- construction of complete detached candidate objects.

It may not infer omitted meaning. A missing required field invalidates that
candidate. Missing structure/family is scored as a miss.

#### Baseline branch

The baseline uses the exact current production request builder and model:

```text
createPostTurnModelRequest(case.input)
model qwen3:1.7b
temperature 0
think false
context 4096
one request
unload true
```

It runs serially before the GLiNER2 branch. Revision 20 A/B/C/D results are not
the baseline.

#### Detached guard/scorer

The comparison runner reuses direct production exports where available:

- `normalizeMaterialEvents()`;
- `validateObservedPerception()` and `validatePerceptionContract()`;
- `validateObservedTemporalClaims()` and
  `validateSceneTemporalConsistency()`;
- `reduceLocalPresence()` / `resolveEventWitnesses()` on detached fixtures.

Actor proposal validation is a focused detached equivalent of the current
adapter constraints: supplied Actor, exact narrative evidence, valid room,
legal presence/location combination, and confidence threshold. It does not
write transaction or State.

Inventory route requires an explicit route result and grounded evidence in
the GLiNER2 branch. The normalized scorer then compares both branches against
the same expected shape:

```text
inventoryObservationRequired
materialEvents[{type, actorId, segmentIndex, required arguments}]
actorUpdates[{actorId, presence, roomId, activity/evidence span}]
perception{participants, scopes, salience, attribution, concealment}
temporalClaims[{kind, segmentIndex, normalized finite fields}]
```

#### Fresh corpus protocol

Before generation, persist SHA-256 hashes for:

- model/package identity;
- schema descriptor;
- Python inference runner;
- Node comparison/scoring runner;
- focused test.

A fresh Agent with no prior-case, benchmark, report or known-failure context
then generates the complete matrix from the five-family business contract.
The main implementation context does not edit the corpus after reveal.

Required coverage:

- every Material event type;
- per-family positives and hard negatives;
- Material+Inventory dual output;
- two-, three- and five-family mixed cases;
- quotation, hypothetical, negated, recollected, attempted failure,
  injury-only, name-only, unchanged and wrong-participant cases;
- English/Chinese/mixed player action with English narrative authority;
- at most 16 supplied Actors.

#### Pareto scorer

For each family, calculate guarded:

```text
positive_complete / positive_total
negative_safe / negative_total
accepted_false_writes
parse_or_model_failures
```

For mixed cases, calculate:

```text
all_relevant_families_complete / mixed_total
```

GLiNER2 becomes `eligible_for_trial_review` only when:

```text
for every family:
  gliner positive >= baseline positive
  gliner negative >= baseline negative
  gliner false writes <= baseline false writes

and:
  at least one baseline-failing family improves strictly
  mixed complete improves strictly
```

No `>=95%` rule applies to Revision 21. No weighted total or average is an
acceptance metric.

#### Environment and operational evidence

The approved run will use a temporary isolated `uv` environment outside
production dependencies. Pin:

```text
gliner2[local]==1.3.2
fastino/gliner2-base-v1 model revision/hash captured at download
```

The model loads once, processes cases serially and unloads after the branch.
Record:

- Python and package lock;
- package/model/cache bytes;
- cold/warm load milliseconds;
- per-case inference milliseconds;
- p50/p95 and wall time;
- process peak RSS / macOS unified-memory observation;
- one forward/case;
- input size and zero truncation;
- network calls after local model availability;
- environment/cache cleanup.

Dependency download failure blocks the experiment. Cloud GLiNER API, another
model, a broader model or a package-version substitution is not a fallback.

#### No-impact contracts

```text
Runtime fields: None
Migration/compatibility: None
Frontend whitelist: None
Production Prompt budget: None
Production model calls: None
State writers: None
```

#### Promotion boundary

`eligible_for_trial_review` is evidence only. A later explicitly approved
revision must define trial switch, cohort, rollback, diagnostics, local
dependency lifecycle and production acceptance. This Revision cannot install
GLiNER2 into SillyTavern runtime or expose it to a player.

### Revision 22 temporal-only GLiNER2 schema ablation

```text
new fresh temporal-only case
-> canonical current-turn source text
-> same checkpoint / serial forward A: committed full combined Schema
-> same checkpoint / serial forward B: frozen temporal-only Schema
-> preserve raw input/schema/output for both branches
-> detached temporal normalization + existing temporal guards
-> improved / same / worse / indeterminate diagnostic
```

The only controlled variable is the schema:

```text
combined:
  material_event, inventory_route, actor_update,
  perception, temporal_claim

temporal-only:
  temporal_claim
```

Both branches receive the identical marker-free canonical source text. The
temporal-only descriptor contains the same `temporal_claim` field names,
choice labels, descriptions and thresholds as the committed combined
descriptor. It may not add candidate wake-up, semantic Regex, a new model,
special few-shot examples, or a repair pass.

The diagnostic runner:

- loads one model once and runs branch A then branch B serially;
- makes one forward per branch per case;
- retains `schema`, `canonicalInput`, raw `result`, error, elapsed time and
  forward count for each branch;
- performs detached `validateObservedTemporalClaims()` and
  `validateSceneTemporalConsistency()` only;
- has no reducer, endpoint, persistence, post task or State import;
- marks an emitted claim rejected by either temporal guard as rejected rather
  than silently empty.

The fresh corpus contains only temporal positive and temporal no-claim
workflows. It must be newly generated after schema/runner freeze, and no
previous Revision 21 temporal cases may be used for score or wording
selection. A concise human report lists every raw input and raw extraction.

This artifact remains a diagnostic. It cannot modify VCON-013, replace the
current combined 1.7B post request, establish a serial multi-forward budget,
or authorize trial.

### Revision 23 Qwen temporal-only raw-hint comparison

```text
fresh temporal-only case
-> immutable canonical source projection
-> one GLiNER2 temporal-only raw extraction
-> Qwen A: canonical source, temporal-only request
-> Qwen B: byte-identical canonical source + labeled raw GLiNER2 output/error
-> exact Qwen raw output/error capture
-> detached current temporal guards
-> improved / same / worse / indeterminate diagnostic
```

The Qwen System Prompt, temporal-only JSON Schema, `qwen3:1.7b`,
`temperature=0`, `seed=42`, `think=false`, `num_ctx=4096`, and canonical
source are identical for A and B. The only intentional Qwen-input difference
is B's `rawGlinerHint` field. B's System Prompt explicitly states that the
hint is non-authoritative and potentially wrong; it must decide only from the
canonical source text.

The GLiNER branch:

- uses the same `fastino/gliner2-base-v1` temporal-only descriptor as Revision
  22, pinned to the same checkpoint;
- retains its untouched output and error without converting it into a Qwen
  candidate gate;
- exits before the Qwen branch begins, so no Qwen/GLiNER concurrent residency
  is allowed;
- cannot cause Qwen A or B to be skipped. If GLiNER fails, B receives the
  literal error in a labeled unavailable hint envelope and still executes once.

The Qwen branch:

- calls Ollama directly through a research-only runner, not a production model
  task, endpoint, Reducer or scheduler;
- uses a temporal-only output shape containing only `schemaVersion` and
  `temporalClaims`;
- keeps the literal request (System, User, format Schema, model/options) and
  raw response before parsing or detached guard evaluation;
- never retries, repairs, falls back to another provider/model, or writes
  State.

The runner and focused static test freeze before a fresh isolated corpus is
created. Each case has one GLiNER forward, one Qwen A call and one Qwen B call;
missing or duplicate branch records are indeterminate, never a no-claim pass.
The result records source hashes and the current temporal guard-source hashes.
Guarded outcomes are diagnostic only, because VCON-013 and its runtime files
remain production authority and are not being versioned or modified by this
research task.

The report is intentionally evidence-first rather than a promotion report: it
lists each source, GLiNER raw output, literal A request/output, literal B
request/output, and detached guard result. It cannot authorize production
serial forwards, a GLiNER trial, changes to VCON-013, or a State writer.

Observed result:

```text
improved / same / worse / indeterminate: 1 / 6 / 3 / 0
baseline Qwen semantic exact: 4/10
hinted Qwen semantic exact: 2/10
```

The raw hint changed Qwen output but did not improve positive extraction and
introduced three negative-case regressions. The runner writes disposable
benchmark input/output plus result/report artifacts; its zero-write invariant
means zero production/State write, not zero filesystem artifact write.

### Revision 24 post small-model extraction research

Revision 24 is documentation and external research only. It freezes no new
runtime artifact and does not introduce a candidate VCON row.

The relevant future proposal shape is deliberately decomposed:

```text
canonical completed narration
-> shared compact encoder
-> actor operation / actor pointer / room pointer / evidence-span heads
-> temporal operation / evidence-span heads
-> existing deterministic guards
-> existing owning Reducers
```

This is a research direction, not a selected architecture. The semantic
separation is mandatory if it is ever prototyped:

```text
entity span != current-fact assertion
actor mention != activity or presence update
room mention != actor room update
time expression != temporal claim
model proposal != State write
```

The external review identifies three model classes:

| Class | Example | Research position |
| --- | --- | --- |
| compact task-adapted encoder | DeBERTaV3-xsmall/small, or ModernBERT comparison | primary direction; multi-head supervised classifier/pointer/span extractor |
| compact JSON extractor | NuExtract tiny | optional task-tuned decoder baseline only |
| schema IE model | PP-UIE 0.5B | optional detached extraction baseline only |

SetFit and SpanMarker may help individual classification/span tasks but do not
own linked actor-room-time proposals. TripPy, SPLAT, OneIE and DyGIE++ are
task-decomposition references, not direct runtime dependencies.

No candidate may be downloaded, trained, used for a production call, or
registered as a State proposal owner before a future approved revision defines
the corpus/provenance, label semantics, no-update hard negatives, call budget,
runtime residency, focused tests and fresh acceptance.

### Revision 25 VCON-013 provider selection

#### Configuration and migration

Add one normalized configuration value in both the extension settings default
and active timeline configuration:

```text
postTurnSemanticProvider: "low" | "local"
```

Normalization:

```text
missing / invalid -> "low"
```

The settings controller persists it with the same operation that currently
persists `modelSlots`: extension settings receive the next-timeline default;
an active timeline receives its own saved value. It does not change a
Connection Profile, secret, model Slot, State writer, or semantic world fact.

The settings UI places a compact `Post-turn semantic proposal` control beside
the existing Low/Medium/High role cards:

```text
Low Connection Profile (default)
Local
```

The Low option renders the current Low Profile name/model as technical
configuration detail. The selector has finite static labels; the Profile/model
detail remains the existing configuration-only allowlisted field family.

#### Task and call graph

The existing task is renamed from `local_post_turn_observer` to
`post_turn_semantic_proposal`. It keeps the same trigger, phase, output
families and call budget, but its allowed execution tiers become:

```text
local | low
```

```text
completed narrative + canonical player action
-> read state.postTurnSemanticProvider
-> low:
     one model-event-scheduled role request on resolved modelSlots.low
     raw response -> server settlement endpoint
-> local:
     one queued Ollama call through current local endpoint
-> same language adoption + existing guards
-> same owning Reducers
```

Both branches are serial and mutually exclusive. The Low branch uses the
complete Low Connection Profile with its selected Chat Completion Preset,
context and response configuration. The request explicitly disables
role-profile Regex handling; Regex must not modify, interpret, repair or
select VCON-013 semantics.

#### Shared transport and settlement

The post System Prompt and JSON transport schema move to one browser/server
shared executable descriptor. This prevents the new Low request from gaining a
second divergent Prompt/Schema authority:

```text
shared descriptor
-> Local Ollama transport + server Zod parse
-> Low Connection Manager JSON-schema request
-> server raw response parse + same Zod parse
-> same language adoption / evidence / ID / temporal / perception guards
```

The server settlement endpoint accepts only bounded raw post output plus the
same canonical input. It does not call a provider. It parses/validates the
untrusted result before exposing it to the existing adapter, and rejects any
failure as a no-proposal result.

#### Failure handling

| Branch | Failure | Required result |
| --- | --- | --- |
| Low | missing/deleted Profile, provider error, invalid JSON/Schema, language/adoption/guard rejection | narration remains; no VCON-013 proposal; no Local request |
| Local | Ollama unavailable, invalid JSON/Schema, language/adoption/guard rejection | narration remains; no VCON-013 proposal; no Low request |
| Either | `inventoryObservationRequired` absent because core failed | no 4B Inventory wake as substitute |

The previous deterministic perception fallback is not emitted for a failed
selected VCON-013 provider. It would manufacture a post-derived semantic
proposal after the user-selected one-call source failed.

#### Verification

Focused tests must prove:

1. normalization and active-timeline persistence default to `low`;
2. UI labels/details use existing locale and configuration routes;
3. Low emits one Connection Manager request with shared System/Schema and no
   role Regex mutation;
4. Local emits one current local request and no Low request;
5. raw Low output reaches exactly the existing server adoption/guard path;
6. no cross-provider fallback/retry/repair occurs;
7. provider failure leaves narrative visible and emits no five-family post
   proposal or dynamic Inventory substitute;
8. pre, Medium, High, paid Low performer and 4B routes retain their existing
   task identities and budgets.

### Revision 20 structured candidate wake-up research

#### Semantic invariant

```text
candidate membership != semantic truth
candidate miss != semantic false
paid proposal != State authority
exact text/ID match != enacted change
finite temporal shape != temporal assertion
```

Only `local_post_core_1_7b` may decide whether candidate prose is enacted,
quoted, hypothetical, negated, unchanged, injury-only, an Item/Material
change, an Actor update or a temporal assertion. Candidate code may only
produce bounded references. Existing guards and Reducers retain final
authority.

#### CandidateWakeV1 experimental descriptor

The experiment may construct a transient, non-State descriptor:

```text
schemaVersion
candidateGroups[]:
  domain:
    material | inventory_route | actor | perception | temporal
  sourceKinds[]:
    paid_proposal | item_directive | segment_role |
    exact_actor | exact_item | exact_room | finite_temporal_shape
  sourceRefs[]
  segmentIndices[]
  actorIds[]
  itemIds[]
  roomIds[]
```

Forbidden fields include any semantic result such as `completed`, `departed`,
`changed`, `quoted`, `hypothetical`, `asserted` or `true/false` domain
decisions.

Every group is bounded:

- source refs/segment indices must resolve to the current turn;
- IDs must come from supplied current authority;
- duplicate references collapse into one group without copying prose;
- candidate groups contain references and IDs, not full Actor/Item/Map
  databases;
- candidate miss is surfaced in evaluation diagnostics.

#### Candidate source rules

| Source | Experimental transform | Authority |
| --- | --- | --- |
| folded paid `actorUpdates/itemUpdates` | retain stable IDs and source refs as wake hints | candidate only |
| player `itemDirectives` | retain Item ID/intended operation ref | object selection/intention only; not completion |
| narrative segment type/speaker | retain segment index and supplied dialogue Actor | shape/attribution candidate only |
| exact Actor name/alias | map literal occurrence to supplied Actor ID | candidate recall only |
| exact Item/room names/IDs | map literal occurrence to supplied stable ID | candidate recall/constraint only |
| finite temporal parser | retain matching segment index and shape class | finite syntax only |

Natural-language verb, negation, hypothetical, quotation, injury or no-change
patterns are forbidden candidate rules.

#### Dynamic Schema composition

The experiment builds one transport Schema:

```text
always:
  schemaVersion
  perception

optional by candidate group:
  materialEvents
  inventoryObservationRequired
  actorUpdates
  temporalClaims
```

For mixed turns, the Schema is the union of every candidate domain. A domain
cannot be dropped because another domain is present. Each optional section
uses the existing VCON-013 result shape and downstream settlement contract;
the experiment does not invent State fields or writers.

The current fixed compound request is replaced inside the experimental
harness, never sent beside the dynamic request. Exactly one post model call is
captured.

#### Exploration branches

| Branch | Candidate priority | Main question |
| --- | --- | --- |
| A | paid structured proposals/directives first; exact/finite recall supplements | can high-precision structured hints retain complete recall? |
| B | exact/finite recall first; paid proposals supplement references | does broader deterministic recall reduce candidate miss without false semantic authority? |
| C | bounded Material + perception core always present; Item/Actor/temporal dynamic | does retaining the weakest-recall family prevent Material misses without recreating full interference? |
| D | paid model emits transient `postCandidateKinds`; other sources verify candidate breadth | is paid candidate recall worth its added output/error/token cost without becoming truth? |

Branch D remains experimental and cannot alter the paid production output
until separately approved after evidence.

#### Experiment data isolation

No existing case file or Revision 12/17/19 failure phrase may enter the fresh
case generator context.

```text
exploration corpus:
  fresh context
  generated once
  frozen before candidate tuning
  becomes development-only after first reveal

blind corpus:
  final request hash frozen first
  second fresh context
  cases generated and executed without revealing them to implementer
  one response per case
```

Existing matrices may run only after selection as non-scoring regression.
Reports must show fresh candidate recall, semantic result and guarded outcome
per family; aggregate scores cannot hide a failed family.

#### Experiment harness and no-write boundary

The experiment:

- calls exact Ollama qwen3:1.7b once per case;
- feeds untouched output through experimental parser plus the real existing
  domain guards where possible;
- captures call count, Prompt/Schema size, input/output tokens and latency;
- performs no endpoint deployment, browser save, real archive write, State
  migration or Reducer commit;
- deletes temporary raw private Prompts/responses after summarizing bounded
  evidence.

#### Acceptance before implementation proposal

The research report may recommend production implementation only if fresh
blind evidence satisfies all PRD family thresholds, mixed-domain completeness,
zero semantic Regex authority, one-call budget and no-write failure behavior.
Otherwise Revision 20 remains research-blocked and production stays on the
safe Revision 19 contract.

Revision 20 research has no runtime field, migration, compatibility, frontend
or production call impact. Experimental descriptors and Schemas are not
persisted and are not imported by the production composition root.

#### Research outcome

Branch A/B structured/exact candidate wake achieved complete Inventory, Actor
and temporal candidate recall but `0/13` Material recall. Branch C made
Material always-on, restoring all 13 candidates but causing `26/48`
parse/transport failures and cross-domain pollution. Branch D requires a new
paid `postCandidateKinds` output field; no oracle substitute was permitted.

All executable branches scored `0/8` mixed-domain complete pass. No final
request/hash was frozen, and the blind phase correctly did not start.
Production implementation remains unauthorized.

### Phase 2 runtime Regex scope closeout

The current manifest contains:

```text
434 total / 347 accepted lexical / 85 semantic runtime /
0 semantic migration / 2 dead or retired / 0 unclassified
136 append-only semantic retirement events
```

Every PM-confirmed Immediate Turn semantic Regex is retired. The exact 85-row
remainder is frozen as supporting scope evidence in
[`phase2-excluded-semantic-runtime.json`](./phase2-excluded-semantic-runtime.json):

| Excluded owner boundary | Rows | Reason |
| --- | ---: | --- |
| Social/Appraisal, including Appraisal error-prose mapping | 43 | Social, Appraisal and Memory are excluded |
| Opening and Opening-shared narrative authority | 22 | ordinary Turn callers were cut; Opening remains unchanged |
| deferred Identity/Presentation appearance | 9 | new appearance and lifecycle fields remain a separate TODO |
| Translation | 7 | Translation has no Phase 2 production authorization |
| process/sensitive-field governance | 3 | process/task operations are excluded |
| macro Pacing | 1 | macro Pacing is a separate future PRD |

Excluded rows remain registered semantic debt. They have no retirement events
and cannot be counted as Phase 2 removals.

### Phase 2 blockers

- ACCEPTED RESEARCH GATE: fresh independent attempt 3 verified the
  structured route, all 45 chains, `740/800` raw checks and `800/800`
  post-guard checks with zero route or parse failures.
- PASSED for `HVG-P2-01`: fresh context-free blind production-chain
  acceptance is recorded in
  [phase2-production-identity-blind-report-attempt-2.md](./acceptance/phase2-production-identity-blind-report-attempt-2.md).
- ACCEPTED for `HVG-P2-01`: the fourth fresh independent project-goal Agent
  passed the complete tranche in
  [phase2-production-identity-independent-report-attempt-4.md](./acceptance/phase2-production-identity-independent-report-attempt-4.md).
- TODO AFTER `HVG-P2-03/04/05`: run the final candidate on a physical 8 GB
  machine with SillyTavern and the normal browser workload.
- APPROVED IMPLEMENTATION: Revision 11 authorizes `HVG-P2-03`,
  `HVG-P2-04` and `HVG-P2-G3` for the existing Immediate Turn paths only.
- BLOCKED OUTSIDE CURRENT REMEDIATION SCOPE: the real-save Prompt gate reports
  Scene Transition `76,531 > 76,100`, and the existing Memory medium-projection
  test exposes `MEDIUM_MEMORY_LOCKED_EVENT`. Neither excluded domain was
  modified.
- BLOCKED OUTSIDE CURRENT REMEDIATION SCOPE: the formal G3 real ordinary turn
  measured `narrative_visible=40,437 ms` and `state_settled=55,817 ms`, then
  refresh advanced `spellbook.lastScannedMessageId` and committed a
  `lifecycle_migration` revision. `state_settled` is therefore not yet the
  final persistent State boundary; Spell lifecycle remediation is excluded.
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

`HVG-P2-01` adds no State field and does not change a State writer. The living
runtime contract also registers the existing persisted message-level
`extra.hogwartsMud.localAdjudication.result` snapshot. Phase 2 extends that
snapshot with evidence-bounded `calendarCommitment` and `movementIntent`
routes; neither is direct State authority. Revision 18 removes the obsolete
`progression` snapshot field. The model-task registration remains:

```text
MODEL_TASK_REGISTRY.local_dynamic_identity_observer
ledgerScope=server_ephemeral
22 catalog tasks / 18 active tasks / 16 save-runtime rows
```

The endpoint cannot write `modelTaskRuntime` or increase `stateRevision`.
Revision 12 changes no runtime field, writer or reader. It changes only
transient pre/post proposal quality under the existing `VCON-012/013`
contracts.
Future ordinary-turn cutover and Phase 3 revisions must reconcile every
affected State field before implementation.

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

Revision 12 call impact:

```text
pre model calls: unchanged at 1
post model calls: unchanged at 1
dynamic 4B calls: unchanged at 0/1
retry/repair/provider fallback: unchanged at 0
changed Prompt fields: none
changed Prompt text: PRE_TURN_SYSTEM and POST_TURN_SYSTEM only
runtime context: 4096 for pre/post
```

Final runtime impact after rollback: zero. The 8192-context candidates were
experimental only and are not active.

Current representative-save baselines are `9,214` pre message characters and
`10,758` post message characters. They are observability values, not lower
artificial gates. Final variants record actual Ollama input/output tokens and
p50/p95 latency alongside State recall/precision.

Revision 17 keeps:

```text
pre calls: 1
post calls: 1
movement-specific 4B calls: 0
paid calls: 1
retry/repair/provider/semantic Regex fallback: 0
pre num_ctx: 4096
loaded local models: at most 1
```

The pre request reuses its existing room/exit and current Actor projections.
Only the trigger, immediately-prior departure candidate/evidence and
`movementIntent` output shape are additive. Low reuses the protected
`playerTurn.movementResolution` field. Before implementation edits, scoped
build-only measurement must bypass unrelated role assertions and capture the
current pre and Low requests from the same representative save. After each
Prompt edit it records total/System/Schema/section characters, actual
Ollama prompt/output tokens, complete JSON success and p50/p95 latency.

Revision 18 changes no call or residency policy. It removes one pre output
object and one dynamic paid input flag, removes one paid output boolean, and
adds one short static paid System Prompt sentence. Actual pre/paid request
sizes are remeasured; no shorter artificial ceiling is introduced.

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
