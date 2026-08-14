# Hogwarts Prompt Payload Consolidation Tasks

Status values: `pending`, `in_progress`, `blocked`, `completed`.

## Governance and Reconnaissance

- [x] **HPC-00 - Inventory all production model calls** (`completed`)
  - Trace orchestration, Prompt builders, repair paths, response Schemas and persistence consumers.
  - Include role-model calls, local semantic calls and translation calls.
  - Evidence: `spec.md#production-map`.

- [x] **HPC-01 - Measure real production Prompts** (`completed`)
  - Build every reachable Prompt without a model call.
  - Record total/System/User/Schema sizes, runtime ceiling, largest fields and trimming.
  - Evidence: `measure-prompts.mjs`, `prd.md#9-prompt-field-budget`.

- [x] **HPC-02 - Audit semantic duplication and legacy payloads** (`completed`)
  - Map each injected fact to its authority owner.
  - Identify repeated, obsolete, unbounded and audience-unsafe payloads.
  - Evidence: `prd.md#2-problem-and-evidence`, `spec.md#writer-and-reader-ownership`.

- [x] **HPC-03 - Reconcile runtime contracts** (`completed`)
  - Update living contract rows for every affected Prompt projection.
  - Evidence: `../hogwarts-runtime-contracts/state-fields.md`.

- [x] **HPC-04 - Complete Revision 1 artifacts** (`completed`)
  - Finish PRD, spec, tasks and checklist from measured evidence.
  - Stop for explicit implementation approval.

- [x] **HPC-05 - Audit task ownership and trigger graph** (`completed`)
  - Account for all 20 generative tasks, every direct caller and event phase.
  - Evidence: `spec.md#current-trigger-map`.

- [x] **HPC-06 - Audit Director consolidation candidates** (`completed`)
  - Trace Opening/Foundation, Opening Plan/Daily/Transition and Pacing/Social
    through validation, reducers and persisted State.
  - Evidence: `spec.md#task-consolidation`.

- [x] **HPC-07 - Measure call frequency and missing ledger evidence** (`completed`)
  - Tina evidence: 23 consumed Pacing beats / 99 turns; 14 new/mixed; two High
    and two Medium Calendar commits in retained revision history; Social exact
    count unavailable without a ledger.

- [x] **HPC-08 - Audit Interior Cartographer mount chain** (`completed`)
  - Trace request, generation, mount, re-entry, movement, Scene destination,
    map UI and Calendar readers.
  - Evidence: `spec.md#interior-mount-contract`.

- [x] **HPC-09 - Complete Revision 2 artifacts** (`completed`)
  - Add registry, scheduler, quota, task retirement and map-mount migration
    contracts.

## Implementation

Revision 2 is approved. Exactly one implementation task may be `in_progress`.

- [x] **HPC-10 - Align Authority and Actor proposal contracts** (`completed`)
  - Depends on: approval.
  - Work: fix Authority Snapshot duplicates and align retained Actor creation
    proposals with Actor V1 before budget allocation.
  - Verification: one Item/Material/Room source; Schema/validator equality;
    non-empty ActorCoreV1 round trips.

- [x] **HPC-11 - Add model-task registry and deterministic scheduler** (`completed`)
  - Depends on: HPC-10.
  - Work: register 16 active tasks, account for four retired tasks, centralize
    event emission, guards, idempotency, phases and failure policy.
  - Verification: no direct model caller outside scheduler/adapter boundaries.

- [x] **HPC-12 - Add task ledger, quota and budget allocator** (`completed`)
  - Depends on: HPC-11.
  - Work: persist bounded counters/eligibility; enforce tier/workflow input
    budgets and medium Scene call quota.
  - Verification: reload idempotency, one synchronous medium task per event,
    no Prompt/response persisted.

- [x] **HPC-13 - Consolidate bootstrap and retire Daily** (`completed`)
  - Depends on: HPC-12.
  - Work: remove Foundation, Opening Plan, Opening Dialogue and Daily callers;
    add Scene Opening bootstrap mode and deterministic time policy.
  - Verification: bootstrap is one High + one Low call; retired-call search is
    empty; clue/intent ownership remains valid.

- [x] **HPC-14 - Narrow Pacing and coordinate Social** (`completed`)
  - Depends on: HPC-12/HPC-13.
  - Work: remove actor/filler/roster Pacing reasons; keep causal-only once per
    Scene; route Social through the same medium quota ledger.
  - Verification: no more than one Pacing call per Scene; Social grounding and
    ACL unchanged; no five-call catch-up loop.

- [x] **HPC-15 - Normalize Interior mount authority** (`completed`)
  - Depends on: HPC-11.
  - Work: atomic `worldAnchorId + mount` migration, derived mount index,
    nested map/Calendar readers and preset-container bypass.
  - Verification: Tina's two interiors migrate uniquely; re-entry and
    destination hierarchy pass; old binding fields are absent.

- [x] **HPC-16 - Consolidate task-specific Prompt projections** (`completed`)
  - Depends on: HPC-10 through HPC-15.
  - Work: Actor cards, map modes, Calendar schedules, Social payload, local
    structured calls and repair envelopes.
  - Verification: no full-state payload, duplicate subtree or budget failure.

- [x] **HPC-17 - Compact native Hogwarts System injection** (`completed`)
  - Depends on: HPC-10/HPC-16.
  - Files: mandatory projection and app controller.
  - Verification: native injection <= 20,000 and contains each protected fact
    once.

- [x] **HPC-18 - Full acceptance and living-contract closeout** (`completed`)
  - Depends on: HPC-10 through HPC-17.
  - Files: build-only report, focused tests, runtime contract and progress.
  - Verification: scheduler/task inventory, call quotas, mount migration, Tina
    no-write build-only, all budgets, protected LowTier 203-byte snapshot,
    regressions and approved end-to-end workflow.

- [x] **HPC-19 - Align the complete Low output contract and remove auto-repair** (`completed`)
  - Depends on: HPC-18.
  - Files: Low Prompt builder, narrative settlement/protocol, Actor admission,
    validator, localization, measurement and focused tests.
  - Work: remove Low current-impression/memory/clue aliases and deterministic
    mentioned-Actor memory injection; make proposal fields exact; perform one
    Low call and fail immediately on invalid output.
  - Verification: Prompt/fold/validator field equality; invalid fixtures make
    one call across all active Low modes; real Tina build-only and fake API
    chain pass; protected Low System content and product budgets pass.

- [x] **HPC-20 - Repair scheduler persistence and stale boundary guards** (`completed`)
  - Depends on: HPC-11/HPC-12/HPC-19.
  - Files: scheduler, save revision domains, turn/Appraisal and Memory guards,
    application persistence wiring, Task 8 and boundary regression harnesses.
  - Work: reacquire live State after scheduler persistence; retain outcome
    counters; distinguish ledger-only revisions from business staleness;
    preserve the live ledger in turn commit; migrate all affected harness ports.
  - Verification: latest Tina failure fixture commits with one Low call; real
    persistence-replacement scheduler counters pass; genuine stale boundaries
    still reject; Task 8 reaches its intended assertions; save remains
    unchanged by build-only verification.
