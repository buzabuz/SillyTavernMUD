# Hogwarts Language Boundary

Artifact revision: 3

Status: current runtime contract after the approved Phase 2 cutover.

Authoritative change:

`hogwarts-language-structured-input-identity-codes` Revision 4

This document complements `state-fields.md`. It does not replace field
ownership registered there. Phase 2 is implemented on Language Authority V1;
Phase 3 is not approved.

## 1. Current and Future Markers

Every rule is marked as one of:

- `CURRENT`: production behavior or current persisted shape;
- `APPROVED_INVARIANT`: approved long-term product rule;
- `FUTURE_P3`: approved direction, not approved for implementation.

An unimplemented future rule must never be used to reinterpret or rewrite a
current save.

## 2. Language Classes

Every language-bearing string belongs to exactly one class:

| Class | Semantics | State authority | Prompt/RAG | Player-visible |
| --- | --- | --- | --- | --- |
| `canonical_en` | Accepted English semantic fact, description or model result | allowed | allowed only through registered bounded projection | via localization |
| `player_input_evidence` | Immutable player-submitted source text | chat evidence only | allowed only as player input/evidence | yes |
| `model_output_evidence` | Raw model text not admitted as English authority | chat/display evidence only | forbidden | yes |
| `static_locale_resource` | Hand-authored UI/catalog display localization | forbidden | forbidden | yes |
| `dynamic_locale_cache` | Derived translation of one canonical source | forbidden | forbidden | yes |
| `entity_alias` | Locale-aware lookup token for one stable entity ID | forbidden | resolver only | yes |
| `diagnostic` | Bounded operational/error text | diagnostics only | forbidden unless separately registered | debug only |

Classes are mutually exclusive for one stored value.

## 3. Approved Invariants

### 3.1 English semantic authority

`APPROVED_INVARIANT`

- English is the sole internal semantic language.
- Calendar and Director records do not receive a Chinese-authority exception.
- Event, Appraisal, Person Schema, Social prose, Calendar, Scene, Map, Actor,
  Item, Spell, Clue and Knowledge semantic text can become authority only when
  it is English.
- Stable IDs are language-neutral.

### 3.2 Raw player input

`CURRENT` and `APPROVED_INVARIANT`

- `message.mes` for a player turn preserves the submitted source text.
- The player may submit Chinese.
- Raw player text can enter deterministic parsing, retrieval queries and model
  input as player evidence.
- Raw player text is not a settled world fact by itself.

### 3.3 Non-fatal model language mismatch

`CURRENT` and `APPROVED_INVARIANT`

- Non-English model text is not a fatal model error.
- A language mismatch cannot reject a whole response, fail a player turn,
  trigger repair/retry or spend a second model call.
- Non-English narrative may remain player-visible as `model_output_evidence`.
- Non-English semantic fields are not admitted to canonical tables.
- An optional non-English field is omitted.
- A proposal or new record missing required English semantic text is skipped.
- Independent valid IDs, records and proposals continue settlement.
- Raw non-English model text is not labelled `sourceEn`, indexed into
  Knowledge or reinjected into a later Prompt.
- A bounded `model_language_mismatch` diagnostic may record task, field path,
  record/proposal ID and detected language, but not full prose.
- JSON, Schema, stable-ID, authority and provenance failures unrelated to
  language remain fatal under their active contracts.

### 3.4 Offline audit boundary

`CURRENT` governance boundary

- The language audit and ratchet are developer/CI tools only.
- They are not imported by production Prompt builders, response parsers,
  validators, settlement graphs or Reducers.
- A persisted-language baseline increase may fail an audit command.
- It must never fail a live model response or player turn.

## 4. Runtime Field Boundary

### 4.0 Current field groups

