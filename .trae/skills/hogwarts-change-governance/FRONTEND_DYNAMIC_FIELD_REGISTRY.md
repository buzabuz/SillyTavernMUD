# Hogwarts Frontend Dynamic Field Registry

## Authority

This is the permanent registry for every dynamic text value rendered by the
Hogwarts MUD frontend. It applies to all Hogwarts frontend changes, not only
localization work.

The registry records field families. During acceptance, every repeated family
must expand to every actual visible instance in the representative save. A
single sampled card, date, message, Actor or Item cannot satisfy a repeated
row.

## Route Legend

| Route | Meaning | zh-CN acceptance |
| --- | --- | --- |
| `YES` | Dynamic English authority resolves through an exact TranslationTable identity and the visible reader uses that result | Must render `translated`; `pending`, `error` and source fallback fail after idle |
| `STATIC` | Value is a finite enum/chrome label resolved through the static locale catalog | Must render the zh-CN resource |
| `RAW` | Deliberately preserved player-authored evidence | Must equal the original player input; it is not proof that nearby semantic prose may bypass translation |
| `ALLOW` | Explicit non-Chinese allowlist: spell incantations, user-selected technical provider/model/API identifiers, URLs, configuration values, and source-backed literal symbols whose accepted Chinese rendering preserves the symbol (`H`, compartment `A-F`, geometric `V`) | Exact context-bound token only; surrounding prose must be Chinese, and a source-backed symbol must retain the same semantic role |
| `NO` | Dynamic semantic text reaches the DOM without the TranslationTable or authoritative locale catalog | Always fails |
| `PATCH` | A local implementation patch now claims a route but has not passed full browser acceptance | Fails until changed to `YES` by evidence |
| `REMOVED` | The internal value is no longer rendered on the player-facing surface | The value must be absent from the normal DOM and accessibility tree |

Stable IDs and internal codes are not generally allowlisted in Game, Calendar,
Map, Dossier, Item, Spell, Message or Relationship surfaces. If a product
workflow intentionally exposes one, the owning PRD must name the exact field
and approve it. Configuration screens may expose technical identifiers under
`ALLOW`.

## Required Acceptance Expansion

In `zh-CN`, open and inspect all rows below using the representative real save:

1. Home, every save card, Setup review and Settings/Profile controls.
2. Game header, current Scene, every currently rendered and loadable historical
   message, every message header, Author's Quill, check, Item proposal and Spell
   proposal.
3. People lists, every active/local Actor, every cohort, Composer addressing,
   movement and spell controls.
4. Calendar month dates, every date containing a schedule or archived Scene,
   every weekly card, every schedule detail, every archived Scene detail and
   transcript, every Storyline and every beat, plus Free Scene selectors.
5. Mini Map, World Map, every available local Map and level, every room tooltip,
   every Actor marker and every map selector option.
6. Player sheet, every Actor Dossier tab/section, every memory tier and entry,
   every relationship field, every Item, every Spell, Clues and Status.
7. Relationship Constellation canvas, text fallback, every node detail, every
   directed edge, every active sentiment and every evidence entry.

After idle drains, every expanded cell must be one of:

- Chinese display text from `translated`;
- Chinese static locale text from `STATIC`;
- exact `RAW` player evidence;
- exact narrow `ALLOW` token.

Any avoidable English prose, English Canon name, visible internal ID, permanent
`pending`, `error`, source fallback, or global status caused by hidden fields
fails the full gate.

## Home, Setup And Settings

