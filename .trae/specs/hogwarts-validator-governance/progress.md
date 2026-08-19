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

## 2026-08-17 - Phase 2 Production Explicitly Approved

The user explicitly approved starting Phase 2 production implementation from
the current PRD after MR #14 merged.

Active task:

```text
HVG-P2-01
Integrate the independently accepted dynamic 4B Identity contract into the
exact production Prompt, Schema, validator and settlement chain.
```

This approval does not waive:

- fresh blind production-chain acceptance;
- the physical 8 GB validation gate;
- the prohibition on low-memory support claims before that pass;
- the separate approval required for Phase 3.

## 2026-08-17 - HVG-P2-01 Dynamic Identity Production Port Implemented

Implemented without ordinary-turn cutover:

```text
POST /api/hogwarts-mud/local/identity/observe
-> local_dynamic_identity_observer
-> qwen3:4b at exact num_ctx=2048
-> target-bounded JSON Schema
-> deterministic Actor/index/evidence/confidence/inspection guards
-> transient normalized identityObservations proposal
```

The production request constructor rejects over-budget work before a model
call. Measured requests:

```text
one Actor: 1983 / 6000 characters
mixed blind case: 2309 / 6000 characters
```

The task is `server_ephemeral`: it does not enter `modelTaskRuntime`, increase
`stateRevision` or write State. Ordinary gameplay still uses the current post
observer until `HVG-P2-02/03`.

Deterministic verification:

```text
hogwarts-mud-dynamic-identity: 11 / 11
prompt/model-task affected harness: 21 / 21
Identity/language/turn regression: 18 / 18
ESLint: 0 errors
```

Full Hogwarts regression after correcting the no-growth and lifecycle
regressions introduced during implementation:

```text
745 / 748 pass
0 skip
0 todo
```

The three remaining failures are unchanged current business blockers already
registered outside this change:

```text
HTD-009 Scene Transition Prompt budget
HTD-010 Knowledge activation capsule
HTD-011 Medium locked-Event privacy boundary
```

Real qwen3:4b production request:

```text
model calls: 1
prompt tokens: 354
output tokens: 197
context: 2048
accepted: visible injury + explicit inspection negative
rejected by guard: dialogue-only self-claim
```

Fresh context-free blind evidence:

- [production Identity blind report attempt 2](./acceptance/phase2-production-identity-blind-report-attempt-2.md)

The untouched one-response output passed the production parser, guards and
existing Identity Reducer with zero retry, repair, provider fallback or
semantic Regex fallback. Fresh independent project-goal acceptance remains
required before `HVG-P2-01` can be marked complete.

## 2026-08-17 - HVG-P2-01 Independent Acceptance Attempt 1 Failed

Evidence:

- [attempt 1 report](./acceptance/phase2-production-identity-independent-report-attempt-1.md)

The fresh read-only verifier accepted the production endpoint, model-call,
Prompt, guard, Reducer, failure and focused-test behavior, but rejected
closeout because:

1. implementation line growth shifted two immutable Regex source locations;
2. the living contract still said 20 catalog tasks;
3. the Spec said no living-contract row changed;
4. the PRD acceptance matrix still described completed approval/blind gates
   as TODOs.

Corrections:

- restored the original source line positions without changing the Regex
  manifest or its anchored history;
- passed `--require-classified` at `578 / 355 / 195 / 26 / 2 / 0`;
- passed the semantic gate self-test;
- synchronized the living contract to `21 catalog / 17 active / 16 save
  runtime` task rows;
- synchronized Spec runtime impact and PRD acceptance status.

A different fresh independent Agent must rerun the complete `HVG-P2-01`
acceptance scope.

## 2026-08-17 - HVG-P2-01 Independent Acceptance Attempt 2 Failed

Evidence:

- [attempt 2 report](./acceptance/phase2-production-identity-independent-report-attempt-2.md)

The second fresh read-only verifier found one Schema parity defect:

```text
transport evidenceText: minLength=1, maxLength=500
runtime Zod evidenceText: maxLength=500
```

An empty evidence string could therefore pass runtime parsing and be repaired
from the stable segment index. This contradicted the rule that a Schema
failure must propagate without repair.

Correction:

- runtime Zod now requires `.min(1).max(500)`;
- focused tests prove empty evidence fails after exactly one model response;
- the production HTTP path returns `503` for the invalid response and makes no
  repair or retry request.

A third different fresh independent Agent must rerun the complete acceptance
scope.

## 2026-08-17 - HVG-P2-01 Independent Acceptance Attempt 3 Failed

Evidence:

- [attempt 3 report](./acceptance/phase2-production-identity-independent-report-attempt-3.md)

The third fresh read-only verifier rejected the independently handwritten
runtime Zod and transport JSON Schemas. Attempt 2 had already proven that this
duplication could drift, so field parity alone was insufficient.

Correction:

```text
DYNAMIC_IDENTITY_RESULT_DESCRIPTOR
-> generate route-bounded runtime Zod Schema
-> generate route-bounded transport JSON Schema
```

The descriptor is now the only result-field/key/enum/bound authority.
Actor enum and evidence-segment maximum use the same route context in both
generated Schemas. Focused tests mutate Actor, index and evidence inputs
against the runtime output and inspect transport fields from the same
descriptor.

Because the final transport Schema changed, Gate 8 was rerun with another
fresh context-free Agent:

- [descriptor-based blind report attempt 2](./acceptance/phase2-production-identity-blind-report-attempt-2.md)

The one untouched response passed the descriptor-generated runtime Schema,
guards and Reducer with zero retry, repair or fallback.

A fourth different fresh independent Agent must rerun the complete acceptance
scope.

## 2026-08-17 - HVG-P2-01 Independently Accepted

Evidence:

- [attempt 4 accepted report](./acceptance/phase2-production-identity-independent-report-attempt-4.md)

The fourth fresh context-free read-only Agent found no in-scope defect and
accepted every `HVG-P2-01` criterion.

Final evidence:

```text
focused Dynamic Identity tests: 11 / 11
full Hogwarts tests: 745 / 748
skip / todo: 0 / 0
Regex inventory: 578 / 355 / 195 / 26 / 2 / 0
semantic gate self-test: pass
blind model responses: 1
retry / repair / provider fallback / semantic Regex fallback: 0 / 0 / 0 / 0
```

`VCON-020` is now `compliant` for the endpoint-only production contract.
`HVG-P2-01` is complete.

Not accepted or started:

```text
HVG-P2-02 physical 8 GB validation
HVG-P2-03 ordinary-turn cutover and shared dynamic scheduling
HVG-P2-04/05 semantic Regex retirement
```

No low-memory or 8 GB support claim is made.

## 2026-08-17 - Physical 8 GB Gate Moved To Final Candidate

The user rejected running physical 8 GB validation before the complete Phase
2 implementation exists. The machine test must measure the exact product that
will ship, not the standalone Identity port.

Revision 8 order:

```text
HVG-P2-03 call-chain cutover
-> HVG-P2-04 retire 195 runtime semantic Regex rows
-> HVG-P2-05 retire 26 migration semantic Regex rows
-> HVG-P2-02 physical 8 GB validation
-> HVG-P2-06 final acceptance
```

Revision 7 approval is stale for remaining Phase 2 implementation because the
execution and acceptance order changed. No production code was edited for
this revision. `HVG-P2-03` remains pending until Revision 8 receives explicit
approval.

## 2026-08-17 - Revision 9 完整领域矩阵与延迟口径

用户指出此前 Phase 2 的展示虽然在调研中提及完整业务领域，却没有把它们完整纳入。
Revision 9 将以下全部记录为强制 Validator Governance 范围：

```text
建角 / Opening
付费正文 / Turn transaction
Checks
Identity / 生命状态
移动 / Presence
Calendar / Scene / 时间
Item / Presentation / Material
Spell
感知 / 证人 / Event
Social / Relationship / Appraisal / Memory
Map
Translation
Knowledge / ACL
迁移 / 保存
Pacing / 世界事实 / 线索 / Story Arc
进程健康 / 任务账本
```

新的 PRD 矩阵为每个领域列出预期的 Regex/确定性、`1.7B`、Embedding 和 `4B`
职责与频率。它是明确的范围清单，不是实现证据，更不声称当前 endpoint 或 registry
已经覆盖所有领域。

延迟口径修正：

- 现有 `1.69-3.33 s`、`6.75 s`、`9.82-11.58 s` 和 `20.67-23.99 s` 仅测量
  36 GB 研究机上的 post 路由本地链路；
- 它们不包含 pre-turn、付费正文、未变更 Appraisal 和 Translation；
- 因此，在测得最终集成生产工作流之前，PRD 只允许用
  `T(pre-turn) + T(付费正文) + T(post-chain)` 表述总等待；
- Knowledge、Map、Social、Calendar、Pacing、世界事实、线索或 Story Arc 工作流
  在完成该测量前，禁止声明最终单回合、低内存或 8 GB 延迟。

`HVG-P2-G2` 等待固定 PM 确认完整领域及字段/工作流矩阵，因此为 blocked。
`HVG-P2-G3` 为 pending，必须测量“看到付费正文时间”和“最终 State 时间”。
剩余 Phase 2 批准已失效；Revision 9 未修改生产代码。

## 2026-08-17 - Check 不升级，非阻塞候选可积累

用户明确决定：Check 不使用 `4B`。需要当前行动结果的 Check 只允许由 `1.7B`
pre-turn 产生有边界提案后交给确定性规则结算；语义不足时该回合不写 Check State，
不得等待、升级或猜测。

PRD 增加“延后语义裁决的积累调用”边界：

- 可积累：不影响当前行动的 Social 印象、长期 Memory，以及没有即时依赖的
  Pacing/世界事实/线索/Story Arc 候选；
- 不能积累：Check、权限、时钟、地图门锁、移动、Presence、Item 转交、Spell
  效果、伤势/生命状态，以及任何会立即影响正文或下一步合法行动的事实；
- 积累数据只是一条带来源和时钟的 transient proposal，不能成为 State 或后续模型
  的既成事实；
- 在场景结束、明确时间推进、读取前或预算允许的安全边界可一次性 flush；证据冲突、
  过期、对象失效或超预算时丢弃，不 retry、不补猜。

## 2026-08-17 - 积累候选使用一次低档大模型高阶裁决

用户指出 `4B` 可能无法承担跨回合因果、矛盾证据、多人动机和 Story Arc 阈值等
高阶推理。PRD 因此增加专门模块：

```text
积累候选
-> deterministic prefilter
-> 安全 checkpoint
-> 一次低档大模型结构化裁决
-> deterministic guards
-> 对应 Reducer
```

该路径不先调用 `4B` 再升级；低档大模型每个 eligible flush 最多一次，只能输出
Social、Memory、Pacing、世界事实、线索或 Arc 的结构化提案。它不生成玩家正文、
不直接写 State、不作为失败 repair、不 retry、不 provider fallback。

当前尚未选择 provider、模型、价格、Prompt/候选上限、超预算拆分和读取前最大等待
时间。这些必须在固定 PM 通过范围确认后，写入技术 Spec 并通过真实生产测量。

## 2026-08-17 - Pacing 业务范围纠正

用户要求调查 Pacing。固定 PM 与运行时合同确认，现有 `pacingDirector` 不是长期
剧情、世界事实、线索或 Story Arc 的总管，而是窄范围的“因果后果节拍”：

- 只有确定性 `causal_collapse_opportunity`、冷却和每 Scene 门禁同时满足时才能调用；
- 每个 Scene 最多一次，生成的 `pendingBeat` 必须在下一低档表演中消费；
- 它只能绑定一条已经在世界时间中存在、且与既有事实兼容的可显影后果；
- 不负责建人、补阵容、随机事故、填充剧情、长期 Calendar 节奏或隐藏 Arc；
- `calendar.storyBeats[]` 是长期剧情节奏，与 `pacingDirector.pendingBeat` 明确隔离。

因此 PRD 已把原先错误合并的 `Pacing / 世界事实 / 线索 / Story Arc` 拆成：

1. 现有“因果后果节拍（Pacing）”：当前事务内的中档 capability，不积累、不交给
   新的低档大模型替代；
2. 世界事实、线索和隐藏 Story Arc：字段、唯一 writer、玩家可见结果和阈值仍未
   定义，禁止借积累模块实现或声明调用频率。

固定 PM 对完整联合领域的结论仍为 `BLOCKED`，待用户决定要治理当前窄能力，还是
另行定义完整的世界事实/线索/隐藏 Arc 产品合同。

额外的实现一致性风险：运行时产品合同禁止 Pacing 建人、补阵容、随机填充或泛化
事故；但已有独立验收发现 `applyPacingAssessment()` 的实际 settlement 不仅涉及
`pacingDirector`，还可触及 `causalCollapse`、地图房间状态、Item、Social、Actor
和 Scene 压力。后续必须对这个窄能力做独立的真实 writer/reader 验收，不能因为
它名字叫 Pacing 就假设只写一个字段。

## 2026-08-17 - Pacing、世界事实、线索与隐藏 Arc 移出主治理

用户明确要求将现有因果后果节拍（Pacing）、世界事实、线索和隐藏 Story Arc 从本次
Validator Governance 独立出去。主治理 PRD 已删除这些领域的 `4B`、积累和低档
大模型职责；它们不再构成 `HVG-P2-G2` 的业务范围。

独立 research TODO 已建立：

[`hogwarts-causal-pacing-world-facts-story-arcs`](../hogwarts-causal-pacing-world-facts-story-arcs/prd.md)

该 TODO 当前为 `research_blocked`，没有模型、Schema、Reducer、迁移、测试或生产
实现授权。

## 2026-08-17 - Memory、Appraisal、Knowledge/ACL 职责拆分

用户指出主 PRD 原先把“读记忆”“主观评价”和“知识/权限”写成了一行，未说明模型
究竟要完成什么工作。固定 PM 的只读调研确认：

