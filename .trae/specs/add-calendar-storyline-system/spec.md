# Calendar V2 日程与剧情节奏 PRD / 规格

> 当前实施目标是 Calendar V2。本节是对下方 V1 基线的增量覆盖；凡涉及 Calendar 数据模型、High/Medium 职责、日期投影、并发安排进入 Scene 或 Prompt 投影的冲突要求，均以 V2 为准。

## V2 调研结论

现有 Calendar V1 已经具备 revision guard、未来安排进入、Scene Archive 关联、桌面/窄屏 UI 和完整测试基础，但产品信息架构存在四个根本错位：

* `storyline` 与具体 `event` 共用 `entries[]`，长达数月的故事线会出现在跨度内的每一天。

* 选择日期后 UI 自动预览存储顺序中的第一项，因此长期故事线会压过玩家真正需要的早餐、课程、午餐和会面日程。

* High Calendar Director 被要求同时创建 storyline 与精确时间、地点、人物齐全的 event，越过了“剧情线与节奏”到“具体场景安排”的层级边界。

* V1 把同刻所有安排强制关联进同一个 Scene，可能产生玩家在不同地点同时出席考试和约会的错误语义。

Calendar V2 SHALL 将产品模型明确为：

```text
storyline -> storyBeat -> schedule -> scene
长期剧情线     学期节奏点       日历行程       实际场景
```

其中 High 只排演 `storyline + storyBeat`；Medium 将节奏点编排为具体 `schedule`，并维护日常作息与课程；Scene 只在玩家进入某个行程、自由选择时间地点，或普通叙事自然发生时创建。

## V2 What Changes

* Calendar 根状态升级为 `version=2`，新增独立 `storylines[]` 与 `storyBeats[]`；现有 `entries[]` 收敛为可执行的日程集合，避免重写已经稳定的 Calendar Moment 与 Scene Archive 通道。

* 日期页只投影日程和只读历史 Scene，按开始时间排序，不再把 storyline 或 storyBeat 当作全天安排。

* Calendar 增加【今日日程 / 剧情线】两种视图。默认是会议式纵向日程；剧情线视图供玩家以作者镜头查看长期线路、学期节奏和四场景进度。

* High Director 只创建或维护 storyline 与 storyBeat，不得再提交精确日程、地点或 Scene。

* 每个 storyBeat 固定规划 `sceneTarget=4`。Medium 为其创建四个带稳定槽位号的日程机会；实际 Scene 未被观察前不预生成正文或事实。

* Medium 同时维护未来 7–14 天的日常日程，包含适用的早餐、课程、午餐、晚餐、训练、约会、会议和剧情节奏行程。

* 玩家可以进入某个日程，也可以在所选日期选择不早于当前世界时钟的时间与任意合法地点自由开始 Scene。

* 进入某一日程只把该日程关联到新 Scene。其他同刻安排仍在世界中并发存在，但不代表玩家同时出席，也不会自动取消。

* 自由开始的 Scene 默认不认领任何日程；只有玩家明确从某个日程进入时，Scene 才关联该日程。

* V1 迁移零模型、幂等并保留稳定日程 ID、时间、地点、人物、状态及 Scene 关系；不得推断旧事件已经实现某个新 storyBeat。

## V2 Impact

* Affected specs: Calendar schema、High/Medium Directors、Daily/Performer prompt、Scene Transition、Scene Archive、Calendar UI、migration。

* Affected code: `domain/calendar-*`、`workflows/high-calendar-director.js`、`workflows/medium-calendar-director.js`、`workflows/calendar-moment.js`、`ui/calendar-*`、`panel.html`、`style.css`、Calendar tests、README。

* 保留不变：权威世界时钟、Event Ledger 唯一事实源、revision guard、durable acknowledgement、跨页面 fencing、Actor/Identity/地点引用校验、历史正文只存 `sceneArchive`。

## V2 Data Model

Calendar SHALL 保存在 `chatMetadata.hogwartsMud.calendar`：

```text
calendar.version = 2
calendar.storylines[]
calendar.storyBeats[]
calendar.entries[]       // schedule only
calendar.horizon
```

### Storyline

```text
id
title
titleEn
summary
summaryEn
tags[]
startClock
endClock
participantIds[]
status = planned | active | resolved | cancelled
createdClock
updatedClock
```

Storyline 表示跨学期或跨学年的长期因果方向。它不包含精确地点，不可直接进入 Scene，也不得进入日期日程或 Performer 当前场景上下文。

### Story Beat

```text
id
storylineId
title
titleEn
summary
summaryEn
tags[]
termKey
sequence
windowStartClock
windowEndClock
sceneTarget = 4
status = planned | active | realized | deferred | cancelled
relatedSceneIds[]
createdClock
updatedClock
```

Story Beat 表示一条 storyline 在某个学期内的节奏推进。`termKey` 在同一 storyline 内唯一，`sequence` 严格递增，`sceneTarget` 在 V2 固定为 4。Beat 不保存具体 Scene 正文、精确场景地点或预设结果。

### Schedule

V2 继续使用 `calendar.entries[]` 保存 schedule，以兼容现有运行链。每个新日程在 V1 统一字段基础上 SHALL 增加：

```text
sourceBeatId
beatSlot
scheduleKind = routine | class | story | social | personal
```

规则：

* `sourceBeatId` 可为空；日常作息、普通课程和玩家承诺不必属于剧情节奏。

* 当 `sourceBeatId` 非空时，它必须引用现存 storyBeat；`beatSlot` 必须为 `1..4`，同一 beat 不得重复。

* 一个 beat 最多四个未取消日程槽位。Medium 可以对未来槽位改期，但不得改写已发生或已关联 Scene 的槽位。

* V1 `parentId` 在兼容期只作为旧 storyline 弱关联保留；V2 新日程使用 `sourceBeatId` 表达节奏来源。

* `relatedSceneIds[]` 仍只保存 Scene Archive 稳定 ID，不复制正文。

### Scene Links

新 Scene 与 archive record SHALL 继续保存 `calendarEntryIds[]`，但其 V2 语义严格收敛为“玩家明确进入或当前 Scene 明确认领的 schedule ID”。

Beat 的 `relatedSceneIds[]` 由 Scene 封存 Reducer 根据 Scene 关联日程的 `sourceBeatId` 去重追加。一个 beat 累积四个不同且有效的相关 Scene 后，可由本地规则标记为 `realized`；仅仅越过日程时间、生成文字或模型声称成功都不得实现 beat。

## V2 ADDED Requirements

### Requirement: 四层权威边界

系统 SHALL 区分 storyline、storyBeat、schedule 与 scene，且任何层不得冒充下一层：

* Storyline 只表达长期方向。

* StoryBeat 只表达学期节奏与四场景目标。

* Schedule 只表达精确时间承诺或可进入机会。

* Scene 只表达实际发生并被观察的时空容器。

