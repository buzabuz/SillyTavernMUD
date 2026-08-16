# Cross-Mechanism Validation Registry - Independent Acceptance Report

## Fresh-Context Declaration

I began this verification without parent conversation history, hidden
implementation context, or an expected pass/fail result. I derived the checks
from the task input, project goal, authoritative artifacts, registry, gate, and
named production paths.

## Findings

### F1 - Critical - The gate permits Regex semantic authority and Embedding State ownership

The permanent Skill forbids Regex and Embedding from owning semantic verdicts,
rejection authority, or State writes. The executable gate does not enforce the
complete rule:

- `validateContract()` rejects an Embedding owner in `semanticOwnerIds`, but
  does not reject a `regex_shape` owner
  (`validate-validation-responsibility.mjs:292-309`).
- A State-writing contract needs only a non-`none` `writerOwnerId` and one
  writer path; the writer ID is not reconciled with mechanism ownership
  (`validate-validation-responsibility.mjs:233-243`).

Independent in-memory mutations through the gate's real `validateRegistry()`
were both accepted with zero errors:

1. change `dynamic_4b_inventory.mechanismId` to `regex_shape`;
2. set `VCON-018.writerOwnerId` to
   `embedding_candidate_retrieval`.

This fails the core mechanism boundary. A future Money-style contract can
present Regex as its semantic owner or Embedding as its State writer while the
gate remains green.

### F2 - Critical - New `legacy_registered` exemptions are not frozen

`legacyContractIds` is registry-controlled data, not an independently frozen
set. The gate considers a contract legacy whenever its ID is in that mutable
array. The built-in mutation test adds a legacy contract without adding its ID
to the array, so it does not test the actual bypass.

An independent mutation that added `VCON-999` to both `contracts` and
`legacyContractIds`, with status `legacy_registered`, passed
`validateRegistry()` with zero errors. The SHA anchor detects an unreviewed
byte change, but every legitimate future registry edit also requires an anchor
update; after that update, the gate does not preserve the original 17-row
legacy boundary.

This violates the requirement that existing legacy debt is frozen and cannot
be copied as a new exemption.

### F3 - Critical - New-domain completeness is path-shaped rather than responsibility-complete

The gate accepted all of these independent mutations with zero errors:

- a new contract declaring two current routed calls while retaining a target
  of one;
- two writer source files;
- a governance PRD Markdown file as the only "focused test";
- direct promotion of a new contract to `compliant` after changing only the
  Schema authority string.

The causes are:

- only `targetWorstCallsWhenTriggered` is bounded; current normal/worst calls
  are not checked (`validate-validation-responsibility.mjs:335-369`);
- writer paths are checked only for non-emptiness, not one writer boundary
  (`:233-243`);
- `testSources` is checked only for non-emptiness and path existence
  (`:219-231`);
- `allowedInitialStatuses` includes `compliant`
  (`VALIDATION_RESPONSIBILITY_REGISTRY.json:1024-1028`);
- provider fallback is a global target policy, but there is no per-contract
  current/target provider-fallback field.

The built-in Money positive case reinforces the weakness: it points the
Schema, transform, validator, writer, and test roles to the gate script itself
(`validate-validation-responsibility.mjs:773-806`). It proves field presence,
not that Money's deterministic boundary, Reducer, or focused tests exist.

The three planned Phase 2 contracts likewise use an acceptance Markdown report
as `testSources`, not focused test code
(`VALIDATION_RESPONSIBILITY_REGISTRY.json:892-1021`).

### F4 - High - Current contract rows misstate production ownership and failure behavior

The row-to-source audit found concrete inaccurate rows:

- `VCON-001` declares character polish to be display-only with
  `no_state_write` and no writer
  (`VALIDATION_RESPONSIBILITY_REGISTRY.json:143-185`). Production places the
  model output in `#hpmud_polished_background`, then `startGameFromSetup()`
  collects it and persists the normalized value into world `character`
  (`ui/setup-controller.js:531-581,602-664`;
  `domain/character.js:141-149,332-338`). Its named
  `hogwarts-mud-task1-baseline.test.mjs` is a structural module baseline and
  contains no character-polish assertion.
