# Hogwarts MUD 人物字段统一与引用式记忆 PRD

关联文档：[技术 Spec](./spec.md) · [任务](./tasks.md) · [验收 Checklist](./checklist.md) · [进度](./progress.md) · [Living State Contract](../hogwarts-runtime-contracts/state-fields.md)

## 0. 文档信息

| 项目 | 内容 |
| --- | --- |
| 状态 | Approved · Actor Lifecycle Authority Completion · No Compatibility Layer |
| 日期 | 2026-08-13 |
| 当前修订 | Actor Lifecycle Authority Completion · 2026-08-13 |
| 修订批准 | 用户于 2026-08-13 明确批准本 revision，并要求继续收尾 V1 |
| 目标版本 | Actor Context V1 / Memory Reference V1 / Actor Dossier V1 |
| 产品目标 | 一个权威事实底本，一次记录，到处引用；先统一字段并精简 Prompt，再单独设计初级导演编排 |
| 本期性质 | 数据模型、投影和前端收敛，不重写叙事 Prompt 文案 |

## 1. 一句话目标

将当前分散在 `actorLibrary`、`actors`、`sharedMemories`、`socialGraph`、`memorySynapse`、Scene、消息事务和 Qdrant Actor 聚合记录中的重复人物信息，收敛为少数权威记录与稳定引用。

人物可以基于亲历 Event 形成 Appraisal，再由多次 Appraisal 形成可修订 Person Schema。Schema 负责日常行为预期，Event 负责具体历史细节。前端、Prompt 和 Qdrant 均只消费同一权威底本的投影，不再保存自己的事实副本。

### 决策摘要

| 项目 | Before | After |
| --- | ---: | ---: |
| Actor Core 顶层字段 | 数十个混合字段 | 10 个，含唯一 `cast` 生命周期权威 |
| Actor Runtime 顶层字段 | 数十个混合字段 | 12 个，含完整生命状态权威 |
| NPC 人物卡展示区 | 9 | 6 |
| NPC 前端业务顶层字段 | 多源散读 | 8 |
| 低档 User Payload 顶层字段 | 37 | 6 |
| Tina 低档 User Payload | 约 180 KB | <= 50 KB |
| 单 actor Prompt context | 最高 111 KB | <= 4 KB |
| witness Event 文本副本 | 31 条 / 5 Event | 0 |
| 关系标签实现 | 至少 2 套 | 1 套 |
| Qdrant Actor 聚合历史 | 存在 | 删除 |

## 2. 背景与问题

### 2.1 当前真实规模

基于 Tina 当前存档：

| 数据面 | 当前大小或数量 |
| --- | ---: |
| `actorLibrary` | 218 KB |
| `actors` | 76 KB |
| `socialGraph` | 144 KB |
| `eventKnowledge` | 9 条 |
| `sharedMemories` | 91 条 |
| 带 Event 引用的 shared memory | 31 条 |
| 上述引用实际对应的唯一 Event | 5 条 |
| `relationshipEvidence` | 105 条 |
| `socialGraph.statements` | 83 条 |

哈利在 `actorLibrary` 与 `actors` 之间有 39 个值完全相同的字段，赫敏有 37 个。

### 2.2 变更前 Prompt 规模

一次真实低档现场表演请求：

| 项目 | 当前值 |
| --- | ---: |
| System Prompt | 27,018 字符 |
| User Payload | 约 179,772 字符 |
| User Payload 顶层字段 | 37 个 |
| 单个拉文德 `actorKnowledge` | 111,499 字符 |

`actorKnowledge` 同时嵌入 social statements、关系边、事件知识、Identity knowledge、共同记忆和当前印象。Qdrant 检索结果只是额外一层，无法阻止完整人物数据库进入 Prompt。

### 2.3 当前重复链路

```text
一次已提交事件
  -> eventKnowledge 保存事实
  -> 每个 witness 的 sharedMemories 复制摘要
  -> socialGraph.relationshipEvidence 再保存关系解释
  -> memorySynapse.appraisals 再保存主观解释
  -> actorLibrary.socialStatements/socialRelationships 再复制 Social Graph
  -> actors 再复制 impression、Identity 和稳定人物字段
  -> Knowledge V2 Actor record 再聚合以上全部内容
  -> Qdrant 再索引聚合文本
```

这不是“一次记录，到处引用”，而是“多处复制，再统一索引”。

### 2.4 新旧记忆模块冲突

当前旧模块与新模块并存：

| 语义 | 旧字段 | 新字段 | 当前问题 |
| --- | --- | --- | --- |
| 当前印象 | `impressionOfPlayerEn` | active Person Schema | Schema 又被物化回旧 impression |
| 共同经历 | `sharedMemories.*[].summaryEn` | Event / Appraisal | 同一 Event 为每名 witness 复制文本 |
| 关系原因 | profile `socialRelationships` | `socialGraph.relationships/evidence` | Social Reducer 主动复制 |
| 人物身份 | `actorLibrary` + `actors` | Identity V1 | 稳定字段在两层重复 |
| 检索 | Actor 聚合记录 | Event/Appraisal/Schema records | Actor 记录再次嵌入全部历史 |

### 2.5 前端重复

当前 NPC 检查器有 9 个信息卡：

1. Identity dossier
2. 对你的印象
3. 共同记忆
4. 家庭与背景声明
5. 已知人物关系
6. 当前状态
7. 当前呈现
8. 正式物品
9. 公开档案

关系星图又独立实现人物目录、关系标签、关系详情和 evidence 展示。它没有完全复用领域层关系投影，因此同一关系可能在不同页面显示不同标签。

Appraisal、Person Schema 和初见印象目前没有独立、可追溯的前端展示。

### 2.6 人物生命周期权威缺口

2026-08-13 对真实生产链和 Tina 存档的补充审计确认，旧 revision 把“Prompt 不需要的字段”误当成“世界 State 不需要的字段”，漏掉了仍在生产业务中使用的生命周期权威。

Tina 当前存档中：

