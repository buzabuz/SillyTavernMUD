# Frontend Dynamic Field Audit

Status: `failed_before_browser_acceptance`

Date: 2026-08-15

Permanent registry:

```text
.trae/skills/hogwarts-change-governance/FRONTEND_DYNAMIC_FIELD_REGISTRY.md
```

## Scope

The source audit starts from every production DOM text writer in:

```text
runtime/save-library.js
ui/app-controller.js
ui/bindings.js
ui/calendar-controller.js
ui/calendar-day-grid.js
ui/calendar-view-model.js
ui/composer-controller.js
ui/inspector-controller.js
ui/item-components.js
ui/map-renderer.js
ui/message-renderer.js
ui/settings-profile-controller.js
ui/setup-controller.js
ui/spell-components.js
ui/story-renderer.js
relationship-graph.js
```

The permanent registry currently contains `196` dynamic field-family rows.
Repeated rows are not samples: browser acceptance must expand each row to every
matching record in the representative Tina save.

## Source Route Result

The registry intentionally remains failed:

```text
STATIC            36
RAW               11
YES               50
YES/STATIC        13
ALLOW             10
PATCH             13
NO                42
NO/STATIC          3
NO/PARTIAL         9
YES/NO             1
other mixed       11
```

`NO`, mixed direct routes and `PATCH` are not accepted. Confirmed direct-reader
failures include:

- People activity, role, life-status detail and intent;
- Scene Transition current name and next intent;
- non-segmented/system assistant messages and raw runtime errors;
- Calendar tags, archived timeline labels, term keys, stable IDs and hidden
  fields incorrectly contributing to a global status;
- Actor identity values, claims, relationship labels/sentiments, Person Schema
  interpretation/expectation and relationship evidence;
- Item owner/holder names, locations and provenance IDs;
- Clue and Status record prose;
- Relationship Constellation names, roles, houses, edge labels, sentiments,
  evidence and text fallback.

The user-reported Calendar public-source value:

```text
Tina's Magical Heritage and Secrets · Year 1: Entering the Magical World
```

was a separate direct Reader. The TranslationTable already contains:

```text
calendar_storyline/storyline_tina_heritage_and_parseltongue/titleEn
  -> 蒂娜的魔法遗产与秘密

calendar_story_beat/beat_tina_y1_autumn/titleEn
  -> 第一年：进入魔法世界
```

The source audit therefore classifies this as a Renderer bypass, not missing
translation data.

## Real Tina And TranslationTable Baseline

```text
Tina stateRevision: 145
Tina SHA-256:
9c2ae4e9a8e9eef449cc0dcee75d3a90b6d761f20efcdbea3af606ff0a2ae243

TranslationTable revision at initial source audit: 31
TranslationTable rows at initial source audit: 1510
TranslationTable SHA-256:
5cc4dcd48bfd193939ff3dcd200f107bdd731092de55e72a5e100cca5ade6b50
```

No browser reload, click, queue insertion or explicit retranslation was
performed by the audit. However, an already-open browser tab continued
dispatching previously queued idle work in the background. Revisions `32..34`
committed before the tab could be moved behind a non-local page:

```text
revision 32: 13 upserts
revision 33: 12 upserts
revision 34: 15 upserts
```

One already-error Actor name became ready and `39` new message-segment rows
were added. The local game tabs were then moved to the background. One in-flight
batch completed as revision 34; no revision 35 appeared across the following
observation window.

Current stable table baseline:

```text
TranslationTable revision: 34
TranslationTable rows: 1549
ready: 1481
error: 68
TranslationTable SHA-256:
6aab504b3863c97df2c4b53625b04d11b9a25b54667a99589fa8e9d19fffddab
```

Tina State/chat bytes remained unchanged.

## Expanded Translation Identity Result

The model-free expansion combines current State candidates with every loadable
chat segment, Author's Quill, Item proposal and Spell proposal:

```text
exact candidate identities: 1514
ready: 489
error: 67
missing: 958
```

Missing:

```text
message_segment: 956
spell_definition: 2
```

The two missing custom Spell rows are:

```text
spell_definition/custom_nebula_verto/nameEn
spell_definition/custom_nebula_verto/effectEn
```

Current exact error rows in the expanded set:

```text
scene_intent: 2
actor_core: 34
actor_runtime: 10
item: 11
local_map_room: 7
calendar_story_beat: 1
calendar_entry: 2
```

At least five rows are `ready` but still violate the Chinese-only outcome or
the protected-incantation contract:

```text
beat_tina_y2_autumn/titleEn -> Year 2: 陈旧的信件
beat_tina_y3_spring/titleEn -> Year 3: 两界之桥
beat_tina_y4_autumn/titleEn -> Year 4: 面对过去
message:187:segment:6/textEn -> contains untranslated "flick"
message:187:segment:8/textEn -> translated Wingardium Leviosa as "翼德升空"
```

Therefore table `ready` is supporting evidence only and cannot define pass.

## Browser Gate

Browser acceptance has not started. Opening the affected screens with the
current implementation can enqueue missing rows and cause TranslationTable
writes. The approved governance requires a Before/After data matrix before
that operation.

Required browser traversal after approval:

1. Expand every permanent registry row.
2. Iterate every Calendar date containing content and open every detail.
3. Load every current and archived message page and inspect every segment and
   header.
4. Open every Map/level, Actor Dossier, Item, Spell, Clue, Status and
   Relationship record.
5. Wait for the idle queue to drain.
6. Record each expanded DOM field as `translated`, `static`, `raw`, `allowed`,
   `pending`, `error`, `fallback` or `visible_id`.
7. Fail unless every field is Chinese or an exact approved raw/allowlisted
   token.

## Proposed TranslationTable Operation Matrix

No operation has been executed.

| Scope | Before | Proposed After | Other stores |
| --- | --- | --- | --- |
| Historical segmented messages | `956` exact rows missing after unapproved background revisions 32..34 | enqueue each exact `message_segment` identity; one provider attempt per scheduler batch; persist `ready` or one dormant `error` | no State/chat/Knowledge write |
| Custom Nebula Verto display | `2` exact `spell_definition` rows missing | enqueue name/effect once; preserve `Nebula Verto` incantation; translate surrounding prose | no State/chat/Knowledge write |
| Existing expanded errors | `67` rows at `error` | explicit delete/requeue once; success becomes `ready`, failure becomes one dormant `error` | no State/chat/Knowledge write |
| Mixed/invalid rows falsely marked ready | at least `5`: three beat titles, one untranslated `flick`, one translated incantation | explicitly invalidate and requeue once; final display must contain no avoidable English and must preserve incantations exactly | no State/chat/Knowledge write |

There is no automatic retry, repair round, provider fallback or second request
for a failed task.
