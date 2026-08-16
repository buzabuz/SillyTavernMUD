# Phase 1 Independent Acceptance Report - Attempt 3

Date: 2026-08-16

Fresh context: yes. Mode: read-only. No file was changed by the verifier.

## Result

```text
FAIL
```

## Passed Criteria

- Current complete registry contents passed:
  - 578 unique rows across 107 files;
  - zero source-identity differences;
  - source fingerprint
    `6927d5e1ba93d5ae6114741adc181da818fb0206beae0861d87f4457e21836a5`;
  - category split `356/195/26/1/0`.
- All 221 semantic rows had nonblank owners and actions; owner totals
  reconciled.
- Zero production, test, save, model-call or network change passed.
- Phase 2 blockers and Phase 3 non-implementation passed.
- Product registry and governed artifact status passed.

## Blocking Findings

### Persisted row identity was not compared completely

`assertManifest` compared only ordered regex IDs. Copies with forged:

```text
file
line
owner
pattern
source
occurrence
rowCount
sourceFingerprint
```

passed the gate.

### Lexical and rationale history was mutable

The semantic baseline protected semantic category/owner/action only.

- An `accepted_lexical` row could be changed to `dead_or_retired` with a
  different owner.
- A semantic row's rationale could be rewritten.

Both passed because the full manifest bytes were not anchored.

## Criterion Results

| Criterion | Result |
| --- | --- |
| Complete current registry | pass |
| Current semantic ownership | pass |
| Only-decrease/history enforcement | fail |
| Zero runtime/model-call change | pass |
| Phase 2 blockers retained | pass |
| Phase 3 boundary retained | pass |
| Artifact status | pass |
| Final Phase 1 acceptance | fail |

## Required Follow-Up

1. Compare every persisted source identity field and top-level manifest
   metadata against the AST scan.
2. Anchor the complete manifest bytes so lexical category/owner and semantic
   rationale changes require a visible reviewed anchor update.
3. Add adversarial self-tests for each metadata field and full manifest
   mutation.
4. Use another new fresh verifier after correction.