| 语义 | Actor Core/Profile | Actor Runtime | 结论 |
| --- | ---: | ---: | --- |
| `source` | 16 | 11 | 9 人双写；用于 Canon、预设居民、原创客串和临时人物分类，不能直接删除 |
| `introducedClock` | 21 | 9 | 7 人双写；用于首次认识与人物可见性，不能直接删除 |
| `introducedTurn` | 10 | 9 | 7 人双写；用于首次认识审计，不能直接删除 |
| `lifeStatus` | 21 | 23 | 21 人双写且完全相同；只应保留 Runtime |
| `lifeStatusPermanent` | 21 | 23 | 21 人双写且完全相同；只应保留 Runtime |
| `lifeStatusDetailEn` | 21 | 23 | 21 人双写且完全相同；只应保留 Runtime |
| `lifeStatusSinceClock` | 21 | 23 | 21 人双写且完全相同；只应保留 Runtime |
| `identity` | 21 | 23 | 21 人双写，约 60 KB；只应保留 Core |

真实 Tina 中还有 7 个 `pacing_public_guest`、7 个 `canon_catalog`、2 个 `preset_location_resident` 和 2 个 runtime-only 临时人物。当前半成品 cutover 会生成 23 个 Core，却删除全部来源与首次认识字段，并把 Runtime 生命状态压缩到单一 `lifeStatus`。这会直接破坏：

- Story Cast 的原创客串配额、临时人物计数、熟人阶段和人物轮换
- People Panel、Appearance 与关系入口的 player-known 判定
- 高档导演提交不可逆死亡、中档导演提交可逆伤势的权限边界
- rollback/retry/transition 后的永久死亡、公开说明和生效时间

这不是兼容需求，而是 V1 权威模型必须覆盖的现行业务。

## 3. 产品原则

### P1. 一个事实只能有一个权威正文

同一 Event、Appraisal、Schema、关系 evidence、Identity fact 或 Item 只能在一个权威 Store 中保存完整内容。

其他模块只能保存：

- `recordId`
- 显示层级或排序等引用元数据
- 由权威记录即时计算的 ViewModel

### P2. Qdrant 是索引，不是权威数据库

Qdrant 可以保存用于向量检索的文本投影与 payload，但必须满足：

- 每个索引条目对应一个稳定 `recordId`
- 带 `sourceRefs`、ACL、时间和 revision
- 可以从 State + chat 完整重建
- 检索结果必须回源 hydration 后才能进入 Prompt
- 不允许 Qdrant 结果直接写回世界事实

### P3. 人物本体不是记忆

人物入场后，稳定 Character Core 按 actor ID 直接加载，不经过语义检索。

场景相关性过滤只处理：

- 哪些动态状态与本场相关
- 哪些关系倾向会影响本轮行为
- 哪些 Schema 被当前线索激活
- 是否需要沿 Schema 召回具体 Event

### P4. Schema 指导行为，Event 支撑历史细节

硬规则：

```text
Schema 可以指导行为。
只有召回到具体 Event，NPC 才能声称具体时间、地点、参与者、动作或原话。
```

### P5. 印象是主观投影，不是事实副本

人物可以从同一 Event 形成不同 Appraisal。

```text
Event: 玩家受伤后说“没事”

赫敏 Appraisal: 他在隐瞒伤势，必须继续检查
哈利 Appraisal: 他不想被围观，应该给他空间
```

两者引用同一个 Event，不复制或改写 Event 事实。

### P6. 前端只读统一 ViewModel

人物列表、NPC 检查器和关系星图不得自行合并原始 State，也不得各自实现关系标签或记忆回退规则。

### P7. 人物生命周期也是人物权威

人物来源、首次被玩家认识、临时身份、生命状态、不可逆标记和状态生效时间不是 Prompt 缓存，也不是可删除的 legacy 噪音。

它们必须满足：

- Cast 来源与首次认识只在 Actor Core 的 `cast` 中记录一次
- 当前生命状态只在 Actor Runtime 中记录一次
- 临时身份只用 Runtime `temporary` 表达
- 身份揭晓证据只保存为 Identity provenance 的 source ref，不复制正文
- player-known 由 `cast.introducedClock` 投影，不再保存多个 Actor 布尔标记

## 4. 本期目标

### G1. 建立唯一权威底本

明确 Actor Core、Actor Runtime、Event、Social、Memory Synapse、Item 的唯一写入者和唯一正文位置。

### G2. 前端字段收敛

NPC 人物展示统一为一个 `ActorDossierViewModelV1`。

- 只允许 8 个业务顶层字段
- 页面收敛为 6 个展示区
- 人物星图与人物检查器复用同一人物和关系投影

### G3. Prompt 数据收敛

低档 User Payload 从当前 37 个顶层字段收敛为 6 个。

本期只收敛输入数据，不重写 System Prompt 的叙事文案和章节顺序。

### G4. 快慢通路恢复原设计

- 快通路：当前线索命中 Schema，直接产生行为预期
- 慢通路：需要具体 callback 时，沿 `supportEventIds` 召回 Event

### G5. 删除权威状态内的文本副本

删除或停止写入：

- profile 中的 Social Graph 副本
- runtime actor 中的稳定人物字段副本
- shared memory 中可由 Event/Appraisal hydration 的摘要副本
- Schema 到 impression 的持久化文本副本
- Qdrant Actor 聚合记录中的完整历史嵌套

### G6. 补全人物生命周期权威

- Story Cast 可以区分 foundation、Canon、预设居民、原创客串与场景临时人物
- 临时人物不占永久 Story Cast 配额；有证据转正后只改变 Runtime `temporary`
- 首次被玩家认识的时间只记录一次
- `alive/injured/incapacitated/missing/dead`、不可逆标记、公开说明和生效时间原子持久化
- 永久状态经过 reload、rollback、retry、transition 后仍不可被普通或中档流程覆盖

## 5. 非目标

本期不做：

- 初级导演 System Prompt 文案重写
- 文风合同重写
- 新的关系数值算法
- 新的 Qdrant embedding 模型
- 新的模型调用角色
- 增加低/中/高档调用次数
- 改变 Calendar、Item、Spatial 的业务规则
- 自动重写旧聊天正文
- 用模型解释旧档

## 6. Before / After 总览

### 6.1 数据流

#### Before

```text
Actor/Profile/Runtime/Event/Social/Memory
  -> 多个 Reducer 复制字段
  -> UI 各自合并
  -> Knowledge 构造 Actor 大聚合记录
  -> Qdrant 索引重复内容
  -> Prompt 再同时注入多套人物、关系和记忆字段
```