| Surface | Current authority and storage rule |
| --- | --- |
| World State | `languageAuthorityVersion=1`; Calendar V3, Item V4, Material V3, Spellbook V3, Local Map V2 and Character V2 store English canonical prose plus language-neutral IDs/codes only |
| Player message | `chat[].mes` preserves raw submitted Chinese or English as `player_input_evidence`; it is not pretranslated or promoted into world authority |
| Assistant message | `extra.hogwartsMud.languageVersion=1`; accepted prose lives in `segments[].textEn`; raw non-English evidence uses mutually exclusive `rawText/language/authority` |
| Static display | `StaticLocaleResourcesV1` owns keyed `en/zh-CN` UI and Canon labels outside State, chat authority, Prompt and Knowledge |
| Dynamic display | authenticated server `TranslationTableV1` owns ready/error rows by stable record key and source hash; rows never enter State, canonical chat, Prompt or Knowledge |
| UI session | `session.displayLocale` and localization queue/status fields are ephemeral; locale controls and translation completion never increment `stateRevision` or save chat |
| Workflow commit | English State/message commits before candidate emission; localization failure cannot roll back canonical authority |
| Idle localization | `local_translation` is `idle_display`, non-blocking and `ephemeral_display`; one provider request per batch, no automatic repair/retry/fallback |
| Prompt and Knowledge | only registered bounded English projections plus attributed raw player evidence; translation rows and raw non-English model output are forbidden |
| Free-form prose | no regex path classifies narration/dialogue as truth, fabrication or unauthorized memory; optional `historicalClaims` remains non-authoritative metadata |
| Removed fields | message `sourceEn/translatedZh/display_text/segments[].textZh`, bilingual Calendar/Item/Map/Scene authority copies and State translation metadata have no current writer or reader |

Sections 4.1 through 4.10 below are retained only as the pre-cutover migration
inventory that explains what Revision 4 removed or retained. They are
historical evidence, not an alternate current writer/reader contract.

### 4.1 Player input evidence

| Paths | Class | Current writer | Current readers | Future action |
| --- | --- | --- | --- | --- |
| player `chat[].mes` | `player_input_evidence` | `ui/turn-controller.js` | turn workflow, local semantic models, Knowledge query, UI | retain |
| `turnRetry.playerAction` | `player_input_evidence` | turn rollback/retry | retry workflow | retain or replace with Phase 3 source |
| `turnRetry.baseState` nested player-action evidence | `player_input_evidence` | retry checkpoint | retry workflow | preserve source semantics |
| `pacingDirector.signals.playerAction/selectionPlayerAction` | `player_input_evidence` | pacing signal projection | pacing workflow/diagnostics | Phase 2 audit; avoid semantic authority |
| check `reasonEn` clauses that embed the exact player action | mixed current shape | check resolver | UI/diagnostics | Phase 2 separate reason from source evidence |

### 4.2 Assistant messages

| Paths | Class | Current writer | Current readers | Current issue / future action |
| --- | --- | --- | --- | --- |
| assistant `chat[].mes` | `canonical_en` in current contract | opening/turn/transition message builders | render, archive, Knowledge | Phase 2 preserve English authority |
| `extra.hogwartsMud.sourceEn` | `canonical_en` | message builders/translation controller | render/translation | Phase 2 retain canonical source |
| `extra.hogwartsMud.segments[].textEn` | `canonical_en` | Low/Opening workflows | render, observer, archive, Knowledge | Phase 2 retain only accepted English |
| `extra.hogwartsMud.translatedZh` | `dynamic_locale_cache` | translation workflow/controller | renderer | Phase 2 move out of canonical chat transaction |
| `extra.display_text` | `dynamic_locale_cache` | translation workflow/controller | native renderer | Phase 2 move to locale cache |
| `extra.hogwartsMud.segments[].textZh` | `dynamic_locale_cache` | translation workflow/controller | segmented renderer | Phase 2 move to locale cache |
| future raw non-English response | `model_output_evidence` | not implemented | future display renderer | Phase 2 define exact storage |

### 4.3 Scene and Scene Archive

| Paths | Class | Current writer | Current readers | Current issue / future action |
| --- | --- | --- | --- | --- |
| `scene.nameEn/summaryEn/explorationHookEn/crowdDirectionEn` | `canonical_en` | opening/transition reducers | Prompt, UI, archive | retain English authority |
| `scene.nextSceneIntent.titleEn/summaryEn/triggerEn` | `canonical_en` | transition/director reducers | transition/opening Prompt, UI | retain English authority |
| matching no-suffix Scene fields | `dynamic_locale_cache` in target contract | translation controller/current reducers | UI and currently Prompt | Phase 2 remove from State and Prompt |
| `scene.timelineEntries[].label` | mixed current semantic/display field | turn/transition reducers | UI, archive, Prompt | Phase 2 split English source from locale display |
| Archive `*En` prose | `canonical_en` | archive/transition projector | UI, Knowledge | retain English authority |
| Archive no-suffix prose | `dynamic_locale_cache` | translation controller/archive writer | UI | Phase 2 move to separate cache |
| `opening.package.display.*` | `dynamic_locale_cache` | opening translation | legacy opening display | Phase 2 remove from canonical package |

