# Hogwarts MUD Item System V2 PRD

## Why

旧物品系统把 `items` 当作玩家背包，用 `ownerId + custody` 同时表达所有权、持有、位置与穿戴；NPC 物品、赠送、借出、偷走、损坏、清洗和销毁无法准确表示。人物 `actorPresentations` 又用自由文本保存服装与手持物，和正式物品互不关联。前端物品页只显示标题与说明，人物卡和消息流分别使用其他展示结构。

本需求建立一个由 Reducer 管理的正式物品事实层，并把普通生活用品、整体造型、正式显式物品和待收录候选分开。

## Goals

- 正式 Item 只保存会影响所有权、社会关系、线索、承诺或后续剧情的物品。
- 支持获得、携带、放置、穿戴、脱下、赠送、借出、消耗、损坏、清洗、丢失和销毁。
- 所有权与当前持有人分离；借出和偷走不自动改变主人。
- 普通校服、课本、羽毛笔、办公用品、店铺商品和生活用品保持隐含，不创建 Item。
- 模型只能提交 proposal；新物品必须由玩家收录后才进入正式物品库。
- 人物当前造型保留整体文本，同时以 Item ID 关联正式穿戴物与手持物。
- NPC 隐藏物品可存在于事实层，但玩家 UI 不得全知显示。
- 统一物品库、人物卡和回合后候选提示的视觉语言。

## Non-Goals

- 不追踪普通服装件数、课本页数、羽毛笔数量或日常消耗库存。
- 不实现商店完整商品目录和经济系统。
- 不让低、中、高档导演直接写正式 Item。
- 本阶段只预留 medium/high director proposal 来源，不接入实际创建调用。
- 不从旧正文批量猜测所有人物的私人物品。

## Item V2 Schema

```json
{
  "version": 2,
  "id": "canon_harry_holly_wand",
  "type": "wand",
  "labelEn": "Harry Potter's Holly Wand",
  "label": "哈利·波特的冬青木魔杖",
  "ownerId": "canon_harry_james_potter",
  "holderId": "canon_harry_james_potter",
  "location": {
    "mapId": "hogwarts_castle",
    "roomId": "transfiguration_classroom",
    "placement": "with_holder"
  },
  "appearanceEn": "A 12½-inch holly wand with a phoenix feather core.",
  "appearance": "一根十二又二分之一英寸、凤凰羽毛杖芯的冬青木魔杖。",
  "state": "intact",
  "sourceEventId": "canon_before_hogwarts_1991",
  "isEquipped": false,
  "notesEn": "The wand chose Harry at Ollivanders.",
  "notes": "这根魔杖在奥利凡德选择了哈利。",
  "storyRoles": ["signature"],
  "visibility": "owner_known",
  "acquiredAt": {
    "value": "1991-07-31",
    "precision": "day"
  },
  "transferMode": "none",
  "updatedClock": "1991-09-02 · 11:30"
}
```

### Required fields

| Field | Meaning |
| --- | --- |
| `id` | Stable item ID |
| `type` | Physical category |
| `ownerId` | Legal/social owner |
| `holderId` | Current person holding or carrying it; empty when placed/lost/destroyed |
| `location` | Current map, room and placement |
| `appearanceEn/appearance` | Objective visible appearance |
| `state` | Current physical/existence state |
| `sourceEventId` | Event or canon seed that first established the item |
| `isEquipped` | Whether it is currently worn |
| `notesEn/notes` | Bounded factual notes |

### Additional authority fields

- `storyRoles`: `signature | social | clue | promise | keepsake`.
- `visibility`: `public | owner_known | hidden`.
- `acquiredAt`: value plus `exact | day | before_date | unknown` precision.
- `transferMode`: `none | gift | loan | theft | return`.
- `labelEn/label`: display names, not identity authority.

### Item types

`wand | eyewear | clothing | accessory | document | container | money | key | book | tool | consumable | keepsake | clue | other`

### Item states

`intact | damaged | dirty | consumed | lost | destroyed`

## Operations

| Operation | Required effect |
| --- | --- |
| `acquire` | Establish holder/location; ownership follows explicit evidence only |
| `carry` | Set holder; move location with holder |
| `place` | Clear holder/equipped and set room placement |
| `equip` | Set holder and `isEquipped=true`; add to presentation worn IDs |
| `unequip` | Set `isEquipped=false`; remove from worn IDs, retain holder |
| `give` | Set new holder and owner only for a completed gift |
| `lend` | Set new holder, preserve owner, mark loan |
| `consume` | Clear holder/equipped; set consumed |
| `damage` | Preserve ownership/location; set damaged |
| `clean` | Dirty becomes intact; other states do not revive |
| `lose` | Clear holder/equipped; set lost and retain last known location |
| `destroy` | Clear holder/equipped; set destroyed; cannot be revived by later carry |

Theft is represented by an acquire/transfer proposal with `transferMode=theft`: holder changes, owner does not.

## Current Presentation

`actorPresentations[actorId]` remains the compatibility storage location but becomes the current-presentation authority:

```json
{
  "outfit": "Standard Hogwarts robes worn over a bright dress.",
  "wornItemIds": ["lavender_pink_ribbon"],
  "heldItemIds": ["lavender_wand"],
  "updatedClock": "1991-09-02 · 11:30"
}
```

