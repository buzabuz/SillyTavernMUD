# Rollback Action Stuck - Preserved Investigation Record

## Status

- Source: `debug-rollback-action-stuck.md`
- Source date: 2026-08-13
- Evidence status: unverified observation; no runtime log was preserved
- Product status: no fix or behavior change is approved by this record
- Documentation action: preserve here as linked evidence, then remove the
  ungoverned root copy after documentation-governance approval

## Reported Issue

Rolling back the previous turn reportedly left the UI on
`低档正在接管现场` / `读取行动` instead of returning to an interactive state.

## Original Reproduction Draft

1. Open an existing chat.
2. Trigger `回滚上一轮`.
3. Observe whether the busy UI remains after rollback.

Expected behavior: rollback and associated work settle, the busy state clears,
and user input becomes interactive.

## Original Hypotheses

| ID | Hypothesis | Evidence status |
| --- | --- | --- |
| A | Rollback leaves generation or takeover state pending | Not instrumented |
| B | Action-read uses a stale message ID or aborted signal | Not instrumented |
| C | A local semantic request waits without timeout | Not instrumented |
| D | Old and new stream events race | Not instrumented |
| E | An exception bypasses cleanup | Not instrumented |

## 2026-08-14 Documentation Audit

- The root report had no incoming repository reference.
- No `.dbg` log named by the report exists in the tracked evidence.
- `ui/turn-controller.js` has cleared `jobRegistry.turnActive` in `finally`
  since 2026-08-09.
- The report was created on 2026-08-13, after that cleanup existed, so the
  `finally` block does not prove the reported symptom was fixed.
- The report also names `liveSceneStream`, which is separate from
  `jobRegistry.turnActive`; static inspection is insufficient to close the
  issue.

This record is retained only to prevent the unresolved observation from being
silently lost during documentation cleanup. It is not current runtime
authority and cannot justify a code change without a separate approved change
and runtime reproduction evidence.
