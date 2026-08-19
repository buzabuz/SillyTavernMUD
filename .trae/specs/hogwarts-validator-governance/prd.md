# Hogwarts Validator Governance PRD

## 1. Change ID and Status

- Change ID: `hogwarts-validator-governance`
- Artifact revision: `25-post-low-provider-selection`
- Status: Phase 1 治理基线和仅基准性质的 Phase 2 Identity 研究门禁已独立
  验收；跨机制责任表已建立；`HVG-P2-01` 仅作为窄范围的伤势观察端口独立
  验收。Revision 11 将剩余 Phase 2 收紧为既有即时回合生产路径切换与迁移语义
  Regex 退休；固定 PM 已确认该窄范围，用户已授权继续 `HVG-P2-03`、`HVG-P2-04`
  和端到端延迟测量。未接入的 Identity/Presentation/生命周期字段仍在独立 TODO，
  不属于本期生产工作。`HVG-P2-04` 已完成；fresh independent acceptance 证明
  `HVG-P2-03` 尚未满足正文保留、单次共享 dynamic 4B 与精确 context 合同，已退回
  并在 Revision 12 因 State recall Prompt-only 门槛失败进入 `blocked`。正式 G3
  既使用了错误的正文可见 marker，刷新后又触发被排除的
  Spell lifecycle migration，因此保持 `blocked`。用户随后明确取消 post/shared
  dynamic 的硬 `2048` 目标，要求质量优先；两条生产路径使用完整规则和 `4096`
  context。Revision 12 已纳入真实效果报告，并拟定仅调整既有 pre/post 1.7B
  Prompt 的 State recall 方案。用户已批准实施，但 Prompt-only 调优未达到各业务
  家族 `>=95%` 的验收线；实验 Prompt 已全部撤回，现有生产 Prompt 保持原样。
  `HVG-P2-03R-PRE/POST/ACCEPT` 均 blocked。Revision 13 记录了用户批准的
  “显式文字时长由代码换算”与“潜行/抵抗不设模型召回硬门槛”两个产品决定，但尚未
  授权其生产实现。相同 frozen holdout 上的 `qwen3:4b` pre/post 直换实验也已失败：
  Actor 正例 `2/3`、动作正例 `5/9`、pre `17/24` 超时或 Schema 失败，因此不授权
  把生产 pre/post 更换为 4B。Revision 14 已确认 NPC 个人离场必须与 Event 边界
  解耦：Event 继续是长互动的叙事呼吸口；个人离场只由该 NPC 的明确正文证据结算。
  Revision 16 已由用户确认产品边界：Event 移出即时回合并由后台 `qwen3:1.7b`
  每 10 个已提交回合审查该批最近 10 回合；精确文字时长由确定性代码换算；NPC
  未知目的地离场写显式 unknown location。Revision 17 进一步纳入玩家点击/标签
  移动、无目的地跟随 NPC，以及移动失败必须成为当前回合明确事实的完整闭环。
  固定 PM 初审与生产复核均已通过，用户已显式批准 Revision 17；movement、
  duration、departure 已完成，background Event 已实现并等待 blind/final acceptance。
  Revision 18 删除不写 State、只重复理解玩家动作的 pre 1B `progression` 提案，
  改由 paid System Prompt 的一条短规则直接要求合法的即时步骤在本次正文中完成；
  paid `sceneProgression` 仍只记录正文实际推进结果。固定 PM 复核通过，用户已显式
  批准文档与生产实现；该减法已完成，真实 pre holdout `48/48` 均返回完整 JSON，
  movement 保持 `19/20`。Revision 19 按用户明确决定将日期/时间前置的中文
  Calendar 承诺漏判登记为独立 TODO，不再阻塞当前 pre 上线；这不是通过声明，
  失败时 Calendar State 仍保持不变，且不得用 Regex、4B、retry 或 fallback
  补猜。当前 pre 的 progression 减法、确定性时长和 movement 已进入 production
  candidate；post 的既有 Inventory route、Material、Actor/Presence、perception
  与 temporal claim 已完成第一轮实验。合并候选均未达到 per-family 门槛并已
  撤回。Revision 20 已获用户产品范围批准：探索“结构化候选唤醒 + 单次动态组合
  Schema”，但 Regex 永远不得直接理解语义，旧/已见矩阵只能回归诊断，不能作为
  选型或验收证据。固定 PM 初审和生产复核均为 `PASS`。fresh development
  已完成：A/B 无法召回无结构化来源的 Material，C 的 Material always-on 导致
  大量非法 JSON，D 缺真实 paid candidate field 且禁止 oracle。没有 candidate
  进入 blind 或 production；Revision 20 research blocked。
  外部架构调研和独立复核均已完成。Revision 21 按用户最新决定只研究
  开箱即用 `fastino/gliner2-base-v1`，不 fine-tuning；验收从旧的逐家族
  `>=95%` 改为同一全新冻结语料上的严格 Pareto “比现状强”。固定 PM 初审与
  production-informed follow-up 均为 `PASS`，责任注册表已对齐并新增
  research-only `VCON-028`。用户已批准当前 artifacts。Attempt 1 的实质结果
  拒绝 GLiNER2，但 fresh independent acceptance 发现 scorer、baseline raw
  evidence 和 immutable freeze proof 缺口，因此 exact family metrics 无效。
  Corrected attempt 2 使用 freeze commit 和新 corpus 完成：无 positive-family
  或 mixed 改善，Inventory/Actor recall 与 Material/Inventory/Actor/temporal
  no-change 安全退步，因此结果仍为 `not eligible for trial review`。第二次
  independent acceptance 确认 no-trial 结论，但 exact negative-safe metrics
  仍有 scorer 缺口；用户明确停止重算。最终报告不使用这些精确数字，Revision 19
  production contract 始终不变。Revision 22 的 temporal-only GLiNER2 诊断显示
  schema 收窄可以降低推理时间，但没有形成正确 temporal claim。Revision 23 只研究
  GLiNER2 的 raw temporal hints 是否能帮助同一 `qwen3:1.7b` 做 temporal-only
  判断；结果为 baseline `4/10` semantic exact、hinted `2/10`，因此不复活
  GLiNER2 trial，不改变 production 的 full post request。Revision 24 汇总
  Revision 21-23 为“GLiNER2 真不行”的明确产品结论，并研究小型训练式
  encoder/structured-extraction alternatives。Revision 25 根据用户最新决定封存
  fine-tuning，改为由可选择的 Low Connection Profile 稳定执行一次既有 post
  proposal；用户可显式改回 Local。该 production revision 已获用户明确批准，
  当前进入实现与验收。
  本 PRD 仍不授权修复 Spell lifecycle、增加其他模型调用或用 Regex/
  确定性代码猜测自然语言语义。
- Change kind: `governance`
- Feature delta: `0`
- Core change: `yes`

Current authority and evidence:

- [Technical spec](./spec.md)
- [Tasks](./tasks.md)
- [Checklist](./checklist.md)
- [Progress](./progress.md)
- [Regex row registry](./regex-classification.json)
- [Immutable semantic-regex baseline](./regex-semantic-baseline.json)
- [Regex inventory](./regex-inventory.md)
- [Semantic ownership plan](./semantic-ownership-plan.md)
- [Permanent validation responsibility registry](../../skills/hogwarts-change-governance/VALIDATION_RESPONSIBILITY_REGISTRY.json)
- [Human validation responsibility table](../../skills/hogwarts-change-governance/VALIDATION_RESPONSIBILITY_REGISTRY.md)
- [Ollama concurrency and merge report](./ollama-concurrency-merge-report.md)
- [4B pre/post holdout experiment](./acceptance/phase2-4b-pre-post-holdout-experiment.md)
- [Phase 2 Identity independent acceptance](./acceptance/phase2-identity-research-report-attempt-3.md)
- [Runtime field contract](../hogwarts-runtime-contracts/state-fields.md)

Historical Revision 4 response-ledger documents remain research evidence only.
They are not Phase 1 authority and do not approve implementation.

## 2. Problem and Evidence

Validator responsibility was not governed. Regex currently enforces both
finite syntax and natural-language meaning, embedding could be mistaken for
truth authority, and semantic decisions are spread across model output,
normalizers, validators and Reducers.

The complete Acorn inventory found:

```text
578 total regex constructions
355 accepted character-level / finite-grammar rows
195 active runtime semantic rows
 26 semantic migration rows
  2 dead/unreachable rows
221 total semantic violations
  0 unclassified rows
```

Every row has a stable fingerprint, source path, line, code owner, category,
rationale and registered target owner in
[`regex-classification.json`](./regex-classification.json).

The first file-level classification reported 229 semantic rows. Independent
acceptance attempt 1 proved that number wrong: it missed free-prose
translation/error/key semantics and mislabelled finite whitespace, ID, date,
directive and internal-marker grammar. Attempt 2 found eight remaining
free-prose decisions involving relationship, system Actor identity, location,
Event summaries and migration State. The combined 54-row correction is
recorded in
[`regex-review-corrections.json`](./regex-review-corrections.json). The
correct Phase 1 removal baseline is 221, not 229.

Ollama research also proved that blindly parallelizing or merging validators
would violate the project's North Star of speed, accuracy and low machine
requirements. The measured proposal is included in Section 9.

### Revision 12 当前生产效果报告

本报告以玩家最终看到的 State 和可用 Knowledge 为准，不以 Prompt 字符数、测试
数量或研究 harness 的内部得分替代生产效果。完整证据：

- [当前效果审计](./acceptance/phase2-current-effect-audit.json)
- [真实模型研究矩阵](./benchmarks/quality-current-retirement-effect.json)

#### 总结

```text
State precision after deterministic guards: high
State positive recall: insufficient
Knowledge / ACL: passed current deterministic matrix and one real Tina workflow
Phase 2 accepted: no
```

| 证据层 | 结果 | 能证明什么 | 不能证明什么 |
| --- | ---: | --- | --- |
| 确定性 State 领域矩阵 | `158/158` | Schema、证据、ID、迁移和 Reducer 边界在已登记用例中正确 | 1.7B 在真实对话中能提出完整正例 |
| 确定性 Knowledge/ACL | `28/28` | revision、timeline、ACL、supersession 和 Actor 隔离正确 | 大规模自然语言检索的 top-k 精度 |
| 真实模型研究链裸输出 | `148/160` (`92.5%`) | 1.7B/4B 会误报 Actor 离场、Event 结束和参与者 | 当前生产调用图的实际召回 |
| 真实模型研究链经 guards | `160/160` | 研究 harness 的 guards 能清除这些误报 | 生产 observer 与研究 harness 已等价 |
| 当前生产 pre-turn 抽查 | `4/6` | Check/no-Check 和显式时间基本可用 | Calendar/progression 正例召回达标 |
| 当前生产 post 路由抽查 | `1/2` | 假设 Item 转交没有触发路由 | 已完成 Item 操作能稳定进入 4B |
| 当前生产 shared dynamic 抽查 | `2/4` | 明确无伤和普通场景道具边界可用 | 混合 Item+Identity 与误路由假设足够稳健 |

#### 玩家对话结果

| 玩家做什么 | 当前最终结果 | 判定 |
| --- | --- | --- |
| 明确等待两小时 | 时钟正确推进 `120` 分钟 | 通过 |
| 只在对白中讨论推人 | 不触发 Check | 通过 |
| 询问“周六要不要训练？” | 不创建 Calendar commitment | 通过 |
| 明确承诺“周六一起训练” | `calendarCommitment.requested=false`，漏掉后续 Calendar | 失败：正例漏写 |
| 要求“现在打开锁住的拱门” | `progression.requested=false` | 失败：正例漏写 |
| 已把正式纸条放到桌上 | `inventoryObservationRequired=false`，4B 未调用 | 失败：Item 漏写 |
| 明确检查后确认 Harry 无可见伤势 | 结构化无伤 observation 通过 | 通过 |
| 喝完普通南瓜汁并留下杯子 | 普通场景道具不进入 Item State | 通过 |
| 混合纸条放置和 Harry 可见伤势 | 伤势保留，Item proposal 被拒绝 | 失败：部分结算 |
| 假设“如果把纸条给 Harry” | 当前 post 不路由，因此最终 State 不变 | 当前安全；若误路由，dynamic guard 仍可能接受错误 gift |

因此 Regex 下线后的真实收益是“更少误写”，代价是“更多漏写”。当前产品表现是
高 precision、低 recall；不能用研究 harness 的 `160/160` 宣称生产已达标。

#### Knowledge / ACL 回捞

Tina 真实存档中的羽毛笔修复 Event：

```text
candidate recall: hit
canonical hydration: hit
Hermione retained: yes
Lavender retained: yes
Harry retained: no
```

这证明当前 canonical 回捞和 Actor ACL 对该真实流程正确。它仍只是一条真实 Event
加确定性矩阵，不是全量自然语言检索准确率声明。

#### Regex 退休账目

append-only ledger 当前有 `136` 个 retirement events；恢复一个明确排除的 Memory
migration Regex 后，可执行源码实际是 `135` 条下线加 `1` 条排除域恢复，manifest
因此暂时与源码不一致。该 Memory 行不影响本报告的即时回合 State/Knowledge
结论，但在 Phase 2 最终验收前必须单独对账，不能继续口头宣称源码已完整退休
`136` 条。

## 3. Before

### Responsibility

Before Phase 1, there was no immutable project-wide boundary saying:

- regex may inspect shape but may not infer meaning;
- embedding may retrieve candidates but may not establish truth;
- local semantic models interpret prose but may not write State;
- paid large models produce player-facing narrative but may not settle State;
- deterministic guards and Reducers alone accept references and transitions.

The 221 semantic regex rows existed without a mechanically locked removal
baseline.

### User and developer scenarios

| Scenario | Current user/runtime result | Current State/failure result |
| --- | --- | --- |
| Ordinary conversation | Existing pre/post/model workflow runs | Existing validators and Reducers behave unchanged |
| Item gift plus Spell teaching | Existing routing and regex behavior runs | Existing accepted/rejected proposals are unchanged |
| Model content fails a downstream gate | Existing product behavior remains, including current response-loss risk | Existing State transaction behavior remains |
| Developer adds a prose-meaning regex | No complete registry prevents the new semantic rule from becoming another hidden authority | Drift may reach scheduling, validation or State |
| Developer adds a Money system | No permanent contract requires the new Prompt, Schema, semantic owner, validator, failure policy and Reducer to be registered together | A partial implementation can silently create another source-of-truth split |

## 4. After

### Phase 1 user outcome

Players see no behavior change in Phase 1. Developers now have one complete,
machine-checked law: regex may validate shape only, while every existing
semantic violation has one registered future owner and can only be removed.

### Cross-mechanism maintenance outcome

Before any future domain such as Money enters production, one permanent
contract row must name its model tasks, semantic and retrieval owners, Schema
authority, transform chain, deterministic boundary, sole State writer, failure
policy, call budget and focused verification.

| Future Money scenario | Before this registry | After this registry |
| --- | --- | --- |
| Player pays five Galleons | A developer could add a prose regex, a model field and a balance write in separate modules | Meaning is proposed by the registered semantic owner; integer amount, currency, balance, conservation and authorization are deterministic; one Money Reducer writes |
| Player says "if I had money" | A keyword gate could treat hypothetical prose as a transaction | Regex cannot decide meaning; an empty semantic proposal causes no State write |
| Balance is insufficient or model output is invalid | Different layers could retry, guess or partially write | No semantic regex fallback or automatic model repair; the transaction State remains unchanged |
| Turn has no Money action | A new observer could be called on every turn | The registered route and call budget must prove zero Money-specific work |

This registry does not force every helper named `validate*` into one global
implementation. It registers model-output and semantic-settlement contracts.
Domain code remains focused, while the cross-stage ownership and failure
policy are governed centrally.

### Phase 2 final user outcome

Revision 10 Phase 2 is complete only after the production call chain is
switched and every semantic Regex row owned by the PM-confirmed immediate-turn
scope is retired. Rows owned by excluded domains remain registered in the
global baseline for their future owning modules. The physical 8 GB run
validates this final immediate-turn candidate; it is not an entry gate for
implementing it.

| Player/runtime scenario | Before full Phase 2 | After full Phase 2 | State and failure result |
| --- | --- | --- | --- |
| Ordinary conversation with no Item, Spell or Identity work | Current pre/post path runs with legacy semantic Regex still present | Pre 1.7B and post-core 1.7B run; no dynamic 4B section is requested | Existing paid正文 remains visible; only guarded core proposals may settle |
| One turn contains an Item transfer, Spell teaching and visible injury | Meaning is split across current post/Inventory paths and semantic Regex may override or synthesize facts | Post core runs first, then one serial 4B request contains only routed Inventory/Spell/Identity sections | Deterministic IDs, evidence, ACL and transition guards decide each proposal; owning Reducers are the only State writers |
| Player says “if I were injured” or an NPC only claims “I am uninjured” | Keyword/Regex paths can be mistaken for semantic authority | Semantic owners return no enacted/direct-observation proposal; Regex cannot infer meaning | Identity and related State remain unchanged |
| Local model, Schema, evidence or authority validation fails after paid正文 exists | Legacy paths may omit, override or synthesize observations | The original正文 remains visible; the affected proposal is rejected | No affected State write, no automatic retry, no provider fallback and no semantic Regex repair |
| A legacy save needs migration after semantic Regex removal | Migration Regex can infer meaning from prose | Explicit structured legacy values or approved conservative defaults are used | Migration is deterministic and atomic; failure leaves the save unchanged |

