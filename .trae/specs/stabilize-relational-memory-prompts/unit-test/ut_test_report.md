# Task 14.1 单元测试生成结果
**执行状态**：成功；**生成耗时**：`8.0 分钟`
---
## 总体统计
**单测增量覆盖率**：`narrative-memory-provenance.js 88.52% lines / 67.31% branches / 90.48% functions`；**命中函数数**：2；**生成用例数**：5；**用例通过率**：`100%`
**修复编译失败包**：0；**修复执行失败用例数**：1；**发现并修复缺陷数**：1
---
## 生成明细
| 文件名 | 执行成功数/生成用例数 | 生成后增量覆盖率 |
|:-------|:--------------------:|:----------------:|
| [hogwarts-mud-task6-repair-diagnostics.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-task6-repair-diagnostics.test.mjs#L1908-L2236) | 5/5 | 88.52% lines |
---
## 用例修复明细
| 修复类型 | 修复对象 | 包含用例数 | 修复后增量覆盖率 |
|:-------|:-------:|:---------:|:-------------:|
| 测试 fixture | [Event 文本锚定反例](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-task6-repair-diagnostics.test.mjs#L2022-L2038) | 1 | 88.52% lines |
---
## 缺陷明细
| 函数 | 场景 | 类型 | 问题 | 修复结果 |
|:-----|:-----|:-----|:-----|:---------|
| [isConcretePriorClaim](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/domain/narrative-memory-provenance.js#L82-L121) | 无 `remember`/`yesterday`/`you-we` 标记的第三人称具体旧事 | P1 provenance 绕过 | `Hermione hid my umbrella behind the armour.` 未被识别为具体历史，actor、narrator 与其他 NPC 可绕过私有 supporting Event 门禁 | 已确定性识别第三人称过去动作及地点、物件、引语锚点，并排除纯 expectation、habitual gist 与 current action |

## 跳过函数明细
暂无

---

# Task 22.5 Qdrant smoke 单元测试结果
**执行状态**：成功；**生成耗时**：`8.5 分钟`
---
## 总体统计
**单测增量覆盖率**：`83.11% lines / 54.31% branches / 82.50% functions`；**命中函数数**：4；**生成用例数**：4；**用例通过率**：`100%`
**修复编译失败包**：0；**修复执行失败用例数**：0；**发现缺陷数**：3
---
## 生成明细
| 文件名 | 执行成功数/生成用例数 | 生成后增量覆盖率 |
|:-------|:--------------------:|:----------------:|
| [hogwarts-mud-task22-qdrant-smoke.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-task22-qdrant-smoke.test.mjs) | 4/4 | smoke 脚本 83.11% lines |
---
## 用例修复明细
暂无

## 缺陷明细
| 函数 | 场景 | 类型 | 问题 | 修复结果 |
|:-----|:-----|:-----|:-----|:---------|
| [parseSmokeArguments / runQdrantSmoke](file:///Users/bytedance/sillytavern/SillyTavern/scripts/smoke-hogwarts-qdrant.mjs#L60-L128) | CLI 指定独立 Qdrant endpoint | P1 参数传递 | `--qdrant-url` 被判定为未知参数，且 orchestrator 固定向配置加载器传空 URL | 已增加 URL 参数并完整传给 `loadConfiguredQdrant()` |
| [runQdrantSmoke](file:///Users/bytedance/sillytavern/SillyTavern/scripts/smoke-hogwarts-qdrant.mjs#L894-L1007) | 输出可核验的真实部署 summary | P1 验收缺失 | 未调用 health 或 collection info，无法证明 collection green 与 vector size 768 | 已请求 `/healthz` 和 collection info，严格断言并输出结构化结果 |
| [createTemporaryAclCollection](file:///Users/bytedance/sillytavern/SillyTavern/scripts/smoke-hogwarts-qdrant.mjs#L404-L482) | 临时 ACL probe 的 points upsert 失败 | P1 资源泄漏 | collection 已创建但函数尚未返回，外层 `finally` 不知道 collection 名称，导致残留 | 已在 helper 内捕获失败并删除已创建 collection，再重新抛错 |

## 跳过函数明细
暂无

---

# Task 18/20 单元测试结果
**执行状态**：成功；**生成耗时**：`8.5 分钟`
---
## 总体统计
**单测增量覆盖率**：`narrative-memory-provenance.js 81.91% lines / 46.00% branches / 95.45% functions`；**命中函数数**：2；**生成或维护用例数**：3；**用例通过率**：`100%`
**修复编译失败包**：0；**修复执行失败用例数**：1；**发现并修复缺陷数**：1
---
## 生成明细
| 文件名 | 执行成功数/生成或维护用例数 | 生成后增量覆盖率 |
|:-------|:--------------------------:|:----------------:|
| [hogwarts-mud-task6-repair-diagnostics.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-task6-repair-diagnostics.test.mjs#L2112-L2216) | 2/2 | narrative-memory-provenance.js 81.91% lines |
| [hogwarts-mud-knowledge-v2.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-knowledge-v2.test.mjs#L1034-L1332) | 1/1 | - |
---
## 用例修复明细
| 修复类型 | 修复对象 | 包含用例数 | 修复后增量覆盖率 |
|:-------|:-------:|:---------:|:-------------:|
| 执行失败 | [Task 18 API ACL fixture](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-knowledge-v2.test.mjs#L1113-L1332) | 1 | - |
---
## 缺陷明细
| 函数 | 场景 | 类型 | 问题 | 修复结果 |
|:-----|:-----|:-----|:-----|:---------|
| [hasDeterministicSupport](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/domain/narrative-memory-provenance.js#L143-L205) | 无关 Event 只共享 actor 名称 | P1 provenance 绕过 | 单个长度至少 8 的 `Hermione` token 可让伪造旧事通过 evidence anchor | 从共享锚点中排除具体历史动作的主语身份 token；`hid/put/taught/cast` 正反矩阵全部通过 |

## 最终验证
- 目标 Node tests：139/139。
- 全量 Hogwarts Node tests：591/591，零 skip。
- 对抗矩阵：7/7。
- 生产 ESLint：0 error；测试 ESLint：0 error、13 个既有 warning。
- `node --check`：140/140；`git diff --check`：通过。

## 跳过函数明细
暂无

---

# Task 9.9 最终全量验证
**执行状态**：全部通过；**执行日期**：`2026-08-11`；**新增用例数**：`0`

## 最终结果
| 验证项 | 文件数 | 通过 | 失败 | 跳过 | 取消 | Todo | 结果 |
|:-------|------:|-----:|-----:|-----:|-----:|-----:|:-----|
| Task 9.9 目标 Node tests | 11 | 112 | 0 | 0 | 0 | 0 | 通过 |
| 全部 Hogwarts Node tests | 37 | 552 | 0 | 0 | 0 | 0 | 通过 |
| ESLint dirty JS/MJS | 135 | 135 | 0 errors | 13 warnings | - | - | 通过 |
| `node --check` dirty JS/MJS | 135 | 135 | 0 | 0 | - | - | 通过 |
| `git diff --check` | 1 | 1 | 0 | 0 | - | - | 通过 |

目标与全量 Node 命令均使用 Node 24 所需的 VM flag：

```text
node --experimental-vm-modules --test <11 个目标 test 文件>
node --experimental-vm-modules --test tests/hogwarts-mud*.test.mjs
```

## 验证范围
- 目标集：Item V2、Knowledge V2、Memory Scene Boundary、Memory Synapse、Narrative Authority、Relational Synapse、Task 5 Workflows、Task 6 Narrative Context、Task 6 Repair Diagnostics、Task 7 Archive Repair、Task 8 Call Budget。
- ESLint：100 个生产/脚本 JS/MJS + 35 个测试 JS/MJS，共 135 个文件，0 errors；13 个 warning 均为 `hogwarts-mud-knowledge-v2.test.mjs` 的既有 `playwright/no-conditional-in-test`。
- `node --check`：同一组 135 个文件全部通过。
- 浏览器 E2E 未运行；`tests/hogwarts-mud*.test.mjs` glob 不包含 `*.e2e.js`。

## 本轮最小修复
- [helpers.js](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/helpers.js) 补齐 `filterCommittedSceneOpeningExperienceSegments` 与 `validateSceneOpeningExperienceSegments` 的真实 facade re-export。
- [hogwarts-mud-task1-baseline.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-task1-baseline.test.mjs) 将 helpers 导出金丝雀更新为 `309` 个导出及对应 SHA-256。
- 修复后 focused 回归 `12/12`、目标集 `112/112`、全量 `552/552`；无保留失败或 skip。
- Calendar/Identity 用户 dirty 改动仅参与只读验证，未被本轮修改。

---

# 单元测试生成结果汇总
**执行状态**：成功；**生成耗时**：`13.6 分钟`
---
## 总体统计
**单测增量覆盖率**：`84.01% lines / 66.26% branches / 95.50% functions`；**命中函数数**：-；**生成用例数**：8；**用例通过率**：`100%`
**修复编译失败包**：0；**修复执行失败用例数**：0；**发现缺陷数**：0
---
## 生成明细
| 文件名 | 执行成功数/生成用例数 | 生成后增量覆盖率 |
|:-------|:--------------------:|:----------------:|
| [hogwarts-mud-memory-synapse.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-memory-synapse.test.mjs) | 8/8 | 84.01% lines |
---
## 用例修复明细
| 修复类型 | 修复对象 | 包含用例数 | 修复后增量覆盖率 |
|:-------|:-------:|:---------:|:-------------:|
| 测试基础设施 | [Hogwarts Node test runner](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-memory-synapse.test.mjs) | 8 | 84.01% lines |
---
## 缺陷明细
暂无

## 跳过函数明细
暂无

---

# Task 9.3/9.4 单元测试结果
**执行状态**：成功；**生成耗时**：`36.9 分钟`
---
## 总体统计
**单测增量覆盖率**：`目标运行全导入文件 46.35% lines；Planner 97.20%；Synapse graph 97.60%；knowledge factory 98.51%；Relational service 91.87%`；**命中函数数**：7；**生成或维护用例数**：4；**用例通过率**：`100%`
**修复编译失败包**：0；**修复执行失败用例数**：0；**发现并修复缺陷数**：4
---
## 生成明细
| 文件名 | 执行成功数/生成或维护用例数 | 生成后行覆盖率 |
|:-------|:--------------------------:|:--------------:|
| [hogwarts-mud-knowledge-v2.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-knowledge-v2.test.mjs) | 2/2 | factory 98.51%；endpoint 50.46%；vector service 61.73% |
| [hogwarts-mud-relational-synapse.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-relational-synapse.test.mjs) | 2/2 | planner 97.20%；graph 97.60%；Relational service 91.87% |
---
## 用例修复明细
暂无

## 缺陷明细
| 函数 | 场景 | 类型 | 问题 | 修复结果 |
|:-----|:-----|:-----|:-----|:---------|
| [createConfiguredKnowledgeService](file:///Users/bytedance/sillytavern/SillyTavern/src/hogwarts-mud/knowledge-backend-factory.js#L99-L133) | 生产 `/knowledge/search` 查询 | P1 生产接线缺失 | factory 只返回 Vector service，Planner 与 Relational Synapse 从未进入真实 endpoint | factory 改为返回兼容旧生命周期 API 的 Relational facade；Qdrant 失败继续使用 JSON exact |
| [searchKnowledge](file:///Users/bytedance/sillytavern/SillyTavern/src/endpoints/hogwarts-mud.js#L673-L769) | Express 搜索携带 audience/revision/clock/nodeType | P1 权限过滤失效 | endpoint 仅传嵌套 filters，Relational 顶层约束无法读取；原始内部 diagnostics 也可能泄漏查询或错误正文 | 展开统一约束，并白名单投影 planner/backend/records/suppression diagnostics |
| [RelationalKnowledgeService.query](file:///Users/bytedance/sillytavern/SillyTavern/src/hogwarts-mud/knowledge-relational-service.js#L493-L953) | exact/vector seeds 进入两跳扩散 | P1 图检索不可达/越权 | 生产调用未提供 graphRecords，服务无法构建本地图；扩散后也缺最终 nodeType/audience hydration | 自动从 exact backend 加载受权图语料，固定最多两跳，并在融合、建图和最终返回前重复同一 hydration |
| [recordSourceRefs](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/domain/relational-synapse-retrieval.js#L69-L76) | Knowledge V2 记录缺少 provenance | P1 伪造来源 | 空 sourceRefs 被替换为 `knowledge_record` 自引用，从而产生无权威来源图边 | 删除自引用 fallback；无来源记录不入图，diagnostics 仅记录 recordId 与 suppression reason |

## 跳过函数明细
暂无

---

# Task 9.7 单元测试结果
**执行状态**：成功；**生成耗时**：`26.4 分钟`
---
## 总体统计
**单测增量覆盖率**：`archive-projection.js 25.85% lines / 50.00% branches / 63.64% functions；scene-transition.js 37.41% lines / 24.75% branches / 70.97% functions；workflow scene-transition.js 50.36% lines / 32.81% branches / 58.06% functions`；**命中函数数**：3；**生成用例数**：2（另维护 1 条 Prompt 契约用例）；**用例通过率**：`100%`
**修复编译失败包**：0；**修复执行失败用例数**：0；**发现并修复缺陷数**：2
---
## 生成明细
| 文件名 | 执行成功数/生成或维护用例数 | 生成后增量覆盖率 |
|:-------|:--------------------------:|:----------------:|
| [hogwarts-mud-memory-scene-boundary.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-memory-scene-boundary.test.mjs#L768-L908) | 1/1 | archive-projection.js 25.85% lines |
| [hogwarts-mud-narrative-authority.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-narrative-authority.test.mjs#L498-L538) | 1/1 | scene-transition.js 37.41% lines |
| [hogwarts-mud-task6-narrative-context.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-task6-narrative-context.test.mjs#L612-L649) | 1/1 | workflow scene-transition.js 50.36% lines |
---
## 用例修复明细
暂无

## 缺陷明细
| 函数 | 场景 | 类型 | 问题 | 修复结果 |
|:-----|:-----|:-----|:-----|:---------|
| [validateSceneTransitionPackage](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/domain/scene-transition.js#L1065-L1081) | Scene Opening 输出隐藏继承人、禁书承诺、关系声明和赠予 | P1 状态污染 | validator 原本只检查结构和当前物理权威，允许 Opening 创建未提交事实 | 加入 promise、secret/hidden truth、relationship mutation、Item transfer 四类确定性拒绝规则 |
| [applyCommittedSceneOpeningExperience](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/domain/archive-projection.js#L86-L242) | 已保存 Opening 同时包含安全观察和危险事实 | P1 记忆污染 | 全部 segments 被拼入 EventKnowledge，并继续写入见证者 ActorMemory | 逐 segment 过滤危险事实，只投影安全观察；无安全内容时拒绝创建 Event/Memory |

## 跳过函数明细
暂无

---

# Task 8.1 最终回归与静态门禁报告
**执行状态**：全部通过；仅 1 项环境 skip；**执行日期**：`2026-08-11`

## 验证统计
| 验证项 | 通过 | 失败 | 跳过/警告 | 结果 |
|:-------|-----:|-----:|----------:|:-----|
| 指定 10 个目标 Node test 文件 | 91 | 0 | 0 | 通过 |
| 目标文件 + Task 8 call-budget | 97 | 0 | 0 | 通过 |
| 全部 Hogwarts Node tests | 536 | 0 | 1 | 通过 |
| ESLint（133 个 dirty JS/MJS，排除无关 prototype） | 0 errors | 0 | 13 warnings | 通过 |
| `node --check`（98 个新/改业务 JS/MJS） | 98 | 0 | 0 | 通过 |
| `git diff --check` | 1 | 0 | 0 | 通过 |

全量 Node 命令：

```text
node --experimental-vm-modules --test tests/hogwarts-mud*.test.mjs
```

Node 24 需要 `--experimental-vm-modules` 才能执行现有 `vm.SourceTextModule` 契约测试。

## 本次修复
- 更新 model adapter diagnostics 测试，分别验证 `model_request` 与真实 `model_call`。
- 补齐 archive/turn 新公共函数的 helpers facade 导出与导出 SHA 金丝雀。
- 为旧 Social Director 和 Scene Transition 测试夹具补齐 `schemaOperations` 与显式 `currentIntentEn`。
- 让事件边界 medium 调用在 turn diagnostics finalize 前完成，已提交 diagnostics 正确记录 `medium=1`。
- 移除 Scene Transition 后额外的 memory-only Social Director medium 调用。
- 修复本次范围内 ESLint 缩进、重复对象键和测试全局声明错误。

## Line-limit 最终复验
`public/scripts/extensions/hogwarts-mud/index.js` 当前 599 行，已低于既有 600 行阈值。此前 3 个 line-limit 失败均已通过，全量测试无保留失败：

- `hogwarts-mud-medium-calendar-director.test.mjs`：application wiring 行数边界通过。
- `hogwarts-mud-task1-baseline.test.mjs`：strict modular file-size ratchet 通过。
- `hogwarts-mud-task6-ui-contract.test.mjs`：Task 6 composition maintenance boundary 通过。

## 未运行与跳过
- 跳过 1 项：`real Tina legacy load projects Harry Canon authority without writing the JSONL`，因为 `data/default-user/backups/chat_hogwarts_world_director_20260809-164220.jsonl` 不存在。
- 浏览器 E2E 未运行：全量命令的 `tests/hogwarts-mud*.test.mjs` glob 自然排除 `*.e2e.js` 及 `run-hogwarts-calendar-e2e.mjs`。
- 无取消、无 todo。

## 其他非本次问题
- 未跟踪原型 `prototypes/hogwarts-mud/app.js` 在全 dirty lint 探测中有 50 个 browser-global `no-undef`；该原型不属于本次业务范围，未修改。
- `hogwarts-mud-knowledge-v2.test.mjs` 保留 13 个 `playwright/no-conditional-in-test` warning，ESLint 退出码为 0。

---

# Task 8.1 单测维护结果
**执行状态**：成功；**生成耗时**：`6.2 分钟`
---
## 总体统计
**单测增量覆盖率**：`model.js 77.08% lines / 51.56% branches / 90.00% functions`；**命中函数数**：1；**维护用例数**：1；**用例通过率**：`100%`
**修复编译失败包**：0；**修复执行失败用例数**：1；**发现缺陷数**：0
---
## 生成明细
| 文件名 | 执行成功数/维护用例数 | 生成后增量覆盖率 |
|:-------|:--------------------:|:----------------:|
| [hogwarts-mud-task5-workflows.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-task5-workflows.test.mjs) | 1/1 | model.js 77.08% lines |
---
## 用例修复明细
| 修复类型 | 修复对象 | 包含用例数 | 修复后增量覆盖率 |
|:-------|:-------:|:---------:|:-------------:|
| 执行失败 | [model adapter diagnostics assertion](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-task5-workflows.test.mjs#L1826-L1956) | 1 | model.js 77.08% lines |
---
## 缺陷明细
暂无

## 跳过函数明细
暂无

---

# Task 1 单元测试结果
**执行状态**：成功；**生成耗时**：`24.0 分钟`
---
## 总体统计
**单测增量覆盖率**：`目标模块行覆盖率 91.62%-95.81%`；**命中函数数**：8；**生成用例数**：6；**用例通过率**：`100%`
**修复编译失败包**：0；**修复执行失败用例数**：0；**发现并修复缺陷数**：3
---
## 生成明细
| 文件名 | 执行成功数/生成用例数 | 生成后行覆盖率 |
|:-------|:--------------------:|:--------------:|
| [hogwarts-mud-item-system-v2.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-item-system-v2.test.mjs) | 4/4 | item-schema 91.62%；item-reducer 93.29%；item-migration 94.44% |
| [hogwarts-mud-narrative-authority.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-narrative-authority.test.mjs) | 2/2 | narrative-authority 95.81% |
---
## 用例修复明细
暂无

## 缺陷明细
| 函数 | 场景 | 类型 | 问题 | 修复结果 |
|:-----|:-----|:-----|:-----|:---------|
| [normalizeItem](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/domain/item-schema.js#L730-L921) | 羽毛笔残骸彻底消失 | 状态一致性 | destroyed 未区分残骸存在与物质缺席，旧逻辑会保留 holder/location | 已引入 physicalForm 四态并清理 absent/unknown 的物理归属 |
| [validateItemOperation](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/domain/item-reducer.js#L630-L801) | 可携带残骸 | 操作约束 | destroyed 被统一视为不可操作，残骸无法 carry/place | 已按 physicalForm 设置操作矩阵，残骸可转移但不可 equip |
| [migrateItemSystemState](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/domain/item-migration.js#L284-L374) | 旧档毁灭证据迁移 | 迁移一致性 | 迁移无法区分 vanished evidence 与残骸，并统一清理展示 | 已按确定性证据分类，模糊旧档保守迁为 remains，重复迁移零变化 |

## 跳过函数明细
暂无

---

# Task 10.3–10.4 单元测试结果
**执行状态**：成功；**生成耗时**：`14.4 分钟`
---
## 总体统计
**单测增量覆盖率**：`-`；**命中函数数**：3；**生成或维护用例数**：3；**用例通过率**：`100%`
**修复编译失败包**：0；**修复执行失败用例数**：0；**发现并修复缺陷数**：2
---
## 生成明细
| 文件名 | 执行成功数/生成或维护用例数 | 生成后增量覆盖率 |
|:-------|:--------------------------:|:----------------:|
| [hogwarts-mud-presence-contract.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-presence-contract.test.mjs) | 1/1 | - |
| [hogwarts-mud-task8-call-budget.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-task8-call-budget.test.mjs) | 1/1 | - |
| [hogwarts-mud-memory-scene-boundary.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-memory-scene-boundary.test.mjs) | 1/1 | - |
---
## 用例修复明细
暂无

## 缺陷明细
| 函数 | 场景 | 类型 | 问题 | 修复结果 |
|:-----|:-----|:-----|:-----|:---------|
| [createTurnWorkflow](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/workflows/turn.js#L49-L83) | activated Schema 参与普通回合表演后提交 Event/Appraisal | P1 来源丢失 | committed Event 契约丢弃 activation Schema ID，自反馈门禁在生产链不可达 | 仅汇总合法 participant/witness 的 sealed observer capsules，并由 Event 契约保留、Appraisal reducer 继承 |
| [ensureMemoryConsolidation](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/workflows/social-memory.js#L1357-L1550) | running/consolidating 状态保存提升 revision | P1 合法结果自 stale | guard 在状态保存前捕获旧 revision，合法 consolidation 结果被自身状态保存拒绝 | 状态保存后重新读取 head，再捕获 epoch/revision/boundary guard |

## 跳过函数明细
暂无
