# Tasks

- [x] Task 1: Schema 与迁移
  - [x] 定义 `calendar.version=1`、`calendar.entries[]`、标量 `calendar.horizon` 及统一条目 Schema。
  - [x] 实现字段校验、稳定 ID、父子引用、`relatedSceneIds[]`、权威 Actor/地图/房间引用和 unknown-field 拒绝。
  - [x] 为新世界初始化 Calendar；为旧档执行零模型、幂等迁移，`horizon` 取当前世界时钟。
  - [x] legacy `agenda` 不迁移且不再进入 prompt/UI；`sceneArchive` 正文不复制。
  - [x] 覆盖 normalization、非法引用、重复迁移和现有领域不变测试。

- [x] Task 2: Reducer 与 Projection
  - [x] 实现高级/中级共用的按 ID upsert proposal、`timelineEpoch + stateRevision` 校验和 guarded save。
  - [x] 实现 `planned | active | completed | cancelled` 四态：进入时间区间时本地激活，越过 `endClock` 时本地完成，取消只接受导演明确 proposal。
  - [x] 明确 `completed` 仅表示安排时间已发生；过去与 completed/cancelled 条目只读，Scene 操作不产生成功结果或自动取消。
  - [x] 允许时间、人物和地点重叠且同时发生；逐项投影全部安排，不自动排序、删除、改期、禁用或排他结算。
  - [x] 实现按日期、父条目、标签、当日、近期和指定时刻全部重叠条目的纯 projection。
  - [x] 覆盖幂等、职责边界、四态时钟结算、明确取消、重叠共存和无跨领域写入测试。

- [x] Task 3: High Director
  - [x] 在人物建档与 World Foundation 后运行高级 Calendar Director。
  - [x] 在 high-tier 重大转折成功提交后刷新当前及未来的高级条目。
  - [x] 使用统一 upsert proposal 创建长跨度故事线、关键人物绑定和关键事件。
  - [x] 新人物先通过 Actor Admission/Identity，再允许 Calendar 引用稳定 Actor ID。
  - [x] 拒绝隐藏 `storyArc` 内容和过去改写；覆盖建档、重大转折、准入前置与失败保留测试。

- [x] Task 4: Medium Director 与 Daily Director
  - [x] 中级导演依据高级条目、现有近期条目、玩家行为、人物状态和地点权威维护未来 7–14 天。
  - [x] 使用统一 upsert proposal 创建或更新中级条目，并仅维护 `planningTier=medium`。
  - [x] 仅在提交成功后推进 `calendar.horizon`；重复规划复用稳定条目 ID。
  - [x] 支持魁地奇、约会、考试、课程、训练和会面等普通标签，不为任何标签增加特殊规则。
  - [x] Daily Director 只读当日、近期及当前时刻全部重叠条目的 projection，Calendar 变更交给中级导演。
  - [x] Performer、Daily 与 Scene Transition prompt 均接收有效场景时刻的全部重叠安排，不按人物、地点、标签或 prompt 层级过滤。
  - [x] 覆盖滚动边界、玩家承诺、标签同权、重复运行、Daily 只读和全量重叠 prompt 测试。

- [x] Task 5: Scene、Archive 与 Calendar Moment
  - [x] 实现 `runCalendarMoment(entryId)`：目标条目只提供 `startClock`、建议 `mapId`/`roomId` 和安排上下文。
  - [x] 按正常规则选择 medium/high Scene Transition 权威，使转场层级与 `planningTier` 解耦。
  - [x] 复用原子场景转场，在一次 guarded save 中封存当前 Scene、推进时钟、按统一时钟规则结算并创建新 Scene。
  - [x] 新 Scene 的 `calendarEntryIds[]` 写入目标时刻全部重叠且未取消的条目 ID，不因预览焦点、人物或地点过滤。
  - [x] Scene 封存时保留 `calendarEntryIds[]`，并为每个关联条目的 `relatedSceneIds[]` 去重追加 archive record ID；封存不改变条目状态。
  - [x] 将无关联旧 archive record 继续投影为稳定只读历史；正文始终从原档案读取。
  - [x] 覆盖未来时间点进入、建议地点、转场层级解耦、多对多关系、时钟结算、双页面竞争、失败不变、正文不复制和历史只读测试。

