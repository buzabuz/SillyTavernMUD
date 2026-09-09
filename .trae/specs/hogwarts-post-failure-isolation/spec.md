# Post Failure Isolation Technical Specification

## Status

Revision 1 was approved on 2026-09-08. Production implementation is in
progress.

## 1. Invariant

```text
usable final Post object
-> parse each independent proposal family
-> discard or normalize non-authoritative invalid data
-> strictly resolve explicit eligible movement
-> validate the assembled transaction
-> atomically persist accepted State
```

Normalization may remove authority but may never invent evidence or State.
Only absence of a usable root, uncertain eligible movement, revision conflict,
transaction failure, or persistence failure creates `post_unsettled`.

## 2. Current Failure Topology

```text
request assembly
-> selected provider
-> strict monolithic root parse
-> server family guards
-> client perception/temporal aggregate guard
-> movement guard
-> transaction integration
-> optional Appraisal
-> State/chat persistence
```

Current problems:

- one malformed family can fail the monolithic root parse;
- perception and temporal diagnostics are promoted to whole-Post failure;
- client perception validation uses a different Actor set than the request;
- movement normalizable cases and unsafe cases share one rejection result;
- broad catches collapse unrelated failures into `post_guard_failed` or
  `post_provider_failed`.

## 3. Root And Family Parsing

Keep the provider-facing strict transport Schema unchanged. At settlement:

1. Parse final content as one JSON object.
2. Require a supported root `schemaVersion`.
3. Read each known family independently.
4. For array families, validate records independently and retain only accepted
   records.
5. Missing, wrong-type, or wholly invalid independent families become their
   conservative empty value and a bounded rejection diagnostic.
6. Unknown root keys are ignored for settlement and recorded as bounded
   diagnostics; they never become State.

Family defaults:

| Family | Conservative value |
| --- | --- |
| `materialEvents` | `[]` |
| `actorUpdates` | `[]` |
| `inventoryObservationRequired` | `false` |
| `inventoryUpdates` | `[]` |
| `identityObservations` | `[]` |
| `perception` | `null` |
| `temporalClaims` | `[]` |
| `playerMovement` | `null`, then movement policy decides whether null blocks |

The parser returns accepted values plus bounded rejection records:

```js
{
    family,
    disposition,
    reasonCode,
    rejectedCount,
}
```

It must not retain raw invalid records or model text.

## 4. Family Settlement

### Material And Actor

Retain current language, confidence, evidence, Actor, room, and transition
guards. Invalid records are omitted. Valid sibling records continue.

### Item And Identity

Retain the existing Dynamic Inventory and Dynamic Identity guards and sole
Reducers. Schema-invalid records must be isolated before the existing semantic
guards so one malformed record cannot reject the root.

### Perception, Witness, And Event

Normalize `directParticipantActorIds` before perception validation:

- remove reserved `player` because persisted participant/witness State is
  NPC-only;
- deduplicate IDs;
- remove IDs outside the exact request-local Actor projection;
- retain valid NPC IDs in deterministic order.

Validate the remaining perception shape and evidence. If invalid, set
perception to `null` and do not create witness resolution or Event Knowledge.
A failed Check paired with `concealment=successful` also discards this family.
It does not veto other Post families.

### Temporal Claims

Validate each claim independently. Retain grounded, normalized claims for
diagnostics; discard invalid claims. They never write `clock` or Calendar
State. Remove aggregate temporal rejection from the whole-Post gate.

### Route Metadata

`inventoryObservationRequired` is transient and non-authoritative. A missing
or invalid value normalizes to `false`. Low never uses it to wake Dynamic 4B.

## 5. Movement Settlement

Replace one Boolean validation result with typed outcomes:

```text
accepted
normalized_no_movement
discarded_unsolicited
blocking_uncertain
```

Rules:

1. No movement preflight:
   - ignore any returned candidate;
   - commit no movement.
2. Preflight is deterministically `ineligible`:
   - commit a failed/no-movement outcome from preflight authority;
   - ignore destination/companion claims from Post.
3. Preflight is deterministically `already_there`:
   - commit `already_there`;
   - preserve position and `spatial.lastMovement`.
4. Eligible preflight plus `not_moved`:
   - require exact saved narration evidence;
   - clear destination and companion extras;
   - commit no movement.
5. Eligible preflight plus `moved`:
   - require exact saved narration evidence;
   - require exact preflight destination;
   - deduplicate companions and remove IDs outside
     `eligibleCompanionActorIds`;
   - for `follow_actor`, the approved guide must remain present;
   - commit through the Movement Reducer.
