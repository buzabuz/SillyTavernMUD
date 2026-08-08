# Hogwarts MUD Narrative-First Turn Protocol

## 目标

低档模型只负责不可替代的现场表演。只要 `segments` 可用，正文立即进入提交路径；状态附属字段缺失或无效时，由确定性结算图补默认值、逐项丢弃或记录待对账事项，不得触发整轮重写。

本次改造不增加模型调用，不解析文学正文来猜测复杂状态，不替换现有 JSON 权威快照，也不引入多 Agent。

## V2 输出协议

唯一必需字段：

```json
{
  "segments": [
    {
      "type": "narration",
      "textEn": "observable prose"
    },
    {
      "type": "dialogue",
      "actorId": "existing_actor_id",
      "textEn": "spoken words only"
    }
  ]
}
```

可选稀疏状态建议：

```json
{
  "stateProposals": [
    {
      "type": "actor_exit",
      "actorId": "actor_id",
      "currentActivityEn": "leaving the room"
    },
    {
      "type": "actor_move",
      "actorId": "actor_id",
      "mapId": "existing_map",
      "roomId": "reachable_room",
      "currentActivityEn": "walking into the corridor"
    },
    {
      "type": "actor_activity",
      "actorId": "actor_id",
      "currentActivityEn": "reading beside the fire"
    },
    {
      "type": "social_hint",
      "actorId": "actor_id",
      "impressionOfPlayerEn": "optional shorthand",
      "memoryUpdate": {
        "summaryEn": "optional witnessed experience",
        "significance": "everyday"
      }
    },
    {
      "type": "item_update",
      "item": {
        "id": "stable_item_id",
        "action": "acquire"
      }
    }
  ],
  "signals": {
    "eventEnded": false,
    "pacingBeatRealized": false,
    "sceneProgression": {
      "type": "social_shift",
      "summaryEn": "optional completed change",
      "completedRequestedStep": false
    }
  }
}
```

临时人物仍可使用兼容字段 `temporaryActorEntrances`。V1 的 `publicEventEn`、`actorUpdates`、`actorPresence`、`sceneProgression`、`eventEnded`、`checkApplied` 和 `pacingBeatRealized` 继续接受，但全部降为可选输入，由结算图转成 V2 内部事务。

## 所有权

### 本地规则已经拥有

- 玩家直接受话与台词顺序。
- 玩家移动、同行者与目标房间。
- 骰值、结果和隐藏难度。
- 世界时钟、天气、宵禁和经过时间。
- 回合开始时的完整在场集合。
- 物品和角色的权威 ID。
- 印象冷却、知识边界和空间可见性。

低档不得在输出中重新证明这些状态。

### 低档仍然拥有

- 现场旁白和 NPC 对白。
- 对玩家动作与既定判定结果的具体表演。
- 少量只有表演时才确定的稀疏建议，例如 NPC 是否离开、最终正在做什么、是否出现值得记录的社交反应。

### 中档与事件边界拥有

- 共同记忆晋升、合并和遗忘。
- 社交关系图整理。
- 下一事件方向和场景节奏。
- 跨场景人物、地点和世界变化。

## 确定性 LangGraph

每轮低档仍只调用一次。模型返回后进入服务端 `Turn Settlement Graph`：

```text
collect_input
  -> accept_narrative_core
  -> fold_sparse_proposals
  -> reconcile_authority
  -> finalize_turn
```

- `accept_narrative_core`：只要求 1–24 个有效分段和合法对白 actor ID。
- `fold_sparse_proposals`：把 V2 proposal 与旧 V1 metadata 合并为候选 delta。
- `reconcile_authority`：校验人物、房间、物品、印象、记忆和临时人物；无效候选单独丢弃。
- `finalize_turn`：本地生成事件摘要、默认 `eventEnded=false`、默认保留在场人物，并将本地判定标记为已结算。

服务端图失败时，客户端使用同一组纯函数本地降级，不追加模型调用。

## 失败语义

会使整轮失败的核心错误：

- 没有可用分段。
- 分段类型或正文为空。
- 对白引用不存在且无法恢复的角色。
- 正文违反已提交移动的目标地点。
- 正文直接冲突于权威时间或已结算判定。

不得使整轮失败的附属错误：

- 缺失或无效的 `publicEventEn`。
- 缺失 `eventEnded`、`sceneProgression`、`checkApplied` 或 `pacingBeatRealized`。
- 缺失或不完整的 `actorPresence`。
- 非法人物活动、位置、物品、印象或记忆建议。
- 可选 proposal 的未知类型或缺失字段。

附属错误进入 `settlementWarnings`，只用于调试和后续对账。

## 状态与兼容

- 事务写入 `protocolVersion: 2`。
- `actorPresence` 由“回合开始集合 + 合法进出 proposal”折叠产生。
- `publicEventEn` 优先使用合法旧字段；否则从结尾叙事分段确定性截取简短事件记录。
- 现有 `applyTurnTransaction()` 继续消费兼容事务，降低一次迁移的影响面。
- 旧存档、旧失败回合和旧模型输出无需迁移。

## 验收

1. 只有 `segments` 的低档响应可以提交。
2. 缺少 `actorPresence`、摘要和进度字段不触发第二次模型调用。
3. 非法印象或记忆只被丢弃。
4. 合法 `actor_exit` proposal 能更新最终在场集合。
5. 非法 proposal 不影响正文。
6. V1 完整输出行为不回归。
7. 单元测试、ESLint、语法检查与真实游戏回合全部通过。

## 实施结果

- 状态：已实施并通过真实回合验收。
- 自动回归：135 项测试通过，ESLint、语法检查和 `git diff --check` 通过。
- 真实事务：`protocolVersion: 2`。
- 结算路径：`settlementSource: langgraph`，确认使用本机 SillyTavern 服务端确定性图。
- 附属警告：`settlementWarnings: []`。
- 世界状态：时钟正常推进 15 分钟，人物在场、房间、活动与物品状态保持一致。
