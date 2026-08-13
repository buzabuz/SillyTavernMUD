# Tasks

关联文档：[PRD](./prd.md) · [技术 Spec](./spec.md) · [验收 Checklist](./checklist.md) · [进度](./progress.md) · [Living State Contract](../hogwarts-runtime-contracts/state-fields.md)

- [x] Task 1: 建立字段统一基线与版本化 Schema
  - [x] SubTask 1.1: 添加 ActorCoreV1、ActorRuntimeV1、ActorMemoryIndexV1 与 MemoryRefV1 的 normalize/validate/project API
  - [x] SubTask 1.2: 添加 `actorContextVersion`、`memoryReferenceVersion`、`actorDossierProjectionVersion`
  - [x] SubTask 1.3: 添加 Tina fixture 的当前体积、字段数和重复事实基线测试

- [x] Task 2: 一次性统一世界人物数据
  - [x] 将当前存档一次性转换为 Actor Core、Actor Runtime、Actor Memory Index、Event/Appraisal refs
  - [x] 删除 profile Social 副本、旧 impression、shared memory 正文和 runtime 稳定副本
  - [x] 新 State 全量校验通过后原子替换；失败保持原 State

- [x] Task 3: 完成 Schema 快慢通路
  - [x] Schema 保存事实模式、解释、期望、支持 Event、反例和修订链
  - [x] 快通路只给 expectation；慢通路按需 hydration Event
  - [x] 无 Event 时禁止具体历史，反例可降低或修订 Schema

- [x] Task 4: 统一人物前端
  - [x] 建立 8 字段 ActorDossierViewModel 和唯一关系投影
  - [x] NPC 人物卡收敛为 6 个展示区
  - [x] 人物卡与关系星图复用同一字段、ACL 和标签

- [x] Task 5: 统一 Knowledge/Qdrant 与低档上下文
  - [x] Qdrant 只索引独立 canonical records，删除 Actor 历史聚合
  - [x] 检索结果经 recordId/sourceRefs hydration
  - [x] 低档 User Payload 收敛为 6 字段、<=50 KB、单 actor <=4 KB

- [x] Task 6: 补全人物生命周期权威（completed）
  - [x] 6.1: ActorCoreV1 增加严格 `cast`，迁移 source/introduced 字段并删除旧副本
  - [x] 6.2: ActorRuntimeV1 增加完整四字段生命状态与不可逆校验
  - [x] 6.3: 临时人物继续使用稳定 ID；转正写 Identity provenance ref 并删除 provisional/resolved 副本
  - [x] 6.4: 更新 state-fields、runtime contracts、README 与严格 Schema 测试

- [x] Task 7: 切换全部生命周期 reader/writer（completed）
  - [x] 7.1: Story Cast 改读 Core cast + Runtime temporary + Social/Memory 权威
  - [x] 7.2: People/Appearance/关系入口改用统一人物可见性与 Dossier 投影
  - [x] 7.3: Calendar、Pacing、transition、rollback/retry 改读写新生命周期权威
  - [x] 7.4: 删除旧 source/introduced/known/identity-status/life 副本读写，不加 fallback

- [x] Task 8: 收敛前端与 Prompt 生命周期投影（completed）
  - [x] 8.1: Dossier 保持 8 个业务顶层字段，current 收敛为 6 个字段
  - [x] 8.2: 人物列表只复用 Dossier 的 actorId/header/current 子集
  - [x] 8.3: LowTier 保持严格 6 字段；Cast 元数据不进 Prompt，生命状态只进 Authority Snapshot
  - [x] 8.4: Scene Transition 使用 bounded lifecycle projection，不注入 raw Core/Runtime

- [x] Task 9: 完成原子迁移与系统验收（completed；两项无关基线失败见 progress）
  - [x] 9.1: Tina dry-run 验证 cast、临时转正与生命状态迁移前后语义一致
  - [x] 9.2: 验证不可逆死亡、可逆伤势、rollback/retry/transition/save-load
  - [x] 9.3: 复测真实 Prompt、前端白名单、调用预算和零旧 payload
  - [x] 9.4: 运行全部 Hogwarts 测试、ESLint、diff check、模块边界、文件尺寸与非 Calendar E2E
  - [x] 9.5: 同步最终 checklist/progress/runtime contracts/README

- [x] Task 10: 审计人物侧边栏记忆语义（completed）
  - [x] 10.1: 用 Tina 当前存档证明顶部三条来自 Social Evidence，底部三条来自 Actor Memory
  - [x] 10.2: 证明 `migrated_current_impression` 被错误写入 recent 并进入 continuity Prompt
  - [x] 10.3: 记录 Before/After、V2 原子迁移、前端白名单和 Prompt 负增量预算

- [x] Task 11: 实施 Memory Reference V2（completed）
  - [x] 11.1: 旧 Schema 直接 cutover 时丢弃 mutable current impression，不创建 Appraisal/MemoryRef
  - [x] 11.2: V1 -> V2 原子删除 `migrated_current_impression` refs/Appraisals，冲突时失败
  - [x] 11.3: 更新 lifecycle、Schema、validator、Knowledge rebuild 与严格迁移测试
  - [x] 11.4: 不增加双读、fallback projector 或 `currentAppraisalRef`

- [x] Task 12: 修正 Dossier 分组并完成验收（completed；两项无关基线失败保留）
  - [x] 12.1: 关系卡增加四个子标题，关系证据与人物记忆保持独立
  - [x] 12.2: 保持各 Store 现有语言字段与 fallback，不修改翻译链
  - [x] 12.3: Tina Dossier/Prompt/Knowledge build-only 验证错误 current impression 数量为 0
  - [x] 12.4: 运行专项、monolith、全量 Hogwarts、ESLint、diff 与 Prompt 门禁
  - [x] 12.5: 同步 runtime contract、README、checklist 和 progress

# Task Dependencies

- Task 2 depends on Task 1.
- Task 3 depends on Task 2.
- Task 4 depends on Task 2 and Task 3.
- Task 5 depends on Task 2 and Task 3.
- Task 6 depends on Tasks 1-5 and explicit approval of the lifecycle-authority revision.
- Task 7 depends on Task 6.
- Task 8 depends on Tasks 6-7.
- Task 9 depends on Tasks 6-8.
- Task 11 depends on Task 10 and explicit approval of `Memory Semantics Projection Correction`.
- Task 12 depends on Task 11.

# Parallel Work

- Tasks 4 and 5 may run in parallel after Tasks 2-3.
- Task 7 的 Story Cast、frontend visibility、Calendar/life reader 可按不重叠文件并行。
