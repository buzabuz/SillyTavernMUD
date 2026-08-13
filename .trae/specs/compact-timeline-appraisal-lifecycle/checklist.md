# Timeline Compression and Appraisal Lifecycle Checklist

## Approval

- [x] Stable change ID selected and no existing change directory covers the same acceptance boundary.
- [x] PRD, spec, tasks, checklist and progress files exist and are cross-linked.
- [x] User explicitly approved artifact revision 3.
- [x] User explicitly approves artifact revision 4 after the migration-count correction.
- [x] Implementation resumes only after Revision 4 approval.
- [x] No unapproved later product, migration, Prompt-budget or frontend-whitelist change was introduced.

## Production Reconnaissance

- [x] Ordinary-turn timeline writer traced.
- [x] Scene Transition/archive timeline writer traced.
- [x] Initial-world, lifecycle, repair, Knowledge, Daily and UI timeline readers traced.
- [x] Appraisal turn writers, local proposal writer, consolidation reducer and transition writer traced.
- [x] Relationship Evidence proposal, reducer, edge, ACL, Dossier, Prompt and Knowledge readers traced.
- [x] GossipPack writer, fade/truncation, Prompt, Appraisal and Knowledge authorization paths traced.
- [x] 72 real Hogwarts saves scanned for GossipPack/rumor Appraisal state.
- [x] The same 72 saves scanned for World News/Change Log state.
- [x] Production-function rumor authorization/truth-leak/fade behavior reproduced model-free.
- [x] Real Scene Transition Prompt proven to contain no Gossip output contract.
- [x] Knowledge Appraisal and Scene projections traced.
- [x] Active Tina State measured without file mutation.
- [x] Real medium/high Scene Transition Prompt built through the production builder.
- [x] Real Daily Director Prompt built through the production builder.
- [x] Representative real-save Social Director Prompt built model-free.
- [x] Tina legacy Evidence-to-Event/Appraisal coverage measured.

## Runtime Contract

- [x] Missing legacy `state.timeline` contract gap documented.
- [x] Proposed `globalChronicle` ownership recorded in the living field contract.
- [x] Proposed append-only Scene timeline semantics recorded.
- [x] Proposed Memory Reference V3 semantics recorded in Actor Memory contract.
- [x] Proposed Social Graph V3 receipt semantics recorded in living contracts.
- [x] Proposed Event/Actor Event Knowledge V2 and Gossip removal recorded in living contracts.
- [x] Implemented versions and validators match the approved contract.
- [x] Central Event reducer is the only observed/reported Event writer.
- [x] Exactly one reducer path owns each chronicle entry and relationship receipt; Appraisal deletion is limited to consolidation and Scene Transition lifecycle reducers.
- [x] No production reader accesses removed `state.timeline`.

## Timeline Behavior

- [x] Ordinary turn writes only one detailed Scene timeline entry.
- [x] Successful transition appends closure to the archived Scene timeline.
- [x] Successful transition appends exactly one chronicle entry keyed by closed `sceneId`.
- [x] Duplicate identical transition is idempotent; conflicting duplicate fails.
- [x] Active and archived Scene timelines have no runtime delete/update path.
- [x] Chronicle entries have no runtime delete/update path.
- [x] Initial Scene receives no chronicle entry until it closes.
- [x] Calendar Moment and Timeline Moment reuse identical chronicle semantics.

## Appraisal Lifecycle

