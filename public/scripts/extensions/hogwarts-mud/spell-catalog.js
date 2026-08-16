const DIFFICULTY_ADJUSTMENTS = Object.freeze({
    elementary: -1,
    standard: 1,
    advanced: 3,
    expert: 5,
    extreme: 7,
});

const spellStaticLocaleEn = {};
const spellStaticLocaleZhCn = {};

const createSpell = (
    id,
    incantation,
    name,
    nameEn,
    category,
    effect,
    effectEn,
    curriculumYear,
    difficulty = 'standard',
    options = {},
) => {
    spellStaticLocaleEn[
        `spell.${id}.name`
    ] = nameEn;
    spellStaticLocaleEn[
        `spell.${id}.effect`
    ] = effectEn;
    spellStaticLocaleZhCn[
        `spell.${id}.name`
    ] = name;
    spellStaticLocaleZhCn[
        `spell.${id}.effect`
    ] = effect;
    return Object.freeze({
        id,
        incantation,
        nameEn,
        category,
        effectEn,
        curriculumYear:
        options.curriculumYear ??
        curriculumYear,
        subject:
        options.subject ||
        'Charms',
        difficulty,
        dcAdjustment:
        DIFFICULTY_ADJUSTMENTS[
            difficulty
        ] ??
        1,
        target:
        options.target ||
        'object',
        opposed:
        Boolean(
            options.opposed,
        ),
        targetAttribute:
        options.targetAttribute ||
        (
            options.opposed
                ? 'agility'
                : 'willpower'
        ),
        risk:
        options.risk ||
        'controlled',
        legality:
        options.legality ||
        'permitted',
        learningMode:
        options.learningMode ||
        (
            curriculumYear > 0
                ? 'curriculum'
                : 'independent'
        ),
        sourceTier:
        options.sourceTier ||
        'book_canon',
        incantationKnown:
        options.incantationKnown ??
        Boolean(incantation),
        sourceUrl:
        options.sourceUrl ||
        '',
        aliases:
        Object.freeze(
            [
                name,
                ...(options.aliases ||
                    []),
            ].filter(Boolean),
        ),
    });
};

export const SPELL_CATALOG_VERSION = 3;
export const SPELL_DIRECTIVE_PREFIX = '✦';