#### After

```text
唯一权威 Store
  -> 稳定 recordId / sourceRefs
  -> 统一 Context Projector
  -> Frontend ViewModel / Prompt Context / Qdrant Index
```

### 6.2 人物本体

#### Before

- `actorLibrary` 同时保存稳定人物、本轮印象、共同记忆和 Social Graph 副本
- `actors` 又复制姓名、Identity、印象、关系和外貌
- `privateGoalEn` 混合稳定动机与当前导演任务

#### After

- `actorLibrary` 只保存 `ActorCoreV1`
- `actors` 只保存 `ActorRuntimeV1`
- 稳定动机和当前目标分离
- Secret/Knowledge 只作为受 ACL 保护的私有事实，不作为公开人物本色

### 6.3 记忆

#### Before

```text
eventKnowledge.summaryEn
-> N 个 witness sharedMemories.summaryEn 文本副本
```

#### After

```text
eventKnowledge[eventId] 保存一次
actorMemoryIndex[actorId].everyday[] 保存 eventId 引用
前端和 Prompt 按需 hydration
```

### 6.4 印象

#### Before

```text
Person Schema.labelEn
-> impressionOfPlayerEn
-> actorLibrary
-> actors
-> Qdrant Actor record
```

#### After

```text
Person Schema 是唯一稳定印象权威
current impression 在投影时计算
旧 impression 一次性迁移成 Appraisal 后删除
```

### 6.5 社交关系

#### Before

```text
socialGraph
-> actorLibrary[].socialStatements/socialRelationships
-> Inspector 与关系星图各自计算标签
```

#### After

```text
socialGraph 是唯一权威
buildRelationshipProjection(viewerId)
-> Inspector 与关系星图共同消费
```

### 6.6 人物生命周期

#### Before

```text
source / introducedClock / introducedTurn
-> actorLibrary 与 actors 重复
-> Story Cast、People Panel、Appearance 各自猜 known/cast 类型

lifeStatus / permanent / detail / sinceClock
-> actorLibrary 与 actors 重复
-> 半成品 V1 只保留 lifeStatus
-> 转场提交后永久死亡与状态说明丢失
```

#### After

```text
ActorCore.cast
-> Story Cast policy
-> player-known projection
-> Pacing / Calendar actor selection

ActorRuntime.lifeStatus + permanent + detail + sinceClock
-> Narrative Authority
-> Scene Transition validation
-> Dossier current
```

前端和 Prompt 只消费投影，不直接读取 `cast` 或完整 Runtime。

## 7. 目标权威数据模型

## 7.1 ActorCoreV1

路径仍可使用 `actorLibrary[]`，但目标记录只允许以下 10 个顶层字段：

```ts
interface ActorCoreV1 {
    id: string;
    canonCatalogId: string;
    nameEn: string;
    aliases: string[];
    roleEn: string;
    cast: {
        origin:
            | 'foundation'
            | 'canon_catalog'
            | 'preset_resident'
            | 'generated_guest'
            | 'scene_temporary';
        introducedClock: string;
        introducedTurn: number | null;
    };
    publicProfile: {
        descriptionEn: string;
        backgroundEn: string;
    };
    performanceCore: {
        temperamentEn: string;
        speechStyleEn: string;
        motivesEn: string[];
        socialStrategiesEn: string[];
        boundariesEn: string[];
        vulnerabilitiesEn: string[];
    };
    identity: NpcIdentityV1;
    privateFacts: {
        secretEn: string;
        knowledgeEn: string[];
    };
}
```

约束：

- `performanceCore` 是人物本色，不由普通回合修改
- `cast.origin` 是人物如何进入世界的唯一来源分类，创建后不可改写
- `cast.introducedClock/introducedTurn` 是首次被玩家认识的唯一权威；未认识时分别为空字符串和 `null`
- Canon 身份由 `canonCatalogId` 判断；临时人物是否占永久 Cast 配额由 Runtime `temporary` 判断
- `source/introducedClock/introducedTurn/playerKnown/knownToPlayer` 不再作为 Actor 顶层字段
- `motivesEn` 不得使用“完成场景节拍”等导演任务
- `privateFacts` 不进入玩家 ViewModel
- Character Core 不保存位置、活动、关系、印象或记忆正文

## 7.2 ActorRuntimeV1

`actors[]` 只允许以下 12 个业务字段：

```ts
interface ActorRuntimeV1 {
    id: string;
    mapId: string;
    roomId: string;
    present: boolean;
    lifeStatus:
        | 'alive'
        | 'injured'
        | 'incapacitated'
        | 'missing'
        | 'dead';
    lifeStatusPermanent: boolean;
    lifeStatusDetailEn: string;
    lifeStatusSinceClock: string;
    currentActivityEn: string;
    currentIntentEn: string;
    currentGoalEn: string;
    temporary: boolean;
}
```

运行态不得复制：

- `identity`
- `personalityEn`
- `speechStyleEn`
- `publicBackgroundEn`
- `firstImpression*`
- `impressionOfPlayer*`
- `sharedMemories`
- `socialRelationships`

生命状态约束：

- `lifeStatus/lifeStatusPermanent/lifeStatusDetailEn/lifeStatusSinceClock` 必须由同一个 Runtime reducer 原子更新
- `lifeStatusDetailEn` 是公开英文权威，中文只在显示时翻译
- 状态发生变化时 `lifeStatusSinceClock` 必须写当前权威 clock；未变化时保持原值
- Medium Scene Transition 只能提交可逆状态
- High Scene Transition 才能首次提交 `lifeStatusPermanent=true` 或新的 `dead`
- 永久状态不得被后续 turn、transition、retry、rollback、load 改回其他状态
- `dead` 或 `missing` 不得同时 `present=true`

临时身份约束：

- `temporary=true` 的 Actor Core 可以存在，但不计入永久 Story Cast
- 有明确叙事证据的 identity merge 只把 `temporary` 原子置为 `false`
- `provisionalActorId/resolvedIdentityId/identityStatus/identityEvidenceEn` 不再持久化
- 稳定 Actor ID 保持不变；正式姓名与别名写 Core，证据写 `identity.provenance` source ref
- 临时人物记忆直接进入 Actor Memory Index，不保存 `temporaryMemories`

