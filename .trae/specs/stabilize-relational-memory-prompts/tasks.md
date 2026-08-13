# Tasks

- [x] Task 1: 建立当前事实权威与 Item 物质形态
  - [x] SubTask 1.1: 添加 `physicalForm=whole|remains|absent|unknown` 的 normalize、validate、Reducer 和确定性迁移
  - [x] SubTask 1.2: 区分“损毁后仍有残骸”和“残骸彻底消失”的 evidence，修正 holder、location、presentation 与可操作性
  - [x] SubTask 1.3: 建立 `Narrative Authority Snapshot` 纯函数并接入 revision、Scene、Actor、Item、Material 和 Room 权威
  - [x] SubTask 1.4: 添加羽毛笔 `vanished entirely`、可携带残骸、旧档保守迁移和幂等测试

- [x] Task 2: 升级 Knowledge Projector V2 与检索后端契约
  - [x] SubTask 2.1: 为 actor、scene、event、clue、appraisal、schema 生成带 sourceRefs、visibility、revision、projectorVersion 和 checksum 的稳定记录
  - [x] SubTask 2.2: 为长 Scene/Event 实现稳定 chunk，并在 hydration 时抑制 superseded/current-state 冲突
  - [x] SubTask 2.3: 建立 `VectorBackend` 接口及 Fake/JSON/Vectra 兼容适配，修复索引删除后的强制全量重建
  - [x] SubTask 2.4: 实现可配置 Qdrant REST 适配、collection generation、payload 过滤、upsert/delete/query/health/rebuild
  - [x] SubTask 2.5: 扩展 Hogwarts knowledge API 的 stale revision、audience、clock、nodeType 与降级 diagnostics 测试

- [x] Task 3: 实现 Planner 与 Relational Synapse 检索
  - [x] SubTask 3.1: 实现最多 1–4 个 direct/cause/consequence/participant/pattern 子查询的本地 Planner
  - [x] SubTask 3.2: 从 Event、Social Evidence、Appraisal、Schema 和实体关系构建有 sourceRefs 的确定性邻接投影
  - [x] SubTask 3.3: 实现最多两跳的扩散激活、edge decay、fan penalty、RRF/重排与 token budget 裁剪
  - [x] SubTask 3.4: 实现 common facts 与 observer-scoped memory activation capsules，禁止跨人物知识泄漏
  - [x] SubTask 3.5: 验证 Qdrant 不可用、Planner 失败和 graph 空结果时的 exact/fallback 行为

- [x] Task 4: 建立 Appraisal 与 Person Schema 状态机
  - [x] SubTask 4.1: 定义 `memorySynapse`、Appraisal、Person Schema、状态、置信度、来源和兼容 projection Schema
  - [x] SubTask 4.2: 实现 normalize、validate、Reducer、稳定 ID、去重、supersede 和确定性旧档初始化
  - [x] SubTask 4.3: 批量接入本地观察器 Appraisal proposal，校验 observer 的 participant/witness/rumor 权限
  - [x] SubTask 4.4: 实现至少三条 Appraisal、跨至少两幕的 Schema 晋升，以及 counterevidence、contested 和 bounded active schemas
  - [x] SubTask 4.5: 将 `impressionOfPlayerEn` 改为 active Schema 的兼容投影并保留无 Schema fallback

- [x] Task 5: 迭代中档 Memory Consolidation 与 Scene boundary
  - [x] SubTask 5.1: 在现有中档 event-boundary JSON 中加入 `schemaOperations`，不增加第二次中档调用
  - [x] SubTask 5.2: 让 Scene close 在清理前消费或携带 `pendingEventBoundary`，并以 epoch/revision/boundaryId 拒绝陈旧异步提交
  - [x] SubTask 5.3: 让 Scene Opening 在提交后形成有 messageIds、sceneId、witness 的 opening experience，但禁止创建未提交世界事实
  - [x] SubTask 5.4: 在 transition actor state 中显式提交或清空 `currentIntentEn`，防止旧场景意图残留
  - [x] SubTask 5.5: 移除中档 Scene/Memory 检索中的 locked clue、secret 与 private goal 泄漏

