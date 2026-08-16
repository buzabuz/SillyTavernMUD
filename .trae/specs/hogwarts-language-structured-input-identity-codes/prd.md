# Hogwarts Phase 2: English Authority and Idle Localization

Artifact revision: 4

Status: Revision 4 approved; implementation in progress.

Change ID: `hogwarts-language-structured-input-identity-codes`

Change kind: `feature`

Feature delta: `1`

Core change: `true`

## Change ID and Status

Revision 4 preserves the approved Revision 3 Phase 2 language cutover and adds
one exact Tina timeline replacement required by real-save reconnaissance:

- all internal semantic authority becomes English;
- Chinese display data leaves world State and canonical chat transactions;
- English world transactions commit before localization;
- a bounded idle scheduler gradually fills a persistent server translation
  table;
- Chinese/English display language can switch independently from world data;
- non-English model output remains visible and non-fatal but is not admitted to
  English authority;
- current bilingual fields are removed through one atomic JSONL migration.

Revision 3 was explicitly approved on 2026-08-14. Its migration approval became
stale when read-only Tina reconnaissance proved that message `6` contains a
Chinese player action inside `turnTransaction.publicEventEn`, leaving the
`1991-07-24 · 10:00` timeline entry without a deterministic English source.
Revision 4 was explicitly approved on 2026-08-15 for the one-time message-6
replacement.

Phase 3 ordered structured input remains out of scope.

Authoritative artifacts:

- [spec.md](./spec.md)
- [tasks.md](./tasks.md)
- [checklist.md](./checklist.md)
- [progress.md](./progress.md)
- [phase2-migration-matrix.md](./phase2-migration-matrix.md)
- [research-findings.md](./research-findings.md)
- [language-boundary.md](../hogwarts-runtime-contracts/language-boundary.md)
- [state-fields.md](../hogwarts-runtime-contracts/state-fields.md)

## Problem and Evidence

The current system mixes authority and localization:

1. Calendar models write Chinese and English semantic copies into State.
2. Scene, Map, Item, Spell, Check, Archive and Opening records retain
   no-suffix display fields beside English fields.
3. Turn, Opening, Transition, Social and Interior workflows wait for
   translation before final persistence.
4. `translation-controller.js` mutates world State and existing chat messages.
5. `message.extra` stores translated prose and localized transaction copies
   that can be seen by replay, migration and Knowledge readers.
6. Display language is inferred from translation provider rather than selected
   as an independent locale.
7. The registered `local_translation` task is `blocking=true` and writes
   model-task runtime bookkeeping into world State.
8. Four Tina assistant messages contain Han text in fields named `textEn` or
   `sourceEn`.
9. Timeline, Material and Presentation records contain unpaired Chinese
   semantic text.

Current Tina revision 123 evidence:

```text
assistant messages: 114
assistant segments: 1015
display-cache-like values excluding retry/swipe copies: 3830
display-cache-like UTF-8 bytes: 1262463
unique translated assistant segment bytes: 278128
canonical_en_contains_cjk: 432 including retry/swipe copies
locale_cache_prompt_visible: 316
locale_cache_rag_visible: 2463
mixed_model_output_contract: 212
unknown language paths: 0
```

Deterministic migration evidence:

```text
Scene timeline entries: 127
resolved from Scene summaryEn: 13
resolved from English ordered turn publicEventEn: 100
resolved from closureSummaryEn: 13
requires exact Tina replacement: 1
unresolved after proposed replacement: 0
```

Five legacy Material records and two Presentation projections require the exact
Tina-only manual mapping approved by the user. The exception is keyed to the
audited timeline/content identity, event IDs and exact before strings. It is
not a generic migration rule. Revision 4 proposes one separately guarded
timeline replacement:

```text
messageId = 6
clock = 1991-07-24 · 10:00
before = Legacy player action: （叹了口气）我说：“行吧行吧，你们说什么是什么吧。” 我抱着胳膊，让麦格教授进去。然后尝试伸出脚绊她一脚。
after = Tina sighs, reluctantly lets Professor McGonagall enter, folds her arms, and tries to trip her as she steps inside.
```

The original Chinese player message remains unchanged as
`player_input_evidence`.

