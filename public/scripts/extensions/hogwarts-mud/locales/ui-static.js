import {
    UI_SETUP_STATIC_LOCALE_EN,
    UI_SETUP_STATIC_LOCALE_ZH_CN,
} from './ui-setup-static.js';
import {
    UI_CALENDAR_STATIC_LOCALE_EN,
    UI_CALENDAR_STATIC_LOCALE_ZH_CN,
} from './ui-calendar-static.js';
import {
    UI_INSPECTOR_STATIC_LOCALE_EN,
    UI_INSPECTOR_STATIC_LOCALE_ZH_CN,
} from './ui-inspector-static.js';
import {
    UI_GAME_STATIC_LOCALE_EN,
    UI_GAME_STATIC_LOCALE_ZH_CN,
} from './ui-game-static.js';
import {
    UI_SETTINGS_STATIC_LOCALE_EN,
    UI_SETTINGS_STATIC_LOCALE_ZH_CN,
} from './ui-settings-static.js';

const UI_TEXT = Object.freeze({
    'ui.nav.calendar': {
        en: 'Calendar',
        zh: '日历',
    },
    'ui.nav.relationships': {
        en: 'Relationships',
        zh: '关系星图',
    },
    'ui.nav.focus': {
        en: 'Focus',
        zh: '专注',
    },
    'ui.nav.more': {
        en: 'More',
        zh: '更多',
    },
    'ui.nav.archive_hall': {
        en: 'Archive Hall',
        zh: '档案大厅',
    },
    'ui.nav.settings': {
        en: 'Settings',
        zh: '配置',
    },
    'ui.nav.ai_settings': {
        en: 'AI Settings',
        zh: 'AI 配置',
    },
    'ui.nav.character_sheet': {
        en: 'Character Sheet',
        zh: '人物卡',
    },
    'ui.nav.show_scene': {
        en: 'Show scene panel',
        zh: '显示场景栏',
    },
    'ui.nav.open_character': {
        en: 'Open character status',
        zh: '打开角色状态',
    },
    'ui.settings.display_language': {
        en: 'Display language',
        zh: '显示语言',
    },
    'ui.settings.default_translation': {
        en: 'Default translation',
        zh: '默认翻译',
    },
    'ui.settings.translation_source': {
        en: 'Default translation source',
        zh: '默认翻译源',
    },
    'ui.translation.local': {
        en: 'Local 4B',
        zh: '本地 4B',
    },
    'ui.translation.off': {
        en: 'Off',
        zh: '不开',
    },
    'ui.map.world_aria': {
        en: 'British Wizarding World locations and routes',
        zh: '英国魔法世界地点与路线图',
    },
    'ui.map.local_aria_suffix': {
        en: 'MUD map',
        zh: 'MUD 地图',
    },
    'ui.map.legend.current': {
        en: 'Current location',
        zh: '当前位置',
    },
    'ui.map.legend.discovered': {
        en: 'Discovered',
        zh: '已发现',
    },
    'ui.map.legend.known': {
        en: 'Mapped',
        zh: '地图已知',
    },
    'ui.map.legend.generated': {
        en: 'World-generated',
        zh: '世界生成',
    },
    'ui.map.legend.player': {
        en: 'Player',
        zh: '玩家',
    },
    'ui.map.legend.actor': {
        en: 'Character',
        zh: '人物',
    },
    'ui.map.legend.fixed_room': {
        en: 'Fixed room',
        zh: '固定房间',
    },
    'ui.map.legend.hidden_secret': {
        en: 'Undiscovered secret',
        zh: '未发现秘密',
    },
    'ui.map.scope.follow_current': {
        en: 'Follow current location',
        zh: '跟随当前位置',
    },
    'ui.map.scope.world': {
        en: 'British Wizarding World Overview',
        zh: '英国魔法世界总览',
    },
    'ui.map.nodes': {
        en: 'nodes',
        zh: '节点',
    },
    'ui.map.pending.home_title': {
        en: 'Generating the home Scene',
        zh: '家庭场景生成中',
    },
    'ui.map.pending.home_detail': {
        en: 'Rooms and exits become fixed after rules validation',
        zh: '房间与出口将在规则校验后固化',
    },
    'ui.map.expand_aria': {
        en: 'Expand world map',
        zh: '展开世界地图',
    },
    'ui.map.expansion.invalid_trigger': {
        en: 'Invalid Map calculation trigger.',
        zh: '无效的地图演算触发条件。',
    },
    'ui.map.expansion.missing_profile': {
        en: 'Configure a high-tier World Director Connection Profile first.',
        zh: '未配置高档“世界导演”Connection Profile。',
    },
    'ui.map.expansion.running': {
        en: 'Calculating world structure...',
        zh: '世界演算中…',
    },
    'ui.map.expansion.language_skipped': {
        en: 'The Map proposal was not written to world State.',
        zh: '地图提案未写入世界状态。',
    },
    'ui.map.expansion.rejected': {
        en: 'The rules layer rejected the Map proposal',
        zh: '地图提案被规则层拒绝',
    },
    'ui.map.expansion.committed': {
        en: 'The World Director Map proposal passed validation and was committed.',
        zh: '世界导演的地图提案已通过校验并提交。',
    },
    'ui.map.inspector.scope_aria': {
        en: 'Map location',
        zh: '地图地点',
    },
    'ui.map.inspector.level_aria': {
        en: 'Map level',
        zh: '地图楼层',
    },
    'ui.map.inspector.location': {
        en: 'Location',
        zh: '地点',
    },
    'ui.map.inspector.fixed_topology': {
        en: 'Fixed topology',
        zh: '固定拓扑',
    },
    'ui.map.inspector.runtime_differences': {
        en: 'Runtime stores only structural differences',
        zh: '运行时只保存结构差异',
    },
    'ui.map.inspector.recalculate': {
        en: 'Request structural impact calculation',
        zh: '申请结构影响演算',
    },
    'ui.map.inspector.world_director': {
        en: 'World Director',
        zh: '世界导演',
    },
    'ui.setup.review.map_scope_aria': {
        en: 'Preview location map',
        zh: '预览地点地图',
    },
    'ui.setup.review.map_level_aria': {
        en: 'Preview map level',
        zh: '预览地图楼层',
    },
    'ui.setup.review.map_aria': {
        en: 'Preset world map',
        zh: '预设世界地图',
    },
    'ui.home.aria': {
        en: 'Hogwarts MUD Archive Hall',
        zh: 'Hogwarts MUD 档案大厅',
    },
    'ui.home.title': {
        en: 'Choose a story blueprint',
        zh: '选择故事剧本',
    },
    'ui.home.description': {
        en: 'Choose where you enter magical history. Canon supplies initial conditions, not protected outcomes.',
        zh: '决定你从魔法史的哪个位置进入。开局之后，原著只提供初始条件。',
    },
    'ui.home.campaign_group': {
        en: 'Story blueprint',
        zh: '故事剧本',
    },
    'ui.home.start_year': {
        en: 'Starting year',
        zh: '开局年份',
    },
    'ui.home.start_grade': {
        en: 'Starting grade',
        zh: '起始年级',
    },
    'ui.home.world_difficulty': {
        en: 'World difficulty',
        zh: '世界难度',
    },
    'ui.home.new_timeline': {
        en: 'Create new timeline',
        zh: '建立新时间线',
    },
    'ui.home.load_archive': {
        en: 'Load archive',
        zh: '读取旧档案',
    },
    'ui.home.select_timeline': {
        en: 'Choose a timeline',
        zh: '选择一条时间线',
    },
    'ui.home.refresh_archives': {
        en: 'Refresh archives',
        zh: '刷新存档',
    },
    'ui.home.archive_footer': {
        en: 'Continue every timeline here without returning to the tavern',
        zh: '所有时间线都在这里继续，无需返回酒馆',
    },
    'ui.home.campaign.canon_1991.summary': {
        en: 'Begin with the Hogwarts letter',
        zh: '从入学通知开始',
    },
    'ui.home.campaign.hogwarts_student.summary': {
        en: 'Choose any school year',
        zh: '自选年级与年份',
    },
    'ui.home.campaign.marauders_era.summary': {
        en: 'Before the shadow of war',
        zh: '战争阴影形成之前',
    },
    'ui.home.difficulty.narrative.summary': {
        en: 'Danger escalates slowly',
        zh: '危险升级较慢',
    },
    'ui.home.difficulty.standard.summary': {
        en: 'Full rules and consequences',
        zh: '完整规则后果',
    },
    'ui.home.difficulty.harsh.summary': {
        en: 'Permanent consequences arrive sooner',
        zh: '永久后果更早',
    },
    'ui.grade.1': {
        en: 'Year One',
        zh: '一年级',
    },
    'ui.grade.2': {
        en: 'Year Two',
        zh: '二年级',
    },
    'ui.grade.3': {
        en: 'Year Three',
        zh: '三年级',
    },
    'ui.grade.4': {
        en: 'Year Four',
        zh: '四年级',
    },
    'ui.grade.5': {
        en: 'Year Five',
        zh: '五年级',
    },
    'ui.grade.6': {
        en: 'Year Six',
        zh: '六年级',
    },
    'ui.grade.7': {
        en: 'Year Seven',
        zh: '七年级',
    },
    'ui.archive.current_timeline': {
        en: 'Current timeline',
        zh: '当前时间线',
    },
    'ui.archive.unnamed_character': {
        en: 'Unnamed character',
        zh: '未命名角色',
    },
    'ui.archive.time_unknown': {
        en: 'Time unknown',
        zh: '时间未知',
    },
    'ui.archive.records': {
        en: 'records',
        zh: '条记录',
    },
    'ui.archive.archives': {
        en: 'archives',
        zh: '个档案',
    },
    'ui.archive.loading': {
        en: 'Searching magical archives...',
        zh: '正在检索魔法档案…',
    },
    'ui.archive.empty_title': {
        en: 'No archived timelines yet',
        zh: '还没有旧档案',
    },
    'ui.archive.empty_detail': {
        en: 'Create a character and its timeline will appear here.',
        zh: '建立第一个角色后，时间线会出现在这里。',
    },
    'ui.archive.error_title': {
        en: 'Unable to read archives',
        zh: '无法读取档案',
    },
    'ui.archive.error_detail': {
        en: 'Check the tavern connection and refresh.',
        zh: '请检查酒馆连接后刷新。',
    },
    'ui.archive.read_failed': {
        en: 'Read failed',
        zh: '读取失败',
    },
    'ui.setup.aria': {
        en: 'Create character and configure world',
        zh: '创建角色与世界配置',
    },
    'ui.setup.student_file': {
        en: 'Student File',
        zh: '学生档案',
    },
    'ui.setup.steps_aria': {
        en: 'Character setup steps',
        zh: '建档步骤',
    },
    'ui.setup.step.identity': {
        en: 'Identity',
        zh: '身份',
    },
    'ui.setup.step.identity_hint': {
        en: 'Who are you?',
        zh: '你是谁',
    },
    'ui.setup.step.background': {
        en: 'Background',
        zh: '背景',
    },
    'ui.setup.step.background_hint': {
        en: 'Where are you from?',
        zh: '你从哪里来',
    },
    'ui.setup.step.aptitudes': {
        en: 'Aptitudes',
        zh: '能力',
    },
    'ui.setup.step.aptitudes_hint': {
        en: 'Talents and attributes',
        zh: '天赋与属性',
    },
    'ui.setup.step.story': {
        en: 'Story preferences',
        zh: '故事偏好',
    },
    'ui.setup.step.story_hint': {
        en: 'Relationships and pacing',
        zh: '关系与节奏',
    },
    'ui.setup.step.models': {
        en: 'Generation settings',
        zh: '生成配置',
    },
    'ui.setup.step.models_hint': {
        en: 'Presets and three AI tiers',
        zh: 'Preset 与三档 AI',
    },
    'ui.setup.step.review': {
        en: 'Confirm entry',
        zh: '确认入场',
    },
    'ui.setup.step.review_hint': {
        en: 'Character sheet and world',
        zh: '人物卡与世界',
    },
    'ui.setup.identity.kicker': {
        en: 'Volume One · Identity',
        zh: '第一卷 · 身份记录',
    },
    'ui.setup.identity.title': {
        en: 'Decide who will receive the letter',
        zh: '先决定谁将收到那封信',
    },
    'ui.setup.identity.name': {
        en: 'Name *',
        zh: '姓名 *',
    },
    'ui.setup.identity.age': {
        en: 'Age',
        zh: '年龄',
    },
    'ui.setup.identity.birth_date': {
        en: 'Fixed birth date',
        zh: '固定出生日期',
    },
    'ui.setup.identity.pronouns': {
        en: 'Gender expression / pronouns',
        zh: '性别表达 / 称谓',
    },
    'ui.setup.identity.heritage': {
        en: 'Heritage / visible cultural cues',
        zh: '族裔 / 可见文化线索',
    },
    'ui.setup.identity.appearance': {
        en: 'Appearance and current presentation',
        zh: '外貌与当前呈现',
    },
    'ui.setup.identity.original': {
        en: 'Original character',
        zh: '原创角色',
    },
    'ui.setup.identity.campaign_note': {
        en: 'The campaign configuration becomes world fact after confirmation.',
        zh: '剧本配置会在确认后成为世界事实。',
    },
    'ui.setup.identity.pronouns_placeholder': {
        en: 'For example: she / her',
        zh: '例如：她 / she',
    },
    'ui.setup.identity.heritage_placeholder': {
        en: 'For example: British Chinese; include only cues NPCs may observe or reasonably know',
        zh: '例如：英籍华裔；只写你希望 NPC 能观察或合理得知的部分',
    },
    'ui.setup.identity.appearance_placeholder': {
        en: 'Visible features such as face, skin tone, hair, build, clothing, and posture',
        zh: '五官、肤色、发型、身形、穿着、姿态等别人能够观察到的特征',
    },
    'ui.setup.background.kicker': {
        en: 'Volume Two · Family and Desire',
        zh: '第二卷 · 家庭与欲望',
    },
    'ui.setup.background.title': {
        en: 'Tell the world where you come from',
        zh: '让世界知道你从哪里来',
    },
    'ui.setup.aptitudes.kicker': {
        en: 'Volume Three · Aptitudes',
        zh: '第三卷 · 能力倾向',
    },
    'ui.setup.aptitudes.title': {
        en: 'Strengths and weaknesses must both hold',
        zh: '长处必须与短板一起成立',
    },
    'ui.setup.story.kicker': {
        en: 'Volume Four · Story Preferences',
        zh: '第四卷 · 故事偏好',
    },
    'ui.setup.story.title': {
        en: 'Choose the relationships and pacing you want to explore',
        zh: '选择你希望探索的关系与节奏',
    },
    'ui.setup.models.kicker': {
        en: 'Volume Five · Generation Settings',
        zh: '第五卷 · 生成配置',
    },
    'ui.setup.models.title': {
        en: 'Assign each responsibility to the right model',
        zh: '把三种职责交给合适的模型',
    },
    'ui.setup.review.kicker': {
        en: 'Volume Six · Fact Confirmation',
        zh: '第六卷 · 事实确认',
    },
    'ui.setup.review.title': {
        en: 'The world begins after you confirm the character sheet',
        zh: '人物卡确认后，世界才开始转动',
    },
    'ui.setup.context.title': {
        en: 'Choose a context budget; 120K is the default',
        zh: '上下文丰俭由人，默认使用 120K',
    },
    'ui.setup.context.detail': {
        en: 'System content stays compact. Available context controls memory depth, RAG results, and history.',
        zh: '系统层固定瘦身；可用预算决定记忆层数、RAG 条数与历史深度。',
    },
    'ui.setup.context.lean': {
        en: 'Lean',
        zh: '精简',
    },
    'ui.setup.context.lean_hint': {
        en: 'Low cost',
        zh: '低成本',
    },
    'ui.setup.context.balanced': {
        en: 'Standard',
        zh: '标准',
    },
    'ui.setup.context.balanced_hint': {
        en: 'Balanced',
        zh: '均衡',
    },
    'ui.setup.context.rich': {
        en: 'Rich',
        zh: '丰裕',
    },
    'ui.setup.context.rich_hint': {
        en: 'Recommended',
        zh: '推荐',
    },
    'ui.setup.profiles.title': {
        en: 'Bind complete tavern connection profiles',
        zh: '直接绑定酒馆完整连接配置',
    },
    'ui.setup.profiles.loading': {
        en: 'Loading profiles...',
        zh: '正在读取 Profile…',
    },
    'ui.setup.profiles.loaded': {
        en: 'tavern Connection Profiles loaded',
        zh: '个酒馆 Connection Profile 已读取',
    },
    'ui.setup.profiles.none': {
        en: 'No Connection Profiles exist in the tavern; create one first.',
        zh: '酒馆中还没有 Connection Profile，请先新建',
    },
    'ui.setup.profile.model': {
        en: 'Model',
        zh: '模型',
    },
    'ui.setup.context.mode': {
        en: 'mode',
        zh: '模式',
    },
    'ui.setup.context.input': {
        en: 'Input',
        zh: '输入',
    },
    'ui.setup.context.output': {
        en: 'Output headroom',
        zh: '输出余量',
    },
    'ui.setup.context.system': {
        en: 'System reserve',
        zh: '系统预留',
    },
    'ui.setup.context.memory': {
        en: 'Memory',
        zh: '记忆',
    },
    'ui.setup.refresh': {
        en: 'Refresh',
        zh: '刷新',
    },
    'ui.setup.edit_profile': {
        en: 'Edit Profile',
        zh: '编辑 Profile',
    },
    'ui.setup.create_profile': {
        en: 'New Profile',
        zh: '新建 Profile',
    },
    'ui.setup.import': {
        en: 'Import',
        zh: '导入',
    },
    'ui.setup.connection_profile': {
        en: 'Complete connection profile',
        zh: '完整连接配置',
    },
    'ui.setup.profile.select': {
        en: 'Select Profile',
        zh: '请选择 Profile',
    },
    'ui.setup.profile.reuse_low': {
        en: 'Reuse low-tier Profile',
        zh: '复用低档 Profile',
    },
    'ui.setup.profile.reuse_medium': {
        en: 'Reuse medium-tier Profile',
        zh: '复用中档 Profile',
    },
    'ui.setup.profile.low_empty': {
        en: 'No Connection Profile selected',
        zh: '尚未选择 Connection Profile',
    },
    'ui.setup.profile.medium_empty': {
        en: 'Leave empty to reuse the low-tier connection; medium-tier responsibility and parameters remain independent.',
        zh: '留空时复用低档连接；仍执行中档职责与参数',
    },
    'ui.setup.profile.high_empty': {
        en: 'Leave empty to reuse the Actor and Scene Director.',
        zh: '留空时复用场景与规则导演',
    },
    'ui.setup.profile.default_preset': {
        en: 'Use Profile/default Preset',
        zh: '使用 Profile/默认 Preset',
    },
    'ui.setup.profile.no_regex': {
        en: 'Do not override Regex Preset',
        zh: '不覆盖 Regex Preset',
    },
    'ui.setup.output_headroom': {
        en: 'Output safety headroom',
        zh: '输出安全余量',
    },
    'ui.setup.role.low.kicker': {
        en: 'Low tier · Every turn',
        zh: '低档 · 每回合',
    },
    'ui.setup.role.low.title': {
        en: 'Scene Performer',
        zh: '现场表演者',
    },
    'ui.setup.role.low.detail': {
        en: 'Performs actions, environmental continuity, and dialogue under committed direction without inventing new facts.',
        zh: '按当日导演约束表演动作、环境连续性与角色对白，不创造新设定或隐藏逻辑。',
    },
    'ui.setup.role.medium.kicker': {
        en: 'Medium tier · Conditional',
        zh: '中档 · 条件触发',
    },
    'ui.setup.role.medium.title': {
        en: 'Actor and Scene Director',
        zh: '角色与场景导演',
    },
    'ui.setup.role.medium.detail': {
        en: 'Settles actor motives, Scene closure, and time rules. Output headroom only prevents truncation.',
        zh: '结算人物动机、场景封存核心与时间规则；输出余量只负责避免结构化结果被截断。',
    },
    'ui.setup.role.high.kicker': {
        en: 'High tier · Conditional',
        zh: '高档 · 条件触发',
    },
    'ui.setup.role.high.title': {
        en: 'World Director',
        zh: '世界导演',
    },
    'ui.setup.role.high.detail': {
        en: 'Owns hidden story truth, complex causality, Canon events, and controlled Map proposals.',
        zh: '隐藏故事真相、复杂因果、原著事件与受控地图提案。',
    },
    'ui.setup.models.status': {
        en: 'Context Size is the input window. Output safety headroom prevents truncation, not a response-length target. All tiers reserve 12K by default; actual usage follows scene complexity.',
        zh: 'Context Size 是输入窗口；输出安全余量只是防截断上限，不是每轮篇幅目标。三档默认保留 12K，实际篇幅由场景复杂度决定，消耗仍按真实输出计算。',
    },
    'ui.setup.previous': {
        en: 'Previous',
        zh: '上一步',
    },
    'ui.setup.next': {
        en: 'Next',
        zh: '下一步',
    },
    'ui.setup.return_game': {
        en: 'Save AI settings and return',
        zh: '保存 AI 配置并返回游戏',
    },
    'ui.setup.start': {
        en: 'Confirm character and begin',
        zh: '确认人物卡并开始',
    },
    'ui.setup.save_return': {
        en: 'Save and return to game',
        zh: '保存并返回游戏',
    },
    'ui.setup.footer': {
        en: 'Structured fields are authoritative; polished prose changes expression only.',
        zh: '结构化字段是权威状态，润色文本只负责表达。',
    },
});

