# Hogwarts MUD 真实运行 PRD

## 文档性质

本目录是 Hogwarts MUD 的 living runtime contract。它记录已经落到代码、存档和测试中的真实行为，不替代产品愿景，也不根据字段名猜测语义。

权威优先级固定为：

1. Reducer、validator、migration 与 projection 的生产代码。
2. 可重放的自动化测试。
3. 真实存档、持久化 diagnostics 与运行日志。
4. 本目录文档。

代码行为变化时，提交必须同步更新对应字段注册表和事务文档。文档与前三层冲突时，以前三层为准，并立即修正文档。

专题事务：

- `presence-scene-transition.md`：active/local/witness 与转场投影。
- `item-lifecycle.md`：Item proposal、Reducer、迁移、呈现与 UI 可见性。
- `actor-memory.md`：人物记忆证据、转场稀疏更新、质量门禁与旧档清理。
- `knowledge-runtime.md`：Knowledge V2、可降级后端、Planner/Relational Synapse、Prompt 权威、调用预算与 Task 7 修复。
- `spell-observation.md`：咒语观测 D20、获知边界、教学旁路与 Catalog 权威。
- `ordinary-turn-repair.md`：首次 Performer 输出、流式预览、一次结构修复与失败恢复。
- `item-npc-calendar-readiness.md`：Item 成熟度、NPC Identity 与 Calendar 开发准入。
- `../add-calendar-storyline-system/spec.md`：Calendar V2 四层权威，以及 V2.1 日期视图、导演边界、并发日程、自由开场、迁移与 UI。

## 持久化边界

| 存储面 | 路径 | 内容 | 禁止事项 |
| --- | --- | --- | --- |
| 当前 State | JSONL 首行 `chat_metadata.hogwartsMud` | 当前世界、场景、人物、地图、物品、关系、导演状态 | UI session、检索投影和正文不得反写 |
| 已提交消息事务 | 每条消息 `extra.hogwartsMud` | role、sceneId、英文 segments、turn/transition transaction、diagnostics、翻译缓存 | 与 State 原子提交；记录事件与提案结算，不得用旧正文覆盖当前 State |
| UI session | `ui/session-state.js` | 面板、筛选、选中人物、分页、Calendar 选择/展开/自由开场草稿 | 不得保存剧情事实、计划认领或出席结论 |
| Knowledge V2 投影 | 本地 JSON、Vectra/Qdrant 与 `knowledgeBase` diagnostics | 从当前 State + chat 重建的检索记录和索引 | 可降级、可删除重建；不得成为 Reducer 输入权威 |

当前 State 与同次提交的消息 transaction 共同构成运行时事实事务：State 表达当前态，消息 transaction 表达已发生事件、玩家尝试和 Reducer 结算证据。`message.mes`、Scene transcript、Schema、向量结果或 JSON 检索文件都不能单独覆盖这两者。

### Pending Actor Lifecycle Authority Revision

`../unify-actor-context-memory/` 的 2026-08-13 审计确认，当前半成品 Actor Context V1 过度收窄了人物权威：

- Story Cast 仍读取已删除的 `source/introducedClock/relationshipTags/sharedMemories`
- People/Appearance 仍各自读取 Actor known 标记
- Scene Transition 仍校验 `lifeStatusPermanent/lifeStatusDetailEn`，但 V1 Runtime 不持久化

待批准目标是：

- `ActorCoreV1.cast` 单写来源与首次玩家认识
- `ActorRuntimeV1` 单写完整四字段生命状态
- Runtime `temporary` 单写临时身份；Identity provenance 保存揭晓证据引用
- Dossier 保持 8 个业务顶层字段，LowTier 保持 6 个顶层字段

批准和实现前，`state-fields.md` 中标记 **Pending lifecycle revision** 的行不得被视为已落地行为。

## 模块运行索引