## Before

Externally observable behavior:

- the player enters Chinese or English in one composer;
- Low generally returns English narrative;
- the loading card includes a blocking translation phase;
- world commit may wait for local/Google/Bing translation;
- Chinese translations are persisted in State and message extras;
- translation provider `off` effectively acts as the display-language control;
- changing provider can rewrite current State and recent messages;
- Dossier, Calendar, Archive, Map and message renderers use domain-specific
  `zh -> en -> id` fallback chains;
- opening a page may trigger sequential translation work;
- local translation model calls update `modelTaskRuntime` in State;
- language-mismatched model output can contaminate `*En` fields or fail a
  validator.

Data behavior:

- `calendar.version=2` requires `title/titleEn/summary/summaryEn`;
- Item V3 stores `label/labelEn`, `appearance/appearanceEn`,
  `detail/detailEn`, `notes/notesEn`;
- Local Map V1 stores `name/nameEn` and `description/descriptionEn`;
- Message transactions store `textEn/textZh`, `publicEventEn/publicEvent` and
  localized Actor/Item/Clue copies;
- Scene timeline uses ambiguous `label`;
- Material V2 uses unsuffixed semantic text;
- Character Prompt receives the complete player character object, including
  source-language free text.

## After

### 1. English authority

World State, canonical chat transactions, Prompt projections and Knowledge
records admit English semantic text only.

Canonical examples:

```text
nameEn
summaryEn
descriptionEn
detailEn
appearanceEn
objectTextEn
currentActivityEn
factPatternEn
expectationEn
```

Language-neutral IDs, clocks, enums, numeric values and source refs remain
unchanged.

Exceptions are not semantic authority:

- raw player input evidence;
- raw non-English model output evidence;
- entity aliases;
- diagnostics;
- static locale resources;
- server translation-table rows.

### 2. Persistent server translation table

Dynamic translations are stored outside JSONL in one server-side table per user
and timeline:

```text
<user files>/hogwarts-mud/localization/<sha256(timelineEpoch)>/
  snapshot.json
  journal.jsonl
```

The service uses `TranslationTableV1`:

```text
translationApiContractVersion = 1
tableSchemaVersion = 1
timelineEpoch
tableRevision
rows
bounded diagnostics
```

`TranslationTableRecordV1` identity:

```text
timelineEpoch
recordKind
recordId
fieldPath
sourceHash
sourceLocale = en
targetLocale
providerId
translatorVersion
glossaryVersion
```

Stored value:

```text
translatedText
status = ready | error
updatedAt
lastAccessedAt
bounded errorCode
```

`pending` and `running` remain page-session queue states. `ready` and `error`
are persisted in the server table.

The translation table:

- persists across browser clearing, tabs and devices using the same server user;
- is not world authority;
- never changes `stateRevision`;
- is never read by Prompt, Knowledge, Validator or Reducer;
- is not written through `saveChat()` or `saveMetadata()`;
- is stored under the authenticated user's files root;
- uses an in-process per-table mutex;
- persists each upsert as one append-only journal record;
- rebuilds the materialized table from an atomic snapshot plus journal;
- merges row upserts against the latest table revision so two tabs cannot
  overwrite unrelated rows;
- periodically compacts the journal into an atomic snapshot without deleting
  any valid row;
- never automatically evicts a valid translation.

Hard safety limits:

```text
100000 rows per timeline
256 MiB serialized materialized table per timeline
32 MiB journal before snapshot compaction
1000 keys per query
256 rows per upsert
4 MiB request body
```

Reaching a limit rejects only new translation-table writes with a bounded
diagnostic. Existing rows are retained and the UI falls back to English. Stale
rows for the same record/provider/version identity are replaced when
`sourceHash` changes; unrelated valid rows are never deleted automatically.

Endpoints:

```text
GET  /api/hogwarts-mud/localization/health
POST /api/hogwarts-mud/localization/query
POST /api/hogwarts-mud/localization/upsert
POST /api/hogwarts-mud/localization/retranslate
```

Every request carries the explicit translation API contract version and
timeline epoch. Missing/mismatched versions fail before translation work.

### 3. Independent display locale

The product exposes:

```text
displayLocale = zh-CN | en
```

- default: `zh-CN`;
- selectable during setup and in game settings;
- switchable at runtime without reload;
- stored as a small browser preference, not in world State;
- synchronized across tabs through the browser storage event;
- does not change model language, Prompt, save format, IDs or Knowledge.

`en` renders canonical English directly and does not enqueue translation.

`zh-CN` renders:

1. static Chinese locale resource;
2. matching `TranslationTableRecordV1`;
3. English source with a bounded “translating” state while work is pending.

Translation provider remains an independent setting.

### 4. English commit before localization

Normal turn order:

```text
model response
  -> parse / settle / structured authority
  -> English canonical transaction
  -> one atomic world + assistant-message commit
  -> render English fallback
  -> enqueue display localization
  -> idle translation
  -> server translation-table upsert
  -> rerender affected UI only
```

Opening, Scene Transition, Calendar, Social, Interior Map and Map Expansion
follow the same authority-first rule. No workflow awaits translation before
world persistence.

The loading card no longer treats translation as a world-commit phase.

### 5. Idle localization scheduler

Priority:

```text
P0 current assistant message
P1 current Scene, visible records, active Actors and current Calendar
P2 recently changed Appraisal, Relationship and retained Memory
P3 newest Scene Archive
P4 older Archive, newest to oldest
```

Page opening raises relevant records to the front but is not the only trigger.

Dispatch requires all conditions:

- `displayLocale=zh-CN`;
- translation provider is not `off`;
- automatic work is not suppressed;
- no active Opening, turn, Scene Transition, Calendar Moment, Pacing,
  Calendar Director, Social Director, Interior Cartographer, Performer or
  Observer;
- no pending guarded save or save conflict;
- no active translation request;
- document is visible;
- composer has no pending submitted action;
- the browser idle callback has granted a work slice.

Concurrency is exactly one provider request.

After each request, the scheduler re-evaluates all gates before dispatching the
next batch. A new player action stops new dispatches. An already-sent request
may finish but cannot delay or roll back the action.

One batch equals one provider request:

| Provider | Maximum source characters per request |
| --- | ---: |
| local `qwen3:4b` | 3,600 |
| Google | 4,700 |
| Bing | 900 |

Structured fields use existing protected `[[HPMUD_*]]` markers. Missing,
reordered or invented markers fail only that translation batch.

No automatic repair, retry or provider fallback is allowed. `error` entries
remain dormant until a separate manual retranslation action or a source/version
change replaces the row.

### 6. Translation task scheduling

`local_translation` remains in `MODEL_TASK_REGISTRY`, but changes to:

```text
phase: idle_display
blocking: false
quotaGroup: local_translation
ledgerScope: ephemeral_display
trigger: localization.idle_batch_requested
```

The unified scheduler still measures budget and emits diagnostics, but display
translation attempts/success/failure do not write `modelTaskRuntime` into world
State.

All scheduler/composition-root test harnesses must migrate in the same task.

### 7. Non-fatal model language adoption

Language checking is an adoption filter, not a response validator.

```text
raw response
  -> parse structural contract
  -> classify each semantic string
  -> preserve raw player-visible output
  -> admit English canonical fields only
  -> skip non-English field / proposal / record
  -> continue independent valid settlement
```

Rules:

- Han text in an English authority field never throws by itself;
- it never triggers repair, retry, fallback or another model request;
- non-English narrative is stored as `model_output_evidence` and remains
  renderable;
- it is not named `textEn` or `sourceEn`;
- it is excluded from State, Prompt and Knowledge;
- new records missing required English text are skipped;
- unrelated JSON, Schema, stable-ID, ACL and authority failures
  remain fatal.
- natural-language narration or dialogue is never classified as historical
  truth, fabrication or unauthorized memory by regex, and prose wording alone
  cannot fail the response;
- `historicalClaims` remains non-authoritative model metadata for downstream
  evidence consumers. It does not make the prose true and is not a runtime
  semantic verdict.

`local_translation` is exempt because its output is explicitly target-locale
display data.

Semantic classification of NPC historical speech is deferred. A future Ollama
adjudicator requires its own approved Prompt/call budget and failure contract;
this revision does not add that model request.

