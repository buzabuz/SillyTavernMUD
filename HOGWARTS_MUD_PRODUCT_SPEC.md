# Hogwarts MUD Product PRD Registry

Last updated: 2026-08-22

## Purpose

This file is the stable root record point for Hogwarts MUD product work.

It is an index, not a second behavioral contract:

- every active or research Hogwarts PRD must have exactly one row here;
- product authority remains in the linked
  `.trae/specs/<change-id>/prd.md`;
- current runtime behavior remains in
  `.trae/specs/hogwarts-runtime-contracts/`;
- execution status remains in each change's `tasks.md`, `checklist.md`, and
  `progress.md`;
- completed historical records are retained at their stable change paths.

When this registry conflicts with a linked PRD or living runtime contract, the
linked authority wins and this registry must be corrected in the same change.

## Active PRDs

| Change ID | Status | Product authority |
| --- | --- | --- |
| `hogwarts-documentation-governance` | Revision 3 approved; implementation in progress | [PRD](.trae/specs/hogwarts-documentation-governance/prd.md) |
| `hogwarts-identity-presentation-lifecycle` | Revision 1 research TODO; PM business discovery blocked on two decisions | [PRD](.trae/specs/hogwarts-identity-presentation-lifecycle/prd.md) |
| `hogwarts-language-structured-input-identity-codes` | Revision 4 approved; Phase 2 implementation in progress | [PRD](.trae/specs/hogwarts-language-structured-input-identity-codes/prd.md) |
| `hogwarts-causal-pacing-world-facts-story-arcs` | Revision 1 research TODO; 业务合同未定义，禁止模型与生产设计 | [PRD](.trae/specs/hogwarts-causal-pacing-world-facts-story-arcs/prd.md) |
| `hogwarts-validator-governance` | Revision 25 implementation complete; final acceptance blocked on independent real provider/timeline evidence; fine-tuning deferred | [PRD](.trae/specs/hogwarts-validator-governance/prd.md) |
| `hogwarts-current-turn-post-translation-parallel` | Revision 2 implementation complete; 61/61 self-tests pass; browser acceptance pending | [PRD](.trae/specs/hogwarts-current-turn-post-translation-parallel/prd.md) |
| `hogwarts-knowledge-incremental-index-sync` | Revision 2 approved; resumable post-JSON-exact Qdrant repair implementation in progress | [PRD](.trae/specs/hogwarts-knowledge-incremental-index-sync/prd.md) |
| `hogwarts-pre-validated-post-settled-player-movement` | L2 specification complete; awaiting implementation approval | [PRD](.trae/specs/hogwarts-pre-validated-post-settled-player-movement/prd.md) |
| `hogwarts-selected-post-capacity-settlement-safety` | L2 approved; implementation in progress | [PRD](.trae/specs/hogwarts-selected-post-capacity-settlement-safety/prd.md) |
| `hogwarts-auxiliary-observation-normalization` | L1 implemented and verified | [PRD](.trae/specs/hogwarts-auxiliary-observation-normalization/prd.md) |
| `hogwarts-low-post-chain-replacement` | L2 implementation in progress: Low complete Post chain and provider-neutral Item context | [PRD](.trae/specs/hogwarts-low-post-chain-replacement/prd.md) |

## Implemented And Accepted PRDs

| Change ID | Status | Product authority |
| --- | --- | --- |
| `compact-timeline-appraisal-lifecycle` | Revision 4 implemented and accepted | [PRD](.trae/specs/compact-timeline-appraisal-lifecycle/prd.md) |
| `hogwarts-knowledge-activation-revision-root-fix` | Implemented and verified | [PRD](.trae/specs/hogwarts-knowledge-activation-revision-root-fix/prd.md) |
| `hogwarts-low-provenance-participle-fix` | Implemented and verified | [PRD](.trae/specs/hogwarts-low-provenance-participle-fix/prd.md) |
| `hogwarts-prompt-payload-consolidation` | Revision 4 implemented; acceptance passed | [PRD](.trae/specs/hogwarts-prompt-payload-consolidation/prd.md) |
| `hogwarts-test-suite-decomposition` | Revision 2 implemented and verified | [PRD](.trae/specs/hogwarts-test-suite-decomposition/prd.md) |
| `unify-actor-context-memory` | Approved revisions implemented; final evidence is in progress log | [PRD](.trae/specs/unify-actor-context-memory/prd.md) |

