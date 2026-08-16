# Item / NPC Identity / Calendar Readiness Migration Ledger

## Source And Status

- Source path:
  `.trae/specs/hogwarts-runtime-contracts/item-npc-calendar-readiness.md`
- Source lines: 226
- Source SHA-256:
  `aa8a815056f2aa28ce132bf63d5691de984ce0a11fd1e3c171768668ab92de26`
- Source date: 2026-08-09
- Ledger date: 2026-08-14
- Ledger authority: supporting migration evidence only

This ledger accounts for every section of the source before deletion. It does
not make historical suggestions into approved requirements.

Disposition values:

- `current-authority`: the still-valid fact has a maintained current owner.
- `implemented-superseded`: the recommendation was implemented and a newer
  contract replaced the readiness snapshot.
- `historical-snapshot`: the value was true only for the measured 2026-08-09
  save/test baseline and must not be used as current data.
- `unapproved-candidate`: the idea was never an approved active requirement;
  it is retained here so deletion does not erase it.

## Section-Level Reconciliation

| Source lines | Topic | Disposition | Stable destination or evidence |
| ---: | --- | --- | --- |
| 1-13 | Overall readiness decision and order | `implemented-superseded` | Save Revision Guard and Identity are implemented in `add-save-guard-npc-identity`; Calendar V2/V2.1 is implemented in `add-calendar-storyline-system`; current fields are in `hogwarts-runtime-contracts/state-fields.md` |
| 14-35 | 312-test and Tina save counts | `historical-snapshot` | Counts are preserved by this SHA-bound ledger and Git history; they are not copied into the living contract because later migrations, tests, and saves changed them |
| 36-49 | Item V2 maturity scorecard | mixed; detailed below | Current Item V3 behavior is owned by `hogwarts-runtime-contracts/item-lifecycle.md` and `state-fields.md`; unresolved suggestions are listed under Historical Candidates |
| 51-69 | Item product positioning | `current-authority` plus candidates | Formal-versus-implicit Item boundary and narrative significance rules are in `item-lifecycle.md`; quantity, finance, nesting, manufacturing, repair, durability, and shop simulation remain unapproved candidates |
| 70-82 | P0 save revision gate | `implemented-superseded` | `state-fields.md` registers `saveRevisionVersion`, `timelineEpoch`, `stateRevision`, and `revisionHistory[]`; production owners are `domain/save-revision.js`, `runtime/save-revision-guard.js`, and `runtime/guarded-save-ports.js` |
| 84-90 | P1 Item follow-ups | mixed; detailed below | Existing history projection and diagnostics have current owners; non-implemented ideas remain unapproved candidates |
| 92-103 | Identity-ready foundations | `current-authority` | Actor Core/Runtime, Identity, Social, Memory, life, presence, and Dossier ownership are registered in `state-fields.md` and current Actor contracts |
| 104-115 | Pre-Identity gaps | `implemented-superseded` | `actorLibrary[].identity` now owns gender, birth, education, lineage, body, and provenance; current goal/activity remain Runtime; `roleEn` is not education authority |
| 116-139 | Proposed Identity V1 | mixed; detailed below | The approved implementation is `add-save-guard-npc-identity/spec.md` plus current `npc-identity-schema.js`; generic roles/affiliations from the early sketch were not adopted as top-level Identity collections |
| 141-153 | Existing time engine | `current-authority` or retired | Clock/environment behavior remains current; legacy Daily/World Change model paths are retired and registered as such in `state-fields.md` |
| 154-166 | Pre-Calendar gaps | `implemented-superseded` | Calendar V2 provides stable storyline/beat/schedule IDs, clocks, participants, locations, status, UI, migration, and guarded entry; legacy `agenda` and `dailyDirector` have no production writer/reader |
| 168-210 | Calendar V1 vertical slice | mixed; detailed below | Adopted semantics were superseded by Calendar V2/V2.1; recurrence, priority, visibility, interrupt policy, missed/late/deadline mechanics were not adopted and remain unapproved candidates |
| 212-220 | Recommended development sequence | `implemented-superseded` | Save Guard, Identity, Calendar, school-day schedules, and Item/Social boundaries were implemented through their owning changes; montage/weekly settlement/fortune remains unapproved |
| 222-226 | Final readiness verdict | `historical-snapshot` | The one-time gate served its purpose; current readiness is determined by living contracts and active PRDs, not a 2026-08-09 score |

## Item Detail

### Still-Valid Current Facts

| Readiness claim | Current destination |
| --- | --- |
| Formal Item versus implicit narrative prop | `hogwarts-runtime-contracts/item-lifecycle.md`, sections Boundary and Authority Layers |
| Model proposes; Reducer owns `items[]` | `item-lifecycle.md` Ordinary Turn and `state-fields.md` Item rows |
| Owner and holder are orthogonal | `item-lifecycle.md` Operation Invariants and Location Following |
| Destroyed state does not determine physical existence | `item-lifecycle.md` `physicalForm` table and permanent Skill invariant |
| Twelve Item operations | `item-lifecycle.md` Composer Protocol and Operation Invariants; `domain/item-schema.js` |
| High-risk evidence gates | `item-lifecycle.md` Item Evidence Gate |
| Candidate accept/ignore is local and idempotent | `item-lifecycle.md` Player Decision |
| Holder-based movement and transition | `item-lifecycle.md` Location Following |
| Current/history Item grouping | `domain/item-projection.js` and `hogwarts-mud-item-system-v2.test.mjs` |
| Medium/high proposal source values exist without a call entry | `item-lifecycle.md` Authority Layers and `item-system-v2/spec.md` |
| Current Item fields, pending queue, decisions, presentation, and diagnostics | `hogwarts-runtime-contracts/state-fields.md` |