#### Scenario: 四年秘密剧情线

* **WHEN** High 为“蒂娜的秘密”创建横跨四学年的 storyline

* **THEN** High 为每个学期创建一个有序 storyBeat

* **AND** 每个 storyBeat 的 `sceneTarget` 为 4

* **AND** High 不创建任何精确日程、地点或 Scene

* **AND** Medium 只为进入滚动规划窗口的 beat 创建四个具体 schedule 槽位

### Requirement: High 只规划剧情线与节奏

High Calendar Director SHALL 只提交 typed proposal：

```text
baseTimelineEpoch
baseStateRevision
storylines[]
storyBeats[]
```

High proposal 不得包含 `entries`、精确地点、Scene ID、Scene 正文或具体开场。High 可以调整尚未发生的 beat 窗口和顺序，但不得改写已实现 beat、已发生日程或 Scene Archive。

现有 `pacingDirector.pendingBeat` 是单回合表演提示，与长期 `calendar.storyBeats[]` 不同；两者不得互相迁移、消费或覆盖。

#### Scenario: High 重大转折刷新

* **WHEN** high-tier 重大转折成功提交

* **THEN** High 只刷新当前及未来 storyline/storyBeat

* **AND** 已实现 beat 和过去事实保持不变

* **AND** 刷新失败不触发 Medium 代写剧情节奏

### Requirement: Medium 编排日程

Medium Calendar Director SHALL：

* 读取当前及未来 storyline/storyBeat、现有日程、玩家承诺、Actor/Identity、地点权威和当前时钟。

* 为进入未来 7–14 天窗口的 active/planned beat 创建缺失的四个稳定槽位日程。

* 维护玩家适用的每日作息与课程，让日期页形成可读的一天，而不是只显示偶发剧情事件。

* 只写 `calendar.entries[]` 与成功后的 `calendar.horizon`，不得改写 storyline、storyBeat 或 Scene。

* 不为同一 `sourceBeatId + beatSlot` 生成重复日程。

#### Scenario: 学期节奏派生四个日程机会

* **WHEN** 某 storyBeat 进入 Medium 规划窗口且没有日程槽位

* **THEN** Medium 创建四个稳定 schedule

* **AND** 四个 schedule 的 `sourceBeatId` 相同

* **AND** `beatSlot` 分别为 1、2、3、4

* **AND** 每个 schedule 有精确时间、参与者和建议地点

* **AND** 此时仍未创建任何 Scene 或叙事正文

### Requirement: 会议式日期日程

玩家选择日期后，Calendar SHALL 默认显示该日按 `startClock` 升序排列的纵向日程：

* 时间轴显示开始/结束时间、时长、标题、类型、地点、参与者、状态和剧情节奏标记。

* 早餐、课程、午餐、会议、训练、晚餐和社交安排使用一致的日程卡，不建立专用机制。

* 重叠安排逐项显示并以文字提示“同时进行”，不得合并或隐藏。

* 日期选择默认停留在全天概览，不自动预览存储顺序第一项。

* Storyline/storyBeat 只在【剧情线】视图或日程来源提示中展示，不计入日期安排数量。

视觉方向 SHALL 延续现有暗色学院档案风格，使用铜金时间刻度、克制的纸张纹理和编辑式排版；不得退化为通用白底管理后台。桌面保持月历、日程、详情的清晰层级，窄屏按“日期 -> 日程 -> 详情”单列推进。

#### Scenario: 查看星期五行程

* **WHEN** 玩家选择 1991 年 9 月 6 日

* **THEN** 页面按时间显示早餐、魔药课、午餐、其他课程和晚间会议

* **AND** 麦格与斯内普讨论蒂娜背景的会议作为一个可选择日程显示

* **AND** 长达四年的“蒂娜的秘密”不会作为全天日程占据首项

### Requirement: 从日程进入 Scene

只有未来或当前、`status=planned`、引用合法的 schedule 可以【进入场景】。操作 SHALL：

1. 使用该 schedule 的 `startClock` 和建议地点。
2. 按现有 medium/high Scene Transition 规则生成实际 Scene。
3. 新 Scene 的 `calendarEntryIds[]` 只包含玩家明确进入的 schedule ID。
4. 同刻其他 schedule 保持并发存在，可由 Daily/世界结算读取，但不进入当前 Performer prompt，也不代表玩家出席。
5. 不自动取消、改期或宣告其他 schedule 的结果。

#### Scenario: 选择教职员会议

* **WHEN** 玩家选择“麦格教授与斯内普讨论 Tina 背景”并进入

* **THEN** 世界时钟推进到会议开始时刻

* **AND** Scene Transition 以麦格办公室为建议地点

* **AND** 新 Scene 只认领该会议日程

* **AND** 同刻其他地点的安排不被取消，也不被塞进该 Scene

### Requirement: 任意时间地点开始 Scene

Calendar SHALL 提供自由开场表单，允许玩家在所选日期：

* 选择不早于当前世界时钟的开始时间。

* 从地点权威中选择任意合法 `mapId + roomId`，不得用自由文本伪造地点。

* 调用 `runTimelineMoment({ startClock, mapId, roomId })`，复用 Calendar Moment 的 guarded Scene Transition。

* 在一次原子提交中封存当前 Scene、推进世界时钟、结算日程时间状态并创建新 Scene。

* 默认创建 `calendarEntryIds=[]` 的自由 Scene；仅在玩家从具体日程入口操作时关联 schedule。

选择时间或地点、切换视图和预览 SHALL 是纯 UI 操作，不写 state、不调用模型。

#### Scenario: 下午三点在湖边开始

* **WHEN** 玩家在所选日期选择 15:00 和黑湖湖畔

* **THEN** 系统校验目标时刻不早于当前时钟且地点有效

* **AND** 复用正常 Scene Transition 创建该时空的 Scene

* **AND** 不凭同刻日程猜测玩家参加了任何安排

#### Scenario: 自由开场保存失败

* **WHEN** Scene Transition、stale revision 或 durable save 失败

* **THEN** 世界时钟、当前 Scene、Calendar、Archive 和消息均保持不变

### Requirement: Beat 四场景实现

Beat 的四个场景是“可观察的实现配额”，不是 High 预写的 Scene：

* Medium 只派生四个 schedule 槽位。

* Scene 正文仍在玩家进入、普通叙事自然到达或作者明确观察时才生成。

* Scene 封存后才为 beat 追加稳定 Scene ID。

* 四个不同 Scene 均通过合法 schedule 关联后，本地 Reducer 才可将 beat 标记为 `realized`。

* 日程 `completed`、`elapsed`、跳过或离线发生均不自动等于 beat 实现。

* 窗口结束但不足四个 Scene 时，beat 进入 `deferred`，Medium 可在后续窗口重排未实现槽位，不能伪造缺失 Scene。

#### Scenario: 只观察三个节奏场景

