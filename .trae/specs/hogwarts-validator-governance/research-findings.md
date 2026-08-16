# Validator Governance Research Findings

Status: current production reconnaissance, 2026-08-16.

This document is supporting evidence for [prd.md](./prd.md). It does not
authorize implementation.

## 1. Executive Findings

1. The previous Turn drift incident is fixed. Current Prompt prose, raw output
   allowlists, settlement fold, final validator and focused regression test all
   agree on `firstImpressionOfPlayerEn` and forbid `impressionOfPlayerEn` and
   `memoryUpdate`.
2. Turn still has at least four independently encoded contract layers across
   `turn-performance.js`, `turn-protocol.js` and `turn-validation.js`. The risk
   is real, but the current defect is duplication rather than active mismatch.
3. Social `eventRef/appraisalRef/localReportId` are transient proposal
   references. The resolver maps them to stable
   `eventId/appraisalId/sourceEventIds` only after creating committed Event and
   Appraisal identities. This is an intentional stage boundary, not a naming
   drift to erase.
4. Local standalone Appraisal already uses `sourceEventIds` consistently in
   its JSON Schema, Zod Schema, Prompt and domain validator.
5. The production `MODEL_TASK_REGISTRY` does not contain the Prompt builder,
   response Schema, validator, reducer, retry policy or failure policy claimed
   by the accepted technical spec and living runtime contract. Workflows still
   own and invoke these boundaries separately.
6. The largest unmanaged risk is semantic regex, not validator return shape.
   Regex currently rejects prose, gates local-model calls, overrides local-model
   perception, and can affect Item, Identity, Spell and Calendar behavior.
7. Embedding is currently confined to Knowledge candidate retrieval. Candidate
   records are canonically hydrated and rechecked for revision, ACL, clock and
   supersession before Prompt use. This boundary is sound.

## 2. Active Model-Output Inventory

There are 16 active model tasks: 11 role-model tasks and 5 local tasks.

| Task | Raw contract | Transform/adoption | Final deterministic boundary |
| --- | --- | --- | --- |
| Character polish | free text | display text only | non-empty text |
| Opening World | Prompt literal JSON | language adoption | `validateOpeningWorldPackage` then reducer |
| High Calendar | Prompt literal JSON | record language adoption | validator normalizes and returns merged Calendar |
| Medium Calendar | Prompt literal JSON | record language adoption | validator normalizes and returns merged Calendar |
| Interior Cartographer | Prompt literal JSON | language adoption | `validateGeneratedInteriorMap` |
| Pacing | Prompt literal JSON | default-filling normalizer, language adoption | `validatePacingAssessment` |
| Scene Performance | Prompt literal JSON | language filtering, settlement fold and sanitization | raw-contract validator, scene validator, transaction validator |
| Scene Transition | Prompt literal JSON | normalizer deletes/synthesizes fields | `validateSceneTransitionPackage` |
| Scene Opening | Prompt literal JSON | segment language partition | low opening validator plus transition validator |
| Social Director | transport JSON Schema | language filtering, report/Appraisal/ref resolver, partial proposal rejection | simulated full V3 apply and State assertion |
| Map Expansion | Prompt literal JSON | language filtering | `validateMapProposal` |
| Local pre-turn | JSON Schema plus hand-written Zod | language adoption | adapter bounds and deterministic fallback |
| Local post-turn | JSON Schema plus hand-written Zod | language filtering and regex reconciliation | evidence, ID and State checks |
| Local inventory | JSON Schema plus hand-written Zod | language filtering and regex projection | Item validator/reducer |
| Local Appraisal | JSON Schema plus hand-written Zod | language filtering | Appraisal validator returns canonical value |
| Local translation | JSON Schema plus hand-written Zod | marker restoration and text normalization | exact marker/key-set checks |

## 3. Contract Duplication

| Domain | Current independent encodings | Current state |
| --- | --- | --- |
| Turn Performance | Prompt literal; `LOW_*_KEYS`; proposal-type fold; actor sanitize allowlist; final actor allowlist | aligned now; highest drift exposure |
| Social | workflow transport Schema; server contract constants; resolver input checks; persisted V3 contract | transient and persisted stages are semantically different; shared enums still duplicate |
| Local Appraisal | Prompt rules; JSON Schema; Zod Schema; `APPRAISAL_PROPOSAL_KEYS` | field names aligned; mechanically duplicated |
| Local pre/post/inventory/translation | JSON Schema and Zod Schema in one server module | aligned by tests; mechanically duplicated |
| Calendar High/Medium | Prompt literal; proposal root constants; record field constants/normalizers/validators | child record constants are shared in code; Prompt remains hand-written |
| Pacing | Prompt literal; payload/intervention constants; causal-state constants | normalizer supplies omitted defaults before validation |
| Opening/Transition/Opening prose/Map/Interior | Prompt literals plus local validators | no shared executable output descriptor |

The previous "copy count" framing is useful only within one stage. It becomes
misleading when it treats a transient proposal and a persisted record as the
same contract.

## 4. Transforming Boundaries

These functions are not simple predicates:

| Boundary | Behavior |
| --- | --- |
| `adoptLowPerformanceLanguage` and other adoption functions | remove non-English canonical proposals or fields while preserving diagnostics |
| Turn settlement fold/reconciler | drops invalid proposals, derives summaries, redirects Canon IDs, removes unapproved fields and emits warnings |
| `normalizeMemoryConsolidationPayload` | silently removes invalid or duplicate memory reviews before the ordinary validation call |
| Social V3 graph | resolves transient refs, creates stable IDs, clamps/applies deltas and returns accepted/rejected proposal partitions |
| Calendar proposal validators | normalize records, construct the candidate merged Calendar and return the exact `.calendar` later committed |
| `validateAppraisalProposal` | constructs stable ID/provenance and returns the canonical `.value` consumed by the reducer |
| `validatePerceptionContract` | normalizes and returns the canonical `.value` |
| Scene Transition normalizer | supplies clock/summary defaults, deletes retired fields and repairs following-scene intent |
| Item reducer | skips invalid operations; `destroy` may infer `physicalForm` from free-text evidence |

The governance vocabulary must distinguish `parse`, `adopt`, `normalize`,
`resolve`, `validate`, and `reduce`. A universal `{valid, errors}` return shape
would erase necessary products such as a canonical value or resolved graph.

## 5. Semantic Regex Hotspots

| Risk | Current regex role | Production consequence |
| --- | --- | --- |
| Critical | Item destruction prose infers `physicalForm=remains|absent` | changes holder/location legality and persisted Item state |
| High | `narrative-authority.js` classifies current fact, belief/history, Item possession, Actor action/life/room and Spell identity | hard-rejects Turn and Opening prose |
| High | Scene Opening classifies promises, secrets, relationship changes and Item transfers | hard-rejects generated opening prose |
| High | deterministic perception fallback classifies private/public events and can override a valid local-model perception | changes witness scope and Event knowledge |
| High | injury/departure/event-boundary regex rechecks or synthesizes local observer output | can write or omit Identity and Actor Runtime changes |
| High | Item significance, acquisition and operation grounding regex filters local inventory output | can silently omit candidates or operations |
| High | Spell observation/teaching and custom-spell independence regex | can trigger checks or write Spellbook learning |
| Medium | explicit Calendar commitment regex | decides whether Medium Calendar runs |
| Medium | inventory keyword gate | decides whether the local inventory model is called at all |
| Low | Knowledge intent regex | selects extra retrieval subqueries; direct retrieval remains present |
| Appropriate | IDs, clocks, markers, placeholders, exact DSL directives and Han-script detection | decides character-level grammar only |

## 6. Responsibility Boundary

### Deterministic Schema and Code

Own exact JSON shape, key sets, types, enums, size/count bounds, stable IDs,
reference existence, revision, cursor prefix, ACL, source-ref membership,
topology, reachability, State transitions, arithmetic clamps, deduplication and
Reducer invariants. It also verifies that a model-supplied evidence span is an
exact substring of an authorized source.

### Regex and Lexical Parsing

Own only properties whose truth is defined by characters or a finite grammar:
stable ID syntax, date/clock syntax, marker identity, exact command/directive
syntax, placeholder-only text and script/language adoption checks.

Regex may cheaply add retrieval candidates. It must not be the sole reason to
reject prose, suppress required semantic work or write a business fact.

### Embedding

Own semantic candidate recall and ranking over committed canonical records:
Knowledge retrieval, fuzzy entity/source candidates and optional near-duplicate
candidates. Every candidate must be rehydrated from current authority and pass
deterministic revision, ACL, source and State checks.

Embedding similarity is not truth, provenance, contradiction, equality or
authorization. A threshold alone must never reject a model response or mutate
State.

### Local Semantic Model

Own meaning-dependent classifications over free language: enacted intent,
event boundary, observable material/Actor/Identity change, perception scope,
Item significance and operation meaning, subjective Appraisal, social event
kind/effect, explicit commitment, prose claim extraction and contradiction
classification.

The model emits bounded enums, stable refs and exact evidence spans. It never
commits State; deterministic validation and the owning Reducer remain final.
Any additional task or field requires an approved Prompt budget and one-request
failure contract.

## 7. Recommended Phasing

1. Governance first: make the model-task inventory accurately name each raw
   Schema, transform chain, final validator, reducer and failure policy.
2. Separate names and contracts for transforming boundaries before changing
   behavior. Do not force them into predicate returns.
3. Remove contract duplication domain by domain, starting with Turn, while
   preserving transient-to-persisted Social mappings.
4. Treat semantic-regex migration as a separate behavior phase. Prioritize
   Item physical form, perception/Identity/Spell writers and hard prose
   rejection before scheduling heuristics.
5. Keep embedding retrieval-only unless a later approved design uses it to
   propose candidates for deterministic or semantic adjudication.

## 8. Verification

Focused model-free command:

```text
node --test tests/hogwarts-mud-turn-protocol.test.mjs \
  tests/hogwarts-mud-turn-validation.test.mjs \
  tests/hogwarts-mud-narrative-authority.test.mjs \
  tests/hogwarts-mud-social-v3.test.mjs \
  tests/hogwarts-mud-memory-synapse.test.mjs \
  tests/hogwarts-mud-calendar-reducer-projection.test.mjs \
  tests/hogwarts-mud-high-calendar-director.test.mjs \
  tests/hogwarts-mud-medium-calendar-director.test.mjs \
  tests/hogwarts-mud-model-language-adoption.test.mjs \
  tests/hogwarts-mud-prompt-payload-consolidation.test.mjs
```

Result: `111/111` passed, `0` skipped, `0` todo.
