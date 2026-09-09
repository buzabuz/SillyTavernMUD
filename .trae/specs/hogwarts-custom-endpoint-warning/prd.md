# Custom Endpoint Warning PRD

## Change ID and Status

- Change ID: `hogwarts-custom-endpoint-warning`
- Status: L1 implemented and verified
- Change kind: fix
- Feature delta: 0
- Core change: no

## Problem and Evidence

The Connection Profile editor accepts a Custom Endpoint that points at a web
site root instead of its OpenAI-compatible API base. The model-list request can
still succeed on a different route, so the profile appears usable. A later
Scene request then receives HTML and surfaces a misleading invalid-JSON error.

The observed example was `https://api.svips.org/`; the compatible API base is
`https://api.svips.org/v1`.

## Before

| Workflow | Visible result | State/result |
| --- | --- | --- |
| User enters a root URL without `/v1` | No field-level warning. | No gameplay State write. |
| Model-list request succeeds | UI reports connected and lists models. | Profile can be saved unchanged. |
| Gameplay later calls Chat Completions | Generic invalid-JSON failure. | Turn does not commit. |

## After

| Workflow | Visible result | State/result |
| --- | --- | --- |
| User enters a Custom Endpoint without `/v1` or `/v1/` | Red inline advisory explains that the API base usually ends in `/v1` and shows an example. | No gameplay State write. |
| User enters a `/v1` base URL | Warning is absent. | Existing test/save behavior is unchanged. |
| User selects a non-Custom source or clears the field | Warning is hidden. | Existing validation remains authoritative. |

## In Scope

- Live advisory validation while typing or editing the Custom Endpoint.
- Immediate warning state when opening an existing misconfigured profile.
- Static localized English and Chinese warning text.
- Focused DOM/controller tests and rendered browser acceptance.

## Non-Goals

- No automatic URL correction.
- No save or test blocking.
- No provider, routing, model-list, Chat Completions, retry, or fallback change.
- No gameplay State, Prompt, Schema, persistence, or migration change.

## Runtime Contract Impact

None. The warning is ephemeral editor UI state derived from the current input.

## Migration and Compatibility

None. Existing Connection Profiles are not rewritten.

## Prompt Field Budget

None. No model request or Prompt changes.

## Frontend Field Whitelist

The endpoint string remains an exact user-entered technical value under
`SETTINGS-002`. The new warning is finite static UI text under `SETTINGS-004`.

## Acceptance Criteria

1. A visible Custom Endpoint such as `https://api.svips.org/` immediately
   renders a red localized advisory.
2. `https://api.svips.org/v1` and `https://api.svips.org/v1/` render no warning.
3. Empty input and non-Custom sources render no suffix warning.
4. Editing an existing root-only profile shows the warning on dialog open.
5. Existing model testing and profile saving remain available and unchanged.
6. No model call or gameplay State write is introduced by validation.

## Risks and Rollback

Some compatible providers use a non-`/v1` base. The warning is advisory rather
than blocking, so those users can continue. Rollback removes the warning
element, locale key, styles, and controller synchronization.

## Approval

The fixed PM classified this bounded settings workflow as L1. The user approved
the advisory `/v1` warning without auto-correction or blocking on 2026-09-08.
