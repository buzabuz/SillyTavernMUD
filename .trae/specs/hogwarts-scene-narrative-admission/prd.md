# Scene Narrative Admission PRD

## Change ID and Status

- Change ID: `hogwarts-scene-narrative-admission`
- Status: L3 implemented and independently accepted
- Change kind: fix
- Feature delta: 0
- Core change: yes

## Problem and Evidence

A Calendar Moment to `Lunch in the Great Hall` reached the configured Medium
provider and produced an English Scene Transition package. The following Low
Scene Opening returned seven valid narrative segments. The runtime rejected the
entire transition solely because the opening validator required `2-6`
segments.

This is not a safety, authority, schema, destination, or configured-capacity
failure. It is a fixed prose-quality target incorrectly used as a hard
eligibility gate. Other Scene Transition and Opening paths use the same
pattern for segment, word, and character counts.

## Before

| User workflow | Current result | State and call result |
| --- | --- | --- |
| Calendar Moment receives a valid seven-segment Low opening | The scene reports failure. | One Medium and one Low call complete; no Scene, clock, Calendar, archive, or message commit occurs. |
| Ordinary Scene Transition produces a prose field outside a fixed quality range | The whole transition can fail. | Existing model call is spent; no transition commits. |
| Bootstrap Opening produces 7 segments or 421 words | The opening can be rejected. | The world package remains unrendered. |

## After

| User workflow | Target result | State and call result |
| --- | --- | --- |
| Calendar Moment receives a valid seven-segment Low opening | The opening renders and the Moment completes. | The existing one Medium and one Low call proceed to normal guarded commit. |
| Ordinary Scene Transition prose misses a quality range | The transition continues when all retained hard checks pass. | Existing writers commit normally; no added call, retry, or fallback. |
| Bootstrap Opening prose misses a quality range | The opening renders when all retained hard checks pass. | Existing opening message writer behaves normally. |

## In Scope

- Low Scene Opening segment-count targets:
  - `2-6` bootstrap output segments;
  - `2-6` post-transition output segments;
  - `2-8` post-opening transition-package revalidation.
- Bootstrap Opening total-word target: `180-420`.
- Scene Transition prose targets:
  - `globalChronicleSummaryEn` `40-80` words and `640` characters;
  - `authorQuillEn` `40-500` words;
  - `nextScene.explorationHookEn` `6-60` words.
- Removal of automatic padding, truncation, or merging that exists only to
  satisfy those targets.
- Prompt wording and bounded diagnostics may retain these values as quality
  guidance, but they must not reject valid output.

## Non-Goals

- No changes to configured role-slot capacity or the public scheduler.
- No changes to provider, call count, retry, repair, fallback, queueing, or
  model residency.
- No changes to JSON object shape, allowed keys, required text, English
  authority, dialogue speaker identity/presence, destination, map, clock,
  Scene ID, or authority checks.
- No changes to any State-writing count limit, including `actorStates`,
  `temporalFactsEn`, Item, relationship, Map, Calendar, Event, Memory, or
  Story proposals.
- No changes to Bootstrap World `scene.explorationHookEn`; it belongs to a
  separate State-writing route.

## Runtime Contract Impact

The following model-field routes change from hard quality gates to nonblocking
quality targets:

- `scene_opening.bootstrap.result.segments`
- `scene_opening.transition.result.segments`
- `scene_transition.result.globalChronicleSummaryEn`
- `scene_transition.result.authorQuillEn`
- `scene_transition.result.nextScene.explorationHookEn`

Their message and Scene writers remain unchanged. Structural, language,
authority, and State-writing checks remain the only rejection paths.

## Migration and Compatibility

No stored-State migration is required. Existing persisted Scene openings,
chronicle entries, author comments, and exploration hooks remain valid.
Historical outputs are not rewritten.

## Prompt Field Budget

No Prompt field is added. Existing segment and word targets remain
nonblocking Prompt guidance. The hard total request boundary remains the
selected role slot's configured
`createContextBudgetPlan(...).maxPromptCharacters`.

The known Calendar Moment request measured 102,997 characters against a
configured Medium runtime ceiling of 298,080 characters. This change adds no
request and does not alter that calculation.

## Frontend Field Whitelist

None. Existing Calendar and Scene error renderers continue to show workflow
outcomes. This change only prevents an invalid backend rejection from being
raised for quality-target misses.

## Acceptance Criteria

1. Valid Low Scene Opening output with more than six segments reaches the
   normal transition commit path without a second model call.
2. Valid Bootstrap Opening output outside the former segment or word targets
   reaches the existing opening message writer.
3. An absent `authorQuillEn`, or a valid
   `globalChronicleSummaryEn` / `authorQuillEn` /
   `explorationHookEn` outside the former quality targets, cannot reject an
   otherwise valid Scene Transition.
4. A missing `explorationHookEn` does not reject or synthesize an otherwise
   valid Scene Transition; when present, it remains subject to English
   authority adoption.
5. Empty or malformed required text, non-English authority content, invalid
   dialogue actors, invalid destinations, invalid clocks, duplicate Scene IDs,
   and all State authority guards continue to reject with no commit.
6. The 2-8 post-opening revalidation and all target-only padding, truncation,
   or segment-merging logic are absent.
7. No workflow gains a retry, repair, fallback, extra provider request, or
   new State writer.
8. A seven-segment Low opening is accepted through the production validator
   path without a provider call when all retained hard checks pass.

## Risks and Rollback

More verbose but otherwise valid prose may now be written to existing message
and Scene fields. Total provider request capacity remains enforced before
dispatch, and the retained structural and authority checks still prevent
invalid world changes.

Rollback restores the former quality rejection gates only; it requires no data
migration.

## Approval

The user explicitly approved this exact scope on 2026-08-22:

> "本次就做这些。硬拦截都给我删了。"

Implementation approval requires review of this PRD, `spec.md`, `tasks.md`,
and `checklist.md` as one revision.
