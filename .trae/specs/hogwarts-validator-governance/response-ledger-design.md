# Paid Model Response Ledger Design

Status: Revision 4 technical candidate; not approved for implementation.

## Dedicated Chat Records Rejected

Production audit disproves chat as a safe response-evidence owner:

| Reader/contract | Conflict |
| --- | --- |
| host OpenAI chat history | `setOpenAIMessages()` includes ordinary chat rows unless `extra[IGNORE_SYMBOL]` is set; `is_system` alone is not sufficient |
| Scene Transition Prompt | directly slices recent chat and copies `message.mes` without excluding evidence roles |
| failed-turn recovery | requires the failed player message to be the final chat row |
| retry checkpoint | assumes player/assistant positions relative to `chat.length` |
| host/global extensions | World Info, memory, vector and token-counter paths scan non-system message text |
| localization | system/non-system chat rows automatically become translation candidates |
| source message IDs | appending receipts changes all future array indices and checkpoint IDs |
| story scroll/message behavior | non-system receipts can become latest assistant messages; system rows use generic system rendering |

Adding defensive flags and filters to every reader would create a permanent
compatibility burden and still couple paid evidence to business message
indices. Chat records are not the target.

## Storage Authority

New authenticated per-user, per-timeline service:

```text
request.user.directories.files/
  hogwarts-mud/
    model-responses/
      <sha256(timelineEpoch)>/
        <responseId>.json
```

One response file is the complete authority for one paid response. There is no
delete endpoint, retention cap or oldest-row eviction.

File creation and status updates use atomic replacement. Per-response locks
serialize writes. Timeline hashing and path-under-root checks follow the
existing TranslationTable security pattern.

## API Contract

```text
MODEL_RESPONSE_API_CONTRACT_VERSION = 1
MODEL_RESPONSE_SCHEMA_VERSION = 1
```

Endpoints:

```text
GET  /api/hogwarts-mud/model-responses/health
POST /api/hogwarts-mud/model-responses/receive
POST /api/hogwarts-mud/model-responses/finalize
POST /api/hogwarts-mud/model-responses/query
```

Every request includes the API contract version and `timelineEpoch`.

### Receive

Creates one response exactly once:

```js
{
    modelResponseApiContractVersion: 1,
    timelineEpoch,
    response: {
        version: 1,
        responseId,
        taskId,
        actionId,
        tier,
        mode,
        contentType,
        content,
        contentHash,
        receivedAt,
        completion,
        authorityStatus: 'received',
        terminalStage: completion === 'partial'
            ? 'transport'
            : '',
        errorCode: '',
        surfaceRef,
    },
}
```

Rules:

- `contentHash = sha256(content)`;
- existing `responseId` with identical immutable fields is idempotent;
- existing `responseId` with different content/identity is a conflict;
- the server never trims or rewrites content;
- no product capacity limit or eviction policy is applied;
- ordinary authenticated request/body and disk limits may fail explicitly but
  cannot produce a false successful receipt.

### Finalize

Updates only mutable settlement fields:

```js
{
    responseId,
    expectedContentHash,
    authorityStatus:
        'accepted | partially_accepted | rejected',
    terminalStage:
        'parse | adopt | normalize | resolve | validate | reduce | commit',
    errorCode,
}
```

The service reads the current file, verifies identity/content hash, preserves
all immutable fields byte-for-byte and atomically rewrites the record.

Finalization is monotonic:

```text
received -> accepted | partially_accepted | rejected
terminal status -> same terminal status only
```

No later operation can change content or turn rejected evidence into accepted
authority.

### Query

Supports:

- exact `responseIds`;
- task/action/surface filters;
- chronological pagination.

Query returns complete records. Raw `content` is sent to the frontend only for
the explicit original-source action or for narrative evidence projection.

## Client Adapter

New adapter responsibilities:

```text
receiveComplete(response envelope)
receivePartial(latest stream content + transport error)
finalizeAuthority(responseId, stage, status, errorCode)
queryForSurface(surfaceRef)
retryUnsavedReceipt(responseId)
```

An in-memory session store holds every received response before the network
write. It is not authority; it prevents a ledger outage from replacing visible
content with an empty error during the current page session.

Before any paid request, the scheduler requires a cached authenticated health
check proving the expected API contract and a writable timeline root. Missing,
mismatched or unwritable ledger health fails before the paid request.

Persistence failure behavior:

1. retain exact content in session;
2. render the content with `unsaved` status;
3. block world-authority commit for that response;
4. expose deterministic "retry saving response" and download/copy actions;
5. never call the model again.

This is the current candidate. The exact recovery UX requires approval and
frontend registry rows.

## Scheduler Capture Point

`model-event-scheduler.js::runRoleTask()` is the only shared owner with:

- task ID;
- tier;
- action/event identity;
- complete adapter result;
- stream `onProgress`;
- success/failure call ledger.

Target sequence:

```text
assert response-ledger API version and writable health
-> if unhealthy: fail before paid request
-> wrap onProgress and retain latest non-empty content
-> invokeRole()
-> on complete result: persist receive before returning to workflow
-> on transport error with partial content: persist partial receive
-> record provider attempt outcome
-> workflow parse/adopt/validate/reduce
-> workflow finalizes authority status
```

The complete result receives a non-enumerable evidence handle:

```text
responseId
contentHash
```

Existing response content/shape remains unchanged for callers.

Downstream workflow helpers use the handle to finalize. Missing finalization is
an explicit failed acceptance case, not an automatic guess.

## Surface References

Draft:

```js
surfaceRef: {
    kind:
        'setup | opening | turn | transition | calendar | map | social',
    sceneId: '',
    playerMessageId: null,
    assistantMessageId: null,
    recordId: '',
}
```

Surface references are navigation metadata, not State provenance. Message IDs
may link a Turn response to its player action but cannot become Event source
refs unless the ordinary accepted transaction commits them.

## Narrative Projection

For Performer/Opening evidence:

```text
ledger content
-> existing deterministic JSON/recovery parser
-> display-only segment projection
-> TranslationTable identity:
   model_response_segment/<responseId>:<index>/textEn
-> message/story evidence renderer
```

Display projection is never written into State or Knowledge. The immutable
ledger content remains the source.

## Security And Privacy

- authenticated user files only;
- path derives from hashed timeline epoch and validated response ID;
- content channel only, no Prompt or hidden reasoning;
- no API keys/provider request headers;
- query is timeline-scoped;
- source panel uses text-only rendering, never raw HTML;
- structured JSON is escaped and collapsed by default.

## Rollback

Production readers for existing ledger records must remain available after a
code rollback. Therefore ordinary source rollback is insufficient once the
first receipt is persisted.

Target policy:

```text
before first ledger write
-> full code rollback allowed

after first ledger write
-> forward-fix only
-> ledger reader/API/UI cannot be rolled back or removed
```

Deleting ledger files, removing the reader or making existing content
inaccessible is forbidden. This forward-only cutover requires explicit PRD
approval.
