# Timeline Compression and Appraisal Lifecycle PRD

## 1. Change ID and Status

- Change ID: `compact-timeline-appraisal-lifecycle`
- Artifact revision: `4`
- Status: Implemented and accepted
- Scope rule: revision 4 was explicitly approved by the user on 2026-08-13; the 2 receipts without authoritative `appliedDelta` must be deleted.

Related artifacts:

- [Technical spec](./spec.md)
- [Tasks](./tasks.md)
- [Checklist](./checklist.md)
- [Progress](./progress.md)
- [Runtime field contract](../hogwarts-runtime-contracts/state-fields.md)
- [Actor Memory contract](../hogwarts-runtime-contracts/actor-memory.md)

## 2. Problem and Evidence

### Timeline duplication

The production turn reducer writes the same `clock/label` object to both `state.timeline` and `scene.timelineEntries`. `state.timeline` then keeps only the latest 20 entries, while the Scene timeline and archived Scene timeline keep the detailed history.

The active Tina save proves:

- `state.timeline`: 20 entries.
- Current plus archived Scene timelines: 125 entries.
- 19 of the 20 rolling entries are exact `clock/label` duplicates of Scene timeline entries.
- `state.timeline` is therefore neither a durable global history nor a semantic summary.
- Daily Director is the only model Prompt reader of `state.timeline`; lifecycle repair, Knowledge clock fallback, UI projection and legacy repair also read it.
- `state.timeline` is missing from the living runtime field registry.

### Appraisal leakage

Memory Consolidation currently removes source `MemoryRef`s but leaves source Appraisal entities in `memorySynapse.appraisals`. Knowledge V2 indexes every remaining Appraisal, including those no longer referenced by any Actor Memory tier.

A model-free clone run proved that consolidating two sources changes 72 Appraisals to 73 while leaving two source Appraisals orphaned. This grows State and Knowledge even though the actor has forgotten the sources.

The active Tina save currently contains:

- 72 Appraisals.
- 62 Appraisal MemoryRefs and 31 Event MemoryRefs.
- 37 Everyday AppraisalRefs.
- 31 Everyday EventRefs.
- 10 first-impression protected Appraisals.
- No Person Schema or Appraisal supersede dependencies in this save.
- All 37 Everyday Appraisals are legacy, have no Scene ID, and would be removable under the new lifecycle.

### Duplicate subjective interpretation

Appraisal and Relationship Evidence currently store parallel English interpretation text for the same directed actor reaction. Relationship Evidence additionally stores a Chinese summary, source messages, Scene, witnesses and source Events even though those provenance facts belong to the canonical Event.

They are written by separate paths:

```text
committed Event
-> local observer Appraisal

the same Event/messages
-> medium Social Director Relationship Evidence
-> relationship dimension settlement
```

The active Tina save proves:

- 105 Relationship Evidence records across 34 directed relationship edges.
- 72 Appraisals, with zero source/pair matches to the 105 legacy Evidence records.
- Relationship Evidence English and Chinese summaries consume 25,742 bytes.
- No Relationship Evidence has an explicit `sourceEventIds` value.
- 15 Evidence records map uniquely to one canonical Event through source messages.
- 1 Evidence record maps ambiguously to two Events.
- 89 Evidence records have no canonical Event.
- All 105 Evidence IDs are referenced by current edges, but the 34 edge aggregate dimension values are already materialized independently.
- 83 legacy Social Statement text records consume 55,485 bytes and duplicate attributed speech/provenance.
- Only 3 statements have an exact speaker-dialogue substring plus one same-Scene canonical Event, but even those 3 lack exact segment-level audience proof; none can be safely converted into reported Event.

Relationship Evidence also contains relationship settlement data that Appraisal does not: applied dimension deltas, structural tags and short-lived emotion effects. Therefore the duplicated prose/provenance must be removed, while a lightweight relationship-effect receipt remains.

### Rumor is not durable Event authority

The current system has three disconnected representations:

```text
eventKnowledge        canonical hard facts
gossipPacks           active/faded free-text rumor versions
Appraisal.sourceRumorIds
                      optional proof that an observer heard a rumor
```

Production reconnaissance found:

- Event stores exact participant and witness ID arrays, not only counts.
- GossipPack predates canonical Event/Appraisal integration and stores `originEventEn/truthCoreEn/versionEn` as duplicate prose.
- The production Gossip writer writes no `sourceEventIds/sourceMessageIds`, but Appraisal and Knowledge rumor gates require those IDs.
- Scene Transition's real medium/high Prompt contains no `worldChanges/gossipUpdates`, so the normal model path does not request Gossip output.
- Rumor-derived Appraisal is generated after an ordinary turn, while GossipPack is created only during a 7+ day transition; no production workflow appraises a newly received rumor.
- An active pack fades after 28 days; `getActorKnownRumors()` and Event authorization then remove the actor's knowledge even though hearing the statement already happened.
- Adding Event IDs to a pack makes Knowledge expose the canonical Event summary/transcript to a recipient who heard only a distorted version.
- Appraisal cross-validation checks Event existence but not whether `sourceRumorIds` still exists or authorizes its observer.
- `ActorEventKnowledge.reported[]` already exists but is always empty.
- `gossipPacks/worldNews/worldChangeLog` are not registered in the living runtime field contract.
- All 72 scanned real Hogwarts JSONL saves contain zero GossipPack and zero rumor-derived Appraisal records.
- The same 72 saves contain zero `worldNews/worldChangeLog`; current Scene Transition Prompt also contains no `prophetBriefs`.
- Tina has 9 canonical Events covering only 3 of 12 archived Scenes; old Scene prose cannot be treated as missing hard Event authority.

The root defect is not that Rumor text belongs in Appraisal. It is that the system lacks a canonical, permanent Event for the hard fact “speaker communicated this attributed claim to these recipients.”

### Prompt baseline

The real production builders were run model-free against Tina revision 61 without changing file bytes, SHA-256 or mtime.

