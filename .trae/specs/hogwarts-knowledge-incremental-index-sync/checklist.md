# Checklist: Incremental Knowledge Index Sync

## Approval

- [x] PM grades the change L2 and returns PASS.
- [x] User confirms the proposed semantic boundary before drafting.
- [x] User approves Revision 1 PRD, Spec, tasks, and checklist before code work.

## Authority and Compatibility

- [x] Full State/chat-derived snapshot remains the only reconciliation input.
- [x] JSON exact continues to process full `replace=true` snapshots.
- [x] Stable ID plus checksum, not revision alone, determines vector reuse.
- [x] Deleted snapshot records are deleted from Qdrant.
- [x] Missing/incompatible collection and explicit rebuild perform full embed.
- [x] API contract 3, index/projector versions, deterministic point IDs, and
  Qdrant generation semantics remain compatible.
- [x] No State, chat, Prompt, Reducer, ACL, or hydration semantic changes.

## Failure Behavior

- [x] Qdrant manifest/delete/upsert failure leaves JSON exact available.
- [x] Qdrant failure writes no authority State/chat change and makes no model
  retry/fallback call.
- [x] A later healthy manifest reconciliation restores an earlier missing
  Qdrant point.
- [x] Stale write rejection and future-revision rejection remain covered.

## Tests and Real Evidence

- [x] Focused delta-sync test covers unchanged reuse.
- [x] Focused delta-sync test covers changed checksum replacement.
- [x] Focused delta-sync test covers deletion and missing-point repair.
- [x] Focused delta-sync test covers full rebuild.
- [x] Existing Knowledge V2, ACL, hydration, and Qdrant regression suites pass.
- [x] Node restart and authenticated API contract health proof are recorded.
- [x] Active-save normal changed sync proves `embedded < total`; per-record
  classification is covered by focused manifest tests.
- [x] Verification helpers and temporary smoke collections do not write the
  active archive; the only observed archive change is the user-initiated
  normal-turn transaction.
- [x] Lint, syntax, and diff checks pass.

## Closeout

- [x] Runtime Knowledge contract and field registry reflect final diagnostics
  and reconciliation behavior.
- [ ] HTD-001 is updated with final evidence or retained with explicit reason.
- [ ] Change ledger and core-change debt review are completed.
- [x] Fresh independent acceptance covers the approved user outcome.
