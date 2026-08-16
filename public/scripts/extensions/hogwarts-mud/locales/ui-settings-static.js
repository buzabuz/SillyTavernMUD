const SETTINGS_TEXT = Object.freeze({
    'ui.settings.title': {
        en: 'World and generation',
        zh: '世界与生成',
    },
    'ui.settings.enable': {
        en: 'Enable system layer',
        zh: '启用系统层',
    },
    'ui.settings.enable_detail': {
        en: 'Inject world rules, character sheet, and the English output contract',
        zh: '注入世界规则、人物卡和英语输出契约',
    },
    'ui.settings.world_prompt': {
        en: 'World System Prompt',
        zh: '世界系统 Prompt',
    },
    'ui.settings.translation_detail': {
        en: 'English source remains in context. Chinese is display-only.',
        zh: '英文原文保存在上下文，中文仅用于显示',
    },
    'ui.settings.preset': {
        en: 'Tavern Preset',
        zh: '酒馆 Preset',
    },
    'ui.settings.regex': {
        en: 'Tavern Regex',
        zh: '酒馆 Regex',
    },
    'ui.settings.not_imported': {
        en: 'Not imported',
        zh: '未导入',
    },
    'ui.settings.preset_type_aria': {
        en: 'Preset type',
        zh: 'Preset 类型',
    },
    'ui.settings.preset.auto': {
        en: 'Auto-detect',
        zh: '自动识别',
    },
    'ui.settings.preset.instruct': {
        en: 'Instruct template',
        zh: 'Instruct 模板',
    },
    'ui.settings.preset.context': {
        en: 'Context template',
        zh: 'Context 模板',
    },
    'ui.settings.regex_scope_aria': {
        en: 'Regex scope',
        zh: 'Regex 作用域',
    },
    'ui.settings.regex.global': {
        en: 'Global',
        zh: '全局',
    },
    'ui.settings.regex.current': {
        en: 'Current Preset',
        zh: '当前 Preset',
    },
    'ui.settings.import_json': {
        en: 'Import JSON',
        zh: '导入 JSON',
    },
    'ui.settings.save': {
        en: 'Save',
        zh: '保存',
    },
    'ui.settings.close_aria': {
        en: 'Close settings',
        zh: '关闭',
    },
    'ui.profile.title.new': {
        en: 'New Connection Profile',
        zh: '新建 Connection Profile',
    },
    'ui.profile.title.edit': {
        en: 'Edit Connection Profile',
        zh: '编辑 Connection Profile',
    },
    'ui.profile.close_aria': {
        en: 'Close Connection Profile editor',
        zh: '关闭',
    },
    'ui.profile.name': {
        en: 'Profile name *',
        zh: 'Profile 名称 *',
    },
    'ui.profile.name_placeholder': {
        en: 'For example: Daily narrative · Gemini 3.1',
        zh: '例如：日常叙事 · Gemini 3.1',
    },
    'ui.profile.endpoint_help': {
        en: 'Automatically calls a compatible Chat Completions endpoint.',
        zh: '自动调用兼容的 Chat Completions 接口。',
    },
    'ui.profile.api_key_help': {
        en: 'The key stays in SillyTavern Secret Storage and never enters a save.',
        zh: '密钥保存在 SillyTavern Secret Storage，不进入存档。',
    },
    'ui.profile.api_key_placeholder': {
        en: 'Enter when creating. Leave blank while editing to keep the existing key.',
        zh: '新建时输入；编辑时留空表示保留现有密钥',
    },
    'ui.profile.manual_model': {
        en: 'Enter Model ID manually...',
        zh: '手动输入 Model ID…',
    },
    'ui.profile.model_help': {
        en: 'After testing the connection, every model returned by the service appears here.',
        zh: '测试连接后，这里会显示服务返回的全部模型。',
    },
    'ui.profile.manual_model_label': {
        en: 'Manual Model ID *',
        zh: '手动 Model ID *',
    },
    'ui.profile.manual_model_placeholder': {
        en: 'For example: gemini-3.1-pro-preview',
        zh: '例如：gemini-3.1-pro-preview',
    },
    'ui.profile.default': {
        en: 'Default',
        zh: '默认',
    },
    'ui.profile.test_help': {
        en: 'Test the connection and fetch models before saving',
        zh: '保存前可以测试连接并获取模型列表',
    },
    'ui.profile.test': {
        en: 'Test and fetch models',
        zh: '测试并获取模型',
    },
    'ui.profile.delete': {
        en: 'Delete Profile',
        zh: '删除 Profile',
    },
    'ui.profile.save': {
        en: 'Save Connection Profile',
        zh: '保存 Connection Profile',
    },
    'ui.profile.current_model': {
        en: 'Current · {model}',
        zh: '当前 · {model}',
    },
    'ui.profile.use_default_preset': {
        en: 'Use current/default Preset',
        zh: '使用当前/默认 Preset',
    },
    'ui.profile.key_existing': {
        en: 'A Tavern key is linked. Leave API Key blank to keep using it.',
        zh: '已关联酒馆密钥；留空 API Key 可继续使用',
    },
    'ui.profile.test_before_save': {
        en: 'You can test the connection and fetch models before saving.',
        zh: '保存前可以测试连接并获取模型列表',
    },
    'ui.profile.models_failed': {
        en: 'Automatic model loading failed. Use the button on the right to retry.',
        zh: '模型列表自动加载失败，可点击右侧按钮重试',
    },
    'ui.profile.error.secret_type': {
        en: 'Source "{source}" has no matching Tavern secret type.',
        zh: '当前 Source “{source}” 没有对应的酒馆密钥类型。',
    },
    'ui.profile.error.secret_write': {
        en: 'Failed to write API Key to SillyTavern Secret Storage.',
        zh: 'API Key 写入 SillyTavern Secret Storage 失败。',
    },
    'ui.profile.error.required': {
        en: 'Profile name and Model ID are required.',
        zh: 'Profile 名称和 Model ID 必填。',
    },
    'ui.profile.error.endpoint': {
        en: 'Custom Source requires a Base URL.',
        zh: 'Custom Source 必须填写 Base URL。',
    },
    'ui.profile.error.duplicate': {
        en: 'A Connection Profile with this name already exists.',
        zh: '已经存在同名 Connection Profile。',
    },
    'ui.profile.saved': {
        en: 'Connection Profile "{name}" saved.',
        zh: 'Connection Profile “{name}” 已保存。',
    },
    'ui.profile.error.secret_unsupported': {
        en: 'This Source does not support saving a key.',
        zh: '当前 Source 不支持保存密钥。',
    },
    'ui.profile.secret_test_label': {
        en: 'Hogwarts MUD · Connection test',
        zh: 'Hogwarts MUD · 连接测试',
    },
    'ui.profile.error.test_key': {
        en: 'Failed to write the test key.',
        zh: '测试密钥写入失败。',
    },
    'ui.profile.error.custom_endpoint': {
        en: 'Enter a Custom Endpoint first.',
        zh: '请先填写 Custom Endpoint。',
    },
    'ui.profile.connecting': {
        en: 'Connecting and fetching models...',
        zh: '正在连接并获取模型…',
    },
    'ui.profile.connected_models': {
        en: 'Connected. Fetched {count} models.',
        zh: '连接成功，获取到 {count} 个模型',
    },
    'ui.profile.connected_manual': {
        en: 'Connected. The service returned no model list; enter a Model ID manually.',
        zh: '连接成功；服务没有返回模型列表，请手工输入 Model ID',
    },
    'ui.profile.delete_confirm': {
        en: 'Delete Connection Profile "{name}"?',
        zh: '确定删除 Connection Profile “{name}” 吗？',
    },
    'ui.profile.deleted': {
        en: 'Connection Profile "{name}" deleted.',
        zh: 'Connection Profile “{name}” 已删除。',
    },
    'ui.profile.configured': {
        en: 'Profile configured',
        zh: 'Profile 已配置',
    },
    'ui.profile.context_changed': {
        en: 'All three context tiers changed to {size}.',
        zh: '三档上下文已切换为 {size}。',
    },
    'ui.profile.low_required': {
        en: 'The low-tier Scene Performer requires a Connection Profile.',
        zh: '低档现场表演者必须绑定 Connection Profile。',
    },
    'ui.profile.timeline_saved': {
        en: 'Three-tier AI and context policy saved to the current timeline.',
        zh: '三档 AI 与上下文策略已保存到当前时间线。',
    },
    'ui.profile.error.extension_missing': {
        en: 'The Connection Profiles extension is not loaded.',
        zh: 'Connection Profiles 扩展尚未加载。',
    },
    'ui.profile.error.missing': {
        en: 'The selected Connection Profile no longer exists.',
        zh: '选择的 Connection Profile 已不存在。',
    },
    'ui.profile.error.timeout': {
        en: 'Applying the Connection Profile timed out.',
        zh: 'Connection Profile 应用超时。',
    },
    'ui.profile.error.preset_manager': {
        en: 'No {apiId} Preset Manager is available in the Tavern.',
        zh: '当前酒馆没有可用的 {apiId} Preset Manager。',
    },
    'ui.profile.error.chat_preset_manager': {
        en: 'No Chat Completion Preset Manager is available in the Tavern.',
        zh: '当前酒馆没有可用的 Chat Completion Preset Manager。',
    },
    'ui.bindings.profile_select_first': {
        en: 'Select a Connection Profile in any role slot first.',
        zh: '请先在任一职责槽选择要编辑的 Connection Profile。',
    },
    'ui.bindings.chat_preset_imported': {
        en: 'Chat Completion Preset "{name}" imported and bound to this role.',
        zh: 'Chat Completion Preset “{name}” 已导入并绑定到该职责。',
    },
    'ui.bindings.regex_preset_imported': {
        en: 'Regex Preset "{name}" imported and bound to this role.',
        zh: 'Regex Preset “{name}” 已导入并绑定到该职责。',
    },
    'ui.bindings.connection_failed': {
        en: 'Connection failed',
        zh: '连接失败',
    },
    'ui.bindings.importing': {
        en: 'Importing...',
        zh: '导入中…',
    },
    'ui.bindings.sensitive_removed': {
        en: ' · Removed {count} sensitive fields',
        zh: ' · 已移除敏感字段 {count} 个',
    },
    'ui.bindings.preset_imported': {
        en: 'Preset "{name}" imported.',
        zh: 'Preset “{name}” 已导入。',
    },
    'ui.bindings.import_failed': {
        en: 'Import failed',
        zh: '导入失败',
    },
    'ui.bindings.regex_count': {
        en: 'Imported {count}',
        zh: '已导入 {count} 条',
    },
    'ui.bindings.regex_imported': {
        en: 'Imported {count} Regex entries.',
        zh: '已导入 {count} 条 Regex。',
    },
});

export const UI_SETTINGS_STATIC_LOCALE_EN =
    Object.freeze(
        Object.fromEntries(
            Object.entries(
                SETTINGS_TEXT,
            ).map(([
                key,
                value,
            ]) => [
                key,
                value.en,
            ]),
        ),
    );

export const UI_SETTINGS_STATIC_LOCALE_ZH_CN =
    Object.freeze(
        Object.fromEntries(
            Object.entries(
                SETTINGS_TEXT,
            ).map(([
                key,
                value,
            ]) => [
                key,
                value.zh,
            ]),
        ),
    );
