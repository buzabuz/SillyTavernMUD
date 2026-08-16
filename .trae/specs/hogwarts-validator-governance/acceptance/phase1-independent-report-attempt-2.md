# Phase 1 Independent Acceptance Report - Attempt 2

Date: 2026-08-16

Fresh context: yes. Mode: read-only. No file was changed by the verifier.

## Result

```text
FAIL
```

## Classification Findings

Eight prose-semantic rows remained incorrectly labelled
`accepted_lexical`:

| Regex ID | Source owner | Consequence | Correct owner |
| --- | --- | --- | --- |
| `regex_6ed98e72666082da163c` | `actor-memory-migration.js:16` | deletes persisted memory by interpreting narrative prose as synthetic | `deterministic_migration_no_model` |
| `regex_75677d9e5ccaf7fcbeff` | `actor-memory.js:99` | classifies relationship-impression prose and changes rejection/normalization | `local_appraisal_1_7b` |
| `regex_14ccc5ffd98e572eb030` | `spatial-foundation.js:100` | treats conjunction words as activity priority and changes inferred room | `local_post_core_1_7b` |
| `regex_6f115f3a12a0e86ad8fa` | `turn-protocol.js:86` | classifies an Event summary as generic and replaces it | `local_post_core_1_7b` |
| `regex_83919ff49b9fb6ae77d9` | `turn-validation.js:206` | rejects paid narrative by interpreting Event-summary specificity | `local_post_core_1_7b` |
| `regex_e1e0099903da8174b1fd` | `initial-world.js:888` | infers backend narrator identity from Actor `nameEn` prose | `local_appraisal_1_7b` |
| `regex_9538de223033b9f44d4d` | `runtime/lifecycle.js:737` | parses map/room IDs from error prose and writes migration State | `deterministic_migration_no_model` |
| `regex_ab81b81b72314f060be6` | `runtime/lifecycle.js:753` | infers a migration from scene-name prose and rewrites persisted names | `deterministic_migration_no_model` |

## Enforcement Findings

### Baseline and retirement files lacked an external anchor

The gate accepted a manifest and baseline whose owner fields were changed
together. Baseline metadata could also be forged because no trusted digest was
checked.

Retirement event metadata could be edited or deleted. Restoring a source row
while deleting its retirement event also passed because no prior ledger
checkpoint was consulted.

### Persisted stale rows escaped validation

Normal verification rebuilt a temporary manifest from current source and a
map of persisted metadata. Stale persisted rows were dropped before
`assertManifest`, so a stale `unclassified` row could escape
`--require-classified`.

## Criterion Results

| Criterion | Result |
| --- | --- |
| Complete registry | fail |
| Fixed ownership | fail |
| Only-decrease gate | fail |
| Zero runtime/model-call change | pass |
| Phase 2 blockers retained | pass |
| Phase 3 boundary retained | pass |
| Final Phase 1 acceptance | fail |

## Required Follow-Up

1. Register all eight rows under their semantic owners.
2. Compare the persisted manifest directly with the AST scan.
3. Anchor the exact baseline and retirement ledger bytes/count in reviewed
   governance code.
4. Exercise tamper, stale-row, unregistered-deletion and resurrection cases.
5. Use another new fresh verifier after correction.
