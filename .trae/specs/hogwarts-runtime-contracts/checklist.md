# Runtime Contract 维护清单

## 新字段

- [ ] 已登记完整字段路径和持久化位置。
- [ ] 已指定唯一写入者。
- [ ] 已列出生产读取者。
- [ ] 已声明模型权限。
- [ ] 已声明兼容字段及废弃边界。
- [ ] 已提供 normalize/validate/reducer。
- [ ] 已提供确定性旧档迁移或版本门槛。
- [ ] 已提供消息或状态 diagnostics。
- [ ] 已覆盖正常路径、失败路径与幂等重试。

## 新事务

- [ ] Workflow 只编排，不复制 domain 规则。
- [ ] 状态提交与消息提交顺序明确。
- [ ] 中途失败可恢复，不重复创建事实。
- [ ] 付费模型调用数量有明确上限。
- [ ] 离线迁移和只读加载不调用用户模型。
- [ ] UI 只读取 projection，不反写世界事实。

## 人物字段

- [ ] 明确名单属于 active、local、participant 或 witness。
- [ ] `actor.present` 只作 active compatibility。
- [ ] `present=false` 未被解释为离开房间。
- [ ] actorLibrary membership 未被解释为物理在场。
- [ ] local roster 合并 movement、position、scene roster 与 cohort。
- [ ] cohort witness 未自动创建关系边。
- [ ] Cast 来源与首次认识只有 `ActorCore.cast` 一个权威。
- [ ] 临时身份只有 Runtime `temporary` 一个状态权威，揭晓证据只保存 source ref。
- [ ] 生命状态四字段只存在于 Actor Runtime，并由一个 reducer 原子更新。
- [ ] Story Cast、People、Appearance、Calendar 不再读取旧 Actor lifecycle 字段。
- [ ] Dossier 保持 8 个业务顶层字段，LowTier 保持 6 个顶层字段。

## 提交门禁

- [ ] 对应 runtime PRD 已更新。
- [ ] 目标测试通过。
- [ ] 全量 Hogwarts Node 测试通过。
- [ ] ESLint、`node --check`、`git diff --check` 通过。
- [ ] 如有真实运行验证，`progress.md` 已记录输入、输出和调用预算。

## Item V2 2026-08-09 闭环

- [x] 新字段已登记写入者、读取者、模型权限和兼容边界。
- [x] proposal、玩家决策、Reducer 和持久化顺序已记录。
- [x] 十二操作、owner/holder、终态与 presentation 同步有自动化测试。
- [x] V1 Item、legacy presentation 和 Canon seed 迁移确定且幂等。
- [x] movement/transition 按 holder 位置投影，不按 owner 猜测。
- [x] hidden Item 在 ledger、人物卡和 presentation projection 均被过滤。
- [x] 真实 Tina 存档只读加载，无低/中/高档模型生成请求。
- [x] 物品库与 NPC 卡完成窄屏浏览器验收，420px CSS 契约与 reduced-motion 有测试。
- [x] Composer 十二操作与 Item 卡 stable-ID 引用使用双段 directive，非法引用只写 diagnostics。
- [x] Item directive 只表达意图，未绕过英文 outcome evidence、proposal validation 或 Reducer。
- [x] 目标测试、全量测试、ESLint、语法和 diff 检查通过。
- [x] `item-lifecycle.md`、字段表、专题 progress 和项目记忆已同步。

## Save Revision / NPC Identity V1 闭环

