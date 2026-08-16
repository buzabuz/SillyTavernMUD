# Phase 2 Identity Research Gate - Independent Acceptance Task

Fresh-context declaration requested: the verifier must start without parent
conversation history and must not receive an expected result.

Repository:

```text
/Users/bytedance/sillytavern/SillyTavern
```

Project goal:

```text
Before any Phase 2 production implementation, validate the proposed serial
post-core 1.7B -> optional dynamic 4B architecture with Identity integrated
beside Inventory and Spell. The benchmark matrix must cover ordinary,
negative, movement/injury, Item, Spell, destroy, concealment, inspection and
same-call Identity+Inventory+Spell cases across multiple seeds. Every accepted
check must pass; prompt/context budget must pass; no automatic retry or prose
regex fallback may be used; performance must prove one loaded model at a time.
This research gate must not change production behavior. Measurements on the
36 GB host cannot be presented as physical 8 GB support.
```

Authoritative artifacts:

```text
.trae/specs/hogwarts-validator-governance/prd.md
.trae/specs/hogwarts-validator-governance/spec.md
.trae/specs/hogwarts-validator-governance/checklist.md
.trae/specs/hogwarts-validator-governance/tasks.md
.trae/specs/hogwarts-validator-governance/ollama-concurrency-merge-report.md
.trae/specs/hogwarts-validator-governance/benchmarks/ollama-validator-benchmark.mjs
.trae/specs/hogwarts-validator-governance/benchmarks/quality-dynamic-identity-final.json
.trae/specs/hogwarts-validator-governance/benchmarks/performance-dynamic-identity-final.json
.trae/specs/hogwarts-runtime-contracts/state-fields.md
HOGWARTS_MUD_PRODUCT_SPEC.md
```

Instructions:

1. Work read-only. Do not edit production code, tests, governance artifacts,
   benchmark evidence, migrations or saves.
2. Derive the acceptance criteria independently from the project goal and
   governed artifacts.
3. Inspect the harness data flow, Schemas, prompts, deterministic guards,
   routing, call counts and retained evidence.
4. Verify the final JSON evidence directly, including all case/seed failures,
   parse errors, token budgets, model-call counts, performance samples and
   model residency.
5. Inspect the worktree to prove production behavior is unchanged.
6. Independently verify the host memory and that no 8 GB claim is made.
7. Report findings first, then criterion-by-criterion pass/fail evidence.
8. Do not assume the main agent's conclusion is correct.
