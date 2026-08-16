# Phase 2 Tasks

Artifact revision: 4

Status: Revision 4 approved; implementation in progress.

Revision 3 was explicitly approved on 2026-08-14. Revision 4 added one exact
Tina message-6 timeline replacement and was explicitly approved on 2026-08-15.

## Completed Evidence

### P2-R0 - Production, save and external research

Status: completed

Evidence:

- Revision 2 language audit and ratchet;
- active Tina State revision 123;
- all current language writers/readers;
- translation/save/scheduler call graph;
- server atomic chat-save path;
- server JSON storage precedent;
- 16 active model-task inventory;
- migration field matrix;
- exact Tina-only Material exception;
- current Prompt baseline;
- server translation-table design replacing the rejected browser cache.

## Implementation Tasks

### P2-01 - Runtime contracts and exact baselines

Status: completed

Depends on: explicit Revision 3 approval

Expected files:

```text
.trae/specs/hogwarts-runtime-contracts/state-fields.md
.trae/specs/hogwarts-runtime-contracts/language-boundary.md
domain language/translation contracts
focused contract tests
```

Work:

- register Language Authority V1, Message Language V1 and TranslationTableV1;
- register Calendar V3, Item V4, Material V3, Spellbook V3, Local Map V2 and
  Character V2;
- record every removed writer/reader;
- freeze Tina Before/After and Prompt baselines.

Verification:

- exact field whitelists;
- no undocumented runtime/frontend field;
- Prompt build-only unchanged before implementation.

### P2-02 - Server TranslationTableV1

Status: completed

Depends on: P2-01

Expected files:

```text
src/hogwarts-mud/localization-table.js
src/endpoints/hogwarts-mud.js
public/scripts/extensions/hogwarts-mud/adapters/localization-table.js
tests/hogwarts-mud-localization-table.test.mjs
```

Work:

- authenticated per-user/per-timeline table;
- hashed file path;
- explicit API contract;
- query/upsert/retranslate;
- per-table mutex and latest-table merge;
- durable checksummed journal append and atomic snapshot compaction;
- hard limits;
- no automatic row eviction.

Verification:

- cross-user isolation;
- path traversal rejection;
- concurrent-tab row merge;
- stale source hash cannot overwrite current row;
- forced write failure preserves table;
- restart + authenticated health.

### P2-03 - Static locale resources and view projection

Status: completed

Depends on: P2-01

Expected files:

```text
public/scripts/extensions/hogwarts-mud/locales/en.js
public/scripts/extensions/hogwarts-mud/locales/zh-cn.js
domain/localized-view-model.js
tests/hogwarts-mud-display-locale.test.mjs
```

Work:

- stable resource keys;
- move static labels from State/catalog/renderers;
- implement `LocalizedViewModelV1`;
- default `zh-CN`, direct English rendering for `en`.

Verification:

- resource-key parity;
- no hardcoded player-facing English outside approved technical settings;
- locale switch changes no world/chat bytes.

### P2-04 - English schemas and non-fatal adoption

Status: completed

Depends on: P2-01

Expected files:

```text
Calendar/Item/Material/Spell/Map/Character/Message contracts
domain/model-language-adoption.js
tests/hogwarts-mud-model-language-adoption.test.mjs
affected Schema tests
```

Work:

- remove bilingual authority fields;
- add canonical English/adoption contracts;
- raw model evidence shape;
- per-task partial/noncanonical outcomes;
- Tina special data table only.

Verification:

- Chinese output alone never throws;
- no repair/retry;
- skipped record does not block independent valid settlement;
- unrelated contract failures still throw.

### P2-05 - Authority-first workflow cutover

Status: completed

Depends on: P2-04

Expected files:

```text
opening/turn/transition/social/interior/calendar workflows
message builder
focused workflow tests
```

Work:

- delete awaited localization from canonical workflows;
- commit English State/message first;
- enqueue display candidates after commit;
- remove translation from atomic generation UI phase;
- remove State/chat locale writers.

Verification:

- translation failure cannot roll back committed world;
- commit makes zero translation calls;
- message/State contains no display translation.

### P2-06 - Idle localization and ephemeral task ledger

Status: completed

Depends on: P2-02, P2-05

Expected files:

```text
runtime/idle-localization-scheduler.js
domain/localization-queue.js
domain/model-task-registry.js
runtime/model-event-scheduler.js
runtime/job-registry.js
tests/hogwarts-mud-idle-localization.test.mjs
affected scheduler harnesses
```

Work:

- P0-P4 queue;
- complete idle/resource gates;
- provider-specific one-request batches;
- `ephemeral_display` model ledger;
- server table upsert;
- manual retranslation only.

Verification:

- concurrency one;
- new action prevents next dispatch;
- in-flight request cannot write State/chat;
- failed batch makes one request and stays dormant;
- scheduler harnesses reach business assertions.

### P2-07 - UI locale and renderer migration

Status: completed

Depends on: P2-03, P2-06

Expected files:

```text
panel.html
ui/session-state.js
UI bindings/controllers/renderers/view models
tests/hogwarts-mud-display-locale.test.mjs
Calendar/Dossier/Archive/message UI tests
```