- [x] `timelineEpoch/stateRevision/revisionHistory` 已登记写入者、读取者、上限和敏感信息边界。
- [x] 所有 Hogwarts metadata/chat/translation/settings 保存经过统一 guard；stale 页面不触达宿主保存或模型。
- [x] Web Locks、storage fallback、rollback、chat-only、持久化失败恢复和双页面竞争有自动化测试。
- [x] legacy revision migration 在先 observe 后 register 时仍会持久化，新时间线使用独立 epoch。
- [x] Identity V1 已登记 gender、birth、education、lineage、body、provenance 及 clock 派生边界。
- [x] Identity migration 已接入 initial world、opening/foundation、resident/pacing actor、lifecycle 与 load。
- [x] 身体状态属于 `identity.body`；presentation 只保留衣服、帽子、首饰、穿戴 Item 与手持 Item。
- [x] 家庭属于 Social Graph；self/other claims 不覆盖 authority；未知人物不创建 actor；不存在只用 `nonexistent`。
- [x] Ordinary Turn、Scene Transition、Daily/Pacing Director 只读取 observer/clock projection。
- [x] Inspector dossier 只读，unknown、键盘焦点、390px 和 reduced-motion 有自动化测试。
- [x] Tina 真实 JSONL 只读 dry-run 保持 10 个 Item、34 条关系既有字段、记忆、位置和 206 条消息不变。
- [x] Tina dry-run 只新增 120 个 revision/identity/social schema 字段，21/21 profile 与 23/23 runtime actor 获得 Identity V1，重复运行 byte-stable，网络调用为 0。
- [x] 全量 Hogwarts Node `370/370`、ESLint、完整语法、diff、模块尺寸和依赖边界通过。
- [x] 浏览器 Identity dossier、字段级来源标签、390px 布局与 stale conflict 提示已验收。

## Turn 93 False Departure 闭环

- [x] 已用 pre-turn backup、turn transaction、turn diagnostics 和最终世界状态定位写入阶段。
- [x] 已证明麦格 impression/memory 正确写入，缺陷位于 observer presence merge。
- [x] `presence=absent` 需要明确离场 evidence。
- [x] actor room 变化需要目标房间名称或 ID evidence。
- [x] 形态变化、后退和坐下不会再删除 active/local。
- [x] 当前 turn 93 JSONL 已备份并修复为 active 4 / local 8。
- [x] 误判与真实离场均有回归测试，全量 `286/286` 通过。

## Closed Scene Memory Filler 闭环

- [x] 已定位当前存档中的 8 条模板 memory 及其 actor/scene/turn/source。
- [x] 已证明 transition Prompt Schema 漏掉 `relationshipUpdates`。
- [x] 已用真实 closure summary 重放 18 词截断与多人复制。
- [x] closure summary 不再生成 actor memory；缺失时保持空数组。
- [x] transition memory 需要完整、唯一、非模板化的 8–32 词人物视角文本。
- [x] archive 不再复制相同 summary 到 lasting impact。
- [x] 旧 filler 可幂等清理，当前存档 dry-run `8 -> 0 -> no-op`。
- [x] Prompt Schema、normalizer、validator、archive 与 migration 均有回归测试。
- [x] 全量 `289/289` 通过，用户刷新后确认 UI 正确。

## Item Loan / Evidence / Candidate UI 闭环

- [x] 完成的 gift/loan/return/theft 可让普通隐含物品进入候选。
- [x] 高风险状态操作需要 source + Item + operation 三层 grounding。
- [x] turn 93 错误 parchment loss 已删除，正式 Item 已恢复。
- [x] turn 94 quill loan 已补为候选并由玩家收录。
- [x] accept/ignore 不调用或等待 knowledge/model。
- [x] UI 投影包含 pending proposal 与 decision；幂等重试会重绘。
- [x] 成功后卡片即时更新、显示 toast，accepted 只保留详情。
- [x] 关闭 details 菜单不形成幽灵点击区域。
- [x] 真实浏览器验证 accepted 状态和八个 More 菜单按钮命中。
- [x] 全量 `293/293`、ESLint、语法与 diff 检查通过。

## Spell Observation 闭环

- [x] 主动观测可从当前 scene intent 解析稳定 spell ID。
- [x] 可解析 spell observation 覆盖错误 semantic no-check，并只投一次感知 D20。
- [x] failure 不泄露 spell identity、不写 spellbook。
- [x] success-with-cost 及以上通过主动观测学习。
- [x] NPC 明确念出、写出、解释或示范可在玩家失败后教学。
- [x] AI 正文稳定 spell marker 可学习，但不增加 cast attempt。
- [x] 所有可操作 catalog spell 都有非空 incantation。
- [x] 火柴变针 technique 使用游戏补全 `Acufors`，不伪称 Canon 咒文。
- [x] 当前 turn 94 JSONL 有独立备份、D20 卡与幂等 repair 验证。
- [x] 真实浏览器验证 failure 卡和未新增 spellbook。
- [x] 全量 `296/296`、ESLint、语法与 diff 检查通过，用户确认最终语义。

