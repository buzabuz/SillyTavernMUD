# Schema 与迁移

- [x] 新世界和旧档均得到 `calendar.version=1`、`calendar.entries[]` 与 `calendar.horizon`。
- [x] `calendar.horizon` 是中级导演已检查到的绝对世界时钟，旧档初始化为当前时钟。
- [x] `calendar.entries[]` 同时保存 `storyline` 与 `event`，没有第二份时间线事实。
- [x] 每个持久化条目只含规格列出的统一字段，unknown field 被拒绝。
- [x] 条目 ID 稳定；`parentId` 只引用 storyline 且不会形成循环。
- [x] `relatedSceneIds[]` 是去重的 archive record 稳定 ID 数组，只能由 Scene 封存 Reducer 追加。
- [x] 时间顺序有效，Actor、地图和房间引用均通过现有权威校验。
- [x] `tags[]` 去重，`canon`、`quidditch`、`exam`、`date`、`class` 均按普通标签处理。
- [x] migration 零模型、幂等并通过 guarded save。
- [x] migration 不改变 clock、scene、sceneArchive、actors、Item、Identity、Social、Memory、位置或消息。
- [x] legacy `agenda` 不迁移，也不再进入任何 prompt、projection 或 UI。
- [x] `sceneArchive` 的正文、消息、timeline 和 Author's Quill 不复制进 Calendar。

# Reducer 与 Projection

- [x] 高级和中级导演使用同一种按 ID upsert proposal。
- [x] Proposal 使用 `timelineEpoch + stateRevision`；陈旧 proposal 整体失败且状态不变。
- [x] 新 ID 创建、已有 ID 更新、未提及条目保留。
- [x] `planningTier=high` 只由高级导演维护，`planningTier=medium` 只由中级导演维护。
- [x] 条目状态只允许 `planned | active | completed | cancelled`。
- [x] 世界时钟进入 `[startClock, endClock]` 时，planned 条目可由本地 Reducer 变为 active。
- [x] 世界时钟越过 `endClock` 后，planned 或 active 条目由本地 Reducer 变为 completed。
- [x] completed 只表示安排时间已发生，不代表成功、失败、出席或任何跨领域结果。
- [x] planned/active 变为 cancelled 只接受对应导演明确提交且通过 revision guard 的 proposal。
- [x] 过去条目和 completed/cancelled 条目只读、不可删除、不可重进。
- [x] 时间、参与者或地点重叠的条目全部保留并逐项显示。
- [x] 同一时刻的重叠安排同时发生，可在一个 Scene 中处理。
- [x] 重叠不会触发自动排序、改期、隐藏、删除、禁用、取消或结果编造。
- [x] Projection 可按日期、父条目、标签、当日、近期和指定时刻全部重叠条目筛选。
- [x] Projection 不写 state、不调用模型、不读取隐藏 `storyArc`。
- [x] Calendar Reducer 不直接修改 Item、Identity、Social、Memory 或其他领域权威。

# High Director

- [x] 人物建档与 World Foundation 成功后触发高级 Calendar Director。
- [x] high-tier 重大转折成功提交后触发高级 Calendar 刷新。
- [x] 高级导演通过统一 upsert proposal 创建长跨度故事线、关键人物绑定和关键事件。
- [x] 关键事件可通过 `parentId` 关联同一数组中的故事线。
- [x] 新人物先通过 Actor Admission/Identity，再进入 `participantIds[]`。
- [x] 高级导演只提交玩家可见标题、摘要、时间、地点和人物。
- [x] 隐藏 `storyArc`、私密动机、锁定线索和模型思考不进入 Calendar。
- [x] 高级刷新不改写过去条目。
- [x] 高级刷新失败保留原 Calendar，且不回滚已提交的人物建档或重大转折。
- [x] 高级刷新失败不会交给中级导演代写。

# Medium 与 Daily

