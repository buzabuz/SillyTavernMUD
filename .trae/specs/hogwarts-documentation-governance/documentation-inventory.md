# Hogwarts Documentation Inventory

## Baseline

- Audit date: 2026-08-14
- Repository root: `/Users/bytedance/sillytavern/SillyTavern`
- Tracked Hogwarts Markdown documents: 99
- Active untracked user Markdown documents: 6
- Total baseline documents: 105
- Planned result: delete 10 zombie documents, relocate 1 misplaced
  investigation, rehabilitate the stale Product Spec, update 5 other
  maintained documents, retain 82 tracked documents, and protect 6 active
  untracked documents
- Eight governance documents in this directory are audit output and are not
  counted in the baseline.

Generic SillyTavern documentation, dependency documentation, generated test
results, and third-party Markdown are outside this inventory.

## Remove From Old Paths: 10 Zombies And 1 Relocated Investigation

| Path | Lines | Last tracked update | Evidence |
| --- | ---: | --- | --- |
| `HOGWARTS_MUD_NARRATIVE_FIRST_TURN_PLAN.md` | 173 | 2026-08-08 | Unreferenced root protocol; requires Low `memoryUpdate` forbidden by current contract |
| `debug-latest-turn-rule-conflict.md` | 50 | 2026-08-13 | Resolved ad hoc debug note; no owner or incoming reference |
| `debug-missing-new-character.md` | 0 | 2026-08-13 | Empty root debug file |
| `debug-new-actor-entry-blocked.md` | 0 | 2026-08-13 | Empty root debug file |
| `debug-quill-transition-custody.md` | 0 | 2026-08-13 | Empty root debug file |
| `debug-rollback-action-stuck.md` | 31 | 2026-08-13 | Misplaced unverified investigation; preserve as linked evidence before deleting root copy |
| `debug-scene-performance-failure.md` | 0 | 2026-08-13 | Empty root debug file |
| `.trae/task-7.4-browser-evidence/task-7.4-report.md` | 11 | 2026-08-13 | Orphan evidence outside a stable change directory; no external link |
| `.trae/specs/add-calendar-storyline-system/unit-test/ut_test_report.md` | 0 | 2026-08-13 | Empty and unreferenced report |
| `.trae/specs/hogwarts-runtime-contracts/ordinary-turn-repair.md` | 64 | 2026-08-09 | Current-looking topic permits a second Low repair request |
| `.trae/specs/hogwarts-runtime-contracts/item-npc-calendar-readiness.md` | 226 | 2026-08-13 | Current-looking readiness topic treats implemented Identity/Calendar as pending |

The table removes eleven old paths, but only ten documents are classified as
zombie content. The rollback observation is preserved at
[evidence/rollback-action-stuck.md](./evidence/rollback-action-stuck.md)
because static inspection cannot prove the reported symptom fixed.

The orphan evidence directory is deleted as a unit. In addition to its one
Markdown document, these seven sibling artifacts are removed:

- `.trae/task-7.4-browser-evidence/SHA256SUMS.txt`
- `.trae/task-7.4-browser-evidence/task-7.4-dom-evidence.json`
- `.trae/task-7.4-browser-evidence/task-7.4-390px-emulated.png`
- `.trae/task-7.4-browser-evidence/task-7.4-harry-dossier-desktop.png`
- `.trae/task-7.4-browser-evidence/task-7.4-harry-dossier-region.png`
- `.trae/task-7.4-browser-evidence/task-7.4-stale-conflict-disabled.png`
- `.trae/task-7.4-browser-evidence/task-7.4-stale-conflict-warning.png`

## Update: Product Spec Registry And 5 Maintained Documents

| Path | Maintenance action |
| --- | --- |
| `HOGWARTS_MUD_PRODUCT_SPEC.md` | Replace the stale monolith with the canonical registry for every active/research PRD, current runtime contract, completed archive, status transition, and permanent one-request invariant |
| `.trae/skills/hogwarts-change-governance/SKILL.md` | Add canonical route, ownership, update triggers, prohibited locations, archive rules, and zombie gate |
| `.trae/specs/TECH_DEBT.md` | Add one governance closeout row and reconcile counters |
| `.trae/specs/hogwarts-runtime-contracts/spec.md` | Remove obsolete topic links/status, Low repair wording, retired Daily reader, and monolith test ownership |
| `.trae/specs/hogwarts-runtime-contracts/progress.md` | Mark readiness and pending lifecycle notes as superseded and record cleanup |
| `public/scripts/extensions/hogwarts-mud/README.md` | Correct known Low repair/routing conflicts while preserving unrelated operations |

## Retain: 82 Tracked Documents

### Governed Change And Runtime Documents: 78

#### `.trae/specs/add-calendar-storyline-system/`