- [x] Memory Synapse version becomes 2.
- [x] Historical Appraisal stores `sourceEventIds` but no `sourceMessageIds/sceneId`.
- [x] Appraisal has no `sourceRumorIds` or `authorized_rumor`.
- [x] `knowledgeSource=reported` requires explicit reported Event recipient status.
- [x] Appraisal message/Scene provenance is derived exactly from canonical Events.
- [x] New Appraisal stable ID uses observer/target/Event IDs.
- [x] Legacy provenance mismatch fails migration without guessing.
- [x] Consolidation source IDs accept AppraisalRefs only.
- [x] Consolidation never removes EventRefs or canonical Events.
- [x] Schema/merge operations execute before relationship retention/deletion.
- [x] `abs(appliedDelta)>=4`, new structural tag and emotion intensity >=3 are tested exactly.
- [x] Qualifying new Appraisal is promoted to Recent.
- [x] Weak/unlinked Appraisal is replaced by canonical EventRef.
- [x] Schema operations run before source Appraisal deletion.
- [x] Consumed/forgotten unprotected Appraisal entities are deleted.
- [x] `firstImpressionRef` protects the Appraisal entity.
- [x] Schema support/counter refs protect the Appraisal entity.
- [x] Appraisal supersede chains protect both linked entities.
- [x] Unrelated unreferenced local Appraisals are not swept.
- [x] Successful transition removes all Everyday AppraisalRefs.
- [x] Failed/cancelled transition removes no AppraisalRef.
- [x] Everyday EventRefs survive transition byte-equivalent.
- [x] Full Actor Context and Memory Synapse validation runs before commit.

## Event Knowledge V2

- [x] Root and every Event version become 2.
- [x] Every Event has exact authoritative `clock`.
- [x] Observed Events preserve existing perception/witness semantics and forbid `report`.
- [x] Witness basis `reported` is legal only for explicit recipients of reported Events.
- [x] Reported Events require attributed `summaryEn` and structured `report`.
- [x] Speaker and recipients are grounded in exact committed message/segment evidence.
- [x] Proposed recipients are within every cited Event's direct/audible intersection.
- [x] Explicit target evidence permits narrowing; otherwise full eligible audience is required.
- [x] NPC recipients have witness basis `reported`.
- [x] `player` is legal as speaker or recipient without entering NPC Actor authority.
- [x] Player source uses `segmentIndex=-1`; NPC source index resolves a matching dialogue segment.
- [x] Multiple reports from one message receive distinct stable IDs when their grounded role/source fingerprints differ.
- [x] Report stable ID excludes model translation/summary and survives retry unchanged.
- [x] Fabricated claims have no `aboutEventId`.
- [x] `aboutEventId` never grants recipient ACL or graph expansion.
- [x] Parent propagation requires the speaker to have spoken/received the parent.
- [x] Correction/retraction requires a parent and appends a new Event.
- [x] Reported Events never fade or delete.
- [x] Report commit adds idempotent permanent Everyday EventRefs to NPC speaker/recipients.
- [x] `ActorEventKnowledge.reported[]` contains explicit recipients only.
- [x] Continuity known-actor IDs derive report speaker/recipient/subjects after Statement removal.
- [x] `knownRumors` and GossipPack projections are absent.
- [x] Daily causal collapse has no `rumor_route` kind or `rumor` persistence target.

## Relationship Evidence V3

- [x] Every new receipt requires exactly one canonical `eventId`.
- [x] Optional `appraisalId` matches observer, target and Event.
- [x] Stable ID derives from directed pair, event kind and Event ID.
- [x] Receipt stores actual applied deltas, not only proposal deltas.
- [x] Receipt contains no summary or translated text.
- [x] Receipt contains no message, Scene, witness, Event-list or visibility copy.
- [x] Event-only receipts remain valid after Appraisal deletion.
- [x] Compatible merged Appraisal may rebind receipts.
- [x] Incompatible/deleted Appraisal clears to Event-only.
- [x] Clearing Appraisal never reverses edge dimensions/tags.
- [x] Structured emotion effects remain distinct from prose Appraisal.
- [x] Prompt/Knowledge Appraisal hydration enforces observer ACL.
- [x] Player Dossier preserves its existing player-target meta-view only.
- [x] Player Dossier retains `actor -> player` aggregate edge dimensions after legacy detail deletion.
- [x] Legacy Evidence visibility is not copied to expose inter-NPC detail.
- [x] Unauthorized readers fall back to visible Event or omit detail.

## Migration and Compatibility

