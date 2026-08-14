# Tasks

## KAR-1 - Root-cause reconnaissance

Status: completed

- [x] Inspect the latest real Tina diagnostics and capsules.
- [x] Compare State Events/MemoryRefs/Schemas with Knowledge results.
- [x] Inspect JSON and Qdrant persisted versions/revisions.
- [x] Trace client/server process versions and sync error handling.
- [x] Trace the production Low composition root and dead continuity port.
- [x] Reproduce the expected query from current canonical State/chat.
- [x] Audit the synthetic test harness gap.

## KAR-2 - Revision and contract separation

Status: completed

- [x] Add the shared Knowledge API contract version.
- [x] Add deterministic projection fingerprinting.
- [x] Add explicit exact/not-future hydration policies.
- [x] Change JSON/Qdrant candidate reads to not-future semantics.
- [x] Preserve monotonic stale-write rejection.
- [x] Add client/server mismatch diagnostics and direct failure.

## KAR-3 - Canonical hydration and failure behavior

Status: completed

- [x] Treat backend records as candidate identifiers.
- [x] Rehydrate from current State/chat.
- [x] Build model capsules only from current canonical records.
- [x] Stop trusting backend-built activation capsules.
- [x] Propagate exact sync/retrieval failures before Low.
- [x] Preserve healthy empty retrieval and Qdrant-to-JSON degradation.

## KAR-4 - Restore memory activation seeds

Status: completed

- [x] Add bounded active Schema and ActorMemoryIndex record-ID seeds.
- [x] Wire seeds through the real turn retrieval path.
- [x] Remove the dead Low continuity port.
- [x] Verify actor ACL and Low Event limits.
- [x] Keep legacy Appraisals without provenance out of Schema generation.

## KAR-5 - Harness and regression migration

Status: completed

- [x] Add V1 disk to V2 rebuild coverage.
- [x] Add sync-save-retrieve revision drift coverage.
- [x] Add API mismatch and zero-Low-call coverage.
- [x] Add current canonical suppression/replacement coverage.
- [x] Replace handcrafted capsule-only Low acceptance with the real production
      retrieval/builder path.
- [x] Run focused and affected core Hogwarts regression suites.

## KAR-6 - Real service and Tina verification

Status: completed

- [x] Restart the Node server so the current backend contract is loaded.
- [x] Back up the existing Knowledge directory.
- [x] Rebuild JSON exact and Qdrant from the current Tina archive.
- [x] Run the real quill query and inspect per-actor capsules.
- [x] Run production Prompt build and budget gates.
- [x] Run a fresh context-free sub-agent against only the captured Low request.
- [x] Validate the response through the production one-attempt pipeline.
- [x] Prove archive SHA/bytes/mtime remain unchanged unless an intentional
      metadata save is separately approved and verified.

## KAR-7 - Contracts and closeout

Status: completed

- [x] Update the living Knowledge runtime contract.
- [x] Add backend-restart/version-handshake and real-harness lessons to the
      project governance Skill.
- [x] Complete checklist and progress evidence.
- [x] Confirm no Item/language/Social/Calendar scope expansion.
