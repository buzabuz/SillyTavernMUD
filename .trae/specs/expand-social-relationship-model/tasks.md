# Tasks

- [x] Task 1: 建立 Social Graph v2 数据契约与确定性迁移。
  - [x] SubTask 1.1: 定义长期关系维度、短期情绪 appraisal、结构标签和兼容字段。
  - [x] SubTask 1.2: 实现 v1→v2 本地迁移、归一化和派生标签 helper。
  - [x] SubTask 1.3: 为 Tina 当前存档、family、敌对熟人和疏远关系添加迁移单测。

- [x] Task 2: 升级 LangGraph Social Director 的提取、校验和数值 Reducer。
  - [x] SubTask 2.1: 扩展结构化 Schema 与 Prompt，加入阶段锚点、增量带和典型事件。
  - [x] SubTask 2.2: 实现 impact clamp、重复衰减、饱和衰减、负面不对称和修复门槛。
  - [x] SubTask 2.3: 保持 message-level witness、scene provenance、稳定 evidence ID 和重放幂等。
  - [x] SubTask 2.4: 添加正向、负向、背叛、修复、刷分和跨场景拒绝测试。

- [x] Task 3: 将 v2 关系状态投影到人物上下文和人物卡。
  - [x] SubTask 3.1: 更新 actor knowledge/continuity capsules，只暴露授权关系与 active emotions。
  - [x] SubTask 3.2: 更新本地知识库记录和人物卡多维摘要、派生标签、最新 evidence。
  - [x] SubTask 3.3: 增加“在星图中查看”联动入口并验证旧 UI 不回归。

- [x] Task 4: 实现全局“关系星图”。
  - [x] SubTask 4.1: 引入 Cytoscape.js 并建立只读 player-known graph projection。
  - [x] SubTask 4.2: 在顶栏增加固定入口和全屏/大面板容器。
  - [x] SubTask 4.3: 实现有向双边、头像节点、魔法星图视觉、筛选、搜索、布局重置和详情侧栏。
  - [x] SubTask 4.4: 持久化每个时间线的节点位置与筛选偏好。
  - [x] SubTask 4.5: 实现 reduced-motion、键盘焦点和文本列表回退。

- [x] Task 5: 完成回归、实机验收与文档同步。
  - [x] SubTask 5.1: 运行 Hogwarts MUD 单测、ESLint、语法和 diff 检查。
  - [x] SubTask 5.2: 用 Tina 存档验证 v2 迁移、数值锚点和共同记忆冷却不被推进。
  - [x] SubTask 5.3: 浏览器验收固定入口、关系图交互、人物卡联动和隐藏知识边界。
  - [x] SubTask 5.4: 更新 Hogwarts MUD README 中的 Social Graph v2 与数值参考。

# Task Dependencies

- Task 2 depends on Task 1.
- Task 3 depends on Task 1 and Task 2 的稳定投影接口。
- Task 4 depends on Task 1；其视觉与交互部分可与 Task 2 并行。
- Task 5 depends on Task 1–4。

- [x] Task 6: 修复系统级 checklist 暴露的 v2 旁路与边界缺口。
  - [x] SubTask 6.1: 将 causal collapse 社交写入升级为十维 v2 edge 与 structuralTags，禁止新写 affinity。
  - [x] SubTask 6.2: 为 active emotions 增加按当前回合计算的确定性衰减，并补充过期测试。
  - [x] SubTask 6.3: 补全 closeness=90 的终身/家庭级标签。
  - [x] SubTask 6.4: 在 Reducer 强制 routine/classmate 事件不得提高 closeness，并限制重复 praise/gift 无法刷过关系阶段。
  - [x] SubTask 6.5: 首次加载仅做本地 v1→v2 与 extractor 元数据迁移；无新消息时严禁启动 Social Director。
  - [x] SubTask 6.6: 拒绝超出 impact band 的 delta，而不是静默缩放后提交，并更新反例测试。
  - [x] SubTask 6.7: 修复旧档加载时误触发普通回合重演的问题，并从本地备份恢复 Tina 被自动改写的最后一条消息。

- Task 6 depends on Task 1–3，完成后必须重新执行 Task 5.1–5.3 与全部 checklist。

- [x] Task 7: 修复关系星图浏览器验收缺口。
  - [x] SubTask 7.1: 修正“全部已知 + 学院”身份筛选，显示全部有学院归属的人物及其可见边。
  - [x] SubTask 7.2: 移除 Cytoscape 不支持的 shadow 样式，使用合法样式实现选中高光且清除控制台警告。
  - [x] SubTask 7.3: 添加筛选投影和样式配置回归测试。

- Task 7 depends on Task 4，完成后重新执行 Task 5.3。

