# Cross-Mechanism Validation Registry - Independent Acceptance Attempt 4

## Fresh-Context Declaration

I started from the task input without parent conversation history, hidden
implementation summary, or an expected pass/fail result. I derived this
acceptance from the stated project goal and authoritative artifacts.

Repository root verified:

```text
/Users/bytedance/sillytavern/SillyTavern
```

## Findings

### BLOCKER: future contracts can omit semantic and failure ownership

Confidence: High.

The permanent gate does not enforce the project's required semantic and
failure completeness:

1. Semantic ownership is required only when the arbitrary `outputClass`
   string contains the literal substring `state_proposal`
   (`validate-validation-responsibility.mjs:416-419`). A State-writing planned
   contract can rename that class and remove all semantic owners.
2. Failure policy validation checks only the key set
   (`validate-validation-responsibility.mjs:312-323`). It does not require
   `stateOnFailure` or `paidNarrativeOnFailure` to be non-empty.
3. Semantic-owner validation checks only count, uniqueness, and mechanism
   (`validate-validation-responsibility.mjs:549-578`). It does not require a
   non-empty `responsibility` or `deterministicSettlement`.

I attacked the current planned Inventory contract entirely in memory, keeping
its valid lifecycle, domain-bound source/test paths, runtime fields, writer,
call bounds, exact serial mode, and numeric residency:

| Mutation | Gate result |
| --- | --- |
| Change `outputClass` from `state_proposal` to `transaction_proposal` and remove all `semanticOwnerIds` | **Accepted**, zero errors |
| Empty `failurePolicy.stateOnFailure` and `paidNarrativeOnFailure` | **Accepted**, zero errors |
| Empty `dynamic_4b_inventory.responsibility` and `deterministicSettlement` | **Accepted**, zero errors |

This violates the PRD requirement that a future State proposal register
non-empty semantic ownership and the project goal that every future domain
register semantics, settlement, and failure ownership before implementation.
The built-in 24 mutation cases do not cover these evasions.

Required correction:

- Bind semantic-owner requirements to governed contract semantics rather than
  an unconstrained substring in `outputClass`.
- Require exact, non-empty semantic-owner definitions.
- Require exact, non-empty failure settlement values.
- Add negative self-tests for all three mutations.

### MEDIUM: the authoritative Spec has a stale legacy lifecycle count

Confidence: High.

`spec.md:262` says the hard-coded legacy baseline has 20 rows. The JSON,
gate anchor, generated table, checklist, and runtime result all establish 23
frozen legacy contracts.

This does not weaken the executable 23-ID anchor, but it leaves the approved
technical design inconsistent with its implementation and fails exact
lifecycle documentation reconciliation.

## Criterion Evidence

| Criterion | Result | Independent evidence |
| --- | --- | --- |
| Active model-task reconciliation | PASS | Production catalog has 16 active tasks; all appear in exactly one contract. Gate and direct catalog/registry reconciliation agree. |
| Regex semantic-owner reconciliation | PASS | AST inventory reports 578 rows, `355/195/26/2/0`; all 221 semantic rows resolve to 12 registered and used owners. |
| Regex and Embedding authority | PASS | Mechanism catalog keeps Regex shape-only and Embedding retrieval-only; mutation tests reject Regex semantics, Embedding verdicts, and Embedding writers. |
| Legacy/compliant lifecycle | FAIL | Executable anchor correctly freezes 23 legacy IDs and no compliant IDs, but the Spec incorrectly states 20. |
| Semantic/runtime completeness | **FAIL** | In-memory mutation relabelled a State proposal and removed all semantic owners; the full path-checking gate accepted it. |
| Current/target call bounds | PASS | Current legacy multiplicity remains visible; future contracts enforce integer current/target bounds and at most one call. Translation records chunk-dependent legacy worst-case calls. |
| Exact serial mode and residency | PASS | Prefix values such as `serial_and_parallel` fail; planned shared execution uses the exact allowed value; loaded-model limits require bounded integers. |
| Retry/repair/provider/semantic fallback | **FAIL** | Forbidden flags are enforced, but empty failure settlement ownership is accepted. |
| Writer uniqueness and mechanism typing | PASS | New State writers require one source and a typed Reducer owner; no-State contracts require no writer; Regex and Embedding cannot write. |
| Money admission | PASS for tested attacks | Unfilled placeholders and borrowed Item paths fail; ordinary future paths are token-bound to their domain. |
| Migration owner | PASS | `VCON-025` registers deterministic no-model migration ownership, sources, fields, failure behavior, and focused tests. |
| Sensitive Field owner | PASS | `VCON-026` registers explicit sensitive-field ownership, save/diagnostic sources, no State writer, and focused tests. |
| Translation chain | PASS | `VCON-016` names browser translation/localization adapters, authenticated endpoint validation, server Translation Table persistence, and sequential per-chunk legacy multiplicity. |
| Planned Inventory/Spell/Identity | PASS | `VCON-018..020` remain `planned_unapproved`; retained-evidence tests run without invoking the Ollama benchmark. |
| Generated Markdown and SHA anchor | PASS | `--check-report` matches byte-for-byte; registry SHA-256 is `48ec337bf165ed5c59049c3265003dec6ff5042131a846c74d446b6d4b682704`. |
| Permanent Skill integration | PASS | The Skill names the registry authority and blocks affected Prompt/Schema/transform/validator/Reducer/model-task changes until registration. |
| Zero production/runtime/save behavior change | PASS | Tracked production/test diff under `public`, `src`, `scripts`, and `tests` is empty; only the two new focused governance tests are untracked under `tests`. No save or model request was made. |
| Contract-owned executable tests | PASS | All 24 unique contract-referenced test files plus the focused registry test ran: 278 passed, 0 failed, 0 skipped, 0 todo. |

## Verification Commands

All completed successfully unless identified as an intentionally accepted
adversarial mutation:

```text
node --check .trae/specs/hogwarts-validator-governance/inventory-regex.mjs
node --check .trae/specs/hogwarts-validator-governance/apply-regex-review.mjs
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs --self-test-semantic-gate
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs --require-classified
node .trae/skills/hogwarts-change-governance/scripts/validate-validation-responsibility.mjs --self-test
node .trae/skills/hogwarts-change-governance/scripts/validate-validation-responsibility.mjs --check-report
node --test tests/hogwarts-mud-validation-responsibility-registry.test.mjs tests/hogwarts-mud-validator-dynamic-research-contract.test.mjs
node --test <24 unique contract-referenced test files plus the focused registry test>
```

Observed totals:

```text
regex rows: 578
regex categories: 355 accepted lexical / 195 runtime semantic /
                  26 migration semantic / 2 dead / 0 unclassified
semantic baseline: 221
contracts: 26
active model tasks: 16
semantic owners: 12
legacy contracts: 23
built-in mutation tests: 24
full Node tests: 278 pass / 0 fail / 0 skip / 0 todo
model requests: 0
```

## Final Verdict

**FAIL**

The current registry contents are broadly reconciled and all referenced tests
pass, but the permanent admission gate still accepts future State-writing
contracts with missing semantic ownership and accepts empty semantic/failure
responsibility definitions. That directly defeats the future-domain
completeness goal, so the registry cannot be independently accepted.
