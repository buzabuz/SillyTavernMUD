# Cross-Mechanism Validation Registry - Independent Acceptance

Fresh-context declaration required: the verifier must start without parent
conversation history and must not receive an expected result.

Repository:

```text
/Users/bytedance/sillytavern/SillyTavern
```

Project goal:

```text
Before Phase 2 production, establish a permanent maintainable process for
every current and future Hogwarts validation domain. A future system such as
Money must not be able to add a Prompt, Schema, semantic decision, normalizer,
validator, embedding verdict, retry/fallback or State writer independently.
Every domain must register shape, semantics, retrieval, authority/evidence,
settlement and failure ownership before implementation. Existing legacy debt
must be visible but cannot be copied as a new exemption. This governance
change must make zero production behavior, Prompt, model-call, State, test or
save changes.
```

Authoritative artifacts:

```text
.trae/specs/hogwarts-validator-governance/prd.md
.trae/specs/hogwarts-validator-governance/spec.md
.trae/specs/hogwarts-validator-governance/tasks.md
.trae/specs/hogwarts-validator-governance/checklist.md
.trae/specs/hogwarts-validator-governance/regex-classification.json
.trae/specs/hogwarts-runtime-contracts/state-fields.md
.trae/skills/hogwarts-change-governance/SKILL.md
.trae/skills/hogwarts-change-governance/VALIDATION_RESPONSIBILITY_REGISTRY.json
.trae/skills/hogwarts-change-governance/VALIDATION_RESPONSIBILITY_REGISTRY.md
.trae/skills/hogwarts-change-governance/scripts/validate-validation-responsibility.mjs
public/scripts/extensions/hogwarts-mud/domain/model-task-registry.js
HOGWARTS_MUD_PRODUCT_SPEC.md
```

Instructions:

1. Start from fresh context and derive acceptance independently from the user
   goal and governed artifacts. Do not assume the main agent's result.
2. Work read-only with respect to production code, tests, migrations, saves,
   registry authority, gate script and all governance artifacts except the
   report path named below.
3. Verify the registry granularity is maintainable: model-output and
   semantic-settlement contracts are registered, while internal helper
   assertions are not turned into a global function-name inventory.
4. Reconcile every active runtime model task with exactly one contract and
   every current semantic-regex target owner with the owner catalog.
5. Inspect the contract rows against their named production paths. Check
   Schema authority, transforms, deterministic boundaries, writer ownership,
   failure policy, current debt and verification ownership. Report inaccurate
   or misleading rows as failures.
6. Verify Regex and Embedding cannot own semantic verdicts or State writes.
7. Verify new contracts cannot use `legacy_registered`, automatic retry,
   semantic regex fallback, provider fallback, non-serial execution, multiple
   writers, missing responsibilities or missing focused tests.
8. Independently exercise the gate and adversarial mutations. Verify a
   complete Money-style contract can be added only after its semantic owner,
   deterministic boundary, one writer, failure policy, call policy and tests
   are registered.
9. Verify the generated Markdown is an exact view of JSON authority and the
   reviewed hash anchor detects unapproved registry edits.
10. Verify the permanent Skill requires this gate for future Prompt, Schema,
    transform, validator, embedding, Reducer and model-task changes.
11. Verify the scoped worktree contains no production/runtime/test/save
    behavior change and no model request is needed.
12. Write findings first, criterion-by-criterion evidence and a final verdict
    to exactly:

```text
.trae/specs/hogwarts-validator-governance/acceptance/cross-mechanism-registry-report.md
```

Do not change any other file.
