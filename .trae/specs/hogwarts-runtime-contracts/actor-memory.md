# Actor Memory 运行契约

## 权威边界

人物记忆只能来自人物亲历、结构化 witness evidence 或明确的历史事实。Actor Context V1 将客观事件、主观解释、稳定预期与人物保留层级分开：

```text
eventKnowledge[eventId]                唯一客观事件正文
memorySynapse.appraisals[appraisalId]  observer 的主观解释
memorySynapse.personSchemas[schemaId]  跨事件形成的行为预期
actorMemoryIndex.byActorId[actorId]    Event/Appraisal 的分层引用
```

`ActorMemoryIndexV1` 的人物条目只允许：

```text
firstImpressionRef
core[]
recent[]
everyday[]
```

每个 `MemoryRefV1` 只含 `recordType/recordId/addedClock`。人物层级不保存摘要正文；同一 Event 可被多个 witness 引用，但事实只在 `eventKnowledge` 保存一次。模型可以提议人物视角解释，无权用场景 recap 批量填充人物，也不能让 Appraisal 或 Schema 反写 Event。

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
- observer 是 participant、witness 或获授权 rumor 接收者；
- `summaryEn` 是 observer-specific interpretation，不是 event summary 的复制；
- observer、target、来源与 audience 都通过校验。

Person Schema 只由既有中档 event-boundary/Memory Consolidation 调用中的 `schemaOperations` 整理，不增加第二次中档调用。稳定 Schema 至少需要同一 observer-target 的 3 条 accepted Appraisal，且跨至少 2 个 Scene；每对最多保留 3 个 active Schema。反例保存在 `counterAppraisalIds`，会降低 confidence 或把状态改为 `contested`；旧解释通过 supersede 保留来源，不能静默重写。单一事件只能形成 Appraisal，不能固化人格。

当前看法只由 active/contested Person Schema 在读取时投影。初见印象由 `firstImpressionRef` 指向不可覆盖的 Appraisal；二者不物化回写 Actor Core 或 Actor Runtime。

## 场景转场

中/高档 transition prompt 的 `relationshipUpdates` 是可选、稀疏数组：

- 只为本场景中对玩家看法确实发生变化的人物提交。
- `sceneMemoryEn` 必须是完整的 8–32 词英文句子。
- 内容必须是人物亲历或亲眼见证的具体事件及其人物视角解释。
- 禁止使用 `closureSummaryEn`、一般场景回顾、普通同场、泛化影响或多人相同文本。
- 没有合格记忆时提交 `[]`；Reducer 不补造记录。

Normalizer/validator 会丢弃：

- 不足 8 词、超过 32 词或没有完整句末标点的文本；
- `During the closed scene`、`materially shaped the actor's view` 等模板；
- 同一 transition 内多个 actor 完全相同的 memory；
- 未知 actor ID。

合法 transition proposal 经校验后创建 Appraisal 与 Appraisal MemoryRef，不把文本复制到人物档案或运行态。

### Scene boundary 与 stale guard

`pendingEventBoundary` 必须有稳定 `boundaryId`。Scene close 在清理旧 Scene 前应先消费 pending memory boundary；无法同步完成时，Archive Projector 把同一 boundary ID 及 `carriedToSceneId` 带入下一 Scene，不得静默丢弃。

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
4. 只有文本的旧人物记忆和旧印象创建 migrated Appraisal；其 `historicalClaimAllowed=false`，不能授权具体历史。
5. 初见文本创建 Appraisal，并把 ID 写入 `firstImpressionRef`。
6. 删除人物档案和运行态中的旧记忆、印象、稳定字段、Identity 副本与 Social Graph 副本。
7. 校验所有字段白名单、Actor Core/Runtime 配对、MemoryRef、Appraisal、Schema 与 Event 引用；全部通过后才一次替换原 State。

任一步失败都不修改调用方 State，也不触发保存。三项 V1 version 已成立后，lifecycle 不再运行旧人物迁移或 Social Graph copy projector。迁移不调用模型，第二次运行必须 `changed=false`。

## 禁止事项

- 禁止为了满足 Schema 最小长度而制造记忆。
- 禁止按 active/local roster 给每个人复制一份 closure summary。
- 禁止按原始词数截断句子后拼接固定后缀。
- 禁止在 MemoryRef 中保存 `summary` 或 `summaryEn`。
- 禁止把 Schema 物化为人物字段，或把 Identity、关系、记忆复制进 Actor Runtime。
- 禁止让一次性迁移对无法精确识别的旧记忆做语义猜测。
- 禁止让一个 observer 的 Appraisal、Schema 或支持事件进入另一个人物或旁白的 capsule。
- 禁止让 Qdrant、JSON/Vectra 投影、检索排名或 raw transcript 成为人物记忆或世界事实的直接写入源。

## 项目边界

本契约只定义人物权威、引用式记忆、检索 hydration 与现有低档上下文数据。初级导演 System Prompt 的章节顺序、规则优先级、输出 Schema 和文风编排属于后续独立项目。
