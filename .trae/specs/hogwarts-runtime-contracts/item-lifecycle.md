# Item V2 运行事务

## 边界

正式 Item 只记录至少满足一项的物体：

- 发生获得、失去、赠送、借出或偷走；
- 具有社会意义、线索、承诺、纪念或标志身份；
- 损坏、清洗、消耗、丢失或销毁会影响后续剧情；
- 玩家明确决定收录。

普通校服、课本、羽毛笔、办公用品、店铺库存和生活用品默认是隐含叙事资源。它们可以自然出现在英文正文和 `materialEventLog`，但没有 ID、数量、所有权历史或 Item 卡。一旦一个具体对象完成赠送、借用、归还、偷取或被玩家明确保留，它就越过隐含边界，按正式候选流程处理。

## 权威分层

```text
prose mention
!= pendingItemProposal
!= formal items[]
!= actor current presentation
```

- 正文是当回合发生过的叙事记录。
- `pendingItemProposals` 是尚未由玩家确认的新物品候选。
- `items[]` 是 Reducer 提交后的正式物品事实。
- `actorPresentations` 只投影整体造型和正式 Item ID。

模型不得直接创建 `items[]`。低档演员与本地观察器只能输出证据化 proposal；medium/high 来源值已登记，但本阶段没有调用入口。Canon seed 和旧档迁移是离线确定性写入者。

## 普通回合

```text
low item_update + local observer item_update
-> fold each narrative state proposal exactly once
-> normalize operation and legacy action to the same atomic verb
-> normalizeItemProposal()
-> exact evidence check against player action / English segments
-> existing stable item ID
   -> transaction.itemOperations[]
-> new acquire candidate
   -> reject hidden or implicit/ungrounded object
   -> transaction.itemCandidates[]
-> validateTurnTransaction()
-> applyItemOperations(existing only)
-> queueItemCandidates()
-> persist world state + assistant turn transaction
-> render quiet candidate docket
```

无证据、未知人物 ID、隐藏新候选、非 `acquire` 新对象和未发生具体转移的普通隐含物品不会进入 pending 队列。完成 gift/loan/return/theft 的普通对象具有追踪意义；新对象仍使用 `acquire` candidate，并通过 `ownerId/holderId/transferMode` 保存转移关系。单个 proposal 失败不允许改写正文。

## Item Evidence 门禁

已有正式 Item 的高风险状态操作必须同时满足：

1. `evidenceText` 是玩家动作或英文结果正文的精确子串；
2. evidence 提到该 Item 的稳定标签、ID 派生名词或类型名词；
3. evidence 明确描述对应的 `lose/destroy/consume/damage/clean` 状态动作。

该门禁在 local observer projection 和 proposal partition 两层执行。它只拒绝明显不相关的 proposal，不替代语义 observer，也不让 Reducer 阅读正文。

`destroy` 与 `lose` 必须保持区分：

- 普通 `vanished/disappeared` 只支持 `lose`。
- `ruin/remains/wreck ... vanished/disappeared` 表示残骸被清除，可支持 `destroy`。
- 具体 Item 名称或类型仍必须在同一 evidence 中出现。

Narrative `stateProposals` 的 `item_update.item.operation` 会同时投影为兼容 `action`，避免旧 validator 只读 `action` 时丢弃合法 V2 操作。proposal fold 删除已消费的 `stateProposals`，重复经过 authority reconciler 不得复制同一 Item update。

## 玩家决策

```text
收录
-> resolveItemCandidate(key, accepted)
-> applyItemOperations(allowCreate=true)
-> synchronize actor presentation + scene.itemStates
-> remove pending
-> append bounded accepted decision
-> persist metadata

忽略
-> remove pending
-> append bounded ignored decision
-> keep original prose unchanged
```

候选 key 对新物品使用稳定 Item ID，不使用正文措辞。旧 decision 的 `itemId` 也参与抑制，因此同一候选换一种 evidenceText 不会立刻重现。收录/忽略不调用低、中、高档模型。

候选决策是纯本地事务：

```text
resolveItemCandidate()
-> saveMetadata()
-> applySystemPrompt()
-> renderAll()
```

不得等待 knowledge/vector 同步。幂等重试即使 `changed=false` 也必须重绘，以修复旧 DOM。UI 世界投影必须同时携带 `pendingItemProposals` 和 `itemProposalDecisions`，否则已决候选会被错误重画为 pending。

## Composer 操作协议

操作与对象使用两个有序 directive：

```text
【物品操作:carry｜携带】
【物品:acceptance_letter｜霍格沃茨录取通知书】
```

```text
插入表达选择 operation
-> createItemOperationDirective()
-> 打开玩家可见 Item ledger
-> Item 卡“引用到输入”
-> createItemReferenceDirective(stable item ID)
-> parseItemOperationDirectives()
-> player message itemDirectives/itemDirectiveErrors
-> low performer + local observer
-> existing proposal validation and Item Reducer
```

- operation directive 支持完整十二操作。
- reference directive 只能由玩家可见的正式 Item 卡生成；label 只用于显示，ID 是权威。
- parser 只把一个 operation 与其后的第一个 Item reference 配对。
- 孤立 operation、孤立 reference、未知 ID 和 hidden ID 只产生 diagnostics，不产生合法 directive。
- directive 是玩家意图和对象选择，不证明动作成功。只有英文结果正文确认完成后，observer 才能提交 Item operation proposal。
- `give/lend` 的接收者仍从玩家自然行动和结果正文取得，不能由 Item reference 猜测。
- 未跟踪新物品没有 reference；玩家以自然语言描述获得行为，仍走 candidate/收录流程。