| ID | Surface / visible value | Canonical source | Renderer | Table? | Exact route | 2026-08-15 source audit |
| --- | --- | --- | --- | --- | --- | --- |
| HOME-001 | New timeline year / grade / difficulty summary | campaign draft codes | `ui/app-controller.js::syncCampaignUi` | `STATIC` | difficulty and grade static keys + numbers | Route present |
| HOME-002 | Save timestamp | save `updatedAt` | `runtime/save-library.js::createSaveCard` | `STATIC` | locale date formatter | Route present |
| HOME-003 | Save character name | player input evidence | `runtime/save-library.js::createSaveCard` | `PATCH` | `character_input/player/identity.name` under the save timeline | Awaiting browser acceptance |
| HOME-004 | Save campaign name | campaign preset ID | `runtime/save-library.js::createSaveCard` | `STATIC` | campaign locale key | Verify every preset |
| HOME-005 | Save difficulty name | difficulty code | `runtime/save-library.js::createSaveCard` | `STATIC` | difficulty locale key | Verify every card |
| HOME-006 | Save chapter | `chapterEn` | `runtime/save-library.js` | `YES` | `world_state/root/chapterEn` or registered save timeline equivalent | Route present; browser unverified |
| HOME-007 | Save location | Map/room `nameEn` | `runtime/save-library.js` | `YES` | exact Map/room field identity | Route present; browser unverified |
| HOME-008 | Save message count | chat row count | `runtime/save-library.js::createSaveCard` | `STATIC` | number + static unit | Route present |
| HOME-009 | Save preview prose | save `preview` | `runtime/save-library.js::createSaveCard` | `PATCH` | `save_preview/<save>/textEn` under the save timeline | Awaiting browser acceptance |
| HOME-010 | Save translation status | projected status enum | `runtime/save-library.js::createSaveCard` | `STATIC` | translation status locale key | Route present; status itself cannot excuse fallback |
| SETUP-001 | Campaign note | campaign preset/year/grade/difficulty | `ui/setup-controller.js::loadSetupDraft` | `STATIC` | preset/difficulty locale + numbers | Route present |
| SETUP-002 | Character form values | player draft | `panel.html`, `ui/setup-controller.js` | `RAW` | player-authored form values | Route present |
| SETUP-003 | Attribute values and total | player draft numbers | `ui/setup-controller.js::updateAttributeTotal` | `STATIC` | numbers | Route present |
| SETUP-004 | Review character name | player draft identity | `ui/setup-controller.js::renderSetupReview` | `RAW` | original player name | Route present |
| SETUP-005 | Polished background textarea | player-editable setup evidence | `ui/setup-controller.js::renderSetupReview` | `PATCH` | locale-specific polish Prompt; zh-CN produces Chinese evidence | Awaiting blind and browser acceptance |
| SETUP-006 | Review blood/domain/talent facts | player values and stable codes | `ui/setup-controller.js::renderSetupReview` | `STATIC/RAW` | known codes use static catalog; free player values remain raw | Mixed route; verify each fact |
| SETUP-007 | Review world title | campaign year + preset | `ui/setup-controller.js::renderSetupReview` | `STATIC` | campaign locale key | Route present |
| SETUP-008 | Review Map/level/room names | Map catalogs / runtime maps | `ui/setup-controller.js::renderSetupMap` via Map Renderer | `YES/STATIC` | MAP rows below | Browser unverified |
| SETUP-009 | Review Map counts | map/level/node counts | `ui/setup-controller.js::renderSetupMap` | `STATIC` | numbers + static units | Route present |
| SETUP-010 | Validation and operation errors | validator/runtime errors | `ui/setup-controller.js`, toastr | `STATIC` | localized validation and generic operation-error keys; raw detail console-only | Awaiting error-path acceptance |
| SETTINGS-001 | Connection Profile name | user technical setting | `ui/settings-profile-controller.js` | `ALLOW` | exact user profile name | Allowed only in configuration |
| SETTINGS-002 | Model/API/provider IDs | technical setting/service response | `ui/settings-profile-controller.js` | `ALLOW` | exact model/API/provider identifier | Allowed only in configuration |
| SETTINGS-003 | Preset/Regex names | technical setting/import result | `ui/settings-profile-controller.js`, `ui/bindings.js` | `ALLOW` | exact technical name | Allowed only in configuration |
| SETTINGS-004 | Profile and connection status prose | operation state | `ui/settings-profile-controller.js`, `ui/bindings.js` | `STATIC` | static locale keys | Raw backend error remains **FAIL** |
| SETTINGS-005 | Context budget summary | numeric plan + mode codes | `ui/settings-profile-controller.js::syncContextPolicyUi` | `STATIC/ALLOW` | static labels + numeric technical values | Verify `RAG` and mode labels are explicitly allowed/configuration-only |
| SETTINGS-006 | Editable English world-system Prompt | `settings.worldPrompt` technical source | `panel.html`, `ui/settings-profile-controller.js` | `ALLOW` | exact user-editable technical Prompt source in Settings | Explicitly accepted by user; preserve as-is |
| SETTINGS-007 | Post semantic provider selector and Low Profile detail | `postTurnSemanticProvider` plus `modelSlots.low.profileId` → Connection Profile name/model | `panel.html`, `ui/settings-profile-controller.js` | `STATIC/ALLOW` | `low/local` uses static locale labels; Profile/model are exact configuration-only technical identifiers | Revision 25 implemented; browser acceptance pending |

## Game Header, People, Story And Composer

