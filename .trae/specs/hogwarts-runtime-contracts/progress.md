# Runtime Contract 审计进度

## 证据等级

- **Verified**：生产代码、自动化测试和真实存档/diagnostics 三者一致。
- **Tested**：生产代码与自动化测试一致，尚未采集专项真实运行证据。
- **Indexed**：已登记入口和字段，尚未完成逐事务审计。

## 当前状态

| 模块 | 等级 | 最近证据 | 后续 |
| --- | --- | --- | --- |
| Context budget / model diagnostics | Verified | 真实截断存档、持久化 turn diagnostics、266+ 全量测试 | 后续补 connection error taxonomy |
| Presence / scene transition / people projection | Verified | Tina 转场与 turn 93 修复存档、4 active / 8 local、observer departure grounding、286/286 测试 | 补 dorm/family cohort 转场案例 |
| Ordinary turn settlement | Tested | player-speech replay diagnostics、首次 Prompt 契约、narrative-first、repair、retry、presence/witness tests | 用下一次自然回合验证首次响应不再因 `actorId=player` 进入 repair |
| Spatial / movement / maps | Tested | movement、reachability、sightline、migration tests | 建结构化房间权威页 |
| Item V2 / material / appearance / spell | Verified | Item 证据门禁、spell observation 三路径、296/296 全量、真实 JSONL/浏览器验证 | 后续只接 medium/high authorized hidden proposal 入口 |
| Social / memory / event knowledge | Verified | social contract、witness whitelist、transition sparse memory、旧 filler 幂等迁移、289/289 测试 | 建 directional evidence 页 |
| Opening / directors / world change | Indexed | 现有 opening/pacing/transition tests | 补调用预算与状态机页 |
| Knowledge / translation | Indexed | 现有 glossary、batch、knowledge tests | 补事实/显示边界页 |
| Save / read-only / UI session | Tested | readonly E2E、Task 5/6 tests | 建 host persistence 页 |

## 2026-08-09 Presence 审计

- 根因：`applySceneTransition()` 提交了 `nextScene.actorStates` 和 runtime actors，但未更新 `activeInteractionActorIds` 与 `localPresence`。
- 首轮修复缺陷：从 `actors[present]` 重建 local，错误合并 active 与 local 语义。
- 最终规则：
  - active 只来自 committed present actor states；
  - local 来自 destination actor positions 与高置信度 cohort roster；
  - actorLibrary-only 不构成物理位置证据；
  - 相邻 archive 可修复已被首轮迁移清空 cohort 的存量档案。
- Tina 预期：
  - active：McGonagall、Hermione、Ron、Lavender；
  - local occupants：上述四人加 Harry、Dean、Neville、Seamus；
  - local cohort：`gryffindor_year1_transfiguration_1991`。
- 验证：Hogwarts Node `268/268`、目标 ESLint、语法与 diff 检查通过；未调用用户模型。

## 2026-08-09 Item V2 审计

- V1 根因：`ownerId + custody` 混合表达主人、持有人、位置与穿戴；模型新 acquisition 可直接进入正式物品栏。
- V2 权威：
  - `items[]` 分离 owner、holder、location、state、equipped、source、visibility 与获得精度；
  - `pendingItemProposals[]` 保存待玩家决策的新 acquire；
  - `actorPresentations` 用整体 outfit 与正式 Item ID 表达当前造型。
- Reducer 支持十二操作；借出/偷走保留 owner，赠送改变 owner，terminal state 不被 carry 复活。
- 普通校服、课本、羽毛笔、办公/生活用品和普通店铺库存保持隐含，不建 Item。
- 新 proposal 必须逐字命中玩家行动或英文正文；hidden 与无关普通物品不进入玩家候选。
- movement/transition/interior/spatial repair/rollback 统一按 `holderId` 跟随位置。
- 旧档迁移保留 Tina 五个 V1 Item、发型/可见状态和兼容显示，并幂等 seed 四个当前时间可用的 Canon 标志物。
- 浏览器证据：
  - 728px 窄屏物品库九卡、零横向溢出；
  - Ron 卡显示 Charlie owner、Ron holder、loan；
  - Harry 眼镜显示穿戴中；
  - 检查器可从头像和场景人物以 UI-only drawer 打开；
  - 无模型 generation 网络请求。