- [x] 中级导演读取高级条目、现有近期条目、玩家行为、人物状态、地点与当前时钟。
- [x] 中级导演滚动维护未来 7–14 天，并只 upsert `planningTier=medium` 条目。
- [x] `calendar.horizon` 距现在不足 7 天时可触发刷新。
- [x] 跨日、高级规划成功或玩家明确行为影响近期安排时可触发刷新。
- [x] 只有中级 proposal 成功提交后才推进 `calendar.horizon`。
- [x] 没有安排的日期允许保持为空。
- [x] 重复规划复用稳定 ID，不产生重复条目。
- [x] 魁地奇、约会、考试、课程、训练和会面均以普通标签创建。
- [x] Daily Director 只读 Calendar 当日与近期 projection。
- [x] Daily Director 的当前时刻输入包含全部时间重叠 Calendar 条目。
- [x] Daily Director 需要调整安排时转交中级导演，不直接写 Calendar。

# Canon 同权

- [x] Canon 条目与普通条目使用完全相同的字段和持久化位置。
- [x] Canon 的唯一标识是 `tags[]` 包含 `canon`。
- [x] `canon` 不改变 upsert、重叠、进入时间点、状态结算、保存或 UI 规则。
- [x] Canon 条目可以与普通条目同时发生并在同一 Scene 中处理。
- [x] Canon 条目在越过 `endClock` 后与普通条目一样变为 completed。
- [x] Canon 条目不会自动生成或保护预设结果。

# Scene、Archive 与 Calendar Moment

- [x] 只有持久化、未来、`status=planned` 且引用有效的条目可【进入场景】。
- [x] 【进入场景】明确表示进入所预览安排的 `startClock`，不是选定唯一发生的事件。
- [x] `runCalendarMoment(entryId)` 只把目标条目的 `startClock` 作为目标时刻，把 `mapId`/`roomId` 作为建议地点。
- [x] Scene Transition 按正常 medium/high 规则选择权威，不读取目标条目的 `planningTier` 决定转场层级。
- [x] Performer、Daily 与 Scene Transition prompt 都接收有效场景时刻的全部重叠安排。
- [x] prompt 不按参与者、地点、标签、预览焦点或层级过滤重叠安排。
- [x] 进入时间点在一个原子提交中封存当前 Scene、推进时钟、按统一时钟规则结算并创建新 Scene。
- [x] 新 Scene 的 `calendarEntryIds[]` 包含目标时刻全部重叠且未取消的 Calendar 条目。
- [x] Scene 封存时在 archive record 中保留完整 `calendarEntryIds[]`。
- [x] 每个关联条目的 `relatedSceneIds[]` 在同一次 guarded save 中去重追加 archive record ID。
- [x] 一个 Scene 可关联多个 Calendar 条目，一个 Calendar 条目可关联多个 Scene。
- [x] Scene 封存本身不改变条目状态；状态只由统一时钟规则或明确取消 proposal 改变。
- [x] stale revision、模型失败、校验失败或保存失败时 scene、clock、Calendar 和其他领域均不变。
- [x] 两页面竞争时只允许第一个 revision 提交成功。
- [x] `sceneArchive` 以稳定 ID 投影为只读历史；无 Calendar 关联的旧 archive record 仍可派生历史。
- [x] Calendar 条目可列出 `relatedSceneIds[]` 对应的全部只读 Scene，Scene 也可显示全部关联条目。
- [x] 历史正文按 archive record 稳定 ID 从原档案读取，不复制到 `calendar.entries[]`。
- [x] 查看历史不写世界状态、不调用模型，也不显示【进入场景】。

# UI 与全量验证