1. **Memory 激活**：当前对话的 NPC 只接收有限、且已经获准知道的 Event、Appraisal
   和关系连续性。候选召回、canonical hydration、ACL、时钟、revision、来源和
   Prompt 上限均是确定性流程；不调用 `1.7B`、`4B` 或低档大模型。
2. **Appraisal**：对 Event 的主观解释、矛盾证据权衡、稳定印象/Person Schema 和
   合法关系效果需要高阶语义判断。默认积累到场景结束、休眠/跨天或读取前，由一次
   低档大模型批量提出结构化提案。只有不结算会错误影响下一合法互动、关系门槛或
   承诺展示当前结果的 Dossier/关系视图时，才可作为重大转折在当前事务调用一次。
3. **Knowledge/ACL**：Embedding/精确索引只找候选；代码按当前 canonical
   State/chat、timeline、revision、clock、来源、替代关系和
   `public/actor-scoped/locked` 权限过滤。它不调用 `1.7B` 或 `4B`，也不新增或
   授予知识。

固定 PM 对这一明确局部能力的结论为 `BLOCKED`：仍需用户定义“重大转折”的有限
触发清单、读取前等待上限、低档大模型与成本，以及关系效果是否与 Appraisal 同批
结算。没有生产代码、模型调用、测试、迁移或保存改动。

## 2026-08-17 - Revision 10 收紧为即时回合治理

用户决定本 PRD 只治理每回合即时变化：玩家当前行动、当前正文或下一步合法行动
必须立即依赖的输入、Check、Identity/生命、移动/Presence、Calendar/Scene/时间、
Item/Presentation/Material、Spell、感知/证人/Event、Map 和 Knowledge/ACL 边界。

本 PRD 已移出：

```text
Appraisal
Social
Memory
宏观 Pacing
世界事实
线索
隐藏 Story Arc
建角 / Opening
迁移
进程健康 / 任务账本
```

已删除这些领域的模型分配、积累性高阶推理、低档大模型延迟预算和验收门禁。它们
不得通过本变更的 `1.7B`、`4B`、Embedding、付费正文或 Reducer 路径发生行为变化。
Pacing/世界事实/线索/隐藏 Arc 仍由独立 research TODO 记录；Social/Appraisal/Memory
留给未来 Social 模块迭代。Revision 9 的剩余批准失效，Revision 10 无生产代码改动。

Translation 从未在本期生产范围内，也没有被代码、模型调用、State 或验收路径改变；
它此前出现在范围表中是规划分类错误，不是“移出后等待处理”的功能 TODO。

范围同步修正：Revision 10 不能再承诺本期退休全部 221 条全局语义 Regex。`HVG-P2-04`
和 `HVG-P2-05` 只退休固定 PM 确认属于即时回合范围的行；Appraisal/Social/Memory
及其他排除领域的行继续保留在不可伪造的全局登记与 retirement 基线中，等待其未来
owning module 处理。

## 2026-08-17 - Revision 11 Existing Migration Retirement

Fixed PM approved the narrow capability: existing immediate-turn production
paths and migration semantic-Regex retirement. It does not add new Identity
Body, Presentation, Item lifecycle, or magic lifecycle behavior.

`HVG-P2-05` retired all 26 `semantic_migration` rows. Old-save migration now
preserves explicit structured values only; prose, names, labels, errors and
Scene descriptions no longer create or rewrite State. The append-only ledger
contains all 26 retirement events. One related temporary-actor display-name
runtime inference was retired as `HVG-P2-04`, leaving 194 runtime semantic
Regex rows.

Verified: classified inventory `548 / 352 / 194 / 0 / 2 / 0`; semantic gate
passed; focused migration/domain tests `42/42` and `28/28`; existing
turn/call-budget tests `30/30`.

## 2026-08-17 - Revision 11 Remaining Phase 2 Authorized

用户明确要求继续完成剩余 Phase 2。固定 PM 的初审确认该能力仅治理既有即时回合
链：pre-turn、付费正文、post-turn observation、既有 Item/Spell/伤势观察与各自
Reducer；Social、Appraisal、Memory、Pacing、世界事实、线索、Story Arc、Opening、
Translation 以及延期的 Identity/Presentation/Item/魔法生命周期字段均保持不变。

用户授权 `HVG-P2-03`、`HVG-P2-04` 与 `HVG-P2-G3`。`HVG-P2-03` 已标为
`in_progress`。现有 turn 编排仍会调用相邻的 Pacing、Appraisal/Memory 与
Translation 工作流，但本期不修改其调用、Prompt、模型次数、Reducer 或 State 字段。

### HVG-P2-03 子段：伤势观察切换

已将既有普通回合的伤势路径从 post observer 中移出：

```text
pre-turn 的既有结构化 Check target
-> 付费正文
-> post-turn core observer（不再输出伤势）
-> 有 target 时一次 `local_dynamic_identity_observer`
-> 既有 Identity Reducer
```

`no_visible_injury` 只在最终确定性 Check 的 `kind=perception` 且目标 Actor 合法时
进入端口。无结构化目标、模型/Schema/guard 失败、假设文本和 NPC 自述均产生零伤势
proposal；不会调用旧 Regex、不会 retry，也不影响已经生成的正文或其他即时结算。

已退休 runtime Regex：

```text
regex_66456cdbc0719c9d65bb  inspection gate
regex_248ef7d8fa92e0eee017  no-visible-injury inference
regex_9cabd8b9250786b63c98  visible-injury inference
```

当前登记计数：`544 total / 351 lexical / 191 runtime semantic / 0 migration /
2 dead / 0 unclassified / 30 retirement events`。

已通过：

```text
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs --require-classified
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs --self-test-semantic-gate
node --test tests/hogwarts-mud-npc-identity-observation.test.mjs
node --test tests/hogwarts-mud-dynamic-identity.test.mjs
node --test tests/hogwarts-mud-model-language-adoption.test.mjs
node --test tests/hogwarts-mud-task8-call-budget.test.mjs
```

### HVG-P2-04 子段：列车到站的死散文 fallback

已删除 `resolveSceneTransitionDestination()`：它只在测试中被调用，生产路径没有 caller，
且会从“到达霍格沃茨/下车”等散文反推跨地图目的地。现有 Scene Transition 正式
contract 已经要求模型提交 location directory 中的精确 `mapId/roomId`，目录 lookup
仍支持正式 `hogsmeade_station` ID/alias；普通到站散文不再产生地图 State。

已退休：

```text
regex_56b7f2a8e8674f346487  arrival prose fallback
regex_67a77ed930578e4b3591  destination-name prose fallback
```

当前登记计数：

```text
512 total / 351 lexical / 159 runtime semantic / 0 migration /
2 dead / 0 unclassified / 62 retirement events
```

已通过：

```text
node --test tests/hogwarts-mud-movement-resolution.test.mjs
node --test tests/hogwarts-mud-spatial-reconciliation.test.mjs
```

### HVG-P2-05 补充：Inventory 旧档签名物品补造

已删除 `migrateObservedInventoryState()` 从最后 12 条聊天中识别“签名/亲笔签名”并补造
`harry_signed_parchment` 的逻辑。旧档迁移现在只保留已有 `items[]` 并写入版本标记；
未结构化保存的魔杖、签名纸张或任何散文描述都不会新建或转交 Item。

已退休：

```text
regex_e53ea050d6ce209e97fc  autograph action prose inference
regex_1ef2268abe0cc01f778a  autograph narrative prose inference
regex_97fadc02847c359b28e0  existing autograph label inference
```

当前登记计数：

```text
509 total / 351 lexical / 156 runtime semantic / 0 migration /
2 dead / 0 unclassified / 65 retirement events
```

已通过：

```text
node --test tests/hogwarts-mud-material-state.test.mjs
node --test tests/hogwarts-mud-item-system-v2.test.mjs
node --test tests/hogwarts-mud-prompt-payload-consolidation.test.mjs
```

### HVG-P2-04 子段：结构化 Item 意义与保留

已删除从 label、叙事获得语句或玩家“保留”动作中推断 Item 意义的 4 条 Regex。
新 Item proposal 只接受已有结构化 `type`、`storyRoles`、`transferMode` 和显式
`importance`：没有合法 proposal 时不写 Item State；普通 consumable 只有结构化转交
或故事角色才可成为候选。

已退休：

```text
regex_6472cf0b573efc195736  label -> important Item
regex_0b9fec5a1946f3a1a930  label -> transient Item
regex_0a23a9b4cacd3defddae  narrative -> durable acquisition
regex_df0d2fe332dd361d6be0  player prose -> retain Item
```

当前登记计数：

```text
505 total / 351 lexical / 152 runtime semantic / 0 migration /
2 dead / 0 unclassified / 69 retirement events
```

已通过：

```text
node --test tests/hogwarts-mud-item-system-v2.test.mjs
node --test tests/hogwarts-mud-material-state.test.mjs
node --test tests/hogwarts-mud-turn-validation.test.mjs
node --test tests/hogwarts-mud-turn-protocol.test.mjs
```

### HVG-P2-04 子段：Dynamic Inventory 高风险操作与类型

`local_inventory_observer` 的 descriptor 新增瞬态 `evidenceItemText` 与
`physicalForm`。所有动态 Item proposal 现在必须给出同源逐字 `evidenceText` 和
其中识别物品的 `evidenceItemText`；毁坏形态只有模型显式提交
`whole|remains|absent|unknown` 才会采用，缺失时保守为 `remains`。

已删除 Item Schema 中按散文决定 `lose/destroy/consume/damage/clean`、物品 type、
物理形态和 type-based evidence 的 31 条 Regex。确定性代码仍负责 Schema、稳定 ID、
同源证据、置信度、转移合法性和 Reducer 唯一写入；无合法 proposal 时不写 State。

当前登记计数：

```text
472 total / 349 lexical / 121 runtime semantic / 0 migration /
2 dead / 0 unclassified / 100 retirement events
```

已通过：

```text
node --test tests/hogwarts-mud-dynamic-inventory.test.mjs
node --test tests/hogwarts-mud-item-system-v2.test.mjs
node --test tests/hogwarts-mud-material-state.test.mjs
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs --require-classified
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs --self-test-semantic-gate
```

### HVG-P2-G3 子段：正文可见与即时 State 结算观测

已在既有 `turn.js` 的诊断流增加两个只读里程碑：

```text
narrative_visible
  = paid narrative 已进入 live scene stream 并触发渲染调度

state_settled
  = Item / Identity / Presence / witness / event 等即时 Reducer 已完成
    （发生在既有 Appraisal 调用之前）
```

二者都记录从回合启动到该点的 `elapsedMs`。它们只写入已有
`extra.hogwartsMud.turnDiagnostics`，不影响正文、State、模型次数或既有
Social/Appraisal/Pacing 调用。领域测试证明 `narrative_visible` 早于
`state_settled`；真实 Ollama 端到端计时仍需等完整即时回合候选的其余 P2-04 清理后
统一执行，当前不得把测试耗时当作玩家等待时间。

已通过：

```text
node --test tests/hogwarts-mud-task5-workflows.test.mjs
node --test tests/hogwarts-mud-task8-call-budget.test.mjs
```

### HVG-P2-04 子段：结构化地图环境暴露

已删除从 room ID、显示名、描述或 tags 拼接文本中猜测户外环境的 Regex。当前
`buildBehavioralEnvironment()` 只按既有结构化地图目录中的 `room.kind` 或显式
`outdoor` tag 判定 `exposure`。未声明户外的自定义 Room 即使显示名含 “Garden” 也
不会被文本猜测为户外。

已退休：

```text
regex_8a41fc884df3958efc9b  room prose -> environment exposure
```

当前登记计数：

```text
516 total / 351 lexical / 163 runtime semantic / 0 migration /
2 dead / 0 unclassified / 58 retirement events
```

已通过：

```text
node --test tests/hogwarts-mud-turn-protocol.test.mjs
node --test tests/hogwarts-mud-turn-validation.test.mjs
```

### HVG-P2-04 子段：正文派生的公共事件摘要

已删除对 paid narrative 原始 `publicEventEn` 是否含“player acts”等关键词的两条
Regex 判断。当前最终写入的公共事件摘要只从已返回的结构化
`signals.sceneProgression.summaryEn` 或 narration 段落派生；原始摘要字段不再成为
State 或事件记忆的语义 authority。若两者都不存在，才保留结构化的缺失摘要错误。

已退休：

```text
regex_6f115f3a12a0e86ad8fa  raw publicEventEn placeholder filter
regex_83919ff49b9fb6ae77d9  raw publicEventEn placeholder validator
```

当前登记计数：

```text
514 total / 351 lexical / 161 runtime semantic / 0 migration /
2 dead / 0 unclassified / 60 retirement events
```

已通过：

```text
node --test tests/hogwarts-mud-turn-protocol.test.mjs
node --test tests/hogwarts-mud-turn-validation.test.mjs
node --test tests/hogwarts-mud-task8-call-budget.test.mjs
```

### HVG-P2-04 子段：Check 语义退休

已删除 `checks.js` 中按自然语言关键词判断 Check 类别、目标称谓、角色/体型修正和
优势/劣势的 20 条语义 Regex。当前契约为：

```text
pre-turn 1.7B
-> required / ruleId / targetActorId / rollMode
-> deterministic Actor-ID、显式 checkModifiers、D20、算术和 Check Reducer
```

没有有效 pre-turn proposal 时，普通自然语言不再自动触发 Check；显式有限 DSL
Spell directive 和用户明确强制 Check 仍走既有确定性入口。`rollMode` 只接受
`normal|advantage|disadvantage`，不再由“有人帮忙”“受伤”“教授”等散文关键词
推断。

本子段新增退休事件 `20` 条，当前登记计数为：

```text
524 total / 351 lexical / 171 runtime semantic / 0 migration /
2 dead / 0 unclassified / 50 retirement events
```

已通过：

```text
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs --require-classified
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs --self-test-semantic-gate
node --test tests/hogwarts-mud-spell-action-check.test.mjs
```

