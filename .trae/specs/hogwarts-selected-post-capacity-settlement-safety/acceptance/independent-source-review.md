# Independent Source Review

## Scope

- Project goal: selected Post capacity, structured compaction, universal
  `post_unsettled`, Post-only retry, and zero-model discard.
- Reviewer context: fresh/read-only agents with no implementation conversation.
- Authoritative inputs: current PRD, spec, checklist, runtime fields, VCON-013,
  frontend registry, production source, and focused tests.

## Review Rounds

1. Initial review found missing wrapper measurement, a post-guard failure
   falling through to `turn.status=failed`, and a composer that still enabled
   controls. All three were corrected.
2. Follow-up review found retained actor IDs were recomputed after
   `localPresence` compaction, and scene transition remained callable while
   pending. Retained IDs are now frozen from the full input; transition is
   guarded in both UI and workflow.
3. Final source review confirmed the approved `localPresence` omission order,
   retained room filtering, wrapper diagnostics, retry/discard limits, and
   incomplete legacy discard-only behavior.

## Source Result

`PASS` for source and focused-test behavior:

- complete diagnostics contain character totals, wrapper/schema totals, and
  derived token estimates;
- Low uses selected role capacity rather than `10,500`;
- no-fit/provider/schema/guard failure writes generic pending state;
- composer and scene transition are blocked while pending;
- Retry sends only selected Post; Discard sends no model request;
- legacy missing drafts are retry-disabled and only safely tail-paired records
  are discardable.

## Runtime Result

`BLOCKED`:

- the active `127.0.0.1:8004` process predates this worktree change and still
  renders the old movement-only recovery UI;
- no active-save provider-visible measurement has been captured;
- blind Low/Local model simulation and browser Retry/Discard/reload evidence
  are not yet available.

This is supporting acceptance evidence, not a runtime authority.
