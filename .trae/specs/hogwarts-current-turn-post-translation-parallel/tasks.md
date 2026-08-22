# Tasks

Artifact revision: `2`

Status: `implementation complete; browser acceptance pending`

At most one task may be `in_progress`.

## CPTP-01 - Governance and Contracts

Status: `completed`

Depends on: explicit corrected-scope approval

Work:

- update VCON-013 and VCON-016 to selected-provider independent start;
- register the existing progress field family in the frontend registry;
- confirm runtime-field impact remains timing-only.

Verification:

- JSON/Markdown VCON parity;
- no new State/frontend field;
- Product Spec status current.

## CPTP-02 - P0 Parallel Dispatch

Status: `completed`

Depends on: CPTP-01

Work:

- emit current-turn translation candidates after English save/render;
- dispatch explicit P0 keys through the selected non-off translation provider;
- remove the tuple gate, `ownsCandidates`, and conditional late enqueue;
- preserve existing local-model serialization and all failure policies.

Verification:

- focused scheduling/call-budget tests;
- no Prompt/Schema diff;
- syntax and lint.

## CPTP-03 - Truthful Progress UI

Status: `completed`

Depends on: CPTP-02

Work:

- make existing translation/commit phases reflect actual active work;
- rerender Chinese immediately when P0 translation completes.

Verification:

- desktop/mobile browser workflow;
- no new dynamic field;
- no misleading active translation before dispatch.

## CPTP-04 - Acceptance

Status: `blocked`

Depends on: CPTP-02, CPTP-03

Work:

- run real-save timing capture and failure matrix;
- verify one-request policies and one local resident model;
- run fresh independent acceptance;
- complete debt/closeout records.

Verification:

- all PRD acceptance criteria pass;
- no debug instrumentation remains;
- user decides technical-debt re-inventory because this is a core change.