| 模块 | 生产入口 | 权威输入 | 权威输出 | 模型权限 | 主要测试 |
| --- | --- | --- | --- | --- | --- |
| 组合根 | `index.js`、`workflows/application.js` | 宿主 API、domain/runtime ports | workflow/UI 实例 | 无业务裁决权 | `hogwarts-mud-task1-baseline`、`task6-ui` |
| Campaign / Character / Initial World | `domain/campaign.js`、`character.js`、`initial-world.js` | 用户建档选择 | 初始 `hogwartsMud` 世界状态 | 开局模型只提议 package | `hogwarts-mud.test.mjs` |
| Context / JSON | `core/context-budget.js`、`json-recovery.js` | role slot、结构化消息 | 受保护 prompt、恢复后的 JSON | 不写世界状态 | `hogwarts-mud-task2-modules` |
| Model Adapter | `adapters/model.js` | role slot、prompt | 原始模型响应、request diagnostics | 只返回文本/JSON | `hogwarts-mud-task5-workflows` |
| Opening | `workflows/opening.js` | 初始草稿、导演基础 | opening package、首幕消息 | 模型提议，Reducer 提交 | `hogwarts-mud-task5-workflows`、主测试 |
| Ordinary Turn | `workflows/turn.js`、`turn-performance.js`、`domain/turn-*` | 玩家消息、当前世界 | turn transaction、消息、世界新状态 | 低档写正文和稀疏 proposal | 主测试、`task5-workflows` |
| Local Semantic | `adapters/local-semantic.js` | 玩家动作、英文 segments、当前状态 | adjudication、observation、perception proposal | 本地模型只提议受限 Schema | 主测试、presence contract |
| Presence / Witness | `presence-witness-contract.js`、`domain/presence-witness-schema.js`、`transition-presence.js` | movement、actor position、scene/cohort roster、perception | active/local/witness/event knowledge | 模型不可写最终名单 | `hogwarts-mud-presence-witness`、主测试 |
| Scene Transition / Archive | `workflows/scene-transition.js`、`domain/scene-transition.js`、`archive-projection.js` | 当前 scene、next intent、actor states | 新 scene、archive、active/local、opening message | 中/高档只提议 transition package | 主测试 |
| Calendar V2/V2.1 | `domain/calendar-*`、`workflows/high-calendar-director.js`、`medium-calendar-director.js`、`calendar-moment.js`、`ui/calendar-*` | clock、storyline/storyBeat/schedule、Actor/地图权威、sceneArchive、Calendar UI session | 四层权威、滚动日程、时钟结算、Scene/beat 关系、三栏日期视图与只读历史 | High 只提议 storyline/beat；Medium 只提议 schedule；UI 只读投影权威字段 | `hogwarts-mud-calendar-*` |
| Spatial / Map / Movement | `domain/maps.js`、`movement.js`、`spatial-*`、`pathfinding.js` | 当前地图、结构化移动 | player/actor 位置、地图差异 | 模型不可绕过可达性 | 主测试、Task 4 |
| Item V3 / Material / Appearance / Spell | `domain/item-schema.js`、`item-reducer.js`、`item-migration.js`、`item-canon.js`、`inventory.js`、`material-state.js`、`appearance.js`、`spell-state.js` | 已观察事件、物品/施法 proposal、玩家候选决策 | formal items、`physicalForm`、pending candidates、material log、presentations、spellbook | 模型只能提议；新 Item 需玩家收录 | Item V2/V3、Narrative Authority、主测试 |
| Actor Context / Identity / Memory | `domain/actor-context-schema.js`、`actor-context-cutover.js`、`actor-context-runtime.js`、`actor-dossier-projection.js`、`npc-identity-*`、`memory-synapse-*`、`cast.js` | `ActorCoreV1`、`ActorRuntimeV1`、Event、合法 observer evidence | Actor Memory Index、Appraisal、Person Schema、Dossier、选角 | 模型只能提交受校验 proposal；不能写 authority Identity、越过 observer 或创造无来源记忆 | Actor Context、Dossier、Memory Synapse |
| Social Graph / Claims | `domain/social-*`、`workflows/social-memory.js`、服务端 social graph | event witness、合法 evidence、self/other claim | directional relationship state、identity/relationship claims、person references | Social Director 只提议；不能写 resolution 或正式 family edge | social contract、Identity claims、Task 3 |
| Time / Directors / World Change | `domain/time-environment.js`、`pacing-*`、`causal-*`、`world-changes.js`、`workflows/directors.js` | clock、scene、signals | daily/pacing/memory/world director 状态 | 按 tier 提议，Reducer 校验 | 主测试 |
| Knowledge / Retrieval / Translation | `knowledge.js`、`domain/knowledge-*`、`domain/relational-synapse-retrieval.js`、`src/hogwarts-mud/knowledge-*`、translation modules | 当前 State、已提交 transaction、audience/revision/clock | 独立 canonical Knowledge records、exact/semantic retrieval、sealed activation | 检索和翻译不写世界事实；索引可由 State + chat 重建 | Knowledge V2、Relational Synapse、主测试 |
| Save / Lifecycle / Diagnostics | `domain/save-revision.js`、`runtime/guarded-save-ports.js`、`save-revision-guard.js`、`save-library.js`、`lifecycle.js`、`turn-diagnostics.js` | JSONL、页面 revision head、宿主 context | 单调 revision、一次性 Actor Context cutover、其他迁移、bounded diagnostics | 冲突和迁移禁止调用模型 | Save revision、Actor Context、readonly E2E |
| UI Projection | `domain/actor-dossier-projection.js`、`people-projection.js`、`relationship-graph.js`、`ui/*` | Actor Core/Runtime、Identity、Social、MemoryRef、Item 与 UI session | `ActorDossierViewModelV1`、统一关系投影、DOM | 只读世界事实；人物入口不得自行合并 raw State | Actor Dossier、people panel、Task 6 |

