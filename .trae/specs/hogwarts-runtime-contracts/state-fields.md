# 世界状态字段注册表

## 规则

- 未登记字段不得被新 workflow 直接写入。
- “兼容字段”只能服务旧调用方，不能重新获得权威语义。
- Actor Context V1 不保留旧人物字段读取路径；旧人物字段只作为一次性原子迁移输入，成功后删除。
- UI 只能读取本表列出的世界字段，页面交互状态写入 `ui/session-state.js`。
- 任何人物名单都必须注明它表达 active、local、participant 还是 witness。

## UI session 字段

这些字段只存在于当前页面实例，不写入 JSONL 世界权威。Calendar V2.1 的三栏布局、场景折叠和自由开场位置只改变这些页面状态，不改变 V2 世界数据模型。

| 字段路径 | 真实语义 | 唯一写入者 | 主要读取者 | 兼容/诊断 |
| --- | --- | --- | --- | --- |
| `session.liveSceneStream` | 当前生成阶段、内部 raw 长度、恢复 segments 与判定预览 | app controller、turn workflow | loading card renderer | segments 仅供内部诊断；提交前不得渲染为正文 |
| `session.latestStoryMessageId` | 当前 scene 最近一次已渲染的消息 ID | story renderer | story scroll resolver | 新 assistant ID 只触发一次顶部定位；scene 切换时清空；首次 scene load 固定 retain；generation/candidate 不覆盖阅读位置 |
| `session.calendarTimelineEpoch` | 当前 Calendar 页面选择所绑定的时间线 epoch | Calendar controller | Calendar selection reset、view model | 只存在于页面实例；与世界 `timelineEpoch` 不一致时先清空旧日期、schedule、Scene 与 storyline 选择；不写 JSONL 或 localStorage |
| `session.calendarSelectedDate/calendarDisplayMonth/calendarSelectedEntryId/calendarSelectedSceneId/calendarSelectedStorylineId` | 当前页面 Calendar 日期、schedule/Scene/storyline 预览焦点 | Calendar controller | Calendar view model、renderer、bindings | 只存在于页面实例；跨 timelineEpoch 时清空；不写 JSONL 或 localStorage |
| `session.calendarExpandedSceneIds/calendarFreePanelOpen` | 当前日期场景卡展开集合与【场景】区自由开场面板开关 | Calendar controller | 场景折叠 renderer、自由开场 panel | 纯 UI session；切换日期/时间线时清空；展开和开关不写世界状态、不调用模型 |
| `session.calendarViewMode/calendarFreeStartTime/calendarFreeMapId/calendarFreeRoomId/calendarMomentBusy/calendarMomentError` | 今日日程/剧情线视图、自由开场草稿及瞬时提交状态 | Calendar controller | Calendar renderer、Moment action ports | 纯 UI session；选择、预览和校验不写世界权威、不调用模型 |

## UI projection 字段

这些字段由世界权威和 UI 筛选即时派生，不写入 JSONL 或 localStorage。

| 字段路径 | 真实语义 | 唯一写入者 | 主要读取者 | 兼容/诊断 |
| --- | --- | --- | --- | --- |
| `relationshipProjection.contextEdgeIds` | 未命中关系筛选、但两个端点仍在当前人物集合中的 player-known 背景边 ID | `filterRelationshipGraphProjection()` | Cytoscape class projector | 固定 5% 不透明度；不进入计数、详情、文本回退或点击交互 |
| `ActorDossierViewModelV1` | viewer-scoped 人物只读投影；除 `schemaVersion` 外固定为 `actorId/header/core/identity/current/relationship/memories/items` 八个业务顶层字段 | `buildActorDossierViewModel()` | NPC Inspector、关系星图节点与边详情 | 从 Actor Core、Actor Runtime、Identity、Social、Schema、MemoryRef、Item 即时构造；不得保留 raw State 或私有字段 |

## Prompt / Knowledge projection 字段

这些字段从已提交 State + message transaction 确定性派生，不是第二份世界状态。