- [x] Calendar 提供线上风格一致的入口和左日历、右预览界面。
- [x] 左侧显示日期、当日条目和同一时刻全部重叠安排；右侧支持逐项预览完整玩家可见字段与操作。
- [x] 从同一时刻任一条目预览进入后，新 Scene 都关联该时刻全部重叠安排。
- [x] UI 不出现冲突二选一、预览一项后禁用其他项或自动取消/结算其他重叠条目的语义。
- [x] 未来合法 planned 条目显示【进入场景】；过去 Scene、completed/cancelled 条目和派生历史只读。
- [x] 过去 Calendar 安排可查看其全部相关只读 Scene。
- [x] 状态与标签有文字表达，不只依赖颜色。
- [x] Dialog 有可读名称，关闭后焦点回入口，Escape 可关闭。
- [x] 日期和条目支持键盘到达、选择与激活，并使用正确 ARIA 状态。
- [x] 交互目标至少 44×44px，时间使用 `<time>`，支持 focus-visible 与 reduced motion。
- [x] 桌面保持左右布局，窄屏切换单列，390px 无横向溢出。
- [x] Calendar 操作不滚动主故事。
- [x] 真实 JSONL dry-run 保持 SHA、mtime、消息和现有领域不变，模型与网络调用为 0。
- [x] Schema、migration、Reducer、projection、High、Medium、Daily、Calendar Moment、Archive 和 UI 专项测试通过。
- [x] Canon 同权、四态结算、重叠共存、多对多关系、过去只读、失败不变和双页面竞争测试通过。
- [x] 强制验收考试与约会同一时刻：从任一预览进入后 `calendarEntryIds[]` 同时包含两者。
- [x] 强制验收中考试与约会一起 active、越过各自 `endClock` 后一起 completed，且均不自动取消。
- [x] 强制验收中低档 Performer prompt 同时收到考试与约会两条完整安排。
- [x] 桌面与窄屏浏览器验收、进入时间点、相关 Scene 查看和历史只读验收通过。
- [x] 全量 Hogwarts Node、ESLint、完整 `node --check`、`git diff --check` 通过。
- [x] 模块体积、依赖边界、runtime contracts、state fields 与 README 同步完成。
- [x] 临时测试和调试文件已清理。
- [x] Tina revision 27 基线漂移已定位为已加载会话完成 Knowledge Base 同步后经 metadata save 写回，不是 Calendar migration 或 Calendar Moment 写入。
- [x] revision 27 已单独备份；对应 SillyTavern 服务已停止；主 JSONL 已原子恢复为 baseline，且 30 秒观察与后续只读命令后 SHA、mtime、revision、clock 和消息数均不变。
- [x] Calendar 隔离 fixture 使用仓库本地 Playwright 1.56.1、隔离 HOME/TMPDIR 取得 `6/6` 且门禁进程退出码 0。
- [x] 最终验收前后 Tina 主存档 SHA、mtimeNs、stateRevision、clock 与消息数逐项严格相等。
- [x] 最终 Calendar 专项 `47/47`、跨域回归 `102/102`、全量 Hogwarts Node `422/422`、模块体积与依赖边界 `58/58` 均通过。
- [x] 未带 `--experimental-vm-modules` 的全量 Node 探测失败已按 Ralph 规则登记；补齐项目必需参数后 `422/422`、exit 0。
- [x] 普通回合和普通 Scene Transition 跨越 Calendar 条目时间区间后，条目按统一规则变为 active/completed。
- [x] High Calendar 规划失败后不触发 Medium Calendar Director 代写或推进 horizon。
- [x] Medium Calendar prompt 与 proposal 均拒绝 temporary、provisional 或缺少合法 Identity 的参与者。
- [x] Calendar Moment 原子提交成功后的 Daily Director 失败不把已提交 Scene/clock/Calendar 操作报告为整体失败。
- [x] 无 Web Locks 时两个独立页面基于同一 revision 并发保存，至多一个页面执行保存回调并成功。
- [x] 同一 revision 的空 proposal 或无变化 proposal 重复应用时只允许首次成功。
- [x] Calendar 历史正文的语言切换和加载控件至少 44×44px，且 390px E2E 覆盖历史只读、无模型、无写入和无横向溢出。
- [x] 原生 `navigator.locks` 路径会在首次 `getContext()` 前恢复崩溃遗留 claim，不误报“时间线已在其他页面更新”。
- [x] fallback lease 在 heartbeat 停摆或 host save 后崩溃时仍保证至多一个宿主保存回调，并保持 revision head 单调不回退。
- [x] `active` 条目不能被改期到不覆盖当前世界时钟的未来区间后继续保持 `active`。
- [x] 切换 chat/timeline 后 Calendar 普通打开默认定位新存档当前日期，不沿用旧时间线的日期或条目选择。
- [x] Calendar 条目 listbox 使用单一 Tab stop，方向键和 Enter 仍可选择及激活全部 option。
- [x] Tina 真实 JSONL 恢复 revision 26 可信基线，完整复验前后 SHA、mtime、revision、clock 和消息数保持不变。
- [x] Guard 通过明确 durable acknowledgement 区分宿主失败但 resolve 与持久化后抛错，且两种情况下都不误报成功、不回退已持久化 revision、不允许第二次宿主保存回调。
- [x] Calendar 标准 E2E 命令在沙箱中完成全部 11 项断言并以退出码 0 结束。