* **WHEN** 一个 beat 的四个日程中只有三个被实际进入并封存

* **THEN** beat 保留三个去重 Scene 关联

* **AND** beat 不得标记为 realized

* **AND** 窗口结束后保留可追踪的 deferred 残留

### Requirement: Prompt 最小投影

Prompt SHALL 按职责读取 V2：

* High 读取 storyline/storyBeat 和长期权威，不读取 Scene 正文来编造未来结果。

* Medium 读取可调度 beat 与未来日程。

* Daily Director 读取当天全部并发 schedule，理解世界中正在发生的安排。

* Performer 和 Scene Transition 只读取当前 Scene 明确认领的 schedule 及其公开 storyline/beat 来源。

* 自由 Scene 没有认领 schedule 时，Performer 不得因时间重叠自动获知其他地点的安排。

#### Scenario: 考试与约会同刻不同地点

* **WHEN** 考试与约会在同一时刻不同地点发生，玩家从考试日程进入

* **THEN** Daily Director 可读取两项世界并发安排

* **AND** 当前 Scene、Performer 和参与者只接收考试日程

* **AND** 约会不会自动取消，也不代表玩家同时出席

### Requirement: V1 到 V2 迁移

`migrateCalendarState()` SHALL 零模型、幂等并执行：

* 将 V1 `entryType=storyline` 移入 `calendar.storylines[]`，保留稳定 ID、公开文本、时间、人物、状态和创建/更新时间。

* 将 V1 `entryType=event` 原样保留为兼容 schedule，保留稳定 ID、精确时间、地点、人物、状态和 `relatedSceneIds[]`。

* 旧 event 的 `parentId` 只保留为 legacy storyline 弱关联；不得据此伪造 storyBeat、`beatSlot` 或 beat 完成状态。

* V1 High event 作为 grandfathered schedule 保持可读、可进入和终态只读；V2 High 不再创建新的 schedule。

* `scene.calendarEntryIds[]` 继续兼容读取为 schedule 关系。

* 不修改 clock、Scene、Archive、Actor、Identity、Item、Social、Memory、位置或消息。

#### Scenario: 迁移截图中的 Tina 日历

* **WHEN** V1 同时包含“蒂娜的魔法遗产与秘密” storyline 和“教职员初步评估” event

* **THEN** storyline 进入独立剧情线集合，不再占据每个日期

* **AND** 教职员评估保留为同一稳定 ID 的可进入 schedule

* **AND** migration 不虚构该 event 属于哪个新 storyBeat

## V2 MODIFIED Requirements

### Requirement: 单一 Calendar 权威

“单一权威”改为同一 `calendar` 根下的 typed collections，而不是 storyline 与 event 共用同一字段结构。任何同一事实不得跨集合复制。

### Requirement: 重叠安排

重叠表示世界并发，不再表示必须进入同一个 Scene或玩家同时出席。Scene 只关联被明确选择或认领的 schedule。

### Requirement: Scene Archive

Scene/Calendar 多对多关系继续存在，但关系对象是 schedule；storyBeat 只通过 schedule 的 `sourceBeatId` 派生 Scene 关系，storyline 不直接持有正文。

### Requirement: Calendar Moment

`runCalendarMoment(entryId)` 继续服务具体日程；新增 `runTimelineMoment({ startClock, mapId, roomId })` 服务自由开场。两者复用同一 guarded transition 基础设施，但自由开场不要求 entryId。

### Requirement: Calendar UI

桌面从“左月历、右单条预览”升级为“月历导航、会议式日程、按需详情”；剧情线作为次级作者视图。390px 保持无横向溢出，所有交互目标至少 44×44px，并继续支持 Escape、focus restoration、roving tabindex、`:focus-visible` 与 reduced motion。

## V2 REMOVED Requirements

以下 V1 要求在 V2 中删除：

* storyline 与 event 必须共用同一条目字段和 `entries[]`。

* High 必须创建带精确时间地点的关键 event。

* 长跨度 storyline 进入日期投影、当前时刻 projection 或 Performer prompt。

* 从任一安排进入后，新 Scene 必须关联目标时刻全部重叠条目。

* 玩家可以在同一个 Scene 中同时参加不同地点的考试和约会。

* 低档 Performer 必须接收当前世界时刻所有并发安排。

# Calendar V2.1 UI 信息架构增量

> 本节只增量调整 Calendar 日期视图的信息架构、可见文案与展示语义，不改变 V2 数据模型、四态结算、Scene Archive 权威或明确认领规则。凡与上方 V2 Calendar UI、下方 V1 UI 基线冲突的要求，均以 V2.1 为准。

## V2.1 What Changes

* 桌面日期视图固定为左侧日历、中间主内容、右侧精简详情三栏。中栏同时包含【计划】日视图时间网格与【场景】折叠区，不再把场景内容或自由开场表单放入右栏。

* 【计划】参考日历日视图：使用纵向时间刻度，计划卡按开始时间和时长定位；重叠计划分列或错位展示，保持每项独立可见、可选，不合并也不推断玩家出席。

* 【场景】中的场景卡默认折叠。展开后只列出 `sceneArchive.calendarEntryIds[]` 明确认领的计划，并直接展示每项计划自身已有的四态。

* 场景与计划的关系只来自持久化认领字段。系统不得新增 attendance 或同义字段，不得显示“去了/没去”，也不得根据时间、地点、人物或区间重叠推断认领关系。

* 自由开场改为【场景】区按钮；触发后在场景区内打开表单或面板。右栏不再渲染自由开场入口、表单、busy/error 状态或其重复说明。

* 右栏删除“开始时刻的全部安排”、自由开场、重复关系与重复说明。计划详情和场景详情使用各自的字段白名单。

* 所有面向玩家的可见中文统一使用“场景”，产品界面不得显示英文标签 `Scene`。内部类型名、代码标识与存档字段不因本要求重命名。

## V2.1 ADDED Requirements

### Requirement: 三栏日期视图

桌面 Calendar 日期视图 SHALL 使用以下信息架构：

1. 左栏只承担月历、日期导航、当前日期与所选日期表达。
2. 中栏是主要浏览区，上部为【计划】纵向时间网格，下部为【场景】折叠区。
3. 右栏是随当前选择变化的精简详情区，不承担日期总览、关系总览或表单职责。

日期切换 SHALL 同时刷新中栏的计划与场景投影。没有选中计划或场景时，右栏只显示简短空状态，不自动选择第一项，也不重复中栏内容。

窄屏 SHALL 按“日期 -> 计划与场景 -> 详情”的阅读顺序降为单列或分步布局；语义顺序不得因 CSS 视觉重排而改变。

#### Scenario: 桌面查看某日

* **WHEN** 玩家在桌面 Calendar 选择一个日期

* **THEN** 左栏保留日期导航

* **AND** 中栏同时显示【计划】时间网格与【场景】折叠区

* **AND** 右栏只在玩家选择具体计划或场景后显示对应精简详情

