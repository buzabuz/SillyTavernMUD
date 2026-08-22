# Technical Specification

## Status

Approved for implementation on 2026-08-22. This specification replaces the
movement-only selected Post failure boundary with provider-aware Post assembly
and universal settlement safety.

## Provider-Aware Assembly

Every selected Post request is assembled as one structured payload before a
provider call:

```text
canonical input sections
-> provider-visible measurement
-> selected-provider capacity check
-> deterministic optional-section compaction
-> remeasure
-> one request or explicit no-fit pending state
```

Measurement includes:

```text
System messages
User JSON payload
Transport/format JSON Schema
Provider output reserve
Runtime wrapper fields
```

`modelSlots.low.contextSize/maxResponseLength` and
`createContextBudgetPlan()` govern Low. Local uses a separate measured
input-plus-schema-plus-output-reserve capacity; it cannot use Low's plan.

The legacy `post_turn_semantic.maximumCharacters=10_500` policy is retired as
a hard rejection gate. It may not reject a Low request that fits the selected
Low provider.

## Canonical Sections

`createPostTurnSemanticInput()` produces named sections rather than a
monolithic object:

| Section | Protection | Compaction |
| --- | --- | --- |
| System | protected | none |
| Schema | protected | none |
| playerAction | protected | none |
| narrativeSegments | protected | none |
| clock/elapsedMinutes | protected | none |
| room.current | protected | none |
| movementPreflight | protected when triggered | retain full route/candidate |
| targetActorIds | protected | none |
| existingActorPresence | optional | omit |
| playerTurnSequence | optional | omit |
| localPresence | optional | cohorts then whole section |
| actors | optional records | omit non-retained records only |
| room.exits | optional | omit |
| room.rooms | optional records | omit unrelated records only |

The assembly result records provider, full/compact character measurements,
the capacity-contract character-to-token **estimate** and derived token
estimates, retained section keys, and omission counts. It is bounded
diagnostic metadata and never State/Prompt authority for a later turn.

## Universal Pending Settlement

Replace movement-specific pending handling with:

```text
PendingPostSettlementV1
  version
  status: no_fit | provider_failed | rejected
  provider
  compactedSections[]
  playerMessageId / sceneMessageId
  timelineEpoch / stateRevision / sceneId guard
  transactionDraft
  movementPreflight?
  retryCount
  failureCode
```

On no-fit or any selected provider failure:

1. Save the paid Scene and `PendingPostSettlementV1`.
2. Write `turn.status=post_unsettled` through `context.chatMetadata`.
3. Write no transaction, clock, position, Post-derived field, Knowledge,
   archive, or prompt authority.
4. Block new player input.

`retryPendingPostSettlement()` validates the guard and sends one selected Post
request using saved Scene, action, draft and preflight. It never invokes paid
Scene, Pre, translation, retrieval or a fallback provider.

The guard permits a continuous sequence of `model_task_runtime`,
`lifecycle_migration`, and `metadata` revisions only when the metadata entry
has no changed domains. Any substantive world or Item revision still blocks
retry. A guard rejection must be shown to the player instead of only being
written to the browser console.

`discardPendingPostSettlement()` validates the same guard, removes the
uncommitted player+Scene pair, restores the saved pre-turn checkpoint/input,
clears pending metadata, and makes no model request.

## UI

One static generic settlement-pending card replaces movement-only wording:

```text
Post settlement pending
Retry Post
Discard turn
```

The card displays only static status plus bounded compaction section labels.
Raw provider errors remain diagnostic-only. Composer rejects all new input
while `turn.status=post_unsettled`.

## Migration

At lifecycle load:

- committed historical transactions remain untouched;
- `movement_unsettled` plus complete legacy pending envelope becomes
  `post_unsettled` / `PendingPostSettlementV1`;
- incomplete legacy pending message pairs remain uncommitted and expose only
  discard, never replay;
- remove old movement-only readers in the same migration.

## Verification

Add focused tests for:

1. Low `16,803` request dispatches once when Low capacity fits.
2. Local no-fit is determined from Local measured capacity.
3. Each optional section omission order and retained route-room invariant.
4. System/Schema/action/narration/movement preflight cannot be omitted.
5. No-fit/provider/guard failure creates generic pending and blocks submit.
6. Retry makes one Post-only call and commits once.
7. Discard makes zero calls, removes one pair, restores checkpoint/input.
8. Reload does not auto-call a model.
