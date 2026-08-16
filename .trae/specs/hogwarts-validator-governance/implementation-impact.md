# Revision 4 Implementation Impact

Status: pre-approval production/harness inventory.

## Production Components

### New focused modules

```text
public/scripts/extensions/hogwarts-mud/domain/model-response-evidence.js
public/scripts/extensions/hogwarts-mud/adapters/model-response-ledger.js
public/scripts/extensions/hogwarts-mud/ui/model-response-evidence.js
src/hogwarts-mud/model-response-ledger.js
```

### Shared changed boundaries

```text
public/scripts/extensions/hogwarts-mud/domain/model-task-registry.js
public/scripts/extensions/hogwarts-mud/runtime/model-event-scheduler.js
public/scripts/extensions/hogwarts-mud/adapters/model.js
public/scripts/extensions/hogwarts-mud/workflows/application.js
src/endpoints/hogwarts-mud.js
```

### Paid workflow finalization

```text
ui/setup-controller.js
workflows/opening.js
workflows/high-calendar-director.js
workflows/medium-calendar-director.js
workflows/interior-map.js
workflows/directors.js
workflows/turn-performance.js
workflows/turn.js
workflows/scene-transition.js
workflows/social-memory.js
ui/map-renderer.js
```

### Semantic ownership

Exact changed/deleted owners are the 229 semantic rows in
`regex-classification.json`. Principal modules are:

```text
domain/checks.js
domain/turn-time.js
domain/spatial-foundation.js
domain/movement.js
domain/causal-collapse.js
workflows/medium-calendar-director.js
domain/narrative-authority.js
domain/scene-transition.js
domain/turn-validation.js
domain/turn-protocol.js
adapters/local-semantic.js
presence-witness-contract.js
domain/inventory.js
domain/item-schema.js
domain/item-reducer.js
domain/spell-state.js
domain/spell-proposals.js
domain/actor-memory.js
domain/appearance.js
domain/cast.js
canon-characters.js
relationship-graph.js
domain/initial-world.js
domain/knowledge-retrieval-planner.js
src/hogwarts-mud/local-semantic-adjudicator.js
```

Migration-only semantic modules are changed in the same cutover and never call
a model.

### Frontend and localization

```text
panel.html
style.css
ui/story-renderer.js
ui/message-renderer.js
ui/app-controller.js
locales/ui-game-static.js
locales/ui-setup-static.js
locales/ui-calendar-static.js
locales/ui-inspector-static.js
```

The final renderer set may be smaller if contextual surfaces link to the one
global response panel without adding duplicated receipt renderers.

### Runtime and developer contracts

```text
.trae/specs/hogwarts-runtime-contracts/state-fields.md
.trae/specs/hogwarts-runtime-contracts/spec.md
.trae/skills/hogwarts-change-governance/FRONTEND_DYNAMIC_FIELD_REGISTRY.md
public/scripts/extensions/hogwarts-mud/README.md
HOGWARTS_MUD_PRODUCT_SPEC.md
```

## Existing Harnesses Requiring Port Migration

### Scheduler/model adapter

```text
tests/hogwarts-mud-idle-localization.test.mjs
tests/hogwarts-mud-model-adapter.test.mjs
tests/hogwarts-mud-prompt-payload-consolidation.test.mjs
tests/hogwarts-mud-save-revision-integration.test.mjs
tests/hogwarts-mud-task5-workflows.test.mjs
tests/hogwarts-mud-task8-call-budget.test.mjs
```

### Paid request stubs

```text
tests/hogwarts-mud-high-calendar-director.test.mjs
tests/hogwarts-mud-memory-scene-boundary.test.mjs
tests/hogwarts-mud-pacing-director.test.mjs
tests/hogwarts-mud-prompt-payload-consolidation.test.mjs
tests/hogwarts-mud-scene-chronicle.test.mjs
tests/hogwarts-mud-task5-workflows.test.mjs
tests/hogwarts-mud-task6-narrative-context.test.mjs
tests/hogwarts-mud-task8-call-budget.test.mjs
```

### Workflow factories

```text
tests/hogwarts-mud-authority-first-localization.test.mjs
tests/hogwarts-mud-calendar-moment.test.mjs
tests/hogwarts-mud-calendar-schema-migration.test.mjs
tests/hogwarts-mud-high-calendar-director.test.mjs
tests/hogwarts-mud-medium-calendar-director.test.mjs
tests/hogwarts-mud-memory-scene-boundary.test.mjs
tests/hogwarts-mud-npc-identity-prompts.test.mjs
tests/hogwarts-mud-pacing-director.test.mjs
tests/hogwarts-mud-prompt-payload-consolidation.test.mjs
tests/hogwarts-mud-scene-chronicle.test.mjs
tests/hogwarts-mud-scene-transition.test.mjs
tests/hogwarts-mud-task5-workflows.test.mjs
tests/hogwarts-mud-task6-narrative-context.test.mjs
tests/hogwarts-mud-task6-repair-diagnostics.test.mjs
tests/hogwarts-mud-task6-ui-contract.test.mjs
tests/hogwarts-mud-task8-call-budget.test.mjs
```

### Current UI owners

```text
tests/hogwarts-mud-calendar-ui.test.mjs
tests/hogwarts-mud-people-projection.test.mjs
tests/hogwarts-mud-task1-baseline.test.mjs
tests/hogwarts-mud-task6-ui-contract.test.mjs
```

## New Focused Test Owners

New behavior tests must not be added to the historical task monoliths:

```text
tests/hogwarts-mud-model-response-ledger.test.mjs
tests/hogwarts-mud-model-response-evidence.test.mjs
tests/hogwarts-mud-model-response-ui.test.mjs
tests/hogwarts-mud-regex-governance.test.mjs
tests/hogwarts-mud-semantic-ownership.test.mjs
```

Each existing harness listed above is updated only enough to supply the new
production ports and continue reaching its original business assertion.

## Removal/Retirement Test Contract

Tests asserting semantic regex acceptance/rejection or deterministic semantic
fallback must be updated or deleted in the same owner task. Every deletion or
move receives a row in:

```text
.trae/specs/hogwarts-test-suite-decomposition/test-migration-manifest.md
```

No `skip` or `todo` is permitted.