### Requirement: 计划日视图时间网格

【计划】SHALL 参考标准日历日视图表达一天：

* 使用纵向时间刻度标出可见时间区间，并以语义化 `<time>` 提供开始与结束时间。

* 每张计划卡的纵向起点由 `startClock` 决定，高度由 `endClock - startClock` 决定；最小可交互高度不得抹去真实时长，必要时通过可访问文本补足信息。

* 时间重叠的计划 SHALL 分列展示；空间受限时可以受控错位，但每项标题、时间、状态和独立选择目标仍须可辨认。

* 重叠计划不得合并为一张卡、互相遮蔽到不可操作，也不得因视觉邻接产生认领、出席、取消或结果语义。

* 计划卡及详情使用计划自身的既有四态，中文固定为：`planned`【计划中】、`active`【进行中】、`completed`【已完成时间段】、`cancelled`【已取消】。

#### Scenario: 两项计划时间重叠

* **WHEN** 两项计划的时间区间部分或完全重叠

* **THEN** 两张计划卡按各自开始时间和时长定位

* **AND** 两张卡分列或错位且均可独立选择

* **AND** UI 不把重叠解释为玩家参加了任一计划

### Requirement: 场景折叠卡与计划认领

【场景】区 SHALL 将日期范围内可见的 archive record 投影为默认折叠的场景卡。场景卡展开后：

* 只列出该 archive record 的 `calendarEntryIds[]` 明确认领且仍可解析的计划。

* 每个被认领计划显示其自身当前四态：【计划中】、【进行中】、【已完成时间段】或【已取消】；场景卡不得维护第二套计划状态。

* `calendarEntryIds` 缺失或为空时，显示【未关联计划】，不得按场景时间、地点、人物或计划时间重叠补链。

* 不创建、读取或展示 attendance、出席推断或“去了/没去”等结论。

* 展开动作只改变本地展示状态，不写 Calendar、Scene Archive 或其他世界状态，也不调用模型。

场景卡、按钮、空状态、详情标题和辅助说明中所有面向玩家的可见中文 SHALL 使用“场景”，不得显示英文标签 `Scene`。

#### Scenario: 旧档场景没有认领字段

* **WHEN** 旧 archive record 没有 `calendarEntryIds`

* **THEN** 场景卡仍可折叠、展开并查看

* **AND** 展开区显示【未关联计划】

* **AND** 即使同一时间存在计划，UI 也不推断认领或出席

#### Scenario: 场景明确认领已取消计划

* **WHEN** archive record 的 `calendarEntryIds[]` 引用一项当前 `status=cancelled` 的计划

* **THEN** 展开区列出该计划并显示【已取消】

* **AND** UI 不把场景关系改写为“去了”或“没去”

### Requirement: 场景区内自由开场

自由开场入口 SHALL 是【场景】区内的按钮。激活后，时间、权威地图与房间、校验、busy/error 和提交操作 SHALL 在场景区内的内联表单或局部面板中呈现。

关闭、取消或成功提交后，焦点 SHALL 按既有交互语义回到场景区入口或新创建的场景卡。打开和填写表单仍是纯 UI 操作；只有明确提交才调用既有 `runTimelineMoment({ startClock, mapId, roomId })`。

右栏在任何自由开场状态下均不得渲染该入口、表单或重复说明。

#### Scenario: 从场景区自由开场

* **WHEN** 玩家激活【场景】区内的自由开场按钮

* **THEN** 表单或面板在场景区内出现

* **AND** 右栏内容不切换为自由开场表单

* **AND** 提交仍创建默认 `calendarEntryIds=[]` 的场景

### Requirement: 右栏精简详情

右栏 SHALL 根据选择类型使用严格字段白名单：

* 计划详情只保留标题、摘要、时间、地点、人物、状态、公开来源与【进入场景】操作。

* 场景详情只保留只读正文与关键元数据；正文继续从 `sceneArchive` 权威记录读取，不复制、不重新生成。

* 右栏不得显示“开始时刻的全部安排”模块、自由开场入口或表单、重复的计划/场景关系列表、重复来源说明或重复操作说明。

* 【进入场景】只在计划满足既有合法进入条件时显示；场景详情始终只读。

#### Scenario: 选择计划详情

* **WHEN** 玩家选择一张计划卡

* **THEN** 右栏只显示计划字段白名单及合法的【进入场景】操作

* **AND** 不显示“开始时刻的全部安排”、自由开场或重复关系说明

#### Scenario: 选择场景详情

* **WHEN** 玩家选择一张场景卡

* **THEN** 右栏只显示 archive record 的只读正文与关键元数据

* **AND** 认领计划列表仍只存在于该场景卡的展开区

* **AND** 右栏不提供会改写历史场景或 Calendar 的操作

### Requirement: V2.1 响应式与无障碍

V2.1 SHALL 保留现有 Calendar 无障碍基线，并覆盖新增结构：

* 左栏日期、中栏计划卡、场景折叠按钮、自由开场控件与右栏详情按视觉阅读顺序进入键盘导航。

* 场景折叠按钮使用正确的展开状态与受控区域关系；状态、重叠和选择不得只依赖颜色或位置。

* 交互目标至少 44×44px，支持 Escape、焦点恢复、`:focus-visible` 与 reduced motion。

* 桌面三栏及 820px、560px、390px 降级布局均不得横向溢出；重叠计划在窄屏仍须逐项可辨认和可操作。

## V2.1 Verification

实现 SHALL 增加可重复验证：

* View-model/DOM 测试覆盖三栏结构、计划时间定位、按时长高度、重叠分列或错位及独立选择。

* 场景折叠测试覆盖精确 `calendarEntryIds[]` 投影、计划四态、缺失字段【未关联计划】以及禁止时间重叠推断。

* 可见文案测试证明场景相关中文不出现英文标签 `Scene`，且不存在 attendance、“去了/没去”或同义出席结论。

* 右栏白名单测试证明“开始时刻的全部安排”、自由开场、重复关系与重复说明均不再渲染。

* 自由开场测试证明入口和表单位于场景区，提交继续复用既有原子 transition，右栏不承载表单。

* 桌面与 820px、560px、390px 浏览器验收覆盖阅读顺序、键盘、ARIA、44px、焦点、Escape、reduced motion 和无横向溢出。

## Why

现有 Hogwarts MUD 已有世界时钟、场景转场和场景档案，但缺少一个玩家可见、可持续维护的时间线。开场 `agenda` 只生成一次，容易随世界时间推进而陈旧；高级导演和中级导演也没有统一方式安排长期情节、关键事件及日常活动。

Calendar V1 只解决一件事：用同一种时间线条目保存玩家可见的故事线与事件。高级导演负责长期方向，中级导演滚动维护近期安排，玩家可以逐项预览安排，并从任一安排进入其开始时间点。Calendar 安排与 Scene 是两个独立概念；同一时刻的多项安排可以在同一个 Scene 中同时处理。Canon、魁地奇、考试、约会和课程都只是普通条目的标签或内容，不产生独立机制。

