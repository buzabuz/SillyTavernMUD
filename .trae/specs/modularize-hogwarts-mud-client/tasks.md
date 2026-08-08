# Tasks

- [x] Task 1: 建立重构行为基线与模块守卫：在搬迁代码前锁定公开 API、初始化顺序、Prompt/Schema、迁移输出和主要 Reducer 黄金样本。
  - [x] SubTask 1.1: 记录 `helpers.js` 全量导出和 `index.js` 兼容导出，新增真实 named-import 契约测试。
  - [x] SubTask 1.2: 为初始世界、迁移、回合结算、场景转场、社交投影和 Prompt 序列化建立拆分前黄金样本。
  - [x] SubTask 1.3: 新增静态模块图、循环依赖、内部禁止导入 `helpers.js/index.js`、文件大小和顶层副作用守卫。
  - [x] SubTask 1.4: 新增浏览器模块加载与重复 `init()` 基线，断言 DOM/事件只初始化一次、模块请求均为 2xx、`pageerror` 为 0。

- [x] Task 2: 拆分 Helpers 的低耦合内核与导入工具：迁出上下文预算、JSON 恢复、Campaign/Character、翻译和 Preset/Regex 工具，同时保持兼容导出。
  - [x] SubTask 2.1: 建立 `core/context-budget.js` 与 `core/json-recovery.js`。
  - [x] SubTask 2.2: 建立 Campaign、Character 和 mandatory prompt projection 模块。
  - [x] SubTask 2.3: 建立 translation 与 preset-import 模块。
  - [x] SubTask 2.4: 更新兼容门面并运行导出契约、黄金 Prompt、JSON 恢复和导入清洗测试。

- [x] Task 3: 拆分 Helpers 的实体、人物与社交领域：迁出物品、材质、外观、人物身份/知识/记忆/选角、法术和 Social Graph。
  - [x] SubTask 3.1: 建立 inventory、material-state、appearance 和 spell-state 模块。
  - [x] SubTask 3.2: 建立 actor identity、knowledge、memory 和 cast 模块。
  - [x] SubTask 3.3: 建立 social schema、projection、migration 和 reducer 模块。
  - [x] SubTask 3.4: 让 `knowledge.js`、`relationship-graph.js` 和相关测试直接依赖真实领域模块。
  - [x] SubTask 3.5: 验证人物/社交隐私、迁移幂等、字段顺序和现有关系星图行为不变。

- [x] Task 4: 拆分 Helpers 的规则、回合、转场与空间领域并完成兼容门面：迁出 checks/time/pacing、narrative turn、scene transition 和 spatial/map 逻辑。
  - [x] SubTask 4.1: 建立 checks、time/environment、pacing/causal-collapse 模块。
  - [x] SubTask 4.2: 建立 turn protocol、validation、reducer 和 rollback 模块。
  - [x] SubTask 4.3: 建立 scene transition、world changes 和 archive projection 模块。
  - [x] SubTask 4.4: 建立 maps、pathfinding、movement 和 spatial reconciliation 模块。
  - [x] SubTask 4.5: 将 `helpers.js` 收缩为不超过 350 行的纯兼容 re-export 门面，验证旧 290 项公开 API 全部兼容。

- [x] Task 5: 拆分 Index 的 runtime、adapter 和 workflow：迁出状态访问、任务互斥、模型/知识/本地语义/翻译 adapter，以及开局、导演、室内地图、回合和转场编排。
  - [x] SubTask 5.1: 建立 runtime state ports、自动工作抑制和 job registry，保持现有互斥/去重语义。
  - [x] SubTask 5.2: 建立 model、knowledge、local semantic 和 translation adapters。
  - [x] SubTask 5.3: 迁出 opening、foundation、daily、pacing、social/memory 和 interior-map workflows。
  - [x] SubTask 5.4: 迁出 turn 与 scene-transition workflows，保持事务单写者、错误文本、fallback 和调用顺序。
  - [x] SubTask 5.5: 为成功、失败、repair、stream fallback、重试和恢复路径补充 workflow 契约测试。

- [x] Task 6: 拆分 Index 的存档与 UI，并收缩组合根：迁出存档生命周期、设置/Profile、地图/故事/Inspector/Composer 渲染及事件绑定。
  - [x] SubTask 6.1: 建立 save-library、settings/profile 和只读加载模块。
  - [x] SubTask 6.2: 建立 UI session state，禁止世界权威状态进入 UI 临时态。
  - [x] SubTask 6.3: 迁出 story、inspector、map、composer 和 setup renderer/controller。
  - [x] SubTask 6.4: 迁出 UI bindings 与 SillyTavern host event bindings，并提供可注销、可幂等注册接口。
  - [x] SubTask 6.5: 将 `index.js` 收缩为不超过 600 行的组合根，保留 `init()`、兼容 re-export 和原初始化顺序。