export const SPELL_CATALOG = Object.freeze([
    createSpell(
        'wingardium_leviosa',
        'Wingardium Leviosa',
        '悬浮咒',
        'Levitation Charm',
        'charm',
        '使物体悬浮并受施法者引导。',
        'Levitate and direct an object through the air.',
        1,
        'elementary',
        {
            target: 'object',
            aliases: [
                'Levitation Charm',
            ],
        },
    ),
    createSpell(
        'match_to_needle_transfiguration',
        'Acufors',
        '火柴变针',
        'Match-to-Needle Transfiguration',
        'transfiguration',
        '将火柴变形成针。',
        'Transfigure a match into a needle.',
        1,
        'elementary',
        {
            target: 'object',
            subject:
                'Transfiguration',
            sourceTier:
                'game_extension_canon_gap',
            sourceUrl:
                'https://www.harrypotter.com/features/magical-spells-we-first-learned-in-philosophers-stone',
            aliases: [
                'Match-to-Needle Exercise',
                'Match to Needle Exercise',
                'Match-to-Needle Transfiguration',
                'Acufors',
                'transform a match into a needle',
                'alter the physical properties of this match to resemble a needle',
                '火柴变针',
                '火柴变成针',
                '将火柴变成针',
            ],
        },
    ),
    createSpell(
        'lumos',
        'Lumos',
        '荧光闪烁',
        'Wand-Lighting Charm',
        'charm',
        '点亮魔杖尖端。',
        'Light the tip of the caster\'s wand.',
        1,
        'elementary',
        {
            target: 'self',
        },
    ),
    createSpell(
        'nox',
        'Nox',
        '诺克斯',
        'Wand-Extinguishing Charm',
        'counter_charm',
        '熄灭魔杖尖端的光。',
        'Extinguish light produced by Lumos.',
        1,
        'elementary',
        {
            target: 'self',
        },
    ),
    createSpell(
        'alohomora',
        'Alohomora',
        '阿拉霍洞开',
        'Unlocking Charm',
        'charm',
        '打开未受更强防护的锁。',
        'Open a lock that is not protected by stronger magic.',
        1,
        'standard',
        {
            target: 'object',
        },
    ),
    createSpell(
        'colloportus',
        'Colloportus',
        '快快禁锢',
        'Locking Spell',
        'charm',
        '以魔法封锁门或入口。',
        'Magically seal a door or entrance.',
        1,
        'standard',
        {
            target: 'object',
        },
    ),
    createSpell(
        'reparo',
        'Reparo',
        '恢复如初',
        'Mending Charm',
        'charm',
        '修复普通损坏的物品。',
        'Repair ordinary damage to an object.',
        1,
        'standard',
        {
            target: 'object',
        },
    ),
    createSpell(
        'diffindo',
        'Diffindo',
        '四分五裂',
        'Severing Charm',
        'charm',
        '精确切开或割断目标。',
        'Cut or sever the target.',
        1,
        'standard',
        {
            target: 'object',
            risk: 'dangerous',
        },
    ),
    createSpell(
        'incendio',
        'Incendio',
        '火焰熊熊',
        'Fire-Making Spell',
        'charm',
        '点燃可燃目标或产生火焰。',
        'Create fire or ignite a combustible target.',
        1,
        'standard',
        {
            target: 'object',
            risk: 'dangerous',
        },
    ),
    createSpell(
        'locomotor_mortis',
        'Locomotor Mortis',
        '锁腿咒',
        'Leg-Locker Curse',
        'curse',
        '锁住目标双腿。',
        'Lock the target\'s legs together.',
        1,
        'standard',
        {
            target: 'person',
            opposed: true,
            risk: 'dangerous',
        },
    ),
    createSpell(
        'petrificus_totalus',
        'Petrificus Totalus',
        '统统石化',
        'Full Body-Bind Curse',
        'curse',
        '暂时束缚目标全身。',
        'Temporarily bind the target\'s whole body.',
        1,
        'advanced',
        {
            target: 'person',
            opposed: true,
            targetAttribute:
                'willpower',
            risk: 'dangerous',
        },
    ),
    createSpell(
        'expelliarmus',
        'Expelliarmus',
        '除你武器',
        'Disarming Charm',
        'charm',
        '击飞目标手中的武器或魔杖。',
        'Knock a weapon or wand from the target\'s hand.',
        2,
        'standard',
        {
            target: 'person',
            opposed: true,
            aliases: [
                'Disarming Charm',
            ],
        },
    ),
    createSpell(
        'rictusempra',
        'Rictusempra',
        '咧嘴呼啦啦',
        'Tickling Charm',
        'charm',
        '使目标无法控制地发笑。',
        'Make the target laugh uncontrollably.',
        2,
        'standard',
        {
            target: 'person',
            opposed: true,
        },
    ),
    createSpell(
        'tarantallegra',
        'Tarantallegra',
        '塔朗泰拉舞',
        'Dancing Feet Spell',
        'jinx',
        '迫使目标双腿不断跳舞。',
        'Force the target\'s legs to dance.',
        2,
        'standard',
        {
            target: 'person',
            opposed: true,
        },
    ),
    createSpell(
        'engorgio',
        'Engorgio',
        '速速变大',
        'Engorgement Charm',
        'charm',
        '使目标体积增大。',
        'Increase the target\'s size.',
        2,
        'standard',
    ),
    createSpell(
        'reducio',
        'Reducio',
        '速速缩小',
        'Shrinking Charm',
        'counter_charm',
        '缩小目标或抵消膨胀咒。',
        'Shrink a target or counter Engorgio.',
        2,
        'standard',
    ),
    createSpell(
        'finite_incantatem',
        'Finite Incantatem',
        '咒立停',
        'General Counter-Spell',
        'counter_charm',
        '终止可被解除的持续魔法。',
        'End ongoing magic that can be countered.',
        2,
        'advanced',
        {
            target: 'effect',
            aliases: [
                'Finite',
            ],
        },
    ),
    createSpell(
        'scourgify',
        'Scourgify',
        '清理一新',
        'Scouring Charm',
        'charm',
        '清除污垢或普通残留物。',
        'Clean dirt and ordinary residue.',
        2,
        'elementary',
    ),
    createSpell(
        'sonorus',
        'Sonorus',
        '声音洪亮',
        'Amplifying Charm',
        'charm',
        '放大施法者的声音。',
        'Amplify the caster\'s voice.',
        2,
        'standard',
        {
            target: 'self',
        },
    ),
    createSpell(
        'quietus',
        'Quietus',
        '悄声细语',
        'Quietening Charm',
        'counter_charm',
        '恢复被放大的声音。',
        'Return an amplified voice to normal.',
        2,
        'elementary',
        {
            target: 'self',
        },
    ),
    createSpell(
        'serpensortia',
        'Serpensortia',
        '乌龙出洞',
        'Snake Summons Spell',
        'conjuration',
        '召唤一条蛇。',
        'Conjure a snake.',
        2,
        'advanced',
        {
            target: 'area',
            risk: 'dangerous',
            subject:
                'Defence Against the Dark Arts',
        },
    ),
    createSpell(
        'obliviate',
        'Obliviate',
        '一忘皆空',
        'Memory Charm',
        'charm',
        '修改或抹除目标记忆。',
        'Alter or erase the target\'s memories.',
        2,
        'expert',
        {
            target: 'person',
            opposed: true,
            targetAttribute:
                'willpower',
            risk: 'dark',
            legality: 'restricted',
        },
    ),
    createSpell(
        'riddikulus',
        'Riddikulus',
        '滑稽滑稽',
        'Boggart-Banishing Charm',
        'charm',
        '借助幽默改变博格特的形态。',
        'Use humour to transform and repel a boggart.',
        3,
        'advanced',
        {
            target: 'creature',
            subject:
                'Defence Against the Dark Arts',
        },
    ),
    createSpell(
        'impervius',
        'Impervius',
        '防水防湿',
        'Impervius Charm',
        'charm',
        '使表面排斥水和部分杂质。',
        'Make a surface repel water and some debris.',
        3,
        'standard',
    ),
    createSpell(
        'waddiwasi',
        'Waddiwasi',
        '瓦迪瓦西',
        'Projectile Jinx',
        'jinx',
        '高速弹射小型物体。',
        'Launch a small object at high speed.',
        3,
        'standard',
        {
            target: 'object',
            risk: 'dangerous',
        },
    ),
    createSpell(
        'mobilicorpus',
        'Mobilicorpus',
        '僵尸飘行',
        'Body-Levitation Spell',
        'charm',
        '悬浮并移动失去行动能力的身体。',
        'Levitate and move an incapacitated body.',
        3,
        'advanced',
        {
            target: 'person',
        },
    ),
    createSpell(
        'expecto_patronum',
        'Expecto Patronum',
        '呼神护卫',
        'Patronus Charm',
        'charm',
        '以强烈的快乐记忆召唤守护神。',
        'Conjure a Patronus from a powerful happy memory.',
        3,
        'extreme',
        {
            target: 'area',
            subject:
                'Defence Against the Dark Arts',
            learningMode:
                'special_instruction',
        },
    ),
    createSpell(
        'accio',
        'Accio',
        '飞来咒',
        'Summoning Charm',
        'charm',
        '把明确想象的物体召至施法者。',
        'Summon a clearly visualised object to the caster.',
        4,
        'advanced',
        {
            target: 'object',
        },
    ),
    createSpell(
        'depulso',
        'Depulso',
        '退敌三尺',
        'Banishing Charm',
        'charm',
        '把目标推离施法者。',
        'Banish or push the target away.',
        4,
        'advanced',
    ),
    createSpell(
        'protego',
        'Protego',
        '盔甲护身',
        'Shield Charm',
        'charm',
        '形成短暂魔法屏障。',
        'Create a temporary magical shield.',
        4,
        'advanced',
        {
            target: 'self',
            subject:
                'Defence Against the Dark Arts',
        },
    ),
    createSpell(
        'stupefy',
        'Stupefy',
        '昏昏倒地',
        'Stunning Spell',
        'charm',
        '使目标失去意识。',
        'Render the target unconscious.',
        4,
        'advanced',
        {
            target: 'person',
            opposed: true,
            targetAttribute:
                'agility',
            risk: 'dangerous',
            subject:
                'Defence Against the Dark Arts',
        },
    ),
    createSpell(
        'rennervate',
        'Rennervate',
        '快快复苏',
        'Reviving Spell',
        'counter_charm',
        '唤醒被昏迷咒击倒的目标。',
        'Revive a target stunned into unconsciousness.',
        4,
        'advanced',
        {
            target: 'person',
        },
    ),
    createSpell(
        'reducto',
        'Reducto',
        '粉身碎骨',
        'Reductor Curse',
        'curse',
        '粉碎或炸裂坚固物体。',
        'Break a solid object into pieces.',
        4,
        'advanced',
        {
            target: 'object',
            risk: 'dangerous',
        },
    ),
    createSpell(
        'relashio',
        'Relashio',
        '力松劲泄',
        'Revulsion Jinx',
        'jinx',
        '迫使目标松开抓握。',
        'Force a target to release its grip.',
        4,
        'advanced',
        {
            target: 'person',
            opposed: true,
        },
    ),
    createSpell(
        'furnunculus',
        'Furnunculus',
        '火烤热辣辣',
        'Pimple Jinx',
        'jinx',
        '使目标长出疼痛疖子。',
        'Cover the target in painful boils.',
        4,
        'standard',
        {
            target: 'person',
            opposed: true,
        },
    ),
    createSpell(
        'densaugeo',
        'Densaugeo',
        '门牙赛大棒',
        'Teeth-Engorgement Spell',
        'hex',
        '使目标牙齿不断变长。',
        'Make the target\'s teeth grow rapidly.',
        4,
        'standard',
        {
            target: 'person',
            opposed: true,
        },
    ),
    createSpell(
        'impedimenta',
        'Impedimenta',
        '障碍重重',
        'Impediment Jinx',
        'jinx',
        '减速、阻挡或击退目标。',
        'Slow, stop, or knock back the target.',
        4,
        'advanced',
        {
            target: 'person',
            opposed: true,
            targetAttribute:
                'agility',
        },
    ),
    createSpell(
        'silencio',
        'Silencio',
        '无声无息',
        'Silencing Charm',
        'charm',
        '暂时消除目标发出的声音。',
        'Temporarily silence the target.',
        5,
        'advanced',
        {
            target: 'person',
            opposed: true,
            targetAttribute:
                'willpower',
        },
    ),
    createSpell(
        'confundo',
        'Confundo',
        '混淆视听',
        'Confundus Charm',
        'charm',
        '扰乱目标的判断与感知。',
        'Confuse the target\'s judgement and perception.',
        5,
        'advanced',
        {
            target: 'person',
            opposed: true,
            targetAttribute:
                'willpower',
            risk: 'dangerous',
        },
    ),
    createSpell(
        'evanesco',
        'Evanesco',
        '消隐无踪',
        'Vanishing Spell',
        'transfiguration',
        '使目标物体消失。',
        'Vanish the target object.',
        5,
        'advanced',
        {
            target: 'object',
            subject:
                'Transfiguration',
        },
    ),
    createSpell(
        'aguamenti',
        'Aguamenti',
        '清水如泉',
        'Water-Making Spell',
        'conjuration',
        '从魔杖尖端产生清水。',
        'Produce clean water from the wand.',
        6,
        'advanced',
    ),
    createSpell(
        'avis',
        'Avis',
        '飞鸟群群',
        'Bird-Conjuring Charm',
        'conjuration',
        '召唤一群小鸟。',
        'Conjure a flock of small birds.',
        6,
        'advanced',
    ),
    createSpell(
        'oppugno',
        'Oppugno',
        '万弹齐发',
        'Oppugno Jinx',
        'jinx',
        '命令已控制的物体或生物攻击目标。',
        'Command controlled objects or creatures to attack.',
        6,
        'advanced',
        {
            target: 'person',
            opposed: true,
            risk: 'dangerous',
        },
    ),
    createSpell(
        'muffliato',
        'Muffliato',
        '闭耳塞听',
        'Muffliato Charm',
        'charm',
        '以嗡鸣声阻止附近的人偷听。',
        'Fill nearby ears with buzzing to prevent eavesdropping.',
        6,
        'advanced',
        {
            target: 'area',
            learningMode:
                'self_study',
        },
    ),
    createSpell(
        'levicorpus',
        'Levicorpus',
        '倒挂金钟',
        'Levicorpus Jinx',
        'jinx',
        '倒吊目标脚踝。',
        'Suspend the target upside down by an ankle.',
        6,
        'advanced',
        {
            target: 'person',
            opposed: true,
            learningMode:
                'self_study',
            risk: 'dangerous',
        },
    ),
    createSpell(
        'liberacorpus',
        'Liberacorpus',
        '金钟落地',
        'Levicorpus Counter-Jinx',
        'counter_charm',
        '解除倒挂金钟。',
        'Release a target from Levicorpus.',
        6,
        'standard',
        {
            target: 'person',
            learningMode:
                'self_study',
        },
    ),
    createSpell(
        'episkey',
        'Episkey',
        '愈合如初',
        'Healing Spell',
        'healing',
        '治疗轻微创伤。',
        'Heal a minor injury.',
        6,
        'expert',
        {
            target: 'person',
            risk: 'dangerous',
            learningMode:
                'special_instruction',
        },
    ),
    createSpell(
        'anapneo',
        'Anapneo',
        '安咳消',
        'Airway-Clearing Spell',
        'healing',
        '清除目标呼吸道阻塞。',
        'Clear an obstruction from the target\'s airway.',
        6,
        'expert',
        {
            target: 'person',
            risk: 'dangerous',
            learningMode:
                'special_instruction',
        },
    ),
    createSpell(
        'tergeo',
        'Tergeo',
        '旋风扫净',
        'Wiping Spell',
        'charm',
        '吸走液体或清除表面污物。',
        'Siphon liquid or wipe a surface clean.',
        6,
        'standard',
    ),
    createSpell(
        'homenum_revelio',
        'Homenum Revelio',
        '人形显身',
        'Human-Presence-Revealing Spell',
        'charm',
        '探测附近是否有人。',
        'Reveal human presence nearby.',
        6,
        'expert',
        {
            target: 'area',
        },
    ),
    createSpell(
        'sectumsempra',
        'Sectumsempra',
        '神锋无影',
        'Laceration Curse',
        'curse',
        '造成深重切割伤。',
        'Inflict severe slashing wounds.',
        6,
        'extreme',
        {
            target: 'person',
            opposed: true,
            risk: 'dark',
            legality: 'restricted',
            learningMode:
                'self_study',
        },
    ),
    createSpell(
        'protego_totalum',
        'Protego Totalum',
        '统统加护',
        'Area Shield Charm',
        'charm',
        '为一片区域提供持续防护。',
        'Place sustained protection around an area.',
        7,
        'expert',
        {
            target: 'area',
            learningMode:
                'independent',
        },
    ),
    createSpell(
        'salvio_hexia',
        'Salvio Hexia',
        '平安镇守',
        'Protective Enchantment',
        'charm',
        '加强区域对恶咒的防护。',
        'Strengthen an area against hostile hexes.',
        7,
        'expert',
        {
            target: 'area',
            learningMode:
                'independent',
        },
    ),
    createSpell(
        'cave_inimicum',
        'Cave Inimicum',
        '降敌陷阱',
        'Intruder-Detection Enchantment',
        'charm',
        '警戒或暴露接近防区的敌人。',
        'Warn of or expose enemies approaching a protected area.',
        7,
        'expert',
        {
            target: 'area',
            learningMode:
                'independent',
        },
    ),
    createSpell(
        'repello_muggletum',
        'Repello Muggletum',
        '麻瓜驱逐咒',
        'Muggle-Repelling Charm',
        'charm',
        '阻止麻瓜接近被保护区域。',
        'Repel Muggles from a protected area.',
        7,
        'expert',
        {
            target: 'area',
            learningMode:
                'independent',
        },
    ),
    createSpell(
        'prior_incantato',
        'Prior Incantato',
        '闪回前咒',
        'Reverse Spell Effect',
        'charm',
        '显现魔杖最近施放的咒语。',
        'Reveal the most recent spell cast by a wand.',
        7,
        'expert',
        {
            target: 'object',
            learningMode:
                'special_instruction',
        },
    ),
    createSpell(
        'deletrius',
        'Deletrius',
        '消隐',
        'Eradication Spell',
        'counter_charm',
        '清除闪回前咒形成的影像。',
        'Dismiss an image produced by Prior Incantato.',
        7,
        'advanced',
        {
            target: 'effect',
            learningMode:
                'special_instruction',
        },
    ),
    createSpell(
        'morsmordre',
        'Morsmordre',
        '尸骨再现',
        'Dark Mark Spell',
        'curse',
        '在空中召唤黑魔标记。',
        'Conjure the Dark Mark in the sky.',
        0,
        'extreme',
        {
            target: 'area',
            risk: 'dark',
            legality: 'illegal',
            learningMode:
                'forbidden',
        },
    ),
    createSpell(
        'crucio',
        'Crucio',
        '钻心剜骨',
        'Cruciatus Curse',
        'curse',
        '对目标施加极端痛苦。',
        'Inflict extreme pain on the target.',
        0,
        'extreme',
        {
            target: 'person',
            opposed: true,
            targetAttribute:
                'willpower',
            risk: 'unforgivable',
            legality: 'unforgivable',
            learningMode:
                'forbidden',
        },
    ),
    createSpell(
        'imperio',
        'Imperio',
        '魂魄出窍',
        'Imperius Curse',
        'curse',
        '强迫目标服从施法者意志。',
        'Force the target to obey the caster.',
        0,
        'extreme',
        {
            target: 'person',
            opposed: true,
            targetAttribute:
                'willpower',
            risk: 'unforgivable',
            legality: 'unforgivable',
            learningMode:
                'forbidden',
        },
    ),
    createSpell(
        'avada_kedavra',
        'Avada Kedavra',
        '阿瓦达索命',
        'Killing Curse',
        'curse',
        '在意图与魔力足够时杀死目标。',
        'Kill the target when backed by sufficient intent and power.',
        0,
        'extreme',
        {
            target: 'person',
            opposed: true,
            targetAttribute:
                'willpower',
            risk: 'unforgivable',
            legality: 'unforgivable',
            learningMode:
                'forbidden',
        },
    ),
]);

