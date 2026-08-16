# Phase 2 Technical Spec

Artifact revision: 4

Status: Revision 4 approved; implementation in progress.

Change ID: `hogwarts-language-structured-input-identity-codes`

## 1. Scope and Authority

Revision 4 preserves the Revision 3 architecture and adds one exact Tina
message-6 timeline replacement:

```text
English-only canonical authority
atomic JSONL language migration
persistent server TranslationTableV1
idle localization scheduler
zh-CN/en display locale
non-fatal model-language adoption
```

It does not implement Phase 3 structured player input.

Authority:

- [prd.md](./prd.md)
- [phase2-migration-matrix.md](./phase2-migration-matrix.md)
- [language-boundary.md](../hogwarts-runtime-contracts/language-boundary.md)
- [state-fields.md](../hogwarts-runtime-contracts/state-fields.md)

The latest explicit user decision overrides the prior browser-local design:
translations persist on the server and are not stored in IndexedDB,
localStorage, JSONL, world State or Knowledge.

## 2. Semantic Contracts

### 2.1 Canonical English adoption

```js
EnglishSemanticText = non-empty string with no Han code points
```

The Han check is an adoption check, not a response validator.

For each response:

```text
parse structural response
  -> partition English canonical text and raw non-English evidence
  -> run structured authority/ACL validation on canonical partition
  -> commit independent valid canonical records
  -> render raw evidence
  -> record bounded diagnostics
```

Language mismatch alone never throws and never invokes another model.

Runtime does not use regex to infer whether free-form narration or dialogue is
a historical fact, fabrication, lie or unauthorized memory. The retired
`validateHistoricalClaimProvenance` path has no production caller.
`historicalClaims` remains optional non-authoritative metadata consumed by
Social evidence projection only. Future semantic adjudication is an explicit
Ollama TODO outside this revision and must receive a separate approved
single-request budget.

### 2.2 TranslationTableV1

Server path:

```text
request.user.directories.files/
  hogwarts-mud/
    localization/
      <sha256(timelineEpoch)>/
        snapshot.json
        journal.jsonl
```

The timeline epoch is hashed for the filename and retained inside the table for
identity validation.

`snapshot.json` is the materialized table. `journal.jsonl` contains ordered,
checksummed upsert transactions after the snapshot revision. Startup/query
loads the snapshot and replays the bounded journal.

Table:

```json
{
  "translationApiContractVersion": 1,
  "tableSchemaVersion": 1,
  "timelineEpoch": "stable epoch",
  "tableRevision": 0,
  "rows": {},
  "diagnostics": {
    "rowCount": 0,
    "serializedBytes": 0,
    "lastWriteAt": 0
  }
}
```

Record:

```json
{
  "schemaVersion": 1,
  "timelineEpoch": "stable epoch",
  "recordKind": "message_segment",
  "recordId": "message:212:segment:0",
  "fieldPath": "textEn",
  "sourceHash": "sha256",
  "sourceLocale": "en",
  "targetLocale": "zh-CN",
  "providerId": "local",
  "translatorVersion": 13,
  "glossaryVersion": 1,
  "translatedText": "中文",
  "status": "ready",
  "updatedAt": 0,
  "errorCode": ""
}
```

Stable row key includes:

```text
recordKind
recordId
fieldPath
sourceHash
targetLocale
providerId
translatorVersion
glossaryVersion
```

Including `sourceHash` prevents an older in-flight request from overwriting a
newer source translation. Valid rows are not automatically evicted.

### 2.3 Server table limits

```text
MAX_ROWS_PER_TIMELINE = 100000
MAX_TABLE_BYTES = 268435456
MAX_JOURNAL_BYTES_BEFORE_COMPACTION = 33554432
MAX_QUERY_KEYS = 1000
MAX_UPSERT_ROWS = 256
MAX_REQUEST_BYTES = 4194304
MAX_TRANSLATED_TEXT_CHARS_PER_ROW = 20000
```

Limit failures reject only new table writes. Existing rows remain intact.

### 2.4 API

All calls require:

```text
translationApiContractVersion = 1
timelineEpoch
```

Endpoints:

#### `GET /localization/health`

Returns contract/schema versions and limits. It does not expose rows.

#### `POST /localization/query`

Input:

```json
{
  "translationApiContractVersion": 1,
  "timelineEpoch": "epoch",
  "keys": ["stable row keys"]
}
```

Missing table returns `rows: []`, not an error.

#### `POST /localization/upsert`

Input:

```json
{
  "translationApiContractVersion": 1,
  "timelineEpoch": "epoch",
  "rows": []
}
```

Server behavior:

1. enter the per-table async mutex;
2. read/replay latest snapshot and journal;
3. validate every row;
4. idempotently merge stable row keys;
5. append one checksummed transaction and fsync it;
6. increment `tableRevision`;
7. recalculate bounded diagnostics;
8. compact to a new atomic snapshot when the journal threshold is reached,
   then atomically replace the journal with an empty file;
9. return the committed revision and accepted keys.

No client sends or replaces the full table.

#### `POST /localization/retranslate`

Explicit user action only. It removes or replaces exact requested error/ready
row keys after validation. It does not run a provider request on the server and
does not implement automatic retry.

### 2.5 Ownership

| Component | Writer | Readers |
| --- | --- | --- |
| English world State | domain reducers | Prompt, Knowledge, UI projections |
| English message transaction | workflows | archive, Knowledge, UI projection |
| translation table | localization endpoint only | localization adapter/UI view model |
| display-locale preference | UI preference port | UI renderers/scheduler |
| queue state | page session scheduler | UI status |

Translation-table rows are never available to Prompt/Knowledge construction
ports.

## 3. Server Components

### 3.1 `src/hogwarts-mud/localization-table.js`

Responsibilities:

- path derivation under authenticated user files root;
- exact Schema normalization;
- row-key construction;
- snapshot + checksummed journal replay;
- per-table mutex;
- durable append and atomic snapshot compaction;
- query/upsert/retranslate;
- limits and diagnostics;
- no Knowledge or world-State imports.

It uses `write-file-atomic`, following the existing Knowledge JSON backend.

### 3.2 Endpoint wiring

`src/endpoints/hogwarts-mud.js` adds the four endpoints and obtains storage from:

```js
request.user.directories.files
```

Endpoint bodies are bounded before serialization. Timeline epochs are never
used directly as filenames.

### 3.3 Client adapter

Create:

```text
adapters/localization-table.js
```

Ports:

```text
getHealth()
queryRows(keys)
upsertRows(rows)
requestRetranslation(keys)
```

It validates the server contract on every response and has no fallback to
message extras, State or browser persistence.

## 4. Client Locale Projection

### 4.1 Static resources

Create domain-specific keyed resources:

```text
locales/en.js
locales/zh-cn.js
```

Keys are stable and never use displayed English/Chinese as identity.

Static resources own:

- panel/buttons/settings/errors/status;
- campaign/difficulty labels;
- check/attribute/outcome labels;
- Spell/Item/Map Canon display labels;
- relationship/status/category labels.

### 4.2 Display preference

Session:

```text
session.displayLocale = zh-CN | en
```

Default is `zh-CN`. A small browser preference may remember the locale; it
contains no translations or world data. Clearing it returns to `zh-CN`.

### 4.3 LocalizedViewModelV1

UI projectors accept:

```text
canonical English view model
displayLocale
matching TranslationTableRecordV1 rows
static locale resources
```

They emit display-only text. Renderers never read deleted no-suffix fields or
server rows directly.

### 4.4 Message language shape

Accepted English segment:

```json
{
  "type": "narration",
  "textEn": "English canonical prose"
}
```

Raw non-English evidence:

```json
{
  "type": "narration",
  "rawText": "非英语模型原文",
  "language": "zh-CN",
  "authority": "model_output_evidence"
}
```

Exactly one of `textEn` or `rawText` is present.

The renderer:

- queries server translation rows only for `textEn`;
- always renders `rawText` as returned;
- does not relabel raw text as English;
- does not expose raw text to Prompt or Knowledge.

## 5. Idle Scheduler

Create:

```text
runtime/idle-localization-scheduler.js
domain/localization-queue.js
```

### 5.1 Priority

```text
P0 current assistant message
P1 visible/current Scene/Actor/Calendar records
P2 recent changed Memory/Appraisal/Relationship records
P3 latest Scene Archive
P4 older Archive newest-first
```

Page opening calls `raisePriority(recordKeys)` only.

Timeline load projects the full current State candidate set before rendering,
derives stable row keys, and queries TranslationTableV1 in bounded
`maxQueryKeys` chunks. Existing `ready` and `error` keys are not enqueued.
Missing keys enter the session queue while automatic work remains suppressed;
the first render can therefore raise visible keys to P1 before the load gate
reopens and schedules idle work.

### 5.2 Gates

`canDispatchLocalizationBatch()` requires:

- `displayLocale === 'zh-CN'`;
- provider is not `off`;
- `automaticWork.suppressed === false`;
- no active entry in every generation/director/observer job-registry slot;
- `turnActive === false`;
- `sceneTransitionActive === false`;
- no guarded-save conflict or pending commit;
- no active localization batch;
- visible document;
- no newly submitted player action;
- granted `requestIdleCallback` slice.

Fallback for browsers without `requestIdleCallback` is a zero-work scheduling
timer that still applies every explicit gate before dispatch. It is not a
persistence fallback.

### 5.3 Batch

One batch equals one provider request.

```text
local: 3600 source characters
Google: 4700
Bing: 900
```

Local records are sent as structured
`segments[{index,partIndex,text}]` and must return
`translations[{index,partIndex,text}]` with the exact same unique ID set.
The server reconstructs protected field markers only after Zod and ID-set
validation. Missing, duplicate or unknown IDs fail the batch without guessing
boundaries. Google and Bing retain their provider-specific protected-marker
transport.

The exact production request is measured against the `local_translation`
20,000-character budget. Source text, segment IDs and Schema are protected;
glossary entries trim first. A batch is capped by both the provider source
character limit and TranslationTableV1's 256-row upsert limit.

### 5.4 Outcome

Success:

- validate structured segment IDs or provider markers and target locale;
- create exact server rows;
- one batch upsert;
- rerender affected records;
- recheck all idle gates.

Failure:

- one `error` row per requested record with bounded error code;
- no second provider request;
- no repair Prompt;
- no provider fallback;
- no world or message write.

An in-flight request may finish after a player action starts, but its only
effect is a server-table upsert and targeted rerender after the active turn.

## 6. Model Registry and Scheduler

Update the model task definition:

```text
taskId: local_translation
trigger: localization.idle_batch_requested
phase: idle_display
blocking: false
quotaGroup: local_translation
ledgerScope: ephemeral_display
```

`MODEL_TASK_EVENT_TYPES` adds `localization.idle_batch_requested` and removes
the old runtime translation trigger after all callers migrate.

`createModelEventScheduler()` supports:

```text
ledgerScope = world | ephemeral_display
```

For `ephemeral_display`:

- budget checks and attempt/success/failure callbacks still run;
- world `modelTaskRuntime` is not mutated;
- `persistRuntime` is not called;
- page-session queue owns transient counters.

No other task changes ledger scope.

Every scheduler factory/harness must pass and assert the new behavior.

## 7. Workflow Cutover

Remove all awaited localization from:

```text
workflows/opening.js
workflows/turn.js
workflows/turn-performance.js
workflows/scene-transition.js
workflows/social-memory.js
workflows/interior-map.js
workflows/calendar-moment.js
```

After canonical commit, workflows emit deterministic localization candidates
to the idle queue. Candidate emission cannot fail the committed workflow.

Delete:

- `localizeTurnTransaction()` from authority flow;
- State setters in `translateCurrentStateAndLatestArchive()`;
- recent-message rewriting in `translateMessage()`;
- `translating` from the atomic generation status rail;
- translation provider/version metadata from State/chat.

Replace `translation-controller.js` with display-locale/queue coordination. It
must not call `saveChat()` or `saveMetadata()`.

## 8. Per-Task Language Adoption

| Active task | Non-English handling | Canonical outcome |
| --- | --- | --- |
| `character_polish` | show raw result in setup preview | do not replace `polishedBackgroundEn` |
| `opening_world` | preserve raw response diagnostics/display | skip non-English semantic records; world remains initialization-incomplete without automatic retry |
| `calendar_high` | skip affected storyline/beat | independent English records commit |
| `calendar_medium` | skip affected schedule | independent English schedules commit |
| `interior_cartographer` | skip non-English map/room record | current map remains usable |
| `pacing_director` | omit non-English prose/intervention | no pending beat when required English text is missing |
| `scene_performance` | render raw segments; skip bad proposals | commit player/check/clock shell and independent English segments/proposals |
| `scene_transition` | show raw evidence; do not close/move on incomplete package | current Scene remains authoritative; no automatic retry |
| `scene_opening` | render raw opening segments | no State writer exists |
| `social_director` | skip non-English Appraisal/Schema/claim | independent English records commit |
| `map_expansion` | skip non-English generated nodes | current map remains unchanged |
| `local_pre_turn_adjudicator` | omit non-English reason prose | structural temporal/check result may commit |
| `local_post_turn_observer` | skip Event/Material/Identity record missing English semantics | independent English observations commit |
| `local_inventory_observer` | skip affected Item candidate | independent English candidates commit |
| `local_appraisal_proposer` | skip affected Appraisal | independent English Appraisals commit |
| `local_translation` | target-locale output is expected | write server translation rows only |