| ID | Surface / visible value | Canonical source | Renderer | Table? | Exact route | 2026-08-15 source audit |
| --- | --- | --- | --- | --- | --- | --- |
| GAME-001 | Topbar/current location | active Map/room `nameEn` | `ui/story-renderer.js::renderHeaderAndScene` | `YES` | exact Map/room identity | Route present |
| GAME-002 | Topbar chapter | `chapterEn` | `ui/story-renderer.js::getChapterField` | `YES` | `world_state/root/chapterEn` | Route present |
| GAME-003 | Topbar clock | world clock | `ui/story-renderer.js` | `STATIC` | numeric date/time | Route present |
| GAME-004 | Player avatar/name | player input evidence | `ui/story-renderer.js` | `PATCH` | `character_input/player/identity.name` | Awaiting browser acceptance |
| PEOPLE-001 | Active person name | Actor Core `nameEn` | `ui/story-renderer.js::getPeopleDisplay` | `YES/STATIC` | Canon zh catalog, else `actor_core/<id>/nameEn` | PATCH/route present; full list unverified |
| PEOPLE-002 | Active person location | Actor runtime Map/room | `ui/story-renderer.js::getPeopleDisplay` | `YES` | exact Map/room identity | Projection supplies display text; full list unverified |
| PEOPLE-003 | Active person activity | `actors[].currentActivityEn` | `ui/story-renderer.js::getPeopleDisplay` | `PATCH` | `actor_runtime/<id>/currentActivityEn` | Awaiting browser acceptance |
| PEOPLE-004 | Active person role fallback | `actorLibrary[].roleEn` | `ui/story-renderer.js::getPeopleDisplay` | `PATCH` | `actor_core/<id>/roleEn` | Awaiting browser acceptance |
| PEOPLE-005 | Active person life-status detail | `actors[].lifeStatusDetailEn` | `ui/story-renderer.js::getPeopleDisplay` | `PATCH` | `actor_runtime/<id>/lifeStatusDetailEn` | Awaiting browser acceptance |
| PEOPLE-006 | Active person intent tooltip | `actors[].currentIntentEn` | `ui/story-renderer.js::getPeopleDisplay` | `PATCH` | `actor_runtime/<id>/currentIntentEn` | Awaiting browser acceptance |
| PEOPLE-007 | Local person name | Actor Core `nameEn` | `ui/story-renderer.js` | `YES/STATIC` | same as PEOPLE-001 | PATCH/route present; unverified |
| PEOPLE-008 | Local person detail | location/activity/role/life detail | `ui/story-renderer.js` | `PATCH` | exact room, Actor Core and Actor Runtime fields | Awaiting browser acceptance |
| PEOPLE-009 | Cohort label | `cohorts[].label/labelZh/labelEn` | `people-projection.js`, `ui/story-renderer.js` | `PATCH` | `cohort/<id>/labelEn` | Awaiting browser acceptance |
| STORY-001 | Current live-log summary | `scene.timelineEntries[].summaryEn` | `ui/story-renderer.js` | `PATCH` | `scene_timeline/<scene>:<index>/summaryEn` after structured removal of recognized internal metadata tails | Awaiting browser acceptance |
| STORY-002 | Current Scene card title | `scene.nameEn` | `ui/story-renderer.js::renderSceneArchiveList` | `YES` | `scene/<id>/nameEn` | Route present |
| STORY-003 | Current Scene card location | Map/room `nameEn` | `ui/story-renderer.js` | `YES` | exact Map/room identity | Route present |
| STORY-004 | Archived Scene list title | `sceneArchive[].nameEn` | `ui/story-renderer.js` | `YES` | `scene_archive/<id>/nameEn` | Route present |
| STORY-005 | Archived Scene list location | archived Map/room IDs | `ui/story-renderer.js` | `YES` | exact Map/room identity | Route present |
| STORY-006 | Current Scene heading name | `scene.nameEn` | `ui/story-renderer.js::renderStory` | `YES` | `scene/<id>/nameEn` | Route present |
| STORY-007 | Current Scene heading summary | `scene.summaryEn` | `ui/story-renderer.js::renderStory` | `YES` | `scene/<id>/summaryEn` | Route present |
| STORY-008 | Archive empty fallback summary | `closureSummaryEn/summaryEn` | `ui/story-renderer.js::renderSceneArchiveTranscript` | `YES` | `scene_archive/<id>/<field>` | Route present |
| STORY-009 | Scene Transition current name | `scene.nameEn` | `ui/story-renderer.js::openSceneTransitionDialog` | `PATCH` | `scene/<id>/nameEn` | Awaiting browser acceptance |
| STORY-010 | Scene Transition default intent | `nextSceneIntent.titleEn/summaryEn` | `ui/story-renderer.js::formatNextSceneIntent` | `PATCH` | `scene_intent/<sceneId>/titleEn,summaryEn` | Awaiting browser acceptance |
| STORY-011 | Scene Transition matched destination | room name + room ID | `ui/story-renderer.js::updateSceneDestinationStatus` | `REMOVED` | exact room name remains; `roomId` removed from visible status | Awaiting DOM acceptance |
| STORY-012 | Runtime failure detail | Opening/turn/transition raw error | `ui/story-renderer.js::renderStory` | `STATIC` | localized generic failure; raw detail remains console-only | Source route present |
| COMPOSER-001 | Movement origin room | current room `nameEn` | `ui/composer-controller.js::renderMovementPicker` | `YES` | exact room identity | Route present |
| COMPOSER-002 | Movement level heading | level `nameEn` | `ui/composer-controller.js` | `YES` | exact level identity | Route depends on movement projection; verify |
| COMPOSER-003 | Movement option room | room `nameEn` | `ui/composer-controller.js` | `YES` | exact room identity | Route depends on movement projection; verify |
| COMPOSER-004 | Movement option access | access enum | `ui/composer-controller.js` | `STATIC` | static locale key | Route present |
| COMPOSER-005 | Movement option internal ID | room stable ID | `ui/composer-controller.js` | `REMOVED` | stable ID remains command value/search alias only | Awaiting DOM acceptance |
| COMPOSER-006 | Address option Actor name | Actor Core/display projection | `ui/composer-controller.js::renderComposerAddressing` | `PATCH` | Canon catalog or `actor_core/<id>/nameEn` | Awaiting browser acceptance |
| COMPOSER-007 | Address preview target names | parsed target labels | `ui/composer-controller.js` | `PATCH` | composer inserts the localized Actor display name | Awaiting browser acceptance |
| COMPOSER-008 | Spell incantation | Spell definition `incantation` | `ui/composer-controller.js` | `ALLOW` | exact incantation only | Allowed |
| COMPOSER-009 | Built-in Spell name/effect | built-in Spell ID | `ui/composer-controller.js` | `STATIC` | `spell.<id>.name/effect` | Route present |
| COMPOSER-010 | Custom Spell name | custom `definition.nameEn` | `ui/composer-controller.js` | `PATCH` | `spell_definition/<id>/nameEn` | Unverified |
| COMPOSER-011 | Custom Spell effect | custom `definition.effectEn` | `ui/composer-controller.js` | `PATCH` | `spell_definition/<id>/effectEn` | Unverified |
| COMPOSER-012 | Spell source/rank/curriculum labels | learned codes/numbers | `ui/composer-controller.js` | `STATIC` | static locale keys + numbers | Route present |
| COMPOSER-013 | Spell/Movement preview technical XP/count | numeric | `ui/composer-controller.js` | `ALLOW/STATIC` | numeric + static labels | Route present |