- [x] Task 6: UI
  - [x] 增加与线上风格一致的 Calendar 入口和左日历、右预览界面。
  - [x] 同一时刻显示全部条目并支持逐项预览；参与者与地点仅显示为安排上下文。
  - [x] 仅为合法的未来 planned 条目显示【进入场景】，并说明操作是进入开始时间点，不是排他选择。
  - [x] 禁止出现冲突二选一、预览一项后禁用其他项或自动取消/结算其他重叠条目的文案与交互。
  - [x] 过去 Scene、completed/cancelled 条目和派生历史只读；过去 Calendar 安排可列出并打开全部相关只读 Scene。
  - [x] 从 `sceneArchive` 加载历史正文，不写世界状态、不调用模型、不滚动主故事。
  - [x] 完成键盘操作、焦点恢复、ARIA、44px 目标、文字状态、reduced motion 和 390px 无溢出响应式。
  - [x] 覆盖 view-model、DOM、逐项预览、键盘、焦点、只读行为、相关 Scene 列表和响应式测试。

- [x] Task 7: 真实存档与全量验证
  - [x] 对真实 JSONL 存档执行 dry-run，验证 SHA、mtime、消息及现有领域不变，模型与网络调用为 0。
  - [x] 验证 legacy `agenda` 不迁移、不进入 prompt/UI，`sceneArchive` 正文不复制。
  - [x] 强制验收考试与约会同一时刻：从任一预览进入后 Scene 同时关联两项，两项一起 active、随后 completed、均不自动取消，且低档 prompt 同时收到两项。
  - [x] 浏览器验收桌面与窄屏 Calendar、同一时刻逐项预览、进入时间点、过去安排相关 Scene 和历史只读。
  - [x] 运行 Calendar 专项、现有 workflow/save/identity/social/item 回归及全量 Hogwarts Node 测试。
  - [x] 运行 ESLint、完整 `node --check`、`git diff --check`、模块体积和依赖边界门禁。
  - [x] 同步 runtime contracts、state fields、README 与 checklist，并清理临时验证文件。（均已完成；按本轮明确指令，`progress.md` 最终摘要交由后续独立代理，本轮不修改。）

- [x] Task 8: 修复 Calendar 浏览器验收缺陷。
  - [x] 恢复浏览器验收误推进的 Tina 存档到 revision 26、`1991-09-02 · 13:35`，核对验收前 SHA。
  - [x] 历史 Scene 预览渲染 archive timelineEntries，并移除所有重新翻译/模型操作。
  - [x] 保持日期/条目选择后的焦点，修复键盘导航与 Escape 关闭。
  - [x] 打开、选择和关闭 Calendar 不改变主故事与宿主 chat 的 scrollTop。
  - [x] Calendar 日期目标在紧凑布局下仍至少 44×44px。
  - [x] 使用隔离 fixture 完成桌面、820px、560px、390px 及未来时间点 Playwright 验收，不再次修改真实存档。
  - [x] 重跑浏览器、Calendar 专项、全量门禁并关闭剩余 checklist。

- [x] Task 9: 修复最终验收环境与存档基线漂移。
  - [x] 定位 Tina 主存档在恢复后从 baseline SHA `3d5eaf...eb1c1`、revision 26 再次变为 revision 27 的写入源，并在保留恢复前备份后重新恢复逐字节基线。
  - [x] 隔离或停止会自动保存当前 Tina 会话的运行态，证明完整验收前后主存档 SHA、mtime、revision、clock 和消息数均不变。
  - [x] 使用仓库本地 Playwright 1.56.1 和隔离 HOME/浏览器参数消除 Chrome Crashpad 退出权限错误，取得 `6/6` 且进程退出码为 0 的浏览器门禁结果。命令：`npm --prefix tests run test:e2e:calendar`。
  - [x] 重跑全量 Node、跨域回归、静态、模块边界和存档不变门禁，通过后关闭 Task 8、Task 9 与 checklist。

- [x] Task 10 (Ralph): 修正全量 Node 验收命令的 VM 模块参数。
  - [x] 记录未带 `--experimental-vm-modules` 的探测结果：`419/422`，3 项因 `vm.SourceTextModule` 未装载而失败，exit 1。
  - [x] 使用项目既有的 `--experimental-vm-modules` 口径重跑全部 `tests/hogwarts-mud*.test.mjs`，取得 `422/422`、exit 0；无业务断言失败。

