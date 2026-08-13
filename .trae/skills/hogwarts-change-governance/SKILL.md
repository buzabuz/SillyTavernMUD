---
name: "hogwarts-change-governance"
description: "Requires production-system reconnaissance, prompt budgets, and real-save verification. Invoke before analyzing, planning, debugging, implementing, or reviewing Hogwarts MUD changes."
---

# Hogwarts Change Governance

## Scope Guard

This is a project-only, mandatory governance skill.

1. Resolve the current Git worktree root before doing requirement work.
2. Apply this skill only when the resolved root is exactly `/Users/bytedance/sillytavern/SillyTavern`.
3. Do not apply or copy these rules to another repository.
4. Within this repository, invoke this skill before analyzing, planning, debugging, implementing, or reviewing any Hogwarts MUD requirement or behavior change.
5. This skill governs business changes. Maintaining this governance skill itself may proceed through the `skill-creator` workflow.

## Authoritative Artifacts

For every change, create or reuse exactly one stable directory:

```text
.trae/specs/<change-id>/
```

`<change-id>` must be a stable, descriptive kebab-case identifier. Reuse the same identifier for follow-up work on the same requirement. Never create date-stamped, attempt-specific, implementation-phase, or debug variants of the change directory.

The directory must contain and continuously maintain these five files:

```text
prd.md
spec.md
tasks.md
checklist.md
progress.md
```

Their authority is distinct:

- `prd.md`: long-lived product intent, behavioral contract, boundaries, migration intent, budgets, whitelist, and acceptance criteria.
- `spec.md`: approved technical design, data flow, writer/reader ownership, migration mechanics, and verification design.
- `tasks.md`: finite implementation work breakdown with stable task IDs and statuses.
- `checklist.md`: approval, contract, quality, migration, security, regression, and acceptance gates.
- `progress.md`: chronological execution log, evidence links, blockers, decisions, and current status.

Never use task status or `progress.md` as a substitute for the long-lived PRD. Never make a scattered debug note, ad hoc root document, chat transcript, browser evidence report, or test report authoritative. Supporting evidence may live under `.trae/specs/<change-id>/` and must be linked from `checklist.md` or `progress.md`; authority remains with the five files above and the living runtime contract.

## Mandatory Workflow

Follow these gates in order. Do not skip or reorder them.

### Gate 1: Identify And Reuse The Change

1. Search `.trae/specs/` for an existing directory that represents the same requirement.
2. Reuse it when the product intent and acceptance boundary are the same.
3. Create a new stable `<change-id>` only for a genuinely distinct change.
4. Create any missing one of the five required files before continuing.

### Gate 2: Map The Existing Production System Before Designing

Do not design from field names, schemas, tests, or a previous agent's summary. Before proposing a solution, trace the behavior through the real production path.

1. Read the actual entry point, orchestration path, prompt builder, projectors, retrieval path, reducers, persistence path, and every direct production reader and writer affected by the change.
2. Trace the end-to-end call graph from user action to persisted result. Include legacy readers, compatibility projectors, fallbacks, repair paths, and asynchronous boundaries.
3. Record in `prd.md` and `spec.md`:
   - the current authoritative source for each semantic fact;
   - every transformation and prompt projection of that fact;
   - every production reader and writer;
   - which old reader, field, or projection will be removed or replaced;
   - which behavior is proven from real runtime evidence rather than inferred from code shape.
4. For any prompt-affecting change, use the real production prompt builder in model-free build-only mode against the active representative save before implementation. Record:
   - total characters and estimated tokens;
   - System Prompt and output Schema sizes;
   - per-section size, source path, audience, and authoritative owner;
   - repeated semantic sources and duplicate payloads;
   - the largest fields and current trimming behavior.
5. If no build-only path exists, creating a deterministic measurement path is the first implementation task after approval. Do not change prompt contents before the baseline exists.
6. Synthetic fixtures and unit tests may supplement this map but may not replace the real-save baseline or production call graph.

Stop here if the original system is not understood well enough to identify all current writers, readers, prompt projections, and removal targets. Do not add a new layer beside an unknown old layer.

### Gate 3: Reconcile The Living Runtime Contract

Before drafting or revising the PRD, inspect:

```text
.trae/specs/hogwarts-runtime-contracts/state-fields.md
```

This file is the living runtime field contract and remains authoritative across individual changes.

For every state, message, prompt projection, knowledge projection, UI session, or UI projection field that the change reads, writes, migrates, aliases, deprecates, or exposes:

1. Confirm its real semantic meaning.
2. Confirm exactly one authoritative writer.
3. Confirm all production readers affected by the change.
4. Confirm migration, removal, diagnostic, and rollback semantics.
5. Update the corresponding registry rows before proceeding when any of these facts change or are missing.
6. Record the reviewed field paths and contract result in the change PRD and spec.

Do not invent meaningless contract edits. If the change touches no runtime field, explicitly record `Runtime field impact: None` with the reason in both `prd.md` and `spec.md`. An undocumented field impact blocks approval and implementation.

### Gate 4: Complete The PRD

`prd.md` must be decision-complete and include all of these sections:

1. `Change ID and Status`
2. `Problem and Evidence`
3. `Before`
4. `After`
5. `In Scope`
6. `Non-Goals`
7. `Runtime Contract Impact`
8. `Migration and Compatibility`
9. `Prompt Field Budget`
10. `Frontend Field Whitelist`
11. `Acceptance Criteria`
12. `Risks and Rollback`
13. `Approval`

Requirements for key sections:

- `Before` and `After` describe externally observable behavior and authoritative data flow, not task progress.
- `Migration and Compatibility` defaults to one-time atomic migration followed by deletion of old fields. Long-term dual-read, dual-write, fallback projectors, compatibility periods, and generic legacy archaeology are forbidden unless the user explicitly requests them in the approved PRD. Define old-save behavior, atomicity, failure rollback, and old-field removal.
- `Prompt Field Budget` must start from the measured real-save baseline. It lists each added, removed, or changed prompt field; authoritative source; audience; before/after characters and estimated tokens; hard budget; trimming or omission rule; replacement/removal target; and whether it is protected. Explicitly write `None` only after the production prompt path proves there is no prompt impact.
- Numeric Prompt budgets must be derived from the active role configuration and the production budget function, currently `modelSlots[role].contextSize`, `modelSlots[role].maxResponseLength`, and `createContextBudgetPlan(...).maxPromptCharacters`. Never invent a limit, copy one from memory, or present an optimization target as an existing runtime setting.
- Record the configured runtime ceiling and any proposed product target separately. A lower product target is not authoritative until the user explicitly approves it in the current PRD revision. Do not claim a separate System Prompt cap unless the production runtime actually enforces one.
- System Prompt, output Schema, player action, current Authority Snapshot, and current-scene actor capsule contract are protected. Protection means they cannot be silently truncated; it does not permit them to exceed the approved total budget.
- Full actor libraries, raw `actorKnowledge`, full Social Graph state, raw database records, and unbounded transcript/history are forbidden prompt inputs unless the PRD explicitly proves their necessity and budget.
- Event and memory sharing defaults to stable IDs and authoritative lookup. Do not copy the same event summary into multiple witnesses, projections, capsules, and prompt sections.
- Every newly injected projection must name the old prompt reader or payload it replaces. Additive injection without a same-change removal plan is forbidden.
- `Frontend Field Whitelist` lists the exact state, projection, and UI session fields the frontend may read or write. Anything absent is forbidden. Explicitly write `None` when there is no frontend impact.
- `Acceptance Criteria` must be observable, testable, and traceable to `tasks.md` and `checklist.md`.

### Gate 5: Complete The Technical Spec And Execution Files

Before seeking approval:

1. Make `spec.md` map every PRD behavior to components, data flow, runtime-contract rows, writer/reader ownership, migration, old-field removal, failure handling, and verification.
2. Make `tasks.md` use stable task IDs, dependencies, expected files, verification, and one of `pending`, `in_progress`, `blocked`, or `completed`.
3. Make `checklist.md` cover all PRD acceptance criteria plus contract ownership, prompt budget, duplicate-source elimination, frontend whitelist, migration, regression, real-save prompt measurement, and rollback checks.
4. Initialize `progress.md` with the current phase, artifact revision, completed governance work, open decisions, and evidence links.
5. Cross-link all five files and the living runtime contract.

At most one task may be `in_progress`. Before implementation approval, implementation tasks remain `pending`.

### Gate 6: Obtain Explicit Approval

Present the current `prd.md`, `spec.md`, `tasks.md`, and `checklist.md` for review and stop.

Implementation is forbidden until the user explicitly approves the current artifact revision. Silence, prior approval of an older revision, approval of only the general idea, or a request to "continue" before reviewing the artifacts is not approval.

Before approval, allowed work is limited to read-only investigation and governance-document or living-contract updates. Do not edit business code, run migrations, or make implementation changes.

If product scope, authoritative field semantics, migration behavior, prompt budget, frontend whitelist, or acceptance criteria materially change after approval:

1. Update the affected artifacts.
2. Mark approval stale in `prd.md` and `progress.md`.
3. Request explicit approval again.
4. Stop implementation until re-approved.