### 8. Atomic old-save migration

The whole State + chat + swipe + retry checkpoint migrates in memory and is
persisted by one guarded whole-timeline rewrite using the host atomic chat save.

Target versions:

```text
languageAuthorityVersion = 1
calendar.version = 3
itemSystemVersion = 4
materialStateVersion = 3
spellbook.version = 3
map.localMapVersion = 2
message languageVersion = 1
```

No compatibility period:

- no long-term dual-read;
- no dual-write;
- no Prompt fallback to deleted fields;
- migration success deletes old fields immediately;
- migration failure leaves source JSONL unchanged.

Full field matrix:

[phase2-migration-matrix.md](./phase2-migration-matrix.md)

## In Scope

1. English-only runtime schemas and validators for Scene, Calendar, Map,
   Item, Spell, Material, Character projections and messages.
2. Non-fatal language adoption for all 16 active model tasks.
3. Removal of synchronous localization from Opening, turn, Transition, Social,
   Calendar Moment and Interior workflows.
4. Authenticated server `TranslationTableV1` service and atomic row upsert.
5. Idle localization queue, priorities, budgets and resource gates.
6. `zh-CN/en` runtime display switch and static locale resources.
7. Renderer/view-model migration to locale projections.
8. Atomic whole-JSONL migration with dry-run Before/After report.
9. Tina-only Material/Presentation allowlist approved by the user.
10. Character V2 source-evidence/English-projection split.
11. Prompt and Knowledge removal of localized or raw noncanonical text.
12. Current test harness migration for scheduler, registry, workflows and UI
    ports.
13. Real Tina migration, production Prompt build-only and fresh blind-model
    acceptance.
14. Living runtime-contract and technical-debt updates.

## Non-Goals

- Phase 3 ordered `intentSequence[]`;
- composer autocomplete or entity chips;
- global Actor/Spell/Item/Map alias-index redesign;
- adding display locales other than `zh-CN` and `en`;
- browser-persistent translation storage;
- storing translations in JSONL, world State, message extras or Knowledge;
- model-generated migration repair;
- automatic translation retry, provider fallback or repair;
- translating player input before models;
- changing Item `state/physicalForm/owner/holder/location`;
- changing Event witness/ACL semantics;
- changing Appraisal/Relationship lifecycle;
- cleaning unrelated retired modules;
- broad compatibility support for unknown legacy language shapes.

## Runtime Contract Impact

### New State fields

```text
languageAuthorityVersion
characterLanguageVersion
```

### Changed State/message contracts

```text
Calendar V3
Item V4
Material V3
Spellbook V3
Local Map V2
Character V2 projection
Hogwarts Message Language V1
timeline[].summaryEn
scene.timelineEntries[].summaryEn
sceneArchive[].timelineEntries[].summaryEn
```

### Removed State/message fields

All paths marked for deletion in
[phase2-migration-matrix.md](./phase2-migration-matrix.md), including:

```text
calendar * title/summary display copies
Scene and Archive no-suffix display prose
Item/Map/custom Spell display prose
opening.package.display
assistant translatedZh/textZh/display_text/provider/version metadata
localized transaction copies
root display-only chapter/location/status/campaign names
```

### Non-State projections

```text
TranslationTableV1
TranslationTableRecordV1
LocalizationQueueItemV1
LocalizedViewModelV1
StaticLocaleResourcesV1
```

The living runtime contracts must be updated before implementation tasks that
write these fields.

## Migration and Compatibility

Migration is one-time and atomic.

Preflight:

1. read current JSONL and storage head;
2. verify timeline epoch, revision and migration versions;
3. clone State/chat/swipes/retry checkpoint;
4. apply deterministic field migration;
5. apply exact Tina allowlist only when all guards match;
6. validate every target Schema;
7. assert zero canonical Han text;
8. rebuild Knowledge records model-free;
9. build every affected production Prompt model-free;
10. produce field-level Before/After report;
11. verify Item existence, IDs, ACL and references unchanged.

Commit:

- idempotently upsert every migratable existing Chinese translation to the
  server table and query-verify the exact source-hash keys;
