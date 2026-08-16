# Cross-Mechanism Validation Registry - Independent Acceptance Attempt 3

## Fresh-Context Declaration

I started from the supplied task input without parent conversation history,
without reading earlier acceptance reports, and without receiving an expected
result. I derived this acceptance from the project goal and the authoritative
artifacts named in the task.

## Findings

### F-1 - BLOCKER - The Money same-domain source gate is bypassable

The future-domain gate does not prove that Schema, validator, writer, and test
sources belong to the proposed domain. It only derives the final token from
the domain and checks whether at least one file in each source group contains
that token:

- `validate-validation-responsibility.mjs:684-723`
- `domainBindingToken()` reduces `phase2_dynamic_money` to `money`.
- Source ownership is not reconciled with exports, writer identity, runtime
  fields, or a domain-owned test.

Independent in-memory attack, with no worktree edit:

1. Added otherwise valid `dynamic_4b_money` and `money_reducer` catalog rows.
2. Created `VCON-025` from the Money template.
3. Pointed Schema, transform, validator, and writer sources to the unrelated
   existing Item file
   `public/scripts/extensions/hogwarts-mud/domain/item-schema.js`.
4. Pointed focused verification to
   `tests/hogwarts-mud-validation-responsibility-registry.test.mjs`.
5. The Item file already contains the Item type/token `money`; the governance
   test already contains the Money example.

Observed result:

```json
{
  "admitted": true,
  "errors": []
}
```

This is the exact forbidden outcome in the project goal: unrelated domain
files can make an incomplete Money domain appear registered.

### F-2 - BLOCKER - Serial execution and loaded-model limits are bypassable

For future contracts, `targetExecution` is accepted when it merely starts with
`serial`, and `targetMaxLoadedModels` has no integer/type validation:

- `validate-validation-responsibility.mjs:437-447`

Independent in-memory attack against planned `VCON-018`:

```text
targetExecution = "serial_and_parallel"
targetMaxLoadedModels = "unbounded"
```

Observed result:

```json
{
  "admitted": true,
  "errors": []
}
```

The string prefix passes the serial check, and JavaScript comparison of
`"unbounded" > 1` is false. The registry therefore does not mechanically
enforce serial execution or at most one loaded model.

### F-3 - BLOCKER - Two semantic owners have no VCON contract

All 12 baseline owner IDs exist in the top-level semantic owner catalog, but
two are never referenced by any contract:

```text
deterministic_migration_no_model
deterministic_sensitive_field_registry
```

They own 28 active baseline rows:

- `deterministic_migration_no_model`: 26 `semantic_migration` rows across
  Actor, Item, Identity, spatial, time, and lifecycle migration paths.
- `deterministic_sensitive_field_registry`: 2 `semantic_runtime` rows in
  `domain/save-revision.js` and `runtime/turn-diagnostics.js`.

Those paths have no stable contract ID, responsibility IDs, source chain,
State-field list, failure policy, writer, or focused verification. The gate at
`validate-validation-responsibility.mjs:582-596` checks only that each baseline
owner appears in the catalog; it never checks that each owner is used by a
contract.

This violates the permanent Skill rule that every model-output or
semantic-settlement path maps to one `VCON-*` contract.

### F-4 - HIGH - VCON-016 names the wrong persistence writer source

`VCON-016` registers `TranslationTableRecordV1`, owner
`translation_table_writer`, but names
`public/scripts/extensions/hogwarts-mud/adapters/translation.js` as its sole
writer source (`VALIDATION_RESPONSIBILITY_REGISTRY.json:933-976`).

That adapter performs translation requests and returns translated records. It
does not persist the Translation Table. The living runtime contract states
that the authenticated localization endpoint owns atomic upsert
(`state-fields.md:34-35`). The actual write chain is:

```text
public/.../adapters/localization-table.js:189-211
-> src/endpoints/hogwarts-mud.js:1210-1238
-> src/hogwarts-mud/localization-table.js:898-990
```

The registry omits the actual validator and persistence owner while presenting
the model adapter as the writer. Writer reconciliation is therefore materially
incorrect even though all registered paths exist.

### F-5 - HIGH - VCON-016's current worst-call count is inaccurate

`VCON-016` declares both normal and worst triggered calls as `1`
(`VALIDATION_RESPONSIBILITY_REGISTRY.json:967-973`).