### Gate 7: Implement And Maintain Status

After approval:

1. Set only the active task to `in_progress` before editing its implementation files.
2. Before editing a production path, read its current implementation, direct callers, downstream readers, fallback behavior, and prompt assembly consumers. Do not implement from a schema or test fixture alone.
3. Implement replacements subtractively: migrate readers and remove obsolete prompt projections in the same approved task. Do not leave old and new semantic payloads injected side by side.
4. Compatibility projections may serve migration or UI boundaries only when explicitly approved. They must not silently re-enter model prompts as a second source of the same fact.
5. After every prompt-affecting task, rebuild the real prompt without a model call and compare it with the approved baseline. Record per-section and total deltas immediately.
6. Treat any unexplained prompt growth, duplicate semantic source, hard-budget violation, protected-field truncation, or full-database injection as a failed task, even when unit tests pass.
7. Implement within the approved scope and contract.
8. Update `tasks.md`, `checklist.md`, and `progress.md` as each task or gate changes state.
9. Record deviations and blockers immediately; do not silently widen scope.
10. Keep `prd.md` focused on durable product truth. Change it only when product intent or acceptance changes.
11. Keep `spec.md` synchronized with approved technical decisions and runtime-contract ownership.

### Gate 8: Close The Change

A change is complete only when:

1. Every required task is `completed` or explicitly removed through an approved scope revision.
2. Every checklist item is passed, waived with explicit user approval, or documented as blocked.
3. Acceptance evidence is linked from `checklist.md` or `progress.md`.
4. `progress.md` records the final result, verification commands, residual risks, and completion date.
5. The living runtime contract reflects the implemented writer, reader, and compatibility semantics.
6. No debug or progress artifact claims authority over the PRD, spec, or runtime contract.
7. The production prompt is rebuilt from the active representative save through the real runtime path. The final evidence includes total size, protected-section sizes, per-section sizes, largest fields, and before/after deltas.
8. Prompt-affecting changes prove that duplicate semantic sources are removed, reference-based memory resolves correctly, and no old full-state projection remains beside its replacement.
9. At least one real end-to-end affected workflow succeeds when safe and approved. A model-free prompt build is always required; unit tests alone are never completion evidence.
10. The approved prompt budget passes without trimming System Prompt or output Schema. A functional test suite, checklist count, or vector-backend health result cannot override a real prompt-budget failure.

## Incident-Derived Non-Negotiable Lesson

On 2026-08-12, a memory and retrieval change was incorrectly declared complete after extensive unit and integration tests while the real Junior Director Prompt expanded beyond its usable budget. New Authority, capsule, provenance, diagnostics, and retrieval projections were added without first removing overlapping legacy actor, knowledge, relationship, and transcript payloads.

This failure establishes permanent rules:

1. Functional correctness, ACL correctness, and passing tests do not imply context safety or product completion.
2. Never add a new memory, authority, retrieval, or diagnostic projection to a Prompt until the existing production Prompt has been measured and its overlapping readers are identified.
3. Never preserve both a full legacy payload and its compact replacement in the same Prompt for convenience.
4. Qdrant, RAG, EventStore, and relational memory are retrieval systems. Their databases do not belong in the Prompt; only bounded, audience-safe projections and stable source references do.
5. A completion claim is forbidden unless the real representative save passes the approved prompt budget and affected end-to-end workflow.
6. When a real-save measurement contradicts synthetic tests, the real production measurement wins and the task remains incomplete.

## Stop Conditions

Stop and ask for resolution when any of these is true:

- The repository root does not match the exact project path.
- The correct stable `<change-id>` cannot be determined without changing product scope.
- A field would have multiple authoritative writers.
- A reader depends on a field outside the frontend whitelist or documented runtime contract.
- Atomic migration or old-field removal semantics are unknown.
- Prompt growth has no explicit field-level budget or overflow behavior.
- The real production call graph, existing prompt readers, or semantic removal targets have not been mapped.
- A prompt-affecting change lacks a measured real-save baseline from the production builder.
- A new projection would coexist with an overlapping legacy payload without explicit approved migration and removal.
- The affected role exceeds the runtime-derived Prompt budget or an explicitly approved PRD target, duplicates semantic sources, or requires protected-field truncation.
- Only synthetic fixtures or unit tests support the completion claim.
- The current artifact revision lacks explicit approval.
- Implementation behavior would differ materially from the approved PRD or spec.

Do not bypass a stop condition with an ad hoc debug document, temporary compatibility field, dual-read fallback, silent default, or progress-log decision.
