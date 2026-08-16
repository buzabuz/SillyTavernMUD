# Paid Response Evidence UI Contract

Status: Revision 4 design candidate; not approved for implementation.

## User Outcome

After a paid model returns any content, the user never sees only a generic
failure with no result.

The UI separates:

```text
what the model returned
what the rules layer accepted
what the world actually committed
```

## Global Response Panel

A persistent "Model responses" action is available from Hogwarts Home/Setup
and Game chrome. It opens one chronological response panel for the current
timeline.

Each row shows:

- localized task name;
- received timestamp;
- complete/partial status;
- accepted/partially accepted/not written status;
- terminal stage as a localized stable label;
- contextual "go to result" action when a surface reference exists;
- explicit original-response action;
- retry-save and download actions only for an unsaved receipt.

Successful structured responses remain collapsed. Rejected and partial rows are
visually distinct and remain until the user leaves the timeline; they are not
auto-dismissed.

The panel is a full-width operational surface, not nested cards.

## Narrative Evidence

For Scene Performance and Scene Opening:

```text
player action / opening anchor
-> projected response segments
-> translated narrative/dialogue
-> persistent authority status band
```

Status examples:

```text
模型内容已保留，世界状态未写入
模型内容已保留，部分状态已写入
模型响应只收到一部分
```

The response body is never replaced by the status or validator error. Detailed
authority error is secondary and collapsed.

Rejected narrative:

- is rendered from the response ledger, not appended to canonical chat;
- does not receive a canonical message ID;
- is not included in Scene archive canonical transcripts, Knowledge or Social;
- may appear in an explicit archive evidence section linked by response ID;
- remains available after reload.

Complete recoverable English segments use TranslationTable identities:

```text
recordKind = model_response_segment
recordId = <responseId>:<segmentIndex>
fieldPath = textEn
```

Unrecoverable or partial content remains available through the source panel.

## Structured Tasks

| Task surface | Contextual access |
| --- | --- |
| Character polish | editable textarea plus response-history action |
| Opening World | initialization error/status area |
| High/Medium Calendar | Calendar status/detail area |
| Interior Map | Map generation status |
| Pacing | global response panel and Status diagnostics |
| Scene Transition core | transition dialog/status |
| Social | Relationship/Status diagnostics |
| Map Expansion | Map Inspector status |

Contextual access opens the exact ledger row. Full JSON is never inserted into
story prose.

## Original Source

The original-response control uses a familiar source/code icon with a tooltip.
It opens a dedicated scrollable panel:

- exact content in a text-only `<pre>`;
- no HTML interpretation;
- copy and download controls;
- localized task/status metadata;
- no Prompt, reasoning or credentials.

Raw English/JSON is hidden in normal zh-CN state and appears only after this
explicit action.

## Unsaved Receipt

If the paid response arrives but ledger persistence fails:

1. content is held in page-session memory;
2. the response panel opens automatically;
3. status says the response is not yet saved;
4. State settlement is blocked;
5. user may retry saving, copy or download the exact content;
6. retry invokes only the ledger API, never the model;
7. navigating away requires an explicit data-loss confirmation while any
   unsaved response exists.

No successful saved indicator is shown until read-back verifies the
`responseId` and `contentHash`.

## Accessibility And Layout

- status uses icon plus text, never color alone;
- raw source control has an accessible name and tooltip;
- response body and status never overlap;
- long task/error labels wrap;
- source panel uses bounded viewport height and internal scrolling;
- focus moves to newly opened failed response and returns to its trigger;
- partial/unsaved states are announced through an `aria-live` status region;
- no raw internal ID is visible outside the explicit source panel.

## Frontend Registry Rows

Proposed stable rows:

```text
GEN-003 paid response panel row/task/status
GEN-004 partial/unsaved receipt status and deterministic recovery actions
GEN-005 explicit original model response source panel
MSG-016 rejected/partially accepted narrative response segment
```

Routes:

- `GEN-003`: `STATIC`;
- `GEN-004`: `STATIC`;
- `GEN-005`: `STATIC/ALLOW`, where `ALLOW` is exact source only after explicit
  source action;
- `MSG-016`: `YES` through `model_response_segment`.

These rows remain failed/unimplemented until browser acceptance marks their
actual routes current.