- `.trae/specs/add-calendar-storyline-system/browser-evidence/report.md`
- `.trae/specs/add-calendar-storyline-system/browser-evidence/task9-playwright-gate.md`
- `.trae/specs/add-calendar-storyline-system/checklist.md`
- `.trae/specs/add-calendar-storyline-system/progress.md`
- `.trae/specs/add-calendar-storyline-system/spec.md`
- `.trae/specs/add-calendar-storyline-system/task-8-9-final-verification-evidence.md`
- `.trae/specs/add-calendar-storyline-system/task-9-save-baseline-evidence.md`
- `.trae/specs/add-calendar-storyline-system/tasks.md`

#### `.trae/specs/add-save-guard-npc-identity/`

- `.trae/specs/add-save-guard-npc-identity/browser-evidence/evidence.md`
- `.trae/specs/add-save-guard-npc-identity/browser-evidence/final-birth-badges/acceptance-summary.md`
- `.trae/specs/add-save-guard-npc-identity/checklist.md`
- `.trae/specs/add-save-guard-npc-identity/progress.md`
- `.trae/specs/add-save-guard-npc-identity/spec.md`
- `.trae/specs/add-save-guard-npc-identity/tasks.md`
- `.trae/specs/add-save-guard-npc-identity/unit-test/ut_test_report.md`

#### `.trae/specs/compact-timeline-appraisal-lifecycle/`

- `.trae/specs/compact-timeline-appraisal-lifecycle/checklist.md`
- `.trae/specs/compact-timeline-appraisal-lifecycle/prd.md`
- `.trae/specs/compact-timeline-appraisal-lifecycle/progress.md`
- `.trae/specs/compact-timeline-appraisal-lifecycle/spec.md`
- `.trae/specs/compact-timeline-appraisal-lifecycle/tasks.md`

#### `.trae/specs/expand-social-relationship-model/`

- `.trae/specs/expand-social-relationship-model/checklist.md`
- `.trae/specs/expand-social-relationship-model/progress.md`
- `.trae/specs/expand-social-relationship-model/spec.md`
- `.trae/specs/expand-social-relationship-model/tasks.md`
- `.trae/specs/expand-social-relationship-model/unit-test/ut_test_report.md`

#### `.trae/specs/hogwarts-knowledge-activation-revision-root-fix/`

- `.trae/specs/hogwarts-knowledge-activation-revision-root-fix/checklist.md`
- `.trae/specs/hogwarts-knowledge-activation-revision-root-fix/prd.md`
- `.trae/specs/hogwarts-knowledge-activation-revision-root-fix/progress.md`
- `.trae/specs/hogwarts-knowledge-activation-revision-root-fix/spec.md`
- `.trae/specs/hogwarts-knowledge-activation-revision-root-fix/tasks.md`

#### `.trae/specs/hogwarts-low-provenance-participle-fix/`

- `.trae/specs/hogwarts-low-provenance-participle-fix/checklist.md`
- `.trae/specs/hogwarts-low-provenance-participle-fix/prd.md`
- `.trae/specs/hogwarts-low-provenance-participle-fix/progress.md`
- `.trae/specs/hogwarts-low-provenance-participle-fix/spec.md`
- `.trae/specs/hogwarts-low-provenance-participle-fix/tasks.md`

#### `.trae/specs/hogwarts-prompt-payload-consolidation/`

- `.trae/specs/hogwarts-prompt-payload-consolidation/checklist.md`
- `.trae/specs/hogwarts-prompt-payload-consolidation/prd.md`
- `.trae/specs/hogwarts-prompt-payload-consolidation/progress.md`
- `.trae/specs/hogwarts-prompt-payload-consolidation/spec.md`
- `.trae/specs/hogwarts-prompt-payload-consolidation/tasks.md`

#### `.trae/specs/hogwarts-runtime-contracts/`

- `.trae/specs/hogwarts-runtime-contracts/actor-memory.md`
- `.trae/specs/hogwarts-runtime-contracts/checklist.md`
- `.trae/specs/hogwarts-runtime-contracts/item-lifecycle.md`
- `.trae/specs/hogwarts-runtime-contracts/knowledge-runtime.md`
- `.trae/specs/hogwarts-runtime-contracts/presence-scene-transition.md`
- `.trae/specs/hogwarts-runtime-contracts/spell-observation.md`
- `.trae/specs/hogwarts-runtime-contracts/state-fields.md`

#### `.trae/specs/hogwarts-test-suite-decomposition/`

- `.trae/specs/hogwarts-test-suite-decomposition/checklist.md`
- `.trae/specs/hogwarts-test-suite-decomposition/prd.md`
- `.trae/specs/hogwarts-test-suite-decomposition/progress.md`
- `.trae/specs/hogwarts-test-suite-decomposition/spec.md`
- `.trae/specs/hogwarts-test-suite-decomposition/tasks.md`
- `.trae/specs/hogwarts-test-suite-decomposition/test-migration-manifest.md`

#### `.trae/specs/item-system-v2/`

- `.trae/specs/item-system-v2/checklist.md`
- `.trae/specs/item-system-v2/progress.md`
- `.trae/specs/item-system-v2/spec.md`
- `.trae/specs/item-system-v2/tasks.md`

