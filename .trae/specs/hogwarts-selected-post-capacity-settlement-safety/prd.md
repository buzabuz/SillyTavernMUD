# Selected Post Capacity And Settlement Safety PRD

## 1. Change ID and Status

- Change ID: `hogwarts-selected-post-capacity-settlement-safety`
- Status: `implementation in progress`
- Change kind: `fix`
- Feature delta: `0`
- Core change: `yes`
- Scope level: explicitly named partial capability; it does not redesign Post
  semantics, Map, movement, Pre, translation, or historical turns.

## 2. Problem and Evidence

A selected Low Post request measured `16,803` characters but was rejected
before model invocation by the legacy `10,500` Post product budget:

```text
Post System rules                 6,998
Post transport JSON Schema        4,399
Fixed JSON structure                186
Saved narration segments          1,841
Room context                      1,401
Movement preflight                1,160
Other current-turn context          818
----------------------------------------
Provider-visible total           16,803
```

The fixed System plus Schema already total `11,397`, so trimming dynamic
payload can never satisfy the legacy `10,500` limit. The active Low profile
has a much larger real request capacity. The request was therefore never sent,
but the paid Scene had already been saved.

## 3. Before

| Workflow | Current visible result | Current State/result |
| --- | --- | --- |
| Low Post fits its provider but exceeds `10,500` | Paid Scene appears, then Post is silently pre-rejected. | No Post proposal; a movement turn can become pending. |
| Local Post | Uses Local path, but its real input/output capacity is not measured as a provider-visible contract. | Current Local behavior varies by endpoint/runtime. |
| Any selected Post failure | Movement has a pending path; ordinary turns can follow a different fallback. | Recovery safety differs by semantic family. |
| No-fit request | Generic scheduler RangeError. | User cannot distinguish compacted/no-fit/provider failure. |

## 4. After

**Selecting Low means Low capacity is the hard request boundary. Selecting
Local means Local capacity is the hard request boundary.**

| Workflow | Required visible result | State/calls |
| --- | --- | --- |
| Selected provider full request fits | One selected Post request is sent. | Existing guards/Reducers commit only after acceptance. |
| Optional context must be compacted | Scene remains readable; diagnostics identify compacted sections. | One selected Post request; no protected truncation. |
| Protected request cannot fit after allowed compaction | Scene remains visible as `Post settlement pending`. | No Post call, no turn/clock/position/Post-derived write, composer locked. |
| Provider/transport/parse/schema/guard failure | Same `Post settlement pending` state. | No automatic repair/fallback/retry and no new player action. |
| Manual retry | `Retry Post` reuses saved narration and draft only. | Exactly one selected Post call; success commits once. |
| Manual discard | `Discard turn` removes the uncommitted player+Scene pair. | Restores pre-turn playable State/input; no model call. |
| Reload pending turn | Pending card and composer lock restore. | No automatic model call or State commit. |

## 5. In Scope

- Provider-aware measurement of complete Post requests: System, User payload,
  transport Schema, runtime reserve, and provider wrapper fields.
- Low uses `modelSlots.low` real capacity; the local-only `10,500` cap cannot
  reject Low.
- Local gets a separately measured provider-visible capacity including Schema
  and its fixed Ollama `num_ctx=4096` / `num_predict=1024` contract; its
  conservative character-to-token estimator is not shared with Low.
- Canonical structured Post payload assembly with permitted compact sections,
  atomic records, deterministic order, bounded omission diagnostics, and
  protected fields.
- Universal `post_unsettled` recovery for every selected Post no-fit/failure.
- Post-only retry and explicit discard of every uncommitted selected-Post turn.
- UI state, composer lock, persistence, reload, and migration from existing
  movement-only pending records.

## 6. Non-Goals

- No System/Schema semantic redesign or silent truncation.
- No automatic provider fallback, repair, retry, paid Scene replay, Pre replay,
  retrieval replay, translation replay, semantic Regex, or new model call.
- No change to Reducer ownership or historical committed turn replay.
- No new Map/movement/Actor/Item/Material semantic writer.

## 7. Prompt Assembly Contract

Protected, never omitted or cut:

```text
System rules
Transport/output Schema
Raw playerAction
Saved paid narration segments
Clock and elapsed time
Current room identity
Retained actor IDs and target IDs
Triggered movement preflight, route, candidate and guide/companion IDs
```

Permitted atomic omission order:

```text
1. existingActorPresence
2. playerTurnSequence
3. localPresence.cohortIds, then localPresence
4. Actor records outside current presence, targets, guide and companions
5. room.exits
6. room.rooms outside current room, retained actors' rooms and movement route
```

The full provider-fitting request is preferred. A lower product compaction
target must be separately user-approved and cannot be below protected content.

## 8. Runtime Contract Impact

| Path | Target meaning / writer |
| --- | --- |
| `turn.status=post_unsettled` | Generic selected-Post uncommitted state; written by Post settlement workflow only. |
| `extra.hogwartsMud.pendingPostSettlement` | Bounded saved draft, provider/fit diagnostics, optional movement preflight, message IDs and stale guard. |
| Existing `movement_unsettled` / `pendingTurnSettlement` | One-time migration into generic Post pending state; no long-term dual-read/write. |
| Prompt compaction diagnostics | Bounded message/runtime diagnostics only; never Prompt/Knowledge authority. |

## 9. Acceptance Criteria

1. A Low request of `16,803` that fits selected Low capacity is sent exactly
   once; `10,500` cannot reject it.
2. Every provider-visible Post request reports complete section measurement and
   its selected provider capacity before dispatch.
3. Only listed optional sections may be omitted; protected sections remain
   intact and record boundaries are never cut.
4. Any selected Post no-fit/failure leaves Scene visible, no turn/clock/position
   or Post-derived State write, and blocks new player input.
5. Retry makes one Post-only request; discard makes no request and restores a
   playable pre-turn state.
6. Local capacity is independently measured; Low capacity never leaks into
   Local behavior.
7. Reload preserves pending lock and recovery actions without model invocation.

## 10. Risks and Rollback

- Protected content can make a small Local provider genuinely no-fit. The
  correct result is explicit pending/discard, not malformed trimming.
- A discard implementation must remove exactly one uncommitted pair and restore
  only its saved pre-turn checkpoint.
- Rollback removes new assembly/recovery code without rewriting committed
  history or paid narration.

## 11. Approval

- PM discovery: PASS, including complete capacity and recovery matrix.
- User decision: every selected Post failure blocks the next player action;
  retry is Post-only and discard is explicit.
- Implementation approval: approved by the user on 2026-08-22.
