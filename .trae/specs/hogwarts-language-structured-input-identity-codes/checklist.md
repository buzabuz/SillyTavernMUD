# Phase 2 Checklist

Artifact revision: 4

Status: Revision 4 approved; implementation in progress.

## Approval and Scope

- [x] Revision 2 governance is complete.
- [x] User approved one English semantic authority.
- [x] User approved authority-first, idle localization.
- [x] User approved non-fatal language mismatch.
- [x] User approved the Tina-only Material exception.
- [x] User rejected browser-persistent translation storage.
- [x] Revision 3 uses a persistent authenticated server translation table.
- [x] Phase 3 structured input remains out of scope.
- [x] User explicitly approves Revision 3 implementation.
- [x] User explicitly approves the Revision 4 message-6 timeline replacement.

## Product Contract

- [x] PRD declares `kind=feature`, `feature_delta=1`, `core_change=true`.
- [x] Before/After behavior is observable.
- [x] Server translation-table ownership is explicit.
- [x] Display locale and model/system language are independent.
- [x] One-request/no-repair failure policy is explicit.
- [x] Approved Material/Presentation exception is exact and non-generalizable.
- [x] Message-6 timeline exception is explicitly approved.
- [x] Unknown old-save semantics have explicit failure behavior.
- [x] No long-term dual-read/dual-write/fallback is allowed.

## Runtime Contracts

- [x] `languageAuthorityVersion=1` registered.
- [x] Translation API/Table V1 registered.
- [x] Calendar V3 registered.
- [x] Item V4 registered.
- [x] Material V3 registered.
- [x] Spellbook V3 registered.
- [x] Local Map V2 registered.
- [x] Character V2 registered.
- [x] Message Language V1 registered.
- [x] Timeline `summaryEn/sourceRef` registered.
- [x] Every old writer/reader has a removal target.

## Server Translation Table

- [x] Table lives under authenticated user files root.
- [x] Filename derives from a hash, not raw timeline input.
- [x] Explicit API contract checked on every operation.
- [x] Health/query/upsert/retranslate endpoints are bounded.
- [x] Per-table mutex serializes journal/snapshot mutation.
- [x] Upsert reads latest table and merges rows.
- [x] Checksummed journal append is durable before success returns.
- [x] Atomic snapshot compaction preserves replay correctness across crashes.
- [x] Concurrent tabs cannot overwrite unrelated rows.
- [x] Source hash prevents stale response overwrite.
- [x] Existing rows are never automatically evicted.
- [x] Hard limit rejects only new writes.
- [x] Cross-user queries are impossible.
- [x] Translation rows never enter Prompt/Knowledge/State/chat.

## Static and Dynamic Locale UI

- [x] English/Chinese resource keys have parity.
- [x] `zh-CN` is default.
- [x] Locale switches without reload.
- [x] `en` invokes no translation.
- [x] Clearing browser storage does not remove server translations.
- [x] Provider selector remains independent.
- [x] Missing/error rows show English fallback.
- [x] Page opening only raises queue priority.
- [x] UI locale action writes no State/chat.
- [x] Mobile/desktop UI contains no incoherent overlap.

## Idle Scheduler

- [x] P0-P4 priority order is implemented.
- [x] Every Director/Performer/Observer/save gate is checked.
- [x] Document visibility and idle slice are checked.
- [x] Concurrency is exactly one.
- [x] One batch equals one provider request.
- [x] Local/Google/Bing source caps are enforced.
- [x] Marker order/count is validated.
- [x] New player action prevents the next batch.
- [x] In-flight completion can only upsert server rows.
- [x] Failure produces zero retry/repair/fallback calls.
- [x] Error row remains dormant until explicit action/source-version change.

## Registry and Scheduler

- [x] `local_translation` uses `idle_display`.
- [x] `blocking=false`.
- [x] `ledgerScope=ephemeral_display`.
- [x] Translation does not mutate `modelTaskRuntime`.
- [x] Other model tasks retain world-ledger behavior.
- [x] All composition-root/harness ports migrate.

## English Authority and Adoption

- [x] English semantic contracts reject Han at adoption only.
- [x] Language mismatch alone never throws.
- [x] Non-English raw text remains player-visible.
- [x] Raw text is not named `textEn/sourceEn`.
- [x] Raw text is excluded from Prompt/Knowledge.
- [x] Optional non-English fields are omitted.
- [x] Records missing required English text are skipped.
- [x] Independent valid settlement continues.
- [x] Non-language contract failures remain fatal.
- [x] No language diagnostic is sent back to a model.
- [x] `local_translation` target-locale output is exempt.

## Workflow Decoupling

- [x] Turn commits before localization.
- [x] Opening commits before localization.
- [x] Scene Transition commits before localization.
- [x] Calendar commits before localization.
- [x] Social/Appraisal commits before localization.
- [x] Interior/Map commits before localization.
- [x] Translation controller writes no State/chat.
- [x] Loading rail no longer blocks on translation.
- [x] Candidate emission cannot fail committed authority.

## Migration

- [x] Full field-level matrix exists.
- [x] Tina timeline coverage is 127/127 with the approved exact message-6
  replacement.
- [x] Five Material records and two Presentations have exact replacements.
- [x] Dry-run reports every field transition.
- [x] State/chat/swipes/retry migrate in memory.
- [x] Whole-timeline port calls host save once.
- [x] Host atomic replacement is proven by the guarded save boundary.
- [x] Failed preflight/save preserves SHA/bytes/mtime.
- [x] Second migration run is byte-idempotent.
- [x] Every migratable existing translation is seeded and query-verified before
  JSONL deletion.