| 字段路径 | 真实语义 | 唯一写入者 | 主要读取者 | 兼容/诊断 |
| --- | --- | --- | --- | --- |
| `LowTierContextV1` | 普通低档 Performer 与 repair 的唯一 User Payload；顶层严格为 `playerTurn/sceneFacts/actorCards/actionOpportunities/memoryActivations/prohibitions` 六字段 | `projectLowTierContextV1()` | `turn-performance.js` 初次请求与 repair | 总量不超过 50 KiB；单 Actor Card 不超过 4 KiB；不得注入 raw Actor Library、完整 Social Graph、完整 Identity、人物记忆正文账本或全量历史 |
| `LowTierContextV1.sceneFacts.authoritySnapshot` | 当前 revision 的 Scene、Actor、Item、Material、Room 与 open fact 权威快照 | `buildNarrativeAuthoritySnapshot()` 经 `projectLowTierContextV1()` | matching low-tier Performer、正文一致性 diagnostics | 只作为六字段结构的内部事实投影，不持久化 |
| `LowTierContextV1.memoryActivations.common/byActorId` | 公开事实及按 observer 密封的 Schema expectation 与按需 hydrated Event | Relational Synapse retrieval 经 `projectLowTierContextV1()` | matching actor 的低档表演 | 每 actor 最多 3 个 active Schema、3 个 Event，全局最多 8 个 Event；具体旧事必须有同 actor Event/sourceRefs |
| Knowledge V2 `records[]` | Actor Core、observed/reported Event、Appraisal、Person Schema、Scene、Item/Clue 的可重建检索投影；Relationship Evidence V3 只建引用边 | Knowledge Projector V2 | JSON exact、Vectra/Qdrant、Planner/Synapse | reported actor record 只含 attributed summary/roles/subjects/clock，不含 message/parent/about refs；不建 Statement/Evidence 全文 |
| Scene Transition proposal `globalChronicleSummaryEn` | 对已关闭 Scene timeline 的 40–80 词英文语义压缩；不是 closure、Event 或关系记忆 | medium/high Scene Transition 模型 proposal，经 validator 接受 | Scene Transition reducer | revision 4 已实现；不新增模型调用；非法值直接失败且不自动 retry；stray `relationshipUpdates/worldChanges` 在 normalizer 丢弃 |
| Daily `recentChronicle` | 最近全局语义史书的有界只读投影 | Daily Prompt projector | medium Daily Director | revision 4 已实现；最多 3 条、序列化最多 1,400 字符，只省略完整旧条目，不截断正文 |
| Social Director `reviewableActors/existingSocialGraph` | 当前 review cycle 的 Appraisal/MemoryRef、候选关系边与有界 receipt ID 校准 | Social Prompt projector | medium Social Director | revision 4 已批准目标总 Prompt <=220,000；同一响应可提 message-grounded reported Event/recipient Appraisal，不增加模型调用 |
| `ActorEventKnowledgeV2.direct/witnessed/reported` | 按 actor 即时投影 observed participant、observed witness、reported recipient Event | Actor Event Knowledge projector | diagnostics/authorized lookup；Prompt 只走 bounded Event activation | 非 State；禁止整表直投 Prompt；reported 不展开 source transcript/authority-only `aboutEventId` |

## 世界根字段

