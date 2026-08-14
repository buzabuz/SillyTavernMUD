# Progress

Artifact revision: 1

Phase: complete

Active task: none

Approval: approved

## 2026-08-14 - Evidence

Exact production Prompt:

```text
SHA-256 610e188b65b46e7384bf50da6a2020a8e3faec55a2b949b7ba5c425504ed4559
System 27,202 characters
User 28,344 bytes
Total 53,006 characters
```

Fresh context-free response:

```text
model responses 1
repair responses 0
```

Production failure:

```text
unsupported_historical_detail [segment:6]
unsupported_historical_detail [segment:8]
```

Sentence-level evidence:

```text
true  So the first part is finding something that is actually broken.
true  Either place a real damaged object where I can inspect it, or we move on
      and finish the written lesson.
```

Root cause:

```text
bare broken/written are accepted by the same optional-auxiliary action pattern
as finite broke/wrote
```

No production code, Prompt, save or Knowledge data changed during
investigation.

## Artifacts

- [PRD](./prd.md)
- [Spec](./spec.md)
- [Tasks](./tasks.md)
- [Checklist](./checklist.md)
- [Blocked decomposition](../hogwarts-test-suite-decomposition/progress.md)
- [Technical debt](../TECH_DEBT.md)

## Open Gate

The validator and verification are complete. The core-change technical-debt
re-inventory decision must be recorded before closeout.

## 2026-08-14 - Implementation

Split the detector into:

```text
CONCRETE_FINITE_PAST_ACTION
CONCRETE_PAST_PARTICIPLE
CONCRETE_HISTORICAL_ACTION
```

Bare participles no longer match. `had|has + finite/participle` and finite past
verbs still match. Explicit time, recall, quotation, ACL, source ID and
evidence-anchor logic is unchanged.

Focused verification:

```text
Task6/Low affected tests: 35/35
Migrated + provenance affected tests: 213/213
ESLint/syntax/diff: passed
```

Untouched failed response replay:

```text
model responses: 1
repair responses: 0
settlement: langgraph
provenance: passed
scene validation: passed
transaction validation: passed
```

New fresh context-free response:

```text
response SHA-256:
e4614711bebcf92e4911a4f576f094110dd62eb1a3bd97b3bf074aacda095976

model responses: 1
repair responses: 0
settlement: langgraph
validation: passed
transaction validation: passed
```

No-change evidence:

```text
Prompt SHA-256:
610e188b65b46e7384bf50da6a2020a8e3faec55a2b949b7ba5c425504ed4559

Archive SHA-256:
3062bc06d331a8532a508e4eaacaca20272f8f80496492e6d15dc8b9152df6fa

Archive bytes:
7,123,497
```

Final full Hogwarts glob:

```text
640 tests
582 pass
58 fail
```

The failure count is unchanged from the pre-fix decomposition run; all 58 are
the pre-existing `HTD-004` focused-test debt.

Assistant technical-debt self-report:

```text
No new unregistered debt.
One validator regex and one focused test matrix changed.
No Prompt growth, skip, retry, compatibility layer or temporary hack.
HTD-005 is resolved by the replay and fresh blind pass.
```

## Re-inventory

The user selected `reinventory` after this core fix. Current evidence was
rechecked:

- HTD-001 open;
- HTD-002 open;
- HTD-003 open;
- HTD-004 open;
- HTD-005 resolved.

The change ledger records this fix as `kind=fix`, `feature_delta=0`,
`core_change=yes`. Cumulative feature count remains 0.