## 7.3 Event Store

继续以 `eventKnowledge[]` 作为已提交事件权威。

每条 Event 至少包含：

```ts
interface EventRecordV1 {
    eventId: string;
    sceneId: string;
    clock: string;
    summaryEn: string;
    participantActorIds: string[];
    witnessActorIds: string[];
    sourceMessageIds: number[];
    perception: PerceptionV1;
}
```

事件正文只保存一次。

## 7.4 Social Store

`socialGraph` 继续作为唯一关系权威：

- `relationships[]`
- `relationshipEvidence[]`
- `statements[]`
- `identityClaims[]`
- `relationshipClaims[]`
- `personReferences[]`

`actorLibrary[].socialStatements` 与 `actorLibrary[].socialRelationships` 在目标版本中不存在。

## 7.5 Memory Synapse Store

`memorySynapse` 继续作为主观记忆权威：

```ts
interface AppraisalV1 {
    id: string;
    observerId: string;
    targetId: string;
    summaryEn: string;
    sourceEventIds: string[];
    counterToSchemaIds: string[];
    confidence: number;
    status: 'provisional' | 'accepted' | 'superseded';
}

interface PersonSchemaV1 {
    id: string;
    observerId: string;
    targetId: string;
    factPatternEn: string;
    interpretationEn: string;
    expectationEn: string;
    confidence: number;
    supportAppraisalIds: string[];
    supportEventIds: string[];
    counterAppraisalIds: string[];
    status: 'active' | 'contested' | 'superseded';
}
```

`factPatternEn`、`interpretationEn`、`expectationEn` 分工：

```text
事实模式：玩家多次在受伤时说“没事”
解释：他不愿暴露脆弱
期望：他嘴上否认时，通常反而需要帮助
```

Schema 不保存具体旧事正文，只保存支持引用。

## 7.6 Actor Memory Index

新增唯一引用目录：

```ts
interface ActorMemoryIndexV1 {
    version: 1;
    byActorId: Record<string, {
        firstImpressionRef: string;
        core: MemoryRefV1[];
        recent: MemoryRefV1[];
        everyday: MemoryRefV1[];
    }>;
}

interface MemoryRefV1 {
    recordType: 'event' | 'appraisal';
    recordId: string;
    addedClock: string;
}
```

约束：

- MemoryRef 不保存 `summary/summaryEn`
- tier 只表达该人物如何保留该记录
- 同一 Event 可被多个人物引用，但正文只在 Event Store 保存一次
- subjective memory 优先引用 Appraisal，而不是复制 Event 摘要

## 7.7 Item 与 Presentation

保持现有唯一权威：

- `items[]`
- `actorPresentations[actorId]`

Actor Core 和 Actor Runtime 只保存 Item ID 引用或不保存。

## 8. 快通路与慢通路

## 8.1 快通路：Schema 驱动熟人行为

触发条件：

- 当前玩家动作或话题命中 active Schema
- Schema observer 与当前 NPC 完全匹配
- Schema 未 superseded
- ACL、时间线和 revision 合法

流程：

```text
当前线索
  -> Qdrant/Exact 检索命中 Schema
  -> hydration canonical Schema
  -> 注入 expectationEn，不注入支持 Event 正文
  -> NPC 直接按熟人预期行动
```

示例输出线索：

```text
expectation: 他否认伤势时通常需要帮助，但不喜欢被围观。
behavioral options:
- 提前递药
- 降低音量
- 停止公开追问
- 根据当前关系选择照顾、调侃或保持距离
```

快通路禁止：

- 复述 `supportEventIds` 对应的具体旧事
- 生成具体时间、地点、原话
- 将 expectation 当成必然剧本

## 8.2 慢通路：Event callback

触发条件：

- 当前线索与 Schema 的支持 Event 有实体、地点、物品、原话或时间锚点匹配
- 当前叙事确实需要具体历史 callback

流程：

```text
当前线索
  -> 命中 Schema
  -> 沿 supportEventIds 扩散
  -> Qdrant/Exact 排序 Event
  -> hydration canonical Event
  -> 生成 actor-scoped callback capsule
```

只有慢通路返回：

- 具体时间
- 具体地点
- 具体参与者
- 具体动作
- 有来源的原话

## 8.3 反例与修订

Schema 必须允许：

- 新 Appraisal 支持旧 Schema
- 新 Appraisal 成为反例
- confidence 上升或下降
- active 变为 contested
- 新 Schema supersede 旧 Schema
- NPC 因偏见暂时保留低置信度 Schema

任何修订都保留旧 Schema 和 source refs，不静默覆盖。

## 9. 前端收敛

## 9.1 唯一入口

新增唯一只读投影：

```ts
buildActorDossierViewModel(
    state,
    actorId,
    viewerId,
): ActorDossierViewModelV1
```

以下 UI 必须复用：

- 当前互动人物
- NPC 检查器
- 关系星图节点详情
- 关系星图边详情

## 9.2 前端字段总数

前端只允许消费 8 个业务顶层字段，外加 `schemaVersion`：

```ts
interface ActorDossierViewModelV1 {
    schemaVersion: 1;
    actorId: string;          // 1
    header: HeaderVM;         // 2
    core: CharacterCoreVM;    // 3
    identity: IdentityVM;     // 4
    current: CurrentStateVM;  // 5
    relationship: RelationVM; // 6
    memories: MemoryVM;       // 7
    items: ItemVM[];          // 8
}
```

### `header`

只含 4 个字段：

- `name`
- `role`
- `portrait`
- `presenceLabel`

### `core`

只含 4 个玩家可见字段：

- `publicBackground`
- `personality`
- `speechStyle`
- `visibleDescription`

必须支持 `*En` 回退，不得因缺少中文缓存显示“仍需了解”。

### `identity`

只含：

- `groups`
- `claims`

由 viewer-scoped Identity projection 生成，不直接读取 raw `identity`。

### `current`

只含 6 个字段：

- `location`
- `activity`
- `intent`
- `lifeStatus`
- `lifeStatusDetail`
- `presentation`

