# Timeline Compression and Appraisal Lifecycle Progress

## Current Status

- Change ID: `compact-timeline-appraisal-lifecycle`
- Artifact revision: `4`
- Phase: completed
- Active implementation task: none
- Approval: revision 4 explicitly approved on 2026-08-13

## Chronological Log

### 2026-08-13 - Revision 3 implementation approval

- User explicitly approved Revision 3 and requested implementation.
- CTL-01 moved to `in_progress`; no other implementation task is active.

### 2026-08-13 - Revision 4 migration correction

- During CTL-02 real Tina migration auditing, 15 Evidence records had unique same-Scene Event mappings, but 2 of those had only requested `delta=16` and no reducer-owned `appliedDelta`.
- Relationship Evidence V3 requires actual applied deltas. Substituting requested delta would invent historical settlement and violate approved authority semantics.
- Correct deterministic projection is 13 retained receipts and 92 dropped Evidence details. All 34 edge aggregates remain byte-equivalent and active emotions still project 10 -> 9.
- Revision 3 approval is stale because the approved migration count changed. Business implementation is paused pending explicit Revision 4 approval.

### 2026-08-13 - Revision 4 approval

- User selected option A: delete the two Event-backed Evidence details that lack authoritative `appliedDelta`.
- Requested delta is never substituted for historical applied delta.
- Revision 4 is approved; CTL-01 resumed as the only active implementation task.

### 2026-08-13 - Production reconnaissance

- Confirmed the repository root is `/Users/bytedance/sillytavern/SillyTavern`.
- Confirmed this requirement is distinct from completed `unify-actor-context-memory`; created a new stable change ID.
- Traced ordinary-turn, Scene Transition, initial-world, lifecycle, repair, Knowledge, Daily and UI uses of `state.timeline`.
- Confirmed `state.timeline` is absent from the living field registry despite active production readers/writers.
- Traced Actor Memory consolidation through `workflows/social-memory.js`, `actor-memory-reducer.js`, Memory Synapse and Knowledge rebuild.
- Confirmed Memory Consolidation removes source refs but not source Appraisal entities.
- Confirmed local provenance-backed Appraisals may intentionally have no Actor Memory tier ref, so deletion must use an explicit candidate set rather than a global orphan sweep.

### 2026-08-13 - Active Tina State evidence

Read-only source:

`data/default-user/chats/Hogwarts_World_Director/Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl`

- State revision: 61.
- Turn: 99.
- Clock: `1991-09-02 · 19:00`.
- Archived Scenes: 12.
- Rolling `state.timeline`: 20 entries.
- Current plus archived Scene timelines: 125 entries.
- Rolling entries also present exactly in Scene timelines: 19/20.
- English archive closure summaries: 12/12.
- Closure summary length: 25-83 words, average 59.92.
- Appraisals: 72.
- AppraisalRefs: 62.
- EventRefs: 31.
- Everyday AppraisalRefs: 37.
- Everyday EventRefs: 31.
- Protected first-impression Appraisals: 10.
- Current Person Schemas/supersede chains: 0/0.
- Projected V3 migration: 35 Appraisals, 0 Everyday AppraisalRefs, 31 Everyday EventRefs.
- Projected chronicle migration: 12 entries and no `state.timeline`.
- All measurement scripts were build-only; source bytes, SHA-256 and mtime remained unchanged.
- Verified source fingerprint: SHA-256 `9c506883baaf203c5795196431b4603cf8f38d71d808575edb055dd07758c8d4`, 6,885,349 bytes.

### 2026-08-13 - Real Prompt baseline

Built with the real production Prompt builders and active Tina model slots:

- Runtime: `contextSize=120000`, `maxResponseLength=12000`, `maxPromptCharacters=298080`.
- Medium Scene Transition: System 15,370; output Schema 1,589; User 187,559; total 202,929 chars.
- High Scene Transition: System 15,363; output Schema 1,589; User 194,076; total 209,439 chars.
- Daily Director: System 2,351; User 149,190; total 151,541 chars.
- Daily `recentTimeline`: 16 entries, 1,401 serialized chars.
- Migrated latest three chronicle entries: 958 serialized chars.
- Proposed transition rule and Schema line: +510 static chars.
- Revision 1 originally projected medium/high totals of 203,439/209,949 before the later removal of transition `relationshipUpdates`.
- Existing duplicate continuity hydration remains measurable: 9 hydrated memories, 7 unique records, one Event expanded for three actors. This is explicitly deferred.

### 2026-08-13 - Revision 1 decisions

- Global history becomes separate `globalChronicle`, one semantic entry per closed Scene.
- Scene and chronicle histories are append-only.
- Legacy rolling `state.timeline` is atomically removed, with no compatibility reader.
- Existing Scene Transition call produces the chronicle summary; no new model call.
- Existing event-boundary Memory Consolidation remains the only model-assisted Appraisal clustering call.
- Consumed Appraisal entities are deleted only from explicit candidate IDs and only when unprotected.
- Successful Scene Transition deterministically removes Everyday AppraisalRefs.
- EventRefs and canonical Events never evaporate.
- Turn TTL is rejected.
- General Prompt deduplication is deferred.
- Frontend field shape and language architecture remain unchanged.

### 2026-08-13 - Revision 2 Relationship Evidence/Appraisal reconciliation

- User chose one authoritative subjective interpretation: Appraisal. Relationship Evidence becomes an applied relationship receipt referencing required Event and optional Appraisal.
- Applied “record once, reference everywhere” through the full chain: historical Appraisal V2 keeps Event IDs but removes copied Event `sceneId/sourceMessageIds`; Relationship Evidence references Appraisal/Event and owns no prose/provenance.
- Traced the full Social Director model/reducer, Social Graph edge, ACL projection, actor capsule, Dossier, Knowledge and relational graph paths.
- Confirmed current Relationship Evidence also owns applied deltas/tags/emotion effects, so the receipt cannot be removed entirely without losing relationship audit and edge sources.
- Active Tina contains 105 Relationship Evidence, 34 edges, 72 Appraisals and 9 canonical Events.
- Evidence English/Chinese summary copies consume 25,742 bytes.
- No legacy Evidence has explicit Event IDs and no legacy Evidence matches an Appraisal source/pair.
- Source-message analysis found 15 unique same-Scene Event mappings, 1 ambiguous two-Event mapping and 89 no-Event mappings.
- Approved migration intent from the user: abandon old Evidence detail when no unique Event exists. Revision 2 therefore retains 15 lightweight Event-only receipts and deletes 90 details while preserving all 34 aggregate edge values.
- Ten current active emotions depend on legacy receipts; nine map to retained unique receipts and one depends on the ambiguous receipt, so the deterministic projection is 9.
- Language repair was explicitly deferred. V3 removes Evidence text; UI may display English referenced Event/Appraisal text until the later language project.
- The normal turn order already supports new references: canonical Event commits before local Appraisals, and the event-boundary Social Director runs afterward.
- Relationship retention is deterministic after actual reducer settlement: `abs(appliedDelta)>=4`, a newly added structural tag, or emotion intensity >=3 promotes the Appraisal to Recent. Schema/merge protection executes first; otherwise Actor Memory falls back to EventRef and the receipt becomes Event-only.
- Scene Transition `relationshipUpdates` was identified as an Event-less parallel Appraisal writer. Revision 2 removes the field/rules/normalizer/validator/translation/reducer path; the measured static Prompt removal is 843 characters, more than offsetting the +510 chronicle addition.
- Revision 2 projects Scene Transition totals of medium 202,596 and high 209,106, both below their measured baselines; output Schema projects from 1,589 to 1,488 characters.
- A representative Tina event-boundary Prompt with 8 actors, 14 messages and 7 Events measured 608,552 message characters against a 298,080 runtime ceiling. Its separately supplied JSON response Schema measured 4,377 characters. `reviewableActors` was 437,021 and `existingSocialGraph` was 81,450 because Evidence bodies were repeatedly hydrated.
- Reference-only/edge-only projections measured 57,180 and 46,409 characters, projecting a 193,670 total before static Schema changes. Revision 2 sets a 220,000 total product ceiling.
- This direct Social Director projection repair is in scope; unrelated Prompt deduplication remains deferred.
- No business code, migration, model call or save mutation was performed.

