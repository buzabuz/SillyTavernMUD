---
schema_version: 1
counting_since: "2026-08-14 commit d89217659"
change_count: 3
feature_count: 1
last_reinventory_feature_count: 1
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
| HTD-002 | resolved | medium | Retired production artifact | The non-executable `domain/world-changes.js` shell and stale README route were deleted after confirming there was no production/test importer. Global Chronicle, Event V2 and Social V3 remain the current owners. | canonical test migration manifest revision 3; repository search after deletion | Prompt/lifecycle cutover | hogwarts-language-structured-input-identity-codes | reopen only if a current caller requires a new approved World Change design | 2026-08-16 |
| HTD-003 | open | medium | Module size | Nine non-data production modules exceed the strict `<2,000` limit: Calendar UI 2,919; relationship graph 2,642; local semantic adjudicator 2,591; language-authority migration 2,351; Inspector 2,283; Social workflow 2,197; local semantic adapter 2,115; relational retrieval 2,023; Story renderer 2,005. Exact no-growth ratchets are active. | `rg --files public/scripts/extensions/hogwarts-mud src/hogwarts-mud -g '*.js' \| xargs wc -l \| sort -nr`; architecture/UI ratchet tests | pre-ledger core changes plus language-authority implementation | future module splits | before adding behavior to an oversized module or closing the next related core change | 2026-08-16 |
| HTD-004 | resolved | high | Test contract migration | Stale full-glob contract debt was reduced from 76 failures/one skip to zero stale setup/fixture failures and zero skip/todo. The remaining three red tests reach current product blockers and have dedicated debt rows. | [`hogwarts-language-structured-input-identity-codes/progress.md`](./hogwarts-language-structured-input-identity-codes/progress.md#2026-08-16---current-contract-test-hygiene); canonical test migration manifest revision 3 | pre-ledger core cutovers | hogwarts-language-structured-input-identity-codes | reopen if a test fails before its current business assertion or uses skip/todo for contract drift | 2026-08-16 |
| HTD-005 | superseded | high | Prompt/provenance robustness | The regex historical-prose classifier was removed after real output proved that regex cannot distinguish recall, lies, invention or ordinary dialogue. No production caller or module remains. Future semantic adjudication requires a separate approved Ollama design and call budget. | `hogwarts-language-structured-input-identity-codes/progress.md#2026-08-15---regex-historical-prose-validator-retired`; production search finds no `validateHistoricalClaimProvenance` caller | pre-ledger Prompt/provenance core changes | future approved semantic-adjudication change | before adding any historical-prose semantic classifier | 2026-08-15 |
| HTD-006 | open | high | Social Prompt budget | The current Tina Social Prompt is 82,386 characters, 2,386 above the approved 80,000 target. Evidence ordering, trimming, batching, Event linkage, cursor advancement, catch-up scheduling and added call budget are semantically undecided. An unapproved character-cap attempt was rolled back; no Social payload change is authorized by Revision 4. | `hogwarts-language-structured-input-identity-codes/progress.md#2026-08-15---out-of-scope-prompt-trimming-rolled-back`; active-save audit evidence | pre-ledger Social/Prompt changes | future approved Social Prompt growth PRD | before changing Social Prompt payloads, evidence selection or cursor behavior, or treating the all-Prompt product targets as green | 2026-08-16 |
| HTD-007 | open | medium | Prompt measurement tooling | The strict budget test now measures active Tina directly and fails at the first over-budget role, so it cannot emit the complete later-role measurement report in the same run. The optional audit still uses a child-process bypass to collect later metrics before restoring failures. Collection and acceptance remain coupled. | `scripts/audit-hogwarts-language-boundary.mjs::fullPromptPreloader/captureFullPrompts`; `tests/hogwarts-mud-language-prompt-budget.test.mjs` | hogwarts-language-structured-input-identity-codes | future Prompt measurement harness cleanup | when HTD-006/HTD-009 are designed or the measurement path is separated from assertions | 2026-08-16 |
| HTD-008 | accepted | low | Composition root size | `public/scripts/extensions/hogwarts-mud/index.js` is 610 lines against the former 600-line target. The user explicitly waived splitting it in this change. A 610-line no-growth ratchet remains active. | `wc -l public/scripts/extensions/hogwarts-mud/index.js`; `hogwarts-mud-task6-ui-contract.test.mjs` | pre-ledger composition work | future composition-root cleanup | before adding lines to `index.js` or revisiting composition ownership | 2026-08-16 |
| HTD-009 | open | high | Scene Transition Prompt budget | Active Tina r146 Scene Transition requires 76,531 characters, 431 above the approved 76,100 target. No omission/trimming algorithm is approved. The active-save budget test is intentionally red. | `tests/hogwarts-mud-language-prompt-budget.test.mjs`; [`progress.md`](./hogwarts-language-structured-input-identity-codes/progress.md#2026-08-16---current-contract-test-hygiene) | language-authority/current save growth | future approved Scene Transition Prompt budget change | before changing Transition payload selection or declaring all Prompt targets green | 2026-08-16 |
| HTD-010 | open | high | Knowledge activation | Current source-backed quill retrieval selects the seeded Event, but the final actor-scoped capsule does not deliver an authorized quill Event to every required Harry/Hermione/Lavender observer. The corrected current-contract test is intentionally red. | `tests/hogwarts-mud-knowledge-activation-revision-root-fix.test.mjs`; active Tina r146 | post-Knowledge closeout State evolution | future Knowledge activation fix | before changing retained-Event selection or declaring production Knowledge acceptance green | 2026-08-16 |
| HTD-011 | open | critical | Medium privacy boundary | `createMemoryConsolidationPrompt` includes `MEDIUM_MEMORY_LOCKED_EVENT` from a locked Event in the medium payload while Calendar, Moment and Transition exclude equivalent locked sentinels. The current boundary test is intentionally red. | `tests/hogwarts-mud-npc-identity-prompts.test.mjs` current medium-projection assertion | pre-ledger projection divergence | future approved Memory/Social privacy fix | before any Medium Memory Prompt change or declaring information-isolation acceptance green | 2026-08-16 |
| HTD-012 | open | low | Temporary localization diagnostics | Two browser-only debug POST probes remain in `adapters/translation.js` for Author's Quill leakage and the 43-row translation-quality incident, with four untracked `.dbg` session/log files. They were intentionally retained until the repaired translation flow receives final browser confirmation, but must not survive change closeout. | `adapters/translation.js` localhost ports `7777/7778`; `.dbg/author-quill-english-leak.env`; `.dbg/translation-error-43.env`; corresponding NDJSON logs; linked browser debug reports | hogwarts-language-structured-input-identity-codes debugging | hogwarts-language-structured-input-identity-codes | immediately after fresh browser localization acceptance and before P2-11/P2-12 closeout | 2026-08-16 |

## Change Ledger

| Seq | Change ID | Kind | Feature delta | Core change | Completion debt answer | Debt delta | Review prompted | User decision | Closed at |
| ---: | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | hogwarts-test-suite-decomposition | refactor | 0 | no | No unregistered shortcut debt. No skip/todo, compatibility restoration or production hack; intentionally deferred debt is registered as HTD-001 through HTD-005. | registered HTD-001..HTD-005 | no | not_required | 2026-08-14 |
| 2 | hogwarts-low-provenance-participle-fix | fix | 0 | yes | No new debt. One regex split and one focused matrix; no Prompt growth, retry, fallback, compatibility layer or temporary hack. | resolved HTD-005 | yes | reinventory | 2026-08-14 |
| 3 | hogwarts-language-structured-input-identity-codes | feature | 1 | yes | No compatibility export, automatic repair or stale skipped test was restored. Current debt is explicit: Knowledge latency (HTD-001), nine oversized modules (HTD-003), Social and Transition Prompt overages (HTD-006/009), measurement coupling (HTD-007), accepted index waiver (HTD-008), current Knowledge capsule regression (HTD-010), critical Medium locked-Event leak (HTD-011) and temporary localization debug probes (HTD-012). Stale test debt HTD-004 is resolved; three current business assertions remain intentionally red. | resolved HTD-004; updated HTD-003/006/007; registered HTD-008..012 | yes | reinventory | pending |

## Re-inventory Log

| Date | Feature count | Trigger | Decision | Result |
| --- | ---: | --- | --- | --- |
| 2026-08-14 | 0 | User-requested review after Prompt, field and semantic core changes | reinventory | Registered HTD-001 through HTD-005; counting begins at `d89217659`. |
| 2026-08-14 | 0 | Core `hogwarts-low-provenance-participle-fix` closeout | reinventory | HTD-001 remains open: blocking full-record Knowledge sync still exists. HTD-002 remains open: `world-changes.js` still has no caller. HTD-003 remains open at 2,023/2,063/2,050 lines. HTD-004 remains open at 58 failures. HTD-005 is resolved by replay plus fresh blind validation. |
| 2026-08-16 | 1 | User-required explicit retirement manifest, stale-test migration and debt accounting | reinventory | Reduced full glob from 76 failures/1 skip to 3 current business failures/0 skip/0 todo; resolved HTD-004, expanded HTD-003 to all nine oversized modules, updated HTD-006/007 and registered HTD-008 through HTD-012. |
