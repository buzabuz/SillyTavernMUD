# Cross-Mechanism Validation Registry - Independent Acceptance Attempt 5

## Fresh-Context Declaration

I started from
`acceptance/cross-mechanism-registry-task-attempt-5.md` without parent
history, an implementation summary, or an expected verdict. I independently
read the listed authorities, derived the acceptance criteria from the project
goal, inspected production ownership, and executed the complete required
scope read-only. This report is the verifier's only filesystem write.

## Final Verdict

**FAIL**

The current registry accurately freezes and exposes the existing production
contracts, but its future-domain admission gate can accept a Money contract
whose Money-named Schema, validator, writer, and test files are empty
placeholders. It can also accept that Money contract while borrowing the
Inventory semantic owner. This violates the primary goal that a future Money
system cannot independently create incomplete validation responsibility.

## Blocking Finding

### HIGH - Money-named placeholders and a borrowed semantic owner pass admission

Required behavior:

- PRD acceptance requires ordinary future Schema, validator, writer, and test
  paths to be domain-owned and forbids borrowed files satisfying Money
  (`prd.md:410`).
- The permanent Skill requires every affected path to map to a complete
  contract and forbids unrelated files that merely mention or impersonate the
  domain (`SKILL.md:401-442`).

Observed gate behavior:

1. For ordinary future contracts, the gate checks that paths exist and that
   each path string contains the final domain token
   (`validate-validation-responsibility.mjs:714-780`).
2. It reads source contents only for the three hard-coded shared research
   contracts. It never reads an ordinary future domain's files
   (`validate-validation-responsibility.mjs:763-776`).
3. A semantic owner is accepted when its ID exists and its mechanism is
   `local_semantic_model` or `deterministic_guard`; the owner is not bound to
   the contract domain (`validate-validation-responsibility.mjs:348-369`).
4. The built-in Money test rejects literal unfilled `<...>` paths and existing
   Item paths, but does not test existing Money-named empty files or an
   unrelated registered semantic owner
   (`validation-responsibility-self-test.mjs:343-445`).

Independent adversarial execution:

- I loaded the real validator in memory and changed only `pathExists()` to
  return true, simulating the existence of hypothetical files without writing
  them to the repository.
- I added planned `VCON-900` with:
  - `public/.../money-placeholder.js` for Schema, transform, validator, and
    writer;
  - `tests/hogwarts-mud-money-placeholder.test.mjs` for verification;
  - otherwise valid one-call, serial, one-writer, no-fallback metadata.
- The gate returned zero errors even though those simulated files had no
  executable exports or domain logic:
  `placeholderMoneyAccepted=true`.
- I repeated the mutation without adding a Money semantic owner and assigned
  `dynamic_4b_inventory` instead. The gate again returned zero errors:
  `borrowedInventoryOwnerAccepted=true`.

The simulation is equivalent to creating empty files at those paths because
the ordinary-contract branch never reads their contents.

Impact:

A future domain can make the registry green before it has a domain-owned
Schema, semantic contract, validator, Reducer, or runnable business test. The
registry therefore does not yet enforce its central future-domain guarantee.

Required correction:

- Bind each future contract to domain-owned executable responsibility
  evidence, not only filenames.
- Bind each future semantic owner and its responsibility/settlement definition
  to the contract domain.
- Add negative tests for Money-named empty files, files that only mention
  Money, one placeholder file reused for all stages, and an existing unrelated
  semantic owner.

## Criterion Results

| Criterion | Result | Independent evidence |
| --- | --- | --- |
| Complete Regex registry | PASS | 578 unique rows; 355 lexical, 195 runtime semantic, 26 migration semantic, 2 dead, 0 unclassified |
| Semantic-owner reconciliation | PASS | All 221 semantic rows reconcile to 12 non-empty owners with the documented counts |
| Only-decrease baseline | PASS | Syntax checks, `--self-test-semantic-gate`, and `--require-classified` passed; zero retirements |
| Active model-task reconciliation | PASS | All 16 active catalog tasks appear exactly once; retired tasks are not active coverage |
| Existing contract production accuracy | PASS | All 26 contracts were traced against their current writer, fields, failure behavior, and call path; details below |
| Regex/Embedding boundary | PASS | Regex is registered as shape or visible legacy debt; Embedding remains candidate-only and has no State writer |
| Lifecycle/status completeness | PASS | Separate Calendar horizon, Interior status, Pacing status, and Social/Memory status writers are registered |
| Failure/call multiplicity | PASS | Existing debt is visible; future metadata rejects two calls, retry, provider fallback, semantic fallback, parallel mode, and invalid residency |
| Future Money completeness | **FAIL** | Money-named empty files and borrowed Inventory semantic ownership pass the real admission logic |
| Planned Inventory/Spell/Identity | PASS | Remain `planned_unapproved`; retained 45-run/800-check evidence and focused tests passed |
| Migration/Sensitive/Translation | PASS | VCON-025/026/016 match current production paths, fields, fallbacks, writers, and focused tests |
| Generated authority | PASS | JSON SHA-256 is anchored; generated Markdown compares byte-for-byte equal |
| Skill/Product integration | PASS | Permanent Skill gate and Product Spec registry point to the current authority and pending Phase 2 status |
| Zero production impact | PASS | No changed/untracked `public/.../hogwarts-mud` or `src/hogwarts-mud` production file; no model/Ollama request was run |
| Referenced executable tests | PASS | 25 files, 278 tests passed, 0 failed, 0 skipped, 0 todo |
| Phase 2/3 boundaries | PASS | Production blind simulation, physical 8 GB run, and approval remain pending; Phase 3 remains narrative-only and unapproved |

