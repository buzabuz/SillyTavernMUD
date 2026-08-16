# Research Findings

Artifact revision: 0

Status: read-only investigation complete.

No implementation or product contract is approved by this report.

## Executive Findings

1. Hogwarts MUD does not have one language architecture. English-authoritative
   records, bilingual records, Chinese display projections, and a small number
   of Chinese-authoritative fields coexist.
2. Player Chinese input is not translated to English. The original text is
   persisted and directly consumed by deterministic parsers, local models,
   Knowledge retrieval, and the Low Scene Performer.
3. The first translation in a normal turn happens after the Low result has
   passed settlement and validation. Its direction is English model output to
   Simplified Chinese display text.
4. Most entity relationships already use stable IDs. The main drift boundary
   is natural-language mention binding and first-time entity creation, not the
   absence of IDs throughout State.
5. Fresh blind agents recognized Chinese and English entity concepts equally
   well. Without a supplied catalog, their proposed IDs drifted in both
   languages. With a bounded production-shaped catalog, both languages mapped
   all tested Canon and project-specific entities to exact IDs.
6. A subject/predicate/object input direction is feasible, but three slots
   alone cannot preserve the current multi-line ordering, direct speech,
   indirect object, instrument, destination, condition, negation, or free
   modifiers. The persisted contract would need a bounded intent sequence
   rather than a single flat triple.

## Evidence Scope

Production paths were read from:

- `ui/turn-controller.js`
- `workflows/turn.js`
- `workflows/turn-performance.js`
- `adapters/local-semantic.js`
- `adapters/translation.js`
- `ui/translation-controller.js`
- `ui/message-renderer.js`
- Actor, Spell, Item, Map, Calendar, Event, Appraisal, Social and Knowledge
  domain modules

Current-save measurements came from:

`data/default-user/chats/Hogwarts_World_Director/Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl`

The measured State revision was `123`. Backups and historical audit counts were
not used as current counts.

## Current Language Architecture

| Domain | Current persisted language contract | Current model/UI behavior |
| --- | --- | --- |
| Player input | `message.mes` is the original user text, commonly Chinese | Persisted before generation and sent to parsers/models without translation |
| Assistant messages | `mes`, `sourceEn`, and `segments[].textEn` are English authority; `translatedZh`, `display_text`, and `segments[].textZh` are Chinese display projections | Renderer shows Chinese first and retains English original |
| Scene / Scene Archive | English `*En` authority plus Chinese no-suffix projections | Both versions may enter later Prompt objects |
| Calendar / Agenda | `title/titleEn`, `summary/summaryEn`, and related pairs are jointly required | Calendar models produce both languages; UI prefers Chinese |
| Event | `summaryEn` is the only semantic summary | Event text enters Knowledge and actor memory in English |
| Global Chronicle | `summaryEn` only | UI needs translation/fallback to become Chinese-only |
| Appraisal | `summaryEn` only | Dossier currently exposes English; record may re-enter actor capsules |
| Person Schema | `factPatternEn`, `interpretationEn`, `expectationEn` only | `expectationEn` re-enters Low actor memory context |
| Relationship Evidence | Mostly IDs, dimensions, emotions, tags, and Event/Appraisal references | Chinese labels are projection, not prose authority |
| Actor Core / Runtime | `nameEn`, `roleEn`, profile/performance `*En`, and runtime `*En` | Dossier header and details can expose English directly |
| Item | `label/labelEn`, `appearance/appearanceEn`, `notes/notesEn` | No-suffix fields are not guaranteed Chinese; English is sometimes copied into them |
| Spell | Catalog has `name/nameEn` and `effect/effectEn`; spellbook references `spellId` | UI usually shows Chinese name plus incantation; custom spells can remain English |
| Interior Map | Usually English `*En` authority plus translated no-suffix display fields | UI prefers Chinese |
| World map extension | Some generated `name/summary` fields are Chinese-only | This contradicts the general English-output convention |
| Knowledge | Stable IDs and mostly English indexed text; player Chinese can appear in transcript records | Chinese queries are embedded directly; retrieved records re-enter prompts |
| UI shell | Main gameplay controls are mostly Chinese | Decorative headings, settings, Actor dossier, Appraisal, XP, IDs, and technical configuration still expose English |

This means neither "State is English" nor "State is bilingual" is globally
true.

## Current Tina Save Measurements