| Prompt | System chars | Output Schema chars | User chars | Total chars | Runtime max Prompt chars |
| --- | ---: | ---: | ---: | ---: | ---: |
| Medium Scene Transition | 15,370 | 1,589 | 187,559 | 202,929 | 298,080 |
| High Scene Transition | 15,363 | 1,589 | 194,076 | 209,439 | 298,080 |
| Daily Director | 2,351 | included | 149,190 | 151,541 | 298,080 |
| Event-boundary Social Director | 10,000 | 4,377 | 598,552 | 608,552 messages | 298,080 |

The Social Director measurement uses the active Tina State with a model-free reconstructed boundary containing 8 reviewable actors, 14 source messages and 7 canonical Events. Its separately supplied JSON response Schema is 4,377 characters; message content alone is 608,552. `reviewableActors` consumes 437,021 characters because the same Relationship Evidence bodies are hydrated into multiple actor projections; `existingSocialGraph` consumes another 81,450 characters. This direct duplicate reader must be removed in this change. Broader Scene Transition and low-tier Prompt deduplication remains deferred.

The existing local post-turn observer was also measured statically through its production constants: System 5,523 characters and JSON Schema 4,010 characters. A representative Tina input reconstructed from committed source messages was 11,168 characters before the complete player-turn sequence. Revision 4 does not add report extraction to this already constrained local Prompt; the existing Social Director replaces its Statement extraction instead.

## 3. Before

### Timeline

```text
Committed turn
-> append detailed entry to scene.timelineEntries
-> copy the same entry to state.timeline
-> delete state.timeline entries beyond the latest 20

Scene Transition
-> archive full Scene timeline
-> append closure and next opening to state.timeline
-> again keep only latest 20
```

`state.timeline` mixes turn events, closure summaries and next-scene openings. It is a rolling duplicate, not an append-only global chronicle.

### Appraisal

```text
Ordinary turn
-> write subjective Appraisal
-> add AppraisalRef to recent or everyday

Event-boundary Memory Consolidation
-> remove source MemoryRefs
-> create merged Appraisal
-> leave source Appraisal entities in memorySynapse

Scene Transition
-> retain all unpromoted Everyday AppraisalRefs indefinitely
-> relationshipUpdates creates impression/memory Appraisals without canonical Event references
```

Canonical Events and EventRefs are mixed into the same consolidation candidate list even though an Event is objective history and an Appraisal is a forgettable subjective interpretation.

### Relationship Evidence

```text
Relationship Evidence
-> stores its own English/Chinese explanation
-> stores sourceMessageIds, sceneId and witnessedBy beside Event provenance
-> stores relationship deltas and emotion effects
-> does not reference an Appraisal

Knowledge, actor capsules and UI
-> index or hydrate Relationship Evidence as another full text record
```

### Rumor

```text
7+ day Scene Transition payload
-> free-text GossipPack origin/truth/version
-> actor appears to know an active version
-> no canonical Event linkage in production
-> pack fades after 28 days

Appraisal/Knowledge rumor gate
-> expects Event/message-linked pack that production never writes
-> test fixtures manually supply the missing fields
```

## 4. After

### Scene timeline

`scene.timelineEntries[]` remains the detailed, append-only record of the active Scene. A successful Scene Transition appends its closure entry and archives the complete array. Runtime code does not edit or delete committed entries.

### Global chronicle

The old `state.timeline` field is deleted. Its replacement is:

```js
globalChronicle: {
    version: 1,
    entries: [{
        sceneId: 'closed_scene_id',
        endedClock: '1991-09-02 · 13:35',
        summaryEn: '40-80 word semantic chronicle entry',
    }],
}
```

Each successfully closed Scene contributes exactly one entry. The entry:

- compresses that Scene's committed `timelineEntries`;
- records durable cause and effect, decisions, relationship shifts and unresolved consequences;
- is a semantic chronicle for director retrieval, not a copied timeline label or a second closure summary;
- uses English authority, matching current Scene/Event/Appraisal language rules;
- is append-only and keyed by the stable closed `sceneId`;
- is never silently updated, deleted or regenerated.

`closureSummaryEn` remains the observable Scene closure used by archive/UI semantics. `globalChronicle.entries[].summaryEn` is the higher-level cross-Scene meaning. They are separate facts with separate purposes.

The Scene Transition director produces `globalChronicleSummaryEn` in the existing medium/high transition call. No second model call is added. A missing or invalid 40-80 word summary invalidates the transition package before State mutation and is reported immediately without an automatic model retry.

Knowledge V2 includes the chronicle summary in the corresponding Scene record, so existing high-tier retrieval can find it. No workflow receives the complete chronicle as a direct Prompt payload.

Daily Director replaces the old `recentTimeline` input with `recentChronicle`. It receives at most the latest three complete entries and at most 1,400 serialized characters. Oldest entries are omitted as whole entries; summaries are never truncated.

### Every spoken rumor is a typed Event

Event Knowledge upgrades to V2 and remains append-only. It has two strict variants:

```text
observed Event
  objective hard fact already supported by committed messages

reported Event
  objective hard fact that a speaker communicated an attributed claim
  the claim itself may be true, distorted, false or unlinked
```

A reported Event stores one objective statement:

```js
{
    version: 2,
    eventKind: 'reported',
    eventId: 'stable_reported_event_id',
    sceneId: 'committed_scene_id',
    clock: '1991-09-02 · 13:05',
    summaryEn:
        'Ron told Luna that Harry opened the Chamber.',
    participantActorIds: ['ron', 'luna'],
    witnessActorIds: ['ron', 'luna'],
    witnessCohortIds: [],
    witnessBasis: {
        ron: 'direct',
        luna: 'reported',
    },
    report: {
        statementKind: 'claim',
        sourceSegmentRefs: [{
            messageId: 201,
            segmentIndex: 3,
        }],
        speakerId: 'ron',
        recipientIds: ['luna'],
        subjectIds: ['harry'],
        aboutEventId: '',
        parentReportedEventId: '',
        distortionLevel: 1,
    },
    knownToPlayer: false,
    source: 'social_event_boundary',
}
```

