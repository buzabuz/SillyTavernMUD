# Hogwarts Documentation Governance Tasks

## Links

- [PRD](./prd.md)
- [Technical spec](./spec.md)
- [Inventory](./documentation-inventory.md)
- [Checklist](./checklist.md)
- [Progress](./progress.md)
- [Living field contract](../hogwarts-runtime-contracts/state-fields.md)

## Work Items

- [x] **HDG-01 - Audit the documentation baseline** (`completed`)
  - Dependencies: none
  - Files: read-only repository inspection
  - Result: counted 99 tracked and 6 active untracked Hogwarts Markdown
    documents; captured path, line count, Git date, references, and authority
    role.
  - Verification: [documentation-inventory.md](./documentation-inventory.md)

- [x] **HDG-02 - Define zombie criteria and the exact cleanup matrix**
  (`completed`)
  - Dependencies: HDG-01
  - Files: `prd.md`, `spec.md`, `documentation-inventory.md`
  - Result: 10 zombie documents to delete, 1 stale Product Spec to
    rehabilitate, 1 misplaced rollback investigation path, 7 orphan sibling
    artifacts, maintained entry-point updates, and protected historical/user
    paths.
  - Verification: PRD migration matrix matches the inventory.

- [x] **HDG-03 - Obtain explicit approval for artifact revision 3**
  (`completed`)
  - Dependencies: HDG-01, HDG-02
  - Files: `prd.md`, `spec.md`, `tasks.md`, `checklist.md`, `progress.md`
  - Verification: user explicitly approved the overall cleanup on 2026-08-14,
    conditioned deletion on three evidence gates, and directed the root
    Product Spec to become the active PRD registry.

- [x] **HDG-04 - Remove approved zombie paths and orphan evidence**
  (`completed`)
  - Dependencies: HDG-03
  - Files: deletion targets plus
    `evidence/item-npc-calendar-readiness-migration.md`
  - Verification: one-request invariant retained; all 226 readiness lines
    accounted for; rollback evidence stable and `unverified`; only then all
    old targets absent.

- [x] **HDG-05 - Install the permanent documentation route in the Skill**
  (`completed`)
  - Dependencies: HDG-03
  - Files: `HOGWARTS_MUD_PRODUCT_SPEC.md`,
    `.trae/skills/hogwarts-change-governance/SKILL.md`
  - Verification: route covers authority, location, owner, trigger, forbidden
    paths, Product Spec PRD registration, historical archives, evidence, and
    zombie deletion gates.

- [x] **HDG-06 - Reconcile maintained documentation entry points**
  (`completed`)
  - Dependencies: HDG-03, HDG-04
  - Files:
    `.trae/specs/hogwarts-runtime-contracts/spec.md`,
    `.trae/specs/hogwarts-runtime-contracts/progress.md`,
    `public/scripts/extensions/hogwarts-mud/README.md`
  - Verification: no deleted-path reference; no known Low automatic-repair or
    pending Identity/Calendar claim remains current.

- [x] **HDG-07 - Run documentation verification** (`completed`)
  - Dependencies: HDG-04, HDG-05, HDG-06
  - Files: repository-wide read-only checks
  - Verification: counts, protected paths, dangling references, relative
    Markdown links, forbidden root patterns, and `git diff --check`.

- [ ] **HDG-08 - Close governance and technical-debt records** (`in_progress`)
  - Dependencies: HDG-07
  - Files: `checklist.md`, `progress.md`, `.trae/specs/TECH_DEBT.md`
  - Verification: one ledger row with `kind=governance`, `feature_delta=0`,
    counter reconciliation, debt self-audit, and user decision on core-change
    debt re-inventory.

At most one task is in progress. HDG-03 approval is complete.
