# Hogwarts Validator Governance PRD

## 1. Change ID and Status

- Change ID: `hogwarts-validator-governance`
- Artifact revision: `7-cross-mechanism-registry`
- Status: Phase 1 governance baseline and benchmark-only Phase 2 Identity
  research gate independently accepted; cross-mechanism responsibility table
  established; future enforcement belongs to each owning system's tests;
  Phase 2 and Phase 3 production are not approved
- Change kind: `governance`
- Feature delta: `0`
- Core change: `yes`

Current authority and evidence:

- [Technical spec](./spec.md)
- [Tasks](./tasks.md)
- [Checklist](./checklist.md)
- [Progress](./progress.md)
- [Regex row registry](./regex-classification.json)
- [Immutable semantic-regex baseline](./regex-semantic-baseline.json)
- [Regex inventory](./regex-inventory.md)
- [Semantic ownership plan](./semantic-ownership-plan.md)
- [Permanent validation responsibility registry](../../skills/hogwarts-change-governance/VALIDATION_RESPONSIBILITY_REGISTRY.json)
- [Human validation responsibility table](../../skills/hogwarts-change-governance/VALIDATION_RESPONSIBILITY_REGISTRY.md)
- [Ollama concurrency and merge report](./ollama-concurrency-merge-report.md)
- [Phase 2 Identity independent acceptance](./acceptance/phase2-identity-research-report-attempt-3.md)
- [Runtime field contract](../hogwarts-runtime-contracts/state-fields.md)

Historical Revision 4 response-ledger documents remain research evidence only.
They are not Phase 1 authority and do not approve implementation.

## 2. Problem and Evidence

Validator responsibility was not governed. Regex currently enforces both
finite syntax and natural-language meaning, embedding could be mistaken for
truth authority, and semantic decisions are spread across model output,
normalizers, validators and Reducers.

The complete Acorn inventory found:

```text
578 total regex constructions
355 accepted character-level / finite-grammar rows
195 active runtime semantic rows
 26 semantic migration rows
  2 dead/unreachable rows
221 total semantic violations
  0 unclassified rows
```

Every row has a stable fingerprint, source path, line, code owner, category,
rationale and registered target owner in
[`regex-classification.json`](./regex-classification.json).

The first file-level classification reported 229 semantic rows. Independent
acceptance attempt 1 proved that number wrong: it missed free-prose
translation/error/key semantics and mislabelled finite whitespace, ID, date,
directive and internal-marker grammar. Attempt 2 found eight remaining
free-prose decisions involving relationship, system Actor identity, location,
Event summaries and migration State. The combined 54-row correction is
recorded in
[`regex-review-corrections.json`](./regex-review-corrections.json). The
correct Phase 1 removal baseline is 221, not 229.

Ollama research also proved that blindly parallelizing or merging validators
would violate the project's North Star of speed, accuracy and low machine
requirements. The measured proposal is included in Section 9.

## 3. Before

### Responsibility

Before Phase 1, there was no immutable project-wide boundary saying:

- regex may inspect shape but may not infer meaning;
- embedding may retrieve candidates but may not establish truth;
- local semantic models interpret prose but may not write State;
- paid large models produce player-facing narrative but may not settle State;
- deterministic guards and Reducers alone accept references and transitions.

The 221 semantic regex rows existed without a mechanically locked removal
baseline.

### User and developer scenarios

| Scenario | Current user/runtime result | Current State/failure result |
| --- | --- | --- |
| Ordinary conversation | Existing pre/post/model workflow runs | Existing validators and Reducers behave unchanged |
| Item gift plus Spell teaching | Existing routing and regex behavior runs | Existing accepted/rejected proposals are unchanged |
| Model content fails a downstream gate | Existing product behavior remains, including current response-loss risk | Existing State transaction behavior remains |
| Developer adds a prose-meaning regex | No complete registry prevents the new semantic rule from becoming another hidden authority | Drift may reach scheduling, validation or State |
| Developer adds a Money system | No permanent contract requires the new Prompt, Schema, semantic owner, validator, failure policy and Reducer to be registered together | A partial implementation can silently create another source-of-truth split |

## 4. After

### Phase 1 user outcome

