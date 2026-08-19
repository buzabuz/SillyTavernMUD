# Hogwarts Validator Governance Checklist

## Phase 1 Product Boundary

- [x] Regex owns only character-level or finite-grammar shape.
- [x] Regex is forbidden from inferring natural-language meaning.
- [x] Embedding owns candidate recall/ranking only.
- [x] Embedding cannot establish truth, authority or State.
- [x] Local small models own bounded semantic interpretation.
- [x] Paid large models own player-facing narrative正文, not State settlement.
- [x] Deterministic code owns Schema, IDs, references, provenance, ACL,
  arithmetic and legal transitions.
- [x] Reducers remain sole atomic State writers.

## Phase 1 Complete Registry

- [x] Both Hogwarts production JS roots are scanned with Acorn.
- [x] Exactly 578 regex constructions are registered.
- [x] Registry IDs are unique.
- [x] Source fingerprint is
  `6927d5e1ba93d5ae6114741adc181da818fb0206beae0861d87f4457e21836a5`.
- [x] Exactly 355 rows are `accepted_lexical`.
- [x] Exactly 195 rows are `semantic_runtime`.
- [x] Exactly 26 rows are `semantic_migration`.
- [x] Exactly 2 rows are `dead_or_retired`.
- [x] Exactly 0 rows are `unclassified`.
- [x] Every row has a rationale, target owner, deterministic owner and Phase 2
  action.
- [x] The fourteen owner totals reconcile to all 578 rows.
- [x] The twelve semantic owner totals reconcile to all 221 violations.
- [x] The rejected broad file-level classifier is removed.
- [x] The exact 54-row re-review correction is registered.

## Phase 1 Only-Decrease Gate

- [x] `regex-semantic-baseline.json` freezes all 221 semantic IDs and owners.
- [x] `regex-semantic-retirements.json` starts empty and is append-only.
- [x] Manifest, baseline and retirement-ledger bytes plus event count are
  anchored in the reviewed enforcement script.
- [x] Persisted manifest metadata and every source identity field are compared
  against the AST scan.
- [x] A new semantic ID fails enforcement.
- [x] Relabelling a baseline semantic ID as lexical fails enforcement.
- [x] Changing a baseline semantic/deterministic owner fails enforcement.
- [x] An unclassified new row fails enforcement.
- [x] A semantic disappearance without a retirement event fails.
- [x] A retired semantic ID reappearing in any category fails.
- [x] Automatic broad-file classification is deleted, not retained as a
  fallback.
- [x] Positive `--require-classified` verification passes.
- [x] Synthetic negative gate verification covers stale/forged metadata,
  lexical/rationale history, file tamper, deletion and resurrection.

## Phase 1 Scope Guard

- [x] Runtime field impact is explicitly `None`.
- [x] Prompt impact is explicitly `None`.
- [x] Frontend whitelist is explicitly `None`.
- [x] No production/runtime code is intentionally changed.
- [x] No Prompt, Schema, validator, Reducer or migration behavior is
  intentionally changed.
- [x] No model order, concurrency, context, residency or call count is
  intentionally changed.
- [x] No save or archive is intentionally changed.
- [x] No model request is required for Phase 1.
- [x] Final scoped Git diff proves governance-only files; no production,
  runtime, test or save path changes.
- [x] Product Spec registry and all five governed artifacts agree on the
  accepted Phase 1 and current Phase 2 research-gate status.

## Permanent Cross-Mechanism Registry

- [x] JSON and Markdown responsibility tables are retained.
- [x] Current model-output domains and semantic owners have stable `VCON-*`
  rows.
- [x] Regex remains shape-only and Embedding remains retrieval-only.
- [x] Planned Inventory, Spell and Identity rows remain explicitly
  unapproved.
- [x] Permanent Skill requires every future system to update its own row.
- [x] Every future gameplay system must add a new domain-named focused test
  file; unrelated existing tests cannot substitute.
- [x] Owning tests must cover successful Reducer settlement, rejection with no
  State write, hypothetical/no-op semantics, no semantic fallback and
  normal/worst call budgets.
- [x] Central registry scripts and generic registry self-tests are removed.
- [x] Registry scope changes no production/runtime/Prompt/Schema/State/model
  call or test behavior.

## Phase 2 Registered Gates

- [x] 固定 PM 已确认本期只治理即时回合的既有生产字段、调用链和语义 Regex 债务；
  未接入的 Identity 外貌、Presentation、Item/魔法生命周期字段继续留在独立 TODO。
- [x] 每个矩阵行都有权威 State 字段、用户工作流、相邻领域边界、正常/失败/无变化
  结果和唯一结算 authority；任何一行都不能只因 Regex 或现有 task 恰好提到而纳入。
- [ ] 每个会影响玩家回合的活跃领域都有“看到付费正文时间”和“最终 State 时间”的
  集成测量。只有公式或只测 post-chain 的证据不能支持完整回合或低内存声明。
- [x] Check 禁止使用 `4B` 升级或积累等待；提案不足时本回合不结算 Check State。
- [x] Knowledge/ACL 的检索计划、候选排序、canonical hydration 和权限判断均为
  确定性流程；`1.7B`、`4B` 和低档大模型不能授予、拒绝或新增知识。
