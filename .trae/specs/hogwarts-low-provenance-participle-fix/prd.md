# Hogwarts Low Provenance Participle Fix

Artifact revision: 1

Status: implemented and verified.

Change ID: `hogwarts-low-provenance-participle-fix`

Change kind: `fix`

Feature delta: `0`

Core change: `true`

## Problem and Evidence

The approved test-suite decomposition ran a fresh context-free sub-agent
against the exact unchanged production Low request:

```text
Prompt SHA-256:
610e188b65b46e7384bf50da6a2020a8e3faec55a2b949b7ba5c425504ed4559
```

The model returned one JSON response. Production settlement and validation
failed with:

```text
unsupported_historical_detail [segment:6]
unsupported_historical_detail [segment:8]
```

The rejected current-turn sentences were:

```text
So the first part is finding something that is actually broken.

Either place a real damaged object where I can inspect it, or we move on and
finish the written lesson.
```

Neither sentence recalls a prior episode.

The root cause is `CONCRETE_PAST_ACTION_PATTERN` in
`narrative-memory-provenance.js`. One action list currently mixes:

- finite past verbs: `broke`, `wrote`, `gave`, `went`;
- past participles: `broken`, `written`, `given`, `gone`.

The pattern permits optional `had|has`, so a bare participle can match as a
past action. Its broad subject expression then parses present-state noun
phrases such as `something ... broken` and `the written lesson` as historical
events.

Model call count was one and repair count zero. The failure is not permission
to retry.

## Before

```text
subject + [optional had/has] + finite-or-participle

something is actually broken
  -> bare "broken" treated as historical action

finish the written lesson
  -> bare "written" treated as historical action

Low response
  -> provenance error
  -> no repair
```

## After

```text
subject + finite-past
OR
subject + had/has + finite-past-or-participle

something is actually broken
  -> current adjective, not history

finish the written lesson
  -> attributive adjective, not history

you broke my quill at breakfast
  -> still historical

you had hidden my quill
  -> still historical
```

Only historical-claim classification changes. ACL, Event source IDs, claim
substring checks and evidence-anchor validation remain unchanged.

## In Scope

- split finite past actions from past participles in the provenance detector;
- require `had|has` before a participle is treated as the historical action;
- add focused false-positive and true-positive tests;
- rerun the exact failed blind response through production;
- run a new fresh context-free blind response after the fix;
- preserve one model response and zero repair responses;
- unblock `hogwarts-test-suite-decomposition` only after the fresh response
  passes.

## Non-Goals

- weakening narrator ACL or actor capsule boundaries;
- allowing unsupported prior episodes;
- changing Event hydration or Knowledge retrieval;
- adding model retry, repair or fallback;
- changing Low output Schema;
- changing Prompt text or budget;
- language validation;
- broad tense parsing or a general NLP dependency;
- fixing other technical debt.

## Runtime Contract Impact

Runtime field impact: None.

No State, message, Knowledge, UI or persisted field changes.

Validator contract impact:

- bare past participles used as current adjectives are not historical actions;
- finite past actions and `had|has + participle` remain historical actions;
- explicit prior-time and recall markers remain authoritative.

## Migration and Compatibility

No data migration.

This is an atomic validator cutover. Old saves, Events and capsules are
unchanged. There is no dual validator, fallback or compatibility period.

Rollback reverts the validator and focused tests.

## Prompt Field Budget

No Prompt impact.

The System/User messages and output Schema remain byte-identical. Acceptance
requires the production capture hash to remain:

```text
610e188b65b46e7384bf50da6a2020a8e3faec55a2b949b7ba5c425504ed4559
```

## Frontend Field Whitelist

None.

## Acceptance Criteria

1. The two failed current-turn sentences are not classified as historical.
2. Bare attributive participles such as `written lesson`, `broken bottle`,
   `hidden latch` and `given name` do not require Event provenance.
3. `you broke my quill at breakfast` still requires provenance.
4. `you had hidden my quill` still requires provenance.
5. Explicit `yesterday/last night/remember when` cases remain historical.
6. Narrator explicit prior history remains forbidden from actor-private Event
   use.
7. Unauthorized/missing Event IDs and weak evidence anchors still fail.
8. The untouched failed blind response passes the production parser,
   LangGraph settlement, provenance, scene validator and transaction validator.
9. A new fresh context-free sub-agent receives only the exact production
   request and passes the same one-attempt production pipeline.
10. Model responses equal 1; repair responses equal 0 on success and failure.
11. Prompt hash, archive SHA/bytes/mtime and Knowledge data remain unchanged.
12. Focused provenance, Task6 and affected full suites pass.
13. No unrelated production file changes.

## Risks and Rollback

### Risk: allowing a real historical participle claim

Mitigation: participles remain historical after `had|has`; explicit time and
recall markers remain independent detectors.

### Risk: broad grammar change

Mitigation: split the existing fixed word list only; no parser or new
dependency.

### Risk: overfitting one response

Mitigation: table-driven positive/negative cases plus a second fresh blind
agent.

Rollback is a Git revert. No State or index rollback.

## Approval

Approval status: approved and implemented.
