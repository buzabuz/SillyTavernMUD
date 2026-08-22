# Actor Memory 运行契约

## 权威边界

人物记忆只能来自人物亲历、结构化 witness evidence 或明确的历史事实。Actor Context V1 将客观事件、主观解释、稳定预期与人物保留层级分开：

```text
eventKnowledge[eventId]                唯一硬事实正文；observed 或 attributed reported Event
memorySynapse.appraisals[appraisalId]  observer 的主观解释
memorySynapse.personSchemas[schemaId]  跨事件形成的行为预期
actorMemoryIndex.byActorId[actorId]    Event/Appraisal 的分层引用
```

`ActorMemoryIndex` 的人物条目只允许：

```text
firstImpressionRef
core[]
recent[]
everyday[]
```

每个 `MemoryRefV1` 只含 `recordType/recordId/addedClock`。人物层级不保存摘要正文；同一 Event 可被多个 witness 引用，但事实只在 `eventKnowledge` 保存一次。模型可以提议人物视角解释，无权用场景 recap 批量填充人物，也不能让 Appraisal 或 Schema 反写 Event。

当前生产 Memory Reference version 为 `3`。字段形状不变，只收紧引用语义：旧可变 `impressionOfPlayerEn` 不是 retained memory，不得进入 `core/recent/everyday`。

`compact-timeline-appraisal-lifecycle` revision 4 已批准实施 Memory Reference version `3`、Event Knowledge version `2` 和 Memory Synapse version `2`。MemoryRef 形状不变；弱 Appraisal 降级为 EventRef，Event 永不随主观遗忘删除。当前实现与迁移验收仍由该 change 的任务和 checklist 跟踪。

### 已批准的 Event Knowledge V2

Event V2 分为：

- `observed`：当前结构化感知与 witness contract 提交的客观事件。
- `reported`：某 speaker 向明确 recipients 传播了一个带归属的说法。硬事实是“说了什么给谁听”，不是说法内容必然为真。

Reported Event 永久保存 speaker、recipients、`sourceSegmentRefs`、attributed `summaryEn`、可选 authority-only `aboutEventId`、可选 parent report、失真级别和 correction/retraction 类型；不再重复存 `sourceMessageIds`。recipient 投影进入既有 `ActorEventKnowledge.reported[]`；`aboutEventId` 不授权读取底层真 Event。

Report proposal 必须给出精确 statement/audience source evidence；recipient 必须属于所有 cited Event 的 direct/audible 交集。没有明确 target evidence 时必须使用完整合法听众集合。提交后 NPC speaker/recipient 各得一个幂等 Everyday EventRef，永不随 Appraisal 删除。

旧 `gossipPacks/gossipUpdates/knownRumors`、`worldNews/prophetBriefs/recentWorldNews/worldChangeLog`、28 日 fade、`socialGraph.statements[]` 和自由文本 `truthCoreEn/versionEn` 全部删除。系统不自动编造场外传播/新闻；reported Event 只能从已提交消息中的明确传播提案，经 Event Reducer 校验后写入。普通人物 Knowledge 只读 attributed summary，不展开整条 source message transcript；完整 `ActorEventKnowledge.reported[]` 禁止直接注入 Prompt。

## 普通回合

普通回合的 `actorUpdates[].firstImpressionOfPlayerEn`、`impressionOfPlayerEn` 和 `memoryUpdate.summaryEn` 仍可作为模型 proposal 字段，但不是 State 字段。Turn validator 校验人物在场、证据与字段质量后，Reducer 使用 `recordActorAppraisalV1()` 写入 Appraisal，并把 Appraisal ID 加入对应人物的 MemoryRef tier。Actor Core 与 Actor Runtime 均不保存这些文本。

### 公开事件见证记忆

人物特定 proposal 之外，规则层会从已提交 `eventKnowledge` 投影公共见证引用：

```text
eventKnowledge
  perception = room/area + notable/major + concealment != successful
  witnessActorIds = resolved physical witnesses
-> applyWitnessedEventMemories()
-> one stable Event MemoryRef per actual witness
```

- Reducer 只消费结构化 `eventId/perception/witnessActorIds`，不解析正文。
- 相同 `eventId` 对同一人物幂等，不重复写入。
- MemoryRef 证明人物见证了事件，不复制摘要，也不自动创建关系、Appraisal 或 Schema。
- target-only、subtle、成功隐蔽或没有稳定 event ID 的事件不做公共投影。
- 教室中的爆炸、公开成功示范、教授表扬、学院加扣分等 notable/major 结果应覆盖完整课堂 witness roster。