- [ ] Appraisal、Social、Memory、宏观 Pacing、世界事实、线索和隐藏 Story Arc
  均未使用本 PRD 的模型调用、积累队列或 Reducer 发生行为变化。
- [x] Concurrency and merge report is incorporated into PRD Section 9.
- [x] Two-model parallel residency is rejected for low-memory support.
- [x] Giant merged 1.7B validation is rejected.
- [x] Target order is registered as
  `pre -> post -> optional dynamic 4B -> optional destroy micro -> Reducers`.
- [x] One loaded-model slot and serial execution are the registered proposal.
- [x] Benchmark-only Identity is integrated into the dynamic 4B Schema.
- [x] Dynamic route is derived only from independent structured
  paid/directive/pre-turn signals.
- [x] Full route plus Identity/Inventory/Spell/post matrix reaches 100%
  across five seeds, including negative participant assertions.
- [x] Fresh independent acceptance attempt 3 verifies the complete
  benchmark-only research gate and records `740/800` raw versus `800/800`
  post-guard checks.
- [x] Maximum measured prompt plus output is `1673/2048` tokens.
- [x] Worst-case three-domain peak is one loaded model and 3.04 GB Ollama RSS
  on the 36 GB M3 Pro.
- [x] Accepted Identity contract is integrated into the exact production
  Prompt/Schema/validator chain without ordinary-turn cutover.
- [x] Fresh context-free blind production-chain acceptance passes.
  See
  [phase2-production-identity-blind-report-attempt-2.md](./acceptance/phase2-production-identity-blind-report-attempt-2.md).
- [x] Fresh independent project-goal Agent accepts the complete
  `HVG-P2-01` production tranche.
  See
  [phase2-production-identity-independent-report-attempt-4.md](./acceptance/phase2-production-identity-independent-report-attempt-4.md).
- [ ] Final call-chain cutover is complete before physical 8 GB validation.
- [ ] 当前生产效果达到可接受的正例召回；最新真实模型抽查中 pre-turn 为 `4/6`、
  post Inventory 路由为 `1/2`、shared dynamic 为 `2/4`，存在 Item 放置、
  Calendar 承诺漏写；历史 progression 漏写在 Revision 18 通过删除该重复分类器
  解决，不再作为 1B 门槛。见
  [phase2-current-effect-audit.json](./acceptance/phase2-current-effect-audit.json)。
- [x] Revision 12 的 48 pre + 48 post cases 在修改 Prompt 前冻结，覆盖 Calendar、
  progression、Check target、time、Item route、Actor、Event boundary 和 temporal，
  且至少 `30%` 为不参与调优的中英混合 holdout。
- [x] 最终 pre scoped diff 仅修改 pre Prompt composition/output order、已批准的
  deterministic duration grammar、真实 builder 测量和领域测试；Schema 字段集合、
  guards、Reducers、State 字段、4B Prompt 和调用图不变。post 调优仍是独立 blocker。
- [ ] Item route、Actor、Material、temporal claim 与后台 Event 的每个当前正例
  家族 State recall `>=95%`，任何硬门槛家族不得低于 `90%`；不得用聚合总分
  遮盖单域失败。潜行/
  抵抗 Check 不设正例 recall 硬门槛：无 proposal 必须 no-write，且不得升级到
  4B 或 Regex 补猜。明确时长分钟换算单独验收 `100%`。Calendar prefixed-date
  漏判是独立 TODO，不得伪装成 pass。
- [x] 未通过门槛的实验 Prompt 已从 production request builder 撤回；当前 pre/post
  System Prompt 和 post `4096` context 恢复，focused rollback regression
  `31/31`。失败证据见
  [人类可读失败报告](./acceptance/phase2-1b-state-recall-prompt-tuning-failed.md)。
- [x] 用户已确认：明确时长动作由模型提出 evidence，分钟换算由确定性代码承担；
  潜行/抵抗 Check 不设模型正例召回硬门槛。该决定仅写入 PRD，尚未改变生产
  Schema、guards 或 Reducer。
- [x] `qwen3:4b` 仅通过 benchmark `modelOverride` 跑 frozen 48-case holdout；
  结果为动作正例 `5/9`、Actor 正例 `2/3`、pre `17/24` 超时或 Schema 失败，
  因此 production pre/post 默认模型未变。见
  [4B holdout experiment](./acceptance/phase2-4b-pre-post-holdout-experiment.md)。
- [x] Revision 14 固定 PM 初审与技术复核均为 `PASS`：NPC 离场与 Event 边界是
  明确命名的部分能力；Event 仍是长互动的叙事呼吸口，个人离场不再是其前置或结果。
- [x] 明确 NPC 离场在 Event 仍开启时独立结算；Event 结束而无人离场时不得改
  Actor/Interaction/Presence；无明确离场证据不得写离场。实现不得改变
  `pendingEventBoundary`、Memory/Social 节奏、Scene/Calendar/Map、witness、
  EventKnowledge、模型次数或 State 字段。
