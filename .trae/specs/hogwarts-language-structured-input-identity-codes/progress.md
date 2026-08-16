# Progress

Artifact revision: 4

Phase: implementation

Active task: P2-11

Approval: Revision 4 explicitly approved on 2026-08-15

## 2026-08-16 - Current-Contract Test Hygiene

User directive:

- tests for active behavior must migrate in the same change;
- tests and utilities for retired behavior must be deleted and registered in
  the canonical manifest;
- unresolved waivers and debt must be explicit in `TECH_DEBT.md`.

The protagonist alias idea is explicitly deferred. Its direct-UI versus
narrative-name scope remains undecided; no alias field, automatic inference,
real-save migration or partial Reader change is authorized under this TODO.

Canonical manifest:

```text
.trae/specs/hogwarts-test-suite-decomposition/test-migration-manifest.md
```

Completed contract migrations and retirements include:

- Calendar V2 fixture fields -> Calendar V3;
- Appraisal Scene/message/rumor copies -> EventRef-only Appraisal V2;
- dead Task 6 legacy backup paths -> active r146 prompt-only dry-run;
- current lifecycle migration-port harnesses;
- current post-cutover Timeline/Appraisal validation;
- Presence migration Event V1 -> strict observed Event V2;
- Qdrant smoke revision-range mock support;
- structured campaign Prompt assertions and stable-ID spatial movement;
- Social V2 claims catch-all -> focused Social V3 claims tests;
- retired Daily chronicle, Task3/Task4 facade catch-alls, skipped
  pre-unification fixture and rejected Task7 quill-absent repair tests removed.

Full current Hogwarts Node result:

```text
command: node --test tests/hogwarts-mud-*.test.mjs
tests: 737
pass: 734
fail: 3
skipped: 0
todo: 0
```

The three remaining failures reach current business assertions:

```text
Scene Transition Prompt: 76,531 > 76,100
Knowledge: authorized quill Event absent from one or more actor capsules
Medium Memory: locked Event text appears in the medium payload
```

They are registered separately in `TECH_DEBT.md`; no stale fixture,
compatibility export, `skip` or `todo` is used to hide them.

Post-cleanup verification:

- restored and retained the active Pacing promotion policy plus public causal
  normalizer/validator re-exports after deleting only the two zero-caller
  Legacy bodies;
- corrected the canonical manifest to the resulting 49-line module and
  removed the deleted Task 3/Task 4 paths from the README validation command;
- reran the complete Hogwarts glob after that correction: `737` tests,
  `734` pass, the same `3` registered business failures, `0` skip and
  `0` todo;
- ran the maintained production/Hogwarts test ESLint scope: `0` errors and
  `63` existing Playwright warnings;
- repository search found no active production/test reference to the deleted
  World Change, regex provenance, Task 3, Task 4, Task 7, Social V2 catch-all
  or NPC claims catch-all paths and symbols;
- registered the intentionally retained localhost localization debug probes
  and `.dbg` files as `HTD-012`; they must be removed after fresh browser
  localization acceptance and before closeout.

## 2026-08-16 - Independent Acceptance FAIL and Error Recovery

The fresh independent acceptance Agent reported `FAIL`:

```text
independent-evidence/p2-11-independent-acceptance-r146-fail.md
```

Its decisive localization findings were:

- Dossier memory fields remained English/pending in its browser session;
- one current Item detail row was `SOURCE_LOCALE_LEAK`;
- the registry still contained `PATCH` routes;
- zh-CN Settings exposed the complete English world-system Prompt.

The acceptance evidence crossed Tina `r145 -> r146` and TranslationTable
`217 -> 238`, so the verifier correctly stopped remaining exhaustive browser
expansion. It did not mutate code, saves or the table.

Main-Agent remediation after the verifier's baseline:

- deployed server-side ready precedence and proved a late error cannot
  downgrade a ready row;
- restored `45` current race-degraded rows from their durable ready journal
  history through the versioned API, with zero model requests;
- migrated the sole real-save timeline `label` through
  `guardedRewriteTimeline`, producing Tina r146 with
  `summaryEn` and `message:216:public_event`;
- preserved all `217` chat messages and unrelated authority hashes;
- seeded the new timeline translation from an exact same-source ready row;
- localized message source-toggle chrome from `EN` to `英`;
- tightened the leak detector to include single Latin letters.

The stricter audit exposed `18` previously accepted ordinary single-letter
rows (`H`, Map compartment `A-F` and a `V`-shaped wake), plus the explicitly
retried Item detail row. Spell incantations remain the only relevant narrow
allowlist. The Item detail's one explicit request failed as
`SOURCE_LOCALE_LEAK`; no automatic retry occurred.

Latest user decision for Settings:

- the editable English world-system Prompt remains visible as-is;
- it is registered as the exact `SETTINGS-006` technical source under
  `ALLOW`;
- no translation, hiding or UI remediation applies to this field.

Prompt overages and module-size assertions remain outside approved remediation:

```text
Scene Transition: 76,531 > 76,100
Social: 82,386 > 80,000
social-memory.js: 2,197 > 2,000
index.js: 610 > 600
```

No Prompt trimming, Social evidence policy, cursor behavior or unrelated
module refactor was added.

## 2026-08-16 - P2-11 Registry-Driven Remediation

The user approved implementation from the complete frontend dynamic-field
audit and added a permanent independent-acceptance requirement.

Governance:

- `SKILL.md` now requires a fresh independent Agent to receive the project
  goal and independently design and execute complete acceptance;
- the implementation Agent cannot be the sole acceptance authority;
- a failed verification cycle must be rerun from the goal by another fresh
  Agent after fixes.

Implementation:

- State and chat candidate collection now share exact identities with visible
  Readers, including all historical message segments, Author's Quill, custom
  Spells, archive timeline entries, Person Schemas, presentations, Clues and
  Status;
- visible misses enqueue real candidates instead of remaining pending;
- Game People, Scene Transition, Composer, messages, Calendar, Map, Dossier,
  Items, Spells, Save preview and Relationship Constellation now resolve
  dynamic text through TranslationTable/static locale routes;
- Canon names use the authoritative zh-CN catalog;
- internal room/Map/Scene/Storyline/Item provenance IDs were removed from
  ordinary player-facing labels;
- all affected error surfaces expose explicit field retranslation;
- local translation protects glossary terms and every built-in/custom
  incantation with markers;
- a row containing non-allowlisted English now becomes dormant
  `SOURCE_LOCALE_LEAK` instead of false `ready`;
- allowed incantations are removed before target-locale ratio validation, so
  `自定义咒语 · Nebula Verto` is not rejected merely for preserving the
  incantation;
- zh-CN Character Polish now produces Chinese player input evidence; internal
  English authority remains owned by later canonical workflows.

Focused deterministic evidence:

```text
frontend/display/Calendar/Actor/Item/translation/relationship suite: 73/73
language/migration/table/mobile/model suite: 57/57
broader affected-domain suite: 184/195
ESLint changed implementation/tests: zero errors
git diff --check: passed
```

The broader suite's `11` failures are pre-existing unrelated contracts:

- two old module-size/Campaign Prompt assertions;
- nine cases that require a deleted historical Tina backup fixture.

No unrelated Social, Prompt evidence selection or historical fixture repair was
performed.

Blind Prompt evidence:

```text
blind-evidence/p2-11-localization-remediation.md
```

Both fresh, context-free cases passed with one response and no repair:

- local zh-CN marker batch;
- zh-CN Character Polish.

TranslationTable remediation:

- revision `38 -> 41` explicitly deleted `132` exact dormant-error or
  false-ready current-candidate rows through the versioned retranslation API;
- no direct journal edit and no State/chat/Knowledge write occurred;
- the latest runtime is hydrating all missing candidates through the approved
  idle scheduler;
- live progress at revision `61`:
  `783 ready / 44 error / 817 missing`;
- false-ready count is zero; first-attempt failures remain dormant and are not
  automatically retried.

Full browser acceptance and the independent acceptance Agent remain pending
until the first idle pass drains.

## 2026-08-16 - P2-11 Localization Remediation Steady State

Additional implementation and browser evidence:

- player name, desire and fear use
  `character_input/player/<fieldPath>` across Save Library, Game header,
  message headers, Map, Player Inspector and Relationship Constellation;
- `Tina Zhang / A good husband / Spider` now render as
  `蒂娜·张 / 好丈夫 / 蜘蛛`;
- local idle batches prelocalize deterministic glossary terms before the
  single model request and reject empty output as `EMPTY_TRANSLATION`;
- Author's Quill `210` was diagnosed with one temporary runtime evidence
  point: the model retained `aggressively` and generated `winked`;
- prelocalizing the complete source phrase `aggressively winking` produced a
  ready Chinese row at TranslationTable revision `144`;
- Canon Item owner `canon_charles_weasley` resolves through the confirmed
  Charlie Weasley identity redirect instead of exposing an internal ID;
- ordinary UI strings no longer expose `Canon`, `CURRENT SCENE`,
  `RULES RESOLVED`, `D20 CHECK`, `Storyline`, `beat`, `Schema`, `Item`,
  `evidence`, `roomId` or Item reference IDs in Chinese display;
- current Game, People, Player Inspector, Items, Spells, mini Map and
  Relationship Constellation prechecks render Chinese, except exact registered
  `RAW` player evidence and allowlisted incantations/technical controls.

Verification:

```text
frontend/display/Calendar/Actor/Item/translation/relationship suite: 75/75
language/migration/table/mobile/model suite: 63/63
ESLint changed implementation/tests: zero errors
git diff --check: passed
```

TranslationTable:

```text
revision: 168
current candidate identities: 1648
ready: 1605
error: 43
missing: 0
false-ready: 0
```

The approved precise error retranslation deleted exactly `202` current error
keys through the versioned API. It eliminated all `TRANSLATION_FAILED` rows.
The remaining `43` rows failed the quality gate again:

```text
SOURCE_LOCALE_LEAK: 41
TARGET_LOCALE_MISMATCH: 2
```

They total `16,263` source characters and deterministically form five local
provider batches (`18/6/10/5/4` rows). No further retry has run. A diagnostic
pass would require explicit user approval for five model requests, followed by
another explicit five-request validation pass after evidence-based glossary
fixes. Full registry acceptance and the independent acceptance Agent remain
blocked until this decision and a zero-error steady state.

## 2026-08-15 - P2-11 Full Frontend Field Audit

The user stopped piecemeal Renderer fixes after additional visible English was
found in Author's Quill, custom Spell, Item and Calendar public-source fields.
All implementation patches made immediately before the stop remain
`unverified`; none is completion evidence.

Root process failure:

- acceptance had no exhaustive frontend dynamic-field inventory;
- tests followed convenient components rather than every visible Reader;
- `ready` table rows were treated as proof even when a Renderer bypassed them;
- latest-message sampling ignored loadable historical messages;
- global Calendar status included hidden fields while visible source fields
  such as public-source titles bypassed their ready translations.

Permanent governance added:

```text
.trae/skills/hogwarts-change-governance/FRONTEND_DYNAMIC_FIELD_REGISTRY.md
```

The registry contains `196` stable field-family rows across Home, Setup,
Settings, Game, People, Story, Composer, Messages, Calendar, Map, Dossier,
Items, Spells, Clues, Status and Relationship Constellation. The Skill now
blocks frontend work when a dynamic value is unregistered, marked `NO/PATCH`,
or lacks repeated-instance browser evidence.

Model-free real Tina expansion:

```text
exact dynamic translation identities: 1514
ready after background queue stop: 489
error after background queue stop: 67
missing after background queue stop: 958

missing message_segment rows: 956
missing spell_definition rows: 2
known invalid ready rows: at least 5
```

The Calendar public-source Reader displayed:

```text
Tina's Magical Heritage and Secrets · Year 1: Entering the Magical World
```

while both exact Storyline/beat title rows were already ready in Chinese. This
is recorded as a Reader bypass.

Evidence:

```text
browser-evidence/frontend-dynamic-field-audit.md
```

No browser reload, click, queue insertion or explicit retranslation ran during
the audit. The already-open local browser tab nevertheless continued
previously queued idle work and committed revisions `32..34` before it was
moved behind a non-local page. Revision 34 was the final in-flight batch; no
revision 35 appeared during the following observation window.

Current baselines:

```text
Tina SHA-256:
9c2ae4e9a8e9eef449cc0dcee75d3a90b6d761f20efcdbea3af606ff0a2ae243

TranslationTable revision: 34
TranslationTable rows: 1549
TranslationTable SHA-256:
6aab504b3863c97df2c4b53625b04d11b9a25b54667a99589fa8e9d19fffddab
```

The previous partial browser checkbox is reopened. Full browser traversal waits
for approval of the expanded TranslationTable operation matrix because opening
the affected surfaces can enqueue missing rows.

## 2026-08-15 - P2-11 Reopened by User Acceptance

User-visible failures:

1. Calendar `routine_lunch_great_hall.summaryEn` falls back to English while
   the title is Chinese.
2. Calendar and Dossier repeatedly show `暂时无法翻译`.
3. Historical story segments remain at `翻译中`; active people names remain
   English.

Root evidence:

- Lunch title row is `ready`; summary row is
  `error/TARGET_LOCALE_MISMATCH`.
- Canon Harry/Hermione name rows are ready and Lavender has a failed dynamic
  row, but Story/Calendar/Message readers bypass Canon Chinese localization.
- Message 210/214 have no `message_segment` rows. Visible-field lookup queries
  the miss and raises priority for a key absent from the queue, so the rows
  never dispatch and remain `pending`.
- Calendar/Dossier expose an error indicator but no explicit field-level
  retranslation action. The message retranslate command only schedules idle
  work and does not recreate segment candidates.

Approved-scope correction:

- enqueue visible table misses into the idle queue;
- use the existing authoritative Canon Chinese display catalog for Canon
  Actor names;
- wire explicit visible-field retranslation without automatic retry;
- preserve English fallback, one request per explicit action, and zero
  State/chat writes.

Implementation:

- visible query misses now enter the existing idle queue instead of only
  raising priority for absent queue keys;
- persisted error rows remain dormant;
- Calendar and Dossier error indicators now say that only some fields are
  showing English source and expose an explicit retranslate action;
- the message retranslate command now recreates exact segment candidates;
- Story, Calendar and segmented-message Actor names use the authoritative
  Canon Simplified Chinese display catalog without a model call;
- message Actor Core and Runtime rows merge instead of Runtime overwriting the
  name/role-bearing Core record.

