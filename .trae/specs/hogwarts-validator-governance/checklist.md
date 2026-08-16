# Hogwarts Validator Governance Checklist

## Phase 1 Product Boundary

- [x] Regex owns only character-level or finite-grammar shape.
- [x] Regex is forbidden from inferring natural-language meaning.
- [x] Embedding owns candidate recall/ranking only.
- [x] Embedding cannot establish truth, authority or State.
- [x] Local small models own bounded semantic interpretation.
- [x] Paid large models own player-facing narrative正文, not State settlement.
- [x] Deterministic code owns Schema, IDs, references, provenance, ACL,
  arithmetic and legal transitions.
- [x] Reducers remain sole atomic State writers.

## Phase 1 Complete Registry

- [x] Both Hogwarts production JS roots are scanned with Acorn.
- [x] Exactly 578 regex constructions are registered.
- [x] Registry IDs are unique.
- [x] Source fingerprint is
  `6927d5e1ba93d5ae6114741adc181da818fb0206beae0861d87f4457e21836a5`.
- [x] Exactly 355 rows are `accepted_lexical`.
- [x] Exactly 195 rows are `semantic_runtime`.
- [x] Exactly 26 rows are `semantic_migration`.
- [x] Exactly 2 rows are `dead_or_retired`.
- [x] Exactly 0 rows are `unclassified`.
- [x] Every row has a rationale, target owner, deterministic owner and Phase 2
  action.
- [x] The fourteen owner totals reconcile to all 578 rows.
- [x] The twelve semantic owner totals reconcile to all 221 violations.
- [x] The rejected broad file-level classifier is removed.
- [x] The exact 54-row re-review correction is registered.

## Phase 1 Only-Decrease Gate

- [x] `regex-semantic-baseline.json` freezes all 221 semantic IDs and owners.
- [x] `regex-semantic-retirements.json` starts empty and is append-only.
- [x] Manifest, baseline and retirement-ledger bytes plus event count are
  anchored in the reviewed enforcement script.
- [x] Persisted manifest metadata and every source identity field are compared
  against the AST scan.
- [x] A new semantic ID fails enforcement.
- [x] Relabelling a baseline semantic ID as lexical fails enforcement.
- [x] Changing a baseline semantic/deterministic owner fails enforcement.
- [x] An unclassified new row fails enforcement.
- [x] A semantic disappearance without a retirement event fails.
- [x] A retired semantic ID reappearing in any category fails.
- [x] Automatic broad-file classification is deleted, not retained as a
  fallback.
- [x] Positive `--require-classified` verification passes.
- [x] Synthetic negative gate verification covers stale/forged metadata,
  lexical/rationale history, file tamper, deletion and resurrection.

## Phase 1 Scope Guard

- [x] Runtime field impact is explicitly `None`.
- [x] Prompt impact is explicitly `None`.
- [x] Frontend whitelist is explicitly `None`.
- [x] No production/runtime code is intentionally changed.
- [x] No Prompt, Schema, validator, Reducer or migration behavior is
  intentionally changed.
- [x] No model order, concurrency, context, residency or call count is
  intentionally changed.
- [x] No save or archive is intentionally changed.
- [x] No model request is required for Phase 1.
- [x] Final scoped Git diff proves governance-only files; no production,
  runtime, test or save path changes.
- [x] Product Spec registry and all five governed artifacts agree on the
  accepted Phase 1 and current Phase 2 research-gate status.

## Permanent Cross-Mechanism Registry

- [x] JSON and Markdown responsibility tables are retained.
- [x] Current model-output domains and semantic owners have stable `VCON-*`
  rows.
- [x] Regex remains shape-only and Embedding remains retrieval-only.
- [x] Planned Inventory, Spell and Identity rows remain explicitly
  unapproved.
- [x] Permanent Skill requires every future system to update its own row.
- [x] Every future gameplay system must add a new domain-named focused test
  file; unrelated existing tests cannot substitute.