## Authoritative / Custom Spell Lifecycle 闭环

- [x] scene intent 可解析的 Catalog spell 每回合进入 `authoritativeSceneSpells`。
- [x] 权威 spell 的教学、示范和施放强制使用完全一致的 incantation。
- [x] 单一权威场景中的替代咒文在提交前确定性对齐，不进入 custom 候选。
- [x] 明确未知教学生成 `pendingSpellProposals`；权威场景中独立新咒语与权威纠错可同时结算。
- [x] 玩家明确写出的自由咒语标记进入同一候选链，不直接写 spellbook。
- [x] 自定义咒语由玩家收录/忽略，模型不能直接写 spellbook。
- [x] accepted custom definition 可在快捷栏、人物检查器、施法解析和 D20 中使用。
- [x] 候选 accept/ignore 只保存 metadata、刷新 prompt 和重绘，不等待模型/知识库。
- [x] message 200 的 `Acus/阿库斯` 已备份后全部修为 `Acufors`，并补入 spellbook。
- [x] 权威冲突、自定义候选、收录、快捷施法和 UI 接线有回归测试。
- [x] 全量 Hogwarts Node `310/310`、项目级 Hogwarts ESLint、语法、diff 和模块尺寸门禁通过。
- [x] 浏览器验证 message 200、三项已学咒语，以及真实 `Nebula Verto` 待选卡的详情/收录/忽略。
- [x] 用户确认后已清理 debug server、instrumentation 和会话文件。

## Ordinary Turn Player-Speech Replay 闭环

- [x] 已从持久化 diagnostics 还原 initial、repair、validation 与 commit 时序。
- [x] 已确认 UI 的“已落笔 N 段”是流式预览，不代表请求完成或事务提交。
- [x] 根因是首次输出把玩家 direct speech 复制为 `actorId=player`，触发 validator 与第二次模型请求。
- [x] 首次 Performer Prompt 明确禁止复制、改写、翻译或重演玩家输入。
- [x] 输出 dialogue 只允许 present NPC 的精确 actor ID，且必须是新的 NPC 台词。
- [x] 未增加自动 resubmit、reload retry、无限 repair 或当前回合补写。
- [x] 当前原请求自然完成；调试过程没有调用模型、retry 或 submit。
- [x] targeted test、ESLint 与语法检查通过。
- [x] 全量 Hogwarts Node `297/297`、ESLint、语法与 diff 检查通过。
- [x] 用户确认后已清理 debug server、instrumentation 和会话文件。

## Live Reply Atomic Display 闭环

- [x] pre-fix detached DOM 证明 draft segments 被渲染为 streaming turn。
- [x] pre-fix scroll 证明 `turnActive` 会覆盖阅读位置并强制滚到底部。
- [x] 生成期间只显示阶段 loading card，不显示 segment 数量、partial draft 或 check card。
- [x] 新 assistant message 首次提交后定位到该消息顶部并保留 16px 阅读留白。
- [x] 同一消息后续重绘不重复定位；首次加载历史存档不误判为新回复。
- [x] `latestStoryMessageId` 已登记为非持久化 UI session 字段。
- [x] post-fix detached DOM 证明 2 个内部 draft segments 对应 0 个正文块。
- [x] 浏览器只读加载 message 200 的 11 个正式 segments，streaming turn 为 0。
- [x] targeted UI/模块测试 `18/18`、ESLint、语法与 diff 检查通过。
- [x] 全量 Hogwarts Node `299/299` 测试通过。
- [x] 用户确认后已清理 UI instrumentation 和剩余调试文件。

## Relationship Filter Context Edges 闭环