export const SPELL_CATALOG_BY_ID =
    new Map(
        SPELL_CATALOG.map(
            spell => [
                spell.id,
                spell,
            ],
        ),
    );

export const SPELL_PROFICIENCY_RANKS =
    Object.freeze([
        Object.freeze({
            id: 'novice',
            minimumXp: 0,
            modifier: -1,
        }),
        Object.freeze({
            id: 'practiced',
            minimumXp: 20,
            modifier: 0,
        }),
        Object.freeze({
            id: 'proficient',
            minimumXp: 60,
            modifier: 1,
        }),
        Object.freeze({
            id: 'mastered',
            minimumXp: 140,
            modifier: 2,
        }),
        Object.freeze({
            id: 'expert',
            minimumXp: 300,
            modifier: 3,
        }),
    ]);

export const SPELL_LEARNING_SOURCE_LABELS =
    Object.freeze({
        class: 'class',
        prior_schooling:
            'prior_schooling',
        self_study: 'self_study',
        experiment: 'experiment',
        special_instruction:
            'special_instruction',
    });

Object.assign(
    spellStaticLocaleEn,
    {
        'spell.rank.novice':
            'Novice',
        'spell.rank.practiced':
            'Practiced',
        'spell.rank.proficient':
            'Proficient',
        'spell.rank.mastered':
            'Mastered',
        'spell.rank.expert':
            'Expert',
        'spell.source.class':
            'Class instruction',
        'spell.source.prior_schooling':
            'Prior schooling',
        'spell.source.self_study':
            'Self-study',
        'spell.source.experiment':
            'Experiment',
        'spell.source.special_instruction':
            'Private instruction',
    },
);
Object.assign(
    spellStaticLocaleZhCn,
    {
        'spell.rank.novice': '初学',
        'spell.rank.practiced':
            '练习中',
        'spell.rank.proficient':
            '熟练',
        'spell.rank.mastered': '精通',
        'spell.rank.expert': '专家',
        'spell.source.class':
            '课堂教学',
        'spell.source.prior_schooling':
            '过往课程',
        'spell.source.self_study':
            '自行学习',
        'spell.source.experiment':
            '自行实验',
        'spell.source.special_instruction':
            '私下教授',
    },
);