| 字段路径 | 真实语义 | 唯一写入者 | 主要读取者 | 兼容/诊断 |
| --- | --- | --- | --- | --- |
| `phase` | 世界初始化/游玩状态 | opening reducers、lifecycle | UI、workflow gates | 无 |
| `campaign` | 时间线与剧本硬约束 | setup、initial world | prompts、directors | 不由模型覆盖 |
| `character` | 玩家身份与属性 | setup、character reducer | prompts、checks、UI | 玩家事实权威 |
| `modelSlots` | role 到 Connection Profile/预算映射 | settings controller、slot migration | model adapter、workflows | `responseHeadroomVersion` 管迁移 |
| `saveRevisionVersion` | 保存门禁 Schema 版本 | save revision migration | guarded save ports、diagnostics | 当前值 `1` |
| `timelineEpoch` | 单条时间线稳定且不可复用的保存域 | new timeline initializer、legacy revision migration | save guard、storage head | 新时间线安全随机；旧档按 timeline key + 状态确定性生成 |
| `timeline` | 当前生产中的最近 20 条 `clock/label` 滚动副本，混合 Scene 事件、closure 与 opening；不是完整全局历史 | turn reducer、Scene Transition reducer、initial world、legacy repair | Daily Director、lifecycle repair、Knowledge clock fallback、UI world projection | 当前 contract 缺口现已补登记；revision 4 已批准原子迁移后删除，禁止长期双读 |
| `timelineChronicleVersion` | 全局语义史书 cutover 版本 | initial world、一次性 timeline migration | lifecycle validator | revision 4 已实现，当前值 `1` |
| `globalChronicle.version/entries[]` | 每个已封存 Scene 一条 `sceneId/endedClock/summaryEn` 语义摘要；按 archive 顺序 append-only | Scene Transition reducer、一次性无模型迁移 | bounded Daily projection、Knowledge Scene projector | revision 4 已实现；不向前端开放，不把整表直接注入 Prompt；迁移后删除 `timeline` |
| `stateRevision` | 当前时间线非负、单调递增 revision | guarded save commit | 所有 Hogwarts metadata/chat save | rollback 也只能增加；chat-only 不增加 |
| `revisionHistory[]` | 最近 48 次世界变化的 source/domain 与 Item/Identity before/after | save revision commit | diagnostics、未来 event proposal | 不保存完整快照、聊天正文、secret 或 prompt |
| `clock` | 当前权威世界时间 | turn/transition reducers | 全部导演、UI | 正文不能反写 |
| `knowledgeBase` | 当前时间线 Knowledge V2 timeline ID、同步状态、record hash 与 bounded retrieval diagnostics | knowledge adapter/projector | lifecycle、inspector、debug | 只描述可重建投影；JSON/Qdrant/Vectra 内容不是 State 权威 |
| `knowledgeBase.retrievalDiagnostics` | Planner、实际 backend、降级状态、selected/source paths、capsule ID、local call count | knowledge adapter | turn diagnostics、debug | 有界且不保存完整私有 Prompt/secret；检索失败不阻断 State/chat 提交 |
| `calendar.version` | Calendar Schema 版本 | initial world、Calendar migration | Calendar validator、lifecycle、UI | 当前值 `2`；全世界只有一个 Calendar 根 |
| `calendar.storylines[]` | 玩家可见的长期剧情方向，不含精确地点或 Scene | High Calendar proposal Reducer、V1 migration | High/Medium projection、剧情线 UI | 不进入日期数量或 Performer 当前 Scene；模型不能直接写 state |
| `calendar.storyBeats[]` | storyline 的有序学期节奏，固定 `sceneTarget=4` | High Calendar proposal Reducer；Scene archive linker 追加关系/实现状态；本地 clock settlement 写过窗 `deferred` | High/Medium projection、剧情线 UI、schedule 来源投影 | 与 `pacingDirector.pendingBeat` 隔离；不保存精确地点、正文或预设结果 |
| `calendar.storyBeats[].relatedSceneIds[]` | 通过合法 source schedule 实际观察到的去重 Scene ID | Scene archive linker | beat 进度/realized/deferred 规则、UI | 四个不同 Scene 才能 realized；时间流逝和 schedule completed 不计数 |
| `calendar.entries[]` | 玩家可见的精确 schedule 集合 | Medium Calendar proposal Reducer、V1 migration、clock settlement、Scene archive linker | Medium/Daily/Scene claim projections、Calendar UI | `entryType` 固定 event；V1 High event 可 grandfather；Canon 等只作普通 tag |
| `calendar.entries[].sourceBeatId/beatSlot/scheduleKind` | 可选剧情来源、稳定 1..4 槽位与展示/规划类别 | Medium Calendar proposal Reducer、V1 migration | Medium 去重、Scene source projection、UI | 无 sourceBeatId 时 beatSlot 必须为空；迁移不得按 legacy parentId 伪造 beat |
| `calendar.entries[].status` | schedule 的 `planned/active/completed/cancelled` 时间状态 | 本地 clock settlement；对应 tier director 仅可明确取消 | prompts、UI、进入门禁 | UI 在计划卡、详情和场景认领列表中原样投影同一四态；completed 只表示时间已发生，不代表成功、玩家出席或结果 |
| `calendar.entries[].relatedSceneIds[]` | schedule 关联的全部已封存 Scene 稳定 ID | Scene archive linker | Calendar related-Scene projection、UI | 导演 proposal 不得写；追加去重；不复制档案正文 |
| `calendar.horizon` | Medium Calendar 已检查到的绝对未来边界 | Medium Calendar guarded transaction、migration initialization | Medium trigger/projection | 只有合法 proposal 成功后推进；空日期不补事件 |
| `agenda` | legacy 开场日程自由文本 | 无生产写入者 | 无生产读取者 | 不迁移、不进入 prompt/projection/UI；旧档可原样保留 |
| `chapter`、`location` | 当前玩家可见章节与地点标签 | opening/transition reducers | UI、prompt | `scene/map` 才是结构权威 |
| `turn` | 回合计数、状态、错误、最近耗时 | turn reducer/workflow | recovery、UI、directors | 同一回合重试必须幂等；`resolving` 不授权 reload 自动调用模型 |
| `checks` | 已提交判定记录 | check/turn reducer | prompt、inspector | 可解析的主动咒语观测会覆盖错误 semantic no-check，并固定只投一次 D20 |