Verification before real table writes:

```text
focused display/calendar/dossier/idle tests: 48/48
changed/new JS/MJS ESLint: 0 errors
git diff --check: passed
Tina/TranslationTable/Knowledge hashes: unchanged
```

Required real-table Before/After review:

| Scope | Before | After one approved action | Authority impact |
| --- | --- | --- | --- |
| Historical message 210/214 segments | 13 exact `message_segment` rows missing; UI remains `pending` because the keys never entered the queue | enqueue 13 stable missing keys; each provider batch gets one request; each row becomes one `ready` or one dormant `error` | no State/chat/Knowledge write |
| Selected Calendar error fields | Lunch summary has one `TARGET_LOCALE_MISMATCH`; the magical-talent entry has two | explicit button deletes only currently visible error keys and requeues them once; success becomes `ready`, failure becomes one new dormant `error` | no State/chat/Knowledge write; existing ready title retained |
| Selected Dossier error fields | Harry currently exposes two failed fields (`temperamentEn`, `currentActivityEn`); other ready fields remain | explicit button deletes/requeues only those visible failed keys once | no State/chat/Knowledge write; Canon names now static and need no table row |

No real table action or browser reload has been performed pending user review
of this matrix.

## 2026-08-15 - P2-12 Awaiting Debt Re-Inventory Decision

Living contracts now describe the implemented Revision 4 runtime:

- Language Authority V1 and domain versions are current rather than future
  targets;
- removed message translation fields have no registered writer or reader;
- TranslationTableV1, display locale, idle queue and non-fatal adoption
  ownership match production;
- free-form prose has no regex semantic classifier;
- Phase 3 remains unapproved.

Debt ledger:

- `HTD-005` is superseded because the regex classifier was removed;
- `HTD-006` records current Social growth as a separate undecided PRD topic;
- `HTD-007` remains open only for the developer active-save measurement path;
- current oversized-module evidence is recorded in `HTD-003`;
- the single change row is synchronized to
  `kind=feature`, `feature_delta=1`, `core_change=yes`;
- derived counters are `change_count=3`, `feature_count=1`.

Assistant debt self-audit:

> No compatibility layer, automatic repair, persistence hack or unregistered
> shortcut remains. Explicit deferred debt is HTD-001, HTD-003, HTD-004,
> HTD-006 and HTD-007. Three static size assertions were not used as behavior
> acceptance: the existing `index.js` excess is explicitly user-waived and
> Social module size remains HTD-003. The unapproved Prompt-cap attempt was
> fully rolled back before any model or persistence use.

The only remaining closeout gate is the required user decision on whether to
re-inventory all technical debt now or defer it.

## 2026-08-15 - P2-11 Acceptance Complete

Final fresh blind matrix:

- 17 fresh context-free agents;
- exact production transport requests only;
- one untouched response per case;
- one model call and zero repair/retry/fallback calls per case;
- every hosted response reached its Parser and Validator plus
  reducer/composed reducer;
- every local response reached JSON/Zod/language or marker validation;
- the composed Transition response generated a new runtime Opening request,
  which was answered by a separate fresh agent;
- representative archive SHA-256
  `439dd7a4f65e0d226b6856dda27bb6e8d842a60b3d8a2661b38597b3c7b16849`;
- source archive unchanged;
- matrix result: passed.

Evidence:

- [blind-evidence/p2-11-blind-matrix.md](./blind-evidence/p2-11-blind-matrix.md)

Authorized real Tina retry:

```text
status: committed
messageId: 216
clock: 1991-09-02 · 19:45
segments: 9
words: 251
high calls: 0
medium calls: 0
low calls: 1
repair calls: 0
performance validation: valid
```

The committed message and State use English canonical fields. Nine message
segments, two Actor-runtime fields and one Event summary received ready server
translations after commit.

Running Knowledge acceptance:

```text
HTTP: 200
knowledgeApiContractVersion: 3
indexFormatVersion: 2
projectorVersion: 2
projectionFingerprint: cyrb53-0b5c56664e7c8d
exact backend: json / healthy / 143 records
preferred backend: qdrant / healthy
degraded: false
```

The exact index remains at content revision 142 while active State is r145.
This is correct because the deterministic projection fingerprint is unchanged;
save revision is not Knowledge content identity.

Browser and persistence acceptance:

- `zh-CN -> en -> zh-CN` changed static and dynamic display without reload;
- the quiescent locale cycle issued no model/generation/save request;
- Tina JSONL, TranslationTable and Knowledge hashes/mtime stayed unchanged;
- Calendar detail, Map Inspector, Harry Dossier, first impression, shared
  memories, Item labels and message 216 resolved localized projections;
- missing/error translations rendered English fallback;
- 390x844 layout retained a 472px story viewport and 280px composer with no
  heading/input overlap;
- the mini-map expand button opened the 374x768 Map Inspector and synchronized
  `aria-expanded=true`.

Final persistence evidence:

```text
Tina r145 SHA-256:
9c2ae4e9a8e9eef449cc0dcee75d3a90b6d761f20efcdbea3af606ff0a2ae243

TranslationTable revision 27:
1497 rows / 1409 ready / 88 error
all 88 errors: TARGET_LOCALE_MISMATCH
SHA-256:
26e709735c1631d52cc88be3f28371c83d97b8d131121d108f62992050f9f134

Knowledge SHA-256:
1baa0721754b27d0277605ac62cb48794c34baa37b53553a8db8afbca61a409a
```

The 88 error rows remained dormant throughout browser and regression
acceptance.

Regression:

- approved Phase 2 focused suite: `319/319`;
- Medium Calendar business assertions: `9/9`;
- Task 6 UI business assertions: `8/8`;
- post-regex Performer/Opening/Knowledge diagnostics: `15/15`;
- changed/new JS and MJS files: ESLint zero errors across 147 files;
- `git diff --check`: passed.

Three unrelated static size assertions remain outside this change's behavior
acceptance: the user explicitly ordered the existing `index.js` excess not to
be changed, and the Social workflow size is tracked as module debt. The
pre-existing full-glob stale-contract failures remain HTD-004 and were not
used as Phase 2 acceptance evidence.

P2-11 is complete. P2-12 is now the only active task.

## 2026-08-15 - Out-of-Scope Prompt Trimming Rolled Back

P2-11 testing against the current r145 Tina save found:

```text
Scene Transition: 76,488 > 76,100
Social:           82,386 > 80,000
```

The assistant incorrectly treated the approved total-character targets as
authorization to invent evidence-trimming behavior. It added a 10,000-character
Transition transcript cap and a 40,000-character Social `sceneEvidence` cap
with prefix/pair rules without a product decision.

The user rejected that scope expansion. The unapproved production changes and
their focused boundary test were removed. The measurement-only budget bypass
used to inspect the failure was also removed.

No real Social workflow, model call, State/chat save, TranslationTable write or
Knowledge write used the rejected behavior.

Current decision:

- Social Prompt growth is an out-of-scope observation recorded for later
  product work;
- `sceneEvidence` ordering, trimming, batching, Event linkage, cursor
  advancement, catch-up scheduling and added call budget are semantically
  undecided;
- Revision 4 must not implement a cap or silently drop evidence;
- a separate reviewed and approved PRD is required before Social Prompt
  remediation;
