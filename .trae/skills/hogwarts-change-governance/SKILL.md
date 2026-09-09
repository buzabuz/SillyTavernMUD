---
name: "hogwarts-change-governance"
description: "Grades Hogwarts changes L0-L3 and applies proportional PM, PRD, execution, and testing. Invoke for any Hogwarts MUD requirement or behavior change."
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

For every governed change, create or reuse at most one stable directory:

```text
.trae/specs/<change-id>/
```

`<change-id>` must be a stable, descriptive kebab-case identifier. Reuse the same identifier for follow-up work on the same requirement. Never create date-stamped, attempt-specific, implementation-phase, or debug variants of the change directory.

Artifact depth is grade-proportional:

- `L0`: update one concise `prd.md` after user feedback. Reuse existing
  `tasks.md/checklist.md/progress.md` when already present; do not create a
  speculative Spec or evidence tree for a one-condition edit.
- `L1`: maintain `prd.md`, a compact task/checklist/progress record, and add a
  Spec only when the bounded implementation has a real interface contract.
- `L2/L3`: the directory must contain and continuously maintain all five files:

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

The permanent frontend dynamic-text authority is:

```text
.trae/skills/hogwarts-change-governance/FRONTEND_DYNAMIC_FIELD_REGISTRY.md
```

It registers every dynamic value written into the Hogwarts frontend and the
required localization route and acceptance expansion for that value.

The permanent validation-responsibility authority is:

```text
.trae/skills/hogwarts-change-governance/VALIDATION_RESPONSIBILITY_REGISTRY.json
.trae/skills/hogwarts-change-governance/VALIDATION_RESPONSIBILITY_REGISTRY.md
```

The JSON file is registry authority. The Markdown file is its human-readable
companion. Update both in the owning system change; do not create a central
runtime validator or generic cross-domain test harness.

The permanent model-field route authority is:

```text
.trae/specs/hogwarts-runtime-contracts/model-field-routes.md
```

It is the readable registry for every field that crosses a model task,
Prompt projection, output Schema, route decision, validation boundary, or
Reducer carrier. It supplements `state-fields.md`: State fields retain their
State contract there; transient model fields must not be hidden because they
are not persisted.

The fixed PM business-discovery role is:

```text
.trae/skills/hogwarts-change-governance/PM_BUSINESS_DISCOVERY_AGENT.md
```

It is the stable launch and output contract for the one PM product-manager
Agent assigned to every Hogwarts investigation.

## Documentation Routing And Maintenance

Use exactly these documentation routes:

| Document class | Canonical location | Authority and maintenance owner |
| --- | --- | --- |
| Active PRD registry | `HOGWARTS_MUD_PRODUCT_SPEC.md` | Stable root record point for every active/research PRD and status transition; index only, never a second behavioral contract |
| Product intent | `.trae/specs/<change-id>/prd.md` | Sole product authority for that change; update when scope, behavior, migration, budget, whitelist, acceptance, or approval changes |
| Technical design | `.trae/specs/<change-id>/spec.md` | Current approved component, ownership, data-flow, migration, and verification design |
| Execution and evidence index | `tasks.md`, `checklist.md`, `progress.md` in the same change | Status and evidence only; cannot override the PRD or living contract |
| Current runtime behavior | `.trae/specs/hogwarts-runtime-contracts/` | Maintained in the same change as production behavior |
| Runtime field registry | `.trae/specs/hogwarts-runtime-contracts/state-fields.md` | Sole documentation registry for field meaning, writer, readers, migration, compatibility, and diagnostics |
| Model field-route registry | `.trae/specs/hogwarts-runtime-contracts/model-field-routes.md` | Sole readable route table for Prompt/Schema/transient model fields: source, selector, consumers, route edges, validation and State outcome |
| Cross-change debt | `.trae/specs/TECH_DEBT.md` | Current evidence-backed debt and change/feature counts |
| Validation responsibility registry | `.trae/skills/hogwarts-change-governance/VALIDATION_RESPONSIBILITY_REGISTRY.json` | Permanent contract and rule ownership across Regex, Embedding, model, Schema, transform, validator and Reducer stages |
| Validation responsibility table | `.trae/skills/hogwarts-change-governance/VALIDATION_RESPONSIBILITY_REGISTRY.md` | Human-readable companion updated with the JSON registry by each owning system |
| Frontend dynamic-field registry | `.trae/skills/hogwarts-change-governance/FRONTEND_DYNAMIC_FIELD_REGISTRY.md` | Permanent field-family inventory and mandatory rendered acceptance matrix for every Hogwarts frontend change |
| Supporting evidence | `.trae/specs/<change-id>/<evidence-kind>/` | Must be linked from the owning checklist or progress log and marked with its evidence status |
| Extension operations | `public/scripts/extensions/hogwarts-mud/README.md` | User/developer operation and navigation entry; not a field or product contract |
| Prototype snapshot | `prototypes/hogwarts-mud/` | Colocated, explicitly non-authoritative, updated only with that prototype |
| Historical change archive | Its original `.trae/specs/<change-id>/` | Retained as historical evidence; never rewritten to impersonate current runtime |

### Active PRD Registry Gate

1. Every active or research `.trae/specs/<change-id>/prd.md` must have exactly
   one current row in `HOGWARTS_MUD_PRODUCT_SPEC.md`.
2. Register a new PRD when its stable change directory is created.
3. Update the registry in the same change when a PRD enters research,
   approval, implementation, blocked, completed, superseded, or archived
   status, or when a scope revision invalidates approval.
4. The registry records status and links only. Behavioral details remain in
   the linked PRD; runtime truth remains in the living contract.
5. A missing target, duplicate row, unregistered active PRD, or status conflict
   blocks approval and closeout.

### Location And Evidence Gate

1. Except for `HOGWARTS_MUD_PRODUCT_SPEC.md`, do not create Hogwarts plans,
   specs, reports, or debug notes at repository root.
2. Do not create orphan evidence under `.trae/`, `/tmp`, a dated root
   directory, or an unrelated change. Move durable evidence under its stable
   owning change and link it.
3. Temporary investigation files must be removed before closeout. An
   unresolved observation must be preserved as linked evidence with an exact
   status such as `unverified`; do not call it fixed or register it as current
   debt without runtime evidence.
4. Completed change artifacts remain historical. Do not edit old progress or
   test reports to match today's code. Put current facts in the living contract
   and link historical evidence when needed.
5. A legacy change directory that predates the five-file rule is read-only
   history. Reopening it for new scope requires adding the missing current
   artifacts, registering the PRD, and obtaining explicit approval; never
   invent a historical PRD during unrelated cleanup.

### Permanent Push Scope Confirmation Gate

Before every `git push`, remote branch creation, or MR/PR creation/update:

1. Inspect the exact commit range and worktree. List the target remote, source
   branch, base branch, included files grouped by purpose, and every dirty or
   untracked path deliberately excluded.