### 2026-08-13 - Revision 3 reported Event architecture

- User selected permanent Event storage for rumor transmission: the hard fact is that a speaker communicated an attributed claim to recipients; the claim itself may be true, distorted, false or unlinked.
- Full production tracing found GossipPack is an older disconnected subsystem. Its writer stores free `originEventEn/truthCoreEn/versionEn` text but no Event/message IDs required by later Appraisal/Knowledge gates.
- Scanned 72 real Hogwarts JSONL saves: all contain zero GossipPack and zero rumor-derived Appraisal records.
- The same 72 saves contain zero `worldNews/worldChangeLog`; active Tina only has an empty ready-state `sceneEnrichment.worldChanges` diagnostic.
- Model-free production-function probe showed:
  - a production-written pack appears in `knownRumors` but does not authorize its recipient for Appraisal/Event;
  - manually adding Event/message IDs authorizes the recipient and leaks the canonical Event rather than only the distorted report;
  - setting the pack `faded` removes both projected rumor and Event authorization.
- Real medium/high Scene Transition Prompt builds contain no `worldChanges/gossipUpdates/originEventEn` contract, confirming the normal writer path is not model-reachable.
- GossipPack automatically fades after 28 days, caps versions at 8 and packs at 16; this conflates propagation salience with permanent actor knowledge.
- Appraisal cross-validation does not validate `sourceRumorIds` against current packs; a stale Appraisal can survive while its supporting Event access disappears.
- Current EventRef writer serves actual room witnesses only and the Dossier labels EventRefs as shared events, so raw EventRef cannot safely represent hearsay.
- Existing `ActorEventKnowledge.reported[]` is reserved but always empty.
- Revision 3 therefore:
  - upgrades Event Knowledge to typed observed/reported V2;
  - creates reported Events only from exact committed messages through the existing event-boundary Social Director;
  - records explicit speaker/recipient roles and permanent propagation/correction chains;
  - treats optional `aboutEventId` as authority-only with no ACL inheritance;
  - removes GossipPack/gossipUpdates/knownRumors/fading and `authorized_rumor/sourceRumorIds`;
  - removes the sibling unreachable `prophetBriefs/worldNews/worldChangeLog/recentWorldNews/sceneEnrichment.worldChanges` path;
  - uses reported Events as Appraisal and Relationship Evidence sources;
  - adds no model call and does not invent offscreen propagation.
- Tina's 9 Events all have exact committed transaction clocks; only 3 of 12 archived Scenes have canonical Events, so Revision 3 forbids archive-prose Event backfill.
- No business code, model call or save mutation was performed.

### 2026-08-13 - Revision 3 implementation-readiness audit

