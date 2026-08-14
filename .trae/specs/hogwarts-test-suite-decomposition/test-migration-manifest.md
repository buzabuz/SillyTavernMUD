# Test Migration Manifest

Artifact revision: 2

Status: implemented. All 204 source rows are finalized and the monolith is deleted.

## Baseline

```text
source: tests/hogwarts-mud.test.mjs
lines: 19,203
tests: 204
move: 177
delete: 24
mixed: 3
```

## Planned Deletions

| Retired behavior | Count | Evidence | Replacement/current owner |
| --- | ---: | --- | --- |
| Director Foundation | 1 | `MODEL_TASK_CATALOG.status=retired`; Prompt consolidation PRD | Opening World/bootstrap focused tests |
| Low opinion/memory writer | 1 | Low contract removes `impressionOfPlayerEn/memoryUpdate`; no current Low writer | strict Low output and post-turn Appraisal owners |
| World Change/Gossip | 3 | timeline/Appraisal revision-4 cutover; no production caller | Global Chronicle/Event/Social V3 owners |
| Temporal legacy repair without caller | 1 | no production reader/writer | current deterministic time tests |
| Scene Transition `relationshipUpdates` writer | 3 | removed Scene Transition contract | Appraisal/Social V3 |
| Legacy relationship-copy migration | 2 | reference-only memory/social cutover | EventRef/AppraisalRef migration tests |
| Social Graph V2 migration behavior | 6 | Social V3 cutover | Social V3 migration/contract tests |
| Old LangGraph Social V2 reducer | 7 | Social V3 reducer cutover | `hogwarts-mud-social-v3.test.mjs` |
| **Total** | **24** | | |

## Planned Mixed Rewrites

| Current assertion retained | Retired assertion removed | Destination |
| --- | --- | --- |
| compact Scene Transition normalization | `worldChanges` default/shape | `hogwarts-mud-scene-transition.test.mjs` |
| Calendar clock jump and statuses | news/gossip/world-change log | `hogwarts-mud-calendar-reducer-projection.test.mjs` |
| AppraisalRef/MemoryRef consolidation | Social V2 `statements` | `hogwarts-mud-memory-scene-boundary.test.mjs` |

## Planned Topic Moves

| Source topic | Count | Planned owner |
| --- | ---: | --- |
| Prompt / JSON recovery | 7 | `hogwarts-mud-json-recovery.test.mjs` and current Prompt owner |
| Translation | 11 | `hogwarts-mud-translation.test.mjs` |
| Actor knowledge / RAG | 1 | `hogwarts-mud-knowledge-v2.test.mjs` |
| Preset/import | 6 | `hogwarts-mud-preset-import.test.mjs` |
| Character/campaign/opening | 6 | current Prompt/bootstrap owner |
| Movement/spatial | 30 | `hogwarts-mud-movement-spatial.test.mjs` |
| Scene context/material/appearance | 10 | `hogwarts-mud-material-state.test.mjs` and current authority owner |
| Embedding | 1 | current module/Knowledge owner |
| Turn settlement | 3 | `hogwarts-mud-turn-protocol.test.mjs` |
| Scene Transition core | 16 | `hogwarts-mud-scene-transition.test.mjs` |
| Scene Transition reducer/authority | 7 | `hogwarts-mud-scene-transition.test.mjs` |
| Pacing/cast/canon | 24 | `hogwarts-mud-pacing-cast.test.mjs` |
| Opening bootstrap | 1 | `hogwarts-mud-prompt-payload-consolidation.test.mjs` |
| Foundation-coupled active turn | 1 | current Opening fixture plus turn owner |
| Turn rollback/recovery | 6 | `hogwarts-mud-turn-recovery.test.mjs` |
| Actor memory/event boundary | 7 | `hogwarts-mud-memory-scene-boundary.test.mjs` |
| Active Social | retained subset | `hogwarts-mud-social-v3.test.mjs` / relationship graph owner |
| Memory consolidation | 1 | `hogwarts-mud-memory-scene-boundary.test.mjs` |
| Time/calendar | retained subset | `hogwarts-mud-calendar-reducer-projection.test.mjs` |
| Checks/spells/performance | 18 | `hogwarts-mud-spell-action-check.test.mjs` and current narrative owner |
| Scene time/presence | 3 | `hogwarts-mud-presence-contract.test.mjs` |
| Context/model budget | 3 | `hogwarts-mud-task8-call-budget.test.mjs` |
| Map/cartography | 11 | `hogwarts-mud-map-cartography.test.mjs` |

The topic table describes source ownership. The exact final row count is
derived from the 204-row table below, not from adding topic rows whose active
and retired subsets overlap.

## Exact Source Rows

HTD-3 fills this table before changing any test:

| # | Source line | Source title | Topic | Action | Destination | Retired assertion | Retirement authority | Replacement coverage | Fixture owner | Status |
| ---: | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 764 | system prompt always adds the English-only output contract | opening | move | tests/hogwarts-mud-prompt-contract.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 2 | 793 | shared cast identity contract separates named actors from crowd texture | opening | move | tests/hogwarts-mud-prompt-contract.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 3 | 812 | streaming scene parser reveals complete and partial JSON segments | opening | move | tests/hogwarts-mud-json-recovery.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 4 | 856 | truncated scene recovery keeps only the complete Low output contract | json | move | tests/hogwarts-mud-json-recovery.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 5 | 911 | scene recovery drops an incomplete state proposal instead of creating a legacy update | json | move | tests/hogwarts-mud-json-recovery.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 6 | 957 | structured JSON parsing rejects a truncated root instead of accepting an inner object | json | move | tests/hogwarts-mud-json-recovery.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 7 | 1005 | scene transition recovery keeps a complete core and drops only a truncated social tail | json | move | tests/hogwarts-mud-json-recovery.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 8 | 1080 | translation chunks preserve paragraph boundaries when possible | translation | move | tests/hogwarts-mud-translation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 9 | 1086 | translation chunks split oversized prose without breaking words | translation | move | tests/hogwarts-mud-translation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 10 | 1097 | translation batches keep complete structured fields together | translation | move | tests/hogwarts-mud-translation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 11 | 1113 | translation batches preserve a full long scene within the Google text limit | translation | move | tests/hogwarts-mud-translation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 12 | 1126 | actor translation terms preserve full and short authoritative names | translation | move | tests/hogwarts-mud-translation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 13 | 1158 | local translation inputs receive authoritative glossary targets without placeholders | translation | move | tests/hogwarts-mud-translation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 14 | 1191 | local short-label translations drop an unsolicited parenthetical alternative | translation | move | tests/hogwarts-mud-translation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 15 | 1215 | translation term placeholders restore canonical Chinese terms | translation | move | tests/hogwarts-mud-translation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 16 | 1263 | actor aliases retain full and short English and Chinese names | translation | move | tests/hogwarts-mud-translation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 17 | 1299 | direct-address focus and shared RAG preserve NPC knowledge boundaries | opening | move | tests/hogwarts-mud-prompt-contract.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 18 | 1775 | translation only runs for predominantly English content | translation | move | tests/hogwarts-mud-translation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 19 | 1781 | translation provider settings accept local, Google, Bing and off with a stable fallback | translation | move | tests/hogwarts-mud-translation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 20 | 1807 | imports reject files above the configured size limit | preset | move | tests/hogwarts-mud-preset-import.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 21 | 1812 | preset type detection recognizes standard SillyTavern shapes | preset | move | tests/hogwarts-mud-preset-import.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 22 | 1819 | preset sanitization removes connection and secret-bearing fields | preset | move | tests/hogwarts-mud-preset-import.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 23 | 1841 | preset sanitization removes prototype-pollution keys | preset | move | tests/hogwarts-mud-preset-import.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 24 | 1849 | regex normalization accepts standard single and array formats | preset | move | tests/hogwarts-mud-preset-import.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 25 | 1863 | regex normalization rejects malformed files | preset | move | tests/hogwarts-mud-preset-import.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 26 | 1868 | character creation requires identity facts and an exact 63 point attribute budget | opening | move | tests/hogwarts-mud-prompt-contract.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 27 | 1882 | fixed birth dates produce age bands relative to the player at the current world clock | opening | move | tests/hogwarts-mud-prompt-contract.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 28 | 1937 | relationship tags are not inferred before a character is introduced | opening | move | tests/hogwarts-mud-prompt-contract.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 29 | 1977 | campaign presets normalize locked and open school starts | preset | move | tests/hogwarts-mud-preset-import.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 30 | 2002 | campaign configuration becomes authoritative world and prompt state | movement | move | tests/hogwarts-mud-movement-resolution.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 31 | 2027 | opening world package commits a home map, present NPCs, and dramatic conflict | movement | move | tests/hogwarts-mud-movement-resolution.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 32 | 2152 | scene destination matching resolves a player move to an existing room | movement | move | tests/hogwarts-mud-movement-resolution.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 33 | 2181 | express arrival intent binds the canonical Hogsmeade station room | movement | move | tests/hogwarts-mud-movement-resolution.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 34 | 2211 | movement requires an explicit marker and historical place mentions stay put | movement | move | tests/hogwarts-mud-movement-resolution.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 35 | 2277 | entity migration backfills an owned wand without inventorying incidental food | material | move | tests/hogwarts-mud-material-state.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 36 | 2349 | current scene carries a valid editable default next-scene intent | movement | move | tests/hogwarts-mud-movement-resolution.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 37 | 2362 | event-boundary director refreshes intent text without changing structural authority | movement | move | tests/hogwarts-mud-movement-resolution.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 38 | 2430 | ordinary player movement commits a reachable room before AI performance | movement | move | tests/hogwarts-mud-movement-resolution.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 39 | 2452 | guided movement commits a leader-known destination hidden from the player | movement | move | tests/hogwarts-mud-movement-resolution.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 40 | 2502 | passive guided movement reaches Platform Nine and Three Quarters with the whole party | movement | move | tests/hogwarts-mud-movement-resolution.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 41 | 2592 | guided movement retry replaces a stale guide-context destination | movement | move | tests/hogwarts-mud-movement-resolution.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 42 | 2718 | entering a preset proprietor room admits its canonical resident once | preset | move | tests/hogwarts-mud-preset-import.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 43 | 2807 | scene transition can preload a destination professor without activating them in the closing scene | movement | move | tests/hogwarts-mud-movement-resolution.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 44 | 2941 | marked Chinese movement resolves a multi-room Diagon Alley destination | movement | move | tests/hogwarts-mud-movement-resolution.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 45 | 2979 | house credentials constrain entry but not exit movement | movement | move | tests/hogwarts-mud-movement-resolution.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 46 | 3051 | explicit Great Hall movement commits from Gryffindor Common Room | movement | move | tests/hogwarts-mud-movement-resolution.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 47 | 3142 | bound interior and parent map movement commits without archiving the scene | movement | move | tests/hogwarts-mud-movement-resolution.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 48 | 3306 | unsettled turn recovery replays its committed move and route companions | json | move | tests/hogwarts-mud-json-recovery.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 49 | 3397 | Gringotts shorthand moves player and explicit companions without archiving the scene | movement | move | tests/hogwarts-mud-spatial-reconciliation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 50 | 3515 | spatial v2 repairs the legacy generic steps false match | movement | move | tests/hogwarts-mud-spatial-reconciliation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 51 | 3550 | spatial migration retries a recorded unresolved local movement once | movement | move | tests/hogwarts-mud-spatial-reconciliation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 52 | 3650 | spatial v3 advances legacy Gringotts shorthand from the steps to the lobby | movement | move | tests/hogwarts-mud-spatial-reconciliation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 53 | 3753 | observable actor activity corrects stale low-tier room ids | movement | move | tests/hogwarts-mud-spatial-reconciliation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 54 | 3846 | generic school-year ordinals do not move actors onto stair landings | movement | move | tests/hogwarts-mud-spatial-reconciliation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 55 | 3863 | train actor tracking prefers an explicit corridor over a generic compartment mention | movement | move | tests/hogwarts-mud-spatial-reconciliation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 56 | 3965 | spatial migration restores legacy player and actor room positions | movement | move | tests/hogwarts-mud-spatial-reconciliation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 57 | 3985 | spatial v4 repairs a scene whose opening is at the barrier but room ID says train | movement | move | tests/hogwarts-mud-spatial-reconciliation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 58 | 4038 | temporal grounding repairs the legacy July clock for the September school departure | temporal_legacy_no_caller | delete | - | entire test | approved retirement; no active caller; replacement=temporal_legacy_no_caller | current focused owner | - | deleted |
| 59 | 4137 | spatial context allows reactions across a committed sightline | movement | move | tests/hogwarts-mud-spatial-reconciliation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 60 | 4156 | spatial authority removes stale off-scene actors but preserves committed sightlines | movement | move | tests/hogwarts-mud-spatial-reconciliation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 61 | 4230 | explicit movement history repairs a named companion omitted by legacy movement metadata | movement | move | tests/hogwarts-mud-spatial-reconciliation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 62 | 4311 | mandatory scene state stays compact and excludes detailed memories and hidden arcs | opening | move | tests/hogwarts-mud-prompt-contract.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 63 | 4358 | actor continuity capsules override stale stranger labels without exposing secrets | knowledge | move | tests/hogwarts-mud-actor-knowledge.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 64 | 4507 | behavioral environment deterministically turns clock and weather into action constraints | protocol | move | tests/hogwarts-mud-turn-protocol.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 65 | 4589 | structured local observation normalizes material changes | material | move | tests/hogwarts-mud-material-state.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 66 | 4694 | local inventory observation admits only evidenced durable player possessions | material | move | tests/hogwarts-mud-material-state.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 67 | 4800 | legacy signed autograph acquisition migrates into the authoritative inventory once | material | move | tests/hogwarts-mud-material-state.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 68 | 4862 | material schema defines complete scene and appearance changes | material | move | tests/hogwarts-mud-material-state.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 69 | 4919 | complete material event taxonomy reduces to current room and presentation state | material | move | tests/hogwarts-mud-material-state.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 70 | 5157 | legacy actor descriptions split stable appearance from current presentation | material | move | tests/hogwarts-mud-material-state.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 71 | 5245 | material events persist presentation and only project effects for the current room | material | move | tests/hogwarts-mud-material-state.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 72 | 5418 | local transformer embeddings enforce a bounded sequence length | knowledge | move | tests/hogwarts-mud-actor-knowledge.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 73 | 5425 | narrative-first turn settlement accepts segments without the metadata customs form | protocol | move | tests/hogwarts-mud-turn-protocol.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 74 | 5501 | narrative-first settlement folds sparse exits and drops invalid proposals without losing prose | protocol | move | tests/hogwarts-mud-turn-protocol.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 75 | 5598 | local narrative-first reducer matches the LangGraph settlement output | protocol | move | tests/hogwarts-mud-turn-protocol.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 76 | 5645 | scene transition duration is not locally capped | transition | move | tests/hogwarts-mud-scene-transition.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 77 | 5720 | scene transition validation locks an explicit player destination | transition | move | tests/hogwarts-mud-scene-transition.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 78 | 5861 | compact scene-seal core normalizes into a valid transition without optional prose or enrichments | transition | mixed | tests/hogwarts-mud-scene-transition.test.mjs | remove worldChanges default assertion | approved mixed cutover | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated-current-assertions |
| 79 | 5919 | scene transition does not fabricate actor memories from a closure summary | transition_relationship_writer | delete | - | entire test | approved retirement; no active caller; replacement=transition_relationship_writer | current focused owner | - | deleted |
| 80 | 5949 | scene transition keeps only complete unique actor-centered memories | transition_relationship_writer | delete | - | entire test | approved retirement; no active caller; replacement=transition_relationship_writer | current focused owner | - | deleted |
| 81 | 5997 | scene transition prompt requests sparse actor-centered relationship memories | transition_relationship_writer | delete | - | entire test | approved retirement; no active caller; replacement=transition_relationship_writer | current focused owner | - | deleted |
| 82 | 6020 | scene transitions capture but never overwrite a new actor first impression | transition | move | tests/hogwarts-mud-scene-transition.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 83 | 6111 | scene transition checkpoints settle a pending first impression for an actor who was already present | transition | move | tests/hogwarts-mud-scene-transition.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 84 | 6206 | scene transition normalization never hides a wrong model destination | transition | move | tests/hogwarts-mud-scene-transition.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 85 | 6227 | unbound transition normalization resolves a known room on its authoritative map | transition | move | tests/hogwarts-mud-scene-transition.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 86 | 6312 | scene transition normalization repairs invalid actor and following rooms | transition | move | tests/hogwarts-mud-scene-transition.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 87 | 6342 | scene transition grounding validates structured destination without parsing prose | transition | move | tests/hogwarts-mud-scene-transition.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 88 | 6457 | scene transition allows adjacent-room references without treating them as current location assertions | transition | move | tests/hogwarts-mud-scene-transition.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 89 | 6483 | [defect-probing][Task 15] scene transition rejects actor activity that asserts a different current room | transition | move | tests/hogwarts-mud-scene-transition.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 90 | 6506 | scene transition rejects a structured room ID that differs from destination authority | transition | move | tests/hogwarts-mud-scene-transition.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 91 | 6582 | scene transition commits an absolute nextClock across a deliberate calendar jump | transition | mixed | tests/hogwarts-mud-scene-transition.test.mjs | remove news/gossip/world-change-log assertions | approved mixed cutover | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated-current-assertions |
| 92 | 6729 | short scene transitions reject inter-scene world changes | world_change_gossip | delete | - | entire test | approved retirement; no active caller; replacement=world_change_gossip | current focused owner | - | deleted |
| 93 | 6778 | long scene transitions may defer world changes and social consolidation after the core commit | world_change_gossip | delete | - | entire test | approved retirement; no active caller; replacement=world_change_gossip | current focused owner | - | deleted |
| 94 | 6921 | long transitions propagate known gossip one distortion step and later let it fade | world_change_gossip | delete | - | entire test | approved retirement; no active caller; replacement=world_change_gossip | current focused owner | - | deleted |
| 95 | 7083 | scene transition atomically archives the old scene and commits the next room | transition | move | tests/hogwarts-mud-scene-transition.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 96 | 7217 | classroom transition keeps a full local cohort while limiting the active cast | transition | move | tests/hogwarts-mud-scene-transition.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 97 | 7420 | scene transition does not teleport an omitted actor to the new map | transition | move | tests/hogwarts-mud-scene-transition.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 98 | 7445 | scene transition snapshots carried and stored item custody | transition | move | tests/hogwarts-mud-scene-transition.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 99 | 7552 | transition normalization drops new permanent flags from medium tier only | transition | move | tests/hogwarts-mud-scene-transition.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 100 | 7598 | only high-tier transitions may commit irreversible NPC death | transition | move | tests/hogwarts-mud-scene-transition.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 101 | 7681 | mid-tier transition director may settle reversible NPC status | transition | move | tests/hogwarts-mud-scene-transition.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 102 | 7727 | pacing signals trigger on repeated core cast after an interaction | pacing | move | tests/hogwarts-mud-pacing-director.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 103 | 7766 | repeated authority scenes force a near-age relationship introduction | pacing | move | tests/hogwarts-mud-pacing-director.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 104 | 7823 | pacing signals respect pending beats and reassessment cooldown | pacing | move | tests/hogwarts-mud-pacing-director.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 105 | 7860 | causal collapse opportunities share pacing cooldown and bind one persistent aftermath per scene | pacing | move | tests/hogwarts-mud-pacing-director.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 106 | 8259 | pacing roster gaps stop auto-triggering when the current scene already has enough peers | pacing | move | tests/hogwarts-mud-pacing-director.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 107 | 8335 | pacing signals immediately route explicit stranger interaction to medium tier | pacing | move | tests/hogwarts-mud-pacing-director.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 108 | 8384 | supplied Canon candidates are promoted from actorEntrances to guestActor | pacing | move | tests/hogwarts-mud-pacing-director.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 109 | 8480 | canon actor knowledge boundaries discard catalog skills, future affiliations, and omniscience claims | pacing | move | tests/hogwarts-mud-pacing-director.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 110 | 8551 | pacing assessment commits and consumes a safe public guest beat | pacing | move | tests/hogwarts-mud-pacing-director.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 111 | 8710 | temporary scene actors keep a stable identity and merge only after narrative evidence | pacing | move | tests/hogwarts-mud-pacing-director.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 112 | 8988 | temporary actor promotion policy separates selected interaction from crowd texture | pacing | move | tests/hogwarts-mud-pacing-director.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 113 | 9042 | coherent orphan actor references recover into one temporary entrance | pacing | move | tests/hogwarts-mud-pacing-director.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 114 | 9159 | temporary actor display names reconcile from revealed bilingual dialogue | pacing | move | tests/hogwarts-mud-cast-admission.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 115 | 9230 | exactly mentioned nearby acquaintances are admitted for one turn without writing memory | pacing | move | tests/hogwarts-mud-cast-admission.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 116 | 9321 | social discovery stages advance at 12 and 16 meaningful known actors | pacing | move | tests/hogwarts-mud-cast-admission.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 117 | 9497 | actor selection policy preserves explicit and pursued targets above stage quotas | pacing | move | tests/hogwarts-mud-cast-admission.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 118 | 9596 | explicit Harry aliases force stable Canon admission through pacing | pacing | move | tests/hogwarts-mud-cast-admission.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 119 | 9872 | pacing admits a recognizable companion by stable actor ID | pacing | move | tests/hogwarts-mud-cast-admission.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 120 | 10042 | actor selection does not treat stale same-scene conversation as long-term pursuit | pacing | move | tests/hogwarts-mud-cast-admission.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 121 | 10133 | localized Canon registry resolves aliases and duplicate identities deterministically | pacing | move | tests/hogwarts-mud-cast-admission.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 122 | 10243 | offline canon catalog and cast budgets permit bounded additions | pacing | move | tests/hogwarts-mud-cast-admission.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 123 | 10466 | crowded scene transitions recommend named-cast turnover without deleting persistent actors | pacing | move | tests/hogwarts-mud-cast-admission.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 124 | 10657 | canon recommendations use fixed temperament tags and player-relative age | pacing | move | tests/hogwarts-mud-cast-admission.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 125 | 10726 | pacing can commit a mishap without introducing another actor | pacing | move | tests/hogwarts-mud-cast-admission.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 126 | 10785 | opening world package rejects the hidden storage narrator as an NPC | opening | move | tests/hogwarts-mud-prompt-contract.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 127 | 10833 | director foundation commits a private cast library and a prewritten clue graph | director_foundation | delete | - | entire test | approved retirement; no active caller; replacement=director_foundation | current focused owner | - | deleted |
| 128 | 10856 | turn settlement advances at least fifteen minutes and reveals only prewritten clues | protocol | move | tests/hogwarts-mud-turn-protocol.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 129 | 10903 | last-turn retry checkpoint restores one non-recursive pre-commit state | recovery | move | tests/hogwarts-mud-turn-recovery.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 130 | 11041 | legacy rollback projection stays removed after the V1 cutover | recovery | move | tests/hogwarts-mud-turn-recovery.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 131 | 11187 | a failed trailing player turn remains recoverable without duplicating the input | recovery | move | tests/hogwarts-mud-turn-recovery.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 132 | 11255 | unsettled turn detection never replays an idle completed legacy assistant message | recovery | move | tests/hogwarts-mud-turn-recovery.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 133 | 11304 | unsettled turn detection resumes only an explicit trailing player turn | recovery | move | tests/hogwarts-mud-turn-recovery.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 134 | 11355 | turn settlement never lets legacy model item updates create formal possessions directly | recovery | move | tests/hogwarts-mud-turn-recovery.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 135 | 11460 | low-tier turn updates an actor impression and tiered shared memory | retired_low_memory_writer | delete | - | entire test | approved retirement; no active caller; replacement=retired_low_memory_writer | current focused owner | - | deleted |
| 136 | 11555 | legacy relationship migration backfills witnessed turn memories | relationship_copy_migration | delete | - | entire test | approved retirement; no active caller; replacement=relationship_copy_migration | current focused owner | - | deleted |
| 137 | 11669 | current relationship migration prunes legacy transition filler idempotently | relationship_copy_migration | delete | - | entire test | approved retirement; no active caller; replacement=relationship_copy_migration | current focused owner | - | deleted |
| 138 | 11724 | established family and friends receive a background impression | memory | move | tests/hogwarts-mud-event-memory-runtime.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 139 | 11748 | memory consolidation waits for a low-tier event boundary instead of a turn count | memory | move | tests/hogwarts-mud-event-memory-runtime.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 140 | 11845 | an ended low-tier event queues one memory consolidation boundary | memory | move | tests/hogwarts-mud-event-memory-runtime.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 141 | 11926 | an event boundary refreshes direction even without reviewable memory | memory | move | tests/hogwarts-mud-event-memory-runtime.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 142 | 11972 | Social Graph v2 migrates Tina-sized legacy data without moving cursors or memory cooldowns | social_v2_migration | delete | - | entire test | approved retirement; no active caller; replacement=social_v2_migration | current focused owner | - | deleted |
| 143 | 12293 | loaded social graph defers catch-up until after a behind cursor receives its local metadata migration | social_v2_migration | delete | - | entire test | approved retirement; no active caller; replacement=social_v2_migration | current focused owner | - | deleted |
| 144 | 12373 | Social Graph v2 normalizes long-term dimensions, appraisals, active emotions, and structural tags | social_v2_migration | delete | - | entire test | approved retirement; no active caller; replacement=social_v2_migration | current focused owner | - | deleted |
| 145 | 12558 | Social Graph v2 removes legacy compatibility fields without changing IDs or provenance | social_v2_migration | delete | - | entire test | approved retirement; no active caller; replacement=social_v2_migration | current focused owner | - | deleted |
| 146 | 12655 | Social Graph v2 deterministically decays and expires active emotions from the current turn | social_v2_migration | delete | - | entire test | approved retirement; no active caller; replacement=social_v2_migration | current focused owner | - | deleted |
| 147 | 12725 | Social Graph v2 migration preserves hostile family values and derives complex relationship labels | social_v2_migration | delete | - | entire test | approved retirement; no active caller; replacement=social_v2_migration | current focused owner | - | deleted |
| 148 | 12844 | social audience projections preserve source knowledge without leaking hidden evidence through edge totals | relationship | move | tests/hogwarts-mud-relationship-graph.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 149 | 13344 | relationship graph renders familiarity-only edges as neutral instead of conflict | relationship | move | tests/hogwarts-mud-relationship-graph.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 150 | 13432 | relationship filters retain excluded edges as five-percent visual context only | relationship | move | tests/hogwarts-mud-relationship-graph.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 151 | 13571 | relationship graph separates reciprocal directed edges instead of stacking their colors | relationship | move | tests/hogwarts-mud-relationship-graph.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 152 | 13640 | relationship graph projects actor house affiliations with their player-visible directed edges | relationship | move | tests/hogwarts-mud-relationship-graph.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 153 | 13800 | relationship graph resolves Tina-shaped house identities without losing current visible edges | relationship | move | tests/hogwarts-mud-relationship-graph.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 154 | 14197 | relationship graph Cytoscape styles use supported highlight properties without warnings | relationship | move | tests/hogwarts-mud-relationship-graph.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 155 | 14292 | relationship graph disables motion and avoids custom wheel sensitivity warnings | relationship | move | tests/hogwarts-mud-relationship-graph.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 156 | 14327 | relationship graph actor cards reopen the inspector on narrow screens | relationship | move | tests/hogwarts-mud-relationship-graph.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 157 | 14355 | LangGraph social director validates provenance and derives idempotent NPC relationships | social_v2_langgraph | delete | - | entire test | approved retirement; no active caller; replacement=social_v2_langgraph | current focused owner | - | deleted |
| 158 | 14674 | LangGraph social director rejects cross-scene evidence and restores authoritative source scenes | social_v2_langgraph | delete | - | entire test | approved retirement; no active caller; replacement=social_v2_langgraph | current focused owner | - | deleted |
| 159 | 14787 | LangGraph social director rejects bad v2 proposals individually and preserves message witness privacy | social_v2_langgraph | delete | - | entire test | approved retirement; no active caller; replacement=social_v2_langgraph | current focused owner | - | deleted |
| 160 | 15040 | LangGraph social reducer applies directional saturation and asymmetric betrayal damage | social_v2_langgraph | delete | - | entire test | approved retirement; no active caller; replacement=social_v2_langgraph | current focused owner | - | deleted |
| 161 | 15197 | LangGraph social reducer deterministically attenuates repeated events | social_v2_langgraph | delete | - | entire test | approved retirement; no active caller; replacement=social_v2_langgraph | current focused owner | - | deleted |
| 162 | 15312 | LangGraph social reducer blocks routine closeness and keeps repeated praise or gifts below the next relationship stage | social_v2_langgraph | delete | - | entire test | approved retirement; no active caller; replacement=social_v2_langgraph | current focused owner | - | deleted |
| 163 | 15452 | LangGraph social reducer lowers resentment only for accepted repair evidence | social_v2_langgraph | delete | - | entire test | approved retirement; no active caller; replacement=social_v2_langgraph | current focused owner | - | deleted |
| 164 | 15621 | medium memory consolidation promotes only referenced memories | memory | mixed | tests/hogwarts-mud-event-memory-runtime.test.mjs | remove Social V2 statements assertion | approved mixed cutover | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated-current-assertions |
| 165 | 15840 | an explicitly instantaneous magical action may advance less than fifteen minutes | calendar | move | tests/hogwarts-mud-time-calendar.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 166 | 15870 | ordinary turns settle active and fully crossed Calendar intervals after advancing the clock | calendar | move | tests/hogwarts-mud-time-calendar.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 167 | 15965 | daily time policy advances ordinary turns locally without a per-turn director decision | calendar | move | tests/hogwarts-mud-time-calendar.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 168 | 15998 | turn performance budgets scale prose to the locally decided duration | calendar | move | tests/hogwarts-mud-time-calendar.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 169 | 16074 | long scene prose advances additional time instead of failing | spell | move | tests/hogwarts-mud-spell-action-check.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 170 | 16126 | local checks ignore deterministic conversation and detect a physical contest | spell | move | tests/hogwarts-mud-spell-action-check.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 171 | 16179 | spell catalog uses curriculum year only as guidance and structured markers survive dialogue or action | spell | move | tests/hogwarts-mud-spell-action-check.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 172 | 16241 | a structured spell always rolls even when semantic adjudication says no check | spell | move | tests/hogwarts-mud-spell-action-check.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 173 | 16296 | active scene-spell observation rolls once and learns only on a successful result | spell | move | tests/hogwarts-mud-spell-action-check.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 174 | 16430 | explicit NPC explanation teaches a spell after failed player observation | spell | move | tests/hogwarts-mud-spell-action-check.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 175 | 16483 | scene authority reconciles a conflicting taught incantation and blocks a custom candidate | spell | move | tests/hogwarts-mud-spell-action-check.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 176 | 16568 | scene authority corrects a replacement while preserving a distinct custom spell | spell | move | tests/hogwarts-mud-spell-action-check.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 177 | 16677 | a player-declared freeform spell becomes a review candidate under scene authority | spell | move | tests/hogwarts-mud-spell-action-check.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 178 | 16759 | explicit non-catalog teaching becomes a player-reviewed custom spell | spell | move | tests/hogwarts-mud-spell-action-check.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 179 | 16926 | an AI-visible spell marker records the referenced spell without counting a cast | spell | move | tests/hogwarts-mud-spell-action-check.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 180 | 16958 | first-year players may self-study or experiment with later curriculum spells | spell | move | tests/hogwarts-mud-spell-action-check.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 181 | 17028 | an unknown spell cast in class remains an experiment unless it was actually taught | spell | move | tests/hogwarts-mud-spell-action-check.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 182 | 17067 | spellbook migration learns classroom spells from existing narrative | spell | move | tests/hogwarts-mud-spell-action-check.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 183 | 17107 | later-year starts seed prior curriculum but never gate other spells | spell | move | tests/hogwarts-mud-spell-action-check.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 184 | 17141 | semantic check authority overrides keyword detection | spell | move | tests/hogwarts-mud-spell-action-check.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 185 | 17183 | local checks handle advantage, disadvantage, natural rolls and forced checks | spell | move | tests/hogwarts-mud-spell-action-check.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 186 | 17234 | check resolution is validated and persisted with the turn transaction | spell | move | tests/hogwarts-mud-spell-action-check.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 187 | 17272 | scene performance requires substantial narration for a fifteen-minute turn | spell | move | tests/hogwarts-mud-turn-validation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 188 | 18115 | scene time authority bounds relative narration and rejects invented schedules | spell | move | tests/hogwarts-mud-turn-validation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 189 | 18284 | an offstage actor cannot form impression or memory without a sightline | presence | move | tests/hogwarts-mud-scene-presence.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 190 | 18399 | low-tier actor movement is limited to reachable existing rooms | spell | move | tests/hogwarts-mud-turn-validation.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 191 | 18449 | model slot settings migrate legacy limits to output headroom and clamp to context size | budget | move | tests/hogwarts-mud-context-budget.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 192 | 18497 | role context size limits old message content while preserving recent content | budget | move | tests/hogwarts-mud-context-budget.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 193 | 18521 | adaptive context plans scale RAG and memory depth up to 120K | budget | move | tests/hogwarts-mud-context-budget.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 194 | 18605 | map proposals cannot rewrite a canon location during exploration | map | move | tests/hogwarts-mud-map-cartography.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 195 | 18624 | validated World Director additions are committed as generated map nodes | map | move | tests/hogwarts-mud-map-cartography.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 196 | 18658 | medium cartographer creates and reuses a missing container interior map | map | move | tests/hogwarts-mud-map-cartography.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 197 | 18870 | legacy Gryffindor dormitory scenes repair the parent room and request a persistent interior | map | move | tests/hogwarts-mud-map-cartography.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 198 | 19087 | map model projects canon nodes, routes and current location for every map view | map | move | tests/hogwarts-mud-map-cartography.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 199 | 19102 | generated map nodes receive a visible route to their nearest regional node | map | move | tests/hogwarts-mud-map-cartography.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 200 | 19123 | preset MUD map pack covers every world location with valid room and exit graphs | preset | move | tests/hogwarts-mud-map-cartography.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 201 | 19133 | local map model selects one floor and applies runtime topology state | map | move | tests/hogwarts-mud-map-cartography.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 202 | 19156 | AI map context includes only the active detailed map plus the global catalog | map | move | tests/hogwarts-mud-map-cartography.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 203 | 19170 | runtime map mutations cannot rewrite preset topology | preset | move | tests/hogwarts-mud-map-cartography.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |
| 204 | 19199 | explicit movement text resolves a preset local map without AI inference | preset | move | tests/hogwarts-mud-map-cartography.test.mjs | - | - | current focused owner | tests/hogwarts-mud-test-fixtures.mjs | migrated |

