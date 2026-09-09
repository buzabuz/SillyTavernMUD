# Progress

## 2026-09-08 - Approved L1 Start

- Runtime evidence confirmed that a root-only Custom Endpoint could fetch a
  model list while Chat Completions returned HTML and later appeared as an
  invalid-JSON failure.
- The fixed PM classified the change as L1.
- The user approved an immediate red `/v1` advisory that does not auto-correct
  or block testing/saving.
- Implementation has started. No gameplay State, Prompt, Schema, provider
  routing, retry, or persistence behavior is in scope.

## 2026-09-08 - Implementation And Self-Verification

- Added a localized advisory derived only from the current Source and endpoint
  input. Root-only or malformed Custom values warn; `/v1` and `/v1/` do not.
- The warning uses red text, a restrained red input border, and an `aria-live`
  status. It does not disable test or save.
- Added focused controller, DOM-binding, and style coverage.
- Self-verification passed:
  - 28 focused tests across endpoint warning, provider settings regression,
    and localization table.
  - targeted ESLint, JavaScript syntax checks, and `git diff --check`.
  - rendered zh-CN browser acceptance at 615 x 770.
- Browser evidence: [browser-acceptance.md](./browser-acceptance.md).

## 2026-09-08 - Independent L1 Verification

- One fresh read-only test Agent independently reported PASS for every PRD
  criterion.
- It reran 28 focused tests, targeted ESLint, JavaScript syntax checks, and
  `git diff --check`.
- Browser checks confirmed root-only, `/v1`, `/v1/`, empty, and non-Custom
  behavior; Test and Save remained enabled and no profile was saved.
- No model request, provider change, gameplay State write, migration, or
  fallback was added.
- Technical-debt self-audit: no shortcut, temporary compatibility path, skipped
  required test, or out-of-scope change was introduced.
