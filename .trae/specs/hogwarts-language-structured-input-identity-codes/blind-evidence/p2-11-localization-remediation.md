# P2-11 Localization Remediation Blind Evidence

Date: 2026-08-16

Status: `passed`

Only the first valid fresh Agent response for each case is acceptance
evidence. Accidental duplicate Character Polish dispatches are excluded.

## Local Translation zh-CN Batch

```text
fresh context: yes
forked implementation history: no
tools used by Agent: 0
model calls represented: 1
repair/retry: 0
production request owner:
  src/hogwarts-mud/local-semantic-adjudicator.js
  TRANSLATION_BATCH_SYSTEM
response SHA-256:
  09bdfefe9b34628beef1f7a75e8fcb727802a16f3793e9f9d9768c311230778e
```

Result:

- copied both `index` and `partIndex` identities exactly;
- returned both required rows once;
- translated `Year 2: Stale Letters` fully into Chinese;
- preserved every `[[HPMUD_TERM_*]]` marker exactly;
- added no non-allowlisted English;
- required no repair request.

Production stage reached: structured marker and source-locale validation.

## Character Polish zh-CN

```text
fresh context: yes
forked implementation history: no
tools used by Agent: 0
model calls represented: 1
repair/retry: 0
production request owner:
  public/scripts/extensions/hogwarts-mud/ui/setup-controller.js
  polishCharacterBackground
response SHA-256:
  4d8d6f82e1b7b95770eefe2fd930880aabc2d3193082689568b9a5abb11f0796
```

Result:

- returned prose only;
- retained the supplied character facts;
- introduced no secret lineage or ability;
- used modern Simplified Chinese;
- contained no English words;
- required no repair request.

Production stage reached: Setup preview.

## Local Translation Final-Request Refresh

The earlier local-batch response above remains historical evidence for the
marker-based request. It is not used to approve the final request after the
43-row remediation.

### Direct Single-Field Translation

```text
fresh context: yes
forked implementation history: no
tools used by Agent: 0
model calls represented: 1
repair/retry: 0
production request owner:
  src/hogwarts-mud/local-semantic-adjudicator.js
  TRANSLATION_SYSTEM
response SHA-256:
  471ffe663c1a1f88257b8e4febf907dd4148fe816aeabbea5b9f2e7052d18e07
```

Untouched response outcome:

- production Zod Schema passed;
- glossary-locked `Student` resolved to Chinese;
- source-locale leak list was empty;
- target-locale mismatch was false;
- no repair or second response was requested.

### Structured Idle Batch Translation

```text
fresh context: yes
forked implementation history: no
tools used by Agent: 0
model calls represented: 1
repair/retry: 0
production request owner:
  src/hogwarts-mud/local-semantic-adjudicator.js
  TRANSLATION_BATCH_SYSTEM
response SHA-256:
  a8abc629ff3925716ea0cdc62d7697b2c1a9d62c51e91d034b01763dc83008c7
```

Untouched response outcome:

- production Zod Schema passed;
- `index=0` and `partIndex=0` restored through the real structured identity
  path;
- glossary-locked `mulberry bolt`, `Tina` and `Malkin` resolved to Chinese;
- source-locale leak list was empty;
- target-locale mismatch was false;
- no repair or second response was requested.