## Goals

* 使用 `calendar.version=1`、`calendar.entries[]` 和 `calendar.horizon` 构成唯一 Calendar 状态。

* 使用同一条目结构表达长期故事线和具体事件。

* 让高级导演与中级导演提交同一种按 ID upsert proposal。

* 允许时间重叠的条目共存并同时发生，不把参与者或地点当作排他锁。

* 将 Calendar 完整展示给玩家，隐藏 `storyArc` 不进入 Calendar。

* 将 `sceneArchive` 投影为只读历史条目，不复制档案正文。

* 通过 revision guard 原子执行 `runCalendarMoment(entryId)`，进入目标开始时间点并关联该时刻的全部安排。

* 使用 `calendarEntryIds[]` 与 `relatedSceneIds[]` 表达 Scene 和 Calendar 条目的多对多关系。

* 停止使用 legacy `agenda`，且不迁移其中的数据。

## Non-Goals

* Calendar 不负责保存隐藏剧情、人物私密动机或锁定线索。

* Calendar 不为 Canon 建立独立存储、权限、排序或结算规则。

* Calendar 不自动生成未被导演明确提交的条目。

* Calendar 不裁决时间重叠，不要求玩家在同时发生的安排中二选一。

* Calendar 不复制场景正文、消息或 Author's Quill 内容。

* Calendar 不直接修改 Item、Identity、Social、Memory 或其他领域权威。

## Data Model

Calendar SHALL 保存在 `chatMetadata.hogwartsMud.calendar`：

```text
calendar.version = 1
calendar.entries[]
calendar.horizon
```

`calendar.horizon` SHALL 是一个绝对世界时钟值，表示中级导演已经检查并维护到的未来边界。它不要求每一天都存在条目。旧档初始化时取当前世界时钟，只有中级规划成功提交后才能向后推进。

`calendar.entries[]` 中的每个持久化条目 SHALL 只包含以下字段：

```text
id
parentId
entryType = storyline | event
title
titleEn
summary
summaryEn
tags[]
startClock
endClock
participantIds[]
mapId
roomId
status = planned | active | completed | cancelled
planningTier = high | medium
relatedSceneIds[]
createdClock
updatedClock
```

字段规则：

* `id` 是稳定且非空的条目 ID；upsert 以此字段确定新增或更新。

* `parentId` 可为空，或引用同一 `entries[]` 中的 `storyline` 条目；引用不得形成循环。

* `entryType` 只区分长跨度故事线与具体事件，不改变存储结构。

* 中英文标题和摘要均为玩家可见文本，不得包含隐藏导演信息。

* `tags[]` 是去重后的普通字符串数组。`canon`、`quidditch`、`exam`、`date`、`class` 等值只用于筛选和展示。

* `startClock`、`endClock` 使用现有绝对世界时钟格式，且 `endClock` 不早于 `startClock`。

* `participantIds[]` 去重并引用现有 Actor 权威；参与者是安排上下文，不是 Scene 的排他锁。

* `mapId`、`roomId` 引用现有地点权威，且房间属于对应地图；地点是进入时间点时的建议上下文，不锁定 Scene Transition 的最终地点。

* `relatedSceneIds[]` 是去重后的只读关系数组，只能引用已封存 Scene 的稳定 archive ID。Scene 封存 Reducer 负责追加关系，导演 proposal 不得直接改写。

* `createdClock` 创建后不可修改；`updatedClock` 不早于 `createdClock`。

* Schema SHALL 拒绝未知字段，避免模型私有内容进入 Calendar。

## ADDED Requirements

### Requirement: 单一 Calendar 权威

系统 SHALL 只持久化一个 `calendar.entries[]`。长期故事线和具体事件通过 `entryType` 区分，不保存到不同集合。

所有条目 SHALL 使用相同字段校验、ID 规则、保存通道和玩家可见性规则。Projection 可以按日期、标签、父条目或类型分组，但不得产生第二份事实。

#### Scenario: 新世界初始化

* **WHEN** 人物建档与 World Foundation 完成

* **THEN** 系统创建 `calendar.version=1`

* **AND** `calendar.entries` 是合法数组

* **AND** `calendar.horizon` 等于当前世界时钟

* **AND** 后续高级规划通过统一 proposal 写入首批长期故事线与关键事件

#### Scenario: 故事线关联事件

* **WHEN** 高级导演创建一条长期故事线及其关键事件

* **THEN** 两者都写入 `calendar.entries[]`

* **AND** 关键事件通过 `parentId` 引用故事线

* **AND** 不生成并行的故事线事实副本

### Requirement: 统一 Upsert Proposal

高级导演和中级导演 SHALL 只提交同一种 Calendar upsert proposal：

```text
baseTimelineEpoch
baseStateRevision
entries[]
```

Proposal 中的 `entries[]` 使用完整 Calendar 条目结构。Reducer SHALL：

1. 校验 `timelineEpoch + stateRevision`。
2. 校验条目字段、引用、时间和稳定 ID。
3. 对新 ID 执行创建，对已有 ID 执行更新。
4. 保留 proposal 未提及的条目。
5. 拒绝修改 `completed` 或 `cancelled` 条目；取消尚未结束的条目必须由对应导演在 proposal 中明确提交。
6. 在一次 guarded save 中提交全部合法变更。

模型不得直接写 Calendar state。重复应用同一 revision 上的同一 proposal SHALL 只成功一次；陈旧 proposal SHALL 被拒绝且不改变状态。

`planningTier` 表示创建和继续维护该条目的导演层级：

* 高级导演创建或更新 `planningTier=high` 的条目。

* 中级导演创建或更新 `planningTier=medium` 的条目。

* 中级导演可以读取并引用高级条目，但不能改写高级条目。

* 此边界只约束导演职责，不赋予任何标签额外地位。

* `planningTier` 只表示规划维护职责，不决定 Scene Transition 使用的导演层级。

#### Scenario: 中级规划引用高级故事线

* **WHEN** 中级导演为高级故事线安排一次周末会面

* **THEN** 中级 proposal 创建 `planningTier=medium` 的事件

* **AND** `parentId` 指向现有高级故事线

* **AND** 高级故事线本身保持不变

#### Scenario: 陈旧 proposal

* **WHEN** proposal 的 epoch 或 revision 已落后

* **THEN** Reducer 拒绝整个 proposal

* **AND** Calendar 与其他领域状态保持不变

* **AND** 系统不让模型猜测或覆盖新状态

### Requirement: 时间、状态与重叠

Calendar SHALL 允许任意条目在时间、参与者或地点上重叠。Projection 逐项显示所有重叠安排；这些安排在其共同时间区间内同时发生，并可由玩家在同一个 Scene 中处理。

