# Progress

## 2026-08-22 - L3 Discovery

- A Calendar Moment to `Lunch in the Great Hall` reached the selected Medium
  provider after the static role-capacity gate was removed.
- The Medium package was English and structurally usable. The next Low Scene
  Opening returned seven segments and was rejected only by the fixed `2-6`
  segment count.
- PM discovery classified the broader narrative-quality admission repair as
  L3. The user explicitly selected only the listed Scene Transition and
  Opening prose count/length gates; State-writing caps are out of scope.
- The original PM identified a missing model-field-route record. The route
  registry now includes the five affected fields. Replacement PM review
  returned PASS.
- An uncommitted workaround that merges adjacent narration down to six
  segments exists in the working tree. It is not approved, must be deleted in
  SNA-02, and is not a candidate solution.

## Evidence

- Historical server log:
  `/tmp/hogwarts-server-8004-clean.log`
  contains the Medium Great Hall package and seven-segment Low Opening.
- Current scope and scenario authority:
  [`prd.md`](./prd.md).
- Route ownership:
  [`../hogwarts-runtime-contracts/model-field-routes.md`](../hogwarts-runtime-contracts/model-field-routes.md).

## Current Status

Implemented and independently accepted without a provider request.

- Removed the seven approved prose-only rejection ranges.
- Removed Low Opening segment merging, transition opening truncation,
  exploration-hook padding/truncation, and chronicle truncation.
- Preserved all structural, English authority, actor, destination, clock, and
  State-writing guards.
- Provider-free focused suites: 64 passed, 0 failed.
- Full Hogwarts glob: 833 passed, 10 pre-existing unrelated failures in the
  dirty worktree; none are in the touched Scene Transition/Opening paths.
- Preview restarted at `http://127.0.0.1:8004/`; health returned HTTP 200.
- Fresh independent L3 acceptance returned PASS.
- Core-change debt ledger records no new debt; feature count remains `1` and
  the user re-inventory decision is pending.

## Runtime Correction

- The first real Calendar retry produced a valid Medium package and a
  seven-segment Low Opening, but was rejected by a retained nonempty
  `explorationHookEn` check. The field is optional in the production Prompt,
  so this contradicted the approved nonblocking narrative-admission outcome.
- A one-off local diagnosis replayed the already-paid Medium/Low responses
  through the production normalizer and validator with `valid=true` and no
  errors; no new provider request or State write was made. This transient
  debug evidence is not a durable test fixture.
- Follow-up independent acceptance found the normalizer still synthesized an
  empty hook when the director omitted it. The normalizer now preserves the
  field's absence; the focused regression asserts that behavior before another
  fresh acceptance pass.
- The same review found `authorQuillEn` was documented as optional but still
  rejected when absent. It is now optional in the validator, test contract,
  runtime route, and operational README.
- The supplied optional fields remain inside the pre-normalization English
  authority scan. Focused regression proves Chinese `authorQuillEn` and
  `nextScene.explorationHookEn` are both reported as mismatches, while their
  absence remains valid.
- Fresh independent acceptance passed after the optional-field corrections.
- The first runtime browser continued to execute the cached `v=0.1.1` module
  graph, including the removed Low Opening segment gate. The extension
  manifest and affected entry-to-workflow import chain now use `v=0.1.2`;
  a reloaded browser loads the updated module and restores the saved timeline
  in `idle` state without a Post lock.