export const SPELL_STATIC_LOCALE_EN =
    Object.freeze({
        ...spellStaticLocaleEn,
    });
export const SPELL_STATIC_LOCALE_ZH_CN =
    Object.freeze({
        ...spellStaticLocaleZhCn,
    });

function normalizeSpellId(
    value,
) {
    return String(value || '')
        .trim()
        .toLocaleLowerCase()
        .replace(
            /[^a-z0-9_]+/g,
            '_',
        )
        .replace(
            /^_+|_+$/g,
            '',
        );
}

export function normalizeCustomSpellDefinition(
    source,
    index = 0,
) {
    if (
        !source ||
        typeof source !==
            'object' ||
        Array.isArray(source)
    ) {
        return null;
    }
    const incantation =
        String(
            source.incantation ||
            '',
        )
            .normalize('NFKC')
            .replace(/\s+/gu, ' ')
            .trim()
            .slice(0, 80);
    if (!incantation) {
        return null;
    }
    const fallbackId =
        `custom_${
            normalizeSpellId(
                incantation,
            ) ||
            `spell_${index + 1}`
        }`;
    const id =
        normalizeSpellId(
            source.id ||
            fallbackId,
        );
    if (
        !/^custom_[a-z0-9_]{1,72}$/u
            .test(id)
    ) {
        return null;
    }
    const difficulty =
        Object.hasOwn(
            DIFFICULTY_ADJUSTMENTS,
            source.difficulty,
        )
            ? source.difficulty
            : 'standard';
    return {
        id,
        incantation,
        nameEn:
            String(
                source.nameEn ||
                `Custom Spell · ${incantation}`,
            ).slice(0, 120),
        category:
            String(
                source.category ||
                'custom',
            ).slice(0, 48),
        effectEn:
            String(
                source.effectEn ||
                'Its effect is defined by the accepted narrative evidence.',
            ).slice(0, 300),
        curriculumYear: 0,
        subject:
            String(
                source.subject ||
                'Independent Magic',
            ).slice(0, 80),
        difficulty,
        dcAdjustment:
            DIFFICULTY_ADJUSTMENTS[
                difficulty
            ],
        target:
            [
                'self',
                'person',
                'creature',
                'object',
                'effect',
                'area',
            ].includes(
                source.target,
            )
                ? source.target
                : 'object',
        opposed:
            source.opposed ===
            true,
        targetAttribute:
            String(
                source
                    .targetAttribute ||
                'willpower',
            ),
        risk:
            String(
                source.risk ||
                'unknown',
            ),
        legality:
            String(
                source.legality ||
                'unknown',
            ),
        learningMode:
            'independent',
        sourceTier:
            'player_confirmed_custom',
        incantationKnown:
            true,
        sourceUrl: '',
        aliases: [
            ...new Set([
                incantation,
                ...(
                    Array.isArray(
                        source.aliases,
                    )
                        ? source.aliases
                        : []
                ),
            ]),
        ]
            .map(value =>
                String(value || '')
                    .trim())
            .filter(Boolean)
            .slice(0, 16),
        custom: true,
    };
}

