# Timeline Compression and Appraisal Lifecycle Tasks

Status values: `pending`, `in_progress`, `blocked`, `completed`.

## Governance

- [x] **CTL-00 - Production reconnaissance and revision 4 artifacts** (`completed`)
  - Dependencies: none
  - Files: `prd.md`, `spec.md`, `tasks.md`, `checklist.md`, `progress.md`, living runtime contracts
  - Result: traced timeline/Event/Gossip/Appraisal/Relationship Evidence writers and readers; scanned 72 real saves; measured four Prompts; specified Event V2 reported claims and reference-only Social Graph V3; revision 4 is approved.
  - Verification: artifact cross-links, real-save read-only SHA/mtime check, Prompt metrics recorded in PRD.

## Implementation

- [x] **CTL-01 - Add strict chronicle, Event V2, Memory V3 and Social V3 contracts** (`completed`)
  - Dependencies: explicit approval of artifact revision 4
  - Expected files: timeline/Event/Actor Context/Social schemas, validators, initial world
  - Work: define `GlobalChronicleV1`, observed/reported Event V2, Actor Event Knowledge V2, Appraisal V2, Memory Reference V3, Relationship Evidence V3 and candidate deletion.
  - Verification: exact union shapes, stable IDs, attributed report rules, authority-only Event links and no duplicated prose/provenance.

- [x] **CTL-02 - Implement atomic no-model migrations** (`completed`)
  - Dependencies: CTL-01
  - Expected files: timeline migration module, `actor-context-cutover.js`, `runtime/lifecycle.js`
  - Work: seed chronicle; migrate 9 Events to observed V2; remove Gossip/Prophet/world-change and causal-rumor paths; migrate Appraisal/Memory/Social versions; retain 13 receipts and drop 92 Evidence details.
  - Verification: Tina counts/edge equality, empty world-change gate, non-empty pack/news/log atomic failure, no synthetic Event/Appraisal, second-run no-op and zero model/network calls.

- [x] **CTL-03 - Make Scene timelines single-write and append-only** (`completed`)
  - Dependencies: CTL-01, CTL-02
  - Expected files: `turn-reducer.js`, `archive-projection.js`, `initial-world.js`, `time-environment.js`, legacy repair paths
  - Work: remove rolling timeline writes and post-commit mutation paths; retain active/archived Scene timeline append behavior.
  - Verification: one detailed entry per committed turn, immutable archive history, repository search finds no production `state.timeline` access.

- [x] **CTL-04 - Add one semantic chronicle entry per successful transition** (`completed`)
  - Dependencies: CTL-01, CTL-03
  - Expected files: `workflows/scene-transition.js`, `domain/scene-transition.js`, `archive-projection.js`, JSON recovery if required by the existing transition contract
  - Work: add/validate the 40-80 word chronicle field; remove Scene Transition `relationshipUpdates` and Event-less Appraisal writes; append chronicle by closed `sceneId`.
  - Verification: medium/high/Calendar Moment/Timeline Moment tests; no transition Appraisal writer; failed transition atomicity; total Prompt no larger than baseline.

- [x] **CTL-05 - Switch bounded timeline/social readers without Prompt growth** (`completed`)
  - Dependencies: CTL-02, CTL-04
  - Expected files: Daily/Social workflows, Actor Event Knowledge, mandatory/Dossier/Knowledge projectors, `ui/app-controller.js`
  - Work: switch Daily to bounded chronicle; Social to candidate ID projections; populate `reported[]`; remove Statement/knownRumors projections, duplicate Knowledge text and raw UI timeline; derive known actors from report roles/subjects.
  - Verification: Daily <=1,400; Social <=220,000; report summary never expands transcript/`aboutEventId`; full report ledger never enters Prompt.

- [x] **CTL-06 - Unify Relationship Evidence and Appraisal consolidation** (`completed`)
  - Dependencies: CTL-01
  - Expected files: Social graph/reducer, `actor-memory-reducer.js`, `workflows/social-memory.js`, Actor Memory/Social validators
  - Work: replace Social Statement extraction with exact message/audience-grounded reported Events and structured claim refs; add permanent speaker/recipient EventRefs and recipient Appraisals; emit relationship receipts.
  - Verification: exact source/audience evidence, direct/audible intersection, player roles, subject known-actor derivation, false/unlinked claims, chains, transcript/`aboutEventId` isolation and stale guard.

- [x] **CTL-07 - Expire Everyday Appraisals at Scene Transition** (`completed`)
  - Dependencies: CTL-01, CTL-04
  - Expected files: `archive-projection.js`, Actor Memory helpers
  - Work: replace remaining Everyday AppraisalRefs with EventRefs when available, clear receipt Appraisal refs, delete only unprotected candidates and preserve existing EventRefs.
  - Verification: successful/failed transition, legacy no-Event deletion, receipt fallback, protected entity and full Actor/Social validation.

- [x] **CTL-08 - Regression and real-save acceptance** (`completed`)
  - Dependencies: CTL-02 through CTL-07
  - Expected files: focused tests and build-only acceptance script
  - Work: run focused suites, lint/checks, Tina model-free migration and four-Prompt report, isolated save-copy reported Event + event-boundary + transition + Knowledge rebuild.
  - Verification: all PRD acceptance criteria and checklist gates; source Tina unchanged during build-only run.

- [x] **CTL-09 - Close contracts and evidence** (`completed`)
  - Dependencies: CTL-08
  - Expected files: living contracts plus these five change artifacts
  - Work: record final writers/readers, exact Prompt deltas, test commands, residual risks and completion state.
  - Verification: no pending required task/checklist item and no stale compatibility path.

## Dependency Order

```text
approval
-> CTL-01
-> CTL-02
-> CTL-03 + CTL-06
-> CTL-04
-> CTL-05 + CTL-07
-> CTL-08
-> CTL-09
```

No implementation task may move to `in_progress` before explicit approval of revision 4.
