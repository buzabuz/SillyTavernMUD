# Revision 25 Independent Acceptance Attempt 4

Status: BLOCKED

Date: 2026-08-19

A fresh browser-capable read-only Agent independently checked the current code,
authority artifacts, focused tests and rendered `8003` settings page. It did
not read earlier acceptance reports or edit repository files, settings, or
timelines.

It passed:

- default `low`, explicit `local`, and old-value normalization;
- rendered Chinese provider selector and steady Low detail;
- extension/timeline persistence contract and focused persistence test;
- shared Prompt/Schema/server settlement;
- Low Regex exclusion;
- exclusive one-call routing;
- no-proposal/no-perception/no-4B failure behavior;
- absence of fine-tuning, retry and repair paths in VCON-013;
- `41/41` direct regression checks.

It blocked complete acceptance because its read-only run did not itself change
the settings selector and reload a real active timeline, call a real Low or
Local provider, or execute the fresh-context blind request. These facts cannot
be inferred from mocks or source inspection. It also noted unrelated global
repository blockers in Scene Transition Prompt budget, Medium locked-event
projection and retry/display behavior; those are outside Revision 25 but keep
the whole repository from a clean all-green closeout.