## Narrative Authority 与 Prompt

所有模型输入仍服从版本化 Narrative Authority 优先级：

1. 当前结构化 State 与 Reducer 投影。
2. 当前 Scene 已提交 transaction 与 Event Knowledge。
3. 更早事件和 Scene Archive。
4. observer-scoped Appraisal 与 Person Schema。
5. 仅作有归属历史证据的 raw transcript。

低优先级来源只能解释当前态，不能覆盖 Item `physicalForm/holder`、Actor Runtime presence/room/life、Scene destination/clock、Identity 或 spell identity。中档只读取经过 timeline/revision/clock/audience hydration 的 evidence；locked clue、private fact 除明确授权流程外不得进入。

普通低档 Performer 与 repair 的 User Payload 只使用 `LowTierContextV1`：

```text
playerTurn
sceneFacts
actorCards
actionOpportunities
memoryActivations
prohibitions
```

`sceneFacts` 收拢当前 authority、Scene、Room、Material、Item 与 Calendar 事实；`actorCards` 只从 Actor Core/Runtime、Social projection 与当前呈现构造；`memoryActivations` 按 observer 密封 Schema expectation 与按需 hydrated Event。顶层严格为六字段，总量不超过 50 KiB，单 actor 不超过 4 KiB，每 actor 最多 3 个 active Schema 和 3 个 Event，全局最多 8 个 Event。具体旧事必须由 matching actor activation 中带 `sourceRefs` 的 Event 支撑。

裁剪先删除 hydrated Event，再删除可重建 opportunity，不得重新注入 raw Actor Library、完整 Social Graph、完整 Identity、人物记忆正文、Knowledge Actor 聚合历史或无界 transcript。初次输出与 repair 都经同一 `projectLowTierContextV1()` 构造。

正常成功预算保持不变：普通回合为既有 1 次低档、0 次新增中/高档；事件边界复用既有 1 次中档；Scene Transition 保持既有中/高档核心与低档开场。Qdrant、Planner、图扩散、hydration 和 Reducer 的低/中/高档调用均为 0；可选本地 Planner 最多 1 次。diagnostics 记录 revision、subquery、实际 backend、degraded、record/source path、suppressed conflict、capsule ID 及 high/medium/low/local call count，不保存 secret 或完整私有 Prompt。