- [x] Timeline migration runs on a clone and makes no model/network call.
- [x] Memory V2 -> V3 migration runs on the same atomic cutover boundary.
- [x] Missing required English archive seed fails without source mutation.
- [x] Migration creates one chronicle entry per eligible archived Scene.
- [x] Migration deletes `state.timeline`.
- [x] Migration removes stale/non-Scene Everyday AppraisalRefs only.
- [x] Migration deletes only unprotected Appraisals from its explicit candidate set.
- [x] Root/index Memory Reference versions both become 3.
- [x] Event Knowledge root/record versions both become 2.
- [x] Memory Synapse version becomes 2 atomically with Memory Reference V3.
- [x] Social Graph version becomes 3.
- [x] Exactly 13 Tina legacy receipts migrate through a unique same-Scene Event with complete `appliedDelta`.
- [x] Exactly 92 Tina legacy Evidence details are deleted.
- [x] The 2 uniquely Event-backed receipts without `appliedDelta` are deleted without substituting requested delta.
- [x] All 34 Tina edge aggregate dimension values remain byte-equivalent.
- [x] Edge `evidenceIds` contains no deleted/dangling ID.
- [x] Tina active emotions rebuild from 10 to 9 without guessing the ambiguous source.
- [x] Migration creates no Event or Appraisal from legacy Evidence prose.
- [x] All 9 Tina Events migrate to observed V2 with exact clocks.
- [x] Tina's 9 Event records remain 9; no archive text becomes Event.
- [x] All 83 Tina Social Statement details are removed; no reported Event is fabricated.
- [x] Empty GossipPack/world-change gossip fields are deleted.
- [x] Non-empty legacy GossipPack causes atomic migration failure.
- [x] Empty `worldNews/worldChangeLog/sceneEnrichment.worldChanges` fields are deleted.
- [x] Non-empty legacy World News/Change Log causes atomic migration failure.
- [x] No `sourceRumorIds/authorized_rumor` survives cutover.
- [x] Second migration returns `changed=false`.
- [x] No dual-read, dual-write, fallback projector or compatibility period remains.
- [x] Pre-migration backup and restore-only rollback use the host chat-backup system; no reverse migration exists.

## Prompt Budget

- [x] Runtime ceiling derived from active model slots and `createContextBudgetPlan()`: 298,080 chars.
- [x] Medium baseline recorded: 202,929 total chars.
- [x] High baseline recorded: 209,439 total chars.
- [x] Daily baseline recorded: 151,541 total chars; `recentTimeline` 1,401 chars.
- [x] Social baseline recorded: 608,552 total chars; runtime ceiling 298,080.
- [x] Social JSON response Schema baseline recorded: 4,377 chars.
- [x] Revision 4 strict Schema design projected at 5,773 chars.
- [x] Transition rule plus output Schema adds no more than 700 chars.
- [x] Scene Transition removes all `relationshipUpdates` rules/Schema/writers.
- [x] Stray model `relationshipUpdates/worldChanges` fields are discarded at normalization without persistence or transition failure.
- [x] Invalid `globalChronicleSummaryEn` fails immediately without automatic model retry.
- [x] Medium transition total is <= 202,929 baseline chars.
- [x] High transition total is <= 209,439 baseline chars.
- [x] Scene Transition User payload adds zero chronicle fields.
- [x] Daily `recentChronicle` is <= 3 entries and <= 1,400 serialized chars.
- [x] Social Director total is <= 220,000 chars.
- [x] Social `reviewableActors` is <= 60,000 chars.
- [x] Social `existingSocialGraph` is <= 50,000 chars.
- [x] Social JSON response Schema is <= 6,500 chars.
- [x] Social reported Event output is <= 24 proposals and does not duplicate Event summary/witness/Scene/clock.
- [x] `processedThroughMessageId` advances only across a fully scanned prefix.
- [x] `scanComplete=false` preserves the unprocessed suffix for existing catch-up.
- [x] Local post-turn observer receives no reported-Event extraction fields; its Appraisal V2 output keeps Event IDs only.
- [x] Social output contains reference IDs and structured effects, not duplicate prose/provenance.
- [x] System Prompt and output Schema are not truncated.
- [x] Protected LowTier Prompt and its existing extra 203 characters are byte-unchanged.
- [x] Full chronicle, raw Appraisals and full database records never enter a Prompt.
- [x] Direct Social Director duplicate Evidence hydration is removed.
- [x] General actor/Event hydration deduplication outside this workflow is not implemented.