## Living Authorities

| Authority | Path | Purpose |
| --- | --- | --- |
| Runtime contract index | [spec.md](.trae/specs/hogwarts-runtime-contracts/spec.md) | Current production transactions and module ownership |
| Runtime field registry | [state-fields.md](.trae/specs/hogwarts-runtime-contracts/state-fields.md) | Field meaning, sole writer, readers, compatibility, and diagnostics |
| Model field-route registry | [model-field-routes.md](.trae/specs/hogwarts-runtime-contracts/model-field-routes.md) | Prompt/Schema/transient field source, selector, route edges, consumers, guards, and State outcome |
| Technical-debt ledger | [TECH_DEBT.md](.trae/specs/TECH_DEBT.md) | Cross-change debt and feature/change counts |
| Change governance | [SKILL.md](.trae/skills/hogwarts-change-governance/SKILL.md) | Mandatory artifacts, approval, evidence, and maintenance gates |

## Permanent Model-Request Policy

The default contract is exactly one paid model request per task invocation.
Parse, Schema, authority, provenance, settlement, or validation failure
surfaces the original error:

- no automatic repair request;
- no automatic retry;
- no model-generated fallback;
- no hidden second round.

An exception exists only when the currently approved PRD names the exact task,
eligible error classes, maximum attempts, added call budget, and explicit user
approval. Historical repair code or an old document is not an exception.

The authoritative maintenance points are:

- [Hogwarts Change Governance](.trae/skills/hogwarts-change-governance/SKILL.md)
- [Runtime Field Registry](.trae/specs/hogwarts-runtime-contracts/state-fields.md)

For active Low Scene Performance and Low Scene Opening, invalid output fails
directly without repair or fallback.

## Unverified Investigations

| Issue | Status | Stable evidence |
| --- | --- | --- |
| Rollback can reportedly remain on `低档正在接管现场` / `读取行动` | `unverified`; no preserved runtime reproduction log and no claim of resolution | [rollback-action-stuck.md](.trae/specs/hogwarts-documentation-governance/evidence/rollback-action-stuck.md) |

An unverified investigation is not runtime authority and cannot authorize a
code change. Reproduction and implementation require a separate registered,
approved change.

## Legacy Change Archives Without A PRD

These directories predate the current five-artifact rule. They are historical
records, not active PRDs:

- `.trae/specs/add-calendar-storyline-system/`
- `.trae/specs/add-save-guard-npc-identity/`
- `.trae/specs/expand-social-relationship-model/`
- `.trae/specs/item-system-v2/`
- `.trae/specs/modularize-hogwarts-mud-client/`
- `.trae/specs/separate-local-presence-witnesses/`
- `.trae/specs/stabilize-relational-memory-prompts/`

Reopening one for new scope requires a current `prd.md`, all five mandatory
artifacts, and explicit approval. Do not edit a historical spec into current
authority.

## Registry Maintenance

Update this file in the same change whenever:

1. a new `.trae/specs/<change-id>/prd.md` is created;
2. a PRD enters research, approval, implementation, blocked, completed,
   superseded, or archived status;
3. a scope revision invalidates prior approval;
4. an active PRD is replaced by another stable change ID;
5. a living-authority path changes.

Closeout fails when:

- an active or research PRD has no registry row;
- one PRD appears in multiple status sections;
- a row points to a missing PRD;
- registry status contradicts the PRD or progress evidence;
- behavior is specified only in this registry instead of the owning PRD.
