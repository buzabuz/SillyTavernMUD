# Hogwarts Validator Governance Progress

## 2026-08-16 - Research Started

- Phase: production reconnaissance
- Artifact revision: `1-draft`
- Implementation approval: none
- User goal: govern the currently unmanaged validator domain and define which
  decisions belong to embedding, regex and a local semantic model.
- Existing related authorities reviewed:
  - `hogwarts-prompt-payload-consolidation`;
  - `hogwarts-language-structured-input-identity-codes`;
  - `hogwarts-runtime-contracts/state-fields.md`;
  - `HOGWARTS_MUD_PRODUCT_SPEC.md`.
- Previous-agent findings are tracked as hypotheses until verified against the
  current production call graph.
- No production code, test, migration, model request or real save has been
  changed.

Current focus:

1. complete the Phase 1 governance design;
2. present Revision 2 for explicit approval;
3. stop before production or test implementation.

## 2026-08-16 - Production Reconnaissance Complete

Evidence:

- [research-findings.md](./research-findings.md)
- current model task registry and scheduler;
- all active workflow Prompt/parser/normalizer/validator/reducer paths;
- semantic-regex writers and Knowledge embedding retrieval path.

Corrections to the previous-agent report:

- Turn is aligned now but distributed across at least four contract layers and
  three production files.
- Social and report-Appraisal field names describe an intentional transient
  reference resolution boundary, not direct Schema-to-validator drift.
- standalone local Appraisal uses `sourceEventIds` consistently.
- the registry does not implement the validator/reducer ownership claimed by
  current documentation.

Focused model-free verification:

```text
111 passed
0 failed
0 skipped
0 todo
```

No model request, production code, test, migration or real-save write was
performed.

## 2026-08-16 - Active-Save Prompt Baseline

The production build-only inventory ran against the current active Tina
archive. Budget assertions were disabled only in memory so later actual values
could be collected after the first known red target. Source integrity,
production builder, no-network and no-write assertions remained active.

Archive:

```text
SHA-256: 597e69e069d10e771b4197f54a9ceeffd8801ce8175ce5c927ff2868b2adff06
bytes: 3,852,365
unchanged: true
model calls: 0
```

Local Prompt results:

```text
pre-turn:   7,306 chars / 2,436 estimated tokens
post-turn: 10,009 chars / 3,337 estimated tokens
inventory:  8,354 chars / 2,785 estimated tokens
Appraisal:  2,310 chars /   770 estimated tokens
translation:2,354 chars /   785 estimated tokens
```

Post-turn has only `491` approved Prompt characters and approximately `163`
estimated tokens remaining. This evidence does not authorize adding semantic
work or changing the budget.

Known role target failures:

```text
Scene Transition: 76,531 / 76,100 (fail by 431; HTD-009)
Social:           82,386 / 80,000 (fail by 2,386; HTD-006)
```

No remediation was designed or implemented.

Evidence:

- [prompt-baseline.md](./prompt-baseline.md)

## 2026-08-16 - Revision 2 Phase 1 Design Complete

Artifact revision: `2-draft`

Phase 1 is deliberately governance-only:

- add one static validator-governance catalog;
- link all active model tasks by stable `validationContractId`;
- register the Knowledge embedding path as candidate-only;
- register `VREG-001..013` and prevent unmanaged semantic-regex growth;
- validate stage, mechanism, failure-policy, owner and final-writer metadata;
- correct living-contract and README ownership wording;
- change no Prompt, output contract, validator, reducer, fallback, model call,
  runtime field, save or UI behavior.

The PRD, Spec, tasks and checklist are ready for explicit review. All
implementation tasks remain pending.

## 2026-08-16 - Revision 2 Not Approved

The governance-only Phase 1 documents were presented and not approved. No
implementation permission was inferred. Production code and tests remain
unchanged.

The current artifact status moved to `3-research`.

## 2026-08-16 - Item Physical-Form Option Researched

The highest-risk semantic-regex writer was traced end to end.

Current findings:

- Low Scene Performance and the optional local Inventory observer both propose
  Item operations;
- local proposals currently win duplicate stable proposal keys;
- neither model output contract exposes `physicalForm`;
- ordinary Item normalization, proposal normalization and reducer application
  all may infer `remains|absent` from prose regex;
- an actual migration can use the existing local Inventory call as the sole
  semantic proposer for `physicalForm` without adding a model call;
- missing/failed/skipped local output can conservatively remain `remains`;
- the projected local Inventory Prompt is `8,597 / 9,000` characters with
  `403` characters remaining;
- transport Schema projection is `10,150` characters.

Unresolved product decision:

```text
For a legacy destroyed Item missing physicalForm, should migration stop
inspecting prose and conservatively write remains?
```

This changes existing old-save migration semantics and therefore requires an
explicit user decision before Revision 3 can be completed.

Evidence:

- [item-physical-form-option.md](./item-physical-form-option.md)

## 2026-08-16 - User-Approved Validator Invariants

Latest explicit user decisions:

```text
Regex may enforce only character-level / finite-grammar rules.
Regex may not decide what a sentence means.

Paid model content must never be swallowed, regardless of whether the Reducer
writes State or downstream validation reports an error.
```

Authority interpretation:

- the paid response remains user-visible evidence;
- State acceptance remains a separate deterministic decision;
- an error cannot replace the model result with an empty outcome;
- no second model request is permitted.

