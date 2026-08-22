# Checklist

Artifact revision: `2`

Status: `implementation in progress`

## Approval

- [x] Fixed PM initial discovery: PASS.
- [x] User confirmed the narrow business scope.
- [x] Replacement PM full discovery: PASS.
- [x] Production-informed PM follow-up: PASS.
- [x] User explicitly rejects the Revision 1 tuple.
- [x] Replacement PM Revision 2 discovery and production follow-up: PASS.
- [x] User explicitly orders corrected PRD and implementation.

## Contract

- [x] VCON-013 records selected-post independent start without changing semantics.
- [x] VCON-016 records selected-provider current-message dispatch.
- [x] Runtime field review proves timing-only impact.
- [x] Frontend registry owns the existing progress/status sinks.
- [x] No migration or compatibility reader is added.

## Behavior

- [x] English is saved/rendered before translation starts.
- [x] Selected post and selected current translation start independently.
- [ ] Chinese can appear before `state_settled`.
- [x] Low post failure does not stop translation.
- [x] Translation failure does not stop post or hide English.
- [x] Local tasks retain existing FIFO.
- [x] Local/Google/Bing share one current-message path; P1-P4 remain unchanged.

## Calls and Resources

- [x] Exactly one selected post request.
- [x] At most one P0 translation batch.
- [x] Zero retry, repair, provider fallback or semantic Regex fallback.
- [x] At most one local resident model.
- [x] No Prompt/Schema/parser/Reducer change.

## UI

- [x] Translation is not shown active before dispatch.
- [x] Commit phase describes post/State settlement.
- [x] Translation completion triggers targeted Chinese rerender.
- [ ] Desktop and mobile show no overlap or stale loading state.

## Verification

- [x] Focused domain-owned tests pass.
- [x] Affected existing translation/post/turn tests pass.
- [ ] Real-save model-free call/timing instrumentation passes.
- [ ] One real Low + Local translation workflow passes.
- [x] Failure paths preserve paid narrative and State ownership.
- [ ] Fresh independent acceptance passes.
- [ ] Debug probes and root debug notes are removed or moved to linked evidence.
- [ ] Technical-debt ledger and core-change re-inventory decision are recorded.
