# 单元测试生成结果汇总
**执行状态**：成功；**生成耗时**：`10.3 分钟`
---
## 总体统计
**单测增量覆盖率**：`27.54%（聚焦套件整体行覆盖率，无前置增量基线）`；**命中函数数**：-；**生成用例数**：1；**用例通过率**：`100%`
**修复编译失败包**：0；**修复执行失败用例数**：0；**发现缺陷数**：0
---
## 生成明细
| 文件名 | 执行成功数/生成用例数 | 生成后增量覆盖率 |
|:-------|:--------------------:|:----------------:|
| [hogwarts-mud-task1-baseline.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-task1-baseline.test.mjs) | 1/1 | 27.54%（聚焦套件整体行覆盖率） |

新增用例实际加载 `index.js` 直接引用的 core、domain、presence 和 spell owner，逐个验证 named export 存在。现有模块图用例同步扩展为扫描静态 import、动态 `import()` 和 re-export，并禁止所有生产模块反向依赖 `helpers.js` 或 `index.js`。
---
## 用例修复明细
暂无
---
## 验证备注

- Task 1 基线：7/7 通过；Task 1 + Task 4 模块边界：12/12 通过。
- 全量 Hogwarts Node：261/261 通过。
- 模块图：循环 0、逆层 0、生产模块导入兼容门面/组合根 0。
- `index.js` 591 行，`helpers.js` 240 行；新分层模块最大 1,480 行。
- Hogwarts ESLint 0 错误；测试保留 6 条既有 `playwright/expect-expect` warning。
- 所有 Hogwarts 生产模块 `node --check` 与 `git diff --check` 通过。

## 缺陷明细
暂无

## 跳过函数明细
暂无