- `outfit` is a single overall look for ordinary clothing.
- `wornItemIds` and `heldItemIds` may reference only non-destroyed formal Items held by that actor.
- Legacy `accessories`, `heldItems` and `heldObject` remain read-only migration inputs.
- A free-text implicit object may be displayed as part of the outfit/scene but never becomes an Item ID automatically.

## Implicit Items

Identity grants narrative permission without creating objects:

- Student: ordinary uniform, quill, textbooks and normal school supplies.
- Professor: ordinary robes, office and teaching supplies.
- Shopkeeper: ordinary shop stock and work tools.
- Everyone: routine clothing, food, household and hygiene objects.

Implicit items:

- may appear naturally in prose;
- have no ID, ownership history, quantity or item card;
- cannot be transferred into formal state until a proposal is accepted;
- are forgotten when no longer narratively relevant.

## Explicit Items

Formal items include:

- wands, iconic eyewear and other signature objects;
- items explicitly marked by the player;
- gifts, loans, stolen property, promises, clues and keepsakes;
- objects whose damage, cleaning, loss or destruction affects later scenes.

Canon seeds are added only when an authoritative source exists and the owning actor is part of the runtime actor library. Unknown acquisition times use `before_date` or `unknown`; no invented exact clock is allowed.

Initial researched catalog:

- Harry Potter: holly/phoenix wand; round spectacles.
- Ron Weasley: first wand inherited from Charlie, ash/unicorn.
- Hermione Granger: vine/dragon heartstring wand.

## Proposal Workflow

```text
model item_update proposal
-> normalize and validate evidence
-> existing tracked item operation?
   -> yes: Reducer applies operation
   -> no: create pendingItemProposal
-> persist candidate on world state and assistant message
-> quiet post-turn card: 收录 / 忽略
-> 收录: Reducer creates Item and records source event
-> 忽略: persist bounded fingerprint; prose remains unchanged
```

`pendingItemProposals` is world authority for unresolved candidates. `ignoredItemProposalKeys` prevents the same candidate from immediately resurfacing.

Reserved proposal sources:

`low | medium | high | local_observer | user | canon_migration`

Only `low`, `local_observer`, `user` and deterministic migration are wired in this phase. Medium/high are schema-compatible but have no caller.

## Visibility

- Player item library shows all player-known, non-hidden Items including lost/destroyed history.
- NPC card shows only Items whose owner/holder matches the actor and whose visibility is `public` or `owner_known` after the actor is known.
- `hidden` Items are available to authorized director context only and never appear in player UI.
- Presentation ID resolution also respects visibility.

## UI Direction

Visual tone: a restrained Hogwarts evidence ledger, not a game inventory grid.

- One shared item card component for item library and actor cards.
- Strong label, type seal, owner/holder line, state/custody chips and short appearance.
- Story roles use quiet marginalia marks rather than bright rarity colours.
- Candidate appears below the completed assistant turn as a slim parchment docket.
- “收录” is primary but calm; “忽略” is text-like and does not block the composer.
- Empty states explain implicit items rather than claiming the character owns nothing.
- Desktop and 390px layouts, keyboard focus and reduced-motion are required.

## Composer Operation Protocol

The composer separates the operation from the authoritative object reference:

```text
【物品操作:carry｜携带】
【物品:pink_ribbon｜粉色丝带】
```

- “插入表达” lists all twelve Item operations and inserts the first directive.
- Selecting an operation opens the Item ledger; the player inserts the second directive from a visible formal Item card.
- Item references always contain the stable Item ID plus a player-readable label. The label is display-only; the ID is authority.
- A directive records player intent, not a completed state change. The performer narrates the attempted action and the observer/Reducer commits only the completed result.
- `give` and `lend` still require the natural action to identify the recipient. The Item reference does not infer a target person.
- New untracked objects cannot be referenced from the ledger. The player describes acquiring them naturally; they still follow the proposal/accept workflow.
- Hidden Items never expose a reference action.
- Malformed, orphaned or unknown-ID directives do not mutate state. They remain visible in the original player message for diagnostics.

## Migration

V1 `items` migrate deterministically:

- `kind -> type`
- `ownerId` retained
- carried/equipped player items get `holderId=player`
- stored items keep room location and no holder
- consumed/lost map to V2 state
- `detail -> appearance`
- `source -> sourceEventId` with migration prefix when not already an event ID
- equipped custody sets `isEquipped=true`
- missing notes become empty

Legacy presentations migrate:

- `outfit` retained;
- legacy free-text held/accessory data remains display fallback only;
- matching tracked item labels may become IDs only under deterministic exact/alias match;
- invalid references are dropped.

## Acceptance

- All twelve operations are validated and reduced idempotently.
- New model-proposed objects never enter `items` before player acceptance.
- Ignored candidates remain prose-only.
- Borrowed and stolen objects preserve owner while changing holder.
- Ordinary clothing remains one outfit string.
- Canon signature Items have source links and non-invented acquisition precision.
- NPC hidden Items never render in player UI.
- Existing Tina items migrate without loss of owner/location/history.
- Item library, actor presentation and candidate card share one visual system.
- The composer exposes all twelve operations and Item cards insert stable-ID references.
- Structured Item directives express intent only and never bypass proposal validation or the Reducer.
