# Technical Specification

## Status

Draft for approval. This document describes the target contract only; current
production behavior remains documented by the living runtime contract.

## Invariant

```text
explicit marker -> deterministic eligibility -> paid narration
-> one evidence-backed Post candidate -> Movement Reducer -> committed State
```

Only the Movement Reducer may write the position bundle. No parser, prompt,
reload repair, retry path, Post model, or paid narrative may write it.

## Contract Design

### 1. MovementPreflightV2

`movement.js` gains a pure preflight function. It reuses the existing marker
grammar, map lookup, route/lock/access checks, interior bridge rules, and
canonical actor alias lookup, but performs no clone-and-write operation.

```text
MovementPreflightV2
  version
  triggered
  mode: direct_room | follow_actor
  eligibility: eligible | ineligible | already_there
  reasonCode
  fromMapId/fromRoomId
  candidateMapId/candidateRoomId
  routeRoomIds/routeMinutes
  guideActorId
  eligibleCompanionActorIds
  markerEvidence
```

It is bounded and contains no full map, actor list, prompt, message history,
or inferred prose semantics. A target is eligible only when it is named by
the explicit marker and passes deterministic topology/access checks. Follow
without one bounded target remains ineligible and can never produce a move.

The existing Pre model loses `movementIntent` entirely. Its remaining
check/time/Calendar duties are unchanged. This makes full follow-only Pre
movement context and its over-budget prompt path unreachable.

### 2. Paid Scene

The Low Scene prompt receives only `movementPreflight`, replacing the existing
`movementResolution`; both are forbidden together. It is told:

- eligibility is a route/access limit, not an arrival;
- only a preflight-authorized route can be depicted as a completed player
  movement;
- NPC consent/refusal and whether the player actually completed the movement
  are determined in the visible Scene;
- ineligible movement may be shown as blocked but must not be depicted as an
  authoritative arrival.

`movementOutcomeFactEn`, automatic segment injection, and the destination
substring validator are removed. The Scene still has no direct State write.

### 3. Saved Pending Settlement

Immediately after successful paid narration is saved and rendered, the Scene
message carries this temporary envelope until final commit:

```text
PendingTurnSettlementV1
  version
  status: pending_post | post_failed
  playerMessageId/sceneMessageId
  timelineEpoch/stateRevision/sceneId guard
  movementPreflight
  transactionDraft
  retryCount
  failureCode
```

`transactionDraft` is the bounded serialized transaction built from the saved
paid response, deterministic Check result, spell directives, and pacing
input. It excludes retrieval results, model prompts, raw responses, secrets,
and whole State. It is not a committed transaction, not Prompt authority, and
not eligible for Knowledge or archive projection.

### 4. Post Candidate

The shared browser/server Post descriptor adds a required nullable field:

```text
playerMovement: null | {
  outcome: moved | not_moved | already_there,
  destinationMapId,
  destinationRoomId,
  accompanyingActorIds,
  evidenceText
}
```

The Post input adds `movementPreflight: null | MovementPreflightV2`.
`evidenceText` must be one exact non-empty substring from saved paid segments.
The Post descriptor must return `null` for ordinary non-marker turns.

The deterministic candidate guard enforces:

- `moved` only when preflight is `eligible`, with the exact preflight
  destination and route;
- `accompanyingActorIds` is a deduplicated subset of
  `eligibleCompanionActorIds`; a follow guide must be evidenced as
  accompanying before it moves;
- `not_moved` or `already_there` cannot change destination, companions,
  travel duration, or `spatial.lastMovement`;
- an ineligible preflight cannot be converted into `moved`;
- all evidence is exact saved narration evidence; confidence, Regex, and
  embedding cannot substitute for it.

`requestPostTurnSemanticObservation()` separates movement-candidate failure
from the existing conservative downstream observation fallbacks. A selected
Post provider/schema/evidence failure before a movement candidate is accepted
returns a typed movement-settlement failure only for a triggered preflight.
For ordinary turns, and for already accepted movement candidates followed by
an independent Item/Material fallback, existing conservative behavior remains.

### 5. Movement Reducer and Final Transaction

Add a domain-owned Movement Reducer, invoked by `applyTurnTransaction()` after
the complete transaction validates and before dependent Presence/Item
projection. It accepts the preflight plus guarded Post candidate and produces
the sole final `MovementOutcomeV1`.

For `moved`, one atomic reducer operation updates:

```text
map.activeMapId/currentLocalNodeId
scene.mapId/roomId
spatial.player
spatial.lastMovement
accepted companion Actor Runtime locations
held Item locations and scene item projection
transaction.movementOutcome
travel duration
```

