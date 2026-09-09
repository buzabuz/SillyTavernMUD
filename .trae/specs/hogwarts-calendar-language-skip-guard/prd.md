# Calendar Moment Language-Skip Guard PRD

## Change ID and Status

- Change ID: `hogwarts-calendar-language-skip-guard`
- Status: L1 implemented and verified
- Change kind: fix
- Feature delta: 0
- Core change: no

## Problem and Evidence

When a Calendar Moment Scene Transition response contains non-English
authority fields, `generateSceneTransitionPackage()` returns its established
`languageSkipped` result without a `nextScene`. The ordinary Scene Transition
path stops at that result, but Calendar Moment continues into Scene Opening
and dereferences the missing package. The Calendar UI then shows only the
generic "The Scene could not be opened." message.

## Before

| Workflow | Player-visible outcome | State outcome |
| --- | --- | --- |
| Planned Calendar entry has a language-skipped transition package | Generic scene-open error. | No successful transition, but the failure is misclassified after an invalid Scene Opening attempt. |
| Free Timeline Moment has the same package result | Generic scene-open error. | No successful transition, but the failure is misclassified after an invalid Scene Opening attempt. |

Each route already makes one Scene Transition model request. No retry, fallback,
or State repair is intended.

## After

| Workflow | Player-visible outcome | State outcome |
| --- | --- | --- |
| Planned Calendar entry has a language-skipped transition package | A localized message explains that the Scene director returned non-English structured content and the Scene was not entered. | Scene, clock, Calendar, archive, and chat remain unchanged. |
| Free Timeline Moment has the same package result | The same localized message and no-entry outcome. | Scene, clock, Calendar, archive, and chat remain unchanged. |

## In Scope

- Stop the shared Calendar/Timeline Moment workflow immediately when it receives
  the established `sceneTransition.result.languageSkipped` result.
- Surface this known failure through a static Calendar locale key.
- Preserve the existing one-request, no-retry, no-fallback behavior.
- Document the transient result route and VCON-008 failure behavior.
- Add focused workflow and Calendar UI regressions.

## Non-Goals

- No model Profile, provider, tier, Prompt, output Schema, parser, or
  language-adoption-policy change.
- No Calendar entry, map, Actor, or save-data repair.
- No State migration, persistence write, automatic retry, fallback, or
  model-generated recovery prose.
- No change to ordinary Scene Transition behavior outside the shared Moment
  entry guard.

## Runtime Contract Impact

`sceneTransition.result.languageSkipped` remains a transient no-State result.
Calendar/Timeline Moment now consumes it before Scene Opening. The existing
`session.calendarMomentError` UI-session field displays a finite static locale
message; it does not expose raw model errors or write world State.

## Migration and Compatibility

No migration. Existing saves and Calendar records are unchanged. The guard
affects only future failed Moment attempts.

## Prompt Field Budget

None. The existing Scene Transition and Scene Opening requests are unchanged.
The language-skipped route issues no Scene Opening request.

## Frontend Field Whitelist

Existing `session.calendarMomentError` only. It remains a static Calendar
runtime-error route under `CAL-036`; no new dynamic DOM value is introduced.

## Acceptance Criteria

1. A planned Calendar Moment receiving `{ languageSkipped: true }` rejects
   before Scene Opening, archive creation, message creation, or save.
2. The identical shared Timeline Moment route has the same no-write behavior.
3. The Calendar UI shows the localized language-skip message rather than the
   generic open failure for this typed error.
4. Other model and persistence failures keep the existing generic Calendar
   runtime-error treatment.
5. No route adds a model request, retry, provider fallback, or State write.

## Risks and Rollback

The guard relies on the existing `languageSkipped` result shape. If it is
unexpectedly returned from another package producer, the conservative outcome
is still correct: do not open or persist a Scene without `nextScene`.
Rollback removes the typed guard and locale key without touching saved State.

## Approval

The fixed PM classified this as L1 on 2026-08-22. The user's instruction
"1-不管它，这个符合预期。2-修一下" explicitly approves this bounded guard and
rejects model-configuration changes.
