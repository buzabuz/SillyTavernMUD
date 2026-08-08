# Hogwarts MUD 客户端模块化重构 Spec

## Why

`public/scripts/extensions/hogwarts-mud/index.js` 已达到约 15,700 行，`helpers.js` 已达到约 26,500 行；两者分别混合宿主适配、UI、模型工作流、持久化和几乎全部领域规则。继续在这两个文件中叠加功能会扩大回归面、循环依赖和隐式状态风险，使每次更新难以独立验证。

本次重构只改变代码组织和依赖边界，不改变叙事协议、存档结构、模型职责、UI 行为或调用次数。目标是让后续功能可以在明确模块内修改，并由自动化边界检查阻止重新形成巨型文件。

## What Changes

- 将 `helpers.js` 中的纯规则、Reducer、迁移、投影和导入工具按领域拆分到单向依赖的模块层。
- 将 `index.js` 中的宿主适配、模型客户端、翻译、存档、导演工作流、回合/转场工作流、UI 渲染与事件绑定拆分为独立模块。
- 保留 `helpers.js` 作为无副作用兼容门面，继续提供现有公开导出。
- 保留 `index.js` 作为扩展组合根和 `init()` 入口，维持 `manifest.json` 的加载协议。
- 新增导出面、模块图、无顶层副作用、迁移顺序、黄金状态、浏览器模块加载和重复初始化保护测试。
- 新增模块大小与依赖方向守卫，防止实现被整体搬入新的 God Module。
- 所有常规验证禁止真实大模型请求；只有全部离线检查通过后，执行一次受双层硬预算保护的真实低档回合调用。
- 更新 Hogwarts MUD README，记录模块边界、依赖规则、扩展新功能的落点和验证命令。
- 本次无对外 **BREAKING** 变更。

## Impact

- Affected specs: Hogwarts MUD 扩展加载、客户端领域规则、存档迁移、模型调用编排、回合结算、场景转场、UI 渲染、维护性质量门禁。
- Affected code:
  - `public/scripts/extensions/hogwarts-mud/index.js`
  - `public/scripts/extensions/hogwarts-mud/helpers.js`
  - `public/scripts/extensions/hogwarts-mud/knowledge.js`
  - `public/scripts/extensions/hogwarts-mud/relationship-graph.js`
  - `public/scripts/extensions/hogwarts-mud/README.md`
  - `public/scripts/extensions/hogwarts-mud/{core,state,domain,runtime,adapters,workflows,ui}/`
  - `src/hogwarts-mud/turn-settlement-graph.js`
  - `tests/hogwarts-mud*.test.mjs`
  - `tests/hogwarts-mud-readonly.e2e.js`

## ADDED Requirements

### Requirement: 单向模块架构

系统 SHALL 使用以下依赖方向：

`core → state/domain → runtime/adapters → workflows → ui → index.js`

- `core` 只包含无业务副作用的基础工具、上下文预算、JSON 恢复和稳定值工具。
- `state/domain` 保存领域 Schema、normalize、validate、migration、projection 和 Reducer。
- `runtime/adapters` 封装 SillyTavern 状态访问、任务互斥、模型、知识库、本地语义和翻译接口。
- `workflows` 编排开局、导演、回合、转场和室内地图事务。
- `ui` 只负责 view model、渲染、控件状态和事件到 action 的绑定。
- `index.js` 只组装依赖、缓存根 DOM、注册/注销宿主事件并导出 `init()`。

内部模块 SHALL 直接导入其真实依赖，不得从 `helpers.js` 兼容门面反向导入，也不得导入 `index.js`。

#### Scenario: 新领域功能

- **WHEN** 开发者新增社交、空间、物品或回合规则
- **THEN** 规则进入对应 `domain` 模块
- **AND** 不需要修改无关领域文件
- **AND** 不得把实现重新加入 `helpers.js` 或 `index.js`

#### Scenario: 循环依赖

- **WHEN** 静态模块图发现循环、逆层依赖或内部模块导入兼容门面
- **THEN** 自动化检查失败

### Requirement: Helpers 兼容门面

`helpers.js` SHALL 变为无函数实现、无 DOM/网络/存档副作用的兼容 re-export 门面。