Players see no behavior change in Phase 1. Developers now have one complete,
machine-checked law: regex may validate shape only, while every existing
semantic violation has one registered future owner and can only be removed.

### Cross-mechanism maintenance outcome

Before any future domain such as Money enters production, one permanent
contract row must name its model tasks, semantic and retrieval owners, Schema
authority, transform chain, deterministic boundary, sole State writer, failure
policy, call budget and focused verification.

| Future Money scenario | Before this registry | After this registry |
| --- | --- | --- |
| Player pays five Galleons | A developer could add a prose regex, a model field and a balance write in separate modules | Meaning is proposed by the registered semantic owner; integer amount, currency, balance, conservation and authorization are deterministic; one Money Reducer writes |
| Player says "if I had money" | A keyword gate could treat hypothetical prose as a transaction | Regex cannot decide meaning; an empty semantic proposal causes no State write |
| Balance is insufficient or model output is invalid | Different layers could retry, guess or partially write | No semantic regex fallback or automatic model repair; the transaction State remains unchanged |
| Turn has no Money action | A new observer could be called on every turn | The registered route and call budget must prove zero Money-specific work |

This registry does not force every helper named `validate*` into one global
implementation. It registers model-output and semantic-settlement contracts.
Domain code remains focused, while the cross-stage ownership and failure
policy are governed centrally.

### Permanent responsibility boundary

| Mechanism | Owns | Forbidden |
| --- | --- | --- |
| Regex | characters, stable IDs, numbers, dates, JSON/fences, exact markers and finite grammar | intent, truth, injury, perception, movement, relationship, Item, Spell or any prose meaning |
| Embedding | semantic candidate recall and ranking | truth, equality, authority, rejection or State writes |
| Local small model | bounded natural-language interpretation with structured proposals and source references | direct State writes, retries, invented IDs or bypassing Reducers |
| Paid large model | player-facing narrative正文 | State authority, semantic settlement or hidden retry |
| Deterministic code | Schema, IDs, references, ACL, provenance, arithmetic and legal transitions | guessing missing prose meaning |
| Reducer | sole atomic State settlement owner | accepting unvalidated model/embedding/regex claims |

### Phase 1 only-decrease law

The baseline freezes the exact 221 semantic regex IDs and their owners. The
append-only retirement ledger starts empty.

- A new semantic regex ID fails.
- Relabelling an existing semantic row as lexical fails.
- Changing its registered semantic or deterministic owner fails.
- An unclassified new regex fails.
- A new shape-only regex requires explicit row-level review and registration.
- A semantic ID may disappear only with an appended retirement event.
- A retired semantic fingerprint reappearing in any category fails.
- Exact manifest, baseline and retirement-ledger bytes plus event count are
  anchored in the reviewed enforcement script.
- Persisted manifest metadata and every source identity field are compared
  directly with the AST scan; stale or forged rows cannot be dropped or pass
  through ID-only equality.
- Phase 2 closes only when both semantic categories reach zero.

### Three-phase roadmap

| Phase | Scope | Runtime/call impact |
| --- | --- | --- |
| Phase 1, current | establish law, register 578 rows and owners, lock semantic rows to only decrease | zero behavior change; zero call change |
| Phase 2, future | use `pre -> post -> optional dynamic 4B -> optional destroy micro -> Reducers`; remove all 221 registered semantic regex rows | implementation forbidden until current Phase 2 gates pass and approval is explicit |
| Phase 3, future | append-only preselection ledger for paid large-model narrative正文 | separate PRD revision after Phase 2; no automatic retry and no regex semantic fallback |

Phase 3 is intentionally narrower than rejected Revision 4. It concerns paid
player-facing narrative正文, not a global archive of every internal structured
Director JSON response.

## 5. In Scope

Phase 1 includes only:

- the permanent mechanism boundary in this PRD and Spec;
- row-level registration of all 578 current regex constructions;
- explicit semantic and deterministic owners for all 221 violations;
- an immutable semantic baseline, append-only retirement ledger and machine
  gate enforcing only-decrease and no resurrection;
- registration of Phase 2 call-order evidence and acceptance blockers;
- registration of Phase 3 narrative-preservation military rules;
- Product Spec, tasks, checklist and progress synchronization.

