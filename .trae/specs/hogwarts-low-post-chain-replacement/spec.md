# Low Post Chain Replacement Technical Specification

## Status

Implementation in progress. This design implements the approved product
boundary in [prd.md](./prd.md); the user approved this revision on 2026-08-22.

## 1. Semantic Invariants

1. `postTurnSemanticProvider=low` means one Low request owns the complete
   immediate Post semantic proposal. It does not mean "Low core followed by a
   local enrichment request."
2. `postTurnSemanticProvider=local` retains its current Local core plus
   conditional shared Dynamic 4B chain.
3. Item context selection is evidence admission, never Item State mutation.
   A formal Item is eligible only when independently room-material or directly
   identified by current action/narration.
4. Holder presence does not make a held/carried/equipped Item eligible.
5. Low and Local proposals use existing Item/Identity validation and sole
   reducers. Neither provider receives direct State authority.
6. A selected-provider failure is one failed request. It produces existing
   `post_unsettled`; it cannot start another provider or Dynamic task.

## 2. Current and Target Data Flow

### Current Low flow

```text
State + action + paid narration
-> VCON-013 Low Post
-> inventoryObservationRequired / Check target route
-> local_dynamic_turn_observer (4B, optional)
-> project Item / Identity proposals
-> transaction validation
-> Item and Identity Reducers
```

### Target Low flow

```text
State + action + paid narration + selected Item context + Check target
-> VCON-013 Low Post
-> normalize Low Item / Identity proposal carriers
-> existing transaction validation
-> existing Item and Identity Reducers
```

### Target Local flow

```text
State + action + paid narration
-> VCON-013 Local 1.7B Post
-> current conditional shared 4B Dynamic request
   using selected Item context
-> existing transaction validation
-> existing Item and Identity Reducers
```

## 3. Field Route Matrix

The durable rows are in
[model-field-routes.md](../hogwarts-runtime-contracts/model-field-routes.md).
This change updates the following routes.

| Route ID | Current source/audience | Target source/audience | Target consumer / writer |
| --- | --- | --- | --- |
| `vcon013.input.narrativeSegments` | Paid narration to selected Post; shared again with Dynamic 4B. | Paid narration to selected Post; Local only may share it with 4B. | Evidence for Post, Item, and direct injury proposals; no writer. |
| `vcon013.input.itemCandidates` | Absent. | Deterministic selected formal-Item subset to Low only. | Low output may reference supplied stable IDs; Item guard/Reducer remains writer. |
| `vcon013.result.inventoryObservationRequired` | Low/Local Boolean route to Dynamic 4B. | Local-only Boolean route; Low output no longer uses it to wake a task. | No State writer. |
| `dynamic.inventory.items` | All `state.items[]` through Dynamic context. | Same deterministic selected subset, Local Dynamic only. | 4B may reference supplied stable IDs; Item guard/Reducer remains writer. |
| `vcon013.result.inventoryUpdates` | Absent. | Low direct Item candidate output, same descriptor meaning as current Dynamic result. | Existing projection to `turnTransaction.itemUpdates[]`, validation, Item Reducer. |
| `vcon013.result.identityObservations` | Absent. | Low direct injury candidate output, same descriptor meaning as current Dynamic result. | Existing Identity normalization/validation and Identity Reducer. |
| `dynamic.identityTargetActorIds` | Check target routes Dynamic 4B. | Local-only Dynamic route; Low keeps it as bounded direct-observation eligibility. | Existing Identity guard/Reducer. |
| `turnTransaction.itemUpdates[]` | Existing transient carrier. | Unchanged carrier; Low and Local normalize into it. | Existing Item Reducer only. |
| `turnTransaction.identityObservations[]` | Existing transient carrier. | Unchanged carrier; Low and Local normalize into it. | Existing Identity Reducer only. |
| `scene.itemStates[]` | Scene/archive-derived snapshot. | Unchanged; explicitly never used as selected Post Item context. | Not a Post selector or Item writer. |

## 4. Deterministic Item Context Selection

Introduce one provider-neutral selector before either Item-judgment entry
point. Its input is canonical `state.items[]`, current player action, paid
narrative segments, current map/room, and existing stable player Item
directives.

The selector returns normalized context records only. Each retained record
keeps the current Dynamic Inventory context shape:

```text
id, labelEn, label, appearanceEn, type,
ownerId, holderId, state, isEquipped
```

It also produces bounded diagnostic counters by admission reason. Diagnostics
contain IDs/counts only, never full narration or Prompt text.

### Admission order

1. Normalize the formal Item from canonical State. Exclude Item records not
   physically present (`physicalForm` other than `whole`/`remains`) or not
   visible to the current selection policy.
2. Retain an independently room-material Item when it has no holder-follow
   relationship and its authoritative location matches the current map/room.
3. Retain a holder-followed Item only when an existing stable player Item
   directive selects its exact ID, or current action/narration contains an
   unambiguous direct reference to the formal Item's canonical display label.
4. Direct textual reference is deterministic: normalize Unicode/case/spacing;
   match only a full canonical label token; if multiple formal Items share that
   normalized label, retain none by text and require an exact directive. Do not
   match owner/holder names, type names, pronouns, generic object classes,
   appearance prose, embeddings, or model inference.
5. Deduplicate by stable Item ID and preserve deterministic State order.

This deliberately conserves false negatives over accidental Item injection.
An unrecognised phrase does not become an Item candidate merely because it
sounds Item-like.

`scene.itemStates[]` is prohibited as selector input because its current
projection follows player `carried/equipped` custody into the room.

## 5. Low Post Contract Extension