- [x] Task 11: 补齐普通时钟结算: 普通回合和普通 Scene Transition 推进世界时钟后必须调用统一 Calendar 四态结算，并覆盖跨越完整事件区间的回归测试。
- [x] Task 12: 禁止 High 失败后的 Medium 代写: Foundation 或 high-tier 刷新返回 failed 时不得因 horizon 不足继续触发 Medium Calendar Director。
- [x] Task 13: 收紧 Medium 人物准入: Medium prompt projection 与 proposal 校验必须排除 temporary、provisional 或缺少合法 Identity 的人物。
- [x] Task 14: 修正 Calendar Moment 后置失败语义: Calendar Moment 原子提交成功后，Daily Director 等后置模型失败不得把已提交操作报告为整体失败或留下误导性部分失败状态。
- [x] Task 15: 修复无 Web Locks 的双页面竞争: fallback revision claim 必须保证并发页面至多一个执行保存回调，并增加真实双 guard 交错测试。
- [x] Task 16: 保证同 revision proposal 幂等: 空 proposal 或无变化 proposal 在同一 revision 重复应用时只能首次成功，后续必须拒绝且不得再次保存。
- [x] Task 17: 补齐历史预览可访问性验收: Calendar 历史正文中的语言切换和加载控件必须至少 44×44px，并在 390px 浏览器用例中覆盖历史正文只读与无模型行为。

- [x] Task 18: 修复无 Web Locks 的真实跨页面保存互斥。
  - [x] 两个同源 Chromium 页面共享 Storage、基于同一 revision 并发时，至多一个页面进入保存回调并返回成功。
  - [x] fallback claim 最终确认失败时不得报告成功；遗留、半写入或页面崩溃留下的 ticket 必须可过期恢复。
  - [x] 缺少互斥所需能力的 Storage adapter 必须明确拒绝，不能静默并发执行。
  - [x] 增加真实双页面交错与压力回归，覆盖 ticket 清理、异常恢复和至少 100 轮零双保存。

- [x] Task 19: 修复 High `high_transition` 空 proposal 的一次性 revision 消费。
  - [x] `entries: []` 的 `high_transition` proposal 首次通过统一 validation 与真实 guarded save，消费一次 revision。
  - [x] 同一 epoch+revision 第二次拒绝且 host save 不再执行。
  - [x] 保持 Foundation 首批规划要求和普通非空 High proposal 行为不回归。
  - [x] 增加 High workflow + 真实 save guard 对抗测试。

- [x] Task 20: 修复真实保存端口无法恢复崩溃遗留的过期 fallback ticket。
  - [x] `registerSaveRevisionHead`/`observeContext` 遇到带 `claimId` 的 storage head 时，先执行受控的过期 ticket、半写 ticket 与 owner 清理；只有仍在有效租约内的 claim 才进入 `save_in_progress` 阻塞。
  - [x] 恢复时根据宿主已加载的 `stateRevision` 对齐 storage head，覆盖崩溃发生在 host save 前和 host save 后两种情况，不得回退或覆盖已持久化的新 revision。
  - [x] 活跃 claim 仍保持互斥，恢复路径不得让第二个页面进入保存回调或静默绕过冲突。
  - [x] 增加真实 `createGuardedSavePorts` 重载集成测试与同源 Chromium 双页恢复测试，证明过期/半写 ticket 可恢复、有效 ticket 仍拒绝且清理后无 mutex 残留。

- [x] Task 21: 修复 `observeContext` 首次观察崩溃 claim 时在恢复前误报 `save_in_progress`。
  - [x] 让 `getContext()` 触发的首次 `observeContext` 在设置 conflict 或调用 `onConflict` 前完成 fallback head 恢复；expired、half-written、no-record claim 恢复前后 `onConflict` 均为 0。
  - [x] 保持 active ticket + matching owner 的 `onConflict=1`、host save callback=0，并保持 pre-host、post-host 与 host revision 低于 claim base 时的单调对齐。
  - [x] 增加真实 ports 回归：先调用 `getContext()`、后调用 `registerSaveRevisionHead()`，逐项断言 blocked/conflict/onConflict、host callback 和最终 mutex keys。
  - [x] 重跑 Task20 Node、Chromium 100 轮、ESLint、`node --check` 与 `git diff --check` 门禁。

