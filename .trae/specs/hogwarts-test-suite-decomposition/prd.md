# Hogwarts Test Suite Decomposition

Artifact revision: 2

Status: implemented and verified. Revision 2 approved.

Change ID: `hogwarts-test-suite-decomposition`

Change kind: `refactor`

Feature delta: `0`

Core change: `false`

## Problem and Evidence

`tests/hogwarts-mud.test.mjs` is a 19,203-line monolith containing 204 tests,
173 imports from the broad `helpers.js` facade, ten shared top-level fixture
functions and behavior from nearly every Hogwarts domain.

The file no longer reaches a single assertion:

```text
SyntaxError:
helpers.js does not provide WORLD_CHANGE_MIN_DAYS
```

The facade import currently requests seven symbols that are no longer exported:

```text
applyDirectorFoundation
validateDirectorFoundation
isDailyDirectorPlanCurrent
WORLD_CHANGE_MIN_DAYS
applyTransitionWorldChanges
validateTransitionWorldChanges
getActorKnownRumors
```

This is not evidence that production should restore those exports. Approved
Prompt consolidation and lifecycle cutovers retired Foundation, Opening Scene
Plan, Opening Dialogue, Daily, free-text World Change/Gossip and the old Social
V2 writers.

The main fixture is also stale:

- `createSceneTransitionState()` is used directly by about 100 tests and
  indirectly by about 107;
- it constructs current tests through retired Foundation data, old `timeline`
  and Actor Context cutover;
- `createSceneTransitionPackage()` is used by 26 tests and injects removed
  `worldChanges` and `relationshipUpdates` by default.

Copying those fixtures into smaller files would preserve the defect while
making it harder to see.

The repository already has 52 focused Hogwarts test files. New
`hogwarts-mud-*.test.mjs` files are automatically included by the documented
shell glob. No runner change is required. `tests/hogwarts-mud-task1-baseline`
does, however, hard-code the monolith path and six test-title golden checks.

No project-wide technical-debt ledger or feature-change counter currently
exists. Debt and residual failures are scattered across change progress files
and can become stale.

## Classification Baseline

All 204 monolith tests have been classified:

| Action | Count | Rule |
| --- | ---: | --- |
| Move with the same active assertion intent | 177 | Production behavior still has a current reader/writer |
| Delete | 24 | The tested behavior itself is retired and has no production caller |
| Strip retired assertions, then move the active test | 3 | One test mixes current and retired behavior |
| Total | 204 | Every source test must appear exactly once in the final manifest |

The 24 deletion candidates are:

| Retired area | Count | Authority |
| --- | ---: | --- |
| Director Foundation | 1 | Replaced by Opening World |
| Low opinion/memory writer | 1 | Low may no longer write `impressionOfPlayerEn` or `memoryUpdate`; current focused contract tests retain rejection coverage |
| World Change/Gossip | 3 | Removed by timeline/Appraisal revision 4 |
| Temporal legacy repair with no production caller | 1 | No current reader/writer |
| Scene Transition `relationshipUpdates` writer | 3 | Removed; Appraisal/Social own the facts |
| Legacy relationship-copy migration | 2 | Removed by reference-only memory/social cutover |
| Social Graph V2 migration behavior | 6 | Superseded by Social V3 cutover |
| Old LangGraph Social V2 reducer behavior | 7 | Superseded by Social V3 reducer |

The three mixed tests retain current behavior but remove:

- `worldChanges` from compact transition assertions;
- news/gossip assertions from the Calendar clock-jump test;
- legacy `statements` assertions from memory consolidation.

The source test named `daily time policy advances ordinary turns locally
without a per-turn director decision` is retained because its
`estimateTurnMinutes()` assertions cover the current deterministic owner. Only
its retired `isDailyDirectorPlanCurrent()` assertions are removed. This
field-level correction replaces the Revision 1 assumption that the whole test
was a retired Daily behavior test.

Deletion requires all three forms of evidence:

1. an approved PRD/living contract marks the behavior retired;
2. the production call graph has no active caller;
3. the replacement has focused current-contract coverage where replacement
   behavior exists.

A failing or inconvenient test is never sufficient deletion evidence.

## Before

```text
tests/hogwarts-mud.test.mjs
  -> 204 unrelated tests
  -> broad helpers.js facade
  -> shared retired fixture defaults
  -> module-instantiation failure
  -> no business assertion runs
```

There is no durable answer to:

- which tests were removed because their product behavior retired;
- which active tests moved to which owner;
- which current fixture replaced retired Foundation/Daily/World Change state;
- whether a later feature left a shortcut, skipped test or temporary hack;
- how many feature additions occurred since the last technical-debt review.

## After

```text
current production domain
  -> one focused test owner
  -> direct focused-module imports
  -> current-contract local fixture
  -> independently executable test file

test-migration-manifest.md
  -> every original title
  -> move/delete/mixed action
  -> destination or retirement authority
  -> final verification status

.trae/specs/TECH_DEBT.md
  -> stable debt IDs
  -> per-change completion answer
  -> feature-change count
  -> core-change review decision
```

