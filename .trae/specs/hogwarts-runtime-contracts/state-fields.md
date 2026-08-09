# 世界状态字段注册表

## 规则

- 未登记字段不得被新 workflow 直接写入。
- “兼容字段”只能服务旧调用方，不能重新获得权威语义。
- UI 只能读取本表列出的世界字段，页面交互状态写入 `ui/session-state.js`。
- 任何人物名单都必须注明它表达 active、local、participant 还是 witness。

## UI session 字段

这些字段只存在于当前页面实例，不写入 JSONL 世界权威。

| 字段路径 | 真实语义 | 唯一写入者 | 主要读取者 | 兼容/诊断 |
| --- | --- | --- | --- | --- |
| `session.liveSceneStream` | 当前生成阶段、内部 raw 长度、恢复 segments 与判定预览 | app controller、turn workflow | loading card renderer | segments 仅供内部诊断；提交前不得渲染为正文 |
| `session.latestStoryMessageId` | 当前 scene 最近一次已渲染的消息 ID | story renderer | story scroll resolver | 新 assistant ID 只触发一次顶部定位；scene 切换时清空；首次 scene load 固定 retain；generation/candidate 不覆盖阅读位置 |

## UI projection 字段

这些字段由世界权威和 UI 筛选即时派生，不写入 JSONL 或 localStorage。

| 字段路径 | 真实语义 | 唯一写入者 | 主要读取者 | 兼容/诊断 |
| --- | --- | --- | --- | --- |
| `relationshipProjection.contextEdgeIds` | 未命中关系筛选、但两个端点仍在当前人物集合中的 player-known 背景边 ID | `filterRelationshipGraphProjection()` | Cytoscape class projector | 固定 5% 不透明度；不进入计数、详情、文本回退或点击交互 |

## 世界根字段

| 字段路径 | 真实语义 | 唯一写入者 | 主要读取者 | 兼容/诊断 |
| --- | --- | --- | --- | --- |
| `phase` | 世界初始化/游玩状态 | opening reducers、lifecycle | UI、workflow gates | 无 |
| `campaign` | 时间线与剧本硬约束 | setup、initial world | prompts、directors | 不由模型覆盖 |
| `character` | 玩家身份与属性 | setup、character reducer | prompts、checks、UI | 玩家事实权威 |
| `modelSlots` | role 到 Connection Profile/预算映射 | settings controller、slot migration | model adapter、workflows | `responseHeadroomVersion` 管迁移 |
| `clock` | 当前权威世界时间 | turn/transition reducers | 全部导演、UI | 正文不能反写 |
| `chapter`、`location` | 当前玩家可见章节与地点标签 | opening/transition reducers | UI、prompt | `scene/map` 才是结构权威 |
| `turn` | 回合计数、状态、错误、最近耗时 | turn reducer/workflow | recovery、UI、directors | 同一回合重试必须幂等；`resolving` 不授权 reload 自动调用模型 |
| `checks` | 已提交判定记录 | check/turn reducer | prompt、inspector | 可解析的主动咒语观测会覆盖错误 semantic no-check，并固定只投一次 D20 |

## 场景、地图与空间

| 字段路径 | 真实语义 | 唯一写入者 | 主要读取者 | 兼容/诊断 |
| --- | --- | --- | --- | --- |
| `scene` | 当前场景 ID、开场摘要、起点、room、timeline、next intent | opening/transition/scene reducers | turn、UI、archive | `summary/summaryEn` 是开场快照；timeline 推进后不再作为 Performer 当前态；`startedMessageId` 绑定聊天范围 |
| `scene.timelineEntries[]` | 场景内按时钟排序的已提交历史 | turn/transition reducers | performer、UI、archive | 不是同时态；后续形态、位置与物质条目覆盖早期条目 |
| `sceneArchive[]` | 已封存场景快照 | archive projector | archive UI、knowledge | 分开保存 active/local/cohort/event |
| `sceneTransition` | 转场任务状态，不是转场 package | scene transition workflow/lifecycle | UI、job recovery | opening message 持久化 transition diagnostics |
| `map` | 地图目录、当前节点与运行时差异 | map/movement/transition reducers | spatial、UI、prompts | 原著底图只读 |
| `spatial.player` | 玩家结构化 mapId/roomId | movement/transition reducers | pathfinding、visibility | 必须与当前 map/scene 对齐 |
| `spatial.lastMovement` | 最近一次已提交移动 | movement reducer | retry、migration | 不是 prose 推断缓存 |

## 人物三层状态