- [x] 用户已显式批准 Revision 15 实施范围：确定性文字时长、潜行/抵抗 TODO、
  NPC 离场解耦和完成后的 1.7B 实验报告。
- [x] 潜行/抵抗已登记为 `HVG-P2-03R-CHECK-TODO`；当前无 proposal/no-write、
  无额外 4B、无 Regex fallback 的生产行为不变。
- [x] 确定性文字时长 grammar 已由用户确认；不得让 holdout 用例代替产品范围。
- [x] Revision 16 产品边界已确认：latest committed 10-turn window、现有
  pending-boundary/next-intent 下游、`locationKnown=false`、分钟最小单位和
  `10,080` 分钟上限。
- [x] paid `signals.eventEnded`、post `eventBoundary` 和 turn immediate Event
  writer 全部删除；历史字段只读保留。
- [x] `local_event_boundary_observer` 仅在 committed turns `10/20/30/...` 后台运行，
  每 checkpoint 一次、恰好 10 个 committed turns、无 retry/fallback、当前回合不 await。
- [x] Background `ended=true` 仅写既有 pending boundary 并触发既有下游；不得写
  EventKnowledge/witness、关闭 Scene、完成 Calendar 或移动 NPC。
- [x] `ActorRuntimeV1.locationKnown=false` 清空陈旧 map/room 并移出 active/local
  presence；spatial reconciliation 不得把 unknown 修回玩家房间。
- [x] Model transport 不再要求 `elapsedMinutes` 算术；exact-duration parser 对批准
  grammar `100%`，包括英文连字符整数；数字范围继续拒绝，不支持项回 ordinary
  fallback 且不 clamp。
- [x] Revision 17 产品边界已确认：标签唤醒、current/prior-departed guide
  candidates、地点优先级、15 分钟 failed turn、正文明确失败。
- [x] 用户以“现在开始”显式批准同步后的 Revision 17 PRD、Spec、tasks、
  checklist；实施按单一 active task 顺序进行。
- [x] 明确 room 标签完全绕过 movement semantic proposal；可达/current/locked/
  unreachable 结果 `100%` 为 `moved/already_there/failed`。
- [x] 只有 unresolved 跟随标签进入现有 pre 1B 的 `movementIntent`；无标签、
  假设、引用和普通散文不产生 movement outcome。
- [x] guide/room/evidence 全部来自 supplied bounded candidates；旧 departure、
  invented ID、多房间冲突和无逐字 evidence 均产生 deterministic failure。
- [x] `movementOutcome` 是唯一 committed 结果；failed/already 保持玩家位置和
  `spatial.lastMovement`，failed/semantic failure 均提交普通 15 分钟回合。
- [x] Low Prompt 只使用既有 protected `playerTurn.movementResolution`；失败事实
  明确写出 attempt/reason/remaining room，缺失时只 prepend 确定性事实，任何 paid
  segment 不删除、不改写。
- [x] pre/Low scoped representative-save build-only 在修改前后通过；room/Actor
  authority 不重复，完整 output Schema/JSON 不截断；记录 tokens、p50/p95。
- [x] follow-NPC production matrix 正例 recall `19/20 = 95%`、负例 `10/10`；
  错误位置写入为零；每例一次
  pre 请求，无 retry、4B、provider 或 semantic Regex fallback。
- [ ] 可丢弃真实回合覆盖 known guide、unknown destination、locked route、
  already-there 和 pre failure，并检查可见正文与 committed transaction。
- [ ] 所有 negative/hypothetical/quoted/no-change cases 最终错误 State 写入为零；
  accepted stable Actor ID 正确率 `100%`。
- [x] pre/post 每次仍各一次请求，dynamic 仍为 `0/1`；自动 retry、repair、
  provider fallback 和 semantic Regex fallback 均为零。
- [x] Fresh context-free blind run 对每个最终 Prompt 只给一次原始响应，不提供
  期望答案、错误反馈或第二轮修复。
  见 [Revision 17 blind model report](./acceptance/phase2-revision17-blind-model-report.md)。
- [x] 用户显式批准 Revision 18，固定 PM 返回 `PASS`：pre 1B 不再判断
  `progression`，且不以 Regex、代码、4B 或额外 paid call 替代。
- [x] pre Zod/transport/Prompt/fallback/guard/diagnostics/result 中不存在
  `progression`。
- [x] paid input 不存在 `explicitProgressionRequest`；paid output/protocol 不存在
  `completedRequestedStep` 或 `unconfirmed_requested_progression`。
- [x] paid System Prompt 仅新增一条已批准规则：合法时在当前响应完成玩家明确要求
  的即时具体步骤，不得停在准备阶段。
- [x] paid `sceneProgression.type + summaryEn` 和 15 分钟具体推进合同继续通过；
  它只总结正文实际结果，不成为 State authority。
- [x] active benchmark 删除 progression 家族和硬门槛；历史 Revision 12 cases/
  reports 保持只读证据。
- [x] ordinary pre 不注入无关 follow-NPC 规则；只有 `movementContext` 存在时才
  注入完整 movement supplement。调用次数、Schema 字段集合和 State writer 不变。
