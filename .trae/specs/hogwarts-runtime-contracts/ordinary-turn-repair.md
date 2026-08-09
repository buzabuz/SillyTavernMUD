# 普通回合生成与结构修复契约

## 目标

普通回合优先由首次低档 Performer 请求直接生成合法的 narrative-first JSON。结构修复只是同一运行中对非法响应的一次有界补救，不是重提玩家回合，也不能成为常态生成路径。

## 首次输出边界

- `playerTurnSequence` 是已提交的玩家输入，只用于驱动 NPC 与环境响应。
- Performer 不得把玩家的动作、台词、思想或选择复制、改写或引用为输出 `segments`。
- `dialogue` 只允许使用输入中 `presentActors` 的 NPC `actorId`。
- `actorId=player` 永远非法；玩家已经提交的 direct/broadcast speech 不得再次出现在 assistant 输出。
- 每个 direct speech block 必须得到目标 NPC 的可见回应，但“回应”不等于复述玩家台词。

## 当前态权威

- `scene.summary/summaryEn` 是新场景的开场快照。场景 timeline 超过一个条目后，Performer 投影必须省略该摘要。
- `scene.timelineEntries` 是按时间排序的历史，不是同时存在的事实集合；后续形态、位置、在场和物质状态覆盖早期条目。
- 当前 `actors[].currentActivityEn`、`presentActors`、`currentMaterialState`、`currentRoomState` 和结构化位置是当前态权威。
- 玩家或 NPC 台词可以回忆旧形态、开玩笑、推测或说错；台词不能创建第二实体，也不能让同一人物的历史形态与当前形态同时存在。

## 流式状态

```text
connecting
-> receiving
-> optional repairing
-> translating
-> observing and settlement
-> committed | failed
```

`liveSceneStream.segments` 可作为内部诊断数据保留，但不得在生成期间投影为正文。模型流未结束、validator 未通过、事务未提交时，玩家只能看到一张阶段 loading 卡；不得显示 `N 段已落笔`、partial segment 或修复前草稿。

## 最终消息展示

- assistant transaction 完整校验并提交前，不创建任何可阅读正文。
- 提交后一次性渲染权威 final segments，不把草稿 DOM 复用成最终消息。
- 新 assistant 消息首次进入当前场景时，story viewport 定位到该消息顶部，让玩家从第一段自然向下阅读。
- 同一消息后续因翻译、inspector、候选决策或普通重绘更新时，不得再次抢夺滚动位置。
- 首次加载已有存档时沿用一般滚动策略，不把历史最后一条消息误判为刚提交的新回复。
- 首次 scene render 的空/隐藏 story 容器不得参与 `wasNearBottom` 判断。`initialSceneLoad` 固定使用 `retain`，避免容器从几十像素扩张到完整历史高度时先滚底再被布局拉回。
- 生成期间只有原本已接近底部的读者才跟随 loading 卡；`turnActive` 或 `sceneTransitionActive` 不得覆盖用户阅读位置。
- Item/Spell 候选卡不得主动写入 story `scrollTop`。候选是否在视窗内不是滚动决策依据。

## 修复边界

- 首次 payload 非法时，同一 `runStructuredTurn()` 最多发起一次结构修复请求。
- 修复请求不得重新提交玩家消息，不得创建第二个玩家 turn。
- 修复后仍非法则进入 `failed`，保存 diagnostics 与错误，由玩家决定是否重试。
- 页面重载不得根据 `turn.status=resolving` 自动调用模型或补写 assistant 消息。
- 输出质量缺陷应优先收紧首次 Prompt；不得用自动 resubmit、无限 repair 或隐藏重试掩盖。

## 持久化与诊断

- 进入事务前持久化 `turn.status=resolving`。
- 成功提交 assistant transaction 后写入 `turn.status=idle`。
- 捕获到错误后写入 `turn.status=failed` 和 `turn.error`。
- `turnDiagnostics` 至少记录 initial/repair request、response、validation、commit/error 时间边界。
- 临时 `jobRegistry.turnActive` 与 `liveSceneStream` 只表达当前页面运行态，不是世界权威。

## 2026-08-09 证据

turn trace `turn-d822117c-d67b-4339-a897-3a81f1f8187e` 的首次输出错误地把玩家原话写成 `dialogue` 且使用 `actorId=player`。首次请求耗时 46.068 秒，结构修复耗时 225.094 秒，修复通过后正常提交。该案例要求加严首次 Prompt，保留 validator 作为最后门禁，不重提当前回合。
