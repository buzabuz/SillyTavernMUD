# 人物字段统一与引用式记忆 Spec

关联文档：[PRD](./prd.md) · [任务](./tasks.md) · [验收 Checklist](./checklist.md) · [进度](./progress.md) · [Living State Contract](../hogwarts-runtime-contracts/state-fields.md)

当前 revision：`Actor Lifecycle Authority Completion · 2026-08-13`。

状态：用户于 2026-08-13 明确批准本 revision；按 Core 10 / Runtime 12 / Dossier 8 / LowTier 6 的边界继续实现。

## Why

当前人物、关系、记忆和检索信息在 `actorLibrary`、`actors`、`sharedMemories`、`socialGraph`、`memorySynapse` 与 Knowledge V2 中重复保存，导致人物前端投影不一致、低档 Prompt 膨胀，以及 Qdrant 索引重复事实。

本变更建立唯一权威底本、稳定引用和统一投影，使 Person Schema 走行为快通路，具体 Event 走历史慢通路。

## What Changes

- **BREAKING**：`actorLibrary[]` 收敛为稳定 `ActorCoreV1`，不再保存关系、印象和共同记忆正文。
- **BREAKING**：`actors[]` 收敛为 `ActorRuntimeV1`，不再复制 Character Core、Identity、关系和记忆。
- `ActorCoreV1.cast` 成为人物来源与首次被玩家认识的唯一权威。
- Actor Runtime 单写完整 `lifeStatus/lifeStatusPermanent/lifeStatusDetailEn/lifeStatusSinceClock`。
- 临时人物只用 Runtime `temporary` 控制 Cast membership；身份揭晓证据进入 Identity provenance source ref。
- 新增 `ActorMemoryIndexV1`，以 Event/Appraisal ID 表达 core/recent/everyday 记忆层级。
- `socialGraph` 成为人物关系、声明和 evidence 的唯一权威，不再复制进 profile。
- `memorySynapse` 成为 Appraisal 与 Person Schema 的唯一权威；当前印象由 active Schema 投影，不再持久化回写。
- Knowledge V2/Qdrant 改为独立 canonical record 索引，删除 Actor 大聚合历史记录。
- 新增统一 `ActorDossierViewModelV1`，人物列表、检查器与关系星图共同消费。
- 低档 User Payload 从 37 个顶层字段收敛为 `LowTierContextV1` 的 6 个字段。
- 新增从当前存档 Schema 到 V1 的一次性原子迁移、exact-only 降级和 Prompt 预算门禁。
- 不在本变更重做 System Prompt 整体编排；接受真实 Initial System 27,221 chars 作为当前批准基线兼硬上限，初级导演文案编排仍属于后续独立项目。

## Impact

- Affected specs:
  - Actor / Identity / Cast / Memory
  - Actor admission / temporary promotion / irreversible life state
  - Social Graph / Claims
  - Knowledge V2 / Relational Synapse
  - Ordinary Turn / Scene Performance
  - UI Projection / Relationship Graph
  - Lifecycle / Migration / Diagnostics
- Affected code:
  - `domain/actor-*`
  - `domain/memory-synapse-*`
  - `domain/social-*`
  - `domain/event-memory.js`
  - `knowledge.js`
  - `domain/knowledge-*`
  - `domain/relational-synapse-retrieval.js`
  - `workflows/turn-performance.js`
  - `core/context-budget.js`
  - `ui/inspector-controller.js`
  - `relationship-graph.js`
  - `people-projection.js`
  - `runtime/lifecycle.js`

## ADDED Requirements

### Requirement: Actor Core 单一权威

系统 SHALL 使用 `ActorCoreV1` 保存稳定人物本体，且只允许以下顶层字段：

- `id`
- `canonCatalogId`
- `nameEn`
- `aliases`
- `roleEn`
- `cast`
- `publicProfile`
- `performanceCore`
- `identity`
- `privateFacts`

`performanceCore` SHALL 保存稳定 temperament、speech style、motives、social strategies、boundaries 与 vulnerabilities。