#### `.trae/specs/modularize-hogwarts-mud-client/`

- `.trae/specs/modularize-hogwarts-mud-client/checklist.md`
- `.trae/specs/modularize-hogwarts-mud-client/progress.md`
- `.trae/specs/modularize-hogwarts-mud-client/spec.md`
- `.trae/specs/modularize-hogwarts-mud-client/tasks.md`
- `.trae/specs/modularize-hogwarts-mud-client/unit-test/ut_test_report.md`

#### `.trae/specs/separate-local-presence-witnesses/`

- `.trae/specs/separate-local-presence-witnesses/checklist.md`
- `.trae/specs/separate-local-presence-witnesses/progress.md`
- `.trae/specs/separate-local-presence-witnesses/spec.md`
- `.trae/specs/separate-local-presence-witnesses/tasks.md`
- `.trae/specs/separate-local-presence-witnesses/unit-test/ut_test_report.md`

#### `.trae/specs/stabilize-relational-memory-prompts/`

- `.trae/specs/stabilize-relational-memory-prompts/checklist.md`
- `.trae/specs/stabilize-relational-memory-prompts/progress.md`
- `.trae/specs/stabilize-relational-memory-prompts/spec.md`
- `.trae/specs/stabilize-relational-memory-prompts/tasks.md`
- `.trae/specs/stabilize-relational-memory-prompts/unit-test/ut_test_report.md`

#### `.trae/specs/unify-actor-context-memory/`

- `.trae/specs/unify-actor-context-memory/checklist.md`
- `.trae/specs/unify-actor-context-memory/prd.md`
- `.trae/specs/unify-actor-context-memory/progress.md`
- `.trae/specs/unify-actor-context-memory/spec.md`
- `.trae/specs/unify-actor-context-memory/tasks.md`
- `.trae/specs/unify-actor-context-memory/unit-test/ut_test_report.md`

### Colocated Prototype Snapshot: 4

- `prototypes/hogwarts-mud/RESEARCH.md`
- `prototypes/hogwarts-mud/UI_KIT_DECISION.md`
- `prototypes/hogwarts-mud/UI_SPEC.md`
- `prototypes/hogwarts-mud/assets/ASSET_MANIFEST.md`

These four documents describe the runnable prototype beside them. They are
non-authoritative for production runtime behavior and are changed only with
the prototype.

## Protect Unchanged: 6 Active Untracked User Documents

- `.trae/specs/hogwarts-language-structured-input-identity-codes/checklist.md`
- `.trae/specs/hogwarts-language-structured-input-identity-codes/prd.md`
- `.trae/specs/hogwarts-language-structured-input-identity-codes/progress.md`
- `.trae/specs/hogwarts-language-structured-input-identity-codes/research-findings.md`
- `.trae/specs/hogwarts-language-structured-input-identity-codes/spec.md`
- `.trae/specs/hogwarts-language-structured-input-identity-codes/tasks.md`

These paths existed before this audit and remain outside the cleanup diff.

## Concurrent Protected Document Added After Baseline

- `.trae/specs/hogwarts-runtime-contracts/language-boundary.md`

This user-owned living-contract document appeared after the 105-document
baseline. It is outside the cleanup diff and raises the current final document
count by one.

## Governance Outputs Added: 8

- `.trae/specs/hogwarts-documentation-governance/checklist.md`
- `.trae/specs/hogwarts-documentation-governance/documentation-inventory.md`
- `.trae/specs/hogwarts-documentation-governance/evidence/item-npc-calendar-readiness-migration.md`
- `.trae/specs/hogwarts-documentation-governance/evidence/rollback-action-stuck.md`
- `.trae/specs/hogwarts-documentation-governance/prd.md`
- `.trae/specs/hogwarts-documentation-governance/progress.md`
- `.trae/specs/hogwarts-documentation-governance/spec.md`
- `.trae/specs/hogwarts-documentation-governance/tasks.md`

## Current Result

Current Hogwarts Markdown documents: 103.

```text
105 baseline
- 11 removed old document paths
+ 8 governance outputs
+ 1 concurrent protected language contract
= 103 current documents
```

The sole root Hogwarts Markdown file is now
`HOGWARTS_MUD_PRODUCT_SPEC.md`. No root debug document remains.

## Legacy Four-File Archives

The following retained directories predate the five-file governance rule:

- `.trae/specs/add-calendar-storyline-system/`
- `.trae/specs/add-save-guard-npc-identity/`
- `.trae/specs/expand-social-relationship-model/`
- `.trae/specs/item-system-v2/`
- `.trae/specs/modularize-hogwarts-mud-client/`
- `.trae/specs/separate-local-presence-witnesses/`
- `.trae/specs/stabilize-relational-memory-prompts/`

They remain historical evidence. Reopening one for new scope requires creating
the missing current artifact and obtaining approval; this audit does not
invent historical PRDs.
