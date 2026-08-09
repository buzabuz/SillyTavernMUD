# Item System V2 Progress

## Status

Implemented and verified.

## Baseline Audit

- V1 Item uses `ownerId + custody` and cannot represent owner/holder separation.
- V1 actions cover only acquire/update/carry/equip/store/consume/lose.
- New important acquisitions may currently be auto-created by model/local observer output.
- `actorPresentations` stores free-text outfit/accessory/held object without Item IDs.
- Current Tina archive contains five formal items and legacy presentation pollution.
- Item inspector uses the generic inspector list and hides state, custody, owner, location and provenance.
- No post-turn candidate UI exists.

## Canon Research

- Harry Potter official wand profile: holly, phoenix feather, 12½ inches, unbending.
- Harry's round spectacles are explicitly described by the official editorial site as an iconic prop.
- Official wand-loyalty feature identifies Ron's first wand as Charlie's hand-me-down, ash with unicorn core.
- Hermione's official wand profile: vine, dragon heartstring, 12½ inches, pliant.
- Exact acquisition clocks are not available for all entries; V2 will store day/before-date precision instead of inventing times.

## Verification

### Automated

- Added `tests/hogwarts-mud-item-system-v2.test.mjs` with 17 focused cases.
- Covered all twelve operations, owner/holder separation, loan/theft, terminal states, candidate evidence, accept/ignore, stable ignored keys, V1 five-item migration, Canon seed, hidden visibility, presentation IDs and holder-location following.
- Full Hogwarts Node suite: `293/293` passed with `--experimental-vm-modules`.
- Target ESLint passed.
- `node --check` passed for every changed JS/MJS module.
- `git diff --check` passed.
- Composition limits passed: `index.js` 598 lines; local semantic adjudicator 1987 lines.

### Real Browser

Loaded the current Tina archive at `http://127.0.0.1:8000/` without submitting a player turn.

- V1 five-item archive migrated to five preserved formal records plus four eligible Canon seeds.
- Item ledger rendered nine visible cards with current/history grouping and zero horizontal overflow at a 728px browser viewport.
- Ron's card rendered one shared Item card with Charlie as owner, Ron as holder and `loan` transfer state.
- Harry's spectacles rendered `穿戴中`.
- Canon source links rendered as keyboard-focusable anchors.
- Narrow-screen inspector drawer opened from the character button and from a scene actor.
- Network log contained static resources, metadata/knowledge sync and tokenizer dry-run requests; no model-generation request was made.
- A repaired real borrowed-quill candidate was accepted without model work. The compact card switched to a green `已收录` state and retained only “详情”.
- Closed native details menus now have zero layout size; an opened More menu exposed eight buttons whose center hit targets all resolved to the intended button.
- Candidate accept/ignore, no-op rerender, 420px CSS, focus, reduced-motion and pending/decision UI projection are locked by Task 5/6 contracts.

### Composer Item Protocol

- “插入表达” renders all twelve operation choices.
- Choosing `携带` inserted `【物品操作:carry｜携带】` and opened the Item ledger.
- Choosing the acceptance-letter card inserted `【物品:acceptance_letter｜霍格沃茨录取通知书】`.
- The completed two-line draft parsed to one `carry + acceptance_letter` intent; it was cleared without submitting a turn.
- Item references are generated only from player-visible formal cards. Hidden and unknown IDs fail parser validation.
- Low performer and local observer prompts treat the directive as intent/object authority, never as outcome proof.
- Browser interaction produced no model-generation network request and no new console error.

## Implemented Boundaries

- New model objects become pending proposals, never formal `items`.
- Ordinary identity supplies and free-text held objects remain implicit until a concrete gift/loan/return/theft or deliberate retention makes the object persistent.
- High-risk Item state changes require exact source, Item and operation grounding before the reducer.
- Material observation no longer writes new legacy `accessories/heldItems/heldObject`.
- Item movement follows `holderId`, not `ownerId`, across movement, transition, interior-map, spatial repair and rollback.
- Hidden formal Item IDs are filtered before ledger, actor-card and presentation resolution.
- Opening World Director is instructed to emit an empty item list; Canon seeds are deterministic.
