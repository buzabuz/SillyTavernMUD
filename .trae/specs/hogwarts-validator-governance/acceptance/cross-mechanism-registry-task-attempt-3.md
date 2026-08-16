# Cross-Mechanism Validation Registry - Independent Acceptance Attempt 3

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
must remain visible and frozen, never become a reusable exemption. This
governance change must make zero production behavior, Prompt, model-call,
State, migration or save changes; focused governance-only tests are allowed.
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
.trae/skills/hogwarts-change-governance/scripts/validation-responsibility-self-test.mjs
public/scripts/extensions/hogwarts-mud/domain/model-task-registry.js
tests/hogwarts-mud-validation-responsibility-registry.test.mjs
tests/hogwarts-mud-validator-dynamic-research-contract.test.mjs
HOGWARTS_MUD_PRODUCT_SPEC.md
```

Instructions:

1. Start from fresh context and derive acceptance independently from the user
   goal and governed artifacts. Do not assume the main agent's conclusion.
2. Work read-only with respect to production code, tests, migrations, saves,
   registry authority, gate scripts and all governance artifacts except the
   report path named below.
3. Verify contract granularity is maintainable and does not become a global
   function-name inventory.
4. Reconcile every active runtime model task, semantic owner and typed writer
   owner with current production.
5. Inspect every contract row against named production paths and State fields.
   Verify Schema, transforms, deterministic boundaries, writer ownership,
   current failure behavior, registered debt and focused verification are
   materially accurate.
6. Independently attack Regex/Embedding semantic and State authority,
   legacy/compliant lifecycle, semantic/runtime ownership completeness,
   call/writer limits, serial execution, retry/repair/provider/semantic
   fallback and executable verification.
7. Exercise the Money template. It must remain inadmissible with placeholders
   or unrelated domain files and require same-domain Schema, validator, writer
   and focused test sources.
8. Verify planned Inventory, Spell and Identity research contracts have a
   runnable, no-Ollama focused test and remain explicitly unapproved.
9. Verify generated Markdown exactly matches JSON and the reviewed hash anchor
   rejects unapproved edits.
10. Verify the permanent Skill applies this gate to future Prompt, Schema,
    transform, validator, embedding, Reducer and model-task changes.
11. Verify the scoped worktree contains no production/runtime/save behavior
    change, no existing business-test modification and no model request.
12. Run all unique executable tests referenced by contracts plus both focused
    governance tests. `skip` and `todo` do not count as pass.
13. Write findings first, criterion-by-criterion evidence and a final verdict
    to exactly:

```text
.trae/specs/hogwarts-validator-governance/acceptance/cross-mechanism-registry-report-attempt-3.md
```

Do not change any other file.
