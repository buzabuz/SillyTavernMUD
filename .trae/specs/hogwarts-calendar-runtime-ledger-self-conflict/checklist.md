# Checklist

- [x] Fixed PM classified this as the partial L2 Calendar runtime-ledger
  self-conflict capability.
- [x] Production trace proves Medium, Low, and State transition completed
  before the final `stale_save`.
- [x] Production-informed PM follow-up passed the field, workflow, and
  authority boundary.
- [x] Existing State contract is traced: scheduler owns `modelTaskRuntime`;
  guarded save owns revision fields; Calendar owns final world commit.
- [x] Existing Calendar harness bypass is recorded.
- [x] User approves this PRD, technical spec, tasks, and checklist revision.
- [x] Rebase accepts only matching-epoch, contiguous,
  `model_task_runtime`-only revisions.
- [x] Full provider-free Calendar workflow exercises scheduler runtime
  persistence through real guarded ports.
- [x] Accepted workflow preserves runtime ledger and commits exactly one
  opening message with no Provider request, retry, or fallback.
- [x] Intervening world, mixed-domain, missing-history, non-contiguous, and
  cross-timeline revisions remain strict conflicts with no final Calendar
  write.
- [x] Incident record is corrected and linked as supporting evidence.
- [x] Focused regression suites pass.
- [x] Fresh independent L2 acceptance passes:
  [`independent-l2-acceptance.md`](./acceptance/independent-l2-acceptance.md).
- [ ] Core-change technical-debt self-audit and re-inventory decision are
  recorded.
