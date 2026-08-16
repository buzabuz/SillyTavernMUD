# Hogwarts Documentation Governance Checklist

## Links

- [PRD](./prd.md)
- [Technical spec](./spec.md)
- [Tasks](./tasks.md)
- [Inventory](./documentation-inventory.md)
- [Progress](./progress.md)
- [Living field contract](../hogwarts-runtime-contracts/state-fields.md)

## Approval

- [x] One stable change directory is used.
- [x] All five required governance artifacts exist.
- [x] Revision 3 has a finite cleanup, preservation, and Product Spec registry
  matrix.
- [x] The user explicitly approved revision 3 requirements on 2026-08-14.

## Audit Coverage

- [x] All 99 tracked baseline Hogwarts Markdown documents are classified.
- [x] All 6 active untracked user documents are classified and protected.
- [x] Generic SillyTavern and third-party documentation is excluded.
- [x] Git history, line counts, incoming references, and authority conflicts
  were inspected.
- [x] Historical age alone is not used as deletion evidence.

## Contract Boundaries

- [x] Runtime field impact is explicitly `None`.
- [x] Prompt field budget impact is explicitly `None`.
- [x] Frontend field whitelist impact is explicitly `None`.
- [x] No save, State, message, Knowledge, Prompt, UI, migration, or model-call
  behavior changes.
- [x] Blind model simulation is not applicable.
- [x] Real-save verification is not applicable.

## Deletion Gate

- [x] The stricter one-request/no-second-repair invariant is proven present in
  current authority before deleting the old repair topic.
- [x] The
  [readiness migration ledger](./evidence/item-npc-calendar-readiness-migration.md)
  accounts for every section of the 226-line snapshot before deletion.
- [x] The unverified rollback observation is preserved at a stable linked
  repository path and visibly marked `unverified`.
- [x] Exactly 10 approved zombie Markdown documents are deleted.
- [x] The stale Product Spec is rewritten as the canonical PRD registry.
- [x] The unverified rollback observation is preserved as linked evidence.
- [x] The misplaced root rollback document is deleted without claiming the
  reported symptom fixed.
- [x] The 7 non-Markdown siblings in the orphan evidence directory are
  deleted.
- [x] No broad age-based or directory-wide deletion touches retained history.
- [x] No root `HOGWARTS_MUD_*.md` remains except
  `HOGWARTS_MUD_PRODUCT_SPEC.md`.
- [x] No root `debug-*.md` remains.
- [x] The empty Calendar unit-test report is absent.
- [x] The obsolete Low repair topic is absent.
- [x] The obsolete Item/NPC/Calendar readiness topic is absent.
- [x] Deleted paths have no live reference outside the approved governance
  inventory and source-evidence records.

## Routing Gate

- [x] The Skill lists every canonical document class and path.
- [x] The Product Spec registry lists every active/research PRD exactly once.
- [x] Product Spec status transitions have an explicit update trigger.
- [x] The Skill names authority, owner, and update trigger for each class.
- [x] The Skill forbids root plans/specs/debug notes and orphan evidence,
  except for the canonical Product Spec registry.
- [x] The Skill distinguishes historical archives from current authority.
- [x] The Skill requires evidence links from checklist or progress.
- [x] The Skill defines zombie detection and deletion evidence.
- [x] The extension README points to the canonical route and living contract.

## Maintained Documents

- [x] Runtime contract index drops deleted topic links.
- [x] Runtime contract index no longer marks implemented Actor lifecycle work
  as pending.
- [x] Runtime contract index uses focused test ownership after monolith
  decomposition.
- [x] Runtime contract wording matches single-attempt Low failure.
- [x] Runtime progress marks old readiness/pending notes as superseded.
- [x] Extension README does not claim Low automatic repair.
- [x] Unrelated operational instructions remain unchanged.

## Protected Content

- [x] The six untracked
  `.trae/specs/hogwarts-language-structured-input-identity-codes/` files are
  byte-for-byte unchanged.
- [x] Prototype code, assets, and four colocated snapshot documents remain.
- [x] Completed change artifacts remain in their original stable directories.
- [x] Generic repository documentation remains untouched.
- [x] This change does not modify production or test code; unrelated user
  changes remain untouched.

## Verification

- [x] Final current document count `103` matches baseline, cleanup, governance
  outputs, and the concurrent protected language contract.
- [x] Repository search finds no live deleted-path reference outside approved
  governance history/evidence.
- [x] Changed Markdown relative links resolve.
- [x] `git diff --check` passes.
- [x] This change's diff contains only approved documentation and orphan
  evidence cleanup; unrelated user changes remain intact.
- [ ] Technical-debt ledger counters match ledger rows.

## Closeout

- [ ] Progress records commands, evidence, residual risk, and completion date.
- [ ] The required debt self-audit is recorded.
- [ ] A single `TECH_DEBT.md` row records `kind=governance` and
  `feature_delta=0`.
- [ ] The cumulative feature count is reported.
- [ ] The user decides whether to re-inventory technical debt for this
  core documentation-contract change.
