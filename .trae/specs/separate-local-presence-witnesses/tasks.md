# Tasks

- [x] Task 1: 建立人物分层与事件感知数据契约：实现 active interaction、local presence、cohort、perception、event knowledge 和 witness resolution 的版本化结构。
  - [x] SubTask 1.1: 明确 `actor.present` 兼容语义并新增默认状态。
  - [x] SubTask 1.2: 实现 occupant/cohort 的归一化、稳定排序、空间校验和幂等 ID。
  - [x] SubTask 1.3: 定义 perception、participant、witness、basis 与 event knowledge 的白名单 Schema。
  - [x] SubTask 1.4: 添加非法 occupant、死亡/失踪人物、群体 roster 和序列化单测。

- [x] Task 2: 编排本地后置观察与 Witness Resolver：复用现有 `/local/observe` 生成感知提案，由确定性 Reducer 计算见证者。
  - [x] SubTask 2.1: 扩展本地观察 Schema、Prompt 和 validator。
  - [x] SubTask 2.2: 保持单次 `/local/observe` 同时处理 material、actor update、event boundary 和 perception。
  - [x] SubTask 2.3: 实现 Presence Reducer，镜头轮换不删除同室 occupant。
  - [x] SubTask 2.4: 实现 Witness Resolver 和本地模型失败回退。
  - [x] SubTask 2.5: 将 participant/witness/cohort/perception 写入 turn transaction 与 event knowledge。
  - [x] SubTask 2.6: 添加课堂事故、耳语、纸条、隐蔽、相邻听觉和失败回退测试。

- [x] Task 3: 修正下游写入与知识边界：让 Social Director、人物知识、知识库和 scene archive 消费事件级 witness。
  - [x] SubTask 3.1: Social Director evidence 收集和服务端校验改用 event witness 白名单。
  - [x] SubTask 3.2: 人物知识胶囊区分 direct、witnessed、reported。
  - [x] SubTask 3.3: 重大公开事件可写同室见证者的 event knowledge，但不自动创建关系边。
  - [x] SubTask 3.4: 更新 knowledge event/scene entity IDs。
  - [x] SubTask 3.5: 更新 scene archive 的 active/local/cohort/event 字段。
  - [x] SubTask 3.6: 添加隐私、幂等、群体不全连接和知识/关系分离测试。

- [x] Task 4: 更新人物栏双层 UI：展示“当前互动人物”和折叠的“当前地点人物”。
  - [x] SubTask 4.1: 重命名现有人物区并绑定 active interaction。
  - [x] SubTask 4.2: 新增低对比 occupant 折叠区与 cohort 摘要。
  - [x] SubTask 4.3: 保持隐藏人物不泄漏、窄屏、键盘与 reduced-motion 可用。
  - [x] SubTask 4.4: 添加 DOM/投影测试与浏览器验收。

- [x] Task 5: 构建零用户大模型调用的档案迁移工具并迁移存量档案。
  - [x] SubTask 5.1: 实现 dry-run/apply/file/all/restore-manifest、备份、SHA-256 manifest 和原子写入。
  - [x] SubTask 5.2: 确定性重建高置信度 local presence、公开事件 perception 和 witness。
  - [x] SubTask 5.3: 证据不足事件保留旧 witness，不扩张、不猜测。
  - [x] SubTask 5.4: 保持正文、消息 ID、clock、cursor、关系数值、evidence ID 和共同记忆冷却不变。
  - [x] SubTask 5.5: 监视网络调用，对 Tina dry-run、apply，并确认用户模型 API 请求数为 0。
  - [x] SubTask 5.6: 验证幂等重跑与 manifest 恢复演练。

- [x] Task 6: 完成回归、实机验收和文档同步。
  - [x] SubTask 6.1: 运行全量测试、Social Contract、只读 E2E、ESLint、`node --check`、`git diff --check`。
  - [x] SubTask 6.2: 浏览器验证 Tina 课堂的双层人物 UI 与全室事件知情。
  - [x] SubTask 6.3: 验证大模型调用次数不增加，`/local/observe` 保持一次且失败不吞正文。
  - [x] SubTask 6.4: 更新 README 的写入所有权、调用工作流、感知回退和迁移命令。

# Task Dependencies

- Task 2 depends on Task 1。
- Task 3 depends on Task 1–2。
- Task 4 depends on Task 1，可与 Task 2 并行。
- Task 5 depends on Task 1 and Task 3 的稳定档案结构。
- Task 6 depends on Task 1–5。