- P2-11 remains in progress and continues only its approved language,
  localization, migration and acceptance work.

## 2026-08-15 - Regex Historical-Prose Validator Retired

Latest explicit user decision:

- regex cannot determine whether an NPC is recalling, lying, inventing or
  speaking normally;
- delete the natural-language historical-provenance Validator rather than add
  more regex exceptions;
- record a future Ollama semantic-adjudication TODO;
- do not add the Ollama call in the current revision.

Triggering real evidence:

- one safe Tina turn sent exactly one low-tier request and zero repair calls;
- the response was rejected on three
  `unsupported_historical_detail` false positives;
- only the Chinese player message was preserved, as designed;
- current Tina is in failed-turn/manual-retry state at r132;
- no retry button was clicked and no second real model request was issued.

Implementation:

- deleted
  `domain/narrative-memory-provenance.js`;
- removed hard-failure calls from Performer, Scene Opening workflow and Scene
  Transition package validation;
- retained optional `historicalClaims` as non-authoritative model metadata
  because Social evidence projection still reads it;
- deleted tests whose only authority was the retired regex rejection;
- retained structural Schema/ACL/authority checks and the one-request failure
  policy;
- future Ollama judging is tracked in `tasks.md` and requires a separate
  approved Prompt/call budget.

`HTD-005` is now superseded in substance because the regex detector it
described no longer exists. The canonical debt ledger update remains part of
P2-12 closeout.

## 2026-08-15 - P2-11 Real Migration and Idle Localization Follow-up

Real Tina migration:

- pre-migration r124 backup SHA-256:
  `e54d136c1260e31c3d2145a66d7b6873495de65774f9a431c19a065d2c2df7ac`;
- one failed State-only r125 was preserved as rollback evidence after the
  host chat-array closure rejected property reassignment;
- one provider-mismatch r125 and its `migration` table were preserved as
  rollback evidence;
- final active Tina is r125, Language Authority V1, 215 messages and 127
  timeline entries;
- final active JSONL SHA-256 remains
  `c0ce1c8f22a4c9a4b4a51e8d71cf3744f37512c71eefa2fe8c991eed7b27f8bf`;
- the exact approved message-6 English summary is committed while the original
  Chinese player input remains evidence;
- migration seed used `providerId=local`, 1052 ready rows and table revision 5.

Post-migration browser acceptance:

- chapter, current Scene title/summary and all three current timeline summaries
  resolve seeded Chinese rows;
- `zh-CN -> en -> zh-CN` switches canonical/display projections without
  changing Tina JSONL or TranslationTable bytes;
- all four locale controls now synchronize `active` and `aria-checked`;
- Map Inspector resolves current map/level/room labels in Chinese;
- Calendar and Harry Dossier expose English fallback plus visible localization
  status for fields that had no legacy Chinese seed.

Idle localization defect and fix:

- loading an existing timeline never populated the session localization queue;
  page-open priority raises therefore targeted absent queue keys;
- load now projects the current State candidate set, derives stable keys,
  queries TranslationTableV1 in bounded 1000-key chunks, skips persisted
  `ready/error` rows, enqueues only misses while automatic work is suppressed,
  lets first render apply P1 priority, and schedules only after the load gate
  reopens;
- queue batches now also obey the 256-row server upsert limit;
- focused idle/display/cutover verification: `36/36` passed; target ESLint and
  syntax passed.

The first real idle run exposed a second defect:

- the local model removed all multi-field marker tokens;
- every affected batch was rejected once, persisted as `error`, and never
  retried or repaired;
- current TranslationTable is revision 15 with 1485 rows:
  `1109 ready`, `376 error`;
- TranslationTable journal SHA-256:
  `12bf5e49f0b8ec3b5ab3eef07b7fd8729e2cc3687585747129e4254bf3b3c33b`;
- Tina JSONL remained unchanged.

The local batch contract now sends
`segments[{index,partIndex,text}]` and requires the exact matching
`translations[{index,partIndex,text}]` set. The server reconstructs marker
transport only after Zod and exact ID-set validation. Missing, duplicate or
unknown IDs fail without a second request.

Follow-up fresh blind evidence:

```text
case: local_translation_zh_cn
request SHA-256: 7983e726ff0ba183f1c87146a19579c3f0c86656c005f7f505924137c8632caf
raw response SHA-256: 229908a11ea96a8929ba4a1445b88cd5d5a763485a312498b3fb54789c8baff4
production harness response SHA-256 (trimmed transport): 11663ecc2c0fa4c4a2fdc013bc721d480fef74054d72f1c27c2c0e61b2a78b53
model calls: 1
repair/retry/fallback: 0
stage: zod_marker_validation
result: passed
```

The full historical 17-case validator was not reclassified: its hosted group
failed because newly recaptured Calendar requests use r125 while untouched old
hosted responses carry the earlier revision. The only changed Prompt case,
`local_translation_zh_cn`, passed independently with one untouched response.

Data changes awaiting explicit review:

| Data | Before | Proposed after | Canonical State/chat impact |
| --- | --- | --- | --- |
| Knowledge exact/preferred index | contract 3; exact r102; 143 records; 69 Scene records; fingerprint `cyrb53-1c9fded13a8022` | authenticated rebuild from r125; 142 records; 68 Scene records; fingerprint `cyrb53-1277d9caa032a0` | none; derived index only |
| TranslationTable error rows | 376 exact `local` rows at `status=error`, English fallback; 1109 ready rows retained | explicit deletion/requeue of only those 376 keys; each structured batch gets one attempt and becomes `ready` or one new `error` | none; server translation table only |

No Knowledge rebuild or error-row retranslation has run pending explicit user
approval of this matrix.

## 2026-08-15 - P2-10 Complete

- Migrated every affected harness listed in `spec.md` to the current
  registry, scheduler, Localization, Social V3, Calendar V3 and language
  authority contracts.
- Deleted the retired Social V2 contract file and the obsolete
  `localizeMemoryConsolidation` assertion without restoring compatibility
  exports or workflow-local translation.
- Moved three pure Scene Transition assertions from
  `hogwarts-mud-memory-scene-boundary.test.mjs` to the focused
  `hogwarts-mud-scene-transition.test.mjs` owner. The files are now
  `1,862` and `1,825` lines and pass independently (`35/35` combined).
- Current Event/Appraisal fixtures now use Event V2, Memory Synapse V2,
  Social V3 cursor/result contracts and current Chronicle fields.
- Harness migration exposed one production defect: final Person Schema
  validation omitted `eventKnowledge`, so valid three-Appraisal/two-Scene
  evidence failed after the preceding stability check. The final validator
  now receives the same Event authority; focused boundary coverage passes.
- Complete affected batch: `210/211` passed. The sole failure is the known
  `index.js <= 600 content lines` assertion. The user explicitly ordered the
  existing 203-line/character excess to remain untouched; no production code
  or test was changed to satisfy that waived static limit.
- No affected test uses `skip`/`todo`; all new/focused files remain below
  2,000 lines and shared fixtures remain below 1,000 lines.
- Target ESLint and `git diff --check` pass.
- P2-11 is now the only active task. No Tina seed or JSONL rewrite has run.

## 2026-08-15 - P2-08 Complete

- Added pure whole-State/chat/swipe/retry Language Authority V1 migration.
- Added the exact approved Tina message-6 and five Material/Presentation
  mappings with timeline/fingerprint/record/string guards.