2. Present that exact scope to the user and request an explicit confirmation.
   Earlier implementation approval or a general request to "push" does not
   replace this final scope confirmation.
3. A local commit may be prepared before confirmation, but do not push,
   force-push, create/update an MR/PR, or upload artifacts until the user
   confirms the displayed scope.
4. After confirmation, push only the reviewed commit range. Never sweep
   unrelated worktree changes into the commit to make the branch look clean.
5. If the staged diff, branch base, remote, or included files change after
   confirmation, present the revised scope and confirm again before pushing.

### Zombie Document Gate

A document is a zombie only when at least one of these is proven:

- it is empty and has no required artifact role;
- it has no governed owner, no incoming reference, and no durable evidence
  purpose;
- it presents superseded behavior as current authority and a maintained
  replacement exists.

Age, completion, an old date, or lack of recent edits is not deletion evidence.

Before deleting or rewriting any candidate:

1. Inventory the exact path, size/line count, last tracked update, incoming
   references, claimed authority, and replacement.
2. Read the complete document and classify every still-valid fact,
   unresolved observation, historical snapshot, and unapproved idea.
3. Move current facts to their maintained authority. Preserve unresolved
   observations as linked evidence with explicit status. Keep unapproved ideas
   clearly non-authoritative rather than silently promoting or dropping them.
4. Produce a path-level before/after matrix and obtain explicit user approval.
5. Delete only the approved paths, then prove no dangling reference or
   forbidden root document remains.

At closeout, verify:

- every active/research PRD has exactly one Product Spec registry row;
- every changed runtime fact has a living-contract owner;
- every durable supporting artifact is under and linked from its owner;
- no forbidden root plan/debug file or orphan evidence remains;
- no historical archive was rewritten as current authority.

## Mandatory Workflow

Follow these gates in order. Do not skip or reorder them.

### Permanent Complexity Grade And Proportional Governance

This section controls how much process every later gate may impose. A later
gate cannot expand an L0/L1 task into L2/L3 ceremony without concrete evidence
and an explicit regrade.

#### Required Order

For every incoming requirement:

1. The fixed PM first assigns exactly one complexity grade: `L0`, `L1`, `L2`
   or `L3`.
2. The PM gives the user a short impact boundary and simple proposed approach.
3. Stop and ask for the user's opinion. **Do not create or edit a PRD, Spec,
   tasks, checklist, implementation plan or production code before this user
   response.**
4. After the user responds, the PM incorporates that decision into the PRD.
5. Execute only the process allowed by the selected grade.

The user's latest instruction overrides older PRDs, PM conclusions and
technical assumptions. Implementation constraints such as FIFO, model
residency, queueing or provider capability must not be promoted into product
eligibility rules unless the user explicitly approves that business rule.

### Permanent Sub-Agent Scope Authority Gate

Sub-agents provide evidence and recommendations. They do not own product scope,
PRD content, acceptance criteria or implementation authority.

1. A PM, explorer, reviewer, test Agent or acceptance Agent finding may block
   current work only when it maps directly to:
   - the user's latest explicitly confirmed goal;
   - one criterion in the currently approved PRD; or
   - a living-contract invariant necessarily crossed by that approved scope.
2. Before acting on any sub-agent proposal, the main Agent must state the exact
   approved goal or PRD criterion it satisfies. If no exact mapping exists,
   classify it as an out-of-scope observation and do not edit production code,
   tests, PRD, Spec, checklist, registry or acceptance criteria for it.
3. Never revise the PRD after approval merely to make a sub-agent's new
   concern, preferred design, security hardening, cleanup, compatibility work
   or broader test matrix appear in scope. Only a new explicit user decision
   can authorize that scope change.
4. An independent acceptance Agent must judge the approved user outcome. It
   cannot invent a stricter product goal and then fail the change against that
   invention. Record such suggestions separately without changing the current
   verdict.
5. The main Agent owns the final scope decision and must challenge a
   sub-agent conclusion that exceeds user authority. Repeated Agent agreement
   does not replace user approval.
6. When the user rejects Agent-created scope, immediately stop that work,
   rollback only the unapproved edits, restore the approved artifacts, and
   verify the remaining approved change. Do not launch another Agent to
   relitigate the rejected proposal.

#### Grade Definitions

| Grade | Scope | Required process | Target elapsed time |
| --- | --- | --- | --- |
| `L0` | One obvious narrow change, such as deleting a gate, changing one condition/copy value, or moving one existing call without changing contracts, State, Prompt, Schema, persistence or cross-module ownership | One PM grade + short approach -> user opinion -> concise PRD update -> implement -> focused self-test -> plain-language report. No independent test Agent, no repeated PM round, no broad browser matrix and no unrelated cleanup. | Complete within 10 minutes |
| `L1` | Bounded feature/fix in one workflow or a small set of directly coupled files, with known ownership and no broad migration | One PM Agent round -> user opinion -> PRD -> implement -> exactly one fresh test Agent round -> report. | Complete within 30 minutes |
| `L2` | Multi-module behavior or contract change involving shared scheduler/wiring, State/Schema/validator ownership, persistence, provider policy or several user workflows | Full PM discovery plus production-informed follow-up, governed artifacts, focused and regression tests, and one fresh acceptance Agent. Additional rounds only after a concrete failure. | Estimate and report before execution |
| `L3` | Cross-domain architecture, migration/repair of real saves, security/privacy boundary, Prompt architecture, high blast radius or unresolved business semantics | Multi-round PM alignment, full artifacts, staged implementation, blind/real-save/browser evidence as applicable, and repeated fresh acceptance after each failed fix. | Milestones and blockers required |

#### Regrading Rules

1. Start from the smallest grade supported by the user-visible scope.
2. Regrade upward only when production evidence proves a wider writer,
   migration, contract, security or user-workflow impact.
3. Before regrading, stop and tell the user in one short message:
   - current grade;
   - exact new evidence;
   - proposed new grade;
   - added time/testing cost.
4. Never regrade because the existing governance documents are long, the
   worktree is dirty, optional cleanup exists, or more testing would feel
   safer.
5. A time target never authorizes cutting business scope. If L0/L1 cannot meet
   its target, report the concrete blocker immediately instead of silently
   adding process.

#### L0 Fast Path

For L0, the following later requirements are satisfied proportionally:

- business completeness is the PM's short impact boundary plus the user's
  response; a full entity matrix and production-informed second PM pass are
  not required;
- the PRD may be concise and update an existing change artifact; do not create
  speculative supporting reports;
- implementation approval is the user's response to the PM's proposed
  approach;
- verification is the smallest focused self-test that reaches the changed
  production boundary, plus syntax/lint when applicable;
- independent acceptance, broad frontend-registry expansion, full test glob,
  blind model simulation and real-save/browser evidence are required only if
  the L0 edit actually changes those surfaces;
- after the focused test passes, report the result and stop. Do not continue
  into optional cleanup, technical-debt inventory or additional Agents.

