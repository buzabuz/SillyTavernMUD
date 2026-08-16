# Hogwarts Documentation Governance PRD

## Change ID and Status

- Change ID: `hogwarts-documentation-governance`
- Artifact revision: 3
- Status: approved for implementation
- Change kind: `governance`
- Feature delta: `0`
- Core change: `yes` (the living runtime contract index is corrected)
- Inventory: [documentation-inventory.md](./documentation-inventory.md)
- Technical design: [spec.md](./spec.md)
- Tasks: [tasks.md](./tasks.md)
- Acceptance gates: [checklist.md](./checklist.md)
- Execution log: [progress.md](./progress.md)
- Living runtime field contract: [../hogwarts-runtime-contracts/state-fields.md](../hogwarts-runtime-contracts/state-fields.md)

## Problem and Evidence

The repository has no single documentation route for Hogwarts MUD. Current
behavior, historical change records, temporary debug notes, prototype
snapshots, and user-facing instructions are mixed across the repository.

The current 2026-08-14 baseline contains 105 Hogwarts-specific Markdown
documents:

- 99 Git-tracked documents;
- 6 untracked documents under the user's active
  `.trae/specs/hogwarts-language-structured-input-identity-codes/` work.

Eleven tracked documents satisfy the zombie criteria:

1. empty content;
2. an unowned root or ad hoc evidence location with no incoming reference; or
3. a document presented as current authority that conflicts with the current
   approved PRD, living contract, validator, or production ownership.

Concrete conflicts include:

- `HOGWARTS_MUD_PRODUCT_SPEC.md` has not changed since its creation on
  2026-08-08 and still defines retired model fields and compatibility paths.
- `HOGWARTS_MUD_NARRATIVE_FIRST_TURN_PLAN.md` tells Low Scene Performance to
  emit `social_hint.memoryUpdate`, while the current field contract forbids
  Low from writing memory updates.
- `.trae/specs/hogwarts-runtime-contracts/ordinary-turn-repair.md` documents an
  automatic Low repair request, while the current contract requires one
  request and direct failure.
- `.trae/specs/hogwarts-runtime-contracts/item-npc-calendar-readiness.md`
  describes NPC Identity and Calendar as future work even though both are
  implemented.
- Four root debug files and one in-spec test report are empty.
- The remaining resolved root debug file and
  `.trae/task-7.4-browser-evidence/` are unreferenced ad hoc artifacts outside
  the governed change directory.
- `debug-rollback-action-stuck.md` is also in an invalid root location, but its
  reported symptom postdates the current rollback `finally` cleanup. It is not
  classified as zombie content. Its unverified investigation record is
  preserved under this change's linked evidence before the root copy is
  removed.

Completed change artifacts and prototype documents are not zombies merely
because they are old. They are immutable historical evidence and are retained
when their location and purpose are explicit.

## Before

- A root-level product spec appears authoritative but is not maintained.
- A root-level turn protocol contradicts the Low validator contract.
- Debug documents can be left at repository root, including empty files and
  unresolved templates.
- Supporting evidence can be stored outside `.trae/specs/<change-id>/`.
- The living runtime contract links obsolete readiness and repair snapshots.
- The extension README duplicates mutable runtime semantics without a clear
  authority boundary.
- Legacy change directories and current change directories are not clearly
  distinguished.

## After

- `HOGWARTS_MUD_PRODUCT_SPEC.md` is the canonical registry for every active,
  research, and recently completed Hogwarts PRD. It records status and links,
  but does not duplicate each PRD's behavioral contract.
- Current product intent remains authoritative in
  `.trae/specs/<change-id>/prd.md`; every active PRD must also have one current
  registry row at the root record point.
- Current runtime behavior lives only in
  `.trae/specs/hogwarts-runtime-contracts/`, with
  `state-fields.md` as the field registry.
- Historical implementation decisions remain in their original stable change
  directory and are not edited to impersonate current behavior.
- Supporting evidence lives under its owning change directory and is linked
  from `checklist.md` or `progress.md`.
- Prototype documentation remains colocated under
  `prototypes/hogwarts-mud/` and is explicitly non-authoritative.
- The extension README is an operational and navigation entry point, not a
  second runtime contract.
- Root-level Hogwarts plans, specs, and debug notes are forbidden except for
  the canonical `HOGWARTS_MUD_PRODUCT_SPEC.md` registry.
- Ten confirmed zombie documents and one misplaced root investigation path
  are removed; the stale Product Spec is rehabilitated in place; seven sibling
  artifacts from the orphan evidence directory are removed.

## In Scope

- Classify every Hogwarts-specific Markdown path in the baseline inventory.
- Rewrite the stale `HOGWARTS_MUD_PRODUCT_SPEC.md` in place as the canonical
  active PRD registry.
- Delete the remaining ten approved zombie documents.
- Preserve the unresolved rollback observation at
  `hogwarts-documentation-governance/evidence/rollback-action-stuck.md`, then
  delete its ungoverned root copy.
- Before deleting `ordinary-turn-repair.md`, verify and record that the
  stricter one-request/no-repair invariant remains in current authority.
- Before deleting `item-npc-calendar-readiness.md`, create a section-level
  migration ledger proving every still-valid fact is represented by current
  authority or explicitly retained as non-authoritative historical evidence.
- Delete the complete orphan `.trae/task-7.4-browser-evidence/` directory,
  including its seven non-Markdown sibling artifacts.
- Correct references and stale status text in the living runtime contract
  index and progress log.
