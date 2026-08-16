# Semantic Regex Hotspot Matrix

Status: current production evidence and unapproved target ownership,
2026-08-16.

This document supports [prd.md](./prd.md). Phase 1 registers and freezes these
paths; it does not change their behavior.

## Authority Rule

Regex may decide only character-level or finite-grammar facts. Meaningful
natural-language interpretation belongs to a semantic proposer. Embedding may
retrieve candidates but is never a verdict. State writes remain deterministic
Reducer decisions over validated structured proposals.

## Active Hotspots

| ID | Current owner | Current semantic decision | Current consequence | Target mechanism | Phase 1 action |
| --- | --- | --- | --- | --- | --- |
| VREG-001 | `domain/item-schema.js::inferDestroyedPhysicalForm` | whether destruction left remains or no physical matter | `item-reducer.js` writes `items[].physicalForm`; `absent` clears holder/location through Item normalization | structured semantic proposal plus deterministic Item invariant; no embedding verdict | register critical legacy path; no behavior change |
| VREG-002 | `domain/narrative-authority.js::validateNarrationConsistency` | whether prose is current fact, history/belief, possession, presence/life/room or Spell identity contradiction | hard-fails Scene Performance, Turn transaction or Scene Opening/Transition | bounded semantic claim extraction/classification plus deterministic authority comparison | register high-risk hard-reject path; no behavior change |
| VREG-003 | `domain/scene-transition.js::validateSceneOpeningExperienceSegments` | whether opening prose creates a promise, secret, relationship or Item transfer | hard-fails low Scene Opening | semantic claim classification plus deterministic committed-state comparison | register high-risk hard-reject path; no behavior change |
| VREG-004 | `presence-witness-contract.js::createDeterministicPerceptionFallback` plus `domain/perception-reconciliation.js` | whether an event is private/public, concealed, audible, visible and salient | may override valid local-model perception; changes Event witness scope and actor knowledge | local semantic perception proposal plus deterministic scope/ACL bounds | register high-risk override; no behavior change |
| VREG-005 | `adapters/local-semantic.js::projectObservedIdentityObservations` | whether prose shows visible injury or explicitly no visible injury | accepts, rejects or synthesizes Identity injury assessment | local semantic observation plus exact evidence span and deterministic actor/access checks | register high-risk writer gate; no behavior change |
| VREG-006 | `adapters/local-semantic.js::applyObservedActorUpdates` and event-boundary helpers | whether an actor departed or an interaction ended | writes or omits Actor Runtime presence/room/activity and boundary state | local semantic observation plus deterministic path/presence checks | register high-risk writer gate; no behavior change |
| VREG-007 | `local-semantic-adjudicator.js::shouldObserveInventory` | whether a turn might contain a durable Item operation | suppresses the local inventory model call on a negative regex result | deterministic structured directive or semantic routing; regex may add candidates but not suppress required work | register high-risk call gate; no behavior change |
| VREG-008 | `domain/inventory.js::projectObservedInventoryUpdates` and `domain/item-schema.js::isItemOperationEvidenceGrounded` | whether an Item is meaningful and whether prose proves a high-risk operation | silently omits Item candidate/operation before reducer | local semantic Item proposal plus exact evidence and deterministic Item transition checks | register high-risk adoption gate; no behavior change |
| VREG-009 | `domain/spell-state.js::resolveSpellObservation` and `settleSpellProgress` | whether player intent is spell observation and prose constitutes teaching/demonstration | triggers D20 path or writes Spellbook learning | semantic intent/teaching proposal plus deterministic catalog/outcome checks | register high-risk Spell writer; no behavior change |
| VREG-010 | `workflows/medium-calendar-director.js::detectExplicitCalendarCommitment` | whether player prose is a future commitment | schedules Medium Calendar work | semantic commitment proposal; regex may add a candidate only | register medium-risk scheduler gate; no behavior change |
| VREG-011 | `domain/knowledge-retrieval-planner.js::selectDeterministicIntents` | whether query asks cause, participant or pattern | adds retrieval subqueries while direct retrieval remains | regex/local planner for candidate routing; embedding ranks candidates | register accepted candidate-only use |
| VREG-012 | `domain/turn-time.js::validateSceneTemporalConsistency` | finite clock/date and quantified duration claims | rejects unsupported exact temporal claims | deterministic finite grammar plus clock arithmetic | register accepted lexical/deterministic use |
| VREG-013 | stable ID, world-clock, marker, directive, placeholder and Han-script patterns across domain modules | character-level syntax or source-language adoption | structural rejection or non-fatal language adoption | regex/lexical parser | register accepted lexical class |

## Writer And Reader Consequences

| Runtime fact | Current semantic source | Sole final writer | Principal readers |
| --- | --- | --- | --- |
| `items[].physicalForm/holderId/location` | Low/local Item proposal plus destruction regex | Item Reducer | Authority Snapshot, movement, UI, Scene Opening |
| Event perception and witnesses | local post-turn model plus deterministic regex fallback | Event/presence reducer | Actor knowledge, Social, Appraisal, Knowledge |
| Identity injury assessment | local post-turn model plus regex evidence gate/synthesis | Identity observation reducer | Dossier, Prompt projection, diagnostics |
| Actor presence/room/activity | Low/local observation plus departure/boundary regex | Actor Runtime reducer | Authority, presence, Scene, UI |
| Spell learning | directives, checks and teaching/observation regex | Spell reducer | spellbook, checks, Prompt, UI |
| Calendar maintenance trigger | commitment regex | model scheduler; Calendar Reducer writes accepted proposal | Calendar prompts/UI/Scene claims |

## Migration Constraints

1. No semantic-regex writer may be removed until its replacement proposal,
   evidence, failure and budget semantics are explicitly approved.
2. Replacement must be subtractive. The old regex cannot remain as a hidden
   fallback or override after the semantic owner is introduced.
3. Existing post-turn Prompt headroom is insufficient authority to add all
   hotspot decisions. See [prompt-baseline.md](./prompt-baseline.md).
4. `VREG-001` must preserve the permanent Item existence invariant. Ambiguous
   destruction defaults to `remains`; only explicit higher-authority evidence
   permits `absent`.
5. Phase 1 adds a no-growth catalog and tests only. Every behavioral migration
   requires its own approved scope and blind simulation.
