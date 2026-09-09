# Production Baseline

Date: 2026-09-09. Status: current-code measurements, NOT new implementation
acceptance. Owner: [PRD](../prd.md), [Progress](../progress.md).

## Retained Incident

- Representative Hogwarts chat: current State revision 399, completed turn 111.
- Latest player turn diagnostics: `turn-1d74bcf9-d922-4617-a33c-261b5824e021`.
- Recorded Scene response: 1,717 characters.
- Failure: missing `signals.sceneProgression`; no automatic retry.
- Recorded original request: System 26,922, User 19,185, total messages 46,107.
- Current player message is last; preceding Scene 236 has a committed transaction
  and no pending Post envelope. That previous Post succeeded; this is a later
  Scene-admission failure.
- No original failed response text is available from the persisted diagnostics.
  Do not claim exact replay or recover missing text from character count.

## Build-Only Method

Read representative JSONL, clone header State, call exported production
`createTurnPerformanceWorkflow().createScenePerformancePrompt()` with current
production context/environment/spatial/addressing/Item/Pacing helpers.
Use the latest saved player's local adjudication and addressing. Pass an empty
retrieval result: no live Knowledge or embedding request. The resulting sizes
match recorded incident diagnostics, but this is not a new live RAG validation.

For Post, clone the latest committed Scene transaction (message 236) and preceding
player action with current State. Execute `createLocalSemanticAdapter()` only
until injected dispatch interception. Capture the production-built input and
measure with `assemblePostTurnSemanticPrompt()`. Interception deliberately throws
`BUILD_ONLY_DISPATCH_INTERCEPTED`; any resulting provider-failure object is not a
real provider result. This is a representative current build, not a historical
Post replay and not the missing failed Scene's body.

Both methods run in a separate Node process with global network requests rejected.
No save ports are supplied. The original JSONL is read again and compared exactly.
No migrated save or fake response is written.

## Measurements

| Envelope | System | User | Transport schema | Wrapper | Total chars | Capacity |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Scene | 26,922 | 19,185 | 0 | 61 | 46,168 | 298,080 |
| Low Post | 8,029 | 5,818 | 6,529 | 20 | 20,396 | 298,080 |
| Local Post, official assembler | 6,998 | 5,740 | 4,399 | 221 | 17,358 | 28,672 |

Local's standalone generic message measurement is 17,139 because it omits the
real Local wrapper. Only the official assembler's **17,358** is capacity evidence.

- Scene/Low selected slot: context 120,000; response reserve 12,000.
- Local capacity: context 8,192; response reserve 1,024; estimate 4 chars/token.
- Scene/Low estimate: 3 chars/token as configured by the current budget function.
- Scene inline output schema region: 2,714 characters (already in System total).
- No Post optional compaction occurred for either measured provider.
- Complete Scene messages SHA-256:
  `b5450c994faa2dfcbda308981de3363ba5f43c28a543f4ba1fc8dcae2f59376f`.

Scene User sections (values only; keys/separators account for remaining bytes):

| Section | Characters |
| --- | ---: |
| playerTurn | 804 |
| sceneFacts | 12,918 |
| actorCards | 2,031 |
| actionOpportunities | 2,408 |
| memoryActivations | 645 |
| prohibitions | 276 |

Two largest Actor cards: 1,239 and 789 characters.

Low Post input values: narrativeSegments 2,881; room 1,408; actors 703;
localPresence 263; playerTurnSequence 145; existingActorPresence 83; targetActorIds
24; playerAction 21; clock 20; movementPreflight 4; elapsedMinutes 2; each
Item/Identity candidate list 2. User-object keys account for the remainder.

Result: all current measured envelopes fit, zero actual model/network requests,
source JSONL unchanged. No after-change prompt or extraction-success claim.

## Baseline Self-Tests

Executed:

```sh
node --test \
  tests/hogwarts-mud-post-failure-isolation.test.mjs \
  tests/hogwarts-mud-post-settlement-safety.test.mjs \
  tests/hogwarts-mud-post-provider-selection.test.mjs \
  tests/hogwarts-mud-turn-protocol.test.mjs \
  tests/hogwarts-mud-turn-validation.test.mjs
```

Result: **56 tests, 56 pass, 0 fail, 0 skipped**. Exit code 0.
Expected provider-error logs are injected failure fixtures, not paid requests.
These test current contracts; proposed behavior still needs implementation.

Separate current-gate reproduction called exported
`validateLowScenePerformanceOutputContract()` with one 65-character narration
and `{requireSceneProgression:true}`. Asserted `valid === false` and the sole
error requiring `signals.sceneProgression`. Exit code 0; zero model calls.
This demonstrates the existing defect boundary, not the new acceptance behavior.

## Specification Checks

Node assertions checked seven packet files, all 33 relative links, all 13
`NFP-A01` through `NFP-A13` criteria represented in checklist, and exactly one
Product Spec registry row. Passed. `git diff --check` passed.
NFP-00 was then marked completed; runtime tasks remain pending approval.
These checks verify artifacts only, not runtime correctness.
