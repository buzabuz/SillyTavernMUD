# 单元测试生成结果汇总
**执行状态**：成功；**生成耗时**：`11.9 分钟`
---
## 总体统计
**单测增量覆盖率**：`91.32%（目标模块平均行覆盖率）`；**命中函数数**：18；**生成用例数**：5；**用例通过率**：`100%`
**修复编译失败包**：1；**修复执行失败用例数**：7；**发现缺陷数**：4
---
## 生成明细
| 文件名 | 执行成功数/生成用例数 | 生成后目标模块行覆盖率 |
|:-------|:--------------------:|:----------------------:|
| [hogwarts-mud-npc-identity-v1.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-npc-identity-v1.test.mjs) | 2/2 | Schema 91.06% / Canon 99.27% / Migration 93.43% |
| [hogwarts-mud-npc-identity-prompts.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-npc-identity-prompts.test.mjs) | 1/1 | 92.59% |
| [hogwarts-mud-npc-identity-ui.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-npc-identity-ui.test.mjs) | 1/1 | 84.70% |
| [hogwarts-mud-save-revision-guard.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-save-revision-guard.test.mjs) | 1/1 | 86.88% |
---
## 用例修复明细
| 修复类型 | 修复对象 | 包含用例数 | 修复后目标模块行覆盖率 |
|:---------|:---------:|:---------:|:----------------------:|
| 编译失败 | [npc-identity-schema.js](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/domain/npc-identity-schema.js) | 3 | 91.06% |
| 执行失败 | [Birth Schema / Canon / Migration](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-npc-identity-v1.test.mjs) | 5 | 91.06% / 99.27% / 93.43% |
| 执行失败 | [Prompt projection](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-npc-identity-prompts.test.mjs#L441) | 1 | 92.59% |
| 执行失败 | [Identity dossier](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-npc-identity-ui.test.mjs#L435) | 1 | 84.70% |
---
## 缺陷明细
| 函数 | 场景 | 类型 | 问题 | 修复建议 |
|:-----|:-----|:-----|:-----|:---------|
| [normalizeNpcBirth / deriveNpcAgeAtClock](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/domain/npc-identity-schema.js#L212-L255) | [Birth 仅允许 exact/year/unknown](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-npc-identity-v1.test.mjs#L239) | P1 | 旧实现保存 range/earliest/latest，并从非 exact 数据派生年龄 | 已收敛为 `{date, year, precision}`，非 exact 年龄统一 unknown |
| [mapCanonBirth](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/domain/npc-identity-canon.js#L374-L430) | [Canon 学年区间](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-npc-identity-v1.test.mjs#L421) | P1 | 学年范围被选择成起止日期并持久化 | 已将日期/学年区间和不确定文本映射为 unknown |
| [legacyBirth / needsMigration](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/domain/npc-identity-migration.js#L72-L129) | [Legacy 与旧 V1 清理](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-npc-identity-v1.test.mjs#L1055) | P1 | legacy year 被扩成全年范围，旧 V1 range 可绕过迁移 | 已改为 exact/year/unknown，并对非规范旧 V1 重跑幂等迁移 |
| [formatBirth / formatAge](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/ui/npc-identity-dossier.js#L204-L235) | [UI 永不显示 Birth 范围](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-npc-identity-ui.test.mjs#L435) | P2 | UI 拼接 earliest/latest 与年龄范围，显示“至” | 已只显示 exact date、exact year 或“未知” |
## 跳过函数明细
暂无