## Messages, Checks And Proposals

| ID | Surface / visible value | Canonical source | Renderer | Table? | Exact route | 2026-08-15 source audit |
| --- | --- | --- | --- | --- | --- | --- |
| MSG-001 | Player message header name | player input evidence | `ui/message-renderer.js::renderMessage` | `PATCH` | `character_input/player/identity.name` | Awaiting browser acceptance |
| MSG-002 | Player message body | `message.mes` | `ui/message-renderer.js::renderMessage` | `RAW` | original player input | Route present |
| MSG-003 | System message body | system `message.mes` | `ui/message-renderer.js::renderMessage` | `PATCH` | `system_message/<messageId>/mes` | Awaiting browser acceptance |
| MSG-004 | Segmented narration/dialogue body | `segments[].textEn` | `ui/message-renderer.js::renderSegmentedMessage` | `YES` | `message_segment/message:<id>:segment:<index>/textEn` | Route present; every visible/historical segment must expand |
| MSG-005 | Segment raw evidence | `segments[].rawText` | `ui/message-renderer.js` | `RAW` | exact evidence only | Allowed only for explicitly registered evidence |
| MSG-006 | Dialogue header Actor name | Actor Core `nameEn` | `ui/message-renderer.js` | `YES/STATIC` | Canon catalog, else Actor field | PATCH/route present; unverified |
| MSG-007 | Dialogue header Actor role | Actor Core `roleEn` | `ui/message-renderer.js` | `PATCH` | `actor_core/<id>/roleEn` | Awaiting browser acceptance |
| MSG-008 | Author's Quill prose | `extra.hogwartsMud.authorQuillEn` | `ui/message-renderer.js` | `PATCH` | `author_quill/<messageId>/authorQuillEn` | Existing table row was bypassed; patch unverified |
| MSG-009 | Archived Author's Quill prose | `sceneArchive.authorQuillEn` | `ui/story-renderer.js` | `YES` | `scene_archive/<id>/authorQuillEn` | Route present |
| MSG-010 | Check rule/outcome/attribute labels | check codes | `ui/message-renderer.js::renderCheckCard` | `STATIC` | check/attribute locale keys | Route present |
| MSG-011 | Check target Actor name | `check.target.actorId` → Actor Core | `ui/message-renderer.js` | `YES` | `actor_core/<id>/nameEn` | Canon catalog bypass not consistently used; verify |
| MSG-012 | Check Spell incantation | check Spell | `ui/message-renderer.js` | `ALLOW` | exact incantation | Allowed |
| MSG-013 | Non-segmented assistant body | assistant `message.mes` | `ui/message-renderer.js::renderMessage` | `PATCH` | `message/<messageId>/mes` | Awaiting browser acceptance |
| MSG-014 | Hidden English original | canonical source text | `ui/message-renderer.js` | `ALLOW` | hidden by default; appears only after explicit English-source action | Must not be visible in normal zh-CN state |
| MSG-015 | Per-segment pending/error status | localization status | `ui/message-renderer.js` | `STATIC` | status locale key | Must be absent after idle |
| MSG-016 | Rejected/partially accepted paid narrative response segment | response ledger display projection | planned `ui/model-response-evidence.js` story projection | `NO` | target `model_response_segment/<responseId>:<index>/textEn` through TranslationTable | Revision 4 draft; implementation not approved |
| ITEM-PROP-001 | Item candidate label | `itemCandidates[].item.labelEn` | `ui/message-renderer.js`, `ui/item-components.js` | `PATCH` | `item/<id>/labelEn` | Unverified |
| ITEM-PROP-002 | Item candidate appearance | `itemCandidates[].item.appearanceEn` | same | `PATCH` | `item/<id>/appearanceEn` | Unverified |
| ITEM-PROP-003 | Item candidate owner/holder/location prose | candidate Item projection | `domain/item-projection.js` | `PATCH` | Canon/Actor display resolver + exact room display resolver | Awaiting browser acceptance |
| ITEM-PROP-004 | Item candidate evidence | `candidate.evidenceText` | `ui/item-components.js` | `RAW` | exact evidence | Must be classified and visibly separated |
| SPELL-PROP-001 | Spell candidate incantation | candidate `incantation` | `ui/spell-components.js` | `ALLOW` | exact incantation | Allowed |
| SPELL-PROP-002 | Spell candidate effect | `definition.effectEn` | `ui/spell-components.js` | `PATCH` | `spell_definition/<id>/effectEn` | Unverified |
| SPELL-PROP-003 | Spell candidate evidence | `candidate.evidenceText` | `ui/spell-components.js` | `RAW` | exact evidence | Must be classified and visibly separated |
| GEN-001 | Generation/loading titles, details and steps | runtime phase enums | Story/Message renderers | `STATIC` | static locale keys | Route present |
| GEN-002 | Generation/runtime raw failure | error object message | Story/Message renderers | `STATIC` | localized generic failure; raw details console-only | Source route present |
| GEN-003 | Paid response panel task/status row | response ledger metadata | planned `ui/model-response-evidence.js` | `NO` | target static task/status/terminal-stage locale keys | Revision 4 draft; implementation not approved |
| GEN-004 | Partial/unsaved paid response status and save recovery actions | response ledger/session receipt state | planned `ui/model-response-evidence.js` | `NO` | target static status and command locale keys; no model retry | Revision 4 draft; implementation not approved |
| GEN-005 | Explicit original paid model response source panel | exact response ledger content | planned `ui/model-response-evidence.js` | `NO` | target `STATIC/ALLOW`; raw content hidden until explicit source action | Revision 4 draft; implementation not approved |

