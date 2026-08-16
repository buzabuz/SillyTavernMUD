# Phase 2 Identity Research Gate - Independent Acceptance Attempt 3

## Findings

No blocking findings.

Fresh-context declaration: I started from the supplied attempt-3 task without
parent conversation history or an expected verdict. I read the named
authoritative artifacts and did not read prior acceptance reports.

One important non-blocking observation is visible in both retained evidence
and the independent rerun: raw model output scores `740/800`, while the output
accepted after deterministic guards scores `800/800`. The pass therefore
depends on the reviewed deterministic guards rejecting same-room movement,
spurious participants and invalid event closure, and resolving one malformed
Identity evidence substring through its stable segment index. This is the
designed acceptance boundary, not a claim that raw model output is perfect.

This verdict applies only to the Phase 2 benchmark research gate
`HVG-P2-G1`. It does not approve Phase 2 production implementation, satisfy
fresh blind production-chain acceptance, or establish physical 8 GB support.

## Criterion Evidence

| Criterion | Result | Independent evidence |
| --- | --- | --- |
| Serial candidate architecture | PASS | The candidate executes post core `qwen3:1.7b`, then at most one routed dynamic `qwen3:4b`, followed only for destroy cases by the approved same-model physical-form micro-call. No parallel call is present in the candidate path. |
| Router cannot read expected answers | PASS | AST inspection found zero `expect` references and zero regex operations inside `deriveDynamicRoute()` (harness lines 1605-1717). All three router call sites pass only `input.routingSignals`. All `.expect` references are confined to case declarations, expected-route attachment and `scoreOutput()`. An adversarial probe containing only `expect`, player prose and narrative prose returned an empty route. |
| Structured route inputs | PASS | `ROUTING_SIGNALS_BY_CASE` is separate from `EXPECTED_ROUTES_BY_CASE`. Paid Item operations, paid Spell proposal, paid injury/departure IDs, pre-turn inspection IDs and allowlisted `explicitTasks` are handled deterministically. Supplemental probes confirmed paid, explicit-task and pre-turn routes; invalid explicit task names were ignored. |
| Every route output is scored | PASS | Every run scores exact task membership, Identity targets, inspection targets, focal actors, movement destinations and ordered Inventory hints. That is 6 route checks x 45 runs = 270 passed route assertions. |
| Identity beside Inventory and Spell | PASS | `identity_spell_and_gift` routes exactly `inventory, spell, identity` in one dynamic 4B request and accepts one Harry injury, one Item acquisition and one taught Lumos event for all five seeds. All 15 Identity-routed runs accepted one expected observation; all 30 non-Identity routes accepted zero Identity observations. |
| Forbidden outcomes after guards | PASS | Exact event boundary, Actor-update count, Identity count, Inventory count, Spell count, custom-Spell count, evidence grounding, Actor-ID grounding and physical-form checks all pass. Same-room `absent` updates are removed; event closure without an accepted departure/procedure is reset; ungrounded participant IDs are removed; `no_visible_injury` is restricted to inspection targets. |
| No-change participant negative | PASS | For `hypothetical_no_change`, the expected participant set is independently fixed to `[hermione]`. Raw output was `[harry, hermione, ron]`; accepted output was exactly `[hermione]` in retained evidence and the fresh rerun for seeds 42-46. Route tasks, Actor updates, Identity, Inventory and Spell outputs were all empty. |
| Retained full quality matrix | PASS | 9 cases x 5 seeds (42-46) = 45 chains. Accepted score `800/800`; raw score `740/800`; zero accepted failures; zero parse errors. |
| Independent full quality rerun | PASS | Reran the current harness for the complete `two_stage_dynamic_4b_identity_ctx2048` matrix without replacing retained evidence. Result: 45 chains, accepted `800/800`, raw `740/800`, zero accepted failures and zero parse errors. Average post-chain wall time was 18.597 s in this rerun. |
| Prompt budget | PASS | Retained and rerun maxima agree: 1419 prompt tokens and 1673 prompt+output tokens against the 2048 post/dynamic context. By call ordinal, maximum combined totals were 1212 for post, 1673 for dynamic and 119 for the 1024-context destroy micro-call. |
| Calls, retry and fallback | PASS | Retained and rerun totals are exactly 95 calls: 45 small-model calls and 50 large-model calls. Per seed, the no-route case uses 1 call, ordinary dynamic cases use 2, and the two destroy cases use 3. There are no additional calls, parse errors, retry loops, repair requests or provider/model fallback paths. |
| One-model residency | PASS | Three retained measured worst-case runs each made exactly one 1.7B call then one 4B call. `peakLoadedModels=1`; observed sets are separately `qwen3:1.7b@2048` and `qwen3:4b@2048`, never a combined set. Peak Ollama RSS is 3,040,968,704 bytes and peak loaded model bytes are 2,865,674,321. |
| Evidence and Prompt hashes | PASS | Current evidence file SHA-256 values match the merge report. Retained quality and performance Prompt hashes match each other, and all seven match the fresh current-harness rerun. |
| Research-only scope | PASS | Initial and final worktree status are identical before this report. Named artifact hashes are unchanged. No production, runtime, test, migration or save path changed, and no default `benchmarks/results.json` was created. The rerun output was streamed through `/dev/fd/3`. |
| Physical host and support claim | PASS | `sysctl hw.memsize` and System Profiler report 38,654,705,664 bytes / 36 GB on MacBook Pro Mac15,6. The PRD, Spec, checklist, tasks and report explicitly keep a physical 8 GB run pending and state that the 36 GB measurements are not an 8 GB support claim. |