`lifeStatusPermanent`、`lifeStatusSinceClock`、`temporary` 与 `cast` 是内部控制权威，不直接暴露给玩家前端。

人物列表不再接收 raw `actor/profile`。它只复用 Dossier 的：

- `actorId`
- `header.name`
- `header.role`
- `header.presenceLabel`
- `current.location`
- `current.activity`
- `current.intent`
- `current.lifeStatus`
- `current.lifeStatusDetail`

### `relationship`

只含 6 个字段：

- `labels`
- `dimensions`
- `activeSentiments`
- `firstImpression`
- `currentSchema`
- `evidenceRefs`

`currentSchema` 显示：

- interpretation
- expectation
- confidence
- status
- supporting count
- counterexample count

### `memories`

只含 3 个引用数组：

- `core`
- `recent`
- `everyday`

每个前端条目 hydration 后可显示：

- `recordId`
- `recordType`
- `summary`
- `clock`
- `sourceBadge`

ViewModel 生成结束后不得保留 raw State 对象。

### `items`

只含现有 player-visible Item ViewModel 数组。

## 9.3 前端展示区数量

当前 9 张卡收敛为 6 个展示区：

1. 人物本色
2. 身份与已知说法
3. 当前状态
4. 对你的关系
5. 共同经历
6. 正式物品

合并规则：

- “当前呈现”合并进“当前状态”
- “家庭与背景声明”合并进“身份与已知说法”
- “对你的印象”和“已知人物关系”合并进“对你的关系”
- “公开档案”改名“人物本色”

## 9.4 关系星图

关系星图必须删除本地关系标签推导。

星图只消费统一：

```ts
buildRelationshipProjection(state, viewerId)
```

要求：

- 标签、维度、Sentiment、evidence 与人物卡一致
- 点击节点打开同一个 Actor Dossier
- 不再合并 raw `actorLibrary + actors + socialGraph.nodes`
- 不再自行判断 actor 是否 player-known

## 9.5 初见印象

人物卡必须新增独立展示：

- 初见印象：不可覆盖的 Appraisal/ref
- 当前看法：active Schema 投影

两者不得继续混为一个 impression 字段。

## 10. Prompt 字段收敛

## 10.1 当前字段

当前低档 User Payload 共 37 个顶层字段，包括：

- `authoritySnapshot`
- `actorKnowledge`
- `actorContinuityCapsules`
- `actorProfiles`
- `presentActors`
- `memoryActivationCapsules`
- `currentScene`
- `currentRoomState`
- `currentMaterialState`
- `formalItems`
- `spatialContext`
- 多套 clock/location/directive 字段

其中大量内容语义重复。

## 10.2 目标字段

本期收敛为 6 个顶层字段：

```ts
interface LowTierContextV1 {
    playerTurn: PlayerTurnContext;         // 1
    sceneFacts: SceneFactsContext;         // 2
    actorCards: ActorPerformanceCard[];    // 3
    actionOpportunities: Opportunity[];    // 4
    memoryActivations: MemoryActivation[]; // 5
    prohibitions: Prohibition[];           // 6
}
```

### `playerTurn`

包含：

- 原始玩家动作
- 结构化受话顺序
- 已结算 check/item/movement intent

### `sceneFacts`

包含唯一当前权威投影：

- clock
- scene/room
- 可见 material
- 当前相关 Items
- 当前 Calendar claim

不得同时保留 `authoritySnapshot` 和多套 room/material/item 副本。

### `actorCards`

每名实际表演人物一张卡：

```ts
interface ActorPerformanceCard {
    actorId: string;
    nameEn: string;
    roleEn: string;
    performanceCore: {
        temperamentEn: string;
        speechStyleEn: string;
        motivesEn: string[];
        socialStrategiesEn: string[];
        boundariesEn: string[];
    };
    runtime: {
        activityEn: string;
        intentEn: string;
        location: string;
        presentation: string;
    };
    relationStance: {
        labels: string[];
        actionBiasesEn: string[];
        activeSentimentsEn: string[];
    };
}
```

禁止注入：

- 完整 social graph
- 完整 identity knowledge
- 全量 event knowledge
- shared memory 文本账本
- actorLibrary raw profile

人物生命周期投影规则：

- `cast` 不进入 LowTier Actor Card；Pacing/Calendar 只接收本地规则层计算后的 cast policy
- `lifeStatus` 与 `lifeStatusDetailEn` 只存在于 `sceneFacts.authoritySnapshot`，不在 Actor Card 再复制
- `lifeStatusPermanent` 与 `lifeStatusSinceClock` 不进入普通 Performer Prompt
- Scene Transition 的 bounded actor state 必须包含 `lifeStatus/lifeStatusPermanent/lifeStatusDetailEn`，`lifeStatusSinceClock` 由 reducer 本地计算
- 其他导演 Prompt 只能把现有 raw Actor 字段替换为同形状 canonical projection，不得新增完整 Core、Runtime、Social 或 Memory 数据库

### `actionOpportunities`

由规则层和场景投影生成：

- 可执行的 NPC 行动
- 可推进的关系机会
- 可兑现的预约或承诺
- 当前物品或空间 affordance

### `memoryActivations`

快通路只含：

- schemaId
- observerId
- targetId
- expectationEn
- confidence
- status

慢通路额外含：

- eventId
- actorId
- event fact
- time/place/participants
- sourceRefs

### `prohibitions`

集中表达：

- ACL
- locked facts
- 不可移动人物/物品
- 不可声称的历史细节
- 玩家控制权

## 10.3 Prompt 预算

本期验收目标与 2026-08-13 真实运行验收：

| 指标 | 变更前/旧测量 | 真实运行验收 | 硬门禁 |
| --- | ---: | ---: | ---: |
| `maxPromptCharacters` | 由 active role 配置和生产预算函数导出 | 298,080 chars | 总 Prompt 不得超过 298,080 chars |
| 总 Prompt | 未作为本项旧基线 | 半成品 V1 为 58,792 chars；最终为 58,916 chars | 不得超过 `maxPromptCharacters` |
| 真实 Initial System | 27,018 chars | 27,221 chars（+203） | 不得超过 27,221 chars |
| User Payload 顶层字段 | 37 | 6 | 严格等于 6 |
| 真实运行 User Payload | 约 180 KB | 半成品 V1 为 33,170 bytes；最终为 33,294 bytes | 不超过 50 KB |
| 单 actor context | 最高 111 KB | 不超过 4 KB | 不超过 4 KB |
| active Schema | 无严格上下文上限 | 每 actor 最多 3 条 | 每 actor 最多 3 条 |
| 慢通路 Event | 混入全部历史 | 每 actor 最多 3 条、全局最多 8 条 | 每 actor 最多 3 条、全局最多 8 条 |
| protected 字段/section | 不适用 | 未裁剪 | 不得裁剪 |
| 旧 payload 重复 | 存在 | 0 | 必须保持 0 |