| Store | Current count | Observed language shape |
| --- | ---: | --- |
| User messages | 101 | 54 contain CJK, 47 do not |
| Assistant messages | 114 | all 114 have `sourceEn` and `translatedZh` |
| Assistant segments | 1,015 | all 1,015 have both `textEn` and `textZh` |
| Actor Core / Runtime | 23 / 23 | English core/runtime text; bilingual aliases |
| Event | 11 | English `summaryEn` only |
| Appraisal | 35 | English `summaryEn` only |
| Relationship Evidence | 13 | reference/enumeration data, no copied prose summary |
| Scene Archive | 12 | English authority plus partially populated Chinese projection |
| Global Chronicle | 12 | English `summaryEn` only |
| Calendar entries | 17 | bilingual fields, but current Chinese slots include untranslated English |
| Items | 10 | bilingual slots, but several no-suffix slots still contain English |
| Known spells | 5 | stable `spellId`; one custom definition is persisted |

## Player Input and Translation Call Graph

The normal turn path is:

1. `#hpmud_input` textarea.
2. `submitTurn()` reads the original text.
3. Address, Spell, and later Item directives are parsed.
4. Original text is persisted to `message.mes`.
5. Original Chinese enters deterministic movement, pacing, check, Actor, Spell,
   and Item logic.
6. Original Chinese enters the local pre-turn model and Knowledge query.
7. Low Scene Performer receives Chinese `playerAction` and
   `playerTurnSequence`, then must output English `textEn`.
8. The result passes parse, settlement, authority, provenance, and validation.
9. `localizeTurnTransaction()` calls `translateOpeningValues()`.
10. Translation explicitly requests `en -> zh-CN`.
11. English authority and Chinese display projections are persisted together.

Models or semantic systems that directly consume the original player Chinese
include:

- local pre-turn adjudicator;
- Low Scene Performer;
- local post-turn observer;
- conditional inventory observer;
- conditional Social Director scene evidence;
- Knowledge embedding/search.

There is no player-input `zh -> en` translation layer in the production turn
path.

## Current Entity Identity Architecture

| Entity | Current stable identity | Remaining drift boundary |
| --- | --- | --- |
| Actor | Runtime `actor.id`; Canon link is `canonCatalogId` | Free-text Canon admission, localized aliases, and model-created temporary Actor IDs |
| Spell | Catalog/custom `spell.id`; spellbook stores `spellId` | Free-text resolver checks incantation and aliases, but not all `name/nameEn` fields |
| Item | Instance `item.id`; formal directives already use the ID | No general free-text Item resolver; new proposal IDs can originate from model output |
| Map / Room | `mapId` and `roomId` | Destination resolver uses substring scoring and has weak tie handling |
| Clue | Story-arc `clue.id` | Opening model creates the initial ID; later reveal requires exact reuse |

Important current details:

- Actor Core has no dedicated Chinese display name. Canon localization exists
  outside Core, while runtime aliases may contain Chinese.
- Canon Actor name conflicts resolve to no match rather than an arbitrary Actor.
- `@人物：台词` requires exactly one present Actor alias match.
- `✦【咒语:stable_id】` is deterministic, but an unknown Spell ID is currently
  ignored.
- Item operation directives use stable IDs and reject unknown or unpaired Item
  references.
- Canon Item template IDs become instance IDs; there is no separate
  `catalogItemId`.
- Opening models still create Actor, Map, Room, Story Arc, and Clue IDs.

The proposed redesign should therefore not be framed as "replace every natural
language primary key." Most references are already coded. The narrower problem
is to make entity binding deterministic before the model sees the turn and to
make code allocation deterministic for genuinely new entities.

## Blind Recognition Experiment

### Method

Six fresh context-free agents were used:

- Chinese and English without any catalog;
- Chinese and English with a production-shaped Canon catalog;
- Chinese and English with current-save project-specific Actors, a custom
  Spell, and project Items.

Each agent:

- had no repository, PRD, expected answer, previous output, or scoring rules;
- received only its test request;
- returned one response;
- received no repair, retry, or validation feedback.

The expected answers and scoring remained in the parent investigation.

### Results

| Condition | Chinese | English |
| --- | ---: | ---: |
| Entity type/concept, no catalog | 7/7, plus 1 false positive | 7/7, 0 false positives |
| Exact current project ID, no catalog | 3/7 | 2/7 |
| Canon entities with bounded catalog | 7/7 | 7/7 |
| Project-specific/custom entities with bounded catalog | 5/5 | 5/5 |
| Combined exact ID with bounded catalog | 12/12 | 12/12 |

The Chinese no-catalog agent incorrectly promoted "长袍口袋" to a separate
Item. Both no-catalog agents understood the intended entities, but invented
plausible IDs that did not match State:

- `hermione_granger` instead of `canon_hermione_jean_granger`;
- `hogwarts_acceptance_letter` instead of `acceptance_letter`;
- English `levitation_charm` instead of `wingardium_leviosa`;
- English `mending_charm` instead of `reparo`;
- Chinese `wizard_money_pouch` instead of `wizarding_money_pouch`.

The bounded-catalog agents correctly mapped Chinese localized mentions to
English-only Actor cards and Item labels, including `亚历克斯·张` to
`alex_zhang`, `米雷娜·万斯` to `mirena_vance`, and `哈利·波特亲笔签名` to
`harry_signed_parchment`.

The sample is deliberately small and cannot establish a universal language
accuracy percentage. It does establish the architectural result needed here:
language choice did not guarantee ID stability; bounded catalog binding did.

## Deterministic Resolver Baseline

Using the same seven natural-language mentions per language:

| Current free-text path | Chinese | English |
| --- | ---: | ---: |
| Exact stable IDs recovered | 2/7 | 1/7 |

Reasons:

- Chinese Canon Actor aliases matched `赫敏` and `麦格教授`.
- English first-name/title mentions did not match the Canon admission index.
- Chinese Spell display names such as `悬浮咒` and `恢复如初` are not generally
  part of `findSpellReferences()`.
- English `Levitation Charm` matched an explicit alias, while `Mending Charm`
  did not.
- Item free text is intentionally not guessed into a formal Item operation.

The existing structured samples were language-neutral:

- `@人物：台词` resolved both Chinese and English Actor aliases;
- `✦【咒语:wingardium_leviosa】` resolved in both languages;
- `【物品:acceptance_letter｜display label】` resolved in both languages.

All six structured sample bindings returned the exact ID.

## Evaluation of the Proposed Direction

### Structured Chinese Input

Directionally supported. The current UI already proves that hidden IDs can be
inserted for Spell and Item operations. However, a single flat
subject/predicate/object record would lose current behavior.

A later design must account for at least:

- ordered multiple clauses;
- action versus direct/broadcast speech;
- subject and addressee;
- direct object and indirect object/recipient;
- instrument, Spell, Item, destination, and quantity;
- negation, attempt, condition, and temporal order;
- free modifiers that do not fit a closed taxonomy;
- refresh, retry, rollback, and persisted-message recovery.

The current `playerTurnSequence` only distinguishes `action`,
`direct_speech`, and `broadcast_speech`; it does not carry semantic roles.

### Pure Chinese UI

Feasible, but it is not only a label-translation task. Chinese projections are
missing or unreliable for Actor Core/Dossier, Appraisal, Person Schema, Global
Chronicle, custom Item/Spell content, and parts of Map/Calendar. Technical
settings and stable IDs are also displayed directly.

A later PRD must choose whether Chinese display text is:

- persisted as a versioned display cache;
- produced on demand from English authority;
- or stored in a dedicated localization catalog.

Adding more unversioned no-suffix State fields would continue the current
mixed-language problem.

### Coded Entity Identity

Strongly supported at the binding boundary. The blind results show that codes
eliminate both Chinese and English model ID drift when supplied in a bounded
catalog.

The lowest-risk direction is:

- preserve existing stable IDs where they already exist;
- let frontend selection/autocomplete attach IDs before model invocation;
- pass bounded ID plus label records, not full catalogs;
- reject unknown selected IDs rather than ask the model to guess;
- allocate genuinely new IDs deterministically outside the model;
- keep display labels separate from identity.

This is narrower than a global primary-key rewrite and avoids unnecessary save
migration.

## Product Decisions Required Before Revision 1

1. Is the structured input a strict form, an autocomplete-enhanced text editor,
   or a hybrid where unresolved free text remains allowed?
2. Must one turn support multiple ordered actions and speech blocks?
3. Is the predicate a closed operation code, or may the player create a custom
   verb phrase?
4. Which semantic roles are mandatory beyond subject/predicate/object:
   recipient, instrument, destination, quantity, condition, or sequence?
5. Should existing Actor, Spell, Item, Map, Room, and Clue IDs be preserved,
   with only new ID allocation changed?
6. Should English remain the model/state prose authority while the UI becomes
   Chinese, or is the intended change also to replace English prose fields?
7. Does "pure Chinese UI" include advanced model/API configuration, raw IDs,
   incantations, and diagnostic panels?
8. When a user types an entity name without selecting a suggestion, should the
   turn be rejected, remain unresolved free text, or invoke a deterministic
   exact-alias resolver?