### HVG-P2-04 子段：Movement 学校旅行授权

已删除从 Item 显示名或玩家行动散文猜测学校列车旅行权限的两条 Regex。现有地图
`valid_school_travel` 条件现在只接受玩家持有、未失效且稳定 ID 为
`acceptance_letter` 的既有 Item。地图出口和 Movement Reducer 仍是唯一的路线与
State authority；没有新增 Item、Presentation 或生命周期逻辑。

本子段新增退休事件：

```text
regex_0ec2d8f384f36e2d199a  Item label -> school-travel authority
regex_94d6d3eefecff6a2c979  action text -> Hogwarts Express authority
```

当前登记计数：

```text
522 total / 351 lexical / 169 runtime semantic / 0 migration /
2 dead / 0 unclassified / 52 retirement events
```

已通过：

```text
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs --require-classified
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs --self-test-semantic-gate
node --test tests/hogwarts-mud-movement-resolution.test.mjs tests/hogwarts-mud-spatial-reconciliation.test.mjs
```

领域测试证明：伪造“录取通知书”显示名和“登上霍格沃茨特快”正文不写移动 State；
真正的 `acceptance_letter` 即使显示名无关，仍可通过现有地图条件。

### HVG-P2-03 子段：Inventory 4B 结构化路由

已从 `/local/observe` 删除旧的 `INVENTORY_CANDIDATE_ITEM_PATTERN` 和
`INVENTORY_CANDIDATE_POSSESSION_PATTERN`。post core 现在只输出瞬态
`inventoryObservationRequired`：`false` 时 Inventory 4B 为 `0` 次调用；
`true` 时 browser adapter 才调用独立
`POST /api/hogwarts-mud/local/inventory/observe`。

独立端点使用现有 `local_inventory_observer` 任务、`qwen3:4b` 和精确
`num_ctx=4096`。`INVENTORY_OBSERVATION_RESULT_DESCRIPTOR` 同时生成 Zod 和
transport Schema。端点先验证逐字证据、置信度、重复 ID 与英文权威字段，随后仍由
既有 browser Item evidence/transition guards 和 Item Reducer 决定是否写入 State。
任何端口、模型、Schema 或 guard 失败只省略 Item proposal，不 retry、不用 Regex
补猜，也不影响已生成正文。

本子段不新增 Item、Presentation 或生命周期字段和规则。

已退休：

```text
regex_625144b576c444c62841  Item-candidate keyword call gate
regex_94a50eca75400f98e98d  possession keyword call gate
```

当前登记计数：

```text
520 total / 351 lexical / 167 runtime semantic / 0 migration /
2 dead / 0 unclassified / 54 retirement events
```

已通过：

```text
node --test tests/hogwarts-mud-dynamic-inventory.test.mjs
node --test tests/hogwarts-mud-item-system-v2.test.mjs
node --test tests/hogwarts-mud-model-language-adoption.test.mjs
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs --require-classified
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs --self-test-semantic-gate
```

### HVG-P2-04 子段：Post core 结构化边界与离场

已删除 post core 后 browser adapter 对“离开/结束/隐蔽”等散文关键词的三条二次
语义 Regex。当前契约为：

```text
post core 1.7B -> structured eventBoundary / actor presence / perception
-> deterministic exact evidence、Actor/Room ID、confidence guards
-> structured failed Check 可直接否决 successful concealment
-> existing turn Reducers
```

`eventBoundary.ended` 不再要求 Regex 命中某个“结束”词；它只要求 post core 的结构化
布尔值、最低置信度与现有 narration 的逐字 evidence。`presence=absent` 同样只在
结构化边界成立时才离场。模型或 evidence 失败仍不写对应 State，不 fallback 到文本
猜测。

已退休：

```text
regex_4f49f2e0ad0e7af0842e  actor departure keyword inference
regex_e3ce868bc6c9ddf1a2eb  event-boundary keyword inference
regex_a6c8819fe7aaf39556bc  concealment keyword inference
```

当前登记计数：

```text
517 total / 351 lexical / 164 runtime semantic / 0 migration /
2 dead / 0 unclassified / 57 retirement events
```

已通过：

```text
node --test tests/hogwarts-mud-local-observer-presence.test.mjs
node --test tests/hogwarts-mud-task5-workflows.test.mjs
node --test tests/hogwarts-mud-task8-call-budget.test.mjs
```

## 2026-08-17: HVG-P2-04 Immediate Turn Regex retirement complete

玩家结果：

```text
Before:
  Knowledge query keywords selected cause/person/pattern retrieval branches.
  Calendar promise keywords could route Medium Calendar directly from prose.

After:
  Knowledge performs one bounded raw-query candidate lookup; embedding/exact
  ranking recalls candidates, then canonical hydration, timeline, revision,
  clock, source, supersession and ACL guards decide Prompt eligibility.
  The existing pre-turn 1.7B emits evidence-bounded calendarCommitment.
  Only requested=true with exact player-action evidence can route the existing
  Medium Calendar after the paid narrative is saved and rendered.

Failure:
  Knowledge failure writes no State and stops a required paid request before
  it starts. Invalid/absent Calendar commitment does not call Medium Calendar.
  Medium Calendar failure preserves the existing Calendar and the already
  visible paid narrative.
```

本批退休：

```text
Knowledge planner:
  regex_78767ded5d8b3fad1d5b
  regex_02cbb36ad23852d82abc
  regex_87bdb9f61d7c26a135a1

Medium Calendar commitment:
  regex_d2d5bf34b84aae77451c
  regex_9219747d11a59afea030
  regex_c40b0bb6378fab14beb8
```

最终 P2-04 manifest：

```text
434 total
347 accepted_lexical
85 semantic_runtime
0 semantic_migration
2 dead_or_retired
0 unclassified
136 append-only retirement events
source fingerprint:
d666cc770beba0b269bdefd5e330a5616a44b7f003a052d9a5c12e6d08efc183
```

剩余 85 条全部属于已批准的排除或共享排除域，精确 ID 快照见
[`phase2-excluded-semantic-runtime.json`](./phase2-excluded-semantic-runtime.json)：

```text
43 Social/Appraisal
22 Opening or Opening-shared narrative authority
9 deferred Identity/Presentation appearance
7 Translation
3 process/sensitive-field governance
1 macro Pacing
```

验证通过：

```text
node --test tests/hogwarts-mud-relational-synapse.test.mjs
  8/8
node --test tests/hogwarts-mud-turn-validation.test.mjs
  6/6
node --test tests/hogwarts-mud-medium-calendar-director.test.mjs
  10/10
node --test tests/hogwarts-mud-task8-call-budget.test.mjs
  10/10
node --test tests/hogwarts-mud-task5-workflows.test.mjs
  15/15
node --test tests/hogwarts-mud-model-language-adoption.test.mjs
  9/9
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs --require-classified
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs --self-test-semantic-gate
```

Knowledge real-save 回归已按 actor-scoped retained Event authority 修正：

```text
tests/hogwarts-mud-knowledge-activation-revision-root-fix.test.mjs
tests/hogwarts-mud-relational-synapse.test.mjs
10/10
```

Harry 的 retained Event 是 `event_evening_study_session_*`，不能因为同场见证过
另一个 quill Event 就被测试强行授予该 Event；Hermione/Lavender 的 retained ID
精确命中时才进入各自 capsule。

真实 `qwen3:1.7b` pre-turn 单次调用：

```text
question:
  calendarCommitment.requested=false
  total=5.43 s / load=2.24 s / prompt=1237 / output=158 tokens
commitment:
  calendarCommitment.requested=true
  exact evidence accepted
  total=2.56 s / load=0.12 s / prompt=1238 / output=157 tokens
retry=0
```

Prompt build 当前阻塞在排除域：

```text
Scene Transition 76,531 > approved product target 76,100 characters
```

Dynamic Inventory 已通过自身 `9,000` 字符硬预算；未抬高任何预算。Scene
Transition/Opening Prompt 的裁剪会跨越本期排除边界，因此本期未修改，最终 Prompt
总门禁仍不可宣称通过。

## 2026-08-17: Final candidate verification blocked

范围纠正：

```text
unapproved: cap Dynamic Inventory Actor coverage from 16 to 8
correction: restored 16 immediately
final correction: removed the entire unapproved actors[] Prompt projection
```

没有模型请求或 State 写入使用过该未授权投影。Prompt 预算失败继续作为 blocker，
没有通过缩减业务覆盖、提高预算或裁剪排除域 Prompt 来伪造通过。

当前 deterministic 结果：

```text
Hogwarts tests: 755 / 757 pass
Regex manifest: 434 total / 347 lexical / 85 excluded semantic runtime /
0 semantic migration / 2 dead / 0 unclassified
retirement events: 136
semantic gate self-test: pass
diff check / syntax checks: pass
```

两个剩余红灯都属于明确排除域，未修改：

```text
Scene Transition Prompt:
  76,531 > approved target 76,100 characters

Memory medium projection:
  locked Event sentinel MEDIUM_MEMORY_LOCKED_EVENT remains visible
```

正式 single-model E2E harness 的零付费 preflight 已通过，证据见
[`phase2-single-model-preflight-evidence.json`](./acceptance/phase2-single-model-preflight-evidence.json)：

```text
paid generate calls: 0
local/translation/Social calls: 0
QA chat removed: yes
QA backup removed: yes
residue: 0
Tina archive unchanged: yes
settings restored: yes
secrets unchanged: yes
```

真实付费 E2E 未启动。仓库 README 要求全量离线验收先通过，当前两个排除域红灯使该
前置条件不成立。

最终 fresh context blind simulation 见
[`phase2-final-blind-model-report.md`](./acceptance/phase2-final-blind-model-report.md)：

```text
pre-turn Calendar commitment: pass
post-turn temporal claims: pass
dynamic Inventory new loan: fail
```

Inventory blind response 使用展示名作为 owner/holder ID，并对新 Item 返回
`operation=lend`。真实 Schema 和 server evidence guard 接受后，browser
stable-ID/new-candidate guard 拒绝，结果为：

```text
model calls: 1
retry/fallback: 0
Item State write: 0
paid narrative: retained
```

未授权的 `actors[]` Prompt 投影和 Actor 数量裁剪均已撤回。由于 Gate 8 要求原始
blind 响应必须通过完整生产链，`VCON-014` 已从 `compliant` 降回
`legacy_registered`。`HVG-P2-03` 与 `HVG-P2-G3` 当前均为 `blocked`，Phase 2
不得宣称完成、不得进入物理 8 GB 或最终 E2E。

### 2026-08-17 correction: Inventory blind acceptance scope

The preceding Inventory blocker conclusion used the wrong workflow. Revision
11 explicitly limits the dynamic endpoint to:

```text
playerAction
narrativeSegments[]
existing Item context
```

It explicitly does not add new holder/transfer lifecycle logic. Therefore a
new NPC-owned loan candidate requiring an Actor directory is not a Phase 2
acceptance case. Its rejection remains useful negative evidence only.

A new fresh context agent received the exact current production request for an
approved existing-Item placement workflow:

```text
request SHA-256:
c7c3cf09c59ebdf991e1da1740e1fabb560a166bf4cb0e303c768cfeb5012f73
model calls: 1
retry/fallback: 0
```

The untouched response passed:

```text
transport Schema
server evidence/confidence/language guard
browser stable Item ID and evidence guard
Item proposal partition
Item Reducer
```

Final Item result:

```text
id=harry_signed_note
operation=place
holderId=""
location.placement=in_room
State write=true
```

The final blind report is now `PASSED` for all three approved workflows:

```text
pre-turn Calendar commitment
post-turn temporal claims
existing-Item Dynamic Inventory placement
```

No `actors[]` Prompt projection exists, and no Actor count was reduced.
`VCON-014` is restored to `compliant`; `HVG-P2-03` returns to `in_progress`.
`HVG-P2-G3` remains blocked only by the formal paid-E2E prerequisite:

```text
Scene Transition Prompt 76,531 > 76,100
Memory locked Event projection red test
```

Both are explicitly excluded remediation domains and remain untouched.

## 2026-08-17: HVG-P2-G3 real ordinary-turn measurement

The formal disposable-save Playwright harness was extended with an opt-in
production mode:

```text
HOGWARTS_ACCEPTANCE_REAL_LOCAL=1
```

Default deterministic-fallback acceptance remains unchanged. In real-local
mode:

```text
paid narrative generate: exactly 1
local pre-turn qwen3:1.7b: exactly 1
local post-turn qwen3:1.7b: exactly 1
Appraisal: browser-blocked
Social: browser-blocked
Translation: browser-blocked
automatic retry/provider fallback: 0
```

The zero-paid preflight passed after every harness edit. The final real run
used one upstream request and two forwarded local requests, committed one
player message and one assistant message, advanced one turn, returned to
`turn.status=idle`, preserved Tina, restored settings/secrets and removed all
QA chat/Knowledge/backup residue.

Measured player-visible milestones:

```text
narrative_visible: 40,437 ms
state_settled:     55,817 ms
settlement lag:   15,380 ms
```

The local post call completed on `qwen3:1.7b`. Its perception and two temporal
claims failed exact-evidence/normalization guards, so the paid narrative
remained visible and the affected proposals used the existing conservative
structured fallback with no retry.

The G3 final-State gate failed after refresh:

```text
spellbook.lastScannedMessageId: 216 -> 218
stateRevision:                 160 -> 161
revision source:               lifecycle_migration
changed top-level State keys:
  revisionHistory
  spellbook
  stateRevision
```

Therefore the observed `state_settled` milestone is not the final persistent
State boundary. Fixing this requires changing Spell lifecycle scan/write
timing, which Revision 11 explicitly excludes. The harness did not normalize
or waive this change.

Evidence:

[`phase2-real-e2e-g3-failed-spell-lifecycle.json`](./acceptance/phase2-real-e2e-g3-failed-spell-lifecycle.json)

