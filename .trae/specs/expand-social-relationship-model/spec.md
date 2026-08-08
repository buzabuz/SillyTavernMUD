# 扩展人物关系模型与关系星图 Spec

## Why

现有人际图把关系主要压缩为熟悉、信任、亲近、张力和保护倾向，难以表达“熟悉但厌恶”“亲近却心怀怨恨”“尊敬但害怕”“互为宿敌”等重要关系。与此同时，玩家缺少一个能从全局观察人物网络的固定入口，Social Director 也缺少明确的数值锚点，导致关系增量缺乏一致尺度。

## 调研结论

1. **关系结构不能只用好感度。** Interpersonal Circumplex 将人际行为组织为相互独立的 `communion/warmth` 与 `agency/dominance` 两个轴，说明温暖和权力位置不是同一个概念。[Wilson et al., 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5507693/)
2. **亲近应是独立维度。** URCS 研究把 closeness 作为跨朋友、家庭和伴侣关系都成立的单维构念，而不是熟悉度或喜欢程度的别名。[Dibble et al., 2012](https://doi.org/10.1037/a0026265)
3. **短期情绪与长期关系应分层。** OCC 用对事件、行动者和对象的 appraisal 生成具体情绪；FAtiMA 也将 emotional appraisal、belief、decision making 与 social importance 分成不同组件。[OCC 新版概述](https://doi.org/10.1017/9781108934053)；[FAtiMA Toolkit](https://dl.acm.org/doi/10.1145/3510822)
4. **负面事件应更快、更持久，但不能直接等同为仇恨。** “Bad is stronger than good”综述显示同强度负面信息通常比正面信息更影响印象与关系，因此信任损失、羞辱和伤害需要负面不对称；但修复必须依赖道歉、补偿或原谅等可追溯事件，而不是普通善意自动抵消。[Baumeister et al., 2001](https://doi.org/10.1037/1089-2680.5.4.323)
5. **关系升级需要相处质量和时间，而非同处一室。** Hall 的研究发现共同时间与关系阶段相关，且玩乐、认真交流和表达关心比被迫同处更能推动亲近；约 40–60 小时才从熟人走向普通朋友，超过 200 小时才常见亲密朋友。[Hall, 2018](https://doi.org/10.1177/0265407518761225)
6. **社交模拟必须让状态影响行为。** Prom Week/CiF 会持续追踪人物历史和关系，并让关系反过来影响可用互动；只显示 meter 而不影响行为会失去意义。[UCSC Prom Week](https://news.ucsc.edu/2012/02/prom-week.html)；[Scheherazade's Tavern](https://doi.org/10.1145/3402942.3402984)
7. **全局人物图选择 Cytoscape.js。** 当前每个时间线的人物规模远低于大型 WebGL 网络，Cytoscape.js 已提供有向图、图片节点、布局、筛选、缩放、触摸操作和图算法，无需引入 Sigma.js + Graphology 的额外数据层。[Cytoscape.js 官方文档](https://js.cytoscape.org/)

## What Changes

- 将 `socialGraph` 升级为 v2 多维有向关系模型。
- 将“持续关系状态”和“短期事件情绪”分层存储。
- Social Director 输出带数值锚点的维度提案；LangGraph Reducer 仍是唯一数值权威。
- 引入明确的阶段阈值、增量带、负面不对称、重复衰减、饱和衰减和关系修复规则。
- 保留 statement/evidence/sourceMessageIds/witnessedBy provenance 和幂等 ID。
- 新增固定顶栏入口“关系星图”，以全屏桌面面板展示玩家已知的人物网络。
- 使用 Cytoscape.js 绘制可交互有向网络，支持人物筛选、边筛选、证据查看和人物卡联动。
- 迁移现有 `affinity` 等 v1 字段，不重新调用模型，不丢失当前 Tina 存档。
- **BREAKING**：`relationshipEvidence.weightDelta + type` 不再直接决定最终单一维度；v2 使用 `dimensionDeltas` 和 `emotionAppraisals`，旧字段仅作为 v1 迁移输入。

## Impact

- Affected specs: LangGraph Social Director、人物知识胶囊、人物卡、全局游戏导航、本地知识库、存档迁移。
- Affected code:
  - `src/hogwarts-mud/social-director-graph.js`
  - `src/endpoints/hogwarts-mud.js`
  - `src/endpoints/backends/chat-completions.js`
  - `public/scripts/extensions/hogwarts-mud/helpers.js`
  - `public/scripts/extensions/hogwarts-mud/index.js`
  - `public/scripts/extensions/hogwarts-mud/panel.html`
  - `public/scripts/extensions/hogwarts-mud/style.css`
  - `public/scripts/extensions/hogwarts-mud/knowledge.js`
  - `package.json`
  - `tests/hogwarts-mud.test.mjs`

## ADDED Requirements

### Requirement: 分层关系模型

系统 SHALL 为每条有向关系边保存以下长期维度：

| 维度 | 范围 | 含义 |
| --- | --- | --- |
| `familiarity` | 0–100 | 对对方信息、习惯和历史的了解程度，不代表喜欢 |
| `closeness` | 0–100 | 自愿投入、共同经历、脆弱性分享和相互依赖 |
| `warmth` | -100–100 | 冷漠/厌恶到喜爱/关怀，对应 communion |
| `trust` | -100–100 | 预期背叛到愿意托付 |
| `respect` | -100–100 | 轻蔑到敬重 |
| `influence` | -100–100 | 反抗对方影响到愿意受其引导，对应 dyadic agency |
| `tension` | 0–100 | 当前关系的尴尬、冲突和爆发风险，可较快衰减 |
| `resentment` | 0–100 | 未修复的委屈、怨恨和报复债务，缓慢衰减 |
| `fear` | 0–100 | 对对方造成伤害或失控的预期 |
| `protectiveness` | 0–100 | 愿意为对方承担成本或风险 |

结构性关系 SHALL 作为标签保存而不是伪装成分数，包括 `family`、`authority`、`classmate`、`rivalry`、`mentor` 和未来可扩展标签。

#### Scenario: 熟悉但敌对

- **WHEN** 两名人物长期相处但持续发生羞辱、威胁和竞争
- **THEN** `familiarity` 可以很高，同时 `warmth` 为负、`resentment/tension` 很高
- **AND** 系统不得把高熟悉度显示成朋友

#### Scenario: 疏远的亲人

- **WHEN** 两名人物有 `family` 标签但存在重大背叛
- **THEN** family 标签保留
- **AND** trust/warmth 可以为负，resentment 可以为高值

### Requirement: 短期情绪 appraisal

每条新 evidence MAY 包含最多 4 个 `emotionAppraisals`，每项包括：

```json
{
  "emotion": "anger|fear|contempt|disgust|envy|shame|guilt|gratitude|admiration|hope|disappointment|relief|pity|joy|distress",
  "intensity": 1,
  "sourceMessageIds": [123]
}
```

强度范围为 1–5。短期情绪 SHALL 进入人物上下文并随回合衰减；`resentment`、`fear`、`trust` 等长期维度只能由 Reducer 根据证据更新，不能直接由短期情绪覆盖。

#### Scenario: 生气但仍亲近

- **WHEN** 亲密朋友因一次冒犯产生 anger
- **THEN** active emotion 可为高 anger
- **AND** closeness 不应立即归零
- **AND** tension/resentment 是否上升取决于事件强度与后续修复

### Requirement: 数值锚点

Social Director Prompt、检查器和开发测试 SHALL 共享同一套锚点：

#### Closeness 阶段

| 值 | 阶段 |
| --- | --- |
| 0 | 无关系 |
| 10 | 见过/初识 |
| 20 | 熟人 |
| 35 | 朋友 |
| 50 | 密友 |
| 70 | 知己/高度亲密 |
| 90 | 终身或家庭级纽带 |

#### Signed 维度锚点

| 值 | Warmth | Trust | Respect |
| --- | --- | --- | --- |
| -75 | 憎恶 | 预期背叛 | 强烈蔑视 |
| -50 | 明确厌恶 | 不信任 | 轻蔑 |
| -20 | 反感/冷淡 | 戒备 | 不以为然 |
| 0 | 中性/未知 | 未验证 | 未形成判断 |
| 20 | 有好感 | 有限托付 | 认可 |
| 50 | 深厚喜爱 | 高度信任 | 敬佩 |
| 75 | 献身式关怀 | 生死托付 | 崇敬 |

#### Negative 维度锚点

| 值 | Tension | Resentment | Fear |
| --- | --- | --- | --- |
| 10 | 轻微尴尬 | 一时不快 | 留意 |
| 20 | 不自在 | 记住冒犯 | 警惕 |
| 35 | 关系紧绷 | 怨气 | 畏惧 |
| 50 | 明显冲突 | 严重芥蒂 | 害怕 |
| 70 | 随时爆发 | 仇怨/报复倾向 | 恐惧 |
| 90 | 主动敌对 | 不可调和 | 创伤性恐惧 |

#### Scenario: 阶段显示

- **WHEN** closeness 达到 50、warmth 至少 35、trust 至少 40 且 resentment 低于 35
- **THEN** UI 可显示“密友”
- **WHEN** closeness 为 50 但 resentment 为 60
- **THEN** UI SHALL 显示“疏远的密友”或更具体的派生标签，而不是只显示“密友”

### Requirement: Evidence 增量提案

模型 SHALL 输出 `dimensionDeltas`，但 Reducer SHALL 校验、缩放并提交最终值：

```json
{
  "dimension": "trust",
  "delta": -8,
  "impact": "major"
}
```

模型可用增量带：

| Impact | 原始绝对增量 | 典型事件 |
| --- | --- | --- |
| `trace` | 1 | 细小日常反应 |
| `minor` | 2–3 | 普通善意、轻微冒犯 |
| `meaningful` | 4–6 | 明确帮助、公开维护、持续争执 |
| `major` | 7–12 | 冒险相救、严重羞辱、伤害、重大承诺 |
| `defining` | 13–18 | 背叛、牺牲、不可逆转折；必须有强 provenance |

单次普通事件不得让 closeness 增加超过 10；`defining` 事件最高 15。模型不得直接提交最终分数或关系阶段。

#### Scenario: 普通互动

- **WHEN** NPC 与玩家进行一次普通课堂闲聊
- **THEN** 模型只能提议 trace/minor 级变化
- **AND** 一次闲聊不得把陌生人提升为朋友

#### Scenario: 重大背叛

- **WHEN** 已信任人物有清晰来源地背叛目标
- **THEN** 模型可提议 major/defining 级 trust 下降与 resentment 上升
- **AND** Reducer 应应用负面不对称但保持单次变化上限

### Requirement: 确定性更新规律

Reducer SHALL 按以下顺序处理每个维度：

1. 校验 actor、scene、witness、sourceMessageIds 和维度白名单。
2. 将模型 delta 限制在 impact 对应区间。
3. 对同一场景/滚动 10 回合内同类事件应用重复衰减：`1.0 → 0.6 → 0.35 → 0.2`。
4. 对接近边界的同方向变化应用饱和衰减：`max(0.25, 1 - abs(current)/100)`。
5. 对 `trust/warmth/respect` 的负向伤害应用 `1.25` 倍负面不对称；重大背叛可达 `1.5`，最终仍受 impact 上限约束。
6. clamp 到该维度范围。
7. 使用稳定 evidence ID 保证重放幂等。

`resentment` SHALL 仅由明确冒犯、伤害、背叛或未解决冲突增加；只能由道歉、补偿、宽恕或重构认知等修复 evidence 显著降低。普通送礼或寒暄不得自动清除仇怨。

`closeness` SHALL 主要由自愿共处、认真交流、脆弱性分享、相互支持、共同承担风险和长期共享经历提升；同班、同场或被迫共处只增加 familiarity。

#### Scenario: 重复刷分

- **WHEN** 同一人物在短时间内重复同一种夸奖或小礼物
- **THEN** 后续 evidence 的有效增量逐次衰减
- **AND** 不能通过重复文本快速达到密友

#### Scenario: 关系修复

- **WHEN** 一次普通友善发生在严重背叛之后
- **THEN** warmth MAY 小幅恢复
- **AND** resentment 不得显著下降
- **WHEN** 有明确道歉、补偿并被目标接受
- **THEN** resentment MAY 按 provenance 降低

### Requirement: 派生关系标签

系统 SHALL 从多个维度和结构标签派生玩家可读标签，不保存为模型权威事实。至少支持：

- 初识、熟人、朋友、密友、知己
- 反感的熟人、敌对、宿敌
- 畏惧、敬畏、尊敬但不信任
- 疏远的朋友、疏远的亲人
- 保护者、导师、权威、竞争者

一条关系 MAY 同时显示主标签和修饰语，例如“敬畏的老师”“亲近但积怨的朋友”。

### Requirement: 全局关系星图入口

游戏顶栏 SHALL 提供始终可见的“关系星图”按钮。点击后打开独立全屏/大面板，不离开当前聊天或关闭游戏预览。

#### Scenario: 打开关系星图

- **WHEN** 玩家点击固定入口
- **THEN** 显示当前时间线玩家已知的所有人物节点和有向关系边
- **AND** 当前聊天、输入草稿和场景状态保持不变

### Requirement: 关系星图视觉与交互

关系星图 SHALL 使用 Cytoscape.js，默认以玩家为中心，采用可稳定复现的 force/concentric 布局。

视觉规范：

- 深靛黑背景、低对比星尘、羊皮金文字和少量学院色，整体像“会动的魔法家谱/星图”，不是企业网络看板。
- 人物节点使用原创或已生成头像；严禁电影剧照和占位图。
- 节点外环表达阵营/学院，尺寸表达玩家已知程度或剧情相关度。
- 两个方向的关系使用分离曲线，不能合并成一条无方向边。
- 边颜色表达主导维度：金色 warmth、蓝色 trust、银白 respect、红色 tension/resentment、紫色 fear、绿色 protectiveness。
- 边宽表达 closeness；透明度表达 familiarity/证据置信度。
- 动效集中在首次展开、选中人物和新证据脉冲，不对所有节点持续漂浮。

交互要求：

- 搜索人物。
- 筛选“与我有关/全部已知”“正面/负面/复杂”“学院/家庭/同学/教授”。
- 点击节点高亮一跳关系并打开详情侧栏。
- 点击边展示两个方向的维度、派生标签、最近 evidence、时间、场景和来源消息。
- 支持缩放、平移、拖拽、重置布局。
- 保存每个时间线的手动节点位置和筛选偏好。
- 支持 `prefers-reduced-motion`、键盘焦点和文本列表回退。

#### Scenario: 查看不对称关系

- **WHEN** 玩家选择 Harry 与 Tina 的边
- **THEN** 可分别查看 Harry→Tina 与 Tina→Harry
- **AND** 两个方向可有不同 warmth、fear、trust 和 evidence

#### Scenario: 隐私边界

- **WHEN** 某关系或 evidence 不包含 `player` witness 且玩家未被告知
- **THEN** 关系星图不得展示该边、标签或来源
- **AND** 不得通过节点位置、颜色或 tooltip 暗示隐藏事实

### Requirement: 人物卡联动

人物卡 SHALL 显示多维摘要、派生标签、当前短期情绪和最新有效 evidence。关系星图选择人物后可打开同一人物卡；人物卡提供“在星图中查看”动作。

#### Scenario: 关系变化反馈

- **WHEN** 新 evidence 被 LangGraph 提交
- **THEN** 人物卡和关系星图从同一 `socialGraph` 投影更新
- **AND** 不得出现一处显示“陌生人”、另一处显示“密友”的状态分叉

### Requirement: 存档迁移

`socialGraph.version` SHALL 升级到 2，并在本地确定性迁移：

- `affinity` → `warmth`
- 保留 familiarity、trust、tension、protectiveness 和 evidenceIds
- `closeness = min(familiarity, round(max(0, affinity) * 0.45 + max(0, trust) * 0.35 + protectiveness * 0.20))`
- family evidence 至少设置 familiarity=90、closeness=70，但不强制 warmth/trust 为正
- respect、influence、resentment、fear 初始为 0，除非旧 evidence 可无歧义映射
- 旧 rivalry/family/met 保留为结构标签或兼容 evidence
- 迁移不得调用模型，不得改变 message cursor，不得重复累计旧 evidence

#### Scenario: Tina 当前存档迁移

- **WHEN** v1 Tina 存档首次加载 v2
- **THEN** 91 条 evidence 和 33 条关系边保留
- **AND** Harry、Ron、Lavender、Flitwick、Hermione 的当前关系不会重置
- **AND** 迁移不推进共同记忆冷却

## MODIFIED Requirements

### Requirement: Social Director 输出

Social Director SHALL 输出来源明确的 statement、relationship evidence、dimension deltas 和 emotion appraisals。Prompt 必须包含当前维度值、阶段锚点、增量带和典型例子。模型 MAY 提案，但不得覆盖最终边状态。

输出失败、越界字段或无法验证的维度 SHALL 只丢弃对应提案或保留待补算状态，不得吞掉已提交正文。

### Requirement: LangGraph Reducer

LangGraph SHALL 继续执行 collect → validate → derive 三阶段；derive 阶段应用本规范的确定性更新规律、幂等 ID、provenance 和 v2 migration。任何未知维度、越界 delta、跨场景 evidence 或未授权 witness 均不得进入权威边。

### Requirement: Actor Knowledge Capsule

NPC 只可获得自己参与或见证的关系、情绪和 evidence。玩家可见关系星图仅使用玩家知情投影。高分关系不得绕过 witness provenance。

## REMOVED Requirements

### Requirement: 单一 affinity 作为“好感度”

**Reason**: 单一正向量表不能表达熟悉但厌恶、亲近但积怨、敬畏、恐惧和权力不对称。

**Migration**: affinity 仅允许由 v1→v2 迁移解析器读取并确定性迁移为 warmth。兼容周期结束后，v2 权威图、evidence、人物上下文、知识库与关系星图均不得持久化、投影或回退读取 affinity；新逻辑不得写 affinity。

#### Scenario: v2 运行时清理旧维度

- **WHEN** v1 存档完成本地迁移或 v2 Social Director 提交新 evidence
- **THEN** 权威 socialGraph 和所有下游投影只包含 v2 十维、结构标签与短期情绪
- **AND** affinity 与 weightDelta/type 旧更新协议只存在于迁移输入解析器，不进入迁移后的 v2 状态

### Requirement: 模型 weightDelta 直接决定最终数值

**Reason**: 缺少统一锚点、重复衰减和边界控制，导致不同模型对同一事件产生不一致增量。

**Migration**: 旧 weightDelta 迁移为对应 type 的 v2 delta 输入；新模型输出 dimensionDeltas，最终值只由 Reducer 计算。
