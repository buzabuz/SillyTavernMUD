# Ollama Concurrency And Merge Report

Status: research proposal; no production implementation.

## Plain-Language Result

Do not run post + Inventory + Spell in parallel, and do not merge all three
into one 1.7B request.

Use one serial model slot:

```text
post core 1.7B
-> optional one 4B dynamic follow-up
-> optional tiny destroy-form classification on the same resident 4B
-> deterministic guards/Reducers
```

The 4B follow-up Schema contains only the requested sections among Inventory,
Spell and Identity. It is not called on ordinary turns.

## Machine And Models

Measured machine:

```text
MacBook Pro Mac15,6
Apple M3 Pro, 12 cores
36 GB unified memory
Ollama 0.32.6
```

Models:

| Model | Parameters | Quantization | Disk |
| --- | ---: | --- | ---: |
| `qwen3:1.7b` | 2.03B | Q4_K_M | 1.4 GB |
| `qwen3:4b` | 4.02B | Q4_K_M | 2.5 GB |

All performance runs used isolated Ollama servers. Peak memory is measured
Ollama process RSS and `/api/ps` model size, not estimated parameter memory.

## Parallel And Merge Data

Complex Item + Spell turn, three runs:

| Strategy | Wall time | Peak RSS | Quality result |
| --- | ---: | ---: | ---: |
| three serial 1.7B calls | 9.58 s | 2.09 GB | 52.5% suite |
| three parallel 1.7B calls | 7.07 s | 3.09 GB | 52.5% suite |
| three serial 4B calls | 17.55 s | 3.37 GB | 63.4% suite |
| three parallel 4B calls | 12.99 s | 4.64 GB | 63.4% suite |
| all-three parallel, mixed models, one loaded-model slot | 10.24 s | 4.61 GB | 55.4% suite |
| all-three parallel, mixed models, two loaded-model slots | 8.70 s | 7.58 GB | 55.4% suite |
| one merged 1.7B call | 11.43 s | 2.10 GB | 39.6% suite |
| one merged 4B call | 17.05 s | 3.37 GB | 73.3% suite |

Key observations:

- Same-model parallelism is real when `OLLAMA_NUM_PARALLEL > 1`, but each
  request slows while sharing compute. Three 1.7B calls save 2.51 seconds and
  add about 1.00 GB.
- Mixed-model "parallelism" with one model slot is mostly swap contention.
  Total load time reached 8.28 seconds.
- Allowing both models to stay loaded makes mixed parallelism real but raises
  peak to 7.58 GB. An 8 GB laptop cannot safely leave enough memory for the OS,
  browser and SillyTavern.
- A giant merged 1.7B request is both slower and less accurate. Its single
  response generated 720 output tokens versus 486 across three focused calls.
- A giant merged 4B request is more accurate than split 4B, but still slow and
  did not pass all cases.

## Which Calls Can Actually Run Together

`post` must run before optional follow-ups if it is the router. Therefore
starting post + Inventory + Spell together either:

- runs Inventory/Spell unnecessarily on every turn; or
- requires a different structured router.

Only Inventory and Spell can legally run together after routing.

Realistic post-then-follow-up result:

| Strategy | Wall time | Peak RSS |
| --- | ---: | ---: |
| post 1.7B -> Inventory 4B -> Spell 1.7B | 11.80 s | 3.36 GB |
| post -> same-1.7B follow-ups parallel | 8.08 s | 2.58 GB |
| post -> mixed follow-ups "parallel", one model slot | 11.45 s | 3.98 GB |
| post -> mixed follow-ups parallel, two model slots | 10.37 s | 6.43 GB |

Two-slot mixed parallelism saves only 1.43 seconds over serial while adding
about 3.07 GB. It is rejected for the low-memory target.

## Proposed Runtime

### Common turn

```text
existing pre-turn 1.7B
existing post core 1.7B
no 4B follow-up
```

Local semantic call count remains two.

### Item, Spell Or Identity turn

```text
pre-turn 1.7B
post core 1.7B
one 4B dynamic follow-up
```

The follow-up route comes from structured paid-model proposals, explicit
directives and pre-turn structured inspection/check signals. It does not come
from a prose regex or the overloaded post model.

Dynamic Schema:

```text
Inventory only -> Inventory Schema
Spell only     -> Spell Schema
Identity only  -> Identity Schema
multiple       -> one merged Schema containing only requested sections
none           -> no 4B call
```

### Destroy turn

After the 4B follow-up proposes `operation=destroy`, the same resident 4B runs
one 1024-context binary `remains|absent` classification.

Measured over five seeds and two evidence cases:

| Model | Correct | Cold average |
| --- | ---: | ---: |
| 1.7B | 10/10 | 0.88 s |
| 4B | 10/10 | 1.51 s |

The 4B load portion was 0.91 seconds. Reusing the already loaded 4B therefore
adds about 0.6 seconds without increasing peak model memory.

## Candidate Performance

Complex Item + Spell candidate, three cold runs:

```text
average: 10.44 s
peak RSS: 3.06 GB
peak loaded models: 1
context: 2048
```

Reducing context from 4096 to 2048 reduced peak by about 300 MB. It did not
change the tested quality result.

Final benchmark-only Identity + Item + Spell candidate, three runs:

```text
average: 22.76 s
range: 20.67-23.99 s
peak RSS: 3.04 GB
peak model bytes: 2.87 GB
peak loaded models: 1
post/dynamic context: 2048
accepted checks: 100%
```