- [x] Task 8: 修复 Tina 真实存档的学院筛选并完成剩余可访问性验收。
  - [x] SubTask 8.1: 检查 Tina actorLibrary/actors 中真实学院字段路径，修正关系图身份分类投影。
  - [x] SubTask 8.2: 使用脱敏的 Tina actor 字段形状增加“全部已知 + 学院”回归测试，要求不低于实际学院人物/边数量。
  - [x] SubTask 8.3: 浏览器复验学院筛选、复杂筛选、无 Cytoscape 警告与 reduced-motion 运行时行为。

- Task 8 depends on Task 7，完成后重新执行 Task 5.3 与对应 checklist。

- [x] Task 9: 完成 v2 模型接入审计并结束旧关系维度兼容周期。
  - [x] SubTask 9.1: 添加端到端契约测试，证明 Social Director Prompt、JSON Schema、validator 与 Reducer 共同使用 v2 十维、结构标签和短期情绪。
  - [x] SubTask 9.2: 将 affinity 与 weightDelta/type 旧协议限制在 v1 迁移输入解析器，迁移后的 evidence/edge 不再持久化旧字段。
  - [x] SubTask 9.3: 清理人物上下文、人物卡、知识库和关系星图中的 affinity 兼容投影与回退读取。
  - [x] SubTask 9.4: 迁移 Tina 当前 v2 存档及派生人物缓存，确认 91 evidence、33 edges、cursor、正文和共同记忆冷却不变。
  - [x] SubTask 9.5: 运行静态残留审计、全量单测、ESLint、语法检查和浏览器关系投影复验。

- Task 9 depends on Task 1–8；完成标准是 affinity 仅存在于迁移解析代码与迁移测试输入，运行时 v2 状态和下游投影均无旧维度。

- [x] Task 10: 修复最终浏览器验收暴露的加载副作用与可访问性回归。
  - [x] SubTask 10.1: 禁止无用户操作的当前 v2 存档加载触发 local translate 或 chat save，并恢复 Tina 被验收改写的正文记录。
  - [x] SubTask 10.2: 让“全部已知 + 学院”严格只显示真实学院人物，排除无学院的 player/Eddie，保持 10 人物/32 边。
  - [x] SubTask 10.3: 修复 390px 窄屏下图→人物卡 inspector 被 `display:none` 隐藏的问题。
  - [x] SubTask 10.4: 在 `prefers-reduced-motion` 下彻底禁用关系星图动画，并清理 wheel-sensitivity 控制台警告。
  - [x] SubTask 10.5: 添加回归测试并重新执行零模型/零保存、桌面、窄屏、筛选和无障碍浏览器验收。

- Task 10 depends on Task 8–9，完成后重新执行 Task 5.3、8.3、9.5 与全部 checklist。

- [x] Task 11: 修复正文恢复导致的 Tina 旧社交字段回流。
  - [x] SubTask 11.1: 从已验证的清理后备份恢复 v2 socialGraph 与派生人物/回滚缓存，只保留当前已恢复的 message 191 正文。
  - [x] SubTask 11.2: 确认权威边、evidence、actorLibrary、turnRetry 与回滚缓存中的 affinity、weightDelta 和旧社交 type 均为 0。
  - [x] SubTask 11.3: 重新确认 91 evidence、33 edges、cursor=191、正文 SHA-256 `2d508e…b65b6a` 和共同记忆冷却不变。
  - [x] SubTask 11.4: 定位并移除只读加载仍触发的 `POST /api/chats/save`，确保无 local translate、无 chat save、存档哈希与 mtime 不变。
  - [x] SubTask 11.5: 重新执行全量测试、静态残留审计和只读浏览器验收。

- Task 11 depends on Task 9–10；完成后重新执行 Task 5.3、8.3、9.4–9.5、10.5 与全部 checklist。

- [x] Task 12: 修复最新浏览器验收失败并恢复 Tina 干净存档。
  - [x] SubTask 12.1: 立即从 16:16 干净备份恢复 Tina，并核对正文、socialGraph、派生缓存、mtime 与备份一致。
  - [x] SubTask 12.2: 定位并阻止只读加载触发 `POST /api/chats/save` 及其正文重写，验证无用户操作时请求数为 0、正文哈希与 mtime 不变。
  - [x] SubTask 12.3: 修复“全部已知 + 学院”投影，浏览器验证严格显示 10 人物/32 边且不包含无学院人物。
  - [x] SubTask 12.4: 修复 autocomplete 初始化错误和无 `chat_name` 保存警告，验证加载与关系星图操作期间控制台均无对应报错或警告。
  - [x] SubTask 12.5: 补充上述场景的回归测试，并重跑桌面/窄屏/筛选/只读浏览器验收、全量测试与静态残留审计。

- Task 12 depends on Task 11；完成后重新执行 Task 5.3、8.3、9.4–9.5、10.5、11.5 与全部 checklist。