用户明确接受真实 Initial System 从旧测量 27,018 chars 到 27,221 chars 的 +203 增量；该增量不修改、不作为失败。原“System Prompt 文案本期不得增加”门禁由 27,221 chars 的批准基线兼硬上限替代：未经新的明确批准不得继续增长。

该批准不放宽总 Prompt 的运行时预算、50 KB User Payload、LowTierContextV1 六字段、旧 payload 零重复，或 protected 字段/section 不得裁剪的要求。protected 范围继续包括 Initial System、output Schema、player action、current Authority Snapshot 与 current-scene actor capsule contract。

Lifecycle 修订不会把 `cast`、永久标记或状态时间加入 LowTier Actor Card。恢复 `lifeStatusDetailEn` 后必须重新测量 User Payload；允许数值相对 33,170 bytes 变化，但不得超过 50 KB、产生第七个顶层字段、裁剪 protected section 或重新引入旧 payload。

System Prompt 整体编排、章节顺序与进一步压缩仍属于后续独立项目，不纳入本变更。

## 11. Qdrant 与 Knowledge V2

## 11.1 索引单元

Qdrant 只索引以下独立记录：

- Actor Core
- Event
- Appraisal
- Person Schema
- Social Evidence
- Scene
- Item/Clue（按既有权限）

## 11.2 禁止 Actor 聚合记录

Knowledge V2 Actor record 不得再嵌入：

- shared memory 全文
- social statements 全文
- relationship edge 全文
- runtime actor 完整对象
- current presentation 完整对象

Actor Core 索引只用于人物发现与稳定本色检索。

## 11.3 Hydration

```text
Qdrant result
-> recordId + score + sourceRefs
-> State/chat canonical hydration
-> revision/clock/ACL validation
-> Context Projector
```

未成功 hydration 的结果不得进入 Prompt。

## 11.4 可重建性

删除全部 Qdrant collection 后，必须可由 State + chat 重建完全等价的 Knowledge V2 索引。

Qdrant 删除或不可用不得丢失：

- Event
- Appraisal
- Schema
- relation evidence
- Actor Core
- memory tier membership

## 12. 功能需求

### FR-1 Actor Core 单一权威

所有稳定人物本色只写 Actor Core。普通回合不得改写。

### FR-2 Runtime 去重

Actor Runtime 不得复制 Actor Core、Identity、关系、印象或记忆。

### FR-3 Event 单写

同一 Event 的事实摘要只能存在一份权威正文。

### FR-4 Memory 引用

人物记忆层级只保存 Event/Appraisal 引用。

### FR-5 Schema 可修订

Schema 必须保留支持、反例、confidence 和 supersede 链。

### FR-6 具体历史门禁

只有 hydrated Event 才授权具体历史声明。

### FR-7 Social 单一权威

Social Graph 不再复制进 Actor Core。

### FR-8 Unified Dossier

所有人物前端入口必须使用同一 ViewModel。

### FR-9 Viewer ACL

玩家 ViewModel、NPC Prompt ViewModel 和 authority debug ViewModel 必须显式传入 viewerId/access mode。

### FR-10 Qdrant 只索引

任何 Qdrant 结果不得直接成为世界写入源。

### FR-11 无新增付费调用

字段统一、投影和 hydration 全部为确定性本地逻辑。

### FR-12 失败可降级

Qdrant 不可用时：

- Character Core 仍直接加载
- active Schema 可按 exact ID/关键词检索
- Event 可按 source refs 扩散
- 前端人物卡完整可用

### FR-13 Cast 生命周期单一权威

`ActorCoreV1.cast` 是人物来源与首次认识的唯一权威。Story Cast、人物列表、Appearance、Pacing 与 Calendar 不得读取旧 `source/introduced*/playerKnown/knownToPlayer` Actor 字段。

### FR-14 完整生命状态单一权威

`ActorRuntimeV1` 是生命状态唯一权威。Core 不复制生命字段；所有生命状态更新必须原子校验并保留不可逆约束。

### FR-15 临时身份转正

临时人物使用稳定 Actor ID、Core 与 Runtime `temporary=true`。身份揭晓后保留 Actor ID，更新 Core name/aliases/identity provenance，并原子置 `temporary=false`；不得保存第二套 resolved/provisional identity 字段。

## 13. 一次性原子迁移

## 13.1 版本字段

新增：

- `actorContextVersion = 1`
- `memoryReferenceVersion = 1`
- `actorDossierProjectionVersion = 1`

## 13.2 Actor Library 迁移

从旧 profile 迁移：

| 旧字段 | 新位置 |
| --- | --- |
| name/role/publicDescription/background | Actor Core |
| personality/speechStyle | `performanceCore` |
| privateGoal | 能判定为稳定动机则进入 motives，否则进入 Runtime currentGoal |
| fear | `performanceCore.vulnerabilitiesEn` |
| secret/knowledge | `privateFacts` |
| identity | Actor Core identity |
| `source` | `ActorCore.cast.origin`，严格映射到有限枚举 |
| `introducedClock/introducedTurn` | `ActorCore.cast`；Core/Runtime 重复值必须相同，否则迁移失败 |
| sharedMemories | Actor Memory Index refs |
| impression | 一次性 Appraisal 记录 |
| socialStatements/socialRelationships | 删除，由 Social Graph 投影 |

迁移不得调用模型。迁移是单次 cutover，不建立长期兼容层。

无法确定 `privateGoal` 是稳定动机还是场景任务时，默认进入 Runtime，不写稳定人物本色。

`cast.origin` 的一次性映射：