系统 SHALL NOT 因重叠而删除、改期、隐藏、禁用或阻止条目。参与者和地点只提供安排上下文，不构成独占资源。进入某个安排的开始时间点不是对唯一事件的选择，也不得以该操作为由改变、取消或结算其他重叠条目。

状态变化 SHALL 限于：

```text
planned -> active
planned -> completed
planned -> cancelled
active -> completed
active -> cancelled
```

* 导演只能更新尚未结束且属于自身 `planningTier` 的条目。

* 当世界时钟进入 `[startClock, endClock]` 时，`planned` 条目可由本地 Reducer 变为 `active`。

* 当世界时钟越过 `endClock` 时，`planned` 或 `active` 条目由本地 Reducer 变为 `completed`。

* `completed` 只表示安排的时间已经发生，不表示玩家成功、失败、出席或取得任何叙事结果。

* `planned` 或 `active` 变为 `cancelled` 只能来自对应导演明确提交并通过 revision guard 的 proposal；重叠、进入 Scene、时钟推进或玩家预览均不得自动取消条目。

* `completed`、`cancelled` 是 terminal 状态。

* `endClock` 早于当前世界时钟的条目及所有 terminal 条目只读。

* 过去条目不得被改期、改写、删除或重新进入。

* 世界时钟结算是零模型的统一本地规则。进入时间点的原子提交可以按该规则让覆盖目标时刻的全部 `planned` 条目一起变为 `active`，但不得对其中任何一项执行排他结算。

* 状态结算不生成 Item、关系、记忆、比分、成绩或其他跨领域结果。

#### Scenario: 同时参加考试与约会

* **WHEN** 考试和约会具有相同的 `startClock` 与重叠时间区间

* **THEN** 两个条目都保留并正常显示

* **AND** 从任一条目的预览进入该时间点后，新 Scene 的 `calendarEntryIds[]` 同时包含考试和约会 ID

* **AND** 两个条目都按当前时钟变为 `active`

* **AND** 玩家可以在同一 Scene 中边考试边约会

* **AND** 世界时钟越过各自 `endClock` 后两者都变为 `completed`

* **AND** 任一条目都不会因进入操作而自动取消

* **AND** 低档 Performer prompt 同时收到考试和约会两条安排

#### Scenario: 过去条目不可改写

* **WHEN** 任一导演提交对过去条目的更新

* **THEN** Reducer 拒绝该更新

* **AND** 原条目 byte-stable

### Requirement: 高级导演规划

高级 Calendar Director SHALL 在以下时机运行：

1. 人物建档与 World Foundation 成功后。
2. high-tier 重大转折已成功提交后。

高级导演 SHALL 使用统一 upsert proposal：

* 创建或更新 `planningTier=high` 的长跨度 `storyline` 条目。

* 使用 `participantIds` 绑定关键人物。

* 创建或更新关键 `event` 条目，并用 `parentId` 关联长期故事线。

* 只提交玩家可见的标题、摘要、时间、人物和地点。

* 保留过去条目，不以中级导演代写失败的高级规划。

高级导演需要新人物时 SHALL 先提交 Actor Admission/Identity proposal。只有人物已通过现有 Actor 与 Identity 校验并取得稳定 ID 后，Calendar proposal 才能引用该人物。

高级规划失败 SHALL 保留原 Calendar，不回滚已经提交的人物建档或重大转折。

#### Scenario: 建档后创建长期方向

* **WHEN** Foundation 已建立初始人物和世界状态

* **THEN** 高级导演提交长期故事线、关键人物绑定和关键事件

* **AND** 所有条目使用统一 Calendar 字段

* **AND** Calendar 中不出现未准入的人物 ID

#### Scenario: 重大转折后刷新

* **WHEN** high-tier 重大转折成功改变世界状态

* **THEN** 高级导演可更新仍在当前或未来的高级条目

* **AND** 过去条目保持不变

* **AND** 刷新失败不回滚该重大转折

### Requirement: 中级导演与 Daily Director

中级 Calendar Director SHALL 根据以下输入滚动维护未来 7–14 天：

* 当前 Calendar 中的高级条目。

* 当前及未来的中级条目。

* 最近玩家行为和明确承诺。

* 已准入人物、人物当前状态及地点权威。

* 当前世界时钟。

中级导演 SHALL 使用统一 upsert proposal 创建或更新 `planningTier=medium` 的条目。它可以安排魁地奇、约会、考试、课程、训练、会面和其他近期事件；这些类别只通过普通 `tags[]` 表达。

中级规划的目标边界 SHALL 位于当前世界时钟之后 7–14 天。当前 `calendar.horizon` 距现在不足 7 天、跨日、一次高级规划成功，或玩家作出影响近期安排的明确行为时，可以触发中级刷新。只有 proposal 成功提交后，`calendar.horizon` 才更新为本次已检查的边界。

Daily Director SHALL 读取 Calendar 的当日和近期 projection，用于人物目标、情绪与表演指导。它不得直接写 Calendar；需要调整近期安排时，由中级 Calendar Director 提交 proposal。

Daily Director 的当前时刻输入 SHALL 包含全部时间重叠 Calendar 条目，不得按参与者、地点、标签或预览焦点只保留一项。

#### Scenario: 玩家答应周末约会

* **WHEN** 玩家明确答应某位已准入人物周末见面

* **THEN** 中级导演可创建带 `date` 标签的事件

* **AND** 条目具有稳定 ID、时间、地点和参与者

* **AND** 条目立即出现在玩家 Calendar

#### Scenario: 滚动边界不足

* **WHEN** `calendar.horizon` 距当前世界时钟不足 7 天

* **THEN** 中级导演检查未来安排并提交增量 upsert

* **AND** 成功后边界推进到未来 7–14 天内

* **AND** 没有安排的日期保持为空

### Requirement: Canon 与普通标签同权

Canon 条目 SHALL 与普通条目完全同构。唯一标识方式是 `tags[]` 包含 `canon`。

`canon` 标签 SHALL NOT 改变：

* Schema 或持久化位置。

* 导演 upsert 格式。

* 时间重叠行为。

* 玩家进入条件。

* 状态变化与时间结算规则。

* UI 操作能力。

* 保存与 revision guard。

Canon 条目可以与任何其他条目重叠并在同一 Scene 中处理。系统不得因 `canon` 标签自动创建条目、保护预设结果或阻止玩家偏离。

#### Scenario: Canon 条目时间结束

* **WHEN** 世界时钟越过一个 Canon 条目的 `endClock`

* **THEN** 条目与普通条目一样变为 `completed`

* **AND** 系统不生成预设结果

* **AND** `canon` 标签仍仅用于展示和筛选

### Requirement: Calendar 完全玩家可见

Calendar state、projection、UI 和保存差异中的每个条目字段 SHALL 可向玩家展示。