`cast` SHALL 严格包含：

- `origin`: `foundation/canon_catalog/preset_resident/generated_guest/scene_temporary`
- `introducedClock`
- `introducedTurn`

系统 SHALL NOT 在 Actor 顶层继续保存 `source/introducedClock/introducedTurn/playerKnown/knownToPlayer`。

普通回合 SHALL NOT 修改 `performanceCore`。

#### Scenario: Canon 人物入场

- **WHEN** 哈利或赫敏被加入当前场景
- **THEN** 系统按 actor ID 直接加载 Actor Core
- **AND** 不通过 Qdrant 检索稳定人物本体
- **AND** motive、social strategy 与 boundary 不是占位句

#### Scenario: 普通回合推进

- **WHEN** 当前活动、意图或目标发生变化
- **THEN** 只更新 Actor Runtime
- **AND** Actor Core 字节保持不变

### Requirement: Actor Runtime 去重

系统 SHALL 使用 `ActorRuntimeV1` 保存：

- `id`
- `mapId`
- `roomId`
- `present`
- `lifeStatus`
- `lifeStatusPermanent`
- `lifeStatusDetailEn`
- `lifeStatusSinceClock`
- `currentActivityEn`
- `currentIntentEn`
- `currentGoalEn`
- `temporary`

Actor Runtime SHALL NOT 保存 Identity、Character Core、关系、印象或记忆正文。

四个生命字段 SHALL 由同一个 Runtime reducer 原子更新。`lifeStatusPermanent=true` 的状态不得回退或复活；只有 High Scene Transition 可以首次提交不可逆状态或死亡。

#### Scenario: 旧档加载

- **WHEN** 旧 `actors[]` 同时含稳定 profile 与 runtime 字段
- **THEN** migration 将稳定字段归入 Actor Core
- **AND** runtime 只保留白名单字段
- **AND** 不调用模型

#### Scenario: 可逆伤势

- **WHEN** Medium Scene Transition 提交 `injured` 或 `incapacitated`
- **THEN** `lifeStatusPermanent=false`
- **AND** `lifeStatusDetailEn` 保存公开说明
- **AND** `lifeStatusSinceClock` 写提交 clock

#### Scenario: 不可逆死亡

- **WHEN** High Scene Transition 提交 `dead + lifeStatusPermanent=true`
- **THEN** 四个生命字段一次落盘
- **AND** 人物 `present=false`
- **AND** 后续 load/turn/transition/retry/rollback 均不能将其恢复

### Requirement: Cast 生命周期权威

Story Cast SHALL 联合读取 Actor Core `cast` 与 Actor Runtime `temporary`：

- runtime `temporary=true` 不计入永久 `storyActorCount`
- `cast.origin=generated_guest` 计入原创客串配额
- `canonCatalogId` 是 Canon 身份权威
- `cast.introducedClock` 是 player-known 的唯一 Actor 权威

Story Cast SHALL 从 Social Graph 与 Actor Memory Index 获取关系和记忆信号，不得读取旧 profile `relationshipTags/relationshipToPlayerEn/sharedMemories`。

#### Scenario: 临时人物转正

- **WHEN** 临时人物在已提交叙事中揭晓稳定身份
- **THEN** Actor ID 保持不变
- **AND** Core name/aliases/identity 更新
- **AND** Identity provenance 引用证据 Event/message
- **AND** Runtime `temporary` 原子置为 `false`
- **AND** 不保存 resolved/provisional identity 文本副本

### Requirement: Event 单写与人物记忆引用

系统 SHALL 将 `eventKnowledge[]` 作为已提交 Event 事实的唯一正文。

系统 SHALL 使用 `ActorMemoryIndexV1` 保存人物的：

- `firstImpressionRef`
- `core[]`
- `recent[]`
- `everyday[]`

每个 `MemoryRefV1` SHALL 只含 `recordType`、`recordId` 与 `addedClock`，不得含 `summary` 或 `summaryEn`。