## Calendar

All repeated Calendar rows expand over every applicable date, entry, archived
Scene, Storyline and beat in the representative timeline. Empty dates still
verify date chrome and counts; every date containing content must open every
detail.

| ID | Surface / visible value | Canonical source | Renderer | Table? | Exact route | 2026-08-15 source audit |
| --- | --- | --- | --- | --- | --- | --- |
| CAL-001 | Month/week/selected-date labels | Calendar date | Calendar View Model/Controller | `STATIC` | locale date formatter | Route present |
| CAL-002 | Date plan/Scene counts and aria labels | derived counts | Calendar View Model/Controller | `STATIC` | static templates + numbers | Route present |
| CAL-003 | Weekly plan card title | `calendar.entries[].titleEn` | Calendar View Model/Day Grid | `YES` | `calendar_entry/<id>/titleEn` | Route present |
| CAL-004 | Weekly plan card location | entry Map/room | Calendar View Model/Day Grid | `YES` | exact Map/room identity | Route present |
| CAL-005 | Weekly plan card status | entry status code | Calendar View Model/Day Grid | `STATIC` | schedule status key | Route present |
| CAL-006 | Plan detail title | `entry.titleEn` | Calendar Controller | `YES` | `calendar_entry/<id>/titleEn` | Route present |
| CAL-007 | Plan detail summary | `entry.summaryEn` | Calendar Controller | `YES` | `calendar_entry/<id>/summaryEn` | Route present |
| CAL-008 | Plan detail participants | Actor IDs → names | Calendar View Model | `YES/STATIC` | Canon catalog, else `actor_core/<id>/nameEn` | PATCH/route present; every participant unverified |
| CAL-009 | Plan detail location | Map/room | Calendar View Model | `YES` | exact Map/room identity | Route present |
| CAL-010 | Plan detail public-source Storyline title | linked Storyline `titleEn` | `createStorySourceView` | `PATCH` | `calendar_storyline/<id>/titleEn` | Was direct English; patch unverified |
| CAL-011 | Plan detail public-source beat title | linked beat `titleEn` | `createStorySourceView` | `PATCH` | `calendar_story_beat/<id>/titleEn` | Was direct English; patch unverified |
| CAL-012 | Plan detail planning tier | planning tier code | Calendar View Model | `STATIC` | tier locale key | Route present |
| CAL-013 | Plan/detail tags | `entry.tags[]` | Calendar Controller | `STATIC` | registered Calendar tag locale keys; unknown internal tags are not rendered | Awaiting browser acceptance |
| CAL-014 | Plan clocks/duration | start/end world clock | Calendar View Model | `STATIC` | numeric date/time formatter | Route present |
| CAL-015 | Archived Scene card/title | archive `nameEn` | Calendar View Model/Day Grid | `YES` | `scene_archive/<id>/nameEn` | Route present |
| CAL-016 | Archived Scene location | archive Map/room | Calendar View Model/Day Grid | `YES` | exact Map/room identity | Route present |
| CAL-017 | Archived Scene detail summary | archive `summaryEn` | Calendar Controller | `YES` | `scene_archive/<id>/summaryEn` | Route present |
| CAL-018 | Archived Scene timeline entry | `sceneArchive.timelineEntries[].summaryEn` | Calendar View Model/Controller | `PATCH` | `scene_timeline/<sceneId>:<index>/summaryEn` after structured removal of recognized internal metadata tails | Awaiting browser acceptance |
| CAL-019 | Archived Scene transcript | referenced chat messages | Calendar/Story/Message renderers | matrix | all `MSG-*` rows | Must expand every referenced message |
| CAL-020 | Linked plan title/status under Scene | linked Calendar entry | Calendar Day Grid | `YES/STATIC` | CAL-003/CAL-005 | Route present |
| CAL-021 | Storyline list title | `storylines[].titleEn` | Calendar View Model/Controller | `YES` | `calendar_storyline/<id>/titleEn` | Route present |
| CAL-022 | Storyline summary | `storylines[].summaryEn` | Calendar Controller | `YES` | `calendar_storyline/<id>/summaryEn` | Route present |
| CAL-023 | Storyline participants | Actor IDs → names | Calendar View Model | `YES/STATIC` | Canon catalog or Actor row | Every participant unverified |
| CAL-024 | Storyline status | status code | Calendar View Model | `STATIC` | storyline status key | Route present |
| CAL-025 | Storyline tags | `storyline.tags[]` | Calendar Controller | `STATIC` | registered Calendar tag locale keys; unknown internal tags are not rendered | Awaiting browser acceptance |
| CAL-026 | Beat title | `storyBeats[].titleEn` | Calendar View Model/Controller | `YES` | `calendar_story_beat/<id>/titleEn` | Route present |
| CAL-027 | Beat summary | `storyBeats[].summaryEn` | Calendar View Model/Controller | `YES` | `calendar_story_beat/<id>/summaryEn` | Route present |
| CAL-028 | Beat status | status code | Calendar View Model | `STATIC` | beat status key | Route present |
| CAL-029 | Beat term key | `beat.termKey` | Calendar Controller | `STATIC` | locale-formatted year/term label | Awaiting browser acceptance |
| CAL-030 | Beat window/progress/count | clocks and numbers | Calendar Controller | `STATIC` | static template + numeric values | Route present |
| CAL-031 | Storyline/Archive stable ID | record ID | Calendar Controller | `REMOVED` | internal IDs removed from ordinary detail views | Awaiting DOM acceptance |
| CAL-032 | Free Scene Map option name | Map `nameEn` | Calendar View Model/Controller | `YES` | exact Map identity | Route present |
| CAL-033 | Free Scene level option name | level `nameEn` | Calendar View Model/Controller | `YES` | exact level identity | Route present |
| CAL-034 | Free Scene room option name | room `nameEn` | Calendar View Model/Controller | `YES` | exact room identity | Route present |
| CAL-035 | Free Scene visible Map/room IDs | stable IDs | Calendar Controller | `REMOVED` | IDs remain option values only; labels use Map/room display fields | Awaiting DOM acceptance |
| CAL-036 | Calendar validation/runtime error | validator/model error | Calendar Controller | `STATIC` | known validation and generic runtime error locale keys; raw detail console-only | Source route present |
| CAL-037 | Calendar localization status | visible-field statuses | Calendar Controller | `PATCH` | current mode/rendered fields only + explicit field retranslation | Awaiting browser acceptance |

