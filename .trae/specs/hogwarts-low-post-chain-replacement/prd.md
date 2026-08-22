# Low Post Chain Replacement PRD

## 1. Change ID and Status

- Change ID: `hogwarts-low-post-chain-replacement`
- Status: `implementation in progress`
- Change kind: `refactor`
- Feature delta: `0`
- Core change: `yes`
- Scope level: explicit partial capability: Low Post semantic-chain replacement
  plus provider-neutral formal-Item context selection. This is not a complete
  Item, Identity, Pre, Scene, Appraisal, or prompt-caching redesign.

## 2. Problem and Evidence

The current `postTurnSemanticProvider=low` setting replaces only the primary
VCON-013 executor. After a successful Low Post, two route fields can still
start a serial local 4B request:

```text
Low Post
-> inventoryObservationRequired=true
   or Check target actorId present
-> local_dynamic_turn_observer (qwen3:4b)
-> Item / Identity proposals
-> existing guards and Reducers
```

This contradicts the approved user meaning of selecting a large Post model:
the selected large model replaces the old `1.7B Post + optional 4B
Inventory/Identity` semantic chain, rather than replacing only its first
call.

The current Dynamic Inventory input is built from all `state.items[]`. It can
include up to 128 formal Items regardless of whether an Item is materially
present or mentioned in the current turn. `scene.itemStates[]` is not a
replacement selector: its holder-follow projection maps carried/equipped
Items into the current room. Treating it as a Post Item list would violate the
user rule that an unmentioned carried Item remains absent.

The complete current and planned field routes are registered in:

- [model-field-routes.md](../hogwarts-runtime-contracts/model-field-routes.md)
- [state-fields.md](../hogwarts-runtime-contracts/state-fields.md)
- [VCON ownership](../../skills/hogwarts-change-governance/VALIDATION_RESPONSIBILITY_REGISTRY.md)

## 3. Before

| Player/runtime workflow | Current calls | Current result |
| --- | --- | --- |
| Low Post, no Item/Identity route | One Low Post. | Core Post proposal may settle. |
| Low Post, Item change may exist | One Low Post, then one serial local 4B Dynamic request containing all formal Items. | 4B alone proposes Item updates; a large unrelated Inventory can fail the whole auxiliary request. |
| Low Post, direct Check target exists | One Low Post, then one serial local 4B Dynamic request. | 4B alone proposes direct injury observations. |
| Low Post, Item plus Identity route | One Low Post, then one shared serial 4B request. | The request contains both auxiliary sections. |
| Low provider fails | One Low Post attempt. | Paid narration remains; `post_unsettled` recovery applies. No explicit fallback is intended. |
| Local Post, routed Item/Identity | One local 1.7B Post, then one shared local 4B request. | Existing Local chain runs. |

## 4. After

Selecting `low` means one large-model Post completes the current immediate
Post semantic chain. Selecting `local` retains the existing local-chain
behavior.

| Player/runtime workflow | Required calls | Required result |
| --- | --- | --- |
| Low Post, no change | Exactly one Low Post; zero local Post/4B calls. | Existing core guards settle no Post-derived Item/Identity write. |
| Low Post, Item change | Exactly one Low Post; zero 4B calls. | Low proposes existing transient Item updates using only eligible Item context; existing Item guards/Reducer decide the write. |
| Low Post, direct injury observation | Exactly one Low Post; zero 4B calls. | Low proposes only the existing bounded direct-injury observation; existing Identity guards/Reducer decide the write. |
| Low Post, Item plus direct injury | Exactly one Low Post; zero 4B calls. | Both proposal families independently pass or fail their existing guards. |
| Low provider fails or Low output is rejected | Exactly one failed Low Post; zero local/4B substitute calls. | Paid narration remains, no Post-derived State commits, `post_unsettled` exposes explicit Post-only retry or discard. |
| Local Post, routed Item/Identity | Existing local 1.7B Post plus at most one shared 4B call. | Local semantics and failure behavior remain unchanged except for the new Item context selector. |

## 5. In Scope

### 5.1 Provider-chain disposition