- [x] Task 6: 迭代初级 Performer、低档 Opening 与一致性校验
  - [x] SubTask 6.1: 普通 Performer、低档 Opening 和中档 Transition 统一读取 Authority Snapshot
  - [x] SubTask 6.2: 向初级 Prompt 注入 sealed expectation、supporting events 与 counterexample，并规定“图式驱动行为、Event 支撑细节”
  - [x] SubTask 6.3: 将 raw retrieved transcript 降为有来源历史证据，确保 authority fields 和 item directives 在 context trimming 中不可被裁掉
  - [x] SubTask 6.4: 添加 Item physicalForm/holder、Actor presence/room/life、Scene destination/clock 与 Spell identity 的正文一致性 validator
  - [x] SubTask 6.5: 保证 repair 请求携带原始 authority snapshot、activation capsules 和冲突原因
  - [x] SubTask 6.6: 添加 paid/local call count、planner、backend、record、suppressed conflict 与 activation capsule diagnostics

- [x] Task 7: 修复并验证当前 Tina 档案
  - [x] SubTask 7.1: 创建只读 dry-run，复现 message 212–214 与羽毛笔 Item/Event 冲突并输出 bounded diff
  - [x] SubTask 7.2: 在 checksum、epoch、revision 和目标消息 fingerprint 全部匹配时创建备份并应用精确修复
  - [x] SubTask 7.3: 将羽毛笔修为 `destroyed + physicalForm=absent`，清理错误 holder/custody，并修正冲突的开场子句
  - [x] SubTask 7.4: 全量重建 Knowledge V2；Qdrant 配置可用时同步，否则以 `exact-only` 降级，确认旧矛盾 transcript 不再覆盖当前事实
  - [x] SubTask 7.5: 验证重复迁移 byte-stable、无额外模型调用且所有非目标 State/消息保持不变

- [x] Task 8: 完成回归、调用预算与运行时文档
  - [x] SubTask 8.1: 运行目标 Node tests、全量 Hogwarts Node tests、ESLint、`node --check` 和 `git diff --check`
  - [x] SubTask 8.2: 使用 Fake Qdrant 验证 hybrid/filter/rebuild；若本机 Qdrant 可用，再执行真实健康、同步与检索 smoke test
  - [x] SubTask 8.3: 验证普通回合零新增高/中/低调用，事件边界仍复用单次中档调用
  - [x] SubTask 8.4: 更新 Hogwarts README、runtime spec、state-fields、Item/Actor Memory/Knowledge 契约与迁移说明

# Task Dependencies

- Task 1、Task 2 和 Task 4 的 Schema/纯函数部分可以并行。
- Task 3 depends on Task 2 的 Knowledge V2 与 VectorBackend 接口，并读取 Task 4 的 Appraisal/Schema 契约。
- Task 5 depends on Task 4；Scene boundary 修复可与 Task 2 并行。
- Task 6 depends on Task 1、Task 3、Task 4 和 Task 5 的稳定 projection。
- Task 7 depends on Task 1、Task 2 和 Task 6，并必须在任何真实档案写入前完成 dry-run。
- Task 8 depends on Task 1–7。

- [x] Task 9: 修复系统化 checklist 审计发现的生产接线缺口
  - [x] SubTask 9.1: 将 Authority Snapshot 接入中档 Memory Consolidation，并验证统一事实优先级
  - [x] SubTask 9.2: 从当前 Scene 物理投影排除 `physicalForm=absent` Item，并保留非 absent Item 的形态字段
  - [x] SubTask 9.3: 将 Planner 与 Relational Synapse 接入生产 knowledge search，四条检索路径统一执行 audience/actor-knowledge hydration
  - [x] SubTask 9.4: 禁止缺少权威 sourceRefs 的图边，并拒绝由同一 Schema/capsule 反馈生成的 Appraisal 证据
  - [x] SubTask 9.5: 将 active Person Schema 兼容投影回 actor `impressionOfPlayerEn`
  - [x] SubTask 9.6: 接入一次本地 post-turn batched Appraisal proposal，并记录 local 调用及 Appraisal/Schema 校验 diagnostics
  - [x] SubTask 9.7: 阻止 Scene Opening experience 将未提交承诺、关系或隐藏事实写入 Event/Actor Memory
  - [x] SubTask 9.8: 消除全量测试的环境性 skip，使用确定性 fixture 或现有 guarded backup 完成 legacy-load 验证
  - [x] SubTask 9.9: 重跑目标、全量、静态检查并重新核验全部 checklist