## Map

Every Map row expands over the World Map plus every available local Map, every
level, every visible room and every Actor marker.

| ID | Surface / visible value | Canonical source | Renderer | Table? | Exact route | 2026-08-15 source audit |
| --- | --- | --- | --- | --- | --- | --- |
| MAP-001 | World region label | region `nameEn` | `ui/map-renderer.js::renderWorldMap` | `YES/STATIC` | `world_region/<id>/nameEn` or static map key | Route present |
| MAP-002 | World node label/title name | node `nameEn` | Map Renderer | `YES/STATIC` | `world_map_node/<id>/nameEn` or static key | Route present |
| MAP-003 | World node tooltip summary | node `summaryEn` | Map Renderer | `YES/STATIC` | `world_map_node/<id>/summaryEn` | Route present |
| MAP-004 | Local Map name/caption | map `nameEn` | Map Renderer | `YES/STATIC` | `local_map/<id>/nameEn` | Route present |
| MAP-005 | Local level name | level `nameEn` | Map Renderer | `YES/STATIC` | `local_map_level/<map>:<level>/nameEn` | Route present |
| MAP-006 | Local room label/title | room `nameEn` | Map Renderer | `YES/STATIC` | `local_map_room/<map>:<room>/nameEn` | Route present |
| MAP-007 | Local room tooltip description | room `descriptionEn` | Map Renderer | `YES` | `local_map_room/<map>:<room>/descriptionEn` | Route present |
| MAP-008 | Actor marker name/tooltip | Actor Core `nameEn` | Map Renderer | `PATCH` | Canon catalog, else `actor_core/<id>/nameEn` | Awaiting browser acceptance |
| MAP-009 | Player marker name | player input evidence | Map Renderer | `PATCH` | `character_input/player/identity.name` | Awaiting browser acceptance |
| MAP-010 | Map selector map/parent-room labels | Map and room names | Map Renderer | `YES` | same Map identities | Route present |
| MAP-011 | Map selector visible IDs/node counts | stable IDs/counts | Map Renderer | `REMOVED/STATIC` | IDs removed from labels; count remains static | Awaiting DOM acceptance |
| MAP-012 | Runtime room status/kind fallback | room status/kind codes | Map Renderer | `STATIC` | generic localized room fallback | Awaiting browser acceptance |
| MAP-013 | Map localization status | visible map field states | Map Renderer | `PATCH` | visible fields + explicit field retranslation | Awaiting browser acceptance |
| MAP-014 | Map expansion raw error | backend/model error | Map Renderer/toastr | `STATIC` | localized generic user error; raw detail console-only | Awaiting error-path acceptance |

## Dossier, Player Sheet, Items, Spells, Clues And Status