| Stage / field | Low disposition | Local disposition | Authority and State outcome |
| --- | --- | --- | --- |
| Pre local semantic task | Retained; outside Post chain. | Retained. | Unchanged existing settlement. |
| Paid Scene generation | Retained; outside Post chain. | Retained. | Produces visible narration before Post. |
| VCON-013 selected Post | Replaced with one complete Low proposal. | Retained. | Existing core Post guards/Reducers remain writers. |
| `inventoryObservationRequired` | Retired as a Low-to-4B route edge. | Retained as current Local route field. | Never State authority. |
| Check target / direct-injury route | Retained as bounded Low input and output eligibility; retired as a Low-to-4B edge. | Retained as current Local route. | Existing Identity guard/Reducer remains writer. |
| `local_dynamic_turn_observer` | Removed from all automatic Low workflows. | Retained at most once after a routed Local Post. | No Low caller remains. |
| Standalone Inventory/Identity endpoints | Retained, but non-automatic in Low mode. | Retained. | No new State writer. |
| Item / Identity guards and Reducers | Retained. | Retained. | Existing sole writers remain unchanged. |
| `post_unsettled` retry/discard | Retained. | Retained. | Retry stays selected-provider-only; no automatic fallback. |

### 5.2 Item context rule

Every Item judgment, whether entered directly by Low Post or through the
retained Local Dynamic path, receives only formal Items that satisfy at least
one deterministic inclusion condition:

1. the Item is independently material in the current room/scene and is not
   merely following a holder;
2. the current player action directly identifies that formal Item; or
3. the current paid narration directly identifies that formal Item.

An Item with `holderId`, or a carried/equipped presentation reference, is
excluded solely because its holder is present. It enters only through direct
current-turn action/narration evidence. Stable player Item directives remain
direct action evidence; no semantic name guessing is introduced.

The selector is read-only. It cannot create an Item, alter owner/holder,
location, state, physical form, visibility, or Item authority.

### 5.3 Low output coverage

The Low VCON-013 schema/transport/settlement boundary will carry the existing
transient proposal families:

- core `materialEvents`, `actorUpdates`, `perception`, `temporalClaims`, and
  `playerMovement`;
- `itemUpdates[]`, validated by the existing Item pipeline;
- `identityObservations[]`, limited to the existing direct injury-observation
  contract and validated by the existing Identity pipeline.

No new State field, Item operation, Identity lifecycle field, or Reducer is
introduced.

## 6. Non-Goals

- Do not retire, weaken, or silently reroute the Local provider chain.
- Do not redesign Item ownership, custody, location, state, physical form,
  presentation, creation, candidate acceptance, or existing Reducer rules.
- Do not expand Identity beyond current direct visible-injury /
  no-visible-injury observation semantics.
- Do not change Pre, Scene generation, translation, Appraisal, Social,
  Calendar, Knowledge, Qdrant, retries, caching, prompt-cache controls, or
  Ollama residency.
- Do not add Regex/embedding/model fallback, automatic retry, repair call,
  second paid call, persistence migration, or a new UI field.
- Do not treat room presence, an actor name, an Item label substring, or a
  holder's presence as direct Item evidence.

## 7. Runtime Contract Impact

| Path | Current meaning | Target meaning / writer |
| --- | --- | --- |
| `postTurnSemanticProvider` | Selects primary Low or Local VCON-013 executor. | `low` selects the complete immediate Post semantic chain; `local` retains the current routed local chain. Settings/lifecycle writers stay unchanged. |
| `scene.itemStates[]` | Derived Scene snapshot whose holder-follow behavior can include carried/equipped Items. | Unchanged and explicitly not a Post Item selector. |
| `turnTransaction.itemUpdates[]` | Existing transient Item-operation carrier. | Low Post may populate it directly; existing validation/Item Reducer remains sole State writer. |
| `turnTransaction.identityObservations[]` | Existing transient direct-injury carrier. | Low Post may populate it directly; existing validation/Identity Reducer remains sole State writer. |
| `turn.status` / pending Post envelope | Existing selected-Post failure recovery. | Unchanged; any Low failure remains `post_unsettled`, with no fallback. |

The living state-field registry is current-runtime authority. It will be
updated atomically with implementation; this PRD does not predeclare
unimplemented runtime behavior as already live.

## 8. Prompt Field Budget

This change is prompt-affecting. Before any production Prompt change, the
implementation must capture a model-free active-save baseline through the
actual Low and Local Post builders, including System message, user payload,
strict transport Schema, wrapper fields, and output reserve.

