# 拆分本地在场与事件见证 PRD

## Why

当前 `actor.present` 实际承担“本回合进入低档模型镜头的活跃实名卡司”，却又被 UI、Social Director、知识库和场景归档当成完整物理在场名单。没有参与当回合对白的人因此被错误排除在见证者之外；课堂事故等全室可见事件只被少数互动人物知道。

本变更将“当前互动人物”“当前地点人物”“事件见证者”拆成独立权威，把感知判断编排进现有本地小模型后置观察链，并使用纯确定性迁移修复存量档案，全程不调用用户的大模型 API。

## 当前写入逻辑审计

| 阶段 | 当前输入 | 当前写入 | 问题 |
| --- | --- | --- | --- |
| 低档现场表演 | `state.actors[present!=false]`、玩家行动、人物胶囊 | `segments`、稀疏 `stateProposals` | `present` 是小规模镜头卡司，不是完整房间名单 |
| Turn Settlement Graph | 低档输出、世界状态 | `turnTransaction`、人物活动与移动 | `actorPresence.presentActorIdsAfterTurn` 延续互动卡司语义 |
| 本地后置观察 `/local/observe` | 正文、房间、活跃人物 | material、event boundary、actor updates | 尚未提取事件视觉/听觉范围，且只观察活跃人物 |
| Social evidence 收集 | 消息、actorPresence、对白人物 | `witnessActorIdsByMessageId` | 直接把互动卡司当见证者，漏掉同室旁观者 |
| Social Reducer | 关系提案、见证白名单 | statement、evidence、关系边 | Reducer 校验正确，但上游白名单已不完整 |
| 人物记忆/印象 | `social_hint`、actor updates | actorLibrary memory/impression | 非活跃的同室人物无法获得重大公开事件知识 |
| 本地知识库 | turn transaction、actorPresence | event entity IDs、scene actors | 把 active cast 错记成事件全部见证者 |
| Scene archive | `state.actors[present]` | `sceneArchive.actorIds` | 单字段混合镜头卡司和物理占位 |
| UI 人物栏 | `state.actors[present]` | “在场人物” | 标签错误，实际展示当前互动人物 |

## Goals

- 明确三层状态：active interaction、local presence、event witness。
- 保持低档模型上下文稀疏，不把整个教室的完整人物胶囊塞进 Prompt。
- 让重大公开事件被同室已知人物和稳定群体正确见证。
- 让本地小模型只判断事件如何被感知，最终见证名单由确定性逻辑生成。
- 保持事件知识与关系数值分离，避免同室事件制造全连接关系图。
- 修复现有 Tina 及全部 Hogwarts MUD 档案，不调用用户大模型 API。

## Non-Goals

- 不重新设计 Social Graph 十维数值或关系星图。
- 不要求为匿名课堂人群逐一创建人物卡。
- 不让本地小模型直接写最终 witness 名单。
- 不为感知判断新增第二次本地模型调用。
- 不对证据不足的旧档事件猜测或扩张见证者。

## What Changes

- 新增 `activeInteractionActorIds`、`localPresence`、`eventKnowledge` 数据契约。
- 保留 `actor.present` 作为 active interaction 兼容字段，不再解释为物理同室。
- 新增稳定 cohort，用于课程、寝室、家庭等匿名或半匿名群体。
- 扩展现有 `/local/observe` Schema，输出事件 perception。
- 新增 Presence Reducer、Witness Resolver 和 Event Knowledge Reducer。
- Social Director、人物胶囊、知识库、scene archive 改用事件级 witness。
- UI 改为“当前互动人物”与折叠的“当前地点人物”。
- 新增可 dry-run、备份、恢复、幂等重跑的离线档案迁移工具。
- **BREAKING**：`actorPresence.presentActorIdsAfterTurn` 不再代表事件见证者。

## Impact

- Affected capabilities: 现场表演、空间占位、本地语义观察、回合结算、事件知识、Social Director、人物记忆、知识库、场景归档、人物栏、档案迁移。
- Affected code:
  - `src/hogwarts-mud/local-semantic-adjudicator.js`
  - `src/hogwarts-mud/turn-settlement-graph.js`
  - `src/hogwarts-mud/social-director-graph.js`
  - `src/endpoints/hogwarts-mud.js`
  - `public/scripts/extensions/hogwarts-mud/helpers.js`
  - `public/scripts/extensions/hogwarts-mud/index.js`
  - `public/scripts/extensions/hogwarts-mud/knowledge.js`
  - `public/scripts/extensions/hogwarts-mud/panel.html`
  - `public/scripts/extensions/hogwarts-mud/style.css`
  - `scripts/`
  - `tests/hogwarts-mud.test.mjs`
  - `tests/hogwarts-mud-social-contract.test.mjs`
  - `tests/hogwarts-mud-readonly.e2e.js`

