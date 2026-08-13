# Calendar V1 Browser Acceptance

- Date: 2026-08-09
- URL: `http://127.0.0.1:8000/?calendar_acceptance=20260809-01`
- Save: Tina Zhang
- Scope: browser only; no source code changed
- Exact browser viewport available in this run: 728×470 CSS px

## Results

| Item | Result | Evidence / exact defect |
|---|---|---|
| Load Tina save | PASS | Archive Hall save `Tina Zhang` loaded; Calendar button appeared; baseline clock `1991-09-02 · 13:35`, revision 26. |
| Desktop left Calendar / right selected-entry preview | FAIL | At measured 728px, `.hpmud-calendar-layout` is a single `717px` track and selected-entry preview begins below the navigator (`y=476`), not as the right pane. Exact desktop-width run was not available. |
| `sceneArchive` history grouped by date | PASS | Sep 1 showed 4 read-only Scenes; Sep 2 showed 5. `变形术教室` selected by date. |
| Archive正文 and Author's Quill | PASS | `transfiguration_after_break` rendered original messages and `作者的羽毛笔 / 本章批注`. |
| Archive timeline | FAIL | Source archive has 7 `timelineEntries`, but preview rendered no `时间线` section or timeline labels. |
| Archive fully read-only | FAIL | No `进入场景`, but preview exposes enabled `重新翻译 · 本地 4B` controls, so historical content is not strictly non-model/read-only if activated. They were not clicked. |
| Archive view causes no model request/world write | PASS | Resource count stayed 250; clock/revision/scene/Calendar stayed `13:35`/26/same scene/same entries. |
| Overlapping schedules displayed separately | PASS | `与赫敏的课后补习` at 19:00 showed `开始时刻的全部安排 · 2 项`: the storyline and study event, both enabled and separately previewable. |
| No conflict/exclusive-choice copy | PASS | No `冲突`/`互斥`/`二选一`; UI explicitly says preview does not cancel/settle entries and entry is not the unique event. |
| Enter a legal future planned entry | PASS | Clicked `进入场景` for the 19:00 study event. Clock advanced exactly to `1991-09-02 · 19:00`; revision 26→27. |
| New Scene links all overlaps | PASS | New Scene `gryffindor_after_school_study` has both IDs: storyline + study event; both became `active`; archive count 11→12. |
| 820px layout | FAIL | Acceptance coverage gap: browser harness exposed a fixed 728px CSS viewport and no resize API; no exact 820px browser evidence was produced. |
| 560px layout | FAIL | Acceptance coverage gap: no exact 560px browser evidence was produced. |
| 390px layout | FAIL | Acceptance coverage gap: no exact 390px browser evidence was produced. |
| Horizontal overflow | PASS at 728 only | Dialog and document `scrollWidth == clientWidth == 728`. Target-width overflow remains unverified and therefore covered by the width failures. |
| Main story does not scroll | FAIL | Underlying `#hpmud_story.scrollTop` changed 0→46.5 and persisted after close; `#chat.scrollTop` changed 45075→0. |
| Keyboard date/entry reachability | FAIL | Selecting an option rerenders it and drops focus to `BODY`; Tab did not recover focus and ArrowUp was consumed by global hotkeys instead of Calendar navigation. |
| Escape closes and restores focus | FAIL | After a selection lost focus, Escape did not close the open dialog. Close-button activation did close it and correctly restored focus to `#hpmud_calendar`. |
| Dialog name / ARIA selection / semantic time | PASS | Dialog uses `aria-labelledby`; selected date uses `aria-current=date`; entries use `aria-selected`; times render with `<time datetime>`. |
| 44×44 targets | FAIL | Calendar day buttons measured 41×44px at 728px; width is below the 44px minimum. |
| Console / network | PASS with baseline warnings | No new Calendar exception. Existing load-time aborted settings/secrets requests are recorded. Read-only phase produced no requests; authorized Scene entry produced expected model/search/translate/save requests. |

## Defects

1. Archive projection omits `timelineEntries` although the selected archive contains seven records.
2. Archive preview retains enabled retranslation actions, violating strict historical read-only/no-model affordance.
3. Selection rerender destroys focus; Calendar keyboard navigation and Escape then fail.
4. Calendar selection scrolls the underlying main story.
5. Day cells are only 41px wide at the measured compact width.
6. Exact 820/560/390 browser coverage could not be completed with the fixed viewport harness; these are coverage failures, not assertions that all three layouts are visually broken.

## Evidence

- `calendar-open-728.png` — initial Calendar layout.
- `calendar-history-transfiguration.png` — selected read-only archive.
- `calendar-overlap-preview.png` — overlapping entries in selected-date list.
- `calendar-enter-loading.png` — authorized Scene entry in progress.
- `calendar-enter-success.png` — new `课后学习小组` Scene.
- `state-evidence.json` — state before/history/after transition.
- `network-console-summary.txt` — request and console summary.
- `snapshot-2026-08-09T15-45-11-674Z.log` and `evaluate-2026-08-09T15-45-21-692Z.log` — raw browser extracts.