The hard fact is that Ron told Luna the attributed sentence. The sentence's allegation is never promoted to world truth merely because it appears in Event.

Rules:

- `speakerId/recipientIds/subjectIds` may use stable Actor IDs or `player`.
- `subjectIds` contains only entities explicitly named by the attributed report;
- recipients are explicit participants and have `witnessBasis=reported`;
- speaker must be grounded in exact committed message/segment evidence;
- proposal `sourceStatementText/audienceEvidenceText` are transient exact source substrings; State stores only one attributed `summaryEn` plus message/segment references;
- observed Event owns `sourceMessageIds/perception`; reported Event owns only `report.sourceSegmentRefs`, from which message IDs derive without a second copy;
- the proposal supplies recipients and exact audience evidence; the reducer requires every recipient to be in the direct/audible intersection of all cited Events and rejects visual-only/absent actors;
- without explicit target evidence, recipients must equal the full direct/audible audience; the model cannot silently narrow or expand it;
- `player` becomes speaker/recipient only from committed user/player-visible message authority, never by entering NPC actor arrays;
- `aboutEventId` optionally links the claim to a true Event but is authority-only and never grants recipients access to that Event;
- `parentReportedEventId` optionally links a propagation/correction chain and requires the speaker to have received or spoken the parent;
- `statementKind` is `claim|correction|retraction`;
- a fabricated claim has no `aboutEventId`;
- `summaryEn` remains attributed prose; no second `claimEn` copy is stored;
- new reported `summaryEn` is at most 600 characters;
- stable ID derives from exact source refs/text fingerprint and roles, never from translated/model-generated `summaryEn`;
- correction/retraction creates a new Event and never overwrites history;
- Events are never deleted because propagation becomes old.

The existing event-boundary Social Director extracts reported Event proposals from the exact source messages it already scans. It may not invent offscreen propagation. The Event reducer deterministically validates speaker, recipients, source messages and optional links before committing. No new model call is added.

Each response contains at most 24 report proposals and a required `processedThroughMessageId`. Reports from one source message are consolidated per speaker + recipient set. The reducer advances `lastProcessedMessageId` only through the completely scanned message prefix; `scanComplete=false` leaves the existing catch-up pending for the remaining suffix. No source message may be skipped because an output cap was reached.

On commit, the Event reducer idempotently adds one Everyday EventRef to every NPC speaker and recipient. Player has no Actor Memory entry. These refs are permanent; Appraisal clustering or Scene Transition never removes them.

The unreachable free-text world-change authority is removed as one unit: `gossipPacks/gossipUpdates/getActorKnownRumors`, `worldNews/prophetBriefs/recentWorldNews`, `worldChangeLog`, and `sceneEnrichment.worldChanges`. Report salience/automatic propagation may be derived later from Event clock, but this revision does not fabricate unobserved propagation or news.

Daily causal-collapse proposal values `kind=rumor_route` and persistence target `rumor` are also removed. A causal fact cannot grant rumor knowledge without a committed reported Event.

`projectActorEventKnowledge()` fills:

- `direct[]` for speakers/direct participants;
- `reported[]` for explicit recipients;
- `witnessed[]` for other grounded observers.

Reported Event detail never hydrates its `aboutEventId` target into an actor capsule.

Continuity known-actor derivation replaces its old Statement dependency with reported Event speaker/recipient/subject IDs plus existing authorized relationship edges.

Reported Event State retains source message/segment IDs for authority audit. Actor-visible Knowledge records omit those IDs and authority-only `aboutEventId/parentReportedEventId`; recipient retrieval receives only attributed summary, roles, subjects and clock. Authority/debug readers inspect source messages from State outside actor Prompt assembly.

Full `ActorEventKnowledge.reported[]` is never injected into a Prompt. Existing bounded readers remain authoritative: continuity selects at most one newest Everyday memory per actor, and LowTier activation selects at most three Events per actor/eight globally. Older reported Events remain retrievable from Knowledge without direct full-history injection.

Social Statement and claim authority also converges on reported Event:

- `socialGraph.statements[]` is removed; there is no second generic statement projection or Prompt payload.
- `identityClaims[]/relationshipClaims[]` keep only structured semantic fields plus `reportedEventId`; they remove speaker/message/witness/clock copies.
- authority claims may instead carry an authority source ref and do not pretend to be spoken reports.
- person references remain a separate resolution index and contain no claim prose.

### One subjective interpretation, one relationship receipt

Appraisal becomes the only authoritative subjective interpretation text. Event remains the only authoritative objective event text and provenance. Historical Appraisal V2 stores `sourceEventIds` but no longer copies Event `sceneId/sourceMessageIds/sourceRumorIds`; these are resolved through observed or reported Event. `knowledgeSource=reported` replaces `authorized_rumor`. Relationship Evidence V3 becomes a lightweight applied relationship receipt:

```js
{
    id: 'stable_relationship_evidence_id',
    sourceActorId: 'observer_actor_id',
    targetActorId: 'player_or_actor_id',
    eventId: 'canonical_event_id',
    appraisalId: 'optional_appraisal_id',
    eventKind: 'support',
    dimensionDeltas: [{
        dimension: 'trust',
        delta: 4,
        impact: 'meaningful',
        appliedDelta: 3.8,
        repeatMultiplier: 1,
        saturationMultiplier: 0.95,
        asymmetryMultiplier: 1,
    }],
    structuralTags: [],
    emotionEffects: [{
        emotion: 'gratitude',
        intensity: 3,
    }],
    clock: '1991-09-02 · 13:05',
    turn: 97,
}
```

Relationship Evidence V3 never stores:

- `summary` or `summaryEn`;
- `sourceMessageIds`, `sceneId` or `witnessedBy`;
- `sourceEventIds`, visibility or translated-text copies.

Those facts resolve through `eventId`. `appraisalId` is optional:

- when present, it must name an accepted Appraisal whose observer/target pair matches the Evidence and whose `sourceEventIds` contains `eventId`;
- when absent, the relationship change is explained only by the Event;
- deleting an Appraisal clears/rebinds `appraisalId` but never reverses an already applied relationship delta.

New stable Evidence identity derives from `sourceActorId + targetActorId + eventKind + eventId`. The reducer still owns final dimension values and persists actual `appliedDelta`, not the model's requested change.

Readers hydrate by authority:

- observer-private Prompt/Knowledge may resolve the linked Appraisal;
- player Dossier may resolve a player-targeting Appraisal under its existing meta-view rule;
- player Dossier continues to show the materialized `actor -> player` aggregate relationship values even when legacy detail is abandoned;
- other readers resolve the Event when allowed;
- if neither referenced record is visible, the Evidence detail is omitted.

Relationship Evidence and structured Social claims are no longer standalone vector text records. Knowledge keeps Event/Appraisal records once and represents receipts/claims only as typed reference edges from the reported Event.

Scene Transition `relationshipUpdates` is removed from its Prompt Schema, translation and reducer. If a model still emits `relationshipUpdates` or `worldChanges`, the response normalizer discards those non-authoritative fields without failing the transition or persisting them. This is not a compatibility reader: no State writer or downstream reader receives either field. Pending social effects from the closed Scene continue through the existing carried event-boundary workflow; Scene closure does not create another interpretation source.

### Appraisal consolidation

The existing event-boundary Memory Consolidation remains the only periodic model-assisted clustering call. It keeps the existing minimum review interval and event-boundary trigger.

Consolidation operations may consume only Appraisal MemoryRefs. EventRefs remain read-only evidence and are never removed by Appraisal clustering. In the same existing event-boundary call, Social Director outputs relationship receipts using `eventId` and an optional existing `appraisalId`; it does not output another summary.

For each accepted operation, one atomic reducer transaction:

1. settles relationship receipts and records actual applied deltas;
2. creates the merged Recent/Core Appraisal when the target is not `forget`;
3. applies accepted Person Schema operations;
4. rebinds compatible Relationship Evidence from source Appraisals to the merged Appraisal;
5. removes the consumed source AppraisalRefs;
6. downgrades every unprotected, unretained cycle Appraisal to its canonical EventRef and clears its remaining Evidence `appraisalId`;
7. deletes each consumed/downgraded source Appraisal entity only when no protected dependency remains;
8. validates all surviving refs before commit.

Protected Appraisal dependencies are:

- any `firstImpressionRef`;
- any surviving Actor Memory tier ref;
- any Person Schema `supportAppraisalIds` or `counterAppraisalIds`;
- either side of an Appraisal `supersedesAppraisalId/supersededById` chain.

A protected source loses the consumed tier ref but remains in `memorySynapse.appraisals` for provenance.

For a newly reviewed cycle Appraisal not already protected, the deterministic relationship-retention condition is satisfied when at least one linked, accepted receipt:

- has any `abs(appliedDelta) >= 4` (`meaningful` or stronger);
- adds a structural relationship tag not previously present on the edge; or
- creates an emotion effect with intensity at least 3.

A qualifying Appraisal is placed in `recent`. For a non-qualifying or unlinked Appraisal, each source Event is idempotently added to Actor Memory `everyday`, any AppraisalRef is removed, its receipt becomes Event-only, and the Appraisal is deleted when otherwise unprotected. Schema/consolidation operations run first, so repeated small reactions may still become protected as a valid pattern before this check.

### Scene-boundary evaporation

There is no turn-count TTL.

On a successful Scene Transition, the same atomic transition reducer:

1. replaces every remaining Everyday AppraisalRef with its canonical EventRef(s);
2. removes legacy/non-historical Everyday AppraisalRefs that have no Event;
3. preserves every existing Everyday EventRef unchanged;
4. clears the deleted Appraisal from Relationship Evidence, leaving `eventId`;
5. deletes each newly unreferenced Appraisal entity unless it has a protected dependency;
6. validates Actor Memory, Appraisal, Relationship Evidence and Schema links before commit.

Failed or cancelled transitions remove nothing. Scene-boundary cleanup is deterministic and adds no model call.

## 5. In Scope

- Add `globalChronicle.version/entries[]`.
- Add one `globalChronicleSummaryEn` field to the existing Scene Transition output.
- Keep active and archived Scene timelines append-only.
- Remove all production writers/readers of legacy `state.timeline`.
- Switch Daily Director from bounded rolling timeline copies to bounded chronicle entries.
- Add chronicle text to the existing Knowledge Scene projection.
- Upgrade Memory Reference semantics from V2 to V3.
- Upgrade Event Knowledge and Actor Event Knowledge to V2.
- Upgrade Memory Synapse/Appraisal provenance to V2 Event references.
- Upgrade Social Graph from V2 to V3 Relationship Evidence references.
- Replace GossipPack authority with permanent reported Events.
- Remove the sibling free-text Prophet/world-change authority path.
- Replace Social Statement prose with reported Events and claim references.
- Populate the existing `ActorEventKnowledge.reported[]` projection.
- Remove duplicated Relationship Evidence prose and Event provenance.
- Remove Scene Transition `relationshipUpdates` and its Event-less Appraisal writer.
- Make Event/Appraisal the only text records behind relationship receipts.
- Replace the oversized Social Director relationship payload with bounded ID/edge projections.
- Delete consumed, forgotten and expired Appraisal entities when unprotected.
- Preserve protected Appraisals and all canonical Events/EventRefs.
- Atomically migrate current saves without a model call or compatibility period.

## 6. Non-Goals

- No general Prompt deduplication.
- No change to repeated Event hydration across actor continuity capsules.
- No rewrite of full Actor Library or map authority payloads.
- No new RAG, Qdrant or model call.
- No language unification, translation cache or Chinese-display repair. Hydrated Event/Appraisal English may appear until the later language project.
- No new player-source translation contract. Existing medium Social output supplies English `summaryEn`; exact original player text remains only in the referenced message.
- No Event deletion or EventRef evaporation.
- No automatic offscreen rumor propagation or invented long-transition gossip.
- No automatic offscreen Prophet news generation.
- No UI redesign, new timeline page or chronicle viewer.
- No recalculation or rebalance of already materialized relationship dimension values.
- No turn-based TTL.
- No compatibility dual-read, dual-write or fallback projector.
- No general Prompt deduplication outside the directly affected Social Director projections.

