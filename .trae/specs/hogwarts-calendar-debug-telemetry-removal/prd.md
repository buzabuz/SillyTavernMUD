# Calendar Debug Telemetry Removal PRD

## Change ID and Status

- Change ID: `hogwarts-calendar-debug-telemetry-removal`
- Status: L1 implemented
- Change kind: fix
- Feature delta: 0
- Core change: no

## Problem and Evidence

Temporary Calendar diagnostics unconditionally issue `fetch()` posts to a local
debug server during both normal and failed Calendar workflows. The diagnosis is
complete, and the user has directed their removal.

## Before

Opening a Calendar Moment or receiving a Calendar workflow error also attempts
to post local telemetry. The post is unrelated to the player's result.

## After

Calendar Moment and Calendar UI behavior, State writes, model calls, and error
handling remain unchanged, but no localhost diagnostic request is attempted.

## In Scope

- Remove temporary localhost Calendar debug reporting from Calendar Moment and
  Calendar UI code.
- Record the paid-model diagnosis rule in the existing project governance
  skill: fully instrument the relevant end-to-end workflow before asking the
  user to perform a diagnostic model invocation.
- Add a focused regression proving Calendar workflow execution does not call
  `fetch()`.

## Non-Goals

- No replacement telemetry endpoint, diagnostics framework, Prompt, provider,
  model call, save, State, Calendar, or UI behavior change.
- Historical diagnostic evidence remains unchanged.

## Acceptance Criteria

1. Calendar Moment and Calendar UI source contain no temporary localhost
   debug URL, reporter function, trace ID, or debug-point call.
2. Provider-free Calendar workflow tests complete with `fetch()` throwing if
   called.
3. The existing governance skill requires complete end-to-end stage
   instrumentation before a user is asked to spend a diagnostic model call.

## Approval

The user explicitly approved this scope on 2026-08-23:

> "删除吧。在skill里记录一下：以后要排查流程，把这条流程的完整环节都插桩好再叫我调模型"
