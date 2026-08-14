---
name: "hogwarts-change-governance"
description: "Requires business semantics, production reconnaissance, prompt budgets, single-attempt failure, blind simulation, and real-save verification. Invoke for any Hogwarts MUD change."
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

The cross-change technical-debt and feature-count authority is:

```text
.trae/specs/TECH_DEBT.md
```

It is a project ledger rather than a change artifact and therefore does not
require its own five-file directory.

## Mandatory Workflow

Follow these gates in order. Do not skip or reorder them.

### Gate 1: Identify And Reuse The Change

1. Search `.trae/specs/` for an existing directory that represents the same requirement.
2. Reuse it when the product intent and acceptance boundary are the same.
3. Create a new stable `<change-id>` only for a genuinely distinct change.
4. Create any missing one of the five required files before continuing.

### Gate 2: Map The Existing Production System Before Designing

Do not design from field names, schemas, tests, or a previous agent's summary. Before proposing a solution, trace the behavior through the real production path.

1. Before interpreting current code or save data, retrieve the relevant project memory/history, explicit user decisions, approved PRD, living runtime contract and prior incident evidence. Current State, archived prose, model output and repair scripts may be wrong; they are evidence, not automatic product authority.
2. Write the semantic invariant before designing: define each concept, orthogonal fields, allowed combinations, forbidden transitions, evidence priority and sole writer. Do not collapse two fields merely because their names sound related.
3. Use this authority order when evidence conflicts: the user's latest explicit decision; the current approved PRD and living runtime contract; current production reducer/validator contract; committed structured State; archived prose, model text, migration heuristic and test fixture. A lower source cannot silently override a higher source.
4. If the semantic invariant is missing, ambiguous, contradicted by history, or would change an existing user-approved fact, stop and ask the user before editing code, tests, migrations, repair scripts or real saves. Never resolve product ambiguity by guessing.
5. Read the actual entry point, orchestration path, prompt builder, projectors, retrieval path, reducers, persistence path, and every direct production reader and writer affected by the change.
6. Trace the end-to-end call graph from user action to persisted result. Include legacy readers, compatibility projectors, fallbacks, repair paths, and asynchronous boundaries.
7. For scheduler, registry, application wiring, workflow factory, dependency-port, module-boundary, or exported-symbol changes, inventory every test harness and fixture that constructs, stubs, imports, or bypasses the affected production path. Record each harness update target before implementation.
8. Record in `prd.md` and `spec.md`:
   - the current authoritative source for each semantic fact;
   - every transformation and prompt projection of that fact;
   - every production reader and writer;
   - which old reader, field, or projection will be removed or replaced;
   - which behavior is proven from real runtime evidence rather than inferred from code shape.
9. For any prompt-affecting change, use the real production prompt builder in model-free build-only mode against the active representative save before implementation. Record:
   - total characters and estimated tokens;
   - System Prompt and output Schema sizes;
   - per-section size, source path, audience, and authoritative owner;
   - repeated semantic sources and duplicate payloads;
   - the largest fields and current trimming behavior.
10. If no build-only path exists, creating a deterministic measurement path is the first implementation task after approval. Do not change prompt contents before the baseline exists.
11. Synthetic fixtures and unit tests may supplement this map but may not replace the real-save baseline or production call graph.

Stop here if the original system is not understood well enough to identify all current writers, readers, prompt projections, and removal targets. Do not add a new layer beside an unknown old layer.

### Permanent Item Existence Invariant

These Item semantics are product authority and must be checked before any Item
migration, archive repair, narrative rewrite, Prompt change or save edit:

1. `items[].state` and `items[].physicalForm` are orthogonal. Never infer one
   solely from the other.
2. `state=destroyed` means the original usable object has been destroyed. It
   does not mean that all physical matter disappeared.
