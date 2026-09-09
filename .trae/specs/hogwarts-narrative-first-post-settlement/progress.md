# Progress

## Current Status

- Date: 2026-09-09
- Revision: 1
- Phase: Revision 1 implementation; independent acceptance failed, corrective verification in progress
- Goal: [PRD](./prd.md); technical contract: [Spec](./spec.md)
- Execution: [Tasks](./tasks.md); acceptance: [Checklist](./checklist.md)
- Actual remote generations: **4**; conservative combined reservation ledger **10 / 10**, no further calls
- Real game save edits: **0**
- Production/test code edits: Scene preservation, Post v2 and recovery integration in progress

## Decisions

1. User requested maximal prose preservation after repeated Scene/Post failures.
2. User explicitly expanded recovery to Scene attached fields AND Post.
3. User approved Scene prose/minimal speaker declaration + one unified Post form,
   rather than two duplicate bookkeeping sources.
4. One player-selected combined supplement; otherwise category-safe defaults;
   never auto-regenerate prose or overwrite accepted results.
5. L3 scope includes model ownership, pending persistence, dependency handling and
   UI recovery. User approved the direction and requested PRD/self-testing; the
   artifact-level implementation gate remains required.
6. Ten user-model invocations are a global test ceiling, including failed requests
   and any extra remote task a test workflow triggers. It is not a target count.

## Discovery and Evidence

- Exact repo root verified. Dirty unrelated work was inspected and preserved.
- Main read governance, PM role, State/model routes and frontend field registry.
- Existing Scene and Post prompts, validators, normalization, recovery and
  guarded commit paths traced.
- Original fixed PM could not be resumed (`finished` response). One replacement
  completed independent business discovery and production-informed review:
  both PASS for drafting, implementation pending artifact approval.
- Replacement output and scope recorded in [PM evidence](./evidence/pm-review.md).
- Model-free production builds on current revision 399 completed with unchanged
  source file and network blocked. See [baseline](./evidence/baseline.md).
- Scope observation: fallback excerpt plus guessed progression cannot stand in
  for verified Event semantics. Target contract preserves excerpt only for display.

## Before Implementation

Approval packet complete:

- Existing focused suites: 56 tests, 56 passed, zero failed/skipped.
- Isolated current-gate reproduction: a nonempty narration still fails solely
  because required `signals.sceneProgression` is absent.
- Seven artifact files, 33 relative links, all 13 acceptance criteria represented
  in checklist, one Product Spec registry row: checked.
- `git diff --check`: passed.
- NFP-00 complete; NFP-01 through NFP-09 pending implementation approval.

These checks prove the baseline and artifact consistency, not the proposed
runtime behavior. No real provider test was spent on the old behavior.

## Implementation Start

Artifact approval received on 2026-09-09. No scope change. Unit-test workflow
preparation completed with existing node:test framework; no new dependencies
needed. TEST_SCOPE is the approved Scene/Post/recovery boundary, not the entire
dirty worktree. Test targets and bug mapping precede generated tests.

## Call Ledger

| Reservation | Task/provider | Purpose | Dispatched? | Outcome |
| --- | --- | --- | --- | --- |
| none | none | Build-only measurement and document preparation | no | Zero real calls |

Every future real remote dispatch must append its reservation before invoking.
Independent agents have no paid-call permission. Stop at ten, even after failures.
Keep raw prompts, responses and credentials out of this ledger.

## Implementation Evidence

- Added narrow narrative-preservation, Post bookkeeping descriptor/guards, and
  recovery grouping/merge modules. Scene generation no longer calls the old
  aggregate settlement endpoint. Main and retry now use one integration routine.
- Post transport version 2 includes migrated fields. Main/Node share bookkeeping
  descriptor; supplement narrows requested output families and never invokes Dynamic.
- Recovery v2 records accepted drafts, failed groups, immutable source fingerprint
  and a durably reserved one-shot attempt. UI selection/defaults integration exists,
  but rendered acceptance is still pending.
- Initial regression run exposed the old Scene admission failure. After replacement,
  all four child cases pass; no assertion weakened to preserve the old defect.
- Focused seven-suite run (Post failure/provider/safety/recovery and task5/task8/
  task6 repair diagnostics): 94 node test entries passed, exit 0. Positive new-speaker
  and actual guarded end-to-end coverage is still being expanded.
- Broader affected harnesses expose existing Memory locked-Event and module-size
  ratchet failures, plus two stale Prompt-content assertions being migrated.
- Reproducible model-free script: `node scripts/measure-hogwarts-narrative-first.mjs`.
  Scene 41,753 chars (baseline 46,168), Low Post 26,939 (20,396),
  Local Post 23,901 (17,358); all-failed supplement Low 27,132 and Local 26,302.
  All fit current capacities; Local output-reserve correctness remains untested.
- Full raw model requests are available only on explicit `--request=<mode>` stdout;
  default script emits sizes/hashes only. No source save mutation or real call.
