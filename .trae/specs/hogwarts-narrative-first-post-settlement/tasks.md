# Execution Tasks

Revision 1 approved; implementation in progress. [PRD](./prd.md), [Spec](./spec.md),
[Checklist](./checklist.md), [Progress](./progress.md).

| ID | Task | Dependencies | Status | Expected ownership | Evidence |
| --- | --- | --- | --- | --- | --- |
| NFP-00 | Business discovery, production map, baseline and approval packet | none | completed | These five artifacts, Product Spec registry, proposed living-contract cross-reference | PM PASS; three build-only baselines; 56/56 current-code tests; links/13 criteria checked |
| NFP-01 | Executable field descriptors, one-shot recovery contract and reproducible prompt build-only fixtures | artifact approval | completed | Scene/Post descriptors, pending-post-settlement, model/state/UI registries, focused domain tests | Shared bookkeeping descriptor, Post v2, recovery helpers and production measurement script; five envelopes fit |
| NFP-02 | Scene prose-first admission, message-local speakers and acknowledged preservation | NFP-01 | completed | turn-performance, language adoption, message builder/renderer, turn recovery | Scene preservation, collision isolation, atomic receipt and storage-only recovery implemented; focused checks pass |
| NFP-03 | Unified Post families, initial Low/Local routing, authority/dependency guards | NFP-01 | completed | shared Post descriptor, server parsing, local-semantic adapter, owning domain validators | Unified Post and family-local parsing/guards implemented; independent A04/A05 pass |
| NFP-04 | Shared commit/defaults path, exact Pacing consumption and provenance separation | NFP-02/03 | completed | turn workflow, turn-protocol, turn-validation/reducer, pending owner | Shared integration/defaults/commit path implemented; independent A07/A08 pass |
| NFP-05 | Single combined manual supplementary request and localized selection UI | NFP-04 | completed | existing recovery workflow/wiring, story-renderer, static locales/session, scheduler task declaration | Target-aware one-shot supplement, targetless no-write and localized recovery UI implemented; independent A06 pass |
| NFP-06 | Guarded pending V1 cutover and old-reader/test-contract retirement | NFP-05 | completed | lifecycle/pending owner, test migration manifest, impacted harnesses | V1 revalidation, checkpoint/allowance guards and old ordinary-Scene caller retirement implemented |
| NFP-07 | Focused deterministic self-tests, full-envelope measurements and fresh blind simulation | NFP-06 | completed | focused narrative-preservation/Post-recovery tests and evidence | Stable focused and independent suites pass; all five envelopes fit; full 947 entries retain 11 recorded failures |
| NFP-08 | Controlled real-provider and rendered end-to-end verification within shared 10-call ceiling | NFP-07 | in_progress | disposable representative timeline; existing app and model profiles | Provider verification complete within 10 reservations; isolated renderer 22 states pass; full app/real disk and matching fresh Low evidence unavailable |
| NFP-09 | Fresh independent acceptance, scope self-audit and closeout | NFP-08 | pending | approved artifacts, contracts, Product Spec/debt ledger | Fresh stable-code verdict PARTIAL with no reproduced approved-scope defect; closeout blocked by NFP-08 evidence gaps |

## Harness Migration Inventory

The following existing files construct changed workflow ports or assert old
Scene/Post contracts. Read the exact affected tests before edits; do not bulk
rewrite unrelated tests.

- `tests/hogwarts-mud-task5-workflows.test.mjs`
- `tests/hogwarts-mud-task6-repair-diagnostics.test.mjs`
- `tests/hogwarts-mud-task6-narrative-context.test.mjs`
- `tests/hogwarts-mud-task6-ui-contract.test.mjs`
- `tests/hogwarts-mud-task8-call-budget.test.mjs`
- `tests/hogwarts-mud-authority-first-localization.test.mjs`
- `tests/hogwarts-mud-npc-identity-prompts.test.mjs`
- `tests/hogwarts-mud-medium-calendar-director.test.mjs` (Scene prompt fixture only)
- `tests/hogwarts-mud-turn-protocol.test.mjs`
- `tests/hogwarts-mud-turn-validation.test.mjs`
- `tests/hogwarts-mud-post-provider-selection.test.mjs`
- `tests/hogwarts-mud-post-settlement-safety.test.mjs`
- `tests/hogwarts-mud-post-failure-isolation.test.mjs`
- `tests/hogwarts-mud-save-revision-integration.test.mjs`
- `scripts/dry-run-hogwarts-actor-context-task6.mjs` (build-only caller)

New coverage belongs in focused narrative-preservation and Post-recovery domain
files, not more test cases in historical `taskN` monoliths. Old assertions about
required Scene bookkeeping migrate with their production retirement; do not leave
stale tests or restore legacy writers to satisfy them.

## Work Stages

- Stage 1: approved artifacts and model-free executable contracts.
- Stage 2: Scene preservation + unified initial/supplement/default/commit flow.
- Stage 3: deterministic/blind and actual provider/browser evidence.

The work is L3 because it changes model ownership, persistence and recovery
together. Existing debt and unrelated failing suites are not permission for extra
refactors. Implementation is underway; end-to-end acceptance remains pending.