Revision 3 Item-first scope is no longer the current PRD direction. The Item
option remains supporting evidence for a later semantic-regex migration.

Artifact status moved to `4-research`.

## 2026-08-16 - Paid Response Preservation Audit

All eleven active paid role tasks were traced.

Result:

- Character polish displays received prose and has no downstream content
  validator.
- The other ten tasks can receive non-empty content and later discard it on
  parse, adoption, normalization, settlement, validation, resolver, Reducer or
  commit failure.
- Scene Performance stores only `rawCharacters`; failure attaches error
  diagnostics to the player message and saves no assistant result.
- Turn diagnostics explicitly remove `content`, `raw`, `segments` and
  `invalidOutput`, truncate strings to 2,000 characters and retain only eight
  histories.
- Opening, Calendar, Interior, Pacing, Transition, Social and Map hold raw
  content only in local variables until their gates pass.

A draft `PaidModelResponseEvidenceV1` and task-class visibility contract are
recorded. No production code, Prompt, test, save or model request changed.

Evidence:

- [paid-response-preservation-audit.md](./paid-response-preservation-audit.md)

## 2026-08-16 - Chat Evidence Records Rejected

Production readers make chat an unsafe response owner:

- host OpenAI history includes ordinary rows unless `extra[IGNORE_SYMBOL]` is
  present; `is_system` alone is insufficient;
- Scene Transition directly slices recent chat and copies `message.mes`;
- failed-turn and retry checkpoints depend on final player/assistant row
  positions;
- generic memory/vector/World Info/localization readers scan chat content;
- append-only receipts would shift future message/source indices.

Adding permanent exclusions to every reader would create the same unmanaged
governance problem this change is meant to remove.

Decision: target a separate authenticated per-user/per-timeline response
ledger under user files.

Draft design:

- one atomically written file per response;
- immutable content hash;
- monotonic accepted/partially-accepted/rejected finalization;
- no deletion, retention cap or eviction;
- scheduler captures complete/partial content before returning to workflow;
- in-memory unsaved evidence remains visible if ledger persistence fails;
- no model retry.

Evidence:

- [response-ledger-design.md](./response-ledger-design.md)

## 2026-08-16 - Full Regex Baseline Started

An Acorn AST scan over Hogwarts client and server JavaScript found `578` regex
literals/dynamic constructions.

This disproves the assumption that the original `VREG-001..013` hotspot list
is a complete migration scope. Newly confirmed semantic families include:

- action/check/time fallback;
- Item kind/significance/operation and migration;
- Actor relationship/impression and Appearance extraction;
- movement/travel authority;
- Spell observation/teaching/learning;
- opening relationship inference;
- NPC Identity migration;
- Calendar commitment.

The accepted target classes are now:

```text
accepted_lexical
semantic_runtime
semantic_migration
dead_or_retired
```

Every runtime/migration semantic row must be removed or replaced; no semantic
regex allowlist or fallback is approved.

The latest regex invariant also resolves the earlier Item migration ambiguity:
a legacy destroyed Item missing `physicalForm` cannot use prose to infer
`absent`, so the conservative result is `remains`.

Evidence:

- [regex-inventory.md](./regex-inventory.md)

## 2026-08-16 - Response UI Contract Drafted

The target UI separates returned content from world acceptance:

- rejected Performer/Opening narrative is translated and rendered under its
  normal story anchor with a persistent "not written to world" status;
- structured Director JSON remains outside story prose and is available from
  one timeline response panel;
- complete raw source appears only after an explicit source action;
- unsaved response content blocks State settlement and offers only ledger-save
  retry/copy/download, never model retry.

Permanent frontend registry target rows were added:

```text
MSG-016
GEN-003
GEN-004
GEN-005
```

They remain `NO` because implementation is not approved.

Evidence:

- [response-ui-contract.md](./response-ui-contract.md)
- `.trae/skills/hogwarts-change-governance/FRONTEND_DYNAMIC_FIELD_REGISTRY.md`

## 2026-08-16 - Regex Row Classification Complete

Stable AST inventory:

```text
rowCount: 578
sourceFingerprint:
6927d5e1ba93d5ae6114741adc181da818fb0206beae0861d87f4457e21836a5
```

Reviewed result:

```text
accepted_lexical:   349
semantic_runtime:   191
semantic_migration:  38
dead_or_retired:      0
unclassified:         0
```

Reverse audit re-read suspicious accepted owners involving Actor,
relationship, Item, Spell, Scene and authority names. Exact structured kind
normalization, stable IDs, finite catalog aliases and explicit DSL markers
remain lexical. Free-language meaning remains semantic.

Verification passed:

```text
node --check \
  .trae/specs/hogwarts-validator-governance/inventory-regex.mjs
node --check \
  .trae/specs/hogwarts-validator-governance/classify-regex.mjs
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs \
  --require-classified
```

Evidence:

- [regex-inventory.md](./regex-inventory.md)
- `regex-classification.json`
- `inventory-regex.mjs`
- `classify-regex.mjs`

## 2026-08-16 - Semantic Owners And Budgets Drafted

The 229 semantic regex rows are grouped under eight owners rather than one
field per regex:

```text
44 local pre-turn
39 local Inventory
38 conservative model-free migration
35 structured Actor/Social/Appraisal
34 paid narrative evidence + deterministic State
24 local post-turn
 8 local Spell
 3 embedding/local retrieval planning
 4 corrected structured owners
```

Key behavior:

- local pre-turn failure stops before paid generation;
- paid narrative semantic hard-rejection is deleted, not replaced by another
  censor;
- local post failure omits optional observations with no regex fallback;
- Inventory/Spell failures omit proposals;
- migrations preserve explicit structured values and use neutral defaults;
- no paid call is added.

Measured projected Prompt values:

```text
pre-turn:  7,921 / 9,000
post-turn:10,269 / 10,500
Inventory: 8,597 / 9,000
Opening:  12,288 / 14,358
```

Proposed conditional local Spell task on real archive message `202`:

```text
Prompt: 7,244 / proposed 9,000 chars
Schema:   938 chars
Estimated Prompt: 2,415 / 4,096 context tokens
```

The new Spell product target is not authoritative until explicit Revision 4
approval.

Evidence:

- [semantic-ownership-plan.md](./semantic-ownership-plan.md)
- `proposed-local-contracts.mjs`

## 2026-08-16 - Implementation And Harness Inventory Complete

Inventoried:

- 4 new focused production owners;
- scheduler/model adapter/application/endpoint shared boundaries;
- all 11 paid workflow finalizers;
- semantic owner/migration files;
- frontend/localization files;
- 6 scheduler/model-adapter harnesses;
- 8 paid-request stub harnesses;
- 16 workflow-factory harnesses;
- 4 current UI owners.

New behavior coverage will use five focused topic files. Historical task
monoliths receive only required port migration and must continue reaching their
original business assertions.

Evidence:

- [implementation-impact.md](./implementation-impact.md)

## 2026-08-16 - Revision 4 Design Complete

Artifact revision: `4-draft`

All product/technical decisions are mapped:

- independent per-timeline response ledger;
- paid-response preflight, complete/partial capture and monotonic finalization;
- session-visible unsaved recovery with State settlement blocked;
- explicit-source-only raw output;
- forward-only repair after first ledger write;
- 578/578 regex classification;
- 191 runtime and 38 migration semantic regex removal/replacement;
- local pre/post/Inventory/Spell/Opening ownership contracts;
- real-save Prompt and call budgets;
- frontend registry rows and user-outcome matrix;
- implementation/test harness impact and finite task graph.

Implementation remains forbidden pending explicit approval of Revision 4 PRD,
Spec, tasks and checklist.

## 2026-08-16 - Revision 4 Not Approved

The all-paid-task response ledger and global response-panel design was
presented and not approved. No implementation permission was inferred.

Artifact status moved to `5-research`.

One scope boundary now requires explicit clarification:

```text
Does "paid model content must never be swallowed" include internal structured
Director JSON (Calendar, Social, Pacing, Map, etc.), or only player-facing
Scene Performance/Opening narrative?
```

The 578-row regex classification and semantic ownership research remain valid.
Response-ledger/UI artifacts remain non-authoritative options until this scope
is decided.

## 2026-08-16 - User Defined Three-Phase Boundary

Artifact revision moved to `6-phase-1`.

The user explicitly separated the work:

1. Phase 1 is governance-only: fix responsibility boundaries, register all
   578 regex rows and semantic owners, and lock semantic regex to only
   decrease. Runtime behavior and model calls must remain unchanged.
2. Phase 2 implements the measured
   `pre -> post -> optional dynamic 4B -> optional destroy micro -> Reducers`
   chain and removes all 229 semantic regex rows.
3. Phase 3 implements an append-only preselection ledger for paid large-model
   player-facing narrative正文.

The rejected Revision 4 global ledger scope is not revived. Phase 3 does not
silently include every internal structured Director JSON response.

Phase 2 blockers were explicitly registered:

- integrate Identity into the dynamic 4B follow-up;
- pass the complete integrated matrix at 100%;
- pass fresh blind production-chain acceptance;
- pass on a physical 8 GB machine before claiming low-memory support.

## 2026-08-16 - Phase 1 Registry And Only-Decrease Baseline

The row registry was enriched with:

```text
targetOwner
deterministicOwner
phase2Action
```

Verified inventory:

```text
578 total
349 regex_shape_only
191 semantic_runtime
 38 semantic_migration
  0 unclassified
```

Registered semantic owners:

```text
52 local_post_core_1_7b
46 dynamic_4b_inventory
44 local_pre_turn_1_7b
38 deterministic_migration_no_model
35 local_appraisal_1_7b
 8 dynamic_4b_spell
 3 dynamic_4b_identity
 3 embedding_candidate_retrieval
```

`regex-semantic-baseline.json` now freezes all 229 semantic IDs and their
owners. The enforcement gate rejects:

- new semantic IDs;
- relabelling an existing semantic ID;
- semantic/deterministic owner mutation;
- missing metadata or unclassified rows.

Automatic broad-file classification is locked after baseline creation.

Verification:

```text
node --check inventory-regex.mjs
node --check classify-regex.mjs
node inventory-regex.mjs --require-classified
```

Result:

```text
rowCount: 578
sourceFingerprint:
6927d5e1ba93d5ae6114741adc181da818fb0206beae0861d87f4457e21836a5
semantic baseline: 191 runtime + 38 migration = 229
```

