# 关系突触记忆与叙事上下文一致性 Spec

## Why

当前真实档案已经出现可重放的跨层冲突：课堂事件明确写出麦格将黄铜羽毛笔残骸彻底 Vanish，Item 状态却同时保存为 `destroyed + holderId=player`；下一幕开场因此要求 Tina 把残骸放到桌上，随后普通回合又依据旧事件全文断言残骸不存在。该请求未发生上下文裁剪，问题来自物质存在语义、检索时效和 Prompt 权威顺序不统一。

本变更同时建立 `事实 -> 人物评价 -> 人物图式` 的关系突触记忆，让 NPC 形成有来源、可反驳的行为期望，并在需要时沿图式召回具体经历；Qdrant、Planner 和模型输出都只能服务于检索与提案，不能取代 State、Reducer 和消息事务的权威地位。

## What Changes

- 新增统一的 `Narrative Authority Snapshot`，供初级 Performer、低档 Scene Opening、中档 Scene Transition 和中档 Memory Consolidation 使用。
- 为正式 Item 增加物质形态语义，区分完整物、可携带残骸、彻底缺席和下落未知。
- 将检索记录升级为 Knowledge Projector V2，保存 revision、来源引用、可见性、有效时间与校验和。
- 新增可替换 `VectorBackend`，以 Qdrant 为首选后端，保留 JSON exact 与现有 Vectra 的降级路径。
- 新增最多 1–4 个子查询的本地 Planner，以及最多两跳、带衰减和 fan penalty 的 Relational Synapse 扩散检索。
- 新增 observer-scoped Appraisal 与 Person Schema；事实、主观印象和稳定图式严格分层。
- 本地 1.5B/4B 可批量提出 Appraisal；既有中档事件边界调用负责 Schema 巩固，不增加高/中/低档常规调用。
- 初级 Prompt 接收“行为期望 + 有来源的代表经历 + 反例”，使用期望驱动行为，只有召回具体 Event 时才能声称历史细节。
- 中档 Prompt 只读取有 provenance 的事件证据和当前权威状态，不读取无边界的全历史消息，也不读取中档无权访问的锁定事实。
- Scene close 不得静默丢弃待处理 memory boundary；Scene Opening 作为已提交场景经验进入事件索引，但不能借开场正文创建未提交世界事实。
- 增加正文与 Item 物质状态的确定性一致性校验、检索冲突 diagnostics、调用预算 diagnostics 和真实 Tina 档案修复 dry-run。
- **BREAKING**：`destroyed` 不再自动等价于“仍有残骸”；必须结合 `physicalForm` 判断是否存在可交互物质。
- **BREAKING**：Knowledge record 升级为 V2；旧索引必须从当前 State + chat 全量重建，不能复用旧 hash 作为权威。
- **BREAKING**：`impressionOfPlayerEn` 保留为兼容投影，不再是唯一或独立的人物印象权威。

## Non-Goals

- 不引入 Neo4j 或其他图数据库；关系扩散由确定性本地图投影执行。
- 不让 Qdrant、检索结果、Schema 或 raw transcript 成为世界事实写入源。
- 不让高档模型参与日常记忆维护，也不为普通回合增加中档或低档调用。
- 不在本阶段建立完整承诺/任务系统、经济系统或通用物理模拟器。
- 不从旧正文批量生成新的主观人物图式；旧记忆只作为有来源的历史候选。
- 不自动改写不匹配精确 checksum 和目标消息的用户存档。

## Impact

- Affected specs:
  - Hogwarts Runtime Contract
  - Item V2
  - Social Graph V2
  - Actor Memory
  - Knowledge / RAG
  - Ordinary Turn
  - Scene Transition
