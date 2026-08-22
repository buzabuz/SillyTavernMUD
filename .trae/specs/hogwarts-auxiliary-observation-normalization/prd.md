# Auxiliary Observation Normalization PRD

## Change ID and Status

- Change ID: `hogwarts-auxiliary-observation-normalization`
- Status: Approved for L1 implementation
- Change kind: fix
- Feature delta: 0
- Core change: no

## Problem and Evidence

Two auxiliary local-observation inputs reject valid completed-turn work before
their existing domain guards can decide whether to write State:

1. The shared Dynamic Turn request builds the standalone Inventory request
   first. Its obsolete `local_inventory` 9,000-character gate rejects a
   9,544-character component even though the final shared request is governed
   by `local_dynamic_turn` at 20,000 characters. The turn continues but Item
   proposals are omitted.
2. Local Appraisal output sometimes uses percentage notation such as
   `confidence: 95`. The stored Appraisal contract correctly uses decimal
   confidence in `[0, 1]`; the current transport parse rejects the whole batch,
   so Appraisal, Memory and downstream Social evidence for that turn are
   omitted.

## Before

| Workflow | Player-visible outcome | State outcome |
| --- | --- | --- |
| Shared routed Inventory request is 9,544 characters | The auxiliary request fails; no Item proposal is considered. | Item State is unchanged. |
| Appraisal returns `confidence: 95` | The auxiliary request fails; no observer Appraisal is considered. | Appraisal, Memory and Social evidence remain unchanged. |

Each route makes at most one existing local model request. No retry or fallback
is attempted.

## After

| Workflow | Player-visible outcome | State outcome |
| --- | --- | --- |
| Shared routed Inventory request is below 20,000 characters | It reaches the existing shared Dynamic Turn model and Item guards. | Only existing valid Item proposals may reach the Item Reducer. |
| Appraisal returns a nonnegative numeric confidence | `0..1` stays decimal; `1 < value <= 100` is interpreted as percentage; `value > 100` becomes `1`. | Existing Appraisal, Memory and Social validation decides whether the normalized proposal writes State. |

Examples: `0.95 -> 0.95`, `95 -> 0.95`, `100 -> 1`, `250 -> 1`.
Negative, nonnumeric, missing and otherwise invalid proposal fields remain
rejected by existing schema/guards.

## In Scope

- Shared Dynamic Turn may bypass the standalone Inventory prompt gate while its
  final combined request remains subject to the existing 20,000-character
  `local_dynamic_turn` gate.
- Standalone Inventory retains its 9,000-character gate.
- Appraisal confidence normalization occurs after one model response is
  received and before existing downstream Appraisal validation.
- Update VCON-014 and VCON-015 responsibility records and focused tests.

## Non-Goals

- No Item, Appraisal, Memory, Social or reducer redesign.
- No State-field migration or save repair.
- No prompt rewrite, model change, additional model call, retry, repair,
  provider fallback or semantic Regex fallback.
- No model caching, local residency or latency work.

## Runtime Contract Impact

No State field, State writer or reader changes. VCON-014 receives the shared
budget-routing rule; VCON-015 receives the deterministic confidence notation
normalization rule before existing downstream validation.

## Migration and Compatibility

No migration. Existing persisted Items, Appraisals, Memory and Social records
are unchanged. The behavior applies only to future auxiliary model responses.

## Prompt Field Budget

No prompt field changes. The shared Dynamic Turn final request continues to use
the existing `local_dynamic_turn` 20,000-character limit; standalone Inventory
continues to use `local_inventory` 9,000 characters.

## Frontend Field Whitelist

None. No frontend field or renderer changes.

## Acceptance Criteria

1. A 9,544-character Inventory component in a shared Dynamic Turn request
   reaches the existing final 20,000-character shared budget check and one
   model call.
2. A standalone Inventory request over 9,000 characters still rejects before
   model invocation.
3. Appraisal values `0.95`, `95`, `100` and `250` arrive at downstream
   validation as `0.95`, `0.95`, `1` and `1`, respectively.
4. Negative or nonnumeric confidence remains rejected; no proposal writes
   State.
5. Existing Item and Appraisal guard/reducer tests retain their authority and
   one-request/no-fallback contract.

## Risks and Rollback

The only new interpretation is numeric confidence notation. It is
deterministic, bounded to `[0,1]`, and runs before existing domain validation.
Rollback removes the two input adapters; it does not rewrite saved State.

## Approval

User approved the L1 scope on 2026-08-22 and explicitly required confidence
values above 100 to normalize to `1`.