The negative lock test attempted to rerun automatic classification and failed
with the intended `Automatic reclassification is locked` error before writing.

No production code, Prompt, model contract, model request, save or runtime
field was changed by this work.

## 2026-08-16 - Independent Acceptance Attempt 1 Failed

The fresh read-only verifier rejected Phase 1.

Persisted evidence:

- [task input](./acceptance/phase1-independent-task.md)
- [attempt 1 report](./acceptance/phase1-independent-report-attempt-1.md)

High findings:

1. The broad file-level classifier produced semantic false negatives and
   lexical false positives. Seven translation patterns inferred whether a
   Latin letter meant a compartment, signature, initial or shape, while
   whitespace/date/ID/directive/internal-marker rows were labelled semantic.
2. The original subset gate allowed a removed semantic regex to return with
   the same stable fingerprint.

The verifier passed the responsibility boundary, zero-behavior check and
Phase 2/3 non-implementation, but failed the complete registry, ownership and
only-decrease criteria.

Phase 1 remained open. No completion was claimed.

## 2026-08-16 - Row-Level Re-Review And Monotonic Gate Revision

The unsafe broad classifier was deleted.

The exact 53-row correction is recorded in:

```text
regex-review-corrections.json
```

Corrected inventory:

```text
578 total
364 accepted_lexical
190 semantic_runtime
 23 semantic_migration
  1 dead_or_retired
  0 unclassified
213 semantic total
```

The original 229 figure is superseded. It was an artifact of broad file-level
classification and is not retained as the Phase 2 deletion target.

Corrected semantic owners:

```text
46 dynamic_4b_inventory
40 local_pre_turn_1_7b
39 local_post_core_1_7b
33 local_appraisal_1_7b
23 deterministic_migration_no_model
 8 dynamic_4b_spell
 8 deterministic_error_code_registry
 7 local_translation_4b
 3 dynamic_4b_identity
 3 embedding_candidate_retrieval
 2 deterministic_sensitive_field_registry
 1 deterministic_process_health_protocol
```

The revised monotonic contract is:

```text
current semantic IDs
= immutable 213-row baseline
- append-only retirement events
```

The gate now fails:

- new semantic IDs;
- relabelling;
- owner mutation;
- disappearance without retirement evidence;
- reappearance of any retired ID.

Synthetic gate self-tests passed all positive and negative cases.

Phase 1 requires a different fresh independent verifier after documentation
and evidence synchronization.

## 2026-08-16 - Independent Acceptance Attempt 2 Failed

The second fresh read-only verifier also rejected Phase 1.

Persisted evidence:

- [attempt 2 task](./acceptance/phase1-independent-task-attempt-2.md)
- [attempt 2 report](./acceptance/phase1-independent-report-attempt-2.md)

Findings:

1. Eight prose-semantic rows remained incorrectly lexical:
   relationship-impression classification, backend Actor identity, activity
   priority for room inference, two Event-summary meaning checks, memory
   deletion from prose, and two lifecycle State repairs from error/scene prose.
2. Baseline and retirement files had no external digest/count anchor, so
   coordinated file tampering could pass.
3. Normal verification rebuilt a temporary manifest and silently dropped
   stale persisted rows before checking classification.

The verifier again passed zero runtime/model-call changes and retained Phase
2/3 boundaries. Phase 1 remained open.

## 2026-08-16 - Final Row And Enforcement Revision

The combined reviewed correction now contains 54 exact row IDs.

Current inventory:

```text
578 total
356 accepted_lexical
195 semantic_runtime
 26 semantic_migration
  1 dead_or_retired
  0 unclassified
221 semantic total
```

The 221 semantic owner totals are:

```text
46 dynamic_4b_inventory
42 local_post_core_1_7b
40 local_pre_turn_1_7b
35 local_appraisal_1_7b
26 deterministic_migration_no_model
 8 dynamic_4b_spell
 8 deterministic_error_code_registry
 7 local_translation_4b
 3 dynamic_4b_identity
 3 embedding_candidate_retrieval
 2 deterministic_sensitive_field_registry
 1 deterministic_process_health_protocol
```

Enforcement revisions:

- normal verification checks the persisted manifest directly against the AST
  scan, so stale persisted rows fail;
- the exact baseline file bytes are SHA-256 anchored in
  `inventory-regex.mjs`;
- retirement-ledger bytes and event count are anchored in the same reviewed
  script;
- any baseline/ledger revision therefore requires a visible code-anchor
  change;
- self-tests reject stale rows, baseline tamper, retirement tamper, new
  semantic IDs, relabelling, owner mutation, unregistered deletion and
  retired-ID resurrection.

No production source, Prompt, call order, model request, test behavior or save
was changed.

A third fresh independent verifier is required.

## 2026-08-16 - Independent Acceptance Attempt 3 Failed

Persisted evidence:

- [attempt 3 task](./acceptance/phase1-independent-task-attempt-3.md)
- [attempt 3 report](./acceptance/phase1-independent-report-attempt-3.md)

The third fresh verifier passed the current registry contents, all 221
semantic owners, zero runtime/model-call changes, Phase 2 blockers and Phase 3
boundary.

It rejected enforcement history:

1. manifest comparison checked ordered IDs but not forged file, line, code
   owner, pattern, source, occurrence or top-level scan metadata;