Current result:

```text
HVG-P2-03: completed; real chain used one pre, one paid narrative and one post
HVG-P2-G3: blocked by excluded Spell lifecycle migration
physical 8 GB validation: not started
Phase 2 completion claim: forbidden
```

## 2026-08-17: Fresh independent acceptance rejected P2-03 completion

A fresh read-only acceptance run returned `FAIL` after tracing the production
call graph from the approved Revision 11 outcome:

```text
narrative_visible:
  recorded after scheduling a status card, before narrative segments render

downstream failure:
  can clear the live stream without appending the paid narrative message

mixed dynamic route:
  Identity and Inventory issue two separate qwen3:4b requests

post context:
  configured default 4096 reaches Ollama instead of approved exact 2048

state_settled:
  recorded before message/metadata persistence and immediate follow-ups
```

`HVG-P2-03` is therefore returned to `in_progress`. `HVG-P2-G3` remains
`blocked`; its earlier timing numbers are diagnostic only and cannot be used
as acceptance. Remediation remains limited to the approved Immediate Turn
chain. Memory, Appraisal, Social and Spell lifecycle behavior remain excluded.

## 2026-08-17: Current player-effect audit

The user explicitly removed the hard `2048` acceptance target for post core
and shared dynamic work. Complete rules now run at context `4096`; Prompt size
is not used as the quality verdict.

Observed outcomes:

```text
deterministic State matrix:       158 / 158
deterministic Knowledge/ACL:       28 / 28
real-model research chain raw:    148 / 160
real-model research after guards: 160 / 160

production pre-turn one-shot:       4 / 6
production post route one-shot:     1 / 2
production shared dynamic one-shot: 2 / 4
```

The research harness is not representative of current production recall.
Production missed an enacted existing-Item placement, an explicit Calendar
promise and an immediate progression request. A forced bad dynamic route also
accepted a hypothetical Item gift, although the tested production post route
correctly omitted that exact hypothetical call. Deterministic guards continue
to reject many false Actor departures, Event closures and ungrounded evidence.

Knowledge/ACL remained materially stronger: the Tina quill-repair Event was
recalled and canonically hydrated, Hermione and Lavender retained it, and
Harry did not receive it.

Retirement accounting is not currently closed. The append-only ledger contains
136 events, but restoring one explicitly excluded Memory migration Regex left
135 executable retirements plus one excluded-domain restoration. The manifest
therefore does not match source.

Evidence:

- [phase2-current-effect-audit.json](./acceptance/phase2-current-effect-audit.json)
- [quality-current-retirement-effect.json](./benchmarks/quality-current-retirement-effect.json)

Verdict: State precision is high after guards, but positive State recall is
not acceptable. Knowledge/ACL passes the current deterministic matrix and one
real Tina Event workflow. Phase 2 remains unaccepted.

## 2026-08-17: Revision 12 State-recall Prompt plan drafted

The user requested two documentation outcomes:

1. integrate the complete current player-effect audit into the PRD;
2. draft a plan to tune 1.7B State recall without returning to Prompt-size
   optimization as the product goal.

Revision 12 is `12-state-recall-prompt-tuning-plan`. The PRD now contains the
production report, player Before/After scenarios, explicit scope, per-family
quality thresholds and operational impact. The Spec limits implementation to
`PRE_TURN_SYSTEM` and `POST_TURN_SYSTEM`, with unchanged input, Schema,
transport, guards, Reducers, State fields, call order, call count and 4B
Prompt.

Planned execution:

```text
freeze 48 pre + 48 post cases and 30% holdout
-> tune pre decision order and adjacent minimum pairs
-> tune post route/Actor/Event decisions
-> combine winners
-> one-shot blind holdout
-> deterministic regression
-> disposable-save production State before/after
-> fresh independent acceptance
```

Primary thresholds:

```text
positive recall per family >= 95%
minimum family recall >= 90%
guarded incorrect State = 0
accepted stable Actor IDs = 100%
State regression = 158/158
Knowledge/ACL regression = 28/28
retry/fallback = 0
call count unchanged
```

Approval status: stale/pending. The user's request authorized this plan, not
production Prompt edits. `HVG-P2-03R-*` tasks remain pending.

## 2026-08-17: Revision 12 implementation approved

The user explicitly approved implementation and clarified the Prompt budget:
1B Prompt length is acceptable whenever it does not interfere with the final
output. State recall/precision and complete valid JSON are primary; an
artificially lower character target is not.

Execution starts with `HVG-P2-03R-G1`. The 96-case matrix and holdout are
frozen before either production Prompt constant changes.

## 2026-08-17: HVG-P2-03R-G1 matrix and baseline complete

The domain fixture freezes 48 pre and 48 post cases. Holdout is 48/96, split
24 pre and 24 post. Expected answers are stored outside production request
input and matrix integrity tests pass.

Current production Prompt baseline:

```text
all cases: 42/96
parse/Schema failures: 2
p50: 5,776 ms
p95: 10,396 ms

calendar positive:       0/6
progression positive:    1/6
check positive:          1/6
time positive:           3/6
inventory route positive: 0/10
actor update positive:   1/6
event boundary positive: 6/6
temporal positive:       0/2
```

Negative extremes confirm systematic bias rather than isolated misses:
Calendar and Inventory route default false; Event boundary defaults true;
Actor updates are emitted for every negative case. The model often describes
the correct semantic interpretation in `reasonEn` while filling the structured
decision field incorrectly.

Evidence:

- [local-semantic-recall-baseline.json](./benchmarks/local-semantic-recall-baseline.json)
- [local-semantic-recall-benchmark.mjs](./benchmarks/local-semantic-recall-benchmark.mjs)

`HVG-P2-03R-G1` is complete. `HVG-P2-03R-PRE` is active; post Prompt remains
unchanged until pre selection completes.

## 2026-08-17: HVG-P2-03R-PRE Prompt-only limit reached

Multiple production-Schema Prompt designs were tested with one qwen3:1.7b
request and no retry:

```text
long ordered rules
compact state machine
English and Chinese protocols
balanced full JSON few-shot
24-case development few-shot
structured speech/action Prompt routing
dynamic current-Actor name-to-ID examples
8192 context with closed number and synonym families
```

The selected routed Prompt passes the complete development set `24/24`, but
four successive unseen holdout revisions remained `18/24` to `19/24`.
The final holdout result is:

```text
Calendar:    positive 3/3, negative 3/3
Progression: positive 3/3, negative 3/3
Check:       positive 1/3, negative 2/3
Time:        positive 0/3, negative 3/3
overall:     18/24
parse failures: 0
max prompt + output: 6,416 / 8,192 tokens
```

Output space did not cause the failure. The remaining misses are unseen
stealth/willpower paraphrases and arbitrary written-number durations. Adding
each failed holdout phrase to Prompt would manufacture fixture recall and is
rejected.

Evidence:

- [local-semantic-recall-pre-final4-dev.json](./benchmarks/local-semantic-recall-pre-final4-dev.json)
- [local-semantic-recall-pre-final4-holdout.json](./benchmarks/local-semantic-recall-pre-final4-holdout.json)

`HVG-P2-03R-PRE` is blocked against the approved per-family `>=95%` threshold.
The independent post Prompt task may continue.

## 2026-08-17: HVG-P2-03R-POST blocked; experimental Prompts rolled back

Post Prompt tuning improved Item routing and temporal extraction on the
development matrix, but could not satisfy Actor/Event positive recall:

```text
best post development candidate: 17/24
Inventory route: positive 5/5, negative 4/5
Actor update: positive 0/3, negative 3/3
Event boundary: positive 0/3, negative 3/3
Temporal: positive 1/1, negative 1/1
p95: 11,818 ms
max prompt + output: 7,276 / 8,192 tokens
```

A final compact eight-example prototype passed only `4/8`. Prompt growth did
not solve cross-field population. Post holdout was not opened because the
development families already failed the approved threshold.

Neither experimental Prompt is active in production. The original pre/post
System Prompts were restored:

```text
pre System: 5,235 characters; no exact context override
post System: 6,295 characters; exact context 4,096
focused rollback regression: 31/31
```

Evidence:

- [人类可读失败报告](./acceptance/phase2-1b-state-recall-prompt-tuning-failed.md)
- [local-semantic-recall-post-candidate3-dev.json](./benchmarks/local-semantic-recall-post-candidate3-dev.json)

`HVG-P2-03R-PRE`, `HVG-P2-03R-POST` and their combined acceptance are blocked.
Prompt-only tuning under one qwen3:1.7b request and the current compound
Schemas is exhausted. A later approved revision must change model capacity,
task/Schema decomposition, deterministic arithmetic ownership, or semantic
routing architecture. No such change is authorized here.

The blocker is registered as
[HTD-014](../TECH_DEBT.md). `HVG-P2-03` is blocked independently of the
separate Spell lifecycle/G3 blocker.

## 2026-08-17: Revision 13 product decisions recorded

The user made two product decisions after reviewing the 1.7B limitation:

1. A semantic model may propose only that a current action actually has an
   explicit duration and quote its evidence. Deterministic code, not the
   model, will convert the already accepted duration to minutes. Regex and
   code remain forbidden from inferring that a duration action occurred from
   free prose.
2. Stealth and resistance are not hard positive-recall requirements. Missing
   Check proposals remain conservative: no extra 4B, no Regex fallback and no
   Check State write.

This documents future ownership only. It does not alter the current production
Schema, guards, Reducers, model default or call count.

## 2026-08-17: HVG-P2-03R-4B offline holdout completed

The benchmark runner received an offline-only `--model` option, which passes
the value through the already existing `modelOverride` port. Production default
selection remains unchanged.

The frozen holdout was run serially at `qwen3:4b`, `think=false`, context
`4096` and the existing 120-second timeout:

```text
all holdout: 22/48 passed
parse/transport failures: 17/48
Check positive: 0/3
Actor positive: 2/3
Event positive: 3/3
combined action-positive recall: 5/9 (55.6%)
```

The explicit Ron departure sample produced the desired `absent` Actor proposal
and `entrance_hall` room. It is not accepted as a repair because the Actor
family is only `2/3` positive and `1/3` negative.

Observed single-model capacity:

```text
Ollama /api/ps size_vram: 3,169,761,361 bytes (3.17 GB)
highest sampled llama-server RSS: 4,241,104 KiB (about 4.05 GiB)
concurrent local models: 1
```

This machine has 38 GB unified memory. The sample therefore does not claim
whole-application 8 GB support.

For the seven successful 4B pre requests, paired with an immediate 1.7B
rerun of the same holdout inputs:

```text
1.7B median: 2,635 ms
4B median:   9,317 ms
median delta: 6,885 ms
```

The legacy `40,437 ms` `narrative_visible` marker is known not to verify
rendered narrative DOM visibility. Applying the delta to it gives only the
diagnostic estimate `47,322 ms`. It is not a valid player-visible latency
result. More importantly, 17/24 pre requests timed out or failed Schema, so
the paid narrative would not begin on most tested pre cases.

Evidence:

- [human-readable experiment](./acceptance/phase2-4b-pre-post-holdout-experiment.md)
- [4B frozen holdout](./benchmarks/local-semantic-recall-4b-holdout.json)
- [same-input current 1.7B pre rerun](./benchmarks/local-semantic-recall-1p7b-current-holdout-pre.json)

Decision: do not replace production pre/post 1.7B with 4B. The remaining
individual NPC-departure issue requires a separately approved proposal that
does not make personal Presence settlement depend on the global
`eventBoundary.ended`/Memory trigger.

## 2026-08-18: Revision 14 NPC departure/Event boundary correction

The user clarified the business authority:

```text
Event = a long-interaction narrative breathing boundary.
An NPC leaving = an individual immediate Actor/Presence fact.
One does not imply the other.
```

Example: if a player continues drinking tea and Ron explicitly leaves, Ron
must settle as departed while the tea interaction remains open. The current
Event boundary can later close the tea exchange and permit its existing next
plot beat. Ron leaving alone must neither close the Event nor create the
existing `pendingEventBoundary` Memory/Social cadence.

The fixed PM completed initial discovery and a technical recheck with `PASS`.
The capability is explicitly partial:

```text
NPC departure decoupling from Event boundary
```

It does not redesign Event, Scene, Calendar, Map, Witness, EventKnowledge,
Memory, Social, Appraisal, Identity, Item, Spell or UI behavior.

Read-only production reconnaissance confirmed the exact current coupling:

```text
Actor/room/evidence/confidence/path guards pass
-> adapter also requires eventBoundary.ended
-> only then writes present=false
```

Separately, `transaction.eventEnded` alone creates
`memoryDirector.pendingEventBoundary`; that existing Event-to-Memory/Social
path remains unchanged by the revised business contract.

Revision 14 updates the PRD, Spec, task registry and checklist only. It
creates pending `HVG-P2-03R-DEPARTURE`; no production code, Prompt, Schema,
model call, State field, test, migration or save was changed.

## 2026-08-18: Revision 15 implementation authorized and started

The user accepted the 4B rejection and explicitly authorized:

```text
deterministic conversion of accepted textual duration
stealth/resistance as a future TODO only
NPC departure/Event decoupling
post-change qwen3:1.7b experiment report
```

Fixed-PM discovery passed Check and NPC/Event scope but blocked duration
implementation because the supported textual grammar is not defined. The
duration task remains blocked rather than deriving its product boundary from
the holdout.

`HVG-P2-03R-DEPARTURE` entered implementation. The production change:

```text
POST_TURN_SYSTEM:
  individual departure is not Event completion

Actor recovery/settlement:
  valid structured absence no longer requires eventBoundary.ended

unchanged:
  transaction.eventEnded
  memoryDirector.pendingEventBoundary
  Event/Memory/Social writers
  model calls, retry and fallback
```

Focused deterministic verification passed `44/44`. Real-save build-only
baseline before the Prompt edit was:

```text
pre System/prompt/transport: 5,235 / 9,214 / 11,017 chars
post System/prompt/transport: 6,295 / 10,758 / 14,927 chars
post estimated Prompt: 3,586 tokens of 4,096
archive SHA-256: 597e69e069d10e771b4197f54a9ceeffd8801ce8175ce5c927ff2868b2adff06
archive unchanged: true
```

The ordinary strict measurement remains red on pre-existing excluded Prompt
targets (Scene Transition and Social); a no-write assertion wrapper was used
only to emit the complete local metrics without changing source or save data.

## 2026-08-18: Revision 16 design completed; implementation approval pending

The user superseded immediate Event judgment:

```text
remove paid signals.eventEnded
remove post eventBoundary
every 10 committed turns:
  one asynchronous qwen3:1.7b over exactly that checkpoint's 10 turns
failure/not-ended:
  no Event write and no retry before next checkpoint
ended:
  existing pendingEventBoundary and downstream next-intent flow
```

The user also confirmed:

```text
NPC destination unknown -> locationKnown=false, no stale room
duration minimum unit -> minute
duration grammar -> zh/en integer words + Arabic integers
units -> minute/hour/day
compound exact values -> supported
maximum -> 10,080 minutes
seconds/decimal/fraction/vague/range -> rejected
```

Fixed PM initial discovery and production-informed recheck both pass after
these decisions. Revision 16 updates:

- PRD and technical Spec;
- `HVG-P2-03R-EVENT-BG/DURATION/DEPARTURE` task contracts;
- living runtime fields for `locationKnown`, the background task ledger and
  pending Event writer;
- `VCON-027` plus revised `VCON-007/012/013`.

No Revision 16 production implementation proceeds until the synchronized
artifacts receive explicit approval. Partial Revision 15 worktree edits remain
unaccepted and must be reconciled subtractively during implementation.

## 2026-08-18: Revision 17 movement review completed

The user identified that the Revision 16 packet did not prove player movement.
Read-only production tracing found:

```text
explicit room marker
-> deterministic applyPlayerMovement before pre 1B
-> current production works

follow-NPC marker without room
-> production passes no guidedDestination/guidedByActorId
-> current result is no_known_destination

guided unit test
-> injects those options manually
-> does not prove the production turn workflow

pre 1B output
-> temporal/check/progression/calendarCommitment only
-> no movementIntent
```

The user confirmed:

```text
eligible guide:
  current same-room/interaction or immediately-prior departed NPC
destination priority:
  explicit room > known Actor room > one room in recent public evidence
failure:
  commit 15-minute turn, keep position/lastMovement, state reason in current正文
```

The replacement fixed-PM full discovery and production-informed recheck both
returned `PASS` for the partial capability
`player movement intent and movement-failure handoff`.

Revision 17 adds:

- one narrow `movementIntent` section to the existing pre call;
- one committed `moved/already_there/failed` movement outcome;
- protected paid-Prompt handoff and deterministic failure-fact preservation;
- `HVG-P2-03R-MOVEMENT` plus PRD-derived acceptance;
- no additional 1B/4B/paid call and no retry/fallback.

The fresh full build-only attempt stopped before emitting scoped metrics
because the unrelated existing Scene Transition Prompt measured
`76,531 > 76,100`. The last verified baselines remain pre
`9,214/11,017` characters and Low `49,509/80,000`. A scoped, no-model
measurement is the first approved implementation action.

Revision 16 approval is stale. No Revision 17 production implementation
proceeds until the synchronized artifacts receive explicit approval.

### Revision 17 implementation approval

The user instructed the synchronized Revision 17 work to start. This is
explicit implementation approval for:

```text
HVG-P2-03R-MOVEMENT
HVG-P2-03R-DURATION
HVG-P2-03R-DEPARTURE
HVG-P2-03R-EVENT-BG
their combined acceptance
```

It does not authorize Social/Appraisal/Memory/Pacing/Story/Translation,
Spell lifecycle, Scene Transition Prompt remediation, additional model calls,
4B movement fallback or semantic Regex restoration. Movement is the sole
active task; scoped build-only measurement runs before production Prompt edits.

### Revision 17 scoped real-save baseline

`HOGWARTS_PROMPT_MEASURE_SCOPE=validator-revision-17` now stops after the
affected pre/Low builders and therefore does not normalize an excluded
Scene Transition failure. It performed zero model calls and left the
representative archive unchanged:

```text
archive sha256: 597e69e069d10e771b4197f54a9ceeffd8801ce8175ce5c927ff2868b2adff06
archive bytes: 3,852,365
pre System: 5,235 chars
pre User: 3,979 chars
pre message/transport: 9,214 / 11,017 chars
pre estimated Prompt: 3,072 / 4,096 tokens
Low System/User/total: 27,202 / 16,961 / 44,163 chars
Low runtime ceiling: 298,080 chars
```

Largest pre sections are existing `room=1,408`, `scene=1,370` and
`actors=857` characters. Revision 17 must reuse them rather than inject a
second room or Actor directory.

## 2026-08-18: Revision 17 movement, duration and departure implementation complete

The production implementation now has:

- deterministic exact-duration arithmetic for the approved minute/hour/day
  grammar, with unsupported forms returning the ordinary 15-minute policy;
- deterministic direct-room movement plus one existing pre-1.7B
  `movementIntent` route for the finite follow-tag DSL;
- supplied guide/room/evidence enums in the transport Schema, exact
  name/alias and room-label guards, and no 4B/retry/semantic prose fallback;
- one committed `MovementOutcomeV1` plus protected Low failure-fact handoff
  that preserves every paid segment;
- Actor Context version 2 with `locationKnown=false`, empty map/room,
  `present=false`, and spatial reconciliation that cannot restore a stale
  room;
- departure settlement independent from immediate Event status.

The Actor Context version bump exposed a real production regression:
`migrateActorPresentationState()` treated only version 1 as cut over and
therefore appended legacy visual fields to strict version-2 Actor records.
The migration now leaves every Actor Context version `>=1` unchanged. Focused
Actor, time, movement, turn validation, Scene Transition harness and Item
regressions pass after the fix.

The first movement model run failed rather than being reported as success:

```text
positive recall: 0/20
negative accuracy: 4/10
parse/Schema failures: 24/30
cause: qwen3:1.7b emitted confidence=100 and overfilled unrelated fields
```

Prompt decision order plus dynamic supplied-value transport enums removed all
parse failures. The final main-agent diagnostic holdout result is:

```text
positive follow recall: 19/20 = 95%
negative guarded accuracy: 10/10 = 100%
parse/transport failures: 0
p50 / p95: 2,947 / 3,292 ms
Prompt tokens: 2,051–2,230 (median 2,170)
output tokens: 145–206 (median 176)
model requests: exactly 30 for 30 cases; no retry, 4B or provider fallback
```

This proves that the longer 1.7B Prompt did not truncate the final structured
output. It is not the mandatory fresh context-free blind-agent acceptance.
Evidence:

- [failed first movement holdout](./benchmarks/local-semantic-recall-rev17-movement-holdout.json)
- [improved attempt 2](./benchmarks/local-semantic-recall-rev17-movement-holdout-attempt-2.json)
- [threshold-passing attempt 3](./benchmarks/local-semantic-recall-rev17-movement-holdout-attempt-3.json)

`HVG-P2-03R-MOVEMENT`, `HVG-P2-03R-DURATION` and
`HVG-P2-03R-DEPARTURE` are complete. The sole active implementation task is
now `HVG-P2-03R-EVENT-BG`. Disposable real-turn, blind-agent, full pre/post
holdout and independent acceptance remain pending.

## 2026-08-18: background Event implementation and real-model preflight

Immediate Event authority was removed subtractively:

```text
paid signals.eventEnded: removed
post eventBoundary: removed
turn workflow overwrite: removed
turn reducer immediate pending-boundary writer: removed
historical saved eventEnded: read-only
```

The replacement path is:

```text
turn count not divisible by 10 -> zero Event work
turns 10/20/30/... -> fire-and-forget local_event_boundary_observer
exactly ten committed turn transactions
-> one qwen3:1.7b request
-> deterministic evidence/stale/task-ledger guard
-> ended only: existing pendingEventBoundary
```

`hogwarts-mud-background-event-boundary.test.mjs` passes six focused
workflows: exact window/request, off-checkpoint zero work, ended settlement,
not-ended/failure next-checkpoint behavior, pre-request projection failure
locking the checkpoint, and stale-result rejection. No Event result moves an
Actor, writes EventKnowledge, closes a Scene or completes Calendar.

Representative-save build-only evidence:

```text
archive sha256: 597e69e069d10e771b4197f54a9ceeffd8801ce8175ce5c927ff2868b2adff06
archive unchanged: true
valid representative window: turns 81-90
System/User/Schema: 1,145 / 7,235 / 6,128 chars
complete request: 14,508 chars
turn rows: exactly 10
closing narration: each <=500 chars
```

The historical turns 91-100 window is intentionally rejected before a model
request because turn 100 contains only localized `rawText` and no authoritative
English `textEn`. The projection failure is now recorded once in the world task
ledger and cannot retry the same checkpoint. New code does not replay old
checkpoints; the next eligible live checkpoint is a fresh ten-turn window.

Real `qwen3:1.7b` one-shot evidence:

```text
representative turns 81-90: not-ended, 2,028 Prompt + 34 output tokens, 3.805 s
continuing synthetic window: not-ended, 1,023 + 34 tokens, 1.120 s
explicitly concluded window: ended at turn 10 with exact evidence,
                             1,018 + 50 tokens, 0.780 s
retry/fallback: 0
```

The longer requests do not interfere with final output under the real 4,096
context. Scoped pre/post/Low measurement also passes after adding the
production Actor Context V1-to-V2 cutover to the in-memory measurement path:

```text
pre ordinary/follow Prompt: 12,460 / 13,690 chars
pre real movement holdout Prompt tokens: max 2,230
post Prompt after Event removal: 10,269 chars, estimated 3,423/4,096
Low Prompt: 44,368 chars under its 298,080-char runtime ceiling
```

The Actor V2 change exposed and fixed a production load defect: an already
cut-over V1 save previously failed as a partial state. The atomic upgrade now
adds `locationKnown`, preserves Core/Memory records and forces unknown
locations to empty map/room plus `present=false`.

Fresh context-free blind Event simulation and independent acceptance remain
pending, so `HVG-P2-03R-EVENT-BG` stays `in_progress`.

## 2026-08-18: blind model gate passed and architecture ratchets restored

Three fresh agents with no forked context each received one exact final
production request and no PRD, expected answer or validation feedback. Their
untouched responses passed:

- pre transport Schema, movement/ID/evidence guard, temporal settlement and
  route guards;
- post transport Schema, English adoption, perception and Actor evidence
  checks, with no retired Event field;
- background Event transport Schema, server and browser evidence guards and
  the sole Event-boundary reducer.

The Event response wrote only the existing pending boundary; Actor Runtime and
local Presence remained byte-equivalent. Evidence:
[Revision 17 blind model report](./acceptance/phase2-revision17-blind-model-report.md).

No response was retried or repaired. Temporary raw responses were deleted
after verification.

The implementation initially violated existing file-size and facade ratchets.
The fix was structural rather than a threshold increase:

```text
local-semantic adapter: 2,202 -> 1,861 lines
server local-semantic adjudicator: 3,177 -> 2,580 lines
movement: 2,065 -> 1,751 lines
Actor Context cutover: 2,052 -> 1,998 lines
index composition root: 621 -> 610 lines
helpers facade: 337 -> 333 exports
```

Focused modules now own dynamic HTTP observation, movement outcome, pre
movement Schema/guards, the pre System Prompt and Actor V1-to-V2 migration.
Architecture, no-cycle, no-side-effect, helper digest and size gates pass.

The complete Hogwarts `*.test.mjs` run reached:

```text
775 / 779 passed
Revision 17 related failures: 0
```

The four remaining failures predate and are outside Revision 17:

1. Canon localization alias registry expectation;
2. excluded Scene Transition Prompt target `76,531 > 76,100`;
3. excluded Memory medium-projection locked Event;
4. existing failed-turn `live_scene_stream` marker expectation.

They were not normalized or repaired under this PRD. `HVG-P2-03R-EVENT-BG`
is complete; `HVG-P2-03R-ACCEPT` is active pending the fresh independent
acceptance result, disposable real-turn workflows, final State/Knowledge
matrices and physical 8 GB gate.

## 2026-08-18: Revision 18 removes pre 1B progression

The user rejected the pre-turn `progression` classifier because it writes no
State and duplicates the paid narrative model's reading of the full player
action. The replacement fixed PM reviewed the narrowed change and returned
`PASS`.

Approved behavior:

```text
remove pre result.progression
remove its Schema, Prompt, guard, fallback and workflow handoff
remove momentumDirective.explicitProgressionRequest
remove sceneProgression.completedRequestedStep self-reporting
add one short paid System Prompt rule
retain sceneProgression.type + summaryEn as narrative outcome summary
retain asynchronous 10-turn Event unchanged
```

The one paid rule is:

```text
When the player explicitly requests an immediate concrete step, complete it
in this response when legal; do not stop at preparation.
```

Implementation task `HVG-P2-03R-PROGRESSION-REMOVE` adds no call, retry, 4B
route, Regex fallback or State writer.

Implementation completed with:

```text
focused Revision 18 tests: 40/40 + 1/1
movement/time/Event/call-budget regression: 52/52
pre progression fields in production: 0
paid explicitProgressionRequest/completedRequestedStep fields: 0
approved paid System Prompt rule occurrences: 1
active pre benchmark cases: 36 + 30 movement holdout
```

Scoped representative-save measurement after subtraction:

```text
pre System: 7,615 chars
pre transport Schema: 1,869 chars
pre ordinary/follow message: 11,649 / 12,879 chars
paid scene-performance message: 43,865 chars
```

The real `qwen3:1.7b` Revision 18 holdout completed all 48 selected requests
without a parse or transport failure:

```text
actual pre Prompt tokens: 1,836-2,075
actual output tokens: 125-234
movement positive: 19/20
movement negative: 10/10
Calendar positive: 1/3
time positive: 2/3
Check positive: 0/3 (no hard recall gate)
all Calendar/time/Check negatives: 9/9
```

This proves that removing progression does not interfere with complete final
output and preserves the movement threshold. It does not pass the total
State-recall gate: Calendar and one exact-duration semantic classification
remain active failures.

## 2026-08-18: Revision 18 final pre follow-up remains blocked

The final pre follow-up stayed within the approved contract:

```text
progression remains absent
one pre request
zero retry
zero 4B/Regex fallback
same State writers
```

Implemented corrections:

- output decision order now places hard Calendar/time families before Check;
- ordinary requests omit the complete unresolved-follow rule block;
- follow requests retain the complete supplied-ID/evidence movement block;
- no-check contradictory fields still normalize to neutral no-write;
- English hyphenated integers no longer collide with deterministic range
  rejection;
- quoted third-party promises and future planned durations receive explicit
  no-route rules.

Final seen 66-case production matrix:

```text
Calendar positive/negative: 6/6, 6/6
time positive/negative:     6/6, 6/6
movement positive/negative: 19/20, 10/10
Check positive/negative:    0/6, 6/6
parse/transport failures:   0
```

Check positive recall has no hard gate under the user's approved decision;
no proposal remains no-write and does not invoke 4B or Regex fallback.

Fresh-context acceptance attempt 1 ended at:

```text
Calendar positive/negative: 4/4, 3/4
time positive/negative:     3/4, 4/4
```

Its quoted-speaker and Chinese-duration failures were corrected.

Fresh-context acceptance attempt 2 ended at:

```text
Calendar positive/negative: 0/4, 4/4
time positive/negative:     4/4, 3/4
```

The future-plan duration failure was corrected. Date/time-prefixed Chinese
commitments still fail:

```text
九月十日傍晚，我一定到温室门口和你交换草药笔记。
本月十四号午饭后，我会参加奖杯陈列室的校史讲解。
```

Short subject-first Chinese commitments pass, but the valid prefixed form
cannot be excluded from product scope. `HVG-P2-03R-PRE` therefore remains
`blocked`; `HVG-P2-03R-ACCEPT` remains `in_progress`.

Final representative-save build-only evidence:

```text
ordinary System/User/message: 6,345 / 4,034 / 10,379 chars
follow System/User/message:   9,236 / 5,264 / 14,500 chars
transport Schema:             1,869 chars
real Prompt tokens:           1,707-2,513
real output tokens:           133-261
ordinary family p95:          2.84-3.05 s
movement p95:                 3.68 s
archive unchanged:            true
```

Focused deterministic regression passes `48/48`; affected lint has zero
errors. The complete human-readable result is
[phase2-revision18-final-pre-report.md](./acceptance/phase2-revision18-final-pre-report.md).

## 2026-08-18: Revision 19 defers Calendar and starts post

The user explicitly changed the active acceptance boundary:

```text
Calendar optimization -> PRD TODO
current pre candidate -> production
post round -> begin
```

Replacement fixed-PM discovery and production-informed follow-up both
returned `PASS`. The post production trace found and classified the complete
live contract:

```text
materialEvents -> existing Material guards/reducer/materialEventLog
inventoryObservationRequired -> existing optional shared VCON-014 route
actorUpdates -> existing Actor/Presence guards and settlement
perception -> existing participant/witness/ACL settlement
temporalClaims -> transient narrative-time guard input
immediate Event -> absent
```

Calendar deferral is not a pass claim. Date/time-prefixed Chinese commitments
may still be missed; failure writes no Calendar State and triggers no Regex,
4B, retry or fallback. Stable future task:
`HVG-P2-03R-CALENDAR-TODO`.

Pre status:

```text
HVG-P2-03R-PRE: completed
progression remains removed
exact duration arithmetic: accepted
movement positive/negative: 19/20, 10/10
Check miss: no-write, no escalation
```

Post active baseline:

```text
Inventory route positive/negative: 0/5, 5/5
Actor update positive/negative:    2/3, 0/3
Temporal claim positive/negative:  0/1, 1/1
parse/transport failures:          0
```

The Actor negative failures are State-safety failures: a named no-change
sentence can pass evidence grounding and overwrite `currentActivityEn`.
Revision 19 therefore requires no-change precision as a first-class gate,
not merely positive recall.

Artifacts advanced to
`19-calendar-todo-pre-production-post-round`. `VCON-013` now records the live
Material path and Item-route delegation instead of hiding those adjacent
authorities. `HVG-P2-03R-POST` is the sole `in_progress` implementation task.

## 2026-08-18: Revision 19 post round started; candidate not promoted

The active post matrix was expanded with six positive and six negative
Material cases because production persists `materialEvents` into
`materialEventLog[]`. Expected answers remain outside exact model requests.

Production-shape development baseline:

```text
Item route positive/negative: 0/5, 4/5
Actor positive/negative:      0/3, 3/3
Material positive/negative:   0/3, 3/3
Temporal positive/negative:   0/1, 1/1
parse/transport failures:     0
p50/p95:                      3.44 / 3.86 s
```

Prompt/order candidates oscillated between all-positive and all-empty:

```text
candidate 1:
  Item 5/5 positive, 0/5 negative
  Actor 0/3 positive, 3/3 negative
  Material 0/3 positive, 1/3 negative

candidate 2:
  every positive family 0
  negatives mostly 100%
```

Narrowing model-authored composite fields improved one development candidate:

```text
Actor positive/negative:    2/3, 3/3
Material positive/negative: 2/3, 2/3
Temporal positive/negative: 1/1, 1/1
Item positive/negative:     0/5, 5/5
```

Focused mandatory assessment prototypes proved that one qwen3:1.7b can handle
individual domains:

```text
Item route: 2/2
Actor:      6/6 after explicit no-write labels
Material:   5/6
Temporal:   4/4 after deterministic shape normalization
```

The combined one-request assessment failed because Item/Material/temporal
labels contaminated each other and injury/quoted evidence produced semantic
false positives. Deterministic code cannot legally repair those distinctions;
they are prose meaning. `think=true` was also rejected: it took 9-30 seconds
per focused request and still produced invalid temporal/Actor proposals.

All failed post Prompt/Schema candidates were removed from the production
request builder. Current safe post semantics and one-call budget remain.
Only behavior-neutral module ownership, the Material recall matrix and
human-readable evidence remain. Focused production regression passes `64/64`.

`HVG-P2-03R-POST` remains `in_progress`, blocked from promotion by HTD-014.
The complete readable result is
[phase2-revision19-post-round-report.md](./acceptance/phase2-revision19-post-round-report.md).

## 2026-08-18: Revision 20 PRD-first candidate wake research

The user approved the product direction:

```text
structured candidate wake-up
-> one dynamically composed post Schema
-> one qwen3:1.7b semantic request
-> existing guards/Reducers
```

The user repeated three hard gates:

1. Regex never directly understands semantics.
2. PRD and exploration branches come before experiments.
3. Seen matrices cannot count as evidence.

A replacement fixed PM completed full discovery plus production-informed
follow-up and returned `PASS/PASS`. Complete post coverage remains Material,
Inventory route, Actor, perception and temporal; immediate Event and excluded
domains remain absent.

Candidate sources are classified as recall-only:

```text
stable IDs
folded paid structured proposals
Item directives
segment role/type
finite temporal shapes
exact Actor/Item/room name or alias
existing map/room IDs
```

None may decide truth, enactment, quotation/hypothesis/negation, injury,
Item/Material change, Actor activity/departure or temporal assertion. The post
1B remains semantic owner. Candidate miss is a measured failure, not false.

Revision 20 artifacts define four experiment branches:

```text
A structured proposals/directives first
B exact/finite recall first
C bounded Material+perception core, other domains dynamic
D paid transient postCandidateKinds (research only)
```

Data isolation is mandatory:

```text
fresh exploration corpus -> development only after reveal
freeze candidate request/hash
second fresh context -> generate and directly execute blind corpus
old matrices -> non-scoring regression diagnostics only
```

Current production stays on the Revision 19 safe post contract. No candidate
experiment, endpoint change, save write or model call has been authorized
before the current artifact review.

## 2026-08-18: Revision 20 fresh development rejected all branches

Revision 20 artifacts were explicitly approved. A fresh Agent with no access
to repository cases, benchmarks, PRDs, conversation or known failures
generated 48 cases:

```text
Material / Inventory / Actor / temporal / perception / mixed: 8 each
player action en / zh / mixed: 18 / 18 / 12
paid narrative and all authority names: English-only
old matrices used for scoring: 0
```

The first generated corpus was rejected before scoring because it violated the
production English `textEn` contract. It was not patched into a usable set.
A second fresh Agent generated the accepted development corpus.

Candidate-only results:

```text
A/B:
  Inventory 13/13, Actor 14/14, temporal 13/13 candidate recall
  Material 0/13 candidate recall
  all non-Material candidate negatives 100%

C:
  Material 13/13 recall by making it always-on
  Material candidate-negative accuracy 0/35

D:
  current paid contract has no postCandidateKinds
  Material 0/13 and temporal 0/13 without oracle
```

A and B each ran 48 one-shot qwen3:1.7b requests:

```text
parse/transport failures: 0
prompt tokens: 312-985
A p50/p95: 3.49 / 5.32 s
B p50/p95: 3.40 / 5.28 s
mixed complete pass: 0/8

guarded positives:
  Material 0/7
  Inventory 2/6
  Actor 3/7
  perception 0/44
  temporal 0/7
```

Source-priority ordering did not change semantic results.

C ran 48 one-shot requests:

```text
parse/transport failures: 26
prompt tokens among parsed cases: 437-1109
output tokens among parsed cases: 321-670
p50/p95: 7.07 / 8.86 s
mixed complete pass: 0/8
```

Material always-on restored cross-domain interference and invalid JSON.

The decisive product finding is not a Regex failure: untracked new Material
objects often have no stable Item ID, directive, paid proposal, Actor/room
identity or temporal shape. No approved non-semantic source can distinguish a
real Material change from quotation, hypothesis, recollection or explicit
no-change. Adding verb/negation/quote Regex would violate the user hard rule.

No candidate passed development, so the final request/hash was not frozen and
no blind corpus was generated. This prevents blind cases from becoming a new
tuning set.

Production writes: `0`. No endpoint, runtime post contract, save, chat,
Knowledge, TranslationTable or archive was changed by the experiment.

Human-readable report:
[phase2-revision20-candidate-wake-report.md](./acceptance/phase2-revision20-candidate-wake-report.md).

Revision 20 result: `REJECT/BLOCKED`. Production remains on the Revision 19
safe post contract.

## 2026-08-18: Revision 20 independent research review passed

A fresh read-only reviewer ran no model request and made no edits. It
independently recomputed branch records and returned `PASS` for the research
deliverable:

```text
PRD-first chronology: pass
fresh corpus isolation/English authority: pass
semantic Regex absence: pass
candidate miss scoring: pass
one-call/no-retry contract: pass
report/raw JSON reconciliation: pass
D no-oracle boundary: pass
blind stop gate: pass
productionWrites=0 / no runtime import: pass
human-readable family-first reporting: pass
```

The pass means the research was honest and complete. The candidate remains
rejected for production.

## 2026-08-18: external post semantic architecture research

The user stopped further Regex + generative 1B Prompt tuning and requested
external research into analogous systems.

The research scope remained the existing partial capability:

```text
Material
Inventory route
Actor / Presence
perception
temporal claims
```

Revision 19 production, immediate Event exclusion, Calendar TODO, paid
narrative retention, existing guards/Reducers, Actor limit `16`, post
one-attempt policy and dynamic `0/1` remained unchanged.

Primary-source research covered:

```text
TripPy / TripPy-R / SPLAT
DIET
OneIE
GLiNER2
When2Call / OOS hard negatives
When2Tool hidden-state probing
UIE / ChunkUIE
OrchestraLLM / RouteLLM / FrugalGPT
constrained decoding / TinyBERT
```

The convergent external pattern is:

```text
shared compact encoder
-> explicit no-update / operation heads
-> evidence span or supplied-ID copy
-> domain-specific arguments
-> global deterministic constraints
-> existing owning Reducers
```

This differs from the rejected Revision 20 design because candidate wake-up is
learned semantic classification rather than deterministic structured recall,
and because field families use separate discriminative/extractive heads
instead of one autoregressive compound JSON decoder.

The report preserves all failed-family evidence, including Revision 20
perception positive `0/44`, negative `0/4`, and mixed complete `0/8`.
It classifies GLiNER2 as a 205M prototype base only: public zero-shot intent,
NER and CPU latency results do not prove Hogwarts hierarchical extraction,
`>=95%` family quality or physical 8GB operation.

The recommended next research family is a compact encoder with per-family
no-update/operation/span/ID heads. A qwen3 hidden-state probe is only a
secondary feasibility branch because the current Ollama boundary has not
proven hidden-state access without duplicate inference. Constrained JSON,
ordinary routing and cascades do not solve the current semantic problem;
cascades additionally violate the one-attempt policy.

The fixed-PM initial business scope passed. Its production-informed review
blocked any new PRD/Spec or implementation until:

1. every existing five-family field/workflow is explicitly mapped;
2. Material plus Inventory dual output and all inherited acceptance thresholds
   remain explicit;
3. `VCON-013` field/writer refs and the `local_post_core_1_7b` semantic-owner
   description align with the living contract;
4. the separate `VCON-018` and `VCON-027` JSON/Markdown status conflicts are
   resolved by their owners.

The human-readable report addresses items 1 and 2 and records items 3 and 4
as preconditions rather than changing them outside scope. Therefore the
external research deliverable is complete, while architecture approval and
production work remain blocked.

No local Hogwarts model experiment ran. Production/save writes: `0`.

