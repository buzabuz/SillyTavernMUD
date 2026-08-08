# 单元测试生成结果汇总
**执行状态**：成功；**生成耗时**：`10.9 min`
---
## 总体统计
**单测增量覆盖率**：`-`；**命中函数数**：2；**生成用例数**：2；**用例通过率**：`100%`
**修复编译失败包**：0；**修复执行失败用例数**：1；**发现缺陷数**：1
---
## 生成明细
| 文件名 | 执行成功数/生成用例数 | 生成后增量覆盖率 |
|:-------|:--------------------:|:----------------:|
| [hogwarts-mud.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud.test.mjs#L12383-L12909) | 2/2 | `39.58%`（目标文件聚焦行覆盖率） |
---
## 用例修复明细
| 修复类型 | 修复对象 | 包含用例数 | 修复后增量覆盖率 |
|:-------|:-------:|:---------:|:-------------:|
| 测试基础设施 | [Tina 字段形状 fixture](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud.test.mjs#L12536-L12909) | 1 | `39.58%`（目标文件聚焦行覆盖率） |
---
## 缺陷明细
| 函数 | 场景 | 类型 | 问题 | 修复建议 |
|:-----|:-----|:-----|:-----|:---------|
| [edgeMatchesCategory](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/relationship-graph.js#L807-L827) | “全部已知 + 学院”筛选 Tina 的玩家知情关系 | P1 | 已修复：`every()` 把身份筛选误做成两端都属学院的诱导子图，结果从要求的 10/32 降为 10/19 | 边按至少一端匹配学院，节点仍严格只保留学院人物；隐私边继续由 player audience projection 授权 |
---
## 跳过函数明细
暂无