Work:

- setup/settings locale segmented controls;
- visible pending/error states;
- batch visible-row table queries;
- page-open priority raise;
- static/dynamic locale rendering;
- English fallback.

Verification:

- runtime switch without reload;
- no State/chat save;
- browser clear does not remove server translations;
- mobile/desktop text fit and no overlap.

### P2-08 - Atomic language migration

Status: completed

Approved exception: Tina message `6` contains a Chinese player action inside
`turnTransaction.publicEventEn`, and its `1991-07-24 · 10:00` timeline entry
has no deterministic English summary. Revision 4 proposes one exact guarded
replacement. The replacement is approved; Tina writes remain forbidden until
the complete model-free dry-run and all preflight gates pass.

Depends on: P2-02, P2-04, P2-05

Expected files:

```text
domain/language-authority-migration.js
runtime/guarded-save-ports.js
runtime/lifecycle.js
scripts/dry-run-hogwarts-language-authority-v1.mjs
tests/hogwarts-mud-language-cutover.test.mjs
```

Work:

- whole-State/chat/swipe/retry in-memory migration;
- deterministic timeline reconstruction;
- exact Tina exception;
- idempotent server table seed and complete read-back verification before
  JSONL deletion;
- one guarded atomic JSONL rewrite;
- backup/rollback evidence.

Verification:

- model-free field Before/After;
- idempotent second run;
- forced preflight/save failure leaves bytes unchanged;
- unrelated authority invariants unchanged.

### P2-09 - Prompt and Knowledge subtraction

Status: completed

Depends on: P2-04, P2-05, P2-08

Expected files:

```text
Prompt projectors/builders
Knowledge projector/readers
language audit baseline
prompt measurement artifacts
focused Prompt/Knowledge tests
```

Work:

- remove locale/raw model evidence from every Prompt and Knowledge record;
- bounded Character V2;
- English timeline/Material;
- shrink Social below product target;
- update language ratchet to zero violations.

Verification:

- every Prompt hard target;
- Knowledge English-only assertions;
- no duplicate projection;
- no protected truncation.

### P2-10 - Harness and focused regression migration

Status: completed

Depends on: P2-02 through P2-09

Expected files:

```text
new focused tests
all affected existing focused tests listed in spec.md
current fixtures
```

Work:

- migrate registry/scheduler/composition-root ports;
- replace bilingual stale fixtures;
- remove old translation assertions;
- no compatibility facade.

Verification:

- every affected file runs independently;
- no skip/todo;
- no setup failure before business assertion.

### P2-11 - Blind, real-save and end-to-end acceptance

Status: in_progress

The user approved processing the `43` remaining TranslationTable errors with
an instrumented five-request diagnostic pass, evidence-based remediation and
a five-request post-fix validation pass.

Depends on: P2-10

Expected files:

```text
progress/checklist evidence
blind response hashes/outcomes
real-save migration report
browser screenshots
```

Work:

- fresh blind matrix for all affected tasks/modes;
- one response, zero repair;
- Tina dry-run and real migration;
- server restart and health;
- Knowledge rebuild;
- one real turn;
- idle translation and locale switch UI test.
- close acceptance defects where visible missing message-segment rows never
  enter the idle queue, Canon names bypass the Chinese display catalog, or
  error rows have no working explicit field-level retranslation action.

Deferred TODOs, not part of the current implementation:

- replace regex-based historical-speech classification with an Ollama semantic
  adjudicator;
- define its segment-level output, Prompt budget, one-request scheduling,
  privacy handling and failure policy in a separate approved change before
  implementation;
- do not restore a regex detector or add an Ollama call under P2-11.
- define the Social Prompt growth policy in a separate PRD before changing
  `sceneEvidence` selection;
- that PRD must decide evidence ordering, player/assistant pair integrity,
  Event linkage, cursor advancement, catch-up scheduling, added model-call
  budget, overflow behavior and failure policy;
- Revision 4 must not add a character cap, silently drop Social evidence,
  change batching order or alter cursor behavior merely to satisfy the
  `80,000`-character acceptance target.
- define user-authored protagonist name aliases in a later approved revision;
  the open product decision is whether one alias controls direct UI labels
  only or whether full-name/given-name/family-name variants also bind
  translated narrative;
- until that decision is approved, do not add an alias field, infer an alias,
  migrate the real save, change Prompt projections or partially replace the
  current protagonist-name route under this TODO.

Verification:

- all PRD acceptance criteria;
- source backup and final SHA;
- server translation survives browser storage clear.

### P2-12 - Runtime contract and debt closeout

Status: pending

Depends on: P2-11

Expected files:

```text
prd/spec/tasks/checklist/progress
runtime contracts
TECH_DEBT.md
```

Work:

- final ownership/removal documentation;
- assistant debt self-audit;
- synchronize the existing single change-ledger row to feature/core closeout
  without creating a duplicate Change ID;
- resolve or update HTD-006/HTD-007;
- request required core-change debt reinventory decision.

## Future Phase 3

### ROADMAP-P3 - Ordered structured player input

Status: pending

Authorization: future_not_approved

No Phase 3 code, fields or UI is authorized by Revision 4.
