# Post Failure Isolation PRD

## 1. Change ID and Status

- Change ID: `hogwarts-post-failure-isolation`
- Status: implementation and independent acceptance passed; real-provider
  browser success blocked by external Cloudflare 524
- Change kind: fix
- Feature delta: 0
- Core change: yes
- Complexity: L3
- Scope level: complete Post settlement failure semantics

Related artifacts:

- [Technical spec](./spec.md)
- [Tasks](./tasks.md)
- [Checklist](./checklist.md)
- [Progress](./progress.md)
- [State fields](../hogwarts-runtime-contracts/state-fields.md)
- [Model field routes](../hogwarts-runtime-contracts/model-field-routes.md)

## 2. Problem and Evidence

The current Post path treats independent semantic proposal rejection as if the
entire turn were unsafe. Five public failure codes collapse six different
failure classes:

1. selected-provider capacity no-fit;
2. provider, request, transport, or empty-final-content failure;
3. monolithic root JSON/Schema rejection;
4. perception, temporal, concealment, or other deterministic guard rejection;
5. player-movement candidate rejection;
6. transaction, revision, Reducer, persistence, or uncategorized pre-commit
   failure.

The latest real save proves the problem. The request-local Actor projection
contained `player`, the provider returned it in
`perception.directParticipantActorIds`, and server validation accepted it.
Client validation then used NPC-only `state.actors` and `state.actorLibrary`,
rejected `player`, and converted the otherwise usable response into
`post_guard_failed`. The paid Scene remained visible and no Post State
committed.

Existing Material, Actor, Item, Identity, Dynamic observation, and translation
paths already demonstrate that an invalid independent proposal can be omitted
without making the whole turn unsafe. Post failure policy is therefore
internally inconsistent.

## 3. Before

| Workflow | Visible result | State and calls |
| --- | --- | --- |
| One invalid perception or temporal claim | Scene remains, recovery card blocks play. | No Post-derived State commits; one selected Post call is wasted. |
| Perception includes reserved `player` | Whole Post fails despite valid JSON and grounded evidence. | No State commit. |
| One malformed independent family | Strict root parse can reject the whole response. | No family settles. |
| No movement marker but model emits movement | Whole Post fails. | No State commit. |
| Eligible explicit movement has uncertain result | Whole Post fails. | Position and turn remain uncommitted. |
| Optional Dynamic/Appraisal model fails | Dynamic is omitted; Appraisal is omitted. | Core Post can continue unless a true revision conflict occurs. |

## 4. After

One usable Post response is settled family by family. Invalid independent
families write nothing while valid families continue through their existing
sole Reducers. Whole-Post pending is reserved for cases where continuing could
lose the paid Scene's authoritative consequences or corrupt State.

| Workflow | Visible result | State and calls |
| --- | --- | --- |
| Perception includes `player`, duplicate, or unknown participant IDs | Scene settles normally. | Those IDs are removed from NPC participant/witness output; other valid families commit. |
| Perception is otherwise malformed or ungrounded | Scene settles normally without a new perception/Event record. | No perception/witness/Event write. |
| One or more temporal claims are invalid | Scene settles with bounded diagnostics. | Invalid claims are omitted; clock and Calendar remain untouched by claims. |
| One Material, Actor, Item, or Identity record is invalid | Scene settles. | Only valid records reach existing Reducers. |
| No movement marker but model emits movement | Candidate is discarded and the turn settles without movement. | Position remains unchanged. |
| Deterministically ineligible or already-there marker | A deterministic no-movement outcome settles. | Position remains unchanged. |
| Eligible movement has grounded, preflight-consistent result | Scene settles. | Movement Reducer atomically writes the approved outcome. |
| Eligible movement is missing, ungrounded, or contradicts preflight destination | Existing pending card remains. | No Post-derived transaction commits. |
| No usable final response or atomic commit fails | Existing pending card remains. | No automatic retry/fallback and no partial State write. |

## 5. In Scope

- Inventory every selected Post failure boundary and give it one typed
  disposition: `block`, `discard_record`, `discard_family`, or `normalize`.
- Replace monolithic adoption with a root-envelope gate followed by
  family-local parsing and diagnostics.
- Keep `schemaVersion` and a parseable object as root requirements.
- Make Material, Actor, Inventory, and Identity rejection consistently
  record-local.
- Make perception/Event and temporal claims independently discardable.
- Remove `player`, duplicate IDs, and unknown IDs from NPC-only perception
  participant output without rejecting the whole Post.
- Normalize non-authoritative route metadata conservatively.
- Apply the approved movement matrix:
  - no marker plus candidate: discard;
  - duplicate/unknown companions: remove;
  - no-move result plus destination/companions: clear extras;
  - ineligible/already-there preflight: deterministic no movement;
  - eligible movement with missing result, ungrounded evidence, destination
    mismatch, or missing required follow guide: block.
- Preserve whole-Post blocking for no-fit, provider/transport/empty-content
  failure, unusable root envelope, uncertain eligible movement, authoritative
  transaction/revision failure, and persistence failure.
- Separate bounded diagnostics so a local proposal rejection is not mislabeled
  as provider failure.

## 6. Non-Goals

- No additional model request, automatic retry, repair, provider fallback,
  Local fallback, Regex fallback, or reasoning fallback.