- Reconstructed all 127 timeline entries with stable source refs. Current
  chapter resolves from the last committed intent before the current Scene,
  not from a future next-scene intent.
- Added bounded TranslationTable seeding and complete query read-back:
  `256` rows per upsert, `1000` keys per query, no retry.
- Added `guardedRewriteTimeline`: exact State/chat precondition, one
  `saveChat()`, zero `saveMetadata()`, full in-memory rollback on confirmed
  failure.
- Save Library now suppresses automatic work, seeds/verifies translations,
  rewrites once, rereads committed State, then permits normal lifecycle.
- Generic lifecycle no longer runs Calendar V3, Item V4 or Spellbook V3 before
  `languageAuthorityVersion=1`.
- Check authority now stores `reasonCode + sourceMessageId`; Chinese player
  actions are no longer copied into `reasonEn`.
- Model-free Tina dry-run:
  - source SHA/bytes/mtime unchanged;
  - target versions `1/2/3/4/3/3/2`;
  - target JSONL SHA
    `b90a0c1220a03e5f0c79b448e5c601edb21501f684ebbc48a3ff50f1c18d3caf`;
  - target bytes `3836172`;
  - `1052` unique TranslationTable candidates;
  - language violations `0`, unknown paths `0`;
  - second run byte-idempotent.
- Verification: `116/116` focused tests, target ESLint zero errors and
  `git diff --check` passed.
- Evidence:
  [migration-evidence/p2-08-dry-run.md](./migration-evidence/p2-08-dry-run.md).
- No real TranslationTable seed or JSONL rewrite was performed. Those remain
  P2-11 gates.

## 2026-08-15 - P2-09 Complete

- The real build-only measurement now applies the P2-08 in-memory migration
  and requires every automatic repair Prompt to be absent.
- Removed duplicate `authoritySnapshot.currentActors` from Scene requests that
  already own role-specific Actor cards.
- Medium Calendar/Scene Transition retain non-public access constraints while
  omitting repeated default-public labels.
- Social retains authority/effect data while omitting empty optional fields.
- Map Expansion now receives a bounded Character V2 projection and a
  purpose-specific map directory without room Material or Actor spatial State.
- Character Polish no longer resends its previous generated prose.
- Host Character/Campaign authority is compact structured English/code data;
  static display names are absent.
- Runtime Spell/Scene readers no longer depend on removed `sourceEn`.
- Knowledge transcript projection uses accepted `segments[].textEn`; raw model
  evidence is omitted.
- All Revision 4 hard budgets pass:
  - Scene Performance `45,436 <= 47,626`;
  - Scene Transition `73,579 <= 76,100`;
  - Scene Opening `26,071 <= 28,319`;
  - High Calendar `11,589 <= 14,358`;
  - Medium Calendar `36,684 <= 36,893`;
  - Social `79,443 <= 80,000`;
  - Map Expansion `22,216 <= 39,344`;
  - Host System `19,224 <= 19,319`;
  - Local translation `1,513 <= 20,000`.
- No `.repair1` or `.repair2` Prompt was captured. Archive SHA/mtime remained
  unchanged.
- Evidence:
  [prompt-evidence/p2-09-budget.md](./prompt-evidence/p2-09-budget.md).
- Focused current tests passed except the known `index.js` content-line limit
  assertion, which the user explicitly ordered not to change. A separate stale
  Social test import remains P2-10 harness work.

## 2026-08-15 - Revision 4 Approved

- The user explicitly approved the one-time message-6 handwritten English
  timeline summary while preserving the original Chinese player detail.
- P2-08 is now the only active implementation task.
- Real Tina writes remain forbidden until the complete model-free dry-run,
  TranslationTable seed/read-back and atomic-save preflight gates pass.

## 2026-08-15 - Pre-P2-08 Lifecycle Write Detected

- Read-only P2-08 reconnaissance found the active Tina JSONL had changed from
  revision `123` to `124` at `2026-08-15 15:13:58` through an existing
  `lifecycle_migration` save.
- The revision-123 backup is
  `data/default-user/backups/chat_hogwarts_world_director_20260814-135928.jsonl`.
- Structured comparison proves:
  - all 215 chat messages are byte-identical;
  - Item state/physicalForm/owner/holder/location is unchanged;
  - Actor life status is unchanged;
  - Item/Actor/Calendar/Map/Spell/Event/Appraisal stable IDs are unchanged;
  - only the first-line State changed;
  - Calendar V3, Item V4 and Spellbook V3 were applied separately and their
    old display fields were deleted.
- The write exposed a production ownership defect: generic load-time lifecycle
  still called the language-cutover migrations before P2-08. Lifecycle now
  skips Calendar V3, Item V4 and Spellbook V3 unless
  `languageAuthorityVersion=1`; P2-08 owns the old-save cutover exclusively.
- The premature Item normalization cleared root derived Presentation values,
  but the five authoritative Material events and `turnRetry.baseState` retain
  every exact approved before string. P2-08 can deterministically rebuild the
  root Presentation from migrated Material events without widening the
  exception.
- No rollback or additional Tina write was performed.

## 2026-08-15 - Revision 4 Awaiting Approval

- Raw conversation history confirms the user's prior one-time exception was
  explicitly interpreted and documented as a Material event-ID allowlist. It
  does not authorize a timeline replacement.
- State-wide Event, Chronicle, Appraisal and actor-memory searches found no
  separate English summary for the message-6 player action.
- Revision 4 proposes one exact replacement:
  `Tina sighs, reluctantly lets Professor McGonagall enter, folds her arms,
  and tries to trip her as she steps inside.`
- Guards are the audited Tina timeline epoch, projection fingerprint, message
  ID `6`, clock `1991-07-24 · 10:00`, exact before string and exact active
  swipe copy.
- No production migration code or Tina data was changed. P2-08 remains pending
  until explicit Revision 4 approval.

## 2026-08-14 - P2-04 Complete

- Calendar V3, Item V4, Material V3, Spellbook V3, Local Map V2,
  Character V2 and Message Language V1 target contracts are implemented.
- All active model tasks now treat non-English semantic output as a non-fatal
  adoption skip rather than English authority.
- Local pre-turn, post-turn, inventory and Appraisal tasks filter language
  after structural validation and preserve independent English records.
- Pacing Director and the common streaming transport no longer issue an
  automatic second model request.
- World Map Expansion now emits and persists only
  `reasonEn/nameEn/summaryEn`; current Tina has zero generated World Map rows.
- Focused P2-04 evidence:
  - local language/Item/Material/Identity: `47/47`;
  - Item/Material/Character/Prompt/Narrative: `74/74`;
  - Map/Pacing/Social/language adoption: `44/44`;
  - model transport single-request contract: `3/3`;
  - Calendar/Map/Spell: `59/60`, with the sole failure being the explicitly
    deferred pre-existing `index.js` 203-content-line budget assertion.

## 2026-08-14 - P2-05 Complete

- Opening, Turn, Scene Transition, Social, Calendar Moment and Interior Map no
  longer await translation in their canonical transaction paths.
- New assistant messages persist `languageVersion=1`, canonical segments or
  raw model evidence, and no `sourceEn/textZh/translatedZh/display_text` or
  provider/version metadata.
- The common model transport no longer retries a failed stream as a second
  one-shot request.