- Found 83 legacy Social Statement records consuming 55,485 bytes/18,915 text bytes. They are another attributed-speech text/provenance ledger beside Event.
- Only 24 statement summaries are exact speaker-dialogue substrings, only 5 map to one canonical Event, and only 3 satisfy both. The remaining 3 still lack exact segment-level audience proof because their legacy `witnessedBy` differs from the base Event's room audience.
- Revision 3 therefore migrates zero Statement to Event and deletes all 83 structured details while preserving original chat and Scene Archive rows. No model/text inference is allowed during migration.
- Social `identityClaims/relationshipClaims` currently contain zero Tina records. Future non-authority claims become structured refs to reported Event; generic Statement prose/projection is removed.
- Report recipient authority cannot use message presence alone. The new proposal requires exact statement/audience source evidence and every recipient must be in every cited Event's direct/audible intersection; visual-only/absent recipients fail.
- Reported Event forbids copying the base Event perception. Its explicit speaker/recipient/witness basis is authority.
- Existing Knowledge expands full Event source messages into transcript text. Revision 3 explicitly disables that expansion for actor-visible reported Event records and hides authority-only `aboutEventId`.
- Report commit adds permanent Everyday EventRefs for NPC speaker/recipients. Existing Prompt bounds remain one Everyday continuity memory and at most 3 Event activations per actor/8 globally; full `ActorEventKnowledge.reported[]` is forbidden as Prompt input.
- Removing Statement projection also requires continuity `knownActorIds` to derive from reported Event speaker/recipient/subject IDs.
- Real Tina Event/Perception sources include `deterministic_repair`, which current enums omit; Event V2 registers it rather than rewriting provenance.
- Evaluated moving extraction into the local post-turn observer and rejected it: that observer supports exactly one primary perception, has a 5,523-character System contract and 4,010-character Schema, and a representative Tina input is already at least 11,168 characters. Revision 3 keeps report extraction in the existing Social call and adds no local Prompt fields.
- Removed sibling dead authority after scanning all saves: `worldNews/worldChangeLog` are 0 in all 72 saves, current transition Prompt has no `prophetBriefs`, and active Tina only has an empty ready-state world-change diagnostic.
- Removed Daily causal `rumor_route/rumor` proposal values; they currently materialize no Event and cannot grant knowledge.
- Report stable identity now excludes model English summary and uses exact source/role fingerprints, preventing duplicate Events when translation changes on retry.
- Social capacity now uses `processedThroughMessageId`; a capped response commits only a complete message prefix and leaves the existing catch-up to process the suffix.
- Structured Social claims and relationship receipts become Event edges only; Knowledge removes standalone Statement/identity-claim/relationship-claim/relationship-evidence text records.
- Cloned the real strict Social response Schema for design measurement: 4,377 current; 5,773 Revision 3 projection after removing 567 Statement + 1,910 legacy Evidence chars and adding report/Appraisal/claim/receipt/cursor branches. The 6,500 ceiling has 727-character headroom.
- No business code, model call or save mutation was performed.

### 2026-08-13 - Revision 4 implementation and acceptance

- Implemented `GlobalChronicleV1`, observed/reported Event V2, Actor Event Knowledge V2, Memory Reference V3, Memory Synapse/Appraisal V2 and Social Graph/Relationship Evidence V3.
- Implemented the one-pass cloned-State cutover. Real Tina projection:
  - 12 Chronicle entries;
  - 9 observed Events and zero fabricated reported Events;
  - 72 -> 35 Appraisals;
  - 37 -> 0 Everyday AppraisalRefs while 31 EventRefs remain;
  - 105 -> 13 reference-only receipts;
  - 92 deleted details, including the two Event-backed records without reducer-owned `appliedDelta`;
  - 83 -> 0 Social Statements;
  - 34 relationship edge aggregates byte-equivalent;
  - active emotions 10 -> 9.
- The migration rejects non-empty Gossip/News/world-change business payloads, leaves the caller State unchanged on failure and returns `changed=false` on its second valid run.
- User clarified final transition error behavior:
  - stray model `relationshipUpdates/worldChanges` fields are discarded at normalization and never persisted;
  - invalid or missing `globalChronicleSummaryEn` fails immediately and bypasses automatic model repair retry.