- Affected code:
  - `public/scripts/extensions/hogwarts-mud/domain/item-*`
  - `public/scripts/extensions/hogwarts-mud/domain/actor-memory-*`
  - `public/scripts/extensions/hogwarts-mud/domain/event-memory.js`
  - `public/scripts/extensions/hogwarts-mud/domain/turn-validation.js`
  - `public/scripts/extensions/hogwarts-mud/knowledge.js`
  - `public/scripts/extensions/hogwarts-mud/workflows/turn-performance.js`
  - `public/scripts/extensions/hogwarts-mud/workflows/scene-transition.js`
  - `public/scripts/extensions/hogwarts-mud/workflows/social-memory.js`
  - `src/endpoints/hogwarts-mud.js`
  - `src/hogwarts-mud/local-semantic-adjudicator.js`
  - new Hogwarts knowledge/synapse server modules
  - Hogwarts Node tests and guarded dry-run scripts

## ADDED Requirements

### Requirement: Narrative Authority Snapshot

The system SHALL build one versioned, deterministic authority snapshot from committed State and message transactions before constructing any low- or medium-tier narrative Prompt.

The snapshot SHALL identify:

```json
{
  "version": 1,
  "timelineEpoch": "stable_epoch",
  "stateRevision": 1,
  "clock": "1991-09-02 · 19:00",
  "sceneId": "scene_id",
  "currentActors": [],
  "currentItems": [],
  "currentMaterialState": {},
  "currentRoomState": {},
  "currentOpenFacts": [],
  "supersededSourceRefs": []
}
```

All Prompt inputs SHALL follow this precedence:

1. Current structured State and Reducer projections.
2. Current-scene committed transactions and Event Knowledge.
3. Earlier committed events and scene archives.
4. Actor-scoped Appraisals and Person Schemas.
5. Raw transcript text used only as attributed historical evidence.

A lower-precedence source MAY explain how the current state arose, but SHALL NOT override a higher-precedence current fact.

#### Scenario: Historical transcript conflicts with current Item

- **WHEN** retrieved history says an Item vanished but the current authority snapshot says `physicalForm=remains`
- **THEN** the narrative may recall that someone believed or said it vanished
- **AND** the current remains SHALL still be physically present
- **AND** the conflict SHALL be included in retrieval diagnostics

#### Scenario: Current Item is physically absent

- **WHEN** the authority snapshot says `physicalForm=absent`
- **THEN** no low- or medium-tier prose may depict the Item or its remains being held, placed, repaired or manipulated
- **AND** a player attempt to do so remains visible as an attempted action but cannot mutate the Item

### Requirement: Item 物质形态

Every formal Item SHALL expose a `physicalForm` value:

| Value | Meaning |
| --- | --- |
| `whole` | A usable or damaged physical object exists |
| `remains` | Unusable physical wreckage exists and may have a holder/location |
| `absent` | No interactable physical matter remains |
| `unknown` | Existence or location is currently unknown |

The following invariants SHALL hold:

- `intact`, `damaged` and `dirty` imply `whole`.
- `destroyed` requires `remains` or `absent`.
- `consumed` implies `absent`.
- `lost` implies `unknown` unless later recovered.
- `holderId` is allowed only for `whole` and `remains`.
- `absent` and `unknown` clear `holderId`, `isEquipped` and physical placement.
- `remains` may be carried or placed but cannot be equipped, repaired into a whole object or used as the original tool without a separate authoritative replacement operation.

Destruction evidence SHALL distinguish “wreckage remains” from “wreckage vanished/burned to nothing/was annihilated”. Migration SHALL be deterministic and SHALL NOT call a user model.

#### Scenario: Vanished quill

- **WHEN** accepted evidence says “the smoking ruin of the quill vanished entirely”
- **THEN** the Item SHALL become `state=destroyed, physicalForm=absent`
- **AND** `holderId` SHALL be empty
- **AND** Scene Opening SHALL not depict Tina carrying the wreckage

#### Scenario: Broken remains

- **WHEN** accepted evidence says a quill was shattered and its pieces were gathered
- **THEN** the Item SHALL become `state=destroyed, physicalForm=remains`
- **AND** the proven holder/location MAY be preserved

### Requirement: Knowledge Projector V2

Knowledge records SHALL be deterministic projections of committed State and chat transactions. Each record SHALL include:

```json
{
  "version": 2,
  "recordId": "stable_id",
  "nodeType": "fact|appraisal|schema|actor|scene|clue",
  "text": "retrieval text",
  "entityIds": [],
  "tags": [],
  "timelineEpoch": "epoch",
  "stateRevision": 1,
  "projectorVersion": 2,
  "sourceRefs": [],
  "visibility": {
    "scope": "public|actor|witnesses|locked",
    "actorIds": []
  },
  "effectiveClock": "",
  "sceneId": "",
  "contentChecksum": ""
}
```

The projector SHALL:

- use stable IDs and stable ordering;
- chunk long scene transcripts instead of embedding only the beginning;
- mark current and superseded facts;
- exclude locked clues and private actor facts from unauthorized audiences;
- rebuild from State + chat without relying on an old vector index;
- never feed retrieval output into a Reducer as authority.

### Requirement: Qdrant 与可降级 VectorBackend

The server SHALL expose a Hogwarts-specific `VectorBackend` contract with `health`, `upsert`, `delete`, `query` and `rebuild` operations.

Qdrant SHALL be the preferred backend when configured and healthy. The implementation SHALL:

- use timeline and audience payload filters;
- use deterministic point IDs derived from record IDs;
- store dense vectors and payload metadata;
- support exact/entity retrieval and semantic retrieval fusion;
- reject stale revision sync;
- create a new collection generation when embedding model or dimension changes;
- perform full rebuild from Knowledge Projector V2 after index loss.

JSON exact search SHALL remain available when Qdrant is absent. Existing Vectra MAY remain as a transition fallback but SHALL use the same V2 record and audience contract.

#### Scenario: Qdrant unavailable

- **WHEN** Qdrant health or query fails
- **THEN** the current turn SHALL continue using exact/fallback retrieval
- **AND** no State or chat commit SHALL fail because of the vector backend
- **AND** diagnostics SHALL record the degraded backend

### Requirement: 本地检索 Planner

The retrieval Planner SHALL produce between one and four bounded subqueries. It MAY use deterministic rules or the existing local 4B model, but SHALL NOT call the configured high-, medium- or low-tier profiles.

Supported intents SHALL include:

- direct fact;
- cause or precondition;
- consequence;
- involved people;
- repeated behavior or relationship pattern.

Every plan SHALL include audience, timeline, node-type and time constraints. The Planner SHALL not write State, relationships, Appraisals or Schemas.

#### Scenario: Causal question

- **WHEN** a turn asks why a relationship changed or how a result happened
- **THEN** the Planner MAY emit cause, prior-condition, consequence and participant subqueries
- **AND** each result SHALL still pass audience filtering and authoritative hydration

### Requirement: Observer-scoped Appraisal

The system SHALL store accepted Appraisals as subjective actor state, separate from world facts:

```json
{
  "id": "appraisal_id",
  "observerId": "actor_id",
  "targetId": "player_or_actor_id",
  "summaryEn": "observer-specific interpretation",
  "sourceEventIds": [],
  "sourceMessageIds": [],
  "sceneId": "scene_id",
  "contextTags": [],
  "confidence": 0.6,
  "status": "provisional|accepted|superseded",
  "committedClock": ""
}
```

An Appraisal SHALL:

- reference at least one committed event and source message;
- be legal only when the observer participated, witnessed, or received an authorized rumor;
- describe an interpretation, not copy an objective event summary;
- never become common knowledge;
- never serve as evidence for itself or for a world fact.

The local observer MAY submit a single batched Appraisal proposal for all legal observers after a committed turn. Reducers SHALL validate observer knowledge and source references before accepting it.

### Requirement: Person Schema

The system SHALL consolidate multiple Appraisals into observer-target Person Schemas:

```json
{
  "id": "schema_id",
  "observerId": "actor_id",
  "targetId": "player_or_actor_id",
  "labelEn": "short relational pattern",
  "expectationEn": "behavior the observer now anticipates",
  "confidence": 0.75,
  "supportAppraisalIds": [],
  "counterAppraisalIds": [],
  "contextTags": [],
  "status": "active|contested|superseded",
  "updatedClock": ""
}
```