Operational target:

| Measure | Current production | Final Phase 2 |
| --- | --- | --- |
| Ordinary turn local calls | Existing pre/post behavior | pre 1.7B -> post-core 1.7B; dynamic calls `0` |
| Worst routed turn | Existing scattered optional work | pre -> post -> one dynamic 4B -> optional one destroy-form micro-task |
| Execution | Existing behavior | serial; no two-model parallel residency |
| Loaded local models | Existing behavior | maximum one loaded model |
| Paid narrative calls | one existing request | unchanged |
| Retry/repair/provider fallback | legacy debt varies by contract | zero for changed Phase 2 paths |
| Low-memory evidence | no final integrated 8 GB result | measured only after immediate-turn call-chain cutover and retirement of every in-scope semantic Regex row |

### Revision 12: 1.7B State recall Prompt 调优计划

玩家结果目标：保持当前“错误提案不写 State”的 precision，同时让真实发生的
Calendar commitment、progression 和 Item route 不再因为 1.7B 漏判而消失。

| 玩家场景 | 当前 Before | 调优后 After | State / 失败结果 |
| --- | --- | --- | --- |
| “我答应周六和你训练” | commitment 漏判为 false | 识别为已作出的 future commitment | 只触发现有 Medium Calendar；若后续校验失败则 Calendar 不变 |
| “你周六愿意训练吗？” | 正确为 false | 继续为 false | 不调用 Calendar，不写 State |
| “现在打开锁住的拱门” | progression 漏判为 false | 识别为当前执行的具体步骤 | 仅产生 transient route；不代表打开成功 |
| “以后可以讨论怎么开门” | 当前应为 false | 继续为 false | 不写 progression/移动 State |
| 已有纸条被放到桌上 | post route 漏判，4B 不调用 | `inventoryObservationRequired=true` | 仍由 4B、Item guards 和 Item Reducer 决定最终写入 |
| “如果把纸条给 Harry” | 当前 post 正确不路由 | 继续不路由 | 假设不产生 Item proposal |
| 叙事只提到 Harry 或他的物品 | 1.7B 可能误报离场/结束 | 输出空 Actor update、`ended=false` | guards 继续兜底，State 不变 |

#### 允许修改

- `local_pre_turn_adjudicator` 的 System Prompt：
  `Calendar commitment`、`progression`、Check target 和时间判断顺序；
- `local_post_turn_observer` 的 System Prompt：
  `inventoryObservationRequired`、Actor update 和 Event boundary 判断顺序；
- 同一 Prompt 内的短决策表、紧邻字段的中英双语最小对照例和输出前自检要求；
- 离线质量 benchmark、fresh blind simulation 和可丢弃存档 E2E。

#### 禁止修改

- 不改 output Schema、Zod、transport、guards、Reducer 或 State 字段；
- 不新增 Regex、Embedding verdict、模型调用、retry、repair 或 provider fallback；
- 不改 4B Prompt，不把漏判升级成额外 4B/付费调用；
- 不调整 Social、Appraisal、Memory、Pacing、世界事实、线索、Story Arc、
  Opening、Translation 或 Spell lifecycle；
- 不通过降低 negative-case 覆盖换取表面 recall。

#### Prompt 调优方法

1. **固定决策顺序**：先区分“当前已执行 / 已作出承诺”与“问题 / 邀请待回复 /
   假设 / 引用 / 回忆”，再判断具体 route，最后填写时间与 Check。
2. **最小对照紧贴字段**：每个问题字段旁放一组只差一个语义边界的
   positive/negative，而不是把十个混合示例堆在 Prompt 末尾。
3. **正例优先回忆、guards 保 precision**：明确发生的 Item 操作必须先把
   `inventoryObservationRequired` 置 true；4B/guards/Reducer 继续负责真伪和写入。
4. **稳定 ID 自检**：`targetActorId` 只能复制 supplied Actor ID；只有“男孩”
   等展示文本时必须留空，不能发明 ID。
5. **稀疏输出自检**：Actor update、Event boundary 和 temporal claim 没有逐字
   narrative evidence 时必须为空；不能拿 player intent 当完成事实。
6. **一次只改一个 Prompt**：先独立选出 pre-turn winner，再独立选 post winner，
   最后组合回归，避免无法定位得分变化。

#### 质量矩阵和通过线

| 矩阵 | 覆盖 | 通过线 |
| --- | --- | --- |
| pre-turn 48 cases | Calendar、progression、Check、time 各 `6 positive + 6 negative`；中文、英文、中英混合 | Calendar/progression 正例家族 recall `>=95%`，任何家族不得低于 `90%`；Check 不设正例 recall 硬门槛，但无 proposal 必须 no-write、不得升级 4B/Regex 补猜；time 的旧 `elapsedMinutes` 数值仅作诊断，后续代码换算需单独 `100%` |
| active post 36 cases | Item route `10+10`，Actor `6+6`，temporal `2+2`；Revision 12 的 12 个即时 Event cases 只读归档 | 每个正例家族 recall `>=95%`；negative 最终零错误 State |
| background Event | ended/not-ended、单人离场、子动作完成、失败、stale、turns 10/20 cadence | 每 checkpoint 最多一次；有效 ended evidence 才写 pending boundary；其余零 Event 写入 |
| stable-ID cases | supplied ID、别名、泛称、未知 Actor | accepted target ID 正确率 `100%` |
| holdout | 至少 `30%` 场景不参与 Prompt 编写；由 fresh context 生成改写 | 与开发集使用同一通过线 |
| 真实生产链 | Calendar promise、progression、Item placement、no-change、mixed turn | 所有承诺的玩家 State 结果通过；正文保留 |
| 回归 | 现有 State `158/158`、Knowledge/ACL `28/28` | 不得下降 |

Primary metric 是 **最终 guarded State recall/precision**，不是裸模型 JSON 得分。
同一业务事实必须分别统计 recall 和 false-positive rate，禁止合成一个总分掩盖
正例漏写。

### Revision 13: 用户已决定的时长与 Check 边界

这两条是产品决策，不是对当前 production Schema 的完成声明，也不授权在本次
4B 实验中修改生产路径。

| 业务事实 | 语义模型职责 | 确定性代码职责 | 禁止行为 | 当前状态 |
| --- | --- | --- | --- | --- |
| 当前动作是否实际持续了明确时长 | 仅提出“已发生”的结构化时长候选及逐字 evidence；计划、提问、引用、回忆不得提出候选 | 将已接受的明确数值或数词时长稳定换算为分钟，并执行范围/时钟 guard | Regex 或代码从自由散文猜测动作是否发生；模型自行负责时长算术 | 产品边界已批准；窄 Schema 与转换器尚未设计/实现 |
| 潜行、抵抗等 Check 动作 | 可提出有证据的 Check 候选 | 骰子、合法目标、修正、冷却与结果 | 为补漏调用 4B；Regex 补猜；无 proposal 时写 Check State | 不设模型正例召回硬门槛；保守 no-write 已确认 |

Revision 15 将潜行/抵抗固定为后续 TODO，本期不调 Prompt、不改 Schema、不加
模型调用。文字时长实现还需用户确认以下 grammar，确认前不得实现：

```text
支持语言与数字形式
支持单位
整数 / 小数 / 分数
单一 / 复合时长
秒级取整
最大范围
```

对 Check 的保守失败语义固定为：

```text
模型未提出结构化 Check
-> 不调用额外 4B
-> 不使用 Regex 解释动作
-> 本回合不写 Check State
```

对时长的未来实现，验收必须分开计算：

```text
模型：是否发生了带明确时长的当前动作，以及 evidence 是否逐字存在
代码：对已接受候选的分钟换算正确率 100%
```

当前 `elapsedMinutes` 数值输出仍是旧复合 Schema 的诊断字段。它不能再被用作
“模型是否擅长数词算术”的上线门槛，也不能被替换成 Regex 语义回退。

### Revision 13: qwen3:4b pre/post 直换实验

用户要求先在既有 holdout 上验证，而不改生产。实验只在 benchmark runner 通过
既有 `modelOverride` 传入 `qwen3:4b`；生产默认模型、Prompt、Schema、guards、
Reducers 和 paid narrative 均未改动。结果：

| 要回答的问题 | 结果 | 产品结论 |
| --- | --- | --- |
| 之前漏判的动作类能否到 `95%` | Check 正例 `0/3`、Actor 正例 `2/3`、Event 正例 `3/3`，合计 `5/9` (`55.6%`) | 不能；不允许直换 |
| NPC 明确离开是否已可靠 | 唯一离场 holdout 通过，但 Actor 全家族正例仅 `2/3`，负例仅 `1/3` | 不能以单个通过样本宣称修复 |
| 4B 单模型会否超过 8 GB | 观察到 `/api/ps size_vram=3.17 GB`、采样 RSS 峰值约 `4.05 GiB`、单实例 | 仅证明本模型单实例未超过 8 GB；不是整机 8 GB 支持声明 |
| 正文可见会变成多少 | 成功 pre 配对中位数增加 `6.885 s`；但 pre `17/24` 在 120 秒超时或 Schema 失败，付费正文不会开始 | 没有可上线的“新正文可见时间”；旧 `40,437 ms` marker 不是正文 DOM 证据 |

完整玩家影响、失败分布、采样方法与原始 JSON 证据见
[4B pre/post holdout experiment](./acceptance/phase2-4b-pre-post-holdout-experiment.md)。

本实验的后续问题不是“继续调 4B Prompt”：当前 Actor 设计把个人离场与全局
`eventBoundary.ended` 绑在一起。该业务错误已由 Revision 14 更正；具体不变量和
待批准的生产修复范围见下一节。

### Revision 14: NPC 离场与 Event 边界解耦

Event 保留为长互动、话题、程序或任务自然完成时的**叙事呼吸口**。例如玩家持续
喝茶，直到这段交流明确告一段落，才允许现有 Event 节奏继续引入下一剧情拍点；
这不是 Scene 封存，也不是“某个 NPC 不在场”的同义词。

NPC 离场是独立的即时事实：

```text
当前正文明确说出某个已知 NPC 离开
+ Actor ID / evidence / confidence / room / path guards 通过
-> 该 NPC 的 Actor/Interaction/Presence 结果结算

当前正文明确说出整段互动、程序或任务结束
+ Event evidence guard 通过
-> eventEnded + 既有 pendingEventBoundary / 叙事呼吸口
```

两条箭头相互独立：一个 NPC 离开不能自动结束 Event；Event 结束也不能自动让任何
NPC 离场。

| 玩家看到的场景 | Before | After | State / 失败结果 |
| --- | --- | --- | --- |
| Ron 明确离开，玩家和 Hermione 继续喝茶 | 可能要等 `eventEnded=true`，导致 Ron 仍被视为在场，或把整段喝茶错误结束 | Ron 的离场单独结算；喝茶 Event 保持进行 | 只更新 Ron 的既有 Actor/Interaction/Presence 结果；不创建 `pendingEventBoundary` |
| 茶话明确结束，没人离开 | Event 作为长互动结尾 | 不变；可进入既有叙事呼吸口 | 只结算 `eventEnded` 与既有 Event/Memory 节奏；NPC 在场不变 |
| NPC 坐下、沉默、退出镜头、变形，或只被提及 | 历史上可能被误判为离场 | 不变：不构成离场 | 不写该 NPC 离场；Event 仍只看其自身结尾证据 |
| 离场缺少已知 Actor、逐字证据、可信目标房间或可达路径 | 不能安全定位离场 | 不变：拒绝这条离场 proposal | 不写该 NPC 的物理位置/在场变化；Event 不受影响 |

字段和边界：

| 事实 | 唯一业务含义 | 本次决定 |
| --- | --- | --- |
| `eventBoundary.ended` / `transaction.eventEnded` | 长互动、程序、话题或任务是否自然收束 | 保留；不由个人离场推出 |
| `memoryDirector.pendingEventBoundary` | 已结束 Event 的既有 Memory/Social 延后整理锚点 | 保留；仅由有效 Event 结束创建 |
| `actors[].present` 与 `activeInteractionActorIds[]` | 已知 NPC 是否仍参与当前互动的既有兼容投影 | 明确离场时可独立更新；不再要求 Event 结束 |
| `localPresence.occupantActorIds[]` 与 Actor 房间位置 | 已确认的物理同室状态 | 仅在正文证明实际物理离开/移动且房间、路径 guard 通过时改变；退出镜头或退出互动不能改变它 |
| Scene、Calendar、Map、Witness、EventKnowledge、Memory、Social、Appraisal、Identity、Item、Spell、UI | 其他领域事实 | 全部不变 |

硬约束：

- 离场仍只能来自结构化 proposal 的逐字 narrative evidence；不得回退到 Regex、
  Embedding 或确定性散文猜测。
- 不新增模型调用、retry、repair、provider fallback 或 paid narrative 调用。
- Event 自己的结束语义、`pendingEventBoundary`、Memory/Social 的既有延后节奏、
  Scene/Calendar 以及 Event Knowledge 全部保持原样。
- 本节是用户已确认的产品边界。后续生产实现需要单独的技术设计、领域测试和显式
  实施批准；本次没有改动生产代码。

### Revision 16: Event 后台化、精确时间与未知位置

Revision 16 supersedes Revision 14/15 的即时 Event 方案。

#### 玩家 Before / After

| 玩家场景 | Before | After | State / 失败结果 |
| --- | --- | --- | --- |
| 普通第 1–9 回合 | paid 与 post 都可能判断 Event，增加本回合负担且互相冲突 | 当前回合不包含任何 Event 判断 | `eventEnded` 不写；正文与即时 State 正常结算 |
| 第 10 回合提交，最近 10 回合自然收束 | 当前回合同步判断并可能阻塞 | 正文与即时 State 先完成；后台 1B 审查 turns 1–10 | `ended=true` 才创建既有 `pendingEventBoundary`，继续既有 next-intent 下游；不关闭 Scene |
| 第 10 回合仍在持续，或后台失败 | 当前模型可能误结束 | `not-ended` 或失败均不写 Event | 无 retry/fallback；下一次仅在 turn 20 审查 turns 11–20 |
| Ron 明确离开到已知房间 | 可能被 Event 门槛挡住 | 立即结算已知目标房间 | Ron 移出互动/当前 local Presence；Event 不受影响 |
| Ron 明确离开但目的地未知 | 可能保留陈旧房间，玩家仍看见 Ron 在场 | 立即结算 `locationKnown=false` | 清空陈旧 map/room，移出互动和 local occupants；不发明地点 |
| “等两小时三十分钟” | 1B 可能算错 | 1B 仅判定 enacted + exact evidence；代码写 `150` 分钟 | clock 走既有 Reducer；算术/grammar 失败则不采用 explicit duration |
| “大约两小时”、`1.5 hours`、秒或范围 | 模型可能估算 | 不属于精确 grammar | 不 clamp、不猜测，使用既有 ordinary-turn fallback |

#### Event 后台合同

```text
committed turn count % 10 != 0
-> zero Event calls

committed turn count = 10 / 20 / 30 / ...
-> 当前回合正文和即时 State 已提交
-> 后台一次 qwen3:1.7b
-> 只读该 checkpoint 最近 10 个 committed scene-turn transactions
-> ended | not-ended
```

- paid `signals.eventEnded` 与 post `eventBoundary` 从即时模型合同中删除；历史存档字段
  只读保留，不再新增。
- 每个 checkpoint 最多一次请求；attempt/success/failure 写
  `modelTaskRuntime.byTaskId.local_event_boundary_observer`，Prompt/response 不入档。
- `ended=true` 只可创建现有 `memoryDirector.pendingEventBoundary`，并继续现有
  next narrative intent / Memory / Social 下游；不得创建 EventKnowledge、witness、
  Scene close、Calendar completion 或 NPC departure。
- `not-ended`、Schema/evidence/过期结果或调用失败均零 Event 写入；不自动 retry，
  不 provider fallback，不 Regex 补猜。失败后的下一次机会是下一个常规 checkpoint。
- 后台任务不得被 `await` 进当前回合的 `narrative_visible` 或 `state_settled`。

#### 时长 grammar

确定性 parser 仅在 1B 已提出“当前 action 已发生且含 exact duration evidence”后工作。

| 支持 | 不支持 |
| --- | --- |
| 中文整数数词、英文整数数词、阿拉伯整数 | 小数、分数、`半/half/quarter` |
| `分钟/minute(s)`、`小时/hour(s)`、`天/day(s)` | 秒 |
| 单一或复合精确时长 | `about/around/大约/左右` 等模糊量 |
| 总和 `1..10,080` 分钟 | 范围、负数、0、超过 7 天 |