The additional worst-case Identity section raises this synthetic complex-turn
latency by 12.32 seconds over the earlier Item + Spell case. It does not add a
resident model or increase peak Ollama memory.

Warm mixed-scenario observations:

| Scenario | Calls after post routing | Average |
| --- | ---: | ---: |
| no optional semantic work | 1 post call | 1.69-3.33 s |
| private Item transfer | post + 4B | 6.75 s |
| Item + Spell | post + 4B | 9.82-11.58 s |
| destroy | post + 4B + micro | about 6.6-11.6 s |

Pre-turn and unchanged Appraisal/translation calls are not included in these
post-chain wall times.

## Quality Findings

Nine cases covered:

- private Item transfer;
- Actor departure with visible injury;
- destroy with remains;
- destroy with no physical remainder;
- simultaneous Spell teaching and Item gift;
- simultaneous visible injury, Spell teaching and Item gift in one 4B call;
- hypothetical no-op;
- failed concealed custom Spell with public result;
- explicit no-visible-injury inspection.

Important results:

| Design | Accepted check result |
| --- | ---: |
| split 1.7B | 52.5% raw suite |
| split mixed 1.7B/4B | 55.4% raw suite |
| merged 1.7B | 39.6% raw suite |
| merged 4B | 73.3% raw suite |
| dynamic two-stage candidate before final refinements | 88.2% |
| candidate + dynamic operation Schema + deterministic guards | 96.8% |
| candidate + destroy micro + stable perception evidence reference | 97.8% |
| candidate + dynamic Identity attempt 1 | 100% reported, **rejected: oracle-fed route** |
| corrected structured route + dynamic Identity | **100% (800/800)** |

The corrected benchmark-only Identity matrix ran nine cases over five seeds:

```text
45 complete chains
800 / 800 accepted route + semantic checks
740 / 800 raw model checks before deterministic guards
15 / 15 Identity-routed cases
0 route failures
0 parse errors
maximum prompt tokens: 1419
maximum prompt + output tokens: 1673 / 2048
average post-chain time across the matrix: 17.21 s
```

Routing is now derived without a model call from independent structured
inputs:

```text
paid structured Item operations
paid structured Spell proposal
paid structured injury/departure targets
pre-turn structured inspection targets
explicit structured task directives
```

The expected result is used only by scoring. It is never read by the router.
The no-change negative case explicitly asserts that only the evidence-grounded
Hermione participant remains and the spurious Harry ID is rejected.

Identity is omitted structurally on non-routed cases. Routed Actor IDs are
constrained in the Schema and deterministic guard. Identity and Actor movement
use stable narrative-segment references, so malformed copied evidence does not
become authority.

Evidence:

- `benchmarks/quality-dynamic-identity-final.json`
  (`1698f51142213f3a4a5896e0e52a6207d73bcc74e9a9308f4a0b8e7204ded7dc`);
- `benchmarks/performance-dynamic-identity-final.json`
  (`30372395d5f18554b16263d2a8a7ead68ed40524cd2dd82bf22e6a260902d109`).

Rejected experiment:

- Perception micro-task: 1.7B scored 0/20 and 4B scored 5/20. Perception stays
  in post, but returns `evidenceSegmentIndex`; deterministic code resolves the
  source text and rejects invalid Actor/room transitions.

## User Scenarios

### Ordinary conversation

Before:

- post runs;
- regex may re-interpret its semantic output.

After:

- one 1.7B post call;
- no 4B loaded;
- exact IDs/source references are checked;
- State writes only accepted proposals.

### Hermione teaches a Spell and gives the player a note

Before:

- post, Inventory and Spell responsibilities are separate or regex-backed;
- serial calls can reload models;
- parallel mixed models can peak above 6 GB.

After:

- post runs first;
- one dynamic 4B call returns Inventory + Spell sections;
- peak remains about 3.06 GB;
- both proposals pass deterministic evidence/ID/State checks.

### A quill is destroyed

Before:

- the multi-task 4B consistently reversed `remains` and `absent`.

After:

- operation/item ID come from the structured paid proposal;
- the same 4B runs a tiny binary form decision;
- measured result is 20/20 across both models and five seeds;
- missing/failed form still defaults conservatively to `remains`.

### Failed secret Spell explodes before the class

Before:

- prose regex or an overloaded post model may misclassify concealment and
  witnesses.

After:

- pre-turn structured check says concealment was attempted and failed;
- post proposes room perception with a stable narrative-segment reference;
- deterministic code preserves `attempted` and rejects fake Actor movement;
- Spell proposal is handled by the optional 4B section.

## Recommendation

Configure:

```text
OLLAMA_NUM_PARALLEL=1
OLLAMA_MAX_LOADED_MODELS=1
post context=2048
dynamic follow-up context=2048
keep_alive=0 after the chain
```

Do not:

- enable two-model parallel residency;
- merge post + Inventory + Spell into 1.7B;
- run optional observers on every turn;
- use prose regex as a fallback;
- accept model evidence text without stable source references and Reducer
  checks.

The corrected benchmark-only dynamic 4B Identity matrix reports 100% and is
pending fresh independent acceptance. Production implementation remains
forbidden until:

- the current Phase 2 PRD/Spec receives explicit approval;
- the exact final production requests pass fresh blind production-chain
  acceptance;
- the candidate passes on a physical 8 GB machine with SillyTavern and the
  normal browser workload.

All measurements still come from a 36 GB M3 Pro. The 3.04 GB Ollama peak is
promising but is not an 8 GB support claim.