| 字段路径 | 真实语义 | 唯一写入者 | 主要读取者 | 兼容/诊断 |
| --- | --- | --- | --- | --- |
| `actorLibrary[]` | 稳定人物档案、知识、记忆、关系投影 | actor/social/memory reducers | prompts、inspector | 仅存在于 library 不证明在场 |
| `actorLibrary[].sharedMemories` | 按 core/recent/everyday 分层的人物特定记忆 | turn/transition/memory reducers、public event witness projector | actor capsule、inspector | 禁止从 closure summary 或 roster 批量生成；room-wide notable/major 事件只写实际 witness |
| `actors[]` | 人物运行态：活动、位置、生命、active 兼容位 | turn/transition/spatial reducers | prompts、UI、presence | `actor.present` 仅兼容 active |
| `activeInteractionActorIds[]` | 2–4 名当前互动卡司 | turn/scene settlement reducers | scene performer、快捷互动、UI | 不代表完整房间人口 |
| `localPresence.mapId/roomId` | 当前物理占位所属房间 | presence reducer | UI、witness resolver | 必须匹配玩家当前房间 |
| `localPresence.occupantActorIds[]` | 同室且已确认存在的已知人物 | presence reducer | current-location UI、witness | 不因退出镜头删除 |
| `localPresence.cohortIds[]` | 同室稳定群体 | presence reducer | UI 摘要、witness | 不自动展开关系边 |
| `cohorts[]` | class/dorm/family/scene roster | presence reducer、deterministic migration | presence、witness、UI | roster 是位置证据，library 不是 |
| `eventKnowledge[]` | 事件 participant/witness/perception 事实 | event knowledge reducer | social、memory、knowledge | 不直接修改关系；合格公共事件可按 event ID 幂等投影中性 witness memory |

人物层不变量：

```text
active interaction != local presence != event witness
actor.present == active compatibility
actor.present=false != actor left room
actorLibrary membership != physical presence
```

## 物品、呈现与法术

| 字段路径 | 真实语义 | 唯一写入者 | 主要读取者 | 兼容/诊断 |
| --- | --- | --- | --- | --- |
| `itemSystemVersion` | 正式物品系统迁移版本 | item migration | lifecycle、debug | V2 当前值为 `2` |
| `canonItemCatalogVersion` | 已应用 Canon 标志物目录版本 | item migration | lifecycle | seed 按稳定 ID 幂等 |
| `items[].id/version/type` | 正式 Item 稳定身份与物理类别 | Item Reducer、deterministic migration | prompt、projection、UI | `kind` 仅为 V1 兼容投影 |
| `items[].ownerId/holderId` | 社会/法律主人和当前持有人 | Item Reducer | operation validation、UI、movement | 借出/偷走只改变 holder；destroy 保留 holder；lose/consume 清 holder；`custody` 仅兼容 |
| `items[].location` | 当前 `mapId/roomId/placement` | Item Reducer、holder-location projector | scene snapshot、UI、prompt | 有 holder 时按 holder 结构位置跟随，包含 `destroyed` Item |
| `items[].appearanceEn/appearance` | 客观可见外观 | accepted proposal、migration、Canon seed | UI、prompt | 不保存主观价值判断 |
| `items[].state/isEquipped` | 完好、损坏、脏污、消耗、丢失、销毁及正式穿戴 | Item Reducer | presentation sync、UI | 高风险状态操作需 Item + 动作双重 evidence；destroyed/consumed 不被 carry 复活 |
| `items[].sourceEventId/notesEn/notes` | 首次建档来源与有界事实备注 | accepted proposal、migration、Canon seed | UI、debug、director context | Canon 另存 `sourceUrl` |
| `items[].storyRoles/visibility` | 社会意义、线索、承诺等剧情角色及玩家可见性 | Item Reducer、authorized migration | Item projection、director context | `hidden` 不进入玩家 projection |
| `items[].acquiredAt/transferMode/updatedClock` | 获得时间精度、最近转移语义和更新时间 | Item Reducer、migration | UI、debug | 不捏造未知精确时刻 |
| `pendingItemProposals[]` | 等待玩家收录/忽略的新 Item 候选 | turn reducer、candidate queue | message/UI projection | 最多 24；普通物品完成 gift/loan/return/theft 后也可进入；模型不能直接写 `items` |
| `itemProposalDecisions[]` | 已收录/忽略候选的稳定决策指纹 | candidate resolver | candidate partition、message renderer、UI world projection | 最多 120；纯本地提交，不等待 knowledge/model；ignored 按 item ID 抑制重现 |
| `scene.itemStates[]` | 当前场景正式物品派生快照 | turn/transition/item projector | prompt、archive | 从 `items` 重建，不是独立权威 |
| `materialEventLog[]` | 已校验物质变化事件 | material reducer | knowledge、debug | 普通手持物/饰品只留事件与正文，不创建 Item |
| `actorPresentations[actorId].outfit` | 普通穿着的整体造型文本 | appearance/material reducer | prompt、inspector | 不拆普通服装数量 |
| `actorPresentations[actorId].wornItemIds/heldItemIds` | 正式穿戴与手持 Item 引用 | Item Reducer、migration | prompt、inspector | 只引用可用 Item ID；hidden 解析受可见性约束 |
| `actorPresentations[actorId].updatedClock` | 当前呈现最后变更时间 | appearance/material/Item Reducer | UI、prompt | 不由普通隐含物品使用刷新 |
| `actorPresentations.*.accessories/heldItems/heldObject` | V1 自由文本呈现 | 仅旧档迁移输入 | legacy display fallback | 新回合不再写入 |
| `spellbook` | 已学法术与来源，当前 Schema/Catalog version 为 2 | spell reducer/migration、spell candidate resolver | check、prompt、UI | 主动观测仅 `success_with_cost+` 学习；NPC 明确教学可在观测失败后学习；年级不是硬门禁 |
| `spellbook.known[].definition` | accepted 自定义咒语的内嵌稳定 definition | spell candidate resolver | catalog resolver、check、composer、inspector | Catalog spell 不重复内嵌；custom 必须 `sourceTier=player_confirmed_custom` |
| `pendingSpellProposals[]` | 等待玩家收录/忽略的未知教学或玩家自创咒语 | turn reducer、spell proposal queue | message/UI projection | 权威 scene 中同一 technique 的替代咒文不得进入；明确独立的新咒语和玩家自由标记仍可进入；最多 24 |
| `spellProposalDecisions[]` | 自定义咒语候选的 accepted/ignored 稳定决策 | spell candidate resolver | proposal queue、message renderer | 最多 120；纯本地提交，不等待 knowledge/model |