## Contract Audit

| Contract | Result | Production finding |
| --- | --- | --- |
| VCON-001 | PASS | Character polish uses the registered scheduler task and setup draft writer; failure leaves the draft unchanged |
| VCON-002 | PASS | Opening package validates before `applyOpeningWorldPackage`; legacy regex/retry debt is exposed |
| VCON-003 | PASS | High Calendar proposal settles through the Calendar reducer |
| VCON-004 | PASS | Medium proposal settles entries through the Calendar reducer; horizon is separately VCON-021 |
| VCON-005 | PASS | Interior proposal settles topology through `applyGeneratedInteriorMap`; status is separately VCON-022 |
| VCON-006 | PASS | Pacing proposal settles through `applyPacingAssessment`; workflow status is separately VCON-023 |
| VCON-007 | PASS | Scene Performance makes one Low request and settles through the turn reducer; semantic regex debt remains visible |
| VCON-008 | PASS | `applySceneTransition` in archive projection writes the registered transition field families atomically |
| VCON-009 | PASS | Scene Opening makes one Low request and writes only the committed message fields |
| VCON-010 | PASS | Social proposal settles through the Social V3 reducer; lifecycle fields are separately VCON-024 |
| VCON-011 | PASS | Map expansion validates then writes generated nodes/proposals through the Map reducer |
| VCON-012 | PASS | Local pre-turn makes one call; current conservative semantic fallback is explicitly registered |
| VCON-013 | PASS | Local post-turn makes one core call; override/synthesis fallback and split settlement sources are visible |
| VCON-014 | PASS | Optional local Inventory makes at most one task call and settles accepted operations through the Item reducer |
| VCON-015 | PASS | Local Appraisal makes one task call and settles through Memory Synapse; error-prose classification debt is visible |
| VCON-016 | PASS | Translation uses serial chunk calls and writes Translation Table records, not world State; explicit user retranslation is visible |
| VCON-017 | PASS | Knowledge is candidate-only, has no writer, and rehydrates canonical records with revision/timeline/ACL/clock/source gates |
| VCON-018 | PASS | Dynamic Inventory remains research-only, unapproved, one-call/one-model, with Item reducer ownership |
| VCON-019 | PASS | Dynamic Spell remains research-only, unapproved, one-call/one-model, with Spell reducer ownership |
| VCON-020 | PASS | Dynamic Identity remains research-only, unapproved, one-call/one-model, with Identity reducer ownership |
| VCON-021 | PASS | Medium Calendar workflow is the registered direct `calendar.horizon` writer |
| VCON-022 | PASS | Interior workflow is the registered generation-status writer |
| VCON-023 | PASS | Directors workflow is the registered Pacing lifecycle-status writer |
| VCON-024 | PASS | Social/Memory workflow is the registered lifecycle-status writer |
| VCON-025 | PASS | Frozen migration writers and all 26 prose-semantic migration rows are registered as legacy debt |
| VCON-026 | PASS | Sensitive-field keyword inference is registered as no-State-write legacy debt |

## Verification Results

Passed:

```text
node --check .trae/specs/hogwarts-validator-governance/inventory-regex.mjs
node --check .trae/specs/hogwarts-validator-governance/apply-regex-review.mjs
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs --self-test-semantic-gate
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs --require-classified
node .trae/skills/hogwarts-change-governance/scripts/validate-validation-responsibility.mjs --self-test
node .trae/skills/hogwarts-change-governance/scripts/validate-validation-responsibility.mjs --check-report
node --test <25 unique referenced and authoritative test files>
```

Observed canonical registry result:

```text
registry SHA-256: 48ec337bf165ed5c59049c3265003dec6ff5042131a846c74d446b6d4b682704
contracts: 26
active model tasks: 16
semantic owners: 12
legacy contracts: 23
built-in mutation self-tests: 27
```

Observed test result:

```text
tests: 278
pass: 278
fail: 0
skipped: 0
todo: 0
```

These green results are valid supporting evidence, but they do not exercise
the blocking same-domain placeholder and semantic-owner borrowing cases.

## Acceptance Decision

The cross-mechanism registry is not accepted. Existing production
responsibility inventory and governance tests are substantially complete, but
the future-domain gate does not yet enforce domain-owned executable
responsibility. A fresh independent verifier must rerun the complete scope
after correction.