Revision 7 additionally includes governance-only work:

- a permanent registry covering every active model-output contract and all
  registered semantic owners;
- a human-readable responsibility table;
- a permanent Skill rule requiring each future system to update its own row
  and add a new domain-owned focused test file.

## 6. Non-Goals

Phase 1 does not:

- edit production, server, UI, Prompt, Schema, validator, normalizer, Reducer,
  migration, test behavior or save data;
- remove or replace any of the 221 semantic regex rows;
- change model order, concurrency, context, residency or call count;
- run a model request;
- implement Identity inside the dynamic 4B follow-up;
- claim support for an 8 GB machine;
- implement a response ledger, preselection UI or persistence API;
- fix existing Social or Scene Transition Prompt-budget debt.

Revision 7 also does not add a Money system, change any production contract,
move a validator, alter a Prompt/Schema, change model calls, add a central
runtime validator, or add a generic cross-domain registry test. Existing
contract debt is recorded as `legacy_registered`; each future system owns its
own implementation and tests.

## 7. Runtime Contract Impact

Runtime field impact: None.

Phase 1 and the Revision 7 responsibility registry create governance evidence
only. They do not read, write, migrate, alias, deprecate or expose a runtime
State, message, Prompt, Knowledge, session or UI field. The living runtime
field contract therefore remains unchanged.

Phase 2 and Phase 3 field impacts must be specified and approved before their
implementation.

## 8. Migration and Compatibility

Phase 1 has no runtime migration and no compatibility path.

The current source behavior and saves remain byte-for-byte governed by the
existing runtime. The registry describes violations; it does not reinterpret
or repair current State.

Future Phase 2 migrations must use explicit structured values or approved
conservative defaults. They may not inspect prose with regex or call a model.
For destroyed Items, `state=destroyed` does not imply
`physicalForm=absent`; missing form remains governed by the permanent Item
existence invariant.

## 9. Prompt Field Budget

### Phase 1

Prompt impact: None.

Model-call impact: None.

Revision 7 registry impact: None. It records current and target ownership but
is not imported by production runtime code.

| Operational measure | Before Phase 1 | After Phase 1 |
| --- | --- | --- |
| Calls per normal action | existing runtime | unchanged |
| Worst-case calls | existing runtime | unchanged |
| Sequential/concurrent behavior | existing runtime | unchanged |
| Model sharing/residency | existing runtime | unchanged |
| RAM/VRAM pressure | existing runtime | unchanged |
| User-visible latency | existing runtime | unchanged |
| Paid calls/retry/fallback | existing runtime | unchanged |

### Phase 2 Ollama evidence incorporated into this PRD

Measured machine:

```text
MacBook Pro Mac15,6
Apple M3 Pro, 12 cores
36 GB unified memory
Ollama 0.32.6
qwen3:1.7b Q4_K_M, 1.4 GB model file
qwen3:4b   Q4_K_M, 2.5 GB model file
```

Complex Item + Spell measurements:

| Strategy | Wall time | Peak RSS | Quality |
| --- | ---: | ---: | ---: |
| three serial 1.7B calls | 9.58 s | 2.09 GB | 52.5% |
| three parallel 1.7B calls | 7.07 s | 3.09 GB | 52.5% |
| three serial 4B calls | 17.55 s | 3.37 GB | 63.4% |
| three parallel 4B calls | 12.99 s | 4.64 GB | 63.4% |
| mixed parallel, one loaded-model slot | 10.24 s | 4.61 GB | 55.4% |
| mixed parallel, two loaded-model slots | 8.70 s | 7.58 GB | 55.4% |
| one merged 1.7B call | 11.43 s | 2.10 GB | 39.6% |
| one merged 4B call | 17.05 s | 3.37 GB | 73.3% |

Dependency-aware post/follow-up measurements:

| Strategy | Wall time | Peak RSS |
| --- | ---: | ---: |
| post 1.7B -> Inventory 4B -> Spell 1.7B | 11.80 s | 3.36 GB |
| post -> same-1.7B follow-ups parallel | 8.08 s | 2.58 GB |
| post -> mixed follow-ups, one model slot | 11.45 s | 3.98 GB |
| post -> mixed follow-ups, two model slots | 10.37 s | 6.43 GB |

