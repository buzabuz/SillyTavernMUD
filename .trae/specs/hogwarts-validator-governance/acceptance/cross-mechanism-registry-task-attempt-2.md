# Cross-Mechanism Validation Registry - Independent Acceptance Attempt 2

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
State, migration or save changes; one focused governance test is allowed.
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
tests/hogwarts-mud-validation-responsibility-registry.test.mjs
HOGWARTS_MUD_PRODUCT_SPEC.md
```

Instructions:

1. Start from fresh context and derive acceptance independently from the user
   goal and governed artifacts. Do not assume the main agent's conclusion.
2. Work read-only with respect to production code, tests, migrations, saves,
   registry authority, gate script and all governance artifacts except the
   report path named below.
3. Verify the registry granularity is maintainable: model-output and
   semantic-settlement contracts are registered, while internal helper
   assertions are not turned into a global function-name inventory.
4. Reconcile every active runtime model task with exactly one contract and
   every current semantic-regex target owner with the owner catalog.
5. Inspect every contract row against named production paths. Verify Schema,
   transforms, deterministic boundaries, writer ownership, current failure
   behavior, registered debt and focused verification are accurate.
6. Independently attack the mechanism boundary. Regex and Embedding must not
   become semantic verdicts, rejection authority or State writers.
7. Independently attack lifecycle and completeness gates. New contracts must
   not gain legacy/compliant status, multiple calls/writers, non-serial
   execution, retry/repair/provider/semantic fallback, non-executable tests,
   missing responsibilities or unregistered owners.
8. Exercise the Money template. It must begin planned, fail admission while
   owner/source/test placeholders are unresolved, and become structurally
   admissible only after one semantic owner, deterministic boundary, typed
   writer, failure/call policy and executable focused test are named.
9. Verify the generated Markdown is an exact view of JSON authority and the
   reviewed hash anchor detects unapproved registry edits.
10. Verify the permanent Skill requires this gate for future Prompt, Schema,
    transform, validator, embedding, Reducer and model-task changes.
11. Verify the scoped worktree contains no production/runtime/save behavior
    change, no existing business-test modification and no model request.
12. Run all unique executable test files referenced by contracts plus the
    focused registry test. `skip` and `todo` do not count as pass.
13. Write findings first, criterion-by-criterion evidence and a final verdict
    to exactly:

```text
.trae/specs/hogwarts-validator-governance/acceptance/cross-mechanism-registry-report-attempt-2.md
```

Do not change any other file.
