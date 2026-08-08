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
| Ordinary turn settlement | Tested | narrative-first、repair、retry、presence/witness tests | 建独立字段时序页 |
| Spatial / movement / maps | Tested | movement、reachability、sightline、migration tests | 建结构化房间权威页 |
| Item V2 / material / appearance / spell | Verified | 14 项 Item 专测、284/284 全量、Tina 真实存档九卡投影、Composer 双段指令、Ron owner/holder、无生成请求 | 后续只接 medium/high authorized hidden proposal 入口 |
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
