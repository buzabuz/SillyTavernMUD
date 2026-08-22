# Provider-Aware Post Assembly

This document is the durable prompt-assembly companion for
`hogwarts-selected-post-capacity-settlement-safety`.

## Required Sequence

```text
canonical named sections
-> full provider-visible measurement
-> selected provider capacity
-> deterministic optional-section compaction
-> remeasurement
-> one provider call or explicit no-fit pending state
```

The measurement includes System, User, transport Schema, wrapper fields and
reserved output. It is invalid to measure only the User JSON or only the
message list while the provider receives a format Schema separately.

## Capacity

- Low Post uses selected `modelSlots.low` context and response headroom.
- Local Post uses its independently configured Ollama contract:
  `num_ctx=4096` and `num_predict=1024`. Assembly measures the same System,
  User payload and format Schema before dispatch, then applies its bounded
  character-to-token estimator only as the conservative eligibility proxy.
  It never reuses Low capacity or permits transport-side string truncation.
- A historic fixed product cap is a compaction target only when current PRD
  explicitly approves it. It cannot reject a request that fits the selected
  provider.

## Assembly Sections

Protected:

```text
System, Schema, raw playerAction, saved narration, clock, elapsed time,
current room, target IDs, triggered movement preflight and route.
```

Optional, atomic omission order:

```text
existingActorPresence
playerTurnSequence
localPresence.cohortIds then localPresence
non-retained actor records
room.exits
unrelated room records
```

Every compacted request records section names and omission counts. No string
or JSON-byte truncation, semantic summary, provider fallback or automatic retry
is allowed.

## No-Fit

When protected content cannot fit after allowed compaction, do not call the
provider. The current turn is `post_unsettled`: narration remains visible,
State remains uncommitted, input is locked, and the user may only retry Post or
discard the uncommitted pair.
