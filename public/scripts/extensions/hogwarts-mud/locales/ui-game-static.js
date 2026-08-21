const GAME_TEXT = Object.freeze({
    'ui.map.room_generic': {
        en: 'Room',
        zh: '房间',
    },
    'ui.game.launcher.open': {
        en: 'Open Hogwarts MUD',
        zh: '打开 Hogwarts MUD',
    },
    'ui.game.saved': {
        en: 'Saved',
        zh: '已保存',
    },
    'ui.game.scene.collapse_aria': {
        en: 'Collapse Scene panel',
        zh: '收起场景栏',
    },
    'ui.game.map.title': {
        en: 'World Map',
        zh: '世界地图',
    },
    'ui.game.expand': {
        en: 'Expand',
        zh: '展开',
    },
    'ui.game.people.interactive': {
        en: 'Current interactive characters',
        zh: '当前互动人物',
    },
    'ui.game.people.location': {
        en: 'Characters at current location',
        zh: '当前地点人物',
    },
    'ui.game.live_log': {
        en: 'Live record',
        zh: '现场记录',
    },
    'ui.game.now': {
        en: 'Now',
        zh: '现在',
    },
    'ui.game.current_scene': {
        en: 'Current Scene',
        zh: '当前场景',
    },
    'ui.game.time_pending': {
        en: 'Time pending',
        zh: '时间待定',
    },
    'ui.game.scene_archive': {
        en: 'Scene archive',
        zh: '场景档案',
    },
    'ui.game.archived_readonly': {
        en: 'Archived · Read-only',
        zh: '已封存 · 只读',
    },
    'ui.game.input_aria': {
        en: 'Write your action, dialogue, or thought',
        zh: '写下你的行动、台词或想法',
    },
    'ui.game.input_placeholder': {
        en: 'Write your action, dialogue, or thought...',
        zh: '写下你的行动、台词或想法……',
    },
    'ui.game.address.clear_aria': {
        en: 'Clear addressee',
        zh: '清除受话对象',
    },
    'ui.game.clear': {
        en: 'Clear',
        zh: '清除',
    },
    'ui.game.movement.confirm': {
        en: 'Set as movement',
        zh: '设为移动',
    },
    'ui.game.movement.dismiss': {
        en: 'Mention only',
        zh: '仅提及',
    },
    'ui.game.spell.clear_aria': {
        en: 'Clear structured spell',
        zh: '清除结构化咒语',
    },
    'ui.game.expression.insert': {
        en: 'Insert expression',
        zh: '插入表达',
    },
    'ui.game.expression.speech': {
        en: 'Dialogue',
        zh: '台词',
    },
    'ui.game.expression.action': {
        en: 'Action',
        zh: '动作',
    },
    'ui.game.expression.thought': {
        en: 'Thought',
        zh: '内心',
    },
    'ui.game.item.protocol_aria': {
        en: 'Item operation protocol',
        zh: '物品操作协议',
    },
    'ui.game.item.operations': {
        en: 'Item operations',
        zh: '物品操作',
    },
    'ui.game.item.help': {
        en: 'Choose an operation, then reference a formal Item from the archive. Describe new Items in natural language.',
        zh: '选择操作后，到物品档案引用正式物品；新物品仍用自然语言描述。',
    },
    'ui.game.item.operation.acquire': {
        en: 'Acquire',
        zh: '获得',
    },
    'ui.game.item.operation.carry': {
        en: 'Carry',
        zh: '携带',
    },
    'ui.game.item.operation.place': {
        en: 'Place',
        zh: '放置',
    },
    'ui.game.item.operation.equip': {
        en: 'Equip',
        zh: '穿戴',
    },
    'ui.game.item.operation.unequip': {
        en: 'Unequip',
        zh: '脱下',
    },
    'ui.game.item.operation.give': {
        en: 'Give',
        zh: '赠送',
    },
    'ui.game.item.operation.lend': {
        en: 'Lend',
        zh: '借出',
    },
    'ui.game.item.operation.consume': {
        en: 'Consume',
        zh: '消耗',
    },
    'ui.game.item.operation.damage': {
        en: 'Damage',
        zh: '损坏',
    },
    'ui.game.item.operation.clean': {
        en: 'Clean',
        zh: '清洗',
    },
    'ui.game.item.operation.lose': {
        en: 'Lose',
        zh: '丢失',
    },
    'ui.game.item.operation.destroy': {
        en: 'Destroy',
        zh: '销毁',
    },
    'ui.game.dialogue.menu': {
        en: '@ Dialogue',
        zh: '@ 对话',
    },
    'ui.game.movement.menu': {
        en: '→ Move',
        zh: '→ 移动',
    },
    'ui.game.movement.panel_aria': {
        en: 'Choose movement destination',
        zh: '选择移动目的地',
    },
    'ui.game.movement.reachable': {
        en: 'Reachable now',
        zh: '当前位置可达',
    },
    'ui.game.movement.close_aria': {
        en: 'Close location picker',
        zh: '关闭地点选择',
    },
    'ui.game.movement.search': {
        en: 'Search location, level, or room',
        zh: '搜索地点、楼层或房间',
    },
    'ui.game.movement.custom': {
        en: 'Enter location manually',
        zh: '手动填写地点',
    },
    'ui.game.movement.help': {
        en: 'Selection only writes to the input. Movement occurs on submission.',
        zh: '选择后仅写入输入框，提交时才移动',
    },
    'ui.game.movement.access.public': {
        en: 'Public area',
        zh: '公开区域',
    },
    'ui.game.movement.access.student': {
        en: 'Student area',
        zh: '学生区域',
    },
    'ui.game.movement.access.class': {
        en: 'Teaching area',
        zh: '教学区域',
    },
    'ui.game.movement.access.private': {
        en: 'Private area',
        zh: '私人区域',
    },
    'ui.game.movement.access.discovered': {
        en: 'Discovered',
        zh: '已发现',
    },
    'ui.game.movement.access.traversable': {
        en: 'Traversable',
        zh: '可通行',
    },
    'ui.game.movement.unlevelled': {
        en: 'No level',
        zh: '未分层',
    },
    'ui.game.movement.location_count': {
        en: '{count} locations',
        zh: '{count} 个地点',
    },
    'ui.game.movement.no_match': {
        en: 'No matching reachable location',
        zh: '没有匹配的可达地点',
    },
    'ui.game.movement.none_reachable': {
        en: 'No reachable locations',
        zh: '当前没有可达地点',
    },
    'ui.game.movement.current_level': {
        en: '{level} · Current level',
        zh: '{level} · 当前层',
    },
    'ui.game.movement.path_segments': {
        en: '{count} route segments',
        zh: '{count} 段路径',
    },
    'ui.game.spell.menu': {
        en: 'Spells',
        zh: '咒语',
    },
    'ui.game.spell.panel_aria': {
        en: 'Choose spell',
        zh: '选择咒语',
    },
    'ui.game.spell.learned': {
        en: 'Learned spells',
        zh: '已学咒语',
    },
    'ui.game.spell.close_aria': {
        en: 'Close spell picker',
        zh: '关闭咒语选择',
    },
    'ui.game.spell.search': {
        en: 'Search incantation, name, or effect',
        zh: '搜索咒文、名称、效果',
    },
    'ui.game.spell.try_unlearned': {
        en: 'Try unlearned spells',
        zh: '尝试未学咒语',
    },
    'ui.game.spell.roll_note': {
        en: 'Structured casting always triggers a D20 check',
        zh: '结构化施法必定触发 D20',
    },
    'ui.game.spell.all_common': {
        en: 'All common spells',
        zh: '全部常见咒语',
    },
    'ui.game.spell.count': {
        en: '{count} · curriculum year never blocks learning',
        zh: '{count} 个 · 年级不限制学习',
    },
    'ui.game.spell.show_learned': {
        en: 'Show learned spells only',
        zh: '只看已学咒语',
    },
    'ui.game.spell.no_match': {
        en: 'No matching spells',
        zh: '没有匹配的咒语',
    },
    'ui.game.spell.none_learned': {
        en: 'No learned spells yet. Switch to the full catalog for self-study or experimentation.',
        zh: '尚未学会咒语；可以切换到全部目录进行自学或实验。',
    },
    'ui.game.spell.unlearned_experiment': {
        en: 'Unlearned · Can experiment directly',
        zh: '未学 · 可直接实验',
    },
    'ui.game.spell.curriculum_year': {
        en: 'Standard curriculum Year {year}',
        zh: '常规课程 {year} 年级',
    },
    'ui.game.spell.nonstandard': {
        en: 'Nonstandard curriculum',
        zh: '非标准课程',
    },
    'ui.game.spell.unlearned_difficulty': {
        en: 'Unlearned · Difficulty +2',
        zh: '未学 · 难度 +2',
    },
    'ui.game.spell.preview_learned': {
        en: '{source} · {rank} {xp} XP · This turn always rolls a casting check',
        zh: '{source} · {rank} {xp} XP · 本回合必定进行施法检定',
    },
    'ui.game.spell.preview_unlearned': {
        en: 'Unlearned · Settles as an experiment · This turn always rolls a casting check',
        zh: '尚未学会 · 本次按自行实验结算 · 本回合必定进行施法检定',
    },
    'ui.game.address.everyone': {
        en: 'Everyone',
        zh: '全场',
    },
    'ui.game.address.broadcast_many': {
        en: '{count} broadcast lines',
        zh: '{count} 段对全场发言',
    },
    'ui.game.address.broadcast_one': {
        en: 'Broadcast to everyone',
        zh: '对全场发言',
    },
    'ui.game.address.direct_many': {
        en: '{count} lines to {target}',
        zh: '{count} 段对 {target} 说',
    },
    'ui.game.address.direct_one': {
        en: 'Speak to {target}',
        zh: '对 {target} 说',
    },
    'ui.game.address.multi': {
        en: '{count} directed lines · {targets}',
        zh: '{count} 段定向台词 · {targets}',
    },
    'ui.game.address.invalid': {
        en: 'Invalid addressee',
        zh: '受话对象无效',
    },
    'ui.game.address.invalid_detail': {
        en: 'Put each directed line on its own line using the "@Character: dialogue" format.',
        zh: '每条定向台词必须单独成行，并使用“@人物：台词”格式。',
    },
    'ui.game.address.help': {
        en: 'Lines beginning with "@Character:" are dialogue. Other lines are actions and narration.',
        zh: '以“@人物：”开头的行是台词；其他行按动作与叙述处理',
    },
    'ui.game.rollback': {
        en: 'Rollback previous turn',
        zh: '回滚上一轮',
    },
    'ui.game.archive_scene': {
        en: 'Archive Scene',
        zh: '封存场景',
    },
    'ui.game.active_check': {
        en: 'Active check',
        zh: '主动判定',
    },
    'ui.game.submit_turn': {
        en: 'Submit turn',
        zh: '提交回合',
    },
    'ui.game.focus.enter': {
        en: 'Focus',
        zh: '专注',
    },
    'ui.game.focus.exit': {
        en: 'Exit focus',
        zh: '退出专注',
    },
    'ui.game.item.operation_inserted': {
        en: 'Operation inserted. Reference the target from the Item archive.',
        zh: '已插入操作；请从物品档案引用对象。',
    },
    'ui.item.type.wand': {
        en: 'Wand',
        zh: '魔杖',
    },
    'ui.item.type.eyewear': {
        en: 'Eyewear',
        zh: '眼镜',
    },
    'ui.item.type.clothing': {
        en: 'Clothing',
        zh: '衣着',
    },
    'ui.item.type.accessory': {
        en: 'Accessory',
        zh: '饰品',
    },
    'ui.item.type.document': {
        en: 'Document',
        zh: '文书',
    },
    'ui.item.type.container': {
        en: 'Container',
        zh: '容器',
    },
    'ui.item.type.money': {
        en: 'Currency',
        zh: '钱币',
    },
    'ui.item.type.key': {
        en: 'Key',
        zh: '钥匙',
    },
    'ui.item.type.book': {
        en: 'Book',
        zh: '书籍',
    },
    'ui.item.type.tool': {
        en: 'Tool',
        zh: '工具',
    },
    'ui.item.type.consumable': {
        en: 'Consumable',
        zh: '消耗品',
    },
    'ui.item.type.keepsake': {
        en: 'Keepsake',
        zh: '纪念物',
    },
    'ui.item.type.clue': {
        en: 'Clue Item',
        zh: '线索物',
    },
    'ui.item.type.other': {
        en: 'Item',
        zh: '物品',
    },
    'ui.item.state.dirty': {
        en: 'Needs cleaning',
        zh: '待清洗',
    },
    'ui.item.state.intact': {
        en: 'Intact',
        zh: '完好',
    },
    'ui.item.state.damaged': {
        en: 'Damaged',
        zh: '损坏',
    },
    'ui.item.state.consumed': {
        en: 'Consumed',
        zh: '已消耗',
    },
    'ui.item.state.lost': {
        en: 'Lost',
        zh: '已丢失',
    },
    'ui.item.state.destroyed': {
        en: 'Destroyed',
        zh: '已销毁',
    },
    'ui.item.transfer.gift': {
        en: 'Gift',
        zh: '赠与',
    },
    'ui.item.transfer.loan': {
        en: 'Loaned',
        zh: '借出',
    },
    'ui.item.transfer.theft': {
        en: 'Transferred by theft',
        zh: '失窃转移',
    },
    'ui.item.transfer.return': {
        en: 'Returned',
        zh: '归还',
    },
    'ui.item.story_role.signature': {
        en: 'Signature Item',
        zh: '标志物',
    },
    'ui.item.story_role.social': {
        en: 'Social significance',
        zh: '社会意义',
    },
    'ui.item.story_role.clue': {
        en: 'Clue',
        zh: '线索',
    },
    'ui.item.story_role.promise': {
        en: 'Promise',
        zh: '承诺',
    },
    'ui.item.story_role.keepsake': {
        en: 'Keepsake',
        zh: '纪念',
    },
    'ui.item.time.exact': {
        en: 'Exact time',
        zh: '准确时间',
    },
    'ui.item.time.day': {
        en: 'That day',
        zh: '当日',
    },
    'ui.item.time.before_date': {
        en: 'No later than',
        zh: '不晚于',
    },
    'ui.item.time.unknown': {
        en: 'Time unknown',
        zh: '时间未详',
    },
    'ui.item.no_holder': {
        en: 'No holder',
        zh: '无人持有',
    },
    'ui.item.player': {
        en: 'Player',
        zh: '玩家',
    },
    'ui.item.with_holder': {
        en: 'With {holder}',
        zh: '随 {holder}',
    },
    'ui.item.last_seen': {
        en: 'Last seen at {room}',
        zh: '最后见于 {room}',
    },
    'ui.item.whereabouts_unknown': {
        en: 'Whereabouts unknown',
        zh: '下落不明',
    },
    'ui.item.location_unrecorded': {
        en: 'Location unrecorded',
        zh: '位置未记录',
    },
    'ui.item.appearance_unrecorded': {
        en: 'Appearance unrecorded.',
        zh: '外观尚未记录。',
    },
    'ui.item.owner_holder': {
        en: 'Owner {owner} · Holder {holder}',
        zh: '主人 {owner} · 持有人 {holder}',
    },
    'ui.item.owner': {
        en: 'Owner {owner}',
        zh: '主人 {owner}',
    },
    'ui.item.component.equipped': {
        en: 'Equipped',
        zh: '穿戴中',
    },
    'ui.item.component.story_role': {
        en: 'Story role: {role}',
        zh: '剧情角色：{role}',
    },
    'ui.item.component.source': {
        en: 'Source · {source}',
        zh: '来源 · {source}',
    },
    'ui.item.component.unrecorded': {
        en: 'Unrecorded',
        zh: '未记录',
    },
    'ui.item.component.recorded': {
        en: 'Recorded',
        zh: '已有记录',
    },
    'ui.item.component.canon_link': {
        en: 'View Canon source',
        zh: '查看原著资料',
    },
    'ui.item.component.reference': {
        en: 'Reference in input',
        zh: '引用到输入',
    },
    'ui.item.component.reference_title': {
        en: 'Reference this Item in the composer',
        zh: '在输入框中引用此物品',
    },
    'ui.item.placement.carried': {
        en: 'Carried',
        zh: '随身携带',
    },
    'ui.item.placement.stored': {
        en: 'Stored',
        zh: '已收存',
    },
    'ui.item.placement.equipped': {
        en: 'Equipped',
        zh: '穿戴中',
    },
    'ui.item.placement.with_holder': {
        en: 'With holder',
        zh: '由持有人携带',
    },
    'ui.item.placement.in_room': {
        en: 'In room',
        zh: '位于房间内',
    },
    'ui.item.component.empty_title': {
        en: 'No Items require formal tracking yet',
        zh: '还没有需要正式追踪的物品',
    },
    'ui.item.component.empty_detail': {
        en: 'Ordinary uniforms, textbooks, quills, and daily supplies remain usable without occupying the Item archive.',
        zh: '普通校服、课本、羽毛笔和生活用品仍可自然使用，但不会占用物品档案。',
    },
    'ui.item.component.active': {
        en: 'Current Items',
        zh: '当前物品',
    },
    'ui.item.component.history': {
        en: 'Loss and consumption history',
        zh: '失去与消耗记录',
    },
    'ui.proposal.discovered_item': {
        en: 'Item discovered',
        zh: '发现物品',
    },
    'ui.proposal.discovered_spell': {
        en: 'New spell discovered',
        zh: '发现新咒语',
    },
    'ui.proposal.accepted': {
        en: 'Accepted',
        zh: '已收录',
    },
    'ui.proposal.ignored': {
        en: 'Ignored',
        zh: '已忽略',
    },
    'ui.proposal.details': {
        en: 'Details',
        zh: '详情',
    },
    'ui.proposal.accept': {
        en: 'Accept',
        zh: '收录',
    },
    'ui.proposal.ignore': {
        en: 'Ignore',
        zh: '忽略',
    },
    'ui.proposal.processing': {
        en: 'Processing...',
        zh: '处理中…',
    },
    'ui.proposal.item_accepted': {
        en: 'Added to Item archive',
        zh: '已收录到物品档案',
    },
    'ui.proposal.item_ignored': {
        en: 'Ignored this Item candidate',
        zh: '已忽略这条物品候选',
    },
    'ui.proposal.spell_conflict': {
        en: 'Non-authoritative incantation · Player confirmation required',
        zh: '非权威咒文 · 需玩家确认',
    },
    'ui.proposal.spell_custom': {
        en: 'Custom spell · Player confirmation required',
        zh: '自定义咒语 · 需玩家确认',
    },
    'ui.proposal.spell_effect_evidence': {
        en: 'The effect is defined by this narrative evidence.',
        zh: '效果由这段叙事证据定义。',
    },
    'ui.proposal.spell_accepted': {
        en: 'Added to learned spells',
        zh: '已收录到咒语学习列表',
    },
    'ui.proposal.spell_ignored': {
        en: 'Ignored this spell candidate',
        zh: '已忽略这条咒语候选',
    },
    'ui.story.stale_timeline': {
        en: 'The timeline has changed. Refresh before continuing.',
        zh: '时间线已更新，请刷新后继续。',
    },
    'ui.story.opening_failed': {
        en: 'Opening arrangement failed',
        zh: '首幕编排失败',
    },
    'ui.story.no_interactive_characters': {
        en: 'No interactive characters',
        zh: '当前没有互动人物',
    },
    'ui.story.confirming_characters': {
        en: 'The World Director is confirming characters...',
        zh: '世界导演正在确认人物…',
    },
    'ui.story.other_cohort': {
        en: 'Other {label} members',
        zh: '另有 {label} 成员若干',
    },
    'ui.story.no_other_characters': {
        en: 'No other confirmed characters',
        zh: '暂无其他已确认人物',
    },
    'ui.story.location_characters_pending': {
        en: 'Location characters are not confirmed yet',
        zh: '地点人物尚未确认',
    },
    'ui.story.live_log_title': {
        en: 'Current Scene live record: {entries}',
        zh: '当前场景现场记录：{entries}',
    },
    'ui.story.now': {
        en: 'Now',
        zh: '现在',
    },
    'ui.story.current_scene': {
        en: 'Current Scene',
        zh: '当前场景',
    },
    'ui.story.archive_empty': {
        en: 'The read-only archive appears after the first Scene ends.',
        zh: '首个场景结束后会在这里生成只读档案。',
    },
    'ui.story.unnamed_scene': {
        en: 'Unnamed Scene',
        zh: '未命名场景',
    },
    'ui.story.load_earlier_scenes': {
        en: 'Load earlier Scenes · {count} remaining',
        zh: '加载更早场景 · 还剩 {count}',
    },
    'ui.story.load_earlier_records': {
        en: 'Load earlier records · {count} remaining',
        zh: '↑ 向上加载更早记录 · 还剩 {count}',
    },
    'ui.story.archive_no_transcript': {
        en: 'This Scene has no visible live transcript.',
        zh: '该场景没有可显示的现场转录。',
    },
    'ui.story.archive_missing': {
        en: 'This Scene archive does not exist or is not sealed yet.',
        zh: '该场景档案不存在或尚未完成封存。',
    },
    'ui.story.destination.matched': {
        en: '{source} · {room}',
        zh: '{source} · {room}',
    },
    'ui.story.destination.director': {
        en: 'Director plan',
        zh: '导演预排',
    },
    'ui.story.destination.user': {
        en: 'User override',
        zh: '用户覆盖',
    },
    'ui.story.destination.unmatched': {
        en: 'The user override did not match a fixed room. Settlement will choose the best existing Map location.',
        zh: '用户覆盖未匹配固定房间；结算时导演会在现有地图中选择最合适的位置。',
    },
    'ui.story.no_active_scene': {
        en: 'There is no active Scene to archive.',
        zh: '当前没有可以封存的活动场景。',
    },
    'ui.story.world_settling': {
        en: 'World State is still settling. Please wait.',
        zh: '世界状态仍在结算，请稍候。',
    },
    'ui.story.current_scene_eyebrow': {
        en: 'CURRENT SCENE',
        zh: '当前场景',
    },
    'ui.story.scene_ready': {
        en: 'The Scene is established and awaits the next action.',
        zh: '场景已经建立，等待下一步行动。',
    },
    'ui.story.load_current_earlier': {
        en: 'Load earlier current-Scene records · {count} remaining',
        zh: '↑ 向上加载当前场景更早记录 · 还剩 {count}',
    },
    'ui.story.current_empty': {
        en: 'The current Scene has no live record yet.',
        zh: '当前场景尚无现场记录。',
    },
    'ui.story.opening_not_committed': {
        en: 'Opening arrangement was not committed',
        zh: '首幕编排没有提交',
    },
    'ui.story.opening_retry': {
        en: 'Arrange opening again',
        zh: '重新编排首幕',
    },
    'ui.story.world_director_failed': {
        en: 'World Director call failed.',
        zh: '世界导演调用失败。',
    },
    'ui.story.opening.committed_title': {
        en: 'The Scene is fixed. Writing the opening now.',
        zh: '场景已固化，正在书写第一幕',
    },
    'ui.story.opening.arranging_title': {
        en: 'The World Director is arranging your opening.',
        zh: '世界导演正在编排你的开场',
    },
    'ui.story.opening.committed_detail': {
        en: 'Time, location, Map, characters, and hidden Storylines are committed. Scene planning and performance may take several minutes. Keep the page open.',
        zh: '时间、地点、地图、人物与隐藏故事线已经提交。中档编排场景、低档生成对白可能需要数分钟，请保持页面开启。',
    },
    'ui.story.opening.arranging_detail': {
        en: 'Determining time, home Scene, present characters, and dramatic conflict from the character background. Keep the page open.',
        zh: '正在根据人物背景确定时间、家庭场景、在场人物与戏剧冲突。导演接口可能需要数分钟，请保持页面开启。',
    },
    'ui.story.opening.step.world': {
        en: 'World Director establishes the Scene',
        zh: '世界导演建立场景',
    },
    'ui.story.opening.step.performance': {
        en: 'Medium tier plans · Low tier performs',
        zh: '中档编排场景 · 低档生成对白',
    },
    'ui.story.opening.step.player': {
        en: 'Await your first action',
        zh: '等待你的第一个行动',
    },
    'ui.story.timeline_updated': {
        en: 'Timeline updated',
        zh: '时间线已更新',
    },
    'ui.story.reply_failed': {
        en: 'Reply generation failed. The player message was saved.',
        zh: '回复生成失败，玩家消息已保存',
    },
    'ui.story.reply_invalid': {
        en: 'The low-tier model did not submit a valid Scene reply.',
        zh: '低档没有提交有效的场景回复。',
    },
    'ui.story.movement_unsettled.title': {
        en: 'Scene saved. Movement is waiting for settlement.',
        zh: '场景已保留，移动正在等待结算。',
    },
    'ui.story.movement_unsettled.detail': {
        en: 'Your location has not changed. Retry settlement when ready.',
        zh: '当前位置尚未改变；准备好后可重新结算。',
    },
    'ui.story.movement_unsettled.retry': {
        en: 'Retry movement settlement',
        zh: '重新结算移动',
    },
    'ui.story.movement_unsettled.blocked': {
        en: 'Settle the saved movement before submitting another action.',
        zh: '请先结算已保留的移动，再提交下一步行动。',
    },
    'ui.story.retry_turn': {
        en: 'Retry this turn',
        zh: '重试本回合',
    },
    'ui.story.retrying': {
        en: 'Retrying',
        zh: '正在重试',
    },
    'ui.story.transition.high_title': {
        en: 'High tier is settling a major turn',
        zh: '高档正在结算重大转折',
    },
    'ui.story.transition.medium_title': {
        en: 'Medium tier is archiving the Scene and establishing the next one',
        zh: '中档正在封存场景并建立下一幕',
    },
    'ui.story.transition.detail': {
        en: 'Structured State commits once after full validation. The old Scene remains playable until then.',
        zh: '结构化状态将在完整校验后一次提交；旧场景在此之前保持可玩。',
    },
    'ui.story.transition.step.close': {
        en: 'Close the old Scene',
        zh: '收束旧场景',
    },
    'ui.story.transition.step.people': {
        en: 'Confirm characters and location',
        zh: '确认人物与地点',
    },
    'ui.story.transition.step.next': {
        en: 'Prewrite the next Scene',
        zh: '预写下一幕',
    },
    'ui.story.transition.step.commit': {
        en: 'Atomic commit',
        zh: '原子提交',
    },
    'ui.story.memory.title': {
        en: 'Medium tier is organizing shared memories',
        zh: '中档正在整理共同记忆',
    },
    'ui.story.memory.detail': {
        en: 'Merging duplicate moments, distilling recent events, and deciding which experiences leave lasting marks.',
        zh: '合并重复小事、提炼近期大事，并判断哪些经历真正留下长期印记。',
    },
    'ui.story.memory.step.review': {
        en: 'Review shared experiences',
        zh: '回看共同经历',
    },
    'ui.story.memory.step.merge': {
        en: 'Merge everyday fragments',
        zh: '合并日常碎片',
    },
    'ui.story.memory.step.events': {
        en: 'Distill important events',
        zh: '提炼重要事件',
    },
    'ui.story.memory.step.impressions': {
        en: 'Update character impressions',
        zh: '更新人物印象',
    },
    'ui.story.pacing.title': {
        en: 'Medium tier is checking Scene pacing',
        zh: '中档正在检查场景节奏',
    },
    'ui.story.pacing.detail': {
        en: 'Deciding whether the Scene needs new characters, a public crisis, or a main-story turn.',
        zh: '判断是否需要新人物、公开危机或主线转机。',
    },
    'ui.story.pacing.step.cast': {
        en: 'Check repeated cast',
        zh: '检查重复阵容',
    },
    'ui.story.pacing.step.pressure': {
        en: 'Measure Scene pressure',
        zh: '衡量场景压力',
    },
    'ui.story.pacing.step.intervention': {
        en: 'Choose intervention',
        zh: '选择介入方式',
    },
    'ui.story.pacing.step.commit': {
        en: 'Commit public turn',
        zh: '提交公开转机',
    },
    'ui.story.performer.title': {
        en: 'Low tier is taking over the Scene',
        zh: '低档正在接管现场',
    },
    'ui.story.performer.detail': {
        en: 'Reading the player action, spatial relationships, and Director instructions.',
        zh: '正在读取玩家行动、空间关系与导演指令。',
    },
    'ui.story.performer.step.read': {
        en: 'Read action',
        zh: '读取行动',
    },
    'ui.story.performer.step.write': {
        en: 'Write the Scene',
        zh: '书写现场',
    },
    'ui.story.performer.step.translate': {
        en: 'Prepare display translation',
        zh: '译入中文',
    },
    'ui.story.performer.step.commit': {
        en: 'Commit State',
        zh: '提交状态',
    },
    'ui.story.settlement_failed': {
        en: 'Scene settlement failed',
        zh: '场景封存失败',
    },
    'ui.story.settlement_invalid': {
        en: 'The settlement package failed rules validation.',
        zh: '结算包未通过规则校验。',
    },
    'ui.story.settlement_reopen': {
        en: 'Reopen settlement',
        zh: '重新打开结算',
    },
    'ui.story.rollback_title': {
        en: 'Delete the previous player/Scene message pair and restore world State from before that turn',
        zh: '删除上一组玩家/场景消息，并恢复该回合提交前的世界状态',
    },
    'ui.story.rollback_legacy_title': {
        en: 'Rollback the previous turn. Old saves rebuild pre-turn State from committed transactions.',
        zh: '回滚上一轮；旧存档会从已提交事务重建回合前状态',
    },
    'ui.story.busy.retry_first': {
        en: 'The previous player message is saved. Retry the turn above first.',
        zh: '上一条玩家消息已保存，请先在上方重试本回合',
    },
    'ui.story.busy.memory': {
        en: 'The medium tier is organizing impressions and shared memories. Please wait.',
        zh: '中档正在整理人物印象与共同记忆，请稍候',
    },
    'ui.story.busy.pacing': {
        en: 'The medium tier is checking Scene pacing and character changes. Please wait.',
        zh: '中档正在检查场景节奏与人物变化，请稍候',
    },
    'ui.story.busy.transition': {
        en: 'Archiving the current Scene and establishing the next one. Please wait.',
        zh: '正在封存当前场景并建立下一幕，请稍候',
    },
    'ui.story.busy.performer': {
        en: 'The low tier is performing this turn. Please wait.',
        zh: '低档正在表演本轮动作、场景与对白，请稍候',
    },
    'ui.story.busy.opening_failed': {
        en: 'Opening arrangement failed. Retry above first.',
        zh: '首幕编排失败，请先在上方重试',
    },
    'ui.story.busy.world_setup': {
        en: 'The world is being established. You can act after the opening is ready.',
        zh: '世界正在建立，首幕完成后即可行动',
    },
    'ui.turn.rollback.none': {
        en: 'There is no completed turn to roll back.',
        zh: '当前没有可回滚的已完成回合。',
    },
    'ui.turn.rollback.confirm': {
        en: 'Rolling back deletes the matching player message and Scene reply, then restores world State from before the turn. Continue?',
        zh: '回滚上一轮会删除对应的玩家消息与场景回复，并恢复提交前的世界状态。继续吗？',
    },
    'ui.turn.rollback.done': {
        en: 'Previous turn rolled back. The original input was restored to the editor.',
        zh: '已回滚上一轮；原输入已放回编辑框。',
    },
    'ui.turn.opening_incomplete': {
        en: 'The opening is not complete. Actions cannot be submitted yet.',
        zh: '首幕尚未完成，当前不能提交行动。',
    },
    'ui.turn.reply_missing': {
        en: 'The previous player message was saved without a reply. Retry that turn first.',
        zh: '上一条玩家消息已经保存但尚未生成回复，请先重试本回合。',
    },
    'ui.message.proficiency_modifier': {
        en: 'Proficiency modifier {value}',
        zh: '熟练修正 {value}',
    },
    'ui.message.unlearned_spell': {
        en: 'Unlearned spell · experiment difficulty',
        zh: '未学咒语 · 实验难度',
    },
    'ui.message.active_observation': {
        en: 'Active observation',
        zh: '主动观测',
    },
    'ui.message.unidentified_spell': {
        en: 'Spell not identified',
        zh: '未能辨认咒语',
    },
    'ui.message.rules_resolved': {
        en: 'RULES RESOLVED · Continuing',
        zh: '判定完成 · 续写中',
    },
    'ui.message.d20_check': {
        en: 'D20 CHECK · Local adjudication',
        zh: '二十面骰检定 · 本地判定',
    },
    'ui.message.advantage': {
        en: 'Advantage',
        zh: '优势',
    },
    'ui.message.disadvantage': {
        en: 'Disadvantage',
        zh: '劣势',
    },
    'ui.message.quill.title': {
        en: 'The Author\'s Quill',
        zh: '作者的羽毛笔',
    },
    'ui.message.quill.chapter_note': {
        en: 'Chapter note',
        zh: '本章批注',
    },
    'ui.message.quill.disclaimer': {
        en: 'Not character knowledge · No spoilers · The editorial office assumes no liability for furniture damaged by player strategy',
        zh: '不计入角色认知 · 不含剧透 · 编辑部拒绝承担玩家策略造成的家具损失',
    },
    'ui.message.translation.toggle': {
        en: 'Switch language',
        zh: '切换语言',
    },
    'ui.message.translation.toggle_or_retranslate': {
        en: 'Switch language or retranslate',
        zh: '切换语言或重新翻译',
    },
    'ui.message.translation.current': {
        en: 'Current: {provider}',
        zh: '当前：{provider}',
    },
    'ui.message.translation.show_chinese': {
        en: 'Show Chinese translation',
        zh: '显示中文译文',
    },
    'ui.message.translation.show_english': {
        en: 'Show English source',
        zh: '显示英文原文',
    },
    'ui.message.translation.english_short': {
        en: 'EN',
        zh: '英',
    },
    'ui.message.translation.retranslate': {
        en: 'Retranslate · {provider}',
        zh: '重新翻译 · {provider}',
    },
    'ui.message.translation.running': {
        en: 'Retranslating...',
        zh: '正在重新翻译…',
    },
    'ui.message.translation.done': {
        en: 'Retranslated',
        zh: '已重新翻译',
    },
    'ui.message.translation.chinese_short': {
        en: 'ZH',
        zh: '中',
    },
    'ui.message.stream.phase.connecting': {
        en: 'Preparing the Scene',
        zh: '正在铺开羊皮纸',
    },
    'ui.message.stream.phase.receiving': {
        en: 'Generating complete reply',
        zh: '正在生成完整回复',
    },
    'ui.message.stream.phase.repairing': {
        en: 'Reorganizing after structural validation',
        zh: '结构校对后重新整理',
    },
    'ui.message.stream.phase.translating': {
        en: 'Translating this turn',
        zh: '正在翻译本回合',
    },
    'ui.message.stream.phase.committing': {
        en: 'Settling this turn',
        zh: '正在结算本回合',
    },
    'ui.message.stream.detail.connecting': {
        en: 'Reading the player action, live facts, and Director instructions.',
        zh: '正在读取玩家行动、现场事实与导演指令。',
    },
    'ui.message.stream.detail.receiving': {
        en: 'Generating the complete reply. Text appears only after validation and commit.',
        zh: '正在生成完整回复；正文将在校验并提交后一次显示。',
    },
    'ui.message.stream.detail.repairing': {
        en: 'The draft failed structural validation and is being reorganized before final commit.',
        zh: '初稿未通过结构校验，正在重新整理；正文只在最终提交后显示。',
    },
    'ui.message.stream.detail.translating': {
        en: 'Generating the Chinese display while this turn continues settling in the background.',
        zh: '正在生成本回合中文；本回合状态结算在后台继续。',
    },
    'ui.message.stream.detail.committing': {
        en: 'The narrative is readable. Finishing this turn proposal and world State commit.',
        zh: '正文已可阅读；正在完成本回合状态提案与世界状态提交。',
    },
    'ui.message.stream.step.read': {
        en: 'Read action',
        zh: '读取行动',
    },
    'ui.message.stream.step.generate': {
        en: 'Generate complete reply',
        zh: '生成完整回复',
    },
    'ui.message.stream.step.translate': {
        en: 'Prepare display translation',
        zh: '译入中文',
    },
    'ui.message.stream.step.commit': {
        en: 'Commit State',
        zh: '提交状态',
    },
    'ui.message.your_turn': {
        en: 'Your turn',
        zh: '你的回合',
    },
    'ui.message.present_actor': {
        en: 'Present actor',
        zh: '在场人物',
    },
    'ui.message.quill.kicker': {
        en: 'Out of character · Chapter notes',
        zh: '角色外 · 章节批注',
    },
});

export const UI_GAME_STATIC_LOCALE_EN =
    Object.freeze(
        Object.fromEntries(
            Object.entries(
                GAME_TEXT,
            ).map(([
                key,
                value,
            ]) => [
                key,
                value.en,
            ]),
        ),
    );

export const UI_GAME_STATIC_LOCALE_ZH_CN =
    Object.freeze(
        Object.fromEntries(
            Object.entries(
                GAME_TEXT,
            ).map(([
                key,
                value,
            ]) => [
                key,
                value.zh,
            ]),
        ),
    );