Production supports multiple sequential calls in one translation action:

- `translateOpeningValues()` loops over all split tasks and calls
  `requestTranslation()` once per task
  (`adapters/translation.js:305-428`).
- `translateWithProvider()` loops over all chunks and calls
  `requestTranslation()` once per chunk
  (`adapters/translation.js:497-565`).
- Every `requestTranslation()` is recorded as the active
  `local_translation` model task
  (`adapters/translation.js:442-488`).

Therefore the current worst case is greater than one when input splits into
multiple chunks. Existing legacy behavior may remain frozen, but it must be
recorded accurately.

## Contract Row Audit

| Contract | Result | Production reconciliation |
| --- | --- | --- |
| `VCON-001` | PASS | Setup polish is one active task; setup workflow normalizes and writes Character V2. |
| `VCON-002` | PASS | Opening package validates and settles through `initial-world.js`. |
| `VCON-003` | PASS | High Calendar proposal maps to the Calendar reducer and storyline/beat fields. |
| `VCON-004` | PASS | Medium Calendar proposal maps to Calendar entry validation and settlement. |
| `VCON-005` | PASS | Interior proposal maps to the interior-map validator/reducer; lifecycle status is separated into `VCON-022`. |
| `VCON-006` | PASS | Pacing proposal and reducer paths, semantic-regex debt, and separate failure status are represented. |
| `VCON-007` | PASS | Scene performance Prompt, transforms, validator, turn reducer, retrieval owner, and current no-retry policy are represented. |
| `VCON-008` | PASS | Scene transition normalization, validation, archive settlement, and current legacy debt are represented. |
| `VCON-009` | PASS | Scene opening is a one-call narrative/message write with no automatic retry. |
| `VCON-010` | PASS | Social transient transform, V3 validator/reducer, retrieval, and lifecycle split are represented. |
| `VCON-011` | PASS | Map expansion Prompt, language transform, validator, and map reducer are represented. |
| `VCON-012` | PASS | Local pre-turn task, duplicated Schema, semantic reconciliation debt, and workflow settlement are represented. |
| `VCON-013` | PASS | Local post-turn task, deterministic fallback debt, observation settlement, and Identity observation source are represented. |
| `VCON-014` | PASS | Local Inventory task maps to Item semantics, validation, and Item reducer settlement. |
| `VCON-015` | PASS | Local Appraisal task maps to language adoption, Appraisal validation, and Memory Synapse reduction. |
| `VCON-016` | FAIL | Actual Translation Table writer is omitted and the current worst-call count is false. See F-4 and F-5. |
| `VCON-017` | PASS | Embedding remains candidate retrieval only; canonical hydration reapplies timeline, revision, audience, source, clock, and supersession gates; no State writer is named. |
| `VCON-018` | PASS AS PLANNED | Inventory research row is explicitly `planned_unapproved`, has a runnable retained-evidence test, and names Item settlement. Systemic call-policy enforcement still fails under F-2. |
| `VCON-019` | PASS AS PLANNED | Spell research row is explicitly `planned_unapproved`, runnable without Ollama, and names Spell settlement. |
| `VCON-020` | PASS AS PLANNED | Identity research row is explicitly `planned_unapproved`, runnable without Ollama, and names Identity settlement. |
| `VCON-021` | PASS | Medium Calendar horizon's direct workflow settlement is separately exposed as legacy debt. |
| `VCON-022` | PASS | Interior generation lifecycle status writer and fields are separately exposed. |
| `VCON-023` | PASS | Pacing workflow lifecycle status writer and fields are separately exposed. |
| `VCON-024` | PASS | Social/Memory workflow lifecycle status writer and fields are separately exposed. |

The row granularity is domain-contract based and does not become a global
function-name inventory. Its completeness and one row's production accuracy
fail for the reasons above.

## Criterion-by-Criterion Result

