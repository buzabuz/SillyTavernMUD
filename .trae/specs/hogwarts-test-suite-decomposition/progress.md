# Progress

Artifact revision: 2

Phase: complete

Active task: none

Approval: Revision 2 approved

## 2026-08-14 - Reconnaissance

User requirements:

- split `tests/hogwarts-mud.test.mjs`;
- delete tests whose tested module/behavior is retired;
- move active behavior tests to focused domain files;
- never restore retired production code to satisfy old tests;
- leave a durable deleted/moved destination list;
- add focused-test placement, technical-debt closeout, blind real-flow and
  cumulative feature-count rules to the project Skill.

Baseline:

```text
tests/hogwarts-mud.test.mjs
19,203 lines
204 tests
0 skip/todo
173 helpers.js imports
10 top-level fixture functions
```

Current execution:

```bash
node --test tests/hogwarts-mud.test.mjs
```

Result:

```text
0 business tests reached
SyntaxError: helpers.js does not provide WORLD_CHANGE_MIN_DAYS
```

Missing facade imports:

```text
applyDirectorFoundation
validateDirectorFoundation
isDailyDirectorPlanCurrent
WORLD_CHANGE_MIN_DAYS
applyTransitionWorldChanges
validateTransitionWorldChanges
getActorKnownRumors
```

Fixture evidence:

- `createSceneTransitionState()` has about 100 direct and 107 indirect uses;
- it mixes retired Foundation, old timeline and cutover behavior;
- `createSceneTransitionPackage()` has 26 uses and injects removed
  `worldChanges/relationshipUpdates`.

Current focused suite:

- 52 focused `hogwarts-mud-*.test.mjs` files already exist;
- documented shell glob automatically discovers new topic files;
- no Node runner or package script change is required;
- `hogwarts-mud-task1-baseline.test.mjs` hard-codes the monolith path and six
  title/behavior goldens.

Classification:

```text
177 move
24 delete
3 mixed rewrite and move
204 total
```

Retired deletion groups:

```text
Foundation                         1
Daily                              1
World Change/Gossip                3
no-caller temporal legacy repair   1
Scene Transition relationship      3
legacy relationship-copy           2
Social Graph V2 migration          6
old LangGraph Social V2            7
```

No project-level technical-debt ledger, feature counter or core-change
re-inventory decision gate currently exists.

## Decisions

1. Delete behavior tests only with approved retirement, no active caller and
   replacement evidence.
2. Preserve all active assertion intent; fixture obsolescence is not a reason
   to delete.
3. Build current topic fixtures before moving tests.
4. Do not copy the monolith's shared fixture.
5. Delete the monolith last.
6. Produce an exact 204-row migration manifest.
7. Start technical-debt counting at ledger introduction; do not guess history.
8. This change is `refactor`, feature delta 0, core change false.
9. The user's request is the explicit debt re-inventory following the recent
   Prompt/field/semantic core changes.

## Artifacts

- [PRD](./prd.md)
- [Technical Spec](./spec.md)
- [Tasks](./tasks.md)
- [Checklist](./checklist.md)
- [Planned Migration Manifest](./test-migration-manifest.md)
- [Living Runtime Fields](../hogwarts-runtime-contracts/state-fields.md)
- [Project Governance Skill](../../skills/hogwarts-change-governance/SKILL.md)

## Open Gate

Revision 2 requires an explicit decision on the exact retired-test correction
and the failed blind-model acceptance gate.

## 2026-08-14 - Implementation

Frozen manifest:

```text
204 unique source tests
177 move
24 delete
3 mixed
```

Execution corrected one Revision 1 classification:

- the `daily time policy` test retained current `estimateTurnMinutes()`
  behavior and removed only the retired Daily-plan-current assertions;
- the old Low `impressionOfPlayerEn/memoryUpdate` writer test was deleted
  because that writer is retired and strict focused rejection coverage exists.

Counts remain `177/24/3`.

Current fixtures:

```text
tests/hogwarts-mud-test-fixtures.mjs   676 lines
tests/hogwarts-mud-actor-fixtures.mjs  377 lines
```

They build current Actor Core/Runtime/Memory/Social through Opening World and
current normalizers. They contain no Foundation/Daily root, old timeline,
World Change, relationship-update, Social V2 or old Low writer fields.