## Knowledge and Duplicate Sources

- [x] One chronicle summary is stored only in `globalChronicle` for new Scenes.
- [x] Scene Knowledge resolves the matching summary by `sceneId`.
- [x] No standalone duplicate chronicle record is created.
- [x] Deleted Appraisal IDs disappear after `replace: true` Knowledge rebuild.
- [x] Relationship receipts create Event/Appraisal source refs but no vector text record.
- [x] Deleted legacy Evidence text records disappear after Knowledge rebuild.
- [x] Actor records do not embed the full chronicle or full Appraisal ledger.
- [x] Existing retrieval ACL, clock and revision filters remain effective.
- [x] Reported Event is indexed as attributed communication.
- [x] `aboutEventId` is absent from ordinary actor source paths and activation capsules.
- [x] Actor-visible report retrieval never expands the full source message transcript.
- [x] Actor-visible report Knowledge data/sourceRefs omit message, parent and `aboutEventId`.
- [x] Full `ActorEventKnowledge.reported[]` is never directly injected into Prompt.
- [x] Social Graph has no generic Statement prose/projection.
- [x] GossipPack text is not indexed or projected.
- [x] Prophet/world-news text and `recentWorldNews` are not indexed or projected.
- [x] Statement/identity-claim/relationship-claim creates no standalone Knowledge text record.

## Frontend Whitelist

- [x] No new frontend field approved.
- [x] Current “现场记录” still reads `scene.timelineEntries`.
- [x] Archive UI still reads projected archived `timelineEntries`.
- [x] Dossier keeps the same `memories.core/recent/everyday` shape.
- [x] Dossier keeps the same `relationship.evidenceRefs` shape using Event/Appraisal hydration.
- [x] Reported EventRef uses a distinct heard/reported badge, not “共同事件”.
- [x] Frontend does not read `globalChronicle`, raw Appraisals, raw Memory Index or removed `state.timeline`.
- [x] No deleted Appraisal summary remains in a UI cache after projection rebuild.

## Language and Security

- [x] New chronicle authority is English-only.
- [x] Migration never writes localized text into `summaryEn`.
- [x] No translation cache, language unification or Chinese-display repair is added.
- [x] English Event/Appraisal fallback is accepted as the deferred language behavior.
- [x] Medium chronicle output cannot expose hidden facts.
- [x] Existing high/medium retrieval access boundaries remain unchanged.
- [x] A rumor recipient receives the attributed reported Event, never canonical `aboutEventId` truth.
- [x] No private observer Appraisal leaks into another actor or narrator projection.

## Tests and Acceptance

- [x] Focused timeline/transition tests pass.
- [x] Focused Actor Memory/Appraisal tests pass.
- [x] Social Graph reference, ACL, Knowledge and Prompt projection tests pass.
- [x] Event V2 observed/reported union and Actor Event Knowledge tests pass.
- [x] Report claim, propagation, correction, retraction and fabricated-claim tests pass.
- [x] Gossip writer/fade/knownRumors removal tests pass.
- [x] Calendar Moment and Timeline Moment reuse the tested Scene Transition reducer.
- [x] Actor Context cutover and real-save acceptance tests pass.
- [x] Relevant ESLint, syntax and `git diff --check` pass.
- [x] Full Hogwarts test suite result is recorded; failures are obsolete V1/V2 contract fixtures or named environment baselines, not repaired with compatibility code.
- [x] Tina build-only source SHA-256, bytes and mtime remain unchanged.
- [x] Tina projects 12 chronicle entries, 9 observed V2 Events, 35 Appraisals with zero copied Event/Rumor provenance, 0 Everyday AppraisalRefs, 31 Everyday EventRefs, 13 receipts, 0 Social Statements, 34 unchanged edges and 9 active emotions.
- [x] Isolated cloned-State end-to-end reported Event, event boundary, transition and Knowledge projection succeed.
- [x] Final Prompt report includes totals, protected sections, largest fields and before/after deltas.
- [x] Every PRD acceptance criterion has linked evidence in `progress.md`.