const EXTERNAL_SOURCE_EN = Object.freeze({
    'campaign.canon_1991.eyebrow':
        'Canon Cohort',
    'campaign.canon_1991.name':
        'Harry\'s Cohort',
    'campaign.hogwarts_student.eyebrow':
        'Open School Years',
    'campaign.hogwarts_student.name':
        'Hogwarts Student',
    'campaign.marauders_era.eyebrow':
        'Earlier Generation',
    'campaign.marauders_era.name':
        'Marauders Era',
    'difficulty.narrative.name':
        'Narrative',
    'difficulty.standard.name':
        'Standard',
    'difficulty.harsh.name':
        'Harsh',
    'display_locale.zh-CN':
        'Chinese',
    'display_locale.en':
        'English',
});

export const UI_STATIC_LOCALE_EN =
    Object.freeze({
        ...Object.fromEntries(
            Object.entries(
                UI_TEXT,
            ).map(([
                key,
                value,
            ]) => [
                key,
                value.en,
            ]),
        ),
        ...UI_SETUP_STATIC_LOCALE_EN,
        ...UI_CALENDAR_STATIC_LOCALE_EN,
        ...UI_INSPECTOR_STATIC_LOCALE_EN,
        ...UI_GAME_STATIC_LOCALE_EN,
        ...UI_SETTINGS_STATIC_LOCALE_EN,
    });

