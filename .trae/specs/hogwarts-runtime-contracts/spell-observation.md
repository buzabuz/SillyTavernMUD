# Spell Observation 与学习契约

## 目标

咒语和 technique 与人物一样使用稳定 ID。玩家主动观察当前场景中可解析的 spell 时，规则层必须给出一次本地 D20 结果；模型不能自行决定是否投骰，也不能因失败泄露目标身份。

## Catalog 权威

- 每个可操作 spell/technique 必须有稳定 ID、非空 incantation、名称、效果、课程年级和难度。
- Canon 没有提供口头咒文时，允许以 `sourceTier=game_extension_canon_gap` 补齐可玩的 incantation，但不得伪称官方 Canon。
- `match_to_needle_transfiguration` 使用游戏补全咒文 `Acufors`；其 technique 与课堂练习来自官方资料。
- 当前 scene/next intent 可解析到 Catalog spell 时，`authoritativeSceneSpells` 必须在每个 Performer 回合提供稳定 ID、咒文、名称与效果。NPC 的念出、书写、教学、解释、示范和施放必须使用完全一致的 Catalog incantation。
- 若模型仍在单一权威 spell 场景中输出替代咒文，事务层在提交前确定性对齐为权威 incantation，并记录 warning；该替代词不得进入自定义咒语候选。

## 主动观测

```text
player actively reads / identifies / studies a spell
-> resolve spell from player text or current scene intent
-> resolveSpellObservation()
-> one local perception D20
-> checkResolution.spellObservation
-> performer embodies the exact outcome
-> spell settlement applies learning rule
```

可解析的主动 spell observation 优先于 local semantic 的错误 no-check 结论。普通听说“有个咒语”不触发判定。

## 获知边界

| D20 outcome | 玩家 UI | Spellbook |
| --- | --- | --- |
| `catastrophic_failure` / `failure` | 仅显示“未能辨认咒语” | 不新增 |
| `success_with_cost` | 显示 spell/incantation 与代价 | 新增 |
| `success` / `critical_success` | 显示 spell/incantation 与观测结果 | 新增 |

`checkResolution.spellObservation.spellId` 是内部结算权威。失败时 performer、检查卡和公开正文均不得泄露 name、incantation、effect 或 ID。

## 教学旁路

玩家观测失败后，现场 NPC 若明确念出、写出、解释或示范 catalog spell，仍可通过正文教学证据进入 spellbook。AI 正文中的稳定 `【咒语:spell_id】` marker 也按可见 spell reference 消费，但不计为玩家施法尝试。

观测学习不增加 `attempts`；只有玩家实际 cast 才更新尝试、成功、失败与施法熟练度统计。

## 自定义咒语候选

assistant 正文若出现明确教学句式，例如 `The incantation is Nebula Verto` 或 `咒语是 Nebula Verto`，规则层可提取稳定 `custom_*` 候选：

```text
explicit unknown incantation in committed segments
or player freeform marker such as ✦【咒语:Nebula Verto】
-> extractSpellCandidates()
-> transaction.spellCandidates
-> pendingSpellProposals
-> GUI 收录 | 忽略
```

- 模型不能直接把未知咒语写入 spellbook。
- 玩家明确写出的非 Catalog 自由咒语标记同样进入候选；它表达玩家自创/实验意图，不是已学习事实。
- 没有场景权威时，未知明确教学直接进入候选。
- 存在场景权威时，同一 technique 的替代词仍强制对齐权威咒文；只有正文明确声明为另一种新/原创咒语或给出独立效果，且没有指向权威 technique 时，才保留为 custom 候选。
- 权威纠错与独立 custom 候选可在同一事务中同时发生；不得因为 `authoritativeSceneSpells` 非空而整体关闭新咒语入口。
- 候选必须保留逐字教学或玩家声明 evidence、可用的教学人物、来源事件和消息 ID。
- 点击“收录”只执行 Reducer、metadata save、prompt refresh 和 rerender；不得调用模型或等待知识库。
- accepted 候选把内嵌 custom definition 与 learned entry 一起写入 spellbook，之后可从咒语快捷栏引用稳定 ID 并正常触发 D20。
- ignored 候选按稳定 spell ID 抑制重现。
- 自定义 definition 默认 `curriculumYear=0`、`learningMode=independent`、`sourceTier=player_confirmed_custom`、`risk=unknown`；未知效果只能标记为 observed narrative evidence，不得把单次结果伪造成稳定效果或 Canon 来源。

## 历史一致性修复

2026-08-09 message 200 将模型生成的 `Acus` 直接结构化修复为权威 `Acufors`，覆盖正文、译文、segments、transaction 与 diagnostics；同时把 Hermione 的明确教学写入 spellbook。原始 JSONL 已独立备份，修复不重提回合、不调用模型。