# Additional Dependencies

- Task 9.3 depends on Task 2 和 Task 3。
- Task 9.5、Task 9.6 depend on Task 4 和 Task 5。
- Task 9.9 depends on Task 9.1–9.8。

- [x] Task 10: 修复第二轮 checklist 生产链复审缺口
  - [x] SubTask 10.1: 将普通回合 present/addressed NPC audience 传入生产检索，并在 actor capsule 前再次执行 actor-knowledge 过滤
  - [x] SubTask 10.2: 移除中档 Daily、Pacing、Calendar 的 author/locked-clue 权限，仅 dedicated high-tier 可读取锁定事实
  - [x] SubTask 10.3: 将 activation Schema provenance 写入 committed Event/Appraisal 来源，确保自反馈门禁在生产链可达
  - [x] SubTask 10.4: 修正 Memory Consolidation guard 的 revision 捕获时序，避免 running/consolidating 状态保存让合法结果自行 stale
  - [x] SubTask 10.5: 以权威结构化 Scene 状态生成 Opening experience，禁止自由文本同义改写绕过承诺、秘密、关系和 Item transfer 门禁
  - [x] SubTask 10.6: 验证真实 diagnostics 生产路径；旧 V1 档案不回填，但新回合必须生成有界 V2 diagnostics
  - [x] SubTask 10.7: 重跑全量、静态检查并第三次核验全部 checklist

# Task 10 Dependencies

- Task 10.1、10.2 depend on Task 9.3。
- Task 10.3、10.4 depend on Task 9.4–9.6。
- Task 10.7 depends on Task 10.1–10.6。

- [x] Task 11: 修复最终 checklist 审计发现的 carried boundary 消费缺口
  - [x] SubTask 11.1: 修正 Scene close 携带 `pendingEventBoundary` 后的 review 基准，确保后续回合可重新触发并消费
  - [x] SubTask 11.2: 添加 Scene close 生产组合回归，覆盖 carried boundary、后续回合触发和 stale guard
  - [x] SubTask 11.3: 重跑目标、全量、静态检查并重新核验 checklist 第 30 项

# Task 11 Dependencies

- Task 11 depends on Task 5.2 和 Task 10.4。

- [x] Task 12: 修复 checklist 34/35 的 actor-scoped supporting Event provenance 生产约束
  - [x] SubTask 12.1: 明确并接入 Prompt 输出契约，要求具体历史声明绑定当前 actor 可访问的 supporting Event provenance，禁止 narrator 或其他 NPC 消费私有 Event
  - [x] SubTask 12.2: 实现确定性 validation/repair，识别缺失、错配或越权 provenance 的历史声明并拒绝或修复
  - [x] SubTask 12.3: 添加生产链测试，覆盖合法 actor 引用、narrator 越权、其他 NPC 越权及确定性 repair

# Task 12 Dependencies

- Task 12 depends on Task 3.4、Task 6.2、Task 6.5 和 Task 10.1。

- [x] Task 13: 修复 checklist 37 的权威一致性 validator 叙事覆盖缺口
  - [x] SubTask 13.1: 将权威一致性 validator 覆盖到 narration、dialogue 及其他可陈述世界事实的叙事 segment
  - [x] SubTask 13.2: 保留并确定性识别明确标注的历史、假设与信念陈述例外，避免将其误判为当前世界事实
  - [x] SubTask 13.3: 添加生产链测试，覆盖各类叙事 segment 的权威冲突拒绝及历史/假设/信念例外

# Task 13 Dependencies

- Task 13 depends on Task 1.3、Task 6.4、Task 6.5 和 Task 12。

- [x] Task 14: 修复最终对抗式审计边界绕过
  - [x] SubTask 14.1: 第三人称或无显式 `remember`/`yesterday` 标记的具体旧事也必须携带 provenance
  - [x] SubTask 14.2: 将历史、信念、假设与尝试例外限制在子句作用域，不能豁免同句中的当前事实
  - [x] SubTask 14.3: 移除中档 Daily、Pacing、Calendar 中的 `privateGoalEn`、`secretEn`、hidden/active story arcs 等不可访问字段，仅 dedicated high-tier 可读取
  - [x] SubTask 14.4: context trimming 必须保留 Performer/Opening repair 的 original request、snapshot、capsules、conflict、historicalClaims 和 sourceEventIds
  - [x] SubTask 14.5: 执行对抗探针、全量测试、静态检查与 checklist 复审