## Design Principles

1. 物理占位由确定性状态拥有，镜头轮换不能让人物物理消失。
2. 本地小模型只判断感知属性，不选择最终见证者。
3. Witness Resolver 的输出必须可重放、可审计、幂等。
4. 知道事件不等于产生关系变化。
5. 匿名群体知识不自动展开成个人关系边。
6. 感知元数据失败不得吞掉已提交正文。
7. 存量迁移不使用任何用户大模型或翻译端点。

## ADDED Requirements

### Requirement: 三层人物状态

系统 SHALL 分别维护：

```json
{
  "activeInteractionActorIds": [
    "ron",
    "lavender",
    "flitwick"
  ],
  "localPresence": {
    "version": 1,
    "mapId": "hogwarts_second_floor",
    "roomId": "charms_classroom",
    "occupantActorIds": [
      "harry",
      "ron",
      "hermione",
      "lavender",
      "dean",
      "seamus",
      "neville",
      "flitwick"
    ],
    "cohortIds": [
      "gryffindor_year1_charms_1991"
    ],
    "updatedTurn": 50,
    "source": "scene_roster"
  }
}
```

- `activeInteractionActorIds` 控制完整人物上下文、当回合对白和快捷互动，通常为 2–4 人。
- `localPresence.occupantActorIds` 保存当前房间中已确认存在的已知人物。
- `localPresence.cohortIds` 保存不需逐人建卡的群体。
- `witnessActorIds` 和 `witnessCohortIds` 属于具体事件，不反写物理占位。

#### Scenario: 课堂中的非互动同学

- **WHEN** Harry、Hermione、Dean 与玩家同在教室，但本回合只由 Ron、Lavender、Flitwick 参与互动
- **THEN** 前三者仍在 `localPresence.occupantActorIds`
- **AND** 只有后三者必须进入 `activeInteractionActorIds`
- **AND** 没有对白不得被解释为离开房间

### Requirement: 本地占位权威

`localPresence` SHALL 按以下优先级确定性投影：

1. 已提交 actor movement/entrance/exit。
2. 人物 `mapId + roomId` 与玩家当前房间一致。
3. 场景开场或转场提交的已知 room roster。
4. 课程、寝室、家庭等预定义 cohort roster。
5. 旧档迁移得到的高置信度场景人物并集。

名称提及、遗留物、关系边和互动选择均不能单独证明物理在场。死亡、失踪、明确离场或移动到其他房间时必须从 occupant 集合移除。

#### Scenario: 镜头轮换不改变位置

- **WHEN** Hermione 本回合退出对白预算，但没有移动或离场证据
- **THEN** 她可以退出 active interaction
- **AND** 必须继续存在于当前教室 occupant 集合

### Requirement: 稳定群体占位

系统 SHALL 支持稳定 cohort：

```json
{
  "id": "gryffindor_year1_charms_1991",
  "labelEn": "Gryffindor first-years in Charms",
  "mapId": "hogwarts_second_floor",
  "roomId": "charms_classroom",
  "knownMemberActorIds": [
    "harry",
    "ron",
    "hermione",
    "lavender",
    "dean",
    "seamus",
    "neville"
  ],
  "source": "class_roster"
}
```

Cohort witness 只进入事件知识，不直接创建人物、共同记忆或关系边。成员日后正式建卡时 MAY 继承公开群体事件，但必须标记来源，不得伪装成独有亲历细节。

### Requirement: 事件感知契约

现有本地后置观察器 SHALL 为可持久化事件返回：

```json
{
  "visualScope": "none|target|nearby|room|area",
  "audibleScope": "none|target|nearby|room|adjacent",
  "salience": "subtle|normal|notable|major",
  "attribution": "clear|ambiguous|unknown",
  "concealment": "none|attempted|successful",
  "directParticipantActorIds": [
    "ron"
  ],
  "evidenceText": "exact source substring",
  "confidence": 0.95
}
```

- 结果必须依据玩家行动、判定结果和最终叙事，不得只依据玩家意图。
- `evidenceText` 必须是玩家输入或叙事分段的精确子串。
- 本地模型只能使用已提供的 actor ID。
- 本地模型不得输出最终 witness 名单。
- 单回合默认只提交一个主事件 perception；确有独立私密子事件时才允许额外项。

#### Scenario: 隐蔽意图失败

- **WHEN** 玩家想偷偷施法，但判定失败并造成全室事故
- **THEN** `concealment=attempted`
- **AND** 最终 visual/audible scope 根据实际结果为 `room`
- **AND** 不得按隐蔽意图缩小见证范围