| Criterion | Result | Evidence |
| --- | --- | --- |
| Fresh independent acceptance | PASS | No parent history, expected verdict, memory, or earlier acceptance report was used. |
| Repository identity | PASS | Git root resolved exactly to `/Users/bytedance/sillytavern/SillyTavern`. |
| Maintainable contract granularity | PARTIAL | The 24 rows are domain contracts, not helper-function inventory, but 28 semantic rows have no contract under F-3. |
| Active model-task coverage | PASS | All 16 active tasks occur exactly once; all 4 retired catalog tasks are excluded from active coverage. |
| Semantic owner completeness | FAIL | Two of 12 owners are catalog-only and cover 28 rows without a `VCON-*`; see F-3. |
| Typed writer ownership | FAIL | All writer-owner IDs are typed and used, but `VCON-016` points at a non-writer and omits the real endpoint/service writer; see F-4. |
| Regex authority boundary | PASS | Registry and self-tests reject Regex semantic ownership; all 221 current semantic rows remain visible. |
| Embedding authority boundary | PASS | Embedding is retrieval-only in `VCON-017`; semantic verdict and writer attacks are rejected. |
| Legacy lifecycle freeze | PASS | The 21 legacy IDs are independently hard-coded; a new legacy ID is rejected even when the JSON legacy list is changed. |
| Compliant promotion | PASS | No contract is compliant; direct unanchored promotion is rejected. |
| Retry/repair/provider/semantic fallback policy | PASS | Planned contracts require current and target values to be `forbidden`; mutation self-tests reject each bypass. Legacy debt remains visible. |
| Call count, serial execution, residency | FAIL | Numeric one-call fields are checked, but serial and loaded-model controls accept adversarial values; see F-2. `VCON-016` also records a false current worst-call count under F-5. |
| Future Money template | FAIL | Placeholders fail, but unrelated Item/governance files containing `money` pass; see F-1. |
| Focused executable verification | FAIL | All registered paths execute, but the Money gate accepts an unrelated governance test as domain verification under F-1. |
| Planned Inventory/Spell/Identity research | PASS | All three remain `planned_unapproved`; the focused test reads retained evidence only and requires no Ollama call. |
| Generated Markdown equals JSON | PASS | `--check-report` passed byte-for-byte. |
| Reviewed registry hash anchor | PASS | Registry SHA-256 is `7f7b009b7a945565eb7ae0af7aaf6d02d2b84e66ba5cf15489bea0f0561694a3`; the gate rejects a mismatch before parsing. |
| Permanent Skill coverage | PASS | The Skill applies the gate before Prompt, Schema, parser, transform, validator, semantic model, embedding, Reducer, and model-task changes. |
| Zero production/runtime/save behavior change | PASS | Scoped Git inspection found no modified/untracked file under `public/.../hogwarts-mud` or `src/hogwarts-mud`, and no save path change. Registry artifacts are not imported by production. |
| Existing business-test contract unchanged | PASS | No tracked business test is modified. The two untracked tests are focused governance/research tests. |
| No model request | PASS | Acceptance invoked no Ollama or paid model. The research test reads retained JSON/harness text; model-facing unit paths use mocks. |
| Phase 2/3 remain unapproved | PASS | Tasks/checklist/PRD retain production blind acceptance, physical 8 GB evidence, and explicit approval as open gates. |

## Verification Evidence

Registry and regex gates:

```text
node --check inventory-regex.mjs                                      PASS
node --check apply-regex-review.mjs                                  PASS
node inventory-regex.mjs --self-test-semantic-gate                   PASS
node inventory-regex.mjs --require-classified                        PASS
node validate-validation-responsibility.mjs --self-test              PASS, 21 mutations
node validate-validation-responsibility.mjs --check-report           PASS
```

Regex result:

```text
578 rows
355 accepted_lexical
195 semantic_runtime
26 semantic_migration
2 dead_or_retired
0 unclassified
221 semantic total
0 retirements
```

All 20 unique contract-referenced test files plus
`tests/hogwarts-mud-validation-responsibility-registry.test.mjs`:

```text
230 tests
230 pass
0 fail
0 skipped
0 todo
```

Focused governance rerun:

```text
5 tests
5 pass
0 fail
0 skipped
0 todo
```

All 66 unique registry-referenced source/test paths exist. Green deterministic
tests do not override the independently demonstrated admission bypasses or the
production ownership mismatch.

## Final Verdict

**FAIL**

The registry is not yet a permanent enforceable pre-Phase-2 process. It can
admit a Money contract backed by unrelated files, can admit parallel/unbounded
call-policy values, leaves 28 semantic baseline rows outside any contract, and
misregisters Translation Table writer and current call ownership. Phase 2
production must remain blocked, and any correction requires another fresh
independent complete acceptance attempt.