- No Prompt instruction or provider selection change.
- No new State writer and no weakening of existing domain Reducers.
- No migration or repair of historical committed saves.
- No change to paid Scene generation, Pre, translation, Calendar, Social,
  Knowledge, background Event, or Appraisal semantics.
- No raw provider/model error in player-facing UI.

## 7. Runtime Contract Impact

No new persistent State field is introduced.

| Path | Target contract |
| --- | --- |
| `turn.status` | `post_unsettled` only for blocking failures; independent proposal rejection settles normally. |
| `extra.hogwartsMud.pendingPostSettlement` | Written only for blocking failures and retains existing retry/discard semantics. |
| `extra.hogwartsMud.turnTransaction` | Contains only accepted or normalized Post families and commits atomically. |
| `eventKnowledge[]` and witness fields | NPC-only; reserved `player`, duplicate, and unknown participant IDs never persist. |
| `settlementWarnings[]` / turn diagnostics | Bounded reason codes and counts only; no raw model response or private prose. |

No migration is required. Existing pending records keep their current explicit
retry/discard behavior.

## 8. Migration and Compatibility

- Existing committed turns and archived Scenes are immutable.
- Existing `post_unsettled` records are not automatically replayed or
  reinterpreted.
- A user may explicitly retry an existing pending Post after implementation;
  the saved response is not reused.
- No dual writer or compatibility fallback is introduced.
- Rollback restores the former universal selected-Post failure policy without
  rewriting saves.

## 9. Prompt Field Budget

No Prompt field, System instruction, input projection, transport JSON Schema,
provider wrapper, or response reserve changes.

The implementation changes only response parsing, normalization, validation,
diagnostics, and settlement control flow. Existing selected-provider capacity
and compaction behavior remain authoritative. Normal and worst-case model-call
counts remain unchanged:

| Workflow | Calls |
| --- | --- |
| Low Post | Exactly 1 selected Low request; 0 Local/Dynamic calls |
| Local Post, unrouted | 1 Local core Post |
| Local Post, routed | 1 Local core Post plus at most 1 serial shared Dynamic 4B |
| Explicit retry | Exactly 1 additional selected Post request |
| Discard | 0 |

## 10. Frontend Field Whitelist

No new frontend field or dynamic text is introduced. The existing
`post_unsettled` card remains visible only for the reduced blocking set.
Ordinary family rejection has no recovery card and uses existing committed
Scene rendering.

## 11. Failure Classification

| Failure | Disposition |
| --- | --- |
| Selected request cannot fit | Block |
| Provider/profile/request/transport failure | Block |
| Empty final content or non-JSON root | Block |
| Wrong root type or unsupported `schemaVersion` | Block |
| Malformed Material/Actor/Item/Identity record | Discard record |
| Missing or malformed independent family | Discard family / use empty |
| Invalid `inventoryObservationRequired` | Normalize to `false` |
| Invalid perception/evidence/concealment | Discard perception/Event family |
| `player`, duplicate, or unknown perception participant | Remove ID |
| Invalid temporal claim | Discard claim |
| Unsolicited movement without marker | Discard movement |
| Ineligible/already-there movement preflight | Deterministic no movement |
| Eligible explicit movement cannot be safely resolved | Block |
| Dynamic auxiliary or Appraisal proposal failure | Discard optional proposals |
| Substantive State revision changed before commit | Block |
| Transaction/Reducer/persistence cannot commit atomically | Block |
| Post-commit Calendar/Social/Knowledge/UI follow-up fails | Do not relabel the committed turn as Post failure |

## 12. Acceptance Criteria

1. The real `player` incident settles without a pending card; `player` is
   absent from persisted NPC participant/witness fields.
2. Every independent family has tests proving one invalid record/family writes
   nothing while valid sibling families and the base turn commit.
3. A parseable root with one malformed independent family does not become
   `post_schema_failed`.
4. Empty/non-JSON/root-version-invalid responses still preserve the paid Scene
   as `post_unsettled`.
5. Every approved movement case produces the specified commit or blocking
   result; uncertain eligible movement never changes position, clock,
   companions, held Item locations, or `spatial.lastMovement`.
6. A substantive revision conflict and persistence failure remain blocking and
   cannot overwrite newer State.
7. No accepted Post path issues an additional request, repair, or fallback.
8. Existing pending retry makes exactly one selected Post request; discard
   makes none.
9. Diagnostics identify the failing family and disposition without raw Prompt,
   response, reasoning, or player prose.
10. A real-save browser workflow reaches normal play after a discardable
    family rejection and still shows recovery for a blocking failure.

## 13. Risks and Rollback

- Partial parsing must never let an unvalidated record reach a Reducer.
- Normalization must only remove authority; it cannot invent evidence,
  destinations, participants, or State.
- Movement remains stricter because location, time, companions, Presence, and
  held Items depend on its outcome.
- Persistence must remain atomic; partial in-memory reduction is not success.
- Rollback restores the old all-or-nothing Post guard behavior without save
  migration.

## 14. Approval

- Initial PM discovery: PASS.
- User approved the failure-isolation principle and movement matrix on
  2026-09-08.
- Production-informed replacement PM review: PASS.
- Artifact revision: 1, explicitly approved for implementation on
  2026-09-08.
