# Scene Narrative Admission Technical Spec

## Approved Technical Boundary

This change removes only fixed prose count, word, and character targets as
rejection conditions. It does not relax model-response shape, language,
authority, destination, or State-writing validation.

```text
model response
  -> parser and language adoption
  -> structural and authority validation
  -> existing writer

quality targets:
  Prompt guidance + bounded diagnostics only
  never a rejection, truncation, padding, or merge trigger
```

## Affected Routes

| Route | Current hard behavior | Target behavior |
| --- | --- | --- |
| `scene_opening.bootstrap.result.segments` | Rejects fewer than 2 or more than 6 segments; rejects outside 180-420 words. | Preserve all valid segments. Count and words are nonblocking quality metadata. |
| `scene_opening.transition.result.segments` | Rejects fewer than 2 or more than 6 segments. | Preserve all valid segments. Count is nonblocking quality metadata. |
| `nextScene.openingSegments[]` | Revalidates 2-8 segments and normalizer truncates to 8. | No count rejection or truncation. Retained segment shape/authority checks remain. |
| `scene_transition.result.globalChronicleSummaryEn` | Rejects outside 40-80 words or 640 characters. | Requires nonempty English authority only. Quality target is diagnostic. |
| `scene_transition.result.authorQuillEn` | Rejects outside 40-500 words. | Optional field. Absence and word range are nonblocking; supplied prose remains subject to English authority adoption. |
| `scene_transition.result.nextScene.explorationHookEn` | Rejects outside 6-60 words; normalizer pads/truncates. | Optional field. Absence is valid and remains absent; when supplied, English authority adoption applies. No padding, empty-value synthesis, or truncation. |

## Retained Hard Contract

The implementation must continue to reject:

- non-object or malformed model responses;
- unknown root or segment keys;
- unsupported segment kinds;
- empty text;
- non-English authority output;
- dialogue attributed to an absent or unknown actor;
- invalid or duplicate Scene IDs;
- invalid clock or duration;
- unknown map/room and explicit-destination mismatch;
- invalid life-state, first-impression, actor, Item, Calendar, Map, Event,
  Memory, relationship, and other State-writing proposals;
- narrative authority contradictions and uncommitted-fact violations.

## Implementation Rules

1. Remove fixed quality tests from:
   - `validateBootstrapSceneOpening()`;
   - `validateLowSceneOpeningOutput()`;
   - `validateSceneTransitionPackage()`;
   - any persisted-chronicle validator that repeats the same fixed limit.
2. Remove `explorationHookEn` padding/truncation and
   `openingSegments.slice(0, 8)` from
   `normalizeSceneTransitionPackage()`.
3. Delete the unapproved `compactLowSceneOpeningSegments()` workaround and
   its test. It mutates paid model output to fit a target that is no longer an
   eligibility rule.
4. Preserve Prompt instructions for the preferred prose shape. They remain
   quality guidance, not a retry/repair condition.
5. Do not add a repair Prompt, retry, alternate provider, or fallback.
6. Do not introduce a replacement static cap. The selected role slot remains
   the only whole-request capacity boundary.

## Writer and Failure Semantics

| Result | Writer | State behavior |
| --- | --- | --- |
| Quality target missed, retained hard checks pass | Existing Scene Transition reducer and/or opening message writer | Normal existing commit. |
| Retained hard check fails | None | Existing no-commit behavior. |
| `languageSkipped` Medium/High transition | None | Calendar/Timeline Moment stops before Low Opening and persistence. |

## Verification Design

- Focused regression: a seven-segment Low Opening is accepted through the
  production opening validation path.
- Boundary regressions: 1 segment, 7 segments, 9 segments, short text, and
  long text each pass when all retained hard checks pass.
- Negative regressions: malformed root/segment, empty text, non-English
  authority, invalid dialogue actor, invalid destination, invalid clock, and
  invalid State proposal still fail with no write.
- Run Scene Transition, Calendar Moment, Calendar UI, Bootstrap Opening, and
  affected diagnostics suites without provider requests.
- Restart the local preview server and perform a no-request health check.

## Runtime Contract References

- `model-field-routes.md`: Scene Narrative Admission Routes.
- `state-fields.md`: `scene`, `globalChronicle`, and
  `extra.hogwartsMud.segments[]` retain their existing writers.
- `VCON-008`: Scene Transition package.
- `VCON-009`: Scene Opening message.
- `VCON-031`: role-slot capacity remains unchanged.
