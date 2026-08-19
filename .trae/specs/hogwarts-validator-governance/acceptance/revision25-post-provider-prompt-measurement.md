# Revision 25 Post Provider Prompt Measurement

Status: PASS for unchanged shared-descriptor size and archive no-write proof.

Date: 2026-08-19

## Method

Ran the production build-only measurement against the configured representative
archive:

```text
HOGWARTS_PROMPT_MEASURE_SCOPE=validator-revision-17 \
node .trae/specs/hogwarts-prompt-payload-consolidation/measure-prompts.mjs
```

The generated machine-readable capture is
[revision25-post-provider-prompt-measurement.json](./revision25-post-provider-prompt-measurement.json).

## Result

| Section | Characters | Estimated tokens |
| --- | ---: | ---: |
| Shared post System Prompt | 5,806 | 1,936 |
| Canonical User input | 4,463 | 1,488 |
| Messages total | 10,269 | 3,423 |
| Shared transport JSON Schema | 3,839 | 1,280 |
| Transport total | 14,108 | 4,703 |

The source archive stayed byte-identical:

```text
unchanged: true
sha256: 597e69e069d10e771b4197f54a9ceeffd8801ce8175ce5c927ff2868b2adff06
```

Revision 25 changes the executor only. Low and Local use this same System
Prompt, canonical input and transport Schema; no field was added or removed.
No latency, price or semantic-quality claim is made from this build-only run.