- [x] Revision 19 按用户明确决定把日期/时间前置的中文 Calendar 漏判移入稳定
  TODO；旧矩阵 `12/12` 不作为 fresh pass，失败时 Calendar 不写，且无 fallback。
  见
  [人类可读 pre 报告](./acceptance/phase2-revision18-final-pre-report.md)。
- [x] 当前 pre production candidate 上线范围固定为
  `temporal/check/calendarCommitment/movementIntent`；`progression` 及 paid
  自证字段保持删除；Calendar TODO 不阻塞 pre 的 movement/time 上线。
- [x] Revision 19 固定 PM 初审和生产调用链复核均为 `PASS`；现有
  `materialEvents -> materialEventLog` 明确纳入 post 保留范围，不新增 Material
  字段、语义、调用或 writer。
- [ ] post Inventory route 正例 `>=95%`、负例 `100%`；route 只唤醒现有 shared
  dynamic 4B，本身不写 Item，失败时正文保留且 Item State 不变。
- [ ] post Actor activity/presence/location 正例 `>=95%`，所有 mention、
  hypothetical、quoted、injury-only 和 named no-change 反例 `100%` no-write；
  accepted Actor ID `100%`，unknown departure 写 `locationKnown=false`。
- [ ] post Material 正负例通过现有 evidence/transition guard 和 Material reducer；
  不删除 live path，不新增 Presentation/Material 生命周期语义。
- [ ] post temporal claim 正例 `>=95%`、负例 `100%`；claim 只作正文时间 guard，
  不直接写 clock/Calendar。
- [ ] post perception 继续通过现有 participant/witness/evidence/ACL guard；模型
  或 guard 失败使用既有 deterministic fallback，不触发第二次语义请求。
- [ ] post exact production request 仍为一次 qwen3:1.7b、`num_ctx=4096`；
  dynamic `0/1`、serial residency、retry/repair/provider/semantic Regex fallback
  均不变，immediate Event 字段保持不存在。
- [x] Revision 19 第一轮 post 实验已按 family 记录，所有未达标 Prompt/Schema
  candidate 已从 production request builder 撤回；不得把 focused 单域
  `Item 2/2 / Actor 6/6 / Material 5/6 / temporal 4/4` 当作合并 post pass。
  见
  [post 人类可读报告](./acceptance/phase2-revision19-post-round-report.md)。
- [ ] post Schema/task composition 获得后续明确批准；当前单一复合请求的 family
  失败由 HTD-014 阻塞，不得私自增加调用、切换模型、缩业务覆盖或让 paid
  proposal 成为 State authority。
- [x] 用户已批准 Revision 20 产品方向：structured candidate wake-up + one
  dynamic Schema；Regex 永远不得直接理解语义；先写 PRD，再实验并产出报告。
- [x] Revision 20 replacement fixed PM 完整初审与 production-informed follow-up
  均为 `PASS`；Material/Inventory/Actor/perception/temporal 完整覆盖，无 Event/
  excluded-domain 偷渡。
- [x] PRD 明确 candidate membership != semantic truth、candidate miss != false、
  paid proposal != State authority、finite shape != assertion。
- [x] stable ID、paid structured proposal、Item directive、segment role/type、
  finite temporal shape、exact name/alias、map/room ID 仅作候选召回/约束。
- [x] 禁止用离开/赠送/损坏/引用/否定/假设/伤势/no-change 等自然语言 Regex
  决定 domain、truth、enactment 或 State proposal。
- [x] 动态 Schema 仍只有一次 post qwen3:1.7b；perception always present，
  Material/Inventory route/Actor/temporal 仅按 candidate group 组合；mixed turn
  使用候选领域并集。
- [x] CandidateWakeV1 只含 domain、sourceKinds/sourceRefs、segment indices 和
  supplied Actor/Item/room IDs；不含 `changed/departed/completed/asserted` 等
  语义结果。
- [x] 当前 Revision 20 PRD/Spec/tasks/checklist 获得显式 artifact approval；
  在此之前不得运行候选实验或编辑 production post contract。
- [x] fresh exploration corpus 由无 prior cases/known failures 上下文的 Agent
  生成并冻结；首次揭示后只能作为 development，不得作为 blind acceptance。
- [ ] final candidate request/hash 在 blind corpus 生成前冻结；第二个 fresh Agent
  不读取旧/开发 case，自行生成并 one-shot 执行中文/英文/混合 cases。
- [x] Revision 19 及更早矩阵只作 non-scoring regression；未进入 candidate
  selection 或 acceptance 分子/分母。
- [ ] Candidate recall 每个 promised family positive `>=95%`、negative `100%`；
  candidate miss 显性失败，不能解释为 semantic false。
- [ ] Fresh post 1B 每个 family positive `>=95%`、negative/no-change `100%`；
  mixed-domain case 每个相关 family 同时通过，accepted IDs/sourceRefs `100%`。
- [x] 执行的 A/B/C 每例 post model calls=`1`、retry/repair/provider/semantic
  Regex fallback=`0`、serial；D 因缺真实 paid candidate field 未用 oracle 运行。