A stable Schema SHALL require at least three accepted Appraisals across at least two scenes. A single event MAY create a provisional Appraisal but SHALL NOT create a stable trait.

Schema updates SHALL:

- preserve supporting and counter evidence;
- lower confidence or mark `contested` when contradictions accumulate;
- version or supersede old interpretations rather than silently rewriting history;
- produce a behavioral expectation rather than only a generic trait tag;
- keep at most a bounded number of active schemas per observer-target pair.

`impressionOfPlayerEn` SHALL remain a compatibility projection from active observer-to-player Schemas, with the existing fallback when no Schema exists.

### Requirement: Relational Synapse 检索

The retrieval layer SHALL build a deterministic graph projection with typed links:

- `derived_from`: Appraisal to source Event;
- `supports`: Appraisal to Schema;
- `contradicts`: Appraisal to Schema;
- `about`: node to actor/item/scene entity;
- `temporal`: adjacent committed events;
- `similar`: bounded semantic neighbors.

Retrieval SHALL:

1. seed candidates through exact and Qdrant semantic search;
2. expand at most two graph hops;
3. apply edge weight, decay and source-node fan penalty;
4. rerank by relevance, current authority, confidence, recency and relationship salience;
5. filter again by actor knowledge before Prompt injection.

The result for each actor SHALL be a sealed activation capsule containing at most:

- two active expectations;
- two or three supporting concrete events;
- one relevant counterexample when available;
- source IDs and confidence.

### Requirement: 初级表演 Prompt 契约

The ordinary Performer and low-tier Scene Opening SHALL consume the same authority snapshot and sealed memory activation capsules.

They SHALL:

- use `expectationEn` to shape anticipation, shorthand, boundaries and initiative;
- avoid reciting Schema labels or explaining the memory system;
- claim a concrete prior time, place, action or quotation only when a supporting Event is present in that actor's capsule;
- allow an actor to act on a gist without fabricating a detailed episode;
- treat current structured facts as binding even when raw transcript or retrieved text conflicts;
- keep one actor's Appraisals, Schemas and evidence inaccessible to other actors and the narrator.

Raw retrieved transcript SHALL not be appended after the authority snapshot as an unlabeled source. Conflicting or superseded records SHALL be removed or explicitly labeled historical before Prompt construction.

#### Scenario: Familiar behavior without exposition

- **WHEN** Hermione has a supported expectation that Tina denies needing help when embarrassed
- **THEN** Hermione MAY prepare assistance before Tina asks
- **AND** she SHALL NOT narrate the Schema label as a psychological diagnosis

#### Scenario: Detail recall

- **WHEN** the current cue activates a Schema and a supporting rain-corridor Event
- **THEN** the matching actor MAY recall the umbrella incident
- **AND** another actor without that Event SHALL not repeat its details

### Requirement: 中档导演与事件边界

The existing medium event-boundary call SHALL accept `schemaOperations` alongside relationship and memory operations. No second medium call SHALL be added for Schema consolidation.

Scene close SHALL:

- consume the pending memory boundary before clearing it, or carry the stable boundary ID into the next scene;
- reject asynchronous consolidation whose timeline epoch, revision or boundary ID is stale;
- preserve exact source message IDs and witness sets;
- explicitly provide or clear each active actor's next-scene intent;
- prevent closure summary or retrieved text from overriding Item, location, life-state or identity authority.

Scene Opening SHALL be indexed as a committed scene experience after it is saved. It MAY reinforce actor memories only from already committed actor state and observable opening prose; it SHALL NOT create an uncommitted Item transfer, relationship fact, promise or hidden truth.

Medium-tier retrieval SHALL exclude locked clues, private goals and secrets unless a dedicated high-tier workflow explicitly requests them.

### Requirement: 确定性一致性校验