### Requirement: 确定性 Witness Resolver

Witness Resolver SHALL：

1. 接收已校验 perception、直接参与者、local presence 和空间视听图。
2. 为直接参与者写入 `direct` knowledge。
3. `target` 只覆盖明确目标和直接参与者。
4. `nearby` 覆盖 active interaction 与确定近距离人物。
5. `room` 覆盖同室 occupant 和 cohort。
6. `area/adjacent` 仅覆盖空间图允许看见或听见的人物。
7. `successful` concealment 排除非直接参与者；`attempted` 不自动缩小范围。
8. `clear` attribution 允许知道施事者；`ambiguous/unknown` 只授予事件知识。
9. 输出稳定排序的 actor IDs、cohort IDs 和逐人物 basis。

```json
{
  "participantActorIds": [
    "ron"
  ],
  "witnessActorIds": [
    "dean",
    "flitwick",
    "harry",
    "hermione",
    "lavender",
    "neville",
    "ron",
    "seamus"
  ],
  "witnessCohortIds": [
    "gryffindor_year1_charms_1991"
  ],
  "witnessBasis": {
    "ron": "direct",
    "harry": "room_visual_audible"
  }
}
```

#### Scenario: Tina 悬浮 Ron

- **WHEN** Tina 在魔咒课公开施法，把 Ron 悬浮到半空
- **THEN** perception 为 `room + room + major + clear`
- **AND** 教室全部已知 occupants 与课堂 cohort 都成为见证者
- **AND** 未参与对白的 Harry、Hermione、Dean、Seamus、Neville 仍获得事件知识

### Requirement: 感知失败回退

本地后置观察不可用、超时、JSON 无效或 perception 被拒绝时，正文 SHALL 正常提交，并使用确定性回退：

- 结构化 spell cast、公开伤害、喊叫、爆炸、教授公告、`broadcast_speech` 使用 room。
- `direct_speech` 默认 target audible。
- 普通动作默认 nearby。
- 明确耳语、纸条、成功隐蔽默认 target。
- 无法判断施事者时使用 `attribution=unknown`。

回退结果必须标记 `source=deterministic_fallback`。

### Requirement: 事件知识

公开事件 SHALL 先写入 `eventKnowledge`：

```json
{
  "eventId": "event_turn_191",
  "sceneId": "first_charms_class",
  "sourceMessageIds": [
    191
  ],
  "summaryEn": "Tina levitated Ron instead of the feather.",
  "participantActorIds": [
    "ron"
  ],
  "witnessActorIds": [
    "harry",
    "hermione",
    "lavender",
    "flitwick"
  ],
  "witnessCohortIds": [
    "gryffindor_year1_charms_1991"
  ],
  "perception": {},
  "source": "post_turn_observer"
}
```

人物知道事件不得自动创建关系边或修改关系数值。只有 Social Director 产生合法、定向、来源明确的 evidence 后，Social Reducer 才可更新关系。

### Requirement: 写入所有权

| 数据 | 唯一写入者 | 模型权限 |
| --- | --- | --- |
| `activeInteractionActorIds` | Scene/Turn Settlement Reducer | 中低档只可提案 |
| `localPresence` | Presence Reducer | 模型不可覆盖完整集合 |
| `perception` | 本地观察器 + validator | 本地模型可提案受限枚举 |
| participant/witness/cohort/basis | Witness Resolver | 所有模型只读 |
| `eventKnowledge` | Event Knowledge Reducer | 模型不可直接写 |
| 关系 deltas/appraisals | Social Director 提案、Social Reducer 提交 | 受 event witness 限制 |
| actor memory/impression | Memory Reducer | 只能使用该 actor 的合法知识 |
| knowledge/archive | 确定性 projector | 不接受自由补写名单 |

任何下游不得再从 `actorPresence.presentActorIdsAfterTurn` 推断 witness。

### Requirement: 模型调用工作流

普通回合 SHALL 按以下顺序执行：

1. `/local/adjudicate`：前置本地裁判判断时间、判定需求和隐蔽意图，不写 witness。
2. 低档现场表演：使用 active interaction 人物完整上下文生成 narrative-first segments。
3. Turn Settlement Graph：接受正文并提交权威状态。
4. `/local/observe`：在现有单次调用中同时返回 material、actor updates、event boundary、perception。
5. Presence Reducer：更新 local occupants/cohorts，不因镜头轮换删除人物。
6. Witness Resolver：确定性计算 participant/witness/cohort/basis。
7. Event Knowledge Reducer：写事件知识，不写关系数值。
8. Social Director：仅在既有事件边界/补算时机调用，消费已提交 witness。
9. Social Reducer：校验并提交关系变化。
10. Knowledge/Archive Projector：从权威事件、占位和关系状态生成派生记录。

