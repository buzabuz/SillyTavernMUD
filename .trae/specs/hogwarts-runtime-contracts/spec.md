# Hogwarts MUD 真实运行 PRD

## 文档性质

本目录是 Hogwarts MUD 的 living runtime contract。它记录已经落到代码、存档和测试中的真实行为，不替代产品愿景，也不根据字段名猜测语义。

权威优先级固定为：

1. Reducer、validator、migration 与 projection 的生产代码。
2. 可重放的自动化测试。
3. 真实存档、持久化 diagnostics 与运行日志。
4. 本目录文档。

代码行为变化时，提交必须同步更新对应字段注册表和事务文档。文档与前三层冲突时，以前三层为准，并立即修正文档。

专题事务：

- `presence-scene-transition.md`：active/local/witness 与转场投影。
- `item-lifecycle.md`：Item proposal、Reducer、迁移、呈现与 UI 可见性。
- `actor-memory.md`：人物记忆证据、转场稀疏更新、质量门禁与旧档清理。
- `spell-observation.md`：咒语观测 D20、获知边界、教学旁路与 Catalog 权威。
- `ordinary-turn-repair.md`：首次 Performer 输出、流式预览、一次结构修复与失败恢复。

## 持久化边界

| 存储面 | 路径 | 内容 | 禁止事项 |
| --- | --- | --- | --- |
| 世界权威 | JSONL 首行 `chat_metadata.hogwartsMud` | 当前世界、场景、人物、地图、物品、关系、导演状态 | UI session 不得写入 |
| 消息事实 | 每条消息 `extra.hogwartsMud` | role、sceneId、segments、transaction、diagnostics、翻译缓存 | 不得反向覆盖世界权威 |
| UI session | `ui/session-state.js` | 面板、筛选、选中人物、分页 | 不得保存剧情事实 |
| 本地知识 | `knowledge.js` 与宿主知识库 | 从已提交事实生成的检索投影 | 不得成为 Reducer 输入权威 |

## 模块运行索引