#### L1 Fast Path

For L1:

- use one PM Agent only; the PM's initial scope/approach and the PRD after user
  feedback are the same round;
- use exactly one fresh test Agent after implementation;
- run focused tests and only directly affected regressions;
- a failed test Agent may trigger one fix and one replacement test Agent;
  further rounds require explicit regrading to L2;
- finish with a concise Before/After, changed files, tests and residual
  blockers.

#### Anti-Pattern

The permanent negative example is turning “remove one provider gate and start
two existing promises together” into provider-specific product policy,
multiple PM rounds, repeated independent Agents and broad browser acceptance.
That is an L0 change unless concrete production evidence proves a wider
contract change.

### Permanent PRD-Goal Acceptance Invariant

This invariant governs every Hogwarts PRD. Language/localization rules below
are one domain-specific application, not the scope of this invariant.

1. Acceptance gates must be derived directly from the current approved PRD's
   implementation requirements, product goal and promised user outcome. Start
   from `Problem`, `After`, `In Scope` and `Acceptance Criteria`; do not start
   from available tests, implementation components, internal health metrics or
   whatever is easiest to inspect.
2. Before implementation, map every PRD requirement and goal to:
   - the normal user or runtime workflow that exercises it;
   - the exact observable result that proves it;
   - forbidden outcomes that fail it;
   - the authoritative evidence needed to decide pass or fail.
   A requirement without this trace is not ready for implementation.
3. Every primary acceptance check must identify the exact PRD requirement it
   proves. A test, metric or artifact with no such trace may be useful
   diagnostic evidence, but it cannot define acceptance and cannot compensate
   for a failed PRD outcome.
4. Tailor the gate to the current PRD. Do not reuse a generic checklist as if
   it represented the product goal. Schema validity, API success, row counts,
   hashes, queue health, unit tests and lack of crashes are supporting evidence
   unless the PRD itself makes them an externally required outcome.
5. For a user-facing PRD, the normal user workflow and rendered steady state
   are mandatory evidence. If they contradict internal metrics or green tests,
   the user-visible result wins and acceptance fails.
6. Before declaring completion, reread the approved PRD and perform a
   criterion-by-criterion audit against the implemented product. Work that is
   technically correct but misses the PRD's actual goal is incomplete.

### Permanent Plain-Language Before/After Reporting Gate

This gate applies before presenting any Hogwarts PRD, Spec or approval packet.
Detailed artifacts cannot substitute for a direct user-facing explanation.

1. Before asking the user to read or approve files, report the proposed change
   in the user's language using this order:
   - one plain-language sentence stating the user outcome;
   - a compact responsibility table when multiple mechanisms/components are
     involved;
   - concrete normal-user Before/After scenarios;
   - concrete failure Before/After scenarios;
   - operational-cost changes.
2. Every scenario must name:
   - what the user does or what runtime event occurs;
   - what the user currently sees;
   - what the user will see after the change;
   - what State is or is not written;
   - what happens when validation or a dependency fails.
3. Use at least three representative scenarios for a cross-domain/core change.
   Include every distinct user-visible workflow affected by a narrower change.
   Architecture names, field lists and test counts alone are not scenarios.
4. For every model, retrieval, scheduler or background-task change, the report
   and PRD must include a Before/After operational table covering:
   - model calls per normal action and worst-case action;
   - whether calls are sequential or concurrent;
   - whether one model serves multiple tasks;
   - model/context residency and estimated RAM/VRAM pressure;
   - user-visible latency or queueing impact;
   - paid-call count and retry/fallback behavior.
5. The PRD `Before` and `After` sections must contain or directly link the same
   user-scenario matrix. A PRD that describes only internal data flow,
   components, schemas or validators is not decision-complete.
6. The approval message must summarize the scenarios and operational costs
   before linking files. Never send a bare file-review request or make the user
   infer the product outcome from a long PRD.
7. Lead with plain language and keep the first report compact. Put technical
   evidence after the user outcome, not before it.
8. This report does not replace the governed PRD. If the plain-language report
   and PRD differ, approval is blocked until both are reconciled.

### Permanent Paid-Model Diagnosis Instrumentation Gate

Before asking a user to spend a diagnostic model invocation for any Hogwarts
workflow, instrument the complete relevant execution path first. A request to
"try again for logs" is forbidden until this gate is satisfied.

1. Use one trace ID across the relevant user entry, deterministic preflight,
   request eligibility/dispatch, response parse and validation, State
   transformation, persistence result, UI error mapping, and thrown exception
   boundaries. Instrument every stage the workflow can actually reach; do not
   stop at the first suspected component.
2. Record only bounded diagnostic metadata needed to distinguish stages, such
   as IDs, revision values, counts, booleans, error names/codes, and short
   normalized messages. Do not persist Prompt text, model output text, player
   prose, secrets, or raw save snapshots.
3. Verify the diagnostic collector locally without a paid model request before
   asking the user to run the workflow. The instrumentation must show whether
   each trace reached or skipped every expected stage.
4. Only after the path is observable may the user be asked for one diagnostic
   invocation. Capture its trace and identify the exact failing boundary before
   requesting any further model call.
5. Temporary workflow instrumentation must have an explicit lifecycle. Remove
   it after the diagnosis or retain it only when the user explicitly requests
   a maintained diagnostic feature with its own approved contract.

### Registered Module: Immediate Turn Module

The **即时回合模块** (Immediate Turn Module) is the registered umbrella module
for every Hogwarts behavior that must settle, reject, or remain unchanged
within the player’s current turn because the current narration or the next
legal player action depends on it.

Its business boundary is:

```text
player action
-> deterministic preflight
-> pre-turn interpretation
-> paid narrative
-> post-turn immediate proposals
-> optional routed 4B
-> deterministic guards
-> sole domain Reducers
```

The module currently includes only the PM-confirmed immediate-turn concerns:

- Turn transaction and paid narrative proposal isolation;
- Checks;
- Identity and life-state observations;
- movement, Presence, current Scene/Calendar/time settlement;
- Item, Presentation and Material changes;
- Spell changes;
- perception, witness and immediate Event settlement;
- Map movement/room authority;
- Knowledge retrieval and ACL filtering when needed by the current turn.

It excludes Appraisal, Social, Memory consolidation, macro Pacing, world
facts, clues, hidden Story Arcs, character creation/Opening, migration,
Translation, and process/task operations. Those concerns require their own
governed module or approved change; they may not be smuggled into an
Immediate Turn model call, queue, prompt projection, validator or Reducer.

For every future Identity field integration, including a field that appears
stable or dormant:

1. Treat it as an Immediate Turn Module change whenever current narration,
   a current action, or the next legal action can observe or alter it.
2. The fixed PM must start from the complete affected Identity Body field
   matrix and every crossed Presentation/Material/Item boundary. An injury-only
   port cannot establish full Identity coverage.