代码只做有限 grammar 解析、单位乘法、复合求和和范围校验。是否为当前已执行动作仍
由 1B 的结构化 `basis=explicit + evidenceText` 决定；代码不得扫描任意散文自行唤醒。

#### Unknown location

`ActorRuntimeV1` 增加 `locationKnown:boolean`：

- `true`：`mapId/roomId` 必须是现有合法位置。
- `false`：`mapId/roomId` 必须为空；只允许明确离开当前房间但没有合法目的地时写入。
- `locationKnown=false` 必须同时从 `activeInteractionActorIds[]` 和
  `localPresence.occupantActorIds[]` 移除该 Actor；不得改变 life status、Identity、
  intent、goal、cohort、Map 拓扑或玩家位置。
- 后续只有新的合法位置证据可恢复 `locationKnown=true`。

#### 调用与机器成本

| 项目 | Revision 15 | Revision 16 |
| --- | --- | --- |
| paid Event 判断 | 每回合可能 1 个字段 | 0 |
| post 1B Event 判断 | 每回合 1 个复合字段 | 0 |
| background Event | 0 | 每 10 committed turns 一次 1.7B |
| 执行 | immediate serial | fire-and-forget background，仍受单模型队列约束 |
| 并驻模型 | 最多 1 | 最多 1 |
| retry/fallback | 0 | 0；失败等下一个 checkpoint |
| 玩家即时等待 | 包含 post Event Schema/生成 | 不等待后台 Event |

#### Revision 16 Prompt 字段预算

| 字段 | 来源 | 受众 | 上限/溢出 |
| --- | --- | --- | --- |
| System + executable output Schema | `event-boundary-contract.js` | background 1B | protected，不截断 |
| `checkpointTurn/windowStartTurn/windowEndTurn` | committed State | background 1B | 固定整数 |
| 10 个 `turn/messageId/sceneId/clock` | committed transaction refs | background 1B | 必须恰好 10 行 |
| 10 个 `publicEventEn` | committed turn transaction | background 1B | protected |
| 10 个 `closingNarrationEn` | 每回合最后一段 committed narration | background 1B | 每段最多 500 chars |

运行时 context 沿用 `4096`。实现第一步必须用真实代表存档 build-only 测量完整请求；
任何一组 10-turn window 超出 context/endpoint ceiling 时，该 checkpoint 在调用前
失败且不写 Event，不允许裁掉某个回合、Schema 或证据来伪造通过。

### Revision 17: 玩家移动意图与失败事实交接

Revision 17 是部分能力 `player movement intent and movement-failure handoff`，
不是 Map、Presence、Scene 或完整 Movement 重做。

#### 玩家 Before / After

| 玩家场景 | Before | After | State / 失败结果 |
| --- | --- | --- | --- |
| 点击地点或输入 `→【礼堂】`，路径可达 | 已由代码稳定结算 | 保持确定性结算，不让 1B 重判 | `map/scene/spatial.player/spatial.lastMovement` 原子更新；正文明确抵达 |
| 输入当前房间标签 | 不移动，但结果可能缺少明确正文 | 明确产生 `already_there` | 位置和 `spatial.lastMovement` 不变；回合提交 15 分钟；正文明确原本就在此处 |
| `→【跟随赫敏】`，赫敏上一回合离开且位置已知 | 生产链没有 guide 参数，通常静默不动 | 现有 pre 1B 提出窄 `movementIntent`，代码校验路径后移动 | 只在目标 ID、证据、房间和路径全部有效时写玩家位置 |
| `→【跟随赫敏】`，去向不明 | 当前返回 `no_known_destination`，但正文不保证说明 | 明确产生 `failed(destination_unknown)` | 玩家仍在原房间，`spatial.lastMovement` 不变；回合提交 15 分钟；正文明确失败原因和当前位置 |
| `→【礼堂】`，门锁或路径中断 | 位置不变，但可能像“什么都没发生” | 明确产生 `failed(route_blocked)` | 不写位置；回合提交 15 分钟；正文明确门锁/道路阻止移动 |
| 跟随标签的 1B、Schema、ID 或 evidence 失败 | 当前可能退化为静默 no-op | 明确产生对应 `failed(reasonCode)` | 不 retry、不调用 4B、不猜目标；回合和付费正文继续 |
| 普通散文提及“跟随”或移动 | 可能被旧语义 Regex 误唤醒 | 不进入本能力 | 没有标签就没有 `movementIntent/outcome`，位置不变 |

#### 责任与优先级

| 事实 | 业务权威 |
| --- | --- |
| 是否唤醒移动 | `→【...】` 结构化标签 |
| 明确地点 | 玩家标签中的现有 room ID/name；确定性匹配，优先级最高 |
| 跟随谁、是否为当前动作 | 现有 pre `qwen3:1.7b` 的窄提案与逐字证据 |
| 可跟随对象 | 当前同室/互动 NPC，加上一回合刚明确离开的 NPC |
| 跟随目的地 | 不同于玩家当前房间的 NPC 已知权威位置；否则只接受最近公开证据中唯一的现有 room ID |
| 路径、门锁、房间存在、旅行分钟 | Map/path deterministic guards |
| 最终 `moved/already_there/failed` | movement Reducer 产生的 `movementOutcome` |
| 玩家看见什么 | paid narrative 必须服从 outcome，不得反向建立移动事实 |

目的地优先级固定为：

```text
玩家明确地点
> NPC 已知且不同于玩家当前位置的权威房间
> 最近公开证据中唯一的现有房间
> failed(destination_unknown)
```

冲突、多候选、非法 ID、旧 evidence、无路或锁定均失败，不允许模型挑一个“看起来
合理”的地点。

#### `movementIntent` 和 `movementOutcome`

pre 1B 只在跟随标签出现时提出：

```text
requested
guideActorId
destinationRoomId
evidenceSourceRef
evidenceText
confidence
```

它只能复制 request 中提供的 Actor/room ID 和逐字 evidence，不能创建路径、移动
玩家、移动 NPC 或决定失败原因。

确定性结算只产生三个结果：

```text
moved
already_there
failed(reasonCode)
```

`failed` 至少区分：semantic/Schema failure、guide/ID/evidence 无效、目的地未知或
冲突、房间非法、跨图未获授权、路径/门锁阻断。每个结果记录 from/to/remaining
room、guide、分钟与稳定 reason code。失败和 `already_there` 均不更新
`spatial.lastMovement`。

#### 正文交接

- `movementOutcome` 是当前 paid narrative 的 protected input；它不是可删背景信息。
- `moved` 必须从已提交目的地开始；`already_there` 必须明确没有发生旅行；
  `failed` 必须明确“尝试了什么、为何失败、仍在哪里”。
- rules layer 从已验证 outcome 生成一条确定性 `movementOutcomeFactEn`。paid model
  获得该事实；最终正文若没有原样包含它，settlement 只补入这条事实，不删除、改写
  或吞掉任何付费模型 segment，也不发送第二次请求。
- `movementOutcome` 提交到本回合 `turnTransaction`。提交前仅允许有界 retry
  preflight；提交后它不是第二份位置 State。

#### 调用与等待成本

| 项目 | Before | Revision 17 |
| --- | --- | --- |
| 明确地点标签 | 0 movement-specific model calls | 仍为 0；代码直接结算 |
| 跟随标签 | 既有 pre 1B 仍会调用，但无 movement 字段 | 复用同一次 pre 1B；不增加调用 |
| 4B / paid | 0 movement 4B；1 paid narrative | 不变 |
| retry / provider / Regex fallback | 0 | 0 |
| 并发/驻留 | pre 串行，最多一个 local model | 不变 |
| 失败玩家等待 | 仍完成正常回合 | 不增加模型轮次；正常 15 分钟回合 |

#### Revision 17 Prompt 字段预算

最近一次已验证的代表存档基线：

| Prompt | message chars | transport chars / product ceiling | runtime |
| --- | ---: | ---: | --- |
| pre 1B | `9,214` | `11,017` | `num_ctx=4096` |
| Low Scene Performance | `49,509` | `80,000` chars | 现有 Low role context |

fresh build-only 在输出本次 scoped 指标前被未授权的既有 Scene Transition
`76,531 > 76,100` 门槛中断；这不构成 Revision 17 通过证据。实现第一步必须让
build-only 支持 scoped measurement，并在改 Prompt 前重取 pre/Low 当前基线。

| 新增/变化 | 来源 | 受众 | 预算与保护 |
| --- | --- | --- | --- |
| `movementIntent` output | shared pre descriptor | pre 1B | Schema protected；不设人为短 Prompt 目标 |
| `movementTrigger` | 当前标签 | pre 1B | 单对象；protected |
| `eligibleGuideCandidates` | current local/active + immediately prior departure | pre 1B | 最多 16；仅稳定 ID、name、locationKnown、room 和 source refs |
| room IDs/exits | 既有 `room` projection | pre 1B | 已存在，禁止再注入一份目录 |
| recent guide evidence | 最近两条 committed public turn facts | pre 1B | 每条最多 500 chars；完整 evidence pair protected |
| richer `movementOutcome` | deterministic settlement | Low | 复用既有 `playerTurn.movementResolution`，不新增 sibling |
| movement rules | System Prompt | pre/Low | 可增长；不得挤掉完整 JSON 输出或受保护字段 |

长度本身不是失败。失败条件是：超过真实 runtime ceiling、截断 Schema/输出、删除
受保护字段、重复注入 room/Actor authority，或降低 movement holdout/正文一致性。

### Revision 18: 删除 pre 1B progression

`progression` 是 Revision 12 加入 pre 1B 的瞬态判断：它不写 State、不拥有
Reducer，只把“玩家是否要求现在完成一个具体步骤”再次传给 paid narrative。
paid 模型本来就能看到完整玩家动作，因此该字段是重复语义分类，不再属于本期
1B 职责。

#### 玩家 Before / After

| 玩家场景 | Before | After | State / 失败结果 |
| --- | --- | --- | --- |
| 玩家要求“现在打开锁住的拱门” | pre 1B 先判断 `progression.requested`；漏判时 paid Prompt 收不到动态标记 | paid System Prompt 直接要求：合法时在本次响应完成明确要求的即时具体步骤，不得停在准备阶段 | 仍由既有门锁、路径、Item、Check 等权威决定是否合法；不新增 State 写入 |
| 玩家只是讨论“以后怎么开门” | pre 1B 输出 false | paid 模型按原文生成讨论，不受动态 progression 标记控制 | State 不变 |
| pre 1B progression 漏判或 Schema 残留 | 可能拖累整份 pre JSON，且曾作为硬 recall 门槛 | 字段、guard、fallback、diagnostic 和门槛全部删除 | 不再造成额外失败面；不 retry、不调用 4B |
| 15 分钟正文实际推进了现场 | paid 输出 `sceneProgression`，同时自报 `completedRequestedStep` | 继续输出 `sceneProgression.type + summaryEn` 记录实际推进；删除自证布尔值 | `sceneProgression` 仍是正文结果摘要，不是 pre proposal，也不是 State authority |

#### 唯一新增 paid System Prompt 规则

```text
When the player explicitly requests an immediate concrete step, complete it
in this response when legal; do not stop at preparation.
```

这条规则不允许 paid 模型越过确定性权威：玩家移动、门锁、路径、Check outcome、
Item ownership 和其他已结算事实仍由 protected context 决定。请求不合法或前置条件
不足时，正文必须服从既有失败结果，而不是虚构完成。

#### 删除范围

- pre Zod/transport Schema 中的 `progression`;
- pre System Prompt 中的 progression 规则与示例；
- server/browser evidence guard、fallback、diagnostic 和 workflow handoff；
- `momentumDirective.explicitProgressionRequest`;
- paid `sceneProgression.completedRequestedStep` 及其 validator/warning；
- progression benchmark 家族和现行 per-family 验收门槛。

保留：

- paid `sceneProgression.type + summaryEn`，仅总结正文实际发生的推进；
- 15 分钟现场必须产生具体推进的既有 pacing/momentum 合同；
- Calendar、Check、时间、movementIntent 和所有确定性 settlement；
- 每 10 committed turns 的异步后台 Event。

#### 调用和 Prompt 成本

| 项目 | Before | Revision 18 |
| --- | --- | --- |
| pre 1B calls | 每叙事回合一次 | 不变 |
| paid calls | 每叙事回合一次 | 不变 |
| pre output | `progression` 对象必填 | 删除该对象，减少 Schema 与输出负担 |
| paid input | 动态 `explicitProgressionRequest` 加多条规则 | 删除动态字段，保留上面唯一一条短规则 |
| retry / 4B / Regex fallback | 0 | 0 |
| Event | ordinary turn 不判断；每 10 committed turns 后台一次 1B | 不变 |

#### Revision 18 验收

- production pre request/result 中不存在 `progression`;
- production paid request 中不存在 `explicitProgressionRequest`;
- paid output/settlement 中不存在 `completedRequestedStep`;
- paid System Prompt 恰有一条上述即时具体步骤规则；
- `sceneProgression.type + summaryEn`、Calendar、movement、Check、时间和后台 Event
  回归通过；
- pre/post 调用次数、串行驻留、dynamic `0/1`、零 retry/fallback 不变；
- benchmark 不再统计 progression；历史 Revision 12 数据保留为已退休设计证据。

#### 调用和成本

| 项目 | Before | 调优后目标 |
| --- | --- | --- |
| pre 1.7B | 每叙事回合一次 | 不变 |
| post 1.7B | 每叙事回合一次 | 不变 |
| dynamic 4B | `0/1`，由结构化 route 决定 | 不变；只减少错误漏路由 |
| 并发/驻留 | serial，最多一个本地模型驻留 | 不变 |
| retry/fallback | 无 | 无 |
| Prompt/context | 完整规则，context `4096` | 不设低于运行时 context 的人为字符门槛；必须记录实际 token 和延迟变化 |
| 玩家等待 | 当前实测为基线 | 记录 p50/p95；质量不达标时不得用更短 Prompt 冒充优化 |

### Revision 21: 开箱即用 GLiNER2 零微调对比

#### 一句话结果

使用同一份全新冻结语料，对当前 `qwen3:1.7b` post safe contract 和开箱即用
`fastino/gliner2-base-v1` 做五家族 shadow 对比；只有 GLiNER2 在任何家族都不
退步、no-change 不增加误写，并严格改善至少一个失败家族和 mixed completeness，
才获得后续向用户申请试玩的资格。

本 Revision 不自动上线、不写 State，也不恢复旧的逐家族 `>=95%` 门槛。

#### 玩家 Before / After

| 玩家场景 | Before | Revision 21 对比目标 | State / 失败 |
| --- | --- | --- | --- |
| 正文真实改变新场景物体 | current post 可能漏掉 Material | GLiNER2 从正文 span 提出完整既有 Material event | 两分支只评分 would-accept；State 不写 |
| 正文完成耐久 Item 操作 | current post 可能不唤醒现有 4B | GLiNER2 正确提出 Inventory route | 实验不调用 4B；route 缺失计失败 |
| NPC 真实活动或位置变化 | current post 可能漏写或误写 | GLiNER2 只对有 Actor/room/evidence 的变化提案 | guard reject 或模型失败均 no-write |
| 引用“Harry left”、假设、回忆、name-only、明确未变 | current post 可能产生 false write | GLiNER2 不产生该 family 的 accepted proposal | 任一 would-accept 假提案计安全回退 |
| 失败隐蔽动作被全班看见 | perception participant/scope/concealment 不可靠 | GLiNER2 同时给出实际 participant、scope、concealment | 只跑 witness/ACL 的 detached 评分，不写 Event Knowledge |
| 同一回合同时有 Material、Item、Actor、perception、temporal | current mixed 完整性低 | 五家族全部同时正确；Material 与 Inventory route 不互斥 | 漏任一家族则该 mixed case 失败 |
| GLiNER2 包、模型、Schema、span、ID 或 guard 失败 | 当前正文已存在 | 原始失败进入报告，不换模型、不补默认值 | 正文不变；无 retry/fallback/State 写入 |

#### 完整业务范围

| Family | 必须覆盖 | 不得偷换 |
| --- | --- | --- |
| Material | 现有全部 Material event types 及 object/source/target/value/result/evidence | GLiNER2 不支持某 field 时不得默认空值或当 no-change |
| Inventory route | `inventoryObservationRequired` 的 true/false 语义与 grounded evidence | 本实验不调用 4B、不生成 Item truth |
| Actor / Presence | activity、enter、exit、known/unknown location、no-update | 不把 mention、injury、appearance、player action 当 NPC update |
| perception | participant、visual/audible scope、salience、attribution、concealment、evidence | 不恢复 immediate Event；不把 witnesses 当 participants |
| temporal | absolute clock、relative duration、named time、schedule、calendar date | 只作 transient guard input；不写 clock/Calendar |

同一事实可同时产生 Material proposal 和 Inventory route。任一分支缺失都算失败。

#### In Scope

