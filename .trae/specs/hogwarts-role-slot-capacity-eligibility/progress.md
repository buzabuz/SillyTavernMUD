# Progress

## 2026-08-22 - L2 Discovery And Specification

- Runtime reproduction established that a Calendar Moment's Medium Scene
  Transition measured 102,997 characters and was rejected before provider
  dispatch by the static 95,000-character task policy.
- The selected Medium role slot is configured at 120,000 context tokens with a
  12,000-token response reserve; its runtime Prompt ceiling is 298,080
  characters. The rejected request fits that configured capacity.
- The user expanded scope from a single Scene Transition correction to the
  approved policy direction: every `low`/`medium`/`high` role request uses the
  selected role capacity as its sole hard total-Prompt eligibility boundary.
- Replacement fixed PM completed L2 discovery. Local-only tasks, Prompt
  content/compaction semantics, and Chinese raw-message reinjection remain
  explicitly out of scope.
- The user approved the unchanged L2 scope after the PM PASS result. RSCE-02
  is now in progress; no production behavior has changed under this change ID
  yet.

## Evidence

- Recorded runtime measurements: 102,997 / 95,000 characters before the fix,
  then 102,997 / 298,080 characters reaching Connection Manager after it. The
  temporary trace and diagnostic server were removed after verification.
- `public/scripts/extensions/hogwarts-mud/domain/prompt-budget-allocator.js`:
  static task-policy values.
- `public/scripts/extensions/hogwarts-mud/runtime/model-event-scheduler.js`:
  shared double-gate enforcement.

## 2026-08-22 - Shared Scheduler Implementation

- Removed the static product-budget rejection from
  `modelEventScheduler.runRoleTask()`. The public scheduler now compares the
  complete provider-visible request only against the selected role slot's
  runtime capacity.
- Removed the composition-root `enforceProductBudget` option. No role workflow
  can retain a second task-local hard gate through that scheduler API.
- Retained static task values as nonblocking diagnostic targets and Local-only
  contract metadata. Updated `PROMPT_BUDGET_POLICY_VERSION` to `2`.
- Added a scheduler regression for the former Social 80,000-character target
  and a catalog loop proving every active role task dispatches when it exceeds
  its static target but fits selected capacity. The same suite proves a Local
  policy remains independent.
- Focused scheduler, Calendar Moment, Calendar UI, and Post safety suites
  passed 66/66. Runtime post-fix Calendar Moment evidence remains pending.
- The public scheduler now forwards each capacity-approved role request with
  `preservePrompt=true`, making the measured request the exact adapter input.
- Source audit found one production Connection Manager call inside
  `adapters/model.js`; all active role workflows reach it only through
  `modelEventScheduler.createRoleRequest()` and `runRoleTask()`.
- Post-fix runtime evidence: the same 102,997-character Calendar Moment
  request entered Connection Manager with `preservePrompt=true` and the
  selected 298,080-character capacity, then received a provider response after
  about 40 seconds. It was no longer rejected by the old 95,000-character
  static gate.
- A temporary diagnostic incorrectly assumed the provider result was a string
  and caused one failed attempt after the provider response. The diagnostic was
  corrected, then debugging was stopped at the user's direction; no further
  provider calls will be requested for this change.
- Independent review then found two contract gaps before release: the scheduler
  did not measure the adapter's runtime transport wrapper, and role diagnostics
  still carried player-derived text. Both now use the shared
  `createRoleTransportEnvelope()` measurement/send source, and diagnostics are
  V3 length/flag-only records.
- A final review found one remaining direct diagnostic leak and an adapter
  escape hatch. `turn.js` now records only player-input character counts, the
  V3 sanitizer rejects those raw field names, and the adapter exports only a
  scheduler-bound role invoker. It no longer trims or capacity-checks role
  Prompts.
- Provider-free regression after the final review: 140 focused tests passed,
  including full role-capacity, adapter, diagnostics, Calendar Moment, Post
  safety, and save-revision coverage.