| 旧来源 | 新值 |
| --- | --- |
| `canon_catalog` | `canon_catalog` |
| `preset_location_resident` | `preset_resident` |
| `pacing_public_guest` | `generated_guest` |
| `scene_temporary_actor` 或 runtime `temporary=true` | `scene_temporary` |
| 无来源 | `foundation` |

`canonCatalogId` 继续是 Canon 身份权威，不能由 `cast.origin` 替代。runtime-only 临时人物必须创建最小 Actor Core，并保留 `scene_temporary` 来源。

## 13.3 Runtime 迁移

保留：

- map/room/present
- `lifeStatus/lifeStatusPermanent/lifeStatusDetailEn/lifeStatusSinceClock`
- current activity/intent/goal
- temporary

生命字段以 Runtime 为旧档优先来源；只有 Runtime 缺失时才读取同 ID profile。Core/Runtime 同时存在但值冲突时迁移失败，不静默选择。

删除：

- Core/Identity/name/role/relationship/impression/memory 副本
- 中文 `lifeStatusDetail` 副本
- `provisionalActorId/resolvedIdentityId/identityStatus/identityEvidenceEn`
- `temporaryMemories`

旧 identity evidence 必须能转换为 `identity.provenance` source ref；临时记忆必须转换为 Actor Memory Index ref。无法无损转换时迁移失败。

迁移成功后所有读取方只读取新结构。

## 13.4 Shared Memory 迁移

1. 有合法 `eventId`：转换成 Event MemoryRef。
2. 有合法 Appraisal ID：转换成 Appraisal MemoryRef。
3. 只有旧 summary：一次性创建 migrated Appraisal，再保存引用并删除旧 summary。
4. migrated Appraisal 不授权具体历史 callback；只有 canonical Event 才授权具体历史。

## 13.5 Impression 迁移

- `firstImpression*` 转换为 immutable first-impression Appraisal/ref
- `impressionOfPlayerEn` 一次性转换为 Appraisal
- active Schema 存在时只显示 Schema 投影
- 迁移成功后删除旧 impression 字段，不再读取或写入

## 13.6 Qdrant 重建

迁移完成后执行一次全量 Knowledge V2 rebuild。

旧 Actor 聚合记录必须删除，不能与新独立记录并存。

## 14. 原子切换规则

- 迁移前先完整构造并校验新 State。
- 只有新 State 通过全部引用、字段白名单与权威不变量校验后，才一次性替换旧 State。
- 迁移失败时不得提交任何部分结果，原存档保持原样。
- 迁移成功后只走新结构；不保留双读、双写、fallback projector 或兼容周期。
- 本项目只支持从当前已知存档 Schema 到 V1 的这一次迁移，不建设通用历史考古框架。

## 15. 验收标准

### AC-1 唯一事实

同一 Event 的 `summaryEn` 在世界权威 State 中只出现一次。

### AC-2 引用完整

所有 memory ref、Schema support/counter ref、relation evidence ref 均能解析到唯一权威记录。

### AC-3 无孤儿引用

迁移后 orphan reference 数量为 0；旧文本若没有 Event，只能迁成不授权 callback 的 Appraisal，不得伪造 Event。

### AC-4 Prompt 预算

真实运行验收同时满足：

- `maxPromptCharacters = 298080`
- 半成品 V1 总 Prompt 基线为 58,792 chars；修订后实测为 58,916 chars，未超过运行时预算
- 真实 Initial System 为 27,221 chars，且后续不得继续增长
- 半成品 V1 User Payload 基线为 33,170 bytes；修订后实测为 33,294 bytes，未超过 50 KB
- User Payload 顶层字段严格等于 6
- protected 字段/section 未裁剪
- 旧 payload 重复为 0

相对旧测量 27,018 chars 的 Initial System +203 增量已由用户明确接受，不要求修改且不构成验收失败。

### AC-5 人物本色

哈利、赫敏入场时均有非占位：

- temperament
- speech style
- motive
- social strategy
- boundary

不得使用“完成场景节拍”“符合 Canon”作为唯一内容。

### AC-6 前端一致

同一人物在人物列表、NPC 检查器和关系星图：

- 名称一致
- 关系标签一致
- 10 维数值一致
- Sentiment 一致
- evidence 数量一致

### AC-7 前端字段

Actor Dossier ViewModel 除 `schemaVersion` 外只能有 8 个业务顶层字段。

### AC-8 展示区

NPC 人物卡严格为 6 个展示区，不再出现重复的“公开档案/身份/背景/关系”卡。

### AC-9 初见与当前看法分离

初见印象不可被当前 Schema 覆盖，当前 Schema 必须显示来源数量与 confidence。

### AC-10 Qdrant 删除恢复

删除 Qdrant 后：

- 前端人物卡无数据损失
- exact-only 快通路可运行
- 重建后检索记录 ID、ACL 和 source refs 稳定

### AC-11 快通路

当前线索命中 Schema 但没有加载 Event 时，NPC 可以按 expectation 行动，但输出不得声称具体历史。

### AC-12 慢通路

当前线索命中 Event anchor 时，系统能沿 `supportEventIds` 召回具体 Event，并允许 actor-scoped callback。

### AC-13 反例

新反例 Appraisal 能降低 Schema confidence 或使其 contested，旧支持事件和旧 Schema 仍可审计。

### AC-14 无新增模型调用

普通成功回合的 low/medium/high 调用预算与当前一致。

### AC-15 全量回归

所有 Hogwarts 自动化测试通过，并新增：

- Actor Core/Runtime 去重测试
- Event 单写与 memory ref 测试
- Schema 快慢通路测试
- Qdrant rebuild 稳定性测试
- Unified Dossier 字段白名单测试
- 关系星图/人物卡一致性测试

### AC-16 Story Cast 与首次认识

- 2 个 Tina runtime-only 临时人物不占永久 `storyActorCount`
- 7 个 `pacing_public_guest` 的原创客串配额语义迁移后不变
- 7 个 `canon_catalog` 与 2 个 `preset_location_resident` 的来源语义可区分
- Story Cast 不读取旧 `source/sharedMemories/relationshipTags/relationshipToPlayerEn`
- known actor 只由统一生命周期投影判断
- 临时人物转正后 Actor ID、记忆引用和 Identity provenance 完整