- [x] Task 22: 修复原生 Web Locks 首屏误报: 使用 `navigator.locks` 时也必须在首次 `getContext()`/`observeContext` 设置冲突前恢复崩溃遗留 claim，并以真实 Chrome 回归证明页面不会一进入就显示“时间线已在其他页面更新”。
- [x] Task 23: 修复 fallback lease 过期后的重复保存: 后台页 heartbeat 停摆及 host save 后 finalize 前崩溃时，必须使用可持久化 fencing/CAS 保证至多一个页面进入宿主保存回调，且不得把已持久化 revision 回退到 `claimBaseRevision`。
- [x] Task 24: 保持 active 条目时间状态一致: 导演不得把 `active` 条目改期到不覆盖当前世界时钟的未来区间并继续保留 `active`，需增加 proposal 与时钟结算对抗测试。
- [x] Task 25: 隔离不同时间线的 Calendar 选择状态: `CHAT_CHANGED` 或 timeline epoch 变化时清理日期、月份、条目和 Scene 选择，使普通打开默认展示新存档当前日期及其可进入安排。
- [x] Task 26: 修正 Calendar listbox Tab 顺序: 条目列表采用 roving tabindex，仅当前 option 进入 Tab 顺序，同时保持方向键、Enter、选择 ARIA 与焦点恢复行为。
- [x] Task 27: 恢复并锁定 Tina 验收基线: 当前真实 JSONL 已再次漂移到 revision 27、SHA `36d55e...39a89`；定位本次被动 metadata 写入来源，保留备份后恢复 revision 26 基线，并证明完整复验前后 SHA、mtime、revision、clock 与消息数不变。

- [x] Task 28: 建立真实宿主持久化确认契约。
  - [x] `saveMetadata()` 吞掉写入错误时，guard 不得仅凭 Promise resolve 把 revision 标记为 durable。
  - [x] 宿主已经持久化但随后抛错时，`host_save_started` 不得回退到 `claimBaseRevision` 或允许第二页重复进入宿主保存回调。
  - [x] 增加“失败但 resolve”“持久化后抛错”的真实 ports、双页交错和 revision 单调回归。

- [x] Task 29: 固化沙箱兼容的 Calendar 浏览器门禁。
  - [x] `npm --prefix tests run test:e2e:calendar` 使用仓库固定且不访问 macOS Quarantine journal 的浏览器执行路径。
  - [x] 保留现有桌面、390px、跨时间线、roving tabindex、Web Locks 与 fallback 双页压力共 11 项断言。
  - [x] 标准命令自身退出码为 0，而不是仅内部断言通过。

- [x] Task 30: 修复 Calendar Moment 测试的 durable acknowledgement 契约。
  - [x] 成功保存夹具显式返回 `{ durable: true }`，与真实宿主持久化确认契约一致。
  - [x] 普通 host throw 未明确 `confirmedFailure` 时保留 fence，不再断言 revision 或 fence 回滚。
  - [x] 重跑 Calendar 专项与带 `--experimental-vm-modules` 的全量 Hogwarts Node 测试并取得 exit 0。

- [x] Task 31: 固化标准 Calendar E2E 为精确 11 个测试结果。
  - [x] 标准 `npm --prefix tests run test:e2e:calendar` 命令精确收集并报告 11 个测试结果。
  - [x] 保留全部桌面、响应式、跨时间线、roving tabindex、Web Locks 与 fallback 双页压力覆盖。
  - [x] 11 个测试结果全部通过，且标准命令自身退出码为 0。