- [x] 已证明 Lavender→Player 权威关系仍存在，未发生数据丢失。
- [x] 当前可见边、计数、详情和文本回退继续严格服从筛选条件。
- [x] 端点仍可见的筛选外 player-known 边进入独立 `contextEdgeIds`。
- [x] 背景边固定为 5% 不透明度，且不可点击。
- [x] 隐私投影未授权边和端点已被人物筛选移除的边不会淡显。
- [x] Tina 档案在负面筛选下验证 6 条命中边、27 条背景边。
- [x] 目标关系图测试、ESLint、语法和 diff 检查通过。
- [x] 全量 Hogwarts Node `300/300` 测试通过，浏览器无 Cytoscape 样式警告。

## Classroom Item / Scroll / Witness Memory 闭环

- [x] 已从 message 202 diagnostics 证明模型提交了 quill destroy proposal。
- [x] Narrative Item state proposal 只折叠一次，并规范为 `operation + action`。
- [x] `ruin/remains/wreck ... vanished` 可支持 destroy；普通 vanished 仍只支持 lose。
- [x] 当前羽毛笔已修复为 `destroyed + holderId=player`，Item 卡显示“已销毁 / 持有人 Tina / 随 Tina”。
- [x] 首次 scene load 固定 `retain`，空 story 不参与 near-bottom 判断。
- [x] 浏览器 reload 后 1 秒与 3 秒 `scrollTop=0`，无首次 bottom 跳转。
- [x] generation 不再覆盖离开底部的阅读位置；Item/Spell 候选卡不再通过 timer 强制进入视窗。
- [x] 成功公开示范、教授表扬和学院加分按 room-wide 处理。
- [x] 合法 observer 输出不能缩窄确定性 room-wide notable/major perception。
- [x] room-wide notable/major eventKnowledge 按稳定 event ID 幂等写给每名 witness。
- [x] Hermione 获表扬和 quill 爆炸两件事均写入课堂 8 名 witness 的中性记忆。
- [x] Item、scroll、perception、observer override、event witness memory 目标测试通过。
- [x] 全量 Hogwarts Node `308/308`、项目级 ESLint、完整扩展语法、diff 和模块尺寸门禁通过。
- [x] 用户确认后已清理本次 instrumentation、debug server 和会话文件。

## McGonagall Form Authority 闭环

- [x] 已由 request diagnostics 排除 Prompt 上限与上下文裁剪。
- [x] 已证明没有独立猫 actor 或当前 material entity。
- [x] 已定位冲突为开场 `scene.summaryEn` 与当前人形 actor 同时注入。
- [x] timeline 推进后 Performer 不再接收开场 summary。
- [x] Prompt 明确 timeline 是时序，后续形态覆盖早期形态。
- [x] 玩家/NPC 台词不会创建旧形态的第二实体。
- [x] message 205 正文、译文、segments、swipe 与 diagnostics 已备份并修复。
- [x] 目标 Prompt 测试和 post-fix 离线重放通过。
- [x] 全量 Hogwarts Node `311/311`、ESLint、语法、diff 与模块尺寸门禁通过。
- [x] 浏览器确认错误双实体句消失、修正收束存在、麦格人物卡只有一张。
- [x] 用户确认后已清理本次 instrumentation、debug server 和会话文件。

## Transition Item Authority 闭环

- [x] 备份时间线证明 holder 在转场前的旧运行时回滚中丢失，而非 transition reducer 清空。
- [x] pre/post-fix 埋点证明 destroyed Item normalization 保留 holder，位置只按 holder 同步。
- [x] 中档转场与低档开场均收到精简 `authoritativeItems`。
- [x] Prompt 明确 owner 不授予持有，destroyed 不得降级、复活、修复或无证据转交。
- [x] transition diagnostics 持久化按新房间投影后的 Item 权威。
- [x] 当前 JSONL、scene snapshot、rollback checkpoint 与 message 206 已备份并原子修复。
- [x] 浏览器确认 Item 卡为“已销毁 / 主人 Harry / 持有人 Tina / 随 Tina”，正文不再把羽毛笔放回 Harry 手里。
- [x] 目标 projection、Prompt 与 transition reducer 测试通过。
- [x] 全量 Hogwarts Node `312/312`、ESLint、语法、diff 与模块尺寸门禁通过。
- [x] 用户确认后已清理本次 instrumentation、debug server 和会话文件。