本变更没有重排初级导演 System Prompt。System Prompt 章节、规则优先级、输出 Schema、修复 Prompt 与文风合同的重新编排属于后续独立项目。

## 三条核心事务

### 普通回合

```text
player message
-> local adjudication
-> low-tier scene performance
-> reject replayed player speech and non-NPC dialogue actor IDs
-> turn settlement graph
-> local observation
-> partition existing Item operations / new Item candidates
-> validate evidence and Item authority
-> presence reducer
-> witness resolver
-> event knowledge reducer
-> optional social/memory work
-> metadata + chat atomic persistence
```

### 场景转场

```text
committed nextSceneIntent
-> transition director package
-> low-tier opening segments
-> validate/normalize
-> archive old scene
-> apply actor states
-> project active cast
-> project destination local presence + carried cohort
-> synchronize formal Item locations from holder positions
-> commit new scene/map/items
-> persist metadata + opening message
```

### Calendar Moment

```text
preview one planned schedule
-> validate timelineEpoch + stateRevision and target startClock
-> project only the selected schedule and its public storyline/beat source
-> run normal medium/high Scene Transition with the selected location as a suggestion
-> low opening receives the same selected schedule projection
-> archive the old Scene and append Calendar reverse links
-> advance clock and settle every concurrent schedule locally
-> create the new Scene with only the selected schedule ID
-> persist state + opening message in one guarded transaction
```

`runTimelineMoment({ startClock, mapId, roomId })` 使用同一事务，但锁定玩家选择的合法地点并创建 `calendarEntryIds=[]` 的自由 Scene。Daily Director 可读取当天全部世界并发 schedule；Performer 与 Scene Transition 只读取当前 Scene 明确认领的 schedule 及公开剧情来源。重叠不代表玩家同时出席，也不会自动取消、改期或编造其他安排的结果。Clock settlement 只执行 schedule 的 `planned -> active` 与 `planned|active -> completed`；它不实现 storyBeat，也不写 Item、Identity、Social、Memory、score、grade 或 attendance。

### Calendar 导演与关系

```text
High Calendar Director
-> upsert storyline + storyBeat only
-> no exact time/location, schedule, Scene or opening

Medium Calendar Director
-> read schedulable beats and existing schedules
-> maintain 7-14 day routine/class/social/personal schedules
-> create stable sourceBeatId + beatSlot 1..4 opportunities
-> write entries[] and horizon only
```

Scene 封存继续以 schedule ID 建立 `scene/calendarEntryIds[] <-> entries[].relatedSceneIds[]` 关系。Archive linker 再按 schedule 的 `sourceBeatId` 为 beat 追加去重 Scene ID；四个不同 Scene 才能把 beat 标记为 `realized`。`pacingDirector.pendingBeat` 是单回合提示，与长期 `calendar.storyBeats[]` 无迁移或消费关系。

### Calendar V2.1 UI 只读投影

V2.1 只改变 Calendar 日期视图的信息架构和玩家文案，不改变 `calendar.version=2`、typed collections、schedule 四态、Scene/Archive Schema 或认领写入规则。

- 桌面日期视图固定为左侧日历、中栏【计划】时间网格与【场景】折叠区、右栏精简详情。窄屏保持“日期 -> 计划与场景 -> 详情”的语义顺序；切换日期同时刷新中栏两区，未选择具体项目时右栏保持空状态。
- 【计划】卡按 `startClock` 和 `endClock - startClock` 定位；重叠计划分列或受控错位，但仍是独立 schedule。卡片和详情只读取计划自身的 `planned/active/completed/cancelled` 四态。
- 【场景】卡默认折叠。展开投影只解析对应 `sceneArchive[].calendarEntryIds[]` 中的 schedule ID；缺失或空字段显示【未关联计划】。不得用场景时间、地点、人物或计划区间重叠补链。
- 场景展开、选择和自由开场草稿均为 UI session。自由开场入口、时间/地点表单、校验与 busy/error 状态只在【场景】区呈现；只有明确提交才调用既有 `runTimelineMoment()`。
- 不新增或读取持久化 `attendance` 及同义字段，不显示“去了/没去”，也不从重叠推断认领或出席。V2.1 不增加 Calendar、Scene、Archive、消息或 localStorage Schema。