| ID | Surface / visible value | Canonical source | Renderer | Table? | Exact route | 2026-08-15 source audit |
| --- | --- | --- | --- | --- | --- | --- |
| DOS-001 | Player sheet name | player input evidence | Inspector | `PATCH` | `character_input/player/identity.name` | Awaiting browser acceptance |
| DOS-002 | Player blood/strength/desire/fear | player input evidence | Inspector | `PATCH/STATIC` | free English prose uses `character_input/player/<fieldPath>`; known codes use static catalog | Awaiting browser acceptance |
| DOS-003 | Actor Core public background | `publicProfile.backgroundEn` | Inspector Actor tab | `YES` | `actor_core/<id>/publicProfile.backgroundEn` | Route present |
| DOS-004 | Actor temperament | `performanceCore.temperamentEn` | Actor tab | `YES` | exact Actor Core field | Route present |
| DOS-005 | Actor speech style | `performanceCore.speechStyleEn` | Actor tab | `YES` | exact Actor Core field | Route present |
| DOS-006 | Actor visible description | `publicProfile.descriptionEn` | Actor tab | `YES` | exact Actor Core field | Route present |
| DOS-007 | Actor identity group values/details | NPC Identity projection | `renderIdentity` | `PATCH` | `actor_identity/<actorId>/groups.<group>.entries[<index>].<field>` for dynamic prose | Awaiting browser acceptance |
| DOS-008 | Actor relationship claims | NPC Identity projection claims | `renderIdentity` | `PATCH` | `actor_identity/<actorId>/claims[<index>].<field>` for dynamic prose | Awaiting browser acceptance |
| DOS-009 | Actor current location | runtime Map/room | Actor tab | `YES` | exact Map/room identity | Route present |
| DOS-010 | Actor current activity | `currentActivityEn` | Actor tab | `YES` | `actor_runtime/<id>/currentActivityEn` | Route present |
| DOS-011 | Actor current intent | `currentIntentEn` | Actor tab | `YES` | `actor_runtime/<id>/currentIntentEn` | Route present |
| DOS-012 | Actor life status | status code | Actor tab | `STATIC` | life-status locale key | Route present |
| DOS-013 | Actor life-status detail | `lifeStatusDetailEn` | Actor tab | `YES` | exact Actor Runtime field | Route present |
| DOS-014 | Actor outfit | `actorPresentations.<id>.outfitEn` | Actor tab | `YES` | `actor_presentation/<id>/outfitEn` | Route present |
| DOS-015 | Actor accessory/visible-condition prose | Presentation values | Actor tab/projection | `PATCH` | `actor_presentation/<actorId>/accessories[<index>]` | Awaiting browser acceptance |
| DOS-016 | Worn/held Item IDs | Presentation stable IDs | Actor tab | `PATCH` | IDs resolve to localized Item labels; unresolved IDs are omitted | Awaiting browser acceptance |
| DOS-017 | Relationship labels | Social relationship labels | `renderRelationship` | `STATIC` | Social projection locale labels | Awaiting browser acceptance |
| DOS-018 | Active sentiment emotion | Social active emotion | `renderRelationship` | `STATIC` | emotion locale keys | Awaiting browser acceptance |
| DOS-019 | First impression | Appraisal `summaryEn` | Actor tab | `YES` | `appraisal/<id>/summaryEn` | Route present |
| DOS-020 | Person Schema interpretation | `personSchemas[].interpretationEn` | Actor tab | `PATCH` | `person_schema/<id>/interpretationEn` | Awaiting browser acceptance |
| DOS-021 | Person Schema expectation | `personSchemas[].expectationEn` | Actor tab | `PATCH` | `person_schema/<id>/expectationEn` | Awaiting browser acceptance |
| DOS-022 | Person Schema status | status code | Actor tab | `STATIC` | Schema status locale key | Awaiting browser acceptance |
| DOS-023 | Relationship evidence summary | Appraisal/Event `summaryEn` | Actor tab | `PATCH` | exact source `appraisal|event/<id>/summaryEn` | Awaiting browser acceptance |
| DOS-024 | Memory entry summary | Event/Appraisal `summaryEn` | Memory ledger | `YES` | `<recordType>/<recordId>/summaryEn` | Route present; every tier/entry must expand |
| DOS-025 | Memory source badge | event/appraisal kind | Memory ledger | `STATIC` | static locale key | Route present |
| DOS-026 | Actor Item label | Item `labelEn` | Actor tab | `YES` | `item/<id>/labelEn` | Route present; full item set unverified |
| DOS-027 | Actor Item appearance | Item `appearanceEn` | Actor tab | `YES` | `item/<id>/appearanceEn` | Route present; full item set unverified |
| ITEM-001 | Item type/state/transfer/story-role labels | Item enum codes | Item components | `STATIC` | Item locale keys | Route present |
| ITEM-002 | Item label | `items[].labelEn` | Item Inspector | `PATCH` | `item/<id>/labelEn` | Awaiting browser acceptance |
| ITEM-003 | Item appearance | `items[].appearanceEn` | Item Inspector | `PATCH` | `item/<id>/appearanceEn` | Awaiting browser acceptance |
| ITEM-004 | Item notes | `items[].notesEn` | Item Inspector | `PATCH` | `item/<id>/notesEn` | Awaiting browser acceptance |
| ITEM-005 | Item owner/holder name | Actor IDs → names | Item projection | `PATCH` | Canon catalog and confirmed identity redirects, else `actor_core/<id>/nameEn`; unresolved IDs never render | Awaiting browser acceptance |
| ITEM-006 | Item location/placement | room ID / placement code | Item projection | `PATCH/STATIC` | exact room display resolver or placement locale key | Awaiting browser acceptance |
| ITEM-007 | Item acquired timestamp | `acquiredAt` | Item projection | `STATIC` | date + precision key | Route present |
| ITEM-008 | Item source/provenance | `sourceEventId` | Item component | `REMOVED/STATIC` | source presence shown as localized status; ID remains hidden | Awaiting DOM acceptance |
| ITEM-009 | Item Canon URL | `sourceUrl` | Item component | `ALLOW/STATIC` | exact URL behind the Chinese static “查看原著资料” link | Allowed; verify every link |
| SPELL-001 | Learned Spell incantation | Spell `incantation` | Spell Inspector | `ALLOW` | exact incantation | Allowed |
| SPELL-002 | Built-in Spell name/effect | Spell ID | Spell Inspector | `STATIC` | `spell.<id>.name/effect` | Route present |
| SPELL-003 | Custom Spell name | `definition.nameEn` | Spell Inspector | `PATCH` | `spell_definition/<id>/nameEn` | Missing row/reader; patch unverified |
| SPELL-004 | Custom Spell effect | `definition.effectEn` | Spell Inspector | `PATCH` | `spell_definition/<id>/effectEn` | Missing row/reader; patch unverified |
| SPELL-005 | Spell source/rank/attempts/XP | learned codes/numbers | Spell Inspector | `STATIC/ALLOW` | locale keys + numbers | Route present |
| CLUE-001 | Clue entry string/object label/detail | `state.clues[]` | generic Inspector list | `PATCH` | `clue/<id>/<visibleField>` | Awaiting browser acceptance |
| STATUS-001 | Status entry string/object label/detail | `state.status[]` | generic Inspector list | `PATCH` | `status/<id>/<visibleField>` | Awaiting browser acceptance |
| STATUS-002 | Knowledge counts | Knowledge diagnostics | Inspector Status | `STATIC` | static template + numbers | Route present |
| STATUS-003 | Knowledge root path | `knowledgeBase.rootPath` | Inspector Status | `ALLOW` | technical filesystem path in Status/debug surface | Configuration/diagnostic-only allowlist |

