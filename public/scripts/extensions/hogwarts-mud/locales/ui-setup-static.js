const SETUP_TEXT = Object.freeze({
    'ui.setup.polish_failed': {
        en: 'Character background polishing failed.',
        zh: '人物背景润色失败。',
    },
    'ui.setup.background.blood_status': {
        en: 'Blood status',
        zh: '血统背景',
    },
    'ui.setup.background.economy': {
        en: 'Household finances',
        zh: '家庭经济',
    },
    'ui.setup.background.guardian': {
        en: 'Guardian or family relationship *',
        zh: '监护人或家庭关系 *',
    },
    'ui.setup.background.home': {
        en: 'Place raised',
        zh: '成长地点',
    },
    'ui.setup.background.desire': {
        en: 'What do you want most? *',
        zh: '最想得到什么 *',
    },
    'ui.setup.background.fear': {
        en: 'What do you fear most? *',
        zh: '最害怕什么 *',
    },
    'ui.setup.background.habit': {
        en: 'Habit or quirk',
        zh: '习惯或怪癖',
    },
    'ui.setup.background.formative_event': {
        en: 'A formative event',
        zh: '塑造你的往事',
    },
    'ui.setup.background.pending': {
        en: 'Undecided',
        zh: '待定',
    },
    'ui.setup.background.muggle_born': {
        en: 'Muggle-born',
        zh: '麻瓜出身',
    },
    'ui.setup.background.half_blood': {
        en: 'Half-blood',
        zh: '混血',
    },
    'ui.setup.background.pure_blood': {
        en: 'Pure-blood',
        zh: '纯血',
    },
    'ui.setup.background.complex': {
        en: 'Unknown or complex',
        zh: '未知或复杂',
    },
    'ui.setup.background.strained': {
        en: 'Strained',
        zh: '拮据',
    },
    'ui.setup.background.ordinary': {
        en: 'Ordinary',
        zh: '普通',
    },
    'ui.setup.background.comfortable': {
        en: 'Comfortable',
        zh: '宽裕',
    },
    'ui.setup.background.prominent': {
        en: 'Prominent but constrained',
        zh: '显赫但受约束',
    },
    'ui.setup.background.home_placeholder': {
        en: 'City, village, or specific home',
        zh: '城市、村庄或具体住处',
    },
    'ui.setup.aptitude.learning': {
        en: 'Learning style',
        zh: '学习方式',
    },
    'ui.setup.aptitude.physical': {
        en: 'Body and movement',
        zh: '身体与运动',
    },
    'ui.setup.aptitude.observation': {
        en: 'Observation style',
        zh: '观察方式',
    },
    'ui.setup.aptitude.social': {
        en: 'Social style',
        zh: '社交方式',
    },
    'ui.setup.aptitude.pressure': {
        en: 'Response under pressure',
        zh: '压力下的反应',
    },
    'ui.setup.aptitude.potential': {
        en: 'Overall magical potential',
        zh: '总体魔法潜质',
    },
    'ui.setup.aptitude.strong': {
        en: 'Strong domain',
        zh: '优势领域',
    },
    'ui.setup.aptitude.weak': {
        en: 'Weak domain',
        zh: '弱势领域',
    },
    'ui.setup.aptitude.rare': {
        en: 'Rare talent',
        zh: '罕见天赋',
    },
    'ui.setup.aptitude.balanced': {
        en: 'Balanced',
        zh: '均衡',
    },
    'ui.setup.aptitude.volatile': {
        en: 'Strong but volatile',
        zh: '强烈但不稳定',
    },
    'ui.setup.aptitude.patient': {
        en: 'Slow start, higher ceiling',
        zh: '起步缓慢、上限较高',
    },
    'ui.setup.aptitude.focused': {
        en: 'Domain-focused',
        zh: '领域集中',
    },
    'ui.setup.aptitude.undiscovered': {
        en: 'Undiscovered',
        zh: '待发现',
    },
    'ui.setup.domain.charms': {
        en: 'Charms',
        zh: '魔咒',
    },
    'ui.setup.domain.transfiguration': {
        en: 'Transfiguration',
        zh: '变形',
    },
    'ui.setup.domain.potions': {
        en: 'Potions',
        zh: '魔药',
    },
    'ui.setup.domain.herbology': {
        en: 'Herbology',
        zh: '草药',
    },
    'ui.setup.domain.flying': {
        en: 'Flying',
        zh: '飞行',
    },
    'ui.setup.domain.mind': {
        en: 'Mind',
        zh: '心灵',
    },
    'ui.setup.domain.defence': {
        en: 'Defence',
        zh: '防御',
    },
    'ui.setup.talent.none': {
        en: 'No known rare talent',
        zh: '无已知罕见天赋',
    },
    'ui.setup.talent.parseltongue': {
        en: 'Parseltongue',
        zh: '蛇佬腔',
    },
    'ui.setup.talent.metamorphmagus': {
        en: 'Metamorphmagus tendency',
        zh: '易容马格斯倾向',
    },
    'ui.setup.talent.prophecy': {
        en: 'Prophetic tendency',
        zh: '预言倾向',
    },
    'ui.setup.talent.custom': {
        en: 'Custom; describe it in the background',
        zh: '自定义，写入背景',
    },
    'ui.setup.attributes.title': {
        en: 'Six base attributes',
        zh: '六项基础属性',
    },
    'ui.setup.attributes.range': {
        en: '7-14 each',
        zh: '单项 7–14',
    },
    'ui.setup.attribute.physique': {
        en: 'Physique',
        zh: '体魄',
    },
    'ui.setup.attribute.agility': {
        en: 'Agility',
        zh: '灵巧',
    },
    'ui.setup.attribute.perception': {
        en: 'Perception',
        zh: '感知',
    },
    'ui.setup.attribute.intellect': {
        en: 'Intellect',
        zh: '智识',
    },
    'ui.setup.attribute.willpower': {
        en: 'Willpower',
        zh: '意志',
    },
    'ui.setup.attribute.charisma': {
        en: 'Charisma',
        zh: '魅力',
    },
    'ui.setup.story.taste': {
        en: 'Story taste',
        zh: '故事口味',
    },
    'ui.setup.story.social_density': {
        en: 'Social density',
        zh: '社交密度',
    },
    'ui.setup.story.relative_age': {
        en: 'Relative-age preference',
        zh: '相对年龄偏好',
    },
    'ui.setup.story.canon_density': {
        en: 'Canon character density',
        zh: '原著人物浓度',
    },
    'ui.setup.story.balanced': {
        en: 'Balanced: adventure, relationships, and daily life',
        zh: '均衡：冒险、关系与日常并行',
    },
    'ui.setup.story.adventure': {
        en: 'Adventure: action, danger, and exploration first',
        zh: '惊险冒险：行动、危机与探索优先',
    },
    'ui.setup.story.mystery': {
        en: 'Mystery: clues, puzzles, and knowledge first',
        zh: '秘密推理：线索、谜团与知识优先',
    },
    'ui.setup.story.social': {
        en: 'Ensemble: social pressure, conflict, and emotion first',
        zh: '关系群像：社交、冲突与情感优先',
    },
    'ui.setup.story.intimate': {
        en: 'A few close bonds: fewer characters, deeper relationships',
        zh: '少数深交：人物少但关系深入',
    },
    'ui.setup.story.social_balanced': {
        en: 'Balanced: a stable core with continuing new faces',
        zh: '均衡：稳定核心与持续新面孔',
    },
    'ui.setup.story.ensemble': {
        en: 'Large ensemble: a broader classmate and acquaintance network',
        zh: '热闹群像：更大的同学与熟人网络',
    },
    'ui.setup.story.peer': {
        en: 'Peer-focused: match the player\'s current age',
        zh: '同龄为主：按玩家当前年龄动态匹配',
    },
    'ui.setup.story.mixed_age': {
        en: 'Mixed students: peers plus older and younger years',
        zh: '学生混合：同龄与高低年级并重',
    },
    'ui.setup.story.intergenerational': {
        en: 'Intergenerational: more adults and elders',
        zh: '跨代群像：允许更多成年人与长辈',
    },
    'ui.setup.story.original': {
        en: 'Original-focused: Canon appears only for a clear role',
        zh: '原创为主：原著人物只在职责明确时出现',
    },
    'ui.setup.story.canon_balanced': {
        en: 'Balanced: mix Canon and original characters',
        zh: '均衡：原著人物与原创人物混合',
    },
    'ui.setup.story.canon_focused': {
        en: 'Canon-focused: prefer plausible established characters',
        zh: '原著密集：优先合理的原著人物',
    },
    'ui.setup.relationship.legend': {
        en: 'Relationship experiences to emphasize',
        zh: '希望重点发展的关系体验',
    },
    'ui.setup.relationship.friendship': {
        en: 'Friendship',
        zh: '友情',
    },
    'ui.setup.relationship.friendship_hint': {
        en: 'Companionship, trust, and shared growth',
        zh: '同伴、信任与共同成长',
    },
    'ui.setup.relationship.romance': {
        en: 'Young affection',
        zh: '青涩好感',
    },
    'ui.setup.relationship.romance_hint': {
        en: 'Strictly follows both characters\' current ages and relationship development',
        zh: '严格按双方当前年龄与关系发展',
    },
    'ui.setup.relationship.rivalry': {
        en: 'Rivalry',
        zh: '宿敌竞争',
    },
    'ui.setup.relationship.rivalry_hint': {
        en: 'Conflict in values, achievement, or methods',
        zh: '价值观、成绩或行动方式冲突',
    },
    'ui.setup.relationship.mentorship': {
        en: 'Guidance and mentorship',
        zh: '引路与师生',
    },
    'ui.setup.relationship.mentorship_hint': {
        en: 'Does not let teachers dominate every Scene',
        zh: '不等于让教师长期霸占场景',
    },
    'ui.setup.relationship.family': {
        en: 'Family',
        zh: '家庭关系',
    },
    'ui.setup.relationship.family_hint': {
        en: 'Relatives, guardians, and family responsibility',
        zh: '亲人、监护人与家庭责任',
    },
    'ui.setup.story.note': {
        en: 'Birth date is fixed. Peer, older, and younger are recalculated from the player\'s age at each world date. Friendships, rivalries, and affection form only after characters meet.',
        zh: '出生日期是固定人物事实；“同龄、年长、年幼”会在每个世界时间点相对玩家年龄重新计算。朋友、宿敌和好感对象只会在实际认识后形成，不是预设配对。',
    },
    'ui.setup.review.unnamed': {
        en: 'Unnamed',
        zh: '未命名',
    },
    'ui.setup.review.polish': {
        en: 'Polish with medium-tier AI',
        zh: '用中档 AI 润色',
    },
    'ui.setup.review.world': {
        en: 'British Wizarding World',
        zh: '英国魔法世界',
    },
    'ui.setup.review.map_note': {
        en: 'Narrative AI never rebuilds preset topology. Runtime stores only blocks, damage, secret discovery, and structural event changes.',
        zh: '预设拓扑不会由叙事 AI 重建。运行时只记录封锁、损坏、秘密发现和事件造成的结构变化。',
    },
    'ui.setup.review.confirm': {
        en: 'I confirm the facts in this character sheet',
        zh: '我确认人物卡中的事实',
    },
    'ui.setup.review.confirm_hint': {
        en: 'You may still inspect them after play begins, but AI cannot rewrite confirmed facts.',
        zh: '开始后仍可查看，但已确认事实不能被 AI 擅自改写。',
    },
    'ui.setup.review.background_placeholder': {
        en: 'The system forms a background summary from structured fields; you may continue editing it.',
        zh: '系统会根据结构化字段形成背景摘要；你可以继续修改。',
    },
    'ui.setup.review.blood_pending': {
        en: 'Blood status undecided',
        zh: '血统待定',
    },
    'ui.setup.review.strength': {
        en: 'Strength',
        zh: '优势',
    },
    'ui.setup.review.strength_pending': {
        en: 'Strength undiscovered',
        zh: '优势待发现',
    },
    'ui.setup.review.maps': {
        en: 'local maps',
        zh: '个小地图',
    },
    'ui.setup.review.fixed_nodes': {
        en: 'fixed nodes',
        zh: '个固定节点',
    },
    'ui.setup.review.levels': {
        en: 'levels',
        zh: '层',
    },
    'ui.setup.review.profile_required': {
        en: 'Select a medium- or high-tier Connection Profile first.',
        zh: '请先选择中档或高档 Connection Profile。',
    },
    'ui.setup.review.polishing': {
        en: 'Polishing...',
        zh: '润色中…',
    },
    'ui.setup.review.model_empty': {
        en: 'The model returned no background text.',
        zh: '模型没有返回背景文本。',
    },
    'ui.setup.validation.low_profile': {
        en: 'Select a low-tier Scene Performer Connection Profile.',
        zh: '请选择低档“现场表演者”Connection Profile。',
    },
    'ui.setup.validation.confirm_facts': {
        en: 'Confirm the character-sheet facts.',
        zh: '请确认人物卡事实。',
    },
    'ui.setup.saved': {
        en: 'Character sheet and model settings saved.',
        zh: '人物卡与模型配置已保存。',
    },
    'ui.setup.confirmed': {
        en: 'Character sheet confirmed. The World Director is arranging your opening.',
        zh: '人物卡已确认。世界导演正在编排你的首幕。',
    },
});

export const UI_SETUP_STATIC_LOCALE_EN =
    Object.freeze(
        Object.fromEntries(
            Object.entries(
                SETUP_TEXT,
            ).map(([
                key,
                value,
            ]) => [
                key,
                value.en,
            ]),
        ),
    );

export const UI_SETUP_STATIC_LOCALE_ZH_CN =
    Object.freeze(
        Object.fromEntries(
            Object.entries(
                SETUP_TEXT,
            ).map(([
                key,
                value,
            ]) => [
                key,
                value.zh,
            ]),
        ),
    );