### Superseded Risks

- Online revision/CAS risk was addressed by Save Revision Guard.
- Identity owns body state that the readiness snapshot still treated as a
  future boundary.
- Item V2 was upgraded to Item V3 with explicit `physicalForm`.
- Player-visible current/history grouping exists; the old “no history view”
  statement is no longer current.
- Transition diagnostics are registered in the current field contract.

### Unapproved Historical Candidates

These ideas are preserved but have no implementation authorization:

- atomic `repair` and `replace` Item operations;
- precise quantity inventory;
- nested container ownership/weight;
- a currency or balance ledger;
- manufacturing, durability, material, and shop-stock simulation;
- a model-call entry for medium/high hidden Item proposals;
- dedicated full Item event-history UI beyond current terminal-state grouping;
- explicit multi-month/high-frequency transition and rollback stress campaigns.

If any becomes desired product scope, it requires a new registered PRD. The
presence of an Item type named `container` or `money` does not imply nested
container or financial-ledger semantics.

## NPC Identity Detail

### Implemented Current Contract

- Save Revision Guard is implemented and versioned.
- `actorLibrary[].identity` owns gender, birth, education, lineage, body, and
  provenance.
- Birth precision is exact date, exact year, or unknown; ranges do not create
  false precision.
- Current school year and enrollment are derived from education plus clock.
- Family and interpersonal relations remain outside Identity.
- Current goal, mood, intent, activity, room, presence, and life state remain
  runtime or other-domain authority.
- Canon hydration and Identity migration are deterministic and model-free.
- Identity claims cannot overwrite authority Identity.
- Dossier and Prompt projections are audience/clock scoped.

Stable destinations:

- `.trae/specs/add-save-guard-npc-identity/spec.md`
- `.trae/specs/add-save-guard-npc-identity/tasks.md`
- `.trae/specs/add-save-guard-npc-identity/checklist.md`
- `.trae/specs/hogwarts-runtime-contracts/state-fields.md`
- `public/scripts/extensions/hogwarts-mud/domain/npc-identity-schema.js`
- `public/scripts/extensions/hogwarts-mud/domain/npc-identity-canon.js`

### Early Sketch Not Adopted Verbatim

The readiness sketch proposed generic:

- `identity.kind`;
- `identity.roles[]`;
- `identity.affiliations[]`;
- a standalone `species` Identity field.

The approved implementation instead uses Actor Core/Runtime lifecycle,
education, lineage, body, Canon provenance, performance role, Social claims,
and current-state ownership. These early field shapes are not missing
migrations and are not active requirements. They remain recorded here only as
historical design candidates.

## Calendar Detail

### Implemented Current Contract

Calendar V2 supersedes the V1 sketch with:

```text
storyline -> storyBeat -> schedule -> scene
```

Current authority includes:

- `calendar.version=2`;
- stable `storylines[]`, `storyBeats[]`, and schedule-only `entries[]`;
- exact start/end clocks, participants, map/room, four schedule states, and
  stable Scene links;
- High ownership of storyline/beat and Medium ownership of schedules;
- guarded `timelineEpoch + stateRevision` proposals and atomic Calendar
  Moment/Timeline Moment saves;
- explicit schedule selection rather than inferred attendance;
- V1-to-V2 deterministic migration;
- date/schedule/storyline/history UI and responsive/accessible behavior;
- legacy `agenda` excluded from Prompt, projection, and UI;
- retired `dailyDirector` removed as a writer/reader.

Stable destinations:

- `.trae/specs/add-calendar-storyline-system/spec.md`
- `.trae/specs/add-calendar-storyline-system/tasks.md`
- `.trae/specs/add-calendar-storyline-system/checklist.md`
- `.trae/specs/hogwarts-runtime-contracts/spec.md`
- `.trae/specs/hogwarts-runtime-contracts/state-fields.md`
- `public/scripts/extensions/hogwarts-mud/domain/calendar-schema.js`
- `public/scripts/extensions/hogwarts-mud/domain/calendar-reducer.js`

### Early V1 Features Not Adopted

The readiness sketch named fields or behavior not present in Calendar V2:

- recurrence rules;
- schedule priority;
- per-entry visibility;
- interrupt policy;
- `missed` status;
- generic conflict/late/deadline settlement;
- a persisted Calendar cursor;
- montage simulation, temporary preview branches, fortune, and weekly
  settlement.

They are not missing migrations because no approved Calendar PRD adopted them.
They remain unapproved historical candidates. A future implementation needs a
new registered PRD and must not infer authorization from this ledger.

## Deletion Decision

No current runtime fact, implemented ownership rule, or still-valid approved
requirement remains solely in the 226-line readiness snapshot:

- current facts have maintained destinations;
- completed proposals have implementation and acceptance evidence;
- stale counts are preserved as historical snapshots, not copied as current;
- unimplemented ideas are explicitly retained here as unapproved candidates.

The source topic can therefore be deleted without losing or silently
promoting valid information.
