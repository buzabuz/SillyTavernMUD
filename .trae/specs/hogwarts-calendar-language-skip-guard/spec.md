# Calendar Moment Language-Skip Guard Spec

## Scope

This L1 fix consumes the existing
`sceneTransition.result.languageSkipped` transient result at the shared
Calendar/Timeline Moment boundary.

## Data Flow

```text
Scene Transition model
  -> language adoption returns { languageSkipped, diagnostics }
  -> Calendar/Timeline Moment guard
  -> typed no-commit error
  -> Calendar controller static locale message
```

The guard runs before Scene Opening, archive creation, transition reduction,
and guarded save. It does not persist diagnostics or mutate world State.

## Ownership

| Concern | Owner | Result |
| --- | --- | --- |
| Language mismatch detection | `scene-transition.js` | Existing `languageSkipped` result |
| Moment admission | `calendar-moment.js` | Rejects with a typed no-commit error |
| Player-facing error text | `calendar-controller.js` + `ui-calendar-static.js` | Finite localized message |
| State writers | Existing transition/archive/calendar reducers | Not invoked |

## Verification Design

- Workflow test: both Calendar and Timeline Moment language-skip routes make
  one director call, zero opening calls, zero saves, and leave the source state
  unchanged.
- UI test: the typed error renders the specific static locale message; an
  unrelated error retains the generic message.
- Focused test files: `hogwarts-mud-calendar-moment.test.mjs` and
  `hogwarts-mud-calendar-ui.test.mjs`.
