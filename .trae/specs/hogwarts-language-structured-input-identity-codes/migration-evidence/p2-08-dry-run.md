# P2-08 Model-Free Dry-Run Evidence

Date: 2026-08-15

Status: implementation verification; no real TranslationTable seed or JSONL
rewrite was performed.

Command:

```text
node scripts/dry-run-hogwarts-language-authority-v1.mjs
```

## Source

```text
timelineEpoch: legacy_cdf2d1047e32546a
stateRevision: 124
SHA-256: e54d136c1260e31c3d2145a66d7b6873495de65774f9a431c19a065d2c2df7ac
bytes: 7180015
source SHA/bytes/mtime unchanged: true
```

Revision `124` is the separately detected pre-P2-08 lifecycle write documented
in `progress.md`. The 215 chat messages are byte-identical to the reviewed
revision-123 backup. Item existence/custody, Actor life status and all stable
IDs are unchanged.

## Result

```text
target JSONL SHA-256: b90a0c1220a03e5f0c79b448e5c601edb21501f684ebbc48a3ff50f1c18d3caf
target JSONL bytes: 3836172
timeline entries reconstructed: 127
unique TranslationTable candidates: 1052
raw model-output segments: 32 including main/swipe/transaction copies
skipped non-authoritative records: 22
language audit violations: 0
unknown language paths: 0
second run changed: false
second State byte-equal: true
second chat byte-equal: true
```

Target versions:

```text
languageAuthorityVersion = 1
characterLanguageVersion = 2
calendar.version = 3
itemSystemVersion = 4
materialStateVersion = 3
spellbook.version = 3
map.localMapVersion = 2
```

The approved message-6 replacement is written to the main transaction, active
swipe transaction and matching timeline entry. The original Chinese player
message remains unchanged. The five approved Material mappings rebuild the
root and retry Presentation projections from exact Material-event evidence.

## Failure Gates

Focused tests prove:

- exact-before mismatch fails before mutation;
- stale chat fails before host save;
- one whole-timeline rewrite calls `saveChat()` once and never
  `saveMetadata()`;
- confirmed host failure restores the exact prior State/chat objects;
- seed batches are bounded at 256 rows;
- query read-back covers every key;
- upsert or read-back failure performs no retry and no JSONL rewrite.

Real seed, real atomic rewrite, backup verification and post-migration browser
acceptance remain P2-11 gates.
