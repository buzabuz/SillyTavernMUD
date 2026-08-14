# Technical Spec

Artifact revision: 2

Status: implemented and verified. The separate Low provenance robustness fix
passed replay and fresh blind validation.

Change ID: `hogwarts-test-suite-decomposition`

## Authority

Test disposition follows this order:

```text
latest user decision
-> approved Prompt/lifecycle/Social PRDs
-> living runtime contracts
-> current production callers, validators and reducers
-> current focused tests
-> monolith fixture and assertions
```

The monolith is evidence of historical behavior, not runtime authority.

Runtime field impact: None.

Prompt impact: None.

Frontend impact: None.

## Source Inventory

```text
tests/hogwarts-mud.test.mjs
lines: 19,203
tests: 204
helpers.js imports: 173
missing facade exports: 7
top-level fixture functions: 10
skip/todo tests: 0
```

Disposition:

```text
177 move
24 delete
3 strip retired assertions and move
```

Topic inventory:

| Topic | Source tests |
| --- | ---: |
| Prompt / JSON recovery | 7 |
| Translation | 11 |
| Actor knowledge / RAG | 1 |
| Preset/import | 6 |
| Character/campaign/opening | 6 |
| Movement/spatial | 30 |
| Scene context/material/appearance | 10 |
| Embedding | 1 |
| Turn settlement | 3 |
| Scene Transition core | 16 |
| World Change/Gossip | 3 |
| Scene Transition reducer/authority | 7 |
| Pacing/cast/canon | 24 |
| Opening bootstrap | 1 |
| Foundation | 1 |
| Foundation-coupled turn | 1 |
| Turn rollback/recovery | 6 |
| Actor memory/event boundary | 7 |
| Social | 22 |
| Memory consolidation | 1 |
| Time/calendar | 5 |
| Checks/spells/performance | 18 |
| Scene time/presence | 3 |
| Context/model budget | 3 |
| Map/cartography | 11 |

## Decomposition Flow

```text
frozen 204-test manifest
  -> retirement proof
  -> delete-only rows
  -> current fixture primitives
  -> topic-by-topic moves
  -> mixed assertion rewrites
  -> update structural goldens
  -> delete monolith
  -> per-file/full/static/real-flow verification
  -> finalize manifest
```

The monolith is deleted last.

## Manifest

Supporting authority:

```text
.trae/specs/hogwarts-test-suite-decomposition/test-migration-manifest.md
```

Every original test has one row:

```text
source_line
source_title
topic
action = move|delete|mixed
destination
retired_assertion
retirement_authority
replacement_coverage
fixture_owner
status
```

Rules:

- exactly 204 unique source titles/lines;
- `move` requires a destination file;
- `delete` forbids a destination and requires retirement authority plus
  no-caller evidence;
- `mixed` requires destination and exact retired assertion text;
- the final summary must derive to `177/24/3`;
- renamed tests preserve the original title in a `source_title` column;
- deleted behavior is not replaced with a test-only implementation.

The final file also contains a file-level summary:

```text
destination
moved test count
new line count
direct production imports
fixture imports
verification command/result
```

## Retirement Set

Delete behavior tests for:

```text
director_foundation
Low impressionOfPlayerEn/memoryUpdate writer
free-text World Change/Gossip
temporal legacy repair with no caller
Scene Transition relationshipUpdates writer
legacy relationship-copy migration
Social Graph V2 migration
old LangGraph Social V2 reducer
```

The mixed deterministic time-policy test remains under
`hogwarts-mud-time-calendar.test.mjs`; only its retired Daily-plan-current
assertions are removed.

Keep retirement-accounting tests in
`hogwarts-mud-prompt-payload-consolidation.test.mjs`; they prove the four
retired model tasks are registered as history and absent from runtime.

Update `hogwarts-mud-task4-boundaries.test.mjs` so `world-changes.js` is not
treated as an active facade/module-boundary owner. This is a test inventory
change only; the production orphan module is not restored or modified here.

## Destination Design

### New files