`tests/hogwarts-mud.test.mjs` is deleted after and only after all 204 source
tests are accounted for.

## Test Ownership

New domain-owned files:

```text
tests/hogwarts-mud-json-recovery.test.mjs
tests/hogwarts-mud-translation.test.mjs
tests/hogwarts-mud-preset-import.test.mjs
tests/hogwarts-mud-movement-spatial.test.mjs
tests/hogwarts-mud-material-state.test.mjs
tests/hogwarts-mud-turn-protocol.test.mjs
tests/hogwarts-mud-scene-transition.test.mjs
tests/hogwarts-mud-pacing-cast.test.mjs
tests/hogwarts-mud-turn-recovery.test.mjs
tests/hogwarts-mud-relationship-graph.test.mjs
tests/hogwarts-mud-spell-action-check.test.mjs
tests/hogwarts-mud-map-cartography.test.mjs
```

Existing focused owners may receive tests only while they remain focused:

```text
Knowledge      -> hogwarts-mud-knowledge-v2.test.mjs
Bootstrap      -> hogwarts-mud-prompt-payload-consolidation.test.mjs
Memory         -> hogwarts-mud-memory-scene-boundary.test.mjs
Social V3      -> hogwarts-mud-social-v3.test.mjs
Calendar       -> hogwarts-mud-calendar-reducer-projection.test.mjs
Presence       -> hogwarts-mud-presence-contract.test.mjs
Context budget -> hogwarts-mud-task8-call-budget.test.mjs
```

An existing file already above 1,500 lines does not receive another unrelated
block. A new topic file has a 1,200-line soft target and a strict `<2,000` line
limit. Shared fixture support has a 600-line soft target and a strict `<1,000`
line limit.

New and moved tests import focused production modules directly. They do not use
`helpers.js` as a general dependency source.

Task-number names are retained only for existing architectural acceptance
files. New domain behavior tests use domain names.

## Fixture Rules

The old general fixture is not moved.

1. Build a minimal current-version base State using current constructors and
   current Actor Core/Runtime/Memory/Social versions.
2. Build topic-specific movement, transition, material, spell and Calendar
   fixtures from that base.
3. Do not create `directorFoundation`, `dailyDirector`, old `timeline`,
   `worldChanges`, `relationshipUpdates`, legacy Social V2 or old Low
   `memoryUpdate/impressionOfPlayerEn` fields.
4. A fixture may provide input evidence. It may not hand-construct the expected
   reducer result.
5. Each migrated test must reach its intended business assertion. Setup failure
   is a failed migration.
6. Shared fixture code contains builders only, not assertions or production
   compatibility behavior.

## In Scope

- classify all 204 monolith tests;
- delete 24 tests whose tested behavior is retired;
- migrate 177 active tests without changing their assertion intent;
- rewrite three mixed tests to remove only retired assertions;
- replace stale shared fixtures with bounded current-contract fixtures;
- update hard-coded golden ownership in
  `hogwarts-mud-task1-baseline.test.mjs`;
- remove retired `world-changes` coverage from active facade/module-boundary
  test lists;
- delete `tests/hogwarts-mud.test.mjs`;
- produce `test-migration-manifest.md` with exact per-test disposition;
- create `.trae/specs/TECH_DEBT.md`;
- update `hogwarts-change-governance/SKILL.md`;
- run focused, full Hogwarts, real-save and blind-model verification.

## Non-Goals

- restoring any retired production export, caller, field, reducer or fallback;
- changing Hogwarts runtime behavior, State data, Prompt content, frontend or
  save files;
- fixing unrelated failing test suites outside the migrated monolith;
- deleting active tests merely because another file has similar coverage;
- rewriting production modules to make fixture construction easier;
- adding a new test framework or changing Node/Jest/Playwright runners;
- retroactively guessing all historical feature counts;
- turning old progress/checklist text into debt without re-verifying it.

## Runtime Contract Impact

Runtime field impact: None.

This change edits test files, test fixtures, governance documents and the
project Skill only. It does not add, remove, read, write or migrate a production
State, message, Prompt, Knowledge, UI session or frontend projection field.

The living `state-fields.md` registry therefore needs no field-row change.

## Migration and Compatibility

This is a test-artifact cutover, not a save migration.

| Artifact | Before | After | Compatibility |
| --- | --- | --- | --- |
| Monolith | 19,203 lines, 204 tests | deleted | no wrapper or forwarding import |
| Active tests | broad facade and stale shared fixture | focused owner and current fixture | assertion intent preserved |
| Retired tests | execute or block imports | deleted with retirement evidence | no retired production restoration |
| Mixed tests | current and retired assertions together | current assertions only | removed assertion listed in manifest |
| Golden ownership | six titles point to monolith | titles point to focused files | no monolith alias |
| Test discovery | documented shell glob | same shell glob | no runner change |

Rollback is a Git revert of the test/governance commit. It does not touch
State, chat, Knowledge indexes or Qdrant.

## Technical Debt Ledger

Create one project-level ledger:

```text
.trae/specs/TECH_DEBT.md
```

It contains machine-readable header values:

```text
schema_version
counting_since
change_count
feature_count
last_reinventory_feature_count
```

It contains:

1. a debt table with stable ID, status, severity, area, summary, evidence,
   introduced-by change, owner change, review trigger and last-reviewed date;
2. a change ledger with sequence, change ID, kind, feature delta, core-change
   flag, completion debt answer, debt delta, review-prompted flag, user
   decision and close date.

Counting starts when this ledger is introduced. Historical feature totals are
not guessed.

Rules:

- `kind=feature` has `feature_delta=1`;
- `fix`, `refactor` and `governance` have `feature_delta=0`;
- `feature_count` equals the sum of all feature deltas;
- every completed Hogwarts change appends exactly one change-ledger row;
- every closeout requires the assistant to ask itself and answer:

  > 这次为了快，有没有留下什么以后要还的账？比如塞进了不该塞的大文件、跳过了哪些测试、临时 hack 了哪里？

- the assistant reports and records its own answer even when it is `无`; the
  user may correct it but is not asked to author it;
- scheduler/composition-root, persistence/migration, Prompt/Schema/Validator/
  Reducer, Knowledge backend or living runtime-contract changes are
  `core_change=true`;
- after every core change, before completion, the assistant must tell the user
  the current feature count and ask whether to re-inventory technical debt;
- `reinventory` and `defer` are both legal decisions, but the prompt and answer
  must be recorded;
- a debt candidate is added only after current code/evidence confirms it.

The user's current request is the explicit re-inventory following the recent
Prompt/field/semantic core changes. This test-suite change itself is a
refactor, with feature delta 0 and no runtime core change.

## Skill Contract

Update `.trae/skills/hogwarts-change-governance/SKILL.md` to require:

1. new tests go to the smallest existing domain owner or a new domain-named
   focused file, never the old monolith or a generic catch-all;
2. every completed change asks the standardized debt question and records the
   answer in `TECH_DEBT.md`;
3. synthetic tests never constitute final model-behavior evidence; affected
   model paths use a fresh context-free sub-agent with the exact production
   request and real parser/validator/reducer path;
4. every change records kind, feature delta and core-change status;
5. every core change reports the cumulative feature count and asks the user
   whether to re-inventory debt before closeout;
6. test migration never restores retired production behavior to satisfy an old
   test.

## Prompt Field Budget

None.

No Prompt, Schema, model request or output contract changes. Before/after
production Prompt hashes must remain identical. The existing real production
Low capture is used only as no-change evidence.

## Frontend Field Whitelist

None.

No frontend field or UI behavior changes.

## Acceptance Criteria

1. `tests/hogwarts-mud.test.mjs` no longer exists.
2. The final manifest contains exactly 204 unique source-test rows:
   177 move, 24 delete and 3 mixed-rewrite.
3. Every deleted row names retirement authority and confirms no production
   caller.
4. Every moved row names a focused destination and reaches its business
   assertion through current fixtures.
5. No new/moved test imports the broad `helpers.js` facade.
6. No test restores or depends on retired Foundation, Daily, World
   Change/Gossip, Social V2, relationship-copy or old Low-writer contracts.
7. Retirement-accounting tests remain and prove retired model tasks have no
   runtime entry.
8. `task1-baseline` golden ownership points to the new focused files.
9. New topic test files are under 2,000 lines; shared fixture support is under
   1,000 lines.
10. Every new/affected focused file passes independently.
11. The documented full Hogwarts glob discovers all new files and shows no new
    failure attributable to decomposition.
12. Production source diff is empty; only tests, change artifacts, the
    technical-debt ledger and governance Skill change.
13. Real Tina archive SHA/bytes/mtime and production Prompt hash remain
    unchanged.
14. A fresh context-free sub-agent runs the exact unchanged production Low
    request once; the untouched response passes the real production pipeline
    without repair.
15. `TECH_DEBT.md` counts derive from its ledger and contains the closeout debt
    answer.
16. The governance Skill contains all six rules in the Skill Contract section.
17. No save, Knowledge index, Qdrant collection or user data is written.

## Risks and Rollback

### Risk: deleting an active regression

Mitigation: every original title is manifest-accounted; deletion requires
retirement PRD, call-graph and replacement evidence.

### Risk: making twelve smaller monoliths

Mitigation: domain names, direct imports, line limits and bounded fixture
support.

### Risk: copying retired fixture semantics

Mitigation: current constructors/versions first; forbidden-field searches and
no facade imports.

### Risk: apparent pass from setup failure or skipped test

Mitigation: no skip/todo migration; each file runs independently and assertions
must be reached.

### Risk: TECH_DEBT becomes stale prose

Mitigation: stable IDs, structured counters, one closeout row per change and
mandatory user decision for core-change re-inventory.

Rollback is one Git revert. There is no runtime/data rollback.

## Approval

Approval status: Revision 2 approved by the user.

Closeout decision: do not waive the failed blind gate. Complete a separate
Prompt/provenance core fix and rerun a fresh blind validation first.
