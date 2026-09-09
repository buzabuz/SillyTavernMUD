# Narrative-First Post Settlement Specification

Revision 1 approved on 2026-09-09. Implementation in progress; no cutover claimed.
Authority: [PRD](./prd.md). Execution: [Tasks](./tasks.md), [Checklist](./checklist.md),
[Progress](./progress.md), [Baseline](./evidence/baseline.md).

## 1. Invariants

```text
final Scene content
-> parse object
-> extract immutable displayable segments and message-local speaker labels
-> persist narrative + recovery envelope, acknowledge persistence
-> project authorized evidence and one initial unified Post request
-> per-record guards + dependency groups
-> all acceptable? commit once : await explicit recovery choice
-> defaults OR one selected, combined supplementary Post
-> validated accepted records + safe defaults
-> atomic world/transaction commit OR prose-retaining blocking status
```

Never make raw saved prose, `schemaVersion`, an excerpt or model-supplied confidence
equivalent to verified State. Preserve text before rejecting authority. New actors
must not acquire knowledge simply because Scene emitted a familiar name or ID.

## 2. Production Map and Replacement

| Current production owner | Current issue | Proposed responsibility |
| --- | --- | --- |
| `workflows/turn-performance.js` | Scene prompt and aggregate raw/final validators combine prose and bookkeeping | Prose + minimal speaker prompt; preservation extraction only; no State proposal adoption |
| `domain/model-language-adoption.js` | Language partition controls authority | Keep language evidence classification; display retention not contingent on English adoption |
| `domain/turn-protocol.js` | Fold/reconcile Scene proposals; synthesize `publicEventEn` and guessed progression | Retire active Scene fold path; reuse appropriate normalization on validated Post data; excerpt display-only |
| `domain/turn-validation.js` | Required progression, speaker and proposal validation can reject paid reply | Post/transaction authority checks; never delete preserved prose |
| `domain/post-turn-semantic-contract.js` | Current shared Post prompt and strict descriptors | Single source for unified, provider-aware partitioned Post contract |
| `src/hogwarts-mud/post-turn-transport-contract.js` | Server Zod mirror | Matching root/version and family record schemas; descriptor parity tests |
| `src/hogwarts-mud/post-turn-result-settlement.js` | Independent family parsing | New families, structured slot rejection, accepted records and dependency status |
| `src/hogwarts-mud/local-semantic-adjudicator.js` | Local invocation, language and auxiliary guard adoption | Initial and supplement modes; same final-content-only boundary |
| `adapters/local-semantic.js` | Input projection/provider selection/Post integration | Build one source, preserve provider exclusivity, no supplement Dynamic route |
| `workflows/turn.js` | Save prose too late; separate main/retry integrations; unconditional pacing consumption | Save first, recover one draft, use common merge/commit procedure, gated Pacing consumption |
| `domain/pending-post-settlement.js` | Pending V1 envelope and identity guards | Versioned recovery; one-shot reservation, failure groups and accepted bundle |
| `runtime/guarded-save-ports.js` | Guarded timeline commit | Reuse atomic State/chat save; no replacement storage engine |
| `ui/message-renderer.js` and localization projectors | Actor lookup assumes admitted identity | Message-local unresolved speaker display without Actor creation |
| `ui/story-renderer.js`, workflow/UI wiring | Retry whole Post or discard | Failed group checkboxes, one supplement and defaults action |

Existing pending-version comparisons reject unknown versions. New-version guards
must be maintained in the existing recovery owner, not in a parallel reader.

## 3. Field Routes

These are proposed routes, not declarations that runtime already uses them.
Register them with these IDs before implementing the corresponding boundary.