export const UI_STATIC_LOCALE_ZH_CN =
    Object.freeze({
        ...Object.fromEntries(
            Object.entries(
                UI_TEXT,
            ).map(([
                key,
                value,
            ]) => [
                key,
                value.zh,
            ]),
        ),
        ...UI_SETUP_STATIC_LOCALE_ZH_CN,
        ...UI_CALENDAR_STATIC_LOCALE_ZH_CN,
        ...UI_INSPECTOR_STATIC_LOCALE_ZH_CN,
        ...UI_GAME_STATIC_LOCALE_ZH_CN,
        ...UI_SETTINGS_STATIC_LOCALE_ZH_CN,
    });

const STATIC_KEY_BY_ZH =
    new Map(
        Object.entries(
            UI_STATIC_LOCALE_ZH_CN,
        ).map(([
            key,
            value,
        ]) => [
            value,
            key,
        ]),
    );

const TEXT_BINDINGS = Object.freeze([
    ['#hpmud_calendar', 'ui.nav.calendar', 'direct'],
    ['#hpmud_save_state', 'ui.game.saved', 'direct'],
    ['#hpmud_relationship_graph', 'ui.nav.relationships', 'direct'],
    ['#hpmud_focus', 'ui.nav.focus'],
    ['.hpmud-more > summary', 'ui.nav.more'],
    ['#hpmud_open_home', 'ui.nav.archive_hall'],
    ['#hpmud_open_settings', 'ui.nav.settings'],
    ['#hpmud_reopen_models', 'ui.nav.ai_settings'],
    ['#hpmud_reopen_setup', 'ui.nav.character_sheet'],
    ['.hpmud-more-translation:first-of-type > span', 'ui.settings.display_language'],
    ['.hpmud-more-translation:nth-of-type(2) > span', 'ui.settings.default_translation', 'direct'],
    ['#hpmud_home .hpmud-home-hero > h1', 'ui.home.title'],
    ['#hpmud_home .hpmud-home-hero > p', 'ui.home.description'],
    ['.hpmud-campaign-options label:first-child > span', 'ui.home.start_year'],
    ['.hpmud-campaign-options label:nth-child(2) > span', 'ui.home.start_grade'],
    ['.hpmud-difficulty-title', 'ui.home.world_difficulty'],
    ['#hpmud_new_game b', 'ui.home.new_timeline'],
    ['.hpmud-save-library > header h2', 'ui.home.load_archive'],
    ['.hpmud-save-library > footer > span', 'ui.home.archive_footer'],
    ['.hpmud-setup-seal > strong', 'ui.setup.student_file'],
    ['[data-hpmud-page="models"] .hpmud-context-policy > div:first-child > strong', 'ui.setup.context.title'],
    ['[data-hpmud-page="models"] .hpmud-context-policy > div:first-child > span', 'ui.setup.context.detail'],
    ['.hpmud-profile-toolbar > div > strong', 'ui.setup.profiles.title'],
    ['#hpmud_profile_count', 'ui.setup.profiles.loading'],
    ['#hpmud_refresh_profiles', 'ui.setup.refresh'],
    ['#hpmud_edit_profile', 'ui.setup.edit_profile'],
    ['#hpmud_create_profile', 'ui.setup.create_profile'],
    ['article[data-slot="low"] > div > small', 'ui.setup.role.low.kicker'],
    ['article[data-slot="low"] > div > h2', 'ui.setup.role.low.title'],
    ['article[data-slot="low"] > div > p', 'ui.setup.role.low.detail'],
    ['article[data-slot="medium"] > div > small', 'ui.setup.role.medium.kicker'],
    ['article[data-slot="medium"] > div > h2', 'ui.setup.role.medium.title'],
    ['article[data-slot="medium"] > div > p', 'ui.setup.role.medium.detail'],
    ['article[data-slot="high"] > div > small', 'ui.setup.role.high.kicker'],
    ['article[data-slot="high"] > div > h2', 'ui.setup.role.high.title'],
    ['article[data-slot="high"] > div > p', 'ui.setup.role.high.detail'],
    ['#hpmud_setup_model_status', 'ui.setup.models.status'],
    ['#hpmud_setup_previous', 'ui.setup.previous'],
    ['#hpmud_setup_next', 'ui.setup.next'],
    ['#hpmud_setup_return_game', 'ui.setup.return_game'],
    ['#hpmud_start_game', 'ui.setup.start'],
    ['.hpmud-setup-footer > span', 'ui.setup.footer'],
    ['#hpmud_scene_panel .hpmud-side-card:nth-of-type(1) > header > span', 'ui.game.map.title'],
    ['#hpmud_scene_panel [data-hpmud-inspector="map"]', 'ui.game.expand'],
    ['#hpmud_scene_panel .hpmud-side-card:nth-of-type(2) > header > span', 'ui.game.people.interactive'],
    ['#hpmud_scene_panel .hpmud-local-people > summary > span', 'ui.game.people.location'],
    ['#hpmud_scene_panel .hpmud-side-card:nth-of-type(3) > header > span', 'ui.game.live_log'],
    ['#hpmud_scene_panel .hpmud-archive-card > header > span', 'ui.game.scene_archive'],
    ['#hpmud_scene_panel .hpmud-archive-divider > span', 'ui.game.archived_readonly'],
    ['#hpmud_clear_address', 'ui.game.clear'],
    ['#hpmud_confirm_movement', 'ui.game.movement.confirm'],
    ['#hpmud_dismiss_movement', 'ui.game.movement.dismiss'],
    ['#hpmud_clear_spell', 'ui.game.clear'],
    ['.hpmud-expression-menu > summary', 'ui.game.expression.insert'],
    ['[data-hpmud-template="speech"]', 'ui.game.expression.speech'],
    ['[data-hpmud-template="action"]', 'ui.game.expression.action'],
    ['[data-hpmud-template="thought"]', 'ui.game.expression.thought'],
    ['.hpmud-item-operation-menu > header > strong', 'ui.game.item.operations'],
    ['.hpmud-item-operation-menu > p', 'ui.game.item.help'],
    ['#hpmud_address_menu > summary', 'ui.game.dialogue.menu'],
    ['#hpmud_insert_movement', 'ui.game.movement.menu'],
    ['#hpmud_movement_panel > header strong', 'ui.game.movement.reachable'],
    ['#hpmud_custom_movement', 'ui.game.movement.custom'],
    ['#hpmud_movement_panel > footer > small', 'ui.game.movement.help'],
    ['#hpmud_insert_spell', 'ui.game.spell.menu', 'direct'],
    ['#hpmud_spell_panel_title', 'ui.game.spell.learned'],
    ['#hpmud_spell_show_all', 'ui.game.spell.try_unlearned'],
    ['#hpmud_spell_panel > footer > small', 'ui.game.spell.roll_note'],
    ['#hpmud_rollback_turn', 'ui.game.rollback', 'direct'],
    ['#hpmud_end_scene', 'ui.game.archive_scene', 'direct'],
    ['#hpmud_check', 'ui.game.active_check', 'direct'],
    ['#hpmud_composer .hpmud-send-button', 'ui.game.submit_turn'],
]);