- Unit test preparation/analysis/generation loop completed for the original
  preservation boundary. Coverage mode skipped (not requested); `utree flush`
  was invoked, later repeated with an outer timeout after interruption.

These are intermediate facts, not full PRD acceptance. No paid-call request has
been reserved or issued.

## Self-Audit

The existing large Turn/adapter files remain; this plan does not authorize
unrelated decomposition. The implementation is not yet acceptance-complete:
V1 candidate revalidation, UI recovery, precise failed-slot selection and complete
dependency coverage remain open. No runtime acceptance is claimed.

## Continued Integration Verification

The real guarded-save integration exposed a production aliasing defect, not a
test-fixture mismatch: constructing a committed message mutated the live pending
message before rollback captured it. Message construction now clones existing
messages; recovery edits clone the persisted receipt; preflight deletion and
pending removal happen only in the guarded commit candidate.

Additional verified changes:

- Before dispatch and commit, recovery checks the currently saved segments,
  not just its transaction copy. Edits during a pending request reject the stale
  result without overwriting the edited message.
- Narrative and initial pending receipt now use one guarded timeline write.
  The initial receipt contains unresolved families so an interrupted initial
  Post can be handled explicitly, without automatic replay.
- Narrative-first turns no longer rewrite already-preserved spell prose.
  Committed messages retain the original message text.
- Initial Local Dynamic transport/record failure enters the corresponding
  recovery family; successful Dynamic records are retained in accepted results.
  No extra Dynamic call was added.
- New speaker admission checks declared public identity and current room.
  Failed admission holds Actor, Inventory, Identity, Material and participant
  references rather than admitting unknown identities. Positive bookkeeping
  tests run the existing transaction validator and Actor/turn reducers.
- Scene promotion policy is read from the actual actionOpportunities array.
  Scene prompts no longer carry the full Actor requiredFields list or instruct
  Scene to emit Item operation fields.

Test evidence:

- `tests/hogwarts-mud-post-recovery-integration.test.mjs`: 8/8 through real
  guarded save ports and reducer. Covers success, duplicate click, recreated
  workflow with reserved allowance, reservation failure, host commit rollback,
  builder purity, and source edits before/during recovery.
- `tests/hogwarts-mud-post-bookkeeping.test.mjs`: 9/9 including positive migrated
  fields, current-room/public-identity checks, private-fact rejection,
  first-impression eligibility, beat ID, same-speaker history and dependencies.
- Ten-file focused batch (these two plus recovery, provider, failure-isolation,
  safety, task5, task6 repair, task8 and narrative preservation): 120 entries,
  exit 0. This is deterministic evidence, not final user-outcome acceptance.
- Broader narrative-context/UI/identity prompt batch now has three remaining
  failures: Memory locked-event projection, turn.js size boundary and index.js
  debt ratchet. The two Scene prompt text failures are gone. These broader
  failures have not been waived or treated as passing.
- Build-only measurement: Scene 41,568 chars (system 22,493; user 19,014;
  wrapper 61), hash
  `e71f2d2b1e2e5c58258df03c9d75707fedb9039e292388677a1bbd77bba47953`.
  Low 26,939; Low supplement 27,132; Local 23,901; Local supplement 26,302.
  All five fit. Source save remains revision 399 and unchanged.

Still required: V1 revalidation and reachable UI cutover; initial-save failure
visible recovery; complete new-Actor dependent projection including Local Dynamic;
exact failed-slot identity bounds; historical annotation idempotence; retirement
of inactive Scene helpers and harness manifest; fresh blind and provider/browser
acceptance; final living-contract/registry reconciliation.

Remote calls remain **0/10**. Preview listener confirmed at `127.0.0.1:8004`;
this is availability evidence only, not new UI acceptance.

## Latest Verification Snapshot

This section supersedes earlier running counts; earlier entries are chronological.

- [Real provider evidence](./evidence/real-provider.md): 10/10 reservations now
  closed, no further requests. Four actual remote generations passed their
  final production validation; one new Scene response feeds the next Low Post
  unchanged and commits on the isolated clone. Local required a grammar-length
  compatibility correction and a 1024 -> 2048 output reserve increase.
  Its complete first response had seven semantic failure families; one manually
  selected supplementary response passed and preserved the accepted results.
  Local first-pass quality is not called a clean pass.
- Five fresh [blind responses](./evidence/blind-simulation.md) passed without
  response edits. Local grammar/budget changed afterward, so final-envelope
  blind evidence for Local remains to be refreshed without real provider calls.
- [Browser evidence](./evidence/browser-recovery.md): 14 recovery states and
  six message-local speaker states pass in isolated real renderers at
  1280x850/390x850. Translation values are fixture rows, not real translation
  jobs. Full app reload/composer/history remains unverified.