## 社交、记忆与导演

| 字段路径 | 真实语义 | 唯一写入者 | 主要读取者 | 兼容/诊断 |
| --- | --- | --- | --- | --- |
| `socialGraph` | 定向关系维度、情绪、结构标签、cursor | Social Reducer/migration | prompts、graph UI | 不存在全局恋爱阶段 |
| `dailyDirector` | 当前游戏日计划及刷新状态 | director workflow/reducer | turn prompts | 只跨日期刷新 |
| `pacingDirector` | 节奏评估、冷却、pending beat | pacing reducer/workflow | turn/transition | 不直接写正文 |
| `memoryDirector` | event-boundary consolidation 状态 | memory workflow/reducer | social memory | 不按固定回合盲目整理 |
| `causalCollapse` | 已绑定的可显影后果 | causal reducer | pacing/directors | 只消费预写事实 |
| `sceneEnrichment` | 转场后延迟世界变化状态 | transition/world reducers | background work | 不能覆盖已提交 scene core |

## 消息级字段

| 字段路径 | 真实语义 | 写入者 | 读取者 |
| --- | --- | --- | --- |
| `extra.hogwartsMud.role` | player/scene/opening 等消息角色 | workflow message builders | archive、UI、recovery |
| `extra.hogwartsMud.sceneId` | 消息所属场景 | workflow message builders | archive、knowledge |
| `extra.hogwartsMud.itemDirectives[]` | 玩家输入中合法配对的 Item operation + stable Item ID 意图 | turn workflow deterministic parser | performer、debug、retry | 不是 outcome，不直接写 `items` |
| `extra.hogwartsMud.itemDirectiveErrors[]` | 孤立、未知或非法 Item directive diagnostics | turn workflow deterministic parser | debug | 不阻断正文，不猜测替代 Item |
| `extra.hogwartsMud.segments[]` | 英文权威 narration/dialogue 分段 | scene performer/transition opening | render、observe、archive |
| `extra.hogwartsMud.turnTransaction` | 已提交回合事务快照 | turn workflow | retry、migration、debug |
| `extra.hogwartsMud.turnTransaction.checkResolution.spellObservation` | 主动观测的内部 spell 目标与 D20 结果 | check resolver / turn workflow | performer、spell reducer、check card | failure 时公开 UI/正文不得泄露 spell identity |
| `extra.hogwartsMud.turnTransaction.spellCandidates[]` | 本回合明确教学或玩家自由标记产生的自定义咒语候选 | turn workflow deterministic extractor | turn reducer、message renderer、debug | 不是已学习；必须由玩家收录；未知效果只保存 observed evidence |
| `extra.hogwartsMud.turnTransaction.itemOperations[]` | 对已有正式 Item 的证据化操作 | turn workflow | turn validator/reducer、debug | 只允许稳定已有 ID |
| `extra.hogwartsMud.turnTransaction.itemCandidates[]` | 本回合发现的新 Item 候选快照 | turn workflow | message renderer、retry | 只允许 `acquire`，不等于正式入库 |
| `extra.hogwartsMud.turnDiagnostics` | bounded 回合诊断，含 initial/repair request、response、validation 与 commit/error 边界 | turn diagnostics recorder | 后续 debug |
| `extra.hogwartsMud.sceneTransition.diagnostics` | actor states、active/local 提交对比 | transition message builder | 后续转场 debug |
| `extra.hogwartsMud.sourceEn` | 英文事实原文 | message builder | translation/render |
| `extra.hogwartsMud.translatedZh` | 显示译文缓存 | translation workflow | renderer；不得参与状态提取 |

## 排障入口

1. 先定位最新相关消息的 `extra.hogwartsMud.turnDiagnostics` 或 transition diagnostics。
2. 再读 JSONL 首行对应字段，确认是 proposal、Reducer、persistence 还是 projection 问题。
3. 最后查 UI projection；不得从页面缺失直接推断 Reducer 失败。
