# Knowledge V2 与 Narrative Authority 运行契约

## 权威边界

Knowledge 是检索投影，不是第二份世界状态。

```text
committed State + committed message transaction
-> deterministic Knowledge Projector V2
-> JSON exact / Vectra / Qdrant
-> Planner + relational expansion
-> audience/revision/clock hydration
-> sealed Prompt capsule
```

当前结构化 State 与同次提交的消息 transaction 共同构成运行时事实事务。JSON 文件、向量索引、Qdrant payload、Person Schema、检索排名和 raw transcript 都不能写入或覆盖 Reducer 权威。索引损坏或删除后必须从当前 State + chat 重建。

Knowledge V2 的人物记录只索引 `ActorCoreV1` 的稳定公开本色与检索所需稳定字段。它不嵌入 `ActorRuntimeV1`、Actor Memory Index、Social Graph、当前呈现或人物完整历史。Event、Appraisal、Person Schema 与 Social Evidence 各自保持独立 record 和稳定 `sourceRefs`。

Prompt 的固定优先级是：

1. 当前 State 与 Reducer projection。
2. 当前 Scene 已提交 transaction 与 Event Knowledge。
3. 更早事件和 Scene Archive。
4. observer-scoped Appraisal 与 Person Schema。
5. 仅作有归属历史证据的 raw transcript。

低优先级记录可以解释当前态如何形成，不能覆盖 Item `physicalForm/holder`、Actor presence/room/life、Scene destination/clock、Identity 或 spell identity。检索到的冲突与 superseded record 必须被抑制或明确标记为历史，并进入 diagnostics。

## Knowledge Record V2

每条记录至少包含：

```json
{
  "version": 2,
  "recordId": "stable_id",
  "nodeType": "fact|appraisal|schema|actor|scene|clue",
  "timelineEpoch": "epoch",
  "stateRevision": 1,
  "projectorVersion": 2,
  "sourceRefs": [],
  "visibility": {
    "scope": "public|actor|witnesses|locked",
    "actorIds": []
  },
  "effectiveClock": "",
  "sceneId": "",
  "contentChecksum": ""
}
```

- ID、排序和 checksum 必须稳定。
- 长 Scene transcript 分块，不只嵌入开头。
- locked/private 记录必须在 backend filter 与最终 hydration 两层隔离。
- 记录只接受与请求相同的 timeline、revision、有效时钟和 audience。
- `superseded` tag 或命中 `supersededSourceRefs` 的记录默认不注入 Prompt。
- Scene Opening 只有保存后才投影；开场正文不能自行建立未提交事实。

## Backend 与降级

Hogwarts `VectorBackend` 提供 `health/upsert/delete/query/rebuild`。

- 配置且健康时 Qdrant 是首选语义后端，使用 timeline、revision、audience、node type、category 和 clock payload filter。
- Qdrant point ID 从 record ID 确定性生成；embedding model 或维度改变时使用新的 collection generation。
- JSON exact 是始终可用的确定性检索基线；Vectra 若启用，也必须使用同一 V2 record/audience 契约。
- Qdrant 未配置、health/query 失败或 collection 丢失时，回合和 Scene 继续使用 JSON exact；State/chat commit 不得因向量后端失败。
- stale revision sync 必须拒绝。索引丢失时从完整 V2 projection rebuild，不复用旧 hash 作为事实。

diagnostics 至少记录实际 backend、preferred backend、degraded、错误摘要、selected record ID、suppressed reason、source path 和 rebuild 状态。

## 本机 Qdrant v1.19.0 运维契约

当前 macOS arm64 原生部署固定使用官方 `qdrant-aarch64-apple-darwin.tar.gz`，官方发布压缩包 SHA-256 为：

```text
4e279a80cc1ebe73e859318ff86375af54c123887dd7ae46605c0eb6cb7c44e8
```

必须在解包或首次执行前校验 release 压缩包；解压后二进制的本地 SHA 不是官方构件 SHA。真实安装位置是 `/Users/bytedance/sillytavern/SillyTavern/docker/qdrant/1.19.0/qdrant`，项目内持久化路径为：

- storage：`/Users/bytedance/sillytavern/SillyTavern/docker/data/qdrant/storage`
- snapshots：`/Users/bytedance/sillytavern/SillyTavern/docker/data/qdrant/snapshots`
- logs：`/Users/bytedance/sillytavern/SillyTavern/docker/data/qdrant/logs`