#### Scenario: 多人物见证同一事件

- **WHEN** 五名人物见证同一个公开 Event
- **THEN** Event Store 只保存一份 Event 正文
- **AND** 五名人物分别保存指向同一 eventId 的 MemoryRef
- **AND** State 中不产生五份摘要副本

#### Scenario: 主观记忆

- **WHEN** 人物对 Event 形成主观解释
- **THEN** Actor Memory Index 引用对应 Appraisal
- **AND** 不复制 Event 摘要作为主观记忆

### Requirement: Appraisal 与 Person Schema 权威

系统 SHALL 仅在 `memorySynapse` 中保存 Appraisal 与 Person Schema。

Person Schema SHALL 分离：

- `factPatternEn`
- `interpretationEn`
- `expectationEn`

Person Schema SHALL 保存：

- `supportAppraisalIds`
- `supportEventIds`
- `counterAppraisalIds`
- `confidence`
- `status`
- supersede 链

系统 SHALL NOT 将 Schema 文本持久化回写为 `impressionOfPlayerEn`。

#### Scenario: 快通路

- **WHEN** 当前线索命中 active Schema
- **THEN** context 只注入 expectation、confidence 与 status
- **AND** NPC 可据此提前行动
- **AND** 未加载 Event 时不得声称具体历史

#### Scenario: 慢通路

- **WHEN** 当前线索命中 Schema 支持 Event 的物品、地点、时间、人物或原话锚点
- **THEN** 系统沿 `supportEventIds` 召回 canonical Event
- **AND** hydration 通过 ACL/revision/clock 校验
- **AND** 仅 matching actor 获得具体 callback 权限

#### Scenario: 反例

- **WHEN** 新 accepted Appraisal 与 active Schema 冲突
- **THEN** Appraisal 进入 counter refs
- **AND** Schema confidence 下降或状态变为 contested
- **AND** 旧 Schema 与支持来源仍可审计

### Requirement: Social Graph 单一权威

系统 SHALL 仅在 `socialGraph` 保存：

- relationships
- relationshipEvidence
- statements
- identityClaims
- relationshipClaims
- personReferences

系统 SHALL NOT 写入 `actorLibrary[].socialStatements` 或 `actorLibrary[].socialRelationships`。

#### Scenario: Social Reducer 提交

- **WHEN** Social Reducer 接受关系与声明提案
- **THEN** 只更新 Social Graph
- **AND** profile 不出现 Social Graph 文本或边副本

### Requirement: Unified Actor Dossier

系统 SHALL 提供唯一：

```ts
buildActorDossierViewModel(state, actorId, viewerId)
```

`ActorDossierViewModelV1` 除 `schemaVersion` 外 SHALL 仅有 8 个业务顶层字段：

- `actorId`
- `header`
- `core`
- `identity`
- `current`
- `relationship`
- `memories`
- `items`

`current` SHALL 严格包含：

- `location`
- `activity`
- `intent`
- `lifeStatus`
- `lifeStatusDetail`
- `presentation`

玩家前端 SHALL NOT 读取 `cast/lifeStatusPermanent/lifeStatusSinceClock/temporary`。人物列表 SHALL 复用 Dossier 的 `actorId/header/current` 子集，不再接收 raw actor/profile。

#### Scenario: NPC 检查器

- **WHEN** 玩家打开哈利人物卡
- **THEN** 页面只渲染人物本色、身份与已知说法、当前状态、对你的关系、共同经历、正式物品六个展示区
- **AND** Personality/Speech Style 支持 `*En` 回退
- **AND** 初见印象与当前 Schema 分开显示

#### Scenario: 关系星图

- **WHEN** 玩家从关系星图选择哈利
- **THEN** 节点和边使用与 NPC 检查器相同的 relationship projection
- **AND** 标签、10 维值、Sentiment 与 evidence 数量一致
- **AND** 关系星图不自行实现关系标签推导

#### Scenario: Viewer ACL