- [x] Task 32: 真实服务首屏冲突现场调试与修复。
  - [x] 不清理 `localStorage`、不修改存档，先在真实 `http://127.0.0.1:8000/` 原 origin/profile 采集宿主 `stateRevision`、`timelineEpoch`，`localStorage` 的 head、ticket、owner、fence，以及页面实际加载的模块版本。
  - [x] 按 `timeline-startup-conflict` 会话通过 Debug Server 插桩复现并采集运行时证据，区分旧模块缓存、stale stable head、有效或遗留 claim、Knowledge Base 自动保存、宿主持久化入口。
  - [x] 基于现场证据实施最小修复，只处理已确认的首屏冲突误报根因。
  - [x] 重启真实服务，在原 origin/profile 验证首屏不再误报“时间线已经在其他页面更新”，同时真实并发保存仍被正确阻断。
  - [x] 用户确认修复结果后，清理 Debug Server 调试插桩与调试文件。

- [x] Task 33: 升级 Calendar V2 Schema 与迁移。
  - [x] 将 Calendar 根升级为 `version=2 + storylines[] + storyBeats[] + entries[] + horizon`，为三类集合定义独立严格 Schema。
  - [x] 为 schedule 增加 `sourceBeatId`、`beatSlot` 与 `scheduleKind`，校验 beat 引用、1–4 槽位唯一性及权威 Actor/地点引用。
  - [x] 实现 V1→V2 零模型、幂等迁移：storyline 移入独立集合，event 保留为稳定 schedule，不伪造 beat。
  - [x] 保留 V1 High event、`calendarEntryIds[]`、Scene 关系与终态只读兼容。
  - [x] 覆盖 unknown field、非法引用、重复槽位、真实旧档不变和非 Calendar 领域 byte-stable 测试。

- [x] Task 34: 实现 V2 Reducer、Projection 与 Beat 生命周期。
  - [x] 实现 High storyline/storyBeat typed proposal 与 Medium schedule typed proposal，继续使用 epoch/revision guard 和 durable save。
  - [x] 日期、当日、近期、当前时刻 projection 只返回 schedule；剧情线 projection 独立返回 storyline、beat 与四场景进度。
  - [x] 世界时钟只结算 schedule；storyBeat 不因时间流逝或文本声明自动 realized。
  - [x] Scene 封存按 schedule `sourceBeatId` 为 beat 追加去重 Scene ID；四个不同 Scene 后本地标记 realized，窗口不足四个则保留 deferred 残留。
  - [x] 覆盖 storyline 不污染日期/Prompt、四槽位、三场景不完成、四场景完成和跨领域不写入测试。

- [x] Task 35: 重构 High Calendar Director。
  - [x] High 只创建或维护 storyline 与 storyBeat，不再提交 schedule、地点或 Scene。
  - [x] Foundation 为长期 storyline 建立按 `termKey` 唯一、`sequence` 递增且 `sceneTarget=4` 的学期节奏。
  - [x] high-tier 重大转折只刷新当前及未来 beat，保持已实现 beat、过去日程与 Scene 不变。
  - [x] 将长期 `storyBeat` 与单回合 `pacingDirector.pendingBeat` 隔离，禁止互相消费或迁移。
  - [x] 覆盖四年八学期示例、High 越权 schedule 拒绝、隐藏信息过滤、失败不触发 Medium 代写。

- [x] Task 36: 重构 Medium Calendar Director 与每日行程。
  - [x] Medium 读取可调度 storyBeat，并为进入未来 7–14 天窗口的 beat 创建缺失的四个稳定 schedule 槽位。
  - [x] 同一 `sourceBeatId + beatSlot` 重复规划必须 upsert，不得产生重复日程。
  - [x] Medium 维护适用的早餐、课程、午餐、晚餐、训练、约会、会议等日常 schedule，让规划窗口内日期形成可读日程。
  - [x] Medium 只写 schedule 与成功后的 horizon，不得改写 storyline/storyBeat/Scene。
  - [x] 覆盖 beat→四日程、日常时间顺序、未来改期、过去只读、失败不推进 horizon 和未准入人物拒绝。

- [x] Task 37: 收紧 Schedule Scene 语义并增加自由开场。
  - [x] `runCalendarMoment(entryId)` 只认领玩家选择的 schedule，不再把同刻全部安排写入新 Scene。
  - [x] Daily Director 可读取世界并发 schedule；Performer 与 Scene Transition 只读取当前 Scene 认领的 schedule 及公开剧情来源。
  - [x] 新增 `runTimelineMoment({ startClock, mapId, roomId })`，允许未来时间与任意合法地点创建不认领 schedule 的自由 Scene。
  - [x] 两种入口复用同一 guarded transaction，原子封存、推进时钟、结算 schedule、创建 Scene；失败全部不变。
  - [x] 覆盖考试/约会同刻不同地点、自由开场、非法过去时间/地点、stale revision、双页面竞争和 Scene/beat 关联。