# 真实服务首屏冲突现场调试与修复

- [x] 验收现场是原 origin/profile 下的真实 `http://127.0.0.1:8000/`，不能以隔离 fixture 或新建浏览器 profile 的结果替代。
- [x] 清理 `localStorage` 或修改存档前，已采集真实宿主 `stateRevision`、`timelineEpoch`，`localStorage` 的 head、ticket、owner、fence，以及页面实际加载的模块版本。
- [x] `timeline-startup-conflict` Debug Server 会话的运行时证据已区分旧模块缓存、stale stable head、有效或遗留 claim、Knowledge Base 自动保存、宿主持久化入口。
- [x] 修复仅针对现场证据确认的根因，没有用清理状态或改写存档掩盖首屏冲突误报。
- [x] 重启真实服务后，原 origin/profile 首屏不再误报“时间线已经在其他页面更新”，且真实并发保存仍被正确阻断。
- [x] 用户确认修复结果后，Debug Server 调试插桩与调试文件已清理。

# Calendar V2 四层模型

- [x] Calendar 根为 `version=2 + storylines[] + storyBeats[] + entries[] + horizon`。
- [x] storyline、storyBeat 与 schedule 使用独立严格 Schema，unknown field 被拒绝。
- [x] storyline 只表达长期方向，不含精确地点，不可直接进入 Scene。
- [x] storyBeat 通过 `storylineId` 关联剧情线，并包含唯一 `termKey`、递增 `sequence` 与固定 `sceneTarget=4`。
- [x] schedule 通过可选 `sourceBeatId + beatSlot` 关联节奏，同一 beat 的 1–4 槽位不得重复。
- [x] 新日程具有 `scheduleKind`，routine/class/story/social/personal 只影响展示与规划，不改变保存权威。
- [x] 长期 `calendar.storyBeats[]` 与单回合 `pacingDirector.pendingBeat` 完全隔离。

# Calendar V2 迁移与状态

- [x] V1 storyline 移入独立集合，不再出现在每个日期。
- [x] V1 event 保留稳定 ID、时间、地点、人物、状态和 Scene 关系，仍可按原条件进入。
- [x] V1 High event 作为 grandfathered schedule 保留；V2 High 不再创建 schedule。
- [x] 迁移不根据旧 `parentId` 伪造 storyBeat、beatSlot 或 beat 完成状态。
- [x] 迁移零模型、幂等，并保持非 Calendar 领域、消息、SHA 与 mtime 不变。
- [x] 世界时钟只结算 schedule，不凭时间流逝将 storyBeat 标记为 realized。
- [x] 一个 beat 只有三个不同相关 Scene 时不得 realized。
- [x] 一个 beat 累积四个合法且不同的相关 Scene 后由本地规则 realized。
- [x] beat 窗口结束但不足四个 Scene 时保留 deferred 残留，不伪造缺失 Scene。

# High 与 Medium V2

- [x] High typed proposal 只包含 storyline/storyBeat，不包含 entries、精确地点或 Scene。
- [x] 四年 storyline 可以建立每学期一个、顺序稳定的 storyBeat。
- [x] High 重大转折只刷新当前与未来节奏，已实现 beat、过去日程和 Scene 不变。
- [x] High 失败不触发 Medium 代写长期剧情节奏。
- [x] Medium 为进入滚动窗口的 beat 创建四个稳定 schedule 槽位。
- [x] 重复 Medium 规划复用 `sourceBeatId + beatSlot`，不产生重复日程。
- [x] Medium 维护未来 7–14 天适用的早餐、课程、午餐、晚餐、训练、会议与社交日程。
- [x] Medium 只写 schedule 和成功后的 horizon，不改 storyline/storyBeat/Scene。
- [x] Medium 仍拒绝 temporary、provisional 或缺少合法 Identity 的人物。

# Scene、Prompt 与自由开场

