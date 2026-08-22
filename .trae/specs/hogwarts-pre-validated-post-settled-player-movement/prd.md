# Pre-Validated, Post-Settled Player Movement PRD

## 1. Change ID and Status

- Change ID: `hogwarts-pre-validated-post-settled-player-movement`
- Status: `implementation and acceptance in progress`
- Change kind: `fix`
- Feature delta: `0`
- Core change: `yes`
- Scope level: explicitly named partial capability, not a general Map, Scene,
  Presence, or NPC redesign.

## 2. Problem and Evidence

Player movement is currently committed before paid narration:

```text
explicit destination or follow intent
-> applyPlayerMovement / settleFollowMovementIntent
-> map, Scene, spatial, Presence, Items written
-> paid narration is required to obey the committed result
```

This makes NPC consent unable to affect an attempted joint movement, lets
recovery write a move without Post evidence, and caused the rejected
`Seventh Landing` reply: the player had already moved in State, then a
destination-name text check rejected the paid narrative.

The target user outcome is: **a legal movement attempt is acted out first;
only evidence-backed Post settlement can change the player position.**

## 3. Before

| Player workflow | Current visible result | Current State result |
| --- | --- | --- |
| Reachable explicit destination | The scene begins after arrival. | Pre writes map, Scene, spatial, companions, held Items, and `lastMovement`. |
| Follow NPC and NPC refuses | Narration is constrained by an already selected result. | The player can already be moved. |
| Locked, unknown, or inaccessible target | Deterministic failure text is injected. | No move, but narration is mechanically constrained by a pre outcome. |
| Post provider fails | The adapter uses a conservative fallback and the turn can still commit. | No movement-specific recovery boundary exists. |
| Reload or retry | Existing recovery may rerun the whole turn. | `retryUnresolvedMovement` can call the old State-writing movement function. |

Normal model cost is one paid Scene request, one selected Post request, and
the existing single Pre request. The Pre request presently includes a
follow-only movement branch that exceeds the configured local context budget;
see [prompt baseline](./prompt-baseline.md).

## 4. After

```text
explicit movement marker
-> deterministic MovementPreflightV2 (no State write)
-> paid Scene narration
-> Post playerMovement candidate from exact narration evidence
-> deterministic guards
-> Movement Reducer is the sole position/time/history writer
```

| Player workflow | Required visible result | Required State result |
| --- | --- | --- |
| Reachable explicit destination | The scene shows travel and actual arrival. | Post candidate plus Reducer atomically writes position, accepted companions, travel time, and `lastMovement`. |
| Follow NPC consents | The scene establishes consent and completion. | The same post-settled move is committed only after evidence validation. |
| Follow NPC refuses or player remains | The refusal or changed outcome is shown. | Position and `lastMovement` remain unchanged; a final no-move outcome is committed with ordinary turn settlement. |
| Blocked/unknown/locked target | The scene may depict the block but cannot override it. | No move is possible; a Post no-move candidate commits the final outcome. |
| Post failure or rejection after paid narration | The paid Scene remains visible with a clear uncommitted-settlement card. | No turn transaction, position, travel time, `lastMovement`, Knowledge, archive, or Prompt authority is written. |
| Manual recovery | One explicit user action retries only Post against the saved text. | On success it commits the original pending transaction exactly once; on failure it stays uncommitted. No paid Scene request is made. |
| Reload while uncommitted | The same card remains; nothing auto-runs. | The action composer stays locked and State stays at the pre-turn position. |

## 5. In Scope

- Only explicit movement markers enter this capability. Ordinary prose,
  dialogue, recollection, quotation, plan, room reference, or NPC name never
  triggers it.
- Deterministic movement preflight: marker shape, destination alias/ID,
  current map/room, route, access, locks, supported interior bridge, and
  bounded companion candidates.
- Deterministic follow preflight using an explicit marker and supplied actor
  aliases/IDs. No unknown destination may become a move.
- Paid Scene receives preflight as a constraint, but decides what occurred in
  visible narration, including NPC consent or refusal.
- A Post `playerMovement` candidate with exact narration evidence and only
  preflight-authorized IDs/route.
- One Movement Reducer atomically updates the player position bundle, accepted
  accompanying actors, held Item locations, local Presence consequences,
  travel time, and `spatial.lastMovement`.
- Bounded persistence and UI for `movement_unsettled` plus explicit manual
  Post-only settlement retry.
- Retirement of the destination-name regex gate, pre-committed
  `movementOutcomeFactEn`, old follow movement pre settlement, and reload
  movement replay.

## 6. Non-Goals

- No Map topology, lock, route, custom-interior, or Scene-transition redesign.
- No NPC consent/refusal State, social, Memory, Calendar, Check, Material,
  Spell, Identity, or Item semantic expansion.
- No ordinary-prose movement detection and no semantic Regex/embedding
  fallback.
- No automatic model retry, repair, provider fallback, paid-narration replay,
  or hidden recovery call.
- No rewrite of historical turns or existing committed movement outcomes.

## 7. Runtime Contract Impact