隐藏 `storyArc`、人物私密动机、未公开线索、模型思考和导演私有 payload SHALL NOT 写入 Calendar。若隐藏剧情需要安排公开行动，导演只能提交不泄密的玩家可见标题与摘要。

#### Scenario: 隐藏剧情产生公开安排

* **WHEN** 隐藏 `storyArc` 需要安排一次公开会面

* **THEN** Calendar 只保存公开时间、地点、人物和摘要

* **AND** 隐藏原因不出现在 state、UI、prompt projection 或 revision diff

### Requirement: 当前时刻 Prompt Context

系统 SHALL 提供纯函数 projection，返回指定世界时钟落入其 `[startClock, endClock]` 的全部未取消 Calendar 条目。该集合 SHALL 保留每个条目的完整玩家可见字段，并遵循以下规则：

* Performer、Daily Director 和 Scene Transition prompt 都接收有效场景时刻的全部重叠条目。

* 普通生成使用当前世界时钟；`runCalendarMoment(entryId)` 使用目标 `startClock` 作为转场有效时刻。

* 低档 Performer prompt 与 medium/high Scene Transition prompt 使用同一完整重叠集合，不按 prompt 层级删减条目。

* `participantIds[]`、`mapId` 和 `roomId` 只是上下文；不同条目的参与者或地点不一致时仍全部进入 prompt。

* `planningTier` 只作为条目元数据，不路由或锁定 Scene Transition 层级。

* Prompt 可指导角色在一个 Scene 中处理多项安排，但不得据此直接写 Calendar 状态。

#### Scenario: 低档表演处理同一时刻的多项安排

* **WHEN** 当前时刻同时覆盖考试和约会条目

* **THEN** 低档 Performer prompt 同时包含两条完整的玩家可见安排

* **AND** 不因参与者或建议地点不同而过滤任何一条

* **AND** 模型可以表演玩家在同一 Scene 中同时处理两项安排

### Requirement: Scene Archive 派生历史

`sceneArchive` SHALL 继续保存场景档案正文。Calendar SHALL 通过纯 projection 将档案显示为派生历史条目，不把 transcript、messages、timeline 或 Author's Quill 正文复制到 `calendar.entries[]`。

* 当前 Scene SHALL 持有去重的 `calendarEntryIds[]`，表示该 Scene 同时关联的全部 Calendar 条目。

* Scene 封存时 SHALL 将该数组保存到 archive record；一个 archive record 可以关联多个 Calendar 条目。

* 同一次 guarded save SHALL 为 `calendarEntryIds[]` 中每个现存条目的 `relatedSceneIds[]` 追加该 archive record 的稳定 ID。一个 Calendar 条目可以关联多个 archive record。

* 关系追加只由 Scene 封存 Reducer 执行，必须去重，并不得改变条目的时间状态。

* 没有 `calendarEntryIds[]` 或数组为空的旧 archive record 仍使用其稳定 ID 派生只读历史，不要求迁移补链。

* 派生历史只存在于 projection，使用 archive 元数据填充统一展示字段。

* Calendar 条目预览可以列出其 `relatedSceneIds[]` 对应的全部只读 Scene；Scene 预览也可以列出其关联的全部 Calendar 条目。

* 右侧 Scene 预览按 archive record 的稳定 ID 读取原档案正文。

* 派生历史、过去 Scene 以及 `completed`/`cancelled` 条目只读，查看时不写世界状态也不调用模型。

#### Scenario: 查看旧场景

* **WHEN** 玩家打开由 `sceneArchive` 派生的历史条目

* **THEN** 右侧预览从原档案读取正文

* **AND** `calendar.entries[]` 不新增正文或历史副本

* **AND** 页面不显示【进入场景】

#### Scenario: 一个安排关联多个过去 Scene

* **WHEN** 同一 Calendar 条目先后参与多个 Scene 且这些 Scene 均已封存

* **THEN** 条目的 `relatedSceneIds[]` 包含每个相关 archive record 的稳定 ID

* **AND** 玩家可从过去 Calendar 安排逐个打开相关只读 Scene

* **AND** 打开任一过去 Scene 都不改变 Calendar、世界时钟或档案

### Requirement: 进入 Calendar 时间点

UI SHALL 只对满足以下条件的条目显示【进入场景】：

* 条目持久化于 `calendar.entries[]`。

* `status=planned`。

* `startClock` 不早于当前世界时钟。

* `mapId`、`roomId` 和全部 `participantIds` 仍有效。

按钮说明 SHALL 明确【进入场景】表示进入该安排的 `startClock`，而不是把该安排选为唯一发生的事件。同一时刻的每个条目都可逐项预览，进入后不会禁用、取消或排除其他重叠条目。

`runCalendarMoment(entryId)` SHALL：

1. 读取目标条目并校验 `timelineEpoch + stateRevision`。
2. 仅以目标条目的 `startClock` 作为目标时刻，以 `mapId`、`roomId` 作为建议地点；`participantIds[]` 和其他重叠条目作为转场上下文。
3. 计算目标时刻全部时间重叠且未取消的 Calendar 条目，不按预览焦点、参与者、地点、标签或 `planningTier` 过滤。
4. 按现有普通 Scene Transition 规则选择 medium/high 转场权威；转场层级与目标条目的 `planningTier` 解耦。
5. 向 Scene Transition prompt 提供步骤 3 的完整条目集合。导演可根据世界权威确定场景表现与最终地点，但不得改写目标时刻或 Calendar 内容。
6. 在一个 guarded 原子提交中封存当前 Scene、推进世界时钟到目标时刻、按统一时钟规则结算状态，并创建新 Scene。
7. 新 Scene 的 `calendarEntryIds[]` SHALL 包含步骤 3 的全部条目 ID；覆盖目标时刻的全部 `planned` 条目一起变为 `active`。
8. 当前 Scene 的封存与关系追加遵循 Scene Archive 多对多规则。新 Scene 将来封存时再为其关联条目追加 archive record ID，封存本身不得把条目标记为 `completed`。

任一步骤发生 stale revision、模型失败、校验失败或保存失败时 SHALL 不改变 Scene、clock、Calendar 或其他领域状态，也不得自动重试剧情模型。

#### Scenario: 从未来魁地奇安排进入时间点

* **WHEN** 玩家点击未来 planned 魁地奇条目的【进入场景】

* **THEN** 当前场景只封存一次

* **AND** 世界时钟推进到该条目的 `startClock`

* **AND** 该条目的地点作为 Scene Transition 的建议地点

* **AND** 转场层级由正常 medium/high 规则决定

* **AND** 新 Scene 的 `calendarEntryIds[]` 包含目标时刻全部重叠安排

* **AND** 这些安排按统一时钟规则变为 `active`

#### Scenario: 两个页面同时进入

* **WHEN** 两个页面基于同一 revision 尝试进入不同 Calendar 时间点

* **THEN** 第一个原子提交成功

* **AND** 第二个提交因 revision 已变化而失败