- [x] Task 7: 完成集成、维护文档与全量离线验收：关闭所有真实模型出口，系统验证模块化结果没有行为回归。
  - [x] SubTask 7.1: 更新内部调用方为直接领域导入，确认模块图无循环、逆层依赖或兼容门面反向依赖。
  - [x] SubTask 7.2: 更新 README 的模块地图、功能落点、依赖规则和验证命令。
  - [x] SubTask 7.3: 运行全部 Hogwarts MUD Node 测试、Social/Presence/Witness 契约、ESLint、所有新模块 `node --check` 与 `git diff --check`。
  - [x] SubTask 7.4: 浏览器验证扩展加载、存档大厅、当前 Tina 只读加载、桌面/390px UI、关系星图、人物卡与 composer。
  - [x] SubTask 7.5: 验证离线阶段远端生成、翻译、Ollama、Social Director 和聊天保存请求均为 0，Tina 档案 SHA-256 与 mtime 不变。
  - [x] SubTask 7.6: 验证 `index.js ≤ 600`、`helpers.js ≤ 350`、手写逻辑模块不超过 2,000 行且无新的 God Module。

- [x] Task 8: 执行一次真实大模型质量验收：仅在 Task 1–7 全部通过后，对可丢弃存档执行一次普通回合。
  - [x] SubTask 8.1: 创建不影响用户当前档案的专用存档，预置所有后台 director 为 ready，关闭翻译与本地模型调用。
  - [x] SubTask 8.2: 在浏览器层和一次性代理层同时设置远端生成硬预算 1，第二次尝试在到达上游前返回 429。
  - [x] SubTask 8.3: 提交一个普通非事件边界回合，确认尝试数、代理放行数、上游确认数均严格为 1。
  - [x] SubTask 8.4: 验证消息各增加一条、`turn.count +1`、状态 `idle`、时间结算一致、segments 与 transaction 通过 validator。
  - [x] SubTask 8.5: 刷新后验证状态持久一致且新增模型调用为 0；清理本次创建的可丢弃验收档案。

# Task Dependencies

- Task 2 和 Task 5 都依赖 Task 1，二者可并行执行。
- Task 3 depends on Task 2。
- Task 4 depends on Task 3。
- Task 6 depends on Task 5；Task 4 与 Task 6 可并行完成各自后半程。
- Task 7 depends on Task 1–6。
- Task 8 depends on Task 7；在此之前禁止真实远端大模型调用。

- [x] Task 9: 修复最终验收清理残留并恢复审计证据，不得重跑任何带 `HOGWARTS_REAL_MODEL_ACCEPTANCE` 的测试。
  - [x] SubTask 9.1: 从可信的原始验收附件恢复 `tests/test-results/hogwarts-mud-single-model-evidence.json`；禁止根据残留存档伪造或重新生成真实调用证据。
  - [x] SubTask 9.2: 确认 `data/default-user/backups/chat_hogwarts_world_director_20260809-000016.jsonl` 属于 runId `1786204752350-31928` 后清理该 QA 备份，并按 runId、timelineId、displayName 和文件内容扫描全部 chat、knowledge、backup 路径，残留必须为 0。
  - [x] SubTask 9.3: 让只读/模块 init Playwright 使用不会清空正式 evidence 的独立 output 目录；仅重跑离线 E2E，并再次确认 Tina SHA-256/mtime、Secret Storage 内容和 QA 残留。

- [x] Task 10: 以运行时证据修复低档现场表演连续两次无效的回归。
  - [x] SubTask 10.1: 只添加调试服务器 instrumentation，记录生成、解析、校验、repair 与结算边界，不改变业务逻辑。
  - [x] SubTask 10.2: 复现并用日志逐项确认或排除 A–E 假设，定位唯一根因。
  - [x] SubTask 10.3: 实施最小修复，保留 instrumentation，补充针对性回归测试。
  - [x] SubTask 10.4: 对比 pre-fix/post-fix 日志，确认正文提交、调用次数和状态事务恢复正常。
  - [x] SubTask 10.5: 经用户确认后停止调试服务器并删除 instrumentation、日志、env 和 debug 记录。

- [ ] Task 11: 补齐 Connection Manager 包装后的限流识别：当前 `Error('API request failed', { cause: Error('Too Many Requests') })` 未被识别为 429，stream 失败后仍会错误发起 one-shot 第二次请求；需覆盖真实包装形状并验证请求次数严格为 1。