### Appraisal 与 Person Schema

本地 observer 可在已提交普通回合后批量提出 Appraisal，但 Reducer 只接受满足全部条件的记录：

- 引用至少一个已提交 event、source message 与稳定 Scene ID；
- observer 是 observed Event participant/witness，或 reported Event explicit recipient；
- `summaryEn` 是 observer-specific interpretation，不是 event summary 的复制；
- observer、target、来源与 audience 都通过校验。

本地模型的 Appraisal confidence 最终只以 decimal `[0,1]` 进入既有
Appraisal 验证与 Reducer。transport 适配层确定性保留 `0..1`，将
`>1..100` 视为百分数除以 100，并将更大有限非负数截断为 `1`；负数、
非数值或非有限数仍拒绝，不触发 retry 或额外模型调用。

已批准的 Memory Synapse V2 让历史 Appraisal 只持有 `sourceEventIds`。`sceneId/sourceMessageIds/witnesses/sourceRumorIds` 均不再复制。`knowledgeSource=reported` 取代 `authorized_rumor`；无 Event 的 migrated Appraisal 固定 `historicalClaimAllowed=false`。

Person Schema 只由既有中档 event-boundary/Memory Consolidation 调用中的 `schemaOperations` 整理，不增加第二次中档调用。稳定 Schema 至少需要同一 observer-target 的 3 条 accepted Appraisal，且跨至少 2 个 Scene；每对最多保留 3 个 active Schema。反例保存在 `counterAppraisalIds`，会降低 confidence 或把状态改为 `contested`；旧解释通过 supersede 保留来源，不能静默重写。单一事件只能形成 Appraisal，不能固化人格。

当前看法只由 active/contested Person Schema 在读取时投影。初见印象由 `firstImpressionRef` 指向不可覆盖的 Appraisal；二者不物化回写 Actor Core 或 Actor Runtime。`migrated_current_impression` 既不是当前 Schema，也不是保留经历；V2 删除其 MemoryRef 与迁移 Appraisal。

### 已批准的 Relationship Evidence V3 引用

Appraisal 是人物主观解释的唯一正文。Relationship Evidence 不再保存第二份解释，而是 Social Reducer 提交后的轻量关系影响回执：

```text
Relationship Evidence
  required eventId
  optional appraisalId
  directed actor pair
  eventKind
  actual applied dimension deltas
  structural tags / short-lived emotion effects
  applied clock / turn
```

- `eventId` 回源 observed 硬事实或 attributed reported Event、message、Scene、参与/听闻名单和可见性。
- `appraisalId` 存在时，observer/target 必须匹配关系方向，且 Appraisal 必须引用同一 Event。
- Relationship Evidence 禁止保存 `summary/summaryEn/sourceMessageIds/sceneId/witnessedBy/sourceEventIds/visibility` 或译文。
- Appraisal 删除后清空或安全重绑 `appraisalId`，Evidence 保留 Event 和已经应用的关系数值；不得反向扣回关系变化。
- Knowledge 不再为 Relationship Evidence 建第二份全文记录，只保留到 Event/Appraisal 的关系边。
- player Dossier 维持现有 meta-view；其他 Prompt/Knowledge 仍按 observer ACL 读取 Appraisal，否则回落到合法 Event。
- 本 revision 不修复语言。引用 hydration 可能显示英文，统一翻译另立项目。

### 已批准的 V3 聚类删除语义

既有 event-boundary Memory Consolidation 仍是唯一周期性聚类调用，并继续使用 minimum review turns + event boundary 门禁。V3 的 operation `sourceIds` 只允许引用被整理人物的 AppraisalRef；EventRef 可作为只读证据，但不能成为被消费来源。

同一原子 reducer 中先结算 Relationship Evidence 的实际变化、创建合并 Appraisal、应用 Schema operations，再决定保留或删除。来源 Receipt 只有在合并 Appraisal 具有相同 observer/target 且包含原 Event 时才可重绑，否则清空为 Event-only。

新 cycle Appraisal 在以下任一条件成立时晋升 Recent：

- 任一关联 Receipt 的 `abs(appliedDelta) >= 4`
- Receipt 给关系边新增 structural tag
- Receipt 新增强度至少 3 的 emotion effect

Schema/合并先执行，因此跨多个小事件形成的合法模式仍可保护或替换来源。未达条件、没有关联 Receipt 且无其他保护的 Appraisal，人物索引改存其 canonical EventRef，Receipt 清空 `appraisalId`，随后删除 Appraisal。