- **WHEN** viewerId 为 player
- **THEN** ViewModel 不含 privateFacts 或未授权 Identity/关系/记忆
- **WHEN** access mode 为 performer
- **THEN** 仅 matching actor 的私有 performance projection 可进入 actor card

### Requirement: Knowledge V2 独立记录索引

Knowledge V2 SHALL 分别索引：

- Actor Core
- Event
- Appraisal
- Person Schema
- Social Evidence
- Scene
- 既有 Item/Clue

Knowledge V2 SHALL NOT 构造嵌入 shared memories、social statements、relationship edges、runtime actor 或 current presentation 的 Actor 大聚合记录。

#### Scenario: Qdrant 检索

- **WHEN** Qdrant 返回 recordId、score 与 sourceRefs
- **THEN** 系统必须从 canonical State/chat hydration
- **AND** hydration 失败的记录不得进入 Prompt

#### Scenario: Qdrant 丢失

- **WHEN** 所有 Qdrant collection 被删除或不可用
- **THEN**前端人物卡无数据损失
- **AND** exact-only 快通路与 ID expansion 可工作
- **AND** State + chat 可重建稳定 record ID、ACL 与 source refs

### Requirement: LowTierContextV1 六字段输入

低档 User Payload SHALL 只包含：

- `playerTurn`
- `sceneFacts`
- `actorCards`
- `actionOpportunities`
- `memoryActivations`
- `prohibitions`

#### Scenario: 普通 Tina 回合

- **WHEN** 使用 Tina fixture 构造普通低档请求
- **THEN** User Payload 顶层字段严格等于 6
- **AND**总长度不超过 50 KB
- **AND** 单 actor context 不超过 4 KB
- **AND** 不出现 raw actorLibrary、完整 Social Graph、完整 Identity knowledge 或 shared memory 文本账本

#### Scenario: 记忆边界

- **WHEN**只命中 Schema 快通路
- **THEN** memoryActivations 不含 Event 具体正文
- **WHEN**慢通路命中 Event
- **THEN** 每 actor 最多 3 条 Event，全局最多 8 条

### Requirement: 真实运行 Prompt 数值门禁

生产 Context budget SHALL 继续由 active role 配置与生产预算函数导出。本 revision 的真实运行证据和硬门禁为：

- `maxPromptCharacters = 298080`
- 半成品 V1 总 Prompt 基线为 58,792 chars；lifecycle 修订后 SHALL 重新实测且不得超过 `maxPromptCharacters`
- 真实 Initial System 基线兼硬上限为 27,221 chars
- 半成品 V1 User Payload 基线为 33,170 bytes；lifecycle 修订后 SHALL 重新实测且不得超过 50 KB
- LowTierContextV1 顶层字段 SHALL 严格等于 6
- protected 字段/section SHALL NOT 被裁剪
- 旧 payload 重复数量 SHALL 保持为 0

protected 范围继续包括 Initial System、output Schema、player action、current Authority Snapshot 与 current-scene actor capsule contract。

相对旧测量 27,018 chars 的 Initial System +203 增量 SHALL 被视为本 revision 已批准基线，不修改且不构成失败。后续任何超过 27,221 chars 的 Initial System 增长 SHALL 失败，除非用户对新的 revision 作出明确批准。

#### Scenario: 当前真实运行验收

- **WHEN** 使用当前代表性真实存档通过生产 builder 执行 model-free 构建
- **THEN** `maxPromptCharacters` 等于 298,080
- **AND** 总 Prompt 记录相对 58,792 chars 基线的字段级 delta，且不超过 `maxPromptCharacters`
- **AND** Initial System 等于 27,221 chars
- **AND** User Payload 记录相对 33,170 bytes 基线的 section delta，且不超过 50 KB
- **AND** protected 字段/section 均未裁剪
- **AND** 旧 payload 重复数量等于 0
- **AND** LowTierContextV1 顶层字段严格等于 6

#### Scenario: 后续 Initial System 增长

