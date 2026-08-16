# Hogwarts Validator Governance Tasks

Status values: `pending`, `in_progress`, `blocked`, `completed`.

Revision 4's unapproved mixed implementation graph was superseded by the
user-defined three-phase boundary on 2026-08-16.

| ID | Phase | Task | Dependencies | Expected files | Verification | Status |
| --- | --- | --- | --- | --- | --- | --- |
| HVG-R01 | Research | Inventory production validators, normalizers, model tasks, paid-response paths and embedding boundaries | none | governance evidence only | call-path and ownership evidence | completed |
| HVG-R02 | Research | Inventory and classify all current regex constructions | HVG-R01 | `regex-classification.json`, inventory scripts | 578 rows; row-level review; 0 unclassified | completed |
| HVG-R03 | Research | Benchmark Ollama serial, parallel, merged and staged designs | HVG-R01 | report and benchmark evidence | latency, RSS and quality matrices | completed |
| HVG-P1-01 | Phase 1 | Fix permanent Regex/Embedding/small-model/large-model/Reducer responsibility boundary | HVG-R01 | `prd.md`, `spec.md` | responsibility table has one owner and explicit prohibitions | completed |
| HVG-P1-02 | Phase 1 | Register every regex row with category, rationale and source owner | HVG-R02 | `regex-classification.json` | 578 unique IDs; `355/195/26/2/0` split | completed |
| HVG-P1-03 | Phase 1 | Register semantic owner, deterministic owner and Phase 2 action for every violation | HVG-P1-02, HVG-R03 | manifest and semantic plan | owner totals reconcile to 221; no generic/blank owner | completed |
| HVG-P1-03R | Phase 1 | Correct row-level false positives/negatives found by independent acceptance attempts | HVG-P1-03 | correction registry and failed acceptance evidence | exact 54-row correction; automatic classifier removed | completed |
| HVG-P1-04 | Phase 1 | Establish anchored full manifest, semantic baseline and append-only retirement ledger | HVG-P1-03R | manifest, baseline, retirement ledger and governance script | full row identity plus byte/count anchors; monotonic semantic set | completed |
| HVG-P1-04R | Phase 1 | Close independent attempt 3 persisted-identity and mutable-history findings | HVG-P1-04 | governance script and failed acceptance evidence | self-test rejects forged metadata, lexical/rationale rewrite, stale rows, file tamper, deletion and resurrection | completed |
| HVG-P1-05 | Phase 1 | Incorporate concurrency report, Identity TODO and physical 8 GB gate into PRD | HVG-R03 | PRD, Spec, checklist | report numbers and blockers match evidence | completed |
| HVG-P1-06 | Phase 1 | Prove zero behavior and zero model-call changes | HVG-P1-01..05 | governance diff only | no production/runtime/test/save/Prompt/call file changed; no model request | completed |
| HVG-P1-07 | Phase 1 | Present Phase 1 artifacts and stop before Phase 2 | HVG-P1-06 | five governed artifacts and Product Spec registry | independent pass recorded; Phase 2 remains pending | completed |
| HVG-GOV-01 | Pre-Phase 2 governance | Register every active model-output contract and semantic owner across Regex, Embedding, model, Schema, transform, validator and Reducer stages | HVG-P1-07 | permanent validation responsibility registry | all 16 active model tasks covered exactly once; all 12 semantic owners represented | completed |
| HVG-GOV-02 | Pre-Phase 2 governance | Require each future system to update its registry row and add a new domain-owned focused test file | HVG-GOV-01 | governance Skill, PRD, Spec, checklist and Product Spec | no central gate script; owning system tests cover Schema, semantics, validator, Reducer, failure and call budget | completed |
| HVG-P2-G1 | Phase 2 gate | Integrate Identity into the benchmark-only dynamic 4B Schema and close route plus semantic matrix | Phase 1 accepted | benchmark harness and evidence JSON only | independently sourced route; negative outcomes; all checks pass | completed |
| HVG-P2-01 | Phase 2 | Integrate the accepted dynamic 4B Identity contract into production | HVG-P2-G1, explicit Phase 2 approval | production Prompt/Schema/validator files named by approved revision | exact production chain and blind matrix reach 100% | pending |
| HVG-P2-02 | Phase 2 gate | Validate the candidate on a physical 8 GB machine | HVG-P2-G1 | acceptance evidence only | candidate plus normal browser workload passes; no support claim before pass | pending |
| HVG-P2-03 | Phase 2 | Implement `pre -> post -> optional 4B -> optional destroy micro -> Reducers` with one loaded-model slot | HVG-P2-01, HVG-P2-02, explicit Phase 2 approval | scheduler, local model contracts and all affected harnesses | exact call order/count, memory and Prompt budgets pass | pending |
| HVG-P2-04 | Phase 2 | Remove and replace all 195 runtime semantic regex rows by registered owner | HVG-P2-03 | row-owned production modules and focused tests | `semantic_runtime=0`; every removal has an anchored retirement event; no fallback | pending |
| HVG-P2-05 | Phase 2 | Remove all 26 prose-semantic migration rows | HVG-P2-03 | row-owned migrations and focused tests | `semantic_migration=0`; explicit or conservative values only | pending |
| HVG-P2-06 | Phase 2 | Run deterministic, real-save, Prompt, blind-model, 8 GB and independent acceptance | HVG-P2-04, HVG-P2-05 | acceptance evidence | 100% matrix, zero semantic regex, no retry, all gates pass | pending |
| HVG-P3-01 | Phase 3 | Produce narrowed narrative preselection-ledger PRD/Spec | Phase 2 accepted | governed artifacts only | narrative-only scope, append-only/forward-repair and reader exclusions are decision-complete | pending |
| HVG-P3-02 | Phase 3 | Implement paid narrative正文 preservation without State authority | HVG-P3-01 and explicit Phase 3 approval | files named by approved Phase 3 Spec |正文 always visible; only State proposal rejected; no retry/regex inference | pending |
| HVG-CLOSE | Closeout | Complete debt self-audit, ledger row, registry status and core-change reinventory decision | accepted final authorized phase | `TECH_DEBT.md`, Product Spec and current artifacts | governance closeout gate | pending |