3. `physicalForm=remains` means physical remnants still exist. They may retain
   `holderId` and location, follow their holder, and support operations allowed
   for remains such as carry, place and transfer. They cannot be equipped or
   silently restored into the intact original.
4. `physicalForm=absent` means no physical remnant exists. Only this form
   requires empty holder and location.
5. A destroyed Item may therefore validly be
   `state=destroyed + physicalForm=remains + holderId=<actor/player>`.
6. Never convert `remains` to `absent`, clear its holder/location, or rewrite
   archive prose to claim “no remnants” merely because the Item is destroyed.
   Such a conversion requires explicit higher-authority product evidence that
   no material remains. Model prose, archive wording, migration heuristics and
   repair-script assumptions cannot override an already approved remains fact.
7. When existing State or archive prose conflicts with this invariant, report
   the exact conflict and ask the user which fact is authoritative before
   changing anything.

### Permanent Knowledge Runtime Verification

Apply these rules to every Knowledge endpoint, backend, projector, retrieval,
hydration, capsule, or composition-root change:

1. Client and Node server must exchange an explicit Knowledge API contract
   version on health and every mutating or query operation. Missing or
   mismatched versions fail before a paid model request; never add an
   unversioned fallback or dual-read compatibility path.
2. Persisted index format, projector version, timeline epoch, State save
   revision, and Knowledge content identity are different concepts. Do not use
   `stateRevision` equality as Knowledge content identity. Use a deterministic
   content fingerprint that excludes save-only metadata.
3. JSON, Vectra and Qdrant are candidate indexes. Before Prompt use, resolve
   stable candidate IDs against current State/chat canonical records and
   reapply current revision, timeline, ACL, clock, source-ref and supersession
   gates. Backend text, ACL or activation capsules are never Prompt authority.
4. After changing backend or endpoint code, restart the real Node process and
   prove the new process serves the expected contract through an authenticated
   health request. Browser module reload, unit tests and source inspection do
   not prove the running server changed.
5. Build-only evidence reporting zero network calls proves only deterministic
   Prompt assembly. It cannot prove Knowledge health, rebuild, search,
   degradation, authentication or client/server compatibility.
6. Acceptance must cover the production composition root with a real legacy or
   previously persisted disk index, the running endpoint, current canonical
   hydration, actor-scoped capsules and the final production Prompt builder.
   Tests that inject prepared capsules or fresh in-memory indexes are
   supplemental only.
7. Every State-backed retained Event path must prove that the current query
   anchor reaches the capsule builder. Candidate selection alone is
   insufficient evidence; the final model-visible capsule must contain the
   authorized Event.

### Permanent Test Ownership Gate

Apply these rules whenever adding, moving, deleting or repairing Hogwarts
tests:

1. Put a new test in the smallest existing domain-owned test file. If no
   focused owner exists, create a domain-named `hogwarts-mud-*.test.mjs` file.
   Do not add tests to a generic monolith, historical `taskN` catch-all or
   unrelated large file for convenience.
2. Prefer direct imports from the focused production module. Do not use
   `helpers.js` or another compatibility facade as a general test dependency.
3. Keep new topic files below 2,000 lines and shared fixture support below
   1,000 lines. If an existing owner is already large, split by production
   ownership instead of making it larger.
4. Test fixtures must use the current production contract. Never copy a stale
   fixture that reconstructs retired writers, fields, compatibility aliases or
   model response shapes.
5. A retired behavior test may be deleted only when the current approved PRD
   or living contract marks the behavior retired, the production call graph
   has no active caller and replacement coverage exists where applicable.
   Failure, inconvenience or duplicate-looking coverage is not deletion
   evidence.
6. Never restore a retired export, caller, field, reducer, fallback or
   compatibility layer to make an old test pass. Migrate an active assertion
   to its current owner or delete the retired behavior with an explicit
   manifest row.
7. A decomposition must leave a durable per-test manifest stating what was
   deleted, what moved, where it moved and the retirement evidence.
