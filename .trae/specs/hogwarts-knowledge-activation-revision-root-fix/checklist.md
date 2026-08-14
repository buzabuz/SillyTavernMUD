# Acceptance Checklist

## Semantics

- [x] API format, persisted format, timeline, State revision and Knowledge
      content identity have separate definitions.
- [x] State/chat remain the only Knowledge authority.
- [x] Legacy Appraisals receive no guessed Event provenance or Schema.
- [x] Item and language incidents remain outside this change.

## Revision And Backend

- [x] Projection fingerprint excludes `stateRevision`.
- [x] Fingerprint changes when record ID/checksum content changes.
- [x] Backend writes reject lower revisions.
- [x] Candidate reads accept same-epoch records at or before current revision.
- [x] Future and cross-epoch records are rejected.
- [x] Qdrant uses an `lte` revision filter and new contract generation.
- [x] V1 JSON index is atomically rebuilt, not dual-read.
- [x] Health/sync/search expose the current API contract and fingerprint.

## Canonical Hydration

- [x] Backend output is treated only as candidate records.
- [x] Current State/chat replaces candidate text and ACL before Prompt use.
- [x] Missing, unauthorized, future and superseded records are suppressed.
- [x] Backend activation capsules never enter Prompt directly.
- [x] Current canonical records build the final sealed capsules.

## Memory Activation

- [x] Active/contested Schema IDs seed the fast path.
- [x] Bounded ActorMemoryIndex IDs seed exact Event/Appraisal expansion.
- [x] Raw Appraisal prose is not emitted as a Low supporting Event.
- [x] Concrete historical claims require a matching canonical Event.
- [x] Actor ACL is maintained across common and observer capsules.
- [x] Per-actor Event cap is 3 and global cap is 8.
- [x] Tina quill action activates relevant Events for legal actors.
- [x] Tina expectations remain empty with `no_legal_schema` diagnostics.

## Failure And Cost

- [x] API mismatch fails before any paid Low call.
- [x] Exact sync/search failure is explicit and not converted to `[]`.
- [x] Qdrant failure degrades only to healthy JSON exact.
- [x] Healthy zero-match retrieval remains legal.
- [x] No automatic model repair/retry/fallback call exists.
- [x] Failed retrieval has Low call count 0.

## Prompt

- [x] Low payload has exactly six top-level fields.
- [x] User Payload is at most 50 KiB.
- [x] System Prompt is at most 27,221 characters.
- [x] Player action, authority, Actor cards and capsule boundaries are protected.
- [x] Build-only measurement does not modify Tina.
- [x] Fresh context-free sub-agent receives only captured production messages.
- [x] Blind response passes the production one-attempt pipeline.

## Harnesses

- [x] V1 disk fixture reaches rebuild assertion.
- [x] Sync N -> metadata save N+1 -> retrieval reaches canonical assertion.
- [x] Real adapter errors reach zero-Low-call assertion.
- [x] Production turn workflow consumes real seed IDs.
- [x] No capsule-only fixture is accepted as end-to-end evidence.
- [x] Server restart is verified after endpoint/backend changes.
- [x] Focused and affected core regression suites pass.

## Real Tina

- [x] Pre-verification SHA/bytes/mtime recorded.
- [x] Existing Knowledge directory backed up.
- [x] JSON exact format/count/fingerprint verified.
- [x] Qdrant generation/count/ACL verified.
- [x] Real quill query returns expected Event IDs.
- [x] Per-actor capsule contents recorded without private leakage.
- [x] Archive remains byte-identical during read-only verification.

## Closeout

- [x] Living Knowledge contract updated.
- [x] Governance Skill updated.
- [x] Tasks and progress contain exact commands/results.
- [x] No unapproved compatibility layer, dual-read or scope expansion exists.