- `VCON-004` names `calendar-reducer.js` as the only writer for
  `calendar.horizon` (`VALIDATION_RESPONSIBILITY_REGISTRY.json:275-317`), but
  the workflow directly writes `next.calendar.horizon` before guarded
  persistence (`workflows/medium-calendar-director.js:1182-1245`).
- `VCON-006` names `pacing_reducer` but omits
  `domain/pacing-reducer.js` from writer sources
  (`VALIDATION_RESPONSIBILITY_REGISTRY.json:363-405`). That file performs the
  accepted settlement (`domain/pacing-reducer.js:62-78,965-986`). The row also
  says `pacing_state_unchanged` on failure, while the workflow persists
  `pacingDirector.status=failed`, the error, and reassessment metadata
  (`workflows/directors.js:883-899`).
- `VCON-005` registers `map.interiorMapGeneration` but omits the workflow that
  directly writes and persists its ready, waiting, generating,
  language-skipped, and failed states
  (`workflows/interior-map.js:300-504`).

Existing debt may remain `legacy_registered`, but inaccurate writer and
failure ownership cannot serve as a maintainable registry.

## Criterion-By-Criterion Result

| # | Criterion | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Fresh independent derivation | PASS | Fresh-context declaration above; no expected verdict was supplied. |
| 2 | Read-only acceptance scope | PASS | No production, test, migration, save, registry, script, or governance authority was edited. This report is the only verifier write. |
| 3 | Maintainable contract granularity | PASS | 20 domain-level model-output/semantic-settlement contracts are registered; internal helper function names were not expanded into a global inventory. |
| 4 | Active tasks and semantic Regex owners reconcile | PASS | All 16 active `MODEL_TASK_CATALOG` tasks appear exactly once. The 221 semantic rows reconcile to all 12 owner IDs with counts `195 runtime + 26 migration`; inventory is `578` rows with `0` unclassified. |
| 5 | Contract rows match production paths | FAIL | F4 proves inaccurate State-write, writer-source, failure, and verification ownership. |
| 6 | Regex and Embedding cannot own verdicts or writes | FAIL | F1's two forbidden mutations were accepted. |
| 7 | New-contract lifecycle, failure, calls, writers, and tests are enforced | FAIL | F2 and F3 prove bypasses for new legacy status, direct compliance, two calls, multiple writers, and non-test verification. |
| 8 | Gate and Money-style adversarial onboarding | FAIL | Official self-test passes 12 cases, but seven additional forbidden mutations were accepted; the Money positive case uses the gate script as every implementation/test role. |
| 9 | Generated Markdown and reviewed hash | PASS | `--check-report` passed; generated output compared byte-for-byte; JSON SHA-256 is `fc8ce5c56ac41591e1aebe9e9302760335fab3096bca822bfb2f73a037fc8475`; an in-memory one-byte tamper failed with exit 1 and a hash mismatch. |
| 10 | Permanent Skill requires the future gate | PASS | `SKILL.md:386-436` applies it to Prompt, Schema, parse/transform, validator, semantic model, Embedding, Reducer, and model-task work and requires self-test/report checks. |
| 11 | Zero production behavior and no model request | PASS | Scoped Git checks found no modified or untracked path under `public/`, `src/`, or `tests/`, and no save candidate. No Ollama, paid-model, or browser request was made. |

## Verification Record

- `validate-validation-responsibility.mjs --self-test`: PASS,
  `20` contracts, `16` active tasks, `12` owners, `17` legacy contracts,
  `12` built-in mutations.
- `validate-validation-responsibility.mjs --check-report`: PASS.
- `inventory-regex.mjs --require-classified`: PASS,
  `578 / 355 / 195 / 26 / 2 / 0`, semantic total `221`.
- All unique named test files under `tests/`: PASS,
  `213 passed / 0 failed / 0 skipped / 0 todo`.
- Independent in-memory adversarial cases: FAIL, all seven forbidden cases
  were accepted.
- Hash-tamper case: PASS, rejected before registry validation.

## Final Verdict

**FAIL - NOT ACCEPTED.**

The generated view, hash anchor, active-task coverage, semantic-owner
reconciliation, Skill integration, tests, and zero-behavior scope all pass.
They do not compensate for a gate that accepts forbidden mechanism ownership,
new legacy exemptions, unverified writers/tests/call policies, direct
compliance, and inaccurate current rows. The project goal is not yet met.