8. Every migrated file must run independently and reach its intended business
   assertion. Setup errors, stale imports, `skip` and `todo` do not count as
   successful migration.

### Permanent Technical Debt Closeout

For every Hogwarts change:

1. The PRD declares exactly one `Change kind` from
   `feature|fix|refactor|governance`, a `Feature delta` and whether it is a
   `Core change`.
2. `kind=feature` has `feature_delta=1`; every other kind has `0`. Append one
   and only one row to `.trae/specs/TECH_DEBT.md` when the change completes,
   then verify its header counters equal the ledger-derived totals.
3. Before closeout, the assistant must ask itself and answer:

   > 这次为了快，有没有留下什么以后要还的账？比如塞进了不该塞的大文件、跳过了哪些测试、临时 hack 了哪里？

   Report that self-audit to the user and record the assistant's answer in the
   Change Ledger even when the answer is `无`. The user may correct or add
   debt, but must not be asked to author the assistant's self-report.
4. Treat composition-root/scheduler, persistence/migration,
   Prompt/Schema/Validator/Reducer, Knowledge backend and living runtime
   contract changes as `core_change=yes`.
5. After a core change, report the cumulative feature count and ask the user
   whether to re-inventory technical debt before declaring completion. Record
   `reinventory` or `defer`; silence is not a decision.
6. A re-inventory reviews every open debt against current code/runtime
   evidence and marks it open, accepted, resolved or superseded. Do not copy
   stale unchecked checklist prose into the ledger as fact.
7. Do not mark a change complete until its debt question, ledger row and any
   required core-change re-inventory decision are recorded.

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

It must also state `Change kind`, `Feature delta` and `Core change` near the
artifact status.

Requirements for key sections:

- `Before` and `After` describe externally observable behavior and authoritative data flow, not task progress.
- `Migration and Compatibility` defaults to one-time atomic migration followed by deletion of old fields. Long-term dual-read, dual-write, fallback projectors, compatibility periods, and generic legacy archaeology are forbidden unless the user explicitly requests them in the approved PRD. Define old-save behavior, atomicity, failure rollback, and old-field removal.
- Every migration or repair PRD must include a semantic before/after matrix for each changed field and explain why the transition is allowed by the approved business invariant. Archive prose or current corrupted State is not sufficient justification.
- `Prompt Field Budget` must start from the measured real-save baseline. It lists each added, removed, or changed prompt field; authoritative source; audience; before/after characters and estimated tokens; hard budget; trimming or omission rule; replacement/removal target; and whether it is protected. Explicitly write `None` only after the production prompt path proves there is no prompt impact.
- Numeric Prompt budgets must be derived from the active role configuration and the production budget function, currently `modelSlots[role].contextSize`, `modelSlots[role].maxResponseLength`, and `createContextBudgetPlan(...).maxPromptCharacters`. Never invent a limit, copy one from memory, or present an optimization target as an existing runtime setting.
- Record the configured runtime ceiling and any proposed product target separately. A lower product target is not authoritative until the user explicitly approves it in the current PRD revision. Do not claim a separate System Prompt cap unless the production runtime actually enforces one.
- Model failure policy defaults to exactly one paid model request per task invocation. Parse, Schema, authority, provenance, settlement, or validation failure must surface as the original error without an automatic second repair/retry round or model-generated fallback. An exception is forbidden unless the current PRD names the exact task, eligible error classes, maximum attempts, added call budget, and receives explicit user approval. Historical retry code or an older PRD is not approval for a new or changed path.
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
3. Make `checklist.md` cover all PRD acceptance criteria plus contract ownership, prompt budget, single-attempt failure and any explicitly approved repair exception, duplicate-source elimination, frontend whitelist, migration, regression, real-save prompt measurement, blind model simulation when Prompt behavior is affected, and rollback checks.
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
7. Implement the default one-request failure path and physically remove unreachable repair Prompts, retry loops, and model-generated fallbacks. Do not leave a disabled or impossible second round in production code.
8. When changing a scheduler, task registry, application composition root, workflow factory signature, injected port, module boundary, export, or import, update every affected test harness and fixture in the same task. A production rename or architectural move is incomplete while any harness still uses the old port, wrapper, export, caller, timing, or persistence behavior.
9. Run the affected harnesses and prove they reach their intended business assertions. A test that exits earlier because of a missing port, stale export, obsolete fixture, or setup `TypeError` is a failed migration, not a legacy/unrelated failure and not acceptance evidence.
10. For every migration, repair script or real-save edit, generate a model-free before/after report and verify every changed field against the approved semantic matrix before applying. If any field transition was not explicitly designed, stop.
11. Never rewrite archive prose, structured State and knowledge projections together to make a guessed interpretation appear consistent. Consistency produced by overwriting all evidence is not correctness.
12. Implement within the approved scope and contract.
13. Update `tasks.md`, `checklist.md`, and `progress.md` as each task or gate changes state.
14. Record deviations and blockers immediately; do not silently widen scope.
15. Keep `prd.md` focused on durable product truth. Change it only when product intent or acceptance changes.
16. Keep `spec.md` synchronized with approved technical decisions and runtime-contract ownership.
17. Add new tests under the Permanent Test Ownership Gate. Test placement and
    stale fixture cleanup are part of implementation, not optional closeout
    polish.