## 操作不变量

| 操作 | owner | holder/location | presentation/state |
| --- | --- | --- | --- |
| `acquire` | 仅 gift 明确改变 | 设置当前持有人并随 holder | 可保留明确 `isEquipped` |
| `carry` | 不变 | 设置 holder、`with_holder` | 退出穿戴；`held=true` 才加入手持 ID |
| `place` | 不变 | 清 holder，写房间 placement | 清穿戴/手持 |
| `equip` | 不变 | 设置 holder、`with_holder` | `isEquipped=true`，加入 worn ID |
| `unequip` | 不变 | 保留 holder | 清 worn ID |
| `give` | 改为接收者 | 改为接收者 | 清旧人物引用 |
| `lend` | 不变 | 改为借用者 | `transferMode=loan` |
| `consume` | 不变 | 清 holder | `state=consumed`，不可 carry 复活 |
| `damage` | 不变 | 不变 | `state=damaged` |
| `clean` | 不变 | 不变 | 只允许 dirty -> intact |
| `lose` | 不变 | 清 holder，保留最后位置 | `state=lost` |
| `destroy` | 不变 | 保留 holder/location 并继续跟随 | `state=destroyed`，清穿戴/手持展示，不可 carry 复活 |

偷走使用已有 Item 的 `acquire + transferMode=theft`：只改变 holder，不改变 owner。归还使用 `transferMode=return` 和结构化目标 holder。

## 位置跟随

`synchronizeHeldItemLocations()` 只读取：

- Item `holderId`；
- 玩家 `spatial/map` 位置；
- runtime actor 的 `mapId/roomId`。

所有权不参与位置判断。玩家借来的物品跟随玩家，NPC 借走或偷走的物品跟随 NPC。`destroyed` 仍是可追责、可定位的稳定 Item，保留当前 holder 并继续跟随，供后续修复或替换流程引用；只有 `lose` 和 `consume` 清空 holder。移动、内部地图、空间修复、回滚和场景转场都在人物位置提交后调用同一投影。

## Current Presentation

```json
{
  "outfit": "one ordinary overall look",
  "wornItemIds": ["formal_item_id"],
  "heldItemIds": ["formal_item_id"],
  "updatedClock": "1991-09-02 · 11:30"
}
```

- 普通衣着只写一个 `outfit`。
- `wornItemIds/heldItemIds` 由 Item Reducer 同步。
- hidden Item 在 ID 解析前先经过 player visibility projection。
- `accessories/heldItems/heldObject` 只保留为旧档只读 fallback；新 material event 不再写这些字段。
- 发型和可见状态沿用 material presentation 字段，不在 Item 迁移时删除。

## 旧档与 Canon

`migrateItemSystemState()`：

1. 将 V1 `kind/custody/detail/source` 确定性映射到 V2。
2. 保留 ID、主人、位置、状态、来源、时间和兼容投影。
3. 将 equipped Item 加入对应人物 `wornItemIds`。
4. 保留 legacy presentation 的发型、可见状态和只读 fallback。
5. 按 actor library、世界日期和稳定 ID seed Canon 标志物。
6. 设置 `itemSystemVersion=2` 与 `canonItemCatalogVersion`。

重复加载必须 byte-stable；`legacy_` 来源前缀不能重复叠加。迁移不调用用户模型。

## UI 与可见性

- 物品库、NPC 人物卡和回合候选复用 `ui/item-components.js`。
- `hidden` 永不进入玩家 ledger、人物卡或 presentation 文本 fallback。
- 当前物品与失去/消耗历史分组显示。
- 卡片显示类型、状态、主人/持有人、位置、剧情角色、获得精度与来源。
- 回合候选默认只显示名称、类型/转移关系和收录/忽略操作；外观、归属、位置和原始 evidence 在 hover、keyboard focus 或“详情”按钮中展示。
- 收录/忽略成功后立即就地更新状态并显示本地 toast；accepted 卡只保留“详情”。
- Item/Spell 候选卡是消息流中的普通内容，不得通过 timer、`scrollIntoView()` 或 `scrollTop` 写入强迫自身进入视窗。
- 关闭的原生 `<details>` 菜单内容必须 `display:none`，不得形成覆盖其他按钮的幽灵点击区域。
- “插入表达”展示十二 operation；正式 Item 卡提供“引用到输入”并写入稳定 ID。
- 窄屏由 `hpmud-inspector-open` 打开 UI-only 检查器抽屉；不写世界状态。
- 420px 以下 Item grid 单列；按钮保留键盘焦点，reduced-motion 关闭候选动画。

## 排障

1. 读消息 `turnTransaction.itemOperations/itemCandidates`。
2. 读世界 `pendingItemProposals/itemProposalDecisions/items`。
3. 核对 Item `ownerId/holderId/location/state/isEquipped`。
4. 核对 `actorPresentations` 与 `scene.itemStates` 派生投影。
5. 最后检查 Item projection 和 DOM；不得从 UI 缺卡直接推断 Reducer 未提交。