右栏使用严格字段白名单：

| 选择类型 | 允许显示 | 禁止显示或操作 |
| --- | --- | --- |
| 计划 | 标题、摘要、时间、地点、人物、四态、公开来源、合法的【进入场景】操作 | “开始时刻的全部安排”、自由开场、重复关系/来源/操作说明 |
| 场景 | 标题、时间、地点、档案 ID、摘要、已封存 timeline、只读正文 | 认领计划列表、自由开场、任何历史写操作 |

历史场景必须先按稳定 ID 解析 `sceneArchive` record；该 record 的元数据、timeline、`calendarEntryIds[]` 与 `messageIds` 是历史索引权威，正文以 `messageIds` 指向的原 chat 消息行为内容权威。UI 不复制、不重新生成、不从 Calendar 补写历史正文。所有面向玩家的中文使用“场景”；内部类型名、代码标识和存档字段可继续使用 `Scene`。

### 旧档加载

```text
read chat_metadata.hogwartsMud
-> migrate/register timelineEpoch + stateRevision head
-> clone State
-> run migrateActorContextV1 before other actor migrations
-> validate exact ActorCoreV1/ActorRuntimeV1/ActorMemoryIndexV1 and all refs
-> replace original State only after the complete cutover succeeds
-> skip removed actor/Identity/social copy migrations once all three V1 versions are present
-> continue deterministic non-actor lifecycle migrations
-> migrate Calendar V1 into V2 typed collections, or initialize/normalize V2
-> preserve V1 event IDs/fields without inventing storyBeat or beatSlot
-> never read legacy agenda or copy sceneArchive body
-> migrate Item V1/current presentation and seed eligible Canon items
-> repair spatial state
-> repair active/local projections
-> save only when changed
-> render projections
```

Actor Context cutover 将有合法 Event/Appraisal ID 的旧人物记忆转换为 MemoryRef；只有文本的旧人物记忆和印象转换为不授权具体历史的 migrated Appraisal。成功后删除旧人物记忆正文、印象、运行态稳定字段/Identity 与 profile Social 副本，不建立兼容期、双读、双写或备用 projector。任一步失败时不修改原 State、不触发保存。

旧档加载不得调用用户的低、中、高档模型。任何必须依赖模型才能解释的旧字段会使本次 Actor Context cutover 失败，由调用方保留原存档。

### 保存门禁

```text
Hogwarts metadata/chat save
-> compare page timelineEpoch/stateRevision with registered head
-> serialize claim with Web Locks or synchronous storage fallback
-> reject stale/save-in-progress without host persistence
-> append bounded Item/Identity diff only for world changes
-> persist host metadata/chat
-> finalize head; restore previous head if persistence fails
```

新时间线在首次保存前生成独立 epoch。旧档 revision migration 保持 `stateRevision=0` 和空 history；rollback 作为更高 revision 提交。chat-only、翻译和设置保存也必须先检查 head，但不制造空 revision。冲突后页面禁止继续写世界或请求模型，直到用户重新载入。

## 变更规则

新增或修改运行时字段时必须同时完成：

1. 在 `state-fields.md` 登记字段路径、唯一写入者和读取者。
2. 在对应 domain module 中实现 normalize/validate/reducer。
3. 在 workflow 中只做事务编排，不复制规则。
4. 为旧档提供确定性迁移或明确版本门槛。
5. 为消息或世界状态补可读取 diagnostics。
6. 添加至少一个正常路径和一个边界回归测试。
7. 更新 `progress.md` 的证据等级。