* **AND** 第二个提交不封存场景、不推进时钟、不改写 Calendar

### Requirement: Legacy Agenda 隔离

Migration SHALL NOT 将 legacy `agenda` 转换为 Calendar 条目。旧字段可以原样留在旧档中，但任何 Calendar prompt、Daily prompt、projection 和 UI 都不得再读取它。

今日安排 SHALL 完全由 `calendar.entries[]` 的纯 projection 生成。

#### Scenario: 旧档包含陈旧 agenda

* **WHEN** 旧档的 `agenda` 与当前世界时钟不一致

* **THEN** migration 不复制其中任何项目

* **AND** prompt 与 UI 不显示该数据

* **AND** Calendar 今日安排只来自统一条目

### Requirement: Migration and Save Guard

`migrateCalendarState()` SHALL：

* 零模型且幂等。

* 为缺少 Calendar V1 的存档初始化 `version=1`、空 `entries[]` 和取当前世界时钟的 `horizon`。

* 不修改 clock、scene、sceneArchive、actors、Items、Identity、Social、Memory、位置或消息。

* 不复制 `sceneArchive` 正文。

* 不读取或迁移 legacy `agenda`。

所有 Calendar 写入 SHALL 使用现有 guarded save ports，并以 `timelineEpoch + stateRevision` 防止陈旧覆盖。失败保存不得留下部分状态。

#### Scenario: 真实旧档 dry-run

* **WHEN** 对真实 JSONL 存档执行 migration dry-run

* **THEN** 原文件 SHA、mtime 和消息保持不变

* **AND** 现有领域状态保持不变

* **AND** 重复 migration 得到相同结果

* **AND** 网络与模型调用均为 0

### Requirement: Calendar Projection and UI

Calendar projection SHALL 是不写 state、不调用模型的纯函数，并提供：

* 左侧日期导航、所选日期条目和同一时刻全部重叠条目列表。

* 右侧所选条目的标题、摘要、标签、状态、时间、地点、人物和操作。

* `sceneArchive` 派生历史、Calendar 条目的相关只读 Scene 列表及其正文预览。

* 当日条目供现有侧栏和 Daily Director 使用。

UI SHALL 与线上 Hogwarts MUD 保持一致，复用现有颜色、字体、按钮、dialog 和档案阅读样式，不新增外部 UI 依赖。

桌面使用左日历、右预览。窄屏改为单列流程，日历和预览均不得横向溢出。状态与标签必须有文字，不得只靠颜色表达。

无障碍要求：

* Dialog 有可读名称，关闭后焦点回到日历入口。

* 日期和条目可通过键盘到达、选择和激活。

* 当前日期与当前选择使用正确 ARIA 状态。

* 交互目标至少 44×44px。

* 时间使用语义化 `<time>`。

* 支持 Escape、`:focus-visible` 和 reduced motion。

UI SHALL 在【进入场景】附近说明操作将进入所预览安排的开始时间点。同一时刻的安排不得出现冲突、互斥选择、因另一项已预览而禁用或自动结算的文案与交互。

#### Scenario: 桌面逐项预览重叠条目

* **WHEN** 玩家在左侧逐项预览同一时间的不同条目

* **THEN** 右侧分别显示各自预览和操作

* **AND** Calendar 不自动隐藏或合并这些条目

* **AND** 从任一预览进入时都进入该时刻，并把全部重叠条目关联到新 Scene

* **AND** 选择过程不滚动主故事

#### Scenario: 窄屏查看历史

* **WHEN** 玩家在 390px 视口选择过去档案

* **THEN** 日历与预览以单列显示

* **AND** 正文可读且无横向溢出

* **AND** 历史条目保持只读

#### Scenario: 从过去 Calendar 安排查看 Scene

* **WHEN** 玩家预览已结束且具有多个 `relatedSceneIds[]` 的 Calendar 条目

* **THEN** 右侧列出全部相关只读 Scene

* **AND** 玩家可逐个查看原 archive record 正文

* **AND** 页面不提供会改变过去 Scene 或 Calendar 状态的操作

### Requirement: Verification

实现 SHALL 具备可重复验证：

* Calendar Schema、normalization、migration、Reducer 和 projection 单元测试。

* 高级与中级统一 proposal、职责边界和过去只读测试。

* Canon 与普通标签行为一致测试。

* 四态状态机、本地时钟结算、明确取消 proposal 及“完成不代表成功结果”测试。

* 任意重叠共存、同一 Scene 同时处理多项安排和跨领域不写入测试。

* Actor Admission/Identity 前置校验测试。

* `runCalendarMoment` 原子性、建议地点、正常转场层级、全量重叠关联、失败不变和双页面竞争测试。

* Scene/Calendar 多对多关联、Scene Archive 派生、正文不复制和历史只读测试。

* Performer、Daily、Scene Transition prompt 接收当前时刻全部重叠条目的测试。

* 考试与约会同一时刻的强制验收：从任一预览进入后 Scene 同时关联两项，两项一起 `active`、随后 `completed`、不自动取消，且低档 prompt 同时收到两项。

* legacy `agenda` 不迁移且不进入 prompt/UI 的测试。

* Calendar DOM、键盘、焦点、ARIA 和响应式测试。

* 真实存档 dry-run、浏览器验收、全量 Node、ESLint、`node --check`、`git diff --check`、模块体积和依赖边界验证。

## MODIFIED Requirements

### Requirement: Existing World Director Foundation

World Director Foundation 成功后 SHALL 触发高级 Calendar Director。需要新增人物时先完成 Actor Admission/Identity，再提交 Calendar upsert proposal。

### Requirement: Existing High-Tier Scene Transition

high-tier 重大转折成功提交后 SHALL 触发高级 Calendar Director。Calendar 刷新失败不回滚已提交转折。

### Requirement: Existing Daily Director

Daily Director SHALL 只读 Calendar 当日与近期 projection。Calendar 变更只能由中级 Calendar Director 通过统一 proposal 提交。

Performer 与 Daily Director prompt SHALL 接收当前时刻全部重叠 Calendar 条目，不得按参与者、地点或标签进行排他过滤。

### Requirement: Existing Scene Transition

普通场景封存继续可用。Calendar 入口通过 `runCalendarMoment(entryId)` 进入目标 `startClock`，把地点作为建议，并复用现有 medium/high 原子转场基础设施。Scene Transition prompt 接收目标时刻全部重叠条目，转场层级不读取条目的 `planningTier`。

### Requirement: Existing Scene Archive

`sceneArchive` 继续是场景档案正文的唯一权威。当前 Scene 与 archive record 保存 `calendarEntryIds[]`；条目以 `relatedSceneIds[]` 引用全部相关 archive record，并生成只读 projection。

### Requirement: Existing Agenda

legacy `agenda` 不再是权威、prompt 输入或 UI 数据源，也不迁移为 Calendar 条目。