- 仅 `fastino/gliner2-base-v1` 的 off-the-shelf local inference；
- `gliner2==1.3.2` 的 isolated Python environment；
- 一个冻结的 combined GLiNER2 schema；
- 一个 fresh、隔离、English-authority 的 comparison corpus；
- current production `qwen3:1.7b` baseline 与 GLiNER2 各对同一 case 执行一次；
- detached adapter、现有 evidence/ID/Material/perception/temporal guard 语义和
  would-accept/would-reject scorer；
- per-family、mixed、false-write、failure、latency、RSS、artifact size 报告。

#### Non-Goals

- 不 fine-tuning、LoRA、adapter training、distillation、RPO 或数据训练；
- 不修改 current post Prompt/Schema、Ollama 模型、endpoint 或生产调用图；
- 不调用 dynamic 4B；
- 不新增/修改 State 字段、Reducer、save/chat/Knowledge/TranslationTable/UI；
- 不用 Regex、关键词或 embedding 替代语义；
- 不把 GLiNER2 的 package capability 当作五家族通过证据；
- 不运行 cascade、retry、repair、provider fallback；
- 不宣称物理 8GB 支持；
- 不在本 Revision 直接开启 production trial。

#### Runtime Contract Impact

```text
Runtime field impact: None
Production model-task impact: None
Production Prompt/Schema impact: None
Migration/compatibility impact: None
Frontend field whitelist: None
State writer impact: None
```

`VCON-028` 只登记 research benchmark：无 runtime task、无 writer、无 State refs。
现有 `VCON-013/014` 和各领域 Reducer 仍是 production authority。

#### 实验 Schema 与冻结规则

GLiNER2 使用一个 combined schema，在一次 forward 中表达：

```text
material_event[]
inventory_route
actor_update[]
perception
temporal_claim[]
```

Schema 可使用 classification、hierarchical structure、choices、confidence 和
source spans。它只允许从 player action / English narrative authority 中抽取
evidence；Actor/room 文本必须通过 supplied directory 的 exact identity
resolution 才能变成 ID。

冻结顺序：

```text
freeze package/model identity
-> freeze canonical text projection
-> freeze GLiNER2 schema/label descriptions
-> freeze adapter/scorer/guard wiring
-> fresh Agent generates corpus without prior-case context
-> corpus frozen and hashed
-> run qwen3 baseline once
-> run GLiNER2 once
-> no post-reveal wording/threshold/adapter tuning
```

揭示 corpus 后修改 label description、Schema、mapping、confidence threshold 或
scorer 即视为 tuning；本 corpus 整体作废，不能修补后继续计分。

#### Fresh corpus

旧 Revision 12/17/19/20 cases 和 failure phrases：

```text
regression diagnostic only
never generation context
never scoring
never threshold selection
```

新 corpus 必须：

- 覆盖全部五家族的 positive 与 negative/no-change；
- 覆盖全部既有 Material event types；
- 覆盖 Material + Inventory dual result；
- 覆盖双域、三域、五域 mixed；
- 覆盖 quotation、hypothesis、negation、recollection、attempted failure、
  injury-only、name-only、explicit unchanged、wrong participant；
- 玩家动作包含 English、中文和 mixed；
- `narrativeSegments[].textEn`、Actor/Item/room authority 保持 English；
- Actor directory 最多 `16`；
- 单例 canonical text 不得超 GLiNER2 单次 context；禁止 chunking 产生多次 forward。

#### “比现状强”的 Pareto 门槛

基线是**未改动的 current Revision 19 safe production post contract**，不是
Revision 20 任一实验分支。

对同一 fresh corpus：

1. 每个 family guarded positive 不得低于 current baseline；
2. 每个 family guarded negative/no-change 不得低于 current baseline；
3. 每个 family accepted false write 数不得高于 current baseline；
4. 至少一个 baseline 失败 family 的 guarded positive 严格提高；
5. mixed-domain complete pass 必须严格提高；
6. missing family、missing required field、unsupported shape、ungrounded span、
   invalid ID、parse/model/guard failure 均计失败；
7. aggregate、parse rate、延迟或内存改善不能补偿任一家族退步；
8. 不要求任一家族 `>=95%`。

如果 baseline 某 family 已为 `100%` negative，GLiNER2 必须保持 `100%`。

#### Guard 与 no-write

两分支都转换为同一 detached comparison shape，并通过同一 scorer：

- `normalizeMaterialEvents()` 的 evidence/transition 语义；
- Actor supplied-ID、room、evidence 和 location/presence 约束；
- `validatePerceptionContract()` / witness detached resolution；
- `validateObservedTemporalClaims()` 与
  `validateSceneTemporalConsistency()`；
- Inventory route 的 grounded decision 检查。

实验可以构造 detached clone 计算 would-accept 结果，但不得调用真实 Reducer
commit、endpoint、save、chat 或 browser workflow。任何缺失语义不得由 adapter
补猜。

#### 调用、依赖与资源

| 项目 | Current baseline branch | GLiNER2 branch |
| --- | --- | --- |
| semantic calls per case | 1 次 `qwen3:1.7b` | 1 次 encoder forward |
| execution | serial | serial |
| resident local models | 最多 1 | 最多 1 |
| dynamic 4B | 0 | 0 |
| retry/repair/fallback | 0 | 0 |
| State/save writes | 0 | 0 |
| Node dependencies | 不变 | 不变 |
| Python | 不需要新增 production env | isolated temporary env |

当前机器为 macOS arm64，现有 Python `3.9.6` 和 `uv`；未安装
`gliner2`、PyTorch 或 Transformers。批准后用隔离环境安装
`gliner2[local]==1.3.2`，下载 `fastino/gliner2-base-v1`。不得写入
`package.json`、Node lockfile 或 production runtime。

必须记录：

- package lock/version、model revision/文件 hash、下载和安装体积；
- cold/warm model load；
- 每 case one-forward 证明；
- process peak RSS / unified memory；
- per-case p50/p95 和 total wall time；
- canonical input长度与 truncation=`0`；
- 模型可用后的推理网络请求=`0`；
- 临时 environment/cache 的清理结果。

这些测量不等于物理 8GB 证明。

#### Acceptance Criteria

| PRD 结果 | 证明方式 | 失败条件 |
| --- | --- | --- |
| 五家族完整对比 | same fresh corpus 的 per-family guarded positive/negative 表 | 任一家族缺失、回退或被 aggregate 隐藏 |
| no-change 不更冒进 | hard-negative accepted false-write 对比 | 任一家族 false write 增加 |
| mixed 更完整 | 双/三/五域 complete pass 对比 | mixed 无严格提高 |
| 无 tuning | schema/adapter/corpus hashes 与时间顺序 | corpus reveal 后改 wording/threshold/mapping |
| no-write | captured writer/endpoint/save counters 全为 0 | 任一 State/chat/save/Knowledge/UI 写入 |
| 单次低内存执行 | one forward/case、serial、peak RSS、p50/p95 | chunking、多 forward、并发、第二模型驻留 |
| 试玩边界 | 报告结论仅为 `eligible/not eligible for trial review` | 自动切 production 或宣称上线 |

#### Risks and Rollback

- GLiNER2 可能无法 zero-shot 表达 Hogwarts 的完整层级结构；该结果是架构失败，
  不允许缩 Scope。
- confidence threshold 可能主导结果；只能使用揭示前冻结值。
- 首次 model download 依赖网络；失败时实验 blocked，不改用 API 或其他模型。
- 当前机器不是物理 8GB；只报告 observed footprint。
- experiment 不触及 production，因此 rollback 是删除临时 env/cache 和未采用的
  benchmark candidate；Revision 19 production contract 始终不变。

#### Approval

用户已批准 GLiNER2 零微调方向、Pareto 产品门槛和 Revision 21 artifacts。
Attempt 1 未通过 independent acceptance，不能作为最终 trial decision。
Corrected attempt 2 保持同一批准范围并使用新的 fresh corpus，结果仍为
`not eligible for trial review`。第二次 independent acceptance 未接受精确
negative-safe metrics；用户明确停止重算。本 Revision 不授权 production
integration；未来任何 fine-tuning 或 trial 都需要新的用户决定和 artifact
revision。

### Revision 22: temporalClaims-only GLiNER2 快速诊断

#### 一句话结果

快速验证 GLiNER2 把 combined 五家族 Schema 收窄到只看 `temporalClaims` 后，
是否少受其他领域干扰。它只产生研究证据，永不接入 production，也不重新评价
Revision 21 的五家族或 trial 结论。

#### 用户可读结果

| 场景 | 对比内容 | 玩家与 State 结果 |
| --- | --- | --- |
| 正文写出 `14:30`、明确持续时间或日期 | same checkpoint、same source text，combined Schema 对 temporal-only Schema | 只报告两者 raw extraction 与 guard-normalized temporal result；clock/Calendar 不写 |
| 正文只是引用、讨论、回忆或假设时间 | 同样两次 one-forward | 任一 raw claim 或无效 claim 仍列出；不默认记作安全 no-claim |
| 包/模型/Schema 不可用 | 原始错误 | State 和生产调用不变；不换 cloud/API/模型 |

#### Scope

```text
partial capability:
temporalClaims-only GLiNER2 zero-shot schema-ablation diagnostic
```

In scope:

- `absolute_clock`、`relative_duration`、`named_time`、`schedule`、
  `calendar_date` 的 transient temporal claim；
- identical canonical player/narrative source text；
- full combined GLiNER2 Schema 对 temporal-only GLiNER2 Schema；
- raw model-visible schema/input、untouched raw extraction、detached temporal
  normalization/guard diagnostic。

Unchanged/non-goal:

```text
clock / Calendar / timeline State
Material / Inventory / Actor / Presence / perception / Event
production post request and model task
State/save/chat/Knowledge/TranslationTable/UI
fine-tuning / LoRA / training / provider fallback / retry
```

#### Quick diagnostic rule

在新鲜的 temporal-only 小语料上，combined 与 temporal-only 各精确一次
serial forward：

```text
temporal-only improved:
  more exact positive claims accepted by the current temporal guards
  and no additional raw claim in a negative case

same:
  identical guarded outcome classes

worse:
  fewer accepted positives or more raw negative claims

indeterminate:
  environment/model/transport failure
```

它不是五家族 Pareto gate，不获 production/trial 资格，不宣称 8GB。

#### Raw-output reporting requirement

短报告必须逐例保留：

```text
frozen combined Schema
frozen temporal-only Schema
exact canonical model-visible input
combined untouched raw extraction
temporal-only untouched raw extraction
detached normalized/guarded claim result
```

不得用摘要、得分或修复后的 object 代替 raw output。

#### Approval

用户已明确要求快速执行这一 narrow diagnostic。它不授权 serial 五家族架构、
production integration 或 trial。

### Revision 23: Qwen temporal-only + raw GLiNER2 hint 对照

#### 一句话结果

验证 GLiNER2 即使不能独立正确抽取 temporal claim，是否仍能作为明确标注的、
不可信 raw hint，帮助同一个 `qwen3:1.7b` 对同一原文做出更好的 temporal-only
语义判断。

#### 用户可读结果

| 场景 | Before | After | 玩家与 State 结果 |
| --- | --- | --- | --- |
| 正文有明确当前时间事实 | 没有 paired Qwen evidence | A、B 两次 Qwen 都直接读相同 canonical source；B 额外看到 raw GLiNER2 hint | 只记录研究结果；clock/Calendar 不写 |
| 正文是引用、回忆、讨论、模糊或假设时间 | GLiNER2-only raw claim 无法回答 Qwen 是否受帮助 | A/B raw output 并列；GLiNER hint 不能覆盖原文或让 Qwen 省略判断 | 不写任何 State |
| GLiNER 或任一 Qwen branch 失败 | 没有 paired failure evidence | 保留该 branch 的完整 request 与原始 error；GLiNER 不可用时 B 仍收到明确 unavailable context 并执行一次 Qwen | 无 retry、fallback 或 State write |

#### Scope

```text
partial capability:
temporal-only Qwen-with-raw-GLiNER2-hints research comparison
```

In scope:

- 同一 fresh English canonical player action + completed narrative；
- `absolute_clock`、`relative_duration`、`named_time`、`schedule`、
  `calendar_date` 的 transient Qwen temporal proposal；
- branch A：`qwen3:1.7b` temporal-only request；
- branch B：同一 Qwen System Prompt、同一 temporal-only Schema、同一 source、
  同一 deterministic options，外加明确标注为不可信的 GLiNER2 raw hint/error；
- per case 保留 literal Qwen System/User/format/options request、Qwen raw response/error、
  GLiNER raw result/error 与 detached temporal guard diagnostic。

Unchanged/non-goal:

```text
production VCON-013 post request / model task / call budget
clock / Calendar / timeline / transaction / modelTaskRuntime State
Material / Inventory / Actor / Presence / perception / Event
GLiNER2 semantic authority, routing authority, trial, training or fallback
Qwen retry, repair, provider fallback or semantic Regex
State/save/chat/Knowledge/TranslationTable/UI
```

#### Non-authoritative hint rule

```text
canonical source text > Qwen semantic decision > raw GLiNER2 hint
```

GLiNER2 is never a Qwen-call gate. It cannot emit semantic truth, no-claim
truth, State, a replacement evidence span, or a fallback. Qwen must always
read the canonical source directly. A raw GLiNER hint may be missing, wrong,
ungrounded, quoted, hypothetical, or otherwise irrelevant; branch B must be
explicitly told this.

#### Call and residency boundary

Per fresh case:

```text
one GLiNER2 temporal-hint forward
-> one Qwen baseline request A
-> one Qwen hinted request B
```

All calls are serial. GLiNER2 exits before Qwen requests begin, so the target
maximum resident model count is one. This is research cost only: it does not
authorize any production extra call or 8GB claim.

#### Result interpretation

```text
improved:
  B exact temporal proposal passes while A does not

worse:
  A exact temporal proposal passes while B does not

same:
  both pass or both fail; raw output relation remains visible

indeterminate:
  either Qwen branch cannot provide a parseable one-shot result
```

The detached guard result is diagnostics only and cannot promote GLiNER2,
replace VCON-013, or authorize trial.

#### Raw-output reporting requirement

The short report must contain every case's:

```text
canonical source text
GLiNER prompt-equivalent Schema and raw output/error
Qwen A literal System/User/format/options request and raw output/error
Qwen B literal System/User/format/options request and raw output/error
detached guard result for both Qwen outputs
```

No paraphrase, post-hoc correction, repaired object, omitted hint, or summary
may substitute for the raw branch evidence.

#### Approval

用户已明确要求开始该小实验并要求展示 prompt 与对应结果。该批准只覆盖上述
research-only partial capability；任何 production integration、serial runtime
budget、trial 或 State writer 仍需新的明确决定。

#### Result

新 fresh corpus 的一次性 raw diagnostic 为：

```text
Qwen A semantic exact: 4/10
Qwen B semantic exact: 2/10
improved / same / worse / indeterminate: 1 / 6 / 3 / 0
```

五个 explicit temporal positive 在 A/B 均没有 exact pass。B 修正了一个
unresolved-discussion negative，但它使三个原先 A 正确拒绝的 quote/vague/
hypothetical negatives 变成假 claim。raw GLiNER2 hint 对这套 Qwen
temporal-only 判断是净退步。

报告逐例保留 literal prompt 与 raw output；结果仅是 research evidence，不是
production acceptance。它也不宣称 zero file writes：benchmark 会写临时 input/
output 和结果报告，但没有 production、State、clock、Calendar、4B 或 retry write。

### GLiNER2 真不行：Revision 21-23 综合结论

#### 玩家结果

玩家真正关心的是：正文中真实发生的人物活动、在场/离场、明确房间和明确时间能被
记住；引用、回忆、讨论、假设、计划、名字提及和模糊时间不能污染 State。

GLiNER2 没有通过这个边界。它很快，但快不能抵消以下结果：

| 实验 | 问题 | 可信结果 | 生产结论 |
| --- | --- | --- | --- |
| Revision 21 | 五家族 zero-shot 是否比 current post 强 | 无 positive-family/mixed 改善，Inventory/Actor 回退 | reject，不能 trial |
| Revision 22 | 去掉其他领域 Schema 后 temporal 是否改善 | combined `0/10`，temporal-only `0/10` exact pass | Schema 收窄不能解决时间语义 |
| Revision 23 | raw GLiNER hints 是否帮助同一 Qwen | Qwen `4/10 -> 2/10`，3 个负例退步 | 不能做 hint、probe、router 或 fallback |

因此：

```text
off-the-shelf GLiNER2
!= current fact judge
!= no-update safety judge
!= Actor/room/temporal State proposal owner
!= production trial candidate
```

这不否定其公开 NER/Schema extraction 能力；它否定的是它在本项目零微调条件下，
承担“本回合现实是否发生”的职责。Revision 21 的 exact negative-safe 计分存在
独立验收缺口，不能重述为精确安全数；本表只使用三次实验的 robust conclusion。

相关 raw evidence：