3. The PRD must name the field’s baseline authority, event trigger, semantic
   proposer if any, deterministic evidence/transition guard, sole Reducer,
   normal/worst-case call budget, no-change result, and user-visible failure
   result alongside all other Immediate Turn Module stages.
4. A future field cannot add an independent per-turn model call or bypass the
   registered `pre -> post -> optional 4B -> Reducers` budget without an
   explicit PM-confirmed and user-approved module revision.

This registration does not authorize a future Identity, Presentation, Item or
lifecycle feature in the current change. A current Phase 2 may deliberately
govern only its existing production fields and routes; deferred fields remain
in their own approved TODO until a later module revision explicitly admits
them.

Before implementing any Immediate Turn Module change, update the affected
`VCON-*` responsibility row and a domain-owned focused test. The test must
prove the normal immediate workflow, rejection with no State write, no
semantic Regex/Embedding fallback, one-attempt failure behavior, and the
module-level call budget.

### Gate 0: Fixed PM Business Discovery

This gate runs before technical reconnaissance, PRD drafting, Spec drafting,
task decomposition or implementation planning for every new or reopened
Hogwarts requirement.

Apply it proportionally:

- `L0`: PM outputs grade, impact boundary, one simple approach and a direct
  question for the user; stop there until the user responds.
- `L1`: one PM round covers bounded scope and approach; after user feedback the
  same round writes the PRD.
- `L2/L3`: use the complete discovery and production-informed follow-up below.

The full matrix and second PM verdict requirements below are mandatory only
for `L2/L3`; they must not delay L0/L1.

1. Launch exactly one fixed PM Agent using
   `PM_BUSINESS_DISCOVERY_AGENT.md`:
   - canonical task name: `pm_business_discovery`;
   - fresh context: `fork_turns=none`;
   - read-only;
   - no code, test, save, migration or artifact edits.
2. The PM starts from the user's latest goal, durable product decisions,
   complete living runtime fields, representative user workflows and business
   authority. Existing Regex rows, tests, benchmarks, endpoints, modules,
   tasks and defects are evidence only; none may define the product scope.
3. The PM must classify the requested scope as either:
   - a complete domain; or
   - an explicitly named partial capability.
   A partial capability cannot use a complete-domain name.
4. The PM must produce a complete business matrix covering:
   - every entity and authoritative field;
   - adjacent domains crossed by the user's workflow;
   - normal, failure and no-change workflows;
   - current and target user-visible results;
   - State written or unchanged;
   - one business authority and conflict priority per fact;
   - unresolved decisions requiring the user.
5. Domain completeness is proven only when every field is classified as
   `in_scope`, `unchanged`, `non_goal` or `unresolved`, and every field maps to
   a user workflow or explicit non-goal. Regex counts, test counts, task counts
   and internal metrics never prove completeness.
6. Before deep technical research, present the PM's one-sentence outcome,
   field/domain boundary and concrete Before/After scenarios to the user.
   Obtain explicit business-scope confirmation. Do not ask the user to read a
   technical PRD to discover the product scope.
7. After scope confirmation, the main Agent may perform read-only production
   reconnaissance constrained by the PM matrix. Send those findings back to
   the same PM Agent using the required follow-up review prompt. The PM checks
   for omitted fields, adjacent-domain gaps, duplicate authority and silent
   technical scope reduction.
8. Both PM verdicts must be `PASS` before drafting or revising the PRD, Spec,
   implementation tasks or technical solution. `BLOCKED` means stop and obtain
   a user decision.
9. The same change keeps one active PM Agent and reuses it for follow-up work.
   Do not launch parallel PM Agents or choose the most convenient conclusion.
   If product goal, target user, entities, fields, workflows, failure semantics
   or authority boundaries materially change, invalidate the prior verdict and
   reopen discovery with that same PM. If it is unavailable, one replacement
   PM must redo the complete discovery from authority; it cannot inherit
   `PASS`.
10. Do not create a sixth authoritative PM document. Put the confirmed
    business matrix and scenarios directly into the PRD's `Problem`, `Before`,
    `After`, `In Scope`, `Non-Goals` and `Acceptance Criteria`. Before PRD
    creation, keep the PM result in the conversation; supporting evidence is
    allowed only when the matrix cannot fit the governed PRD without loss.
11. Independent acceptance must receive the user's original goal and the
    confirmed PM business matrix in addition to the PRD. A self-consistent
    narrow PRD cannot define its own completeness.

Hard blockers:

- no fixed PM Agent, or a PM verdict required by the selected grade is not
  `PASS`;
- any entity, field, workflow, failure result or authority remains
  unclassified;
- capability name is broader than its field coverage;
- a user workflow crosses an adjacent domain that was not included;
- the proposed scope began from Regex, tests, benchmarks, defects, modules or
  tasks rather than the product goal;
- PM and main Agent disagree on business scope or semantics;
- technical research changed the scope after the grade-required PM review;
- the user has not confirmed the business scope.

The Identity incident is the permanent negative example: three injury Regex
rows and a passing injury benchmark never established complete Identity
coverage. A complete Identity claim had to start from all Identity fields and
the user workflows spanning Identity Body, Presentation/Material and
Inventory/Item.

### Provider Replacement Chain Gate

This gate is mandatory when a user asks to select, switch, upgrade, replace,
retire, or substitute a model, provider, model tier, backend, or semantic
executor. It applies before a PM labels the work a narrow provider setting.

Definitions:

- **executor switch**: changes the provider for exactly one existing task.
- **chain replacement**: changes the user-visible semantic pipeline, including
  every conditional downstream model task that consumes or refines the
  executor's output.

The PM must never silently interpret a user request for a model replacement as
an executor switch. Before recommending scope, it must ask or state which
meaning applies.

For either meaning, the PM must produce a replacement matrix covering the
normal, every routed, every failure, and every no-change workflow:

| Stage | Current task/provider | Trigger/consumer | Target disposition | User-visible result |
| --- | --- | --- | --- | --- |
| Each upstream model task | ... | ... | retained/replaced/removed | ... |
| Each router or route field | ... | ... | retained/replaced/removed | ... |
| Each conditional downstream model task | ... | ... | retained/replaced/removed | ... |
| Guard and sole Reducer | ... | ... | unchanged or explicitly changed | ... |

`retained` requires an explicit user-approved reason. `replaced` or `removed`
requires the same-change reader/caller removal plan. A PM verdict is
`BLOCKED` when any conditional model call, prompt projection, State proposal,
fallback, queue, or failure path has no disposition.

The PRD and technical spec must repeat this matrix and separately list:

1. total model calls and provider/model identity for every normal and routed
   workflow;
2. whether calls are serial or concurrent and what remains resident;
3. exact post-executor route fields and every task they can wake;
4. final State writer and failure result for every retained or replaced stage.

Acceptance must observe actual task/provider calls, not only logical labels.
For a chain replacement, every retired downstream model task must be asserted
absent on normal and routed flows. A test such as "zero local Post requests"
does not prove replacement if a local Inventory, Identity, Appraisal, repair,
or other dependent call still runs.