- [x] Owning tests must cover successful Reducer settlement, rejection with no
  State write, hypothetical/no-op semantics, no semantic fallback and
  normal/worst call budgets.
- [x] Central registry scripts and generic registry self-tests are removed.
- [x] Registry scope changes no production/runtime/Prompt/Schema/State/model
  call or test behavior.

## Phase 2 Registered Gates

- [x] Concurrency and merge report is incorporated into PRD Section 9.
- [x] Two-model parallel residency is rejected for low-memory support.
- [x] Giant merged 1.7B validation is rejected.
- [x] Target order is registered as
  `pre -> post -> optional dynamic 4B -> optional destroy micro -> Reducers`.
- [x] One loaded-model slot and serial execution are the registered proposal.
- [x] Benchmark-only Identity is integrated into the dynamic 4B Schema.
- [x] Dynamic route is derived only from independent structured
  paid/directive/pre-turn signals.
- [x] Full route plus Identity/Inventory/Spell/post matrix reaches 100%
  across five seeds, including negative participant assertions.
- [x] Fresh independent acceptance attempt 3 verifies the complete
  benchmark-only research gate and records `740/800` raw versus `800/800`
  post-guard checks.
- [x] Maximum measured prompt plus output is `1673/2048` tokens.
- [x] Worst-case three-domain peak is one loaded model and 3.04 GB Ollama RSS
  on the 36 GB M3 Pro.
- [ ] Accepted Identity contract is integrated into the exact production
  Prompt/Schema/validator chain.
- [ ] Fresh context-free blind production-chain acceptance passes.
- [ ] Physical 8 GB machine passes with SillyTavern and normal browser load.
- [x] No low-memory/8 GB support claim is made before that physical pass.
- [ ] Phase 2 PRD/Spec revision has explicit user approval.
- [ ] All 195 runtime semantic regex rows are physically removed/replaced.
- [ ] All 26 semantic migration regex rows are physically removed.
- [ ] Final manifest has zero semantic and zero unclassified rows.
- [ ] No semantic regex remains as fallback, override or repair path.
- [ ] No automatic model retry, repair or provider fallback is introduced.

## Phase 3 Registered Gates

- [x] Scope is narrowed to paid large-model player-facing narrative正文.
- [x]正文 must remain visible even when State settlement fails.
- [x] Only the State proposal may be rejected.
- [x] Rejected正文 cannot enter State, Prompt, Knowledge or retrieval
  authority.
- [x] No automatic retry or regex semantic fallback is allowed.
- [x] Once ledger evidence exists, repair is forward-only.
- [x] Internal structured Director JSON is not silently included.
- [ ] Phase 3 persistence, API, runtime field, UI and localization contracts
  are decision-complete.
- [ ] Phase 3 has separate explicit user approval.

## Phase 1 Acceptance

- [x] Independent acceptance attempt 1 failed and its findings are persisted.
- [x] Attempt 1 classification and monotonicity findings are corrected.
- [x] Independent acceptance attempt 2 failed and its findings are persisted.
- [x] Attempt 2 classification, stale-row and tamper findings are corrected.
- [x] Independent acceptance attempt 3 failed and its findings are persisted.
- [x] Attempt 3 full-identity and mutable-history findings are corrected.
- [x] Independent acceptance attempt 4 failed and its findings are persisted.
- [x] Attempt 4 uncalled narrative-presence filter finding is corrected.
- [x] Independent acceptance attempt 5 passes every Phase 1 criterion.
- [x] PRD criterion-by-criterion audit passes.
- [x] A new fresh independent read-only Agent verifies the complete Phase 1
  goal after all corrections.
- [x] Phase 1 presentation is complete and implementation stops before Phase
  2.

## Closeout

- [ ] Technical-debt self-audit is recorded for the last authorized phase.
- [ ] Change Ledger row and counters are correct.
- [ ] User records `reinventory` or `defer` for this core change.
- [ ] Product Spec registry reflects final accepted status.