- [ ] 最终可选 candidate 每例 dynamic=`0/1`、最多一个本地模型驻留；本次没有
  candidate 通过 development，因此未进入 dynamic 4B/blind。
- [x] 模型/Schema/candidate failure 的实验未调用 Reducer commit、未写真实
  save/chat/Knowledge/archive；productionWrites=`0`。
- [x] 人类可读报告按 candidate source 和 post family 分列改善/失败、tokens、
  p50/p95、上线障碍；旧矩阵未作为报告入口。
- [x] Revision 20 development 结论为 REJECT/BLOCKED：A/B Material recall `0/13`；
  C parse/transport failure `26/48`；所有执行 branch mixed complete pass `0/8`。
- [x] Blind 未运行是门禁行为：没有 development candidate 满足 candidate/family
  门槛，禁止用新的 blind corpus继续调参或把 blind 变成 development。
- [ ] 后续若研究 D，必须先单独批准 paid transient `postCandidateKinds` 合同和
  paid tokens/error budget；不得从 expected answer 生成 oracle candidates。
- [x] Fresh independent read-only research review 逐项核对 PRD-first、fresh
  corpus、无 semantic Regex、candidate miss 计分、one-call、结果数字、D 无
  oracle、blind stop gate 和 productionWrites=0，结论 `PASS`。
  见
  [independent research review](./acceptance/phase2-revision20-independent-research-review.md)。
- [x] 外部架构调研固定 PM 初审将能力限定为“现有 Immediate Turn post 语义提案
  架构研究”，完整覆盖 Material、Inventory route、Actor/Presence、perception、
  temporal、mixed、no-change 和 failure；未恢复 immediate Event 或排除领域。
- [x] 外部调研核对 TripPy/TripPy-R、SPLAT、DIET、OneIE、GLiNER2、
  When2Call/OOS、UIE/ChunkUIE、router/cascade、constrained decoding 和蒸馏的
  一手资料、适用范围与公开指标。
- [x] 外部报告显式列出 Revision 20 perception positive `0/44`、negative `0/4`，
  不再只汇报 Material/Inventory/Actor/temporal。
- [x] 推荐方向只为 research：compact shared encoder + per-family
  no-update/operation/span/ID heads；同一事实可同时产生 Material proposal 与
  Inventory route，existing guards/Reducers 保持唯一权威。
- [x] constrained JSON 只修 shape；routing 只选 expert；cascade/retry 与当前
  one-attempt 冲突；GLiNER2 公开结果不构成 Hogwarts `>=95%` 或 8GB 证明。
- [x] 外部调研未运行 Hogwarts 模型实验，未改 production Prompt/Schema/call、
  endpoint、State、save、chat、Knowledge、TranslationTable 或 UI session。
- [x] `VCON-013` 已对齐真实 writer fields 并移除只读 `cohorts[]`；
  `local_post_core_1_7b` JSON/Markdown 均覆盖五家族；`VCON-018` 保持
  `planned_unapproved`；`VCON-027` 为 `implemented_acceptance_pending`。
- [x] 用户最新 Revision 21 决定明确替代外部研究报告中“新 prototype 仍需
  per-family >=95%”的旧建议：本轮只采用严格 Pareto “比 current baseline 强”；
  historical report 不改写为当前权威。
  见
  [external architecture research](./acceptance/phase2-post-external-architecture-research.md)。
- [x] 第一次 fresh independent review 发现玩家结果顺序、resident-model 门禁和
  registry 冲突披露缺口；修正后由另一个 fresh reviewer 完整重跑并返回 `PASS`。
  见
  [external research independent review](./acceptance/phase2-post-external-architecture-independent-review.md)。
- [x] Revision 21 fixed PM 完整初审和修后 production-informed follow-up 均为
  `PASS`；能力名称限定为 existing post five-family semantic-proposal comparison。
- [x] `VCON-028` 已登记为 `planned_unapproved` research-only contract：无
  runtime task、无 writer、无 State refs、每 case 一次 serial forward、最多一个
  resident model。
- [x] Revision 21 PRD/Spec 明确只使用 off-the-shelf
  `fastino/gliner2-base-v1`，不 fine-tuning/LoRA/adapter/distillation。
- [x] Pareto gate 明确：五家族 positive 不下降；negative/no-change 不下降；
  false writes 不增加；至少一个失败家族和 mixed completeness 严格改善。
- [x] unsupported/missing family/field/evidence/ID、parse/model/guard failure 均
  计失败，不得由 adapter 默认补齐或解释为 no-change。
- [x] 同一事实的 Material proposal 与 Inventory route 可同时成立，任一遗漏均为
  mixed 不完整。
- [x] Revision 21 旧/已见矩阵只作 non-scoring diagnostic；Schema/label/
  adapter/scorer 必须在 fresh corpus 生成前冻结，揭示后修改即作废整份 corpus。
- [x] current baseline 明确为未改动的 Revision 19 safe production post
  `qwen3:1.7b`，不是 Revision 20 分支。
