# Hogwarts Model Field-Route Registry

## Status and Scope

This is the readable route authority for fields that cross a Hogwarts model
task, Prompt projection, output Schema, model router, validator carrier, or
Reducer boundary.

- `state-fields.md` remains authoritative for persisted State meaning and
  writers.
- This registry records model-facing source, audience, admission, route edges,
  consumers, validation, and no-change/failure behavior.
- A field is not interchangeable with a same-named or related field unless
  this document explicitly says so.
- This initial revision backfills the current Immediate Post Item/Identity
  chain. It is not a claim that every model task in the repository is already
  registered. Any new or changed route must add its rows before implementation.

## Reading a Route

| Column | Meaning |
| --- | --- |
| `ID` | Stable route identifier used by code/module headers, PRDs, Specs, tests, and reviews. |
| `Source` | Canonical State/message/derived/model source. |
| `Admission` | Deterministic condition for including the field. |
| `Audience` | Exact task/provider/model boundary that sees it. |
| `Edge / consumers` | Immediate readers and every later model task it can wake. |
| `Validation / writer` | Parser/guard and the only State writer, or explicit no-State result. |

## Current Immediate Post Routes

| ID | Field / source | Meaning and admission | Audience | Edge / consumers | Validation / writer / failure | Focused owner |
| --- | --- | --- | --- | --- | --- | --- |
| `vcon013.input.playerAction` | Current player message text. | Raw action context, not proof that an Item operation succeeded. Always included; max 8,000 only on the Dynamic Inventory contract. | Selected Low or Local VCON-013; retained Local Dynamic Inventory. | Low/Local Post; Dynamic Item evidence source. Does not wake a task itself. | Protected Prompt input. Item evidence guard checks exact source substring. No writer. | Post provider and Inventory contract suites. |
| `vcon013.input.narrativeSegments` | Paid `transaction.segments[].textEn`. | Already-written narration evidence; not a State proposal or route decision. Current segments are included atomically. | Selected Low or Local VCON-013; Local shared Dynamic Turn. | Post evidence; Dynamic Item/Identity evidence. Does not wake a task itself. | Protected Prompt input. Item/Identity evidence guards require exact source substring. No writer. | Post, Dynamic Inventory, Dynamic Identity suites. |
| `vcon013.input.targetActorIds` | Addressing IDs plus `checkResolution.target.actorId`. | Bounded known Actor context for core Post; it is not proof of injury. Empty when no known target. | Selected Low or Local VCON-013. | Core Post; current Check target also participates in Dynamic Identity routing. | Existing Actor/target guards. No writer. | Post contract and Identity route suites. |
| `vcon013.input.itemCandidates` | Canonical `state.items[]` through `selectPostItemContext()`. | Provider-neutral deterministic subset: independent room-material `whole/remains` Items, or holder-followed Items directly identified by action/narration or exact directive. It is Item context, never Item evidence or State. | Low VCON-013 only. | Low may reference only supplied stable IDs in `inventoryUpdates[]`; it wakes no model task. | Low strict transport + Dynamic Inventory input Zod/guard/projector; Item Reducer only. Invalid proposals write no Item. | Post Item context and provider suites. |
| `vcon013.input.identityTargetActorIds` | Valid current `checkResolution.target.actorId`, constrained to supplied Actors. | Direct-injury eligibility for Low only, not evidence that an Actor is injured. `inspectionTargetActorIds` is the narrower no-visible-injury set. | Low VCON-013 only. | Low may emit bounded `identityObservations[]`; it wakes no model task. | Low strict transport + Dynamic Identity target/narration/inspection guards; Identity Reducer only. | Post provider and Dynamic Identity suites. |
| `vcon013.input.inspectionTargetActorIds` | Current perception Check target intersected with `identityTargetActorIds`. | Eligibility for a Low `no_visible_injury` proposal only; it is not proof of an examination or health. | Low VCON-013 only. | Constrains Low Identity output; it wakes no model task. | Dynamic Identity inspection guard; Identity Reducer only. | Post provider and Dynamic Identity suites. |
| `vcon013.result.inventoryObservationRequired` | Boolean in the strict Local core VCON-013 result; Low always returns `false`. | Local-only route request: true means completed action/narration may establish an Item operation or durable candidate. It is not an Item proposal and never writes State. | Local VCON-013. | Only Local `true` wakes `local_dynamic_turn_observer` with its Inventory section. Low never consumes it. | Local post transport/Zod parse. Dynamic failure omits auxiliary proposals; no writer. | Post provider and Dynamic Turn suites. |
| `dynamic.requestedTasks` | Derived from `inventoryObservationRequired` and valid Check target. | Names exactly `inventory` and/or `identity` sections requested for one completed turn. It is not model evidence or State. | Shared Local `local_dynamic_turn_observer` System/User request. | Determines whether one shared 4B request starts. Empty means zero model calls. | Dynamic request builder; no writer. Failure omits requested auxiliary proposals. | Dynamic Turn observer suite. |
| `dynamic.inventory.items` | `selectPostItemContext()` over canonical `state.items[]`. | Same provider-neutral selected subset as `vcon013.input.itemCandidates`; it is context only, not evidence. | Local shared Dynamic Inventory section only. | Lets Local 4B reuse stable Item IDs in `inventoryUpdates[]`. It does not wake the Dynamic task; Local `inventoryObservationRequired` does. | Input Zod validates shape/unique IDs. Item evidence/transition guard and Item Reducer remain authority. Failure writes no Item. | Dynamic Inventory and Post Item context suites. |
| `dynamic.identityTargetActorIds` | Valid `checkResolution.target.actorId`, constrained to supplied Actors. | Direct-injury observation route eligibility, not evidence that the Actor is injured. `inspectionTargetActorIds` is the narrower no-visible-injury eligibility set. | Current Local shared Dynamic Identity section. | Valid nonempty target starts the shared 4B Identity section. | Input Zod target membership; narration/segment/confidence/inspection guards; Identity Reducer only. Failure writes no Identity. | Dynamic Identity suite. |
| `dynamic.result.inventoryUpdates` | Dynamic 4B result using `INVENTORY_OBSERVATION_RESULT_DESCRIPTOR`. | Candidate Item operations only. Each requires stable ID/evidence item text/evidence source/confidence; not accepted State. | Local Dynamic result -> client adapter. | Projected into `turnTransaction.itemUpdates[]`; no model task wake. | Descriptor/Zod, evidence, English, ID, custody, transition and Item guards; Item Reducer sole writer. Invalid candidates are omitted. | Dynamic Inventory and Item reducer suites. |
| `dynamic.result.identityObservations` | Dynamic 4B result using `DYNAMIC_IDENTITY_RESULT_DESCRIPTOR`. | Candidate direct visible-injury or deliberate no-visible-injury observation. Not broad Identity extraction and not accepted State. | Local Dynamic result -> client adapter. | Normalized into `turnTransaction.identityObservations[]`; no model task wake. | Descriptor/Zod, route Actor, narration segment, inspection and confidence guards; Identity Reducer sole writer. Invalid candidates are omitted. | Dynamic Identity and Identity reducer suites. |
| `vcon013.result.inventoryUpdates` | Low strict result using `INVENTORY_OBSERVATION_RESULT_DESCRIPTOR`-compatible records. | Candidate Item operations grounded in current action/narration. It is not accepted State. | Low settlement endpoint -> client adapter. | Projected into `turnTransaction.itemUpdates[]`; it never wakes Dynamic 4B. | Dynamic Inventory result Zod, evidence/language guard, projector, Item validation and Item Reducer. Invalid candidates are omitted. | Post provider and Dynamic Inventory suites. |
| `vcon013.result.identityObservations` | Low strict result using `DYNAMIC_IDENTITY_RESULT_DESCRIPTOR`-compatible records. | Candidate direct visible-injury or deliberate no-visible-injury observation. It is not broad Identity extraction or accepted State. | Low settlement endpoint -> client adapter. | Normalized into `turnTransaction.identityObservations[]`; it never wakes Dynamic 4B. | Dynamic Identity result Zod, route Actor/narration/inspection/confidence guard, Identity Reducer. Invalid candidates are omitted. | Post provider and Dynamic Identity suites. |
| `turnTransaction.itemUpdates` | Existing transient turn carrier after Item proposal projection. | Validated Item operations awaiting turn settlement. It is not `state.items[]`. | Turn validation/reducer only. | Existing Item partition/validation. Does not wake a model. | `validateItemUpdates` plus Item authority; Item Reducer only. Invalid entries write nothing. | Turn validation and Item reducer suites. |
| `turnTransaction.identityObservations` | Existing transient turn carrier after Identity normalizer. | Validated direct injury observations awaiting settlement. It is not full Actor Identity State. | Turn validation/reducer only. | Existing Identity validation. Does not wake a model. | `normalizeNpcIdentityObservation` and Identity guards; Identity Reducer only. Invalid entries write nothing. | Turn validation and Identity reducer suites. |
| `scene.itemStates` | Derived snapshot from `state.items[]`; State meaning is in `state-fields.md`. | Scene/archive snapshot of formal Item state. Current projector follows player `carried/equipped` Items to the current map/room. | Scene/Archive consumers; may be used by their documented prompt projections. | It is not a current Post/Dynamic Item input and wakes no Post task. | Derived only; no writer. It must not be substituted for `dynamic.inventory.items`. | Inventory projection suite. |

## Non-Substitutability Rule

These three fields describe related Items but serve different audiences:

| Field | Source / selector | May substitute for another? |
| --- | --- | --- |
| `scene.itemStates` | Scene snapshot; player carried/equipped Item follows into current room. | No. It is unsafe as Post context because it includes holder-followed Items. |
| `dynamic.inventory.items` | Provider-neutral selected formal Item context used by Local Dynamic only. | No. Its audience is Local Dynamic; Low receives `vcon013.input.itemCandidates` directly. |
| `vcon013.input.itemCandidates` | Provider-neutral selected formal Item context used by Low. | No. Its audience is Low VCON-013; it cannot be replaced by the Scene snapshot or full State Inventory. |

## Maintenance Checklist

For every changed route:

1. add or update its row here and its `state-fields.md` link when persisted;
2. add the route ID to the affected module header;
3. list source, selector, Schema, route edge, consumers, guard, writer, and
   failure behavior in the PRD/Spec;
4. add direct focused tests for important inclusion/exclusion and any model-call
   edge;
5. delete obsolete rows only after their caller, Schema path, and tests are
   retired in the same approved change.
