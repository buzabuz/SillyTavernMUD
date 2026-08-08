# 单元测试生成结果汇总
**执行状态**：成功；**生成耗时**：`4.1 分钟`
---
## 总体统计
**单测增量覆盖率**：`-`；**命中函数数**：5；**生成用例数**：5；**用例通过率**：`0%`
**修复编译失败包**：0；**修复执行失败用例数**：0；**发现缺陷数**：4
---
## 生成明细
| 文件名 | 执行成功数/生成用例数 | 生成后增量覆盖率 |
|:-------|:--------------------:|:----------------:|
| [hogwarts-mud-task3-contract.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-task3-contract.test.mjs) | 0/5 | - |
---
## 用例修复明细
暂无
---
## 缺陷明细
| 函数 | 场景 | 类型 | 问题 | 修复建议 |
|:-----|:-----|:-----|:-----|:---------|
| [collectSocialDirectorEvidence](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/index.js#L9295-L9580) | 私密事件与公开事件 | P1 | active cast、对白人物和旧 archive actor 被自动提升为 witness | 仅从已提交 eventKnowledge 投影逐消息白名单 |
| [buildActorKnowledgeCapsules](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/helpers.js#L4882-L4995) | 人物事件知识 | P1 | 无法区分直接参与、亲眼见证和转述 | 增加 direct/witnessed/reported 稳定投影 |
| [buildKnowledgeRecords](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/knowledge.js#L88-L353) | event/scene 检索实体 | P1 | 使用 active/对白人物代替事件 participant/witness/cohort | 从 eventKnowledge 和分层 scene 人口生成实体 |
| [buildSceneArchiveEntry](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/index.js#L11328-L11363) | 跨场景封存 | P1 | actorIds 混合 active/local 且未保存事件见证事实 | 新增 active/local/cohort/events 字段，actorIds 仅兼容 |
---
## 跳过函数明细
暂无