- [x] 从某个日程进入后，新 Scene 只认领玩家选择的 schedule ID。
- [x] 同刻其他 schedule 继续存在，不自动取消、改期、结算结果或代表玩家同时出席。
- [x] Daily Director 可读取当天全部世界并发 schedule。
- [x] Performer 与 Scene Transition 只读取当前 Scene 认领的 schedule 及公开剧情来源。
- [x] 自由 Scene 不因时间重叠自动获知或认领其他地点的 schedule。
- [x] `runTimelineMoment({ startClock, mapId, roomId })` 接受不早于当前时钟的时间和任意合法地点。
- [x] 自由开场默认创建 `calendarEntryIds=[]` 的 Scene。
- [x] 日程进入与自由开场复用同一 guarded transaction 和正常 medium/high Scene Transition。
- [x] stale revision、模型、校验或 durable save 失败时 Scene、clock、Calendar、Archive 和消息全部不变。
- [x] Scene 封存继续保存 schedule 关系，并通过 `sourceBeatId` 为 storyBeat 追加去重 Scene ID。

# Calendar V2 UI

- [x] 选择日期默认展示按开始时间升序的全天会议式日程，不自动预览第一条 storyline。
- [x] 日期安排数只统计 schedule，不统计 storyline/storyBeat。
- [x] 早餐、课程、午餐、会议等日程显示时间、时长、类型、地点、人物和状态。
- [x] 重叠日程逐项展示，并以文字表达同时进行。
- [x] 日程详情显示公开 storyline/beat 来源与 `0..4` 场景进度。
- [x] 【今日日程 / 剧情线】视图可切换，剧情线视图不冒充日期日程。
- [x] 自由开场表单可选择所选日期的时间、权威地图和房间，并显示校验、busy 与 error 状态。
- [x] 选择时间/地点、切换视图和预览不写 state、不调用模型。
- [x] 视觉延续暗色学院档案、铜金时间轴和编辑式排版，不退化为通用后台。
- [x] 桌面具备清晰的月历/日程/详情层级，820/560/390px 无横向溢出。
- [x] 日期、日程、视图切换和自由开场表单支持键盘、roving tabindex、ARIA、44px、Escape 与焦点恢复。
- [x] 历史 Scene 继续只读，不调用模型、不写状态、不复制正文。

# Calendar V2 全量验收

- [x] 强制验收“蒂娜的秘密”四年 storyline、每学期 beat 与每 beat 四个 schedule 槽位。
- [x] 强制验收 1991-09-06 日期按早餐、魔药课、午餐、其他课程、教职员会议的时间顺序展示。
- [x] 强制验收从教职员会议进入后只认领该日程，并以麦格办公室为建议地点。
- [x] Task44 浏览器证据：隔离 V2 fixture 的 1991-09-06 恰有五项 schedule，列表严格按 `startClock` 显示早餐、魔药课、午餐、另一课程与教职员会议；日期计数为 5，storyline/storyBeat 不进入列表或占据首项。
- [x] Task44 浏览器证据：从麦格与斯内普讨论 Tina 背景会议进入后，Scene 只包含该会议 schedule，并落在 `mcgonagall_office`；同刻另一课程保持 active，未被认领或取消。
- [x] Task44 标准 Calendar E2E 保留 9 月 2 日、自由开场、历史、390px 与竞争覆盖，精确 `13/13` 且 runner exit 0。
- [x] 强制验收考试与约会同刻不同地点时，Daily 看见两项，但考试 Scene/Performer 只看见考试。
- [x] 强制验收在 15:00 选择黑湖湖畔可自由创建不认领 schedule 的 Scene。
- [x] Calendar V2 Schema、migration、Reducer、Projection、High、Medium、Moment、UI 专项测试通过。
- [x] workflow/save/identity/social/item 回归及带 VM modules 的全量 Hogwarts Node 测试通过。
- [x] Calendar 标准 E2E 覆盖桌面、390px、会议式日程、剧情线、日程进入、自由开场、历史只读和跨页面竞争。
- [x] ESLint、完整 `node --check`、`git diff --check`、模块体积与依赖边界通过。
- [x] README、runtime contracts、state fields、dry-run 和测试 fixture 已同步 Calendar V2。
- [x] Scene Transition 与普通回合时钟结算测试不再向严格 V2 领域入口直接注入 Calendar V1 fixture。
- [x] 真实生产加载、可玩态准备与 Scene Transition 入口在领域结算前完成 V1→V2 migration，无不必要的领域层兼容分支。
- [x] 两项定向测试、Calendar 专项与跨域回归通过；全量 Hogwarts Node 除保留的 guarded-save-ports Debug Server 顶层副作用失败外无其他失败。
- [x] Task42：统一时钟结算会把过窗且未满 `sceneTarget` 的 `planned/active` beat 标记为 `deferred`，保持 `realized/cancelled` 且不按文本自动完成；普通回合、Scene Transition、Moment、字段注册与 archive 消息读取文档契约均已回归。
- [x] Task43：真实 V2 JSONL 写入源已隔离并优雅停止；仅恢复 `mtimeNs=1786360173518604107`，观察至少 30 秒并完成 V2 dry-run 后，V2 的 SHA-256、mtimeNs、size、stateRevision、clock 与消息数仍严格等于基线，V1 基线存档未变化，模型/网络调用为 0。