Report:
[phase2-post-external-architecture-research.md](./acceptance/phase2-post-external-architecture-research.md).

## 2026-08-18: external research independent review passed on attempt 2

The first fresh read-only reviewer returned `FAIL` because the initial report:

1. put benchmark/architecture evidence before player and State outcomes;
2. omitted serial/one-resident-model from inherited acceptance;
3. disclosed `VCON-013/027` but not the
   `local_post_core_1_7b` and `VCON-018` registry conflicts.

The report and evidence links were corrected without changing either
registry's disputed values.

A second fresh read-only reviewer reran the complete goal-derived scope and
returned `PASS`. It confirmed:

- primary-source claims and limitations are bounded;
- all five families, perception failures, mixed, no-change and Material+Item
  dual output are explicit;
- production calls, residency, State authority and failure behavior remain;
- external research is complete but no architecture/production/8GB claim is
  approved.

Independent evidence:
[phase2-post-external-architecture-independent-review.md](./acceptance/phase2-post-external-architecture-independent-review.md).

## 2026-08-18: Revision 21 off-the-shelf GLiNER2 comparison drafted

The user explicitly selected:

```text
fastino/gliner2-base-v1
no fine-tuning
compare first
accept when strictly better than current
do not require per-family >=95%
```

The fixed PM classified this as the partial capability
`Immediate Turn existing post five-family semantic-proposal comparison
experiment`. Its business gate passed with a strict Pareto definition:

- no family positive may decline;
- no family negative/no-change safety may decline;
- no family may add accepted false writes;
- at least one current failed family must improve strictly;
- mixed completeness must improve strictly;
- unsupported/missing output is failure;
- aggregate, parse, latency or memory cannot compensate a family regression.

`trial` means only eligibility for a later user-approved production-trial
revision. It does not authorize current cutover or player exposure.

Read-only reconnaissance found:

- current host: macOS arm64, Python `3.9.6`, `uv` available;
- no installed `gliner2`, PyTorch or Transformers;
- official GLiNER2 `1.3.2` local inference requires `gliner2[local]`;
- the official combined-schema surface supports classification, structures,
  relations, confidence and source spans;
- support does not prove any Hogwarts family or allow defaulting missing
  fields;
- the current post contract and direct guard exports can support detached
  would-accept scoring without Reducer commit.

The first production-informed PM review correctly blocked artifact drafting on
registry inconsistencies. Governance-only reconciliation then:

1. expanded `VCON-013.stateFieldRefs` to actual Actor/Presence/EventKnowledge
   and Material writer families and removed read-only `cohorts[]`;
2. aligned the JSON `local_post_core_1_7b` owner with the Markdown five-family
   responsibility;
3. restored historical `VCON-018` to `planned_unapproved`;
4. aligned `VCON-027` to `implemented_acceptance_pending`;
5. registered `VCON-028` as no-runtime-task, no-writer, no-State
   `post_gliner2_zero_shot_research`.

The registry now has 28 unique contracts and 14/14 semantic owners. A final
replacement fixed PM redid complete discovery from the corrected authority
and returned:

```text
Gate A: PASS
Gate B: PASS
```

Revision 21 PRD/Spec/tasks/checklist are now decision-complete but await
explicit artifact approval. Before that approval:

```text
dependencies installed: 0
models downloaded: 0
fresh cases generated: 0
model requests: 0
production/save writes: 0
```

## 2026-08-18: Revision 21 artifacts approved

The user explicitly replied:

```text
批准 Revision 21，开始对比实验。
```

This authorizes the research environment, frozen benchmark artifacts, fresh
corpus and same-corpus comparison defined by artifact revision
`21-gliner2-zero-shot-comparison`. It does not authorize production trial or
State integration.

Active task: `HVG-P2-03R-POST-GLINER2-ENV`.

## 2026-08-18: Revision 21 isolated GLiNER2 environment passed

The temporary environment installed `gliner2[local]==1.3.2` without changing
Node dependencies.

Python 3.9 failed at import because GLiNER2 1.3.2 uses Python 3.10+ union
syntax despite declaring Python `>=3.8`. The same approved package/model was
then installed under isolated Python 3.11.14.

Model evidence:

```text
model: fastino/gliner2-base-v1
snapshot: 8437ba583a733d87f56ae902f3b197934eedd58e
model bytes: 833,938,108
model SHA-256:
845fc4bd93c525b86124c58ab4f56c9eacf8587953086b14c501fab25957c007
encoder: microsoft/deberta-v3-base
```

Observed local process:

```text
cold load including HF 429 wait: 167.13 s model / 212.48 s process
cold maximum RSS: 2.48 GB
offline warm load: 3.76 s
neutral smoke inference: 78.61 ms
warm maximum RSS: 2.10 GB
offline network messages: 0
```

No Hogwarts case was used. Model forwards on scoring data remain `0`.
Production/save writes remain `0`.

Evidence:
[phase2-revision21-gliner2-environment.md](./acceptance/phase2-revision21-gliner2-environment.md).

Completed task: `HVG-P2-03R-POST-GLINER2-ENV`.
Active task: `HVG-P2-03R-POST-GLINER2-FREEZE`.

## 2026-08-18: Revision 21 request and scorer frozen

Before any fresh scoring case was generated, the following artifacts were
implemented and passed the focused model-free contract test:

```text
combined GLiNER2 schema
raw one-forward Python inference runner
marker-free canonical source projection
detached exact-span/ID adapter
Material/Actor/perception/temporal guard scorer
per-family and Pareto scorer
fresh-corpus validator
VCON-028 no-write/call-budget test
```

Focused result: `7/7`.

The pre-corpus neutral smoke used no Hogwarts case and exposed that visible
`NARRATIVE_SEGMENT` markers were selected as evidence. The canonical input was
therefore changed to marker-free source text with code-side offset ranges.
After a single general span-threshold calibration, the model still did not
reliably extract evidence on the neutral smoke. This limitation is frozen and
must count as failure on the fresh corpus; no deterministic evidence synthesis
is permitted.

Freeze manifest:
[rev21-gliner2-freeze-manifest.json](./benchmarks/rev21-gliner2-freeze-manifest.json).

Completed task: `HVG-P2-03R-POST-GLINER2-FREEZE`.
Active task: `HVG-P2-03R-POST-GLINER2-CORPUS`.

## 2026-08-18: Revision 21 fresh corpus frozen

The first fresh corpus was rejected before any model run because its four
mixed cases had positive-family counts `3/4/5/3`, not the required
two/three/five matrix. It was deleted whole and never scored or patched.

A replacement fresh context with no repository/prior-case access generated a
new 64-case corpus. Main-context first reveal passed:

```text
cases: 64
language en / zh / mixed: 22 / 21 / 21
Material: 15 positive + 5 negative
Inventory route: 6 positive + 6 negative
Actor: 6 positive + 6 negative
temporal: 6 positive + 6 negative
perception: 2 positive + 2 all-none
mixed positive-family counts: 2 / 3 / 5 / 3
all 15 Material event types: covered
Material+Inventory dual result: covered
Actor cap: passed
English narrative authority: passed
expected source spans/IDs: passed
```

The fourth mixed case is the separate Material+Inventory dual-result case and
is allowed to have three positive families.

Corpus SHA-256:

```text
e1277e8db9023250c3ad305b11c4db554e5027e3ec2d89d5a333a9b63bd4226f
```

No corpus, Schema, mapping, threshold or scorer edits are allowed after this
point.

Completed task: `HVG-P2-03R-POST-GLINER2-CORPUS`.
Active task: `HVG-P2-03R-POST-GLINER2-COMPARE`.

## 2026-08-18: Revision 21 comparison rejected

The frozen current baseline ran first, followed by the frozen offline GLiNER2
branch. Both branches used all 64 same fresh cases exactly once.

Current qwen3:1.7b:

```text
errors: 2/64
p50/p95: 3,278 / 4,323 ms
mixed complete: 0/4
Material positive: 0/18
Inventory positive: 7/8
Actor positive: 0/9
perception positive: 0/22
temporal positive: 1/7
```

Off-the-shelf GLiNER2:

```text
errors: 0/64
p50/p95: 516.58 / 555.65 ms
peak RSS: 2,468,233,216 bytes
mixed complete: 0/4
Material positive: 0/18
Inventory positive: 6/8
Actor positive: 0/9
perception positive: 0/22
temporal positive: 0/7
```

GLiNER2 was about 6.3x faster at p50 and 7.8x faster at p95. It nevertheless
failed the user-approved quality gate:

```text
strict positive-family improvements: none
mixed improvement: false
Material false writes: 0 -> 2
Inventory false writes: 5 -> 39
Inventory negative safe: 49/56 -> 17/56
temporal positive: 1/7 -> 0/7
```

The dominant failure was inability to produce grounded evidence fields:

```text
Material candidate rejects: 61
Actor candidate rejects: 61
temporal candidate rejects: 62
Inventory missing/invalid evidence: 34
perception unsupported: 41
```

No schema, threshold, adapter, scorer or corpus edit occurred after reveal.

Call/write proof:

```text
baseline model calls: 64
GLiNER2 forwards: 64
dynamic 4B calls: 0
retry/repair/fallback: 0
production/save writes: 0
```

The temporary Python environment, uv cache and HF model cache were deleted
after evidence capture.

Result:

```text
eligible_for_trial_review: false
decision: REJECT
```

Report:
[phase2-revision21-gliner2-zero-shot-report.md](./acceptance/phase2-revision21-gliner2-zero-shot-report.md).

Completed task: `HVG-P2-03R-POST-GLINER2-COMPARE`.
Active task: `HVG-P2-03R-POST-GLINER2-REPORT`.

## 2026-08-18: Revision 21 independent acceptance attempt 1 failed

The fresh read-only reviewer agreed that off-the-shelf GLiNER2 was not
eligible for trial, but rejected the exact research deliverable:

1. rejected Material/Actor/temporal candidates did not mark the family
   unsupported, so some invalid outputs counted as safe negatives;
2. baseline records did not retain untouched raw model output;
3. `VCON-028` pointed to a nonexistent benchmark file;
4. matching hashes and mtimes were not an immutable pre-corpus freeze because
   all artifacts were untracked.

The first corpus and branch evidence remain historical failed evidence. They
will not be rescored after changing the scorer.

Approved-scope response:

```text
correct scorer and raw capture
update VCON-028 paths
run focused tests
commit only freeze artifacts locally
generate a new fresh corpus
run each branch once on the new corpus
use a different fresh acceptance reviewer
```

No product scope, model, training policy or promotion threshold changed.
Active task returned to `HVG-P2-03R-POST-GLINER2-COMPARE`.

## 2026-08-18: Revision 21 attempt 2 freeze committed

Attempt 2 corrections:

- invalid emitted Material/Actor/temporal candidates mark their family
  unsupported and fail both positive and negative scoring;
- baseline records retain raw, adopted and guarded results;
- `VCON-028` references the actual Schema, Python inference runner and Node
  adapter/scorer;
- focused test expanded to `8/8`.

The same package/model identity was restored:

```text
fastino/gliner2-base-v1
snapshot 8437ba583a733d87f56ae902f3b197934eedd58e
model SHA-256 845fc4bd93c525b86124c58ab4f56c9eacf8587953086b14c501fab25957c007
```

Before the attempt 2 corpus existed, exactly six freeze artifacts were
committed locally:

```text
commit: 34220cfd5
schema
Python inference runner
corrected Node comparison runner
environment lock
attempt 2 freeze manifest
focused research test
```

The commit excludes corpus, results, reports, production code and unrelated
worktree changes.

## 2026-08-18: Revision 21 attempt 2 comparison rejected

The attempt 2 corpus was generated after freeze commit `34220cfd5` and passed
all reveal gates:

```text
64 cases
language 22 / 21 / 21
mixed positive families 2 / 3 / 5 plus dual-result case
all 15 Material kinds
exact spans, supplied IDs and Actor cap passed
```

The corrected comparison result:

```text
                         baseline   GLiNER2
Material positive        0/18       0/18
Inventory positive       7/8        4/8
Actor positive           3/8        0/8
perception positive      0/6        0/6
temporal positive        0/8        0/8
mixed complete           0/4        0/4

Material negative-safe   42/46      1/46
Inventory negative-safe  46/56      16/56
Actor negative-safe      56/56      4/56
temporal negative-safe   54/56      1/56
Inventory false writes   8          40
```

No positive family improved and mixed did not improve. Pareto eligibility is
`false`.

GLiNER2 remained faster:

```text
p50: 3993 -> 516.91 ms
p95: 5808 -> 594.94 ms
peak GLiNER2 process RSS: 2,172,583,936 bytes
```

Call/write evidence:

```text
baseline calls: 64
baseline raw/adopted/guarded records: 62/62/62
baseline errors: 2
GLiNER2 forwards: 64
dynamic 4B/retry/production writes: 0/0/0
post-freeze request/scorer diff: 0
```

The attempt 2 temporary environment, caches and uv-managed Python were
removed.

Report:
[phase2-revision21-gliner2-zero-shot-report-attempt-2.md](./acceptance/phase2-revision21-gliner2-zero-shot-report-attempt-2.md).

Attempt 2 awaits a different fresh independent acceptance reviewer.

## 2026-08-18: Revision 21 recalculation stopped by user

Attempt 2 independent acceptance also returned `FAIL`. It confirmed the
no-trial conclusion but found that candidates rejected by the later
production-equivalent guard could still count as negative-safe.

This affects exact negative-safe metrics, not the robust result:

```text
GLiNER2 positive family improvement: none
GLiNER2 mixed improvement: none
Inventory positive: lower than baseline
Actor positive: lower than baseline
trial eligibility: false
```

The user then explicitly instructed:

```text
行了不要重算了，把报告给我
```

Attempt 3 was stopped before freeze commit, corpus generation or model
scoring. Its temporary environment, caches, model and uv-managed Python were
removed, and the attempt 2 committed freeze artifacts were restored.