- Composer 协议：
  - “插入表达”展示十二操作，选择后自动打开 Item ledger；
  - Item 卡把稳定 ID 与显示名插入第二段 reference directive；
  - parser 拒绝孤立、未知与 hidden 引用；
  - directive 只表达意图，模型和 Reducer 仍需根据英文结果证据结算。
- 浏览器实测 `carry + acceptance_letter` 双段指令写入成功，未提交回合，随后清空草稿；无模型 generation 请求。
- 验证：Hogwarts Node `284/284`、目标 ESLint、语法、diff 和模块行数门禁通过。

## 2026-08-09 Turn 93 False Departure 审计

- 玩家在变形术教室抚摸虎斑猫后，低档正确生成麦格的 impression、memory 和课堂后续；这些事实已写入 actor 与 actorLibrary。
- 后置 local observer 错把“麦格从猫形显现”和“拉文德后退坐下”标记为 `presence=absent`，并把麦格错误移动到 courtyard。
- 旧门禁只要求 evidence 句包含人物名字；exact evidence 会绕过目标房间 grounding。
- 修复后：
  - `absent` 必须有明确离场语言；
  - room change 必须有目标房间名称/ID；
  - 非法 presence/location 不影响合法 activity update。
- 同一 turn 92 fixture 对比：
  - pre-fix active `4 -> 2`；
  - post-fix active 保持 4，麦格/拉文德均留在 classroom。
- 已备份并精确修复当前 turn 93 JSONL：active 4、local 8、麦格 direct participant/witness；原 impression 与 `minerva_mcgonagall_t93_everyday` 保留。
- 验证：Hogwarts Node `286/286`、目标 ESLint、语法与 diff 检查通过；用户刷新后确认 UI 正确。

## 2026-08-09 Closed Scene Memory Filler 审计

- 当前存档发现 8 条 `source=medium_transition` 的模板记忆，分布于麦格、赫敏、罗恩、西莫、纳威和拉文德。
- 根因是 transition prompt Schema 漏掉 `relationshipUpdates`，而 normalizer 在字段缺失时把 closure summary 截到 18 词，再拼接固定前后缀并复制给全部 witness。
- pre-fix 重放：
  - 54 词公共休息室 closure 被截成 `then danced This experience...`，复制给 3 人；
  - 60 词宿舍 closure 被截成 `Tina claimed the This experience...`，复制给 2 人。
- 修复后：
  - prompt 恢复稀疏 `relationshipUpdates` Schema 和人物视角约束；
  - normalizer 不再从 closure summary 补人物记忆；
  - 只接受完整、唯一、非模板化的 8–32 词记忆；
  - transition memory 不再重复写入 lasting impact；
  - 旧档加载幂等清理精确匹配的历史 filler。
- post-fix 当前存档 dry-run：filler `8 -> 0`，第二次运行 `changed=false`；具体麦格记忆仍可提交。
- 验证：Hogwarts Node `289/289`、目标 ESLint、语法与 diff 检查通过；用户刷新后确认模板记忆消失。

## 2026-08-09 Item Loan / Evidence / Candidate UI 审计

- turn 94 正文明确由 Harry 提供备用黄铜羽毛笔，但 4B inventory observer 因“generic quill”规则返回空数组。
- 修复后，完成 gift/loan/return/theft 的具体普通物品越过 implicit boundary，进入玩家候选；新 loan 保留 Harry owner、player holder 和 `transferMode=loan`。
- turn 93 的签名羊皮纸错误 `lose` 只满足“evidence 是正文子串”，证据实际描述猫变麦格。
- projection 与 partition 现在对 `lose/destroy/consume/damage/clean` 要求 Item 名词和对应状态动作双重证据。
- 当前 JSONL 已备份并修复：
  - 签名羊皮纸恢复 `intact + holderId=player`；
  - 无效 turn 93 `lose` 删除；
  - 羽毛笔候选补入 turn 94，后由玩家收录。
- candidate accept 首次卡在 awaited knowledge sync；移除该步骤后只执行 reducer、metadata save、prompt refresh 与 render。
- UI 世界投影补齐 pending/decisions；幂等重试也重绘，成功后卡片即时切换并显示 toast。
- 真实浏览器验证：
  - accepted 羽毛笔卡仅保留“详情”，绿色“已收录”可见；
  - 关闭 `<details>` 菜单尺寸为零；
  - 打开“更多”后八个按钮全部命中自身；
  - 用户确认按钮和状态反馈正常。
