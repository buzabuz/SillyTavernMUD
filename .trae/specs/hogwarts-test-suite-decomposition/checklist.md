# Acceptance Checklist

Artifact revision: 2

## Scope and Authority

- [x] The existing stable change ID is genuinely distinct.
- [x] Runtime field impact is explicitly `None`.
- [x] Prompt impact is explicitly `None`.
- [x] Frontend field whitelist is explicitly `None`.
- [x] The current production call graph, not the monolith fixture, decides
      whether behavior is active.
- [x] The four retired model tasks are confirmed by the registry and approved
      Prompt consolidation PRD.
- [x] World Change/Gossip and Social V2 retirement is confirmed by approved
      lifecycle/Social contracts.
- [x] Current test discovery and hard-coded monolith references are mapped.
- [x] Artifact revision 1 received explicit user approval.
- [x] Artifact revision 2 exact-disposition correction and blind-gate decision
      received explicit user approval.

## Manifest

- [x] `test-migration-manifest.md` contains 204 unique source rows.
- [x] Manifest summary is exactly 177 move, 24 delete and 3 mixed.
- [x] Every delete row includes approved retirement authority.
- [x] Every delete row includes no-active-caller evidence.
- [x] Every move/mixed row names a destination and fixture owner.
- [x] Every mixed row lists the exact retired assertion removed.
- [x] Final file-level summary includes line count/imports/verification.

## Fixture Cutover

- [x] Retired `createDirectorFoundation()` fixture is not copied.
- [x] Current base fixture uses current Actor/Memory/Social versions.
- [x] Topic fixtures are minimal and do not contain expected outputs.
- [x] No fixture contains `directorFoundation` or `dailyDirector`.
- [x] No fixture contains old `timeline`, `worldChanges` or
      `relationshipUpdates`.
- [x] No fixture contains Social V2 copies or old Low memory/opinion writers.
- [x] Shared fixture support is under 1,000 lines.

## Retired Behavior Deletion

- [x] Foundation behavior test is deleted.
- [x] Retired Low opinion/memory writer test is deleted.
- [x] Deterministic time-policy assertions survive without the Daily guard.
- [x] Three World Change/Gossip behavior tests are deleted.
- [x] No-caller temporal legacy repair test is deleted.
- [x] Three Scene Transition relationship writer tests are deleted.
- [x] Two legacy relationship-copy tests are deleted.
- [x] Six Social Graph V2 migration tests are deleted.
- [x] Seven old LangGraph Social V2 tests are deleted.
- [x] Retirement-accounting tests remain.
- [x] No active test is deleted because it is inconvenient, failing or
      duplicated.

## Active Test Migration

- [x] 177 active tests preserve their assertion intent in focused owners.
- [x] Three mixed tests preserve current assertions only.
- [x] New test files use domain names, not new `taskN` names.
- [x] New/moved tests import focused production modules directly.
- [x] No new/moved test imports `helpers.js`.
- [x] Existing files above the size target do not receive unrelated blocks.
- [x] Every new test file is under 2,000 lines.
- [x] Every migrated file reaches its business assertions independently.
- [x] No migrated test is skipped or marked todo.

## Structural Ownership

- [x] `tests/hogwarts-mud.test.mjs` is deleted last.
- [x] No active source/documentation references the monolith.
- [x] Task1 structural goldens point to focused destinations.
- [x] Task4 no longer treats retired World Change as an active module owner.
- [x] Existing runner/glob discovers all new files without compatibility
      wrappers.
- [x] Production code diff is empty.
- [x] No retired export, caller, field, reducer or fallback is restored.

## Technical Debt Ledger

- [x] `.trae/specs/TECH_DEBT.md` exists with schema version 1.
- [x] Counting start and baseline commit are explicit.
- [x] `change_count` derives from change-ledger rows.
- [x] `feature_count` derives from feature deltas.
- [x] No historical feature total is guessed.
- [x] Debt entries have stable IDs and current evidence.
- [x] This change is classified as refactor/feature delta 0/core change false.
- [x] The standardized assistant closeout self-report is recorded.
- [x] Core changes require a feature-count report and user re-inventory
      decision.

## Skill

- [x] Test Ownership Gate is added.
- [x] Focused files are preferred over monolith/catch-all files.
- [x] Retired test deletion requires retirement and no-caller evidence.
- [x] Restoring retired code for an old test is forbidden.
- [x] Every closeout asks and records the technical-debt question.
- [x] Every change records kind, feature delta and core-change status.
- [x] Core changes ask the user whether to re-inventory debt.
- [x] Fresh context-free real-flow validation remains mandatory for affected
      model paths.
- [x] Synthetic model fixtures are explicitly supplemental only.

## Verification

- [x] Every destination file passes independently.
- [x] Task1/Task2/Task4 architecture suites pass.
- [x] All affected focused suites pass.
- [x] Full Hogwarts glob discovers the decomposed suite.
- [x] No new full-suite failure is attributable to decomposition.
- [x] Existing unrelated failures are registered, not hidden.
- [x] Test ESLint, syntax and `git diff --check` pass.
- [x] Manifest counts and file-size gates pass.
- [x] Tina SHA/bytes/mtime are unchanged.
- [x] Production Low Prompt hash is unchanged.
- [x] Fresh context-free agent receives only the exact production request.
- [x] Untouched blind response passes parser/settlement/validator/reducer
      after the separately approved provenance fix.
- [x] Blind flow uses one model response and zero repair responses.
- [x] No save, Knowledge or Qdrant data is written.

## Closeout

- [x] PRD and spec status are updated to implemented.
- [x] Tasks are all completed.
- [x] Progress records commands, counts, residual debt and user decision.
- [x] Final deletion/move manifest is linked from progress.
- [x] Exact deleted/moved summary is ready for the final response.
