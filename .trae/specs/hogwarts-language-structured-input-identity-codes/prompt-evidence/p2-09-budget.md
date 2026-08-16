# P2-09 Prompt and Knowledge Budget Evidence

Date: 2026-08-15

Status: build-only acceptance passed against the P2-08 in-memory Tina
migration. No model or network request was issued.

Command:

```text
node .trae/specs/hogwarts-prompt-payload-consolidation/measure-prompts.mjs
```

Archive:

```text
SHA-256: e54d136c1260e31c3d2145a66d7b6873495de65774f9a431c19a065d2c2df7ac
bytes: 7180015
SHA/mtime unchanged: true
```

## Role Prompts

| Prompt | Actual chars | Hard target | Result |
| --- | ---: | ---: | --- |
| Scene Performance | 45,436 | 47,626 | pass |
| Scene Transition | 73,579 | 76,100 | pass |
| Scene Opening | 26,071 | 28,319 | pass |
| High Calendar | 11,589 | 14,358 | pass |
| Medium Calendar | 36,684 | 36,893 | pass |
| Social | 79,443 | 80,000 | pass |
| Map Expansion | 22,216 | 39,344 | pass |
| Host System Injection | 19,224 | 19,319 | pass |

Supplemental active prompts:

```text
Opening World: 11859
Pacing: 7528
Interior Map: 3178
Bootstrap Scene Opening: 18909
Character Polish: 1032
```

No captured Prompt key ends with `.repair1` or `.repair2`.

## Local Tasks

Local targets are applied to model-visible message content; transport Schema
is reported separately.

```text
Pre-turn: 7227 chars message / 8375 transport
Post-turn: 9440 chars message / 13474 transport
Inventory: 7778 chars message / 9252 transport
Appraisal: 2310 chars message / 3009 transport
Translation: 1513 chars message / 1633 transport
```

## Removed Duplication

- Scene Performance/Transition/Opening no longer repeat
  `authoritySnapshot.currentActors` beside their role-owned Actor cards.
- Medium Calendar and Scene Transition omit default-public access labels while
  retaining every non-public access constraint.
- Social omits empty optional relationship fields while retaining IDs,
  dimensions, event kinds and non-empty structural/emotion effects.
- Map Expansion uses a purpose-specific map directory and excludes room
  Material State and Actor spatial State.
- Map Expansion receives the bounded Character V2 English projection rather
  than `inputEvidence + canonicalEn`.
- Character Polish receives source input facts and excludes the previous
  model-generated polished background.
- Host Character JSON and Campaign code authority are compact; static display
  labels are absent.
- Knowledge transcript projection reads only `segments[].textEn`; raw model
  evidence is skipped and `sourceEn` is no longer a runtime fallback.

Focused prompt/Map/Scene/Social tests passed. The old
`application wiring schedules Medium...` test still fails only on the known
`index.js` content-line excess which the user explicitly ordered not to change;
it is not acceptance evidence for this task.
