# Phase 1 Independent Acceptance Report - Attempt 1

Date: 2026-08-16

Fresh context: yes. The verifier received only the project goal, repository
path and authoritative artifact paths from
[`phase1-independent-task.md`](./phase1-independent-task.md).

Mode: read-only. The verifier changed no file.

## Result

```text
FAIL
```

## Findings

### High - Classification is materially incorrect

Seven translation regex rows that infer signature, compartment and shape roles
from free prose were labelled `accepted_lexical`. Direct execution produced
semantic false positives such as:

```text
Compartment H -> ["H"]
A crooked signature left H beside the seal -> ["H", "A"]
She barely H -> ["H"]
```

Conversely, at least fourteen character-shape rows were labelled semantic,
including whitespace splitting and ISO date/identifier normalization.

Therefore the recorded `349/191/38` split and owner totals did not prove the
approved boundary.

Evidence:

- `public/scripts/extensions/hogwarts-mud/adapters/translation.js:61-95`
- `public/scripts/extensions/hogwarts-mud/adapters/translation.js:686-767`
- `public/scripts/extensions/hogwarts-mud/domain/actor-memory-migration.js:152-160`
- `public/scripts/extensions/hogwarts-mud/domain/npc-identity-migration.js:37-113`

### High - The only-decrease gate permits resurrection

The gate checked only whether current semantic IDs were a subset of the
original baseline. If a semantic regex disappeared and was later reintroduced
with the same stable fingerprint, it remained a baseline ID and passed.

This enforced "subset of initial baseline," not monotonic only-decrease over
time.

Evidence:

- `inventory-regex.mjs` regex identity construction
- `inventory-regex.mjs` manifest rebuilding
- `inventory-regex.mjs` original baseline comparison

## Criterion Results

| Criterion | Result |
| --- | --- |
| Responsibility boundary | pass |
| Complete 578-row registry | fail |
| Every semantic owner registered | fail |
| Semantic regex only decreases | fail |
| Zero production behavior/model-call change | pass |
| Phase 2 blocked and unimplemented | pass |
| Phase 3 boundary and non-implementation | pass |
| Mechanical commands | pass as supporting evidence only |
| Final Phase 1 acceptance | fail |

## Required Follow-Up

1. Replace broad file-level classification with reviewed row-level
   classification.
2. Correct semantic false negatives and lexical false positives across the
   complete inventory.
3. Add append-only retirement evidence so a removed semantic fingerprint
   cannot return.
4. Rerun the complete scope with a new fresh independent verifier.