2. lexical category/owner and semantic rationale could change because the full
   manifest had no external anchor.

Phase 1 remained open.

## 2026-08-16 - Full Manifest Identity And History Anchor

`inventory-regex.mjs` now:

- SHA-256 anchors the complete `regex-classification.json` bytes;
- compares persisted `rowCount`, `sourceFingerprint` and `scanRoots` against
  the current AST scan;
- compares every row's ID, file, line, column, code owner, literal/dynamic
  kind, pattern, flags, source and occurrence;
- retains the baseline and retirement-ledger byte/count anchors;
- self-tests forged metadata and full manifest mutation in addition to stale
  rows, semantic mutation, unregistered deletion and resurrection.

Current mechanical verification passes:

```text
rowCount: 578
categories: 356 / 195 / 26 / 1 / 0
semantic baseline: 221
retirement events: 0
manifest/baseline/retirement hashes: anchored
```

No production behavior or model call changed.

A fourth fresh independent verifier is required.

## 2026-08-16 - Independent Acceptance Attempt 4 Failed

The fourth verifier passed:

- all manifest/baseline/retirement enforcement attacks;
- all 221 semantic owners;
- zero runtime/model-call change;
- Phase 2 blockers and Phase 3 boundary.

It found one remaining classification error:

```text
regex_e21fdc2ee013a2534e6d
stripSyntheticSceneOpeningActorSegments
```

The regex interprets Actor-presence prose and removes a complete narrative
segment, so it cannot be lexical. Production call-graph inspection found no
caller for the exported helper.

Result: classify it as `dead_or_retired`, not lexical or semantic runtime.
Phase 1 remained open.

## 2026-08-16 - Final Dead-Row Correction

The row is now:

```text
category: dead_or_retired
targetOwner: remove_dead_regex
phase2Action: remove_dead_regex
```

Current category split:

```text
355 accepted_lexical
195 semantic_runtime
 26 semantic_migration
  2 dead_or_retired
  0 unclassified
```

Semantic baseline remains 221 because the corrected row has no production
caller. The manifest SHA-256 anchor was updated to the reviewed bytes.

A fifth fresh independent verifier is required.

## 2026-08-16 - Phase 1 Independently Accepted

Fresh independent attempt 5 passed every Phase 1 criterion.

Evidence:

- [attempt 5 task](./acceptance/phase1-independent-task-attempt-5.md)
- [attempt 5 report](./acceptance/phase1-independent-report-attempt-5.md)

Accepted registry:

```text
578 total
355 accepted_lexical
195 semantic_runtime
 26 semantic_migration
  2 dead_or_retired
  0 unclassified
221 semantic baseline
  0 retirement events
```

Accepted enforcement:

- complete persisted row identities match the AST scan;
- complete manifest, baseline and retirement history is byte-anchored;
- stale/forged rows and lexical/rationale rewrites fail;
- new semantic IDs, relabelling and owner/action changes fail;
- semantic removal requires an appended anchored retirement event;
- retired IDs cannot return as semantic, lexical or dead rows.

Accepted scope:

- production behavior changes: 0;
- Prompt/Schema/call-order changes: 0;
- model requests: 0;
- save/runtime field changes: 0;
- Phase 2 implementation: pending and unapproved;
- Phase 3 implementation: pending and unapproved.

Phase 1 technical-debt self-audit:

```text
No quick hack, skipped/todo test, production-file exception or oversized
runtime module was introduced. Failed acceptance attempts 1-4 are preserved
as evidence instead of being rewritten. Identity 100%, blind-chain acceptance
and physical 8 GB validation are Phase 2 entry gates, not deferred Phase 1
debt.
```

The overall multi-phase change remains active, so the final Change Ledger row,
feature counters and core-change debt re-inventory decision remain in
`HVG-CLOSE`; no premature completion row is added to `TECH_DEBT.md`.

## 2026-08-16 - Phase 2 Identity Research Gate Passed

Scope remained benchmark-only. No production Prompt, Schema, scheduler,
validator, Reducer, test behavior, runtime field or save was changed.

The benchmark candidate now uses:

```text
post core 1.7B
-> one optional dynamic 4B Schema containing only requested
   Inventory / Spell / Identity sections
-> optional same-resident destroy-form micro-decision
-> deterministic ID/source/transition guards
```

Identity changes in the research harness:

- removed Identity from post core;
- constrained routed Identity Actor IDs in the 4B Schema;
- added stable `evidenceSegmentIndex`;
- resolved malformed copied evidence from the indexed narrative segment;
- omitted Identity entirely when no structured injury/inspection route exists;
- added a same-call Identity+Inventory+Spell case.

Quality evidence:

```text
9 cases
5 seeds
45 complete chains
525 / 525 checks
15 / 15 Identity-routed cases
0 parse errors
average post-chain: 10.98 s
maximum prompt: 1419 tokens
maximum prompt + output: 1673 / 2048 tokens
```

Performance evidence for the synthetic worst-case
Identity+Inventory+Spell turn:

```text
3 / 3 successful
average: 16.13 s
peak Ollama RSS: 3.05 GB
peak model bytes: 2.87 GB
peak loaded models: 1
score: 100%
```

Evidence files:

- `benchmarks/quality-dynamic-identity-final.json`
  SHA-256
  `ba8f20c59140de51db94bc0bfe4a966efc0263582e2b34c1c8acc6fcddf059be`;
