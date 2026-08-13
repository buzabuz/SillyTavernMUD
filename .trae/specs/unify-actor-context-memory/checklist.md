# 验收 Checklist

关联文档：[PRD](./prd.md) · [技术 Spec](./spec.md) · [任务](./tasks.md) · [进度](./progress.md) · [Living State Contract](../hogwarts-runtime-contracts/state-fields.md)

当前 revision：`Actor Lifecycle Authority Completion · 2026-08-13`，用户已明确批准。

## 权威字段

- [x] ActorCoreV1 只有 10 个顶层字段，含唯一 `cast` 权威，稳定人物本色不由普通回合改写
- [x] ActorRuntimeV1 只有 12 个业务字段，含完整生命状态，不复制 Identity、关系、印象或记忆
- [x] 哈利和赫敏均有非占位 temperament、speech style、motive、social strategy、boundary
- [x] `privateGoalEn = Complete the committed public scene beat.` 不再成为稳定人物动机
- [x] Social Graph 是关系、声明和 evidence 的唯一权威
- [x] `actorLibrary[].socialStatements/socialRelationships` 不再写入或读取

## 人物生命周期权威

- [x] `cast.origin` 无歧义区分 foundation、Canon、预设居民、原创客串和场景临时人物
- [x] `cast.introducedClock/introducedTurn` 是首次玩家认识的唯一 Actor 权威
- [x] Actor 顶层不再存在 `source/introduced*/playerKnown/knownToPlayer`
- [x] runtime `temporary=true` 不计入永久 Story Cast
- [x] 临时人物有证据转正后 Actor ID 不变、`temporary=false`、Identity provenance ref 完整
- [x] `provisionalActorId/resolvedIdentityId/identityStatus/identityEvidenceEn/temporaryMemories` 不再持久化
- [x] Story Cast 不再读取 profile shared memory、relationship tags 或 relationship text 副本
- [x] Story Cast 的 Tina 原创客串、Canon、预设居民计数迁移前后相同
- [x] Runtime 四字段生命状态由一个 reducer 原子更新
- [x] Medium 只能提交可逆状态，High 才能首次提交不可逆状态或死亡
- [x] 永久状态经过 transition、rollback、retry、save/load 后不能复活或改写
- [x] Core 不保存生命状态副本，中文 life detail 不持久化

## 引用式记忆

- [x] 同一 Event 的事实摘要在世界权威 State 中只保存一次
- [x] 多名 witness 通过 MemoryRef 引用同一 Event，不复制摘要
- [x] subjective memory 通过 Appraisal ref 表达
- [x] ActorMemoryIndex 的 MemoryRef 不含 summary/summaryEn
- [x] 旧 shared memory 一次性转成 Event/Appraisal 引用并删除旧正文
- [x] 所有 MemoryRef、Schema support/counter refs 均可解析，无孤儿引用

## Schema 快慢通路

- [x] Person Schema 分离 factPattern、interpretation、expectation
- [x] Schema 保存 supportAppraisalIds、supportEventIds、counterAppraisalIds
- [x] Schema-only 快通路可指导行为但不能声称具体历史
- [x] Event 慢通路通过 hydration 后授权 actor-scoped callback
- [x] 反例能降低 confidence、形成 contested 或 supersede
- [x] Schema 不再持久化回写 `impressionOfPlayerEn`
- [x] 旧 impression 一次性转成 Appraisal 后删除

## 前端统一

- [x] ActorDossierViewModelV1 除 schemaVersion 外严格为 8 个业务顶层字段
- [x] NPC 检查器只消费统一 Dossier ViewModel
- [x] NPC 人物卡严格显示 6 个展示区
- [x] 初见印象与当前 Schema 分开显示
- [x] `personalityEn/speechStyleEn/publicBackgroundEn` 有可靠前端回退
- [x] 关系星图与人物卡使用同一关系标签、10 维值、Sentiment 和 evidence
- [x] 关系星图不再自行实现关系标签或 known actor 判定
- [x] player view 不泄露 privateFacts、未授权 Identity 或 NPC 私有关系
- [x] 390px、键盘焦点和 reduced-motion 行为通过验证
- [x] Dossier `current` 严格为 location/activity/intent/lifeStatus/lifeStatusDetail/presentation
- [x] 人物列表只消费 Dossier 的 actorId/header/current 子集，不再接收 raw actor/profile
- [x] player view 不暴露 cast、temporary、lifeStatusPermanent 或 lifeStatusSinceClock

## Knowledge / Qdrant

- [x] Knowledge V2 不再生成嵌入完整历史的 Actor 大聚合记录
- [x] Actor Core、Event、Appraisal、Schema、Social Evidence 独立索引
- [x] Qdrant 结果必须经过 canonical hydration
- [x] hydration 校验 revision、clock、ACL 与 sourceRefs
- [x] Qdrant 结果不能直接写世界 State
- [x] 删除 Qdrant 后前端人物卡无数据损失
- [x] exact-only 快通路与 Event ID expansion 可工作
- [x] Qdrant 重建后 record IDs、ACL、sourceRefs 稳定

## Prompt 收敛

