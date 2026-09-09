# Post Failure Isolation Progress

## Current Status

- Phase: implementation
- Artifact revision: 1
- Implementation: PFI-01 through PFI-06 complete; acceptance in progress
- Approval: revision 1 approved on 2026-09-08
- Debug session: `post-guard-failure` remains open

## Decisions

- 2026-09-08: User rejected universal whole-Post failure for discardable
  proposal errors.
- 2026-09-08: User approved family-local discard/normalization with whole-Post
  blocking reserved for no usable Post, uncertain player location, and unsafe
  atomic State commit.
- 2026-09-08: User approved the detailed Movement distinction:
  unsolicited/dirty extras normalize away, while uncertain eligible movement
  remains pending.
- No automatic retry, repair, provider fallback, Local fallback, Regex
  fallback, or reasoning authority is permitted.

## Runtime Evidence

- Live save: `stateRevision=383`, `turn.count=110`,
  `turn.status=post_unsettled`.
- Latest selected `glm-5.3-flash` request completed and returned valid final
  JSON; the thinking compatibility issue did not recur.
- Request-local Actors contained `player`; persistent `state.actors` and
  `state.actorLibrary` did not.
- Production validator comparison:
  - current client options: perception invalid;
  - remove `player`: valid;
  - add `player` to allowed request context: valid.
- The current response was therefore rejected only by mismatched client
  perception validation.
- No model retry or State/save mutation was performed during diagnosis.

## Failure Inventory

- Five public codes currently represent six broader failure classes.
- Strict root parsing can reject all families because one family is malformed.
- Perception and temporal rejection currently veto the entire Post.
- Movement has ten explicit candidate rejection branches.
- Material, Actor, Item, Identity, Dynamic observation, and translation
  already establish local omission patterns.
- The broad pre-commit catch obscures transaction, revision, Reducer,
  Appraisal, and persistence causes as `post_guard_failed`.

## Governance

- Initial PM result: L3, BLOCKED pending user policy approval.
- User policy approval: received.
- Production-informed replacement PM review: PASS.
- Artifact revision 1 implementation approval: received.
- Existing authority requiring revision:
  - selected Post capacity/recovery PRD's universal failure rule;
  - VCON-013 failure policy;
  - pending Post State field wording;
  - missing complete field-route rows for Post families.

## Next

## Implementation Evidence

- Family-local settlement is owned by
  `src/hogwarts-mud/post-turn-result-settlement.js`.
- Provider-facing Prompt and JSON Schema are unchanged.
- `player`, duplicate, and unknown perception participant IDs normalize away.
- Perception and temporal rejection no longer trigger whole-Post pending.
- Movement returns typed accepted/normalized/discarded/blocking outcomes.
- Main and Retry Post recheck revision after the model returns.
- Main and Retry Post persist State plus committed message through one guarded
  timeline rewrite; persistence failure leaves the Scene pending.
- Optional Appraisal model-task runtime advances are rebased exactly like the
  existing guarded transaction path; substantive changes during Appraisal
  remain blocking.
- Local unusable-root responses map to `post_schema_failed`.
- Movement normalization records bounded disposition diagnostics.

## Verification Evidence

- Focused and directly affected deterministic tests: `131/131` passed.
- Syntax, ESLint, registry JSON parse, and `git diff --check`: passed.
- Full Hogwarts glob: `859/875` passed, `5` skipped, `11` failed. The failures
  are pre-existing unrelated baseline/Prompt/legacy debt: Canon alias fixture,
  real-save language ratchet, Dynamic Inventory 9,820/9,000 budget,
  medium-memory projection, helper export count, query-string Node import,
  existing dynamic-identity cycle, pre-existing large-file ratchets, and
  timeline Appraisal lifecycle expectation.
- Blind Low and Local responses each passed untouched through production
  settlement with one response, one accepted Material record, one accepted
  perception, and zero family rejections.
- Real browser retry made exactly one selected Post request. It did not reach
  settlement because `api.svips.org` returned Cloudflare `524`; the Scene
  remained pending with no automatic retry or fallback.
- First independent acceptance found four approved-scope defects. They were
  fixed: second revision gate, guarded atomic persistence, Local schema error
  classification, and Movement disposition diagnostics.
- The first replacement acceptance found one remaining approved-scope defect:
  main Post used its pre-Appraisal revision when persisting after a legal
  model-task-runtime advance. The main path now verifies and rebases only
  runtime-only advances, and test harnesses assert exact commit revisions.
- The second replacement acceptance found three remaining approved-scope
  defects. They were fixed:
  - pending preservation now uses the latest authoritative State and cannot
    overwrite a newer substantive revision with the pre-Post snapshot;
  - Local model JSON/root parse failures are wrapped as
    `PostTurnResultEnvelopeError` and returned as `post_schema_failed`;
  - blocking Movement reason codes are retained in bounded
    `settlementWarnings` and attached pending diagnostics.
- Atomic persistence tests now cover one acknowledged commit, host persistence
  failure with no partial commit, and substantive revision change while the
  Post model is running.
- Current focused and directly affected deterministic tests: `132/132`
  passed.
- The third replacement acceptance found one persistence-recovery reference
  defect: guarded rollback restores cloned chat objects, so catch logic could
  write pending data to a detached pre-rollback Scene reference. Pending
  preservation now reacquires the active Scene from
  `context.chat[sceneMessageId]`; the persistence-failure test reproduces the
  production clone rollback.
- The fourth replacement acceptance found one main/Retry parity defect:
  `settlementOnly` returned no Material records. Retry now returns the same
  guarded Material proposals as the normal path, and its focused test uses a
  non-empty accepted Material event.
- The fifth replacement acceptance requested explicit end-to-end proof for
  every malformed independent family. A table-driven production
  parser/adapter/Turn workflow test now covers Material, Actor, route metadata,
  perception, temporal, Item and Identity malformed inputs; each case commits
  one valid Material sibling and the base turn through guarded persistence.
- The sixth replacement acceptance required the table to use the real Turn
  Reducer and real guarded save ports, plus complete Movement and family
  diagnostic proof. Added:
  - real `applyTurnTransaction()` plus `createGuardedSavePorts()` persistence
    for all seven malformed-family cases;
  - explicit `already_there` and full blocking no-mutation checks for clock,
    position, companions, held Item location and `spatial.lastMovement`;
  - persisted bounded `post_family_rejected` warnings for every rejected
    family.
- Current acceptance evidence also includes explicit `already_there`, complete
  blocking Movement State equality, and real save-revision storage claims for
  every family persistence case.
- Final fresh independent acceptance: implementation PASS across all ten PRD
  criteria. Goal-derived suites passed `148/148`; full Hogwarts glob passed
  `867/883` with `5` skips and `11` known unrelated baseline failures.
- Real-provider E2E remains external-blocked: the one explicit browser retry
  received Cloudflare 524. No second request, automatic retry, repair or
  fallback was issued.

## Technical-Debt Self-Audit

This change adds no compatibility fallback, retry path, Prompt growth, State
writer, migration or temporary production instrumentation. Family parsing was
placed in a new focused module rather than further expanding the server
adjudicator. The existing oversized browser Post adapter and Turn workflow
remain under HTD-003; this change necessarily added settlement orchestration
to both and does not claim that debt resolved. No new separate debt item is
required beyond updating HTD-003 when this change receives real-provider
closeout.

## Next

1. Run a fresh replacement independent acceptance Agent.
2. Complete real-save browser settlement when the external provider responds.
3. Close documentation and remove debug artifacts only after user confirms.