### Gate 8: Run Blind Model Simulation

This gate is mandatory whenever a change adds, removes, or modifies any model
Prompt, output Schema, response parser/recovery path, settlement/fold,
validator, reducer contract, retry, repair, or fallback behavior.

1. Enumerate every affected active model task, tier, mode, and production entry
   path. A shared task with bootstrap and runtime modes counts as separate
   cases when its Prompt or validator differs.
2. For each case, launch a new independent sub-agent with no forked
   conversation history. Do not reuse the implementation agent, an earlier
   simulation agent, or a sub-agent that has seen project requirements.
3. Give that sub-agent only the exact final production request visible to the
   model: System messages, User messages, transport output Schema and the
   minimal task/tier instruction required to return the response. Do not give
   it the PRD, spec, source code, validator, expected answer, known defect,
   previous response, repair feedback, or conversation summary.
4. Ask for one response only. Do not coach, repair, retry, or send validation
   errors back to the same sub-agent.
5. The production path under test must issue exactly one model request. Feed
   the untouched raw response through the real production
   parser/recovery, settlement/fold, authority/provenance validation, reducer
   boundary and failure policy, then assert that no repair request or
   model-generated fallback was captured. A hand-written fixture, an
   author-corrected response, or direct construction of the expected object is
   not blind-model evidence.
   Synthetic responses and fixtures remain supplemental even when they cover
   the same Schema. They never replace a fresh context-free sub-agent receiving
   the exact production request.
6. If the response fails, the gate fails. Fix the Prompt or contract, rebuild
   the real production request, and rerun with another new context-free
   sub-agent. Never edit the response into a passing fixture.
7. Record in `progress.md` and link from `checklist.md`: task/tier/mode, real
   Prompt capture path or hash, confirmation that the sub-agent was fresh and
   context-free, raw validation outcome, production stage reached, model-call
   count, and any error. Do not persist full private Prompts, responses,
   secrets, or save data in governance documents.
8. The blind simulation supplements rather than replaces deterministic tests,
   real-save build-only measurement, or an explicitly approved real API
   end-to-end run.

If sub-agents are unavailable, the exact production request cannot be isolated,
or the untouched response cannot run through the production chain, stop and
report the acceptance gate as blocked. Do not substitute a response written by
the main agent.

### Gate 9: Close The Change

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
11. Every Prompt-affecting task passes Gate 8 for each affected active
    task/mode/entry path. Main-agent-authored fake API responses do not satisfy
    this requirement.