- [Revision 21 final report](./acceptance/phase2-revision21-gliner2-zero-shot-final-report.md)
- [Revision 22 temporal report](./acceptance/phase2-revision22-gliner2-temporal-schema-ablation-report.md)
- [Revision 23 Qwen hint report](./acceptance/phase2-revision23-qwen-temporal-gliner-hint-report.md)

#### 还值得研究什么

用户最新要求的范围是 research-only：寻找更适合填下列**即时提案表**的低资源模型，
不替换 production VCON-013。

| 字段 | 模型需要提出 | 现有 State 结果 |
| --- | --- | --- |
| NPC `currentActivityEn/present/roomId/locationKnown` | `no_update` 或明确 Actor operation，supplied actor/room pointer 与 narration evidence span | Actor/Presence guards + Reducer 唯一写入 |
| `temporalClaims[]` | `no_claim` 或 explicit clock/duration/named time/schedule/date，带 narration evidence span | temporal guards 只作 transient 判断；clock/Calendar 不写 |

最可信的下一条技术路线不是“再换一个零样本 JSON 填表器”，而是：

```text
compact task-adapted encoder
-> independent no-update / operation heads
-> supplied actor / room pointer heads
-> evidence span heads
-> existing guards
-> existing Reducers
```

TripPy/SPLAT 提供 operation-first + span/pointer 的任务分解；OneIE/DyGIE++
提供 trigger/argument/relation 的联合抽取思想。它们是训练设计，不是可直接接入的
runtime package。

候选方向与限制：

| 候选 | 为什么值得研究 | 为什么不能直接上线 |
| --- | --- | --- |
| `DeBERTa-v3-xsmall` 22M shared encoder | 低资源、判别式，适合 multi-head operation/span/pointer | 必须有 Hogwarts 标注和 fresh holdout；预训练 checkpoint 不懂本项目语义 |
| `NuExtract-1.5-tiny`，Qwen2.5 0.5B extraction fine-tune | 最接近 JSON template extraction，可作 decoder challenger | pure extraction 不等于 current fact/no-update；仍需 task tuning 与 guards |
| PP-UIE 0.5B | schema NER/relation/event baseline，支持中英文与少样本定制 | 更重，增加 Paddle runtime；抽取不自动等于 State semantics |
| ModernBERT-base 149M | 高容量 encoder 对照 | 不应作为第一轮 8GB 优先模型 |
| SetFit/SpanMarker | 分别适合 operation class 或 evidence span 子任务 | 都不能独立输出 actor-room-time 关联表 |

完整来源、适配性和排除理由见
[Revision 24 research](./acceptance/phase2-revision24-small-model-extraction-research.md)。

#### 不变的生产边界

```text
canonical completed narration remains evidence source
current VCON-013 remains the only production post proposal contract
model output remains a proposal
existing guards decide admissibility
existing Reducers remain the only State writers
```

Material、Inventory、perception、Event、Knowledge、UI、save、clock、Calendar、
model task/call budget、retry/fallback 都不在本次研究范围。

#### 下一步尚未批准

开始任何 prototype 前，必须单独决定训练语料/许可、hard-negative 标注、activity
字段表达、训练环境和 8GB runtime 验收。当前不下载候选、不微调、不建立新 VCON，
不改 production。

### Revision 25: 一次 Low post 语义提案与执行源选择

#### 一句话结果

不再推进 fine-tuning。每个已完成正文的回合，既有 VCON-013 五家族 post proposal
默认由用户配置的 Low Connection Profile 串行执行一次；用户可在三档模型设置页
明确切回本地 Local。模型仍只提 proposal，guards 与 Reducers 仍是唯一 State
authority。

#### Before / After

| 用户场景 | Before | After | State / 失败 |
| --- | --- | --- | --- |
| 默认完成一回合 | paid narration 后，固定本地 `qwen3:1.7b` 运行一次 post | paid narration 后，Low Profile 运行一次同样的五家族 post Schema | 只由既有 guards/Reducers 写 accepted proposal |
| 用户切换执行源 | Low/Medium/High 页面不能控制 post | 【post 语义提案】选择 `Low Connection Profile` 或 `Local` | 只保存模型配置；不改世界事实 |
| Low Profile 不存在、连接失败或 JSON 无效 | 本地 post failure 只影响后置 proposal | narration 保留；所有 VCON-013 proposal 都省略 | 无 local fallback、retry、repair、Regex 补猜或 synthetic perception |
| 普通对话、引用、回忆、计划或无实体改变 | post 仍可能被调用但输出应稀疏 | 相同的 no-write contract，由选择的执行源产生一次 proposal | Material/Actor/Inventory route/temporal/perception 不因关键词写入 |
| 需要 Item 观察的回合 | post route 为 true 才调用现有 4B | 规则不变；Low/Local post 只决定 route | Item truth 仍只由既有 VCON-014 guards/Reducer 决定 |

#### Scope

```text
partial capability:
VCON-013 post-turn semantic-provider selection
```

In scope:

- 既有 `materialEvents`、`inventoryObservationRequired`、`actorUpdates`、
  `perception`、`temporalClaims` 的**执行源**选择；
- 新配置值 `postTurnSemanticProvider: low | local`，同步保存到 extension settings
  与当前 timeline State，缺失旧档按 `low` 迁入；
- 设置页显示 Low Connection Profile 与 Local 两个互斥选项；
- 默认 `low`：复用已配置 `modelSlots.low` 的 Connection Profile、Preset、context
  和 response budget；
- `local`：保留现有一次 Ollama structured post call；
- 从客户端 Low request 向 server settlement 传递 raw structured response，并由
  server 复用现有 Schema/language/evidence/ID/temporal/perception guards；
- fine-tuning、LoRA、训练语料、GLiNER experiment 归档为 deferred research。

Unchanged/non-goal:

```text
five-family post output meaning and field set
Material / Actor / Presence / perception / EventKnowledge writers
VCON-014 Inventory dynamic 4B and VCON-020 Identity dynamic route
pre-turn local adjudication
paid Low Performer request and narrative content
Medium / High slots and all Director behavior
clock / Calendar / Event boundary / Social / Memory / Knowledge / UI outside settings
automatic provider fallback, retry, repair, semantic Regex, model cascade
```

#### Model and failure boundary

```text
postTurnSemanticProvider = low
  -> one Connection Manager request using modelSlots.low

postTurnSemanticProvider = local
  -> one local Ollama request

never:
  low -> local fallback
  local -> low fallback
  local + low dual call
  retry / repair / semantic Regex
```

The Low branch uses the same shared VCON-013 System Prompt, JSON Schema and
canonical player/narrative input as Local. It may use Low Profile connection,
Preset, context and output budget, but must not apply a Regex preset to the
post semantic request. A Low Profile is an executor, not an authority.

Selected provider failure or invalid output has this exact result:

```text
paid narration remains visible
no VCON-013 Material / Actor / Inventory-route / perception / temporal proposal
no post-derived EventKnowledge or temporal write
no substitute perception proposal
```

#### Runtime Contract Impact

New configuration only:

| Field | Meaning | Writer | Reader | Migration |
| --- | --- | --- | --- | --- |
| `postTurnSemanticProvider` | executor choice for exactly one VCON-013 proposal: `low` or `local` | settings controller, timeline configuration save | turn post adapter | absent old value normalizes to `low`; invalid value normalizes to `low` |

It is not gameplay authority, a model task runtime record, a prompt fact, or
a world semantic field. Its matching extension setting provides the next
timeline default; active timeline State remains authoritative during play.

#### Operational Cost

| Mode | post calls | Execution | Residency / cost |
| --- | --- | --- | --- |
| `low` default | 1 Low Profile post request | serial after paid narration | one extra paid provider request if profile is billable; no local post model resident |
| `local` | 1 local structured post request | serial after paid narration | existing local model load/unload behavior |
| Item-routed turn | selected post 1 + existing 4B 0/1 | serial | unchanged Item observer ownership; not a fallback |

The Low Performer narration call and the Low Profile post call are distinct,
sequential requests even when they use the same Profile. No latency, price,
quality or 8GB improvement is promised before measurement.

#### Acceptance Criteria

1. New/old timelines default `postTurnSemanticProvider` to `low`; users can
   persistently switch to `local` from the existing model settings page.
2. Low mode makes exactly one VCON-013 Connection Manager request and zero
   local post request. Local mode makes exactly one local post request and zero
   Low VCON-013 request.
3. Both modes use the same VCON-013 System Prompt, JSON Schema, canonical
   input, language adoption, guards and Reducer settlement.
4. Low/local failure or invalid response preserves narration and writes no
   VCON-013-derived proposal; it never invokes the other source.
5. Low request does not apply a Regex preset and cannot consume Medium/High
   model budget or alter the Low Performer narrative request.
6. Existing dynamic Inventory/Identity routes remain independent; no selected
   provider failure wakes 4B as a substitute.
7. Fine-tuning remains explicitly deferred: no training download, corpus,
   model task, runtime call or State path is added.

#### Approval

Fixed PM discovery and production-informed recheck passed after the user chose
the Low slot, timeline-persisted default `low`, explicit `local` override and
no-fallback policy. This artifact requires explicit user approval before any
production code, State migration, VCON or UI implementation begins.

### Revision 20: post 结构化候选唤醒研究

#### 一句话结果

paid 正文生成后，确定性代码只负责召回“哪些 post 领域可能相关”，一次
`qwen3:1.7b` 仍负责判断自然语言语义；只有该次请求中被唤醒的既有领域进入动态
Schema，最终仍由现有 guards 和 Reducers 结算。

#### Regex / 确定性边界

这不是“语义 Regex + 1B”。允许和禁止如下：

| 机制 | 允许 | 永久禁止 |
| --- | --- | --- |
| Regex / finite parser | stable ID、显式 directive、`HH:MM`、整数+minute/hour、JSON/Schema 形状等有限语法的候选召回 | 判断动作是否发生、是否完成、是否是假设/引用/否定、是否为 Item/Material 变化、NPC 是否离场、伤势是否等于 activity |
| Exact match | supplied Actor name/alias、Item ID、room ID/name 的候选召回 | 因为名字或房间被提及就写 Actor/移动/Material State |
| paid structured proposal | 作为 bounded candidate hint | 作为 State 真值、绕过 post 1B 或 Reducer |
| post 1B | 对唤醒候选判断 enactment、truth、quote/hypothesis/no-change 和领域语义 | 写 State、自动 retry、调用未授权 fallback |
| deterministic guards | ID、evidence、ACL、room/path、算术、合法转换 | 补猜模型漏掉的自然语言语义 |
| Reducer | 现有领域唯一写入 | 接受未验证候选或 paid prose |

候选对象只能表达：

```text
possibleDomains[]
candidateIds[]
sourceRefs[]
candidateSourceKind
```

不得表达：

```text
actorDeparted=true
itemChanged=true
materialChanged=true
temporalClaimIsTrue=true
```

候选漏召回不是 semantic false，而是实验/验收失败。

#### 完整业务覆盖

动态 Schema 必须保留现有五类 post 用户结果：

| post 领域 | 候选唤醒后仍由 1B 判断 | 最终权威 |
| --- | --- | --- |
| Material | placement/move/remove/damage/repair/soil/clean/outfit/accessory/hair/appearance/held/released 是否真实完成 | existing Material guards/reducer/`materialEventLog[]` |
| Inventory route | 是否存在可能需要 existing shared 4B 的完成 Item operation/candidate | VCON-014 4B、Item guards、Item Reducer |
| Actor | activity/enter/exit/location 是否真实变化；mention/quote/injury/no-change 必须 no-write | Actor/evidence/room/path guards、Actor/Presence settlement |
| Perception | primary event、participant、scope、concealment | participant/witness/evidence/ACL guards |
| Temporal | 正文是否真的断言 clock/duration/named time/schedule/date | temporal evidence/normalization guard；不写 clock/Calendar |

immediate Event 继续不存在；后台 Event 仍只在每 10 committed turns 异步执行。

#### 候选来源

| 候选来源 | 可召回什么 | 不能证明什么 |
| --- | --- | --- |
| paid `stateProposals` 经 fold 后的 `transaction.actorUpdates/itemUpdates` | Actor/Item 可能相关 | 变化真实、完成、合法或应写 State |
| player message `itemDirectives` | supplied Item ID 与 intended operation | 操作已经完成 |
| `narrativeSegments[].type/actorId/textEn` | speaker/segment/evidence 候选 | 叙事中的引语、假设或描述为真 |
| Actor stable ID/name/aliases exact match | Actor 候选 | activity/presence/location 发生变化 |
| existing room/map IDs/names/path | location 候选与合法范围 | Actor 已移动或玩家已到达 |
| finite temporal shape | temporal 候选 | 该形状是正文断言而非引用/讨论 |

每个候选必须有 bounded source ref。完整 raw Actor Library、全地图、全 Item DB、
Social/Memory 或历史全文不得因候选唤醒进入 post Prompt。

#### 玩家 Before / After

| 玩家场景 | Before | 候选架构目标 | State / 失败 |
| --- | --- | --- | --- |
| 仅普通对白，无 post 候选 | 1B 每轮同时面对所有 post 领域 | 一次 1B 只接收最小 always-required contract；无关领域休眠 | 无 post State 写入 |
| paid 正文已提出 NPC activity/exit proposal | 固定复合 Schema 仍可能被其他领域污染 | proposal 只唤醒 Actor section；1B 重新依据正文判断 truth/enactment | guard 后才写 Actor/Presence |
| 玩家使用正式 Item directive，正文完成操作 | route 可能漏掉，4B 不调用 | directive 唤醒 Inventory section；1B 判断正文是否完成 | true 才进入 existing shared 4B；失败不写 Item |
| 正文出现 `14:50` | 固定 temporal 字段常为空 | finite shape 只唤醒 temporal section；1B 判断是否为 assertion/quote | claim 只进入 guard，不写 clock/Calendar |
| 正文只引用“Harry left”或描述 Harry 受伤 | 名字命中可能污染 Actor/Material | exact name 只召回 Actor；1B 必须输出 quote/injury/no-change | Actor/Material State 不变 |
| 同一正文同时有 Item、Actor、Material、temporal | 固定全域 Schema 互相污染 | 动态 Schema 是所有候选领域的并集，仍只有一次 1B | 每个领域独立 guard/reduce；漏一个 family 即失败 |
| candidate miss / 模型 / Schema / guard / 4B 失败 | 正文已生成 | 正文保留；对应 State 不写；无自动 retry/fallback | 不得把 miss 解释为 false 或成功 |

#### 探索思路

实验只比较架构，不改 production：

1. **Candidate-source isolation**
   分别测 paid proposal、Item directive、segment role、exact Actor/name、room/map、
   finite temporal shape 的候选召回率与误召回率。候选只输出 domain/ID/sourceRef。

2. **Dynamic section composition breadth**
   测单域、双域、三域和五域并集，验证 Schema 只包含候选相关 section，且不会因
   候选数量增加遗漏另一个 family。

3. **Candidate precedence / duplicate elimination**
   同一事实被 paid proposal、directive 和 exact match 同时召回时只保留一个候选
   identity/source group，不把同一事实以多份 payload 注入 Prompt。

4. **Semantic separation**
   专门覆盖 quotation、hypothesis、negation、recollection、injury-only、
   name-only、unchanged 与 Actor room movement，证明候选召回不等于语义 true。

5. **Candidate miss / failure semantics**
   人为漏掉候选、给 invalid ID/sourceRef、模型失败、Schema failure 和 guard reject，
   证明正文保留、对应 State no-write、无 retry/fallback。

6. **One-request operational verification**
   每例严格一次 post qwen3:1.7b；dynamic 仍 `0/1`；serial、单模型驻留；记录
   Prompt/output tokens、p50/p95 和候选/Schema section 数量。

7. **Candidate architecture branches**
   - A: structured paid proposal/directive 优先，exact/finite recall 补候选；
   - B: exact/finite recall 为主，paid proposal 只补 candidate evidence；
   - C: Material/perception 保留 bounded core，其余领域候选唤醒；
   - D: paid 输出新增 transient `postCandidateKinds`，仅作召回，仍由 post 1B 裁决。

   D 会增加 paid output 负担，必须单独测 tokens/错误率；任何分支都不能让 paid
   proposal 获得 State authority。

#### 严禁“见过的矩阵”充数

Revision 19 及更早 case/benchmark：

```text
只允许 regression diagnostic
不得选择候选架构
不得调 Prompt
不得计算 acceptance
不得宣称 generalization
```

实验隔离：

```text
Phase A exploration:
  fresh agent 无 prior case/known failure 上下文
  生成全新中/英/混合 development corpus
  冻结后才允许主 Agent 查看和调实验候选

Phase B blind acceptance:
  候选 Prompt/Schema/hash 先冻结
  另一 fresh agent 无 prior corpus/known failure 上下文
  自行生成全新 cases 并直接 one-shot 运行
  不在运行前向实现 Agent暴露 case
  不 coaching / repair / feedback / retry
```

任一使用旧矩阵的结果只能放在“无回归诊断”，不能出现在 acceptance 分子/分母。