Decomposition:

```text
21 focused destination files
180 retained tests
24 retired tests absent
0 helpers.js imports
0 destination files >= 2,000 lines
tests/hogwarts-mud.test.mjs deleted
```

The exact per-test and per-file result is in
[test-migration-manifest.md](./test-migration-manifest.md).

## Verification

Migrated suite:

```text
180 tests
180 pass
0 fail
```

Architecture ownership:

```text
Task1/Task2/Task4
21 tests
21 pass
0 fail
```

Static checks:

```text
new/affected test ESLint: passed
all Hogwarts test syntax: passed
git diff --check: passed
production source diff: empty
manifest rows: 204 unique
manifest status: 177 migrated / 24 deleted / 3 migrated-current-assertions
```

Task1 now ratchets rather than hides three pre-existing production modules over
2,000 lines. They are registered as `HTD-003`.

Full Hogwarts glob:

```text
639 tests
581 pass
58 fail
0 skipped
```

The 58 failures are confined to 20 pre-existing focused files and cover stale
Actor Context, Event/Appraisal, Identity, Social, Qdrant smoke and revision-4
fixtures. None is in the 21 new destination files or Task1/2/4. They are
registered as `HTD-004`; no compatibility export or production fallback was
restored.

## Real-save No-change

Read-only archive:

```text
data/default-user/backups/chat_hogwarts_world_director_20260814-101434.jsonl
SHA-256 3062bc06d331a8532a508e4eaacaca20272f8f80496492e6d15dc8b9152df6fa
bytes 7,123,497
stateRevision 88
```

Before/after SHA, bytes and mtime were identical.

Production Low capture:

```text
capture SHA-256 610e188b65b46e7384bf50da6a2020a8e3faec55a2b949b7ba5c425504ed4559
System 27,202 characters
User 28,344 bytes
Total 53,006 characters
```

The hash and sizes exactly match the pre-decomposition capture. No production
Prompt or source changed.

## Blind Model Result

A fresh context-free sub-agent received only the exact production request at
the hash above and returned one JSON response. It did not receive source,
tests, PRD, validators, prior output or repair feedback.

Production validation result:

```text
model responses: 1
repair responses: 0
result: failed
error:
unsupported_historical_detail on segments 6 and 8
```

The untouched response used current-turn prose that the provenance validator
classified as concrete unsupported history. No retry was issued. This is
registered as `HTD-005`.

The test decomposition did not change the Prompt or validator, so fixing this
failure would be a separate core change requiring its own approved PRD. Final
closeout therefore requires an explicit waiver for this test-only refactor or a
decision to leave the change blocked pending that core fix.

The user chose no waiver. The separate approved
`hogwarts-low-provenance-participle-fix` was implemented. It replayed the
untouched failed response successfully and a second fresh context-free response
also passed with one response and zero repair. The decomposition blind gate is
now satisfied.

## User Decisions

- Revision 2 exact disposition: approved.
- Blind gate: no waiver; keep this change blocked until a separate core fix
  passes a new fresh blind run.
- Technical-debt closeout is an assistant self-report, not a request for the
  user to author the debt list.

Assistant self-report:

```text
No unregistered shortcut debt was left by the decomposition.

Explicitly not fixed in order to keep scope:
- 58 pre-existing failures in focused suites;
- three ratcheted oversized production modules;
- the orphan retired world-changes.js module;
- blocking Knowledge synchronization latency;
- Low provenance false-positive/Prompt stability.

All are registered as HTD-001 through HTD-005.
The 180 migrated tests contain no skip/todo, compatibility restoration or
temporary production hack.
```

## Final Unblock

The separately approved provenance fix:

- passed the original failed response through the production pipeline;
- passed a second fresh context-free blind response;
- used one response and zero repair;
- left the production Prompt hash unchanged.

The user selected a fresh technical-debt re-inventory. HTD-001 through HTD-004
remain open and HTD-005 is resolved. The change ledger records this
decomposition as `refactor`, `feature_delta=0`, `core_change=no`.

Final full glob after adding the provenance regression:

```text
640 tests
582 pass
58 fail
```

The same 58 pre-existing focused-test failures remain; no decomposition or
provenance-fix test fails.