## 场景、地图与空间

| 字段路径 | 真实语义 | 唯一写入者 | 主要读取者 | 兼容/诊断 |
| --- | --- | --- | --- | --- |
| `scene` | 当前场景 ID、开场摘要、起点、room、timeline、next intent | opening/transition/scene reducers | turn、UI、archive | `summary/summaryEn` 是开场快照；timeline 推进后不再作为 Performer 当前态；`startedMessageId` 绑定聊天范围 |
| `scene.calendarEntryIds[]` | 当前 Scene 明确认领的 schedule ID | Calendar/Timeline Moment、Scene Transition reducer、lifecycle normalization | Performer、Scene Transition、archive linker、Calendar UI | Calendar Moment 新 Scene 只含所选 schedule；自由/普通 Scene 可为空；不得按时间重叠自动扩张 |
| `scene.timelineEntries[]` | 场景内按时钟排序的已提交详细历史 | turn/transition reducers | performer、UI、archive、Scene Transition chronicle proposal | 不是同时态；后续当前状态覆盖早期条目的事实效力；revision 4 已批准提交后只追加不编辑/删除 |
| `sceneArchive[]` | 已封存场景的稳定元数据、append-only timeline 与原消息 ID 索引 | archive projector | archive UI、Calendar 历史、knowledge | 历史只读；record 是元数据/索引权威，正文按 `messageIds` 从原 chat 消息行读取，不复制或重新生成 |
| `sceneArchive[].calendarEntryIds[]` | 封存 Scene 当时明确认领的 schedule ID | archive projector | Calendar 场景折叠、related/beat projection | 只关联 schedule；旧记录缺失或为空时 UI 显示【未关联计划】，不得按时间、地点、人物或重叠补链 |
| `sceneTransition` | 转场任务状态，不是转场 package | scene transition workflow/lifecycle | UI、job recovery | opening message 持久化 transition diagnostics |
| `map` | 地图目录、当前节点与运行时差异 | map/movement/transition reducers | spatial、UI、prompts | 原著底图只读 |
| `spatial.player` | 玩家结构化 mapId/roomId | movement/transition reducers | pathfinding、visibility | 必须与当前 map/scene 对齐 |
| `spatial.lastMovement` | 最近一次已提交移动 | movement reducer | retry、migration | 不是 prose 推断缓存 |

Calendar UI 不登记 `attendance` 或同义持久化字段，不展示“去了/没去”，也不从计划重叠推断认领或出席。面向玩家的中文使用“场景”；本表中的 `Scene` 保留为代码、类型和存档字段标识。

## 人物三层状态

