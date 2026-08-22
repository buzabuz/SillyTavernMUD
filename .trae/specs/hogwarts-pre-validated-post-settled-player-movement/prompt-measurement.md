# Prompt Measurement

Status: partial pass with an unrelated full-script blocker.

Date: 2026-08-21

## Baseline

The last successful representative-save build-only capture measured the Post
request at 10,269 prompt characters, 3,423 estimated tokens, and a configured
4,096-token ceiling. Its archive SHA was
`597e69e069d10e771b4197f54a9ceeffd8801ce8175ce5c927ff2868b2adff06`.

## Current Contract Delta

The current executable descriptors prove:

```text
Pre output fields:
schemaVersion, temporal, check, calendarCommitment

Post required fields:
schemaVersion, materialEvents, actorUpdates,
inventoryObservationRequired, perception, temporalClaims, playerMovement

Post transport schema:
4,399 characters (+560)

Post System Prompt:
+1,192 characters against the captured baseline

Projected Post prompt:
12,021 characters / 4,007 estimated tokens
```

This remains below the configured 4,096-token ceiling with 89 estimated tokens
remaining. The old follow-only Pre model branch is removed; its measured
4,834-token overflow is no longer reachable.

## Full Measurement Blocker

The normal command:

```text
HOGWARTS_PROMPT_MEASURE_SCOPE=pre-validated-post-settled-movement \
node .trae/specs/hogwarts-prompt-payload-consolidation/measure-prompts.mjs
```

failed before Post measurement at the existing Dynamic Inventory builder:
`DynamicInventoryInputError`, because six generated `narrativeSegments[].textEn`
values were empty. The measurement script therefore produced no valid capture
and no representative archive write. This change does not relax or alter that
Inventory validation. Full real-save prompt acceptance remains blocked until
the measurement path is repaired under its owning scope.