- one guarded whole-timeline rewrite;
- one world revision increment;
- host atomic file replacement;
- no model or translation call;
- table rows are written first so JSONL deletion cannot lose existing Chinese.

The translation table and JSONL are separate durability boundaries, so the
order is intentional:

```text
table seed/upsert -> query verification -> atomic JSONL rewrite
```

If table seeding fails, JSONL remains unchanged. If JSONL save fails after
seeding, extra table rows are harmless and the idempotent retry reuses them.

Rollback:

- failed preflight: no mutation;
- failed save: restore in-memory snapshot, source file unchanged;
- successful migration is irreversible in place; the automatic pre-save backup
  is the rollback source;
- older clients fail the language version gate rather than reading deleted
  fields.

Unknown old saves:

- known paired fields migrate normally;
- known source-evidence fields migrate normally;
- unpaired canonical non-English semantics block migration;
- no generic inference, translation or compatibility fallback;
- the Tina exception cannot apply to another timeline/content identity.

## Prompt Field Budget

Runtime-derived configuration:

```text
contextSize = 120000
maxResponseLength = 12000
maxPromptCharacters = 298080
```

Current real Tina baseline and Revision 4 hard targets:

| Prompt | Before chars | After hard target | Required change |
| --- | ---: | ---: | --- |
| Scene Performance | 47,626 | `<=47,626` | remove display fields from Scene/Calendar/Map/Item context |
| Scene Transition | 76,100 | `<=76,100` | English-only currentScene, Calendar, conflict and location |
| Scene Opening | 28,319 | `<=28,319` | English-only authority and actor profiles |
| High Calendar | 14,358 | `<=14,358` | English-only Calendar Schema/context |
| Medium Calendar | 36,893 | `<=36,893` | English-only schedules, beats and location directory |
| Social | 80,640 | `<=80,000` | remove localized transaction/message copies; resolve HTD-006 |
| Map Expansion | 39,344 | `<=39,344` | English-only map authority and output |
| Host System Injection | 19,319 | `<=19,319` | bounded Character V2 and English-only scene projection |
| Local translation | 1,513 measured base | `<=20,000` | one bounded marker batch |

Field removal budget:

| Source | Before active Tina | After Prompt/State authority |
| --- | ---: | ---: |
| JSONL display-cache-like data | 435,183 chars / 1,262,463 bytes | 0 |
| translated assistant segment cache | 93,925 chars / 278,128 bytes | 0 |
| Calendar Chinese title/summary fields | 52 values | 0 |
| Map Chinese/no-suffix display fields | 54 values | 0 |
| Item display fields | 40 values | 0 |
| Opening display object | 48 values | 0 |

No new semantic Prompt projection is allowed. Every added language marker,
version or diagnostic must replace an old localized payload and remain outside
model context.

Protected sections remain:

- System Prompt;
- output Schema;
- player action;
- current Authority Snapshot;
- current-scene Actor cards;
- sealed actor Memory capsules.

After every Prompt-affecting task, rebuild against active Tina. Any unexplained
growth, locale-cache field, duplicate source or protected-field trimming fails
the task.

## Frontend Field Whitelist

UI session only:

```text
session.displayLocale
session.localizationQueueCounts
session.localizationVisiblePending
session.localizationActiveBatch
session.localizationPriorityKeys
session.localizationLastErrorCode
```

Browser preference:

```text
SillyTavern.HogwartsMud.DisplayLocale
```

Server translation table:

```text
TranslationTableRecordV1
```

UI read access:

- canonical English State through existing view-model projectors;
- `StaticLocaleResourcesV1`;
- `LocalizedViewModelV1` from the server translation table;
- raw player/model evidence only at explicitly registered message surfaces.

Forbidden:

- direct reads of deleted no-suffix display fields;
- direct writes to State from locale controls;
- direct translation-table values in Prompt/Knowledge/Reducer;
- language preference in world State.

## Acceptance Criteria

1. Active Tina dry-run produces a reviewed field-level Before/After report with
   no write.
2. Every matrix row has one writer, all readers, migration action and removal
   assertion.
3. One atomic migration upgrades State, chat, swipes and retry checkpoint.
4. Failed preflight/save leaves source SHA, bytes and mtime unchanged.
5. Successful migration changes only approved fields and version/revision
   metadata.