- 拆分前的公开导出名称 SHALL 全部保留。
- 导出值类型、函数参数、默认值、返回结构和错误文本 SHALL 保持兼容。
- `presence-witness-contract.js` 与 `spell-catalog.js` 的现有兼容导出 SHALL 保留。
- `knowledge.js`、`relationship-graph.js`、服务端 graph 和新模块 SHALL 逐步改为直接导入真实领域模块。

#### Scenario: 旧调用方继续工作

- **WHEN** 现有测试或外部调用方仍从 `helpers.js` 导入任一旧符号
- **THEN** 导入成功
- **AND** 行为与拆分前黄金基线一致

#### Scenario: 单独导入规则层

- **WHEN** Node 环境只导入 `helpers.js` 或任一领域模块
- **THEN** 不访问 DOM、不注册事件、不请求网络、不读取聊天存档

### Requirement: Index 组合根

`index.js` SHALL 继续满足 `manifest.json` 的 `js: index.js` 与 `hooks.activate: init` 协议，但只保留组合根职责。

- `init()` 的顺序必须保持：加载模板 → 获取 DOM refs → 创建 controller → 绑定 UI → 注册宿主事件 → 初始渲染。
- 重复调用 `init()` 不得重复插入 DOM、注册事件、启动翻译或触发模型工作。
- UI renderer 通过 action/port 注入调用 workflow，不得反向 import 组合根。
- workflow 通过 runtime ports 获取状态、保存、渲染调度和宿主能力，不得读取 UI 模块变量。
- 现有供契约测试读取的 index 导出继续由组合根 re-export。

#### Scenario: 浏览器加载扩展

- **WHEN** SillyTavern 通过 module script 加载 `index.js` 并再次 import 后调用 `init`
- **THEN** 模块只求值一次
- **AND** Hogwarts MUD 根节点只存在一个
- **AND** 每个宿主事件只注册一次
- **AND** 页面无 module/MIME/pageerror 错误

### Requirement: 领域模块边界

领域逻辑 SHALL 至少拆分为以下能力簇，允许在实现中进一步细分，但不得合并成新的超大模块：

- 上下文预算与 JSON 恢复。
- Campaign、角色草稿与初始世界。
- 物品、材质事件、人物外观和法术状态。
- 人物身份、知识、记忆、选角和社交关系。
- 行动判定、时间环境、节奏与因果坍塌。
- Narrative-first 回合协议、验证、Reducer 与回滚。
- 场景转场、世界变化与档案投影。
- 地图、寻路、移动与空间协调。
- 翻译、术语保护、Preset/Regex 导入。

Turn、Transition、Pacing 等跨领域模块 SHALL 通过明确的领域 API 组合，不得复制 normalize/validate/Reducer 实现。

#### Scenario: 回合结算

- **WHEN** workflow 提交一个 narrative-first 回合
- **THEN** 调用独立的回合、物品、人物、空间、见证和社交领域 API
- **AND** 最终事务、警告、消息 metadata 与拆分前一致

### Requirement: 存档和确定性兼容

重构 SHALL 保持当前存档权威语义：

- `chatMetadata.hogwartsMud` 的字段、版本、缺字段语义和数组顺序不变。
- 迁移步骤的调用顺序、执行次数、`{ state, changed }` 契约和幂等行为不变。
- 不得因为移动代码而预填此前依赖首次加载迁移的版本字段。
- Prompt 投影的字段名、字段顺序、裁剪上限和 JSON 序列化结果保持一致。
- 默认时钟、随机数和 ID 行为保持兼容；本次不同时引入 CAS、事件溯源或并发语义改造。

#### Scenario: 当前 Tina 档案只读加载

- **WHEN** 重构后的扩展加载当前 v2 Tina 档案且用户不操作
- **THEN** 档案 SHA-256 与 mtime 不变
- **AND** 不调用模型、翻译、本地观察或聊天保存
- **AND** 关系、游标、正文和共同记忆冷却不变

#### Scenario: 迁移黄金样本

- **WHEN** 拆分前后的规则处理同一旧档 fixture
- **THEN** 规范化 JSON 输出逐字段一致
- **AND** 第二次迁移均为 no-op

### Requirement: 模型工作流兼容

模型调用仍 SHALL 通过统一 model adapter 进入 Connection Manager，保持现有角色职责、Prompt、Schema、fallback 和错误语义。