# Task 14 Dependencies

- Task 14.1 depends on Task 12。
- Task 14.2 depends on Task 13。
- Task 14.3 depends on Task 10.2。
- Task 14.4 depends on Task 6.3 和 Task 6.5。
- Task 14.5 depends on Task 14.1–14.4。

- [x] Task 15: 修复 narrative-memory-provenance 历史动作与地点语义误判
  - [x] SubTask 15.1: 收紧泛化 `...ed` historical detection，同时继续识别 `hid`、`put`、`taught`、`cast` 等明确第三人称旧事并要求 actor-scoped provenance
  - [x] SubTask 15.2: 拆分地点语义与 provenance 最小回归，允许相邻地点与 `closed doors` 引用，拒绝与结构化 room 冲突的当前房间断言，并拒绝 narrator/Ron 无 provenance 的第三人称旧事
  - [x] SubTask 15.3: 重跑 provenance/authority/scene transition 目标测试、全量触发的单文件测试、ESLint、`node --check` 与 `git diff --check`

# Task 15 Dependencies

- Task 15.1 depends on Task 14.1。
- Task 15.2 depends on Task 13.1 和 Task 15.1。
- Task 15.3 depends on Task 15.1–15.2。
- Authority `while` 子句仍由 Task 17 处理，不属于 Task 15。

- [x] Task 16: 修复 Event ACL 投影并验证生产 hydration
  - [x] SubTask 16.1: 修正 Knowledge V2 Event visibility 投影，仅显式 public 事件公开；否则只允许显式 participants、witnesses 与 authorized rumor actor，禁止自动加入 player，并将无 witness/无 public 标志事件保守锁定
  - [x] SubTask 16.2: 添加生产 projector 到 search/hydration 回归，覆盖 Hermione-only 对 player/Ron 不可见、Hermione 可见、explicit public 可见及 authorized rumor 可见
  - [x] SubTask 16.3: 验证 Appraisal、Schema、secret/private goal ACL 不回归，并运行 knowledge/relational/secret isolation 目标测试、ESLint、`node --check` 与 `git diff --check`
  - [x] SubTask 16.4: 重跑最终全量测试并重新核验 checklist

# Task 16 Dependencies

- Task 16.1 depends on Task 2.1 和 Task 9.3。
- Task 16.2 depends on Task 16.1。
- Task 16.3 depends on Task 16.1–16.2。
- Task 16.4 depends on Task 16.1–16.3。

- [x] Task 17: 修复 `while` clause-scoped exception 的当前事实继承绕过
  - [x] SubTask 17.1: 扩展 narrative-authority clause segmentation/scope，使 `while` 后续显式当前事实不继承 remember/belief/history/hypothesis/attempt 例外，同时保留合法纯历史从句
  - [x] SubTask 17.2: 添加 Vanished Quill `while` 混合句对抗测试与合法纯历史回归
  - [x] SubTask 17.3: 执行目标测试、全量 Hogwarts Node tests、ESLint、`node --check`、`git diff --check` 与最终 checklist 复审

# Task 17 Dependencies

- Task 17.1 depends on Task 14.2。
- Task 17.2 depends on Task 17.1。
- Task 17.3 depends on Task 17.1–17.2。

- [x] Task 18: 将缺失 visibility 的 Knowledge V2 记录默认 fail-closed locked
  - [x] SubTask 18.1: 统一 Knowledge V2 normalize、backend 与 hydration 契约，使缺失或不可识别的 `visibility` 保守归一为 locked，禁止隐式 public
  - [x] SubTask 18.2: 添加 API 与对抗回归，覆盖缺失/非法 visibility、backend round-trip、hydration audience 隔离，并确认显式 public 记录仍可访问
  - [x] SubTask 18.3: 执行 Knowledge V2/backend/API/hydration 目标测试、全量测试、静态检查与最终 checklist 复审

# Task 18 Dependencies

- Task 18.1 depends on Task 2.1、Task 2.3、Task 9.3 和 Task 16.1。
- Task 18.2 depends on Task 18.1。
- Task 18.3 depends on Task 18.1–18.2。