#### 2026-08-19 Incident Retrospective: Partial Post Provider Switch

`d52510499` introduced the explicit immediate-turn chain:

```text
local post core
-> optional shared dynamic 4B Inventory/Identity
-> guards
-> Reducers
```

`042cf6d7` added `postTurnSemanticProvider=low|local`, but treated the work as
an executor switch for VCON-013. It replaced only the main Post request and
left the routed Dynamic 4B chain active. Its governing PRD named the partial
capability "VCON-013 post-turn semantic-provider selection"; its tests proved
the selected main Post call but did not assert that Dynamic 4B was absent in
Low mode.

The PM and review failure was not a missing unit case. The review classified
`inventoryObservationRequired` as an output field rather than as a
model-routing edge, did not enumerate the full `Post -> Dynamic 4B -> Reducer`
workflow, and therefore approved a provider setting that contradicted the
user's intended chain replacement. Future provider/model reviews must apply
this gate; a narrow task-level provider PRD cannot be accepted as a substitute.

### Permanent Model Field-Route Registry Gate

Apply this gate before designing, implementing, reviewing, or accepting a
Hogwarts model task, Prompt projection, output Schema, parser, route field,
transform, validator, reducer carrier, or model-facing UI diagnostic.

Names, object nesting, TypeScript/JSDoc types, tests, and example payloads are
not field documentation. No reviewer may infer that two fields are equivalent
because their names overlap or one is derived from the other.

1. Read and update
   `.trae/specs/hogwarts-runtime-contracts/model-field-routes.md` for every
   affected field before implementation. A field route has a stable
   `<task-or-domain>.<field>` identifier and must name:
   - exact source path and whether it is canonical State, message evidence,
     derived projection, model proposal, or diagnostic;
   - one-sentence semantic meaning, including what it explicitly does *not*
     mean;
   - model/task audience and input/output/carrier position;
   - deterministic admission selector, evidence requirement, and compaction or
     exclusion rule;
   - Schema type/shape and normalizer/parser;
   - every direct reader, every route task it can wake, and every downstream
     consumer;
   - deterministic guards, sole writer or explicit no-State result;
   - no-change and failure behavior, plus the focused test owner.
2. State-backed fields retain their complete writer/migration contract in
   `state-fields.md`; the model route row links to that path instead of
   duplicating authority. A transient field has no State writer, but still
   requires a route row.
3. Every Prompt builder, transport descriptor, parser/normalizer, and
   workflow that introduces or consumes a changed routed field must contain a
   short module-level JSDoc/Markdown reference to the relevant field-route IDs.
   Do not add per-line narrative comments that repeat syntax; the route table
   is the readable source of truth.
4. A field that can wake another model task is a routing edge. Its route row
   must enumerate the task, provider/tier, call budget, serial/concurrent
   behavior, and failure result. A Boolean field is never "just metadata" when
   it can cause a model call.
5. Same-named or related fields require distinct rows whenever their audience,
   source, selector, or writer differs. The PRD/Spec must state whether they
   can be substituted. For example, `scene.itemStates` is a Scene snapshot and
   cannot serve as Post Item context when its holder-follow projection includes
   carried/equipped Items that the Post selection rule excludes.
6. The PRD and spec must contain a compact field-route matrix for every
   changed task. Tests must assert the important admission/exclusion and
   route-edge rows, not only final object shape.
7. A missing route row, undocumented consumer, unknown route wake, or a
   builder/parser without its route reference blocks implementation and
   acceptance.

#### 2026-08-22 Incident Retrospective: Scene Snapshot Mistaken For Post Input

`scene.itemStates` was documented only as a derived current-Scene Item
snapshot. Its implementation follows carried/equipped Items into the player's
room. The Dynamic 4B Post auxiliary path separately projected all
`state.items[]`, but neither field had a compact route table naming its model
audience, selection rule, downstream task, or non-substitutability.

That gap forced later reviewers to reconstruct field meaning from code and
caused the false shortcut "scene item state equals Post Item input". The
approved Post rule is stricter: independently room-material formal Items are
eligible; a holder-carried Item is eligible only when the current player action
or paid narration directly names it. This gate makes that distinction
reviewable before code changes.

### Gate 1: Identify And Reuse The Change

1. Search `.trae/specs/` for an existing directory that represents the same requirement.
2. Reuse it when the product intent and acceptance boundary are the same.
3. Create a new stable `<change-id>` only for a genuinely distinct change.
4. For `L2/L3`, create any missing one of the five required files. For
   `L0/L1`, use the proportional artifact set defined above.
5. Add or update exactly one matching row in
   `HOGWARTS_MUD_PRODUCT_SPEC.md`.

### Gate 2: Map The Existing Production System Before Designing

Run this gate only after Gate 0 business-scope confirmation. Do not design
from field names, schemas, tests, or a previous agent's summary. Before
proposing a solution, trace the PM-confirmed business scope through the real
production path.

Depth is proportional: `L0` reads only the direct production path and focused
test owner; `L1` traces the bounded workflow and direct interfaces; `L2/L3`
perform the complete map below.

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

The canonical cross-change retirement and migration manifest is:

```text
.trae/specs/hogwarts-test-suite-decomposition/test-migration-manifest.md
```

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
9. A behavior change and its test-contract migration are one atomic change.
   Update every still-active assertion to the new approved contract in the
   same task. If the behavior is retired, delete its production path and tests
   in the same task and append an exact row to the canonical manifest. Never
   leave a known stale assertion for a later cleanup task.
10. Every manifest row must name the deleted or moved production/test path or
    test title, current replacement owner, retirement authority, no-caller
    evidence where applicable, and final verification result. A prose note in
    `progress.md` is not a manifest substitute.
11. Retired test utilities, fixture loaders, compatibility exports and dead
    fixture paths are retired code too. Remove them with their test instead of
    keeping an unreachable harness branch.

### Permanent Validation Responsibility Registry Gate

Apply this gate before designing, implementing, reviewing or accepting any
Hogwarts Prompt, output Schema, parser, adoption/normalization/resolution
stage, validator, semantic model, embedding route, Reducer or model-task
change.

1. Read `VALIDATION_RESPONSIBILITY_REGISTRY.md` and the affected JSON rows.
   Every new system or changed model-output boundary appends or updates its own
   stable `VCON-*` row before implementation.
2. The owning system row names Regex/Embedding/model responsibility, Schema,
   transform stages, deterministic validator, State fields, sole writer,
   failure policy, call policy and test owner. Internal helper assertions stay
   inside the domain; do not build a central runtime validator.
3. Regex remains shape/finite grammar only. Embedding remains candidate
   retrieval only. Semantic decisions, deterministic authority and Reducer
   settlement remain separate responsibilities.
4. **Every new gameplay system must add a new domain-named focused test file.**
   It cannot claim coverage from an existing unrelated test file or a generic
   central registry test.