## Item / NPC Identity / Calendar 准入审计

- [x] Item V2 的 Schema、12 操作、proposal、迁移、UI、转场与真实档案完成审计。
- [x] 当前 10 个 Item 无重复 ID、dangling presentation 或 scene snapshot mismatch。
- [x] Item V2 评定为 8/10，可冻结功能面并进入维护模式。
- [x] NPC 身份解析、Canon、临时人物、记忆、知识、关系和 presence 底座完成盘点。
- [x] 已确认 actorLibrary 缺正式 Identity Schema，稳定身份与当日意图仍混用自由字段。
- [x] Calendar 时间发动机与产品事件层分开评估。
- [x] 已确认 opening `agenda` 陈旧且只写一次，daily directive 同日卡司覆盖不完整。
- [x] Save Revision Guard 登记为 Calendar 快进/后台模拟的 P0 前置。
- [x] 推荐顺序确定为 revision guard -> NPC Identity V1 -> Calendar V1 -> school-day slice -> montage。

## Calendar V1 Task 7 历史验收（已由 V2 替代）

- [x] `calendar.version/entries/horizon`、条目字段、状态写入者、Scene 多对多关系与 legacy `agenda` 边界已登记。
- [x] Tina 真实 JSONL Calendar dry-run 保持 SHA/mtime、210 条消息及 clock/scene/archive/actors/Item/Identity/Social/Memory/location 不变。
- [x] 真实现存 V1 与移除 Calendar 后的 legacy 克隆均重复迁移 byte-stable；网络与模型调用均为 0。
- [x] legacy `agenda` 不迁移、不进入 prompt/projection/UI；legacy 克隆得到空 entries，sceneArchive 正文不复制。
- [x] V1 曾要求考试与约会从任一预览进入后同时关联；V2 已删除该语义并以“世界并发、玩家出席分离”替代。
- [x] V1 曾向 low Performer、Daily、medium/high Scene Transition 投影全部重叠条目；V2 仅保留 Daily 全量并发投影。
- [x] Calendar 专项 `47/47`、workflow/save/identity/social/item 回归 `102/102`、全量 Hogwarts Node `422/422` 通过。
- [x] 生产/测试 ESLint、138 个生产模块、32 个测试模块及 dry-run 脚本语法、diff、体积和依赖边界通过。
- [ ] 桌面/390px Calendar、同刻逐项预览、进入时间点、相关 Scene 与历史只读等待浏览器 agent 证据。

## Calendar V2 Task 39 文档与回归同步

- [x] README 已记录四层模型、High/Medium 边界、会议式日程、自由开场与 V1 迁移。
- [x] runtime spec/state fields 已登记 V2 typed collections、Prompt 投影和 schedule/Scene/beat 关系。
- [x] dry-run 覆盖真实 V1→V2、当前 V2 no-op、无 Calendar 初始化、稳定 ID、幂等、模型/网络 0 及原文件不变。
- [x] 标准 E2E fixture 覆盖会议式日程、剧情线、只认领所选 schedule、自由开场与历史只读。
- [x] V1“全部重叠安排强制进入同一 Scene”的测试与当前文档断言已替换为世界并发和玩家出席分离。

## Actor Context V1 Task 6 契约同步

- [x] `state-fields.md` 已登记 ActorCoreV1、ActorRuntimeV1、ActorMemoryIndexV1、Appraisal/Schema、Dossier、Knowledge 与 LowTier 六字段所有权。
- [x] `actor-memory.md` 已删除人物记忆正文与 impression 持久化语义，改为 Event/Appraisal 引用和一次性原子迁移。
- [x] `knowledge-runtime.md` 已登记独立 canonical records、可重建索引、hydration 与 LowTierContextV1 预算。
- [x] runtime `spec.md` 与 README 已明确初级导演 System Prompt 编排属于后续独立项目。
- [ ] Tina 玩家可见事实、全量测试、ESLint、模块边界与调用预算仍待 Task 6 系统验收。
