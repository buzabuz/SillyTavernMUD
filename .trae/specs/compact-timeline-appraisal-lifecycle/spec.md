# Timeline Compression and Appraisal Lifecycle Technical Spec

## Status and Authority

- Change ID: `compact-timeline-appraisal-lifecycle`
- Artifact revision: `4`
- Status: Implemented and accepted
- Product authority: [prd.md](./prd.md)
- Runtime authority: [state-fields.md](../hogwarts-runtime-contracts/state-fields.md) and [actor-memory.md](../hogwarts-runtime-contracts/actor-memory.md)

## Production Map

### Timeline call graph

```text
Ordinary turn
workflows/turn.js
-> domain/turn-reducer.js::applyTurnTransaction()
-> scene.timelineEntries append
-> state.timeline duplicate append + slice(-20)
-> guarded metadata/chat save

Scene close
workflows/scene-transition.js::createSceneTransitionPrompt()
-> medium/high transition response
-> normalize/validateSceneTransitionPackage()
-> buildSceneArchiveEntry()
-> domain/archive-projection.js::applySceneTransition()
-> append closure to archived Scene timeline
-> replace active Scene with opening timeline
-> state.timeline duplicate closure/opening + slice(-20)
-> guarded metadata/chat save
-> Knowledge rebuild
```

Current direct `state.timeline` dependencies:

| Component | Current use | Replacement/removal |
| --- | --- | --- |
| `domain/initial-world.js` | initialize rolling timeline | initialize empty chronicle; active Scene owns opening entry |
| `domain/turn-reducer.js` | duplicate committed turn | remove write |
| `domain/archive-projection.js` | duplicate closure/opening | append one chronicle summary |
| `domain/time-environment.js` | rewrite current Scene timeline clocks in setup repair | update Scene entries only; chronicle is not rewritten |
| `workflows/directors.js` | Daily `recentTimeline` | bounded `recentChronicle` |
| `workflows/turn.js` | legacy generic-label repair | operate only on pre-cutover Scene timeline during migration/repair |
| `runtime/lifecycle.js` | backfill missing Scene timelines | move to one-time timeline migration, then remove fallback |
| `knowledge.js` | Event clock fallback | use transaction/event/current clock, never chronicle |
| `ui/app-controller.js` | expose raw rolling timeline | remove projection |

### Appraisal call graph

```text
Ordinary turn proposal
-> recordActorAppraisalV1()
-> memorySynapse.appraisals
-> Actor Memory recent/everyday AppraisalRef

Local observer proposal
-> reduceAppraisalProposals()
-> provenance-backed memorySynapse Appraisal
-> may intentionally have no Actor Memory tier ref

Event boundary
-> workflows/social-memory.js
-> medium Memory Consolidation response
-> social reducer
-> actor-memory-reducer.js::applyMemoryConsolidation()
-> remove source refs
-> create merged Appraisal/ref
-> apply Person Schema operations
-> Knowledge rebuild

Scene close
-> archive-projection.js::applySceneTransition()
-> current transition relationshipUpdates writes Event-less Appraisals
-> new Scene State
-> Knowledge rebuild
```

The deletion algorithm must therefore be candidate-based. It must not sweep every unreferenced Appraisal, because provenance-backed local Appraisals may be awaiting later Schema consolidation.

### Relationship Evidence call graph

```text
committed turn Event
-> local-appraisal-proposer.js
-> accepted observer Appraisals with Event/message/Scene provenance

event boundary
-> workflows/social-memory.js
-> one medium Social Director call
-> relationshipEvidence text + deltas + duplicated provenance
-> social-director-graph.js applies deltas and writes Social Graph
-> social-reducer.js applies Memory/Schema operations and Social Graph
-> Knowledge indexes Appraisal and Relationship Evidence as separate text
```

Current readers that must change:

| Component | Current behavior | V3 behavior |
| --- | --- | --- |
| `social-director-graph.js` | validates/persists Evidence summary and message provenance | requires Event ID, optionally Appraisal ID; persists only applied receipt |
| `social-projection.js` | authorizes and hydrates raw Evidence | resolves ACL and detail through Event/Appraisal |
| `actor-dossier-projection.js` | reads Evidence summary directly | preserves projection shape, hydrates referenced text |
| `actor-knowledge.js` | injects `latestEvidence` raw body into continuity capsule | injects bounded hydrated detail or Event-only ref |
| `knowledge.js` | creates a second full-text Social Evidence record | indexes Event/Appraisal once; receipt remains relational metadata |
| `relational-synapse-retrieval.js` | uses message/Event fields copied into Evidence | follows receipt `eventId/appraisalId` |
| `workflows/social-memory.js` | sends repeated full Evidence bodies and asks model for another summary | sends bounded IDs/edge calibration and asks for structured effects only |

### Gossip/rumor call graph

