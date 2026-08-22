# Checklist

## Approval

- [x] Fixed PM initial discovery passed.
- [x] PM production-informed recheck passed.
- [x] User confirmed Post failure recovery: preserve narration and permit only
  manual Post-only retry.
- [x] Current production writer, reader, recovery, and prompt paths mapped.
- [x] User approved `prd.md`, `spec.md`, `tasks.md`, and this checklist.

## Contract

- [x] `VCON-007`, `VCON-012`, and `VCON-013` updated before production edits.
- [x] Runtime field registry names one writer for every changed field.
- [x] `MovementPreflightV2` cannot write map, Scene, spatial, clock, Presence,
  Item location, or final outcome.
- [x] Post candidate is evidence-bound to saved paid segments and preflight.
- [x] Movement Reducer is the sole writer of the position bundle.
- [x] No direct/reload/retry code path can write player movement.
- [x] No ordinary prose can trigger this capability.

## Failure and Recovery

- [ ] Post provider/schema/evidence failure preserves the paid Scene.
- [ ] Failure writes no transaction, movement/time State, Knowledge, archive,
  or Prompt authority.
- [ ] Composer remains locked for `movement_unsettled`.
- [ ] Manual retry sends one Post request only.
- [ ] Manual retry never calls the paid Scene model, Pre, retrieval, or a
  fallback provider.
- [x] Reload does not call a model or move the player.
- [ ] Stale, invalid, or duplicate manual retry writes no State.

## Prompt and Calls

- [x] Follow-only Pre movement branch and `movementIntent` are removed.
- [x] Low Scene receives preflight instead of pre-committed outcome.
- [x] Post structural budget remains within its configured 4,096-token limit; full representative measurement is blocked by an unrelated Inventory input failure.
- [ ] Representative archive stays byte-identical during measurement.
- [ ] Normal triggered turn: existing Pre policy, one paid Scene request, one
  selected Post request, no added movement model call.
- [ ] Each manual retry is explicit, Post-only, and one request.
- [ ] No automatic retry, repair, provider fallback, or semantic Regex
  fallback is reachable.

## Test and Acceptance

- [x] Domain-owned `hogwarts-mud-post-settled-player-movement.test.mjs` passes.
- [x] Legacy movement, validation, spatial, recovery, and workflow regressions
  pass after exact assertion migration.
- [x] Test migration manifest records every retired old-semantics assertion.
- [ ] Context-free blind Pre/Low/Post simulations pass with one untouched
  response each.
- [ ] Browser acceptance verifies preserved narration, localized recovery card,
  composer lock, and Post-only retry.
- [ ] Fresh independent acceptance passes every PRD criterion.

## Closeout

- [ ] Runtime field contract, VCON registry, frontend registry, and PRD
  registry reflect production behavior.
- [ ] Technical-debt ledger and core-change re-inventory decision recorded.
- [ ] `progress.md` records commands, evidence, residual risk, and date.
