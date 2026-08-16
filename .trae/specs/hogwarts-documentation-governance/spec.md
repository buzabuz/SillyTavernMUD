# Hogwarts Documentation Governance Technical Spec

## Status and Links

- Change ID: `hogwarts-documentation-governance`
- Artifact revision: 3
- Status: approved for implementation
- PRD: [prd.md](./prd.md)
- Inventory: [documentation-inventory.md](./documentation-inventory.md)
- Tasks: [tasks.md](./tasks.md)
- Checklist: [checklist.md](./checklist.md)
- Progress: [progress.md](./progress.md)
- Living field contract:
  [../hogwarts-runtime-contracts/state-fields.md](../hogwarts-runtime-contracts/state-fields.md)

## Semantic Invariant

Document age is not the authority signal. Each document class has one semantic
role and one maintenance owner:

| Class | Canonical location | Authority and maintenance rule |
| --- | --- | --- |
| Active PRD registry | `HOGWARTS_MUD_PRODUCT_SPEC.md` | Records every active/research PRD and status transition; links only, never duplicates behavioral contracts |
| Current product intent | `.trae/specs/<change-id>/prd.md` | Updated only when the approved behavior or acceptance boundary changes |
| Current technical design | `.trae/specs/<change-id>/spec.md` | Updated with approved implementation ownership and verification design |
| Execution state | `tasks.md`, `checklist.md`, `progress.md` in the same change | Tracks work and evidence; never overrides PRD or runtime contract |
| Current runtime behavior | `.trae/specs/hogwarts-runtime-contracts/` | Updated in the same change as production behavior |
| Runtime field registry | `.trae/specs/hogwarts-runtime-contracts/state-fields.md` | Sole documentation registry for field meaning, writer, and readers |
| Cross-change debt | `.trae/specs/TECH_DEBT.md` | Updated once at closeout |
| Supporting evidence | `.trae/specs/<change-id>/<evidence-kind>/` | Must be linked from the owning checklist or progress log |
| Extension operations | `public/scripts/extensions/hogwarts-mud/README.md` | User/developer operations and navigation only; no second field contract |
| Prototype snapshot | `prototypes/hogwarts-mud/` | Colocated, non-authoritative snapshot; changed only with the prototype |
| Historical change record | Original `.trae/specs/<change-id>/` | Retained as completed evidence; not rewritten to match current runtime |

A document is a zombie only when it is empty, has no governed owner and no
incoming reference, or presents superseded behavior as current authority.
Being old, complete, or historical is not sufficient.

## Current Documentation Flow

The current system has five documentation flows:

```text
requirement
-> register in HOGWARTS_MUD_PRODUCT_SPEC.md
-> .trae/specs/<change-id>/{prd,spec,tasks,checklist,progress}.md
-> implementation
-> living runtime contract update
-> linked acceptance evidence
-> TECH_DEBT.md closeout
```

```text
runtime field question
-> hogwarts-runtime-contracts/state-fields.md
-> owning domain contract when deeper behavior is needed
-> production code and focused tests for verification
```

```text
historical decision question
-> original stable change directory
-> its PRD/spec/progress and linked evidence
-> never a root-level plan or debug note
```

```text
operational question
-> public/scripts/extensions/hogwarts-mud/README.md
-> canonical runtime/change document by link
```

```text
temporary investigation
-> owning change progress.md or linked evidence subdirectory
-> remove temporary files before closeout
```

## Baseline Mapping

The baseline inventory is generated from:

- Git-tracked Markdown matching the Hogwarts Skill, `.trae/specs/`, root
  Hogwarts/debug documents, the prototype, the extension README, and the
  orphan task evidence directory;
- untracked Markdown under the active user-owned change directory.

The baseline totals are:

| Group | Count | Planned result |
| --- | ---: | --- |
| Governance Skill | 1 | Update |
| Tracked `.trae/specs/` documents | 84 | Delete 3, update 3, retain 78 |
| Root/orphan loose documents | 9 | Remove 8 old paths, update Product Spec |
| Prototype documents | 4 | Retain |
| Extension README | 1 | Update |
| Active untracked user documents | 6 | Protect unchanged |
| Total baseline | 105 | Remove 11 old paths, update 6, retain 82, protect 6 |

The six governance documents, preserved rollback evidence, and readiness
migration ledger in this change directory are audit output, not baseline
documents.

## Deletion Mechanics

Deletion is explicit and subtractive:

1. Rewrite `HOGWARTS_MUD_PRODUCT_SPEC.md` as the canonical active PRD
   registry; do not preserve its stale monolithic contract.
2. Delete the stale root Narrative-First plan.
3. Delete the five empty/resolved root debug documents.
4. Preserve the unverified rollback observation as linked evidence under this
   change, then delete its root copy without claiming the symptom fixed.
5. Delete `.trae/task-7.4-browser-evidence/` as one orphan evidence unit.
6. Delete the empty Calendar unit-test report.
7. Prove the one-request/no-repair invariant remains in current authority,
   then delete the obsolete ordinary-turn repair topic.
8. Produce a section-level destination ledger for the 226-line readiness
   snapshot, then delete the obsolete topic.