5. The new system's tests cover at minimum:
   - valid structured proposal reaches its owning Reducer;
   - invalid Schema, evidence, ID, ACL, arithmetic or transition writes no
     State;
   - hypothetical or absent semantics produce no proposal;
   - regex and Embedding cannot act as semantic fallback or State authority;
   - model failure performs no automatic repair/retry/provider fallback unless
     the current PRD explicitly approves the exception;
   - normal and worst-case model-call budgets match the PRD.
6. Test ownership stays with the system. A future Money system therefore adds
   a Money contract row and `hogwarts-mud-money*.test.mjs`; Inventory, Spell
   or registry tests cannot substitute for it.
7. The owning PRD/Spec, focused tests, blind simulation where applicable and a
   fresh independent acceptance Agent decide whether the new system is
   complete. The cross-system table records responsibility; it is not itself
   an implementation or acceptance engine.

### Permanent Frontend Dynamic Field Registry Gate

Apply this gate before designing, implementing, reviewing or accepting any
Hogwarts frontend change:

1. Read
   `.trae/skills/hogwarts-change-governance/FRONTEND_DYNAMIC_FIELD_REGISTRY.md`
   completely.
2. Trace every affected DOM text sink to one existing registry row. Add a
   stable row before implementation for every new dynamic text value. An
   unregistered dynamic value blocks implementation.
3. Record the canonical source, Renderer, exact TranslationTable identity or
   static locale key, and repeated-instance expansion. Direct `*En` reads,
   reader-specific translation identities and undocumented fallback are
   forbidden.
4. A route marked `NO` or `PATCH` is failed work, not accepted resilience.
   `PATCH` becomes `YES` only after the normal rendered zh-CN steady state
   passes.
5. For ordinary frontend changes, browser-test every touched row and its
   repeated instances. For localization architecture, shared Renderer,
   localization controller, view-model or locale-resource changes, expand and
   test every registry row.
6. Calendar acceptance must open every date containing content, every schedule
   detail, every archived Scene detail/transcript, every Storyline and every
   beat. Actor, Item, Spell, Map, Message and Relationship families likewise
   expand to every current representative-save instance.
7. In zh-CN after idle drains, every expanded value must be Chinese
   `translated`, Chinese `STATIC`, exact player `RAW`, or an exact narrow
   `ALLOW` token. Any avoidable English prose, English Canon name, visible
   internal ID, `pending`, `error` or source fallback fails.
8. Unit tests, table rows, API success and source inspection are supporting
   evidence only. Persist the row-by-row DOM result under the active PRD and
   link it from `checklist.md` and `progress.md`.
9. Update the registry in the same change whenever a Renderer, projection,
   field identity, visible fallback or recovery action changes.

### Permanent Independent Acceptance Agent Gate

Apply by grade:

- `L0`: no independent acceptance Agent unless the actual edit changes a
  migration, security boundary, model contract or real-save writer; such
  evidence normally requires regrading.
- `L1`: exactly one fresh test Agent round as defined by the L1 fast path.
- `L2/L3`: apply the full gate below, regardless of Prompt impact.

1. The implementation agent cannot be the sole acceptance authority. After
   implementation and deterministic tests, launch a fresh independent Agent
   with no forked implementation conversation or hidden summary of what was
   changed.
2. Give the Agent the project goal, target repository, current approved PRD,
   Spec, checklist, living contracts and any mandatory registry paths. Do not
   give it the implementation plan, expected passing result, known workaround,
   selected happy path or instructions to confirm the main Agent's conclusion.
3. The independent Agent owns the complete acceptance design and execution
   from the project goal. It must read the authoritative artifacts itself,
   derive the normal user/runtime workflows and forbidden outcomes, inspect
   the implementation, run the required tests and exercise the real product.
4. For user-facing changes, it must perform browser acceptance against the
   rendered product. For frontend/localization changes, it must independently
   expand `FRONTEND_DYNAMIC_FIELD_REGISTRY.md`, not rely on the main Agent's
   screenshots or field classifications.
5. The independent Agent is read-only with respect to production code, tests,
   migrations and real saves during acceptance. It reports findings with exact
   evidence and cannot silently repair the implementation it is judging.
6. A pass requires an explicit criterion-by-criterion result tied to the
   project goal. Test counts, infrastructure health and the main Agent's prior
   evidence remain supporting evidence only.
7. If it finds any failure, the main Agent resumes implementation. The same
   verifier cannot approve the resulting fix; launch another fresh independent
   Agent and rerun the complete acceptance scope from the goal.
8. Persist the independent Agent's task input, fresh-context declaration,
   acceptance scope, findings and final result under the active PRD. Do not
   store secrets, private Prompt payloads or raw save contents.
9. If independent Agents are unavailable, cannot access the real product, or
   cannot execute the complete goal-derived acceptance scope, completion is
   blocked. Main-Agent testing cannot substitute for this gate.
10. This gate supplements Gate 8. Prompt/model behavior changes must pass both
    the context-free blind model simulation and the independent project-goal
    acceptance Agent.

### Permanent Technical Debt Closeout

Mandatory for `L2/L3`. Apply to `L1` only when the bounded change actually
introduces or resolves registered debt. `L0` ends after focused self-test and
report; it does not trigger ledger work or re-inventory.

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
8. A known waiver or unresolved issue that cannot be fixed inside the current
   approved scope must receive its own evidence-backed Debt row in
   `.trae/specs/TECH_DEBT.md` in the same task. The row must state current
   status, severity, exact measured evidence, owning future change and review
   trigger. Mentioning it only in a Change Ledger sentence, checklist or chat
   is insufficient.
9. Technical debt never justifies stale, skipped or `todo` tests. Tests still
   assert the current approved contract and may remain red only when they
   expose the registered unresolved product blocker itself; they must not stay
   green by using an obsolete fixture, threshold or behavior.

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

- `Before` and `After` describe externally observable behavior and
  authoritative data flow, not task progress. They must include the
  user-scenario and operational-cost matrix required by the Permanent
  Plain-Language Before/After Reporting Gate.
