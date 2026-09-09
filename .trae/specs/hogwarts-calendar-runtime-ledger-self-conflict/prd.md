# Calendar Runtime-Ledger Self-Conflict PRD

## Change ID and Status

- Change ID: `hogwarts-calendar-runtime-ledger-self-conflict`
- Status: L2 implementation and acceptance complete; technical-debt reinventory decision pending
- Change kind: fix
- Feature delta: 0
- Core change: yes

## Problem and Evidence

A real Calendar Moment began at State revision `341`. Its Medium Scene
Transition and Low Scene Opening both returned valid results. The common model
scheduler persisted its attempt and success ledger before and after each call,
advancing only `model_task_runtime` through revisions `342` to `345`. The
final Calendar transaction still used the State snapshot from `341`, and
`guardedSaveTransaction()` rejected it as `stale_save`.

The failure occurred after both model calls and after the deterministic Scene
transition had completed. It is neither a cache failure nor invalid model
output.

The prior provider-free Calendar harness did not reproduce this path. It used
an isolated State object and a direct `guard.guardedSave()` stub; it did not
invoke `modelEventScheduler`, proxied `saveMetadata()`, or the real
`guardedSaveTransaction()` against a changing live host State.

## Before

| User workflow | Visible result | State and calls |
| --- | --- | --- |
| Calendar Moment receives valid Medium and Low results | The Calendar reports that the Scene cannot open. | Two existing provider calls complete; four runtime-ledger saves advance the revision; no Scene, clock, Calendar, archive, or opening message commits. |
| Test simulates a Calendar Moment with fixed responses | The test passes. | The harness bypasses scheduler ledger persistence and live guarded transaction observation, so it cannot reproduce the stale save. |
| Another page or workflow writes real world State during a Calendar Moment | Existing conflict handling applies. | Final Calendar commit is blocked. |

## After

| User workflow | Visible result | State and calls |
| --- | --- | --- |
| Calendar Moment receives valid Medium and Low results | The Scene opens normally. | The existing two calls and four runtime-ledger saves occur; one final guarded transaction commits the Scene at the next revision. |
| Provider-free acceptance replays the same workflow | The regression reaches the real Calendar save boundary. | Deterministic responses cause `341 -> 342 -> 343 -> 344 -> 345 -> 346`; no Provider request is made. |
| Another page or workflow writes real world State during a Calendar Moment | Existing conflict handling remains. | The Calendar transaction remains blocked and appends no opening message. |

## In Scope

- The Calendar Moment final guarded transaction when its captured State was
  advanced only by contiguous scheduler `model_task_runtime` metadata saves.
- Preserve the latest live `modelTaskRuntime` and revision history when the
  Calendar commits after such an advance.
- Provider-free Calendar workflow acceptance using the real scheduler-backed
  `scene_transition` and `scene_opening` task routes, real guarded metadata
  saves, and real `guardedSaveTransaction()`.
- A paired negative workflow proving that any intervening world or mixed-domain
  revision remains a strict `stale_save` with no final Calendar write.
- Correct the durable incident record so it no longer claims that the latest
  failure was caused by cache or that persistence conflict was rejected.

## Non-Goals

- No cache behavior, provider selection, model content, Prompt, Schema, parser,
  validation, retry, fallback, or task-call budget change.
- No Calendar schedule, Scene, Clock, archive, or Timeline Moment semantic
  change.
- No State migration or repair of existing saved worlds.
- No broad stale-save bypass: timeline-epoch changes, missing history,
  non-contiguous history, and every business-State revision remain conflicts.
- No frontend copy or UI-session change.

## Runtime Contract Impact

The existing State contract remains authoritative:

- `modelTaskRuntime` is written only by the deterministic model scheduler.
- `stateRevision` and `revisionHistory` are written by the guarded save
  commit.
- A stale boundary may accept an advanced revision only when every intervening
  history entry is contiguous and exactly
  `source/changedDomains=model_task_runtime`.

This change implements and proves that existing contract at Calendar's final
guarded transaction. `scene`, `clock`, `calendar`, `sceneArchive`, and the
opening message remain written only by the existing Calendar transaction.

## Migration and Compatibility

No persisted-State migration, compatibility projection, or archive rewrite is
required. Existing runtime-ledger history is consumed only when it already
meets the contiguous, exclusive metadata rule; all other history remains a
conflict.

## Prompt Field Budget

None. The production Prompt, provider-visible request, task tier, model call
count, and response reserve are unchanged. The provider-free acceptance uses
deterministic in-process responses and performs zero Provider requests.

## Frontend Field Whitelist

None. Existing Calendar workflow error handling remains the renderer and
visible result owner.

## Acceptance Criteria

1. A provider-free Calendar Moment begins at revision `341`, runs scheduler
   backed Medium `scene_transition` and Low `scene_opening`, performs exactly
   four runtime-ledger metadata saves, and commits the final Calendar
   transaction at revision `346`.
2. The accepted `342` through `345` history entries are contiguous and each
   has exactly `source=model_task_runtime` and
   `changedDomains=["model_task_runtime"]`.
3. The final State preserves both task ledger outcomes, appends exactly one
   opening message, and commits Scene, Clock, Calendar, and archive together.
4. The provider-free acceptance observes zero Provider requests, zero retry,
   zero fallback, and only the pre-existing two task invocations.
5. A workflow with any intervening business-State or mixed-domain revision
   fails as `stale_save` and writes neither final Calendar State nor an opening
   message.
6. A missing, non-contiguous, or cross-timeline revision history remains a
   strict conflict.
7. The incident record names the runtime-ledger self-conflict as the root cause
   and explicitly marks cache as not causal for this failure.

## Risks and Rollback

The risk is accidentally accepting a genuine concurrent world change. The
rebase predicate therefore requires a matching timeline epoch and complete,
contiguous metadata-only history; it does not inspect or accept any world
domain.

Rollback removes only the Calendar runtime-ledger rebase. It restores the
former false `stale_save` for this narrow case and does not require data
migration.

## Approval

PM discovery and the production-informed follow-up both returned `PASS` on
2026-08-23. The user explicitly approved the bounded fix and provider-free
regression on 2026-08-23:

> "好的，按这个方案改并补测试"