| 字段路径 | 真实语义 | 唯一写入者 | 主要读取者 | 兼容/诊断 |
| --- | --- | --- | --- | --- |
| `actorContextVersion/memoryReferenceVersion/actorDossierProjectionVersion` | Actor Core/Runtime、引用式记忆与 Dossier 投影的联合版本门槛 | initial world、Actor Context cutover | lifecycle、Actor Context validator、UI/Prompt projectors | 当前 `1/3/1`；V2 -> V3 原子迁移后不保留双读 |
| `npcIdentityVersion` | NPC Identity 迁移版本 | initial world、Identity migration | lifecycle、diagnostics | 当前值 `1` |
| `actorLibrary[]` | `ActorCoreV1` 稳定人物本体；顶层严格为 `id/canonCatalogId/nameEn/aliases/roleEn/cast/publicProfile/performanceCore/identity/privateFacts` | Actor Context runtime、一次性 cutover、授权 Actor/Identity Reducer | LowTier Actor Card、Dossier、Knowledge Actor Core projector | 已完成 lifecycle cutover；不保存位置、活动、生命状态、关系、印象、人物记忆正文或 Social Graph 副本 |
| `actorLibrary[].cast` | 唯一人物入场来源与首次被玩家认识的稳定元数据：`origin/introducedClock/introducedTurn` | initial world、Actor admission/lifecycle reducer、pacing/temporary actor reducer、一次性 cutover | Story Cast policy、人物可见性投影、Pacing/Calendar actor selection | `origin` 仅允许 `foundation/canon_catalog/preset_resident/generated_guest/scene_temporary`；不再保存通用 `source`、`playerKnown` 或 `knownToPlayer` Actor 标记 |
| `actorLibrary[].identity` | 非关系型人物权威：gender、birth、education、lineage、body、provenance | Canon registry、用户确认、授权 Reducer、Identity migration | Identity projection、dossier、revision diff | birth 仅允许 `{ date, year, precision: exact \| year \| unknown }`，只有 exact date 派生年龄；家庭、goal、mood、activity 不得写入；unknown 不由模型补全 |
| `actorLibrary[].identity.body` | 身体本身及当前身体状态：身高、体型、自然/当前发色、发型、眼睛、特征、伤势、形态和 asOfClock | Identity/body Reducer、migration | clock-scoped prompt、dossier | 服装、帽子、首饰、穿戴/手持 Item 不属于 body |
| `actorLibrary[].identity.body.injuryAssessment` | 最近一次有证据的伤势检查：visible_injury、no_visible_injury 或 unknown | post-turn identity observation reducer、幂等历史回放 | Identity projection、dossier | narration 必须有逐字证据；NPC 自述不构成观察；no_visible_injury 不写入 injuries[] |
| `npcIdentityObservationVersion` | 已提交身体观察的确定性回放版本 | lifecycle identity observation migration | lifecycle、diagnostics | 当前值 `1`；不调用模型，重复运行无变化 |
| `actorMemoryIndex.version/byActorId` | 人物记忆层级目录；每名人物只含 `firstImpressionRef/core/recent/everyday` | Actor Context runtime、一次性 cutover、turn/transition/memory/event reducers | Dossier hydration、Memory Consolidation、LowTier memory activation | revision 4 已批准 version `3`：弱/过期 AppraisalRef 替换为 observed/reported EventRef；字段形状不变 |
| `memorySynapse.version/appraisals[]` | observer 对已提交 Event 的唯一主观解释正文；V2 只存 `sourceEventIds` | Appraisal validator/Reducer、Actor Context runtime、一次性 cutover | Schema、Relationship receipt、Knowledge、Dossier、activation | revision 4 已批准：`knowledgeSource=reported` 取代 `authorized_rumor`；删除 message/Scene/witness/sourceRumor 副本 |
| `memorySynapse.personSchemas[]` | observer-target 的 `factPatternEn/interpretationEn/expectationEn`、支持、反例和修订链 | medium boundary `schemaOperations` + Memory Synapse Reducer | Knowledge V2、Dossier currentSchema、observer activation | 至少 3 条 accepted Appraisal 且跨 2 个 Scene；每对最多 3 个 active；不成为公共事实，不物化回写人物字段 |
| `actors[]` | `ActorRuntimeV1` 运行态；顶层严格为 `id/mapId/roomId/present/lifeStatus/lifeStatusPermanent/lifeStatusDetailEn/lifeStatusSinceClock/currentActivityEn/currentIntentEn/currentGoalEn/temporary` | Actor Context runtime、turn/transition/spatial reducers、一次性 cutover | Authority Snapshot、Dossier current、presence、Scene Transition validator | 已完成 lifecycle cutover；不复制 Actor Core、Identity、关系、Appraisal、Schema 或记忆 |
| `actors[].lifeStatus/lifeStatusPermanent/lifeStatusDetailEn/lifeStatusSinceClock` | 人物当前生命状态、不可逆标记、公开说明和状态生效时间的唯一权威 | High Scene Transition 可首次提交不可逆状态；Medium Scene Transition 可提交可逆状态；Actor Runtime reducer 原子落盘 | admission/presence、Narrative Authority、Scene Transition、Dossier current | `alive/injured/incapacitated/missing/dead`；永久状态不可降级或复活；Core 不再复制；中文仅显示时翻译 |
| `actors[].temporary` | 当前人物是否仍是未确认身份的临时场景人物 | turn/pacing temporary actor reducer；有叙事证据的 identity merge 原子置 `false` | Story Cast policy、Pacing、Calendar actor selection | `provisionalActorId/resolvedIdentityId/identityStatus/identityEvidenceEn` 不再持久化；稳定 ID 即 actor ID，身份依据写 `identity.provenance` source ref |
| `ActorDossierViewModelV1` | 人物前端唯一只读投影；除 `schemaVersion` 外严格为 `actorId/header/core/identity/current/relationship/memories/items` 8 个业务顶层字段 | `buildActorDossierViewModel(state, actorId, viewerId)` | 人物列表、NPC 检查器、关系星图 | 不持久化；不得携带 raw Core/Runtime/Social/Memory State |
| `ActorDossierViewModelV1.current` | 玩家可见当前状态：`location/activity/intent/lifeStatus/lifeStatusDetail/presentation` | Dossier projector 从 Actor Runtime、Room 与 Presentation 投影 | 人物列表、NPC 检查器 | 已完成 lifecycle projection；不暴露 `lifeStatusPermanent/lifeStatusSinceClock/temporary/cast` |
| `ActorDossierViewModelV1.relationship.evidenceRefs` | viewer 可见的关系变化引用投影，正文/来源由 Receipt 的 Appraisal/Event 按 ACL hydration | relationship projector | NPC 检查器、关系星图 | revision 4 保持字段形状和 actor->player meta-view；reported Event 显示听闻 badge；本期不做语言统一 |
| `ActorDossierViewModelV1.memories` | `core/recent/everyday` 三层 retained Event/Appraisal hydration | Actor Memory Index projector | NPC 检查器 | 不包含无 provenance 的旧 current impression；防御性过滤 `migrated_current_impression`，无 active Schema 时不回退旧 impression |
| `activeInteractionActorIds[]` | 2–4 名当前互动卡司 | turn/scene settlement reducers | scene performer、快捷互动、UI | 不代表完整房间人口 |
| `localPresence.mapId/roomId` | 当前物理占位所属房间 | presence reducer | UI、witness resolver | 必须匹配玩家当前房间 |
| `localPresence.occupantActorIds[]` | 同室且已确认存在的已知人物 | presence reducer | current-location UI、witness | 不因退出镜头删除 |
| `localPresence.cohortIds[]` | 同室稳定群体 | presence reducer | UI 摘要、witness | 不自动展开关系边 |
| `cohorts[]` | class/dorm/family/scene roster | presence reducer、deterministic migration | presence、witness、UI | roster 是位置证据，library 不是 |
| `eventKnowledgeVersion/eventKnowledge[]` | V2 append-only Event 权威；`observed` 为客观观测，`reported` 为带归属的传播硬事实 | centralized Event reducer、一次性 V1->V2 migration | Actor Event Knowledge、Memory、Social、Appraisal、Knowledge、Dossier | observed 用 sourceMessageIds+perception；reported 用 sourceSegmentRefs+roles，不双存 message IDs；`aboutEventId` authority-only |

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
| `itemSystemVersion` | 正式物品系统迁移版本 | item migration | lifecycle、debug | 当前值为 `3`；V3 在 V2 lifecycle 上增加 `physicalForm` |
| `canonItemCatalogVersion` | 已应用 Canon 标志物目录版本 | item migration | lifecycle | seed 按稳定 ID 幂等 |
| `items[].id/version/type` | 正式 Item 稳定身份与物理类别 | Item Reducer、deterministic migration | prompt、projection、UI | `kind` 仅为 V1 兼容投影 |
| `items[].ownerId/holderId` | 社会/法律主人和当前持有人 | Item Reducer | operation validation、UI、movement | 借出/偷走只改变 holder；destroyed+remains 可保留 holder，absent/unknown 必须清空；`custody` 仅兼容 |
| `items[].physicalForm` | 当前物质存在：`whole/remains/absent/unknown` | Item Reducer、deterministic migration | authority snapshot、operation validator、prompt、UI | `state` 只描述状况/历史；只有 whole/remains 可有 holder/location，remains 不可装备 |
| `items[].location` | 当前 `mapId/roomId/placement` | Item Reducer、holder-location projector | scene snapshot、UI、prompt | 有 holder 时按 holder 跟随；absent/unknown 必须为空，destroyed 只有 remains 可保留位置 |
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
| `actorPresentations.*.hair/hairstyle/hairColor/injury/visibleInjury/form` | 旧档身体字段 | 仅 Identity migration 读取并删除 | 无生产读取者 | 确定性迁入 `actorLibrary[].identity.body`；presentation 只保留附着物 |
| `spellbook` | 已学法术与来源，当前 Schema/Catalog version 为 2 | spell reducer/migration、spell candidate resolver | check、prompt、UI | 主动观测仅 `success_with_cost+` 学习；NPC 明确教学可在观测失败后学习；年级不是硬门禁 |
| `spellbook.known[].definition` | accepted 自定义咒语的内嵌稳定 definition | spell candidate resolver | catalog resolver、check、composer、inspector | Catalog spell 不重复内嵌；custom 必须 `sourceTier=player_confirmed_custom` |
| `pendingSpellProposals[]` | 等待玩家收录/忽略的未知教学或玩家自创咒语 | turn reducer、spell proposal queue | message/UI projection | 权威 scene 中同一 technique 的替代咒文不得进入；明确独立的新咒语和玩家自由标记仍可进入；最多 24 |
| `spellProposalDecisions[]` | 自定义咒语候选的 accepted/ignored 稳定决策 | spell candidate resolver | proposal queue、message renderer | 最多 120；纯本地提交，不等待 knowledge/model |

