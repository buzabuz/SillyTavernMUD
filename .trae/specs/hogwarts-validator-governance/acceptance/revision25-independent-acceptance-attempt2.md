# Revision 25 Independent Acceptance Attempt 2

Status: FAIL

Date: 2026-08-19

A new fresh read-only browser-capable Agent independently found that the
settings controller received no `normalizePostTurnSemanticProvider` dependency
after the normalizer moved out of the context-budget module. It also observed
the English initial Low detail in the Chinese settings page because that
exception interrupted `syncModelSlotControls()`.

The Agent passed the shared descriptor, Low Regex exclusion, exclusive call
policy, no-proposal failure behavior and production fine-tuning exclusion.
It also identified the post language-adoption and helper-facade contract tests
as direct blockers before the implementation agent fixed them.

Follow-up fixes were:

- inject the focused domain normalizer through the UI platform;
- restore Chinese dynamic Low/Local detail rendering;
- filter all canonical Material/Actor English fields during post adoption;
- retain the facade no-growth contract by moving provider constants out of the
  context-budget module rather than growing `helpers.js`.

A new fresh independent Agent is required for the post-fix result.
