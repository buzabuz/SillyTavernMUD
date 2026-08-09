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