export function getSpellDefinitions(
    source = null,
) {
    const known =
        Array.isArray(source)
            ? source
            : source?.spellbook
                ?.known ||
                source?.known ||
                [];
    const custom =
        (
            Array.isArray(known)
                ? known
                : []
        )
            .map(
                (
                    entry,
                    index,
                ) =>
                    normalizeCustomSpellDefinition(
                        entry
                            ?.definition,
                        index,
                    ),
            )
            .filter(Boolean);
    const byId =
        new Map(
            SPELL_CATALOG.map(spell => [
                spell.id,
                spell,
            ]),
        );
    custom.forEach(spell =>
        byId.set(
            spell.id,
            spell,
        ));
    return [
        ...byId.values(),
    ];
}

export function getSpellDefinition(
    spellId,
    source = null,
) {
    const normalizedId =
        normalizeSpellId(
            spellId,
        );
    return (
        SPELL_CATALOG_BY_ID.get(
            normalizedId,
        ) ||
        getSpellDefinitions(
            source,
        ).find(spell =>
            spell.id ===
            normalizedId) ||
        null
    );
}

export function createSpellDirective(
    spellId,
    source = null,
) {
    const spell =
        getSpellDefinition(
            spellId,
            source,
        );
    return spell
        ? `${SPELL_DIRECTIVE_PREFIX}【咒语:${spell.id}】`
        : '';
}