9. Remove or replace every textual reference to those paths.

No broad filename, age, or directory deletion command is allowed. The active
untracked change directory and all retained historical change directories are
protected.

## Maintained Entry-Point Updates

### Product PRD Registry

Rewrite `HOGWARTS_MUD_PRODUCT_SPEC.md` as a compact registry with:

- authority boundary: registry only, per-change PRDs remain product truth;
- active/approved implementation changes;
- research or awaiting-approval changes;
- current living runtime contract;
- completed historical PRD index;
- unverified investigation links with explicit status;
- update triggers for creation, approval, scope revision, completion, blocked,
  superseded, and archived transitions;
- permanent one-request/no-second-repair invariant and its authoritative
  destinations.

Every active `.trae/specs/<change-id>/prd.md` must have exactly one registry
row. A row without a target PRD, or an active PRD without a row, fails
closeout.

### Governance Skill

Add a permanent `Documentation Routing And Maintenance` gate that defines:

- canonical locations;
- semantic authority;
- owner and update trigger;
- forbidden root/ad hoc locations;
- legacy archive treatment;
- supporting-evidence linking;
- zombie detection and deletion evidence;
- a closeout scan for forbidden and dangling paths.

The existing five-file change workflow remains unchanged.

### Living Runtime Contract

Update `.trae/specs/hogwarts-runtime-contracts/spec.md` to:

- remove links to the two deleted topics;
- remove the obsolete pending Actor lifecycle status;
- state the current focused-test ownership after monolith decomposition;
- remove Low repair language and refer to the one-request failure contract;
- stop presenting retired Daily behavior as a live reader.

Update `.trae/specs/hogwarts-runtime-contracts/progress.md` to record that its
old readiness and pending-lifecycle notes are superseded by implemented
contracts and this documentation cleanup.

`state-fields.md` is reviewed but does not require a field edit because this
change has no runtime-field impact.

### Extension README

Update `public/scripts/extensions/hogwarts-mud/README.md` only where current
text is known to conflict with the living contract or points at deleted
documents:

- ordinary Low calls use one request and fail directly on invalid output;
- removed runtime-topic links are deleted;
- the document route points to the Skill, current change PRD, and living
  contract;
- the README is explicitly operational and non-authoritative for fields.

This change does not attempt to rewrite unrelated operational instructions.

## Legacy Change Directories

Seven older change directories contain four required top-level artifacts
rather than the current five because they predate the governance rule. They
remain historical records and are not backfilled with invented PRDs:

- `add-calendar-storyline-system`
- `add-save-guard-npc-identity`
- `expand-social-relationship-model`
- `item-system-v2`
- `modularize-hogwarts-mud-client`
- `separate-local-presence-witnesses`
- `stabilize-relational-memory-prompts`

If any is reopened for new product scope, it must first receive all five
current artifacts with explicit authority and approval. Until then, its
existing files are read-only historical evidence.

`hogwarts-runtime-contracts` is a permanent living-contract directory, not an
ordinary change directory. Its `spec.md`, domain topics, field registry,
checklist, and progress log are maintained as runtime documentation; it does
not receive an invented change PRD.

## Runtime Contract Result

Reviewed field path: none.

Runtime field impact: None. The cleanup changes documentation ownership and
links only. No writer, reader, migration, diagnostic, rollback, Prompt, State,
message, Knowledge, or UI field contract changes.

## Failure Handling

- If a planned deletion has any incoming reference not covered by the update
  list, stop and reconcile the owner before deletion.
- If the active user change gains new modifications during implementation,
  leave it untouched and include it in the final protected-path check.
- If the rollback symptom needs product work, open a separate five-artifact
  change and obtain runtime reproduction evidence; this cleanup neither fixes
  nor closes it.
- If a historical artifact is discovered to be the sole evidence for a
  current invariant, move that invariant into the maintained runtime contract
  before deleting the artifact; do not preserve dual authority.
- If a deleted path remains referenced after cleanup, verification fails.
- No automatic content migration or guessed archival rewrite is allowed.

## Verification Design

1. Recount tracked and untracked Hogwarts Markdown paths.
2. Assert every deletion target is absent and every protected path remains.
3. Search the repository for each deleted basename and path.
4. Search for forbidden root patterns:
   `HOGWARTS_MUD_*.md` except `HOGWARTS_MUD_PRODUCT_SPEC.md`, and
   `debug-*.md`.
5. Validate relative Markdown links in the changed documentation.
6. Run `git diff --check`.
7. Review the final diff to ensure no production, save, Prompt, test, or
   prototype code changed.
8. Verify the technical-debt ledger counters against its rows.
9. Verify every active/research PRD has exactly one Product Spec registry row.
10. Verify the ordinary-turn invariant proof, readiness destination ledger,
    and rollback `unverified` evidence before confirming their old paths are
    absent.

No model call, blind model simulation, browser test, or runtime test is
required because Prompt and runtime behavior are unchanged.

## Rollback

Rollback is a Git revert of the documentation change. The deleted orphan
evidence has no runtime consumer. No save, index, migration, or service restart
is involved.