#### 实验验收

- fresh candidate recall：每个 promised family 正例 `>=95%`;
- fresh candidate false wake：每个 family negative accuracy `100%`;
- fresh 1B semantic result：每个 family positive `>=95%`、negative/no-change `100%`;
- mixed-domain case 必须全部相关 family 同时通过，不得只看 aggregate；
- accepted stable IDs/sourceRefs `100%`;
- candidate miss、invalid reference、model/Schema/guard failure均 no-write；
- post request 每例 `1`，dynamic `0/1`，retry/fallback `0`;
- paid narrative 保留；
- Prompt/Schema 不截断，真实 token 和 p50/p95 必须报告；
- 旧/已见矩阵得分不计入上述任何门槛。

#### 调用与成本

| 项目 | 当前 | Revision 20 实验上限 |
| --- | --- | --- |
| paid narrative | 1 | 1，不新增 |
| post 1B | 1 fixed compound request | 1 dynamic-composed request |
| shared dynamic 4B | `0/1` | `0/1` |
| background Event | 每 10 committed turns 异步 1 次 | 不变 |
| 并发 | serial | serial |
| loaded local models | 最多 1 | 最多 1 |
| retry/repair/provider/semantic Regex fallback | 0 | 0 |
| State writers | existing domain Reducers | 不变 |

当前 representative build-only baseline：

```text
post System: 5,806 chars
post User: 4,463 chars
post message: 10,269 chars
post transport Schema: 3,839 chars
configured context: 4,096 tokens
```

候选实验不得通过删业务 family、截断 protected evidence、缩 Actor 上限或提高调用
次数来通过。

#### Runtime / migration / frontend impact during research

```text
Runtime field impact: None
Migration/compatibility impact: None
Frontend field whitelist: None
Production model-call impact: None
```

实验只读取可丢弃输入并输出 benchmark evidence，不调用 State Reducer commit，
不写真实存档、chat、Knowledge、TranslationTable 或 UI session。只有后续新的
implementation revision 经显式批准后，才允许改 production post input/Schema。

#### Revision 20 research result

```text
A/B candidate layer:
  Inventory 13/13
  Actor 14/14
  temporal 13/13
  Material 0/13

C:
  Material 13/13 only by always-on
  Material negative wake 0/35
  parse/transport failures 26/48

D:
  no production postCandidateKinds field
  no oracle experiment permitted
```

None passed fresh development; therefore no blind corpus was generated and no
production implementation is approved. Full evidence:
[Revision 20 candidate wake report](./acceptance/phase2-revision20-candidate-wake-report.md).

### Revision 19: Calendar TODO、pre 上线与 post 轮

用户明确决定：

```text
Calendar 优化 -> 独立 TODO
当前 pre 改造 -> 上线
然后开始 post 轮
```

固定 PM 初审和生产调用链复核均为 `PASS`。这是现有即时回合链的部分能力切换，
不是完整 Calendar、Item、Actor、Material 或 Event 重构。

#### 玩家 Before / After

| 玩家场景 | Before | Revision 19 After | State / 失败结果 |
| --- | --- | --- | --- |
| 玩家使用已支持的明确时长或移动 | 旧模型会计算分钟，跟随目的地可能静默失败 | 1B 只提出时长 evidence；代码换算分钟；明确地点走代码，跟随走 supplied ID/evidence；移动失败进入正文 | 合法结果写 clock/movement；失败保留位置并提交 `movementOutcome` |
| 玩家要求合法的即时具体步骤 | pre 1B 的 `progression` 漏判可令 paid 模型停在准备阶段 | `progression` 永久删除；paid System Prompt 直接要求本次完成合法步骤 | 不新增 State authority；现有 Check/路径/锁/Item 结果仍约束正文 |
| 玩家说“本月十四号午饭后，我会参加……” | fresh 1.7B 可能漏掉 Calendar commitment | 当前缺陷保持原样并登记为 Calendar TODO | Calendar State 不写；不 retry、不调用 4B、不用 Regex/代码猜承诺 |
| 正文完成现有 Item 操作 | post 1B 当前正例路由 `0/5` | post 轮提高 `inventoryObservationRequired` 召回 | route 只唤醒现有 shared 4B；4B/guard 失败时 Item State 不变，正文保留 |
| 正文中 NPC 明确离场、入场或改变当前活动 | post 1B 当前 Actor 正例 `2/3`，负例 `0/3`；具名无变化句可能误写 activity | post 轮同时提高正例召回与 no-change precision | 只允许逐字证据、supplied ID、合法房间/路径结算；无变化不得写 Actor/Presence |
| 正文包含 Material 变化或明确时间 claim | live Material 路径必须保留；temporal 正例当前 `0/1` | post 保留既有 `materialEvents -> materialEventLog`，并提高 temporal claim 召回 | Material 仍走现有 reducer；temporal claim 仅作 guard input，不写 clock/Calendar |
| post 模型、Schema 或 guard 失败 | 付费正文已经生成 | 正文继续可见，只省略受影响提案 | 不 retry、不 provider fallback、不用 semantic Regex 补猜 |

#### Calendar TODO

稳定任务 `HVG-P2-03R-CALENDAR-TODO` 记录：

- 已知失败：日期/时间位于句首的中文第一人称承诺可能输出
  `calendarCommitment.requested=false`;
- 当前 State 结果：Calendar 不写；
- 当前玩家结果：正文仍正常生成；
- 禁止的临时修复：Regex 语义匹配、确定性代码猜承诺、4B fallback、第二次模型
  请求、降低门槛或把旧矩阵 `12/12` 当作 fresh pass；
- 未来修复必须另行批准具体语义架构和调用预算。

#### Pre production boundary

当前 pre production candidate 保留：

```text
temporal
check
calendarCommitment
movementIntent
```

并永久删除：

```text
progression
explicitProgressionRequest
completedRequestedStep
unconfirmed_requested_progression
```

Revision 19 接受 Calendar TODO 后，pre 当前上线门槛为：

- exact-duration grammar/算术 `100%`;
- follow movement 正例 `>=95%`、负例 `100%`;
- 所有 accepted ID/evidence/路径/State 写入通过确定性 guard；
- Check 漏判为 no-write，不升级；
- Calendar 已支持路径不回退，但已知中文语序缺陷不作为当前 pre blocker。

#### Post production boundary

post 只治理现有字段：

```text
materialEvents
actorUpdates
inventoryObservationRequired
perception
temporalClaims
```

其中：

- `materialEvents` 保留既有 Material/Presentation 语义与 writer，不新增字段；
- `inventoryObservationRequired` 只是 existing shared 4B route，不直接写 Item；
- Actor 只写 existing `currentActivityEn/present/mapId/roomId/locationKnown`;
- perception 继续交给现有 participant/witness/ACL guards；
- temporal claims 仅验证正文时间一致性，不写 clock 或 Calendar；
- immediate Event 字段继续不存在。

#### 调用与成本

| 项目 | Revision 18 | Revision 19 |
| --- | --- | --- |
| pre 1B | 每叙事回合 1 次 | 不变 |
| paid narrative | 每叙事回合 1 次 | 不变 |
| post 1B | 每叙事回合 1 次 | 不变 |
| shared dynamic 4B | `0/1` | 不变；仅现有结构化 route 唤醒 |
| background Event | 每 10 committed turns 异步 1 次 | 不变 |
| 并发/驻留 | serial，最多一个本地模型驻留 | 不变 |
| retry/repair/provider/Regex fallback | 0 | 0 |
| 玩家可见失败 | 对应 State proposal 省略，正文保留 | 不变 |

### 即时回合领域矩阵

这是本 PRD 的即时回合业务范围：只治理已存在的玩家当前行动、当前正文或下一步
合法行动必须立即依赖的生产路径。它不新增 Identity 外貌、Presentation、Item/
魔法生命周期或其他字段逻辑；宏观节奏、长期社会评价、人物记忆沉淀、世界事实、
线索、隐藏剧情线、建角/Opening 和显示翻译也不在本期范围。

下表是待通过只读调用链调研核实的产品方向，而不是声称每一行均已实现。
`1.7B` 指现有本地小模型层；`4B` 指唯一的串行动态槽位。模型列为空表示该领域
必须是零调用，不表示该领域没有校验。

| 即时领域 | Regex 与确定性权威 | `1.7B` 语义职责 | Embedding 职责 | `4B` 语义职责 | 每回合频率 |
| --- | --- | --- | --- | --- | --- |
| 付费正文与 Turn transaction | 请求/响应形状、事务 ID、提案隔离、Reducer 结算 | pre-turn 意图与 post-core 即时候选；不含 Event 结束 | 只有该回合请求知识时才检索 | 不能仅因付费正文存在而调用 | 每个叙事回合一次付费正文、两次本地核心阶段；下方可选领域不增加付费调用 |
| Checks | 骰子/算术、合法目标、修正、冷却与结果 | 将自然语言动作映射为有边界的 Check 提案；潜行/抵抗等不设正例召回硬门槛 | 仅对具名规则进行候选召回 | 禁止调用。当前行动的语义不足时不结算 Check，不得等待或升级到 `4B` 猜测 | 只有动作需要 Check 时才有一次 pre-turn 提案；提案不足则本回合不写 Check State |
| Identity / 生命状态 | Actor ID、现有伤势字段证据引用、合法既有生命转换 | 现有观察候选 | 默认不用 | 不新增普通回合 `4B` Identity 路由；现有 `injuryAssessment`/`injuries[]` 保持既有写入边界 | 通常零调用；本期不接入外貌、身体变化或生命周期字段 |
| 玩家移动 | 标签形状、地点匹配、地图邻接、房间 ID、锁、时钟成本、`movementOutcome` 与最终位置 | 仅为无地点的跟随标签选择 supplied guide/room ID 和逐字 evidence | 不使用 | 禁止 | 明确地点零模型；跟随复用现有 pre 1B；成功/已在场/失败均提交明确 outcome |
| NPC 离场 / Presence | `locationKnown`、Actor/房间/路径/evidence guard | post-core 解释单个 NPC 的 Presence 候选 | 不使用 | 默认不单独调用 | 明确 NPC 离开时零或一个候选；目的地未知写显式 unknown；与玩家移动和 Event 均解耦 |
| Calendar / Scene / 时间 | 世界时钟、日程 ID、场景生命周期、期限、合法时间推进；对已接受的明确时长执行分钟换算 | 承诺、场景边界、时间推进以及“当前动作有明确时长”的候选和 evidence | 必要时召回当前日程/历史 | 仅裁决有歧义的 canonical 场景/日历转换 | 时钟推进处每回合确定性执行；不允许代码或 Regex 从散文猜测时长动作是否发生 |
| Item / Presentation / Material | 现有 Item ID、主人/持有人/位置、数量、材质约束 | 仅负责现有路由候选 | 模糊物品名的候选召回 | 只复用既有已接线的观察路径；不新增持有、转交、穿戴、损坏、形态或展示生命周期逻辑 | 通常零调用；不得为本期新增动态 section |
| Spell | 现有 Spell ID、已知/可用规则、目标、消耗、冷却 | 仅负责现有路由候选 | 必要时召回允许的 Spell / 规则候选 | 只复用既有已接线的观察路径；不新增教学、学习、自定义效果或魔法生命周期逻辑 | 通常零调用；不得为本期新增动态 section |
| 感知 / 证人 | Event ID、房间/时间成员资格、来源引用、可见性与 witness ACL | post-core 只提感知候选，不判断 Event 结束 | 召回相关 Event 候选/历史 | 仅裁决会改变 canonical 证人/Event 状态的认识论歧义 | 每个叙事回合 post-core 可提出感知候选 |
| Event breathing boundary | checkpoint、稳定 turn/message 引用、evidence、唯一 boundary writer | 独立后台 qwen3:1.7b 每 10 committed turns 审查该批 10 回合 | 不使用 | 禁止 | ordinary turn 零调用；checkpoint 一次异步 1B |
| Map | 地图拓扑、房间 ID、出口、锁、位置与旅行成本 | 解释自然语言目的地 | 模糊地点/地标候选召回 | 默认不用；地图扩展是独立路由的世界创作操作 | 移动时确定性执行；模糊目的地才检索；绝不每回合隐式扩图 |
| Knowledge / ACL | 来源 ID、当前 canonical hydration、revision/timeline、谁能看见/目击/转述/持有该资料、替代关系 | 禁止：不需要 1.7B 判断检索意图或权限 | Embedding/精确索引只召回和排序候选；代码再按角色、来源、时间、版本和 ACL 过滤 | 禁止：4B 不能决定谁知道什么或授予知识 | 知识请求或对话激活时走一条确定性检索/过滤路径；健康零命中返回空；检索本身绝不写 State |

目标回合流水线：

```text
输入形状校验与确定性预检
-> 叙事回合需要时，一次 1.7B pre-turn 解释
-> 一次付费正文请求
-> 付费正文返回时立即展示
-> 一次 1.7B post-core 候选提取
-> 零或一次既有已接线的串行动态观察请求
-> 确定性 guards
-> 各领域 Reducer 仅结算有效提案
-> 每 10 committed turns 才 fire-and-forget 后台 Event 1B
```

Embedding 只是需要召回时的旁路查询：它绝不新增 State writer，也绝不变成第二次
语义裁决调用。已接线的可选观察不得并行；未接线的 Item、Spell、Identity section
或 destroy 微判不是本期实现目标，不能为了满足本表而新增调用。

### Knowledge / ACL：确定性检索与权限过滤

Knowledge 解决“有哪些已存在资料可能相关”；ACL 解决“当前玩家或这个具体 NPC
是否有资格看到它”。两者不生产新世界事实，也不授予知识。

```text
查询 / 当前动作
-> Embedding 或精确索引召回候选记录 ID
-> 代码从当前 canonical State/chat 重新 hydration
-> 代码检查 timeline、revision、clock、source、supersession、可见性
-> 代码按 public / actor-scoped / locked ACL 过滤
-> 只将有限且获准的记录给对应读者
```

`1.7B` 和 `4B` 都不参与 Knowledge/ACL：检索计划、候选排序、canonical hydration
和权限判断均由确定性代码完成。付费正文模型可以用最终获准的资料回答或表演，但
不能因为回答得像真的就新增知识、越权泄露，或写入 State。

Appraisal、Social、Memory、宏观 Pacing、世界事实、线索和隐藏 Story Arc 不在本
PRD 范围。它们不得借即时回合的 `1.7B`、`4B`、Embedding 或付费正文调用进行
积累、裁决或 State 写入，须由各自独立模块定义。

### 迁移语义 Regex：仅退休，不从旧正文补造事实

本期删除全部 26 条已登记的 `semantic_migration` Regex，但删除不是新增功能。
所有旧档兼容迁移统一遵守：

```text
已有明确结构化值 -> 保留
只有散文、名称、标签、错误文本或旧 Scene 描述 -> 不推断、不补造
缺失字段 -> 保持为空或该字段既有中性默认值
迁移失败 -> 原子不提交
```

| 旧迁移位置 | 旧 Regex 推断 | 本期退休后的行为 |
| --- | --- | --- |
| actor context / display name / memory | director 目标、临时角色名字、关系记忆 | 不从散文恢复；保持已有结构化值 |
| inventory / item | 魔杖、Item 社会/线索/承诺角色、借赠偷转交 | 不从聊天或物品描述创建/标记/转交 Item |
| NPC identity / injury observation | 伤势、疤痕、学生身份、检查后无伤 | 不从旧叙事补写 Identity；保留已有结构化字段 |
| spatial / map / time | 宿舍、古灵阁、目的地、开学日期和列车 | 不从旧正文移动角色、改地图或改时钟 |
| lifecycle | 错误文本中的地图目的地、场景标题 | 不从错误或场景文本重写 State |

这些 retirement-only 迁移更改不接入新的 Identity、Presentation、Item、Spell、
Memory、Opening 或生命周期业务逻辑。

### 玩家等待时间预算

目前不能诚实地给出“一个回合固定多少秒”。现有基准仅在 36 GB M3 Pro 上测量了
post 路由后的本地链路，明确不包含 pre-turn 和付费正文。因此不得把 post-chain
数字伪装成玩家完整等待时间。

| 玩家可见场景 | 付费正文之后的目标调用 | 研究机已测本地 post-chain | 当前能诚实声明的完整等待时间 |
| --- | --- | ---: | --- |
| 普通对话，无领域路由 | 一次 post-core 1.7B | `1.69-3.33 s` 研究基线；正式链一次 post 为约 `12.5 s` | 正式 G3：`narrative_visible=40.437 s`，`state_settled=55.817 s`，正文后即时结算 `15.380 s`；刷新后仍发生 Spell lifecycle migration，因此最终持久时间尚未通过 |
| 私下 Item 转交 | post-core + 一次共享 `4B` Item section | 平均 `6.75 s` | `T(pre-turn) + T(付费正文) + 6.75 s` |
| Item + Spell | post-core + 一次含两个 section 的共享 `4B` | `9.82-11.58 s` | `T(pre-turn) + T(付费正文) + 9.82-11.58 s` |
| Item 被销毁 | post-core + 共享 `4B` + 同驻留微判 | 约 `6.6-11.6 s` | `T(pre-turn) + T(付费正文) + 约 6.6-11.6 s` |
| Item + Spell + 可见伤势 | post-core + 一次含三 section 的共享 `4B` | `20.67-23.99 s`；平均 `22.76 s` | `T(pre-turn) + T(付费正文) + 20.67-23.99 s` |
| Knowledge/ACL 查询、Map 查询或 Calendar/Scene 即时变化 | 确定性检索和/或对应领域已批准的路由语义调用 | 尚未作为最终集成工作流测量 | 在 PM 确认流程并完成真实生产测量前，禁止声明秒数 |