All paths issue one model response only. Language mismatch diagnostics are not
fed back to a model.

## 9. Schema and Field Changes

### 9.1 Calendar V3

Remove `title` and `summary` from storyline, beat and entry fields. Models emit
only `titleEn/summaryEn`.

### 9.2 Item V4

Remove no-suffix Item prose from authority. Canonical fields are
`labelEn/appearanceEn/detailEn/notesEn`.

### 9.3 Local Map V2

Semantic maps/levels/rooms retain only `nameEn/descriptionEn`. Alias/localized
display catalogs are separate.

### 9.4 Spellbook V3

Custom definitions retain `nameEn/effectEn`; built-in Chinese display text moves
to static locale resources.

### 9.5 Material V3

Canonical fields:

```text
objectTextEn
sourceTextEn
targetTextEn
valueTextEn
previousValueTextEn
resultTextEn
descriptionEn
```

Source evidence:

```text
sourceMessageIds
sourceSegmentRefs
rawEvidenceText
rawEvidenceLanguage
```

Raw evidence is excluded from Prompt.

### 9.6 Character V2

Split:

```text
inputEvidence
canonicalEn
attributes
storyPreferences
confirmed
```

Prompt uses `canonicalEn`, codes, attributes and preferences only.

### 9.7 Scene timeline

Replace ambiguous `label` with:

```text
summaryEn
sourceRef
clock
```

### 9.8 Message Language V1

Remove all display translation fields listed in the migration matrix. Canonical
and raw-evidence segments use the mutually exclusive shapes in section 4.4.

## 10. Atomic Migration

Create:

```text
domain/language-authority-migration.js
scripts/dry-run-hogwarts-language-authority-v1.mjs
```

### 10.1 Whole-timeline save port

Add:

```text
guardedRewriteTimeline({
  currentState,
  nextState,
  currentChat,
  nextChat,
  source,
  changedDomains
})
```

It:

1. validates active timeline/revision/integrity head;
2. calls guarded revision commit once;
3. swaps State and chat in memory only inside the save callback;
4. calls host `saveChat()` once;
5. relies on the host atomic JSONL replacement;
6. restores prior State/chat on failure.

It must not call `saveMetadata()` first.

### 10.2 Migration order

1. versions and shape preflight;
2. clone root State and `turnRetry.baseState`;
3. migrate schemas and English pairs;
4. reconstruct all timeline summaries/source refs;
5. migrate messages/swipes;
6. apply guarded Tina exception;
7. rebuild derived Material/Presentation/Room projections;
8. validate Character V2;
9. assert no canonical Han;
10. rebuild Knowledge in memory;
11. build production Prompts;
12. generate Before/After matrix;
13. idempotently seed every migratable Chinese display value into the server
    translation table;
14. query-verify every seeded source-hash key;
15. perform one guarded JSONL rewrite.

Translation-table seeding or verification failure blocks JSONL migration.
Partially seeded rows are valid and harmless; the source JSONL remains
unchanged and the next attempt reuses those rows.

### 10.3 Tina exception

The exact mapping and guards live in:

[phase2-migration-matrix.md](./phase2-migration-matrix.md)

The mapping is data, not a general translation function. Exact before-string
or identity mismatch fails preflight.

Revision 4 adds one separately guarded timeline row:

```text
messageId = 6
clock = 1991-07-24 · 10:00
after = Tina sighs, reluctantly lets Professor McGonagall enter, folds her
        arms, and tries to trip her as she steps inside.
```

The replacement writes the canonical `turnTransaction.publicEventEn` and
timeline `summaryEn`, while `sourceRef` points to message `6`. The original
Chinese player message remains `player_input_evidence`. The exact active swipe
copy must match or preflight fails.

## 11. Prompt and Knowledge Cutover

Prompt projectors:

- remove every no-suffix display field;
- remove translated/raw model evidence;
- use bounded Character V2;
- use English timeline/Material V3 fields;
- do not add translation-table rows as replacement payload.

Knowledge:

- scene transcript includes player raw input as attributed player evidence;
- assistant transcript includes accepted `textEn` segments only;
- non-English raw model segments are excluded;
- all State records use English canonical fields;
- translation service imports are forbidden in Knowledge modules.

After implementation, the language audit baseline must reach:

```text
canonical_en_contains_cjk = 0
locale_cache_prompt_visible = 0
locale_cache_rag_visible = 0
mixed_model_output_contract = 0
```

## 12. Prompt Budget

Hard targets are defined in `prd.md`.

Implementation measurement adds:

- exact before/after total;
- System and Schema sizes;
- every top-level field size;
- removed locale field characters;
- duplicate semantic strings;
- protected-field presence;
- model/network call count.

No target can be raised to make implementation pass without a new approved PRD
revision.

## 13. Frontend

### 13.1 UI controls

- setup display-locale segmented control;
- settings display-locale segmented control;
- provider selector remains independent;
- visible translation pending/error state;
- explicit retranslate command.

### 13.2 Renderer behavior

`en`:

- no translation-table query required for text;
- static English resource + canonical English.

`zh-CN`:

- batch query visible record keys;
- static Chinese resources;
- server translation rows;
- English fallback while missing/error.

Locale change rerenders in place and does not save world/chat.

### 13.3 No nested authority

UI cards receive localized view models only. They never receive raw State plus
server rows and choose fallback ad hoc.

## 14. Test Ownership and Harness Inventory

New focused owners:

```text
tests/hogwarts-mud-localization-table.test.mjs
tests/hogwarts-mud-idle-localization.test.mjs
tests/hogwarts-mud-language-cutover.test.mjs
tests/hogwarts-mud-model-language-adoption.test.mjs
tests/hogwarts-mud-display-locale.test.mjs
```

Existing focused harnesses requiring migration:

```text
hogwarts-mud-translation.test.mjs
hogwarts-mud-language-governance.test.mjs
hogwarts-mud-save-revision-integration.test.mjs
hogwarts-mud-prompt-payload-consolidation.test.mjs
hogwarts-mud-task8-call-budget.test.mjs
hogwarts-mud-task5-workflows.test.mjs
hogwarts-mud-memory-scene-boundary.test.mjs
hogwarts-mud-scene-chronicle.test.mjs
hogwarts-mud-calendar-schema-migration.test.mjs
hogwarts-mud-high-calendar-director.test.mjs
hogwarts-mud-medium-calendar-director.test.mjs
hogwarts-mud-calendar-ui.test.mjs
hogwarts-mud-map-cartography.test.mjs
hogwarts-mud-item-system-v2.test.mjs
hogwarts-mud-material-state.test.mjs
hogwarts-mud-actor-context-runtime.test.mjs
hogwarts-mud-actor-dossier-ui.test.mjs
hogwarts-mud-turn-recovery.test.mjs
hogwarts-mud-turn-validation.test.mjs
```

Every affected harness must construct the new registry/scheduler/cache-table
ports and reach its business assertion. No compatibility facade restoration.

## 15. Blind Model Acceptance

Fresh context-free agents receive exact final production requests for:

```text
character_polish
opening_world
calendar_high
calendar_medium
interior_cartographer
pacing_director
scene_performance
scene_transition
scene_opening bootstrap
scene_opening runtime
social_director
map_expansion
local_pre_turn_adjudicator
local_post_turn_observer
local_inventory_observer
local_appraisal_proposer
local_translation zh-CN batch
```

For each:

- one response only;
- no expected answer or validator shown;
- untouched response through production parse/adoption/validation/reducer;
- exactly one model request;
- zero repair/retry/fallback requests;
- English canonical writes contain no Han;
- deliberately non-English samples prove non-fatal skip/display behavior.

## 16. Failure Policy

Fatal:

- invalid JSON/Schema unrelated to language;
- invalid stable ID;
- structured authority/ACL violation;
- migration preflight conflict;
- translation API contract mismatch;
- atomic JSONL save failure.

Non-fatal:

- non-English semantic model text;
- translation-table miss;
- translation provider failure;
- marker mismatch in one translation batch;
- translation table unavailable/at capacity;
- stale translation source hash.
- free-form prose that sounds historical; it remains model-output evidence and
  is not promoted into authority by wording alone.

Non-fatal outcomes never initiate another model call automatically.

## 17. Verification

Required after implementation:

```text
focused unit tests
affected current-contract regressions
read-only Tina migration report
forced migration failure/rollback
real Tina atomic migration
authenticated localization-table health/query/upsert
Node restart proof
Knowledge rebuild and canonical hydration
all production Prompt build-only measurements
fresh blind task matrix
one real end-to-end turn
locale switching and idle-queue browser tests
source/save/cache-table integrity report
```

The final evidence records residual risks and technical-debt closeout.
