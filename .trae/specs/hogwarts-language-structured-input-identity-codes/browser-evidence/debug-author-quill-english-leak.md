# Debug Session: author-quill-english-leak

- **Status**: [OPEN]
- **Issue**: `author_quill/210/authorQuillEn` remains `SOURCE_LOCALE_LEAK`
  after deterministic glossary prelocalization; zh-CN renders the English
  source fallback instead of a complete Chinese translation.
- **Debug Server**: `http://127.0.0.1:7777/event`
- **Log File**:
  `.dbg/trae-debug-log-author-quill-english-leak.ndjson`

## Reproduction Steps

1. Delete only the current TranslationTable row for
   `author_quill/210/authorQuillEn` through the versioned retranslation API.
2. Reload the current Tina timeline on port `8002`.
3. Let the visible miss enter the idle localization queue once.
4. Inspect the adapter validation evidence and persisted row.

## Hypotheses

| ID | Hypothesis | Likelihood | Effort | Expected evidence |
| --- | --- | --- | --- | --- |
| A | One proper noun is still absent from the deterministic glossary | High | Low | Rejected: no proper noun leaked |
| B | A quoted English award title is preserved by the model | Medium | Low | Rejected: no quoted title leaked |
| C | Ordinary English prose is omitted from translation | Medium | Low | Confirmed: `aggressively`, generated `winked` |
| D | Spell allowlist incorrectly preserves non-spell English | Low | Low | Rejected: leaked tokens were avoidable |

## Log Evidence

Pre-fix line 1:

```json
{
  "tokens": ["aggressively", "winked"],
  "sourceMatches": ["aggressively"],
  "translatedLength": 421
}
```

## Verification Conclusion

The model partially preserved the source phrase `aggressively winking` and
changed one leaked token to `winked`. Proper nouns, quoted award titles and
the spell allowlist were not the remaining cause. The minimal fix is to
prelocalize the complete source phrase instead of weakening validation or
adding a repair request.

Post-fix evidence:

- the complete source phrase is deterministically prelocalized to
  `拼命地眨眼`;
- TranslationTable revision `144` stores
  `author_quill/210/authorQuillEn` as `ready`;
- the post-fix debug log contains zero leak events;
- the normal zh-CN Author's Quill `innerText` contains only Chinese display
  prose;
- English source paragraphs remain only in the hidden, explicit
  “显示英文原文” branch.

The runtime symptom is no longer reproducible. Status remains `[OPEN]` until
the required user confirmation permits instrumentation cleanup.