## 7. Runtime Contract Impact

### Added

| Field | Authority | Writer | Readers |
| --- | --- | --- | --- |
| `timelineChronicleVersion` | timeline cutover version | initial world and one-time migration | lifecycle validator |
| `globalChronicle.version` | chronicle Schema version | initial world and one-time migration | lifecycle validator |
| `globalChronicle.entries[]` | one semantic summary per closed Scene | Scene Transition reducer | Daily projection, Knowledge Scene projector |
| Scene Transition proposal `globalChronicleSummaryEn` | proposed semantic compression of the closing Scene timeline | medium/high Scene Transition model, accepted by validator | Scene Transition reducer only |
| `socialGraph.version=3` | Social Graph reference contract version | initial world and one-time migration | Social validator/projectors |
| `socialGraph.relationshipEvidence[]` V3 | applied relationship receipt with required Event and optional Appraisal reference | Social reducer | relationship edges, ACL hydration, relational graph |
| `memorySynapse.version=2` Appraisal | subjective text plus Event IDs; no copied Event message/Scene provenance | Appraisal reducer and atomic migration | Schema, MemoryRef, Relationship Evidence, Knowledge |
| `eventKnowledgeVersion=2` | typed observed/reported Event contract | initial world and atomic migration | Event validator/projectors |
| `eventKnowledge[].eventKind/report/clock` | permanent hard fact for observed action or attributed communication | Event reducer from grounded turn/opening/Social proposals | Actor Memory, Knowledge, Social, Appraisal |

### Changed

- `scene.timelineEntries[]`: explicitly append-only after commit.
- `sceneArchive[].timelineEntries[]`: immutable after archive commit.
- `actorMemoryIndex`: version 3 semantics remove expired/consumed AppraisalRefs while preserving EventRefs.
- `memorySynapse.appraisals[]`: no longer retains unprotected entities after their final live use disappears.
- Historical Appraisal provenance resolves `sceneId/sourceMessageIds/witnesses` through `sourceEventIds`.
- Event readers distinguish `observed` hard facts from attributed `reported` claims.
- `ActorEventKnowledge.reported[]` contains recipient-visible reported Events.
- `socialGraph.relationships[].evidenceIds`: references only valid V3 receipts; aggregate dimensions/tags remain authoritative when old detail is dropped.
- `ActorDossierViewModelV1.relationship.evidenceRefs`: keeps its frontend shape but hydrates text/provenance from Appraisal/Event.
- Knowledge no longer creates duplicate full-text records for Relationship Evidence.
- Knowledge Scene records add the authoritative chronicle summary by `sceneId`.

### Removed

- `state.timeline`: rolling 20-entry duplicate.
- Daily Prompt `recentTimeline`.
- Lifecycle, Knowledge, repair and UI fallbacks that depend on `state.timeline`.
- Relationship Evidence `summary/summaryEn/sourceMessageIds/sceneId/witnessedBy/sourceEventIds/visibility` copies.
- `socialGraph.statements[]` prose/provenance copies.
- Identity/relationship claim speaker/message/witness/clock copies; non-authority claims reference a reported Event.
- Historical Appraisal `sourceMessageIds/sceneId` copies.
- Appraisal `sourceRumorIds` and `knowledgeSource=authorized_rumor`.
- Social Director output `relationshipEvidence[].summaryEn/summary/sourceMessageIds/sceneId/witnessedBy`.
- Scene Transition output `relationshipUpdates[]` and its transition Appraisal writes.
- `gossipPacks/gossipUpdates/knownRumors`, `worldNews/prophetBriefs/recentWorldNews`, `worldChangeLog`, `sceneEnrichment.worldChanges`, and free-text world-change authority.
- causal-collapse `rumor_route` kind and `rumor` persistence target.

The living registry and Actor Memory contract must be updated in the same change.

## 8. Migration and Compatibility

Migration is one-time, local, model-free and atomic.

### Timeline migration

On a cloned State:

1. complete any missing current/archive `timelineEntries` from the legacy rolling field using the existing deterministic clock-window rule;
2. require every archived Scene to have stable `sceneId`, `endedClock` and English `closureSummaryEn` or `summaryEn`;
3. create one chronicle entry per archived Scene in archive order, using the existing English Scene compression as the no-model legacy seed;
4. set `timelineChronicleVersion=1` and `globalChronicle.version=1`;
5. delete `state.timeline`;
6. validate unique Scene IDs, chronological order and exact archive coverage.

The legacy seed is not regenerated or paraphrased because migration must not call a model or invent history. Future entries use the dedicated semantic field.

If a required archived Scene cannot produce a valid seed, migration fails and the source State remains byte-equivalent. There is no localized-text fallback into `summaryEn`.

### Memory Reference V3 migration

On the same clone:

1. preserve every EventRef;
2. remove Everyday AppraisalRefs whose referenced Events do not belong to the current Scene, including legacy records with no Event;
3. preserve current-Scene Event-backed Everyday AppraisalRefs until the next successful transition;
4. delete the Appraisal entities whose refs were removed by step 2 only when they have no surviving tier, first-impression, Schema or supersede dependency;
5. set root and index Memory Reference versions to `3`;
6. validate all Event/Appraisal/Schema links.

The migration does not sweep unrelated unreferenced Appraisals. Provenance-backed Appraisals created for later Person Schema consolidation may intentionally exist without an Actor Memory tier ref; only explicit consolidation/expiration candidates are eligible for deletion.

The same pass upgrades Memory Synapse to V2:

1. historical Appraisals must resolve every `sourceEventId`;
2. their legacy `sourceMessageIds/sceneId` must exactly match the referenced Event set before those fields are removed;
3. `sourceRumorIds` must be empty in the scanned active saves, then the field is removed;
4. `knowledgeSource=authorized_rumor` is rejected during migration; future reported knowledge uses a reported Event;
5. non-historical migrated Appraisals may retain no Event and remain non-authoritative for historical callback;
6. new Appraisal IDs derive from observer/target and canonical Event IDs, not duplicated message/Scene fields;
7. any mismatch fails the atomic migration instead of guessing.

### Event Knowledge V2 and Gossip removal migration

On the same clone:

1. require `gossipPacks/worldNews/worldChangeLog` to be empty; all 72 scanned real Hogwarts saves satisfy this condition;
2. any non-empty legacy value causes atomic failure because its free text has no trustworthy Event/source linkage and must not become hard fact;
3. remove those root fields and `sceneEnrichment.worldChanges`;
4. remove `gossipUpdates/prophetBriefs` from transition state/schema and `recentWorldNews` from projections;
5. migrate every Event V1 to `eventKind=observed`;
6. derive exact Event `clock` from the committed source transaction; all 9 active Tina Events have one;
7. retain existing `sceneId/sourceMessageIds/summaryEn/participants/witnesses/perception`;
8. set Event/root version `2`;
9. validate that no reported Event exists without exact speaker, recipient and committed message evidence.

Tina projects:

- Event count: 9 -> 9.
- Event kinds: 9 observed, 0 reported.
- Events with exact clock: 9/9.
- GossipPack: absent -> field removed.
- World News/Change Log: absent -> fields removed.
- Rumor-derived Appraisal: 0 -> 0.

No archived Scene text is converted into Event. Tina has canonical Events for only 3 of 12 archived Scenes, so the other 9 Scenes remain archives rather than fabricated Event authority.

### Social Graph V3 migration

On the same clone:

1. preserve all 34 relationship edges, aggregate dimensions and structural tags;
2. map legacy Evidence to an Event only when its source messages identify exactly one canonical Event in the same Scene;
3. migrate only the 13 uniquely mapped Evidence records whose every dimension has authoritative `appliedDelta`, recomputing the V3 stable ID and preserving deltas, tags, valid emotion effects, clock and turn;
4. set `appraisalId` absent because no legacy Tina Appraisal matches the required source/pair;
5. delete the 89 no-Event records, 1 multi-Event record and 2 uniquely mapped records lacking `appliedDelta`; never substitute requested `delta`;
6. remove deleted Evidence IDs from edges;
7. rebuild active emotions only from retained receipts, dropping any emotion whose source receipt was deleted;
8. preserve player Dossier access to `actor -> player` aggregate edge values, but do not preserve legacy Evidence visibility or inter-NPC detail without a canonical Event/claim;
9. do not convert legacy Social Statement text into Event because none has complete exact statement plus segment-level audience authority;
10. Tina deletes all 83 legacy structured statement details; original chat and Scene Archive messages remain unchanged;
11. reject any identity/relationship claim whose non-authority source cannot resolve an existing reported Event;
12. remove `socialGraph.statements[]`; convert claim provenance to `reportedEventId`;
13. set Social Graph version `3` and validate all Event/Appraisal/claim references.

For the active Tina baseline, this means 105 legacy Evidence records become 13 lightweight Event-only receipts; 92 Evidence details and all 83 structured Statement details are intentionally abandoned. Ten active emotions become nine because one depended on the ambiguous deleted receipt. The two newly rejected receipts have no emotion effects. Existing relationship dimension totals are not replayed or changed.

On the active Tina baseline this projects:

- Appraisals: 72 -> 35.
- Everyday AppraisalRefs: 37 -> 0.
- Everyday EventRefs: 31 -> 31.
- First-impression protected Appraisals: 10 -> 10.
- Relationship Evidence: 105 text records -> 13 lightweight receipts.
- Relationship Evidence summary fields: 210 -> 0.
- Relationship edges: 34 -> 34 with unchanged aggregate dimensions.
- Active relationship emotions: 10 -> 9.
- Social Statements: 83 text records -> field removed; raw chat/archive retained.
- Global chronicle entries: 0 -> 12.
- Legacy `state.timeline`: 20 -> field absent.

The second migration run must return `changed=false`. No old field reader remains after successful migration.

Rollback requires restoring the pre-migration JSONL backup. Automatic downgrade is forbidden because Appraisal deletion is intentionally irreversible.

## 9. Prompt Field Budget

Configured medium/high runtime:

- `contextSize=120,000`
- `maxResponseLength=12,000`
- `createContextBudgetPlan(...).maxPromptCharacters=298,080`

Proposed product targets become authoritative only when this PRD revision is approved.