| File | Ownership |
| --- | --- |
| `hogwarts-mud-json-recovery.test.mjs` | complete/truncated structured JSON recovery |
| `hogwarts-mud-translation.test.mjs` | translation batching, glossary and provider normalization |
| `hogwarts-mud-preset-import.test.mjs` | preset size/type/sanitization/regex imports |
| `hogwarts-mud-movement-spatial.test.mjs` | movement directives, pathing, actor/player spatial reconciliation |
| `hogwarts-mud-material-state.test.mjs` | material event schema, reduction, appearance projection |
| `hogwarts-mud-turn-protocol.test.mjs` | narrative settlement, fold and LangGraph/local parity |
| `hogwarts-mud-scene-transition.test.mjs` | transition normalization, destination, archive and actor authority |
| `hogwarts-mud-pacing-cast.test.mjs` | causal Pacing, cast selection and Canon admission |
| `hogwarts-mud-turn-recovery.test.mjs` | rollback checkpoints and unsettled-turn replay |
| `hogwarts-mud-relationship-graph.test.mjs` | relationship projection and Cytoscape UI behavior |
| `hogwarts-mud-spell-action-check.test.mjs` | checks, spell observation, learning and validation |
| `hogwarts-mud-map-cartography.test.mjs` | map proposals, local packs, runtime mutations and interiors |

### Existing files

Append only cohesive, bounded groups:

| Existing file | Accepted ownership |
| --- | --- |
| `hogwarts-mud-knowledge-v2.test.mjs` | Actor knowledge/RAG record behavior |
| `hogwarts-mud-prompt-payload-consolidation.test.mjs` | Opening World/bootstrap and retirement accounting |
| `hogwarts-mud-memory-scene-boundary.test.mjs` | active Event/Appraisal/Memory boundary behavior |
| `hogwarts-mud-social-v3.test.mjs` | current Social V3 reducer behavior |
| `hogwarts-mud-calendar-reducer-projection.test.mjs` | clock and Calendar settlement |
| `hogwarts-mud-presence-contract.test.mjs` | sightline/presence actor constraints |
| `hogwarts-mud-task8-call-budget.test.mjs` | context/role budget behavior |

If an existing file would exceed the new-file hard limit or mix ownership, use
a domain-named new file instead.

## Fixture Architecture

Do not extract `createSceneTransitionState()` as-is.

Create one bounded current base-fixture module:

```text
tests/hogwarts-mud-test-fixtures.mjs
```

Allowed exports:

```text
createCurrentCharacter()
createCurrentActorProposal()
createCurrentPlayingState()
createCurrentScene()
createCurrentMap()
```

The base is composed through current production constructors/normalizers and
contains current version fields only.

Topic files own their deltas:

```text
movement file   -> route and companion state
transition file -> next Scene and actor-state proposal
material file   -> material event log/current presentation
spell file      -> spellbook/check evidence
calendar file   -> current Calendar V2 entries/story beats
social file     -> Social V3 records
```

Forbidden fixture fields:

```text
directorFoundation
dailyDirector
timeline
worldChanges
relationshipUpdates
gossipPacks
worldNews
worldChangeLog
legacy Social V2 statements/evidence copies
Low impressionOfPlayerEn
Low memoryUpdate
```

Fixture limits:

- shared fixture module: soft 600, hard `<1,000` lines;
- new test file: soft 1,200, hard `<2,000` lines;
- no fixture may contain expected reducer output or model answer;
- no new/moved test imports `helpers.js`.

## Mixed Tests

### Compact transition

Keep compact transition normalization and validator assertions. Remove only
the stale `worldChanges` shape assertion.

### Calendar jump

Keep `nextClock`, Scene start and Calendar status assertions. Remove news,
gossip and world-change-log assertions.

### Memory consolidation

Keep AppraisalRef/MemoryRef promotion and boundary consumption. Remove old
Social V2 `statements` assertions.

The manifest records each removed assertion.

## Structural Golden Update

`tests/hogwarts-mud-task1-baseline.test.mjs` currently reads the monolith and
checks six titles. Update each entry to the real destination file:

```text
Social migration/current reducer golden -> Social V3 owner
LangGraph/local settlement parity       -> turn-protocol owner
Scene transition archive commit         -> scene-transition owner
Social audience projection              -> Social/relationship owner
Mandatory scene compactness             -> narrative context/authority owner
System English output contract           -> Prompt/translation owner
```