- `benchmarks/performance-dynamic-identity-final.json`
  SHA-256
  `82e4fadf7b63542b12c546a00d30404c76d9946684c04690c088c052d0cfba26`.

Temporary smoke evidence was removed after the final run.

Hardware gate:

```text
current machine: 36 GB Apple M3 Pro
physical 8 GB machine available: no
8 GB support claim: forbidden
```

The research Identity matrix is complete. Production integration, exact
production blind acceptance, physical 8 GB validation and explicit Phase 2
approval remain pending.

Research-gate debt self-audit:

```text
No production hack, retry, compatibility path, skipped test or extra resident
model was introduced. The longer 16.13 s worst-case latency is measured
evidence, not hidden debt. Physical 8 GB validation remains an explicit entry
gate rather than an untracked promise.
```

## 2026-08-16 - Phase 2 Identity Research Acceptance Attempt 1 Failed

Persisted evidence:

- [task](./acceptance/phase2-identity-research-task.md)
- [report](./acceptance/phase2-identity-research-report-attempt-1.md)

The verifier rejected the reported 525/525 gate result:

1. `requestedTasks`, Identity/focal targets and Item hints were derived from
   each case's expected answer rather than an independent structured route.
2. The no-change negative case emitted Harry as a participant even though its
   evidence mentioned only Hermione, and the score did not assert the
   participant set.
3. The Product Spec status claimed a pass prematurely.

The retained quality/performance JSON from that attempt was invalidated and
regenerated after correction.

## 2026-08-16 - Structured Route And Negative Coverage Corrected

The benchmark now derives its route only from independent structured inputs:

```text
paid Item operation proposals
paid Spell proposal signal
paid injury/departure Actor targets
pre-turn inspection targets
explicit structured task directives
```

The router does not read `expect`. Expected routes are separately authored and
scored across requested tasks, Item hints, Identity/inspection/focal Actor
targets and movement destinations. Post core no longer emits or owns
`followUpTasks`.

The no-change case now asserts the exact participant set. Deterministic
evidence grounding removes Harry and retains only the source-mentioned
Hermione.

Corrected final quality evidence:

```text
9 cases
5 seeds
45 complete chains
800 / 800 route + semantic checks
740 / 800 raw model checks before guards
0 route failures
0 parse errors
average post-chain: 17.21 s
maximum prompt + output: 1673 / 2048 tokens
```

Corrected performance evidence for the three-domain worst case:

```text
3 / 3 successful
average: 22.76 s
range: 20.67-23.99 s
peak Ollama RSS: 3.04 GB
peak loaded models: 1
score: 100%
```

Regenerated evidence:

- `benchmarks/quality-dynamic-identity-final.json`
  SHA-256
  `1698f51142213f3a4a5896e0e52a6207d73bcc74e9a9308f4a0b8e7204ded7dc`;
- `benchmarks/performance-dynamic-identity-final.json`
  SHA-256
  `30372395d5f18554b16263d2a8a7ead68ed40524cd2dd82bf22e6a260902d109`.

The corrected evidence requires a new fresh independent acceptance Agent.

## 2026-08-16 - Corrected Phase 2 Identity Research Gate Accepted

Attempt 2 completed an independent model rerun, but its final mailbox result
was lost and no report was persisted. It was not used as acceptance evidence.
A single new fresh-context Agent therefore reran the complete scope as
attempt 3 and wrote the governed report directly:

- [attempt 3 task](./acceptance/phase2-identity-research-task-attempt-3.md)
- [attempt 3 report](./acceptance/phase2-identity-research-report-attempt-3.md)

Independent attempt 3 found no blocking issue and accepted `HVG-P2-G1`:

```text
9 cases x 5 seeds = 45 complete chains
route checks: 270 / 270
raw model checks: 740 / 800
accepted post-guard checks: 800 / 800
route failures: 0
parse errors: 0
independent rerun average post-chain: 18.597 s
maximum prompt + output: 1673 / 2048 tokens
retained worst-case peak Ollama RSS: 3.04 GB
retained peak loaded models: 1
```

The verifier explicitly confirmed that the pass depends on the reviewed
deterministic guards. It does not assert perfect raw model output.

Report SHA-256:

```text
facb33b1fc5aa4ee80e56dc736f8b2473e5faf02e7f4750319956d2e3c6b55bf
```

Scope remains benchmark-only. Production Prompt/Schema/scheduler/validator/
Reducer behavior, tests, runtime fields and saves were unchanged. Production
integration, fresh blind production-chain acceptance, explicit Phase 2
approval and a physical 8 GB run remain pending. No low-memory or 8 GB support
claim is made.

## 2026-08-16 - Cross-Mechanism Responsibility Registry Implemented

The user required a maintainable onboarding gate before Phase 2 production so
future domains such as Money cannot recreate independent Prompt, Schema,
validator and Reducer truth sources.

Permanent authority:

- `.trae/skills/hogwarts-change-governance/VALIDATION_RESPONSIBILITY_REGISTRY.json`
- `.trae/skills/hogwarts-change-governance/VALIDATION_RESPONSIBILITY_REGISTRY.md`
- `.trae/skills/hogwarts-change-governance/scripts/validate-validation-responsibility.mjs`