- [x] Task 19: 校验 `while/whereas` 后无 `now` 标记的现在时当前事实
  - [x] SubTask 19.1: 扩展 clause-scoped authority 判定，使 `while/whereas` 后无 `now` 标记的现在时当前事实仍独立校验，同时放行纯历史过去时从句
  - [x] SubTask 19.2: 添加混合时态、隐式现在时、`while/whereas` 变体与合法纯历史过去时从句的对抗回归
  - [x] SubTask 19.3: 执行 authority/provenance 目标测试、全量 Hogwarts Node tests、ESLint、`node --check`、`git diff --check` 与最终 checklist 复审

# Task 19 Dependencies

- Task 19.1 depends on Task 14.2 和 Task 17.1。
- Task 19.2 depends on Task 19.1。
- Task 19.3 depends on Task 19.1–19.2。

- [x] Task 20: 强化 historical claim 与 supporting Event 的确定性证据锚点
  - [x] SubTask 20.1: 从共享证据锚点中排除具体历史动作的 actor/person 主语 token，禁止仅人物名支撑无关旧事
  - [x] SubTask 20.2: 添加 `hid|put|taught|cast` 的无关 Event 拒绝矩阵与匹配 Event 正向矩阵
  - [x] SubTask 20.3: 执行 provenance 目标测试、对抗矩阵、全量 Hogwarts Node tests 与全部静态门禁

# Task 20 Dependencies

- Task 20 depends on Task 12、Task 14.1 和 Task 15.1。

- [x] Task 21: 执行 Round6 验收精度校正与最终复审
  - [x] SubTask 21.1: 校正 Task 7.4 的验收文案，明确全量重建 Knowledge V2；Qdrant 配置可用时同步，否则以 `exact-only` 降级
  - [x] SubTask 21.2: 确认在正确 VM 上运行全量 Hogwarts Node tests，并记录可核验的通过证据
  - [x] SubTask 21.3: 补齐 ESLint、`node --check`、`git diff --check` 及适用的模块尺寸静态门禁，并记录可核验证据
  - [x] SubTask 21.4: 基于正确 VM 全量测试与静态门禁证据执行最终复审，确认 Task 7.4、manifest `exactOnly=true` 与真实 Qdrant 配置状态表述一致

# Task 21 Dependencies

- Task 21.2 和 Task 21.3 depend on Task 21.1。
- Task 21.4 depends on Task 21.2–21.3。

- [x] Task 22: 完成本机 Qdrant 真实部署与 Tina Knowledge V2 同步
  - [x] SubTask 22.1: 获取 Qdrant `v1.19.0` macOS arm64 官方原生二进制，在解包/执行前校验 SHA-256 `4e279a80cc1ebe73e859318ff86375af54c123887dd7ae46605c0eb6cb7c44e8`，并核对二进制报告版本
  - [x] SubTask 22.2: 配置用户级 LaunchAgent，验证登录自启动、异常恢复、仅监听 `127.0.0.1`，并将 `storage` 与 `snapshots` 指向显式持久化路径
  - [x] SubTask 22.3: 通过项目真实 embedding 路径探测 model 标识与 dimension，成功后写入 Qdrant endpoint、collection generation 和 embedding 项目配置，拒绝猜测维度与提交凭据
  - [x] SubTask 22.4: 从 Tina 权威 State + chat 全量 rebuild Knowledge V2，向真实 Qdrant upsert，并以已知 sourceRefs 执行真实 query，核对 generation、点数、失败数且确认权威档案未变化
  - [x] SubTask 22.5: 使用服务端 payload filter 完成 public、actor-private、locked/unauthorized ACL smoke；重启 LaunchAgent 后复验 health、环回绑定、points、真实 snapshot 与授权查询持久化
  - [x] SubTask 22.6: 运行 Qdrant 真实同步及 exact/fallback 回归，记录可复现命令与验收证据，并更新本机部署、配置、备份恢复和“Qdrant 非权威投影”文档

# Task 22 Dependencies

- Task 22.3 depends on Task 22.1–22.2。
- Task 22.4 depends on Task 22.3。
- Task 22.5 depends on Task 22.4。
- Task 22.6 depends on Task 22.1–22.5。