## 社交、记忆与导演

| 字段路径 | 真实语义 | 唯一写入者 | 主要读取者 | 兼容/诊断 |
| --- | --- | --- | --- | --- |
| `socialGraph` | 定向关系维度、情绪、结构标签、claims 与 applied relationship receipt 的唯一权威 | Social Reducer/migration | unified relationship projection、LowTier Actor Card、Dossier、graph UI、Knowledge | revision 4 已批准目标 version `3`；不存在全局恋爱阶段，不复制进 Actor Core/Runtime |
| `socialGraph.relationshipEvidence[]` | V3 定向关系影响回执：required `eventId`、optional matching `appraisalId`、eventKind、实际 dimension deltas、tags、emotion effects、clock/turn | Social Reducer、一次性 V2->V3 migration | relationship edge `evidenceIds`、ACL hydrator、relational graph | 禁止保存 summary/译文/message/Scene/witness/Event-list/visibility；Appraisal 删除后 Event-only，已应用边值不回滚 |
| `socialGraph.relationships[].evidenceIds[]` | 当前边关联的有效 V3 receipt ID | Social Reducer、V3 migration prune | Social projection、Dossier/graph | 累计 dimensions/tags 是当前状态；旧 receipt 详情删除不重算边值，禁止 dangling ID |
| `socialGraph.statements[]` | 旧 V2 attributed prose + message/Scene/witness 副本 | 无生产写入者 | 仅一次性 cutover 删除 | revision 4 已删除；Tina 83 条结构详情不转 Event，原 chat/archive 保留；不设兼容投影 |
| `socialGraph.identityClaims[]` | self/other 身份结构化说法，正文回源 reported Event | Social Reducer/migration | observer projection、Identity dossier | revision 4 非 authority claim 只存 `reportedEventId`；不复制 speaker/message/witness/clock，不覆盖 authority Identity |
| `socialGraph.relationshipClaims[]` | 家庭等结构化关系说法或 authority 关系确认 | Social Reducer/migration、授权 authority Reducer | audience projection、family edge projector | 非 authority claim 只存 `reportedEventId`；authority claim 用 authority source ref；模型不能写 authority claim |
| `socialGraph.personReferences[]` | 尚未成为 actor 的被提及人物 | Social Reducer/migration、授权 resolution Reducer | relationship claim projection | 仅 unresolved/resolved/nonexistent；unresolved/nonexistent 不进入 actor/presence/memory/cast |
| `socialGraph.relationships[].relationshipClaimIds/relationshipKinds` | 正式关系边绑定的 authority claim 来源 | family edge projector | audience projection、graph UI | 只有 resolved reference + authority claim 可生成 family edge |
| `dailyDirector` | 当前游戏日计划及刷新状态 | director workflow/reducer | turn prompts | 只跨日期刷新 |
| `pacingDirector` | 单回合节奏评估、冷却、pending beat | pacing reducer/workflow | turn/transition | 不直接写正文；pending beat 不迁移、消费或覆盖 Calendar storyBeat |
| `memoryDirector` | event-boundary consolidation 状态 | memory workflow/reducer | social memory | 不按固定回合盲目整理 |
| `causalCollapse` | 已绑定的可显影后果 | causal reducer | pacing/directors | revision 4 删除 `rumor_route` kind/`rumor` persistence target；流言知识只能由 committed reported Event 建立 |
| `sceneEnrichment` | 转场后延迟 map/social 等 enrichment 状态 | transition/background reducers | background work | revision 4 删除不可达的 `worldChanges` 子状态；其余 enrichment 不能覆盖已提交 Scene core |
| `gossipPacks/worldNews/worldChangeLog` | 当前旧版 Gossip/Prophet 自由文本与有界运行日志 | Scene Transition world-change reducer | knownRumors/recentWorldNews、Appraisal/Knowledge rumor ACL | 当前未登记 contract 缺口；revision 4 整体原子删除；任一非空值阻断迁移，不做文本转 Event |