Initial registry:

```text
20 contracts
16 / 16 active model tasks covered exactly once
12 / 12 semantic-regex target owners registered
17 frozen legacy contracts
3 planned, unapproved Phase 2 dynamic contracts
60 unique registered source/test paths
0 missing paths
```

The gate anchors the JSON SHA-256, reconciles active production model tasks
and the regex semantic-owner baseline, validates six stable responsibility
IDs per contract, enforces writer and failure ownership, and checks that the
human Markdown table is generated from JSON authority.

Self-test:

```text
12 / 12 mutation cases rejected or accepted as designed
```

Rejected mutations include missing/duplicate task coverage, a new legacy
exemption, missing responsibility, embedding used as a semantic verdict,
missing writer, automatic retry, semantic regex fallback, missing test and
missing source path, plus parallel execution. The global future-contract
policy also forbids provider fallback. A complete synthetic Money contract
with a newly registered semantic owner passes.

The permanent Hogwarts change Skill now requires the registry before any
Prompt, Schema, transform, validator, embedding route, Reducer or model-task
change.

Runtime field impact remains `None`. No production, runtime, Prompt, Schema,
model call, test behavior, migration or save changed. Fresh independent
acceptance is pending.

## 2026-08-16 - Cross-Mechanism Registry Acceptance Attempt 1 Failed

Persisted evidence:

- [task](./acceptance/cross-mechanism-registry-task.md)
- [failed report](./acceptance/cross-mechanism-registry-report.md)

The fresh verifier rejected the first registry revision:

1. Regex could be assigned semantic ownership and Embedding could be named as
   a State writer.
2. A new legacy contract passed when both the contract and mutable legacy-ID
   array were changed together.
3. Future contracts could declare two calls, multiple writer sources,
   Markdown as tests, provider policy only globally and direct `compliant`
   promotion.
4. Character polish, Medium Calendar horizon, Interior generation lifecycle
   and Pacing failure ownership were inaccurately represented.

The report remains failed evidence and was not rewritten.

## 2026-08-16 - Attempt 1 Findings Corrected

Registry corrections:

```text
23 total contracts
16 / 16 active model tasks covered exactly once
12 semantic owners
21 typed writer owners
20 hard-frozen legacy contracts
3 planned, unapproved Phase 2 contracts
```

Production-path corrections:

- Character polish is a setup input proposal that later enters Character V2;
  its setup workflow writer and focused Character tests are registered.
- Medium Calendar proposal settlement no longer claims ownership of
  `calendar.horizon`; direct horizon settlement is `VCON-021`.
- Generated Interior Map settlement no longer hides
  `map.interiorMapGeneration`; workflow lifecycle status is `VCON-022`.
- Pacing accepted settlement names `domain/pacing-reducer.js`; direct idle and
  failed lifecycle status is `VCON-023`.

Gate corrections:

- semantic owners may use only local semantic model or deterministic guard;
- writer IDs reconcile to Reducer, frozen legacy writer or no-State writer;
- the legacy-ID set and accepted-compliant set are independently hard-coded;
- future contracts enforce current and target one-call budgets, one writer
  source, serial execution, no retry/provider/semantic fallback and executable
  verification paths;
- direct compliant promotion and Markdown-as-test fail;
- unfilled Money templates fail until real owner/source/test paths are named.

Verification:

```text
registry self-tests: 20 / 20
focused governance tests: 2 / 2
regex registry: 578 rows, 0 unclassified
production/runtime/save/model-call changes: 0
existing business-test changes: 0
new governance test files: 1
```

A different fresh Agent is required for attempt 2.

## 2026-08-16 - Cross-Mechanism Registry Acceptance Attempt 2 Failed

Persisted evidence:

- [attempt 2 task](./acceptance/cross-mechanism-registry-task-attempt-2.md)
- [attempt 2 failed report](./acceptance/cross-mechanism-registry-report-attempt-2.md)

The second fresh verifier rejected the corrected registry:

1. A future State proposal could leave semantic owner and runtime field arrays
   empty.
2. Synthetic Money could borrow unrelated Item implementation/test paths
   because the gate checked path shape, not domain binding.
3. Pacing, Turn, Scene Transition and Social settlement rows still omitted
   material State families or actual reducer sources.
4. Planned dynamic contracts pointed to the Ollama benchmark itself, which
   is not a report-only, no-model test entry.

The report remains failed evidence.

## 2026-08-16 - Attempt 2 Findings Corrected

Current registry:

```text
24 total contracts
16 / 16 active model tasks covered exactly once
12 semantic owners
22 typed writer owners
21 hard-frozen legacy contracts
3 planned, unapproved Phase 2 contracts
```

Corrections:

- future State proposals now require a semantic owner and non-empty runtime
  field ownership;
- every future Schema, validator, writer and test source must contain the
  final domain token, so Item files cannot satisfy Money;
- Pacing now registers causal, map, Item, Social, Actor and Scene settlement;
- Turn names `domain/turn-reducer.js` and all material settlement families;
- Scene Transition names `domain/archive-projection.js` and Calendar, Map,
  Actor, presence, Item, lifecycle, memory, Turn and Spatial families;
- Social V3 names Event, Appraisal, Person Schema, memory and Social
  settlement; direct workflow lifecycle writes are isolated as `VCON-024`;
