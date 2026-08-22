# Technical Spec

Artifact revision: `2`

Status: `Revision 2 implementation complete; browser acceptance pending`

Authority: [PRD](prd.md)

## Goal

After the current English message is durably saved and rendered, independently
start the selected post provider and selected non-off translation provider.
Neither branch determines whether the other is eligible.

## Current Flow

```text
save/render English
-> await post semantic
-> optional local dynamic observation
-> reducers + State save
-> enqueue P0 translation
-> idle gate dispatch
```

The idle scheduler rejects dispatch while `turnActive` or turn settlement is
active, so overlap is impossible.

## Target Flow

```text
save/render English
-> derive stable P0 translation candidates
-> start selected post (`low` or `local`)
-> start selected current-message translation (`local`, `google`, or `bing`)
-> await post only for State flow; never await translation completion
-> optional local dynamic observation waits in existing local model queue
-> reducers + State save

translation completion
-> TranslationTable upsert
-> rerender current message
```

The two branches share no mutable proposal object and no State writer.

## Activation Contract

The current-turn dispatch is legal when:

```text
candidate priority === P0 current assistant message
source message is already saved and rendered
translationProvider in local | google | bing
```

`translationProvider=off` or no pending current-message candidate produces zero
translation work. `postTurnSemanticProvider` and `displayLocale` do not gate
dispatch.

## Orchestration Design

1. The saved current message is the single owner of its explicit P0 candidates;
   remove conditional late ownership.
2. The current-turn scheduler entry accepts the currently selected
   `local/google/bing` provider and only those exact P0 keys. It may ignore only
   the current turn/settlement idle gate.
3. It must retain all other safety gates:
   - one active localization batch;
   - current action/source identity;
   - selected non-off provider only;
   - no pending save conflict;
   - one provider request;
   - existing source/marker/Schema validation.
4. Start selected post and selected translation from the same visible-message
   boundary. Await only post for State flow.
5. Remove the tuple gate and conditional post-settlement enqueue. Stable record
   keys remain idempotent, but idempotency is not duplicate ownership.
6. Selected post remains exactly one request.
7. Existing server-side local semantic serialization remains the sole local
   residency authority when selected tasks are local.

No generic parallel task graph, cancellation, preemption or priority scheduler
is introduced.

## Status UI

Use existing fields and static locale keys only:

- `translating` is shown only while the P0 translation is pending/active;
- `committing` describes remaining post/State settlement;
- if both are active, translation may remain the primary visible phase while
  its detail states that Scene settlement continues in parallel;
- translation completion rerenders Chinese immediately, even if post remains
  active.

No new UI-session field or persistent field is added. Before implementation,
register this existing progress field family in
`FRONTEND_DYNAMIC_FIELD_REGISTRY.md`.

## Runtime Ownership

| Fact | Writer | Change |
| --- | --- | --- |
| English segments | existing scene message writer | none |
| post proposals | VCON-013 provider + existing guards | timing only |
| world State | existing domain Reducers | none |
| translated display row | VCON-016 translation table writer | timing only |
| localized render | existing LocalizedViewModel | earlier rerender |
| local residency | existing local semantic queue | none |

`state-fields.md` requires no semantic row change. Progress evidence must record
that only timing changed.

## Prompt and Model Contract

Prompt impact: `None`.

No model request payload, System Prompt, Schema, response parser, guard or
Reducer changes.

Call budget:

```text
selected post: exactly 1
P0 selected translation: 0 or 1 existing batch
routed local dynamic observer: existing 0 or 1
retry / repair / fallback: 0
local resident models: <= 1
```

## Failure and Race Handling

- Selected post failure does not cancel translation and writes no post-derived
  proposal.
- Translation failure does not reject the turn or post settlement; English
  remains visible and only the existing translation error outcome is written.
- A new player action does not start a second translation batch. An in-flight
  batch may finish and only upsert its source-hash-bound table rows.
- A stale or removed message cannot receive unrelated text because row identity
  includes stable source identity/hash.
- Final turn cleanup must not erase a completed translation row or convert
  translation failure into a turn failure.

## Verification Design

Create a focused domain-owned test:

```text
tests/hogwarts-mud-current-turn-post-translation-parallel.test.mjs
```

It proves:

1. the `low/local × local/google/bing/off` matrix uses one current-message
   owner and no provider-specific eligibility branch;
2. translation completion rerenders before post completion;
3. each failure is isolated;
4. call counts stay one/one with no retry/fallback;
5. `off` is zero work and P1-P4 use existing idle behavior;
6. routed local dynamic work is serialized behind active translation;
7. State revision and writer ownership are unchanged.

Browser acceptance uses one real representative save and records:

```text
English visible timestamp
translation request start/end
selected post request start/end
Chinese visible timestamp
state_settled timestamp
model call counts
```

Pass requires interval overlap and Chinese visibility independent of
`state_settled`. Fresh independent acceptance is mandatory.

## Rollback

Restore post-settlement current-message enqueue. No data migration or table
cleanup is required.
