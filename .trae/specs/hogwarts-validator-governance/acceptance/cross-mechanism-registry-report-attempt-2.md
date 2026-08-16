# Cross-Mechanism Validation Registry - Independent Acceptance Attempt 2

## Fresh-Context Declaration

I started from the supplied task input without parent conversation history,
implementation summary, or expected result. I derived acceptance from the
project goal and listed authoritative artifacts.

## Findings

### F1 - Critical - New-domain admission accepts missing semantic ownership

The gate does not require a new `state_proposal` contract to name a semantic
owner or any runtime field.

- `validateContract()` checks only that `semanticOwnerIds` and
  `stateFieldRefs` are string arrays
  (`validate-validation-responsibility.mjs:228-243`).
- It requires non-empty Schema, validator, and test arrays, but not non-empty
  semantic ownership or State fields
  (`validate-validation-responsibility.mjs:244-255`).
- I independently mutated planned `VCON-018` in memory to set both arrays to
  `[]`, updated the in-memory reviewed hash, and ran the real validator. It
  returned `valid: true` with all 23 contracts.
- This contradicts the Skill requirement that every contract register
  semantics ownership and reconcile living runtime fields
  (`SKILL.md:404-425`).

The Money self-test exposes the related path-binding weakness. It declares a
`money_reducer`, but fills Money's Schema, transform, validator, writer, and
test with existing Item files, including
`tests/hogwarts-mud-item-system-v2.test.mjs`, and calls the result complete
(`validate-validation-responsibility.mjs:979-1040`). The gate checks path
existence and filename shape, not whether those files implement or test Money.
Therefore Money becomes structurally admissible without a Money deterministic
boundary, Money writer source, or Money-focused executable test.

This fails task criteria 7 and 8 and the core future-domain goal.

### F2 - High - Current contract settlement inventories do not match production

Several accepted registry rows omit material writers or State fields:

- `VCON-006` registers only `pacingDirector`
  (`VALIDATION_RESPONSIBILITY_REGISTRY.json:468-481`), but
  `applyPacingAssessment()` also settles `causalCollapse`, map room state,
  Items, Social Graph, Actor state, and Scene pacing pressure
  (`pacing-reducer.js:62-190`, `260-330`, `930-987`).
- `VCON-007` names `workflows/turn.js` as the `turn_reducer` writer source
  (`VALIDATION_RESPONSIBILITY_REGISTRY.json:514-527`), while the actual typed
  settlement function is `applyTurnTransaction()` in
  `domain/turn-reducer.js:103-140`.
- `VCON-008` names only the workflow as writer and lists five field families
  (`VALIDATION_RESPONSIBILITY_REGISTRY.json:560-573`). The actual settlement
  owner is `applySceneTransition()` in
  `domain/archive-projection.js:327-731`; it additionally writes Calendar,
  Map, Appraisals, Cohorts, local presence, Items, `sceneTransition`,
  `pacingDirector`, `memoryDirector`, Turn, and Spatial State.
- `VCON-010` lists only `socialGraph` and `actorMemoryIndex`
  (`VALIDATION_RESPONSIBILITY_REGISTRY.json:652-665`), while its reducer applies
  reported Events, Appraisals, memory consolidation, Person Schemas, and Social
  Graph settlement (`social-v3-reducer.js:250-404`). Its workflow also writes
  `socialGraph` and `memoryDirector` lifecycle/failure fields
  (`social-memory.js:1808-1893`, `1900-2100`).

These omissions are not recorded in the rows' `currentDebt`. The machine gate
cannot detect them because it checks path existence, not production ownership
or field coverage. This fails task criterion 5.

### F3 - High - Complete referenced verification cannot be executed under the contract

`VCON-018`, `VCON-019`, and `VCON-020` all use
`ollama-validator-benchmark.mjs` as their only `testSources`
(`VALIDATION_RESPONSIBILITY_REGISTRY.json:1020-1063`, `1066-1109`,
`1112-1155`).

That file is not a deterministic test entry:

- its default suite is `all` and output is `results.json`
  (`ollama-validator-benchmark.mjs:1750-1794`);
- it starts/contacts Ollama and calls `/api/chat`
  (`ollama-validator-benchmark.mjs:1800-1837`, `2271-2272`);
- every execution creates the output directory and writes a result file
  (`ollama-validator-benchmark.mjs:5156-5194`, `5272-5279`);
- it has no read-only/self-test mode.

Running it would violate this acceptance task's report-only write constraint
and the zero-model-request scope. I therefore syntax-checked it but did not
execute it. The gate nevertheless accepts any `.mjs` under the benchmark
directory as executable verification
(`validate-validation-responsibility.mjs:445-453`).

This fails task criterion 12 and leaves the planned contracts without a
runnable focused acceptance test.

## Criterion Results

| # | Criterion | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Fresh independent derivation | PASS | Fresh-context declaration above; no prior report used |
| 2 | Read-only acceptance | PASS | No production, test, registry, governance, migration, or save file edited |
| 3 | Maintainable contract granularity | PASS | 23 model-output/semantic-settlement contracts; no global helper-function inventory |
| 4 | Active tasks and regex owners reconcile | PASS | 16/16 active tasks covered exactly once; 221 semantic rows map exactly to 12 catalog owners |
| 5 | Contract rows match production paths and behavior | **FAIL** | F2 |
| 6 | Regex/Embedding mechanism boundary | PASS | Gate rejects Regex semantic ownership and Embedding verdict/writer mutations; Knowledge remains retrieval-only |
| 7 | Lifecycle and completeness attacks | **FAIL** | F1; empty semantic owner and State fields pass |
| 8 | Money template | **FAIL** | F1; unrelated Item boundaries/test are accepted as complete Money metadata |
| 9 | Generated Markdown and hash anchor | PASS | JSON SHA-256 is `9d49f3030346c5f9da036dcba425885922f5d3bdf8be5148580329a53dbacddf`; generated report is byte-exact |
| 10 | Permanent Skill gate | PASS | `SKILL.md:386-446` applies the gate to Prompt, Schema, transforms, validators, embedding, Reducers, and model tasks |
| 11 | Zero production behavior change | PASS | Scoped Git diff has no production/runtime/save path and no existing business-test modification; no model request was made |
| 12 | All referenced executable tests | **FAIL** | 19 contract Node test files plus focused registry test passed; the three planned rows' only benchmark test source is not safely runnable (F3) |

## Verification Evidence

Successful deterministic checks:

```text
node .trae/skills/hogwarts-change-governance/scripts/validate-validation-responsibility.mjs --self-test --check-report
  valid=true; contracts=23; activeModelTasks=16; semanticOwners=12;
  legacyContracts=20; selfTests=20

node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs --require-classified
  rows=578; accepted_lexical=355; semantic_runtime=195;
  semantic_migration=26; dead_or_retired=2; unclassified=0

node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs --self-test-semantic-gate
  passed

node --test --test-concurrency=1 <19 referenced test files> \
  tests/hogwarts-mud-validation-responsibility-registry.test.mjs
  tests=227; pass=227; fail=0; skipped=0; todo=0
```

Additional evidence:

- all registry source/test paths exist;
- generated Markdown exactly equals `--print-report`;
- the reviewed JSON SHA-256 matches both the gate and generated Markdown;
- no `skip` or `todo` marker exists in the executed test set;
- the benchmark passed `node --check` but was not executed for the reasons in
  F3;
- unrelated dirty-worktree artifacts were excluded from the scoped change
  assessment.

## Final Verdict

**FAIL - cross-mechanism registry acceptance is blocked.**

The registry has useful task reconciliation, mechanism labels, immutable
legacy/compliant anchors, generated-report integrity, and green focused tests.
It does not yet enforce complete new-domain semantic/runtime ownership, its
Money admission proof accepts unrelated implementation/test paths, several
current rows are materially inaccurate against production settlement, and the
planned contracts do not name a runnable focused test.
