---
schema_version: 1
counting_since: "2026-08-14 commit d89217659"
change_count: 2
feature_count: 0
last_reinventory_feature_count: 0
---

# Hogwarts Technical Debt Ledger

This is the project-wide technical-debt and change-count authority for
Hogwarts MUD changes.

Counting begins at the baseline above. Historical feature totals are not
guessed.

## Rules

- `change_count` equals the number of rows in the Change Ledger.
- `feature_count` equals the sum of `feature_delta`.
- `kind=feature` requires `feature_delta=1`; all other kinds require `0`.
- Every completed Hogwarts change appends exactly one Change Ledger row.
- Every closeout records the answer to:

  > 这次为了快，有没有留下什么以后要还的账？比如塞进了不该塞的大文件、跳过了哪些测试、临时 hack 了哪里？

- A core change must report the current feature count and ask whether to
  re-inventory debt before closeout.
- Debt is registered only with current code/runtime evidence.

## Debt

| ID | Status | Severity | Area | Summary | Evidence | Introduced by | Owner change | Review trigger | Last reviewed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HTD-001 | open | high | Knowledge/runtime latency | Ordinary turn finalization can remain blocked while the full Knowledge projection is re-embedded; one real Tina trace recorded about 233.4 seconds between commit and final. | [`hogwarts-knowledge-activation-revision-root-fix/progress.md`](./hogwarts-knowledge-activation-revision-root-fix/progress.md#2026-08-14---post-closeout-knowledge-loading-latency) | pre-ledger core changes | future Knowledge latency change | before changing loading/index maintenance or closing the next Knowledge core change | 2026-08-14 |
| HTD-002 | open | medium | Retired production artifact | `domain/world-changes.js` has no active production importer, but the retired module remains in the tree and was still treated as active by an architecture test. This decomposition removes only the stale test ownership; deleting production is a separate approved change. | `rg "world-changes\\.js|applyTransitionWorldChanges" public src` returns only the module itself | Prompt/lifecycle cutover | future retired-artifact cleanup | before adding any new World Change/Gossip behavior or next production dead-code cleanup | 2026-08-14 |
| HTD-003 | open | medium | Module size | Three non-data production modules exceed the strict `<2,000` limit: relational retrieval 2,023 lines, Social workflow 2,063 and local semantic adjudicator 2,050. Task1 ratchets each exact existing size so none can grow; production decomposition is outside the test-only change. | `find public/scripts/extensions/hogwarts-mud src/hogwarts-mud -type f -name '*.js' ...`; `LEGACY_FILE_LIMITS` in `hogwarts-mud-task1-baseline.test.mjs` | pre-ledger core changes | future module splits | before adding behavior to any ratcheted module or closing the next related core change | 2026-08-14 |
| HTD-004 | open | high | Test contract migration | The full Hogwarts Node glob reaches 640 tests but 58 tests in 20 pre-existing focused files still fail on stale Actor Context, Event/Appraisal, Identity, Social, Qdrant smoke and revision-4 fixture contracts. The 180 tests moved from the deleted monolith, the new provenance regression and the Task1/2/4 ownership suites pass; no compatibility code was restored. | `/tmp/hogwarts-decomposition-final-full.tap`; failing files/counts recorded in the decomposition progress | pre-ledger core cutovers | one or more focused test-contract migration changes | before treating the full Hogwarts glob as green or closing the next affected core change | 2026-08-14 |
| HTD-005 | resolved | high | Prompt/provenance robustness | Bare participles such as `broken` and `written` were misclassified as historical actions. The approved fix split finite past from participles, replayed the original failed response successfully and passed a second fresh blind run with one response and zero repair. | Prompt hash `610e188b65b46e7384bf50da6a2020a8e3faec55a2b949b7ba5c425504ed4559`; `hogwarts-low-provenance-participle-fix/progress.md` | pre-ledger Prompt/provenance core changes | `hogwarts-low-provenance-participle-fix` | regression reopens or detector word lists change | 2026-08-14 |

## Change Ledger

| Seq | Change ID | Kind | Feature delta | Core change | Completion debt answer | Debt delta | Review prompted | User decision | Closed at |
| ---: | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | hogwarts-test-suite-decomposition | refactor | 0 | no | No unregistered shortcut debt. No skip/todo, compatibility restoration or production hack; intentionally deferred debt is registered as HTD-001 through HTD-005. | registered HTD-001..HTD-005 | no | not_required | 2026-08-14 |
| 2 | hogwarts-low-provenance-participle-fix | fix | 0 | yes | No new debt. One regex split and one focused matrix; no Prompt growth, retry, fallback, compatibility layer or temporary hack. | resolved HTD-005 | yes | reinventory | 2026-08-14 |

## Re-inventory Log

| Date | Feature count | Trigger | Decision | Result |
| --- | ---: | --- | --- | --- |
| 2026-08-14 | 0 | User-requested review after Prompt, field and semantic core changes | reinventory | Registered HTD-001 through HTD-005; counting begins at `d89217659`. |
| 2026-08-14 | 0 | Core `hogwarts-low-provenance-participle-fix` closeout | reinventory | HTD-001 remains open: blocking full-record Knowledge sync still exists. HTD-002 remains open: `world-changes.js` still has no caller. HTD-003 remains open at 2,023/2,063/2,050 lines. HTD-004 remains open at 58 failures. HTD-005 is resolved by replay plus fresh blind validation. |
