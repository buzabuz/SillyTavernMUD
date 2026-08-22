# 当前正文翻译与 Post 并行

## Change ID and Status

- Change ID: `hogwarts-current-turn-post-translation-parallel`
- Artifact revision: `2`
- Status: `Revision 2 implementation complete; browser acceptance pending`
- Change kind: `fix`
- Feature delta: `0`
- Core change: `yes`
- Scope: `当前所选翻译与当前所选 post 在英文可见后独立启动`

Links: [Spec](spec.md) · [Tasks](tasks.md) ·
[Checklist](checklist.md) · [Progress](progress.md) ·
[Runtime fields](../hogwarts-runtime-contracts/state-fields.md)

## Problem and Evidence

Revision 1 把简单并行错误收窄成 `Low + zh-CN + Local` 专用能力，
导致 Local post、Google/Bing 和其他合法选择仍等待 post 结算。这是技术
约束反向定义产品范围，违背用户“先并行，不做复杂系统”的明确决策。

当前生产链证据：

```text
English saved + rendered
-> selected post starts
-> only Low + zh-CN + Local may start current translation early
-> every other selected translation waits for post settlement
```

固定 PM 初审与生产复核均为 `PASS`。

## Before

| 场景 | 玩家当前看到什么 | State |
| --- | --- | --- |
| 命中 Revision 1 tuple | 英文后，Low 与 Local 翻译可并行 | post 最后按既有规则写入 |
| 未命中 tuple | 当前翻译仍等 post 结算 | 既有 post 按规则写入 |
| post 失败 | 正文保留；翻译是否早启取决于 tuple | 无 post-derived proposal |
| 翻译失败 | 英文保留；post 正常结算 | 翻译不写世界 State |

## After

英文正文一保存并可见：

```text
selected post (`low` or `local`)
selected current-message translation (`local`, `google`, `bing`, or zero when `off`)
```

| 场景 | 玩家将看到什么 | State |
| --- | --- | --- |
| 两者成功 | 英文先可见；当前翻译与 post 独立启动，谁先完成谁先生效 | post 仍由既有 Reducer 原子写入 |
| post 失败 | 当前翻译继续；正文不消失 | 无 post-derived proposal；不 fallback |
| 翻译失败 | 英文继续可读；post 继续 | 仅 TranslationTable error；世界 State 不变 |
| 两个任务都使用本地模型 | 两个任务都已提交；原有 FIFO 自然串行 | 不新增第二个 resident model |

## In Scope

1. 英文当前回合正文保存并渲染后，当前消息成为唯一早期翻译 owner。
2. 当前选择 `local/google/bing` 时立即提交该消息翻译；`off` 为零调用。
3. 同时启动当前选择的 `low/local` post；post 选择不决定翻译资格。
4. P0 翻译完成即可重渲染中文，不等待 post/State settlement。
5. 翻译和 post 状态只描述各自真实工作。
6. 本地任务继续使用既有单模型 FIFO；不为资源竞争新增产品分支。

## Non-Goals

- 不提前 P1-P4 历史、Calendar、Dossier、Archive 翻译。
- 不新增抢占、取消、优先级系统或第二个本地 resident model。
- 不改变 post/translation Prompt、Schema、parser、guard 或 Reducer。
- 不改变 Appraisal、Social、Knowledge、Calendar 或保存语义。
- 不增加 retry、repair、provider fallback 或语义 Regex。

## Runtime Contract Impact

没有世界/消息/TranslationTable Schema 变化，没有新 State 字段或 writer。

仅改变现有瞬时字段的更新时间：

- `session.liveSceneStream.phase`
- `session.localizationVisiblePending`
- `jobRegistry.localizationActiveBatch`
- `session.localizationPriorityKeys`
- `session.localizationLastErrorCode`

`TranslationTableRecordV1` 仍由 translation table writer 写；
`postTurnSemanticProvider`、`turnTransaction`、`stateRevision` 语义不变。

## Migration and Compatibility

无 migration、无旧字段、无 dual read/write。

页面刷新后不需要修复历史数据。`translationProvider=off` 或当前消息无可译
候选时自然为零翻译调用。

## Prompt Field Budget

`None`。

本变更不增加、删除或修改任何 Prompt、System、User payload 或 output
Schema。当前选择的 post 与 translation 继续使用各自现有预算。

## Frontend Field Whitelist

| Field | Read/write | Purpose |
| --- | --- | --- |
| `session.liveSceneStream.phase` | existing UI-session write/read | 显示真实 post/settlement 阶段 |
| existing localization session fields | existing scheduler write/UI read | 显示 P0 翻译 pending/active/error |
| `LocalizedViewModelV1` | read only | 翻译完成后显示中文 |

不新增动态字段。实施前必须为上述 loading/progress 路径补齐 permanent
frontend dynamic-field registry row，并做实际浏览器验收。

## Operational Cost

| 项目 | Before | After |
| --- | --- | --- |
| selected post | 1 次 | 1 次 |
| 当前正文 translation | 0/1 次，部分选择在 post 后 | 0/1 次，与 selected post 独立启动 |
| routed Item/Identity | 0/1 既有调用 | 数量不变；本地任务沿用 FIFO |
| retry/fallback | 0 | 0 |
| provider 并发 | tuple 外无重叠 | 所有 selected provider 使用同一当前消息合同 |
| 本地 resident model | 最多 1 | 最多 1 |
| VRAM | 既有单模型 | 不增加第二模型常驻 |
| 玩家翻译等待 | 可能包含 post 时间 | 只由 selected translation 完成时间决定 |

## Acceptance Criteria

1. `low/local post × local/google/bing translation` 的当前消息矩阵均从同一
   英文可见边界独立启动；`off` 为零翻译调用。
2. translation 比 post 先完成时，中文先显示，不等待 `state_settled`。
3. 正常回合保持 exactly one selected post request、at most one translation
   batch；无第二次请求。
4. selected post 失败时翻译仍可成功，正文保留且无 post-derived State write。
5. translation 失败时 post 仍可成功，英文保留且世界 State 不受影响。
6. 本地 post/translation/Item/Identity 继续共享单模型 FIFO。
7. P1-P4 backlog 行为不变，当前消息没有条件 late enqueue。
8. loading/progress 文案与真实 active work 一致，不再把未开始的翻译显示为
   active。
9. focused tests、真实存档浏览器回合和 fresh independent acceptance 均通过。

## Risks and Rollback

- 风险：本地 post 与本地翻译独立提交后仍由 FIFO 串行；这是资源事实，
  不是产品资格分支。
- 风险：并行完成顺序不固定；两条分支不得共享可变 transaction writer。
- 回滚：移除 P0 turn-active dispatch 例外，恢复 post 后 idle enqueue；
  不需要迁移或数据回滚。

## Approval

固定 PM：

- Initial verdict: `PASS`
- Production-informed follow-up: `PASS`

用户已明确纠正 Revision 1 的 tuple 范围。Revision 1 审批失效。

用户已于 2026-08-20 明确要求按 corrected PRD 立即实施。

Artifact Revision 2: `approved`.

Implementation status: `authorized`.