只有本次明确消费或降级的 Appraisal 才进入删除候选集。以下任一依赖存在时保留 Appraisal 实体：

- `firstImpressionRef`
- 任何存活 tier AppraisalRef
- Person Schema `supportAppraisalIds/counterAppraisalIds`
- Appraisal `supersedesAppraisalId/supersededById` 链的任一端

没有 Actor Memory tier ref 的 provenance-backed 本地 Appraisal 可能仍在等待 Schema 整理；V3 禁止全局扫描并删除所有无 tier Appraisal。

## 场景转场

旧 V2 transition prompt 的 `relationshipUpdates` 会直接创建没有 canonical Event provenance 的 impression/memory Appraisal；Revision 4 已删除其规则、Schema 和 writer。

已批准的 revision 4 删除该字段及对应规则、normalizer、validator、translation 和 reducer writer。场景关闭不再产生第二套主观解释；已提交 observed/reported Event 的关系结算继续由现有 event-boundary Social Director 完成或 carry。Scene Transition 只执行确定性的 Everyday AppraisalRef 清理。

### 已批准的 V3 Scene-boundary 蒸发

不设置回合 TTL。只有成功提交 Scene Transition 才执行确定性清理：

1. 将所有人物 `everyday[]` 中仍有 canonical Event 的 AppraisalRef 替换为 EventRef。
2. 删除无 Event 的 legacy/non-historical Everyday AppraisalRef。
3. 保留所有既有 `everyday[]` EventRef。
4. 将被删 Appraisal 的 Relationship Evidence 清空为 Event-only。
5. 仅把本次移除 ref 的 Appraisal 放入删除候选集。
6. 按 first-impression、存活 tier、Schema 和 supersede 依赖保护实体。
7. 完整校验后与 Scene Transition 一起原子提交。

失败、取消或尚未提交的转场不删除任何记忆。该流程不调用模型，也不额外运行一次 Memory Consolidation。

### Scene boundary 与 stale guard

`pendingEventBoundary` 必须有稳定 `boundaryId`。当前 Revision 4 在 Scene close 时把尚未消费的同一 boundary ID 及 `carriedToSceneId` 带入下一 Scene，不得静默丢弃。

已批准的 V3 不在 Scene close 增加一次同步模型整理。转场提交前已经成功完成的 consolidation 正常生效；仍处于 Everyday 的 AppraisalRef 在原子转场中到期。被 carry 的 boundary 只保留其仍合法的 social/Schema evidence 调度语义，不能恢复已到期的 Actor MemoryRef。任何旧异步结果仍由 revision guard 拒绝 stale commit。

异步整理启动时捕获：

```text
timelineEpoch + stateRevision + boundaryId
```

提交前这三项必须仍与当前 pending boundary 完全一致且状态仍为 `pending`，否则拒绝 stale consolidation，不写 memory/social/schema。合法提交将 boundary 标为 `consumed` 并保存 consumed turn/clock。Scene Opening 只有持久化后才可成为事件索引经验；它只能强化已提交人物状态与可观察开场，不得创建未提交 Item 转移、关系事实、承诺或隐藏真相。

中档 Prompt 只读取有 provenance、通过 observer/revision/clock/audience 过滤的 evidence，不读取无边界全历史或无权限 locked/private 数据。低档 Performer/Opening 只读取 matching observer 的密封 activation capsule；`expectationEn` 可影响行为，具体旧事必须由同 capsule 的 Event/sourceRefs 支撑。

调用预算保持：普通回合不新增中/高档，event boundary 复用既有一次中档，Scene Transition 不增加 memory-only 调用；Planner、图扩散和 Reducer 的低/中/高档调用为 0。

## 一次性原子迁移

`migrateActorContextV1()` 在 lifecycle 的其他人物迁移前执行：

1. 在克隆 State 上构造严格 `ActorCoreV1`、`ActorRuntimeV1`、`ActorMemoryIndexV1`。
2. 有合法 Event ID 的旧人物记忆转换为 Event MemoryRef。
3. 有合法 Appraisal ID 的旧人物记忆转换为 Appraisal MemoryRef。
4. 只有文本的旧 retained memory 创建 migrated Appraisal；其 `historicalClaimAllowed=false`，不能授权具体历史。
5. 初见文本创建 Appraisal，并把 ID 写入 `firstImpressionRef`；旧 mutable current impression 直接删除，不创建 Appraisal、MemoryRef 或 Schema。
6. 删除人物档案和运行态中的旧记忆、印象、稳定字段、Identity 副本与 Social Graph 副本。
7. 校验所有字段白名单、Actor Core/Runtime 配对、MemoryRef、Appraisal、Schema 与 Event 引用；全部通过后才一次替换原 State。

