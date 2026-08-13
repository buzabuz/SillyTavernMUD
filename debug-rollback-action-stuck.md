# Debug Session: rollback-action-stuck
- **Status**: [OPEN]
- **Issue**: Rolling back the previous turn leaves the UI stuck on "低档正在接管现场" and "读取行动" instead of completing the rollback and returning to an interactive state.
- **Debug Server**: Pending startup
- **Log File**: .dbg/trae-debug-log-rollback-action-stuck.ndjson

## Reproduction Steps
1. Open an existing chat.
2. Trigger "回滚上一轮".
3. Observe that the UI remains on "低档正在接管现场" and "读取行动".

## Expected Behavior
The rollback and any associated action-read operation should settle, clear the busy state, and return control to the user.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Expected Signal |
|----|------------|------------|--------|-----------------|
| A | Rollback leaves the generation or takeover state pending | High | Low | Rollback finishes while the busy state remains true and no matching clear transition occurs |
| B | The action-read request uses a stale message ID or aborted signal | High | Low | Request starts with an ID absent after rollback, or its signal is already aborted |
| C | A local semantic sidecar request waits indefinitely without a timeout | Medium | Medium | A sidecar request starts but emits neither success nor failure |
| D | Old and new stream events race and a stale event restores the pending UI | Medium | Medium | Interleaved trace IDs update the same UI state out of order |
| E | An exception is swallowed before cleanup executes | Medium | Low | An error path appears without the expected operation-exit or state-clear event |

## Instrumentation Plan
Pending code-path discovery. Instrumentation will cover rollback entry/exit, action-read request lifecycle, busy-state transitions, stream identity, and error/finally paths.

## Log Evidence
Pending.

## Verification Conclusion
Pending pre-fix and post-fix comparison.