### 4.4 Calendar

| Paths | Class | Current writer | Current readers | Current issue / future action |
| --- | --- | --- | --- | --- |
| `calendar.*[].titleEn/summaryEn` | `canonical_en` | High/Medium Calendar model + reducer | Calendar/Scene/transition projections | retain English authority |
| `calendar.*[].title/summary` | `dynamic_locale_cache` in target contract | currently High/Medium model + reducer | UI and Prompt projections | current dual-language authority; Phase 2 remove from State/Prompt |
| Calendar IDs, status, tags, clocks, actor/map/room refs | language-neutral structure | Calendar reducers | Calendar/Scene/transition | retain |
| `agenda[].label/timeLabel` | retired legacy display text | no production writer | no production reader | leave untouched until separately approved cleanup |

### 4.5 Event, Chronicle, Memory and Social

| Paths | Class | Current writer | Current readers | Future action |
| --- | --- | --- | --- | --- |
| `eventKnowledge[].summaryEn` | `canonical_en` | Event reducer | Memory, Social, Knowledge, UI | retain |
| Event `perception.evidenceText` | source evidence | Event observer/reducer | provenance/diagnostics | classify by source; never treat language as fatal |
| `globalChronicle.entries[].summaryEn` | `canonical_en` | transition reducer | Knowledge | retain |
| `memorySynapse.appraisals[].summaryEn` | `canonical_en` | Appraisal reducer | Schema, Dossier, Knowledge | retain |
| Person Schema `*En` | `canonical_en` | Memory Synapse reducer | Knowledge, Dossier, Low activation | retain |
| Social enums/tags/deltas/IDs | language-neutral structure | Social reducer | Prompt/UI | retain |
| Social `*En` prose projections | `canonical_en` | Social projection | Prompt/UI | retain |
| future localized Dossier/Memory/Relationship text | `dynamic_locale_cache` | not implemented | future UI | Phase 2 idle localization |

### 4.6 Actor

| Paths | Class | Current writer | Current readers | Future action |
| --- | --- | --- | --- | --- |
| Actor Core `nameEn/roleEn/publicProfile.*En/performanceCore.*En/privateFacts.*En` | `canonical_en` | Actor Context/Identity reducers | Prompt, Dossier, Knowledge | retain |
| Actor Runtime `lifeStatusDetailEn/currentActivityEn/currentIntentEn/currentGoalEn` | `canonical_en` | Actor Runtime reducers | Authority, Prompt, Dossier | retain |
| `actorLibrary[].aliases[]` | `entity_alias` | Canon/localization/Actor creation | resolver, UI | Phase 3 move locale aliases to explicit index |
| Identity labels/descriptions | current mixed semantic/display shape | Canon/Identity reducers | Dossier/Prompt | Phase 2 classify field-by-field |
| `actorPresentations[].outfit` and current presentation prose | canonical current-state prose | appearance/item reducers | Prompt, UI | Phase 2 require English authority |
| future localized Actor header/current/memory | `dynamic_locale_cache` | not implemented | future Dossier UI | Phase 2 |

### 4.7 Item

| Paths | Class | Current writer | Current readers | Future action |
| --- | --- | --- | --- | --- |
| `items[].labelEn/appearanceEn/detailEn/notesEn` | `canonical_en` | Canon seed, proposal acceptance, migration | Authority, Prompt, UI | retain |
| matching no-suffix Item prose | `dynamic_locale_cache` in target contract | current normalizer/writers | UI and sometimes Prompt | Phase 2 remove from canonical Item |
| Item ID/type/state/physicalForm/owner/holder/location | language-neutral authority | Item reducer | all Item consumers | retain unchanged |
| item directive display label after stable ID | display hint only | composer | parser/debug | must not select identity |

Item existence semantics remain governed by `state-fields.md` and
`hogwarts-change-governance`; language migration cannot change
`state/physicalForm/holder/location`.

### 4.8 Spell

