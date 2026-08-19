# Revision 25 Settings Browser Evidence

Status: PASS for `SETTINGS-007` normal settings-page workflow. This evidence
does not claim model-quality or Low Profile real-call acceptance.

Date: 2026-08-19

## Workflow

Browser target:

```text
http://127.0.0.1:8003/
```

The normal new-timeline setup workflow opened **05 生成配置**. The rendered
Chinese control was:

```text
Label: 回合后语义提案
Option low: 低档 Connection Profile
Option local: 本地模型
Default selected value: low
```

The Low option showed the configured Low Profile/model as an allowlisted
technical configuration value:

```text
使用低档 Connection Profile ·
trial· gemini 3.1 · [F]gemini-3.1-pro-preview
```

## Persistence Check

1. Selected `local`.
2. Rendered detail became `使用本地 Ollama 回合后模型。`.
3. Reloaded the page, reopened **05 生成配置**, and confirmed the selected
   value remained `local` with the same Local detail.
4. Restored `low` before ending the browser session. The rendered Low Profile
   detail returned as above.

## Result

`SETTINGS-007` uses finite static Chinese labels for `low/local`; only the
already allowed Connection Profile/model identifiers remain technical text.
The selector persisted across reload and was restored to the production
default before browser close.

## Post-Fix Recheck

After the provider normalizer was moved into its focused domain module, the
application was restarted and the same page was reopened. The rendered Low
detail was:

```text
使用低档 Connection Profile ·
trial· gemini 3.1 · [F]gemini-3.1-pro-preview
```

Selecting Local rendered `使用本地 Ollama 回合后模型。`; selecting Low again
restored the Chinese Low detail. No settings-controller runtime exception
occurred during either change.
