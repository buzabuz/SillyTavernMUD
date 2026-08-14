# Technical Spec

Artifact revision: 1

Status: implemented and verified.

## Current Detector

```js
const CONCRETE_PAST_ACTION =
    '(?:hid|hidden|...|broke|broken|...|wrote|written|...)';

subject + optional(had|has) + action
```

Because the auxiliary is optional, `broken` and `written` are accepted as
standalone past actions.

## New Detector

Define:

```js
CONCRETE_FINITE_PAST_ACTION
CONCRETE_PAST_PARTICIPLE
```

Build:

```text
subject +
(
  had|has + (finite past | past participle)
  |
  finite past
)
```

Finite list:

```text
hid put taught cast left gave took broke found met helped refused lied saved
ran went came was were did stole returned brought kept made sent showed held
wrote heard saw spoke told said whispered waited packed
```

Participle-only list:

```text
hidden given taken broken gone done stolen written seen spoken
```

Ambiguous forms such as `left`, `put`, `taught`, `cast`, `found`, `met`,
`helped`, `returned`, `brought`, `kept`, `made`, `sent`, `showed`, `held`,
`heard`, `said`, `waited` and `packed` remain in the finite list and are also
accepted after `had|has` through the combined auxiliary branch.

Update `concreteClaimSubjectTokens()` to use the same action expression.

Do not change:

- explicit prior-time pattern;
- recall/quotation pattern;
- narration-vs-dialogue policy;
- capsule Event lookup;
- sourceEventIds authorization;
- deterministic evidence-anchor check.

## Test Matrix

Non-historical:

```text
something is actually broken
finish the written lesson
inspect the hidden latch
use the given name
replace the broken bottle
```

Historical:

```text
you broke my quill at breakfast
you wrote the note in the library
you had hidden my quill
we had gone to the station
yesterday you replaced the bottle
remember when you hid the key
```

Production:

1. replay the untouched failed response;
2. capture exact request and verify hash unchanged;
3. fresh context-free agent, one response;
4. real parser;
5. LangGraph settlement;
6. strict Low contract;
7. provenance validator;
8. scene validator;
9. transaction validator;
10. zero repair.

## Files

Production:

```text
public/scripts/extensions/hogwarts-mud/domain/narrative-memory-provenance.js
```

Tests:

```text
tests/hogwarts-mud-task6-repair-diagnostics.test.mjs
```

Governance:

```text
.trae/specs/hogwarts-low-provenance-participle-fix/*
.trae/specs/TECH_DEBT.md
.trae/specs/hogwarts-test-suite-decomposition/*
```

## Runtime/Prompt/Frontend

Runtime fields: None.

Prompt bytes: unchanged.

Frontend fields: None.

## Failure Policy

Exactly one model response. Parse, settlement or validation failure is
returned directly. No repair/retry/fallback.

## Rollback

Revert the regex split and tests. No data changes.
