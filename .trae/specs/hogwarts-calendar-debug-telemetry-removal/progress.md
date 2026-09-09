# Progress

## 2026-08-23 - Approved L1 Removal

- The user directed removal of the temporary Calendar localhost telemetry.
- PM classified the scope as L1: remove Calendar Moment/UI reporting only;
  retain all workflow behavior and historical evidence.
- The user also directed a permanent governance rule: before requesting a
  diagnostic model invocation, instrument the relevant workflow end to end so
  one paid call can identify the failure stage.

## Current Status

- Removed all temporary Calendar Moment and Calendar UI localhost telemetry,
  including trace IDs, debug reporters, and debug-point calls.
- Added a provider-free Calendar workflow regression that makes `fetch()`
  throw if called and asserts zero calls.
- Focused Calendar runtime/UI regression: `16 passed, 0 failed`.
- Lint, syntax checks, `git diff --check`, and telemetry source scan passed.
- The first fresh L1 reviewer found the test stub did not throw; it was
  corrected. The user then stopped the replacement review to keep the
  bounded change from expanding.
- The paid-model diagnosis instrumentation rule is now permanent in the
  project governance skill.
- Implementation complete.