## Case And Seed Audit

The same raw-failure labels occurred in retained evidence and the independent
rerun for every listed seed. Every accepted failure list is empty.

| Case | Structured route | Raw failures across seeds 42-46 | Accepted result |
| --- | --- | --- | --- |
| `private_note_transfer` | Inventory `give/folded_note` | `eventBoundary` x5; `actorUpdateCount` x5 | `90/90` |
| `departure_visible_injury` | Identity Harry; focal Harry; destination Entrance Hall | none | `95/95` |
| `destroy_with_remains` | Inventory `destroy/tinas_quill` | `actorUpdateCount` x5 | `85/85` |
| `vanish_item_spell_demo` | Inventory destroy + Spell | `actorUpdateCount` x5 | `85/85` |
| `spell_teaching_and_gift` | Inventory acquire + Spell | `actorUpdateCount` x5 | `85/85` |
| `identity_spell_and_gift` | Inventory acquire + Spell + Identity Harry | `actorUpdateCount` x5; `allEvidenceGrounded` x5 | `90/90` |
| `hypothetical_no_change` | no dynamic task | `perceptionParticipants` x5; `actorUpdateCount` x5 | `90/90` |
| `failed_secret_custom_spell` | Spell | `eventBoundary` x5; `actorUpdateCount` x5 | `90/90` |
| `explicit_no_visible_injury` | Identity Ron; inspection Ron | `actorUpdateCount` x5 | `90/90` |

Totals: raw `740/800`; accepted `800/800`.

## Hash Evidence

Current file SHA-256:

```text
dca595910281a803dc2d3f464d3475be819c07a234505a9da155fcd8923bdfb5  benchmarks/ollama-validator-benchmark.mjs
1698f51142213f3a4a5896e0e52a6207d73bcc74e9a9308f4a0b8e7204ded7dc  benchmarks/quality-dynamic-identity-final.json
30372395d5f18554b16263d2a8a7ead68ed40524cd2dd82bf22e6a260902d109  benchmarks/performance-dynamic-identity-final.json
```

Current harness Prompt SHA-256, equal in retained quality, retained
performance and the independent rerun:

```text
post        f6e6a4a4f2eea0645724d5f61da065edb6651adb2b9d9cb4ae6d20556aaee499
postCore    cd40f661ca7266f15b97f8917e710d61e9b85d4ce03f5327aa79c49d79faee78
inventory   46e8937ed49358cf205a874c884e397f317c2bb467b847bbf349c22d9e7c70c8
spell       b01a6ce46e05a855a918500fdf2cdbc9ba62c96bafd524bbed992f064b5265ab
identity    e3a17d7327a20f2d8f27936cb90be5c297a142de2f58b362269c74712263288b
dynamicAll  5b27a61079d76459f9d6a82c9ac422c37894fc9d3db5ae0aff4eec17d8edb94d
merged      f2deb0efe4a9b1a753cf92b319d0b6e576717af8d986bc0ece4568f25b2648bd
```

## Verification Commands

Key read-only verification included:

```text
node --check benchmarks/ollama-validator-benchmark.mjs
jq ... benchmarks/quality-dynamic-identity-final.json
jq ... benchmarks/performance-dynamic-identity-final.json
BENCHMARK_FILTER=two_stage_dynamic_4b_identity_ctx2048 \
  node benchmarks/ollama-validator-benchmark.mjs \
  --suite quality --rounds 5 --output /dev/fd/3
shasum -a 256 <authoritative artifacts and retained evidence>
sysctl -n hw.memsize
system_profiler SPHardwareDataType
git status --short --untracked-files=all
git diff --name-only -- <production/runtime/test/save roots>
```

Paths in the command excerpt are relative to
`.trae/specs/hogwarts-validator-governance/` where applicable.

## Final Verdict

**PASS - Phase 2 Identity benchmark research gate accepted.**

Production implementation, blind production-chain acceptance, explicit Phase
2 approval and physical 8 GB validation remain pending and are not covered by
this pass.