## 消息级字段

| 字段路径 | 真实语义 | 写入者 | 读取者 |
| --- | --- | --- | --- |
| `extra.hogwartsMud.role` | player/scene/opening 等消息角色 | workflow message builders | archive、UI、recovery |
| `extra.hogwartsMud.sceneId` | 消息所属场景 | workflow message builders | archive、knowledge |
| `extra.hogwartsMud.itemDirectives[]` | 玩家输入中合法配对的 Item operation + stable Item ID 意图 | turn workflow deterministic parser | performer、debug、retry | 不是 outcome，不直接写 `items` |
| `extra.hogwartsMud.itemDirectiveErrors[]` | 孤立、未知或非法 Item directive diagnostics | turn workflow deterministic parser | debug | 不阻断正文，不猜测替代 Item |
| `extra.hogwartsMud.segments[]` | 已提交英文 narration/dialogue 证据 | scene performer/transition opening | render、observe、archive | 与 transaction/State 一起提交；不能覆盖更高优先级当前 State |
| `extra.hogwartsMud.turnTransaction` | 已提交回合事务快照，记录 proposal、结算和来源证据 | turn workflow | retry、migration、debug、Knowledge Projector | 与新 State 共同构成权威提交边界 |
| `extra.hogwartsMud.turnTransaction.checkResolution.spellObservation` | 主动观测的内部 spell 目标与 D20 结果 | check resolver / turn workflow | performer、spell reducer、check card | failure 时公开 UI/正文不得泄露 spell identity |
| `extra.hogwartsMud.turnTransaction.spellCandidates[]` | 本回合明确教学或玩家自由标记产生的自定义咒语候选 | turn workflow deterministic extractor | turn reducer、message renderer、debug | 不是已学习；必须由玩家收录；未知效果只保存 observed evidence |
| `extra.hogwartsMud.turnTransaction.itemOperations[]` | 对已有正式 Item 的证据化操作 | turn workflow | turn validator/reducer、debug | 只允许稳定已有 ID |
| `extra.hogwartsMud.turnTransaction.itemCandidates[]` | 本回合发现的新 Item 候选快照 | turn workflow | message renderer、retry | 只允许 `acquire`，不等于正式入库 |
| `extra.hogwartsMud.turnDiagnostics` | bounded 回合诊断，含 initial/repair request、response、validation 与 commit/error 边界 | turn diagnostics recorder | 后续 debug |
| `extra.hogwartsMud.sceneTransition.diagnostics` | actor states、active/local 提交对比及精简 `authoritativeItems` | transition message builder | 后续转场 debug；Item 按已提交 holder/目的地投影 |
| `extra.hogwartsMud.sourceEn` | 英文事实原文 | message builder | translation/render |
| `extra.hogwartsMud.translatedZh` | 显示译文缓存 | translation workflow | renderer；不得参与状态提取 |

## 排障入口

1. 先定位最新相关消息的 `extra.hogwartsMud.turnDiagnostics` 或 transition diagnostics。
2. 再读 JSONL 首行对应字段，确认是 proposal、Reducer、persistence 还是 projection 问题。
3. 最后查 UI projection；不得从页面缺失直接推断 Reducer 失败。