For `not_moved` or `already_there`, it records the final outcome but preserves
all position fields, companion positions, travel duration, and
`spatial.lastMovement`. The ordinary turn clock policy remains unchanged.

`applyPlayerMovement()` and `settleFollowMovementIntent()` cease to be
production State writers. Their reusable deterministic route logic moves into
preflight/reducer helpers. `reconcileSpatialState()` removes
`retryUnresolvedMovement` and never invokes a player-movement writer from
player text.

### 6. Failure, Manual Retry, and Reload

When a triggered movement preflight cannot obtain an accepted Post candidate:

1. Keep the saved Scene message and `PendingTurnSettlementV1`.
2. Set `turn.status = "movement_unsettled"` with a bounded static failure
   code, never a raw model error.
3. Do not write a final transaction, position, clock, travel duration,
   `lastMovement`, Presence, Item location, Knowledge, archive, or prompt
   authority.
4. Do not auto-retry or provider-fallback.

The recovery button invokes `retryPendingMovementSettlement()`:

```text
load latest pending envelope
-> verify timeline/Scene/revision guard
-> invoke exactly one selected Post request with saved segments, draft, action,
   and preflight
-> validate candidate
-> commit the original draft once, or retain post_failed
```

It never calls Pre, paid Scene, retrieval, translation, or dynamic recovery
models. A reload only renders the pending recovery card and locks the composer.
`processUnsettledTurn()` must not call `runStructuredTurn()` for this status.

### 7. UI

`story-renderer.js` distinguishes general failed turns from
`movement_unsettled`. The latter uses static localized title/detail/button
keys and targets only `retryPendingMovementSettlement()`. `turn-controller.js`
blocks a new submission while this status exists. The current generic failure
card keeps its existing retry semantics for non-movement failures.

The implementation updates:

- `FRONTEND_DYNAMIC_FIELD_REGISTRY.md`;
- `ui-game-static.js`;
- the browser acceptance matrix for the recovery card and composer lock.

## Current-to-Target Ownership

| Current writer | Target |
| --- | --- |
| `turn.js -> applyPlayerMovement()` before paid Scene | `turn.js -> MovementPreflightV2` only |
| `turn.js -> settleFollowMovementIntent()` before paid Scene | deterministic follow preflight only |
| `turn-performance.js -> ensureMovementOutcomeFact()` | removed |
| `turn-validation.js` destination substring gate | removed |
| `spatial-reconciliation.js -> retryUnresolvedMovement` | removed |
| Post output has no player field | Post returns guarded `playerMovement` candidate |
| `applyTurnTransaction()` has no player movement reducer | transaction invokes sole Movement Reducer |

## Runtime Contract Updates

Before production code changes, update these existing VCON rows:

| Row | Required target revision |
| --- | --- |
| `VCON-007` | Scene reads bounded preflight and preserves paid narration; no injected movement result or semantic destination text gate. |
| `VCON-012` | Pre no longer owns movement semantics, outcome, State write, or movement time. |
| `VCON-013` | Post owns one `playerMovement` semantic candidate; the Movement Reducer owns final settlement. |

The same task updates `state-fields.md` for
`MovementPreflightV2`, `PendingTurnSettlementV1`, `movement_unsettled`, the
post-owned candidate, and the position-bundle writer.

## Migration

No historic move is recomputed. Lifecycle:

- accepts already committed legacy transactions as history;
- never invokes legacy movement replay;
- leaves an old incomplete Scene without a V1 envelope at the last committed
  location and surfaces a non-retryable status;
- accepts only a complete V1 pending envelope for manual Post-only retry.

## Verification Design

Add `tests/hogwarts-mud-post-settled-player-movement.test.mjs` as the
domain-owned contract test. It covers:

1. direct reachable move: no pre write, then one post/reducer commit;
2. follow consent and refusal;
3. blocked/unknown/ordinary prose cases;
4. destination/companion/evidence guard rejection with no State write;
5. provider/schema failure preserves narration and locks the composer;
6. manual Post-only retry calls Post once, never Scene, and commits exactly
   once;
7. reload, stale guard, and rollback cannot replay movement;
8. call budget and no automatic retry/fallback.

Migrate retired assertions from the existing movement, validation, spatial
reconciliation, recovery, and workflow tests. Append their exact retirement
rows to the canonical test migration manifest.

After deterministic tests:

- rerun the representative-save prompt measurement;
- run context-free blind simulations for affected Pre, Low Scene, and Post
  request shapes;
- perform browser acceptance of the uncommitted card and manual retry;
- obtain fresh independent L2 acceptance.