Before committing low-tier segments or Scene Opening prose, validators SHALL reject direct contradictions with:

- Item `physicalForm`, holder and terminal state;
- current actor presence, room and life state;
- current scene destination and clock;
- authoritative spell identity;
- actor-specific knowledge boundaries.

Item contradiction validation SHALL use stable Item IDs, labels and bounded aliases. It SHALL not reject historical or hypothetical statements when they are clearly attributed as past, belief or uncertainty.

Repair requests SHALL receive the original authority snapshot and activation capsules. A repair SHALL not drop the facts that caused the initial rejection.

### Requirement: 调用预算与 diagnostics

Normal successful operation SHALL preserve the current paid-model budget:

- ordinary turn: existing one low-tier call, zero additional medium/high calls;
- event boundary: existing one medium-tier call, zero additional medium/high calls;
- Scene Transition: existing medium/high transition plus existing low opening, no memory-only paid call;
- Qdrant, Planner, graph expansion and reducers: no high/medium/low call.

Diagnostics SHALL record:

- authority snapshot version and revision;
- planner subqueries;
- retrieval backend and degraded fallback;
- selected record IDs and source paths;
- suppressed conflicts and superseded records;
- per-actor activation capsule IDs;
- Appraisal/Schema proposal and validation outcomes;
- high/medium/low/local call counts.

Diagnostics SHALL not persist secrets or full private Prompt text.

### Requirement: 当前 Tina 档案修复

A guarded dry-run SHALL reproduce the current quill contradiction without changing the file. An apply mode MAY run only after:

- creating a timestamped backup;
- matching the expected timeline epoch, revision and target message fingerprints;
- proving the committed destruction evidence maps to `physicalForm=absent`;
- limiting changes to the quill material state, contradicted opening clauses, derived knowledge records and required revision metadata;
- preserving all unrelated messages, Social Graph, Calendar, Actor Identity, memories and Items.

Repeated migration or repair SHALL be byte-stable after the first successful application and SHALL make zero high/medium/low model calls.

### Requirement: 本机 Qdrant 真实部署与同步

本机向量后端 SHALL 使用 Qdrant `v1.19.0` 的 macOS arm64 原生二进制。安装流程 SHALL 从官方 release 获取对应构件，并在解包或首次执行前校验官方 SHA-256：

```text
4e279a80cc1ebe73e859318ff86375af54c123887dd7ae46605c0eb6cb7c44e8
```

校验失败或二进制报告的版本不是 `1.19.0` 时 SHALL 中止安装，不得启动或写入项目配置。

Qdrant SHALL 通过 macOS 用户级 LaunchAgent 自启动，使用绝对路径指向原生二进制和配置，并满足：

- 仅绑定 `127.0.0.1`，HTTP、gRPC 或其他监听端口均不得暴露到局域网或公网；
- 使用显式、稳定且不位于临时目录或构建产物目录的 `storage` 与 `snapshots` 持久化路径；
- 支持当前用户登录后启动、异常退出后恢复，并可通过 `launchctl` 确认实际运行进程和健康状态；
- 不要求系统级 daemon、root 权限或容器运行时。

创建或选择 collection generation 前，系统 SHALL 通过项目实际配置的 embedding 路径发送确定性探测文本，记录真实返回的 embedding model 标识和向量 dimension。只有探测成功后，才能将 model、dimension、Qdrant endpoint、collection generation 及持久化相关设置写入项目配置；不得猜测、沿用未经验证的旧 dimension，或把凭据写入受版本控制的配置。

当前 Tina 档案 SHALL 从权威 State + chat 执行真实 Knowledge V2 全量 rebuild，通过真实 Qdrant `upsert` 写入全部合法记录，并通过真实 `query` 召回带已知 sourceRefs 的记录。Fake、mock、内存适配器或 `exact-only` fallback 的通过结果不得替代此真实同步验收。同步记录 SHALL 可核对 projector version、collection generation、点数和失败数，且不得修改 Tina 的权威 State 或 chat。