任一步失败都不修改调用方 State，也不触发保存。三项 V1 version 已成立后，lifecycle 不再运行旧人物迁移或 Social Graph copy projector。迁移不调用模型，第二次运行必须 `changed=false`。

V1 -> Memory Reference V2 迁移只删除 `contextTags=migrated_current_impression` 的 tier refs 与 Appraisal。若该 Appraisal 被 first impression、Schema 或 supersede 链引用则原子失败；成功后设置 root/index version 为 `2`，不保留双读或 fallback。

已批准的 V2 -> V3 迁移在同一克隆边界内：

1. 保留所有 EventRef。
2. 通过 source Event 推导 Scene，删除没有当前 Scene Event 的 Everyday AppraisalRef。
3. 保留由当前 Scene Event 支撑的 Everyday AppraisalRef，直到下一次成功转场。
4. 只删除步骤 2 产生的、且无保护依赖的 Appraisal 候选实体。
5. 设置 root/index version 为 `3` 并完整校验。

迁移不清扫无关 Appraisal，不调用模型，不保留 V2/V3 双读；任一步失败时原 State 不变。

同一 pass 将 Memory Synapse V1 升为 V2：历史 Appraisal 的 legacy message/Scene 必须与引用 Event 完全一致后删除副本；不一致时原子失败。新 Appraisal ID 只由 observer/target/Event IDs 稳定生成。

同一 pass 将 Event V1 升为 V2：现有 9 条 Tina Event 全部迁为 `observed` 并从 committed transaction 补精确 clock；不从旧 Scene prose 生成 Event。`gossipPacks` 必须为空后删除，非空时迁移原子失败。

同一原子 cutover 还将 Social Graph V2 升到 V3：

1. 只在 legacy Evidence 的 source message 唯一命中同 Scene canonical Event 且每个 dimension delta 都有 reducer-owned `appliedDelta` 时保留 Receipt。
2. Tina 的 13 条完整记录迁为 Event-only Receipt；不绑定不存在的 Appraisal。
3. 89 条无 Event、1 条跨两个 Event 的歧义详情，以及 2 条缺少 `appliedDelta` 的详情直接删除，不生成 Event/Appraisal，也不拿 requested delta 代替结算值。
4. 34 条关系边的累计 dimensions 与 structural tags 保持不变，只清理删除的 evidenceIds。
5. active emotions 只从保留 Receipt 重建；Tina 预计 10 -> 9。
6. 保留 Receipt 删除全部正文、译文和 Event 已拥有的 provenance 副本。

## 禁止事项

- 禁止为了满足 Schema 最小长度而制造记忆。
- 禁止按 active/local roster 给每个人复制一份 closure summary。
- 禁止按原始词数截断句子后拼接固定后缀。
- 禁止在 MemoryRef 中保存 `summary` 或 `summaryEn`。
- 禁止让 Appraisal 聚类消费或删除 EventRef、canonical Event。
- 禁止 Relationship Evidence 再保存 Event/Appraisal 正文或消息、Scene、witness、visibility 副本。
- 禁止历史 Appraisal 复制 Event 的 message/Scene/witness 字段。
- 禁止把 reported Event 的 attributed claim 当成底层真 Event。
- 禁止通过 `aboutEventId` 向 recipient 泄漏真 Event。
- 禁止 GossipPack、fade 或自由文本 truth core 重新成为第二套权威。
- 禁止没有精确 committed message/speaker/recipient 证据的 reported Event。
- 禁止在删除 Appraisal 时反向修改已应用的关系维度。
- 禁止为旧 Relationship Evidence 猜测、生成或模型回填 Event/Appraisal。
- 禁止通过遍历全部无 tier Appraisal 来模拟候选删除。
- 禁止把 Schema 物化为人物字段，或把 Identity、关系、记忆复制进 Actor Runtime。
- 禁止让一次性迁移对无法精确识别的旧记忆做语义猜测。
- 禁止让一个 observer 的 Appraisal、Schema 或支持事件进入另一个人物或旁白的 capsule。
- 禁止让 Qdrant、JSON/Vectra 投影、检索排名或 raw transcript 成为人物记忆或世界事实的直接写入源。

## 项目边界

本契约只定义人物权威、引用式记忆、检索 hydration 与现有低档上下文数据。初级导演 System Prompt 的章节顺序、规则优先级、输出 Schema 和文风编排属于后续独立项目。