6. Eligible preflight with missing/invalid outcome, ungrounded evidence,
   destination mismatch, or missing required guide:
   - return `blocking_uncertain`;
   - preserve Scene as `post_unsettled`;
   - write no transaction-derived State.

## 6. Transaction And Persistence

After family settlement:

1. Build one transaction from the paid Scene plus accepted Post families.
2. Run existing transaction and domain validation.
3. Recheck timeline epoch, Scene, turn, and State revision before commit.
4. Apply existing sole Reducers to a cloned State.
5. Persist metadata and the committed Scene transaction.

Any failure in steps 2-5 remains blocking. A substantive revision change
cannot be treated as an Appraisal-only rejection because committing an older
clone could overwrite newer State.

Optional Appraisal behavior:

- request/provider/schema/proposal failure remains nonblocking and contributes
  no Appraisal;
- a stale guard caused only by allowed model-task runtime revisions remains
  acceptable under the existing revision helper;
- a substantive revision conflict remains a whole-Post blocking conflict.

Post-commit follow-up failures must not create a pending Post or roll back an
already committed turn.

## 7. Failure Codes And Diagnostics

Retain existing UI-compatible codes while narrowing their ownership:

| Code | Owner |
| --- | --- |
| `post_no_fit` | selected-provider capacity |
| `post_provider_failed` | provider/request/transport/empty final content |
| `post_schema_failed` | unusable JSON root or unsupported root version |
| `post_candidate_rejected` | blocking uncertain eligible movement |
| `post_guard_failed` | transaction, authoritative revision, Reducer, or persistence failure |

Family rejection is not a Post failure code. Record bounded family,
disposition, reason code, and count in turn diagnostics and optional
`settlementWarnings`. Do not store source prose, raw response, Prompt, or
reasoning.

## 8. Data Flow And Ownership

| Stage | Owner | Change |
| --- | --- | --- |
| Prompt and transport descriptor | VCON-013 | No change |
| Root/family parser | server Post settlement | Split root viability from family validity |
| Browser adoption | Post adapter | Remove aggregate perception/temporal failure |
| Movement guard | Movement domain | Add normalization/discard/block outcomes |
| Transaction validation | Turn domain | Remains final structural authority |
| Domain writes | Existing Reducers | Unchanged sole writers |
| Pending recovery | Turn workflow | Used only by blocking classes |
| Diagnostics | Turn diagnostics | Add bounded family disposition records |

Affected model routes:

- `vcon013.result.materialEvents`
- `vcon013.result.actorUpdates`
- `vcon013.result.inventoryObservationRequired`
- `vcon013.result.inventoryUpdates`
- `vcon013.result.identityObservations`
- `vcon013.result.perception`
- `vcon013.result.temporalClaims`
- `vcon013.result.playerMovement`

The missing route rows must be completed in
`model-field-routes.md`, and VCON-013 must be revised in both validation
responsibility registries before production implementation.

## 9. Verification Design

### Deterministic

- Root parse table: empty, non-JSON, array, wrong version, and usable object.
- Per-family malformed, missing, mixed-validity, and valid cases.
- Real `player` perception regression.
- Unknown/duplicate participant normalization.
- Invalid perception and temporal claims alongside a valid sibling proposal.
- Every approved movement normalization and blocking case.
- Transaction, revision, Reducer, and persistence failure safety.
- Main flow and explicit retry use identical settlement policy.
- Low and Local model-call budgets remain unchanged.

### Blind Model

Run one fresh context-free response for each affected Low and Local Post mode
using the unchanged production request and Schema. Feed untouched output
through the complete parser, guards, movement policy, transaction validation,
and no-retry boundary.

### Browser / Real Save

- Retry the current retained Scene once after implementation.
- Confirm the `player` participant is omitted and the Post commits.
- Confirm no raw error or new dynamic UI field appears.
- Exercise one blocking movement fixture and confirm the existing recovery
  card and composer lock remain.

### Independent Acceptance

A fresh read-only acceptance Agent receives the approved PRD, this Spec,
living contracts, registries, and original user goal. It verifies each
criterion without changing production code or tests.

## 10. Rollback

Restore the previous monolithic parse and universal guard-failure path as one
coherent version. Do not migrate or rewrite existing saves. Existing pending
records remain user-controlled through retry/discard.