```text
current intended writer
7+ day Scene Transition
-> worldChanges.gossipUpdates free text
-> world-changes.js writes gossipPacks
-> getActorKnownRumors projects only active packs

Appraisal/Knowledge integration
-> getLegalAppraisalObserverIds expects pack Event/message refs
-> production pack has no such refs
-> authorized_rumor is unreachable
```

Production defects:

- real Scene Transition Prompt has no `worldChanges/gossipUpdates` output field;
- current writer uses same-room Scene presence, not exact Event witnesses;
- pack versions have no stable version ID or Event/message reference;
- pack fades after 28 days and is eventually truncated;
- Knowledge uses rumor authorization to expose the canonical Event rather than the attributed report;
- all 72 scanned real saves have empty GossipPack and no rumor-derived Appraisal;
- all 72 also have empty `worldNews/worldChangeLog`, and the real transition Prompt requests no `prophetBriefs`;
- Event V1 covers only 3 of Tina's 12 archived Scenes.

V3 removes the whole unreachable free-text world-change path: Gossip/Prophet proposal fields, root stores/log, mandatory projections and `sceneEnrichment.worldChanges`. Reported Events are proposed from exact committed messages by the existing event-boundary Social Director and committed through the Event reducer.

The unrelated Daily causal-collapse enum values `rumor_route` and persistence target `rumor` are removed because they currently create no Event and cannot grant actor knowledge.

## Data Contract

### Timeline versions

```js
export const timelineChronicleVersion = 1;

interface GlobalChronicleV1 {
    version: 1;
    entries: GlobalChronicleEntryV1[];
}

interface GlobalChronicleEntryV1 {
    sceneId: string;
    endedClock: string;
    summaryEn: string;
}
```

Invariants:

- `sceneId` is unique and matches one archived Scene.
- Entry order matches Scene archive order and is nondecreasing by `endedClock`.
- Runtime append is idempotent by `sceneId`.
- Same `sceneId` plus different content is a conflict, not an update.
- `summaryEn` is 40-80 English words and at most 640 characters for new entries.
- Runtime code has no delete/update API for chronicle entries.
- The active Scene has no chronicle entry until it closes successfully.

### Memory Reference V3

The MemoryRef shape remains:

```js
interface MemoryRefV1 {
    recordType: 'event' | 'appraisal';
    recordId: string;
    addedClock: string;
}
```

Only lifecycle semantics change:

- `memoryReferenceVersion=3`
- `actorMemoryIndex.version=3`
- Everyday EventRefs survive Scene Transition.
- Everyday AppraisalRefs expire at successful Scene Transition.
- Consolidation operation `sourceIds` resolve only to AppraisalRefs.
- Candidate Appraisal entities are deleted only after protected-reference analysis.

### Event Knowledge V2

Common Event fields:

```js
interface EventKnowledgeV2 {
    version: 2;
    eventKind: 'observed' | 'reported';
    eventId: string;
    sceneId: string;
    clock: string;
    sourceMessageIds?: number[];
    summaryEn: string;
    activationSchemaIds: string[];
    participantActorIds: string[];
    witnessActorIds: string[];
    witnessCohortIds: string[];
    witnessBasis: Record<string, WitnessBasisV2>;
    perception?: PerceptionV1;
    knownToPlayer: boolean;
    source:
        | 'post_turn_observer'
        | 'deterministic_fallback'
        | 'deterministic_repair'
        | 'structured_scene_opening'
        | 'social_event_boundary'
        | 'migration';
    report?: ReportedEventV2;
}

interface ReportedEventV2 {
    statementKind:
        'claim' | 'correction' | 'retraction';
    sourceSegmentRefs: {
        messageId: number;
        segmentIndex: number;
    }[];
    speakerId: string;
    recipientIds: string[];
    subjectIds: string[];
    aboutEventId: string;
    parentReportedEventId: string;
    distortionLevel: 0 | 1 | 2 | 3;
}
```

Observed Event invariants require non-empty `sourceMessageIds` plus the perception/witness contract, forbid `report`, and forbid witness basis `reported`. Event/Perception V2 formally allows the real-save `deterministic_repair` source.

Reported Event invariants:

- `report` is required and `summaryEn` is an objectively attributed communication, never an unqualified claim;
- new reported `summaryEn` is non-empty and at most 600 characters;
- `sourceMessageIds` is forbidden; non-empty `report.sourceSegmentRefs` owns exact source provenance and derives the unique message set;
- all source segment refs for one reported Event belong to one committed message/Scene/clock;
- `perception` is forbidden; the report's own speaker/recipient/witness basis is the audience authority and must not copy an unrelated base Event perception;
- NPC speaker uses `direct`; every NPC recipient uses `reported`; no other Event kind may use `reported`;
- `speakerId/recipientIds` are stable Actor IDs or `player`;
- `subjectIds` contains only supplied stable Actor IDs or `player` explicitly named in the report;
- exact source message/segment reference and transient source substring prove the speaker said the attributed content;
- `segmentIndex=-1` is legal only for a committed player message with `speakerId=player`; NPC reports require the exact nonnegative dialogue segment index and matching `actorId`;
- the proposal includes recipients plus exact audience evidence; the reducer requires every recipient in the direct/audible intersection of all cited base Events and excludes visual-only witnesses;
- without explicit target evidence, the proposal recipient set must equal the full direct/audible audience;
- `player` is a recipient only when the committed source is player-visible under existing Event authority;
- recipients are explicit participants; NPC recipients are included in witnesses with basis `reported`;
- `aboutEventId`, when present, resolves an Event but does not grant recipients visibility to it;
- `parentReportedEventId`, when present, resolves a reported Event and the speaker must have spoken or received it;
- `correction/retraction` requires a parent;
- report Event stable ID includes Scene, exact message/segment refs, speaker, sorted recipients, statement kind and exact source-statement fingerprint; model-generated `summaryEn` is excluded;
- multiple reported Events may cite the same message without ID collision;
- existing report fingerprints are supplied for deduplication; a retry may neither create a second ID nor rewrite immutable summary/body;
- report Events are append-only and never fade.

The existing `ActorEventKnowledgeV1` shape upgrades to V2 without adding State:

```text
direct[]     observed participants and report speakers
witnessed[]  grounded non-recipient witnesses
reported[]   explicit report recipients
```

`aboutEventId` is excluded from ordinary actor visibility and relational expansion. Only dedicated authority readers may follow it.

After `socialGraph.statements[]` removal, continuity `knownActorIds` derives from authorized report speaker/recipient/subject IDs and existing relationship edges.

### Social statements and structured claims

Reported Event is the only attributed statement text. `socialGraph.statements[]` and its generic statement projection are removed.

```js
interface SocialIdentityClaimV3 {
    id: string;
    subjectId: string;
    fieldPath: string;
    value: unknown;
    sourceKind: 'self' | 'other' | 'authority';
    reportedEventId: string;
    authoritySourceRef: string;
}

interface SocialRelationshipClaimV3 {
    id: string;
    subjectId: string;
    relationshipKind: string;
    targetRefId: string;
    sourceKind: 'self' | 'other' | 'authority';
    reportedEventId: string;
    authoritySourceRef: string;
}
```

Non-authority claim requires `reportedEventId`; speaker, recipients, Scene, messages and clock hydrate from that Event. Authority claim requires `authoritySourceRef` and has no reported Event. Claim records own structured interpretation only, not quoted text.

### Memory Synapse V2 Appraisal

```js
interface AppraisalV2 {
    id: string;
    observerId: string;
    targetId: string;
    summaryEn: string;
    sourceEventIds: string[];
    activationSchemaIds: string[];
    derivedSchemaIds: string[];
    contextTags: string[];
    confidence: number;
    status: 'provisional' | 'accepted' | 'superseded';
    knowledgeSource: string;
    committedClock: string;
    historicalClaimAllowed: boolean;
    supersedesAppraisalId?: string;
    supersededById?: string;
}
```

Historical Appraisal V2 has at least one canonical Event ID. It has no `sourceMessageIds` or `sceneId`; validators derive these from Events. Multi-Event Appraisals derive their Scene set for Schema stability from referenced Events. Non-historical migrated Appraisals may have no Event and cannot authorize historical callbacks.

The canonical source-message helper reads observed `sourceMessageIds` or derives the unique message set from reported `sourceSegmentRefs`; downstream readers never branch ad hoc.

`knowledgeSource` allows `participant|witness|reported|mixed`; `authorized_rumor/sourceRumorIds` are removed. A reported Appraisal is legal only when its observer is an explicit recipient of its source reported Event.

New stable Appraisal identity uses observer/target plus sorted Event IDs. Event remains the single owner of message, Scene, witness, objective summary and visibility.

### Protected Appraisal set

For a post-operation State, collect IDs from:

1. every Actor Memory `firstImpressionRef`;
2. every surviving tier AppraisalRef;
3. every Person Schema `supportAppraisalIds/counterAppraisalIds`;
4. every Appraisal `supersedesAppraisalId/supersededById`, including the Appraisal owning the chain field.

Deletion receives an explicit `candidateIds` set. It removes:

```text
candidateIds - protectedIds
```

It never removes unrelated unreferenced Appraisals and never examines Event entities for deletion.

### Social Graph V3 Relationship Evidence

```js
interface RelationshipEvidenceV3 {
    id: string;
    sourceActorId: string;
    targetActorId: string;
    eventId: string;
    appraisalId?: string;
    eventKind: SocialEventKind;
    dimensionDeltas: AppliedSocialDimensionDelta[];
    structuralTags: SocialStructuralTag[];
    emotionEffects: RelationshipEmotionEffect[];
    clock: string;
    turn: number;
}
```

V3 invariants:

- `eventId` resolves exactly one canonical Event.
- `sourceActorId` is an authorized participant, witness or explicit report recipient for that Event.
- optional `appraisalId` resolves an accepted Appraisal with `observerId=sourceActorId`, matching `targetId`, and containing `eventId` in `sourceEventIds`.
- `dimensionDeltas[].appliedDelta` is reducer authority; requested `delta` is retained only as calculation audit.
- receipt ID is stable over `sourceActorId/targetActorId/eventKind/eventId`.
- one receipt exists per directed pair/event kind/Event.
- no receipt owns prose, translation, message IDs, Scene ID, witnesses, Event lists or visibility.
- Event supplies objective text/provenance/visibility; Appraisal supplies subjective text and observer ACL.
- edge aggregate dimensions are materialized current state; deleting or clearing `appraisalId` never replays or reverses them.
- `emotionEffects` is structured short-lived relationship state, not a prose Appraisal. Edge `activeEmotions` remains its decaying materialization.

## Writer and Reader Ownership

| Fact | Unique writer | Readers |
| --- | --- | --- |
| detailed active Scene history | turn and transition reducers through Scene append | current UI, Performer, transition director, archive |
| archived detailed Scene history | Scene archive commit | archive UI, Knowledge |
| global semantic chronicle | accepted Scene Transition reducer | bounded Daily projection, Knowledge Scene projection |
| observed/reported Event | centralized Event reducer from grounded turn/opening/Social proposals | Actor Event Knowledge, Memory, Appraisal, Social, Knowledge |
| subjective Appraisal | accepted Appraisal reducers | Memory tiers, Schema, Relationship receipt, Knowledge, Dossier/activation |
| applied Relationship Evidence receipt | Social reducer after Event/Appraisal validation | relationship edge, ACL hydrator, relational graph |
| Appraisal expiration | Memory Consolidation and Scene Transition reducers only | validators and Knowledge rebuild observe result |
| objective Event | Event reducer only | EventRefs, Knowledge, Dossier/activation |

No UI, Prompt projector or Knowledge backend writes these facts.

## Relationship Reference Design

### New-write sequence

```text
turn commit
-> canonical observed Event
-> local observer Appraisal for direct/witnessed reactions

event-boundary Social Director
-> scans exact committed dialogue once
-> proposes zero or more reported Events
-> deterministic Event reducer validates speaker/recipient/message evidence
-> idempotently adds Everyday EventRefs for NPC speaker/recipients
-> optionally accepts recipient Appraisals referencing the reported Event
-> proposes sourceActorId/targetActorId/eventId/appraisalId?/relationship effects
-> deterministic Social reducer validates references and ACL
-> reducer calculates applied deltas
-> persists Relationship Evidence V3 receipt
```

The Social Director may propose a reported Event only by copying an exact attributed statement substring and exact source message IDs already present in `sceneEvidence`. The reducer, not the model, builds the objective Event summary, Event ID, participants, witnesses and `reported` basis. The Social Director may propose a recipient Appraisal keyed to the same local report proposal; the reducer maps it to the committed Event ID.

The reducer validates proposed recipient IDs against the cited Event intersection and exact audience evidence. Player speaker/recipient is resolved from committed user/player-visible message authority rather than NPC Actor membership.

Every committed reported Event adds an idempotent Everyday EventRef for each NPC speaker/recipient. These refs are not Appraisal clustering sources and never expire.

Relationship receipts never submit duplicated source messages, Scene, witnesses or summary. If no Appraisal exists, an Event-only relationship receipt remains valid.

### Read sequence

For a receipt:

1. resolve the Event and reject/omit dangling receipts;
2. if `appraisalId` exists and the reader is authorized, hydrate the Appraisal;
3. otherwise hydrate the Event when the reader may see it;
4. otherwise omit detail while keeping authorized aggregate edge values.

For a reported Event, recipients receive only its attributed `summaryEn`. `aboutEventId` does not enter source refs, actor capsules or ordinary graph traversal.

Prompt/Knowledge observer ACL remains private to `appraisal.observerId`. The existing player Dossier meta-view may show an Appraisal targeting `player`; inter-NPC Appraisals do not become player-visible merely because the player witnessed the Event.

Aggregate relationship visibility is separate from detail hydration: the player Dossier continues to read materialized `actor -> player` edge dimensions under its existing meta-view. Other inter-NPC edge/detail visibility requires a surviving authorized Event receipt or relationship claim; migration does not copy legacy Evidence visibility to preserve it.

### Reference change on consolidation/deletion

- When source Appraisals merge into one compatible Appraisal, receipts may rebind only if the replacement has the same observer/target pair and includes each receipt Event in `sourceEventIds`.
- Otherwise the receipt clears `appraisalId` and remains Event-only.
- Deleting a receipt is not part of ordinary Appraisal forgetting.
- Deleting an Appraisal never changes edge dimensions, tags or already applied audit deltas.

## Scene Transition Design

### Prompt change

