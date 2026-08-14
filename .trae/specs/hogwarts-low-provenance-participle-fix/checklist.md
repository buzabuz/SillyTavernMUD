# Acceptance Checklist

Artifact revision: 1

## Approval and Scope

- [x] Root cause is reproduced from a fresh blind response.
- [x] Runtime field impact is None.
- [x] Prompt impact is None.
- [x] Frontend impact is None.
- [x] No retry/repair/fallback is proposed.
- [x] Artifact revision 1 is explicitly approved.

## Validator

- [x] Finite past and participles are separate lists.
- [x] Bare participles do not match as historical actions.
- [x] `had|has + participle` still matches.
- [x] Finite past verbs still match.
- [x] Explicit time/recall/quotation patterns are unchanged.
- [x] ACL/source/evidence checks are unchanged.

## Tests

- [x] Current adjective cases pass.
- [x] Finite historical actions fail without provenance.
- [x] Auxiliary participle actions fail without provenance.
- [x] Explicit prior markers fail without provenance.
- [x] Authorized claim-level Event cases still pass.
- [x] Narrator and cross-actor private Event cases still fail.

## Real Flow

- [x] Untouched failed response now passes the production pipeline.
- [x] Prompt hash remains `610e188b...`.
- [x] Archive remains SHA/bytes/mtime identical.
- [x] New context-free agent receives only exact production messages.
- [x] New untouched response passes production.
- [x] Model response count is 1.
- [x] Repair response count is 0.

## Closeout

- [x] Focused/affected tests pass.
- [x] Static checks pass.
- [x] HTD-005 status is updated after the re-inventory decision.
- [x] Test decomposition blind gate is closed.
- [x] Technical-debt questions and ledger rows are complete.
