# Independent Acceptance Follow-Up

Status: implementation verification remains incomplete. Approved Revision 1
criteria are unchanged.

## First Independent Verdict

Fresh read-only agent `61bb736a-c9e7-45e3-b913-112abaab43d7` evaluated the
approved A01-A13 scope. It had no permission to change requirements or invoke
providers. Verdict: FAIL. Five reproduced findings:

| Finding | Approved criterion | Subsequent implementation / supporting test |
| --- | --- | --- |
| Stale retry catch rebound a receipt to a new world revision | A09 | Receipt fence and catch guard; real-port world-revision race rejects later defaults |
| Supplement replaced accepted Material target value | A05/A06 | Material target/aspect identity; accepted-outfit overwrite regression |
| Older movement migration fabricated a checkpoint and renewed allowance | A09/A13 | Require original checkpoint and route through V1 upgrade; retry count remains spent |
| Message-local declaration could borrow a canonical Actor identity | A10 | Reserved declaration rejection, dialogue identity clearing, bookkeeping collision guard and renderer test |
| Initial storage failure stranded prose with no storage-only action | A09/A11 | Storage-only retry with persisted-base verification; full first-failure workflow plus browser action |

Supporting tests do not retroactively turn that independent verdict into PASS.
Its evidence gaps included disk reload, complete positive/no-change family
coverage and full application acceptance. Local first-pass extraction quality
remains a risk; the approved PRD requires evidenced performance, not an invented
guarantee that every first response is perfect.

## Continued Deterministic Verification

The six-file focused batch on 2026-09-09 passed all 72 entries:

```sh
node --test --test-reporter=dot \
 tests/hogwarts-mud-task5-workflows.test.mjs \
 tests/hogwarts-mud-post-recovery-integration.test.mjs \
 tests/hogwarts-mud-post-recovery.test.mjs \
 tests/hogwarts-mud-post-bookkeeping.test.mjs \
 tests/hogwarts-mud-pending-post-upgrade.test.mjs \
 tests/hogwarts-mud-task8-call-budget.test.mjs
```

The initial-save test uses the real revision guard and guarded save ports with
isolated host persistence callbacks. Initial preservation and the first manual
storage retry both fail. After storage resumes, a second manual storage retry
persists exactly the original prose plus pending receipt. Turn count is unchanged,
no committed transaction exists, allowance remains available, and the only model
stub invocations remain the original Pre and Scene. No real model is invoked.

The recovery integration file passes 11 tests, including persisted-base recovery,
rejection against a higher disk revision and a substantive revision race.
The browser fixture passes 14 recovery and eight speaker states; see
[browser evidence](./browser-recovery.md).

Full batch: 936 entries, 920 pass, 11 fail, five skipped. Failures:

- Canon alias/duplicate registry expectation.
- Real Tina actor-scoped quill retrieval.
- Real Tina read-only language baseline.
- Active real-save prompt hard budgets.
- Calendar/Moment/Memory/Transition locked-Event projection.
- Facade ESM export count (331 versus 333).
- Index import fixture resolves a query string as a filename.
- Dynamic identity/adjudicator dependency cycle.
- Local adapter file-size ratchet (2338 versus 2115).
- Turn workflow 2000-line boundary.
- Lifecycle Event task ledger baseline.

These failures are not waived and have not all been attributed to prior work.
No passing full-suite claim is made. Latest lint has zero errors and five
conditional-in-test warnings in the touched test files.

Subsequent model-free checks: both final Local blind response replays pass with
exact request equality, no rejected families, unchanged source save and prose.
All five production request measurements still fit (Scene 41568, Low 26926,
Low supplement 27119, Local 23837, Local supplement 24523 characters).
Four frontend-registry tests pass; `git diff --check` passes. `utree flush`
completed with exit 0; coverage remains skipped under the original configuration.

Registry source-path validation found two pre-existing missing VCON-020 historical
report links (`phase2-production-identity-blind-report-attempt-2.md` and
`phase2-production-identity-independent-report-attempt-4.md`). No report was
fabricated or unrelated historical document rewritten. The dependency cycle also
exists in HEAD: its dynamic adjudicator import and identity observer reverse
import are both present there. The current change does not claim to repair it.

## Remaining Boundaries