- Removed the two legacy Turn repair writers that mutated chat locale fields;
  old rows are now owned only by the approved atomic migration.
- Verification:
  - authority-first focused contract: `16/16`;
  - Turn, model adapter and Save Revision regression: `31/31`;
  - canonical workflow localization call/writer grep: zero.

## 2026-08-14 - P2-03 Complete

- Added versioned, stable-key `en` and `zh-CN` static resources with exact key
  parity.
- Added read-only `LocalizedViewModelV1` with this display order:
  static resource, ready server row, English fallback.
- English display bypasses translation rows; raw model evidence remains raw
  display text and never becomes `sourceTextEn`.
- Locale projection mutates no canonical object.
- Resource/ViewModel plus TranslationTable verification: `22/22`.
- Renderer wiring remains owned by P2-07 and atomic deletion of old persisted
  display fields remains owned by P2-08.

## 2026-08-14 - P2-06 Complete

- Added P0-P4 in-memory localization queue with local/Google/Bing source caps.
- Added full idle/resource gates, one active batch, new-action cancellation and
  dormant error rows.
- `local_translation` now uses
  `localization.idle_batch_requested`, `idle_display`, `blocking=false` and
  `ledgerScope=ephemeral_display`.
- Ephemeral display tasks do not mutate or persist `modelTaskRuntime`.
- One marker-protected batch sends one provider request and performs one server
  table upsert; failure performs one bounded error-row upsert and no retry.
- Opening, Turn and Scene Transition emit candidates only after canonical save.
- Queue/scheduler/table focused verification: `23/23`.

## 2026-08-14 - P2-07 In Progress

- Added separate `zh-CN/en` segmented controls; display locale is session-only
  with an optional small browser preference and remains independent of the
  translation provider.
- Replaced the old Translation Controller with table/query/queue coordination;
  it has zero `saveChat/saveMetadata` calls and writes no message/State locale
  fields.
- Message, Scene and Calendar view paths no longer read
  `textZh/translatedZh/sourceEn/display_text` or Calendar V2 bilingual prose.
- Ready server rows enter the current page through an ephemeral event and are
  rendered without changing canonical chat.
- Locale/queue/authority-first focused verification: `18/18`.
- Preset World/Local Map exports now contain English semantic fields and
  aliases only. Their `316` static locale keys have exact `en/zh-CN` parity;
  28 preset room descriptions have explicit English sources.
- Map, Calendar, Composer, Story, Dossier and Save Library derive the same
  TranslationTable field identities. Save cards group server queries by each
  save's own `timelineEpoch`, so browser memory cannot cross-contaminate
  timelines.
- Opening, Interior, Movement and Scene Transition writers no longer recreate
  root `chapter/location`, Local Map display copies, Scene display copies or
  timeline `label`; current timeline entries use
  `summaryEn/sourceRef`.
- Home/Topbar/Setup static UI now switches through keyed resources. Known
  Character selects use existing stable codes; economy retains explicit
  Chinese player-evidence values while its label is localized.
- Restored the documented six-step setup order by sharing `SETUP_STEPS`;
  Story Preferences is reachable at step `4 / 6`.
- Visible pending/error states now exist for Map, Story, Calendar, Dossier and
  Save Library without changing canonical layout dimensions.
- Focused verification:
  - combined Map/Movement/Scene Transition/Chronicle/Calendar/Dossier,
    TranslationTable/idle queue, Character/Prompt and display/save batch:
    `162/162`;
  - target ESLint: zero errors;
  - `git diff --check`: passed.
- Real browser evidence on the running local server:
  - English to Chinese and Chinese to English switched on the same URL;
  - Home, save cards and the five inspected Setup views rerendered without
    reload;
  - visible English AI Settings, Identity, Background, Aptitudes and Story
    pages had zero Han text; Story was reachable at `4 / 6`;
  - blood/domain/talent options retained stable codes; economy display changed
    while its Chinese evidence value remained unchanged;
  - the 757px viewport had no root horizontal scroll or visible text/button
    overflow;
  - no Tina save was loaded or modified.
- Authenticated server-row recovery was verified against a current-code process
  on `127.0.0.1:8001`; the pre-existing process on port `8000` was proven stale
  by its `404 text/html` response for the registered localization health route.
- The current process returned Translation API/Table V1 health, then a unique
  synthetic timeline completed this exact sequence:
  - query absent;
  - upsert one `ready` row and query it at table revision `1`;
  - confirm the row key/source had no Local Storage or Session Storage copy;
  - clear Local Storage, Session Storage, both origin IndexedDB databases and
    Cache Storage from a same-origin static page;
  - reload the application and query the same server key as `ready`, with the
    same translated text and `rowCount=1`;
  - request explicit retranslation/deletion and verify query/health
    `rowCount=0` at table revision `2`;
  - restore the isolated origin's prior Local/Session Storage and
    `window.name`.
- The storage-clear test did not load, migrate or save Tina.
- Home layout passed real device emulation at `390 x 844` and wide desktop at
  `1440 x 1000`. Both had exact document/viewport width parity, zero
  out-of-viewport elements and zero overlapping interactive controls.
  Screenshots and geometry are recorded in
  [browser-evidence/p2-07-layout-evidence.md](./browser-evidence/p2-07-layout-evidence.md).
- Remaining P2-07 gates:
  - in-game Map/Dossier browser inspection without risking a pre-migration Tina
    lifecycle save;
  - real Game/Calendar/Inspector inspection after the atomic migration makes
    loading Tina safe.

## 2026-08-15 - P2-07 Safe-Surface Acceptance

- Review Map, Calendar, Actor/Identity Dossier, Inspector, Item, Story,
  Message, Composer, Turn, Relationship Graph, Settings and Profile chrome now
  resolve static labels through `zh-CN/en` resources. Chinese player-input
  templates remain intentionally Chinese evidence.
- English Review preserved stable Map option values and produced zero Han
  runs.
- English Home, AI Settings, Settings, New Profile and the empty Relationship
  Graph were inspected on the current-code server without opening a save.
- The New Profile inspection found and fixed one static placeholder leak:
  `例如：gemini-3.1-pro-preview` now projects from a keyed locale resource.
- Real `390 x 844`, DPR `2` geometry found a Profile dialog height mismatch:
  the outer dialog used `88vh` while the frame used `92vh`, producing nested
  vertical scroll and clipping the Save row. The Profile dialog now shares the
  `92vh` limit, has zero outer scroll range, one `340px` content scroll range,
  zero horizontal overflow, and a fully visible Save action.
- Settings at the same viewport had zero horizontal overflow, zero interactive
  overlap and zero dialog horizontal scroll.
- Evidence is recorded in
  [browser-evidence/p2-07-layout-evidence.md](./browser-evidence/p2-07-layout-evidence.md).
- Focused locale/import verification passed `33/33`. The broader
  locale/Calendar/Dossier/Item/Map/Relationship/idle/Table/adoption run passed
  `124/125`; the one failure is a P2-10 harness defect in the old full Prompt
  measurement, which still requires retired `opening.world.repair1`. No repair
  Prompt or second model request was restored.
- Target ESLint for the current Settings/Profile/locale/Relationship files has
  zero errors and `git diff --check` passes. A repository-wide Hogwarts lint
  still reports pre-existing unfinished errors in unrelated Phase 2 files and
  is not claimed as a P2-07 pass.
