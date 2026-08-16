# Phase 2 Identity Research Gate - Independent Report Attempt 1

Date: 2026-08-16

Fresh context: yes. Mode: read-only. No file was changed by the verifier.

## Result

```text
FAIL
```

## Findings

### High - Expected-answer routing bypass

The harness derived:

```text
requestedTasks
Identity target Actor IDs
focal Actor IDs
Item operation hints
```

directly from each case's expected result. The staged runner consumed those
oracle values rather than validating a real routing source, while scoring
ignored post routing.

All 45 retained post calls returned `followUpTasks=[]`, but dynamic work still
ran in 40 cases. Therefore the reported 525/525 did not prove end-to-end
routing.

### Medium - Negative participant false positive

Every `hypothetical_no_change` seed emitted Harry as a direct perception
participant even though the evidence mentioned only Hermione. The guard
checked only that the ID existed, and the score had no expected empty
participant assertion.

### Medium - Premature registry status

The Product Spec row said the Phase 2 Identity research gate passed before the
above routing and negative-outcome gaps were resolved.

## Criterion Results

| Criterion | Result |
| --- | --- |
| End-to-end routing | fail |
| Matrix breadth/seeds | pass |
| Conditional Schema shape | pass |
| Accepted semantic quality | fail |
| Calls/retries/fallbacks | pass |
| Token budget | pass |
| Performance/residency | pass |
| Evidence integrity | pass |
| Zero production change | pass |
| Hardware truthfulness | pass |

## Required Follow-Up

1. Derive routing from independent structured paid/directive/pre-turn signals,
   never from expected answers.
2. Score the derived route.
3. Add explicit negative participant assertions.
4. Regenerate all quality/performance evidence.
5. Correct premature pass status and use a new fresh verifier.
