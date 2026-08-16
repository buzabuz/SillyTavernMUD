# Phase 2 Language Migration Matrix

Artifact revision: 2

Status: approved by Revision 4; implementation in progress.

Scope:

- one-time atomic JSONL authority migration;
- current Tina archive evidence at State revision `123`;
- future old-save behavior;
- no Phase 3 structured-input changes.

## 1. Atomic Boundary

The authority migration rewrites the entire JSONL in one guarded host
`saveChat()` operation. The host `/api/chats/save` path uses an atomic file
replacement.

The transaction contains:

```text
first-line chat_metadata.hogwartsMud State
all existing chat messages
active swipe metadata
turnRetry.baseState checkpoint
languageAuthorityVersion = 1
```

Preflight builds and validates the complete next JSONL in memory. No live State
or message object is mutated before preflight passes.

Failure behavior:

- any unregistered canonical CJK field blocks migration;
- any required English sibling missing blocks migration unless it is covered by
  the exact Tina exception in section 8;
- no model, repair, retry or automatic translation is used to repair migration;
- a failed host save restores the previous in-memory State/chat snapshot;
- source file bytes remain unchanged on every preflight/save failure.

The server translation table is non-authoritative and is not part of the JSONL
atomicity boundary. Existing display translations are upserted and
query-verified before deletion. Table failure blocks JSONL migration and leaves
the source JSONL unchanged.

## 2. Version Matrix

| Field | Before | After |
| --- | ---: | ---: |
| `languageAuthorityVersion` | absent | `1` |
| `calendar.version` | `2` | `3` |
| `itemSystemVersion` | `3` | `4` |
| `materialStateVersion` | `2` | `3` |
| `spellbook.version` | `2` | `3` |
| `map.localMapVersion` | `1` | `2` |
| message `extra.hogwartsMud.languageVersion` | absent | `1` for Hogwarts assistant messages |
| `turnRetry.baseState` | old language versions | recursively migrated to the same target versions |

Actor Context, Event/Knowledge and Memory reference versions do not change
unless their field shape changes for a separately listed reason.

## 3. Direct Paired-Field Removal

Every row requires a present, non-empty English source before the no-suffix
display field is deleted.

| Before path | English authority retained | After | Tina active values |
| --- | --- | --- | ---: |
| `scene.name` | `scene.nameEn` | delete `name` | 1 |
| `scene.summary` | `scene.summaryEn` | delete `summary` | 1 |
| `scene.explorationHook` | `scene.explorationHookEn` | delete no-suffix field | 1 |
| `scene.crowdDirection` | `scene.crowdDirectionEn` | delete no-suffix field | 1 |
| `scene.nextSceneIntent.title` | `titleEn` | delete `title` | 1 |
| `scene.nextSceneIntent.summary` | `summaryEn` | delete `summary` | 1 |
| `scene.nextSceneIntent.trigger` | `triggerEn` | delete `trigger` | 1 |
| `sceneArchive[].name` | `nameEn` | delete `name` | 12 |
| `sceneArchive[].summary` | `summaryEn` | delete `summary` | 12 |
| `sceneArchive[].closureSummary` | `closureSummaryEn` | delete no-suffix field | 12 |
| `sceneArchive[].authorQuill` | `authorQuillEn` | delete no-suffix field | 11 |
| `sceneArchive[].explorationHook` | `explorationHookEn` | delete no-suffix field | 3 |
| `sceneArchive[].unresolvedThreads[]` | `unresolvedThreadsEn[]` | delete no-suffix array | 40 |
| `calendar.storylines[].title/summary` | `titleEn/summaryEn` | Calendar V3 deletes no-suffix fields | 2 fields on 1 record |
| `calendar.storyBeats[].title/summary` | `titleEn/summaryEn` | Calendar V3 deletes no-suffix fields | 2 fields on 8 records |
| `calendar.entries[].title/summary` | `titleEn/summaryEn` | Calendar V3 deletes no-suffix fields | 2 fields on 17 records |
| `conflict.title/premise/incitingEvent/immediatePressure/stakes` | matching `*En` | delete five display fields | 5 |
| `items[].label/appearance/detail/notes` | matching `*En` | Item V4 deletes display fields | 40 fields on 10 Items |
| `map.customLocalMaps[].name` | `nameEn` | Local Map V2 deletes `name` | 3 |
| `map.customLocalMaps[].levels[].name` | `nameEn` | delete no-suffix field | 5 |
| `map.customLocalMaps[].nodes[].name/description` | matching `*En` | delete no-suffix fields | 46 fields on 23 rooms |
| `map.generatedNodes[].name/summary`、`map.proposals[].reason` | matching `nameEn/summaryEn/reasonEn` | World Map Expansion writes English-only fields; delete no-suffix fields | 0 |
| custom Spell `definition.name/effect` | `nameEn/effectEn` | Spellbook V3 deletes display fields | 2 |
| `checks[].label/attributeLabel/outcomeLabel` | matching `*En` | delete display fields | 66 fields on 22 checks |
| `checks[].spell.name` | `nameEn` + `spellId` | delete display name | 3 |
| `checks[].target.name` | `target.actorId` when present | delete copied name; UI resolves actor locale | 10 |
| `opening.package.display` | opening package `*En` fields | delete entire display object | 1 object / 48 string values |
| `agenda[].label/timeLabel` | `labelEn/timeLabelEn` | delete retired display fields | 8 fields |

