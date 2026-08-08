## Round 1

- 完成 Task 1–9：建立导出/黄金样本/模块图基线，将 `index.js` 收缩至 591 行组合根、`helpers.js` 收缩至 240 行兼容门面，并拆分 core、domain、runtime、adapters、workflows 与 ui；全部 tasks 和 31 项 checklist 已通过。
- 验证通过：Hogwarts Node 261/261、119 个 JS/MJS 语法检查、项目与目标 ESLint、`git diff --check`、桌面与 390px 离线 E2E；模块图循环/逆层/门面反向依赖为 0，98 个手写逻辑模块全部低于 2,000 行。
- 发现并修复：重复 `init()` 风险、两个超过 2,000 行的既有逻辑模块、Playwright 输出目录会删除正式 evidence、Task 8 提交控件定位和 QA backup 清理遗漏；最终 QA chat/knowledge/backup 残留为 0，Tina SHA-256 与 mtime 不变。
- 关键决策：采用 `core → state/domain → runtime/adapters → workflows → ui → index.js` 单向依赖；保留 290 项 helper 兼容导出；所有离线阶段禁止模型调用，最终使用浏览器与一次性代理双重预算执行唯一一次真实 GLM-5.2 调用，browser/proxy/upstream 为 1/1/1、HTTP 200，刷新新增调用为 0。
- 主要变更文件：`public/scripts/extensions/hogwarts-mud/{index.js,helpers.js,README.md,core/,domain/,runtime/,adapters/,workflows/,ui/}`、`src/hogwarts-mud/{social-director-graph.js,social-director-contract.js,turn-settlement-graph.js}`、`tests/hogwarts-mud-*.{test.mjs,e2e.js}`、`tests/playwright.config.js` 及本规格目录。

## Round 3

- 完成 Task 10：通过调试服务器和最小 instrumentation 复现低档现场表演失败，用户确认修复后完成全部清理；新增两项 checklist 均通过。
- 运行时证据确认根因是上游 API 返回 `Too Many Requests`：stream 请求失败后，shared model adapter 将限流误判为流式能力故障并再次发起 one-shot，造成同一 429 被重复请求；JSON 解析、Scene validator、authority settlement、模块缓存和依赖注入均被排除。
- 最小修复仅识别明确的 429/rate-limit error shapes 并原样抛错、禁止 one-shot fallback；普通 stream unsupported/transport 异常继续回退。post-fix 首次响应解析成功，4 个 segments 经 LangGraph settlement 与 validator 一次通过，非法推进仅作为 warning 丢弃。
- 验证通过：rate-limit 定向 1/1、Task5 8/8、Hogwarts Node 262/262、项目与定向 ESLint、相关 `node --check`、`git diff --check`；调试服务器、instrumentation、`debug-low-tier-invalid.md`、日志和 env 已全部删除。
- 主要变更文件：`public/scripts/extensions/hogwarts-mud/adapters/model.js`、`tests/hogwarts-mud-task5-workflows.test.mjs`、本规格的 `tasks.md`、`checklist.md` 与 `progress.md`。

## Round 4

- **结论**: FAIL
- **审查范围**: `public/scripts/extensions/hogwarts-mud/adapters/model.js` 的 429/stream fallback、`ConnectionManagerRequestService` 错误包装契约、Task 5 定向测试与 narrative-first 无效提案回归测试
- **验证结果**:
  - 构建/运行时: 失败；语法检查、目标 ESLint 与 `git diff --check` 通过，但真实包装形状 `Error('API request failed', { cause: Error('Too Many Requests') })` 的对抗探针产生请求模式 `[true, false]`，证明仍错误触发 one-shot 第二次请求
  - 测试/覆盖: 失败；现有 rate-limit 定向测试 1/1、Task 5 契约 8/8、无效提案保留正文测试 1/1 均通过，但测试未覆盖 Connection Manager 的实际包装错误形状
  - 检查清单审计: 1/2 通过，1 项失败
- **风险与问题**: P1：限流识别只检查顶层错误消息和 `cause.status`，遗漏 `cause.message`；上游 API 返回 `Too Many Requests` 经 Connection Manager 包装后仍会重复调用，原始问题未完整修复