- **WHEN** 同一生产测量路径得到的 Initial System 超过 27,221 chars
- **THEN** Prompt 数值门禁失败
- **AND** 不得以总 Prompt 仍低于 298,080 chars、User Payload 仍低于 50 KB 或 protected 未裁剪为由放行

#### Scenario: System Prompt 整体编排

- **WHEN** 需要调整 System Prompt 章节、优先级、文风合同或整体编排
- **THEN** 该工作进入后续独立项目
- **AND** 不扩大本变更范围

### Requirement: 一次性原子迁移

系统 SHALL 引入：

- `actorContextVersion = 1`
- `memoryReferenceVersion = 1`
- `actorDossierProjectionVersion = 1`

迁移 SHALL 不调用低、中、高档模型。

迁移 SHALL 将：

- `source` 映射为 `ActorCore.cast.origin`
- Core/Runtime `introducedClock/introducedTurn` 去重到 `ActorCore.cast`
- Core/Runtime 生命字段去重到 Actor Runtime
- 临时 identity evidence 转为 Identity provenance source ref
- temporary memories 转为 Actor Memory Index refs

同一语义的 Core/Runtime 旧值冲突、identity evidence 无法引用或临时记忆无法引用时，迁移 SHALL 原子失败，不得静默丢弃。

#### Scenario: 有 Event ID 的旧 shared memory

- **WHEN** 旧 memory 包含合法 eventId
- **THEN** 迁移为 Event MemoryRef

#### Scenario: 无 Event ID 的旧 memory

- **WHEN** 旧 memory 只有 summary
- **THEN** 一次性创建 migrated Appraisal 并引用
- **AND** 删除旧 summary 副本
- **AND** 该 Appraisal 不得授权具体历史 callback

#### Scenario: 原子提交

- **WHEN** 新 State 的字段白名单、引用和权威不变量全部通过
- **THEN** 一次性替换旧 State
- **AND** 迁移后只读取和写入新结构
- **WHEN** 任一迁移校验失败
- **THEN** 不提交任何部分结果
- **AND** 原存档保持原样

### Requirement: 调用预算不变

字段统一、迁移、hydration 和 projection SHALL 全部使用确定性本地逻辑。

#### Scenario: 普通成功回合

- **WHEN** 普通回合首次低档输出合法
- **THEN** low/medium/high 调用预算不高于变更前
- **AND** 不新增 memory-only、social-only 或 migration 模型调用

## Technical Ownership

| 语义 | 唯一权威 | 授权写入者 | 生产读取者 |
| --- | --- | --- | --- |
| Cast 来源 | `ActorCore.cast.origin` | initial world、actor admission、pacing/temporary actor reducer、cutover | Story Cast、Pacing、Calendar |
| 首次玩家认识 | `ActorCore.cast.introducedClock/introducedTurn` | Actor lifecycle reducer、cutover | 人物可见性投影、Story Cast、Dossier directory |
| 临时身份 | `ActorRuntime.temporary` | turn/pacing temporary actor reducer、identity merge | Story Cast、Pacing、Calendar |
| 身份揭晓证据 | `ActorCore.identity.provenance.records[].sourceRef` | authorized identity reducer | Identity projection、audit |
| 当前生命状态 | Actor Runtime 四个 life 字段 | Scene Transition + Actor Runtime reducer、cutover | Narrative Authority、presence、Dossier、Scene Transition |
| 人物关系 | Social Graph | Social reducer | relationship projection、Story Cast |
| 人物记忆层级 | Actor Memory Index refs | turn/transition/memory reducers | Dossier、activation、Story Cast |

### Writer Flow

```text
new/foundation/preset/canon/generated/temporary actor
-> Actor lifecycle reducer
-> ActorCore.cast + ActorRuntime.temporary
-> Story Cast / visibility / Calendar projections

Scene Transition proposal
-> tier validation
-> atomic Actor Runtime life reducer
-> Authority Snapshot / Dossier projection
```

### Reader Removal

以下生产读取必须在同一变更删除：