export function parseSpellCastDirectives(
    text,
    source = null,
) {
    const pattern =
        /(?:✦\s*)?【\s*咒语\s*:\s*([a-z0-9_]+)\s*】/giu;
    const casts = [];
    const seen = new Set();
    for (
        const match of String(
            text ||
            '',
        ).matchAll(pattern)
    ) {
        const spell =
            getSpellDefinition(
                match[1],
                source,
            );
        if (
            !spell ||
            seen.has(spell.id)
        ) {
            continue;
        }
        seen.add(spell.id);
        casts.push({
            spellId:
                spell.id,
            incantation:
                spell.incantation,
            marker:
                match[0],
            index:
                match.index,
        });
    }
    return casts;
}

export function removeSpellCastDirectives(
    text,
) {
    return String(text || '')
        .replace(
            /(?:✦\s*)?【\s*咒语\s*:\s*[a-z0-9_]+\s*】/giu,
            '',
        )
        .replace(
            /[ \t]{2,}/g,
            ' ',
        )
        .trim();
}

function escapeRegExp(
    value,
) {
    return String(value || '')
        .replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&',
        );
}

export function findSpellReferences(
    text,
    definitionsSource = null,
) {
    const textSource =
        String(text || '');
    return getSpellDefinitions(
        definitionsSource,
    )
        .filter(spell =>
            [
                spell.incantation,
                ...spell.aliases,
            ]
                .filter(Boolean)
                .some(alias =>
                    new RegExp(
                        `(?<![\\p{L}\\p{N}_])${escapeRegExp(alias)}(?![\\p{L}\\p{N}_])`,
                        'iu',
                    ).test(textSource)))
        .sort((left, right) =>
            left.curriculumYear -
            right.curriculumYear ||
            left.incantation
                .localeCompare(
                    right.incantation,
                ));
}