function setDirectText(
    element,
    value,
) {
    const textNode = [
        ...(element.childNodes ||
            []),
    ].find(node =>
        node.nodeType === 3 &&
        String(
            node.nodeValue ||
            '',
        ).trim());
    if (textNode) {
        textNode.nodeValue =
            value;
    } else {
        if (
            typeof element.append ===
            'function'
        ) {
            element.append(
                document.createTextNode(
                    value,
                ),
            );
        } else {
            element.textContent =
                value;
        }
    }
}

export function applyStaticUiLocale(
    root,
    getLocalizedField,
) {
    const text =
        key =>
            getLocalizedField({
                staticKey: key,
                sourceTextEn:
                    UI_STATIC_LOCALE_EN[
                        key
                    ] ||
                    EXTERNAL_SOURCE_EN[
                        key
                    ] ||
                    '',
            }).text;
    root.querySelectorAll(
        '#hpmud_home *, #hpmud_setup *, .hpmud-topbar *, #hpmud_settings *, #hpmud_profile_editor *',
    ).forEach(element => {
        if (
            element.childElementCount >
                0
        ) {
            return;
        }
        if (
            element.tagName ===
                'OPTION' &&
            !element.hasAttribute(
                'value',
            )
        ) {
            return;
        }
        const sourceText =
            String(
                element.textContent ||
                '',
            ).trim();
        const key =
            element.dataset
                ?.hpmudLocaleKey ||
            STATIC_KEY_BY_ZH.get(
                sourceText,
            );
        if (!key) {
            return;
        }
        element.dataset
            .hpmudLocaleKey =
            key;
        element.textContent =
            text(key);
    });
    TEXT_BINDINGS.forEach(([
        selector,
        key,
        mode,
    ]) => {
        const element =
            root.querySelector(
                selector,
            );
        if (!element) {
            return;
        }
        if (mode === 'direct') {
            setDirectText(
                element,
                text(key),
            );
        } else {
            element.textContent =
                text(key);
        }
    });
    root.querySelector(
        '#hpmud_home',
    )?.setAttribute?.(
        'aria-label',
        text('ui.home.aria'),
    );
    root.querySelector(
        '#hpmud_setup',
    )?.setAttribute?.(
        'aria-label',
        text('ui.setup.aria'),
    );
    root.querySelector(
        '.hpmud-setup-rail > nav',
    )?.setAttribute?.(
        'aria-label',
        text(
            'ui.setup.steps_aria',
        ),
    );
    root.querySelector(
        '#hpmud_scene_restore',
    )?.setAttribute?.(
        'aria-label',
        text(
            'ui.nav.show_scene',
        ),
    );
    root.querySelector(
        '#hpmud_character',
    )?.setAttribute?.(
        'aria-label',
        text(
            'ui.nav.open_character',
        ),
    );
    root.querySelector(
        '#hpmud_campaigns',
    )?.setAttribute?.(
        'aria-label',
        text(
            'ui.home.campaign_group',
        ),
    );
    root.querySelector(
        '.hpmud-difficulty',
    )?.setAttribute?.(
        'aria-label',
        text(
            'ui.home.world_difficulty',
        ),
    );
    root.querySelector(
        '#hpmud_refresh_saves',
    )?.setAttribute?.(
        'aria-label',
        text(
            'ui.home.refresh_archives',
        ),
    );
    [
        [
            '#hpmud_setup_map_scope',
            'ui.setup.review.map_scope_aria',
        ],
        [
            '#hpmud_setup_map_level',
            'ui.setup.review.map_level_aria',
        ],
        [
            '#hpmud_setup_map',
            'ui.setup.review.map_aria',
        ],
        [
            '#hpmud_scene_collapse',
            'ui.game.scene.collapse_aria',
        ],
        [
            '#hpmud_input',
            'ui.game.input_aria',
        ],
        [
            '#hpmud_clear_address',
            'ui.game.address.clear_aria',
        ],
        [
            '#hpmud_clear_spell',
            'ui.game.spell.clear_aria',
        ],
        [
            '.hpmud-item-operation-menu',
            'ui.game.item.protocol_aria',
        ],
        [
            '#hpmud_movement_panel',
            'ui.game.movement.panel_aria',
        ],
        [
            '#hpmud_close_movement',
            'ui.game.movement.close_aria',
        ],
        [
            '#hpmud_spell_panel',
            'ui.game.spell.panel_aria',
        ],
        [
            '#hpmud_close_spell',
            'ui.game.spell.close_aria',
        ],
        [
            '#hpmud_settings button[value="cancel"]',
            'ui.settings.close_aria',
        ],
        [
            '#hpmud_preset_target',
            'ui.settings.preset_type_aria',
        ],
        [
            '#hpmud_regex_target',
            'ui.settings.regex_scope_aria',
        ],
        [
            '#hpmud_profile_cancel',
            'ui.profile.close_aria',
        ],
    ].forEach(([
        selector,
        key,
    ]) =>
        root.querySelector(
            selector,
        )?.setAttribute?.(
            'aria-label',
            text(key),
        ));
    const placeholders = [
        [
            '[name="character_pronouns"]',
            'ui.setup.identity.pronouns_placeholder',
        ],
        [
            '[name="character_heritage"]',
            'ui.setup.identity.heritage_placeholder',
        ],
        [
            '[name="character_appearance"]',
            'ui.setup.identity.appearance_placeholder',
        ],
        [
            '[name="home"]',
            'ui.setup.background.home_placeholder',
        ],
        [
            '#hpmud_polished_background',
            'ui.setup.review.background_placeholder',
        ],
        [
            '#hpmud_input',
            'ui.game.input_placeholder',
        ],
        [
            '#hpmud_movement_search',
            'ui.game.movement.search',
        ],
        [
            '#hpmud_spell_search',
            'ui.game.spell.search',
        ],
        [
            '#hpmud_profile_name',
            'ui.profile.name_placeholder',
        ],
        [
            '#hpmud_profile_api_key',
            'ui.profile.api_key_placeholder',
        ],
        [
            '#hpmud_profile_manual_model',
            'ui.profile.manual_model_placeholder',
        ],
    ];
    placeholders.forEach(([
        selector,
        key,
    ]) =>
        root.querySelector(
            selector,
        )?.setAttribute?.(
            'placeholder',
            text(key),
        ));
    root.querySelectorAll(
        '[data-hpmud-item-operation]',
    ).forEach(button => {
        const operation =
            button.dataset
                .hpmudItemOperation;
        button.textContent =
            text(
                `ui.game.item.operation.${operation}`,
            );
    });
    root.querySelectorAll(
        '[data-campaign]',
    ).forEach(button => {
        const id =
            button.dataset
                .campaign;
        button.querySelector(
            'small',
        ).textContent =
            text(
                `campaign.${id}.eyebrow`,
            );
        button.querySelector(
            'strong',
        ).textContent =
            text(
                `campaign.${id}.name`,
            );
        button.querySelector(
            'span',
        ).textContent =
            text(
                `ui.home.campaign.${id}.summary`,
            );
    });
    root.querySelectorAll(
        '[data-difficulty]',
    ).forEach(button => {
        const id =
            button.dataset
                .difficulty;
        button.querySelector(
            'b',
        ).textContent =
            text(
                `difficulty.${id}.name`,
            );
        button.querySelector(
            'small',
        ).textContent =
            text(
                `ui.home.difficulty.${id}.summary`,
            );
    });
    root.querySelectorAll(
        '#hpmud_campaign_grade option',
    ).forEach(option => {
        option.textContent =
            text(
                `ui.grade.${option.value}`,
            );
    });
    root.querySelectorAll(
        '[data-hpmud-step]',
    ).forEach(button => {
        const step =
            button.dataset
                .hpmudStep;
        const label =
            button.querySelector(
                'span',
            );
        const hint =
            button.querySelector(
                'small',
            );
        if (label) {
            label.textContent =
                text(
                    `ui.setup.step.${step}`,
                );
        }
        if (hint) {
            hint.textContent =
                text(
                    `ui.setup.step.${step}_hint`,
                );
        }
    });
    const contextPresets = {
        lean: [
            'ui.setup.context.lean',
            'ui.setup.context.lean_hint',
        ],
        balanced: [
            'ui.setup.context.balanced',
            'ui.setup.context.balanced_hint',
        ],
        rich: [
            'ui.setup.context.rich',
            'ui.setup.context.rich_hint',
        ],
    };
    root.querySelectorAll(
        '[data-hpmud-context-preset]',
    ).forEach(button => {
        const keys =
            contextPresets[
                button.dataset
                    .hpmudContextPreset
            ];
        if (!keys) {
            return;
        }
        button.querySelector(
            'span',
        ).textContent =
            text(keys[0]);
        button.querySelector(
            'small',
        ).textContent =
            text(keys[1]);
    });
    root.querySelectorAll(
        '[data-hpmud-import-preset-role], [data-hpmud-import-regex-role]',
    ).forEach(button => {
        button.textContent =
            text(
                'ui.setup.import',
            );
    });
    for (const role of [
        'low',
        'medium',
        'high',
    ]) {
        const profileLabel =
            root.querySelector(
                `article[data-slot="${role}"] > label > span`,
            );
        if (profileLabel) {
            profileLabel.textContent =
                text(
                    'ui.setup.connection_profile',
                );
        }
        const responseInput =
            root.querySelector(
                `input[name="response_${role}"]`,
            );
        const responseLabel =
            responseInput
                ?.closest?.('label')
                ?.querySelector?.(
                    ':scope > span',
                );
        if (responseLabel) {
            responseLabel.textContent =
                text(
                    'ui.setup.output_headroom',
                );
        }
    }
    root.querySelectorAll(
        '[data-hpmud-display-locale]',
    ).forEach(button => {
        button.textContent =
            text(
                `display_locale.${button.dataset.hpmudDisplayLocale}`,
            );
    });
    root.querySelectorAll(
        '[data-hpmud-translation-provider]',
    ).forEach(button => {
        const provider =
            button.dataset
                .hpmudTranslationProvider;
        if (provider === 'local') {
            button.textContent =
                text(
                    'ui.translation.local',
                );
        } else if (
            provider === 'off'
        ) {
            button.textContent =
                text(
                    'ui.translation.off',
                );
        }
    });
    root.querySelector(
        '.hpmud-more-translation:first-of-type [role="radiogroup"]',
    )?.setAttribute?.(
        'aria-label',
        text(
            'ui.settings.display_language',
        ),
    );
    root.querySelector(
        '.hpmud-more-translation:nth-of-type(2) [role="radiogroup"]',
    )?.setAttribute?.(
        'aria-label',
        text(
            'ui.settings.translation_source',
        ),
    );
}