The shared executable VCON-013 descriptor will gain two optional proposal
families in the strict transport Schema and matching server Zod Schema:

```text
inventoryUpdates[]      // Dynamic Inventory descriptor-compatible candidates
identityObservations[]  // Dynamic Identity descriptor-compatible candidates
```

The System contract will say:

- `itemCandidates` is context, never evidence;
- an existing Item proposal uses only a supplied ID;
- evidence must be an exact current action/narration substring;
- return an empty array for no grounded Item change;
- direct injury observations use only supplied Check-target Actor IDs and
  narration evidence;
- no-visible-injury is legal only for supplied inspection targets.

The Low settlement endpoint will parse these arrays with the same reusable
descriptor/normalizer boundaries as Dynamic Inventory and Dynamic Identity.
It must produce the existing transaction carriers:

```text
raw Low inventoryUpdates
-> existing Inventory guard/projector
-> turnTransaction.itemUpdates

raw Low identityObservations
-> existing Identity guard/normalizer
-> turnTransaction.identityObservations
```

The design does not duplicate Item or Identity guards inside the Low adapter.

## 6. Chain Retirement

The `requestPostTurnSemanticObservation()` workflow branches by normalized
provider after the selected Post response is accepted:

- `low`: normalize Low Item/Identity proposal families and return. It must not
  call `requestDynamicTurnObservation`, its standalone alternatives, or any
  local semantic task.
- `local`: retain the existing `inventoryObservationRequired` and Check-target
  routing into exactly one shared Dynamic request. Pass selected Item context
  rather than the full Inventory.

`settlementOnly` retry remains an existing Post-only recovery operation. Low
retry receives the same Low contract; it never starts Dynamic 4B.

Delete obsolete Low-to-Dynamic route callers, traces, and tests in the same
change. Retain standalone Dynamic endpoints only for their remaining Local or
non-automatic callers.

### Local Capacity Alignment

The active Local model reports `40,960` tokens. Its configured Post operating
context is `8,192` tokens with a `1,024`-token response reserve. The browser
Post preflight, Node default, Node fixed Post request, and `config.yaml`
setting use that same value. This is a capacity alignment only: no protected
Prompt field, compaction priority, model call count, or failure policy changes.

## 7. Validation and Settlement

| Proposal family | Schema/parser | Deterministic guard | Sole State writer | Rejection outcome |
| --- | --- | --- | --- | --- |
| Core Post | Existing VCON-013 strict descriptor / Zod | Existing temporal, perception, actor, material, movement guards | Existing owning reducers | Selected-Post guard failure -> `post_unsettled`. |
| Low Item | Dynamic Inventory-compatible strict descriptor | Existing evidence, ID, language, custody, transition, Item checks | Item Reducer | Invalid candidate omitted; no Item write. |
| Low direct injury | Dynamic Identity-compatible strict descriptor | Existing target, narration, inspection, confidence, Identity checks | Identity Reducer | Invalid observation omitted; no Identity write. |
| Local Dynamic Item/Identity | Existing descriptor/guards | Existing guards | Existing reducers | Dynamic failure omits only auxiliary proposals; valid Local core may settle. |

## 8. Failure and Call Policy

| Mode / outcome | Calls | State result |
| --- | --- | --- |
| Low success | Exactly one selected Low Post. | Accepted core/Item/Identity proposals may settle once. |
| Low no change | Exactly one selected Low Post. | No Item/Identity write. |
| Low transport/Schema/guard failure | Exactly one selected Low Post; zero local/4B calls. | Existing paid narration plus `post_unsettled`; no Post-derived write. |
| Low manual retry | Exactly one Low Post. | Existing retry success/failure contract. |
| Local success, no route | One Local Post. | Existing core settlement. |
| Local success, one/both routes | One Local Post plus exactly one shared 4B request. | Existing independent auxiliary acceptance. |
| Local Dynamic failure | One Local Post plus one failed shared 4B request. | Core may settle; Item/Identity proposals omitted. |

No new retry, repair, provider fallback, or model-generated fallback is
introduced.

## 9. Runtime Contract and Documentation Update

At implementation time:

1. update `state-fields.md` to define `postTurnSemanticProvider=low` as the
   full semantic-chain selection and cross-link the field routes;
2. update `model-field-routes.md` from current baseline to implemented target;
3. update VCON-013, VCON-014, and VCON-020 JSON/Markdown registry rows;
4. add route-ID module-header references to the affected Prompt builder,
   transport descriptor, adapter, selector, and settlement workflow;
5. remove all obsolete Low-to-Dynamic references rather than marking them
   disabled.

No State migration is needed because the existing State carriers and reducers
remain the contract. Historical transactions remain immutable.

## 10. Verification Design

Focused tests must cover:

1. Low normal, Item, Identity, mixed, no-change, failure, and retry call
   traces; every Low route proves zero Dynamic calls.
2. Local equivalent workflows; Local routed calls remain one shared Dynamic
   call.
3. Selector cases: independent room Item included; unmentioned player
   carried/equipped Item excluded; unmentioned NPC-held Item excluded; direct
   action/direct narration/directive inclusion; duplicate label ambiguity
   exclusion; `scene.itemStates` holder-follow fixture.
4. Low Item/Identity valid proposal reaches existing transaction/reducer;
   invalid source/ID/evidence/target/transition proposal writes nothing.
5. Strict Low transport and Zod contract parity.
6. Real active-save build-only Low/Local measurements before/after selector and
   schema changes.
7. One-shot blind request simulations for Low Post and retained Local/Dynamic
   routes, with no repair/fallback request.
8. Fresh independent acceptance using actual task/provider traces and a safe
   rendered completed turn.