export function getSpellProficiency(
    xp,
) {
    const value =
        Math.max(
            0,
            Math.floor(
                Number(xp) ||
                0,
            ),
        );
    return [
        ...SPELL_PROFICIENCY_RANKS,
    ]
        .reverse()
        .find(rank =>
            value >=
            rank.minimumXp) ||
        SPELL_PROFICIENCY_RANKS[0];
}

export function normalizeKnownSpell(
    entry,
    index = 0,
) {
    const source =
        typeof entry ===
            'string'
            ? {
                spellId:
                    entry,
            }
            : entry ||
            {};
    const customDefinition =
        normalizeCustomSpellDefinition(
            source.definition,
            index,
        );
    const spell =
        SPELL_CATALOG_BY_ID.get(
            normalizeSpellId(
                source.spellId ||
                source.id,
            ),
        ) ||
        (
            customDefinition?.id ===
                normalizeSpellId(
                    source.spellId ||
                    source.id,
                )
                ? customDefinition
                : null
        );
    if (!spell) {
        return null;
    }
    const xp =
        Math.max(
            0,
            Math.floor(
                Number(
                    source
                        .proficiencyXp ||
                    0,
                ),
            ),
        );
    const rank =
        getSpellProficiency(
            xp,
        );
    return {
        spellId:
            spell.id,
        learnedSource:
            source.learnedSource ||
            'experiment',
        learnedSourceDetail:
            String(
                source
                    .learnedSourceDetail ||
                '',
            ),
        firstLearnedClock:
            source.firstLearnedClock ||
            '',
        firstLearnedTurn:
            Math.max(
                0,
                Number(
                    source
                        .firstLearnedTurn ||
                    0,
                ),
            ),
        lastPracticedClock:
            source.lastPracticedClock ||
            '',
        lastPracticedTurn:
            Math.max(
                0,
                Number(
                    source
                        .lastPracticedTurn ||
                    0,
                ),
            ),
        attempts:
            Math.max(
                0,
                Number(
                    source.attempts ||
                    0,
                ),
            ),
        successes:
            Math.max(
                0,
                Number(
                    source.successes ||
                    0,
                ),
            ),
        criticalSuccesses:
            Math.max(
                0,
                Number(
                    source
                        .criticalSuccesses ||
                    0,
                ),
            ),
        failures:
            Math.max(
                0,
                Number(
                    source.failures ||
                    0,
                ),
            ),
        proficiencyXp:
            xp,
        proficiencyRank:
            rank.id,
        sortOrder:
            Number(
                source.sortOrder ??
                index,
            ),
        ...(customDefinition
            ? {
                definition:
                    customDefinition,
            }
            : {}),
    };
}