# Calendar V2.1 UI 信息架构

- [x] 桌面日期视图为左日历、中栏【计划】与【场景】、右栏精简详情三栏；未选择具体项目时右栏不自动预览第一项。
- [x] 左栏只承担月历与日期导航；切换日期会同时刷新中栏计划和场景投影。
- [x] 【计划】使用日视图纵向时间刻度，计划卡按 `startClock` 定位并按 `endClock - startClock` 表达时长。
- [x] 重叠计划分列或受控错位，每项仍独立可见、可选择、可进入，不合并、不遮蔽到不可操作。
- [x] 计划只显示自身四态：【计划中】、【进行中】、【已完成时间段】、【已取消】。
- [x] 【场景】中的场景卡默认折叠，展开只列 `sceneArchive.calendarEntryIds[]` 明确认领且可解析的计划。
- [x] 场景卡中的被认领计划直接显示计划自身四态，不维护或推导第二套场景/出席状态。
- [x] 旧档 `calendarEntryIds` 缺失或为空时显示【未关联计划】，不从时间、地点、人物或计划重叠补链。
- [x] UI 不创建、读取或展示 attendance、“去了/没去”或任何同义出席结论。
- [x] 所有面向玩家的场景相关中文均使用“场景”，不显示英文标签 `Scene`。
- [x] 自由开场入口位于【场景】区，触发的时间地点表单或面板、校验及 busy/error 状态也只在场景区内呈现。
- [x] 自由开场提交继续复用既有 `runTimelineMoment` 原子语义并默认创建 `calendarEntryIds=[]` 的场景；右栏不渲染入口或表单。
- [x] 右栏计划详情只保留标题、摘要、时间、地点、人物、状态、公开来源与合法的【进入场景】操作。
- [x] 右栏场景详情只保留 `sceneArchive` 的只读正文与关键元数据，不复制正文、不调用模型、不提供历史写操作。
- [x] 右栏不显示“开始时刻的全部安排”、自由开场、重复计划/场景关系、重复来源或重复操作说明。
- [x] 日期、计划卡、场景折叠按钮、自由开场控件和详情遵循正确键盘阅读顺序，折叠状态与受控区域使用正确 ARIA。
- [x] 所有交互目标至少 44×44px，时间使用 `<time>`，支持 Escape、焦点恢复、`:focus-visible` 与 reduced motion。
- [x] 桌面三栏与 820px、560px、390px 降级布局均无横向溢出；窄屏按“日期 -> 计划与场景 -> 详情”排列且重叠计划仍可辨认操作。
- [x] View-model、DOM 与样式专项覆盖时间定位、时长、重叠布局、场景折叠、精确认领、四态和旧档【未关联计划】。
- [x] 文案与字段白名单测试证明无英文标签 `Scene`、attendance/“去了/没去”及右栏已删除模块。
- [x] 浏览器验收覆盖桌面三栏、重叠计划、场景折叠、场景区自由开场、右栏精简、响应式与无障碍。
- [x] Calendar 专项、标准 E2E、跨域回归、带 VM modules 的全量 Node、ESLint、`node --check`、`git diff --check`、模块体积与依赖边界全部通过。
- [x] 真实存档 dry-run、非 Calendar 领域不变及模型/网络调用为 0 的门禁通过，且 V2 四态与明确认领权威没有改变。
- [x] Task48 回归：calendar-moment `14/14`、Calendar 六专项 `71/71`、带 VM modules 的全量 Hogwarts Node `473/473` 均 exit 0；两个重叠计划按共享时钟结算，`runCalendarMoment` 只认领明确选择项，未选项不进入 Scene 或 Performer，且未恢复 view-model `momentEntries`。