- [x] GLiNER2 使用 isolated Python environment；不得修改 Node dependency、
  production endpoint、Prompt/Schema、model task 或 call graph。
- [x] 当前 Revision 21 PRD/Spec/tasks/checklist 已获用户显式 artifact approval；
  在此之前不得安装依赖、下载模型、生成 corpus 或运行任一模型。
- [x] `gliner2[local]==1.3.2` 与 `fastino/gliner2-base-v1` 已在临时 Python
  3.11 环境成功
  安装/下载/哈希；失败时 blocked，不调用 cloud API 或替换模型。
- [x] combined schema、canonical text projection、inference bridge、detached
  adapter/scorer 和 focused no-write test 在 corpus reveal 前冻结并哈希。
- [x] replacement fresh Agent 无 prior cases/reports/known failures context；
  第一份 corpus 因 mixed 2/3 family 计数错误整体作废且未运行模型；第二份 corpus 覆盖五
  family、全部 Material kinds、hard negatives、Material+Inventory、双/三/五域
  mixed、English/中文/mixed action 和最多 16 Actors。
- [x] baseline 与 GLiNER2 对同一 fresh case 各精确一次、serial、最多一个本地
  model resident；dynamic 4B=`0`；retry/repair/provider/semantic Regex=`0`。
- [x] 现有 guard 语义只在 detached clone 上运行；Reducer commit、endpoint、
  State/save/chat/Knowledge/TranslationTable/UI writes 全部为 `0`。
- [x] 报告按 family/mixed/no-change 分列 baseline 与 GLiNER2，aggregate、parse、
  latency 或 memory 不能补偿任一家族回退。
- [x] 记录 package/model bytes、cold/warm load、peak RSS、per-case p50/p95、
  one-forward proof、input length、truncation=`0`、模型可用后网络请求=`0`。
- [x] 对比结果为 `not eligible for trial review`；任何真实试玩仍需
  后续单独 PRD revision 和用户显式批准。
- [x] Fresh independent acceptance attempt 1 从原始目标完整复核并返回 `FAIL`：
  invalid candidate 被错误计为 negative safe、baseline 未保留 raw result、
  `VCON-028` 指向不存在文件、freeze 缺 immutable commit。
  见
  [attempt 1](./acceptance/phase2-revision21-independent-acceptance-attempt-1.md)。
- [x] Corrected scorer 明确让 rejected Material/Actor/temporal candidate 失败，
  baseline 记录 raw/adopted/guarded 三层，`VCON-028` 指向真实 artifacts。
- [x] Attempt 2 freeze artifacts 已在 fresh corpus 生成前进入独立 local Git
  commit；corpus/results/report 不得进入该 freeze commit。
- [x] Attempt 1 corpus/results/report 只保留为 failed historical evidence，没有
  在修 scorer 后重算。
- [x] Attempt 2 使用新的 context-free corpus author、新 corpus 和两分支各一次，
  未使用 attempt 1 corpus 重跑。
- [x] Attempt 2 fresh independent acceptance 返回 `FAIL`：production guard
  reject 仍可能计为 negative-safe；findings 已持久化。
  见
  [attempt 2](./acceptance/phase2-revision21-independent-acceptance-attempt-2.md)。
- [x] 用户明确要求“不要重算”；attempt 3 在 freeze commit/corpus/model scoring
  前终止并清理，不再追求 independent `PASS`。
- [x] 最终报告只保留可信的 positive/mixed、延迟、调用/写入和 no-trial 结论；
  exact negative-safe metrics 明确标为未通过验收。
  见
  [final report](./acceptance/phase2-revision21-gliner2-zero-shot-final-report.md)。
- [x] Revision 22 fixed PM 初审与 production-informed review 均为 `PASS`：
  scope 只为 `temporalClaims-only GLiNER2 zero-shot schema-ablation
  diagnostic`，不恢复 zero-shot GLiNER2 trial。
- [x] Revision 22 combined/temporal-only descriptors、runner 和 raw-output
  report format 在 fresh corpus 生成前冻结；runner 在同一 Python process 中只加载一次
  checkpoint，并依次执行 combined、temporal-only 两个 branch。
- [x] 新 temporal-only corpus 不含任何 prior cases/known failures context；
  combined/temporal-only 分支各精确一次 serial forward，raw schema/input/output
  全部记录。单模型初始化、顺序、20 次 forward、零 retry/State/4B write 已在
  [raw result](./benchmarks/rev22-gliner2-temporal-schema-ablation-results.json) 中保留。
- [x] detached temporal guards 没有写 clock/Calendar；model/guard failure 仅列入
  diagnostics，不 retry/repair/fallback。独立 reviewer 指出两个 guard 的当前内容
  仅由结果中的 SHA-256 锚定，未收录于 freeze commit；因此 guarded score 仅为本次
  raw diagnostic 附属证据，不作为可独立复现的 promotion/acceptance 数字。
- [x] 短报告逐例列出 raw Schema、canonical input、raw extraction 与 guarded
  temporal result，并只输出 improved/same/worse/indeterminate。见
  [Revision 22 report](./acceptance/phase2-revision22-gliner2-temporal-schema-ablation-report.md)。
