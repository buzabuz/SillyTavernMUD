# Paid Model Response Preservation Audit

Status: current production evidence after the user's 2026-08-16 invariant.

This document supports Revision 4 research. It does not authorize
implementation.

## User-Approved Invariants

1. Regex may enforce only character-level or finite-grammar rules. It must not
   decide what natural-language prose means.
2. Content returned by a paid role-model request must never be swallowed.
   Parse, adoption, settlement, validation, Reducer or persistence rejection
   may deny world authority, but may not turn a received response into "no
   model result" for the user.
3. Model response evidence and world authority are orthogonal:
   - response evidence proves what the paid model returned;
   - accepted canonical records prove what may enter State, Prompt, Knowledge
     and future gameplay.
4. No failure permits an automatic second model request.

## Current Shared Violation

The scheduler/model adapter returns response content to each workflow but owns
no durable response receipt.

Turn diagnostics cannot preserve it:

- `runtime/turn-diagnostics.js` marks `content`, `raw`, `segments` and
  `invalidOutput` as sensitive keys and removes them;
- diagnostic strings are truncated to 2,000 characters;
- only the latest eight diagnostic histories survive.

Scene Performance records only `rawCharacters`. On parse, output-contract,
settlement or final validation failure, the workflow records the error and
throws. The outer Turn failure attaches diagnostics to the player message and
persists `turn.status=failed`; no assistant response is saved.

## Active Paid Task Matrix

| Task | Output kind | Current received-content fate on downstream failure | Current user result |
| --- | --- | --- | --- |
| `character_polish` | prose utility | non-empty content is shown; no downstream content validator | content shown on success |
| `opening_world` | structured JSON | parse, language adoption or package validation failure discards raw response | initialization error only |
| `calendar_high` | structured JSON | parse/adoption/validation failure discards raw response | task failure/status only |
| `calendar_medium` | structured JSON | parse/adoption/validation failure discards raw response | task failure/status only |
| `interior_cartographer` | structured JSON | parse/adoption/validation failure discards raw response | generation failure/status only |
| `pacing_director` | structured JSON | parse/normalization/validation failure discards raw response | pacing error/status only |
| `scene_performance` | narrative JSON | any parse/contract/settlement/semantic/final validation failure discards complete response | player message plus error; no assistant result |
| `scene_transition` | structured JSON | parse/adoption/normalization/validation failure discards raw response | transition error/status only |
| `scene_opening` | narrative JSON | parse/segment/authority validation failure discards complete response | opening/transition error; no opening result |
| `social_director` | structured JSON | parse/normalization/cursor/resolver/Reducer failure discards raw response | Social status/error only |
| `map_expansion` | structured JSON | parse/adoption/validation failure discards raw response | toast error only |

Ten of eleven active paid tasks can receive non-empty content and later discard
it. Character polish has no downstream semantic validator and is the only
non-violating path for received content.

## Target Evidence Contract

Every paid role request creates an immutable response receipt as soon as any
content is received, before parse/adoption/validation:

```text
PaidModelResponseEvidenceV1
{
  responseId
  taskId
  actionId
  tier
  mode
  contentType
  content
  receivedAt
  completion: complete | partial
  authorityStatus:
    received | accepted | partially_accepted | rejected
  terminalStage:
    transport | parse | adopt | normalize | resolve | validate | reduce | commit
  errorCode
}
```

`content` is the complete model-visible content channel returned by the
provider. It is not Prompt, hidden reasoning, provider credentials or request
metadata. It is not truncated or evicted.

Streaming rules:

- each progress chunk updates one in-memory receipt candidate;
- successful stream completion persists the complete content;
- a stream/transport failure after non-empty partial content persists that
  partial content with `completion=partial`;
- zero received characters produce no fake response receipt.

## Visibility Contract

### Narrative tasks

`scene_performance` and both `scene_opening` modes:

- recoverable narration/dialogue is saved and rendered even when State
  proposals or final validation fail;
- rejected content is visibly marked as model response evidence, not committed
  world authority;
- State remains unchanged unless the deterministic proposal transaction
  independently passes;
- accepted and rejected segments use the ordinary localization route; English
  source remains available only through the explicit source action;
- an unrecoverable raw payload remains available through an explicit
  "view original model response" control rather than replacing it with a
  generic error.

### Structured Director tasks

Opening World, Calendar, Interior, Pacing, Scene Transition core, Social and
Map:

- raw structured output is not inserted into story prose;
- a localized response-receipt row is visible in the relevant task/error
  surface;
- the full original output is available through an explicit collapsed source
  control;
- rejection status and stage are separate from the original content.

Character polish continues to show returned prose directly and receives the
same durable receipt semantics.

## Authority And Isolation

Response evidence is:

- user-visible and durable;
- excluded from State authority;
- excluded from all Prompt builders;
- excluded from Knowledge projection and embedding;
- excluded from Event/Appraisal/Social evidence;
- excluded from Calendar, Map, Item, Actor, Spell and Scene reducers;
- excluded from Scene archive story message IDs unless it is a narrative
  evidence message intentionally rendered in that Scene;
- never used as migration or repair authority.

Validation may classify structured proposals as accepted/rejected, but it
cannot delete, truncate, overwrite or hide the receipt.

## Persistence Finding

No current persistent field can safely own the full response:

- `modelTaskRuntime` explicitly forbids Prompt/response content;
- `turnDiagnostics` is bounded and strips content;
- world State must not contain raw model evidence;
- TranslationTable and Knowledge are the wrong authorities.

A new durable response-evidence owner is required.

Dedicated chat records were rejected by the follow-up production audit:

- host chat completion includes them unless a non-persisted Symbol flag is
  present;
- Scene Transition copies recent `message.mes` into its Prompt;
- failed-turn/retry recovery depends on final chat-row positions;
- global extensions and localization scan chat text;
- appending records changes future message/source indices.

The current target is a separate authenticated per-timeline response ledger
under user files. See [response-ledger-design.md](./response-ledger-design.md).

## Frontend Registry Impact

Required new rows:

- paid response receipt localized shell/status;
- narrative rejected-evidence segments;
- explicit original model response control and raw technical source panel.

Normal zh-CN steady state cannot expose English/JSON by default. Raw source is
shown only after the explicit source action.