| Route ID | Type / source / selector | Readers and route edges | Writer / failure |
| --- | --- | --- | --- |
| `vcon007.result.segments` | Scene JSON `segments[]`; each recoverable nonempty string preserved in order | Message renderer, localization, explicit current recovery evidence | Message writer only until authority adoption; no typed auxiliary failure removes text |
| `vcon007.result.speakers` | Optional `speakers[{id,displayNameEn}]`; message-local declarations for new dialogue references | Message-scoped label and Post promotion context; no direct task wake | Message metadata only; invalid/collision -> static unresolved display |
| `vcon013.input.narrativeSegments` | Frozen saved segments + stable index/hash; one copy | Initial/supplement Post evidence; existing Dynamic when eligible | No State writer; changed hash rejects stale result |
| `vcon013.input.sceneAuthority` | Current required Actor/room references, Check, movement preflight, exact pending Pacing beat | Post guards and selected schema | Protected context; no model may replace deterministic authority |
| `vcon013.input.speakerDeclarations` | Preserved message-local declarations | Post temporary-Actor promotion only | No formal identity or ACL grant |
| `vcon013.input.historicalSupport` | Same-speaker, bounded authorized Event references used by the Scene request | Post historical-claim annotations | No cross-actor private evidence pooling; unavailable support -> unverified/no-write |
| `vcon013.result.actorUpdates` | Unified existing activity/presence/location record | Existing Actor/Presence guard; no task wake | Sole existing reducers; failed record isolated |
| `vcon013.result.inventoryUpdates` | Unified existing Item operations and candidates | Existing Inventory partition/guards; no task wake in Low/supplement | Existing Item reducer/queue, never two writes for Scene/Post equivalents |
| `vcon013.result.temporaryActors` | Bounded existing ActorCreationProposal shape with source speaker reference/evidence | Promotion guard then dependent Actor/Item/perception records | Existing Actor admission; invalid group no-write |
| `vcon013.result.firstImpressions` | Existing first-meeting hint semantics with actor/source refs | Existing first-impression adoption path only | No new relationship metrics/current impressions; invalid -> omit |
| `vcon013.result.sceneProgression` | Optional type/English summary + exact segment evidence | Timeline/public-event projection only after validation | Invalid -> no semantic progression; no guessed type |
| `vcon013.result.pacingRealization` | Exact pending beat ID, realized Boolean, segment evidence | Existing pending-beat consumer | Consume only accepted true at commit; otherwise unchanged |
| `vcon013.result.historicalClaims` | Segment index, speaker reference, exact claim substring, supporting Event IDs | Same-speaker provenance and existing reported-event route | Missing/invalid cannot discard dialogue or establish history |
| Existing other `vcon013.result.*` routes | Material, route Boolean, perception, temporal, movement, Identity | Existing owning validators and reducers | Retain prior per-family guard policy; route Boolean only initial Local |
| `vcon013.input.recoveryTargets` | Workflow-issued failed slot IDs/reason enums + dependency groups | Selects fields in one manual supplementary request | No model may enlarge selection or budget |
| `vcon013.input.acceptedConstraints` | Valid record identities and necessary read-only references | Supplement avoids duplicates and respects successful siblings | Immutable, never accepted as replacement output |
| `turn.recovery.accepted/failures` | Typed record results, not raw rejected response | UI counts/selection and one final assembly | Pending draft only, no Knowledge/archive authority |
| `turn.recovery.supplement` | `{status:available|reserved|spent, attemptId, selectedGroupIds}` | Explicit command gate, refresh recovery | Durable compare-and-reserve before dispatch; never automatically released |
| `turn.recovery.fallbackExcerpt` | Last nonempty narration, first 48 whitespace-delimited words, exact source reference | Optional message-local presentation only | Never `publicEventEn`, verified Event, witness, progression type or Appraisal input |

Schema design:

- Scene transport requests only `{segments, speakers?}`. No new requirement that
  every displayable segment has correct type/speaker/metadata in order to retain it.
- New Post root has an explicit contract version, initial/supplement mode and
  partitioned existing/new result families. Exact enum and record definitions
  reuse domain descriptors. Do not retain the old Scene form as a second family.
- Versioned Post transport stays strict for generation; response settlement checks
  root viability then parses independent records. Unknown fields are never writers.
- A missing required response section is distinguishable from an accepted explicit
  empty result. Optional null is valid no-change where the contract permits it.
- No loss of existing Scene Item operation expressiveness during consolidation:
  map acquire/carry/place/equip/unequip/give/lend/consume/damage/clean/lose/destroy
  into the owning Item schema or explicitly extend that shared descriptor.
- A migrated field must have a positive production-chain test before retiring its
  Scene reader. Empty response acceptance is not feature parity.

## 4. Preserve and Adopt Separately

Preservation extracts recoverable text without stringifying arbitrary objects into
prose. It retains text and order, never calls a model, and renders through existing
safe text/Markdown sanitization. An invalid type or speaker label uses neutral
display metadata; it does not turn the speaker into narrator authority.