- 验证：Hogwarts Node `293/293`、目标 ESLint、语法与 diff 检查通过；无剧情模型调用。

## 2026-08-09 Spell Observation 审计

- turn 94 玩家主动辨认麦格黑板上的模糊咒语，但 local semantic 以 `required=false/ruleId=none` 压掉 D20；performer 只推进借眼镜/羽毛笔。
- 当时 player/narrative spell directives、catalog references 和 transaction spell casts 均为空，spell settlement 直接 skip。
- 新增 `resolveSpellObservation()`：从玩家明确观测意图和当前 scene intent 解析稳定 spell ID；可解析 observation 覆盖错误 semantic no-check，并只执行一次感知 D20。
- 新增 `match_to_needle_transfiguration`；technique 来自 Canon 课堂练习，Canon 缺失咒文由游戏补全 `Acufors`，标记 `sourceTier=game_extension_canon_gap`。
- 获知边界：
  - failure/catastrophic failure 只显示“未能辨认咒语”，不泄露 name/incantation/ID，不写 spellbook；
  - success-with-cost 及以上通过主动观测学习；
  - NPC 明确念出、写出、解释或示范仍可在玩家失败后通过教学证据学习；
  - AI 正文稳定 spell marker 可进入 spellbook，但不计玩家 cast attempt。
- 当前 JSONL 已双备份并精确修复：保留确定性 D20=`3` 与 failure 卡，spellbook 不新增火柴变针；真实 UI 不泄露目标。
- 浏览器验证：最新回复显示 `咒语观测 · 失败并产生后果 · 未能辨认咒语`，咒语页仍只有原有两项。
- 三路径 fixture：failure 不学；D20 15 success-with-cost 学习；failure + McGonagall explains `Acufors` 学习。
- 验证：Hogwarts Node `296/296`、目标 ESLint、语法与 diff 检查通过；用户确认最终语义。

## 2026-08-09 Ordinary Turn Player-Speech Replay 审计

- trace `turn-d822117c-d67b-4339-a897-3a81f1f8187e` 显示首次请求 46.068 秒后返回 12 段，其中把玩家原话写成 `dialogue` 且使用非法 `actorId=player`。
- validator 正确拒绝首次 payload；结构 repair 随后耗时 225.094 秒，返回 11 段并通过校验。
- repair 通过后 44.926 秒完成观察、翻译与提交，总事务耗时 323.757 秒；不存在永久 Promise deadlock。
- `liveSceneStream` 会在 async stream 尚未结束时显示已恢复分段，因此“12 段已落笔”不等于 response、validation 或 commit 已完成。
- 首次 Performer Prompt 现明确规定：玩家输入不得被复制、改写、翻译或重演；不得输出 `actorId=player`；dialogue 必须是 present NPC 的新台词。
- 未加入自动重新提交、reload retry、超时补写或额外模型调用；当前原始请求最终自然提交为 turn 95。
- 离线 post-fix fixture 在 attempt 0 通过，未出现 repair 日志；全量 Hogwarts Node `297/297`、ESLint、语法与 diff 检查通过。

## 2026-08-09 Live Reply Atomic Display 审计

- 旧 `renderLiveSceneStream()` 在任意可恢复 segment 出现后立即构建 `.hpmud-streaming-turn`，把未经完整校验的 draft 当正文展示。
- 旧 story scroll 使用 `wasNearBottom || turnActive`，因此 final message 在 job 尚未退出时会无条件跳到底部。
- pre-fix detached DOM：2 个内部 draft segments 对应 2 个正文块；`wasNearBottom=false` 时 scroll 仍从 `400` 跳到 `1000`。
- 修复后生成期无条件只返回 atomic loading card；内部 segment 仍可供 diagnostics 使用，但正文块为 0。
- `latestStoryMessageId` 只在当前 UI session 保存；新 assistant ID 首次出现时 scroll 到该消息 `offsetTop - 16px`，后续同 ID 重绘保持当前位置。
- post-fix detached DOM：message 200 选择 `new-assistant-top`，scroll 精确落在 `684`；首次加载与同 ID 重绘不触发新消息定位。
- 浏览器只读验收加载 message 200 的 11 个正式 segments，streaming turn 为 0、composer 可用；没有 submit、retry 或 generation 请求。
- 全量 Hogwarts Node `299/299`、ESLint、语法与 diff 检查通过。
