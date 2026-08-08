
## Round 1

- 完成 6 项任务与 23 项验收：三层人物状态、单次本地感知观察、确定性 Witness Resolver、事件知识、下游知识边界、双层人物 UI 和离线档案迁移。
- 修复 active cast 被误用为物理在场/见证者，以及 390px 人物栏 Grid 溢出；Tina 课堂事故现包含 8 名已知见证者和稳定 cohort。
- 关键决策：本地小模型只提议 perception，最终 witness 由 Reducer 计算；事件知识不自动修改关系；存量迁移纯确定性且用户模型 API 调用为 0。
- 变更覆盖 presence/witness 契约、本地语义观察、回合结算、Social Director、人物胶囊、knowledge、scene archive、人物 UI、迁移 CLI、README、测试及 Tina 当前档案；自动化共 228/228，390px Playwright 1/1。
