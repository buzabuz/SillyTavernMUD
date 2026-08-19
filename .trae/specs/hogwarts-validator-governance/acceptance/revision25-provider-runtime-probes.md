# Revision 25 Provider Runtime Probes

Status: transport/settlement probes passed. This is not five-family quality
acceptance and does not replace blind simulation.

Date: 2026-08-19

## Local Runtime Probe

Called the real authenticated local endpoint once with a small post-turn
input. No timeline, chat, Item, Actor or Event State was written.

```text
endpoint: POST /api/hogwarts-mud/local/observe
taskId: post_turn_semantic_proposal
model: qwen3:1.7b
result perception source: post_turn_observer
material events: 0
actor updates: 1
inventory route: false
temporal claims accepted: 0
```

The model also proposed one temporal claim rejected by the server temporal
guard. In the actual selected-provider workflow this is a source failure:
the adapter returns no Material/Actor/Inventory/temporal/perception proposal,
does not call Low, and does not wake dynamic 4B. This is the approved
failure result, not a semantic-quality pass.

## Low Settlement Probe

Sent one valid raw structured object through the real authenticated settlement
endpoint. It did not call any provider and did not write State.

```text
endpoint: POST /api/hogwarts-mud/post/observe/settle
taskId: post_turn_semantic_proposal
transport: connection_profile
perception source: post_turn_observer
inventory route: false
temporal claims: 0
```

The actual Low provider was not called in this probe because the configured
Connection Profile was external and initially had no separate paid-call
authorization. The Low request shape, Regex exclusion, one-call policy and
cross-provider exclusion are covered by the focused deterministic test.

## Real Low Connection Probe

One minimal non-gameplay structured request was sent through the configured
Low Connection Profile:

```text
profile: trial · gemini 3.1
model: [F]gemini-3.1-pro-preview
requests: 1
result: API request failed
retry: 0
Local fallback: 0
State/chat/timeline writes: 0
```

This is a configuration/provider failure, not a VCON-013 fallback. The
implementation surfaced the first error and did not send another request or
change executor. Successful Low runtime acceptance remains blocked until the
configured Connection Profile is repaired or replaced.
