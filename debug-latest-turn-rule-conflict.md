# Debug Session: latest-turn-rule-conflict
- **Status**: [RESOLVED]
- **Issue**: 复盘 Hogwarts MUD 最近一次回合失败，确认是否由新增初见规则与存量校验、Schema、迁移或可见性规则冲突导致。
- **Debug Server**: stopped after user confirmation
- **Log File**: temporary NDJSON removed after evidence was summarized below

## Reproduction Steps
1. 读取当前 Tina 时间线中最近一条失败回合及 `turn.error`。
2. 在不修改业务逻辑的前提下重试同一玩家行动。
3. 采集模型输出结构、初见待补人物、可见性与校验错误。

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | 新增初见规则与修复请求上下文未同步 | High | Low | **Confirmed**：首轮 Schema 正常，但修复上下文缺少 actorProfiles/currentInventory；日志 5–6 中模型重写了已有初见并更新未入栏物品 |
| B | 旧档迁移误把已互动 Hermione 标记为 firstImpressionPending | High | Low | **Rejected**：日志 1、9 均显示 Hermione pending=false 且已有初见；pending 的麦格不在本轮 |
| C | 初见/当前印象规则与冷却互斥 | Medium | Low | **Confirmed secondary**：原失败日志 9 显示 Hermione 当前印象第 37 回合刚更新，修复轮再次更新而触发冷却 |
| D | 回合前后房间状态不一致导致可见性互斥 | Medium | Medium | **Rejected**：日志 1 显示 Hermione canSeePlayer=true、canHearPlayer=true，房间关系一致 |
| E | 存量程序推进和物品栏规则与本轮结果冲突 | Medium | Low | **Confirmed primary/secondary**：日志 3、9 显示失败检定仍被要求完成程序推进；日志 6 显示修复轮新增两个未入栏物品变更 |

## Log Evidence
Instrumentation installed in `index.js`:
- Pre-request actor/visibility snapshot.
- Initial and repair model-output shape.
- Scene validation errors and returned actor fields.
- Per-attempt rejection and final structured-turn failure.

Key evidence:
- Line 9: original stored failure combines `checkOutcome=failure` with “程序性推进没有完成” and impression cooldown.
- Line 1: Hermione already has a first impression and is not pending; visibility is valid.
- Lines 2–4: first model output is structurally valid except forced progression.
- Lines 5–7: repair output invents a replacement first impression and two untracked item mutations, amplifying one error into four.
- Line 8: final turn remains failed at turn 37, clock 1991-09-01 11:53.

## Verification Conclusion
Primary root cause: `EXPLICIT_PROGRESSION_PATTERN` matches the player's “开始翻找”, while the authoritative local perception check resolves to failure. The validator still requires `completedRequestedStep=true`, creating an impossible contract.

Repair amplification: the repair prompt references conditional impression and inventory rules but its request body omits `actorProfiles` and `currentInventory`, so the model cannot know those constraints.

Implemented fix:
- Failed local checks now take precedence over forced procedural completion in both the momentum directive and validator.
- Repair requests now receive the original `actorProfiles`, `currentInventory`, `playerVisibleProfile`, and `momentumDirective`.
- Repair instructions explicitly preserve failed checks, impression locks/cooldowns, and inventory ownership.

Post-fix evidence in the current log:
- Line 2: the initial model output omits first-impression replacement fields.
- Line 3: attempt 0 validates with `valid=true` and no errors; no repair request occurs.
- Line 4: the same saved turn commits as turn 38 with `status=idle`, clears `turn.error`, preserves Hermione's turn-37 impression, and leaves inventory unchanged.

Automated verification: 98/98 Node tests pass; ESLint and `git diff --check` pass.
