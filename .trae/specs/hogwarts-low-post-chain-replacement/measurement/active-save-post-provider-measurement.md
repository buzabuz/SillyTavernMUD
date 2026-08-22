# Active-Save Post Provider Measurement

Status: PASS for active-save provider capacity.

Date: 2026-08-22

## Method

Read the active archive through the production provider-neutral Item selector
and Post prompt assembly. The measurement issued zero model requests and
verified that the source archive was byte-identical after the run.

```text
node .trae/specs/hogwarts-low-post-chain-replacement/measure-active-save-post.mjs
```

Machine-readable evidence:
[active-save-post-provider-measurement.json](./active-save-post-provider-measurement.json).

## Source Integrity

```text
archive bytes: 4,467,895
sha256: 0252e93509c030866965c8ac975af548800ab7846ade76873cf48cd3b26d255f
archive unchanged: true
model calls: 0
```

## Result

| Provider | Full request | Final request | Capacity | Result |
| --- | ---: | ---: | ---: | --- |
| Low | 19,950 chars | 19,950 chars | 298,080 chars | Pass; no compaction. |
| Local | 16,789 chars | 16,789 chars | 28,672 chars | Pass; no compaction. |

The active completed-turn input contained a 113-character player action and
seven paid narration segments totaling 2,328 characters. The selector saw
nine visible formal Items and admitted zero: no room Item and no direct
action/narration evidence existed in that turn.

## Local Capacity Resolution

The prior Local measurement used the old `4,096` context and ended at
`15,007 / 12,288` characters after every approved compaction step. The user
approved an `8,192` operating context after Ollama reported a real
`40,960`-token capacity for `qwen3:1.7b`.

The current Local operating capacity is `8,192` tokens with the existing
`1,024` response reserve. Browser preflight, Node Post request, and
`config.yaml` use this value. The active request now fits without compaction;
the protected System, Schema, player action, paid narration, and route IDs
remain intact.

No protected-field removal, narration truncation, semantic summarization,
provider fallback, or retry was performed.