标准用户级 plist 是 `/Users/bytedance/Library/LaunchAgents/tech.qdrant.server.plist`，与项目模板 `docker/qdrant/tech.qdrant.server.plist` 一致。其 `Label=tech.qdrant.server`，`ProgramArguments` 和 `WorkingDirectory` 使用上述绝对安装路径，`RunAtLoad=true`、`KeepAlive=true`、`ThrottleInterval=5`，并固定以下环境变量：

```text
QDRANT__SERVICE__HOST=127.0.0.1
QDRANT__SERVICE__HTTP_PORT=6333
QDRANT__SERVICE__GRPC_PORT=6334
QDRANT__STORAGE__STORAGE_PATH=/Users/bytedance/sillytavern/SillyTavern/docker/data/qdrant/storage
QDRANT__STORAGE__SNAPSHOTS_PATH=/Users/bytedance/sillytavern/SillyTavern/docker/data/qdrant/snapshots
```

完整标准 plist 以 Hogwarts README 的“Qdrant v1.19.0 本机运维”为准。TRAE sandbox 无权向当前用户 GUI domain 注册 LaunchAgent，因此这里不执行 bootstrap；plist 就位后，用户必须在自己的 Terminal 中用一条命令激活：

```bash
launchctl bootstrap "gui/$(id -u)" \
  "$HOME/Library/LaunchAgents/tech.qdrant.server.plist"
```

不使用 LaunchAgent 时，前台手动启动和 health/监听检查为：

```bash
cd /Users/bytedance/sillytavern/SillyTavern/docker/qdrant/1.19.0
QDRANT__SERVICE__HOST=127.0.0.1 \
QDRANT__SERVICE__HTTP_PORT=6333 \
QDRANT__SERVICE__GRPC_PORT=6334 \
QDRANT__STORAGE__STORAGE_PATH=/Users/bytedance/sillytavern/SillyTavern/docker/data/qdrant/storage \
QDRANT__STORAGE__SNAPSHOTS_PATH=/Users/bytedance/sillytavern/SillyTavern/docker/data/qdrant/snapshots \
./qdrant

curl --fail --silent --show-error http://127.0.0.1:6333/healthz
lsof -nP -iTCP:6333 -sTCP:LISTEN
lsof -nP -iTCP:6334 -sTCP:LISTEN
```

手动启动前必须确认 LaunchAgent 实例未运行。项目真实配置键和值为：

```yaml
extensions.models.embedding: Cohee/jina-embeddings-v2-base-en
hogwartsMud.knowledge.embeddingModel: Cohee/jina-embeddings-v2-base-en
hogwartsMud.knowledge.embeddingDimensions: 768
hogwartsMud.knowledge.qdrant.enabled: true
hogwartsMud.knowledge.qdrant.url: http://127.0.0.1:6333
hogwartsMud.knowledge.qdrant.apiKey: ""
hogwartsMud.knowledge.qdrant.collectionPrefix: hogwarts_knowledge
hogwartsMud.knowledge.qdrant.timeoutMs: 10000
```

真实 model/dimension 探测对应 generation `g16b00e5647de42`。本地 loopback 配置不提交 secret；若启用凭据，只通过未提交配置或 `HOGWARTS_QDRANT_API_KEY` 注入。

Tina 权威 archive 的真实同步和 ACL/snapshot smoke CLI 为：

```bash
node scripts/sync-hogwarts-knowledge-qdrant.mjs \
  --archive "data/default-user/chats/Hogwarts_World_Director/Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl" \
  --config config.yaml \
  --operation rebuild \
  --expected-record-count 101 \
  --known-record-id events_item_harry_spare_brass_quill_current \
  --known-source-ref event:event_transfiguration_after_break_18d50cd8847574f4

node scripts/smoke-hogwarts-qdrant.mjs \
  --archive "data/default-user/chats/Hogwarts_World_Director/Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl" \
  --config config.yaml \
  --expected-count 101 \
  --snapshots-path docker/data/qdrant/snapshots
```

sync 只能从只读 State + chat 构建 Knowledge Projector V2，并应报告 Qdrant backend、`degraded=false`、generation `g16b00e5647de42`、101 records/points、0 failures、已知 sourceRef 命中、0 narrative model calls 和 archive SHA 不变。smoke 必须使用 Qdrant 服务端 payload filter 验证 public、授权 actor-private、locked、缺失 visibility 与未授权 actor；临时 ACL collection 必须清理。未指定 `--snapshot-name` 时 smoke 会创建真实 collection snapshot。

snapshot 只包含 collection 配置、points、vectors 与 payload，不包含 State/chat 或 collection alias。标准备份/恢复步骤是：