- [x] Task 38: 迭代会议式 Calendar UI。
  - [x] 默认视图改为按时间排序的纵向日程，不再自动预览第一条 storyline。
  - [x] 日程行显示时间、时长、类型、地点、人物、状态、重叠提示和剧情节奏来源，并支持选择后进入 Scene。
  - [x] 增加【今日日程 / 剧情线】视图切换；剧情线视图展示长期线路、学期 beat 和 `0..4` 场景进度。
  - [x] 增加自由开场表单：所选日期、开始时间、权威地图/房间选择、校验与 busy/error 状态。
  - [x] 延续暗色学院档案与铜金时间轴；桌面形成月历/日程/详情层级，820/560/390px 无溢出。
  - [x] 完成键盘、roving tabindex、ARIA、44px、焦点恢复、Escape、reduced motion 和纯预览不写状态测试。

- [x] Task 39: 更新 PRD 配套文档与回归测试。
  - [x] 更新 README Calendar 章节为 V2 四层模型、High/Medium 边界、自由开场和迁移说明。
  - [x] 更新 runtime contracts/state fields 中 Calendar 权威、Prompt 投影和 Scene 关系。
  - [x] 更新 dry-run 与 fixture，覆盖真实 V1 存档迁移、稳定 ID、模型/网络 0、SHA/mtime/消息不变。
  - [x] 删除 V1“所有重叠条目强制进入同一 Scene”的过时测试，替换为世界并发与玩家出席分离测试。

- [x] Task 40: Calendar V2 全量验证。
  - [x] 运行 V2 Schema、migration、Reducer、Projection、High、Medium、Moment、UI 专项测试。
  - [x] 运行 workflow/save/identity/social/item 回归及带 `--experimental-vm-modules` 的全量 Hogwarts Node 测试。
  - [x] 运行 Calendar 标准 E2E，覆盖桌面、390px、会议式日程、剧情线、日程进入、自由开场、历史只读和跨页面竞争。
  - [x] 运行 ESLint、完整 `node --check`、`git diff --check`、模块体积与依赖边界门禁。
  - [x] 复核真实存档前后 SHA、mtime、revision、clock 与消息数不变，并关闭 V2 checklist。

- [x] Task 41 (Ralph): 修复全量回归中的 V1 fixture/运行入口迁移兼容。
  - [x] 修复 `tests/hogwarts-mud.test.mjs` 的 Scene Transition 与普通回合时钟结算 fixture，不再把 Calendar V1 直接注入严格 V2 领域结算入口。
  - [x] 复核真实生产运行入口在领域结算前执行 `migrateCalendarState()`；仅在真实入口可能收到 V1 时增加最小兼容迁移。
  - [x] 运行两项定向测试、Calendar 专项、workflow/save/identity/social/item 跨域回归及带 VM modules 的全量 Hogwarts Node 测试。
  - [x] 保留 guarded-save-ports Debug Server 插桩和顶层副作用测试，不以清理插桩或放宽断言掩盖剩余失败。

- [x] Task 42: 修复 Task 40 静态审计发现的 Calendar beat 过窗结算与文档契约缺口。
  - [x] `settleCalendarAtClock` 在世界时钟越过 `storyBeat.windowEndClock` 且实际关联 Scene 少于 `sceneTarget` 时，将 `planned/active` beat 本地结算为 `deferred`；`realized/cancelled` 保持不变，禁止按文本自动完成。
  - [x] 补充对抗测试，并验证普通回合、Scene Transition 与 Calendar Moment 复用统一结算语义。
  - [x] 在 runtime state fields 登记 `session.calendarTimelineEpoch`，并修正 README 的 `sceneArchive` 消息正文读取契约。
  - [x] 运行相关 Reducer/Projection/Moment/主回合测试、Calendar 专项、ESLint、完整 `node --check` 与 `git diff --check`；全量只允许保留 Task32 Debug 插桩顶层副作用一项。
  - [x] 保留 Task32 Debug Server 插桩及其失败证据，不修改 `progress.md`。