`T(付费正文)` 依赖 provider/model；当前正式证据只覆盖一次普通回合，不代表稳定
分位数。面向玩家的目标仍是：付费正文一返回就显示，之后再结算彼此独立的 State
提案。语义提案失败不得新增付费调用或 retry。刷新后 Spell lifecycle 继续写
State 之前，禁止把 `55.817 s` 宣称为最终持久结算时间。

### Permanent responsibility boundary

| Mechanism | Owns | Forbidden |
| --- | --- | --- |
| Regex | characters, stable IDs, numbers, dates, JSON/fences, exact markers and finite grammar | intent, truth, injury, perception, movement, relationship, Item, Spell or any prose meaning |
| Embedding | semantic candidate recall and ranking | truth, equality, authority, rejection or State writes |
| Local small model | bounded natural-language interpretation with structured proposals and source references | direct State writes, retries, invented IDs or bypassing Reducers |
| Paid large model | player-facing narrative正文 | State authority, semantic settlement or hidden retry |
| Deterministic code | Schema, IDs, references, ACL, provenance, arithmetic and legal transitions | guessing missing prose meaning |
| Reducer | sole atomic State settlement owner | accepting unvalidated model/embedding/regex claims |

### Phase 1 only-decrease law

The baseline freezes the exact 221 semantic regex IDs and their owners. The
append-only retirement ledger starts empty.

- A new semantic regex ID fails.
- Relabelling an existing semantic row as lexical fails.
- Changing its registered semantic or deterministic owner fails.
- An unclassified new regex fails.
- A new shape-only regex requires explicit row-level review and registration.
- A semantic ID may disappear only with an appended retirement event.
- A retired semantic fingerprint reappearing in any category fails.
- Exact manifest, baseline and retirement-ledger bytes plus event count are
  anchored in the reviewed enforcement script.
- Persisted manifest metadata and every source identity field are compared
  directly with the AST scan; stale or forged rows cannot be dropped or pass
  through ID-only equality.
- Global Regex retirement closes only when both semantic categories reach
  zero; Revision 10 Phase 2 closes when its PM-confirmed immediate-turn subset
  is retired with append-only events.

### Three-phase roadmap

| Phase | Scope | Runtime/call impact |
| --- | --- | --- |
| Phase 1, current | establish law, register 578 rows and owners, lock semantic rows to only decrease | zero behavior change; zero call change |
| Phase 2, in progress | use `pre -> post -> optional dynamic 4B -> optional destroy micro -> Reducers`; retire the PM-confirmed immediate-turn semantic Regex subset | implement the complete immediate-turn chain first; run physical 8 GB acceptance only after implementation and in-scope retirement are complete |
| Phase 3, future | append-only preselection ledger for paid large-model narrative正文 | separate PRD revision after Phase 2; no automatic retry and no regex semantic fallback |

Phase 3 is intentionally narrower than rejected Revision 4. It concerns paid
player-facing narrative正文, not a global archive of every internal structured
Director JSON response.

## 5. In Scope

Phase 1 includes only:

- the permanent mechanism boundary in this PRD and Spec;
- row-level registration of all 578 current regex constructions;
- explicit semantic and deterministic owners for all 221 violations;
- an immutable semantic baseline, append-only retirement ledger and machine
  gate enforcing only-decrease and no resurrection;
- registration of Phase 2 call-order evidence and acceptance blockers;
- registration of Phase 3 narrative-preservation military rules;
- Product Spec, tasks, checklist and progress synchronization.

Revision 7 additionally includes governance-only work:

- a permanent registry covering every active model-output contract and all
  registered semantic owners;
- a human-readable responsibility table;
- a permanent Skill rule requiring each future system to update its own row
  and add a new domain-owned focused test file.

Revision 10 只治理已存在的即时回合生产字段、调用链和语义 Regex 债务。它将这些
既有路径纳入业务调研、调用链盘点、责任分类和集成延迟测量范围。在
`HVG-P2-G2` 通过前，它不授权为任何尚未接入的 Identity、Presentation、Item 或
生命周期字段做实现设计或修改生产代码。

Revision 10 明确排除 Appraisal、Social、Memory、宏观 Pacing、世界事实、线索和
隐藏 Story Arc。它们不能使用本 PRD 的模型调用、积累队列或 Reducer 作为实施入口。

Revision 11 的运行时 Regex 退休登记按领域边界执行：`local_appraisal_1_7b`、
`local_translation_4b`、Opening/Initial World、宏观 Pacing/世界事实/线索/Story
Arc 相关行均为 `excluded_registered`。它们保留在不可变全局基线和责任表中，不属于
本期 `HVG-P2-04` 的 retirement 集合，也不得被重标为 lexical。

未接入的 Identity 外貌字段、Presentation、Item 生命周期和魔法生命周期仍属于
`hogwarts-identity-presentation-lifecycle` 独立 TODO。本期不以“即时回合模块”
名称新增这些逻辑；该模块登记仅要求未来接入时必须整体评估其现有链路与边界。

The completed Phase 2 task `HVG-P2-01` includes:

- a production local-model task and HTTP endpoint for the accepted routed
  dynamic 4B Identity contract;
- one executable result descriptor generating actor-target-bounded runtime
  Zod and transport JSON Schemas, plus stable narrative-segment evidence;
- deterministic route, actor, evidence, confidence and inspection guards;
- one new domain-owned focused test file;
- blind production-request acceptance before ordinary-turn wiring.

`HVG-P2-01` does not yet route ordinary turns through the new endpoint.
That cutover is `HVG-P2-03`. Physical 8 GB validation runs only after
`HVG-P2-03/04/05` produce the final integrated candidate.

## 6. Non-Goals

Phase 1 does not:

- edit production, server, UI, Prompt, Schema, validator, normalizer, Reducer,
  migration, test behavior or save data;
- remove or replace any of the 221 semantic regex rows;
- change model order, concurrency, context, residency or call count;
- run a model request;
- implement Identity inside the dynamic 4B follow-up;
- claim support for an 8 GB machine;
- implement a response ledger, preselection UI or persistence API;
- fix existing Social or Scene Transition Prompt-budget debt.

Revision 7 also does not add a Money system, change any production contract,
move a validator, alter a Prompt/Schema, change model calls, add a central
runtime validator, or add a generic cross-domain registry test. Existing
contract debt is recorded as `legacy_registered`; each future system owns its
own implementation and tests.

Revision 10 also does not implement or redesign Appraisal、Social、Memory、宏观
Pacing、世界事实、线索、隐藏 Story Arc、建角/Opening、迁移、Translation 或
进程健康/任务账本。这些领域的当前生产行为保持不变。

Translation 从未获得本期生产改造授权，也没有被本期代码、模型调用、State 或
验收路径修改；它此前出现在范围表中是规划分类错误，不构成独立 TODO 或后续承诺。

During `HVG-P2-01`, the existing ordinary-turn post observer and its Identity
path remain active until the approved cutover task. The new dynamic Identity
endpoint is not a semantic fallback and is not called by ordinary gameplay
before that cutover.

Revision 10 禁止把表中提出的模型/频率格子当成实现授权；禁止因为当前没有 Regex 行
提到某领域就悄悄忽略它；禁止仅用已测 post-chain 数据宣称端到端回合延迟。

Revision 12 只规划修改既有 pre/post 1.7B System Prompt。它不修改 4B Prompt、
Schema、transport、guard、Reducer、State、Knowledge、调用图或持久化，也不把
production-effect audit 中发现的 dynamic 4B hypothetical 风险夹带进本任务。

本治理变更不包含现有因果后果节拍（Pacing）、世界事实、线索或隐藏 Story Arc。
它们由独立的
[`hogwarts-causal-pacing-world-facts-story-arcs`](../hogwarts-causal-pacing-world-facts-story-arcs/prd.md)
research TODO 负责；不得通过本 PRD 的 `4B` 或积累性高阶推理模块改变其行为。

## 7. Runtime Contract Impact

Phase 1 and the Revision 7 responsibility registry have no runtime field
impact.

`HVG-P2-01` adds a transient local API request and proposal response only. Its
request carries bounded narration segments, structured Identity target Actor
IDs, structured inspection target Actor IDs and bounded Actor route context.
Its response carries guarded `identityObservations` proposals and diagnostics.
It does not write, migrate, alias, deprecate or expose a State, message,
Knowledge, session or UI field. The existing Identity Reducer remains the
sole writer of:

```text
actorLibrary[].identity.body.injuryAssessment
actorLibrary[].identity.body.injuries[]
```

The ordinary-turn writer and reader graph remains unchanged until
`HVG-P2-03`. The living runtime contract registers the new task as
`server_ephemeral`: it is excluded from `modelTaskRuntime`, does not increase
`stateRevision` and cannot persist an endpoint attempt into a save.

Revision 12 runtime field impact: None. Prompt tuning may change only transient
1.7B proposals already registered by `VCON-012` and `VCON-013`. Existing
deterministic guards and owning Reducers remain the only State boundary.

Revision 14 runtime field impact: None in this documentation revision. The
future, separately approved production fix will change settlement conditions
for existing Actor/Interaction/Presence fields only; it must not add a runtime
field, change Event/Memory writers, or reinterpret historical Event data.

Later Phase 2 cutover and Phase 3 field impacts must be specified before those
implementation tasks begin.

## 8. Migration and Compatibility

Phase 1 has no runtime migration and no compatibility path.

Revision 12 has no migration or compatibility path. A losing Prompt variant is
discarded; rollback restores the previous two System Prompt constants and
requires no save rewrite.

The current source behavior and saves remain byte-for-byte governed by the
existing runtime. The registry describes violations; it does not reinterpret
or repair current State.

Future Phase 2 migrations must use explicit structured values or approved
conservative defaults. They may not inspect prose with regex or call a model.
For destroyed Items, `state=destroyed` does not imply
`physicalForm=absent`; missing form remains governed by the permanent Item
existence invariant.

## 9. Prompt Field Budget

### Phase 1

Prompt impact: None.

Model-call impact: None.

Revision 7 registry impact: None. It records current and target ownership but
is not imported by production runtime code.

| Operational measure | Before Phase 1 | After Phase 1 |
| --- | --- | --- |
| Calls per normal action | existing runtime | unchanged |
| Worst-case calls | existing runtime | unchanged |
| Sequential/concurrent behavior | existing runtime | unchanged |
| Model sharing/residency | existing runtime | unchanged |
| RAM/VRAM pressure | existing runtime | unchanged |
| User-visible latency | existing runtime | unchanged |
| Paid calls/retry/fallback | existing runtime | unchanged |

### Phase 2 Ollama evidence incorporated into this PRD

Measured machine:

```text
MacBook Pro Mac15,6
Apple M3 Pro, 12 cores
36 GB unified memory
Ollama 0.32.6
qwen3:1.7b Q4_K_M, 1.4 GB model file
qwen3:4b   Q4_K_M, 2.5 GB model file
```

Complex Item + Spell measurements:

| Strategy | Wall time | Peak RSS | Quality |
| --- | ---: | ---: | ---: |
| three serial 1.7B calls | 9.58 s | 2.09 GB | 52.5% |
| three parallel 1.7B calls | 7.07 s | 3.09 GB | 52.5% |
| three serial 4B calls | 17.55 s | 3.37 GB | 63.4% |
| three parallel 4B calls | 12.99 s | 4.64 GB | 63.4% |
| mixed parallel, one loaded-model slot | 10.24 s | 4.61 GB | 55.4% |
| mixed parallel, two loaded-model slots | 8.70 s | 7.58 GB | 55.4% |
| one merged 1.7B call | 11.43 s | 2.10 GB | 39.6% |
| one merged 4B call | 17.05 s | 3.37 GB | 73.3% |

Dependency-aware post/follow-up measurements:

| Strategy | Wall time | Peak RSS |
| --- | ---: | ---: |
| post 1.7B -> Inventory 4B -> Spell 1.7B | 11.80 s | 3.36 GB |
| post -> same-1.7B follow-ups parallel | 8.08 s | 2.58 GB |
| post -> mixed follow-ups, one model slot | 11.45 s | 3.98 GB |
| post -> mixed follow-ups, two model slots | 10.37 s | 6.43 GB |

Two-model parallelism saves only 1.43 seconds over the realistic serial path
while adding about 3.07 GB. It is rejected for the low-memory target.

The Phase 2 candidate is:

```text
pre-turn 1.7B
-> post core 1.7B
-> optional one dynamic 4B containing only requested
   Inventory / Spell / Identity sections
-> optional 1024-context remains|absent micro-decision
   on the same resident 4B
-> deterministic guards and Reducers
```

Candidate complex Item + Spell post-chain result:

```text
average: 10.44 s
peak RSS: 3.06 GB
peak loaded models: 1
post/dynamic context: 2048
```

Pre-turn and unchanged Appraisal/translation calls are not included in that
10.44-second post-chain measurement.

Benchmark-only worst-case Identity + Item + Spell result:

```text
average: 22.76 s
peak RSS: 3.04 GB
peak loaded models: 1
post/dynamic context: 2048
quality: 800 / 800 route + semantic checks
```

This adds 12.32 seconds to the earlier Item + Spell synthetic complex turn but
does not add model residency or memory pressure.

Quality progression:

| Design | Accepted checks |
| --- | ---: |
| split 1.7B | 52.5% |
| split mixed 1.7B/4B | 55.4% |
| merged 1.7B | 39.6% |
| merged 4B | 73.3% |
| staged candidate before final refinements | 88.2% |
| candidate plus dynamic operation Schema and guards | 96.8% |
| candidate plus destroy micro and stable perception reference | 97.8% |
| oracle-fed dynamic Identity attempt | rejected despite reported 100% |
| independently routed dynamic Identity candidate | **100% (800/800)** |

Destroy-form micro-classification passed 10/10 on 1.7B and 10/10 on 4B over
five seeds and two evidence cases. The perception micro-task failed and is not
part of the proposal.

### Phase 2 research result and final gates

Fresh independent acceptance attempt 3 passed the corrected research evidence:

```text
route derived from structured paid/directive/pre-turn signals
9 cases x 5 seeds = 45 chains
800 / 800 route + semantic checks
740 / 800 raw model checks before deterministic guards
0 route failures
0 parse errors
maximum prompt + output: 1673 / 2048 tokens
```

The accepted result depends on deterministic guards rejecting invalid
same-room movement, event closure and participant claims, and resolving one
Identity evidence substring through its stable segment index. It is not a
claim that raw 4B output is perfect.

Final validation gate:

1. After call-chain cutover and all runtime/migration semantic Regex
   retirements are complete, run that final candidate on a physical 8 GB
   machine with SillyTavern and the normal browser workload. Until it passes,
   the product must not claim low-memory or 8 GB support.

The fresh context-free blind request for `HVG-P2-01` passed the exact
production parser, deterministic guards and existing Identity Reducer with
one response and zero retry, repair or fallback. Evidence:
[phase2-production-identity-blind-report-attempt-2.md](./acceptance/phase2-production-identity-blind-report-attempt-2.md).

The fourth fresh independent project-goal Agent accepted the complete
`HVG-P2-01` tranche:
[phase2-production-identity-independent-report-attempt-4.md](./acceptance/phase2-production-identity-independent-report-attempt-4.md).

Revision 7 Phase 2 production implementation was explicitly approved by the
user on 2026-08-17. The user subsequently corrected the execution order:
physical 8 GB validation must exercise the complete final implementation, not
gate call-chain cutover or Regex retirement. Revision 8 requires explicit
approval before `HVG-P2-03` implementation begins.

Proposed Phase 2 settings are evidence, not current runtime authority:

```text
OLLAMA_NUM_PARALLEL=1
OLLAMA_MAX_LOADED_MODELS=1
post context=4096
shared dynamic follow-up context=4096
destroy micro context=1024
unload after the chain
```

### Revision 12 1.7B Prompt baseline and budget policy

Only System text changes. Input fields, output Schema and transport remain
byte-for-byte unchanged.

| Task | Current representative-save message chars | Current transport chars | Runtime context | Revision 12 policy |
| --- | ---: | ---: | ---: | --- |
| pre-turn 1.7B | `9,214` | `11,017` | `4096` | quality-first; no artificial lower character target |
| post-core 1.7B | `10,758` | `14,927` | `4096` | quality-first; no artificial lower character target |

