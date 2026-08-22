# Technical Spec: Auxiliary Observation Normalization

## Status

Approved L1 implementation design.

## Inventory Budget Boundary

```text
standalone Inventory
-> local_inventory 9,000-character gate

shared Dynamic Turn
-> build Inventory component without standalone budget admission
-> build final requested sections and shared transport schema
-> local_dynamic_turn 20,000-character gate
-> one shared 4B request
-> existing Inventory guards and Item Reducer
```

The component builder may not invoke the standalone budget gate when called by
the shared Dynamic Turn composer. The final shared request remains the only
budget authority for that route.

## Appraisal Confidence Boundary

```text
one local Appraisal response
-> permissive nonnegative numeric transport admission
-> deterministic confidence normalization
-> existing decimal [0,1] Appraisal/domain validation
-> existing Memory/Social reducers
```

Normalization:

```text
0 <= value <= 1: value
1 < value <= 100: value / 100
value > 100: 1
```

Negative, missing, nonnumeric and nonfinite values remain invalid. No model
response is retried or repaired.

## Ownership

| Concern | Owner |
| --- | --- |
| Shared request budget | `dynamic-turn-observer.js` and `local_dynamic_turn` policy |
| Standalone Inventory budget | `inventory-observation-contract.js` and `local_inventory` policy |
| Confidence notation normalization | `local-appraisal-proposer.js` |
| Decimal confidence validation and settlement | Existing Appraisal schema, Memory/Social guards and reducers |

## Verification

- Dynamic Turn test proves 9,544 characters reaches the shared 20,000 limit.
- Dynamic Inventory test proves standalone 9,000 behavior remains unchanged.
- Local Appraisal proposer test proves decimal, percentage and clamped values,
  plus invalid negative/nonfinite rejection.
