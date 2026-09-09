# Post Failure Isolation Checklist

## Approval

- [x] Fixed PM assigned an L3 grade.
- [x] User approved the failure-isolation principle.
- [x] User approved the detailed Movement behavior.
- [x] Production-informed replacement PM review returned PASS.
- [x] User approved PRD/spec revision 1 for implementation.

## Contract

- [x] VCON-013 JSON and Markdown rows match the implemented failure policy.
- [x] All eight affected model field routes are documented.
- [x] `turn.status` and pending settlement State rows describe only blocking
      failures.
- [x] Prompt and transport Schema remain unchanged.
- [x] No new frontend dynamic field is introduced.

## Settlement

- [x] Unusable root response remains blocking.
- [x] Material rejection is record-local.
- [x] Actor rejection is record-local.
- [x] Item rejection is record-local.
- [x] Identity rejection is record-local.
- [x] Perception rejection omits perception/witness/Event only.
- [x] `player`, duplicate, and unknown perception participants normalize away.
- [x] Temporal rejection is claim-local.
- [x] Invalid route metadata normalizes conservatively.
- [x] Every approved Movement case matches the PRD matrix.
- [x] Substantive revision, transaction, Reducer, and persistence failures
      remain blocking.
- [x] Post-commit follow-up failure cannot relabel the committed turn pending.

## Calls And Privacy

- [x] Low uses exactly one selected Post request and zero Dynamic calls.
- [x] Local retains zero-or-one shared Dynamic call after its core Post.
- [x] No automatic retry, repair, provider fallback, Local fallback, Regex
      fallback, or reasoning fallback exists.
- [x] Diagnostics contain only bounded codes/counts, never raw Prompt,
      response, reasoning, secrets, or player prose.

## Verification

- [x] Root and per-family parser tests pass.
- [x] Mixed valid/invalid sibling-family settlement tests pass.
- [x] Real `player` regression test passes.
- [x] Complete Movement matrix tests pass.
- [x] Main and explicit retry paths use the same policy.
- [x] Transaction/revision/persistence no-write tests pass.
- [x] Prompt build is byte-identical before/after.
- [x] Focused and directly affected regression tests pass.
- [x] Blind Low and Local Post simulations pass with one request.
- [ ] Real-save browser retry settles the retained Scene.
- [ ] Browser blocking-movement recovery remains correct.
- [x] Fresh independent acceptance Agent returns PASS for implementation;
      real-provider success remains externally blocked by Cloudflare 524.

## Closeout

- [x] PRD acceptance criteria audited against evidence.
- [ ] Technical-debt self-audit recorded.
- [ ] User decides whether to re-inventory technical debt.
- [ ] Product Spec status and all living contracts match production.
- [ ] Debug artifacts are removed only after user confirms the fix.