The existing `createSceneTransitionPrompt()` already supplies `currentScene`, including `timelineEntries`. Add:

```json
{
  "globalChronicleSummaryEn": "40-80 word semantic chronicle of the closed scene"
}
```

Rules:

- source facts must be represented in `currentScene.timelineEntries`;
- summarize durable causal meaning rather than copying labels;
- do not copy `closureSummaryEn`;
- do not reveal hidden facts or future outcomes;
- no new User payload field is added.

The normalizer preserves the field but does not synthesize a fallback. The validator rejects missing, over/under-length or over-640-character values. `generateSceneTransitionPackage()` marks this as `INVALID_GLOBAL_CHRONICLE` and reports it immediately without entering the existing model repair loop.

Remove `relationshipUpdates` from the same Prompt Schema and all related rules, translation and reducer branches. The response normalizer deletes stray `relationshipUpdates/worldChanges` fields before validation; they never reach State or downstream readers and do not fail an otherwise valid transition. The measured static removal is 843 System/Schema characters; the field is not replaced because relationship interpretation belongs to Event-backed post-turn/event-boundary processing.

### Atomic reducer order

`applySceneTransition()` operates on its existing clone:

1. validate the complete package;
2. append closure to the old Scene timeline;
3. archive the old Scene;
4. append one chronicle entry keyed by old `scene.id`;
5. apply actor updates without creating transition relationship Appraisals;
6. replace remaining Everyday AppraisalRefs with their canonical EventRefs where available;
7. clear deleted Appraisal IDs from Relationship Evidence receipts;
8. delete only unprotected Appraisals from the explicit expired candidate set;
9. create the new active Scene and opening timeline entry;
10. validate timeline, Actor Memory, Appraisal, Relationship Evidence and Schema contracts;
11. return the clone for guarded save.

Any error throws before caller State replacement. Calendar Moment and Timeline Moment reuse the same reducer and therefore the same chronicle/expiration semantics.

No call to `ensureMemoryConsolidation()` is added to Scene Transition. If an async consolidation result becomes stale after a transition, the existing `timelineEpoch/stateRevision/boundaryId` guard rejects it.

## Memory Consolidation Design

### Validation

For every operation:

- every `sourceId` must resolve to an AppraisalRef owned by the reviewed actor;
- EventRef IDs are invalid operation sources;
- the same Appraisal source may appear in only one operation;
- existing Core promotion/downgrade rules remain;
- `forget` omits the merged summary.

Event records may still appear in bounded evidence supplied to the model, but they are not consumable source IDs.

Relationship-effect proposals:

- cite exactly one supplied `eventId`;
- may cite at most one supplied `appraisalId`;
- contain no prose/provenance fields;
- reference only candidate directed pairs authorized by the Event;
- remain bounded to 24 receipts per call.

Reported Event proposals:

- contain a transient `localReportId`, `statementKind`, `sourceStatementText`, `audienceEvidenceText`, attributed `summaryEn`, exact source message/segment refs, speaker, recipients, supplied subject IDs and optional Event links;
- source/audience evidence text must be exact substrings; NPC source must be a dialogue segment spoken by `speakerId`; player source must be the committed player message;
- `summaryEn` is the only persisted report prose and remains attributed; non-English player-source translation uses the existing medium language behavior and is not a new authority layer;
- every recipient must be direct/audible in every cited Event; explicit target evidence permits a subset, otherwise the set must equal the full eligible audience;
- `aboutEventId` may reference only a supplied Event the speaker can access;
- `parentReportedEventId` may reference only a supplied reported Event the speaker previously spoke/received;
- optional Event links must also occur in the cited segment's existing bounded `historicalClaims.sourceEventIds`; those ID-only refs are retained in `sceneEvidence` rather than stripped;
- contain exactly one attributed `summaryEn` proposal and no second claim/translation text, witness list, Scene, clock or Event ID;
- consolidate one source message to at most one report per speaker + recipient set;
- are capped at 24 per response;
- response requires `processedThroughMessageId`; reducer commits only that complete source-message prefix and advances the cursor only to it;
- `scanComplete=false` keeps existing catch-up pending for the suffix.

Recipient Appraisal proposals may reference `localReportId`; after Event commit they pass the ordinary Appraisal validator against the new reported Event.

Generic statement proposals are removed. Identity/relationship claim proposals reference `localReportId`; after Event commit the reducer writes structured claim records with `reportedEventId`.

### Reducer order

For one accepted payload:

1. clone State and validate the stale boundary guard;
2. validate and commit reported Events through the Event reducer;
3. add idempotent Everyday EventRefs for NPC report speakers/recipients;
4. map local report IDs to stable Event IDs;
5. validate recipient Appraisals against committed reported Events;
6. validate and apply relationship receipts, recording actual applied deltas;
7. create merged Appraisals/target refs for non-`forget` operations;
8. apply Person Schema operations;
9. rebind receipts to compatible merged Appraisals;
10. compute protected IDs and deterministic relationship retention from the resulting State;
11. promote qualifying new Appraisals to Recent;
12. for each non-qualifying/unlinked Appraisal, idempotently add its source EventRefs to Everyday, remove any AppraisalRef, and clear receipt `appraisalId`;
13. remove consumed source AppraisalRefs;
14. delete unprotected consumed/downgraded Appraisal entities;
15. mark the memory boundary consumed; advance Social cursor only to validated `processedThroughMessageId` and retain catch-up when incomplete;
16. run full Event, Actor Context, Social Graph and Memory Synapse validation.

Schema operations are applied before deletion so a source newly accepted as Schema support is retained for provenance.

For a new unprotected Appraisal, `relationshipRetained=true` when any linked accepted receipt has:

```text
max(abs(appliedDelta)) >= 4
OR a newly added structural tag
OR emotionEffects.intensity >= 3
```

The test uses actual reducer output. Requested model deltas, old edge totals and legacy Tina impact labels cannot satisfy it. A Schema or explicit merge operation executes first and independently protects/replaces its sources.

Knowledge synchronization remains after the durable State save. `replace: true` removes deleted Appraisal records and legacy Relationship Evidence text records from JSON/vector projections.

## Bounded Projections
### Daily Director

Replace:

```js
recentTimeline: state.timeline.slice(-contextPlan.recentMessageLimit)
```

with a deterministic projection:

```js
recentChronicle: select newest whole entries from globalChronicle.entries
```

Constraints:

- at most 3 entries;
- at most 1,400 serialized characters;
- select newest first, then restore chronological display order;
- never truncate `summaryEn`;
- if a single valid entry fits the per-entry 640-character contract, include it.

On migrated Tina, this changes 1,401 characters to 958 characters.

### Knowledge

For each archived Scene Knowledge record, look up the chronicle entry by the same `sceneId` and add one `Chronicle:` line. Do not create a second standalone record and do not copy the full chronicle into actor records.

Retrieval remains bounded by existing role access and `ragLimit`. Medium readers do not gain hidden high-tier access.

Relationship receipts create relational edges to the referenced Event/Appraisal but no standalone vector text. Search returns the existing Event/Appraisal record according to its ACL.

Generic Statement, identity claim and relationship claim standalone `social_evidence` records are removed. Structured claims create typed edges from the reported Event to subject/person reference only.

Reported Event Knowledge records are tagged as attributed reports. Their `aboutEventId` is stored only in authority data and creates no ordinary `derived_from` retrieval edge. Search/hydration never substitutes the underlying Event text for the reported Event.

For `eventKind=reported`, actor-visible Knowledge text is built only from `summaryEn`; record data contains event ID/kind, roles, subjects and clock only. It has no message source refs and no authority-only `aboutEventId/parentReportedEventId`. Full Event State remains authority/debug-only outside actor Prompt assembly.

### Social Director

Replace repeated `buildSocialAudienceProjection(...).relationships` bodies with:

- reviewable actor ID/name and MemoryRefs;
- only current relationship edge values for Event/Appraisal candidate pairs;
- bounded recent receipt IDs/fingerprints, never receipt text;
- only current review-cycle Appraisals and active Schemas;
- supplied canonical Events and source messages once.

Stable receipt ID deduplication remains reducer-owned; the model does not need the full historical Evidence table.

The same existing response adds bounded `reportedEvents/recipientAppraisals` and replaces statement prose with structured claim refs. No additional medium/local call is introduced.

No Prompt consumes the full `ActorEventKnowledge.reported[]` projection. Existing limits remain:

- Scene continuity: at most one newest Everyday Event/Appraisal per actor;
- LowTier memory activation: at most three Events per actor and eight globally;
- Social extraction: only Events belonging to the supplied message batch.

### Frontend

No projector exposes `globalChronicle` or raw Social Graph. Remove `timeline` from the app-level raw world projection. Existing Scene and Dossier projection shapes remain; `relationship.evidenceRefs` is hydrated from Appraisal/Event. Reported EventRefs use a distinct “heard/reported” source badge. Legacy `knownRumors` is removed. Translation behavior is not repaired in this revision.

## Migration

### `migrateTimelineChronicleV1(state)`

```text
clone source
-> deterministically finish missing Scene timeline arrays from legacy state.timeline
-> build one entry per archived Scene from closureSummaryEn || summaryEn
-> validate stable sceneId, endedClock, English seed and archive order
-> set timelineChronicleVersion/globalChronicle.version
-> delete state.timeline
-> validate no legacy reader requirement
-> return clone
```

Migration seeds are allowed to retain their existing 25-83 word length. The 40-80 word and 640-character rule applies to new transition output, not historical no-model seeds.

If any archived Scene lacks the required English seed or stable identity, migration fails without mutating the source.

### `migrateMemoryReferenceV3(state)`