| Paths | Class | Current writer | Current readers | Future action |
| --- | --- | --- | --- | --- |
| catalog/custom `id`, spellbook `spellId` | language-neutral identity | catalog/proposal resolver | check, Prompt, UI | retain |
| `nameEn/effectEn` | `canonical_en` | catalog/custom proposal | Prompt/UI | retain |
| built-in `name/effect` | `static_locale_resource` | catalog source | UI | move to locale resource ownership if needed |
| persisted custom `name/effect` | current mixed display copy | custom proposal resolver | UI | Phase 2 move to locale cache |
| `incantation` | Canon token, language-neutral for identity | catalog | resolver/Prompt/UI | retain |

### 4.9 Map and Room

| Paths | Class | Current writer | Current readers | Current issue / future action |
| --- | --- | --- | --- | --- |
| Interior `nameEn/descriptionEn` | `canonical_en` | opening/interior reducers | Prompt/UI | retain |
| matching no-suffix Interior fields | `dynamic_locale_cache` | translation/opening/interior path | UI and resolver | Phase 2 move to locale cache; aliases retain lookup role |
| World Map generated `name/summary` Chinese-only | current violation | Map Expansion model/reducer | map UI/Prompt | Phase 2 switch writer to English; skip non-English records non-fatally |
| mapId/roomId/topology/mount/exits | language-neutral authority | map reducers | movement/Prompt/UI | retain unchanged |
| Room aliases | `entity_alias` | map definitions | destination resolver | Phase 3 explicit locale index |

### 4.10 Static UI and diagnostics

| Paths | Class | Current writer | Current readers | Future action |
| --- | --- | --- | --- | --- |
| panel/button/error/status literal UI strings | `static_locale_resource` target | source code today | UI | Phase 2 move to locale table |
| translation provider/version/error | `diagnostic` | translation controller | settings/debug | keep out of Prompt/RAG |
| turn/transition diagnostics | `diagnostic` | workflows | debug | bounded; no full private Prompt |
| scheduler/model task errors | `diagnostic` | scheduler/adapters | UI/debug | locale rendering separate from authority |

## 5. Resolved Pre-Cutover Violations

`HISTORICAL`; these were the Revision 2 inventory findings resolved by the
Revision 4 atomic cutover:

1. Calendar models emit and persist Chinese and English semantic copies.
2. Scene, Calendar and Map no-suffix display fields can re-enter Prompts.
3. World Map Expansion can write Chinese-only semantic text.
4. Item no-suffix display slots can contain copied English rather than Chinese.
5. Translation writes Scene/Actor/Archive display values into world metadata.
6. Turn settlement waits for translation before final commit.
7. Segmented message rendering can use `textZh` independently from the display
   language setting.
8. Actor Dossier, Appraisal, custom Spell/Item and settings UI can expose raw
   English.
9. Entity matching behavior differs across Actor, Spell, Item and Map/Room.
10. Some `*En` fields include raw Chinese player evidence.

The offline ratchet now reports zero current violations for these classes.

## 6. Current Phase 2 Runtime

`CURRENT`, Revision 4:

- canonical State, chat transaction, Prompt and Knowledge prose are English;
- dynamic translations persist in an authenticated server TranslationTableV1
  outside world authority and JSONL;
- browser clearing cannot delete server translation rows;
- valid server rows are not automatically evicted;
- English commit never waits for translation;
- display locale defaults to `zh-CN` and can switch independently;
- current message translation has highest priority;
- idle batches translate current state and recent history, then older archives;
- page opening raises priority but is not the only trigger;
- a new player action stops dispatching additional idle batches;
- one translation request per batch; no repair/retry;
- non-English model output remains non-fatal and is not adopted into canonical
  tables;
- bilingual State fields are atomically removed without dual-read/write.

## 7. Phase 3 Target

`FUTURE_P3`, not approved for implementation:

- the composer persists an ordered `intentSequence[]`;
- Chinese and English aliases resolve to stable IDs;
- entity collisions return unresolved;
- raw Chinese input remains immutable evidence;
- models receive bounded stable IDs and English labels;
- action, object, recipient, Spell, Item, destination, speech and free-text
  modifiers preserve order across retry/rollback/refresh.

## 8. Revision 2 Governance Acceptance

Revision 2 is governance-only:

- no production runtime import of the audit;
- no production writer/reader change;
- no Prompt/Schema/Validator/Reducer change;
- no UI or scheduler change;
- no save or Knowledge mutation;
- audit source SHA/bytes/mtime remain unchanged;
- current violations may stay equal or decrease, never increase;
- unknown language-bearing fields fail the offline audit;
- live model output is never intercepted by this governance layer.
