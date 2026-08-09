# Actor Memory 运行契约

## 权威边界

人物记忆只能来自人物亲历、结构化 witness evidence 或明确的历史事实。场景摘要描述整个场景，不等于任何一个人物的主观记忆。

```text
observed actor-specific event
-> sparse model proposal
-> deterministic quality validation
-> actor memory reducer
-> actorLibrary.sharedMemories
```

模型可以提议记忆，但无权用场景 recap 批量填充在场人物。

## 普通回合

普通回合的 `actorUpdates[].memoryUpdate` 由 turn validator 校验人物在场、证据与字段质量，再写入对应 tier。该事务不受场景转场 fallback 影响。

### 公开事件见证记忆

人物特定 proposal 之外，规则层会从已提交 `eventKnowledge` 投影公共见证记忆：

```text
eventKnowledge
  perception = room/area + notable/major + concealment != successful
  witnessActorIds = resolved physical witnesses
-> applyWitnessedEventMemories()
-> one stable event_witness memory per actual witness
```

- Reducer 只消费结构化 `eventId/summaryEn/perception/witnessActorIds`，不解析正文。
- 相同 `eventId` 对同一人物幂等，不重复写入。
- 记忆使用中性事件事实；它证明人物见证了事件，不自动创建关系、impression 或 lasting impact。
- target-only、subtle、成功隐蔽或没有稳定 event ID 的事件不做公共投影。
- 教室中的爆炸、公开成功示范、教授表扬、学院加扣分等 notable/major 结果应覆盖完整课堂 witness roster。

## 场景转场

中/高档 transition prompt 的 `relationshipUpdates` 是可选、稀疏数组：

- 只为本场景中对玩家看法确实发生变化的人物提交。
- `sceneMemoryEn` 必须是完整的 8–32 词英文句子。
- 内容必须是人物亲历或亲眼见证的具体事件及其人物视角解释。
- 禁止使用 `closureSummaryEn`、一般场景回顾、普通同场、泛化影响或多人相同文本。
- 没有合格记忆时提交 `[]`；Reducer 不补 fallback。

Normalizer/validator 会丢弃：

- 不足 8 词、超过 32 词或没有完整句末标点的文本；
- `During the closed scene`、`materially shaped the actor's view` 等模板；
- 同一 transition 内多个 actor 完全相同的 memory；
- 未知 actor ID。

合法 transition memory 只写入 `summaryEn/summary`，不再把同一句复制为 `lastingImpactEn/lastingImpact`。

## 旧档迁移

加载存档时，`migrateRelationshipMemoryState()` 会幂等删除满足以下全部条件的历史垃圾：

- `source === "medium_transition"`；
- 以 `During the closed scene,` 开头；
- 以 `This experience materially shaped the actor's view of the player.` 结尾。

迁移不调用模型、不修改其他具体记忆，也不重写人物 impression。第二次运行必须 `changed=false`。

## 禁止事项

- 禁止为了满足 Schema 最小长度而制造记忆。
- 禁止按 active/local roster 给每个人复制一份 closure summary。
- 禁止按原始词数截断句子后拼接固定后缀。
- 禁止让 migration 对无法精确识别的旧记忆做语义猜测。
