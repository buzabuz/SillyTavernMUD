# Item / NPC Identity / Calendar 准入审计

## 结论

截至 2026-08-09，Item V2 在“叙事重要物品的权威状态机”范围内达到 **8/10，Verified**，可以冻结功能面并进入维护模式。现在可以开始 NPC Identity 与 Calendar，但不是直接堆 Prompt：

1. 先补跨系统 `stateRevision/timelineEpoch` 保存冲突门禁；
2. 同步建立 NPC Identity V1 的正式 Schema；
3. 再以一个完整上课日实现 Calendar V1 纵向切片；
4. 蒙太奇、周结算、运势和重大事件唤醒放在 Calendar V1 稳定之后。

Item 不再是下一阶段的阻塞项。当前阻塞 Calendar 批量推进的是旧浏览器运行态可覆盖新存档，而不是 Item Reducer。

## 审计证据

- 全量 Hogwarts Node `312/312`，ESLint、完整语法、diff 与模块尺寸门禁通过。
- Item 专项测试 18 项，覆盖 12 操作、证据门禁、候选、迁移、Canon seed、UI projection、presentation 与 holder 跟随。
- 当前真实档案：
  - 10 个正式 Item，10 个唯一 ID；
  - 9 个 `intact`，1 个 `destroyed`；
  - 0 个 pending，1 个已接受 decision；
  - 0 个 dangling presentation reference；
  - 10 个 `scene.itemStates` 与 `items[]` 派生结果一致。
- 羽毛笔真实回归覆盖 owner/holder 分离、destroyed holder 跟随、转场投影、Opening Prompt 与浏览器 Item 卡。
- NPC 当前档案：
  - 21 个稳定 actorLibrary profile，23 个 runtime actor；
  - 21/21 具备名称、aliases、role、背景、性格、说话风格、private goal 与 knowledge；
  - 12/21 有 Canon ID/setting tags，出生信息仍不完整；
  - 2 个 runtime actor 尚未进入 actorLibrary。
- Calendar 当前档案：
  - 世界时钟为 `1991-09-02 · 13:05`；
  - `agenda` 仍是 7 月开局“麦格敲前门”日程；
  - `dailyDirector.date` 虽为 9 月 2 日，指令仍围绕分院宴会；
  - 当前在场 Harry 没有 daily directive，三名已离开人物仍有 directive。

## Item V2 成熟度

| 维度 | 评级 | 已完成 | 剩余风险 |
| --- | --- | --- | --- |
| 领域边界 | 9/10 | 正式/隐含物品、proposal/formal/presentation 分层明确 | medium/high hidden proposal 尚无入口 |
| Schema | 9/10 | ID、类型、owner、holder、location、state、来源、可见性、时间精度 | 没有数量、容器层级、余额 |
| Reducer | 9/10 | 12 操作及 terminal state 不变量 | 没有 repair/replace 原子操作 |
| 模型权限 | 8/10 | 模型只能提议；高风险操作需 Item + 动作双证据 | 自然语言 evidence 仍需持续回归 |
| 候选决策 | 9/10 | 收录/忽略纯本地、幂等、无模型等待 | pending 上限仅是容量保护 |
| 空间/转场 | 9/10 | 按 holder 跟随；owner 不参与；destroyed 保留 holder | 依赖上层持久化不被旧状态覆盖 |
| UI | 8/10 | 统一卡片、详情、稳定引用、窄屏、无强制滚动 | 缺少历史事件视图 |
| 迁移/Canon | 8/10 | V1 幂等迁移、稳定 Canon seed、presentation 保留 | 长存档与多版本压力测试不足 |
| 可观测性/测试 | 9/10 | transaction、diagnostics、真实档案、312 项全量 | transition diagnostics 仍可继续统一 |
| 持久化并发 | 5/10 | 原子迁移脚本有 SHA 门禁 | 在线保存无 revision/CAS，旧页面可覆盖新状态 |

### Item 的正确产品定位

当前系统已经适合：

- 标志物、承诺、线索、礼物、借物、赃物与纪念品；
- 物品损坏、丢失、销毁及后续剧情引用；
- NPC owner 与当前 holder 分离；
- 转场、移动和人物 presentation 的连续性。

当前系统不等于：

- 精确数量库存；
- 钱币余额和财务账本；
- 容器嵌套与负重；
- 制造、修理、耐久度和材料系统；
- 商店库存模拟。

这些能力应作为独立模块接入 Item ID 和标准 operation，不应继续膨胀 Item V2 核心。

## Item 维护模式清单

### P0：跨系统保存门禁

新增单调递增 `stateRevision` 或 `timelineEpoch + revision`：

- 每次权威提交递增；
- 保存前比较当前宿主 metadata revision；
- 旧页面 revision 落后时拒绝覆盖并要求 reload；
- rollback 产生新 revision，不允许复用旧 revision；
- diagnostics 记录 expected/actual revision。

这是 Calendar 快进、NPC 自动运行和任何后台任务的共同前置条件。

### P1：按需求补，不阻塞下一阶段

- `repair/replace` 原子操作；
- Item event history 或从 message transaction 建立只读投影；
- medium/high 授权 hidden proposal 入口；
- 钱袋接独立 currency ledger；
- 多月长存档、频繁转场与 rollback 压力测试。

## NPC Identity 准入评估

### 已成熟的底座