- `Migration and Compatibility` defaults to one-time atomic migration followed by deletion of old fields. Long-term dual-read, dual-write, fallback projectors, compatibility periods, and generic legacy archaeology are forbidden unless the user explicitly requests them in the approved PRD. Define old-save behavior, atomicity, failure rollback, and old-field removal.
- Every migration or repair PRD must include a semantic before/after matrix for each changed field and explain why the transition is allowed by the approved business invariant. Archive prose or current corrupted State is not sufficient justification.
- `Prompt Field Budget` must start from the measured real-save baseline. It lists each added, removed, or changed prompt field; authoritative source; audience; before/after characters and estimated tokens; hard budget; trimming or omission rule; replacement/removal target; and whether it is protected. Explicitly write `None` only after the production prompt path proves there is no prompt impact.
- Numeric Prompt budgets must be derived from the active role configuration and the production budget function, currently `modelSlots[role].contextSize`, `modelSlots[role].maxResponseLength`, and `createContextBudgetPlan(...).maxPromptCharacters`. Never invent a limit, copy one from memory, or present an optimization target as an existing runtime setting.
- Record the configured runtime ceiling and any proposed product target separately. A lower product target is not authoritative until the user explicitly approves it in the current PRD revision. Do not claim a separate System Prompt cap unless the production runtime actually enforces one.
- Model failure policy defaults to exactly one paid model request per task invocation. Parse, Schema, authority, provenance, settlement, or validation failure must surface as the original error without an automatic second repair/retry round or model-generated fallback. An exception is forbidden unless the current PRD names the exact task, eligible error classes, maximum attempts, added call budget, and receives explicit user approval. Historical retry code or an older PRD is not approval for a new or changed path.
- System Prompt, output Schema, player action, current Authority Snapshot, and current-scene actor capsule contract are protected. Protection means they cannot be silently truncated; it does not permit them to exceed the approved total budget.
- **Provider-aware Prompt Assembly:** Measure the complete provider-visible request: System messages, User payload, transport/format Schema, tool or response reserve, and every runtime wrapper field. The selected provider's configured capacity is the hard eligibility boundary; a legacy local-only target cannot reject a request for another selected provider. Product targets may request compaction but cannot turn a request that fits the selected provider into a synthetic provider failure.
- **Structured Capacity Degradation:** Before any provider call, assemble one canonical structured payload and compact only PRD-approved optional sections in deterministic priority order. Keep each retained record atomic; record every omitted section and count in bounded diagnostics and the user-visible pending/degraded state. Never cut JSON bytes or prose strings, silently omit protected fields, summarize with another model, switch provider, retry automatically, or promote omitted evidence into State.
- **No-fit Settlement Safety:** If protected content cannot fit the selected provider after permitted compaction, do not issue a malformed/oversized request. Preserve paid narration, leave the turn uncommitted, block a new player action, and expose only explicit retry against the saved Post request or explicit discard. A nonblocking exception requires explicit user approval in the current PRD.
- Full actor libraries, raw `actorKnowledge`, full Social Graph state, raw database records, and unbounded transcript/history are forbidden prompt inputs unless the PRD explicitly proves their necessity and budget.
- Event and memory sharing defaults to stable IDs and authoritative lookup. Do not copy the same event summary into multiple witnesses, projections, capsules, and prompt sections.
- Every newly injected projection must name the old prompt reader or payload it replaces. Additive injection without a same-change removal plan is forbidden.
- `Frontend Field Whitelist` lists the exact state, projection, and UI session fields the frontend may read or write. Anything absent is forbidden. Explicitly write `None` when there is no frontend impact.
- Every frontend whitelist row must map to the Permanent Frontend Dynamic Field
  Registry. A PRD cannot approve a dynamic frontend value without a registry
  owner and acceptance expansion.
- `Acceptance Criteria` must be observable, testable, traceable to
  `tasks.md` and `checklist.md`, and include the requirement-to-outcome matrix
  required by the Permanent PRD-Goal Acceptance Invariant. An
  implementation-component checklist is not an acceptance design.

### Gate 5: Complete The Technical Spec And Execution Files

For `L2/L3`, complete the full technical artifact set below. For `L0`, update
the concise PRD only; for `L1`, use compact execution records and add a Spec
only when a real interface contract requires it.

Before seeking approval:

1. Make `spec.md` map every PRD behavior to components, data flow, runtime-contract rows, writer/reader ownership, migration, old-field removal, failure handling, and verification.
2. Make `tasks.md` use stable task IDs, dependencies, expected files, verification, and one of `pending`, `in_progress`, `blocked`, or `completed`.
3. Make `checklist.md` cover all PRD acceptance criteria plus contract ownership, prompt budget, single-attempt failure and any explicitly approved repair exception, duplicate-source elimination, frontend whitelist, migration, regression, real-save prompt measurement, blind model simulation when Prompt behavior is affected, and rollback checks.
4. Initialize `progress.md` with the current phase, artifact revision, completed governance work, open decisions, and evidence links.
5. Cross-link all five files and the living runtime contract.

At most one task may be `in_progress`. Before implementation approval, implementation tasks remain `pending`.

### Gate 6: Obtain Explicit Approval

For `L0/L1`, the user's response to the PM's pre-PRD approach is implementation
approval when the resulting PRD matches that response exactly; do not impose a
second approval wait. If the PRD differs, stop and reconcile it.

For `L2/L3`, present the current `prd.md`, `spec.md`, `tasks.md`, and
`checklist.md` for review and stop.

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
18. Maintain and verify every affected row under the Permanent Frontend
    Dynamic Field Registry Gate.

### PRD User-Outcome Acceptance Gate

Apply the Permanent PRD-Goal Acceptance Invariant first. This section defines
the additional workflow evidence required when the current PRD has a
user-visible outcome; it does not narrow the invariant to localization or UI
work.

1. Before implementing tests or declaring an acceptance plan complete, write a
   user-outcome matrix:
   - target user and normal starting state;
   - each primary user workflow and screen/surface;
   - the exact visible result promised by the PRD;
   - forbidden visible states and unacceptable degradation;
   - transient states and their maximum allowed lifetime;
   - recovery actions for partial failure;
   - authoritative runtime evidence for each result.
2. Map every PRD acceptance criterion to at least one user-observable
   assertion. Infrastructure health, table contents, API success, row counts,
   hashes, unit tests and source inspection are supporting evidence only. They
   cannot replace a required rendered or workflow-level result.
3. Test representative breadth, not one convenient happy path. Enumerate all
   affected screens, record kinds, readers and interaction states. Sample each
   distinct renderer/reader and every state class that a user can encounter:
   success, missing, pending, error, fallback, refresh/reload and explicit
   recovery.
4. During browser acceptance, inspect the actual rendered output and visible
   status of every sampled dynamic field. Record whether it resolved from
   static resources, canonical source, translated data, pending work, error or
   fallback. Do not call a surface passed merely because it rendered without
   crashing.
5. Treat obvious visual contradictions as failed acceptance evidence even when
   automated tests are green. If a screenshot or DOM snapshot shows a
   forbidden state, investigate it before continuing; never summarize past it
   as an acceptable fallback.
6. Completion requires the normal user workflow to reach the PRD's promised
   steady state. A transient indicator is acceptable only while work is
   actually queued or active and must disappear after the approved idle or
   completion condition. Permanent `pending`, stale status, or an error with no
   usable recovery action fails the user outcome.
7. When a feature promises a seamless experience, acceptance must measure the
   absence of visible seams. Internal correctness does not compensate for
   user-visible inconsistency.

#### Language and Localization User Outcome

For a PRD that promises one canonical internal language plus localized player
display, the primary user outcome is seamless reading in the selected display
language.