- `cast.js` 对 profile `source/introducedClock/relationshipTags/relationshipToPlayerEn/sharedMemories` 的读取
- People/Appearance/Relationship UI 对 Actor `playerKnown/knownToPlayer/introducedClock` 的各自判断
- Calendar 对 profile/runtime `identityStatus` 的读取
- Prompt projector 对 raw actor/profile、shared memory、profile Social 副本的读取
- Core 对生命状态副本的读取

替代读取分别为 Core `cast`、Runtime life、Social projection、Actor Memory Index hydration 与 Identity provenance。

## MODIFIED Requirements

### Requirement: 人物检查器

人物检查器 SHALL 从统一 Actor Dossier ViewModel 渲染，不再直接读取并合并 `actorLibrary`、`actors`、`socialGraph` 与 shared memory。

### Requirement: 人物列表与 player-known

人物列表 SHALL 复用 Actor Dossier 与统一人物可见性投影。player-known SHALL 由 `ActorCore.cast.introducedClock` 表达；首次玩家可见接触由 Actor lifecycle reducer 单写。

### Requirement: Story Cast policy

Story Cast SHALL 联合 Core `cast`、Runtime `temporary`、Social Graph 与 Actor Memory Index 计算配额和熟人阶段，不再读取旧 Actor 副本。

### Requirement: Scene Transition 生命周期

Scene Transition 输入输出 SHALL 使用 bounded lifecycle projection。模型可提交 status/permanent/detail，`sinceClock` 由本地 reducer 计算；Prompt 不注入 raw Core/Runtime。

### Requirement: 关系星图

关系星图 SHALL 复用领域关系投影与 Actor Dossier，不再维护独立关系标签、人物 known 判定或 raw actor directory 合并。

### Requirement: Event witness memory

公共 notable/major Event 的 witness 处理 SHALL 写 Actor MemoryRef，不再为每名 witness 写一份 Event 文本。

### Requirement: Impression cutover

`impressionOfPlayerEn` SHALL 一次性迁移为 Appraisal 后删除；active Schema 的当前印象 SHALL 在投影时计算，不再持久化回写 profile/runtime。

### Requirement: Context 裁剪

Context budget SHALL 优先裁剪可重建的 memory activation 与 opportunity，不得通过重新引入 raw actor/social/history 数据补足缺失字段。

## REMOVED Requirements

### Requirement: Profile Social Copies

**Reason**: `actorLibrary[].socialStatements/socialRelationships` 与 Social Graph 重复并导致状态膨胀。

**Migration**: 读取统一 Social Graph；旧字段在迁移后删除。

### Requirement: Runtime Stable Copies

**Reason**: `actors[]` 中 Identity、印象与稳定人物字段重复 Actor Core。

**Migration**: Actor Runtime 白名单原子迁移；成功后只读取新结构。

### Requirement: Legacy Actor Lifecycle Fields

**Reason**: `source/introduced*/playerKnown/knownToPlayer` 与生命状态曾在 Core/Runtime 多处保存，产生冲突；provisional/resolved identity 文本又重复稳定 ID 与 provenance。

**Migration**: Cast 来源与首次认识迁入 Core `cast`；完整生命状态迁入 Runtime；身份揭晓证据迁成 provenance ref；旧顶层字段全部删除。

### Requirement: Shared Memory Text Copies

**Reason**: 同一 Event 为不同 witness 复制摘要，破坏单一权威正文。

**Migration**: 转换为 Event/Appraisal MemoryRef；无 Event 的旧文本一次性进入 migrated Appraisal，且不授权 callback。

### Requirement: Schema Materialized Impression

**Reason**: Schema 被压回 `impressionOfPlayerEn` 会丢失支持、反例、置信度与状态。

**Migration**: 当前印象改为 Schema projection；旧 impression 一次性转成 Appraisal 后删除。

### Requirement: Actor Aggregate Knowledge Record

**Reason**: Actor 聚合记录重复嵌入人物全部记忆、关系和运行状态，使 Qdrant 索引重复事实。

**Migration**: 删除旧 Actor 聚合索引，重建独立 canonical records。
