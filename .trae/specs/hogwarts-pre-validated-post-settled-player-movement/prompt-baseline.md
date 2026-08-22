# Prompt Baseline

Status: measured current-production baseline; no proposed prompt has been
generated.

Date: 2026-08-21

## Source

The existing build-only production measurement is
[`revision25-post-provider-prompt-measurement.json`](../hogwarts-validator-governance/acceptance/revision25-post-provider-prompt-measurement.json).
It used the configured representative chat archive, preserved that archive
byte-for-byte, and invoked the real prompt builders without a model call.

## Current measurements

| Request | Current prompt | Runtime ceiling | Result |
| --- | ---: | ---: | --- |
| Low Scene Performance | 43,865 chars / 14,622 estimated tokens | 298,080 chars | Within ceiling |
| Local Pre, ordinary | 10,379 chars / 3,460 estimated tokens | 4,096 tokens | Within ceiling |
| Local Pre, follow marker | 14,500 chars / 4,834 estimated tokens | 4,096 tokens | **Already over ceiling** |
| Post semantic | 10,269 chars / 3,423 estimated tokens | 4,096 tokens | 673 estimated tokens available |

The current Post transport schema adds 3,839 characters. Existing runtime
measurement treats transport separately, consistent with the existing Post
provider contract.

## Change budget

1. `movementIntent` and its full follow-only Pre prompt supplement are removed
   from the Pre model contract. The deterministic movement preflight replaces
   that route and adds no Pre model input.
2. The Low Scene `playerTurn.movementResolution` projection is replaced, never
   duplicated, by a bounded `movementPreflight` projection.
3. The Post request gains one bounded `movementPreflight` input and one
   `playerMovement` output field. Its additional System instructions,
   serialized preflight, and output descriptor must keep the measured Post
   prompt at or below 4,096 estimated tokens.
4. The post preflight is capped to the minimum route facts: marker mode,
   allowed outcome set, current room, one candidate destination, route
   identity, eligible companion IDs, and a stable reason code. It must not
   duplicate the room catalog, actor list, or narration.
5. Manual Post-only retry reuses the exact same Post builder and budget. It
   adds no paid Scene request and no additional prompt field.

The implementation task must rerun the same measurement against the active
representative archive, record the before/after section totals, and fail if
the Post prompt exceeds its configured ceiling or the legacy over-budget
follow Pre prompt remains reachable.