| Change | Source | Audience | Before chars | Projected after | Hard target | Omission/trimming | Protected |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| Scene Transition semantic rule | static workflow contract | medium/high transition | 0 | +396 | <= 500 | never omitted | Yes |
| Output Schema `globalChronicleSummaryEn` | static workflow Schema | medium/high transition | 0 | +114 | <= 200 | never omitted | Yes |
| Remove Scene Transition relationship-memory rules/Schema | obsolete Event-less Appraisal writer | medium/high transition | 843 | -843 | exact removal | remove complete field/rules | Yes |
| Scene Transition User payload | existing current Scene already contains timeline | medium/high transition | unchanged | +0 | +0 | no new chronicle payload | Existing protected fields unchanged |
| Model response field | closing Scene timeline | transition reducer | 0 | 40-80 words, <= 640 chars | <= 640 chars | invalid package is rejected | Yes |
| Daily `recentChronicle` | `globalChronicle.entries[]` | medium Daily Director | `recentTimeline` 1,401 on Tina | 958 on migrated Tina | <= 1,400 serialized chars and <= 3 entries | omit oldest whole entries | No |
| Knowledge Scene projection | chronicle entry selected by existing retrieval | high-tier authorized retrieval | 0 direct Prompt chars | no direct injection | existing `ragLimit` | existing retrieval omission | No |
| Social `reviewableActors` | bounded actor refs/current relevant edges | medium Social Director | 437,021 | measured lean 57,180 | <= 60,000 | omit unrelated pairs; no embedded Evidence body | Yes |
| Social `existingSocialGraph` | current edge calibration + bounded stable IDs | medium Social Director | 81,450 | measured lean 46,409 | <= 50,000 | omit Evidence prose/provenance and old unrelated receipts | No |
| Social output receipt | Event/Appraisal IDs + proposed structured effects | medium Social Director | duplicate summary/message/Scene fields | no duplicate text/provenance | <= current output Schema | invalid IDs rejected | Yes |
| Social reported Event output | exact message-grounded speaker/recipient/report links | medium Social Director | absent | replaces legacy GossipPack extraction | <= 24 proposals; no extra prose copy | invalid proposal rejected | Yes |
| Social statements/claims | attributed text + duplicated provenance | medium Social Director | 83 Tina text records | reported Event + structured claim refs | no statement prose in Social Graph | invalid/unresolved ref rejected | Yes |
| Social source-segment claim refs | existing bounded `historicalClaims.sourceEventIds` | medium Social Director | currently stripped from `sceneEvidence` | ID-only link candidates | <= 2,000 chars per batch | omit links, not source dialogue | No |
| Social JSON response Schema | static structured-output contract | medium Social Director | 4,377 | measured Revision 4 design: 5,773 | <= 6,500 | never truncated | Yes |
| Mandatory `knownRumors/recentWorldNews` | legacy Gossip/Prophet projection | matching actor/director | 0 on Tina | removed | -100% | reported Events use existing bounded event activation | No |
| Reported Event memory | permanent EventRef, Event summary resolved on demand | matching speaker/recipient | absent | existing continuity/LowTier limits | continuity Everyday <=1; LowTier <=3/actor, <=8 global | omit older whole Events from Prompt only | No |

Projected Scene Transition totals with +510 chronicle characters and -843 obsolete relationship characters:

- Medium: 202,596 characters.
- High: 209,106 characters.
- Output Schema: 1,589 -> 1,488 characters.

Hard product gate for this revision:

- Medium total <= 202,929 baseline characters.
- High total <= 209,439 baseline characters.
- Event-boundary Social Director total <= 220,000 characters and runtime ceiling 298,080.
- Social JSON response Schema <= 6,500 characters.
- No System Prompt or output Schema truncation.
- No change to the protected LowTier System Prompt or its existing extra 203 characters.

The direct Social Director duplicate projections are in scope because the affected workflow currently exceeds runtime budget. General actor/Event Prompt deduplication elsewhere is explicitly deferred.

The 5,773-character projection was measured by cloning the production strict Schema, removing the 567-character Statement and 1,910-character legacy Evidence branches, then adding the decision-complete report, recipient Appraisal, structured claim, compact receipt and cursor branches. Projected delta is +1,396 characters.

## 10. Frontend Field Whitelist

No new frontend field is approved.

Existing allowed reads remain:

- `scene.timelineEntries[]` for current “现场记录”.
- `sceneArchive[].timelineEntries[]` through existing archive projections.
- `ActorDossierViewModelV1.memories.core/recent/everyday`.
- `ActorDossierViewModelV1.relationship.evidenceRefs`, hydrated from referenced Appraisal/Event rather than raw Evidence text.
- `ActorDossierViewModelV1.memories`, with reported EventRefs labeled as heard/reported rather than shared eyewitness events.

Forbidden frontend reads/writes:

- `globalChronicle`.
- raw `memorySynapse.appraisals`.
- raw `actorMemoryIndex`.
- raw `socialGraph.relationshipEvidence`.
- raw `gossipPacks` or legacy `knownRumors`.
- removed `state.timeline`.

The visible Everyday count may decrease after a transition or migration because AppraisalRefs become EventRefs. Relationship details may display English Event/Appraisal text; language unification is explicitly deferred. No component may cache deleted Evidence/Appraisal summaries.

## 11. Acceptance Criteria

