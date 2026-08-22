# Progress

Artifact revision: `2`

Phase: `browser_acceptance_pending`

Active task: `CPTP-04 blocked on real workflow evidence`

Approval: `Artifact Revision 1 approved on 2026-08-19`

Revision 2 approval: `user explicitly ordered corrected PRD and implementation on 2026-08-20`

## 2026-08-20 - Provider Tuple Removed

User correction:

- do not gate parallelism on `Low + zh-CN + Local`;
- after English is visible, start the selected post and selected current-message
  translation independently;
- let existing local FIFO handle resource serialization.

Implemented:

- removed post-provider, display-locale and Local-only eligibility gates;
- Local, Google and Bing now share one explicit-current-message dispatch path;
- `off` and no candidate naturally produce zero translation work;
- removed `ownsCandidates` and the conditional post-settlement enqueue;
- P1-P4 remain behind the existing idle scheduler.

Verification:

- focused scheduling, production turn wiring, translation, post-provider and
  call-budget suites: `61/61` pass;
- ESLint, syntax, VCON assertions and `git diff --check`: pass.

## 2026-08-19 - Business Scope Confirmed

User decisions:

- keep the growth-stage solution simple;
- start current-turn Chinese translation as soon as English is visible;
- continue cloud Low post in parallel;
- do not build a general concurrency/preemption system.

Fixed PM:

- initial discovery identified three decisions and returned BLOCKED;
- the user resolved all three;
- the original PM became unavailable for follow-up;
- one fresh replacement PM redid complete discovery and returned PASS;
- the same replacement performed production-informed follow-up and returned
  PASS.

## 2026-08-19 - Production Reconnaissance

Observed current order:

```text
English save/render
-> Low post
-> dynamic observation / guards / reducers
-> State save
-> current-turn localization enqueue
```

Consequences:

- current translation cannot overlap Low post;
- UI can say translating before a translation request exists;
- existing P1-P4 idle gates are broader than this P0 requirement.

Approved design candidate:

- one dedicated P0 current-turn dispatch exception;
- only `Low post + zh-CN + Local translation`;
- no Prompt, Schema, State field, writer, migration or call-count change;
- one local resident model remains enforced by existing local serialization.

## 2026-08-19 - Governance Contracts Complete

- VCON-013 permits only cloud Low post to overlap VCON-016 current-turn P0
  Local translation.
- VCON-016 keeps one local batch and all P1-P4 idle gates.
- `jobRegistry.localizationActiveBatch` is the real active-batch authority;
  no duplicate session field was added.
- Frontend registry row `GEN-006` owns the existing progress/status sinks.
- No State, message, TranslationTable or Prompt contract changed.

## Current Status

P0 parallel dispatch is implemented:

- English is saved and rendered before current-message candidates are emitted.
- the dedicated scheduler consumes only explicit P0 keys while cloud Low post
  continues;
- Local post, non-Local translation and P1-P4 keep their prior gates;
- translation completion owns its own rerender and never blocks State
  settlement.

Focused scheduler, idle localization, turn workflow, display-locale,
translation table, post-provider, Prompt payload, call-budget, dynamic
observer, save-revision and recovery tests pass (`164/164` in the latest
combined run). Syntax, ESLint, VCON assertions and diff checks pass.

## 2026-08-20 - Independent Acceptance Attempt 1

Fresh-context verdict: `FAIL`.

Valid findings:

- translation could become active before the cloud post request started while
  the progress copy already said both were active;
- the first implementation accidentally removed the legacy post-settlement
  enqueue for Local post and Google/Bing;
- VCON-016 did not distinguish the one-request current-turn P0 path from
  legacy non-P0 chunk/retranslation debt;
- acceptance used port `8000`, whose browser profile did not load Hogwarts,
  while the active product profile is served on `8003`.

Corrections:

- cloud Low post now starts first, followed immediately by P0 Local
  translation from the same orchestration point;
- `ownsCandidates` makes early P0 and legacy post-settlement enqueue mutually
  exclusive; focused regression proves both branches;
- VCON-016 now records P0-specific one-request/no-retry/no-fallback behavior
  without pretending legacy P1-P4 debt is removed;
- translation and turn delay localhost probes were removed.

Because code changed after the failed verdict, that Agent cannot approve the
fix. A fresh independent acceptance run is required.

The second independent run was deliberately stopped after later status-copy
and current-turn-key guards changed its acceptance target. It produced no
verdict. The next run must start from fresh context after the final
deterministic baseline.

The third fresh independent run passed the production call graph and all
static behavior criteria, but returned `FAIL` because the existing focused
scheduler test hand-composed its post Promise and the Agent did not run tests
or ESLint before a requested timebox stop. A production-wiring regression now
runs `createTurnWorkflow`, holds Low post open, proves P0 translation starts
before either branch completes, proves the turn does not await translation
completion, and then releases each branch independently. The final combined
baseline is `164/164`; another fresh Agent must execute it itself.

Worktree scope note:

- existing dirty `turn-performance.js` Prompt/sanitizer changes belong to the
  previously approved Low Scene proposal-field fix, not this timing change;
- rollback files and `7777` rollback probes belong to the separate unresolved
  rollback-performance investigation.

Browser status:

- `http://127.0.0.1:8003` loads the real Hogwarts extension, current Chinese
  locale, Local translation and Low post selector;
- the existing loaded tab remains on the in-game AI configuration screen and
  did not return to Game through browser automation, so a real paid turn timing
  capture is still pending.

## 2026-08-20 - Independent Acceptance Attempt 4

Fresh-context result: `BLOCKED`, with no code-level failure.

The Agent independently ran:

- the required timing/translation/post/turn suites: `118/118` pass;
- ESLint on the changed timing/UI files and timing tests: pass;
- `git diff --check`: pass.

Criterion result:

- English-first save/render, failure isolation, one-request policies,
  non-parallel fallback ownership, P1-P4 isolation, shared local FIFO,
  truthful active-batch wiring and no timing-scope Prompt/Schema/parser/Reducer
  change: `PASS`;
- real cloud Low/P0 overlap interval, Chinese-before-`state_settled` DOM
  timestamp, and desktop/mobile live progress transition: `BLOCKED` because
  the independent Agent is forbidden to submit a paid turn or write the real
  save.

Implementation is complete. Completion and technical-debt closeout remain
blocked until the user runs one ordinary `Low + zh-CN + Local translation`
turn after refreshing the page and the resulting timing/DOM evidence is
captured.

Current blocker:

```text
one refreshed real Low + Local turn, plus desktop/mobile live-state evidence
```