The same operations apply recursively to `turnRetry.baseState`.

## 4. Static-Code Projection Removal

| Before | After authority | Display source |
| --- | --- | --- |
| `campaign.presetName` | retain `campaign.presetId` only | static locale resource |
| `campaign.difficultyName` | retain `campaign.difficulty` only | static locale resource |
| root `status[].label/detail` | delete root display array | deterministic status codes + static locale resource |
| `spellbook.known[].proficiencyLabel` | retain `proficiencyRank` | static locale resource |
| built-in Spell `name/effect` in semantic catalog | English catalog contains `nameEn/effectEn`; Chinese moves to locale resource | static locale resource |
| Canon Item no-suffix display text | English Item catalog only | static locale resource |
| preset Map/Room Chinese labels | English topology/catalog only | static locale resource |
| Actor Chinese aliases | remain `entity_alias`, not semantic authority | locale alias catalog |

## 5. Root Scene and Timeline

| Before | After | Rule |
| --- | --- | --- |
| root `chapter` | `chapterEn` | source from `opening.package.chapterEn` or current Scene transition English source |
| root `location` | removed | authority is `mapId + roomId`; UI resolves locale |
| root rolling `timeline[].label` | `timeline[].summaryEn` | deterministic source-ref reconstruction |
| `scene.timelineEntries[].label` | `summaryEn` | deterministic reconstruction |
| `sceneArchive[].timelineEntries[].label` | `summaryEn` | deterministic reconstruction |

Current Tina deterministic coverage:

```text
total timeline entries: 127
from Scene summaryEn: 13
from English ordered turnTransaction.publicEventEn: 100
from Scene closureSummaryEn: 13
from proposed exact Tina timeline replacement: 1
unresolved after proposed replacement: 0
```

Mapping order within one Scene:

1. first timeline entry uses `scene.summaryEn`;
2. ordered middle entries use ordered assistant
   `turnTransaction.publicEventEn` within `sceneArchive[].messageIds` only
   when the value is English authority;
3. remaining same-clock closure entries use `closureSummaryEn`.
4. the one non-English message-6 source requires the exact Revision 4
   allowlist replacement in section 8.3.

The migration adds a stable source ref to every reconstructed timeline entry.
It does not delete duplicate historical entries or change clocks.

## 6. Character V2

Player-entered source text is evidence, not English semantic authority.

| Before | After |
| --- | --- |
| `character.identity.name` | `character.inputEvidence.identity.name` + optional validated `identity.nameEn` |
| free-form identity/background/aptitude text | locale-tagged `inputEvidence` |
| Chinese select values such as `蛇佬腔` | stable codes such as `parseltongue` |
| `polishedBackground` | `polishedBackgroundEn` only when validated as English |
| attributes and story-preference codes | unchanged |
| Prompt receives full `character` object | Prompt receives bounded Character V2 English projection only |

Rules:

- raw player evidence remains available for editing and display;
- raw player evidence never enters Prompt or Knowledge as settled English fact;
- known select values migrate through fixed code tables;
- unknown free text is not machine-translated during migration;
- missing optional English prose is omitted, not treated as migration failure;
- models refer to the player by stable ID `player` when `nameEn` is absent.

Current Tina:

- `name`, appearance, guardian, desire, fear and polished background are already
  English;
- `rareTalent="蛇佬腔"` maps deterministically to `parseltongue`;
- no Character V2 semantic field requires generated migration prose.

## 7. Assistant Message V2

Delete from every Hogwarts assistant message and active swipe:

```text
extra.display_text
extra.hogwartsMud.translatedZh
extra.hogwartsMud.provider
extra.hogwartsMud.translatedAt
extra.hogwartsMud.translationVersion
segments[].textZh
turnTransaction public/display fields without En suffix
localized Actor/Item/Clue copies
```

Field-level transaction migration:

| Before path | After |
| --- | --- |
| `extra.hogwartsMud.authorQuill` | retain `authorQuillEn`; delete display copy |
| `turnTransaction.publicEvent` | retain `publicEventEn`; delete display copy |
| `actorUpdates[].currentActivity/currentIntent` | retain matching `*En`; delete display copies |
| `actorUpdates[].firstImpressionOfPlayer/impressionOfPlayer` | retain matching historical `*En` evidence only; delete display copies; no current writer is restored |
| `actorUpdates[].memoryUpdate.summary/significance/lastingImpact` | retain matching historical `*En` evidence only; delete display copies; no current Low writer is restored |
| `temporaryActorEntrances[].name/role/publicDescription/personality/speechStyle/currentActivity` | retain matching `*En`; delete display copies |
| `checkResolution.label/attributeLabel/outcomeLabel` | retain matching `*En`; UI resolves static labels |
| `checkResolution.target.name` | delete copied name; retain `actorId` |
| `checkResolution.spell.name` | retain `spellId/nameEn`; delete display copy |
| `checkResolution.spellObservation.name` | retain stable Spell identity/English name; delete display copy |
| `itemCandidates[].item.label/appearance/detail/notes` | retain matching `*En`; delete nested display copies |
| `itemOperations[].item.label/appearance/detail/notes` | retain matching `*En`; delete nested display copies |
| `itemUpdates[].label/detail` | retain matching `*En`; delete display copies |
| `spellCandidates[].definition.name/effect` | retain matching `*En`; delete display copies |

`sourceEn` is removed as a duplicate. Accepted English message authority is:

```text
message.mes when the complete message is canonical English
segments[].textEn for accepted English segments
turnTransaction.*En for accepted canonical fields
```

Non-English model output:

```text
segments[].rawText
segments[].language
segments[].authority = "model_output_evidence"
```

It remains renderable but is excluded from State, Prompt and Knowledge.

Current Tina:

```text
assistant messages: 114
assistant segments: 1015
messages with CJK in a canonical English slot: 4
CJK segments misfiled as textEn: 8
message IDs: 35, 133, 143, 212
```

For mixed messages, accepted English segments retain `textEn`; non-English
segments move to `rawText`. For an all-non-English response, `message.mes`
remains raw display evidence and `sourceEn` is absent.

If a legacy `*En` transaction field contains Han text:

- the value moves to bounded `modelOutputEvidence[]` with its original field
  path and detected language;
- the canonical field is omitted;
- its enclosing proposal/record is skipped when that English field was
  required;
- no English replacement is generated during migration;
- unrelated valid transaction fields remain.

## 8. Tina-Only Exception

This exception is approved only for the current Tina archive.

Guard:

```text
timelineEpoch = legacy_cdf2d1047e32546a
pre-migration projectionFingerprint = cyrb53-1c9fded13a8022
pre-migration stateRevision = 123 for the reviewed report; implementation
rechecks content identity and exact before strings instead of assuming revision
event ID must match the exact allowlist
every before string must match exactly
```

Any mismatch disables the exception and blocks preflight. Other saves cannot
reuse these replacements.

### 8.1 Material Event replacements

| Event ID | Field | Before | After English |
| --- | --- | --- | --- |
| `material_f093d6101ca6300858b3` | `valueText` | `长袍` | `robes` |
| `material_402f3a40fe89a5d5e080` | `targetText` | `后使用变形术` | `after using Transfiguration` |
| `material_402f3a40fe89a5d5e080` | `description/evidence display` | `首先使用魅力,然后在破坏后使用变形术。` | `First using Charms, then using Transfiguration after the damage.` |
| `material_a093a9125145bef0542a` | `objectText` | `他的南瓜汁并将其举在自己面前` | `his pumpkin juice, held up in front of himself` |
| `material_a093a9125145bef0542a` | English source evidence | Chinese evidence | `He picked up his pumpkin juice and held it in front of himself like a small orange shield.` |
| `material_f7c74abe0fe1eac97271` | `objectText` | `叉子` | `fork` |
| `material_f7c74abe0fe1eac97271` | English source evidence | Chinese evidence | `Further down the table two older students set their forks down and turned round.` |
| `material_objectmovedmovecanonharryjamespotterfeet` | `objectText` | `南瓜汁玻璃` | `pumpkin juice glass` |
| same | `sourceText` | `桌子边缘` | `table edge` |
| same | `targetText` | `哈利` | `Harry` |
| same | `valueText` | `他放置的地方` | `where he had set it` |
| same | `previousValueText` | `未放置` | `not placed` |
| same | `resultText` | `移动` | `moved` |
| same | English source evidence | Chinese sentence | `Harry's pumpkin juice glass rocked where he'd set it and rolled three inches toward the table edge before stopping against someone's elbow.` |

