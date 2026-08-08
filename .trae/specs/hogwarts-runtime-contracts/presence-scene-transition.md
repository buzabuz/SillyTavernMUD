# Presence 与 Scene Transition 运行契约

## 已验证不变量

```text
activeInteractionActorIds = 当前进入完整人物上下文与快捷互动的少量卡司
localPresence = 当前房间完整的已确认人物与 cohort
event witness = 针对单个事件按感知证据解析的见证范围
```

- active 通常为 2–4 人，不能用来推断完整房间人口。
- local occupant 即使没有对白、退出镜头或 `present=false`，只要没有移动/离场证据就必须保留。
- actor 只存在于 `actorLibrary` 不能证明在场。
- scene actor state、已提交位置、scene roster、cohort roster 都是合法占位证据。
- witness 不反写 active 或 local。

## 写入链路

### 普通回合

1. `workflows/turn.js` 接收 settlement transaction。
2. `domain/spatial-reconciliation.js` 校验 actor movement 与 active proposal。
3. `reduceLocalPresence()` 合并既有 occupant、actor position、movement 与 cohort。
4. `resolveEventWitnesses()` 使用 local + perception 计算事件见证。
5. `applyPresenceWitnessTransaction()` 提交 local/event knowledge。
6. `people-projection.js` 分别投影 active 和 local-only。

后置 observer 的人物建议必须再经过确定性证据门禁：

- `presence=absent` 只有在同一句 evidence 中出现明确离场、走出、进入其他房间等动作时才生效。
- actor room 变化只有在 evidence 中出现目标 room ID 或目标房间名称时才生效。
- 形态变化、原地显形、后退、落座、沉默或退出镜头都不能单独删除 active/local。
- 非法 presence/location 建议被丢弃时，合法的 `currentActivityEn` 仍可保留。
- observer 的 `present=false` 只影响 active compatibility；没有结构化移动证据时不得移出 local。

### 场景转场

1. 中/高档 transition director 只提议 `nextScene.actorStates`，它表达新场景 active cast，不是完整 roster。
2. 低档 opening performer 只能让 `actorStates[present=true]` 的人物说话。
3. `applySceneTransition()` 提交 scene/map/items/actors。
4. `projectSceneTransitionPresence()`：
   - 从 `actorStates[present=true]` 生成 active。
   - 从 actor position 生成 destination occupants。
   - classroom-to-classroom 时，从当前 local cohort 或紧邻 archive 的 `localCohortIds` 携带 class roster。
   - 将 cohort 已知成员移动到目标教室，但保持非互动成员 `present=false`。
   - 创建目标课堂 cohort，并生成 local occupant/cohort 列表。
5. `buildSceneTransitionMessage()` 写入 transition diagnostics。

### 旧档加载

`runtime/lifecycle.js` 在以下情况执行无模型修复：

- current map/room 与 `localPresence` 不一致；
- 当前是 classroom，local cohort 为空，但紧邻 archive 存在 class cohort；
- `actor.present` 与 `activeInteractionActorIds` 不一致。

修复只消费 actor positions、当前 scene、cohort 和 archive，不解析自由正文，不调用用户模型。

## Classroom cohort 迁移

来源示例：

```json
{
  "id": "gryffindor_year1_charms_1991",
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

转场到 `transfiguration_classroom` 后：

```json
{
  "activeInteractionActorIds": [
    "mcgonagall",
    "hermione",
    "ron",
    "lavender"
  ],
  "localPresence": {
    "roomId": "transfiguration_classroom",
    "occupantActorIds": [
      "dean",
      "harry",
      "hermione",
      "lavender",
      "neville",
      "ron",
      "seamus",
      "mcgonagall"
    ],
    "cohortIds": [
      "gryffindor_year1_transfiguration_1991"
    ],
    "source": "cohort_roster"
  }
}
```

UI 只在“当前互动人物”显示前四人；“当前地点人物”排除 active 后显示 Harry、Dean、Neville、Seamus，并额外显示课堂 cohort 摘要。

## 位置证据优先级

1. 已提交 movement / entrance / exit。
2. actor `mapId + roomId`。
3. scene transition actor state。
4. scene roster。
5. class/dorm/family cohort roster。
6. 高置信度旧档迁移。

以下内容单独存在时不能证明物理在场：

- actorLibrary membership；
- 人名在旧正文中出现；
- 关系边或共同记忆；
- UI 当前选中人物；
- `actor.present=false`；
- 遗留物品或环境描述。

## Diagnostics

新 scene opening 消息保存：

```text
extra.hogwartsMud.sceneTransition.diagnostics
```

至少包含：

- transition `actorStateIds`
- `presentActorStateIds`
- committed `actors[present]`
- `activeInteractionActorIds`
- local map/room/occupants

以后排查人物漏录时先比较这些字段，再决定问题位于模型 proposal、transition reducer、lifecycle migration 还是 UI projection。

## 回归测试

| 行为 | 测试 |
| --- | --- |
| active/local UI 分层与 fail-closed | `tests/hogwarts-mud-people-projection.test.mjs` |
| cohort 与 presence contract | `tests/hogwarts-mud-presence-contract.test.mjs` |
| witness resolution | `tests/hogwarts-mud-witness-resolver.test.mjs` |
| classroom 转场保持 full local cohort | `tests/hogwarts-mud.test.mjs` |
| partially repaired save 无模型恢复 cohort | `tests/hogwarts-mud-task5-workflows.test.mjs` |
| 模块边界、无循环、无顶层副作用 | `tests/hogwarts-mud-task1-baseline.test.mjs` |

## 禁止回归

- 禁止用 `actors.filter(present)` 重建完整 local occupants。
- 禁止把所有 actorLibrary 人物默认放入新房间。
- 禁止因 active 轮换删除 local occupant。
- 禁止只凭人物名字出现在 evidence 中就接受 `presence=absent`。
- 禁止 exact evidence 绕过目标房间 grounding。
- 禁止让 transition model 直接覆盖完整 local roster。
- 禁止让 UI 通过合并 active/local 来“修正”错误世界状态。