| Field or message path | Target meaning and sole writer |
| --- | --- |
| `extra.hogwartsMud.movementPreflight` | `MovementPreflightV2`, a bounded same-turn eligibility snapshot written by the turn workflow; it is not an outcome or State authority. |
| `extra.hogwartsMud.pendingTurnSettlement` | A bounded, temporary recovery envelope on the rendered Scene message: transaction draft, message IDs, preflight, and stale guard. Written only by the uncommitted-turn workflow; deleted on successful commit or explicit rollback. |
| `turn.status` | Adds `movement_unsettled`, written by the turn recovery workflow only. It locks new player actions but is not a world-turn commit. |
| `map.activeMapId/currentLocalNodeId`, `scene.mapId/roomId`, `spatial.player`, `spatial.lastMovement` | Written only by the Movement Reducer after a valid Post candidate. |
| `turn.lastElapsedMinutes`, movement travel duration | Written only by final turn/movement settlement after valid Post candidate. |
| `extra.hogwartsMud.turnTransaction.movementOutcome` | Final committed outcome written after the Movement Reducer; absent while uncommitted. |

The implementation updates the relevant `state-fields.md` and `VCON-007`,
`VCON-012`, and `VCON-013` rows before production code changes. Until then,
those living-contract rows continue to describe current behavior.

## 8. Migration and Compatibility

- Existing committed turns remain read-only historical evidence.
- Existing uncommitted legacy messages are never replayed into a move. On
  lifecycle load they remain at their committed pre-turn location and are
  marked non-retryable under the new capability unless they contain the full
  `pendingTurnSettlement` envelope.
- The old `movementPreflight` outcome shape, `movementIntent` Pre output,
  `ensureMovementOutcomeFact`, destination-text arrival validator, and
  `retryUnresolvedMovement` State writer are removed atomically with their
  callers and tests. There is no dual-read or dual-write movement authority.
- A newly saved uncommitted turn contains one bounded recovery envelope. It
  is deleted atomically when its final transaction commits.

## 9. Prompt Field Budget

The measured current baseline is recorded in
[prompt-baseline.md](./prompt-baseline.md).

| Request | Field change | Authority | Budget |
| --- | --- | --- | --- |
| Pre | Remove `movementIntent` and the full follow-only movement supplement. | Deterministic `MovementPreflightV2` replaces this role. | The existing 4,834-token follow Pre path must become unreachable. |
| Low Scene | Replace protected `playerTurn.movementResolution` with bounded `movementPreflight`; never send both. | Deterministic preflight. | Remains under the current 298,080-character runtime ceiling. |
| Post | Add one bounded `movementPreflight` input and one `playerMovement` output contract. | Preflight + saved paid segments. | Final measured prompt must be at most 4,096 estimated tokens; current headroom is 673 tokens. |

No raw map catalog, full actor list duplicate, full pre state, recovery
envelope, or prior Post result may enter either model prompt.

## 10. Frontend Field Whitelist

| UI surface | Allowed dynamic source | Localization route |
| --- | --- | --- |
| Scene failure/recovery card | `turn.status`, bounded pending-settlement status, static retry state | Static locale keys only; no raw error or model text becomes player-facing copy. |
| Composer lock | `turn.status === "movement_unsettled"` | Static locale key only. |
| Existing Scene segments | Existing `extra.hogwartsMud.segments[]` | Existing message localization route, unchanged. |

No new free-form dynamic text is authorized. The implementation must add the
new static keys and update the frontend dynamic-field registry before UI code.

## 11. Acceptance Criteria

| Requirement | Observable workflow | Forbidden outcome | Evidence |
| --- | --- | --- | --- |
| Pre never moves | Submit a reachable explicit marker and inspect State before Post acceptance. | Any position, companion, held-Item, Presence, clock, or `lastMovement` write before Post. | Focused movement contract test. |
| Narrative decides consent | Submit a valid follow attempt where narration shows consent and one where it shows refusal. | Pre result forces NPC consent/refusal or a position change. | Blind model simulation plus focused fixtures. |
| Reducer is sole writer | Accept a valid Post completion candidate. | Any direct call path, reload repair, or UI retry writes the position bundle. | Writer-path test and stale/reload regression. |
| Pre limits Post | Post proposes a different/blocked target or unapproved companion. | State writes a target or companion outside preflight. | Guard/reducer test. |
| Ordinary prose is inert | Mention a room/NPC without an explicit marker. | Preflight, Post candidate, or position write. | Focused no-trigger test. |
| Post failure preserves paid work | Make Post fail after a valid saved Scene. | Lost Scene, paid rerun, transaction, movement/time/Knowledge write, or new action accepted. | Recovery integration test and browser acceptance. |
| Manual retry is Post-only | Click recovery retry after the above failure. | A second paid Scene call, automatic reload retry, or duplicate settlement. | Call-ledger and browser evidence. |
| Prompt budget holds | Run the real build-only measurement. | Post above 4,096 estimated tokens or reachable follow Pre above its configured budget. | Linked before/after prompt report. |

## 12. Risks and Rollback

- A Post failure can leave visible prose that is not yet State authority. The
  explicit uncommitted card and composer lock make this visible rather than
  silently pretending it committed.
- A stale manual retry must reject rather than apply to a changed timeline,
  Scene, or preflight guard.
- A faulty migration must preserve the old position; it must never infer a
  move from legacy prose.
- Rollback removes the new production paths atomically and returns to the last
  committed State. It does not rewrite visible paid narration or historical
  transaction records.

## 13. Approval

- PM discovery: PASS, including production-informed recheck, 2026-08-21.
- User product decisions incorporated:
  - Pre validates only; it does not write the player position.
  - Paid narration determines visible movement success and NPC consent/refusal.
  - Post creates the movement candidate; Reducer is the sole State writer.
  - Post failure preserves narration, creates an uncommitted state, and only a
    manual Post-only retry is permitted.
- Implementation approval: granted for this PRD, the linked
  [technical spec](./spec.md), [tasks](./tasks.md), and
  [checklist](./checklist.md) on 2026-08-21.