- [x] Task 43: 隔离真实存档写入源并恢复严格 mtime 基线。
  - [x] 确认 PID 90678、端口 8000、启动命令、工作目录和必要子进程均属于本轮 SillyTavern 验收服务，仅优雅停止该写入源。
  - [x] 恢复前严格核对真实 V2 JSONL 的 SHA-256、stateRevision、clock、消息数与既定内容基线一致；内容不同时停止，不执行回滚。
  - [x] 内容一致时仅以支持纳秒的 metadata 操作恢复 `mtimeNs=1786360173518604107`，不重写文件，并保持 size 与 SHA-256 不变。
  - [x] 停服后观察至少 30 秒，运行 V2 dry-run，再次严格比较 V2 的 SHA-256、mtimeNs、size、stateRevision、clock 与消息数，并确认 V1 基线存档未变化。
  - [x] 确认端口 8000 与真实存档写入源已停止，dry-run 模型/网络调用均为 0；不修改 `progress.md`，不关闭 Task 40。

- [x] Task 44: 补齐 1991-09-06 会议式日程与会议进入的标准浏览器证据。
  - [x] 扩展隔离 V2 fixture，使 1991-09-06 包含早餐、魔药课、午餐、另一课程及麦格与斯内普讨论 Tina 背景会议五项合法 schedule；会议建议地点为 `mcgonagall_office`。
  - [x] 新增一项标准 E2E，断言选择 9 月 6 日后五项 schedule 严格按 `startClock` 排序，日程数为 5，storyline/storyBeat 不进入列表或占据首项。
  - [x] 同一 E2E 从会议进入后只认领会议 schedule，以麦格办公室创建 Scene；同刻仍在进行的另一课程不被认领或取消。
  - [x] 保留既有 9 月 2 日、自由开场、历史、390px 与跨页面竞争用例；标准 `npm --prefix tests run test:e2e:calendar` 精确 `13/13`、exit 0。

- [x] Task 45: 实现 Calendar V2.1 UI 布局与中文语义。
  - [x] 将桌面日期视图重构为左日历、中栏【计划】时间网格与【场景】折叠区、右栏精简详情；日期切换同时刷新计划和场景，且不自动选择第一项。
  - [x] 【计划】使用纵向时间刻度，按 `startClock` 定位、按时长设置卡片高度；重叠计划分列或受控错位，保持每项独立可见、可选和可进入。
  - [x] 计划卡与详情只显示计划自身四态：【计划中】、【进行中】、【已完成时间段】、【已取消】，不增加出席状态。
  - [x] 场景卡默认折叠；展开后只列 `sceneArchive.calendarEntryIds[]` 明确认领的计划，缺失或空字段显示【未关联计划】，不得按时间、地点、人物或重叠推断。
  - [x] 删除 attendance、“去了/没去”及同义出席语义；所有面向玩家的场景相关中文统一使用“场景”，不显示英文标签 `Scene`。
  - [x] 将自由开场入口及表单/面板移入【场景】区，保留既有合法时间地点校验、busy/error、原子提交与焦点恢复，右栏不再渲染。
  - [x] 右栏计划详情只保留标题、摘要、时间、地点、人物、状态、来源与进入操作；场景详情只保留只读正文与关键元数据，并移除“开始时刻的全部安排”、重复关系与重复说明。
  - [x] 完成桌面三栏及 820/560/390px 降级布局、无横向溢出、键盘顺序、折叠 ARIA、44px、Escape、`:focus-visible`、焦点恢复与 reduced motion。

- [x] Task 46: 补齐 Calendar V2.1 测试与文档。
  - [x] 增加 view-model、DOM 与样式测试，验证三栏结构、时间刻度、计划位置/时长、重叠分列或错位及独立操作。
  - [x] 增加场景折叠与旧档测试，验证只读取明确 `calendarEntryIds[]`、四态原样显示、缺失字段显示【未关联计划】且不按重叠推断。
  - [x] 增加文案与字段白名单测试，证明可见场景中文不出现英文标签 `Scene`，不存在 attendance/“去了/没去”，右栏不渲染已删除模块。
  - [x] 增加自由开场位置与行为测试，证明入口和表单位于场景区、右栏不承载表单，提交仍复用既有 `runTimelineMoment` 原子语义。
  - [x] 增加桌面、820px、560px、390px 的响应式与无障碍测试，覆盖阅读顺序、键盘、ARIA、44px、焦点、Escape、reduced motion 和无横向溢出。
  - [x] 同步 Calendar UI 的 README、runtime contracts、state fields、测试 fixture 与验收说明；明确 V2.1 不新增持久化 attendance，也不改变 V2 四态和认领权威。