真实 Qdrant 查询 SHALL 在服务端 payload filter 中落实 timeline、audience、actor 和 visibility ACL。至少验证显式 public 记录可见、授权 actor 私有记录仅对该 actor 可见、locked 或未授权记录返回零结果；客户端事后删除越权结果不得作为 ACL 验收。

部署完成后 SHALL 重启用户级 LaunchAgent，并验证：

- health 恢复且仍只监听 `127.0.0.1`；
- collection generation、已 upsert 点和 payload 在重启后仍存在；
- `storage` 中的数据与 `snapshots` 中创建的真实快照可定位，重启后已知查询仍可召回预期记录；
- Qdrant 暂时不可用时，现有 exact/fallback retrieval 仍不阻断回合或 Scene 提交。

Qdrant 始终 SHALL 是可丢弃、可重建的 Knowledge V2 检索投影，不得成为世界事实、Actor Memory、ACL、revision 或 Reducer 提交的权威来源。任何 rebuild、upsert、query、snapshot 或重启操作都不得反向改写权威 State + chat。

#### Scenario: 首次本机部署

- **WHEN** 在 macOS arm64 本机安装并加载 Qdrant
- **THEN** 只有 SHA-256 与版本均匹配的 `v1.19.0` 原生二进制可由用户级 LaunchAgent 启动
- **AND** 所有监听均限制在 `127.0.0.1`
- **AND** `storage` 与 `snapshots` 使用显式持久化路径

#### Scenario: Tina 真实同步与 ACL

- **WHEN** 已探测真实 embedding model/dimension 并全量重建 Tina Knowledge V2
- **THEN** 真实 Qdrant upsert 与 query SHALL 成功并留下可核对的 generation、点数和 sourceRefs
- **AND** payload filter SHALL 阻止未授权 actor 与 locked 记录泄漏
- **AND** Tina 的权威 State + chat SHALL 保持不变

#### Scenario: LaunchAgent 重启

- **WHEN** 用户级 LaunchAgent 被停止并重新加载
- **THEN** Qdrant SHALL 从持久化 storage 恢复 collection 与 points
- **AND** 真实 snapshot SHALL 仍可定位
- **AND** 已知 ACL 查询 SHALL 返回与重启前一致的授权结果

## MODIFIED Requirements

### Requirement: Item V2 terminal state

The Item V2 `state` field continues to describe condition/history, while `physicalForm` describes current material existence. Existing code and UI SHALL no longer infer portable remains from `state=destroyed` alone.

### Requirement: Actor Memory

Shared memory tiers continue to preserve bounded actor experiences. Appraisals and Person Schemas add subjective interpretation and expectation without replacing Event Knowledge. Existing first-impression and current-impression fields remain compatibility projections.

### Requirement: Knowledge / RAG

JSON files, Vectra and Qdrant are all rebuildable retrieval projections. None is a second source of truth. Search results SHALL be hydrated and checked against current State before Prompt injection.

### Requirement: Prompt context policy

Context budgeting SHALL remove low-authority retrieval before current authority. It SHALL preserve the player action, authority snapshot, actor knowledge capsules and active memory expectations. Field order or tail position SHALL not grant raw retrieval greater authority.

## REMOVED Requirements

### Requirement: Destroyed always means remains

**Reason**: Destruction can leave wreckage or remove the object completely; the old assumption caused the quill contradiction.

**Migration**: Add deterministic `physicalForm`; preserve explicit remains, mark explicit annihilation as absent, and use conservative migration for ambiguous old records.

### Requirement: Raw scene transcript as direct current context

**Reason**: Archived prose may contain superseded physical state, character belief or previous model mistakes.

**Migration**: Keep transcript as attributed historical evidence, index it in chunks with source references, and hydrate current facts from State before Prompt injection.

### Requirement: Single-string impression as complete person model

**Reason**: One mutable string cannot preserve evidence, contradictions, context dependence or multiple relationship patterns.

**Migration**: Retain the field as a compatibility projection while new Appraisals and Schemas become the structured subjective-memory authority.
