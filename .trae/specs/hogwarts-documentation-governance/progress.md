# Hogwarts Documentation Governance Progress

## Current Status

- Change ID: `hogwarts-documentation-governance`
- Artifact revision: 3
- Phase: implementation
- Active task: HDG-04
- Implementation: approved with three deletion-before-evidence gates
- PRD: [prd.md](./prd.md)
- Spec: [spec.md](./spec.md)
- Tasks: [tasks.md](./tasks.md)
- Checklist: [checklist.md](./checklist.md)
- Inventory: [documentation-inventory.md](./documentation-inventory.md)
- Living field contract:
  [../hogwarts-runtime-contracts/state-fields.md](../hogwarts-runtime-contracts/state-fields.md)

## 2026-08-14 - Read-Only Baseline Audit

- Confirmed repository root:
  `/Users/bytedance/sillytavern/SillyTavern`.
- Read the complete `hogwarts-change-governance` Skill before analysis.
- Reviewed project memory and the current living field contract.
- Preserved the user's existing untracked
  `.trae/specs/hogwarts-language-structured-input-identity-codes/` directory.
- Counted 99 tracked and initially 5 active untracked Hogwarts Markdown
  documents.
- Recorded Git date, line count, references, and authority role for the
  tracked baseline.
- Found five zero-byte Markdown files:
  - four root debug files;
  - one Calendar unit-test report.
- Confirmed the two root Hogwarts documents have no incoming repository
  references.
- Confirmed the root Product Spec and Narrative-First plan were created on
  2026-08-08 and never updated.
- Confirmed the Narrative-First plan requires Low `memoryUpdate`, which the
  current field contract forbids.
- Confirmed the ordinary-turn repair topic permits a second Low request, which
  the current single-attempt contract forbids.
- Confirmed the Item/NPC/Calendar readiness topic describes implemented
  Identity and Calendar work as pending.
- Confirmed `.trae/task-7.4-browser-evidence/` has no external owner link and
  is outside the governed evidence route.
- Distinguished retained historical change records and prototype snapshots
  from current runtime authority.

## 2026-08-14 - Continuation Reconciliation

- The active user change added
  `hogwarts-language-structured-input-identity-codes/research-findings.md`.
- Rebased the protected current inventory to 99 tracked and 6 active
  untracked baseline documents, total 105.
- Inspected `debug-rollback-action-stuck.md`, `ui/turn-controller.js`, test
  references, Git history, and blame.
- The rollback report postdates the existing `turnActive` `finally` cleanup,
  names separate `liveSceneStream` state, and has no preserved runtime log.
- Static evidence is insufficient to call the symptom fixed or to register a
  current technical-debt fact.
- Preserved the report as explicitly unverified linked evidence:
  [evidence/rollback-action-stuck.md](./evidence/rollback-action-stuck.md).
- Revised the cleanup classification from 12 zombie documents to 11 zombie
  documents plus 1 misplaced investigation path.

## Revision 2 Decision

Revision 2 proposes:

- delete 11 zombie Markdown documents;
- preserve one unresolved rollback observation under linked evidence and
  remove only its ungoverned root copy;
- delete 7 non-Markdown siblings in the orphan evidence directory;
- update 4 maintained entry points and the technical-debt ledger;
- retain 82 tracked historical/current documents;
- protect 6 active untracked user documents;
- add a permanent route and maintenance gate to the governance Skill.

No production, test, Prompt, runtime field, frontend field, model-call, or save
change is proposed.

## Open Gate

Revision 2 was superseded before implementation.

## 2026-08-14 - Revision 3 Approval

The user explicitly approved the overall cleanup and required:

1. prove the no-second-repair invariant remains authoritative before deleting
   `ordinary-turn-repair.md`;
2. prove all still-valid information in the 226-line readiness snapshot has a
   current destination before deleting it;
3. preserve rollback evidence at a stable path and mark the issue
   `unverified` when runtime verification is absent;
4. retain and rewrite `HOGWARTS_MUD_PRODUCT_SPEC.md` as the record point for
   every active PRD.

Revision 3 incorporates these decisions and is approved for implementation.

## Deletion-Before-Evidence Status

- Ordinary-turn invariant: passed. Current authority exists in the governance
  Skill and `hogwarts-runtime-contracts/state-fields.md`; the root Product
  Spec registry will repeat the permanent route, not replace either authority.
- Rollback evidence: passed. Stable evidence is linked at
  [evidence/rollback-action-stuck.md](./evidence/rollback-action-stuck.md) and
  explicitly states `unverified`.
- Readiness migration: passed. Every source section and still-valid detail is
  accounted for in
  [evidence/item-npc-calendar-readiness-migration.md](./evidence/item-npc-calendar-readiness-migration.md);
  unimplemented ideas are retained as explicitly unapproved historical
  candidates.

## 2026-08-14 - Implementation And Verification

- Rewrote `HOGWARTS_MUD_PRODUCT_SPEC.md` in place as the canonical active PRD
  registry instead of deleting the strong root path.
- Registered all 8 current `prd.md` files exactly once; `comm` reported no
  missing or duplicate target.
- Added permanent document routes, maintenance triggers, historical-archive
  rules, evidence status, and zombie deletion gates to the project Skill.
- Deleted 10 confirmed zombie Markdown documents and the misplaced rollback
  root copy.
- Deleted all 7 non-Markdown siblings in the orphan Task 7.4 evidence
  directory and removed the resulting empty directory.
- Removed the empty Calendar unit-test report and its empty directory.
- Updated runtime spec/progress and extension README to remove deleted routes,
  stale pending lifecycle claims, retired Daily ownership, and Low automatic
  repair wording.
- Current Hogwarts Markdown count is 103:
  `105 baseline - 11 old paths + 8 governance outputs + 1 concurrent protected
  language contract`.
- All 226 source readiness lines were read from Git; every nonblank line is
  covered by a migration-ledger range.
- No zero-byte Markdown remains in the audited Hogwarts routes.
- Root scan returns only `HOGWARTS_MUD_PRODUCT_SPEC.md`; no root debug file
  remains.
- All changed-document relative links resolve.
- `git diff --check` passes.
- The six user-owned language-governance Markdown hashes match the immediate
  pre-implementation snapshot.
- User-owned concurrent changes to `TECH_DEBT.md`,
  `hogwarts-runtime-contracts/language-boundary.md`, the language audit script,
  and language governance test remain intact.

## Technical-Debt Self-Audit

> 这次为了快，有没有留下什么以后要还的账？比如塞进了不该塞的大文件、跳过了哪些测试、临时 hack 了哪里？

Answer: no new debt introduced by this documentation cleanup. There is no
production/test change, compatibility layer, temporary content fallback, or
skipped applicable runtime test. The readiness source was not discarded until
all still-valid and unapproved content had a stable classification. The
rollback-stuck observation predates this change and remains explicitly
`unverified`; without runtime reproduction it is preserved as evidence rather
than falsely registered as current debt or declared fixed.

Closeout is waiting only for the required user decision to `reinventory` or
`defer` the project debt inventory for this core living-contract documentation
change.