No compatibility copy of the old monolith path is permitted.

## Test Discovery

The documented command remains:

```bash
node --experimental-vm-modules --test tests/hogwarts-mud*.test.mjs
```

All new files match the glob. No `package.json`, Jest or Playwright runner
change is needed.

Per-file migration uses:

```bash
node --experimental-vm-modules --test tests/<destination>
```

## Technical Debt Ledger Design

Create:

```text
.trae/specs/TECH_DEBT.md
```

Header:

```yaml
schema_version: 1
counting_since: <date and baseline commit>
change_count: <derived integer>
feature_count: <derived integer>
last_reinventory_feature_count: <integer>
```

Debt row:

```text
id | status | severity | area | summary | evidence |
introduced_by | owner_change | review_trigger | last_reviewed
```

Change row:

```text
seq | change_id | kind | feature_delta | core_change |
completion_debt_answer | debt_delta | review_prompted |
user_decision | closed_at
```

Allowed values:

```text
kind: feature|fix|refactor|governance
feature_delta: 0|1
core_change: yes|no
review_prompted: yes|no
user_decision: reinventory|defer|not_required
debt status: open|accepted|resolved|superseded
```

Counting begins at ledger introduction. Do not infer historical totals.

Only verified current debt enters the ledger. Old unchecked checklist text is a
candidate requiring current evidence.

## Governance Skill Changes

Add a permanent Test Ownership Gate:

- smallest focused owner first;
- no generic monolith/catch-all;
- direct production-module imports;
- test relocation manifest for decomposition;
- retired behavior may be deleted only with approved retirement and no caller;
- never restore retired code for a test.

Add a permanent Technical Debt Closeout Gate:

- classify every change;
- append one ledger row;
- ask the standardized debt question;
- register debt or explicit `无`;
- for core change, report feature count and ask re-inventory;
- record user decision before completion.

Gate 8 remains the model-behavior authority and is strengthened to say
synthetic output cannot replace a fresh context-free agent running the exact
production request.

## Verification

### Static

```text
monolith path absent
204 manifest rows
177/24/3 summary
no duplicate source row
all move/mixed destinations exist
all delete rows have retirement evidence
no monolith reference
no helpers.js import in new/moved files
no forbidden fixture field
no retired symbol restored to helpers/index/application
new file and fixture line limits pass
production source diff empty
```

### Deterministic tests

1. Run each destination independently after its batch moves.
2. Run Task1/Task2/Task4 architecture tests.
3. Run all affected focused suites.
4. Run the full Hogwarts Node glob.
5. Run Hogwarts test ESLint and `git diff --check`.

Unrelated pre-existing failures are recorded in `TECH_DEBT.md`; they are not
hidden by skip, fallback, restored export or altered production behavior.

### Real-save no-change

Record Tina SHA/bytes/mtime before and after. No save API or migration runs.

Rebuild the same production Low request used by the current Knowledge
acceptance and prove the Prompt hash is unchanged.

### Blind flow

Launch a fresh context-free sub-agent with only the unchanged exact production
Low request. Accept one response only. Run the untouched response through the
real parser, LangGraph settlement, authority/provenance validators and
transaction validator. Assert one model call and zero repair calls.

This validates that moving tests did not silently alter the real path; it does
not authorize any Prompt change.

## Rollback

Revert the decomposition commit:

- restore monolith;
- remove destination files created by this change;
- restore moved tests in existing owners;
- restore pre-change Task1/Task4 test inventories;
- revert Skill/TECH_DEBT entries created by this change.

No runtime, archive, Knowledge or Qdrant rollback exists.

## Files

Governance:

```text
.trae/specs/hogwarts-test-suite-decomposition/*
.trae/specs/TECH_DEBT.md
.trae/skills/hogwarts-change-governance/SKILL.md
```

Tests:

```text
tests/hogwarts-mud.test.mjs                         delete last
tests/hogwarts-mud-test-fixtures.mjs               add
tests/hogwarts-mud-<domain>.test.mjs               add/update
tests/hogwarts-mud-task1-baseline.test.mjs         update goldens
tests/hogwarts-mud-task4-boundaries.test.mjs       remove retired module ownership
```

Production:

```text
None
```