Persist the Scene message with its ordinary source-text identities and an
uncommitted recovery receipt. Frozen source hash includes ordered prose and speaker
references. Translation uses existing message-segment keys and cannot write source.

Authority adoption then classifies languages, speaker identities, evidence and
field dependencies. Non-English source remains explicitly `model_output_evidence`
unless the existing language authority contract admits it. Do not feed prohibited
raw-language evidence into canonical State/Knowledge to get past this boundary.

Preserved but uncommitted segments are accessible to this turn's recovery only.
Ordinary next-turn retrieval cannot hydrate them as committed Events. Known
speaker references use current canonical identity; unresolved declarations are
message-local, not a new Actor directory.

Disk failure is distinct from validation failure. Keep source in the active UI
receipt and report unsaved status; retry storage without model generation. Never
label an unacknowledged write durable. A browser crash before any successful disk
write is an infrastructure limit, not a promise that bytes can be reconstructed.

Implementation route: the turn workflow retains `jobRegistry.unsavedPostNarrative`
scoped to the current chat object. The `saveOnly` action calls
`recoverFailedPostPreservation`, verifies the persisted base within the existing
revision guard lock, and CAS-releases only the matching uncertain host-save claim.
It then uses the ordinary guarded narrative-plus-pending write and removes the
session receipt only on success. A newer persisted revision is refused. Adoption
of a write that succeeded but lost its acknowledgement remains an open verification
boundary, not an implemented recovery promise.

## 5. Initial Post and Family Dependencies

Initial Post reads frozen prose plus compact authority/context once. Valid records
are keyed by family and existing domain operation identity; failed slots receive
workflow-owned IDs. No raw rejected record needs to persist in diagnostics.
Store the slot's family, source references, bounded reason and dependency group.

Guard sequence:

1. Root object/version and provider request outcome.
2. Per-family and per-record shape/language.
3. Exact IDs, source evidence, preflight/Check, Actor ACL and legal transitions.
4. Dependency closure and duplicate-operation conflict.
5. Assemble accepted draft without running world writers.

Promotion is evaluated before records that name a new speaker. If promotion is
invalid, those records become unresolved dependents, not successful writes with
unknown IDs. Conflicting Actor-location/Item-custody consequences must settle as
one dependency group. Unrelated accepted records remain frozen.

Perception, participants, witnesses and generated Event metadata are one dependency
group. Bad historical claims do not erase dialogue. Quoted falsehood is not
automatically objective history; retain existing reported/observed distinction.

Harmless normalization and legitimate no-change do not force the recovery panel.
Shape/evidence failures that need a choice do. If no failures remain, commit
without an additional user interruption.

## 6. Supplement and Defaults

The UI selects workflow group IDs, not arbitrary JSON fields. The workflow checks
tail identity, epoch, scene, revision, frozen hash and `available` allowance, then
atomically marks a unique attempt `reserved` before one model dispatch.

Repeated click, second tab, reload, stale UI or timeout cannot issue another
supplement. `reserved` after reload becomes spent/unknown-outcome and requires
defaults or existing discard; never auto-resume the request. Pre-dispatch no-fit
does not reserve an attempt. Transport failure after reservation spends it.

Build the output descriptor for selected unresolved families/slots and their
explicit dependency closure only. Accepted records may be sent as compact
constraints, never requested output. The response must be ignored outside this
allowlist. Re-run normal domain guards on allowed results, reject collisions with
accepted identities and merge once.

Initial Local may invoke its existing shared Dynamic operation. Supplement is
one selected Post call containing the requested Inventory/Identity sections if
needed; route Boolean cannot start Dynamic in this mode. Its capacity and
positive-family correctness must pass independently.

Defaults after player skip or unsuccessful supplement:

| Unresolved content | Default |
| --- | --- |
| Optional Actor, Item, Material, Identity, first impression, temporary Actor | Omit failed record and dependents; never roll back unrelated accepted siblings |
| Progression summary/type | No semantic proposal; optional exact excerpt only in message display metadata |
| Pacing realization | False/no accepted realization; retain pending beat |
| Historical claim provenance | Omit unsupported annotation/propagation; retain speech as display |
| Perception/witness/Event | No new perception-derived Event or witnesses |
| Temporal claim | Diagnostic rejection; deterministic clock policy remains authority |
| No marker / ineligible / already-there movement | Existing deterministic normalization |
| Eligible uncertain movement | Keep transaction pending and input locked; no fabricated failed/successful movement |
| Provider/root failure | All requested families unresolved; same defaults and true-blocker checks |
| Revision/transaction/save failure | No world commit; do not call model for nonsemantic failure |