1. A committed turn appends one detailed Scene timeline entry and writes no global duplicate.
2. A successful transition archives the complete Scene timeline and appends exactly one chronicle entry for that closed Scene.
3. Scene and chronicle entries are never removed or edited by ordinary runtime operations.
4. Chronicle summaries are 40-80 English words, use only closed Scene timeline facts and differ semantically from closure copy text.
5. Transition failure leaves Scene timeline, chronicle and Appraisal State unchanged.
6. `state.timeline` and every production reader/writer/fallback are absent after migration.
7. Daily Director reads at most three complete chronicle entries and at most 1,400 serialized characters.
8. Knowledge resolves a chronicle summary through the matching Scene record without injecting the full chronicle.
9. Every new Relationship Evidence has exactly one canonical `eventId` and at most one valid matching `appraisalId`.
10. Relationship Evidence persists no summary, message, Scene, witness, Event-list, visibility or translation copy.
11. Event V2 stores every reported claim as an attributed communication fact with exact speaker, recipients and source messages.
12. Reported claim text never becomes underlying world truth; optional `aboutEventId` grants no actor access.
13. Proposed report recipients are reducer-validated against direct/audible intersection and exact audience evidence; visual-only/absent listeners are rejected.
14. Recipient Knowledge exposes only attributed report summary/roles/subjects/clock, never source refs, full transcript, parent or `aboutEventId`.
15. Report IDs derive from exact source fingerprints rather than translated summary; propagation, correction and retraction append Events rather than overwrite history.
16. `ActorEventKnowledge.reported[]` contains recipient-visible report Events; no `knownRumors` projection remains.
17. Report commit adds idempotent permanent Everyday EventRefs for NPC speaker/recipients.
18. No Prompt directly injects full `ActorEventKnowledge.reported[]`; existing Event activation limits remain enforced.
19. Appraisal persists Event IDs but no Event message/Scene/witness/Rumor copy; `reported` replaces `authorized_rumor`.
20. Deleting Appraisal preserves the reported Event and recipient knowledge.
21. Player Dossier retains `actor -> player` aggregate relationship values after old detail removal; unauthorized inter-NPC detail does not remain visible.
22. Relationship scores use actual applied deltas and do not reverse when an Appraisal is deleted.
23. Consolidation accepts only Appraisal source IDs; existing EventRefs remain unchanged.
24. A qualifying relationship effect promotes its Appraisal to Recent; a non-qualifying Appraisal becomes EventRef-only after Schema/consolidation protection is applied.
25. Successful consolidation rebinds or clears Evidence references and deletes every unprotected consumed/downgraded Appraisal.
26. First-impression, Schema, surviving tier and supersede dependencies prevent entity deletion.
27. Successful Scene Transition replaces remaining Everyday AppraisalRefs with EventRefs where possible and preserves every existing Everyday EventRef.
28. Knowledge rebuild contains no deleted Appraisal or duplicate Statement/Social Claim/Relationship Evidence/Gossip text record.
29. Social Statement prose and generic statement projection are removed; structured claims reference reported Events.
30. Event V1 -> V2, Social Graph V2 -> V3, Memory Synapse V1 -> V2, Memory Reference V2 -> V3 and timeline migrations are atomic, model-free, idempotent and leave no dual-read path.
31. Tina migration retains 9 observed Events, creates no reported Event, retains 13 receipts, drops 92 Evidence and 83 Statement details, and preserves 34 edge aggregates.
32. Non-empty ungrounded legacy Gossip/News/Change Log blocks migration; empty real-save fields are deleted.
33. Scene Transition no longer accepts or writes `relationshipUpdates`, `impressionOfPlayerEn`, `sceneMemoryEn` or `gossipUpdates`.
34. Daily causal collapse cannot emit `rumor_route` or `rumor` persistence without a reported Event.
35. Real medium/high Scene Transition and Social Director Prompt builds stay within section 9 targets.
36. Social cursor advances only through `processedThroughMessageId`; capped output never skips an unprocessed source message.
37. Existing LowTier top-level shape and frontend projection shape do not change; language repair remains deferred.

## 12. Risks and Rollback

| Risk | Control |
| --- | --- |
| Legacy archive lacks an English seed | atomic migration fails before save; no localized fallback or fabricated summary |
| Appraisal still has hidden provenance use | deletion uses an explicit reachability set and final full-State validation |
| Schema operation protects a clustered source | remove its tier ref but retain the Appraisal entity |
| Private Appraisal leaks through public Evidence | hydrate Appraisal only under its reader ACL; otherwise use the Event or omit |
| Deleting Appraisal removes relationship history | receipt retains Event and applied deltas; aggregate edge values never reverse |
| Reported claim is treated as truth | Event summary must be explicitly attributed; `eventKind=reported`; `aboutEventId` is authority-only and excluded from actor expansion |
| Recipient gains exact underlying Event | reported Event grants access only to itself; no ACL inheritance across `aboutEventId` |
| Recipient sees unrelated text from the same message | ordinary reported Event Knowledge stores/indexes attributed summary only; message transcript is authority/debug-only |
| English report summary mistranslates a non-English player claim | preserve exact source message/segment reference; language-contract repair remains explicitly deferred |
| Speaker/recipient roles are guessed | proposal must cite exact committed message/segment; deterministic reducer validates IDs and dialogue attribution |
| Gossip stops circulating but actor forgets hearing it | no fading deletion; report Event and recipient projection remain permanent |
| Permanent report Events grow State/index | accepted tradeoff; State remains append-only while Prompt/retrieval stays bounded |
| Legacy GossipPack cannot be grounded | non-empty pack fails atomic migration; never convert free text into Event |
| Legacy world news cannot be grounded | non-empty news/log fails atomic migration; never convert a generated brief into Event |
| Legacy Social Statement lacks exact segment-level audience authority | preserve raw chat/archive and delete all 83 Tina structured details; create no Event |
| Legacy Evidence lacks Event | delete its detail and edge receipt ID; preserve already materialized edge dimensions |
| One legacy Evidence spans multiple Events | treat as ambiguous and drop detail; never guess or synthesize |
| Async consolidation returns after transition | existing epoch/revision/boundary stale guard rejects the late result |
| Chronicle grows without bound in State | this is intentional append-only history; Prompt readers remain bounded and Knowledge uses retrieval |
| Prompt grows through direct full-history injection | full chronicle injection is forbidden; only current Scene input and bounded readers are allowed |
| Migration is destructive | create normal save backup first; rollback restores that backup, never reverse-migrates |

## 13. Approval

Implementation approval: **Revision 4 approved on 2026-08-13**

Approval must explicitly cover artifact revision 4, including:

- separate append-only `globalChronicle`;
- 40-80 word transition output;
- removal of Scene Transition `relationshipUpdates` and Event-less Appraisal writes;
- deterministic Scene Transition evaporation of Everyday AppraisalRefs;
- Relationship Evidence V3 as an Event/Appraisal reference receipt with no text copy;
- Event Knowledge V2 observed/reported variants;
- permanent reported Events replacing GossipPack/fading;
- deletion of unreachable Gossip/Prophet free-text world-change authority;
- exact speaker/recipient/message grounding and authority-only `aboutEventId`;
- removal of `authorized_rumor/sourceRumorIds/knownRumors/gossipUpdates`;
- no automatic offscreen rumor propagation;
- deterministic `meaningful/structural/emotion` Appraisal retention condition;
- direct Social Director Prompt projection reduction;
- Tina migration retaining 13 receipts and abandoning 92 legacy Evidence details while preserving edge values;
- rejection of 2 Event-backed legacy receipts that lack authoritative `appliedDelta`, with no requested-delta substitution;
- Tina migration abandoning 83 ungrounded structured statement details while preserving raw chat/archive;
- language/display repair explicitly deferred;
- preservation of EventRefs and protected Appraisals;
- V2 -> V3 destructive atomic migration;
- the measured Prompt budgets;
- deferral of general Prompt deduplication.