```text
clone V2 source
-> find Everyday AppraisalRefs
-> resolve source Events and mark stale when no Event belongs to current scene.id
-> remove only stale AppraisalRefs
-> keep all EventRefs
-> compute protected IDs
-> delete only unprotected Appraisals from stale candidate IDs
-> set root/index version 3
-> validate all refs and schemas
-> return clone
```

The same atomic pass upgrades Memory Synapse V1 to V2:

```text
for each historical Appraisal
-> resolve every sourceEventId
-> require legacy sourceMessageIds to equal referenced Event message union
-> require legacy sceneId to equal the single referenced Scene when present
-> delete sourceMessageIds/sceneId

for each non-historical Appraisal
-> require no sourceEventIds
-> delete empty legacy sourceMessageIds/sceneId
```

Any mismatch fails without source mutation. No Appraisal/Event is invented.

### `migrateEventKnowledgeV2(state, chat)`

```text
clone Event V1 State
-> require legacy gossipPacks empty
-> require legacy worldNews/worldChangeLog empty
-> derive each Event clock from its committed source transaction
-> set eventKind=observed and version=2
-> preserve objective summary, Scene, messages, participants, witnesses,
   witness basis, perception, player visibility and activation provenance
-> remove gossipPacks/worldNews/worldChangeLog
-> remove sceneEnrichment.worldChanges
-> reject/remove causal-collapse rumor_route/rumor proposal values
-> reject authorized_rumor/sourceRumorIds Appraisals
-> set eventKnowledgeVersion=2
-> validate full Event/Actor Knowledge projection
```

All nine Tina Events have exact committed clocks. No archived prose is promoted into Event. Any non-empty legacy Gossip/News/Change Log fails migration because it lacks sufficient provenance; no model repair or text-to-Event conversion is allowed.

### `migrateSocialGraphV3(state)`

```text
clone Social Graph V2
-> build message-to-Event index from canonical eventKnowledge
-> for each legacy Evidence:
     exactly one same-Scene Event + every delta has appliedDelta
       => retain as V3 Event-only receipt
     zero or multiple Events => delete detail receipt
     missing appliedDelta => delete detail receipt; never copy requested delta
-> recompute retained receipt IDs from directed pair + event kind + Event ID
-> strip all duplicate text/provenance fields from retained receipts
-> prune edge evidenceIds to retained receipt IDs
-> preserve all edge aggregate dimensions and structural tags
-> preserve player Dossier actor->player aggregate meta-view, not legacy detail ACL
-> rebuild active emotions from retained receipts
-> delete legacy statement details; preserve raw chat/archive
   (none has complete exact statement + segment-level audience authority)
-> remove socialGraph.statements
-> replace non-authority claim provenance with reportedEventId
-> validate every receipt Event/Appraisal link
-> set socialGraph.version=3
```

Tina revision 61 maps 15 receipts uniquely, but 2 mapped receipts lack reducer-owned `appliedDelta`. Migration retains the 13 fully authoritative receipts and drops 89 no-Event, 1 multi-Event and 2 unknown-applied-delta receipts. It preserves 34 edge aggregates and retains 9 of 10 current active emotions. All 83 legacy Social Statement details are dropped while chat/archive remains.

All four migrations run on one clone before writable gameplay. They make no network/model call and are byte-idempotent on the second run. No GossipPack, old Social Evidence, Memory V2/V3 or `timeline/globalChronicle` dual read remains.

## Prompt Budget Design

Measured Tina revision 61:

| Prompt | Baseline | Approved-field projection | Product ceiling |
| --- | ---: | ---: | ---: |
| Medium transition | 202,929 | 202,596 after +510 chronicle/-843 relationship removal | <= 202,929 |
| High transition | 209,439 | 209,106 after +510 chronicle/-843 relationship removal | <= 209,439 |
| Daily Director | 151,541 total; timeline field 1,401 | chronicle field 958 | chronicle field <= 1,400 |
| Event-boundary Social Director | 608,552 message chars + 4,377 JSON Schema; `reviewableActors` 437,021; `existingSocialGraph` 81,450 | lean messages 193,670; Revision 4 design Schema 5,773 | messages <= 220,000; Schema <= 6,500; fields <= 60,000/50,000 |

Schema projection method: clone the production strict Schema, remove Statement (567 chars) and legacy Evidence (1,910 chars), then add report/Appraisal/claim/receipt/cursor branches. Result: 5,773 characters, +1,396 from baseline and 727 below target.

Implementation must remeasure through the production builders after:

1. Prompt rule/Schema change;
2. Daily reader switch;
3. Social Director reference-only input/output switch;
4. reported Event/recipient Appraisal output switch;
5. final migration against active Tina.

Full chronicle injection, unrelated Scene Transition duplication fixes and Actor Library changes are forbidden. Removing duplicated Social Evidence from the directly affected Social Director is required because the real builder currently exceeds its runtime-derived ceiling.

## Failure Handling