- Removed all production root `state.timeline` readers/writers. Detailed active/archive Scene timelines remain the UI authority.
- Scene Transition now appends exactly one Chronicle entry, writes no transition Appraisal and runs deterministic Everyday Appraisal evaporation.
- Social production routing now uses `social-director-v3-graph.js` and `social-v3-reducer.js`; former Statement/prose-Evidence graph and world-change writer are non-executable tombstones.
- Reported Event acceptance covers NPC and player (`segmentIndex=-1`) sources, direct/audible recipient intersection, explicit audience narrowing, fabricated claims, parent propagation and correction/retraction chains.
- Strong recipient Appraisals use actual applied relationship effects for Recent promotion. Weak Appraisals are deleted while their permanent EventRef and applied Event-only receipt survive.
- Memory Consolidation consumes AppraisalRefs only, creates Event-backed merged Appraisals, applies Schema operations before deletion, rebinds compatible receipts and deletes only unprotected candidates.
- Knowledge acceptance:
  - all 12 archived Chronicle summaries resolve into their matching Scene record;
  - zero standalone Social Evidence/Statement/claim text records;
  - reported Event records contain attributed summary/roles/subjects only;
  - no reported transcript, message source ref, parent or `aboutEventId`;
  - Dossier retains 8 business fields and reported EventRefs display `听闻/转述`.
- Final real Prompt builds:
  - Medium Scene Transition: System 14,965; User 136,820; total 151,785, versus 202,929 baseline (`-51,144`);
  - High Scene Transition: System 14,958; User 143,337; total 158,295, versus 209,439 baseline (`-51,144`);
  - Daily: System 1,645; User 99,456; total 101,101; three Chronicle entries serialize to 958 characters;
  - Social: System 11,857; User 40,467; total 52,324; `reviewableActors` 2, `existingSocialGraph` 14,480, `sceneEvidence` 7,651 and Event payload 2,410;
  - Social strict JSON Schema: 6,168 characters, below the 6,500 limit.
- Protected `LowTierContextV1` and `turn-performance.js` are byte-identical to HEAD; the existing extra 203 System Prompt characters were not changed.
- Tina source remained read-only before and after acceptance: SHA-256 `9c506883baaf203c5795196431b4603cf8f38d71d808575edb055dd07758c8d4`, 6,885,349 bytes, mtime epoch `1786596461`.
- Host rollback evidence: `data/default-user/backups` contains 104 chat backups, including multiple pre-migration Hogwarts World Director backups. Rollback restores a host backup; no reverse migration exists.
- Revision 4 focused suites: 40 tests passed after the final player/correction/family additions. All changed JS/MJS files pass ESLint; syntax checks and `git diff --check` pass. Module size gates pass (`presence-witness-contract.js` 1,999 lines; Social V3 graph 1,886).
- Full historical Hogwarts glob: 396/468 passed. The 72 failures are recorded rather than “fixed” with compatibility:
  - pre-V1 / Memory Reference V1/V2 lifecycle fixtures rejected by the approved complete V1/V2 cutover boundary;
  - Event V1, Memory Synapse V1 and `authorized_rumor` fixtures rejected by strict V2 contracts;
  - Social V2 Statement/prose-Evidence/read-only-policy/Identity-claim fixtures removed by Revision 4;
  - snapshots expecting `state.timeline`, `recentTimeline`, `recentWorldNews`, world-change exports or old facade counts;
  - retired presence/world-change migration scripts that construct Event V1;
  - environment-only `vm.SourceTextModule` failures under the active Node runtime.
  These tests specify superseded behavior and must be rewritten or retired as a separate test-maintenance change; production compatibility was not reintroduced.

## Artifacts

- [PRD revision 4](./prd.md)
- [Technical spec revision 4](./spec.md)
- [Implementation tasks](./tasks.md)
- [Acceptance checklist](./checklist.md)
- [Living field registry](../hogwarts-runtime-contracts/state-fields.md)
- [Actor Memory contract](../hogwarts-runtime-contracts/actor-memory.md)

## Final Status

Revision 4 implementation and acceptance are complete. The deterministic Tina result is 13 retained receipts, 92 deleted Evidence details, 34 unchanged edge aggregates and 9 active emotions. No model call or source-save mutation was used for migration acceptance.