The figures are measurement, not an acceptance verdict. System Prompt,
transport Schema, player action, route IDs, current room and Actor context stay
protected. A variant may reorder or replace rule prose and examples, but may
not trim protected inputs, drop a domain, add another semantic source or
increase model calls.

Each candidate records:

```text
System chars and hash
actual Ollama prompt_eval_count / eval_count
p50 / p95 latency
per-family positive recall
per-family guarded false-positive rate
```

No Prompt wins because it is shorter. It wins only when holdout and real
production State outcomes pass while call count, retry policy and protected
fields remain unchanged.

### HVG-P2-01 production Prompt budget

The new endpoint uses the approved dynamic context target as exact runtime
authority:

```text
task: local_dynamic_identity_observer
model: qwen3:4b
num_ctx: exactly 2048
hard Prompt policy: 6000 characters including transport Schema
protected: System rules, complete target-bounded Schema, route IDs,
           narration segments and routed Actor labels
overflow: reject before a model call; no truncation
```

Measured through the production request constructor:

| Production request | System | User | Transport Schema | Total |
| --- | ---: | ---: | ---: | ---: |
| one routed Actor | 1,105 chars | 239 chars | 639 chars | 1,983 chars |
| blind mixed Identity case | 1,105 chars | 548 chars | 656 chars | 2,309 chars |

This adds no fields to the existing post-turn Prompt. It is a separate
transient endpoint request and replaces no production reader until
`HVG-P2-03`. `HVG-P2-01` rejects over-budget requests before Ollama rather than
truncating narration, target IDs, System rules or Schema.

| Operational measure | Ordinary gameplay before/after HVG-P2-01 | Direct Identity endpoint |
| --- | --- | --- |
| Local model calls | unchanged | 0 unrouted; exactly 1 routed |
| Execution | unchanged | serial through the existing local queue |
| Loaded model | unchanged | one qwen3:4b, unloaded after response |
| Measured latency | unchanged | 7.92 s Ollama total, including 2.50 s load, on the 36 GB M3 Pro |
| Paid calls | unchanged | 0 |
| Retry/repair/provider fallback | unchanged | 0 |
| State writes | unchanged | none; guarded proposal only |

## 10. Frontend Field Whitelist

Phase 1 frontend field whitelist: None.

There is no frontend read/write, DOM sink, localization route or UI behavior
change. Historical draft ledger registry rows are not activated by this phase.

Phase 3 must define its own exact narrative ledger and UI whitelist before
implementation.

## 11. Acceptance Criteria

| Requirement | Workflow | Required result | Forbidden result | Evidence |
| --- | --- | --- | --- | --- |
| complete registry | scan both Hogwarts JS roots | exactly 578 rows, 355 lexical, 195 runtime semantic, 26 migration semantic, 2 dead and 0 unclassified | missing, duplicate or broad file-level classification | manifest fingerprint, 54-row correction evidence and AST command |
| fixed ownership | inspect every semantic row | every one of 221 rows has semantic owner, deterministic owner and Phase 2 action | generic/blank owner | row registry and owner-count reconciliation |
| only-decrease | run enforcement after baseline | persisted full row identities match AST; complete manifest history is anchored; current semantic IDs equal anchored baseline IDs minus anchored append-only retirement events | stale/forged row metadata, lexical/rationale rewrite, file tamper, new semantic ID, unregistered deletion, relabel, owner mutation or retired-ID resurrection | script hash/count anchors and synthetic negative gate tests |
| zero behavior change | inspect scoped diff | no production/runtime/test/save/Prompt/call file changed | any business behavior or call change | scoped Git diff and no-model execution record |
| cross-mechanism coverage | inspect the permanent responsibility registry | current model-output domains and semantic owners name their Schema/transform/validator/writer/failure/call ownership; Regex and Embedding boundaries remain explicit | unowned stage or hidden second writer | JSON registry and human table review |
| future-domain completeness | review a new system's PRD/Spec and tests | the new system appends/updates its own registry row and adds a new domain-named focused test file covering success, rejection, no-State failure, no semantic fallback and call budget | claiming unrelated Inventory/Spell/registry tests as coverage for Money or another new system | owning system's focused tests and independent acceptance |
| table consistency | review JSON and Markdown together | both responsibility-table views are updated in the same owning-system change | one view silently diverges | code review |
| Phase 2 completion order | inspect task/checklist | implement immediate-turn call-chain cutover, retire every PM-confirmed in-scope runtime/migration semantic Regex row, then run physical 8 GB and final independent acceptance on that exact candidate | running 8 GB on a partial implementation, or claiming immediate-turn low-memory support early | tasks/checklist/PRD |
| 1.7B positive State recall | run the current pre/post positive and negative matrices through exact production requests, guards and settlement | post Item route/Actor/Material/temporal remain per-family `>=95%`; follow-NPC `movementIntent >=95%`；潜行/抵抗 Check 不设正例 recall 硬门槛；时长算术 `100%`；Calendar prefixed-date miss is the explicit TODO | aggregate score hides a failed hard family，Calendar TODO is called passed，或为漏判增加 4B/Regex 补猜 | prompt-tuning evidence and production State diff |
| 1.7B guarded precision | run all negative, hypothetical, quoted, stale-ID, Actor-presence and Event-boundary cases | zero incorrect State writes; stable accepted Actor IDs `100%` | recall improvement reintroduces Regex-like keyword false positives | domain tests, blind holdout and Reducer outcomes |
| Prompt-only isolation | inspect scoped diff and call capture | only pre/post System Prompt plus domain-owned tests/evidence change; call order/count, Schema, guards, Reducers and State fields are unchanged | production 4B change, Schema expansion, new route field, retry or fallback; offline benchmark `modelOverride` experiment is evidence only | Git diff, VCON rows and captured call ledger |
| holdout generalization | fresh context creates at least `30%` unseen Chinese/English/mixed paraphrases and runs each once | same per-family thresholds as development matrix; no response coaching | expected answers or validation feedback enter model input | context-free blind report |
| Revision 21 GLiNER2 comparison | freeze zero-shot schema/adapter/scorer, generate a new isolated corpus, then run current qwen3:1.7b and GLiNER2 once on every same case | every family positive/negative/no-change is no worse, false writes do not increase, at least one failed family and mixed completeness strictly improve; no `>=95%` requirement | unsupported output called no-change, aggregate/latency hides a family regression, post-reveal tuning, production or State write | Revision 21 hashes, same-corpus branch evidence, detached guard results and family-first report |
| production-effect acceptance | exercise Calendar promise/question, immediate concrete-step action/discussion, Item placement/hypothetical and Actor/Event no-change in a disposable real workflow | player-visible narrative retained; the paid System Prompt handles concrete-step completion directly; exact expected State is written or unchanged | synthetic harness pass substitutes for production workflow, or pre 1B progression classification returns | browser/E2E State before/after evidence |
| NPC departure / Event decoupling | exercise an explicit named departure during a still-open long interaction; an Event conclusion without a departure; and non-departure actions | named NPC settles independently on valid departure evidence; Event remains open until its own evidence; Event end creates no mass departure | individual exit ends the Event; Event end removes an NPC; camera/posture/name mention writes departure; invalid evidence changes Actor/Presence | focused Actor/Presence test plus disposable real workflow |
| explicit player movement | click/tag reachable, current, locked and unreachable rooms | existing destination tags settle `moved/already_there/failed` deterministically at `100%`; only moved changes location/lastMovement | 1B reinterprets a concrete room; failure is silent; locked route moves player | focused movement test and disposable real turn |
| follow-NPC movement intent | run current-local and immediately-prior-departed Actor cases in Chinese/English/mixed wording | one pre call selects only supplied guide/room/evidence; positive recall `>=95%`; invalid/hypothetical/no-tag cases create no false movement | invented Actor/room, older departed Actor, semantic Regex/4B/retry, or aggregate score hiding family failure | blind pre holdout through production guard |
| movement outcome settlement | settle moved, already-there, unknown destination, conflicting destination, invalid evidence, locked path and model failure | exactly one committed `movementOutcome`; failed/already preserve location and `spatial.lastMovement`; failed consumes 15 minutes | silent no-op, stale movement mutation, missing transaction outcome, or failure aborting the paid turn | movement Reducer tests and State/transaction diff |
| movement failure handoff | run paid performance for every stable failure reason | current Prompt receives protected outcome; visible正文 states attempt, reason and remaining room; deterministic fact insertion preserves every paid segment | model narrates arrival, reason disappears, second paid request, or paid segment deletion/rewrite | build-only Prompt capture, output fold test and rendered workflow |
| background Event cadence | commit turns 1–20 with ended/not-ended/failure checkpoints | zero immediate Event fields; one async 1B at 10 and 20 over the matching 10 committed turns; failure waits for next checkpoint | current turn awaits Event, retry, Scene close or NPC movement from boundary | focused background Event test and task ledger |
| Phase 3 boundary | inspect PRD | narrative正文 remains visible; only State proposal may be rejected; no retry; no semantic regex fallback; append-only forward repair | global structured-output scope silently restored | PRD and future Phase 3 approval |

Phase 1 commands:

```text
node --check .trae/specs/hogwarts-validator-governance/inventory-regex.mjs
node --check .trae/specs/hogwarts-validator-governance/apply-regex-review.mjs
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs \
  --self-test-semantic-gate
node .trae/specs/hogwarts-validator-governance/inventory-regex.mjs \
  --require-classified
```

## 12. Risks and Rollback

Phase 1 risks:

- a semantic row is incorrectly labelled lexical;
- an owner is too broad to support Phase 2 removal;
- someone regenerates or relabels the baseline instead of deleting source;
- governance prose is mistaken for implemented runtime behavior.

Mitigations:

- stable row fingerprints and source locations;
- explicit semantic and deterministic owners;
- broad file-level classifier retired;
- exact reviewed corrections retained as evidence;
- append-only retirement events required before a semantic ID may disappear;
- full-file hash and event-count anchors require any manifest, baseline or
  ledger revision to change reviewed enforcement code visibly;
- every persisted source identity field and top-level scan metadata is checked
  against Acorn output;
- new/unclassified semantic rows fail;
- Phase 1 repeatedly states zero runtime behavior and zero call changes.

There is no production rollback because Phase 1 changes no production
behavior. Correcting a category or owner requires an explicit reviewed PRD
revision and baseline update; silently resetting the baseline is forbidden.

Revision 12 risks:

- overfitting the two observed false negatives while another State family
  regresses;
- increasing recall by accepting questions, hypotheticals or mentions as
  enacted changes;
- examples teaching display text such as `boy` as an Actor ID;
- aggregate accuracy hiding a failed current Calendar or Item family.

Mitigation is the per-family positive/negative matrix, `30%` unseen holdout,
stable-ID `100%` gate, exact production settlement, one-shot blind run and
disposable-save State before/after. Rollback restores only the prior two
System Prompt constants.

## 13. Approval

The user explicitly authorized Phase 1 on 2026-08-16:

- put the concurrency report into this PRD;
- register Identity integration as a TODO;
- fix the Regex/Embedding/small-model/large-model/Reducer boundary;
- register all 578 regex rows and all semantic owners;
- lock semantic regex to only decrease;
- make zero behavior and zero call changes.

Phase 1 governance work is authorized by that instruction.

On 2026-08-16 the user explicitly required the registry to be upgraded before
Phase 2 production so future domains such as Money cannot bypass the same
ownership process. Revision 7 is authorized for governance artifacts and
the permanent per-system test rule only. It does not authorize Phase 2
production behavior. The user rejected a central executable registry gate;
future enforcement is owned by each new system's tests and acceptance.

Fresh independent acceptance attempt 5 passed every Phase 1 criterion. The
pass is recorded in
[`phase1-independent-report-attempt-5.md`](./acceptance/phase1-independent-report-attempt-5.md).

Fresh independent acceptance attempt 3 passed the benchmark-only Phase 2
Identity research gate. The pass is recorded in
[`phase2-identity-research-report-attempt-3.md`](./acceptance/phase2-identity-research-report-attempt-3.md).
It does not approve production implementation or physical 8 GB support.

The 2026-08-16 approvals did not authorize Phase 2 or Phase 3 implementation.
On 2026-08-17 the user explicitly approved starting Phase 2 production from
Revision 7, and `HVG-P2-01` completed under that approval. Later on 2026-08-17
the user explicitly corrected the sequence: complete `HVG-P2-03/04/05`
before physical 8 GB validation. This creates Revision 8; Revision 7 approval
is stale for remaining Phase 2 implementation until the current PRD, Spec,
tasks and checklist are explicitly approved. Phase 3 remains unauthorized and
requires its own later PRD/Spec review and explicit approval.

On 2026-08-17, after Revision 11 narrowed the work to the existing Immediate
Turn Module and explicitly excluded Social, Appraisal, Memory, Pacing, world
facts, clues, Story Arc, Opening and Translation, the user directed Phase 2
to continue. This is explicit implementation approval for `HVG-P2-03`,
`HVG-P2-04`, and `HVG-P2-G3` only. It does not authorize any deferred
Identity, Presentation, Item or magic-lifecycle field.

On 2026-08-17 the user requested that the current production-effect report be
placed in this PRD and that a 1.7B State-recall Prompt tuning plan be drafted.
That instruction authorizes Revision 12 documentation only. It does not
authorize editing `PRE_TURN_SYSTEM` or `POST_TURN_SYSTEM`; tasks
`HVG-P2-03R-*` remain pending until the user explicitly approves this revision.

The user then explicitly approved implementation with the instruction that a
1B Prompt may be as long as needed provided it does not interfere with the
final output. Revision 12 implementation is therefore authorized. Prompt
length remains measured, but State quality and successful complete JSON output
are the decision criteria.

Implementation did not meet the approved threshold. Pre reached `24/24` on
development but only `18/24` on the final unseen holdout; post reached `17/24`
on development and therefore did not proceed to holdout. All experimental
Prompts were rolled back. The failure is not permission to alter model tier,
Schema decomposition, call count or deterministic semantic ownership without a
new approved revision.

On 2026-08-18 the user confirmed the complete Revision 16 product boundary:
latest committed 10-turn Event windows; existing pending-boundary/next-intent
downstream; explicit unknown Actor location; minute minimum unit; exact
Chinese/English/Arabic integer minute/hour/day grammar; compound durations;
seven-day maximum; no seconds, vague values or ranges. This approves product
semantics. Production implementation remains paused until the user explicitly
approves the synchronized Revision 16 PRD, Spec, tasks and checklist.

The user then confirmed Revision 17 movement semantics: guide candidates are
current same-room/interaction Actors plus an Actor that explicitly departed in
the immediately prior committed turn; destination priority is explicit player
room, then a known Actor room, then exactly one room in recent public evidence;
every tagged failure commits an ordinary 15-minute turn, preserves player
location and `spatial.lastMovement`, and must be stated in the current paid
narrative. Fixed-PM discovery and production-informed recheck both passed.
This approves the product scope but not implementation. Revision 16 approval
is stale; production implementation requires explicit approval of the
synchronized Revision 17 PRD, Spec, tasks and checklist.

On 2026-08-18 the user explicitly approved Revision 18: remove the pre-turn
1B `progression` proposal, add one concise paid System Prompt rule for
completing legal immediate concrete steps, and start production implementation.
The replacement fixed PM returned `PASS`. This approval does not restore
immediate Event judgment, add a model call, or grant paid narrative State
authority.

On 2026-08-18 the user explicitly approved Revision 19: record Calendar
optimization as a TODO, ship the current pre transformation, then begin the
post round. Fixed-PM initial and production-informed reviews returned `PASS`.
This approval preserves existing Material behavior, does not call the known
Calendar miss passed, and authorizes post changes only for the five existing
post output families listed above.

On 2026-08-18 the user approved the Revision 20 research direction:
structured candidate wake-up, one dynamic post Schema, no semantic Regex and
no seen-matrix acceptance. Revision 20 artifacts were then explicitly
approved and executed. Fresh development rejected every branch, so no blind
or production implementation was authorized.

The user subsequently requested external research into analogous systems.
That research and its second fresh independent review passed, but it did not
authorize a new architecture.

On 2026-08-18 the user selected Revision 21's product direction:
off-the-shelf GLiNER2, no fine-tuning, compare first, and accept a candidate
that is strictly better than the current baseline without requiring
per-family `>=95%`. Fixed-PM initial and corrected production-informed reviews
both returned `PASS`.

The user then explicitly approved artifact revision
`21-gliner2-zero-shot-comparison`. Attempt 1 substantively rejected
off-the-shelf GLiNER2, but independent acceptance found scorer, baseline raw
evidence and immutable-freeze defects. Its exact metrics are historical
failed evidence. Corrected attempt 2 used freeze commit `34220cfd5` and a new
fresh corpus; it also rejects GLiNER2 for no positive-family/mixed improvement
and multiple recall/safety regressions. A second independent review found a
remaining negative-safe scorer defect. The user explicitly stopped further
recalculation. The final report keeps the robust no-trial result and marks
exact negative-safe metrics unaccepted. Production remains unchanged.