- [x] Task 47: Calendar V2.1 全量验证。
  - [x] 运行 V2.1 view-model、DOM、样式、场景折叠、自由开场、响应式与无障碍专项测试，并保存精确用例数和退出码。
  - [x] 运行标准 Calendar E2E，浏览器验收桌面三栏、重叠计划、场景折叠、旧档【未关联计划】、右栏精简、场景区自由开场及 390px 降级布局。
  - [x] 回归日程进入只认领所选计划、Daily 世界并发、Performer 当前场景认领、Scene Archive 正文只读及自由场景 `calendarEntryIds=[]`。
  - [x] 运行 workflow/save/identity/social/item 回归和带 `--experimental-vm-modules` 的全量 Hogwarts Node 测试。
  - [x] 运行生产与测试 ESLint、完整 `node --check`、`git diff --check`、模块体积与依赖边界门禁。
  - [x] 复核真实存档 dry-run 与非 Calendar 领域不变，确认模型/网络调用为 0，并按验证证据关闭 V2.1 checklist。

- [x] Task 48: 修复已删除 `momentEntries` 的旧测试契约。
  - [x] 删除 Calendar Moment 旧用例对 `preview.momentEntries` 的断言，改用日期计划投影确认两项重叠计划保持独立。
  - [x] 保留领域断言：共享时钟结算全部重叠计划，`runCalendarMoment` 只把明确选择项写入新 Scene 与低档 Performer 上下文。
  - [x] 运行 calendar-moment 单测、Calendar 六专项及带 `--experimental-vm-modules` 的全量 Hogwarts Node 测试，记录精确通过数、总数与退出码。

# Task Dependencies

- Task 2 depends on Task 1。
- Task 3 depends on Task 1–2。
- Task 4 depends on Task 1–3。
- Task 5 depends on Task 1–2，可与 Task 3–4 的导演接入并行。
- Task 6 depends on Task 2、Task 5。
- Task 7 depends on Task 1–6。
- Task 8 depends on Task 7 的浏览器失败证据。
- Task 9 depends on Task 8 的最终验收失败证据。
- Task 18 depends on Task 15 的真实双页面失败证据。
- Task 30 depends on Task 28 的 durable acknowledgement 契约与独立 Calendar Moment 验证失败证据。
- Task 31 depends on Task 29 的沙箱兼容门禁与独立标准 E2E 结果计数失败证据。
- Task 32 depends on Task 31。
- Task 33 与 Task 32 无依赖，可并行。
- Task 34 depends on Task 33。
- Task 35 depends on Task 33–34。
- Task 36 depends on Task 33–35。
- Task 37 depends on Task 33–34，可与 Task 35–36 的 Director 接入并行。
- Task 38 depends on Task 33–34、Task 37。
- Task 39 depends on Task 33–38。
- Task 40 depends on Task 33–39。
- Task 41 depends on Task 40 的两项 V1 fixture 领域验证失败证据与 Task 33 的 V1→V2 migration 契约。
- Task 42 depends on Task 41 与 Task 40 静态审计失败证据。
- Task 43 depends on Task 40 最终验收的严格 mtime 唯一失败证据与 Task 42。
- Task 44 depends on Task 38 的会议式 UI、Task 37 的单项 schedule 认领语义与 Task 40 的最终浏览器证据缺口。
- Task 45 depends on Task 38 的现有 Calendar UI、Task 37 的单项 schedule 认领与自由开场语义、Task 44 的标准日期 fixture。
- Task 46 depends on Task 45，并复用 Task 40/44 的专项与标准 E2E 基线。
- Task 47 depends on Task 45–46。
- Task 48 depends on Task 47 的领域验证失败证据。