1. In `zh-CN`, the normal steady-state UI must not contain avoidable English
   semantic prose or Canon names on any affected surface. Stable IDs, internal
   codes and source-language labels must not leak into player-facing text.
   Exact Latin symbols are not English leakage when the symbol itself is the
   source-backed fact and the accepted Chinese rendering preserves it, such as
   a written initial (`H`), a compartment designator (`A-F`), a geometric
   shape (`V`) or a Spell incantation. This exception is token-exact and
   context-bound: it never permits an English word, name or phrase beside the
   literal symbol, and the validator must prove the token occurs in the
   canonical source with the same semantic role.
2. Inspect at minimum:
   - Home and Setup;
   - current Game header and Scene;
   - every visible current/historical message segment and dialogue header;
   - left people panel and local-presence panel;
   - Calendar grid, entry details, participant names, storylines and beats;
   - Map labels and Inspector;
   - Actor Dossier, memories, relationship evidence and Items;
   - Archive/Story readers and provider/settings controls.
   Use the permanent frontend dynamic-field registry as the exhaustive list;
   this minimum list cannot replace or narrow it.
3. Enumerate visible dynamic fields on each surface and classify them as
   `static`, `translated`, `pending`, `error`, `source fallback` or
   `raw evidence`. Persist this matrix as acceptance evidence.
4. After the approved idle gates are open and the queue is drained:
   - visible missing rows must have been enqueued;
   - `pending` indicators must be zero;
   - successful rows must render translated text;
   - failed rows may show source fallback only with a precise non-global status
     and a working explicit retranslation action;
   - a global `Translation unavailable` banner for one failed field is not a
     seamless pass.
5. Canon names must resolve from the authoritative locale catalog consistently
   across every renderer. Do not depend on model translation for a known Canon
   display name.
6. Switching `zh-CN -> en -> zh-CN`, reloading the page, clearing browser
   storage and reopening Calendar/Dossier must preserve the selected-language
   rendering contract without world/chat writes.
7. English fallback proves resilience only. It does not prove Chinese-display
   acceptance. Mixed Chinese/English output, permanent `Translating`, and
   visible `Translation unavailable` are failures against a seamless Chinese
   reading goal unless the current PRD explicitly approves them as the final
   experience.
8. Before closeout, compare screenshots and DOM field-state matrices from at
   least one current message, one historical message, one Calendar entry with
   participants, one Dossier with memories/Items and one Map/Archive view. A
   single fully translated latest message is insufficient evidence.

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

### Out-of-Scope Remediation Gate

Apply this gate whenever a proposed fix, optimization or acceptance adjustment
would modify a module, business contract or semantic behavior outside the
current user goal, approved PRD scope or active task ownership.

1. Separate the observed problem from the proposed remediation. Discovering a
   failure during current acceptance does not make every possible fix part of
   the current task.
2. Before editing, compare the remediation's touched modules, writers,
   readers, Prompt fields and business semantics with the current goal, PRD In
   Scope/Non-Goals and active task expected files. A metric associated with the
   current test does not automatically authorize changes to the module that
   produced it.
3. If the remediation crosses that boundary, do not edit its production code,
   tests to normalize the new behavior, migrations or real saves. Record the
   observation as an out-of-scope TODO/debt with exact evidence and label the
   solution semantics `undecided` and `unapproved`.
4. Do not automatically mark the whole current task blocked. Continue all work
   that remains inside its approved scope. Mark it blocked only when the
   current goal itself is impossible to complete without the out-of-scope
   decision, and record that exact dependency rather than using the unrelated
   issue as a reason to stop.
5. A numeric Prompt, size, latency, coverage or performance target approves
   only the threshold. It does not authorize a trimming, omission, batching or
   scheduling algorithm, nor does it expand the current module boundary.
6. Never invent Prompt field omission, evidence selection, summarization,
   ordering, batching, cursor advancement, catch-up scheduling, call cadence,
   retry or fallback behavior merely to make a target pass.
7. Report the out-of-scope observation to the user in plain language. State
   which unrelated module or semantic contract a fix would change and which
   decisions a separate PRD would need. A TODO is not implementation approval.
8. For Prompt evidence growth, a separate approved PRD must define at minimum:
   protected fields, evidence priority and order, pair/group integrity,
   reference and ACL preservation, cursor semantics, overflow behavior,
   additional call budget, failure policy and blind acceptance cases.
9. If an out-of-scope remediation was already edited, stop immediately. When
   the user orders rollback, remove only that unapproved change, preserve
   unrelated work, and verify that no model call, State/chat save, translation
   write, Knowledge write or migration used the rejected behavior.

### Gate 9: Close The Change

Close proportionally:

- `L0`: focused self-test passes, the concise PRD matches the user's decision,
  and the assistant reports Before/After, changed behavior and any blocker.
- `L1`: focused tests and the one required fresh test Agent pass, then report.
- `L2/L3`: every full closeout condition below applies.

For `L2/L3`, a change is complete only when:

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
17. `HOGWARTS_MUD_PRODUCT_SPEC.md` has exactly one current row for every
    active/research PRD and reflects this change's final status.
18. The PRD User-Outcome Acceptance Gate passes on the rendered product. No
    infrastructure-only evidence or graceful fallback is used to substitute
    for the promised user experience.
19. Every affected frontend dynamic-field registry row is current and passes
    its required repeated-instance browser expansion. Localization architecture
    changes pass every row in the registry.
20. A fresh independent acceptance Agent receives the project goal and
    authoritative artifact paths, independently executes the complete
    acceptance scope, and reports a pass. Any post-failure fix is rechecked by
    another fresh Agent.
21. Every affected validation-responsibility row is current and every new
    gameplay system has its own domain-named focused test file.

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
- A new system's Prompt, Schema, transform, validator, embedding route,
  Reducer or model task lacks an updated `VCON-*` row or its own domain-named
  focused test file.
- A reader depends on a field outside the frontend whitelist or documented runtime contract.
- A frontend dynamic text value is absent from the permanent registry, has an
  unknown route, remains marked `NO`/`PATCH`, or lacks its required rendered
  repeated-instance evidence.
- An `L1` required test Agent or `L2/L3` independent acceptance Agent cannot
  execute and pass. This is not an L0 stop condition.
- Atomic migration or old-field removal semantics are unknown.
- Prompt growth has no explicit field-level budget or overflow behavior.
- The real production call graph, existing prompt readers, or semantic removal targets have not been mapped.
- A prompt-affecting change lacks a measured real-save baseline from the production builder.
- A new projection would coexist with an overlapping legacy payload without explicit approved migration and removal.
- The affected role exceeds the runtime-derived Prompt budget or an explicitly approved PRD target, duplicates semantic sources, or requires protected-field truncation.
- A proposed remediation would change a module or business semantic outside
  the current user goal, approved PRD scope or active task ownership, even when
  the underlying issue was discovered during current acceptance.
- An `L2/L3` completion claim is supported only by synthetic fixtures or unit
  tests. L0 uses its focused self-test fast path.
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