| 模块 | 生产入口 | 权威输入 | 权威输出 | 模型权限 | 主要测试 |
| --- | --- | --- | --- | --- | --- |
| 组合根 | `index.js`、`workflows/application.js` | 宿主 API、domain/runtime ports | workflow/UI 实例 | 无业务裁决权 | `hogwarts-mud-task1-baseline`、`task6-ui` |
| Campaign / Character / Initial World | `domain/campaign.js`、`character.js`、`initial-world.js` | 用户建档选择 | 初始 `hogwartsMud` 世界状态 | 开局模型只提议 package | `hogwarts-mud.test.mjs` |
| Context / JSON | `core/context-budget.js`、`json-recovery.js` | role slot、结构化消息 | 受保护 prompt、恢复后的 JSON | 不写世界状态 | `hogwarts-mud-task2-modules` |
| Model Adapter | `adapters/model.js` | role slot、prompt | 原始模型响应、request diagnostics | 只返回文本/JSON | `hogwarts-mud-task5-workflows` |
| Opening | `workflows/opening.js` | 初始草稿、导演基础 | opening package、首幕消息 | 模型提议，Reducer 提交 | `hogwarts-mud-task5-workflows`、主测试 |
| Ordinary Turn | `workflows/turn.js`、`turn-performance.js`、`domain/turn-*` | 玩家消息、当前世界 | turn transaction、消息、世界新状态 | 低档写正文和稀疏 proposal | 主测试、`task5-workflows` |
| Local Semantic | `adapters/local-semantic.js` | 玩家动作、英文 segments、当前状态 | adjudication、observation、perception proposal | 本地模型只提议受限 Schema | 主测试、presence contract |
| Presence / Witness | `presence-witness-contract.js`、`domain/presence-witness-schema.js`、`transition-presence.js` | movement、actor position、scene/cohort roster、perception | active/local/witness/event knowledge | 模型不可写最终名单 | `hogwarts-mud-presence-witness`、主测试 |
| Scene Transition / Archive | `workflows/scene-transition.js`、`domain/scene-transition.js`、`archive-projection.js` | 当前 scene、next intent、actor states | 新 scene、archive、active/local、opening message | 中/高档只提议 transition package | 主测试 |
| Spatial / Map / Movement | `domain/maps.js`、`movement.js`、`spatial-*`、`pathfinding.js` | 当前地图、结构化移动 | player/actor 位置、地图差异 | 模型不可绕过可达性 | 主测试、Task 4 |
| Item V2 / Material / Appearance / Spell | `domain/item-schema.js`、`item-reducer.js`、`item-migration.js`、`item-canon.js`、`inventory.js`、`material-state.js`、`appearance.js`、`spell-state.js` | 已观察事件、物品/施法 proposal、玩家候选决策 | formal items、pending candidates、material log、presentations、spellbook | 模型只能提议；新 Item 需玩家收录 | `hogwarts-mud-item-system-v2`、主测试 |
| Actor / Cast / Memory | `domain/actor-*`、`cast.js` | actor library、合法事件知识 | runtime actor、胶囊、记忆、选角 | 模型不能创造无来源记忆 | 主测试、Task 3 |
| Social Graph | `domain/social-*`、`workflows/social-memory.js`、服务端 social graph | event witness、合法 evidence | directional relationship state | Social Director 只提议 | social contract、Task 3 |
| Time / Directors / World Change | `domain/time-environment.js`、`pacing-*`、`causal-*`、`world-changes.js`、`workflows/directors.js` | clock、scene、signals | daily/pacing/memory/world director 状态 | 按 tier 提议，Reducer 校验 | 主测试 |
| Knowledge / Translation | `adapters/knowledge.js`、`knowledge.js`、`adapters/translation.js`、`domain/translation.js` | 已提交英文事实 | 检索投影、显示译文 | 不写世界事实 | 主测试 |
| Save / Lifecycle / Diagnostics | `runtime/state-ports.js`、`save-library.js`、`lifecycle.js`、`turn-diagnostics.js` | JSONL、宿主 context | 迁移后状态、bounded diagnostics | 禁止付费模型迁移 | Task 5、readonly E2E |
| UI Projection | `people-projection.js`、`relationship-graph.js`、`ui/*` | 世界权威与 UI session | DOM/view model | 只读世界事实 | people panel、Task 6 |

## 三条核心事务

### 普通回合

```text
player message
-> local adjudication
-> low-tier scene performance
-> reject replayed player speech and non-NPC dialogue actor IDs
-> turn settlement graph
-> local observation
-> partition existing Item operations / new Item candidates
-> validate evidence and Item authority
-> presence reducer
-> witness resolver
-> event knowledge reducer
-> optional social/memory work
-> metadata + chat atomic persistence
```

### 场景转场

```text
committed nextSceneIntent
-> transition director package
-> low-tier opening segments
-> validate/normalize
-> archive old scene
-> apply actor states
-> project active cast
-> project destination local presence + carried cohort
-> synchronize formal Item locations from holder positions
-> commit new scene/map/items
-> persist metadata + opening message
```

### 旧档加载

```text
read chat_metadata.hogwartsMud
-> deterministic migrations
-> migrate Item V1/current presentation and seed eligible Canon items
-> repair spatial state
-> repair active/local projections
-> save only when changed
-> render projections
```

旧档加载不得调用用户的低、中、高档模型。任何必须依赖模型才能解释的旧字段只能保留原值或标记待处理。

## 变更规则

新增或修改运行时字段时必须同时完成：

1. 在 `state-fields.md` 登记字段路径、唯一写入者和读取者。
2. 在对应 domain module 中实现 normalize/validate/reducer。
3. 在 workflow 中只做事务编排，不复制规则。
4. 为旧档提供确定性迁移或明确版本门槛。
5. 为消息或世界状态补可读取 diagnostics。
6. 添加至少一个正常路径和一个边界回归测试。
7. 更新 `progress.md` 的证据等级。
