# Validator Governance Prompt Baseline

Status: current read-only build-only evidence, 2026-08-16.

This document supports [prd.md](./prd.md). It does not authorize Prompt
changes or remediation of existing budget failures.

## Method

Source:

```text
data/default-user/chats/Hogwarts_World_Director/
  Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl
```

The production build-only inventory was run against the active archive with
all role/local request ports captured. Budget assertions were disabled only in
memory so all actual measurements could be reported after the first known red
target. Source integrity, production builder, no-network and no-write checks
remained active. No script or repository file was modified.

Archive result:

```text
SHA-256: 597e69e069d10e771b4197f54a9ceeffd8801ce8175ce5c927ff2868b2adff06
bytes: 3,852,365
unchanged: true
model calls: 0
```

## Local Tasks

The configured local semantic context is `4,096` tokens. Translation uses an
`8,192` token override. Prompt characters are System plus User messages; the
transport JSON Schema is reported separately because Ollama receives it
through `format`.

| Task | Prompt chars | Estimated tokens | Transport Schema | Transport total | Approved target | Remaining |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pre-turn | 7,306 | 2,436 | 1,148 | 8,454 | 9,000 chars | 1,694 chars |
| post-turn | 10,009 | 3,337 | 4,034 | 14,043 | 10,500 chars / 3,500 tokens | 491 chars / 163 tokens |
| inventory | 8,354 | 2,785 | 1,474 | 9,828 | 9,000 chars | 646 chars |
| Appraisal | 2,310 | 770 | 699 | 3,009 | 3,500 chars | 1,190 chars |
| translation | 2,354 | 785 | 394 | 2,748 | 20,000 chars | 17,646 chars |

Constraint:

- Response preservation cannot add fields or rules to any local Prompt.
- In particular, post-turn cannot absorb prose-contradiction, Item, Spell or
  Calendar semantic work merely because it is the nearest existing task.
- Any later semantic migration must define a subtractive replacement or an
  explicitly approved new request and budget. No algorithm is selected here.

## Affected Role Tasks

| Task | Actual chars | Runtime ceiling | Product target | Result |
| --- | ---: | ---: | ---: | --- |
| Scene Performance | 44,163 | 298,080 | 47,626 | pass |
| Scene Transition | 76,531 | 298,080 | 76,100 | fail by 431 |
| Scene Opening | 25,007 | 298,080 | 28,319 | pass |
| Social | 82,386 | 298,080 | 80,000 | fail by 2,386 |

The Scene Transition and Social failures are pre-existing and registered as
`HTD-009` and `HTD-006`. Their payload selection, trimming, cursor, batching
and omission semantics are outside this change. Revision 4 response
preservation must leave model-visible requests byte-identical except for
external save evolution.

## Response-Preservation Prompt Impact

None.

Capturing content already returned by a paid request is not serialized into a
later System, User or transport Schema and does not add a model request.