- 稳定 actor ID、Canon redirect、本地化名称和 aliases；
- actorLibrary / runtime actors / active / local / witness 分层；
- Canon catalog、相对年龄、setting tags 与选角预算；
- 临时人物创建、复用、揭名和晋升；
- 稳定外貌与 current presentation 分离；
- 私有知识胶囊、共同记忆、第一印象和方向性关系；
- life status、room、activity 与 presence 权威。

### 当前缺口

actorLibrary 是一组长期演化字段，还没有版本化的 Identity Schema。以下概念仍混在自由字段或 Canon 原始目录中：

- species、gender、ancestry；
- school year、house、occupation、institutional role；
- affiliations 及其有效时间；
- Canon/user-confirmed/revealed/claimed 的来源与可见性；
- 角色稳定身份与当日 goal/mood/currentActivity 的边界。

`roleEn` 目前同时承担显示职业、场景角色和身份概括，不足以支撑课程表、社团、寝室、教师职责或长期 NPC 自主行为。`dailyDirector` 又把当日 goal 写回 runtime `currentIntentEn`，容易让临时意图伪装成身份事实。

### NPC Identity V1 建议

新增版本化 `actorLibrary[].identity`：

```text
identity.version
identity.kind = canon | original | temporary
identity.species / gender / ancestry
identity.birth = exact date | exact year | unknown
identity.education = school / house / year
identity.roles[] = type / organizationId / validFrom / validTo
identity.affiliations[] = organizationId / visibility / source
identity.provenance = source tier + source IDs
```

边界：

- family/friend/rival 不复制进 identity，继续由 Social Graph 保存；
- current goal、mood、activity 不进入 identity；
- player 未知的身份 facet 不进入公开 projection；
- `roleEn` 降为 identity 的显示投影，不再是唯一权威；
- 先迁移现有 21 个 profile，再扩充 Canon/original NPC。

NPC Identity V1 可以立即开始，并应先于完整 Calendar，因为 Calendar 需要稳定 participant、house、year、occupation 与 organization ID。

## Calendar 准入评估

### 已有时间发动机

- 严格世界时钟格式与确定性分钟推进；
- 普通回合 time policy；
- 相对/绝对时间叙事校验；
- daylight、curfew、sleep pressure、weather 与房间 exposure；
- 任意跨度 scene transition；
- 跨日 daily director；
- 7 日以上 world change/gossip；
- nextSceneIntent 与转场目标锁定。

### 尚不存在的 Calendar 权威

- `agenda` 只在 opening 写入一次，是陈旧显示文本；
- 没有稳定 event ID；
- 没有 start/end、recurrence、participants、location、visibility、priority；
- 没有 scheduled/completed/missed/cancelled 状态；
- 没有冲突检测、迟到、改期和截止时间；
- 没有日期选择、日/周视图或目标日期跳转；
- daily director 只按日期缓存，不能覆盖同日后来入场的 NPC；
- nextSceneIntent 只有一个下一幕，不是事件队列；
- 没有蒙太奇模拟、临时分支、重车或重大事件中断协议。

因此 Calendar 产品成熟度约 **3/10**，但其底层时间引擎约 **8/10**。正确做法是新建 Calendar domain，不是继续复用 `agenda` 或让 Daily Director 生成自由文本日程。

## Calendar V1 纵向切片

### Schema

```text
calendar.version
calendar.events[]
  id / kind / startClock / endClock
  recurrence
  participantIds / location
  visibility / source / priority
  status
  interruptPolicy
calendar.cursor
```

### Reducer

- 创建、更新、取消、完成、错过；
- 展开当前日/周 recurrence；
- 冲突和迟到确定性结算；
- 只允许现有 actor ID、map ID、room ID；
- Calendar 事件不能直接改 Item/NPC/Social 状态，只能提交给各自 Reducer 的标准 operation。

### 投影与 UI

- `agenda` 改为 Calendar 的派生今日视图；
- 用户只选择日期、事件和“前往/跳到”，不暴露 recurrence、优先级、阈值等技术参数；
- 时间跳转前展示会自动唤醒玩家的重大事件类型；
- 当前 scene、clock 与 Calendar cursor 保持单一权威。

### 第一条完整验收路径

```text
霍格沃茨 1991-09-02 课程/用餐事件包
-> Calendar 今日视图
-> 玩家选择下一堂课或目标日期
-> 确定性时间推进与地点路由
-> NPC participant 按 Identity/availability 入场
-> 普通场景表演
-> event completed/missed
-> daily agenda 立即更新
```

## 推荐开发顺序

1. **Save Revision Guard**：先堵住旧页面覆盖权威状态。
2. **NPC Identity V1**：迁移现有人物，建立角色、学院、年级、组织和 provenance。
3. **Calendar V1 Schema + Reducer**：用事件 ID 替换陈旧 opening agenda。
4. **Hogwarts School Day Vertical Slice**：课程、用餐、宵禁、参与者、地点与完成状态。
5. **Daily Director 重构**：Calendar 决定“何时何地”，Director 只决定角色当日软意图和表演指导。
6. **Item/Social 接入**：借物归还、修理承诺、约会、处分等通过标准 reducer operation 结算。
7. **Montage/周结算/运势**：建立 checkpoint、预演分支、重大事件中断和玩家重车后再开放。

## 最终准入判断

- **Item V2：通过。** 冻结核心能力，转维护和按需扩展。
- **NPC Identity：通过。** 可以立即启动 Schema-first 开发。
- **Calendar：有条件通过。** 时间引擎可复用，但必须新建事件权威；在快进或后台模拟前先完成 Save Revision Guard。