Material V3 renames semantic fields:

```text
objectTextEn
sourceTextEn
targetTextEn
valueTextEn
previousValueTextEn
resultTextEn
descriptionEn
```

Raw evidence becomes language-tagged source evidence and never enters Prompt.
`map.roomStates[].materialEffects` is rebuilt from migrated
`materialEventLog`, not patched independently.

### 8.2 Actor Presentation replacements

| Path | Before | After |
| --- | --- | --- |
| `actorPresentations.canon_lavender_brown.outfit` | `长袍` | `outfitEn="robes"` |
| `actorPresentations.canon_harry_james_potter.heldItems.unspecified` | `他的南瓜汁并将其举在自己面前` | `his pumpkin juice, held up in front of himself` |
| `actorPresentations.canon_harry_james_potter.heldObject` | same Chinese text | `heldObjectEn="his pumpkin juice, held up in front of himself"` |

IDs, clocks, Item refs and sourceEventId are not changed by this language-only
exception.

The same exact replacements apply inside `turnRetry.baseState`.

### 8.3 Timeline replacement approved by Revision 4

This row is not covered by the previously approved Material/Presentation
exception. Revision 4 explicitly approved it on 2026-08-15.

| Guard | Before | After |
| --- | --- | --- |
| message ID `6`, clock `1991-07-24 · 10:00`, exact Tina timeline/content identity | `Legacy player action: （叹了口气）我说：“行吧行吧，你们说什么是什么吧。” 我抱着胳膊，让麦格教授进去。然后尝试伸出脚绊她一脚。` | `Tina sighs, reluctantly lets Professor McGonagall enter, folds her arms, and tries to trip her as she steps inside.` |

The replacement becomes `turnTransaction.publicEventEn` and the matching
timeline `summaryEn`; the timeline `sourceRef` points to message `6`. The
original player message remains unchanged as `player_input_evidence`. The
active swipe copy must match and receive the same replacement. Any mismatch
blocks preflight.

## 9. Check Records

| Before | After |
| --- | --- |
| `reasonEn` includes the raw Chinese action | remove prose; retain bounded English `reasonCode` + `sourceMessageId` |
| localized labels | removed; UI resolves codes |
| copied target name | removed; UI resolves `actorId` |

Current Tina has 22 check records. The migration does not change rolls,
modifiers, outcomes, DCs, Items, Spells or targets.

## 10. Server Translation-Table Seeding

Current Tina active JSONL display data excluding retry/swipe copies:

```text
display-cache-like values: 3830
characters: 435183
UTF-8 bytes: 1262463
unique assistant segment translations: 1015
unique assistant segment UTF-8 bytes: 278128
```

Existing Chinese values are copied into
`TranslationTableRecordV1` rows before JSONL deletion when a stable English
source and record key exist.

Seeding rules:

- seed or read-back failure blocks the JSONL migration;
- partially seeded rows are valid and reused by an idempotent retry;
- table rows are keyed by source hash and cannot override new English;
- no translation-table value is read by Prompt, Knowledge, Validator or
  Reducer;
- clearing or changing browsers does not delete server rows;
- row upserts merge under a per-table mutex, append a checksummed journal
  transaction and periodically compact to an atomic snapshot;
- valid rows are not automatically evicted.

## 11. Validation Matrix

Before the single atomic save:

1. every target Schema validates;
2. every canonical string is free of Han code points;
3. every remaining non-English string is classified as player input evidence,
   model output evidence, entity alias, static resource or diagnostic;
4. no `dynamic_locale_cache` path remains in State/chat authority;
5. all Knowledge records rebuild from English canonical data;
6. all production Prompts build without locale-cache fields;
7. Item `state/physicalForm/holder/location` are byte-identical;
8. Event/Appraisal/Social refs and ACLs are byte-identical;
9. Calendar/Map/Actor/Item/Spell stable IDs are byte-identical;
10. `turnRetry.baseState` can still restore a valid migrated checkpoint.
