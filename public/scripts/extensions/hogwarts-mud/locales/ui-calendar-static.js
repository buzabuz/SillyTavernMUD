const CALENDAR_TEXT = Object.freeze({
    'ui.calendar.title': {
        en: 'School Calendar',
        zh: '学院日程',
    },
    'ui.calendar.description': {
        en: 'Read public schedules by time. Preview and author views never write world State.',
        zh: '按时间阅读公开日程；预览与作者视图不会写入世界状态。',
    },
    'ui.calendar.view_tabs_aria': {
        en: 'Calendar views',
        zh: '日历视图',
    },
    'ui.calendar.view.agenda': {
        en: 'Agenda',
        zh: '日期视图',
    },
    'ui.calendar.view.storylines': {
        en: 'Storylines',
        zh: '剧情线',
    },
    'ui.calendar.close_aria': {
        en: 'Close Calendar',
        zh: '关闭日历',
    },
    'ui.calendar.collection_aria': {
        en: 'Plans, Scenes, and Storylines',
        zh: '计划、场景与剧情线',
    },
    'ui.calendar.select_date': {
        en: 'Select date',
        zh: '选择日期',
    },
    'ui.calendar.date_index': {
        en: 'Date index',
        zh: '日期索引',
    },
    'ui.calendar.close_date_index_aria': {
        en: 'Close date index',
        zh: '关闭日期索引',
    },
    'ui.calendar.previous_month_aria': {
        en: 'Previous month',
        zh: '上个月',
    },
    'ui.calendar.next_month_aria': {
        en: 'Next month',
        zh: '下个月',
    },
    'ui.calendar.world_calendar': {
        en: 'World Calendar',
        zh: '世界日历',
    },
    'ui.calendar.week_schedule': {
        en: 'Weekly schedule',
        zh: '一周日程',
    },
    'ui.calendar.scenes': {
        en: 'Scenes',
        zh: '场景',
    },
    'ui.calendar.free_scene': {
        en: 'Free Scene',
        zh: '自由开场',
    },
    'ui.calendar.public_storylines_aria': {
        en: 'Public Storylines',
        zh: '公开剧情线',
    },
    'ui.calendar.preview_aria': {
        en: 'Plan or Scene details',
        zh: '计划或场景详情',
    },
    'ui.calendar.details': {
        en: 'Details',
        zh: '详情',
    },
    'ui.calendar.preview_empty': {
        en: 'Select a plan or Scene to view a concise record.',
        zh: '选择一项计划或场景查看精简档案。',
    },
    'ui.calendar.none': {
        en: 'None',
        zh: '无',
    },
    'ui.calendar.to': {
        en: ' to ',
        zh: ' 至 ',
    },
    'ui.calendar.list_separator': {
        en: ', ',
        zh: '，',
    },
    'ui.calendar.weekday.mon': {
        en: 'Mon',
        zh: '一',
    },
    'ui.calendar.weekday.tue': {
        en: 'Tue',
        zh: '二',
    },
    'ui.calendar.weekday.wed': {
        en: 'Wed',
        zh: '三',
    },
    'ui.calendar.weekday.thu': {
        en: 'Thu',
        zh: '四',
    },
    'ui.calendar.weekday.fri': {
        en: 'Fri',
        zh: '五',
    },
    'ui.calendar.weekday.sat': {
        en: 'Sat',
        zh: '六',
    },
    'ui.calendar.weekday.sun': {
        en: 'Sun',
        zh: '日',
    },
    'ui.calendar.date.full': {
        en: '{year}-{month}-{day} · {weekday}',
        zh: '{year} 年 {month} 月 {day} 日 · 周{weekday}',
    },
    'ui.calendar.date.month': {
        en: '{year}-{month}',
        zh: '{year} 年 {month} 月',
    },
    'ui.calendar.date.weekday': {
        en: '{weekday}',
        zh: '周{weekday}',
    },
    'ui.calendar.time.unknown': {
        en: 'Time unknown',
        zh: '时间未知',
    },
    'ui.calendar.unknown': {
        en: 'Unknown',
        zh: '未知',
    },
    'ui.calendar.duration.unknown': {
        en: 'Duration unknown',
        zh: '时长未知',
    },
    'ui.calendar.duration.minutes': {
        en: '{minutes} min',
        zh: '{minutes} 分钟',
    },
    'ui.calendar.duration.hours_minutes': {
        en: '{hours} hr {minutes} min',
        zh: '{hours} 小时 {minutes} 分钟',
    },
    'ui.calendar.duration.hours': {
        en: '{hours} hr',
        zh: '{hours} 小时',
    },
    'ui.calendar.status.schedule.planned': {
        en: 'Planned',
        zh: '计划中',
    },
    'ui.calendar.status.schedule.active': {
        en: 'Active',
        zh: '进行中',
    },
    'ui.calendar.status.schedule.completed': {
        en: 'Completed time window',
        zh: '已完成时间段',
    },
    'ui.calendar.status.schedule.cancelled': {
        en: 'Cancelled',
        zh: '已取消',
    },
    'ui.calendar.kind.routine': {
        en: 'Routine',
        zh: '日常',
    },
    'ui.calendar.kind.class': {
        en: 'Class',
        zh: '课程',
    },
    'ui.calendar.kind.story': {
        en: 'Story',
        zh: '剧情',
    },
    'ui.calendar.kind.social': {
        en: 'Social',
        zh: '社交',
    },
    'ui.calendar.kind.personal': {
        en: 'Personal',
        zh: '个人',
    },
    'ui.calendar.status.storyline.planned': {
        en: 'Planned',
        zh: '规划中',
    },
    'ui.calendar.status.storyline.active': {
        en: 'Active',
        zh: '推进中',
    },
    'ui.calendar.status.storyline.resolved': {
        en: 'Resolved',
        zh: '已收束',
    },
    'ui.calendar.status.storyline.cancelled': {
        en: 'Cancelled',
        zh: '已取消',
    },
    'ui.calendar.status.beat.planned': {
        en: 'Awaiting staging',
        zh: '待排演',
    },
    'ui.calendar.status.beat.active': {
        en: 'Active',
        zh: '进行中',
    },
    'ui.calendar.status.beat.realized': {
        en: 'Realized',
        zh: '已实现',
    },
    'ui.calendar.status.beat.deferred': {
        en: 'Deferred',
        zh: '已顺延',
    },
    'ui.calendar.status.beat.cancelled': {
        en: 'Cancelled',
        zh: '已取消',
    },
    'ui.calendar.tier.high': {
        en: 'High-tier plan',
        zh: '高级规划',
    },
    'ui.calendar.tier.medium': {
        en: 'Medium-tier plan',
        zh: '中级规划',
    },
    'ui.calendar.readonly.completed': {
        en: 'The scheduled time has passed. Completion does not imply a narrative outcome.',
        zh: '安排时间已经发生；完成状态不代表叙事结果。',
    },
    'ui.calendar.readonly.cancelled': {
        en: 'This schedule was cancelled and is read-only.',
        zh: '该安排已经取消，只能阅读。',
    },
    'ui.calendar.readonly.active': {
        en: 'This schedule has started. Only the current record is readable.',
        zh: '该安排已经开始，只能阅读当前记录。',
    },
    'ui.calendar.readonly.ended': {
        en: 'This scheduled time has passed and is read-only.',
        zh: '该安排的时间已经过去，只能阅读。',
    },
    'ui.calendar.readonly.started': {
        en: 'This schedule has already started and cannot be entered again.',
        zh: '该安排的开始时间已经过去，不能重新进入。',
    },
    'ui.calendar.readonly.invalid_reference': {
        en: 'The schedule reference is invalid and is currently read-only.',
        zh: '安排引用已失效，当前只能阅读。',
    },
    'ui.calendar.scene_progress': {
        en: '{current} / {target} Scenes',
        zh: '{current} / {target} 场景',
    },
    'ui.calendar.entry_type.schedule': {
        en: 'Schedule',
        zh: '日程',
    },
    'ui.calendar.archived_readonly': {
        en: 'Archived · Read-only',
        zh: '已封存 · 只读',
    },
    'ui.calendar.date_aria': {
        en: '{date}, {plans} plans, {scenes} Scenes',
        zh: '{date}，{plans} 项计划，{scenes} 个场景',
    },
    'ui.calendar.week.fallback': {
        en: 'This week',
        zh: '本周日程',
    },
    'ui.calendar.week.same_month': {
        en: '{year}-{month}-{startDay} to {endDay}',
        zh: '{year} 年 {month} 月 {startDay}—{endDay} 日',
    },
    'ui.calendar.week.same_year': {
        en: '{year}-{startMonth}-{startDay} to {endMonth}-{endDay}',
        zh: '{year} 年 {startMonth} 月 {startDay} 日—{endMonth} 月 {endDay} 日',
    },
    'ui.calendar.validation.date': {
        en: 'Select a valid date first.',
        zh: '请先选择有效日期。',
    },
    'ui.calendar.validation.time': {
        en: 'Select a valid start time.',
        zh: '请选择有效的开始时间。',
    },
    'ui.calendar.validation.clock': {
        en: 'The current world clock or selected time is invalid.',
        zh: '当前世界时钟或所选时间无效。',
    },
    'ui.calendar.validation.past': {
        en: 'A Free Scene cannot begin before the current world clock.',
        zh: '自由开场时间不得早于当前世界时钟。',
    },
    'ui.calendar.validation.map': {
        en: 'Select an authoritative Map.',
        zh: '请选择权威地图。',
    },
    'ui.calendar.validation.room': {
        en: 'Select an authoritative room in that Map.',
        zh: '请选择该地图中的权威房间。',
    },
    'ui.calendar.switched.agenda': {
        en: 'Switched to today\'s agenda.',
        zh: '已切换到今日日程。',
    },
    'ui.calendar.switched.storylines': {
        en: 'Switched to the Storyline author view.',
        zh: '已切换到剧情线作者视图。',
    },
    'ui.calendar.item_count': {
        en: '{count} items',
        zh: '{count} 项',
    },
    'ui.calendar.empty': {
        en: 'Empty',
        zh: '空',
    },
    'ui.calendar.day.no_plans': {
        en: 'No plans on this day',
        zh: '这一天没有计划',
    },
    'ui.calendar.day.no_plans_detail': {
        en: 'Blank dates remain blank. The system never invents schedules to fill them.',
        zh: '空白日期保持为空，不会自动补写安排。',
    },
    'ui.calendar.day.grid_aria': {
        en: 'Plan time grid for the selected date',
        zh: '所选日期的计划时间网格',
    },
    'ui.calendar.day.plans_aria': {
        en: '{weekday} plans',
        zh: '{weekday}的计划',
    },
    'ui.calendar.day.no_scenes': {
        en: 'No Scenes on this day',
        zh: '这一天没有场景',
    },
    'ui.calendar.day.no_scenes_detail': {
        en: 'You may open a Free Scene here. Nothing changes world State before submission.',
        zh: '可以从这里自由开场，提交前不会改变世界状态。',
    },
    'ui.calendar.scene.archived': {
        en: 'Archived',
        zh: '已封存',
    },
    'ui.calendar.collapse': {
        en: 'Collapse',
        zh: '收起',
    },
    'ui.calendar.expand': {
        en: 'Expand',
        zh: '展开',
    },
    'ui.calendar.scene.no_linked_plans': {
        en: 'No linked plans',
        zh: '未关联计划',
    },
    'ui.calendar.term_beat_count': {
        en: '{interval} · {count} term beats',
        zh: '{interval} · {count} 个学期节点',
    },
    'ui.calendar.no_public_storylines': {
        en: 'No public Storylines',
        zh: '尚无公开剧情线',
    },
    'ui.calendar.no_public_storylines_detail': {
        en: 'High-tier Directors maintain Storylines. Schedules and previews never create them automatically.',
        zh: '剧情线由高级导演维护，不会从日程或预览中自动生成。',
    },
    'ui.calendar.no_public_summary': {
        en: 'No public summary.',
        zh: '没有公开摘要。',
    },
    'ui.calendar.tags_aria': {
        en: 'Schedule tags',
        zh: '安排标签',
    },
    'ui.calendar.tag.academic': {
        en: 'Academic',
        zh: '学业',
    },
    'ui.calendar.tag.academic_review': {
        en: 'Academic review',
        zh: '学业复盘',
    },
    'ui.calendar.tag.breakfast': {
        en: 'Breakfast',
        zh: '早餐',
    },
    'ui.calendar.tag.charms': {
        en: 'Charms',
        zh: '魔咒课',
    },
    'ui.calendar.tag.class': {
        en: 'Class',
        zh: '课程',
    },
    'ui.calendar.tag.dinner': {
        en: 'Dinner',
        zh: '晚餐',
    },
    'ui.calendar.tag.family_secrets': {
        en: 'Family secrets',
        zh: '家族秘密',
    },
    'ui.calendar.tag.gryffindor': {
        en: 'Gryffindor',
        zh: '格兰芬多',
    },
    'ui.calendar.tag.heritage': {
        en: 'Heritage',
        zh: '身世',
    },
    'ui.calendar.tag.homework': {
        en: 'Homework',
        zh: '作业',
    },
    'ui.calendar.tag.lunch': {
        en: 'Lunch',
        zh: '午餐',
    },
    'ui.calendar.tag.magic_talent': {
        en: 'Magical talent',
        zh: '魔法天赋',
    },
    'ui.calendar.tag.parseltongue': {
        en: 'Parseltongue',
        zh: '蛇佬腔',
    },
    'ui.calendar.tag.potions': {
        en: 'Potions',
        zh: '魔药课',
    },
    'ui.calendar.tag.routine': {
        en: 'Routine',
        zh: '日常',
    },
    'ui.calendar.tag.snape': {
        en: 'Snape',
        zh: '斯内普',
    },
    'ui.calendar.tag.social': {
        en: 'Social',
        zh: '社交',
    },
    'ui.calendar.tag.staff_meeting': {
        en: 'Staff meeting',
        zh: '教职工会议',
    },
    'ui.calendar.tag.story': {
        en: 'Story',
        zh: '剧情',
    },
    'ui.calendar.tag.study': {
        en: 'Study',
        zh: '学习',
    },
    'ui.calendar.tag.transfiguration': {
        en: 'Transfiguration',
        zh: '变形术',
    },
    'ui.calendar.tag.weekend': {
        en: 'Weekend',
        zh: '周末',
    },
    'ui.calendar.tag.autumn_term': {
        en: 'Autumn term',
        zh: '秋季学期',
    },
    'ui.calendar.tag.spring_term': {
        en: 'Spring term',
        zh: '春季学期',
    },
    'ui.calendar.tag.year1': {
        en: 'Year 1',
        zh: '一年级',
    },
    'ui.calendar.tag.year2': {
        en: 'Year 2',
        zh: '二年级',
    },
    'ui.calendar.tag.year3': {
        en: 'Year 3',
        zh: '三年级',
    },
    'ui.calendar.tag.year4': {
        en: 'Year 4',
        zh: '四年级',
    },
    'ui.calendar.term.autumn': {
        en: '{year} autumn term',
        zh: '{year} 年秋季学期',
    },
    'ui.calendar.term.spring': {
        en: '{year} spring term',
        zh: '{year} 年春季学期',
    },
    'ui.calendar.term.unknown': {
        en: 'Unscheduled term',
        zh: '未排定学期',
    },
    'ui.calendar.runtime_error': {
        en: 'The Scene could not be opened.',
        zh: '无法打开该场景。',
    },
    'ui.calendar.language_skipped': {
        en: 'The Scene director returned non-English structured content. The Scene was not opened.',
        zh: '场景导演返回了非英语结构内容，本次未进入场景。',
    },
    'ui.calendar.meta.time': {
        en: 'Time',
        zh: '时间',
    },
    'ui.calendar.meta.location': {
        en: 'Location',
        zh: '地点',
    },
    'ui.calendar.meta.characters': {
        en: 'Characters',
        zh: '人物',
    },
    'ui.calendar.meta.no_characters': {
        en: 'No specified characters',
        zh: '无指定人物',
    },
    'ui.calendar.meta.status': {
        en: 'Status',
        zh: '状态',
    },
    'ui.calendar.meta.public_source': {
        en: 'Public source',
        zh: '公开来源',
    },
    'ui.calendar.meta.archive_id': {
        en: 'Archive ID',
        zh: '档案 ID',
    },
    'ui.calendar.meta.stable_id': {
        en: 'Stable ID',
        zh: '稳定 ID',
    },
    'ui.calendar.meta.duration': {
        en: 'Duration',
        zh: '时间跨度',
    },
    'ui.calendar.timeline.sealed': {
        en: 'Sealed timeline · {count} entries',
        zh: '已封存时间线，共 {count} 条',
    },
    'ui.calendar.timeline.count': {
        en: 'Timeline · {count} entries',
        zh: '时间线 · {count} 条',
    },
    'ui.calendar.timeline.empty': {
        en: 'This Scene has no saved timeline entries.',
        zh: '该场景没有保存时间线条目。',
    },
    'ui.calendar.timeline.no_note': {
        en: 'No saved note.',
        zh: '没有保存说明。',
    },
    'ui.calendar.entering': {
        en: 'Entering {clock}.',
        zh: '正在进入 {clock}。',
    },
    'ui.calendar.entering_free': {
        en: 'Opening a Free Scene at {clock}.',
        zh: '正在前往 {clock} 的自由开场。',
    },
    'ui.calendar.free.kicker': {
        en: 'Free Scene',
        zh: '自由场景',
    },
    'ui.calendar.free.title': {
        en: 'Open a Free Scene on the selected date',
        zh: '从所选日期自由开场',
    },
    'ui.calendar.free.detail': {
        en: 'Claims no plan. Submission seals the current Scene and creates a new Scene through the timeline save transaction.',
        zh: '不认领任何计划。提交后才会封存当前场景，并通过时间线保存事务创建新场景。',
    },
    'ui.calendar.free.selected_date': {
        en: 'Selected date',
        zh: '所选日期',
    },
    'ui.calendar.free.start_time': {
        en: 'Start time',
        zh: '开始时间',
    },
    'ui.calendar.free.authoritative_map': {
        en: 'Authoritative Map',
        zh: '权威地图',
    },
    'ui.calendar.free.authoritative_room': {
        en: 'Authoritative room',
        zh: '权威房间',
    },
    'ui.calendar.free.creating': {
        en: 'Creating Scene',
        zh: '正在建立场景',
    },
    'ui.calendar.free.open': {
        en: 'Open Free Scene',
        zh: '自由开场',
    },
    'ui.calendar.cancel': {
        en: 'Cancel',
        zh: '取消',
    },
    'ui.calendar.free.valid': {
        en: 'Valid target · {clock} · claims no schedule',
        zh: '有效目标 · {clock} · 不认领日程',
    },
    'ui.calendar.enter_scene': {
        en: 'Enter Scene',
        zh: '进入场景',
    },
    'ui.calendar.entering_scene': {
        en: 'Entering {time}',
        zh: '正在进入 {time}',
    },
    'ui.calendar.transition.prepare': {
        en: 'Prepare Scene material',
        zh: '整理场景资料',
    },
    'ui.calendar.transition.archive': {
        en: 'Archive current Scene',
        zh: '封存当前场景',
    },
    'ui.calendar.transition.generate': {
        en: 'Generate new Scene opening',
        zh: '生成新场景开场',
    },
    'ui.calendar.transition.save': {
        en: 'Save world State',
        zh: '保存世界状态',
    },
    'ui.calendar.transition.detail.prepare': {
        en: 'Reading the schedule, characters, location, and current Scene record.',
        zh: '正在读取日程、人物、地点与当前场景记录。',
    },
    'ui.calendar.transition.detail.archive': {
        en: 'The Director is closing the old Scene and arranging the transition to the target time.',
        zh: '导演正在收束旧场景，并编排前往目标时刻的转场。',
    },
    'ui.calendar.transition.detail.generate': {
        en: 'The old Scene plan is complete. The Scene Performer is writing the next opening.',
        zh: '旧场景方案已完成，现场表演者正在书写下一幕。',
    },
    'ui.calendar.transition.detail.save': {
        en: 'Generation is complete. Atomically saving the Scene archive, clock, and Calendar.',
        zh: '生成已完成，正在原子保存场景档案、时钟与日程。',
    },
    'ui.calendar.page_working': {
        en: 'The page is still working',
        zh: '页面仍在工作',
    },
    'ui.calendar.page_working_detail': {
        en: 'Two consecutive model generations are required and usually take 1-2 minutes. Keep this page open.',
        zh: '需要连续完成两次模型生成，通常约 1–2 分钟。请保持页面开启。',
    },
    'ui.calendar.plan_details': {
        en: 'Plan details',
        zh: '计划详情',
    },
    'ui.calendar.archive_body': {
        en: 'Archived Scene · Read-only text',
        zh: '封存场景 · 只读正文',
    },
    'ui.calendar.storyline.archive': {
        en: 'Long-term Storyline archive',
        zh: '长期线路档案',
    },
    'ui.calendar.storyline.term_progress': {
        en: 'Term pacing · {count} beats',
        zh: '学期节奏 · {count} 个节点',
    },
    'ui.calendar.storyline.scene_progress': {
        en: '{title} Scene progress',
        zh: '{title} 场景进度',
    },
    'ui.calendar.storyline.no_summary': {
        en: 'No public pacing summary.',
        zh: '没有公开节奏摘要。',
    },
    'ui.calendar.storyline.opportunities': {
        en: '{window} · {count} schedule opportunities',
        zh: '{window} · {count} 个日程机会',
    },
    'ui.calendar.storyline.author_view': {
        en: 'Storyline · Author view',
        zh: '剧情线 · 作者视图',
    },
    'ui.calendar.storyline.author_title': {
        en: 'Storyline author view',
        zh: '剧情线作者视图',
    },
    'ui.calendar.storyline.author_detail': {
        en: 'The left side shows long-term Storylines and each term beat\'s 0..4 Scene progress. Select a Storyline to inspect its pacing archive.',
        zh: '左侧展示长期线路及每个学期节点的 0 至 4 场景进度。选择剧情线查看完整节奏档案。',
    },
    'ui.calendar.not_selected': {
        en: 'Nothing selected',
        zh: '尚未选择',
    },
    'ui.calendar.mode.author': {
        en: 'Author view',
        zh: '作者视图',
    },
    'ui.calendar.mode.weekly': {
        en: 'Weekly ledger',
        zh: '周账本',
    },
    'ui.calendar.mode.storylines': {
        en: 'Long-term Storylines',
        zh: '长期剧情线',
    },
    'ui.calendar.storyline_count': {
        en: '{count} Storylines',
        zh: '{count} 条线路',
    },
    'ui.calendar.selected_summary': {
        en: 'Selected {date} · {count} Scenes',
        zh: '已选 {date} · {count} 个场景',
    },
    'ui.calendar.scroll_summary': {
        en: '{count} items · scrolls inside this panel',
        zh: '{count} 项 · 容器内滚动',
    },
    'ui.calendar.opened': {
        en: '{date} opened.',
        zh: '{date} 已打开。',
    },
});

export const UI_CALENDAR_STATIC_LOCALE_EN =
    Object.freeze(
        Object.fromEntries(
            Object.entries(
                CALENDAR_TEXT,
            ).map(([
                key,
                value,
            ]) => [
                key,
                value.en,
            ]),
        ),
    );

export const UI_CALENDAR_STATIC_LOCALE_ZH_CN =
    Object.freeze(
        Object.fromEntries(
            Object.entries(
                CALENDAR_TEXT,
            ).map(([
                key,
                value,
            ]) => [
                key,
                value.zh,
            ]),
        ),
    );