1. `POST /collections/{collection}/snapshots` 创建 snapshot，随后 `GET` 同一路径核对列表。
2. 将 `.snapshot` 与同名 `.snapshot.checksum` 一起复制到备份介质，并保留对应 collection generation、model、dimension 和 point count。
3. 恢复前暂停 SillyTavern Knowledge 写入，用 `shasum -a 256` 校验 snapshot 与 checksum。
4. 对本机单节点调用 `PUT /collections/{collection}/snapshots/recover?wait=true`，body 使用 `file:///absolute/path/to/file.snapshot`、`priority=snapshot` 和 checksum。
5. 恢复后重新核对 health、generation、point count、已知 sourceRef 与 ACL smoke。

```bash
QDRANT_URL=http://127.0.0.1:6333
COLLECTION='hogwarts_knowledge_Hogwarts_World_Director_-_2026-08-02_22h16m07s339ms_g16b00e5647de42'
SNAPSHOT='/absolute/path/to/collection.snapshot'
CHECKSUM="$(cat "$SNAPSHOT.checksum")"
test "$(shasum -a 256 "$SNAPSHOT" | awk '{print $1}')" = "$CHECKSUM"
curl --fail --silent --show-error -X PUT \
  "$QDRANT_URL/collections/$COLLECTION/snapshots/recover?wait=true" \
  -H 'Content-Type: application/json' \
  --data "{\"location\":\"file://$SNAPSHOT\",\"priority\":\"snapshot\",\"checksum\":\"$CHECKSUM\"}"
```

snapshot 缺失、损坏或 generation 不匹配时，必须丢弃错误 collection，并从权威 State + chat 重跑 sync 全量 rebuild。Qdrant、JSON exact 和 Vectra 都不是 State、Actor Memory、ACL、revision 或 Reducer 的权威来源；任何 query、rebuild、snapshot 或 restore 都禁止反向改写这些权威数据。

## Planner 与 Relational Synapse

Planner 生成 1–4 个有界子查询，支持 direct、cause、consequence、participant 和 pattern。每个子查询都携带 audience、timeline、revision、clock、entity 和 node-type 约束。可选本地 Planner 失败时回退到 deterministic plan；不得调用配置的低/中/高档 Profile。

Relational Synapse 使用以下带 `sourceRefs` 的边：

- `derived_from`
- `supports`
- `contradicts`
- `about`
- `temporal`
- `similar`

检索先融合 exact 与 semantic ranking，再最多扩散两跳；每跳应用 edge weight、decay 与 `inverse_sqrt_degree` fan penalty。rerank 同时考虑 relevance、当前权威、confidence、recency 与 relationship salience，最后再次按 actor knowledge hydration。

每名人物的密封 activation capsule 最多包含 2 个 active expectation、2–3 个支持事件、1 个反例，以及 source ID 和 confidence。common capsule 只包含公开非主观事实。capsule 不得跨 observer 读取。

## Appraisal 与 Person Schema

Appraisal 是 observer 对已提交事件的主观解释，必须引用 Scene、event 和 message，并证明 observer 是 participant、witness 或 authorized rumor recipient。它不能复制客观 event summary、成为 common knowledge，或作为自身/世界事实的证据。

Person Schema 是 observer-target 行为预期，不是 Identity 或公共关系事实。稳定 Schema 需要至少 3 条 accepted Appraisal 且跨至少 2 个 Scene；反例保留为 counter evidence，冲突积累时降低 confidence 或标记 `contested`。每对最多 3 个 active Schema；旧解释通过 supersede 保留。

既有中档 event-boundary/Memory Consolidation 调用在同一 payload 中提交 `schemaOperations`，不新增 memory-only 中档调用。当前看法由 active/contested Schema 在读取时投影，不写入 Actor Core 或 Actor Runtime；初见印象单独由 Appraisal ref 投影。

## Low / Medium Prompt

低档普通 Performer 与 repair 的 User Payload 固定为 `LowTierContextV1` 六字段：

```text
playerTurn
sceneFacts
actorCards
actionOpportunities
memoryActivations
prohibitions
```

