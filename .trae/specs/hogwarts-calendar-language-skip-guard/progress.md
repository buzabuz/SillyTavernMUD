# Progress

## 2026-08-22 - Approved L1 Start

- Reproduced that `routine_lunch_great_hall` itself is planned, future-dated,
  and has a valid destination; the failure occurs after Scene Transition
  package generation.
- Confirmed that the established `languageSkipped` package has no `nextScene`,
  while Calendar/Timeline Moment continued into Scene Opening.
- Fixed PM classified the change as L1. The user approved only the guard and
  rejected model-configuration work.
- Implementation has started. No production code, State, save, or provider
  configuration has changed at this point.

## 2026-08-22 - Implementation And Self-Verification

- Calendar/Timeline Moment now turns the existing language-skip package into a
  typed no-commit error before Scene Opening, archive construction, or save.
- Calendar UI maps that typed error to `ui.calendar.language_skipped`; unrelated
  failures retain the generic runtime-error message.
- Registered the transient route, VCON-008 no-write outcome, Calendar session
  error semantics, and `CAL-036` static locale route.
- Self-verification passed:
  - `node --test tests/hogwarts-mud-calendar-moment.test.mjs` (15 passing)
  - `node --test tests/hogwarts-mud-calendar-ui.test.mjs` (12 passing)
  - targeted `npx eslint` over the four changed source files and two tests
  - `node --check` for changed JavaScript, validation-registry JSON parsing,
    and `git diff --check`
- Fresh L1 test-agent verification is pending.

## 2026-08-22 - Independent L1 Verification

- A fresh read-only test agent independently passed the goal-derived acceptance
  scope.
- `node --test tests/hogwarts-mud-calendar-moment.test.mjs
  tests/hogwarts-mud-calendar-ui.test.mjs
  tests/hogwarts-mud-scene-transition.test.mjs` passed 50/50.
- The agent also passed ESLint, JavaScript syntax, static locale parsing,
  VCON JSON parsing, and `git diff --check`.
- Direct browser inspection on `http://127.0.0.1:8004/` opened the Calendar
  normally without a model request or save. The typed failure text is covered
  by the focused Calendar DOM test; it was not triggered against the live save
  to avoid an unapproved provider request or world write.