- [x] Seed failure leaves JSONL unchanged.
- [x] Partial seed rows are idempotently reusable.
- [x] Item existence/custody/location is unchanged.
- [x] Actor life status is unchanged.
- [x] Calendar/Map/Actor/Item/Spell IDs are unchanged.
- [x] Event/Appraisal/Social refs and ACL are unchanged.
- [x] Unknown legacy CJK blocks without generic repair.
- [x] Tina exception guard rejects any before-string mismatch.

## Prompt Budget

- [x] Current Tina totals are recorded.
- [x] Runtime ceiling derives from active configuration.
- [x] Per-Prompt hard targets are explicit.
- [x] All locale/raw evidence is absent from Prompt.
- [x] No new semantic projection is added.
- [x] Scene Performance is `<=47,626`.
- [ ] Active r146 Scene Transition is `76,531 > 76,100`; HTD-009 records the
  unresolved blocker without approving a trimming algorithm.
- [x] Scene Opening is `<=28,319`.
- [x] High Calendar is `<=14,358`.
- [x] Medium Calendar is `<=36,893`.
- [ ] Active Social is `82,386 > 80,000`; HTD-006 records the unresolved
  blocker and does not authorize evidence or cursor changes in Revision 4.
- [x] Map Expansion is `<=39,344`.
- [x] Host System is `<=19,319`.
- [x] Local translation is `<=20,000`.
- [x] Protected sections are untrimmed.
- [x] Duplicate semantic sources are removed.

## Knowledge

- [x] Assistant transcript indexes accepted English segments only.
- [x] Player raw input remains attributed player evidence.
- [x] Raw non-English model output is excluded.
- [x] State records project English canonical fields only.
- [x] Translation-table imports are absent from Knowledge modules.
- [x] Real backend rebuild and canonical hydration pass.
- [x] Node restart and authenticated health pass if server changes.

## Tests and Harnesses

- [x] New focused test files stay below 2,000 lines.
- [x] Shared fixtures stay below 1,000 lines.
- [x] No retired monolith receives tests.
- [x] No stale bilingual fixture is copied.
- [x] Every affected focused test runs independently.
- [x] Scheduler/registry harnesses reach business assertions.
- [x] No untracked skip/todo or compatibility restoration.
- [x] Canonical manifest records each current test/production retirement,
  replacement owner, authority, no-caller evidence and final result.
- [x] README and active production/test sources contain no dangling path or
  symbol reference to the current retired artifacts.
- [x] Post-Pacing-correction full glob is `737` tests: `734` pass, the same
  three registered business blockers, `0` skip and `0` todo.
- [x] Maintained production/Hogwarts test ESLint scope has `0` errors; the
  remaining `63` Playwright findings are warnings.
- [x] Regex historical-prose Validator is removed; the approved future Ollama
  semantic adjudicator remains an explicit out-of-scope TODO.
- [x] Language audit violations reach zero.
- [x] Forced table/save failures reach rollback assertions.
- [ ] Remove the `7777/7778` translation debug POST probes and untracked
  `.dbg` session files after fresh browser confirmation and before closeout
  (`HTD-012`).

## Frontend Dynamic Field Registry

- [x] Permanent registry exists at
  `.trae/skills/hogwarts-change-governance/FRONTEND_DYNAMIC_FIELD_REGISTRY.md`.
- [x] Source audit starts from every production DOM text writer, including
  Relationship Constellation and Save Library readers outside `ui/`.
- [x] The registry contains `197` stable dynamic field-family rows, including
  the user-approved raw English world-Prompt source in Settings.
- [x] Current failed route evidence is linked from
  `browser-evidence/frontend-dynamic-field-audit.md`.
- [ ] Every `NO`, mixed direct route and `PATCH` row is resolved.
- [ ] Every repeated row is expanded to every real Tina record.
- [ ] Every Calendar date containing content and every detail is inspected.
- [ ] Every current/historical message, header, proposal and Author's Quill is
  inspected.
- [ ] Every Map/level/room, Actor Dossier, Item, Spell, Clue, Status and
  Relationship record is inspected.
- [ ] Idle drain leaves zero visible `pending`, `error`, fallback or avoidable
  English fields.

## Blind and End-to-End Acceptance

- [x] First independent project-goal acceptance is preserved as explicit
  `FAIL` evidence:
  `independent-evidence/p2-11-independent-acceptance-r146-fail.md`.
- [ ] A different fresh independent Agent reruns the complete acceptance scope
  after all approved remediation and reports `PASS`.
- [x] Every affected active task/mode has a fresh context-free agent.
- [x] Agents see exact production requests only.
- [x] Every case returns one response.
- [x] Every case records zero repair/retry/fallback.
- [x] Untouched responses traverse production boundaries.
- [x] Deliberately Chinese output proves non-fatal adoption.
- [x] Tina dry-run passes before real save.
- [x] Real Tina migration passes.
- [x] One real turn commits before translation.
- [x] Server translation survives browser storage clearing.
- [ ] Idle queue and locale switching pass the complete dynamic-field registry
  browser expansion. Earlier partial browser evidence was invalidated by
  visible English and permanent error/pending states.

## Closeout

- [ ] All P2 tasks complete.
- [x] Runtime contracts match implementation.
- [x] Assistant debt self-audit is reported.
- [x] The single existing change-ledger row is synchronized to
  `kind=feature`, `feature_delta=1`, `core_change=yes`.
- [x] `change_count/feature_count` derive from ledger.
- [x] HTD-006/HTD-007 are resolved or updated with evidence.
- [x] User required and received the core-change technical-debt reinventory.
- [x] Phase 3 remains unapproved.