6. Item existence/custody/location, Actor life status, Calendar IDs, Map
   topology, Event/Appraisal/Social refs and ACL are unchanged.
7. All 127 Tina timeline entries have English `summaryEn` and source refs.
8. The exact five Tina Material records, two Presentation projections and one
   message-6 timeline replacement match the approved allowlist Before/After.
9. Every existing migratable Chinese display value is present either in static
   locale resources or a query-verified server table row before JSONL deletion.
10. All dynamic Chinese display data is absent from State and canonical chat
   transactions.
11. Zero canonical English fields contain Han text after migration.
12. Knowledge rebuild contains only English canonical text plus explicitly
    allowed raw player query evidence.
13. All affected production Prompts contain zero locale-cache/raw model
    evidence and pass hard targets.
14. Social Prompt is `<=80,000`, resolving HTD-006.
15. Turn, Opening, Transition, Calendar, Social, Map and Material workflows
    commit without awaiting translation.
16. Display translation never increments `stateRevision` and never calls
    `saveChat/saveMetadata`.
17. Idle queue concurrency is one and dispatch respects every resource gate.
18. One batch makes one provider request; failure makes zero automatic retry,
    repair or fallback requests.
19. A new player action prevents the next idle batch and is never delayed by an
    in-flight translation.
20. Page opening raises priority without being required to start translation.
21. Locale switching updates static and dynamic UI without changing world
    bytes or invoking models for `en`.
22. Translation-table miss/error/limit failure falls back to English and does
    not change world authority or delete existing rows.
23. Non-English model output is displayed, produces bounded diagnostics, and
    does not fail the task solely for language.
24. Non-English semantic records/proposals are skipped while independent valid
    settlement continues.
25. All scheduler/registry/composition-root test harnesses reach their intended
    assertions under the new ephemeral translation ledger.
26. Focused tests, current-contract regression suites, real-save migration and
    one end-to-end turn pass.
27. Every affected active model task/mode passes fresh context-free blind
    simulation with one response and zero repair.
28. Running Node process is restarted and authenticated Knowledge health proves
    the expected contract after any server-side change.
29. Living runtime contracts and technical-debt ledger match final behavior.
30. Phase 3 input/frontend entity-token work is absent.

## Risks and Rollback

| Risk | Control |
| --- | --- |
| Browser storage is cleared | translations remain on the authenticated server |
| Two tabs upsert concurrently | per-table mutex, latest-file merge and atomic write |
| Translation table reaches hard limit | reject new rows only; retain existing rows and show English fallback |
| Server table is unavailable | English fallback; no world write and no automatic retry |
| Translation starves gameplay model | strict idle gates, concurrency one, recheck after every request |
| Translation loops on failure | persisted error key; no automatic retry |
| New player action races translation | no new dispatch; in-flight result can only upsert the translation table |
| Translation-table data enters Prompt/RAG | projection tests and language ratchet |
| Whole-save migration partially writes | one guarded atomic JSONL rewrite plus in-memory rollback |
| Unknown legacy Chinese authority | preflight blocks; no generic repair |
| Tina special leaks to other saves | exact timeline/fingerprint/record/string allowlist |
| Non-English output loses player response | raw model evidence remains renderable |
| Non-English output pollutes authority | canonical adoption filter skips it |
| English-only Character projection drops source facts | raw input evidence retained; missing optional English omitted |
| Static labels remain hardcoded | locale-resource inventory and UI screenshot tests |
| Prompt grows during cleanup | per-task real-save build-only hard targets |
| Scheduler refactor leaves stale fixtures | explicit harness inventory and focused ownership tasks |

Rollback after a successful real-save migration uses the generated pre-save
backup and the previous application version together. Long-term compatibility
readers are forbidden.

## Approval

Revision 3 was explicitly approved on 2026-08-14. Revision 4 was explicitly
approved on 2026-08-15 for the exact message-6 timeline replacement.

Approval authorizes the existing Phase 2 implementation plus this one exact
Tina replacement. It does not authorize Phase 3 structured input, new display
locales, generic legacy repair, any other handwritten migration text or
unrelated refactors.