Two-model parallelism saves only 1.43 seconds over the realistic serial path
while adding about 3.07 GB. It is rejected for the low-memory target.

The Phase 2 candidate is:

```text
pre-turn 1.7B
-> post core 1.7B
-> optional one dynamic 4B containing only requested
   Inventory / Spell / Identity sections
-> optional 1024-context remains|absent micro-decision
   on the same resident 4B
-> deterministic guards and Reducers
```

Candidate complex Item + Spell post-chain result:

```text
average: 10.44 s
peak RSS: 3.06 GB
peak loaded models: 1
post/dynamic context: 2048
```

Pre-turn and unchanged Appraisal/translation calls are not included in that
10.44-second post-chain measurement.

Benchmark-only worst-case Identity + Item + Spell result:

```text
average: 22.76 s
peak RSS: 3.04 GB
peak loaded models: 1
post/dynamic context: 2048
quality: 800 / 800 route + semantic checks
```

This adds 12.32 seconds to the earlier Item + Spell synthetic complex turn but
does not add model residency or memory pressure.

Quality progression:

| Design | Accepted checks |
| --- | ---: |
| split 1.7B | 52.5% |
| split mixed 1.7B/4B | 55.4% |
| merged 1.7B | 39.6% |
| merged 4B | 73.3% |
| staged candidate before final refinements | 88.2% |
| candidate plus dynamic operation Schema and guards | 96.8% |
| candidate plus destroy micro and stable perception reference | 97.8% |
| oracle-fed dynamic Identity attempt | rejected despite reported 100% |
| independently routed dynamic Identity candidate | **100% (800/800)** |

Destroy-form micro-classification passed 10/10 on 1.7B and 10/10 on 4B over
five seeds and two evidence cases. The perception micro-task failed and is not
part of the proposal.

### Phase 2 research-gate result and blocking TODOs

Fresh independent acceptance attempt 3 passed the corrected research evidence:

```text
route derived from structured paid/directive/pre-turn signals
9 cases x 5 seeds = 45 chains
800 / 800 route + semantic checks
740 / 800 raw model checks before deterministic guards
0 route failures
0 parse errors
maximum prompt + output: 1673 / 2048 tokens
```

The accepted result depends on deterministic guards rejecting invalid
same-room movement, event closure and participant claims, and resolving one
Identity evidence substring through its stable segment index. It is not a
claim that raw 4B output is perfect.

Remaining blockers:

1. Run fresh context-free blind requests through the exact final production
   chain after production contracts exist.
2. Run the candidate on a physical 8 GB machine with SillyTavern and the
   normal browser workload. Until that passes, the product must not claim
   low-memory or 8 GB support.
3. Obtain explicit approval for the current Phase 2 PRD/Spec before editing
   production behavior.

Proposed Phase 2 settings are evidence, not current runtime authority:

```text
OLLAMA_NUM_PARALLEL=1
OLLAMA_MAX_LOADED_MODELS=1
post context=2048
dynamic follow-up context=2048
destroy micro context=1024
unload after the chain
```

## 10. Frontend Field Whitelist

Phase 1 frontend field whitelist: None.

There is no frontend read/write, DOM sink, localization route or UI behavior
change. Historical draft ledger registry rows are not activated by this phase.

Phase 3 must define its own exact narrative ledger and UI whitelist before
implementation.

## 11. Acceptance Criteria