- [x] LowTierContextV1 顶层字段严格为 6
- [x] 生产预算函数导出的 `maxPromptCharacters=298080`，最终总 Prompt 58,916 chars 未超限
- [x] 真实 Initial System 为 27,221 chars，并以此作为不得继续增长的批准硬上限
- [x] 相对旧测量 27,018 chars 的 +203 已明确接受，不修改且不作为失败
- [x] 真实运行 User Payload 为 33,294 bytes，不超过 50 KB
- [x] Initial System、output Schema、player action、current Authority Snapshot、current-scene actor capsule contract 均未裁剪
- [x] 旧 payload 重复数量为 0，且门禁要求保持为 0
- [x] 每个 actor context 不超过 4 KB
- [x] actorCards 不含完整 Social Graph、Identity knowledge、Event knowledge 或 shared memory 账本
- [x] 每 actor active Schema 最多 3 条
- [x] 慢通路每 actor Event 最多 3 条，全局最多 8 条
- [x] Performer 初次请求与 repair 使用同一版本化上下文
- [x] Context 裁剪不会重新引入 raw actor/social/history 数据
- [x] Cast lifecycle 元数据不进入 LowTier Prompt
- [x] 生命状态只在 Authority Snapshot 投影，不在 actorCards 重复
- [x] Scene Transition 只消费 bounded lifecycle projection，不注入 raw Core/Runtime
- [x] 总预算、protected 字段/section、六字段和 User Payload 50 KB 门禁均未放宽
- [x] System Prompt 整体编排明确留在后续独立项目

## 一次性迁移

- [x] `actorContextVersion=1`
- [x] `memoryReferenceVersion=2`
- [x] `actorDossierProjectionVersion=1`
- [x] 迁移不调用低、中、高档模型
- [x] 迁移不推进 turn、cursor、clock 或 Scene
- [x] 修订后的 migration 第二次运行无变化
- [x] rollback/retry/transition 后引用仍完整
- [x] 修订后的新 State 全部校验通过后才原子替换旧 State
- [x] 修订后的迁移失败时原 State 保持不变
- [x] 迁移成功后不存在旧字段双读、双写或 fallback projector
- [x] source/introduced/life/temporary identity lifecycle 可一次性无损迁移
- [x] Core/Runtime 同一生命周期语义冲突时迁移原子失败

## 质量与回归

- [x] 修订后 Actor Library 大小较 Tina 基线至少下降 50%
- [x] 修订后 Actor Runtime 大小较 Tina 基线至少下降 60%
- [x] 31 条 witness Event 文本副本降为 0
- [x] 关系标签实现从至少 2 套收敛为 1 套
- [x] 普通成功回合 low/medium/high 调用预算不增加
- [x] Tina 迁移前后玩家可见事实保持一致
- [ ] 全部 Hogwarts 自动化测试通过：649/651；Calendar overlap 与既有 2038 行文件门禁失败不属于本变更
- [x] ESLint、git diff check、模块边界测试通过
- [ ] 文件尺寸全量门禁通过：既有 `presence-witness-contract.js` 为 2038 行，门禁要求 <2000
- [x] runtime contract、state-fields、actor-memory、knowledge-runtime、README 已同步

## Memory Semantics Projection Correction

当前 revision：`Memory Semantics Projection Correction · 2026-08-13`。用户已批准 Memory V2，并确认本期不改语言。

### 权威边界

- [x] Social Evidence 只解释关系变化，不进入 Actor Memory tier
- [x] Actor Memory tier 只引用 retained Event/Appraisal
- [x] 当前稳定看法只来自 active/contested Person Schema
- [x] 不新增 `currentAppraisalRef`、profile impression 或其他当前看法副本
- [x] MemoryRef validator 同时验证引用存在与 Appraisal 语义可进入 tier
- [x] legacy 字段迁移矩阵明确 `retain/discard/project`，current impression 固定为 discard

### V2 迁移

- [x] `memoryReferenceVersion=2`
- [x] `actorMemoryIndex.version=2`
- [x] 旧 Schema cutover 不创建 `migrated_current_impression`
- [x] 现有 V1 的 migrated current-impression refs 与 Appraisals 一次性删除
- [x] firstImpression/Schema/supersede 冲突时迁移原子失败
- [x] 失败时原 State 字节不变且不保存
- [x] 第二次运行 `changed=false`
- [x] 无 V1/V2 双读、fallback projector 或长期兼容层

### 前端与 Prompt

- [x] 关系卡明确显示“印象与预期 / 关系维度 / 当前情绪 / 关系证据”
- [x] 人物卡仍严格为 6 个展示区、Dossier 仍为 8 个业务顶层字段
- [x] Social Evidence 保持 `summary || summaryEn`，Event/Appraisal 保持 `summaryEn`
- [x] 本期不修改任何语言 Schema、翻译 writer、cache 或 fallback
- [x] Tina 哈利 relation evidence 保留 3 条，recent 从 3 条变 2 条
- [x] `Glad she is focused on annoying Hermione instead.` 不再进入 Dossier、continuity 或 Prompt
- [x] Knowledge V2 不再索引 `migrated_current_impression`
- [x] Prompt 验收明确禁止 `migrated_current_impression` record/tag
- [x] LowTier 仍严格 6 字段，旧 payload 重复仍为 0
- [x] System 仍为 27,221 chars，总 Prompt <=58,916 chars，User Payload <=33,294 bytes

### 回归

- [x] Tina V1 -> V2 dry-run 不修改真实 JSONL
- [x] Memory/Dossier/Prompt/Knowledge 专项测试通过
- [x] 真实哈利 Dossier 验证关系证据标题与 record type，语言行为相对 Before 不变
- [x] monolith、全量 Hogwarts、ESLint、diff、模块边界通过或仅保留已登记无关基线
- [x] runtime contract、actor-memory、README、progress 已同步
