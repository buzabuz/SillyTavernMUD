# Spell Observation 与学习契约

## 目标

咒语和 technique 与人物一样使用稳定 ID。玩家主动观察当前场景中可解析的 spell 时，规则层必须给出一次本地 D20 结果；模型不能自行决定是否投骰，也不能因失败泄露目标身份。

## Catalog 权威

- 每个可操作 spell/technique 必须有稳定 ID、非空 incantation、名称、效果、课程年级和难度。
- Canon 没有提供口头咒文时，允许以 `sourceTier=game_extension_canon_gap` 补齐可玩的 incantation，但不得伪称官方 Canon。
- `match_to_needle_transfiguration` 使用游戏补全咒文 `Acufors`；其 technique 与课堂练习来自官方资料。

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