#### Scenario: 不增加调用

- **WHEN** 普通回合完成
- **THEN** 感知判断复用现有一次 `/local/observe`
- **AND** 不新增低档、中档、高档或第二次本地模型请求

### Requirement: UI 人物分层

人物栏 SHALL：

- 将“在场人物”改名为“当前互动人物”。
- 当前互动区保留人物卡和快捷输入。
- 增加可折叠“当前地点人物”，显示其余玩家已知 occupants。
- 显示匿名 cohort 摘要，例如“另有格兰芬多一年级学生若干”。
- 使用低对比视觉，不抢夺当前互动人物层级。
- 不泄漏玩家未知 occupant。
- 支持桌面、390px 窄屏、键盘和 reduced motion。

### Requirement: 离线档案迁移

所有 Hogwarts MUD 档案 SHALL 迁移到 presence/witness schema v1。迁移必须：

- 先创建逐文件备份和 manifest，记录路径、mtime、大小、SHA-256。
- 只读取现有 metadata、turn transactions、scene archive、actor positions、structured spell/check/material data 和稳定 roster。
- 确定性重建高置信度 local presence、公开事件 perception、event witness 和 cohort witness。
- 旧 actorPresence 只作为 active interaction 兼容输入，不再复制为 witness。
- 对结构化公开施法、伤害、公告、broadcast、重大事故使用确定性 room scope。
- 证据不足时保留旧 witness 并标记 `migrationConfidence=legacy_preserved`，不得扩张。
- 稳定生成 event/witness ID，重复运行不得重复写入。
- 更新必要的 knowledge/archive 派生缓存。
- 不改变正文、消息顺序/ID、scene ID、clock、turn、cursor、关系数值、evidence ID、共同记忆冷却和物品状态。
- 不调用 Connection Manager、`/generate`、翻译、Social Director 或任何用户模型 API。
- 默认 dry-run；显式 apply 后才原子替换。

#### Scenario: Tina 当前档案

- **WHEN** 对 Tina 当前档案执行迁移
- **THEN** 魔咒课事故获得全教室高置信度 witness
- **AND** Harry、Hermione、Dean、Seamus、Neville 等同室人物获得事件知识
- **AND** 不自动生成关系边或关系数值变化
- **AND** 用户模型 API 请求数为 0
- **AND** 正文、cursor、既有关系数值和共同记忆冷却不变

### Requirement: 迁移审计与恢复

迁移工具 SHALL 提供：

- `--dry-run`、`--apply`、`--file`、`--all`、`--restore-manifest`。
- before/after hash、修改字段、事件数、occupant 数、witness 数和低置信度跳过数。
- 临时文件、fsync、atomic rename。
- 任一校验失败时不替换原档。
- 使用 manifest 一键恢复。

## MODIFIED Requirements

### Requirement: Social Director witness 输入

Social Director 和服务端 Social Reducer SHALL 只使用已经提交的事件级 witness 白名单。模型不得把 active interaction、target、同室或 cohort 自行提升为 `witnessedBy`。

### Requirement: Actor Knowledge Capsule

人物胶囊 SHALL 区分：

- `direct`：本人直接参与。
- `witnessed`：由 Witness Resolver 证明看见或听见。
- `reported`：后续通过合法传播得知。

`reported` 不得伪装成亲眼目击；仅同室、仅同 cohort 或仅作为 target 都不能绕过 event provenance。

### Requirement: Scene Archive

Scene archive SHALL 分别保存：

- `activeInteractionActorIds`
- `localOccupantActorIds`
- `localCohortIds`
- event participant/witness/perception

旧 `actorIds` 仅作迁移输入，不再同时表达卡司和物理占位。

### Requirement: Local Knowledge Base

Event records SHALL 使用 event participant/witness/cohort 作为 entity IDs。Scene records SHALL 分别标明 active cast 与 local occupants；不得把 cohort witness 自动展开为尚未建卡的个人记忆。

## REMOVED Requirements

### Requirement: `actor.present` 等于物理在场

**Reason**: 该字段已经服务于镜头预算，无法同时表示完整房间人口。

**Migration**: 兼容期内 `actor.present` 映射 active interaction；物理同室改由 `localPresence` 和人物位置投影。`present=false` 不再单独证明人物离开房间。

### Requirement: Active cast 自动成为事件全部 witness

**Reason**: 它既漏掉同室旁观者，也可能错误授予隔墙或未感知人物知识。

**Migration**: 旧 `actorPresence` 只作为 active interaction 和低置信度历史输入；新回合统一使用 perception + Witness Resolver。
