# Phase 2 Identity Research Gate - Independent Acceptance Attempt 3

Fresh-context declaration required: the verifier must start without parent
conversation history and must not receive an expected result.

Repository:

```text
/Users/bytedance/sillytavern/SillyTavern
```

Project goal:

```text
Before Phase 2 production implementation, validate the serial post-core 1.7B
-> optional dynamic 4B architecture with Identity beside Inventory and Spell.
Dynamic routing must be derived without a model call from independent
structured paid proposal, explicit directive and pre-turn signals; it must
never read expected test answers or prose regex. Route outputs and forbidden
negative outcomes must be scored. All route plus semantic checks must pass
across multiple seeds; prompt budget and one-model residency must pass; no
retry/fallback may occur. Research must not change production behavior, and
36 GB measurements must not be presented as physical 8 GB support.
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

1. Start from fresh context and derive acceptance independently from the goal
   and governed artifacts. Do not assume the main agent's conclusion is
   correct.
2. Work read-only with respect to production code, tests, migrations, saves,
   benchmark harness/evidence, and all governance artifacts except the report
   path named below.
3. Prove the router cannot access `expect`; verify route inputs and every
   scored route field for all cases.
4. Verify the no-change participant negative and every other forbidden
   outcome after deterministic guards.
5. Inspect all case/seed failures, raw/accepted scores, parse errors, call
   counts, prompt budget, performance samples and loaded-model sets.
6. Verify evidence hashes against current files and current harness prompt
   hashes.
7. Independently rerun the full quality matrix. Do not edit or replace the
   retained evidence JSON while doing so.
8. Verify production/runtime/test/save scope is unchanged.
9. Verify the physical host memory and the absence of an 8 GB support claim.
10. Write findings first, then criterion-by-criterion pass/fail evidence and a
    final verdict to exactly:

```text
.trae/specs/hogwarts-validator-governance/acceptance/phase2-identity-research-report-attempt-3.md
```

Do not change any other file.