### AC-17 不可逆生命状态

- Medium 可提交可逆 `injured/incapacitated/missing`
- 只有 High 可首次提交永久状态或死亡
- `lifeStatusPermanent=true` 后任何 tier 都不能复活或改写状态
- `lifeStatusDetailEn` 与 `lifeStatusSinceClock` 在 transition、rollback、retry、save/load 后保持
- Core 中不存在生命字段副本

## 16. 产品指标

| 指标 | 当前基线 | 目标 |
| --- | ---: | ---: |
| Actor Library 大小 | 218 KB | 至少下降 50% |
| Actor Runtime 大小 | 76 KB | 至少下降 60% |
| Cast 来源/首次认识权威 | Core/Runtime 重复且部分缺失 | Core `cast` 一份 |
| 生命状态权威 | Core/Runtime 21 人重复 | Runtime 一份，4 个原子字段 |
| 临时人物计入永久 Cast | 半成品 V1 会误计 | 0 |
| 同 Event witness 文本副本 | 31 条 / 5 Event | 0 |
| 低档 User Payload | 约 180 KB | <= 50 KB |
| 单 actor Prompt context | 最高 111 KB | <= 4 KB |
| NPC 人物卡展示区 | 9 | 6 |
| NPC ViewModel 顶层业务字段 | 多源散读 | 8 |
| 关系标签实现 | 至少 2 套 | 1 套 |
| Qdrant Actor 聚合历史副本 | 存在 | 0 |

## 17. 风险与处理

### R1. 当前存档中的旧记忆缺少 Event ID

处理：一次性迁成不授权 callback 的 Appraisal；禁止伪造 Event。

### R2. 删除副本后读取方遗漏

处理：在内存中完成全量投影和校验；通过后原子替换，失败则保持原 State。

### R3. Character Core 过度暴露秘密

处理：玩家 Dossier 与 Performer Card 使用不同 viewer/access projection；`privateFacts` 永不进入玩家 ViewModel。

### R4. Schema 变成剧本锁定

处理：强制 confidence、counterexample、contested 和 supersede；Schema 只给 action biases，不给唯一动作。

### R5. Qdrant 不可用

处理：exact retrieval + ID expansion 是功能基线；Qdrant 只优化召回排序。

### R6. Prompt 虽去重但 System 仍过长

处理：本期只保证 User Payload 收敛。System Prompt 压缩列为下一阶段，不混入本期验收。

### R7. 严格白名单删除唯一业务语义

处理：任何字段删除前必须证明它是重复副本或可从唯一权威确定性派生；Story Cast、player-known、identity promotion、生命状态、rollback/retry/transition 均有不变量测试。不能仅因字段不进入 Prompt 就从 State 删除。

## 18. 建议实施顺序

### Phase 1: 建立新权威结构与统一投影

- 补全 `ActorCore.cast`
- 补全 Runtime 四字段生命状态
- 建立 `ActorDossierViewModelV1`
- 建立唯一 relationship projector
- 修复 `*En` 前端回退
- 添加严格字段白名单和完整性校验

### Phase 2: 一次性迁移并切断旧写入

- source/introduced/runtime identity lifecycle 迁移
- 生命状态双份迁为 Runtime 单份
- Story Cast、People Panel、Appearance、Calendar 改读统一投影
- Social Reducer 停止写 profile social copies
- Memory Reducer 停止把 Schema 回写 impression
- Runtime Reducer 停止复制稳定 profile/Identity 字段
- Event witness 改写 memory refs
- Actor Core/Runtime 分离
- shared memory 转 refs
- impression 转 Appraisal/Schema
- 清理旧副本

### Phase 3: Knowledge V2/Qdrant 重建

- 删除 Actor 大聚合记录
- 独立索引 canonical records
- 实现 hydration
- 验证 exact-only 降级

### Phase 4: Prompt 数据切换

- 37 字段切换为 6 字段
- Tina fixture 预算验收
- 保持现有 System Prompt 文案

### 后续独立项目

完成本 PRD 后，再创建“初级导演 Prompt 编排 PRD”，处理：

- System Prompt 层级
- 表演规则优先级
- 输出 Schema
- 修复 Prompt
- 文风合同

本 PRD 不提前解决这些问题。

## 19. 最终定义

### 人物卡放在哪一层

人物卡来自 Character Core，但它不是一份新的权威数据。它是：

```text
Character Core
+ viewer-scoped Identity
+ Actor Runtime
+ Social projection
+ Schema projection
+ Memory references hydration
+ Item projection
-> Actor Dossier ViewModel
```

### “一次记录，到处引用”的定义

满足以下全部条件才算实现：

1. Event、Appraisal、Schema、Social Evidence、Identity Fact、Item 各自只有一个权威正文。
2. Cast 来源/首次认识只在 Core `cast` 保存，生命状态只在 Runtime 保存。
3. 人物记忆、前端卡片、Prompt 和 Qdrant 只保存引用或可重建投影。
4. 任何投影都能通过稳定 ID/source refs 回到权威底本。
5. 删除 Qdrant 和所有 UI session 后，世界事实不丢失。
6. Schema 可直接指导行为，但具体历史只能由 Event 授权。

## 20. Approval

旧 `Prompt Runtime Budget Acceptance · 2026-08-13` revision 已批准的 Prompt 数值继续作为本 revision 的预算约束：

1. 保留真实 Initial System 27,221 chars；相对旧测量 27,018 chars 的 +203 不修改、不作为失败。
2. 保留 `maxPromptCharacters=298080`、User Payload 不超过 50 KB、protected 未裁剪、旧 payload 重复为 0 的门禁；58,792 chars / 33,170 bytes 是 lifecycle 修订前的半成品 V1 基线，不是要求修订后逐字相等。
3. System Prompt 整体编排继续留给后续独立项目。

但旧 revision 对 Actor Core/Runtime 的 9 字段边界遗漏了 Story Cast 与不可逆生命状态权威，因此整体批准已失效。

当前 `Actor Lifecycle Authority Completion · 2026-08-13` revision 状态：**Approved**。

批准决策：Core 10 字段、Runtime 12 字段、Dossier 8 个业务顶层字段、LowTier 6 个顶层字段；一次性原子迁移，不增加兼容层。