- `sceneFacts` 是当前 Scene、Room、Material、Item、Calendar 与 authority snapshot 的唯一低档事实投影，不并列注入旧 room/material/item payload。
- `actorCards` 只从 `ActorCoreV1 + ActorRuntimeV1 + Social projection + actorPresentations` 构造；每 actor 不超过 4 KiB，不含 raw Actor Library、完整 Identity、完整 Social Graph、人物记忆正文或 Knowledge Actor 聚合历史。
- `memoryActivations` 的快通路每 actor 最多 3 个 active Schema，只投影 expectation、confidence 与 status；慢通路每 actor 最多 3 个 hydrated Event，全局最多 8 个。
- `expectationEn` 只影响预期、边界、简写和主动性，不在正文解释 Schema 标签。
- 只有 matching observer activation 内存在带 `sourceRefs` 的 canonical Event 时，人物才能声称具体旧时间、地点、动作或原话。
- raw historical evidence 必须带归属，不能放在 authority snapshot 之后伪装成当前事实。
- repair 必须由同一个六字段 projector 重建，继续携带原 scene facts、actor cards、memory activations 和触发拒绝的 conflict。
- 总 User Payload 不超过 50 KiB；裁剪先删除 hydrated Event，再删除可重建 opportunity，不得重新注入 raw actor/social/history 数据。

中档 Scene Transition 与 Memory Consolidation 只读取有 provenance 且通过 audience/clock/revision 的证据。locked clue、private goal 和 secret 仅能由明确授权的高档流程读取。closure summary 或检索文本不能覆盖 Item、location、life、Identity 或 spell 权威。

## Scene boundary 与 stale guard

Scene close 必须消费 pending memory boundary，或把同一稳定 `boundaryId` 和 `carriedToSceneId` 带入下一 Scene。异步 consolidation 启动时捕获：

```text
timelineEpoch + stateRevision + boundaryId
```

提交前若任一项变化、boundary 不再 pending 或已被其他任务消费，结果必须丢弃，不写 memory/social/schema。合法提交保存精确 source message ID 与 witness，并把 boundary 标为 consumed。

## 调用预算

| 路径 | 正常模型预算 |
| --- | --- |
| Ordinary Turn | 既有 1 次 low；不新增 medium/high |
| Event Boundary | 既有 1 次 medium；Schema 合并在同一次调用 |
| Scene Transition | 既有 medium/high core + 既有 low opening |
| Qdrant、Planner、graph、hydration、Reducer | high/medium/low 均为 0；可选 local Planner 最多 1 |

diagnostics 记录 snapshot version/revision、planner subquery、backend/degraded、selected/source path、suppressed conflict、capsule ID、Appraisal/Schema 校验结果及 high/medium/low/local call count；不保存 secret 或完整私有 Prompt。

## Actor Context V1 迁移边界

Actor Context cutover 在 lifecycle 的其他人物迁移前，于克隆 State 中一次性构造并校验 `ActorCoreV1`、`ActorRuntimeV1`、`ActorMemoryIndexV1`、Appraisal 与版本字段。成功后一次替换原 State 并保存；失败时原 State 保持不变。Knowledge 随后从新 State + chat 全量重建，不读取已删除的人物印象、人物记忆正文、运行态 Identity 或 Social Graph 人物副本。

初级导演 System Prompt 的章节顺序、规则优先级、输出 Schema 与文风编排不属于本契约同步，必须由后续独立项目设计和验收。

## Task 7 档案修复

脚本只针对已登记的 Tina 羽毛笔冲突，默认 dry-run：

```bash
node scripts/repair-hogwarts-relational-memory-task7.mjs \
  --dry-run --file path/to/chat.jsonl
```

dry-run 校验 archive SHA、timeline epoch、revision 和 212–214 目标消息 fingerprint，证明销毁证据映射为 `destroyed + physicalForm=absent`，输出 bounded diff 与 Knowledge V2 rebuild 计划；不写 archive/Knowledge，模型和网络调用为 0。

全部 guard 命中后才允许：

```bash
node scripts/repair-hogwarts-relational-memory-task7.mjs \
  --apply --file path/to/chat.jsonl \
  --backup-root path/to/backups \
  --knowledge-root path/to/hogwarts-mud
```

apply 先创建时间戳目录，其中包含 archive 备份、存在时的 `knowledge-before/` 和 `manifest.json`，再原子替换 archive 并重建 JSON exact Knowledge V2。只修复目标 Item、冲突开场子句、派生 Knowledge 与所需 revision metadata；其他消息、Calendar、Social、Identity、Memory 和 Item 必须保持不变。重复 apply 是 no-op/byte-stable。

任一步失败时脚本自动恢复 archive 与 Knowledge，并把 manifest 标为 `rolled_back`。脚本没有 `--restore` 参数；人工恢复必须先停止写入源，再按 manifest 的 `archive.backupPath -> archive.path` 恢复 archive，并用 `knowledge.backupPath` 替换 `knowledge.timelineRoot`，最后核对 manifest 中的 SHA、epoch、revision 与 Knowledge record count。