- No model request was issued. Tina was not loaded, migrated or saved.
- P2-07 implementation is complete on every safe surface. Its remaining
  Game/Calendar/Inspector/Map/Dossier browser acceptance waits for P2-08 atomic
  migration.

## 2026-08-15 - P2-08 Timeline Authority Blocker

- Read-only Tina reconnaissance disproved the approved matrix claim that all
  127 timeline entries have deterministic English sources.
- One logical record is affected: assistant message `6` and its active swipe
  copy contain the Chinese player action in
  `turnTransaction.publicEventEn`. It owns the
  `1991-07-24 · 10:00` Scene timeline entry.
- The original player message remains valid `player_input_evidence`, but it
  cannot become English timeline authority. No other
  `turnTransaction.publicEventEn` value contains Han.
- Existing approval permits handwritten Tina replacement text only for the
  exact Material/Presentation allowlist. Generating a translation, dropping
  the append-only timeline entry, or widening that exception without user
  approval is forbidden.
- Revision 4 now proposes the exact handwritten replacement. P2-08 remains
  paused before production migration code or any Tina write until the revised
  artifacts receive explicit approval.

## 2026-08-14 - Revision 0 Research

- Production language writers, readers, fallbacks and Prompt projections were
  inventoried.
- Player input was traced from the textarea through persistence, deterministic
  parsing, local models, Knowledge, Low Scene Performance, settlement,
  translation and rendering.
- The current Tina archive at State revision `123` was measured read-only.
- Actor, Spell, Item, Map, Room and Clue identity/resolver ownership was
  inventoried.
- Six fresh context-free blind agents ran one response each without expected
  answers or repair feedback.
- Bounded-catalog exact-ID binding scored `12/12` in both Chinese and English.
- Full evidence is in [research-findings.md](./research-findings.md).

## 2026-08-14 - External Research

Reviewed:

- multilingual native-language versus translation prompting;
- mixed-language RAG consistency and response-language failure;
- Unity/Microsoft/Naninovel source-locale and display-locale architecture;
- asynchronous event-driven translation;
- game dialogue and literary translation quality.

Decision:

- do not use Chinese Calendar/Director records as a second authority;
- keep one English semantic authority;
- treat Chinese as a display locale and input alias language;
- use stable IDs independent of display language;
- move dynamic localization outside world settlement;
- translate with full context/glossary rather than isolated fields.

## 2026-08-14 - User Decisions

1. English remains the internal semantic language.
2. The player-facing interface is Chinese through localization.
3. Chinese entity names must resolve deterministically to stable English IDs.
4. Display language is separate from system/save language.
5. Ordered structured intent is accepted; flat SPO is rejected.
6. Idle background translation is preferred over page-open-only translation.
7. Page opening may raise priority but is not the only translation trigger.
8. Revision 1 is governance only.
9. Idle translation moves to Phase 2.
10. Structured-input frontend work remains a later phase.

## 2026-08-14 - Current Prompt Baseline

Model-free build-only against active Tina:

```text
archive SHA-256:
412e7756225c6923d63659d195e3fe17157b98d965e7a6f953686ea0ca4b46db

archive bytes:
7186800

stateRevision:
123

turn:
101

contextSize:
120000

maxResponseLength:
12000

maxPromptCharacters:
298080

Low Scene Performance:
47626

Low System:
27199

Low User Payload:
20427

Scene Transition:
76100

Scene Opening:
28319

High Calendar:
14358

Medium Calendar:
36893

Social:
80640

Map Expansion:
39344

Host System Injection:
19319
```

The active Tina source SHA, bytes and mtime remained unchanged during the
successful Low build-only run.

The all-Prompt measurement script stopped on the pre-existing Social product
target assertion:

```text
social requires 80640 characters, above product target 80000
```

A measurement-only runtime assertion bypass was used once to read the remaining
metrics. It did not edit source, target or production code and is not acceptance
evidence. The Social target remains failed and outside this change.

## 2026-08-14 - Revision 1 Specification

Revision 1 artifacts now describe:

- six language classes;
- one English semantic authority;
- player-input and alias exceptions;
- governance-only implementation boundaries;
- read-only audit and exact baseline ratchet;
- no runtime, Prompt, UI, save or migration changes;
- Phase 2 English cutover and idle localization roadmap;
- Phase 3 ordered structured input and entity-binding roadmap.

Current status:

- `prd.md`: Revision 1 ready for review;
- `spec.md`: Revision 1 ready for review;
- `tasks.md`: LG-1 through LG-5 pending approval;
- `checklist.md`: implementation gates pending;
- Phase 2: `future_not_approved`;
- Phase 3: `future_not_approved`.

No production code, save, Prompt, UI or runtime contract behavior was changed
while drafting Revision 1.

## 2026-08-14 - Revision 2 Non-fatal Language Adoption

User correction:

```text
大模型吐中文时，不写入英语权威表，但不得报错拦截模型输出。
```

Revision 2 therefore separates:

- model response acceptance;
- player-visible raw output;
- canonical English field/record adoption.

Long-term Phase 2 rule:

- language mismatch alone is non-fatal;
- raw Chinese model text may still be shown to the player;
- the affected English canonical field, proposal or record is skipped;
- independent valid settlement continues;
- no repair, retry, automatic translation or second model call occurs;
- only bounded `model_language_mismatch` diagnostics are recorded;
- unrelated JSON/Schema/ID/authority failures remain fatal.

The Revision 1 offline ratchet wording was also narrowed:

- it may fail an audit/test command when persisted canonical contamination grows;
- it is forbidden from production parsers, validators, settlement graphs and
  Reducers;
- it cannot intercept a live model response.

Current status:

- `prd.md`: Revision 2 ready for review;
- `spec.md`: Revision 2 ready for review;
- `tasks.md`: LG-1 through LG-5 pending approval;
- `checklist.md`: Revision 2 implementation gates pending;
- Phase 2: `future_not_approved`;
- Phase 3: `future_not_approved`.

No production code, save, Prompt, UI or runtime behavior changed while
incorporating this correction.

## 2026-08-14 - Revision 2 Approved

The user explicitly approved the five Revision 2 artifacts.

Implementation boundary remains:

- language contract;
- read-only audit;
- offline ratchet;
- focused governance tests;
- technical-debt closeout.

Phase 2 runtime migration/idle localization and Phase 3 structured input remain
`future_not_approved`.

## 2026-08-14 - LG-1 Complete

Created `hogwarts-runtime-contracts/language-boundary.md`.

The living contract:

- defines seven mutually exclusive language classes;
- records current field-group writers/readers;
- separates current behavior from Phase 2 and Phase 3 targets;
- preserves raw Chinese player input as evidence;
- defines non-English model output as non-fatal display evidence;
- forbids the offline audit from production response handling.

No production or data file changed.

## 2026-08-14 - LG-2 Complete

Implemented `scripts/audit-hogwarts-language-boundary.mjs`.

Current Tina read-only result:

```text
unknown paths: 0
canonical_en values: 9566
player_input_evidence values: 1036
model_output_evidence values: 330
static_locale_resource values: 116
dynamic_locale_cache values: 7734
entity_alias values: 329
diagnostic values: 3904

canonical_en_contains_cjk: 432
locale_cache_prompt_visible: 316
locale_cache_rag_visible: 2463
mixed_model_output_contract: 212
```

