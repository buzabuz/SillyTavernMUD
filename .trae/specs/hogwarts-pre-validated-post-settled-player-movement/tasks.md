# Tasks

Status values: `pending`, `in_progress`, `blocked`, `completed`.

| ID | Status | Work | Expected files | Verification |
| --- | --- | --- | --- | --- |
| PSM-01 | completed | Update product registry, runtime field contract, VCON-007/012/013, frontend registry, and test migration manifest before implementation. | Registry, `state-fields.md`, VCON JSON/MD, frontend registry, test manifest | Contract rows name one writer and no dual authority. |
| PSM-02 | completed | Implement pure `MovementPreflightV2`; remove Pre `movementIntent` and old pre State writers. | `movement.js`, pre contracts/prompt/adapter, `turn.js`, application ports | Direct/follow/blocked/ordinary preflight cases; no State mutation. |
| PSM-03 | completed | Replace Low Scene movement resolution prompt and retire injected outcome fact/text regex validation. | `turn-performance.js`, movement outcome helpers, validation, focused tests | Scene receives only preflight; no destination substring gate remains. |
| PSM-04 | completed | Add Post movement descriptor, server schema, candidate guard, and Movement Reducer final settlement. | Post contracts, local adjudicator, adapter, `turn-reducer.js`, `turn.js` | Candidate guard and atomic position bundle tests. |
| PSM-05 | completed | Implement pending settlement envelope, manual Post-only retry, reload lock, and UI card. Remove legacy replay writer. | `turn.js`, rollback/recovery, spatial reconciliation, UI/controller/locale, frontend registry | Saved Scene survives; retry makes no Scene call; reload does not write movement. |
| PSM-06 | completed | Migrate/retire stale movement and recovery tests; add domain-owned test suite. | Focused tests, migration manifest | All moved/removed assertions have a manifest row and reach business assertions. |
| PSM-07 | blocked | Run deterministic tests, representative-save prompt measurement, blind simulations, browser evidence, and fresh independent acceptance. | Evidence under this change directory | Blocked by remaining legacy follow writer plus unavailable browser/model and full measurement environments. |
| PSM-08 | pending | Complete ledger/debt closeout and update PRD registry status. | `TECH_DEBT.md`, registry, checklist/progress | Core-change debt decision recorded. |