| Field route | Current audience | Target audience | Admission / exclusion | Budget rule |
| --- | --- | --- | --- | --- |
| `vcon013.input.playerAction` | Low and Local Post | Unchanged | Protected raw action. | Protected; never truncate. |
| `vcon013.input.narrativeSegments` | Low and Local Post | Unchanged | Paid narration evidence. | Protected; existing atomic segment rule. |
| `dynamic.inventory.items[]` | Local 4B only; currently all formal Items | Local 4B only; selector subset | Independent current-scene Items or direct action/narration evidence only. | Remove excluded records before measurement; no byte slicing. |
| `vcon013.input.itemCandidates[]` | Absent today | Low Post only | Same provider-neutral selector. | New optional atomic records; measure against selected Low capacity and compact only by approved record rules. |
| `vcon013.input.identityTargetActorIds` | Existing Low/Local core target list | Low direct-injury eligibility | Existing structured Check target only. | Protected route IDs; no inferred targets. |
| `vcon013.result.itemUpdates[]` | Dynamic 4B only | Low Post directly; Local 4B unchanged | Existing strict Item proposal shape. | Transport Schema change is protected. |
| `vcon013.result.identityObservations[]` | Dynamic 4B only | Low Post directly; Local 4B unchanged | Existing strict direct-injury shape. | Transport Schema change is protected. |

The old full-Inventory projection must be removed from every Low Post path in
the same change. No target character limit is invented here; selected-provider
capacity remains the hard boundary.

### 8.1 Local Post Capacity Decision

The user approved raising the configured Local Post context from `4,096` to
`8,192` tokens. The active `qwen3:1.7b` model reports a real maximum context
of `40,960` tokens. `8,192` is the configured operating allocation, not a
claim that the application reserves the model maximum.

The Local response reserve remains `1,024` tokens. The active-save no-fit
measurement requires approximately `4,776` total tokens, so this allocation
fits the protected request with headroom while remaining below the verified
model capacity. Browser preflight and Node `num_ctx` must use the same
configured allocation.

## 9. Frontend Field Whitelist

None. This change preserves existing pending/retry/discard UI and adds no
frontend-readable State or session field. Existing model diagnostics remain
diagnostic-only and cannot become player-facing without a separate registry
update.

## 10. Acceptance Criteria

1. In every Low normal, Item-routed, Identity-routed, mixed, no-change, and
   Low-failure workflow, traces prove exactly one selected Low Post and zero
   `local_post_core_1_7b`, `local_dynamic_turn_observer`,
   `local_inventory_observer`, and `local_dynamic_identity_observer` calls.
2. In Local normal, routed, mixed, Local-main-failure, and Local-4B-failure
   workflows, existing call counts and failure outcomes remain unchanged,
   except that the Local Inventory input uses the approved Item selector.
3. Low `itemUpdates[]` and `identityObservations[]` reach existing transaction
   validation, existing guards, and existing sole Reducers; rejected
   proposals write no Item or Identity State.
4. The Item selector includes an independently room-material Item; excludes
   an unmentioned player-carried Item and an unmentioned Item held by an
   NPC in the room; includes each only when current player action or narration
   directly identifies it.
5. `scene.itemStates[]` is proven not to be a substitute selector, including
   a regression fixture where it contains a holder-followed carried/equipped
   Item.
6. Low provider/transport/Schema/guard failure produces existing
   `post_unsettled`, preserves paid narration, makes no Post-derived commit,
   and never invokes Local/4B fallback. Retry is exactly one Low Post call.
7. The model-field route registry has complete current/target rows for every
   changed field, and every affected builder/descriptor/parser/workflow has
   its route-ID reference.
8. The active-save Low and Local provider-visible request measurements fit the
   selected provider after the approved selector; System, Schema, action,
   narration, route IDs, and output Schema remain protected.
9. Each affected active task/mode passes the one-shot blind model simulation;
   a fresh independent acceptance Agent verifies the PRD criteria against
   actual provider/task traces and a safe real workflow.

## 11. Risks and Rollback

- A larger Low transport Schema can consume capacity. The real provider-visible
  baseline and structured record-level measurement are mandatory before it is
  sent.
- A direct-reference selector that guesses from prose would violate the user
  rule. It must use only existing stable directives or deterministic,
  unambiguous current-turn text evidence and otherwise exclude the Item.
- Removing Low-to-4B callers before Low carries both proposal families would
  lose valid Item/Identity updates. The schema/input/settlement change and
  caller retirement are atomic.
- Rollback restores the old Low route only as one coherent prior version. It
  must not retain the new Low Item/Identity schema while reintroducing the
  Dynamic 4B caller, and it must not rewrite committed State/chat history.

## 12. Approval

- Fixed PM discovery: PASS.
- Production-informed replacement review: PASS.
- User decisions:
  - Low replaces the full former `1.7B Post + optional 4B` chain.
  - Local retains its existing conditional 4B chain.
  - A holder-carried/equipped Item is excluded unless current action or
    narration directly identifies it.
  - Local Post uses an `8,192`-token configured operating context, verified
    against the active `qwen3:1.7b` model's `40,960`-token capacity.
- User implementation approval: `ok 开始执行` on 2026-08-22.