Prompt evidence:

```text
Low total: 47626
Low model calls: 0
Low network calls: 0
full Prompt measurement: captured
Social target: 80640 / 80000, failed
```

The known Social assertion is bypassed only inside the child measurement
process to collect the remaining metrics; the audit restores it as
`passed=false`. It is not accepted or waived.

Active Tina before/after:

```text
sha256: 412e7756225c6923d63659d195e3fe17157b98d965e7a6f953686ea0ca4b46db
bytes: 7186800
mtime: unchanged
```

No production module imports the audit.

## 2026-08-14 - LG-3 and LG-4 Complete

Created:

```text
.trae/specs/hogwarts-language-structured-input-identity-codes/language-baseline.json
tests/hogwarts-mud-language-governance.test.mjs
```

Verification:

```text
focused tests: 10/10 passed
unknown language paths: 0
ratchet failures: 0
production audit imports: 0
Low model calls: 0
Low network calls: 0
active Tina SHA/bytes/mtime: unchanged
restricted runtime/data diff: empty
```

All recorded Prompt metrics exactly match the Revision 2 baseline:

```text
Scene Performance: 47626
Scene Transition: 76100
Scene Opening: 28319
High Calendar: 14358
Medium Calendar: 36893
Social: 80640
Map Expansion: 39344
Host System Injection: 19319
```

Social remains explicitly failed against its separate 80,000 product target.

## 2026-08-14 - LG-5 Closeout

Technical-debt self-audit:

> This governance change leaves no skipped test, production/runtime hack,
> compatibility layer, save write or Prompt change. Two explicit debts remain:
> the pre-existing Social Prompt exceeds its product target by 640 characters,
> and the audit uses a narrowly scoped child-process assertion bypass solely to
> collect later Prompt metrics before restoring Social as failed.

Registered:

- `HTD-006`: Social Prompt product-target violation;
- `HTD-007`: Prompt measurement collection/acceptance coupling.

Ledger:

```text
change_count: 3
feature_count: 0
core_change: no
reinventory decision: not_required
```

Final status:

- Revision 2 governance is complete;
- Phase 2 runtime migration and idle translation remain `future_not_approved`;
- Phase 3 ordered structured input remains `future_not_approved`.

## 2026-08-14 - Revision 3 Phase 2 Reconnaissance

User requested the Phase 2 PRD:

- English-only internal semantic authority;
- display translations outside world State;
- English commit before localization;
- idle batched translation;
- page open raises priority only;
- non-English model output is non-fatal and not adopted into authority;
- runtime Chinese/English display switch;
- atomic Before/After migration.

Production findings:

- `saveChat()` is chat-only for revision accounting but rewrites the full JSONL;
- the host `/api/chats/save` path atomically replaces the JSONL;
- a new guarded whole-timeline port is required to rewrite State and existing
  messages in one save;
- current `local_translation` is blocking and persists `modelTaskRuntime`;
- current translation mutates both chat extras and world metadata;
- current queue is only a `Map` keyed by message ID;
- no Hogwarts-owned idle scheduler exists;
- `local_translation` already supports protected multi-field markers;
- active local provider limits input to 12,000 characters, while current client
  caps are 3,600 local / 4,700 Google / 900 Bing;
- 16 model tasks are active.

Current Tina migration evidence:

```text
timeline entries: 127
summaryEn sources: 13
ordered publicEventEn sources: 101
closureSummaryEn sources: 13
unresolved timeline entries: 0

CJK Material records: 5
CJK Presentation projections: 2 actors / 3 text slots
assistant messages with CJK in English slots: 4
CJK segments misfiled as textEn: 8
```

The user approved one exception:

> The assistant may provide exact English replacements for the current Tina
> Material/Presentation records. This is a one-time Tina-only exception and
> must not become a generic migration rule.

The exact allowlist and before/after values are recorded in
`phase2-migration-matrix.md`.

## 2026-08-14 - Server Translation Table Decision

An initial draft proposed browser-local IndexedDB/localforage persistence. The
user explicitly rejected it because browser clearing would remove Chinese
translations.

Revision 3 now requires:

```text
authenticated server TranslationTableV1
one table per user + timelineEpoch
durable journal upsert + atomic snapshot compaction
no browser-persistent translation content
no automatic row eviction
```

Server design:

- table under the user's files root;
- filename is a SHA-256 of timeline epoch;
- explicit API contract/version;
- health/query/upsert/retranslate endpoints;
- per-table async mutex;
- checksummed append-only journal;
- atomic materialized-snapshot compaction;
- row key includes source hash;
- hard limits reject only new rows;
- existing translations survive browser clearing, tab changes and device
  changes against the same server user.

## Revision 3 Artifacts

- `prd.md`: Phase 2 product contract;
- `spec.md`: server table, scheduler, migration and task design;
- `tasks.md`: P2-01 through P2-12 pending approval;
- `checklist.md`: Phase 2 gates;
- `phase2-migration-matrix.md`: field-level atomic migration;
- `progress.md`: current evidence and decisions.

Current status:

- Revision 3 was explicitly approved with `/goal 根据PRD进行`;
- no Phase 2 production code has changed;
- no migration or save has run;
- Revision 2 governance files remain in the worktree;
- Phase 3 remains `future_not_approved`.

## 2026-08-14 - Revision 3 Approved

The user explicitly approved the current PRD and requested implementation:

```text
/goal 根据PRD进行
```

Execution started with P2-01. No production edit or migration preceded this
approval.

## 2026-08-14 - P2-01 Complete

Registered the approved target contract without changing runtime behavior:

- Language Authority V1 and TranslationTableV1;
- Calendar V3, Item V4, Material V3, Spellbook V3 and Local Map V2;
- Character V2 and Message Language V1;
- English timeline `summaryEn/sourceRef`;
- idle localization UI fields and ephemeral task ledger.

Baseline verification:

```text
language governance focused tests: 10/10 passed
read-only audit: passed
unknown language paths: 0
ratchet failures: 0
model calls: 0
network calls: 0
Tina stateRevision: 123
Tina SHA-256: 412e7756225c6923d63659d195e3fe17157b98d965e7a6f953686ea0ca4b46db
Tina unchanged: true
Product Registry rows for this change: 1
```

P2-02 is now the only active task.

## 2026-08-14 - P2-02 Complete

Implemented:

- shared Translation API/Table/Record V1 contract;
- authenticated per-user/per-timeline server table;
- SHA-256 timeline directory and row identities;
- materialized snapshot plus checksummed append-only journal;
- per-table async mutex and latest-state merge;
- idempotent upsert, bounded query and explicit retranslation;
- crash-tail recovery and atomic snapshot compaction;
- health/query/upsert/retranslate endpoints;
- client adapter with strict response contract.

Verification:

```text
focused tests: 12/12 passed
target production ESLint: passed
target syntax: passed
diff check: passed
browser-persistent translation storage: absent
world/chat/Knowledge writer import: absent
```

The focused suite covers restart persistence, concurrent-tab merge, idempotent
seed, stale source hash isolation, explicit delete, user-root isolation,
forced append failure, partial crash-tail recovery, compaction and capacity
failure.

Authenticated running-server health remains a P2-11 acceptance gate after the
Node process is restarted. P2-04 is now the only active task.