## Relationship Constellation

Every node, every directed edge and every evidence row must expand. The graph
and its text fallback are separate readers and both must pass.

| ID | Surface / visible value | Canonical source | Renderer | Table? | Exact route | 2026-08-15 source audit |
| --- | --- | --- | --- | --- | --- | --- |
| REL-001 | Graph node Actor name | Dossier header / Actor Core `nameEn` / player input evidence | `relationship-graph.js` | `PATCH` | player uses `character_input/player/identity.name`; Canon catalog, else `actor_core/<id>/nameEn` | Awaiting graph and text-fallback acceptance |
| REL-002 | Graph node Actor role | Dossier header / Actor Core `roleEn` | Relationship Graph | `PATCH` | `actor_core/<id>/roleEn` | Awaiting browser acceptance |
| REL-003 | Graph node house | Actor affiliation/role | Relationship Graph | `STATIC` | House locale key | Awaiting browser acceptance |
| REL-004 | Directed edge label | Social labels | Relationship Graph | `STATIC` | Social projection locale labels | Awaiting browser acceptance |
| REL-005 | Structural relationship tags | Social tags | Relationship Graph | `STATIC` | known static tags; unknown internal tags are not rendered as labels | Awaiting browser acceptance |
| REL-006 | Active sentiment emotion | Social active emotions | Relationship Graph | `STATIC` | emotion locale keys | Awaiting browser acceptance |
| REL-007 | Relationship evidence summary | evidence/Appraisal/Event summary | Relationship Graph | `PATCH` | exact source `appraisal|event/<id>/summaryEn` | Awaiting browser acceptance |
| REL-008 | Evidence Scene reference | `sceneId` | Relationship Graph | `REMOVED` | Scene ID removed from evidence metadata | Awaiting DOM acceptance |
| REL-009 | Evidence message references | message IDs | Relationship Graph | `ALLOW/STATIC` | numeric references + Chinese label | Route present |
| REL-010 | Relationship metric names | dimension codes | Relationship Graph | `STATIC` | static locale keys | Route present |
| REL-011 | Relationship metric values/counts | numeric dimensions/counts | Relationship Graph | `STATIC` | numbers | Route present |
| REL-012 | Canvas node labels | same node names | Cytoscape projection | `PATCH` | same localized projection as REL-001 | Awaiting canvas acceptance |
| REL-013 | Text-fallback node/edge rows | node name/role/house/edge label | Relationship Graph | `PATCH` | same localized projection as canvas | Awaiting browser acceptance |

## Change Gate

For every Hogwarts frontend change:

1. Read this complete registry before editing.
2. Identify every touched existing row and every new dynamic DOM value.
3. Add a row before implementing any new dynamic value. Missing registry
   ownership blocks implementation.
4. A dynamic semantic field must use one exact stable TranslationTable identity
   or a finite static locale key. Ad hoc translated copies, direct `*En`
   rendering and reader-specific identities are forbidden.
5. Update the route and source-audit status in the same change.
6. Run source coverage checks for direct dynamic DOM sinks.
7. Run full browser acceptance by expanding every row affected by the change.
   For a localization architecture change, expand **every row in this file**.
8. Persist field-by-field evidence under the active PRD and link it from
   `checklist.md` and `progress.md`.
9. Do not mark a row `YES` from unit tests, table health, a ready row, source
   inspection or one screenshot. `YES` requires the normal rendered zh-CN
   steady state to pass.