export function createInitialSpellbook(
    grade = 1,
    clock = '',
) {
    const currentGrade =
        Math.max(
            1,
            Math.min(
                7,
                Number(grade) ||
                1,
            ),
        );
    const known =
        SPELL_CATALOG
            .filter(spell =>
                spell.learningMode ===
                    'curriculum' &&
                spell.curriculumYear >
                    0 &&
                spell.curriculumYear <
                    currentGrade &&
                spell.legality ===
                    'permitted')
            .map(
                (spell, index) =>
                    normalizeKnownSpell({
                        spellId:
                            spell.id,
                        learnedSource:
                            'prior_schooling',
                        learnedSourceDetail:
                            `Completed year ${spell.curriculumYear} curriculum.`,
                        firstLearnedClock:
                            clock,
                        proficiencyXp:
                            30,
                        sortOrder:
                            index,
                    }),
            );
    return {
        version:
            SPELL_CATALOG_VERSION,
        known,
        lastUpdatedClock:
            clock,
        lastScannedMessageId:
            -1,
    };
}

export function normalizeSpellbook(
    spellbook,
    {
        grade = 1,
        clock = '',
    } = {},
) {
    const initial =
        createInitialSpellbook(
            grade,
            clock,
        );
    const source =
        spellbook &&
        typeof spellbook ===
            'object' &&
        !Array.isArray(
            spellbook,
        )
            ? spellbook
            : initial;
    const knownById =
        new Map();
    [
        ...initial.known,
        ...(
            Array.isArray(
                source.known,
            )
                ? source.known
                : []
        ),
    ]
        .map(
            normalizeKnownSpell,
        )
        .filter(Boolean)
        .forEach(entry => {
            const existing =
                knownById.get(
                    entry.spellId,
                );
            knownById.set(
                entry.spellId,
                existing &&
                existing.proficiencyXp >
                    entry.proficiencyXp
                    ? existing
                    : entry,
            );
        });
    return {
        version:
            SPELL_CATALOG_VERSION,
        known: [
            ...knownById.values(),
        ].sort((left, right) =>
            left.sortOrder -
            right.sortOrder ||
            left.spellId
                .localeCompare(
                    right.spellId,
                )),
        lastUpdatedClock:
            source.lastUpdatedClock ||
            clock,
        lastScannedMessageId:
            Math.max(
                -1,
                Number(
                    source
                        .lastScannedMessageId ??
                    -1,
                ),
            ),
    };
}