- Initial persistence failure now keeps a session-scoped message, labels it
  explicitly not saved, and issues no Post. It is not durable and refreshing
  may lose it. New actions in that timeline remain blocked.
- V1 pending candidates now undergo bounded per-record transaction revalidation.
  Valid records survive; invalid records do not become authority. Existing
  retries spend the new allowance. Legacy rendering projects upgrade eligibility
  without saving/calling models. Discard uses guarded timeline replacement.
- Old ordinary Scene sanitizer/settlement helper and index/application injection
  were retired with exact [migration rows](../hogwarts-test-suite-decomposition/test-migration-manifest.md).
  Opening/transition contracts were not changed.
- Semantic failed-record counts now bound the number of supplemental additions,
  after excluding duplicate accepted records. Exact failed-record identity
  matching remains narrower than the specification and requires acceptance.
- Latest full Node batch: 930 entries, 913 pass, 12 fail, 5 skip. One failure
  was the now-migrated 1024 reserve assertion; it must be rerun. Remaining
  failures include Canon alias, real-save Knowledge/language baselines,
  Dynamic Inventory prompt capacity, Memory locked Event projection, facade
  export baseline, query-string module test resolution, existing dependency
  cycle, file-size ratchets, and lifecycle baseline. Do not call full suite green.
- `utree flush --repo-path ...` completed with exit 0 on the bounded invocation;
  its duration metadata is not an acceptance result.
- Preview backend restarted after source changes; `http://127.0.0.1:8004/`
  responds HTTP200. Primary save remains untouched.
- Fresh independent acceptance agent is running read-only with only the approved
  A01-A13 scope. It cannot change PRD, waive criteria, invoke providers or edit
  saves. Overall task remains implementation/verification in progress.

## Acceptance Failure And Continued Verification

This entry supersedes the preceding running snapshot. See
[acceptance follow-up](./evidence/acceptance-followup.md) for the five findings,
their approved criterion mapping, corrective tests and remaining evidence gaps.

- First independent verdict: FAIL, not PASS. Revision 1 scope is unchanged.
- Corrective focused batch: 72/72 passes across six files. The initial-save
  workflow now tests two storage failures followed by successful storage-only
  recovery through real guarded ports, without another model stub invocation.
- Recovery integration: 11/11 passes, including substantive revision race,
  verified unchanged disk base and rejection of a newer disk revision.
- Browser: 14 recovery plus eight speaker states pass, including storage-only
  button dispatch and restored pending UI. This remains isolated-renderer
  evidence, not a full application/disk reload claim.
- Final Local blind envelopes also passed with two fresh agents; their hashes
  and boundaries are now in [blind evidence](./evidence/blind-simulation.md).
- Full regression: 936 entries, 920 pass, 11 fail, five skip. No waiver and no
  blanket attribution to unrelated changes. The old 1024-reserve assertion no
  longer fails.
- Fresh independent read-only acceptance is underway. Full app/reload evidence,
  exact failed-slot identity and uncertain-write acknowledgement recovery remain
  open. No provider request or real user-save write in this continuation.

## Second Independent Failure

The fresh agent returned Not Accepted: A05 failed on language-filtered Actor
records missing recovery and malformed Local Inventory routing silently skipping
assessment; A06 failed because supplement could substitute an unrelated Actor.
All three map to existing approved criteria, not expanded scope.

Target descriptors now survive shape/language/semantic rejection and gate merge.
Language rejection is selectable on Low and Local. Invalid initial Local routing
creates an incomplete Inventory family without automatic Dynamic dispatch.
Focused regression: 110/110 pass. Latest full batch before the final semantic
target test: 941 entries, 925 pass, 11 fail, five skip. Lint passes.
See [second verdict and fixes](./evidence/acceptance-followup.md#second-independent-verdict-and-fixes).
The implementation remains unaccepted; no additional real model request was made.

## Stable-Code Acceptance Result

A later acceptance run was stopped because an additional targetless-record edge
fix changed production code during verification; its result was not used.
Fresh agent `a3fee60b-1c73-4c64-abc0-5abcefb7b205` then executed on stable code
and found no remaining approved-scope defect. A02-A08 and A10 passed. A01/A09/
A11/A12/A13 remain partial for real-disk/full-app/fresh-model evidence limits,
not reproduced product failures.

Final deterministic evidence:

- related recovery/settlement batch: 111 passes before the final targetless
  test; subsequent focused acceptance ran 114/114 plus 74/74 domain checks;
- full batch: 947 tests, 931 pass, 11 fail, five skip, with the same 11 failure
  names already recorded;
- 14 recovery and eight speaker renderer states pass at 390/1280;
- all five envelopes fit; no real model call and no real-save write;
- lint and `git diff --check` pass.

Overall status remains PARTIAL rather than complete because the approved L3
closeout still lacks real-disk reload/cutover, full-application recovery
acceptance and fresh matching Low model evidence. The 10/10 model ledger forbids
adding the latter call.
