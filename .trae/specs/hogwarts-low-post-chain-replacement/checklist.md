# Checklist

## Approval

- [x] Fixed PM discovery classifies the change as L2.
- [x] Production-informed replacement review rechecked every routed model path.
- [x] User confirmed Low full-chain replacement and the Item inclusion rule.
- [x] User explicitly approved this PRD/Spec/tasks/checklist revision with
  `ok 开始执行` on 2026-08-22.

## Chain Contract

- [x] Low normal, Item, Identity, mixed, no-change, failure, and retry traces
  show exactly one Low Post and zero local 1.7B/4B semantic calls.
- [x] Local normal and Item-routed traces preserve the existing Local call
  contract; mixed/main-failure/Dynamic-failure traces remain in the directly
  affected regression suite.
- [ ] Local mixed, main-failure, and Dynamic-failure traces
  preserve the existing Local call/failure contract.
- [ ] Low failure preserves narration and enters `post_unsettled` without a
  local/4B fallback.
- [x] Low retry remains one Low Post only.
- [x] Every obsolete Low-to-Dynamic caller is deleted in the same change.

## Item Context

- [x] Independently room-material formal Items are included.
- [x] Unmentioned player-carried/equipped formal Items are excluded.
- [x] Unmentioned NPC-held formal Items are excluded even while the NPC is
  present.
- [x] Stable directives and unambiguous direct current action/narration
  references include only the intended formal Item.
- [x] Ambiguous duplicate labels and generic/holder/pronoun/type references do
  not inject an Item.
- [x] `scene.itemStates[]` is never used as the selector and has a regression
  proof for holder-follow behavior.

## Schema and Authority

- [x] Low Item and direct injury schema fields reuse the existing descriptor
  semantics or a documented equivalent without creating a second authority.
- [x] Strict transport JSON Schema and server Zod schema remain aligned.
- [x] Existing Item and Identity guards/reducers remain the sole State writers.
- [x] Invalid Low Item/Identity proposals write no State.
- [x] VCON-013/014/020 rows, state fields, and model field routes are current.
- [x] Each affected builder/descriptor/parser/workflow links its field-route
  identifiers at module level.

## Prompt and Verification

- [x] Active-save build-only measurement is recorded after implementation:
  [evidence](./measurement/active-save-post-provider-measurement.md).
- [x] Before/after Low and Local measurements include System, user payload,
  strict Schema, wrapper and reserve.
- [x] No full Inventory projection remains on a Low Post path.
- [x] Protected System, Schema, action, narration, and route IDs are intact.
- [x] Focused tests and directly affected regressions reach their business
  assertions.
- [ ] One-shot blind simulations pass for every affected task/mode.
- [ ] Safe real Low turn/browser workflow passes.
- [ ] Fresh independent acceptance passes criterion by criterion.
  Current independent review: [failed](./acceptance/independent-l2-review.md)
  before the user-approved Local capacity increase; a fresh review is required
  after blind and real-workflow evidence.

## Closeout

- [ ] Product registry, runtime contracts, VCON registry, tasks/checklist, and
  progress agree on status.
- [ ] Technical-debt answer and ledger row are recorded.
- [ ] No debug-only route, fallback, compatibility caller, or stale test
  remains.