- Correct known stale routing and Low repair wording in the extension README.
- Add one documentation route, ownership table, and zombie-document gate to
  `.trae/skills/hogwarts-change-governance/SKILL.md`.
- Record the governance change in `.trae/specs/TECH_DEBT.md`.

## Non-Goals

- Do not change production code, runtime behavior, prompts, schemas,
  validators, reducers, model budgets, or save data.
- Do not rewrite completed change artifacts to match today's runtime.
- Do not backfill invented PRDs into legacy four-file change directories.
- Do not delete or modify the active untracked
  `hogwarts-language-structured-input-identity-codes` work.
- Do not delete the runnable prototype or its colocated design snapshot.
- Do not audit generic SillyTavern documentation or third-party documentation.

## Runtime Contract Impact

Runtime field impact: None. No State, message, Prompt, Knowledge, UI session,
or UI projection field is read, written, migrated, aliased, or removed.

The living contract index is corrected only as documentation. The current
field meanings and writer/reader ownership in `state-fields.md` do not change.

## Migration and Compatibility

This is a one-time repository documentation cleanup. There is no runtime or
save migration and no compatibility period.

| Path or path set | Before | After | Reason |
| --- | --- | --- | --- |
| `HOGWARTS_MUD_PRODUCT_SPEC.md` | Stale monolithic product authority | Rewritten as active PRD registry | Strong root path remains useful as the single record point without duplicating contracts |
| `HOGWARTS_MUD_NARRATIVE_FIRST_TURN_PLAN.md` | Stale root Low protocol | Deleted | Conflicts with current Low writer whitelist |
| Five zombie `debug-*.md` files | Empty/resolved root debug notes | Deleted | Empty or resolved and unreferenced |
| `debug-rollback-action-stuck.md` | Unverified root investigation draft | Preserved as linked change evidence, then root copy deleted | Static code does not prove the reported symptom fixed |
| `.trae/task-7.4-browser-evidence/` | Orphan evidence outside a change | Deleted | No owner link; later owned acceptance evidence exists |
| `add-calendar-storyline-system/unit-test/ut_test_report.md` | Empty report | Deleted | Zero-byte artifact with no evidence |
| `hogwarts-runtime-contracts/ordinary-turn-repair.md` | Obsolete Low repair contract | Deleted after invariant-preservation proof | Current authority is stricter: one request and direct failure |
| `hogwarts-runtime-contracts/item-npc-calendar-readiness.md` | Pre-implementation readiness snapshot | Deleted after section-level migration ledger | Identity and Calendar are implemented; valid Item/current facts retain explicit destinations |
| Skill, runtime index/progress, extension README | Fragmented or stale routing | Updated in place | These are maintained entry points |

Rollback is a normal Git revert of this documentation-only change. No runtime
state restoration is required.

## Prompt Field Budget

None. Production Prompt builders and Prompt payloads are not changed.

## Frontend Field Whitelist

None. Frontend code and frontend-readable fields are not changed.

## Acceptance Criteria

1. The inventory accounts for all 99 tracked and 6 active untracked baseline
   documents.
2. Exactly ten approved zombie Markdown documents are deleted, the stale root
   Product Spec is rewritten as the canonical PRD registry, and the
   misplaced rollback investigation is preserved under linked evidence before
   its root copy is deleted.
3. The orphan evidence directory and its seven non-Markdown siblings are
   deleted without touching owned evidence under a change directory.
4. No tracked text file references a deleted path.
5. No root-level `HOGWARTS_MUD_*.md` remains except the canonical Product Spec
   registry, and no root-level `debug-*.md` remains.
6. The Skill defines document classes, canonical locations, owners, update
   triggers, prohibited locations, and a deletion gate.
7. The living runtime contract no longer advertises Low repair or pending
   Identity/Calendar readiness as current behavior.
8. The extension README points maintainers to the canonical route and does not
   claim that Low validation can issue an automatic repair request.
9. The Product Spec registry contains every current active/research PRD and
   defines the registration/update trigger.
10. The one-request/no-second-repair invariant is proven present in current
    authoritative documents before `ordinary-turn-repair.md` is deleted.
11. A stable readiness migration ledger accounts for every section of the
    226-line snapshot before deletion.
12. The rollback evidence remains at a stable repository path and visibly
    states `unverified`.
13. The user's six untracked active documents remain byte-for-byte unchanged
    relative to the immediate pre-implementation hash snapshot.
14. Markdown links and repository whitespace checks pass.
15. The technical-debt ledger records this governance change with
    `feature_delta=0`.

## Risks and Rollback

- Risk: deleting a historical document that still contains unique context.
  Mitigation: deletion is limited to the explicit matrix; historical change
  artifacts and prototype snapshots are retained.
- Risk: the rollback debug note represents an unresolved bug. Mitigation: its
  content is preserved as explicitly unverified linked evidence; no claim of
  resolution and no production behavior change is made.
- Risk: active user work is mixed into the audit. Mitigation: the six
  untracked files are listed as protected and excluded from all edits.
- Risk: active documentation still contains unknown stale claims. Mitigation:
  this change removes confirmed conflicts and installs an update gate; it does
  not claim a full semantic rewrite of every historical paragraph.
- Rollback: revert the documentation commit. There is no data rollback.

## Approval

Revision 3 incorporates the user's 2026-08-14 instruction and is explicitly
approved for implementation:

- overall documentation cleanup approved;
- deletion is gated on the ordinary-turn, readiness, and rollback checks;
- `HOGWARTS_MUD_PRODUCT_SPEC.md` must remain and become the record point for
  all active PRDs.