Revision 21 is closed as:

```text
zero-shot GLiNER2: rejected
production trial: not authorized
exact negative-safe metrics: not accepted
further recalculation: waived by explicit user decision
production/save writes: 0
```

Final human-readable report:
[phase2-revision21-gliner2-zero-shot-final-report.md](./acceptance/phase2-revision21-gliner2-zero-shot-final-report.md).

## 2026-08-18: Revision 22 temporal-only GLiNER2 quick diagnostic approved

The user asked whether serially narrowing GLiNER2 to only `temporalClaims`
could avoid the prior combined-schema interference, and specifically asked
for raw model input and extraction output rather than a large report.

Fixed PM initial and production-informed review both passed the narrow
capability:

```text
temporalClaims-only GLiNER2 zero-shot schema-ablation diagnostic
```

It compares the same checkpoint and same canonical source text:

```text
full combined GLiNER2 Schema
vs
temporalClaims-only GLiNER2 Schema
```

No production task, State field, clock, Calendar, reducer, trial, model
budget or five-family acceptance claim changes. The short report will show
every raw schema/input/output plus detached temporal guard result.

Active task: `HVG-P2-03R-POST-GLINER2-TEMPORAL-DIAG`.

## 2026-08-18: Revision 22 runner freeze

The frozen runner now loads `fastino/gliner2-base-v1` once in one isolated
Python process, then executes the two branches in this order:

```text
combined -> temporal-only
```

Each branch still makes exactly one forward per fresh case. The report records
the frozen descriptors, canonical model-visible text, untouched raw extraction,
detached guard result, latency, and the single model initialization. Focused
static verification passed:

```text
tests/hogwarts-mud-gliner2-temporal-schema-ablation.test.mjs: 3/3
```

Fresh corpus generation is now allowed. No model forward or production write
has occurred.

## 2026-08-19: Revision 22 temporal-only GLiNER2 result

The frozen research artifacts were committed before model execution:

```text
598ef0b3140014f22f4f972a8b475cc242afbd34
```

The same `fastino/gliner2-base-v1` checkpoint at
`8437ba583a733d87f56ae902f3b197934eedd58e` loaded once. It ran ten combined
forwards followed by ten temporal-only forwards in the same process:

```text
model initializations: 1
branch order: combined -> temporal-only
forwards: 10 + 10
retry / dynamic 4B / production writes: 0 / 0 / 0
network after model availability: 0
```

The quick answer is:

```text
raw semantic result: no improvement
combined exact passes: 0/10
temporal-only exact passes: 0/10
case comparison: improved 0, same 10, worse 0, indeterminate 0
```

The five explicit temporal positives did not yield a complete correct,
narrative-grounded structured claim. All five quotation/recollection/
discussion/vague/hypothetical negatives emitted at least one raw temporal
claim. Narrowing the Schema made the observed second-branch p50 lower
(`618.644 ms -> 99.385 ms`), but this ordered one-process run is not a
standalone latency acceptance benchmark.

Raw evidence:

- [result JSON](./benchmarks/rev22-gliner2-temporal-schema-ablation-results.json)
- [human report](./acceptance/phase2-revision22-gliner2-temporal-schema-ablation-report.md)

A fresh independent reviewer passed raw capture, one-load/serial-call,
no-write and report-completeness checks. It did not accept the detached guard
score as independently reproducible from commit `598ef0b...`: the two guard
modules were current dirty runtime files, whose exact SHA-256 values are
recorded in the result but whose contents are not part of that commit. This
does not change the raw-output conclusion above. It prevents treating the
guarded score as production/trial acceptance evidence.

Revision 22 completes the requested raw diagnostic only. It does not reopen
Revision 21, authorize a GLiNER2 trial, alter the existing 1.7B post contract,
or add serial production forwards.

## 2026-08-19: Revision 23 Qwen raw-hint comparison approved

The user requested a narrow follow-up experiment:

```text
Qwen temporal-only
vs
raw GLiNER2 hints + the same Qwen temporal-only
```

The original fixed PM had ended, so a replacement PM redid complete discovery
and production-informed review. Both verdicts are `PASS` for the explicitly
partial capability:

```text
temporal-only Qwen-with-raw-GLiNER2-hints research comparison
```

The PM confirmed the production boundary:

```text
VCON-013 remains one full five-family qwen3:1.7b post request.
Revision 23 does not change it.
```

The research runner will invoke GLiNER once only to produce a labeled raw hint,
then invoke Qwen A and Qwen B even when GLiNER fails. Qwen A/B receive the
same canonical source, System Prompt, temporal-only Schema and deterministic
options; B alone receives the raw hint envelope. Every prompt and raw output
will be displayed in the concise report. No State, production model task,
call budget, retry, fallback, GLiNER trial or production residency change is
authorized.

## 2026-08-19: Revision 23 Qwen raw-hint result

The first post-corpus invocation exposed a runner guard-capture bug before it
wrote any branch records or result/report. Its corpus was discarded; it is not
scored evidence. The fallback was corrected and frozen before a replacement
fresh-context corpus was generated:

```text
runner fix freeze: ec62df70f884526e1d49159794d42addad6dd2c9
replacement corpus SHA-256: 7f4be0e35bba013309a2b3b98aa326e48353a338a277f1f91af8dd37535cff69
```

The accepted raw diagnostic used one `fastino/gliner2-base-v1` process,
then serial Qwen branch A and B calls:

```text
GLiNER initializations / forwards: 1 / 10
Qwen A / Qwen B calls: 10 / 10
branch error / retry / dynamic 4B / production State write: 0 / 0 / 0 / 0
production model task calls: 0
```

Each pair used byte-identical canonical source, Qwen System Prompt, format
Schema and options. B alone received the labeled raw GLiNER hint envelope.
The semantic result is net worse:

```text
baseline Qwen semantic exact: 4/10
hinted Qwen semantic exact: 2/10
improved / same / worse / indeterminate: 1 / 6 / 3 / 0
```

All five positive temporal facts failed in both branches. The raw hint repaired
one unresolved-discussion negative, but induced false temporal claims for
three negatives that baseline Qwen correctly left empty: quotation, vague time
and conditional plan. This is not a production candidate.

Evidence:

- [fresh corpus](./benchmarks/rev23-fresh-qwen-temporal-gliner-hint-cases.json)
- [raw result](./benchmarks/rev23-qwen-temporal-gliner-hint-results.json)
- [human report](./acceptance/phase2-revision23-qwen-temporal-gliner-hint-report.md)

Two fresh reviewers agreed that the captured call count, A/B input equality,
raw evidence and semantic summary are internally consistent. They also found
two limits: the corpus/result/report are durable evidence generated after the
runner freeze rather than pre-run immutable commits, and guard modules remain
current-source hash diagnostics rather than contents inside the freeze commit.
The second reviewer additionally clarified that zero writes means zero
production/State write; temporary benchmark and report files are expected
filesystem writes. Therefore Revision 23 is closed as the requested raw
diagnostic, not production/trial acceptance and not an authorization to rerun
or promote the hint architecture.

## 2026-08-19: Revision 24 GLiNER2 conclusion and small-model research

The user requested one plain-language PRD conclusion for Revision 21-23:

```text
GLiNER2 truly does not work for this project’s immediate State semantics.
```

A replacement fixed PM classified the scope as a research/documentation-only
partial capability and passed it after the user explicitly authorized fresh
public research. The confirmed fields are Actor Runtime
`currentActivityEn/present/roomId/locationKnown`, adjacent `localPresence`,
and transient temporal claims. Canonical completed narration remains the
evidence source; VCON-013, existing guards and owning Reducers remain
unchanged.

The new PRD chapter consolidates the robust evidence:

```text
Revision 21: no positive-family or mixed improvement
Revision 22: temporal-only 0/10, same as combined
Revision 23: raw hint caused Qwen semantic exact 4/10 -> 2/10
```

Fresh external research found no trustworthy off-the-shelf replacement. The
credible future direction is a task-adapted compact encoder with separate
no-update/operation, evidence-span and supplied actor/room pointer heads.
DeBERTaV3-xsmall is the low-resource backbone candidate; NuExtract tiny and
PP-UIE are only detached, task-tuned decoder/schema-IE baselines. TripPy,
SPLAT, OneIE and DyGIE++ guide task decomposition rather than providing a
drop-in runtime.

No candidate model was downloaded, trained or called. No production Prompt,
Schema, VCON row, task, call budget, State, save, chat, Knowledge, UI,
clock/Calendar, guard or Reducer changed.

Evidence:

- [Revision 24 research](./acceptance/phase2-revision24-small-model-extraction-research.md)
- [GLiNER2 PRD conclusion](./prd.md#gliner2-真不行revision-21-23-综合结论)

A fresh read-only reviewer returned `PASS`. It confirmed that the report:

- rejects GLiNER2 only for the project's tested zero-shot/current-fact role;
- does not collapse evidence-span extraction into State semantic authority;
- keeps VCON-013, guards and Reducers as the unchanged production boundary;
- describes DeBERTa encoder, NuExtract and PP-UIE as research candidates only;
- treats the recent relation-extraction preprint as direction evidence, not a
  Hogwarts accuracy claim.

## 2026-08-19: Revision 25 Low post-provider selection drafted

The user deferred fine-tuning and directed the existing post semantic work to
use one stable low-tier large-model invocation, while retaining an explicit
Local option on the Low/Medium/High settings page.

The first fixed PM identified two decisions. Production reconnaissance showed
that the current settings page already persists `modelSlots` into both
extension settings and the active timeline, and Low is the mandatory complete
Connection Profile. The selected business contract is therefore:

```text
postTurnSemanticProvider = low | local
default = low
other = existing modelSlots.low Connection Profile
persist = extension default + active timeline State
```

The replacement PM redid discovery and production-informed review and returned
`PASS`. It preserved:

```text
one selected post call only
serial after paid narration
no Low/local fallback, retry, repair or semantic Regex
narration survives every post failure
existing guards and Reducers remain sole writers
```

The draft requires Low failure or invalid output to omit all VCON-013
five-family proposals, including a substitute deterministic perception. It
does not wake existing 4B routes as a fallback. Fine-tuning/LoRA/training
remains deferred research.

Current status: user approval received; implementation started.

## 2026-08-19: Revision 25 implementation started

- `HVG-P2-03R-POST-PROVIDER-GOV` completed and
  `HVG-P2-03R-POST-PROVIDER-IMPLEMENT` is active.
- Added the normalized `postTurnSemanticProvider: low | local` extension and
  active-timeline configuration, with missing/invalid values migrating to
  `low`.
- Replaced the local-only task with `post_turn_semantic_proposal`, shared the
  browser/server post System Prompt and JSON Schema descriptor, and added the
  Low raw-result server settlement boundary.
- Low requests use the existing Low Connection Profile but explicitly disable
  its Regex Preset. The Local and Low branches are exclusive; selected-source
  failure returns no post proposal, perception, derived EventKnowledge or 4B
  substitute while keeping the already visible paid narrative.
- Added the model settings selector, VCON/runtime-field registrations and the
  focused provider-selection test. Browser, runtime, blind and independent
  acceptance proceed under the next execution entry.

## 2026-08-19: Revision 25 deterministic/browser/runtime checks

- Focused provider selection plus affected model/local-observer/UI/task-budget
  suites passed `51/51`; targeted ESLint passed. The broader
  `hogwarts-mud-task5-workflows.test.mjs` still has one pre-existing uncommitted
  retry assertion expecting `live_scene_stream` while the current workflow
  reports `chat_message`; it reaches the intended assertion and is outside
  this provider-selection change.
- Build-only production measurement kept the representative archive unchanged
  and recorded shared post messages `10,269` characters plus transport Schema
  `3,839` characters. See
  [prompt evidence](./acceptance/revision25-post-provider-prompt-measurement.md).
- Browser acceptance rendered the Chinese `low/local` selector, verified
  Local persistence across reload, then restored Low. See
  [browser evidence](./acceptance/revision25-settings-browser.md).
- A real Local endpoint call reached `post_turn_semantic_proposal` on
  `qwen3:1.7b`; a real Low settlement probe passed without calling an external
  Profile. See
  [runtime probes](./acceptance/revision25-provider-runtime-probes.md).
- Two fresh context-free one-shot simulations received only the production
  System/User/Schema request and passed unchanged through the real server
  settlement path. See
  [blind evidence](./acceptance/revision25-post-blind-simulation.md).
- Remaining Revision 25 acceptance: a fresh independent read-only acceptance
  Agent. Low external Profile real-call evidence remains unavailable without
  separate paid-call authorization.

## 2026-08-19: Revision 25 independent acceptance iterations

- Independent attempts 1 and 2 found direct provider defects. The implementation
  then restored the missing UI normalizer injection, restored Chinese dynamic
  detail rendering, repaired the helpers facade no-growth boundary by moving
  provider values into their own domain module, and expanded post language
  adoption to reject non-English canonical Material/Actor records.
- The focused provider, language-adoption, facade and architecture checks now
  pass. The latest fresh independent browser-capable review passed the current
  VCON-013 contract and `41/41` direct checks, but returned `BLOCKED` for
  complete acceptance: it did not itself mutate a real active timeline, send a
  real provider request, or execute its own blind one-shot. Its result is
  [attempt 4](./acceptance/revision25-independent-acceptance-attempt4.md).
- Repository-wide test cleanup remains outside Revision 25: current known
  red tests concern Canon alias admission, Scene Transition Prompt budget,
  Medium locked-event projection and failed-turn display timing. No code for
  those excluded domains was changed here.
- A real one-request Low Connection Manager probe then reached the configured
  `trial · gemini 3.1` Profile and failed with `API request failed`. It made no
  retry, Local fallback or State/chat/timeline write. Successful Low runtime
  acceptance is therefore blocked on repairing that external Profile; see
  [runtime probes](./acceptance/revision25-provider-runtime-probes.md).