- 普通回合不得因模块拆分增加 foundation、daily、pacing、repair、translation、social 或 scene transition 调用。
- 同类任务互斥和去重状态 SHALL 集中管理，但本次先保持现有并发语义。
- 自动工作抑制 SHALL 跨存档加载、迁移和只读验收继续生效。
- streaming 失败、repair 和 one-shot fallback 路径必须可观测并受调用预算约束。

#### Scenario: 失败路径

- **WHEN** 模型响应无效或网络失败
- **THEN** 保持当前 narrative-first 失败/降级行为
- **AND** 不产生重复玩家消息、重复事务或未授权额外调用

### Requirement: 可维护性质量门禁

自动化检查 SHALL 强制以下约束：

- `index.js` 最终不超过 600 行。
- `helpers.js` 最终不超过 350 行，且只含 import/export、注释和兼容常量别名。
- 新增手写逻辑模块原则上不超过 1,500 行，任何超过 2,000 行的模块直接失败；离线人物目录、纯数据文件、样式和测试 fixture 可豁免。
- 模块公开接口使用 named exports，不使用隐式全局状态跨模块通信。
- 所有新增模块通过 `node --check` 和 ESLint。
- 静态依赖图无循环，内部模块不依赖兼容门面或组合根。
- README 明确说明每类功能的修改位置和完整验证命令。

#### Scenario: 后续更新重新膨胀

- **WHEN** 提交让入口、兼容门面或任一手写逻辑模块超过阈值
- **THEN** 维护性测试失败
- **AND** 开发者必须继续拆分后才能合并

### Requirement: 单次真实大模型质量验收

全部离线测试、静态检查和只读浏览器验收通过后，系统 SHALL 允许且只允许一次真实远端大模型生成调用用于最终质量确认。

- 使用专用或复制的可丢弃存档；不得改写用户当前 Tina 档案。
- 存档须预先满足 foundation/daily ready、pacing 不触发、social cursor 已追平、无待补算/室内地图/未完成回合。
- 翻译设为 off；本地 `/local/adjudicate` 和 `/local/observe` 使用确定性 fallback，不访问 Ollama。
- Playwright 在浏览器层只放行第一个 `/api/backends/{chat,text}-completions/generate`，第二次尝试立即阻断。
- 一次性代理在上游层只转发第一个 POST，后续请求返回 429，确保第二次调用不会计费。
- 测试结束后验证调用尝试数、代理放行数和上游确认数均为 1。
- 刷新验证不得再调用模型。

#### Scenario: 一次调用成功

- **WHEN** 可丢弃存档提交一个普通非边界回合
- **THEN** 只发生一次真实远端生成
- **AND** 玩家消息与助手消息各增加一条
- **AND** `turn.count` 增加 1、状态回到 `idle`
- **AND** assistant segments、scene performance 和 turn transaction 均通过现有 validator
- **AND** 刷新后状态与提交后状态一致

#### Scenario: 代码尝试第二次调用

- **WHEN** repair、stream fallback 或后台 director 尝试第二次远端生成
- **THEN** 浏览器或代理在请求到达上游前阻断
- **AND** 验收失败
- **AND** 不自动重试、不追加第二条玩家消息

## MODIFIED Requirements

### Requirement: Hogwarts MUD 扩展加载

扩展仍由 `manifest.json` 加载 `index.js` 并调用 `init()`；修改后，`index.js` 只作为组合根，实际能力由显式注入的模块提供。加载结果、DOM、设置默认值、事件响应和只读存档行为必须与重构前一致。

### Requirement: 回归验证

原有 229 项 Hogwarts MUD Node 测试、Social Contract、Presence/Witness、只读 E2E、ESLint、`node --check` 和 `git diff --check` 继续作为最低基线；新增模块边界、黄金样本、真实模块图和单次模型预算测试后，所有检查必须同时通过。

## REMOVED Requirements

### Requirement: 在 `index.js` 与 `helpers.js` 直接追加功能实现

**Reason**: 两个文件已成为跨 UI、工作流和领域规则的 God Module，无法维持可审计的修改范围。

**Migration**: `index.js` 收缩为组合根，`helpers.js` 收缩为兼容门面；现有实现按本规范迁入领域、adapter、workflow 和 UI 模块，旧导入路径至少保留一个兼容周期。