- [x] Revision 23 replacement fixed PM 初审与 production-informed review 均为
  `PASS`：scope 只为 `temporal-only Qwen-with-raw-GLiNER2-hints research
  comparison`，不改变 VCON-013 或恢复 GLiNER2 trial。
- [x] Revision 23 Qwen temporal-only System/Schema/options、GLiNER raw-hint
  envelope、runner 与 raw report format 在 fresh corpus 生成前冻结；Qwen A/B
  的 canonical source byte-identical，唯一变量是 B 的 raw hint envelope。修正后的
  runner/test freeze 为 `ec62df70f884526e1d49159794d42addad6dd2c9`。
- [x] 每 fresh case 精确运行 one GLiNER forward、one Qwen A、one Qwen B；
  GLiNER failure 仍不跳过 Qwen B；所有 calls serial、最多一个 resident model、
  no retry/repair/fallback/State/4B/production call。Captured result 为
  `10 / 10 / 10` calls、`0` branch error、`0` production/State/retry/4B write。
  Benchmark 自身会写临时 input/output 和 result/report artifacts。
- [x] 短报告逐例列出 canonical source、GLiNER prompt-equivalent Schema/raw
  output、两条 Qwen literal System/User/format/options request、raw output/error
  和 detached guard result；只输出 improved/same/worse/indeterminate。见
  [Revision 23 report](./acceptance/phase2-revision23-qwen-temporal-gliner-hint-report.md)。
  Independent review 确认 raw A/B evidence 与 summary，但不将 corpus/report 的
  post-freeze provenance 或 current guard hashes 视为 production acceptance。
- [x] Revision 24 replacement fixed PM 确认的 partial scope 只覆盖 Revision
  21-23 GLiNER2 conclusion 与 actor activity/presence/room/locationKnown、
  transient temporal claims 的 low-resource research；Material、Inventory、
  perception、Event、Knowledge、UI、saves、clock、Calendar 及 VCON-013 均不变。
- [x] Revision 24 使用公开论文、官方模型卡和官方文档复核 compact
  encoder multi-head、TripPy/SPLAT slot-span-pointer、OneIE/DyGIE++ joint IE、
  NuExtract、PP-UIE、SetFit/SpanMarker；报告明确这些不等同于 Hogwarts
  current-fact/no-update State semantics。
- [x] PRD 新增【GLiNER2 真不行】章节，汇总 Revision 21 无 family/mixed
  improvement、Revision 22 `0/10` temporal ablation 和 Revision 23 Qwen
  `4/10 -> 2/10` raw-hint regression；未重述未获独立接受的 exact
  negative-safe metrics。
- [x] Revision 24 没有下载候选模型、生成训练数据、运行模型、增加 VCON、
  production call、State/save/chat/Knowledge/UI write 或改变现有
  guards/Reducers。见
  [small-model research](./acceptance/phase2-revision24-small-model-extraction-research.md)。
- [x] Fresh independent read-only review returned `PASS`: GLiNER2 rejection
  remains zero-shot/project-specific; extraction span and current-fact semantics
  stay separate; candidate roles remain research-only; recent relation-extraction
  preprint is direction evidence rather than a Hogwarts performance guarantee.
- [x] Revision 25 fixed-PM initial discovery and production-informed recheck both
  pass for the exact partial capability `VCON-013 post-turn semantic-provider
  selection`: Low slot default, explicit Local override, timeline persistence
  and no cross-provider fallback.
- [x] Revision 25 artifact is explicitly approved before implementation:
  fine-tuning is deferred; Low uses the existing Low Profile; no fourth Profile,
  no Low/local dual request, no retry/repair/fallback and no synthetic
  perception after selected-provider failure.
- [x] `postTurnSemanticProvider` normalizes missing/invalid values to `low`,
  persists with active timeline model settings and does not alter gameplay
  facts, Medium/High roles, Profile secrets or provider configuration.
- [x] VCON-013 and model task registry rename the executor-neutral task, allow
  only `low|local`, retain one serial call, preserve existing five-family
  semantics/writers, and declare no fallback/semantic Regex.
- [x] Low and Local branches consume the one shared post System Prompt/JSON
  Schema/canonical source and one shared server settlement/adoption/guard path;
  Low never applies a Regex Preset.
- [x] Settings UI adds an accessible localized finite executor selector, shows
  Low Profile technical detail only in configuration, persists selection after
  reload and registers the new control under SETTINGS dynamic-field ownership.
- [ ] Focused tests, browser settings acceptance, prompt budget evidence,
  selected-source call capture, provider-failure no-write proof, fresh blind
  one-shot simulation and independent acceptance all pass.

Revision 25 implementation evidence:

- [Focused provider contract test](../../../tests/hogwarts-mud-post-provider-selection.test.mjs)
- [Settings browser evidence](./acceptance/revision25-settings-browser.md)
- [Prompt measurement](./acceptance/revision25-post-provider-prompt-measurement.md)
- [Runtime transport probes](./acceptance/revision25-provider-runtime-probes.md)
- [Blind one-shot simulation](./acceptance/revision25-post-blind-simulation.md)
- [Independent acceptance attempt 1](./acceptance/revision25-independent-acceptance-attempt1.md)
- [Independent acceptance attempt 2](./acceptance/revision25-independent-acceptance-attempt2.md)
- [Independent acceptance attempt 4](./acceptance/revision25-independent-acceptance-attempt4.md)
- [ ] 可丢弃真实存档完成 Calendar promise/question、即时具体步骤 action/discussion、
  Item placement/hypothetical、Actor/Event no-change 和 mixed-turn State before/after。
- [ ] 调优后 State `158/158` 与 Knowledge/ACL `28/28` 不下降；真实 Tina
  actor-scoped Event 回捞保持不变。
- [x] 每条 PM 确认属于即时回合范围的 runtime/migration 语义 Regex 都在物理
  8 GB 验证前退休；排除领域的行继续登记，不得被伪装为已退休。
- [ ] The exact final integrated candidate passes on a physical 8 GB machine
  with SillyTavern and normal browser load.
- [x] No low-memory/8 GB support claim is made before that physical pass.
- [x] Revision 11 即时回合 PRD/Spec、PM 范围门禁和执行顺序已获用户显式批准；
  授权仅包括既有生产链的 `HVG-P2-03/04/G3`，不包括 Social、Appraisal、Memory、
  Pacing、世界事实、线索、Story Arc、Opening、Translation 或延后字段。
- [x] Revision 12 的 1.7B State-recall Prompt 调优方案已获用户显式实施批准；
  在此之前不得编辑 `PRE_TURN_SYSTEM` 或 `POST_TURN_SYSTEM`。
- [x] 每条即时回合 runtime/migration 语义 Regex 均已物理删除/替换并附 retirement
  event；非即时领域的行保持登记。
- [x] 即时回合路径不保留语义 Regex fallback、override 或 repair。
- [x] No automatic model retry, repair or provider fallback is introduced in
  `HVG-P2-01`.
- [ ] 正式 single-model E2E harness 的零付费 preflight 通过，且 QA chat、backup、
  settings、secrets 与 Tina archive 清理/恢复验证通过；fresh independent
  acceptance 发现旧 Task 8 QA residue，必须重新核验。
- [ ] 最终 fresh-context blind simulation 全部通过。既有 post-turn temporal 与
  existing-Item 证据保留；最终 pre-turn Prompt 的第二次 fresh 16-case 因中文
  日期前置 Calendar 正例失败，当前不得宣称 pre blind pass。每项仍为一次调用且
  无 retry。
- [ ] 全量 Hogwarts 测试通过；当前为 `755/757`，仅剩明确排除域的 Scene
  Transition Prompt 超预算和 Memory locked Event projection 两项红灯。
- [ ] 正式可丢弃存档 G3 必须从真实正文 DOM 可见到最终持久 State；旧
  `40,437 ms / 55,817 ms` marker 分别落在状态卡调度和持久化前，只能作为失败
  诊断，不能作为验收。
- [ ] `state_settled` 后刷新不得再改变持久 State；当前 Spell lifecycle 在刷新时
  将 `lastScannedMessageId 216 -> 218` 并提交 `stateRevision 160 -> 161`，因此
  最终 State 门禁失败。

## Phase 3 Registered Gates

- [x] Scope is narrowed to paid large-model player-facing narrative正文.
- [x]正文 must remain visible even when State settlement fails.
- [x] Only the State proposal may be rejected.
- [x] Rejected正文 cannot enter State, Prompt, Knowledge or retrieval
  authority.
- [x] No automatic retry or regex semantic fallback is allowed.
- [x] Once ledger evidence exists, repair is forward-only.
- [x] Internal structured Director JSON is not silently included.
- [ ] Phase 3 persistence, API, runtime field, UI and localization contracts
  are decision-complete.
- [ ] Phase 3 has separate explicit user approval.

## Phase 1 Acceptance

- [x] Independent acceptance attempt 1 failed and its findings are persisted.
- [x] Attempt 1 classification and monotonicity findings are corrected.
- [x] Independent acceptance attempt 2 failed and its findings are persisted.
- [x] Attempt 2 classification, stale-row and tamper findings are corrected.
- [x] Independent acceptance attempt 3 failed and its findings are persisted.
- [x] Attempt 3 full-identity and mutable-history findings are corrected.
- [x] Independent acceptance attempt 4 failed and its findings are persisted.
- [x] Attempt 4 uncalled narrative-presence filter finding is corrected.
- [x] Independent acceptance attempt 5 passes every Phase 1 criterion.
- [x] PRD criterion-by-criterion audit passes.
- [x] A new fresh independent read-only Agent verifies the complete Phase 1
  goal after all corrections.
- [x] Phase 1 presentation is complete and implementation stops before Phase
  2.

## Closeout

- [ ] Technical-debt self-audit is recorded for the last authorized phase.
- [ ] Change Ledger row and counters are correct.
- [ ] User records `reinventory` or `defer` for this core change.
- [ ] Product Spec registry reflects final accepted status.