- Invalid chronicle proposal: reject the complete transition package.
- Duplicate `sceneId` with identical entry: idempotent no-op.
- Duplicate `sceneId` with different entry: fail transition.
- Invalid Appraisal dependency: fail the whole reducer.
- Report proposal lacks exact committed speaker/message evidence: reject the complete Social result.
- Recipient is not an audible/direct participant or `player`: reject the complete Social result.
- `aboutEventId` or parent report is unauthorized: reject the complete Social result.
- Reported Event summary is un-attributed: reject the complete Social result.
- Actor-visible reported Event projection contains source transcript text: fail Knowledge verification.
- Actor-visible reported Event record contains message/parent/about source refs: fail Knowledge verification.
- Non-empty legacy GossipPack: fail migration without source mutation.
- Non-empty legacy World News/Change Log: fail migration without source mutation.
- Missing/dangling receipt Event: reject the Social result.
- Invalid receipt Appraisal pair/Event: reject the Social result.
- Deleted Appraisal: atomically rebind to a compatible merge or clear to Event-only.
- Stale consolidation: discard without State write.
- Knowledge sync failure: preserve committed State and mark existing Knowledge diagnostics failed; retry normal rebuild later.
- Migration failure: no source mutation and no save.

## Verification Design

### Unit and contract tests

- turn writes only active Scene timeline;
- transition appends one chronicle entry and expires only Everyday AppraisalRefs;
- EventRefs remain byte-equivalent;
- observed/reported Event V2 variants validate exact roles and provenance;
- report recipients project only into `ActorEventKnowledge.reported[]`;
- report speakers/recipients receive one idempotent permanent Everyday EventRef;
- no Prompt contains the full reported Event ledger;
- reported Event never grants access through `aboutEventId`;
- reported Event actor Knowledge never expands full source-message transcript;
- propagation/correction/retraction append without overwriting parent Events;
- GossipPack/knownRumors writers and readers are absent;
- protected first-impression, Schema and supersede Appraisals remain;
- consolidation deletes unprotected source entities;
- relationship receipts store no prose/provenance copies;
- Event/Appraisal reference and ACL validation rejects mismatched pairs;
- player Dossier aggregate actor->player values survive detail deletion while unauthorized inter-NPC detail does not;
- Appraisal V2 derives messages/Scenes through Event and rejects copied provenance fields;
- meaningful/structural/emotion retention uses actual applied values;
- non-qualifying Appraisal becomes EventRef-only without reversing edge state;
- local unreferenced Appraisals outside explicit candidate IDs remain;
- failed reducers are atomic;
- version migration is idempotent and removes `state.timeline`;
- all former `state.timeline` readers are absent;
- Daily projection obeys entry/character limits;
- Social Director production builder is <= 220,000 characters with no repeated Evidence bodies;
- Knowledge Scene projection includes only matching chronicle text.
- Knowledge resolves receipt text through Event/Appraisal and creates no duplicate vector record.
- Knowledge creates no standalone Statement/identity-claim/relationship-claim text record.
- Knowledge indexes a reported Event as attributed communication, not as its allegation or linked true Event.

### Real-save build-only acceptance

Against active Tina:

- file SHA-256, bytes and mtime unchanged;
- projected chronicle entries: 12;
- projected Event version/root version: 2;
- projected Events: 9 observed, 0 reported, all with exact clocks;
- projected GossipPack/knownRumors fields: absent;
- projected Appraisals: 35;
- projected `memorySynapse.version`: 2 with zero Appraisal `sourceMessageIds/sceneId` fields;
- projected Everyday AppraisalRefs: 0;
- projected Everyday EventRefs: 31;
- projected Relationship Evidence receipts: 13 with zero summary/provenance-copy fields and complete applied deltas;
- projected relationship edges: 34 with unchanged aggregate dimensions;
- projected active relationship emotions: 9;
- projected Social Statement field: absent; 83 ungrounded structured details removed;
- projected `state.timeline`: absent;
- second migration: `changed=false`;
- medium/high/Daily/Social Prompt metrics pass the PRD ceilings;
- no model adapter or network call occurs.

### End-to-end acceptance after approval

On an isolated save copy:

1. commit a turn and verify one Scene entry/no global entry;
2. close the Scene through the normal workflow;
3. verify one archive, one chronicle entry and no Everyday AppraisalRefs;
4. commit an explicit attributed false/unlinked report to a bounded audience;
5. run event-boundary Social settlement and verify reported Event, recipient EventRefs and receipt/Appraisal references;
6. verify recipients retrieve only attributed summary while visual-only actors and `aboutEventId` truth remain hidden;
7. append a correction/retraction without mutating the parent report;
8. verify a weak Appraisal becomes Event-only while a meaningful one becomes Recent;
9. rebuild Knowledge and verify deleted Appraisal IDs and duplicate Social text are absent;
10. verify EventRefs, edge dimensions and protected Appraisals remain.
