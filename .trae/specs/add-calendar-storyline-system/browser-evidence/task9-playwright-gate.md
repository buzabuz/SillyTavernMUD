# Task 9 Playwright Gate

- Date: 2026-08-10
- Command: `npm --prefix tests run test:e2e:calendar`
- Local Playwright: `1.56.1`
- Result: `6 passed (3.7s)`
- Process exit code: `0`

## Root Cause

Playwright already supplied a temporary `--user-data-dir` and
`--disable-breakpad`, but macOS Google Chrome still resolved
`Crashpad/settings.dat` through the inherited real `HOME`. Chrome itself exited
with code 0 after the assertions, while the TRAE sandbox rejected those system
Crashpad accesses and changed the outer command result to exit code 1.

The repository gate creates disposable `HOME`, `TMPDIR`, `XDG_CONFIG_HOME`, and
`XDG_CACHE_HOME` directories before invoking the repository-local Playwright
CLI. Chrome's temporary profile and Crashpad lookup therefore remain inside the
disposable test root.

## Isolation

The gate runs only `tests/hogwarts-mud-calendar.e2e.js`. That test builds an
in-memory page with `page.setContent()`, serves extension modules from local
files, blocks every POST request, and persists its Calendar Moment only to a
cloned in-page fixture. It does not read or write a Tina JSONL file and does not
navigate to the existing SillyTavern runtime.