12. Every affected task proves one model request on success and one model
    request on parse/Schema/authority/provenance/settlement/validation failure,
    with no second repair round or model-generated fallback, unless the current
    PRD contains the exact explicitly approved exception.
13. Every test harness affected by scheduler/registry/wiring/port/module/export
    changes is migrated and reaches its intended business assertion. Missing
    ports, stale exports, obsolete setup failures, and skipped production
    boundaries block completion.
14. Every migration/repair field transition matches the approved semantic
    before/after matrix, and real-save verification proves unrelated facts were
    not rewritten to support an inferred interpretation.
15. The standardized technical-debt question is answered and recorded in
    `.trae/specs/TECH_DEBT.md`.
16. The change ledger and feature-count header are consistent. A core change
    has a recorded user decision on technical-debt re-inventory.

## Incident-Derived Non-Negotiable Lesson

On 2026-08-12, a memory and retrieval change was incorrectly declared complete after extensive unit and integration tests while the real Junior Director Prompt expanded beyond its usable budget. New Authority, capsule, provenance, diagnostics, and retrieval projections were added without first removing overlapping legacy actor, knowledge, relationship, and transcript payloads.

This failure establishes permanent rules:

1. Functional correctness, ACL correctness, and passing tests do not imply context safety or product completion.
2. Never add a new memory, authority, retrieval, or diagnostic projection to a Prompt until the existing production Prompt has been measured and its overlapping readers are identified.
3. Never preserve both a full legacy payload and its compact replacement in the same Prompt for convenience.
4. Qdrant, RAG, EventStore, and relational memory are retrieval systems. Their databases do not belong in the Prompt; only bounded, audience-safe projections and stable source references do.
5. A completion claim is forbidden unless the real representative save passes the approved prompt budget and affected end-to-end workflow.
6. When a real-save measurement contradicts synthetic tests, the real production measurement wins and the task remains incomplete.
7. A response written by the same agent that authored the Prompt is not an
   independent model-behavior test. Prompt acceptance requires the blind,
   context-free sub-agent gate above.
8. Invalid model output is an error, not permission to spend another Prompt.
   A second automatic repair/retry round is forbidden by default and cannot be
   justified by historical behavior, convenience, or a passing repair test.
9. Architecture and scheduler refactors are not complete when production code
   compiles but test harnesses still construct the old system. Harnesses must
   migrate with the changed composition root and execute the real affected
   boundary before their results count.
10. On 2026-08-11, `task7_quill_archive_repair` incorrectly replaced an
    approved carried Item remnant with “no remnants”, cleared holder/location
    and forced `physicalForm=absent`. This happened because archive wording was
    treated as authority above the established Item business invariant.
    Repairing all copies to match a guessed interpretation made the error look
    internally consistent. Therefore archive repair must never change product
    semantics without first checking memory, PRD, living contract and explicit
    user decisions; ambiguity requires asking the user.

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
- A Prompt-affecting change has not passed blind model simulation for every
  affected active task/mode/entry path.
- A model path can automatically issue a second repair/retry request or
  model-generated fallback without the exact exception in the currently
  approved PRD.
- A scheduler, registry, wiring, port, module, export, or import change leaves
  any affected test harness stale, failing before its business assertion, or
  bypassing the new production boundary.
- Business semantics, orthogonal field meanings, or the authority order are
  unclear or contradicted by current State, archive prose, model output,
  migration heuristics, tests or prior decisions.
- A migration or repair would change a user-approved fact without an explicit
  semantic before/after matrix and current user approval.
- An Item repair infers `physicalForm=absent` from `state=destroyed`, or clears
  holder/location for `physicalForm=remains`.
- The current artifact revision lacks explicit approval.
- Implementation behavior would differ materially from the approved PRD or spec.

Do not bypass a stop condition with an ad hoc debug document, temporary compatibility field, dual-read fallback, silent default, or progress-log decision.
