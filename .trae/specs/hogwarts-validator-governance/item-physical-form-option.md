# Item Physical Form Semantic Ownership Option

Status: read-only design evidence; one product decision remains unresolved.

This document supports a possible Revision 3 scope. It does not authorize
implementation.

## Current Production Path

```text
Low Scene Performance stateProposals[].item_update
-> Turn settlement itemUpdates[]
-> partitionItemProposals(sourceRole=low)

optional local Inventory observer inventoryUpdates[]
-> projectObservedInventoryUpdates()
-> partitionItemProposals(sourceRole=local_observer)

merge by proposal.key, local observer wins duplicate key
-> transaction.itemOperations[]
-> validateTurnTransaction()
-> Item Reducer
-> items[].state/physicalForm/holderId/location
```

The Low output contract does not expose `physicalForm`. The local Inventory
JSON/Zod contract does not expose it either. Three deterministic-looking paths
therefore infer it from prose:

1. `item-schema.js::normalizeItemPhysicalForm()` for a destroyed Item missing
   the field;
2. `item-reducer.js::normalizeItemProposal()` for a destroy proposal missing
   the field;
3. `item-reducer.js::applyOneOperation()` for a destroy operation still
   missing the field.

All three call `inferDestroyedPhysicalForm()`, whose broad English/Chinese
regex decides `remains|absent`.

## Candidate Target

Semantic ownership:

- existing local Inventory model is the sole semantic proposer for whether a
  destroy result left physical matter;
- Low may still propose the `destroy` operation but cannot propose or infer
  `physicalForm`;
- deterministic code verifies enum, source role, exact evidence substring and
  Item transition legality;
- missing, invalid, skipped or unavailable local output yields conservative
  `remains`;
- only an accepted local-observer destroy proposal may select `absent`;
- Item Reducer remains the sole State writer.

Local Inventory output adds one required field:

```text
physicalForm = "" for non-destroy operations
physicalForm = "remains" | "absent" for destroy
```

The accepted local proposal already overrides a duplicate Low proposal by the
existing stable proposal key. No new merge precedence is introduced.

## Failure Contract

| Condition | Result |
| --- | --- |
| local Inventory task is not triggered | Low destroy may commit only as `remains` |
| local Inventory request fails | existing optional omission; destroy defaults to `remains` |
| local output has invalid/missing field | reject only that local Item proposal; Low destroy remains conservative |
| local output says `absent` with exact authorized evidence span | deterministic checks pass field to Item Reducer |
| operation is not `destroy` but field is non-empty | reject affected local Item proposal |

No retry, repair, second provider, paid role-model call or model-generated
fallback is added.

## Prompt Budget Projection

Current active-save local Inventory baseline:

```text
Prompt: 8,354 / 9,000 characters
Transport: 9,828 characters
Estimated Prompt tokens: 2,785 / 4,096 configured context
```

Candidate System rule:

```text
- For destroy, physicalForm must be remains when fragments, ash, debris, or
  any carried matter survives, and absent only when the exact evidence
  explicitly states that no physical matter remains. Use an empty string for
  every other operation.
```

Measured static projection:

```text
System rule delta: +243 characters including newline
transport JSON Schema delta: +79 characters
projected Prompt: 8,597 / 9,000
projected transport: 10,150
remaining Prompt headroom: 403 characters
new model calls: 0
```

This is a projection only. Approval would require post-edit production
build-only measurement and a fresh context-free local Inventory blind case.

## Runtime And Migration Matrix

| Before | Proposed current-runtime behavior |
| --- | --- |
| explicit `physicalForm=remains|absent` | preserve and validate |
| current destroy proposal lacks field | deterministic `remains` |
| accepted local destroy proposal says `remains|absent` | preserve proposal |
| Item already `destroyed+absent` and destroy replays | preserve `absent` |
| Item already `destroyed+remains` and destroy replays without higher evidence | preserve `remains` |
| malformed current State lacks field | fail current Schema or use approved migration result; do not inspect prose in ordinary normalization |

## Unresolved Old-Save Decision

Legacy Item migration currently uses the same semantic regex through
`normalizeItem()` when a destroyed Item lacks `physicalForm`.

A complete cut requires one explicit rule for such old saves. The conservative
candidate is:

```text
destroyed + missing physicalForm -> remains
```

This never erases matter or clears holder/location based on prose, but it
changes the existing migration behavior for old prose that currently matches
`absent`. That product decision cannot be inferred from code or tests.

Until the user decides this rule, Revision 3 cannot be decision-complete and no
Item implementation is authorized.