After defaults, no further manual supplementation is available for this turn, even
if the request itself was skipped. This prevents later rewriting committed results.
An unresolved blocking turn retains evidence and the existing explicit discard.

## 7. Commit and Recovery Lifecycle

Proposed pending version includes:

```text
version, timelineEpoch, sceneId, playerMessageId, sceneMessageId
baseRevision, frozenNarrativeHash, preTurnCheckpoint
deterministicContext (Check, duration, movement preflight)
acceptedRecords, unresolvedGroups, supplement status/attempt/selection
provider, bounded capacity/failure diagnostics
```

Use one authority-aware commit routine for initial success, defaults and supplement.
It must:

- revalidate complete dependency/transaction invariants;
- recheck revision (existing proven runtime-only increments may be rebased);
- reduce on a clone through current sole domain reducers;
- consume only accepted pacing realization;
- atomically persist State and committed chat metadata through existing
  `guardedRewriteTimeline`;
- delete pending metadata only when durable commit succeeds;
- preserve frozen prose and localization source identity throughout;
- on rollback, reacquire restored chat objects before attaching pending status.

Do not preserve a full private Prompt/raw model response as a recovery record.
Store minimum authorized context needed to reproduce the same task. Existing
checkpoint is rollback authority, not a second active State writer.

V1 upgrade: verify tail/source and checkpoint first, classify old draft values as
uncommitted candidates and revalidate, translate retryCount into available/spent,
persist new envelope atomically. Missing required context -> evidence retained,
no invented data. Closed committed history remains untouched.

## 8. UI Contract

Extend existing Story recovery band, not a second debugging panel.

- Saved prose is the primary content.
- Localized status distinguishes evaluating, needs choice, supplement in progress,
  defaults applied, movement blocked, save conflict and unsaved prose.
- Checkboxes select failed categories with record counts and dependencies.
- Commands: supplement selected (one chance), continue with defaults, existing
  confirmed discard. Mandatory unresolved movement disables unsafe defaults.
- Busy/spent/stale gates enforce disabled controls and match backend/workflow rules.
- Unknown speaker metadata uses a neutral localized label; no raw ID in ordinary UI.
- New message-local label TranslationTable keys include message ID and declaration
  ID, never canonical Actor IDs until formal admission.

Registry coverage: `MSG-004/005/006`, `GEN-007`, `GEN-008`, proposed
`NFP-UI-001/002`; required evidence includes narrow and desktop pending, successful,
failed, refreshed and duplicate-command states. No global localization rewrite.

## 9. Verification and Budget

Implementation self-tests are in [Checklist](./checklist.md). Current baseline is
not evidence that the new design is implemented.

Prompt build-only for Scene, initial Low/Local and supplemental Low/Local must use
production builders, current representative save, full transport descriptor and
wrapper. Report sizes per section, estimate tokens using existing provider rules,
detect duplicate semantic sources and respect configured response reserve.

Do not make a paid call until the entire relevant trace (admission, dispatch,
parse, family validation, merge, save and UI outcome) is observable with bounded
metadata and locally proven. Existing diagnostics should be reused.

Real provider plan, upper-bound allocation, not mandatory spend:

| Dispatch allowance | Purpose |
| --- | --- |
| 1-2 | One real Scene and unified Low Post on a disposable representative timeline |
| 3 | One manual Low supplementary request for controlled failed targets |
| 4-5 | Additional positive mixed-domain/new-speaker evidence where needed |
| 6-10 | Reserved for demonstrated failures/fresh post-fix verification only |

All real remote task invocations caused by these workflows count, including
translation/directors; enforce global pre-dispatch remaining budget. Local tests
must not silently switch to a remote provider. A failed request counts once.
Raw test responses may be processed in memory, but evidence files record hashes,
field outcomes, call counts and result statuses, not private prose or secrets.

Fresh blind agents see only final production requests; no PRD/validator hints.
Independent acceptance reads approved goals/contracts and makes no paid calls
without main-agent reservation. Stop after passing the approved matrix; no
extra acceptance round or scope expansion without a concrete failure.
