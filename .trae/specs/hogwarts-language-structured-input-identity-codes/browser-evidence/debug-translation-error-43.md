# Debug Session: translation-error-43

- **Status**: [OPEN]
- **Issue**: `43` current TranslationTable candidates remain error rows after
  the approved precise retry: `41 SOURCE_LOCALE_LEAK` and
  `2 TARGET_LOCALE_MISMATCH`.
- **Debug Server**: `http://127.0.0.1:7778/event`
- **Log File**: `.dbg/trae-debug-log-translation-error-43.ndjson`

## Reproduction Steps

1. Instrument the existing post-translation quality decision without changing
   translation, validation, queue or persistence behavior.
2. Delete only the exact `43` current error keys through the versioned
   retranslation API.
3. Reload the representative Tina timeline once and keep the page stable.
4. Let the five deterministic local batches finish with one model request per
   batch and no repair/retry/fallback.
5. Compare runtime evidence by record kind, source length, leaked token and
   target-locale decision.

## Hypotheses

| ID | Hypothesis | Likelihood | Effort | Expected evidence |
| --- | --- | --- | --- | --- |
| A | Short identity/profile fields lack enough context, so proper nouns or role terms remain English | High | Low | Confirmed as an aggravating factor, not the sole cause: all 9 short rows failed, but 28 medium/long rows also failed |
| B | Long narrative fields have enough context but the 4B model locally skips ordinary words | High | Low | Confirmed: residual source words survived in otherwise Chinese output across all length buckets |
| C | `TARGET_LOCALE_MISMATCH` is a ratio-gate false positive on short but valid Chinese output | Medium | Low | Rejected for this run: zero of 43 runtime decisions had `targetMismatch=true` |
| D | Canonical source text contains leaked JSON/internal structure that the translator preserves | Medium | Low | Confirmed for one row: `pacingBeatRealized:true` is embedded in a Scene timeline summary |

## Log Evidence

The diagnostic pass used five local model requests, one request per idle
batch, with no repair/retry/fallback.

```text
original rows: 43
runtime evidence matched by identity/source length: 43
ready: 6
error: 37
missing: 0

short 0..120 chars: 9 total / 9 error
medium 121..500 chars: 24 total / 20 error
long 501+ chars: 10 total / 8 error
```

Representative evidence:

- line 4: an 83-character Actor background became
  `在迪agon巷南段经营食品车`, proving partial proper-noun translation rather
  than missing output;
- line 17: the stage direction
  `{quietly, through her teeth}` remained intact while the dialogue was
  otherwise Chinese;
- line 142: a 500-character message retained `Alex` and the complete sign
  `Braithwaite's Pasties — 2 Sickles each`;
- line 148: a 1,425-character Author's Quill translated 359 Han characters
  but retained only `podium`;
- line 149: the translated Scene summary retained the canonical-source
  contamination `"pacingBeatRealized":true`;
- only one leaked token (`Bilabibili-bo`) was generated rather than copied
  from the source; all other leaks matched source text.

## Verification Conclusion

The dominant failure is not insufficient narrative context. The 4B model
usually translates the record but treats quoted strings, proper nouns, stage
directions and occasional ordinary words as preservable English. The current
Prompt asks for Chinese-only output, but the transport Schema accepts arbitrary
strings, so the instruction is advisory rather than generatively enforced.

The minimal systemic remediation is:

1. retain the existing post-generation `SOURCE_LOCALE_LEAK` validator;
2. make the same-request Prompt explicitly perform a final A-Z/a-z scan before
   returning JSON;
3. prelocalize only runtime-proven domain names, quoted phrases and recurring
   leak terms through the existing glossary mechanism;
4. structurally remove the one recognized trailing
   `pacingBeatRealized:boolean` fragment from the display/translation
   projection rather than translating or rewriting the canonical save.

An attempted transport-Schema `pattern` constraint was rejected by real
runtime evidence and fully removed:

```text
Ollama 400
Failed to initialize samplers: failed to parse grammar
```

The attempt failed before model generation, produced zero quality-decision
events and persisted only `TRANSLATION_FAILED`. It is not part of the fix.

The first supported post-fix attempt also exposed a separate failure in the
client-side prelocalization strategy:

- line 140: a 109-character message became
  `Well, then... 小姐 —?`, retaining 79 Latin letters;
- line 143: the 1,425-character Author's Quill kept almost the entire English
  text around a few prelocalized Chinese terms;
- line 145: a 376-character message retained 285 Latin letters around the
  prelocalized `冬青木魔杖`;
- line 151: one otherwise Chinese message retained `mulberry bolt`;
- line 161: one otherwise Chinese message retained `barricade`.

This proves that inserting glossary targets directly into the provider source
can make the 4B model classify the mixed input as already localized and leave
the remaining English untouched. The final remediation therefore restores
pure-English local provider text with a separate glossary array. HPMUD term
markers remain an external-provider mechanism only. Marked one-field local
requests use the structured batch contract, and the same-request Prompt
requires a final A-Z/a-z scan before JSON output.

Two marker-based local variants were also rejected: both English
`[[HPMUD_TERM_n]]` and Chinese `⟦术语n⟧` markers were sometimes omitted by the
4B model. Exact marker-set validation correctly failed those batches rather
than silently losing terms.

Final runtime result:

```text
TranslationTable revision: 217
current candidate identities: 1648
ready: 1648
error: 0
missing: 0
false-ready: 0
```

Post-fix log lines 1–7 cover the final short-field batch. Every row has:

```text
targetMismatch=false
tokens=[]
latinLetters=0
```

The four formerly failing `Student` role rows all resolve to two Han
characters. The final runtime output and table state prove that short fields
need explicit glossary context, while narrative rows need pure-English input
plus the final leak scan; mixed-language prelocalization and opaque term
markers are both counterproductive for this model.