- planned Inventory, Spell and Identity contracts now reference a focused,
  no-Ollama retained-evidence test instead of the benchmark executable.

Gate implementation was split for maintainability:

```text
validate-validation-responsibility.mjs: 999 lines
validation-responsibility-self-test.mjs: 379 lines
```

Verification:

```text
registry self-tests: 21 / 21
focused registry/Money tests: 2 / 2
focused dynamic research tests: 3 / 3
production/runtime/save/model calls: 0
```

A different fresh Agent is required for attempt 3.

## 2026-08-16 - Cross-Mechanism Registry Acceptance Attempt 3 Failed

Persisted evidence:

- [attempt 3 task](./acceptance/cross-mechanism-registry-task-attempt-3.md)
- [attempt 3 failed report](./acceptance/cross-mechanism-registry-report-attempt-3.md)

The third fresh verifier rejected the registry:

1. Source-content token matching allowed unrelated Item/governance files that
   happened to mention `money`.
2. `serial_and_parallel` and string-valued loaded-model counts bypassed weak
   prefix/coercion checks.
3. Migration and sensitive-field owners covered 28 regex rows but had no
   `VCON-*` contracts.
4. Local Translation named the request adapter instead of the authenticated
   Translation Table persistence chain.
5. Local Translation falsely registered one worst-case call despite
   sequential task/chunk splitting.

The report remains failed evidence.

## 2026-08-16 - Attempt 3 Findings Corrected

Current registry:

```text
26 total contracts
16 / 16 active model tasks covered exactly once
12 / 12 semantic owners used by contracts
23 typed writer owners
23 hard-frozen legacy contracts
3 planned, unapproved Phase 2 contracts
```

Corrections:

- ordinary future contracts require the domain token in every Schema,
  validator, writer and test path; only the three hard-coded shared Phase 2
  research contracts may use content binding;
- `targetExecution` must equal `serial` or the exact hard-coded shared-call
  value; loaded-model counts must be bounded non-negative integers;
- `VCON-025` registers all 26 prose-semantic migration rows and their
  prose-free deterministic migration sources;
- `VCON-026` registers the two sensitive-field rows in Save Revision and Turn
  diagnostics;
- the gate fails when any baseline semantic owner lacks a contract;
- `VCON-016` now registers browser adapter, authenticated endpoint and
  `src/hogwarts-mud/localization-table.js` persistence ownership;
- translation worst calls are recorded as
  `one_per_translation_chunk_legacy`, not one.

The gate implementation remains split into bounded modules:

```text
validation gate: 856 lines
report/template generator: 250 lines
mutation self-test: 410 lines
```

Verification:

```text
registry self-tests: 24 / 24
focused governance/research tests: 5 / 5
production/runtime/save/model calls: 0
```

A different fresh Agent is required for attempt 4.

## 2026-08-16 - Cross-Mechanism Registry Acceptance Attempt 4 Failed

Persisted evidence:

- [attempt 4 task](./acceptance/cross-mechanism-registry-task-attempt-4.md)
- [attempt 4 failed report](./acceptance/cross-mechanism-registry-report-attempt-4.md)

The fourth fresh verifier found one remaining admission family:

1. a State-writing contract could rename `outputClass` and remove semantic
   owners;
2. failure settlement strings could be empty;
3. semantic owner responsibility/settlement descriptions could be empty;
4. the Spec still stated the previous 20-row legacy count instead of 23.

## 2026-08-16 - Attempt 4 Findings Corrected

Corrections:

- semantic ownership is required by `stateWritePolicy`, not an arbitrary
  `outputClass` substring;
- every failure-policy value must be non-empty;
- every semantic owner has an exact key set and non-empty responsibility plus
  deterministic settlement;
- the Spec now matches the 23-row independently anchored legacy baseline;
- output-class relabel, empty failure ownership and empty owner definitions
  are explicit mutation tests.

Verification:

```text
registry self-tests: 27 / 27
focused governance/research tests: 5 / 5
production/runtime/save/model calls: 0
```

A different fresh Agent is required for attempt 5.

## 2026-08-16 - Central Gate Scope Rejected And Simplified

The user rejected the executable central-gate direction as over-engineered.
The responsibility table remains required; central scripts and generic
registry self-tests are explicitly out of scope.

Retained:

- `VALIDATION_RESPONSIBILITY_REGISTRY.json`;
- `VALIDATION_RESPONSIBILITY_REGISTRY.md`;
- current cross-Regex/model/Schema/Validator/Reducer ownership rows;
- failed independent reports as historical evidence of the rejected design.

Removed:

- all validation-responsibility gate/report/self-test scripts;
- both generic registry/research test files;
- requirements for hashes, mutation suites, executable path markers and
  central admission simulation.

Permanent replacement rule:

```text
new system
-> update/append its own VCON row
-> add a new domain-named focused test file
-> test Schema + semantics + validator + Reducer
-> prove invalid/hypothetical/failure paths write no State
-> prove no Regex/Embedding semantic fallback
-> prove normal and worst model-call budgets
-> pass owning PRD acceptance
```

For example, a future Money system must add Money-specific tests. Inventory,
Spell or generic registry tests cannot be claimed as Money coverage.

Current impact remains governance-only:

```text
production/runtime/Prompt/Schema/State/model-call changes: 0
test-file changes: 0
```
