# Checklist

## Approval

- [x] Fixed PM discovery passed.
- [x] User chose universal Post failure blocking.
- [x] User approved this PRD/spec/tasks/checklist revision.

## Prompt Assembly

- [x] Complete provider-visible request is measured before dispatch.
- [x] Low capacity derives from selected Low role configuration.
- [x] Local capacity is separately measured with output reserve.
- [x] The `10,500` legacy policy cannot reject a fitting Low request.
- [x] Compaction order is deterministic, atomic and diagnostic.
- [x] System, Schema, action, narration, clock/current room, targets and
  triggered movement preflight are protected.

## Settlement Safety

- [x] Any selected Post no-fit/failure writes `post_unsettled`.
- [x] No pending turn writes transaction, clock, position, Knowledge or
  Post-derived State.
- [x] Composer blocks all new actions while pending.
- [x] Retry is exactly one selected Post call only.
- [x] Discard removes exactly one uncommitted pair and restores checkpoint/input
  without a model call.
- [x] Reload keeps a pending turn from replaying a model call.

## Verification

- [x] Focused Low/Local fit and compaction tests pass.
- [ ] Real-save provider-visible measurement passes.
- [ ] Blind Low/Local Post simulation passes.
- [ ] Browser pending/retry/discard flows pass.
- [ ] Fresh independent acceptance passes.
  Source review passed; runtime acceptance remains blocked:
  [evidence](./acceptance/independent-source-review.md).