- Storage retry confirms an unchanged disk base. If a write actually succeeded
  but its acknowledgement failed, a higher disk revision is safely rejected;
  idempotent adoption of that durable candidate is not yet established.
- Supplemental additions have family-local count limits; exact failed-record
  identity matching is not yet fully implemented.
- Full application disk reload/composer/history evidence is still required.
- A fresh read-only acceptance agent `d52d1e56-a3f7-4e2c-94e8-f1c346de8ade`
  was given the original goal, approved PRD/Spec/checklist and living contracts,
  with no expected verdict and no permission for model calls, scope edits or real
  save writes. Its verdict is pending.
- Model reservation ledger remains at 10/10. This continuation invokes no model.

## Second Independent Verdict And Fixes

Agent `d52d1e56-a3f7-4e2c-94e8-f1c346de8ade` returned **Not Accepted**.
It independently ran 164 passing test entries, 22 fixture-rendered states and
additional temporary disk/adapter/movement probes without model calls, repository
edits or real-save writes. Its criterion results:

| Criteria | Result |
| --- | --- |
| A01/A02/A03/A07/A08/A10 | PASS at deterministic/disk-fixture/rendered-fixture boundary |
| A05/A06 | FAIL, reproduced defects below |
| A04/A09/A11/A12/A13 | PARTIAL, remaining evidence gaps rather than new defects |

Three reproduced failures and current corrective evidence:

1. A06: a rejected McGonagall update could be replaced by Tina's mother during
   supplement. Failure slots counted records but did not match targets. The parser
   and semantic/bookkeeping rejection paths now retain bounded target descriptors,
   and merge matches each known descriptor before consuming that slot.
2. A05: schema-valid non-English Actor activity disappeared during server language
   adoption without becoming a recovery group, on both Low and Local. Language
   filtering now records the rejected family, index and target; valid progression
   remains accepted.
3. A05: invalid Local Inventory route normalized to false and silently skipped
   assessment. Initial Local now registers incomplete `inventoryUpdates` for
   manual supplement/defaults; it does not dispatch Dynamic automatically.

New tests first failed on the actual defects, then passed after production fixes.
The language test's first fixture mistakenly included an unsupported
`locationKnown` key; removing that key made the test reach language adoption and
reproduce the intended failure. No assertion was weakened.

Current focused eight-file batch: **110/110** passes, covering parser-target
matching plus Low/Local language and semantic target preservation. Lint for all
newly touched production/test files passes. Full regression before the final
two-provider semantic-target test: **941 entries, 925 pass, 11 fail, five skip**,
same failing test names as above. The final Local supplementary blind response
still replays unchanged with exact request equality and no rejected family.

Limits remain: absent/malformed target identities cannot identify a precise
record; family-wide failures necessarily allow bounded unresolved output.
Dynamic-only domain failures and complete per-provider positive/no-change
coverage still need final acceptance. No fresh independent PASS has been obtained
after these fixes.

Final rerun after all target tests: **944 entries, 928 pass, 11 fail, five skip**.
Browser rerun: 14 recovery plus eight speaker states PASS. `git diff --check`,
lint and the required `utree flush` completed successfully. Preview restart was
requested on the same 8004 port to load the changed server parser; no game action
or model request is part of startup.

## Stable-Code Independent Verdict

Fresh read-only agent `a3fee60b-1c73-4c64-abc0-5abcefb7b205` executed against
the stable targetless-record fix and returned **PARTIAL with no reproduced
approved-scope defect**.

- A02-A08 and A10: PASS.
- A01/A09: PARTIAL because no real-disk reload or lost-ack adoption was exercised.
- A11: PARTIAL because the 14 recovery and eight speaker states are isolated
  production-renderer fixtures rather than a full application recovery.
- A12: PARTIAL because model calls are prohibited at the exhausted 10/10 ledger;
  all five current envelopes fit, but current Low hashes lack fresh matching
  model evidence.
- A13: PARTIAL because V1/history fixtures pass but real-disk cutover was not run.

The agent independently verified the targetless-record case: unrelated Actor
substitution was rejected and exact prose remained unchanged. Both
`post_unsettled` and `movement_unsettled` submission probes produced zero saves
and zero workflow calls. Its focused 114/114 and domain 74/74 checks passed.

Final main-agent full batch after the same stable code: **947 tests, 931 passed,
11 failed, five skipped**. Failure names are unchanged from the list above.