## Final File Summary

Final destination evidence:

| Destination | Test count | Lines | Direct production imports | Fixture imports | Independent result |
| --- | ---: | ---: | --- | --- | --- |
| `tests/hogwarts-mud-actor-knowledge.test.mjs` | 2 | 205 | context-budget.js, actor-knowledge.js | ./hogwarts-mud-test-fixtures.mjs | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-cast-admission.test.mjs` | 12 | 548 | canon-characters.js, canon-localization.zh-cn.js, actor-admission.js, actor-identity.js, cast.js, pacing-signals.js, pacing-validation.js, scene-transition.js, archive-projection.js | ./hogwarts-mud-test-fixtures.mjs | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-context-budget.test.mjs` | 3 | 170 | context-budget.js, actor-memory.js | - | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-event-memory-runtime.test.mjs` | 5 | 432 | actor-memory-reducer.js, actor-memory.js, turn-reducer.js, presence-witness-contract.js | ./hogwarts-mud-test-fixtures.mjs | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-json-recovery.test.mjs` | 6 | 382 | json-recovery.js, movement.js, scene-transition.js | ./hogwarts-mud-test-fixtures.mjs | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-map-cartography.test.mjs` | 11 | 641 | interior-map.js, maps.js, scene-destination.js, spatial-reconciliation.js, map-pack.js, world-data.js | ./hogwarts-mud-test-fixtures.mjs | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-material-state.test.mjs` | 8 | 937 | appearance.js, initial-world.js, inventory.js, material-state.js, turn-protocol.js, turn-reducer.js, material-schema.js | ./hogwarts-mud-test-fixtures.mjs | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-movement-resolution.test.mjs` | 16 | 1155 | actor-admission.js, campaign.js, character.js, initial-world.js, maps.js, movement.js, pathfinding.js, scene-destination.js, scene-transition.js, spatial-reconciliation.js | ./hogwarts-mud-test-fixtures.mjs | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-pacing-director.test.mjs` | 12 | 481 | actor-memory.js, actor-knowledge.js, causal-state.js, pacing-reducer.js, pacing-signals.js, pacing-validation.js, turn-authority.js, turn-validation.js | ./hogwarts-mud-test-fixtures.mjs | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-preset-import.test.mjs` | 8 | 197 | actor-admission.js, campaign.js, preset-import.js, map-pack.js | ./hogwarts-mud-test-fixtures.mjs | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-prompt-contract.test.mjs` | 8 | 685 | context-budget.js, actor-identity.js, actor-knowledge.js, actor-memory.js, campaign.js, character.js, initial-world.js, social-migration.js | ./hogwarts-mud-test-fixtures.mjs | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-relationship-graph.test.mjs` | 9 | 1517 | canon-characters.js, actor-knowledge.js, social-projection.js, social-schema.js, relationship-graph.js | ./hogwarts-mud-test-fixtures.mjs | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-scene-presence.test.mjs` | 1 | 139 | spatial-performance.js, spatial-reconciliation.js, turn-validation.js | - | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-scene-transition.test.mjs` | 20 | 1639 | archive-projection.js, calendar-migration.js, scene-destination.js, scene-transition.js | ./hogwarts-mud-test-fixtures.mjs | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-spatial-reconciliation.test.mjs` | 12 | 844 | movement.js, spatial-foundation.js, spatial-performance.js, spatial-reconciliation.js, map-pack.js | ./hogwarts-mud-test-fixtures.mjs | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-spell-action-check.test.mjs` | 18 | 1246 | campaign.js, character.js, checks.js, initial-world.js, spell-proposals.js, spell-state.js, turn-reducer.js, turn-time.js, spell-catalog.js | ./hogwarts-mud-test-fixtures.mjs | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-time-calendar.test.mjs` | 4 | 356 | calendar-migration.js, time-environment.js, turn-reducer.js, turn-time.js | ./hogwarts-mud-test-fixtures.mjs | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-translation.test.mjs` | 11 | 272 | actor-identity.js, actor-memory.js, translation.js | - | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-turn-protocol.test.mjs` | 5 | 365 | time-environment.js, turn-protocol.js, turn-reducer.js, turn-validation.js | ./hogwarts-mud-test-fixtures.mjs | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-turn-recovery.test.mjs` | 6 | 577 | character.js, initial-world.js, turn-reducer.js, turn-rollback.js | ./hogwarts-mud-test-fixtures.mjs | passed in 180/180 migrated batch |
| `tests/hogwarts-mud-turn-validation.test.mjs` | 3 | 1021 | spatial-performance.js, turn-reducer.js, turn-time.js, turn-validation.js | ./hogwarts-mud-test-fixtures.mjs | passed in 180/180 migrated batch |

## Completion Rules

- no source test may be absent or appear twice;
- no `delete` row may lack retirement and no-caller evidence;
- no `move` or `mixed` row may lack an existing destination;
- all destination results must be recorded;
- the monolith is deleted only after this manifest is complete;
- this file remains after completion for later AI and reviewers.