| Requirement | Workflow | Required result | Forbidden result | Evidence |
| --- | --- | --- | --- | --- |
| complete registry | scan both Hogwarts JS roots | exactly 578 rows, 355 lexical, 195 runtime semantic, 26 migration semantic, 2 dead and 0 unclassified | missing, duplicate or broad file-level classification | manifest fingerprint, 54-row correction evidence and AST command |
| fixed ownership | inspect every semantic row | every one of 221 rows has semantic owner, deterministic owner and Phase 2 action | generic/blank owner | row registry and owner-count reconciliation |
| only-decrease | run enforcement after baseline | persisted full row identities match AST; complete manifest history is anchored; current semantic IDs equal anchored baseline IDs minus anchored append-only retirement events | stale/forged row metadata, lexical/rationale rewrite, file tamper, new semantic ID, unregistered deletion, relabel, owner mutation or retired-ID resurrection | script hash/count anchors and synthetic negative gate tests |
| zero behavior change | inspect scoped diff | no production/runtime/test/save/Prompt/call file changed | any business behavior or call change | scoped Git diff and no-model execution record |
| cross-mechanism coverage | inspect the permanent responsibility registry | current model-output domains and semantic owners name their Schema/transform/validator/writer/failure/call ownership; Regex and Embedding boundaries remain explicit | unowned stage or hidden second writer | JSON registry and human table review |
| future-domain completeness | review a new system's PRD/Spec and tests | the new system appends/updates its own registry row and adds a new domain-named focused test file covering success, rejection, no-State failure, no semantic fallback and call budget | claiming unrelated Inventory/Spell/registry tests as coverage for Money or another new system | owning system's focused tests and independent acceptance |
| table consistency | review JSON and Markdown together | both responsibility-table views are updated in the same owning-system change | one view silently diverges | code review |
| Phase 2 blocker | inspect task/checklist | benchmark Identity remains 100%; production blind acceptance, physical 8 GB run and approval remain explicit TODOs | claiming production readiness or low-memory support now | tasks/checklist/PRD |
| Phase 3 boundary | inspect PRD | narrative正文 remains visible; only State proposal may be rejected; no retry; no semantic regex fallback; append-only forward repair | global structured-output scope silently restored | PRD and future Phase 3 approval |

Phase 1 commands:

```text
node --check .trae/specs/hogwarts-validator-governance/inventory-regex.mjs
node --check .trae/specs/hogwarts-validator-governance/apply-regex-review.mjs
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs \
  --self-test-semantic-gate
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs \
  --require-classified
```

## 12. Risks and Rollback

Phase 1 risks:

- a semantic row is incorrectly labelled lexical;
- an owner is too broad to support Phase 2 removal;
- someone regenerates or relabels the baseline instead of deleting source;
- governance prose is mistaken for implemented runtime behavior.

Mitigations:

- stable row fingerprints and source locations;
- explicit semantic and deterministic owners;
- broad file-level classifier retired;
- exact reviewed corrections retained as evidence;
- append-only retirement events required before a semantic ID may disappear;
- full-file hash and event-count anchors require any manifest, baseline or
  ledger revision to change reviewed enforcement code visibly;
- every persisted source identity field and top-level scan metadata is checked
  against Acorn output;
- new/unclassified semantic rows fail;
- Phase 1 repeatedly states zero runtime behavior and zero call changes.

There is no production rollback because Phase 1 changes no production
behavior. Correcting a category or owner requires an explicit reviewed PRD
revision and baseline update; silently resetting the baseline is forbidden.

## 13. Approval

The user explicitly authorized Phase 1 on 2026-08-16:

- put the concurrency report into this PRD;
- register Identity integration as a TODO;
- fix the Regex/Embedding/small-model/large-model/Reducer boundary;
- register all 578 regex rows and all semantic owners;
- lock semantic regex to only decrease;
- make zero behavior and zero call changes.

Phase 1 governance work is authorized by that instruction.

On 2026-08-16 the user explicitly required the registry to be upgraded before
Phase 2 production so future domains such as Money cannot bypass the same
ownership process. Revision 7 is authorized for governance artifacts and
the permanent per-system test rule only. It does not authorize Phase 2
production behavior. The user rejected a central executable registry gate;
future enforcement is owned by each new system's tests and acceptance.

Fresh independent acceptance attempt 5 passed every Phase 1 criterion. The
pass is recorded in
[`phase1-independent-report-attempt-5.md`](./acceptance/phase1-independent-report-attempt-5.md).

Fresh independent acceptance attempt 3 passed the benchmark-only Phase 2
Identity research gate. The pass is recorded in
[`phase2-identity-research-report-attempt-3.md`](./acceptance/phase2-identity-research-report-attempt-3.md).
It does not approve production implementation or physical 8 GB support.

Phase 2 and Phase 3 implementation are not authorized by this approval.
Starting either requires current PRD/Spec review and explicit approval after
their stated gates are satisfied.
