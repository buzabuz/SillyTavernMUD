# Hogwarts MUD

SillyTavern 内置扩展，用于运行规则托底、AI 叙事驱动的持续世界文字 RPG。

## 工作方式

### 系统 Prompt

扩展通过 SillyTavern 的 `setExtensionPrompt` 注入四层内容：

1. 可编辑的魔法世界规则与叙事要求。
2. 固定的英语输出契约。
3. 玩家已经确认的结构化人物卡。
4. 剧本年份、起始年级、难度、权威世界地图及地图修改约束。

英语输出契约要求模型只返回英文，不生成双语内容。用户导入的 Preset、角色卡、世界书和 Regex 仍按 SillyTavern 原有顺序参与生成。

### 双语消息

- `message.mes`：AI 返回的英文原文，是存档和后续上下文的权威内容。
- `message.extra.hogwartsMud.sourceEn`：翻译时使用的英文快照。
- `message.extra.hogwartsMud.translatedZh`：所选翻译源返回的简体中文。
- `message.extra.display_text`：酒馆兼容的中文显示字段。

翻译失败时不修改英文原文，界面显示英文并标记失败。中文不会发送回模型上下文。
只有以拉丁文本为主的 AI 消息会进入翻译队列，已有中文历史不会重复提交。
右上角“更多 → 默认翻译”默认使用本地 `qwen3:4b`，也可改用 Google、Bing 或关闭翻译。自动重译只处理当前场景内最近 12 条消息；当前状态和最新一份场景档案单独刷新，不扫描整段历史。每条英文 AI 消息右上角的 `EN` 菜单可以切换中英文，也可以用当前 provider 手动重新翻译该条消息。

### Connection Profile 与 Preset

建档流程的“生成配置”步骤直接读取 SillyTavern Connection Manager 中的 Connection Profile。低、中、高三个职责槽位分别绑定完整 Profile；Profile 自身包含：

- API 与服务商。
- 模型。
- 密钥引用与接口地址。
- Settings Preset。
- Instruct、Context、System Prompt 和 Tokenizer。

建档页不再单独选择 Preset，避免在应用 Profile 后又被另一套 Preset 选择覆盖。用户可在 Hogwarts MUD 当前页面直接新建或编辑 Profile，输入：

- Profile 名称。
- Chat Completion Source。
- Custom Endpoint。
- API Key。
- Model ID。
- Settings Preset。
- Prompt Post-Processing。

“测试并获取模型”会使用酒馆后端检查连接并加载模型列表。API Key 通过 SillyTavern `Secret Storage` 保存，Profile 和游戏存档只记录 `secret-id`。

顶部“更多 → 配置”仍支持导入酒馆标准 JSON/`.settings` Preset，供高级配置使用：

- Chat Completion
- Text Completion
- Instruct 模板
- Context 模板

自动识别失败时可以手工指定类型。导入通过原生 `PresetManager` 保存和选择。
单个导入文件限制为 5MB。

为避免导入文件偷偷改变连接配置，以下字段会被删除：

- API Key
- 反向代理 URL 与密码
- Custom endpoint URL
- 自定义请求头和请求体覆盖

### Regex

支持单条 Regex JSON 和 Regex 数组文件，字段格式与 SillyTavern Regex 扩展一致。

- 全局：写入 `extension_settings.regex`。
- 当前 Preset：写入 Preset 的 `extensions.regex_scripts`。

Preset Regex 使用酒馆原有的显式授权机制启用。

### 人物卡与开局门槛

扩展首先进入“档案大厅”，不会直接进入人物卡或聊天。玩家可以：

- 选择故事剧本：与哈利同届、自由年级在校生或掠夺者时代。
- 设置开局年份、起始年级和叙事/标准/严酷难度。
- 建立新档案或读取所有带 `chatMetadata.hogwartsMud` 的旧时间线。

`Hogwarts World Director` 只在后台作为 SillyTavern 存档容器，界面不会要求玩家选择或管理酒馆角色。旧版分散在其他角色下的 Hogwarts MUD 存档也会被统一检索。

剧本配置保存在 `chatMetadata.hogwartsMud.campaign`，并注入系统 Prompt。非一年级角色会从返校前夕开始，不会错误重放入学通知。

新时间线随后依次完成：

1. 身份。
2. 家庭、欲望与恐惧。
3. 魔法倾向和六项基础属性。
4. Connection Profile 与三档 AI 配置。
5. 人物卡和世界地图确认。

六项属性限制为单项 7–14，总和必须为 63。人物卡确认前，主叙事区和发送栏不会显示，也不会向模型发送开场消息。

人物卡保存在 `chatMetadata.hogwartsMud.character`，结构化字段是权威状态。身份页分别保存族裔/可见文化线索与外貌、穿着、姿态等当前呈现；NPC 只能使用玩家明确标为可观察或合理得知的部分。AI 润色只能改变表达，不能改写已确认事实。

### 三档 AI

“生成配置”步骤提供三个职责槽位，每个槽位绑定一个 SillyTavern Connection Profile：

- 低档：现场表演者。每回合根据已固化状态与中档日计划生成动作、环境连续性和 NPC 对白，不创建新设定或隐藏逻辑。
- 中档：角色与场景导演。按事件边界、每日计划、节奏信号和场景封存核心条件调用，结算人物动机、线索机会、时间规则和结构化切场状态。
- 高档：世界导演。负责隐藏故事真相、复杂因果、原著事件和受控地图提案。

每个职责还可独立配置：

- Chat Completion Preset，可选择或导入。
- Regex Preset，可选择或导入。
- Context Size。
- 输出安全余量。

不再使用扩展自定义的“单次 token 预算”。旧存档中的 `maxTokens` 会迁移为 `maxResponseLength`；迁移前低于 `12000` 的旧上限只提升一次，之后仍允许玩家手工覆盖。Headroom v2 还会把 v1 中恰好等于旧 response ceiling 的异常值恢复为 `12000`；v2 下明确保存的自定义值不会被覆盖。

默认 Context Size 统一为 `120000`，三档输出安全余量统一为 `12000`。游戏进行中可以通过顶部“更多 → AI 配置”直接修改三档 Connection Profile、Chat Completion Preset、Regex Preset、Context Size 和输出安全余量；点击“保存 AI 配置并返回游戏”后立即写入当前时间线并应用低档原生生成参数，无需返回档案大厅或重开存档。

低档配置会同步到酒馆原生生成参数。中、高档使用临时有效 Profile 应用各自 Preset，并按 `Context Size - 输出安全余量` 裁剪职责上下文。中、高档 Profile 留空时复用前一级 Profile。

复用只发生在 Connection Profile/模型连接层。三个职责槽位始终保留各自独立的 Preset、Regex、Context Size、输出安全余量和调用权限；中档复用低档连接时仍执行中档职责，绝不把场景或规则工作降级给低档。

Context Size 是输入窗口，输出安全余量是 API 防截断上限，两者不能互相替代。它不是每轮目标，正文篇幅仍按时长、群像人数和流程需要动态决定；模型实际消耗只取决于真实输出。响应遥测会保存供应商 `finishReason`、`usage`、请求上限和实际字符数。

### 自适应 Context 预算

生成配置提供三个快捷档位，也允许逐项手工修改：

- **精简 32K**：核心/近期/日常记忆分别注入 3/2/1 条，RAG 最多 3 条，普通近期历史 4 条，章节结算 8 条。
- **标准 64K**：记忆 3/4/3，RAG 最多 6 条，普通近期历史 8 条，章节结算 16 条。
- **丰裕 120K**：默认档位，记忆 3/6/8，RAG 最多 10 条，普通近期历史 16 条，章节结算 32 条。

系统至少为 mandatory Prompt 预留 `6000 tokens`，输出安全余量不能侵占该空间。全局 mandatory 层只包含当前场景、玩家位置、在场人物状态和必要表演边界；完整共同记忆、离场人物、详细地图和隐藏故事线按低/中/高职责权限注入。低 Context 会自动减少日常记忆、RAG 与历史，120K 则使用完整的分层上限。

职责输入预算为 `Context Size - 输出安全余量`。系统预留取输入预算的 8%，下限 `6000`、上限 `12000`；职责预算下限为 `8192`。当前字符安全线按 `职责预算 × 3` 估算。默认 120K Context 与 12K 输出余量对应 108K 输入预算、99,360 职责 tokens 和 298,080 字符安全线。

超出安全线时，结构化用户 JSON 不做原始字符串截头。系统先移除 `retrievedLocalKnowledge`、可重建的 `actorContinuityCapsules` 和 `contextPolicy`，同时始终保留 `playerAction`、有序 `playerTurnSequence`、addressing、时间、判定、移动以及绑定世界状态；repair 还可省略重复 Schema。非 JSON 文本才从开头裁剪并至少保留 64 字符。持久化回合诊断会记录裁剪前后长度、JSON 有效性和玩家字段是否保留。

每个职责槽位实时显示输入预算、系统预留、RAG 条数和三层记忆配额。手工 Context 会自动归入精简、标准或丰裕策略，但不会被快捷档位强制覆盖。

同一游戏日内的普通回合默认只调用低档现场表演者和本地 Ollama 语义侧车。低档生成前，侧车使用结构化 `playerTurnSequence` 区分实际动作、对白中的未来提及、显式等待、移动、睡眠和事件边界，并以 JSON Schema 返回经过时间及是否需要骰子；低档随后用动作、环境变化和对话覆盖已锁定时长。对白中的“上课吗”“等会儿”“睡过头”等词不会被当作已经发生的长行动；“继续上课”在没有明确完成整节课时仍是普通 15 分钟镜头。生成篇幅不会反向扩大权威时间。跨入新日期时仍由中档刷新日计划。

时间权威校验区分“回合内相对叙事”和“外部时间事实”。`ten minutes ago`、`five minutes later` 等短语只要不超过本回合已授权的 `elapsedMinutes` 就可以使用；超出回合跨度的相对时间、外部倒计时、绝对钟点、日期、营业时间和交通班次仍需来自玩家输入或权威状态，否则拒绝提交。低档 Prompt、修复 Prompt 与本地校验使用同一口径。

低档使用 narrative-first V2 协议：唯一必填输出是有序 `segments`。人物进出、活动、移动、物品和社交变化只在实际发生时通过稀疏 `stateProposals` 提议；`eventEnded`、节奏完成和程序进度属于可选 `signals`。响应随后进入不调用模型的 `Turn Settlement Graph`，依次接受正文、折叠 proposal、校验权威状态并生成兼容事务。无效 proposal 单独丢弃并记入 `settlementWarnings`，缺失摘要、信号或在场快照不会触发修复调用；服务端图不可用时使用同一组本地 reducer 降级。旧 V1 完整 JSON 继续兼容。

已接受正文在提交前会再经过同一 Ollama 侧车的后置观察。观察器只读取玩家原文与英文权威分段，不允许中文翻译参与状态提取；它结合当前人物 ID 和地图房间，以 JSON Schema 稀疏输出 `materialEvents`、事件边界和人物活动/离场建议。统一物质 Schema 分为 `scene_change` 与 `appearance_change`：场景变化覆盖摆放、移动、移除、调整、破坏、修复、弄脏和清理；外貌变化覆盖服装、饰品、发型、可见状态及恢复、拿起和放下手持物。完整字段定义仍集中在 `material-schema.js`。

#### 人物占位、事件见证与写入所有权

人物状态分为三层，互不代替：

- `activeInteractionActorIds` 是当前互动卡司，控制完整人物上下文、当回合对白和快捷输入，通常只保留 2–4 人。兼容字段 `actor.present` 和 `actorPresence.presentActorIdsAfterTurn` 也只表达这一层。
- `localPresence.occupantActorIds` 是当前房间内已确认存在的已知人物；`localPresence.cohortIds` 是课程、寝室、家庭等稳定群体。安静、退出镜头或没有对白都不等于离开房间，只有已提交的移动、进入、离开和位置证据能改变占位。
- `participantActorIds`、`witnessActorIds`、`witnessCohortIds` 与 `witnessBasis` 属于单个事件。事件见证由感知范围、物理占位和空间视听图共同解析，不反写互动卡司或地点占位。

| 数据 | 权威写入者 | 模型权限 |
| --- | --- | --- |
| `activeInteractionActorIds` | Scene/Turn Settlement Reducer | 中、低档只可提案 |
| `localPresence` | Presence Reducer | 模型不可覆盖完整集合 |
| `perception` | 本地观察器 + validator | 本地模型只可提议受限枚举和逐字证据 |
| participant/witness/cohort/basis | Witness Resolver | 所有模型只读 |
| `eventKnowledge` | Event Knowledge Reducer | 模型不可直接写入 |
| 关系 deltas/appraisals | Social Director 提案，Social Reducer 提交 | 必须受已提交 event witness 白名单限制 |
| actor memory/impression | Memory Reducer | 只能消费该人物的合法事件知识 |
| knowledge/archive | 确定性 projector | 不接受自由补写人物名单 |

普通回合固定为：`/local/adjudicate` 前置判断时间、判定需求与隐蔽意图，但不写 witness；低档生成 narrative-first 正文；Turn Settlement Graph 接受正文并结算权威状态；随后仅调用一次 `/local/observe`，在同一响应中提取 material、actor update、event boundary 和 `perception`；Presence Reducer 更新 occupants/cohorts；Witness Resolver 确定性生成 participant/witness/cohort/basis；Event Knowledge Reducer 写入 `eventKnowledge`；Social Director 只在既有事件边界或补算时机消费已提交 witness，最后由 Social Reducer 提交关系变化，并由 Knowledge/Archive Projector 生成派生记录。感知不会新增第二次本地观察，也不会增加低、中、高档模型调用。

本地后置观察不可用、超时、返回无效 JSON 或 perception 未通过校验时，正文仍正常提交。确定性回退把结构化施法、公开伤害、喊叫、爆炸、教授公告和 `broadcast_speech` 视为 room scope；`direct_speech` 默认仅目标可听；普通动作默认 nearby；明确耳语、纸条和成功隐蔽默认 target；无法确认施事者时使用 `attribution=unknown`。回退记录统一标记 `source=deterministic_fallback`，最终 witness 仍由 Witness Resolver 计算。

`eventKnowledge` 先于社交关系保存事件知情范围。人物知道事件不会自动创建关系边或修改关系数值；Social Director 的 `witnessedBy` 必须是每条来源消息已提交 witness 的子集，active interaction、受话目标、同室或 cohort 身份都不能自行升级为见证。

常规语义侧车默认使用 `qwen3:1.7b`、`temperature:0`、`think:false` 和 `num_ctx:4096`。只有玩家明确取得或携带签名、信件、钥匙、魔杖、地图等耐久重要物品时，才条件调用 `qwen3:4b` 的极小背包 Schema；普通食物、餐具和背景道具不会触发。所有建议必须通过逐字证据、稳定 ID、房间可达性和本地 Reducer，模型无权直接写状态。合法物质事件进入 `materialEventLog`，重要持有物进入 `items`，人物当前呈现投影到 `actorPresentations`。当前互动卡司由 Settlement Reducer 保持稀疏；物理同室人物由 `localPresence` 独立保存，退出镜头但没有移动或离场的人仍保留当前位置。侧车调用完成后以 `keep_alive:0` 卸载；不可用时正文仍按 narrative-first 提交。

历史样本的真实模型基准包含七个前置时间/骰子案例和两个后置观察案例：`qwen3:0.6b` 通过 4/9，`qwen3:1.7b` 通过 9/9，因此常规语义裁判使用 1.7B。4B 仅承担条件式重要物品观察；其 4096 context 实测约占 3.17 GB VRAM，完成后立即卸载。基准可用 `node scripts/benchmark-hogwarts-local-semantic.mjs` 重跑。

人物视觉资料同样分层：`physicalDescriptionEn` 只保存体貌、五官、天然发型等稳定特征；服装、饰品、当前发型、可见状态与手持物只保存在 `actorPresentations`。旧档首次加载时会通过 `actorPresentationVersion` 迁移，剥离 `publicDescriptionEn` 中的服装和道具，并丢弃“周围堆着书”等旧场景布置；人物检查器分别展示“固定外貌”和“当前呈现”。本地 actor 知识文档及向量索引使用同一分层。历史聊天正文和备份不改写，因为它们记录的是当时发生过的场景。

人物栏使用同样的双层投影。“当前互动人物”保留完整人物卡和快捷输入；可折叠的“当前地点人物”以低对比样式显示其余玩家已知 occupants，并用“另有……成员若干”概括 cohort。地点层不会显示玩家未知人物，也不会仅因人物在同室就授予其事件知识；桌面、390px 窄屏、键盘操作和 `prefers-reduced-motion` 均使用同一语义。

权威时钟不是展示标签。规则层按当前日期、六小时时段、区域、地图和房间确定性派生 `behavioralEnvironment`，包含时段、日照、室内/室外暴露、霍格沃茨宵禁、睡眠压力、稳定天气、温度和行为约束。同一时间地点刷新后结果不变，也不增加模型调用。普通回合和转场开场必须让相关影响进入人物作息、音量、衣着、取暖、遮蔽、路线、视野或计划；室内天气只通过窗户、声响、穿堂风、湿衣物和室外安排表现，不机械播报天气。当前场景和环境优先于已经过期的每日地点或活动指令。

四名以上 NPC 的群像场景不会把玩家当作主持人。低档应形成一个主要回应线程、选择性的辅助插话、NPC 之间的侧线交流和同时发生的独立动作；角色可以忽略部分问题、继续手头事务、彼此打断或保持沉默，禁止把玩家的问题列表拆成 NPC 依次完整作答的“答题面板”。这是 Prompt 层的表演要求，不会用本地规则作废一份结构合法的完整回复；若输出因其他结构或权威错误必须修复，修复 Prompt 继续携带同一群像约束。

群像回合的输出预算随活跃实名人数增长，而不是沿用单人回合的固定上限。4 人以上开始扩容；6 人、15 分钟的默认目标为约 420–860 英文词、6–20 个分段。额外篇幅不能用于逐人点名反应：至少 40% 服务主要互动和具体流程推进，除玩家直接影响外最多单独刻画 2 名次要实名，其余人物通过同步背景动作维持存在感。事件摘要由结算图优先采用合法旧字段，否则从已接受 segments 确定性生成。

当玩家已经到达 `nextSceneIntent` 的权威房间时，入场、排队、开门、唱引子、宣布“即将开始”都只算准备态；15 分钟回合应在正文中完成至少一个真实程序单元后再停下。有边界的流程阶段完成时，低档可以提交 `signals.eventEnded:true` 让中档刷新下一阶段方向；缺失该可选信号默认继续当前事件，不作废正文。

场景转场时，中档将 `actorStates.present:true` 视为下一幕的活跃实名卡司，而不是对物理空间里所有人的点名清单。拥挤公共场景默认只保留 2–4 名有直接剧情职责的实名角色、最多 2 名连续性锚点；规则层把最近三幕卡司、连续出场次数、复用惩罚和最低换血数提供给中档，优先让高曝光且当前无任务的人退出镜头。该建议不作为本地硬拦截。`actorStates` 永远不直接投影成公开正文，也不要求低档在开场逐个点名；低档只选择当前镜头真正需要的 2–3 名人物表演。退出活跃卡司的人仍保存在人物库，可用 `present:false + mapId/roomId` 更新后台位置并在后续自然回归。

中档同时为新场景提交 `crowdDirectionEn`。低档可以据此描写集体人流及 1–3 个转瞬即逝的无名人物，以衣着、物件、动作和可见反应增加群像层次；匿名人群不能拥有名字、actorId、可归属对白、私密信息、记忆、关系或线索权威，也不进入人物栏。玩家选中某个具体无名对象并形成持续一对一互动时，低档通过单个 `temporary_actor` proposal 将其升级为稳定暂定身份；结算图本地补齐运行态与最终在场集合。该升级不等待中档节奏冷却，也不增加模型调用。若动作行精确写出已认识人物的姓名或 alias，且该人物存活、同一地图并在 5 分钟短路径内，规则层会把离镜人物召回当前房间并要求低档描写反应；共同记忆兜底由结算图生成。泛指“认识的女生”“其他学生”不触发召回。

直接受话不再从自然语言猜测。每段定向台词必须单独成行并使用 `@人物：台词`，向房间公开发言使用 `@全场：台词`；同一回合允许按动作顺序穿插多段、多人台词。所有非 `@` 行一律视为动作、神态、心理或环境交互，正文里出现姓名只算提及。规则层把输入预先编译成有序 `playerTurnSequence`，每段台词携带稳定 `targetActorId`、`lineIndex` 和 `speechOrder`。输入区的人物菜单每次插入一个新台词行，受话回显展示段数与目标；清除操作只删除 `@人物：` 前缀，不删除原台词。消息 metadata 保存完整有序 blocks，确保重试、导出和身份合并后仍可回放。

多人受话仍只调用一次低档模型。每名直接受话者获得一个以稳定 actor ID 密封的知识胶囊，包含其自己的印象、共同记忆、私有目标、流言、亲历或见证的社交声明和关系证据；模型被明确禁止让其他 NPC 或旁白读取、转述或推导该胶囊。未被直接受话的人物只获得公开表演字段、当前现场和共同见证的 RAG。共享 RAG 排除 actor、clue 和整幕 scene transcript，只接受 provenance 覆盖全部潜在发言者的 event 等记录，防止新入场人物追溯知道此前内容。每个直接台词块的目标必须在进入下一块前回答、拒答、回避、明确没听见、被具体事件打断或离开，旁人不能代答。该隔离是单次调用内的严格 Prompt 契约，不等同于按人物多次调用的物理隔离；这是为保持群像连贯和调用成本所接受的取舍。

普通回合和转场开场还会为可能表演的人物注入较小的 actor-ID 连续性胶囊，只包含 `hasMetPlayer`、已认识人物 ID、关系阶段/数值、当前印象和少量近期共同记忆，不包含秘密、恐惧、私有目标或不受限知识。结构化“已经见过”优先于人物卡中残留的笼统 `stranger` 标签；熟人不得在新场景中重新进行首次自我介绍，人物之间的既有认识也不能因转场丢失。

Canon 目录中的角色、学院、技能和组织经历只用于身份与人物推荐，不能直接成为 `knowledgeEn`。尤其禁止 `Almost everything`、未来组织归属或后期能力为低年级角色提供全知许可。新入场 Canon 人物只获得统一的证据边界；旧存档通过 `actorKnowledgeVersion` 迁移清除目录派生字段，同时保留真正手工提交的当前时点事实。关系证据仅对 `sourceActorId` 本人或 `witnessedBy` 明确见证者可见，成为 `targetActorId` 不自动获得知情权。

临时人物使用稳定的暂定 ID，不进入正式 `actorLibrary`、人物预算或社交图，只保存最多 8 条亲历记忆。离场后中档可优先从既有临时人物、正式 guestActor 和 Canon 候选中选择再次出场；相同人物必须复用原 ID。只有叙事中明确说出姓名或出现唯一强证据时，才可把临时人物合并为正式原创或 Canon 身份。合并采用原暂定 ID 作为历史主键，继承记忆和别名；系统不弹提示，人物卡随故事揭晓自然更新。

低档不再提交完整 `actorPresence` 快照。结算图以回合开始集合为默认值，只折叠合法的 `actor_enter`、`actor_exit`、`actor_move` 与临时人物 proposal；没有 proposal 的安静人物保持原状态。旧 V1 `actorPresence/actorUpdates` 仍可作为兼容输入，但不再构成 V2 的必填表格。

现场表演的分段数、旁白数和词数属于 Prompt 质量目标，不是本地失败门槛；本地只拒绝空分段、无效 actor ID、越权位置或状态等权威错误。瞬时魔法也必须由“施法、念咒、cast a spell”等明确动作触发，正文仅提到魔杖、咒语或魔法不改变普通回合时长。

共享 `CANON_WIT_TONE_CONTRACT` 采用参考 Marinara's Spaghetti Recipe 的近期表达自校正：模型需要追踪最近回复已经使用的措辞、句形、节奏、段落开头与收束、比较方式、感官锚点和描述手段，并主动换用真正不同的叙述路径；无新信息的旧细节可以省略。文风管理不得退化为精确禁词或固定句式黑名单，也不做本地文风拦截或自动重试。当前基线抽样显示最近 30 条 Scene 中有 24 条集中复用同一种解释性比较结构，因此治理目标是打破模式依赖，而不是封杀其中某个短语。

普通回合开始前还会运行不调用模型的本地节奏探针。只有检测到关系人物缺口、连续场景核心阵容重复、单一场景持续过久或达到复查冷却时，才额外调用一次独立的中档节奏监督器。监督器按玩家偏好、相对年龄、人物曝光和权威人物冷却选择人物，不会因为某人已经在场就反复复用；环境钩子、小意外、可逆紧急情况、公开事实显影和普通并发症同样可承载节拍。符合年代、地点和固定设定标签的 Canon 人物可以在人物预算内正常加入；原创公共人物按 Canon 浓度与场景需要受控创建。低档只负责表演已提交指令。成功表演后指令立即消费，普通自动复查至少间隔 6 个已提交回合；当前场景已有 3 名近龄人物时，全局关系人物预算缺口不会继续触发复查。只有玩家明确提出认识新人、寻找其他学生等社交请求时可以绕过冷却立即评估。用户主动点击“封存场景”属于另一项独立的场景切换事务：普通切场调用中档，重大永久后果可由用户明确选择高档。

人物选择依次遵循：本轮明确点名 > 长期追求目标 > 因果或未结事件人物 > 当前社交阶段配额 > 普通熟人召回。本轮明确点名直接复用玩家消息已落盘的结构化受话对象，不从删去 `@人物` 标记后的叙事文本重新猜测。跨至少两个场景重复定向、且最近三个玩家回合内仍有主动关注，或明确的 friend / mentor / rival / romantic_interest 等关系标签，才可形成长期目标；同一场景中的连续对话不会独自产生长期追求。有效认识人数只统计明确关系，或至少跨两个场景且已有关系证据/共同记忆的人；家人和教授不参与阶段人数，一次性店员与同场路人也不计。少于 12 人为 `exploration`（新人/熟人 70/30，普通熟人召回预算 1），12–15 人为 `circle_formation`（50/50），16 人起为 `socially_stable`（20/80）。家人、教授及其他长期目标仍可通过前三项优先级无条件越过阶段配额；阶段配额不作为本地硬拦截。`new_actor` 只表示真正未见人物或新公共 guest，已认识人物重新入场归一化为 `existing_actor_action`，不会冒充新人配额。

中档节奏监督器同时承担 `Causal Collapse Resolver`，不新增模型角色或额外并行请求。规则层只在首次深入定向对话、关系阶段升级、显式移动后的地点首次观测、关键/重要物品首次检查时建立一个未定事实槽位；槽位沿用自动节奏评估的最小 6 回合冷却，同一槽位只检查一次，每幕最多成功绑定 1 条因果事实。若本轮同时命中普通节奏信号和因果槽位，只执行同一次中档调用。

坍塌可绑定普通社会关系、场外事件、制度事实、物品历史、普通旧账或流言渠道。事实允许在当前观测时才生成，但 `effectiveSinceClock` 必须早于观测；只允许填充玩家尚未观测的事实，并且不得提交血缘、重大身份、死亡、永久伤害、重大成功犯罪、Canon 改写或其他高档权限。找不到兼容事实时，同一次中档输出必须降级为 `environmental_hook / minor_mishap / complication / existing_actor_action`，不得为此追加第二次调用。

所有成功坍塌写入 `causalCollapse.records` 并同步本地事件知识库；社会关系同时投影到 `socialGraph`，地点余波进入 `map.roomStates`，物品历史写入物品的 `causalFactIds`。全局与低档 Prompt 只能看到 `visibleResiduesEn / aftermathEn`，完整事实仅对 `knownByActorIds` 和对应见证者知识胶囊可见。低档默认先展示余波，不能由旁白直接解释原因；转机消费后记录从 `pending_surface` 变为 `surfaced`，但事实永久保留。

### 动态人物印象与共同记忆

人物档案不再把静态 `relationshipToPlayer` 当作 NPC 对玩家的永久印象。每个角色在 `actorLibrary` 中保存：

- `firstImpressionOfPlayerEn / firstImpressionOfPlayer`：NPC 第一次在场看见玩家时形成的不可覆盖快照。它由玩家的可见特征和该 NPC 自己的性格视角共同形成。
- `impressionOfPlayerEn / impressionOfPlayer`：3–12 词左右的主观一句话反应，例如 `My troublesome daughter; impossible not to worry about.`，不是本轮活动摘要。
- `sharedMemories.core`：最多 3 条“最深刻的”共同记忆。
- `sharedMemories.recent`：最多 6 条“近期大事”。
- `sharedMemories.everyday`：最多 8 条“日常小事”。

新建人物库时，家人、监护人、亲属和既有朋友必须根据玩家已确认的背景与共同生活生成短而主观的当前印象，不能使用 `stranger`、`unknown`、单纯身份标签或当前活动复述。初见快照与当前印象分开保存：后续行为只能改变当前印象，不能抹掉第一眼。族裔字段不得被用于推断隐藏血缘、国籍、阶级、道德或套用刻板印象；不同 NPC 应依据自身注意点形成不同观察。普通印象变化至少间隔 3 个已提交回合；没有形成稳定态度变化时必须省略更新。

普通回合仍只调用一次低档现场表演。低档可以为亲自参与或目击本轮的 NPC 提交至多一条 `everyday / notable` 候选；无论显著度如何，低档结果都先进入“日常小事”，不能直接写“近期大事”或核心记忆。`notable` 只表示具备晋升资格，必须同时说明会影响后续信任、义务、冲突、危险或选择的长期后果。购物、吃饭、等待、赶路、玩笑、普通发脾气和小尴尬默认都是 `everyday`。

`firstImpressionOfPlayerEn`、`impressionOfPlayerEn` 和 `memoryUpdate` 是低档附带的可选建议，不属于 Scene 正文事务的失败边界。规则层会独立检查视听权限、已有初见、印象冷却、字数、显著度与 `lastingImpactEn`；任一建议不合法时只删除对应字段，保留同一份 segments、公开事件、人物活动、在场集合、移动、判定和流程推进，也不会因此发起修复调用。初次见面时未生成合格初见印象则保持 pending，等待后续合法证据或中档整理。

低档可以在局部事件、话题、冲突、差事或实际任务明确告一段落时提交 `signals.eventEnded:true`；它不代表封存场景，也不能因为一次回复或 15 分钟结束就触发。信号缺失默认事件继续，不影响正文提交。每个合格事件边界都会调用一次中档 `Event Boundary Director`，替换已经完成或陈旧的 `nextSceneIntent` 文案；规则层继续锁定原 `mapId / roomId / tier`，因此这次规划不会自动切场。只有该边界还包含尚未整理的共同记忆，并且距离上次中档整理至少 10 回合时，才在同一次调用中追加记忆与社交图整理；冷却期内不做记忆整理，也不会在第 10 回合自动补做旧边界。只有已有近期记忆，或带明确长期影响说明的 `notable` 候选可以生成“近期大事”；多条鸡毛蒜皮不会因为重复就自动升级。中档负责晋升近期/核心记忆、遗忘冗余记录和收束短印象。整理失败时保留低档结果，不会让玩家回合失败。章节封存继续由转场导演直接执行章节级关系与记忆结算，并清除未消费的小事件边界。

关系记忆 v6 迁移会把历史上由低档直接写入的“近期大事”降回日常候选，并把超过 16 词或空泛的旧印象收束成稳定 shorthand。人物档案继续按“最深刻的 / 近期大事 / 日常小事”分层展示共同记忆。

### 场景级社交导演图

社交导演不是多 Agent 系统。客户端继续使用一个中档 Connection Profile 完成一次结构化抽取，服务端使用 `@langchain/langgraph` 的单一 `StateGraph` 依次执行证据收集、来源校验和关系派生。它与共同记忆整理合并为同一次中档调用，不会为了人物关系再调用第二个模型。

- 触发沿用“`eventEnded` + 最小 10 回合冷却”；章节封存复用同一次转场导演输出。旧档当前场景只执行一次版本化回填。
- NPC 公开介绍的家庭、出身、教育、职业、身份和经历保存为带 `speakerId`、`witnessedBy`、`sourceMessageIds` 和场景来源的 `claimed` 声明，不直接升级成全知事实。
- 玩家↔NPC 与 NPC↔NPC 都使用有向关系证据。服务端只接受已知人物或 `player` 端点、当前证据白名单中的消息 ID，以及真实在场见证者；单条非法建议会被丢弃，不阻断其他合法声明或关系。
- `socialGraph.version=2` 把模型输出视为带来源的增量提案；最终关系值只由 LangGraph Reducer 在本地确定性提交。
- 人物卡展示玩家亲自见证的“家庭与背景声明”和“已知人物关系”。家庭、出身、职业和身份声明优先于低价值杂项进入八条摘要与低档上下文。
- 回填使用专用精简契约，必须返回 `scanComplete: true`，并由规则层强制清空 `reviews`。截断输出或修复成空数组不能被误标为回填完成，也不能改写旧记忆。

#### Social Graph v2 数值参考

每条关系边都有方向，A→B 与 B→A 可以保存不同状态。`family`、`authority`、`classmate`、`rivalry`、`mentor` 是结构标签，不会被压成好感度。

| 长期维度 | 范围 | 含义 |
| --- | --- | --- |
| `familiarity` | 0–100 | 对信息、习惯和历史的了解；不代表喜欢 |
| `closeness` | 0–100 | 自愿投入、共同经历、脆弱性分享和相互依赖 |
| `warmth` | -100–100 | 从冷漠/厌恶到喜爱/关怀 |
| `trust` | -100–100 | 从预期背叛到愿意托付 |
| `respect` | -100–100 | 从轻蔑到敬重 |
| `influence` | -100–100 | 从反抗影响到愿意受其引导 |
| `tension` | 0–100 | 尴尬、冲突和爆发风险 |
| `resentment` | 0–100 | 未修复的委屈、怨恨和报复债务 |
| `fear` | 0–100 | 对伤害或失控的预期 |
| `protectiveness` | 0–100 | 愿意为对方承担成本或风险 |

`closeness` 使用固定阶段锚点：

| 值 | 阶段 |
| --- | --- |
| 0 | 无关系 |
| 10 | 见过/初识 |
| 20 | 熟人 |
| 35 | 朋友 |
| 50 | 密友 |
| 70 | 知己/高度亲密 |
| 90 | 终身或家庭级纽带 |

模型为每个维度提交 `{ dimension, delta, impact }`，不能提交最终值或关系阶段。可用 impact bands 为：

| Impact | 原始绝对增量 | 典型事件 |
| --- | --- | --- |
| `trace` | 1 | 细小日常反应 |
| `minor` | 2–3 | 普通善意、轻微冒犯 |
| `meaningful` | 4–6 | 明确帮助、公开维护、持续争执 |
| `major` | 7–12 | 冒险相救、严重羞辱、伤害、重大承诺 |
| `defining` | 13–18 | 有强来源证据的背叛、牺牲或不可逆转折 |

普通事件的单次 `closeness` 变化最多 10，`defining` 最多 15。同班、同场或被迫共处主要增加 `familiarity`；只有自愿共处、认真交流、脆弱性分享、相互支持、共同承担风险和长期共享经历才提高 `closeness`。

Reducer 对每项提案固定执行：来源与维度白名单校验 → impact 区间限制 → 同场景或滚动 10 回合内同类事件重复衰减 `1.0 → 0.6 → 0.35 → 0.2` → 同方向接近边界时按 `max(0.25, 1 - abs(current) / 100)` 饱和衰减 → `warmth/trust/respect` 负向伤害乘 `1.25`，重大背叛可乘 `1.5` → 再受 impact 上限约束并 clamp 到维度范围。稳定 evidence ID 保证重放不重复累计。

`resentment` 只会因明确冒犯、羞辱、威胁、伤害、背叛或未解决冲突增加；只有被接受的道歉/补偿、宽恕或认知重构可以显著降低。普通礼物、寒暄和未被接受的道歉不能清除积怨。

每条 evidence 还可携带最多四项强度 1–5 的 `emotionAppraisals`。它们按情绪类型进入独立的 `activeEmotions` 短期层，并保留 `sourceMessageIds`、`updatedTurn` 和 `updatedClock` 供回合衰减；anger、fear、gratitude 等短期情绪不会直接覆盖 `closeness`、`trust`、`resentment` 等长期维度。

#### v1 → v2 本地迁移

旧档首次归一化时不会调用模型，也不会推进消息游标、共同记忆冷却或重复结算旧 evidence。迁移保留关系边、evidence ID、来源和见证信息，并执行：

- `affinity` 仅由 v1→v2 迁移输入解析器读取，v2 运行时和下游投影不再读取/写入。
- `closeness = min(familiarity, round(max(0, affinity) * 0.45 + max(0, trust) * 0.35 + protectiveness * 0.20))`。
- family 关系至少设为 `familiarity=90`、`closeness=70`，但不会强制 `warmth/trust` 为正。
- `respect`、`influence`、`resentment`、`fear` 默认从 0 开始；旧 `family/rivalry/met` 保留为结构标签或兼容 evidence。
- 旧 `weightDelta + type` 只作为迁移输入转换成 v2 `dimensionDeltas`，不再直接决定最终分数。

#### 关系星图与隐私

游戏顶栏始终提供“关系星图”固定入口。它在当前页面打开独立大面板，不离开聊天，也不改动输入草稿或场景状态。星图使用 Cytoscape.js 展示分离的有向双边，支持人物搜索、范围/正负复杂度/身份筛选、缩放、平移、拖拽、重置布局和证据详情；节点位置与筛选偏好按时间线保存在本地。键盘焦点、`prefers-reduced-motion` 和完整文本关系表作为无障碍与运行时回退。

星图只读取 player-known 投影：玩家发出的有向边、显式标记为玩家知情的边，或至少有一条 `witnessedBy` 包含 `player` 的 evidence 才可见；详情中的 evidence 还会再次按玩家见证过滤。没有玩家见证且未被告知的 NPC→NPC/NPC→玩家关系、标签和来源不会显示，也不能通过节点位置、颜色或 tooltip 暗示。NPC 知识胶囊同样只包含该 NPC 亲历或见证的关系信息；仅仅成为 `targetActorId` 不会自动获得知情权。

中央 `socialGraph` 和人物档案投影会同步进入本地 JSON 知识库。低档只能把声明当作“某人说过什么”，不能擅自视为客观真相。

低档同时执行 Canon 知识防火墙：原著人物姓名不自带未来友谊、学院关系、昵称、稳定偏好或内部笑话。`knownRelationshipActorIds` 是 NPC 已建立人物熟悉度的穷尽列表；不在列表中的人物只能依据本场刚刚亲眼看见或听见的行为被即时评价，不能被描述成早已熟识。

### 权威物品栏与 NPC 状态

- 每个物品保存 `importance`（关键/重要/普通）、`custody`（随身/装备/存放/消耗/遗失）、持有者和最后位置。每次场景初始化都会在 `scene.itemStates` 固化快照；随身与装备物品跟随玩家移动，存放物品留在原房间。
- 魔杖、钥匙、信件、日记、地图、许可证、信物和魔法制品等耐久重要物品一旦明确归玩家所有，当前回合必须提交 `itemUpdates.acquire`。旧档迁移会根据已提交的奥利凡德试杖记录补回玩家魔杖。
- 食物、糖果、饮料、包装和收据等临时小物默认不进入物品栏。只有玩家明确说“收好、带走、放进包里、留着”等行为时才允许记录。
- NPC 运行态保存 `lifeStatus`（存活/受伤/失能/失踪/死亡）、公开说明、开始时间和永久标记。每次转场时，转场导演必须为 `actorStates` 中的每个人重新结算该状态；中档可处理可逆的受伤、失能、失踪与恢复，永久死亡只能由高端世界导演提交。死亡人物不能重新在场、被地点居民规则复活或在后续场景发言。

### Canon 人物目录与故事人物预算

- `canon-characters.js` 保存 723 行离线英文身份快照；`canon-localization.zh-cn.js` 独立保存版本化简中显示名、历史别名和已确认的重复身份 redirect。英文快照重新生成时不会覆盖本地化数据，运行时也不访问外网。
- 自动选角只使用去重后、具备权威简中名称的 `CANON_PLAYABLE_CHARACTER_CATALOG`；当前覆盖 118 名核心学生、教职工、家庭成员、组织成员、幽灵和常见生物。其余英文目录仍可显式检索，但不会被自动塞进中文 UI。规则层最多向中档提供 12 名候选。
- 每条时间线通过 `castPolicy` 限制实际入库人物。默认最多 48 名，其中节奏器原创的公共过场人物最多 12 名；目标近龄关系人物 16 名，教师、父母和其他权威人物最多 12 名。新档按故事进度分阶段补足 3、6、16 名近龄人物，不会一次灌满角色库。
- 既有离场人物回归不占新槽位，但当前人物不再天然优先。中档同时考虑关系缺口、年龄匹配、偏好匹配、跨场景曝光和连续出场惩罚；完成职责的权威人物进入冷却，不能仅因已经在场而继续主导普通场景。
- Canon 人物必须使用目录中的稳定 ID 和准确姓名。中英文全名、常用短名、旧译名和无间隔写法都投影到同一 ID；确认属于同一人的长名/短名目录行先经 redirect 收敛。已经入库的 Canon 人物不得换 ID 或降级成 `temporary_actor`；Reducer 会把低档漂移出的临时 Canon 引用重写到已存在的稳定人物。
- Canon 的出生文本和 `settingTags` 来自离线目录及本地校准层。冒险、稳健、求知、社交等标签是固定设定，不是玩家关系；原创人物首次创建时同样固化出生日期和设定标签。
- `same_age / older_peer / older_generation` 等年龄层不写入人物静态档案，而是用双方固定出生日期和当前世界时间动态计算。`friend / rival / romantic_interest / mentor` 等关系标签只能在人物实际出场并建立事实关系后生成。
- 人物建档新增故事偏好页，保存故事口味、关系重点、社交密度、相对年龄偏好和 Canon 浓度。偏好只影响介绍机会，不保证友情、恋爱或其他关系结果。

### 流式生成与等待反馈

- 低档现场表演仍使用 Connection Manager 原生流式响应做截断检测和结构恢复，但生成中的半截英文与 JSON 不进入正文阅读区。
- 生成期间只保留固定的阶段卡；完整原稿完成翻译并原子写入后，界面自动定位到新回复顶部，再按叙事与对白分段从上到下平滑显影。动画结束后正文节点保持原位，不会被临时预览替换或消失。
- 中档和高档仍保持结构化原子提交，不展示半截 JSON。场景封存只把中档核心状态作为失败边界；低档开场、社交整理、世界变化、RAG 同步和日计划属于可降级或提交后的任务。界面改用分阶段生成卡显示节奏检查、人物计划、场景封存和世界演算进度。
- 所有生成卡、开场等待、人物等待和地图等待使用统一的学院封印与流动金线动效；系统启用 `prefers-reduced-motion` 时自动关闭动画。
- Profile 不支持流式时自动回退到一次性请求，完成后使用相同的顶部定位、分段显影和原子校验。

### 本地世界档案与 RAG

每条时间线会在用户数据目录建立独立档案：

```text
data/<user>/user/files/hogwarts-mud/<timeline>/
├── actors/
├── scenes/
├── events/
├── clues/
└── index.json
```

JSON 文件是权威档案；人物、场景、回合事件和预写线索按稳定 ID 更新，不依赖聊天上下文长期保留。人物档案同时包含当前玩家印象和三层共同记忆。扩展继续使用独立的 Jina `transformers` embedding 建立四个向量集合；生成式 Ollama 模型不代替向量模型。feature-extraction 单次输入固定限制为 512 tokens，空闲五分钟后自动 dispose；再次检索时按需加载。跨场景生成前先按实体 ID 精确检索，再做语义召回，合并后只注入最多六条相关记录。向量索引损坏或不可用时回退到本地精确检索，并可从 JSON 档案重建索引。

知识同步使用当前 chat 的完整快照。回滚删除消息后，同步层同时清除已不存在的事件 JSON、知识索引项和向量记录，防止被撤销的未来内容重新进入 RAG。

### 场景生命周期

- 普通玩家输入命中已有房间时，规则层先沿固定出口图校验路径并立即更新玩家及输入中明确点名同行者的权威房间，再让低档表演该回合；不调用中档，也不封存当前场景。
- 条件出口支持正向与反向分别授权。学院口令、门卫问答等只限制从公共走廊进入学院区域；从学院公共休息室向外离开不得沿用入口凭证。运行时封锁仍按具体方向生效。
- 场景封存的 `transitionMinutes` 只要求是非负整数，不设本地最大跨度。睡眠、旅行、等待、假期或长期跳时由中档按叙事需要自由决定；Prompt 要求使用自然经过时间，并明确禁止把过夜休息压进旧的三小时上限。规则层只防止时钟倒退，不对几点起床做本地裁决。
- 输入框会实时回显识别到的起点、终点和同行者；地点未知、无可通行路线或跨地图时显示对应原因，提交前不会偷偷改写位置。
- 玩家明确同意跟随或由 NPC 带路时，不需要自己知道或说出目的地。正式人物出场时会持久化中英文全名与简称 aliases，因此 `→【跟着赫敏】`、`→【Follow Hermione】` 等写法使用同一规则。预览与提交都会从点名带路人的公开活动与最近两条已提交场景消息中寻找当前地图内明确且可达的房间名、ID 或 alias；若最近动作已经抵达该房间则回显 `already_there`，找到新房间则同步提交玩家、明确同行者和带路人，确实没有目标时才返回 `guide_destination_unknown`。
- 只写场所简称时默认落到可继续互动的内部公共节点，例如“古灵阁”进入大厅；明确写“古灵阁台阶”时才停在入口节点。
- 规则层预提交玩家和输入中明确点名的同行者；已经在上下文中明确承诺带队、护送或同行的 NPC 必须由低档在同一回合走完路线，并写入目标房间和新的当前活动。
- 预设地图可以注册地点固有角色。玩家进入对应房间后，规则层会在节奏探针和低档调用前幂等地把该角色加入 `actorLibrary` 与权威房间状态；这类正常经营者、教师或职员不属于 `Pacing Director` 的“新增角色”干预，也不需要等待节奏冷却。
- 预设房间可以标记为需要独立内部图的容器地点，例如列车、船只、宿舍或其他具有稳定内部结构的建筑。玩家首次进入且本地不存在绑定地图时，中档 `Scene Cartographer` 只生成该容器的 1–4 个分区、2–16 个房间与连通出口；规则层校验后写入 `customLocalMaps` 和稳定 `interiorMapBindings`，并原子切换玩家、同房人物与随身物品。
- 中档内部图只能补齐缺失的局部拓扑，不能创建人物、物品、线索、秘密、事件或改写父地图。制图是成功转场后的非阻塞空间补全：失败时保留已提交场景并记录 `interiorMapGeneration.status = failed`，同一失败 binding 不会在刷新时无限重试；生成成功后再次进入直接复用本地绑定，不再调用模型。
- 低档的对白与人物更新白名单仍然保持严格。地点固有角色必须先由规则层准入，低档不能因为来到一家商店就自行发明店主。
- 没有情感或戏剧价值的普通赶路最多保留一两个简短节拍；恋爱、关系冲突、信息推进或即时障碍可以展开途中镜头，但本回合必须抵达目标并继续，不能停在“快到了”。
- 正式新场景必须保存一个 6–60 词的 `explorationHookEn`，并在开场前两段建立为可观察、可忽略、不会剧透的环境邀请。同场景进入新房间时，规则层要求低档补一个低风险环境细节；玩家可以检查、跟随、询问、触碰或完全忽略，系统不会把它变成强制任务。
- 本地节奏探针根据场景回合数、核心人物重合和冷却状态决定是否调用中档 `Pacing Director`；普通自动复查至少间隔 6 回合，且当前已有 3 名近龄人物时不再因全局人物预算缺口调用。未命中时不增加模型调用。
- 中档节奏介入保存为 `pacingDirector.pendingBeat`。规则层先提交获准入场的人物，低档在下一次现场表演中执行公开转机，成功后标记为已消费。
- `map.currentLocalNodeId` 保存玩家房间；每名在场 NPC 独立保存 `mapId + roomId`。低档只能沿同一张现有地图的可通行出口更新 NPC 房间。
- 低档同时收到玩家、NPC、房间和可视/可听关系。同室、相邻开放出口以及地图描述中明确存在的视线均可触发跨房间反应。
- 导演生成当前场景时同时预写默认下一场景意图、目标房间和模型档位；生成下一场景时再预写后续意图，形成连续场景链。
- 用户点击“封存场景”后会看到已填好的默认意图与档位，可以直接确认，也可以编辑文字、目标地点或切换中档/高档。
- 规则层把明确提到的现有地点解析为固定 `mapId + roomId`，模型不得改写该目标。
- 中档封存核心同时生成 `authorQuillEn`：一篇 180–280 词的 OOC 搞笑章节评价，使用具体回收梗、善意吐槽、冷面旁白和虚构奖项评价玩家表现。它只能引用玩家已经做过的事，不得泄露隐藏真相、锁定线索、NPC 私密动机、未来事件或暗骰。
- “作者的羽毛笔”随英文结算走现有翻译链，在下一场景开头显示为独立羊皮纸批注卡，并永久保存在旧场景只读档案底部。它不属于任何角色认知，也不进入世界内事件事实。
- 中档核心只提交时间、地图房间、人物状态、关系结算、旧场景摘要、下一幕结构与作者羽毛笔，不包含新场景正文、社交图或世界变化。核心输出目标保持在 1200–1800 token。
- 核心通过后，低档根据已锁定的时间、房间、人物活动和环境钩子生成 2–6 个开场分段。低档开场无效时使用规则层短开场，不回滚已经合法的封存核心。
- 旧场景尚未整理的社交证据在提交后交给现有单模型 LangGraph 异步回填。失败只保留 pending 与错误信息，不影响当前场景。
- 当 `nextClock` 至少跨越 7 个完整日时，提交后才按需生成 `worldChanges`；长转场生成 1–4 条《预言家日报》边角新闻，并从旧场景同房间见证者的公开事件创建至少一个流言包。失败保留 pending，可在重新载入时间线时重试。
- 流言只能由已知情人物继续传播，接收者必须引用现有人物 ID；未被列为来源或接收者的 NPC 不会自动知道。每次传播最多增加一级失真，连续 28 天无人传播后自动淡出。
- 下一幕低档只收到每名在场 NPC 自己听过的版本。直接见证者保留真相底稿，其他人物不得从 RAG 或别人的人物档案中越权获得原始事件。
- 旧场景、消息范围、时间、地点、收束摘要和“作者的羽毛笔”写入 `sceneArchive`，随后原子提交新场景、当前房间和在场人物。提交成功后，RAG 同步、每日导演、社交整理或世界变化失败都不能再把 UI 改成“封存失败”。
- 结算失败时保留旧场景；结算成功后，左侧“场景档案”可打开旧场景的只读转录，但不能继续发送消息。

### 世界地图

地图分为两层：

- `world-data.js`：英国总览，包含三个区域和十个原著地点。
- `map-pack.js`：分层 MUD 图谱，包含 10 张地点地图、35 个楼层/分区、203 个固定节点和 194 条出口。

霍格沃茨城堡预置地下层、底层、一至七楼和塔楼层，共 76 个房间/走廊节点；格兰芬多公共休息室通过固定螺旋楼梯出口连接女生宿舍容器。其他地点包括霍格沃茨场地、霍格莫德、对角巷、翻倒巷、魔法部、国王十字、圣芒戈、戈德里克山谷和阿兹卡班。

预设数据记录楼层、房间、走廊、坐标、门禁、移动时间、条件出口和地点固有角色。AI 每轮只接收全局地图目录、当前详细小地图和运行时差异，不重复发送全部 203 个节点。

原著地点和房间是锁定底图。运行时只写入：

- 当前小地图、楼层和房间。
- 已发现的秘密位置。
- 临时封锁、损坏、占用和改道。
- 因重大世界事件真正产生的新空间。

叙事 AI 无权重写地图。高级 AI 的结构变更提案必须先通过规则层校验，之后才写入 `chatMetadata.hogwartsMud.map`。

玩家输入中的同地图移动由规则层在调用低档前确定性解析并提交，不等待场景结束，也不触发场景封存。普通移动只带上语句中明确点名且位于有效路线上的同行者；明确的 NPC 带路行动还会同步带路人，并允许目的地只存在于带路人的公开上下文中。跨小地图移动、不存在可通行路线或无法安全确认带路目标时不会偷偷改写位置，需要通过场景切换或规则结算处理。小地图使用金色菱形显示玩家，用姓名首字母圆章显示各 NPC 的独立房间位置。

地图使用同一个 SVG 节点图渲染器展示在：

- 人物卡最终预览。
- 游戏左侧场景栏小地图。
- 地图检查器大图。

地图包含区域轮廓、路线、地点节点、当前位置、已发现地点和世界导演生成地点。三处读取同一份 `chatMetadata.hogwartsMud.map` 状态，不是静态装饰图。

当玩家进入已绑定的生成式内部图时，主小地图和地图检查器自动回到“跟随当前位置”，清除父地图遗留的楼层筛选；玩家之后仍可主动切换到其他地图浏览。

人物卡预览和游戏地图检查器都可切换十张地点地图。多层地点还可进一步选择楼层。

## Presence/Witness 档案迁移

`scripts/migrate-hogwarts-presence-witness.mjs` 将存量 Hogwarts MUD 档案确定性迁移到 presence/witness schema v1。默认聊天目录是 `data/default-user/chats/Hogwarts_World_Director`，默认备份目录是 `data/default-user/backups/hogwarts-presence-witness-v1`；其他用户目录可通过 `--chat-directory` 和 `--backup-root` 显式指定。

```bash
# 单文件预览；不写原档
node scripts/migrate-hogwarts-presence-witness.mjs --dry-run --file path/to/chat.jsonl

# 全部档案预览
node scripts/migrate-hogwarts-presence-witness.mjs --dry-run --all

# 迁移单文件或全部档案；apply 前创建逐文件备份和 SHA-256 manifest
node scripts/migrate-hogwarts-presence-witness.mjs --apply --file path/to/chat.jsonl
node scripts/migrate-hogwarts-presence-witness.mjs --apply --all

# 使用 apply 输出中的 manifestPath 恢复
node scripts/migrate-hogwarts-presence-witness.mjs --restore-manifest path/to/manifest.json
```

必须且只能选择 `--file` 或 `--all`；不写模式时默认为 `--dry-run`。`--restore-manifest` 独立使用，不能与选择或模式参数组合。`--apply` 通过临时文件、`fsync` 和 atomic rename 替换原档，输出 before/after hash、修改字段、事件/occupant/witness 数与低置信度跳过数；校验失败时不替换原文件。稳定事件与见证 ID 使重复运行保持幂等。

迁移只读取本地 metadata、回合事务、场景档案、人物位置和结构化事件证据，不改正文、消息顺序/ID、scene ID、clock、turn、cursor、关系数值、evidence ID、共同记忆冷却或物品状态。证据不足时保留旧 witness 并标记低置信度，不猜测或扩张。CLI 在进程内阻断 `fetch`、HTTP(S)、TCP 和 TLS 网络调用，禁止 Connection Manager、`/generate`、翻译、Social Director 及任何用户模型 API；结果中的 `networkCalls` 必须为 `0`，否则命令失败。

## 使用

1. 安装 Ollama 并执行 `./scripts/setup-hogwarts-ollama.sh qwen3:1.7b`。项目内安装也可通过 `HOGWARTS_OLLAMA_BINARY` 指向可执行文件。
2. 启动 SillyTavern。侧车会优先连接现有 Ollama；未运行时自动启动项目缓存中的二进制。
3. 打开“扩展程序”菜单并点击 `Hogwarts MUD`。
4. 在档案大厅新建或读取时间线。
5. 新档案完成人物卡、故事偏好和三档 AI 配置。
6. 确认人物卡后开始第一回合。

顶部“更多 → 默认翻译”可选择本地 4B、Google、Bing 或不开；“更多 → 配置”仍可编辑世界 Prompt、导入 Preset 或 Regex；“更多 → 人物卡”可以在游戏开始后查看或更新人物卡与模型槽位。

输入框支持动作、台词、内心和施法混合输入：

- `Enter` 换行。
- `Ctrl/Command + Enter` 提交。
- 移动使用 `→【地点】`。点击“→ 移动”会打开当前小地图的快捷地点目录：只列出从当前位置有合法路径、且当前身份可见的地点，当前楼层优先并按楼层分组；支持按中英文名称、楼层和房间 ID 搜索。选择地点后仅写入结构化标记，提交回合时才校验并移动；“手动填写地点”保留自由输入。
- 普通文本提到地点时只显示候选卡，不会改变位置。提交前必须选择“设为移动”或“仅提及”。
- 例如“我之前去过古灵阁”默认只是对话；`→【古灵阁】` 才授权规则层移动。
- 施法使用 `✦【咒语:stable_spell_id】`。咒语面板默认只显示已学咒语，也可切换到完整常见咒语目录进行自学或实验；标记可以放在动作或台词中，出现后必定触发本地 D20。
- “主动判定”会强制本回合使用本地 D20 规则；普通提交也会自动识别推搡、攻击、潜行、调查、智识、意志、社交和施法判定。

### 咒语本与熟练度

- 权威咒语目录保存稳定 ID、原文咒文、效果、目标类型、难度、风险、合法性和常规课程年级。
- `curriculumYear` 只表示霍格沃茨通常何时教学，绝不限制学习或施放。玩家可以在任何年级通过课堂、图书馆自学、私下教授或自行实验学会任意咒语。
- 课堂正文明确教学或示范某个咒语时，该咒语自动进入咒语本；玩家首次结构化尝试未知咒语时，也会按“自行实验”或“自行学习”进入咒语本。
- 熟练度按每次施法判定增长：失败仍获得少量经验，成功、重大成功获得更多经验。等级分为初学、练习中、熟练、精通和专家。
- 已学咒语会出现在输入框快捷栏和检查器“咒语”页；未知咒语不会占用快捷栏，但始终可以从完整目录尝试。

### 本地 D20 判定

- 判定在请求低档前完成，不额外调用 AI。低档收到已经落定的 `checkResolution`，只能依据其结果续写。
- 玩家检定使用 `D20 + 属性修正 + 技能修正 + 装备修正 + 熟练度修正 + 情境修正`；优势与劣势投 2D20 并取高或取低。未学咒语仍可施放，但承受初次实验修正和更高难度。
- 正面对抗会为 NPC 生成本地暗骰。玩家只看到自己的骰面、修正、总值、对抗对象和结果等级；NPC 骰与精确 DC 不展示。
- 结果分为灾难性失败、失败并产生后果、成功但付出代价、完全成功和重大成功；天然 1/20 会将结果降低或提高一级。
- 骰值先写入玩家消息，再请求低档。请求失败或页面恢复时复用同一骰值，不允许通过重试刷骰。
- 完成后的判定随回合事务写入 `checks` 历史，并在对话流中保留 D20 判定卡。

玩家消息始终先于模型请求写入存档。若低档调用或结构校验失败，原消息不会删除，消息下方会显示失败原因与“重试本回合”；重试复用同一条消息、显式移动和骰值，不追加重复输入。失败回合解决前输入框保持锁定，刷新页面也不会自动发起一次隐藏重试，避免消息顺序错乱和额外 Token 消耗。

## 翻译源

默认翻译端点使用本地 Ollama：

```text
POST /api/hogwarts-mud/local/translate
```

本地端点以 `qwen3:4b` 和 JSON Schema 返回单个 `translation` 字段。结构化状态、档案字段和分段正文逐字段提交，单块最多 3600 字符；英文原文直接发送，相关人物、地点和魔法术语通过 glossary 约束，咒语名称和咒文保持原文不翻译。每块只调用一次并直接采用模型返回的译文，不因残留英文等质量判断拒绝写入；用户可从消息右上角的 `EN` 菜单手动重译。最后一块完成后立即卸载模型。

Google 和 Bing 保留为无密钥回退端点：

```text
POST /api/translate/google
POST /api/translate/bing
```

Google 端点使用 `google-translate-api-x`，Bing 端点使用 `bing-translate-api`。Google 固定源语言为英语并使用 4700 字符安全批次，Bing 使用 900 字符安全批次。两者会在翻译前把人物、地点和高频魔法术语替换为稳定占位符，翻译后恢复权威中文名称。切换翻译源会按来源和格式版本刷新当前范围内的缓存；任何 provider 失败都不会覆盖英文原文。

## 模块地图

导入只能指向更低层；允许跳过中间层，但不允许反向依赖：

```text
core <- state/domain <- runtime/adapters <- workflows <- ui <- index.js
```

| 层 | 目录或文件 | 职责 |
| --- | --- | --- |
| Core | `core/` | Context 预算、稳定值工具、JSON 恢复；不访问业务状态或宿主。 |
| State/Domain | `domain/` | Schema、normalize、validate、migration、projection、Reducer 和确定性规则。 |
| Runtime | `runtime/` | 状态 port、只读策略、任务互斥、宿主事件、存档生命周期。 |
| Adapters | `adapters/` | Connection Manager、知识库、本地语义和翻译端口适配。 |
| Workflows | `workflows/` | 开局、导演、社交记忆、室内地图、普通回合和转场事务编排。 |
| UI | `ui/` | View model、renderer、controller、控件状态和 action 绑定。 |
| Composition | `index.js` | 依赖组装、根 DOM、宿主事件生命周期、兼容导出和幂等 `init()`。 |

`world-data.js`、`map-pack.js`、`canon-characters.js` 和本地化目录是数据/目录源。
`presence-witness-contract.js`、`spell-catalog.js` 是仍保留原公开路径的领域契约。
`knowledge.js`、`relationship-graph.js` 和服务端 graph 是宿主集成模块，必须直接导入真实领域模块。

### 修改落点

| 修改类型 | 首选落点 |
| --- | --- |
| Context 裁剪、JSON 恢复 | `core/context-budget.js`、`core/json-recovery.js` |
| Campaign、人物草稿、初始世界 | `domain/campaign.js`、`domain/character.js`、`domain/initial-world.js` |
| 物品、物质、外观、法术 | `domain/inventory.js`、`domain/material-state.js`、`domain/appearance.js`、`domain/spell-state.js` |
| 人物身份、知识、记忆、选角 | `domain/actor-*.js`、`domain/cast.js` |
| 社交 Schema、迁移、投影、Reducer | `domain/social-*.js` |
| 判定、时间、节奏、因果 | `domain/checks.js`、`domain/time-environment.js`、`domain/pacing-*.js`、`domain/causal-*.js` |
| 回合协议、校验、提交、回滚 | `domain/turn-*.js` |
| 转场、世界变化、档案 | `domain/scene-*.js`、`domain/world-changes.js`、`domain/archive-projection.js` |
| 地图、寻路、移动、空间 | `domain/maps.js`、`domain/pathfinding.js`、`domain/movement.js`、`domain/spatial-*.js` |
| 翻译术语、Preset/Regex 导入 | `domain/translation.js`、`domain/preset-import.js` |
| 模型或宿主 I/O | `adapters/` 或 `runtime/`，领域层只接收显式参数/port |
| 跨领域用户流程 | `workflows/`，不得复制领域 normalize、validate 或 Reducer |
| 页面、面板、输入与事件 | `ui/`，通过注入的 action 调 workflow |

### 依赖与兼容规则

- `helpers.js` 只供扩展外部调用方和旧测试兼容使用；它只能 re-export，不得包含函数实现、DOM、网络或存档副作用。
- Hogwarts MUD 生产模块（包括 `index.js`）不得导入 `helpers.js`；任何生产模块不得导入 `index.js`。
- 内部调用方直接从 `core/`、`domain/`、`runtime/`、`adapters/`、`workflows/` 或 `ui/` 的真实所有者导入 named export。
- Workflow 通过 runtime/adapter port 读写宿主；UI 只发 action；领域模块不得读取 UI 或 workflow 状态。
- 新公开兼容符号先在真实模块实现，再由 `helpers.js` re-export；不得在门面复制实现。
- 静态模块图同时扫描静态 import、动态 `import()` 和 re-export，并拒绝循环、逆层和门面反向依赖。

### 文件大小门禁

- `index.js` 必须不超过 600 行。
- `helpers.js` 必须不超过 350 行，并且只包含 import/export、注释和兼容常量别名。
- 手写逻辑模块以 1,500 行为拆分目标，达到 2,000 行直接失败。
- 纯数据目录、样式和测试 fixture 可豁免；Presence/Witness 与 Social Director 等逻辑模块不设 grandfather 配额。
- `tests/hogwarts-mud-task1-baseline.test.mjs` 是模块图、顶层副作用和全局大小门禁的权威检查。

### 回合诊断

每个新回合都会把本地诊断包写入对应消息的
`extra.hogwartsMud.turnDiagnostics`。诊断只保留最近 8 个回合，每个回合最多
32 个阶段事件，长文本自动截断；不会记录 Connection Profile、密钥或请求头。
诊断包含玩家原文、context 裁剪前后的权威输入、initial/repair 原始输出、
validator/settlement 结果和最终提交摘要。

排查回合问题时先读取这些诊断，不得默认重新调用模型。Chrome 中可通过
`SillyTavern.getContext().chat` 读取，磁盘上可直接查看对应 JSONL 消息。
只有现有诊断不足且用户明确同意时，才执行真实模型重放。

## 开发验证

### 完整离线验收

以下命令不得访问远端模型、翻译服务或 Ollama。

```bash
# 分层模块边界
node --experimental-vm-modules --test \
  tests/hogwarts-mud-task1-baseline.test.mjs \
  tests/hogwarts-mud-task2-modules.test.mjs \
  tests/hogwarts-mud-task3-contract.test.mjs \
  tests/hogwarts-mud-task4-boundaries.test.mjs \
  tests/hogwarts-mud-task5-workflows.test.mjs \
  tests/hogwarts-mud-task6-ui-contract.test.mjs

# 全部 Hogwarts Node 测试，包含 Social/Presence/Witness
node --experimental-vm-modules --test tests/hogwarts-mud*.test.mjs

# Hogwarts 生产代码和测试 ESLint
find public/scripts/extensions/hogwarts-mud src/hogwarts-mud \
  -type f -name '*.js' -print0 | xargs -0 npx eslint
find tests -maxdepth 1 -type f \
  \( -name 'hogwarts-mud*.js' -o -name 'hogwarts-mud*.mjs' \) \
  -print0 | xargs -0 npx eslint

# 所有 Hogwarts 生产模块语法检查
find public/scripts/extensions/hogwarts-mud src/hogwarts-mud \
  -type f \( -name '*.js' -o -name '*.mjs' \) -print0 |
  xargs -0 -n1 node --check

git diff --check
```

只读浏览器验收需要先在一个终端运行 `npm start`，再在另一个终端运行：

```bash
cd tests
npx playwright test \
  hogwarts-mud-module-init.e2e.js \
  hogwarts-mud-readonly.e2e.js \
  --workers=1 --retries=0
```

两个 E2E 会阻断并统计 `/generate`、翻译、本地语义、Social Director 和聊天保存请求，同时核对 Tina fixture 的 SHA-256 与 mtime。任何被禁止请求、模块非 2xx/MIME 错误、`pageerror` 或档案变化都会失败。

### 单次模型验收

本阶段属于 Task 8，只能在完整离线验收全部通过后运行；日常开发和 Task 7 禁止执行。验收脚本必须使用可丢弃存档、关闭翻译、为本地语义提供确定性 fallback，并在浏览器和上游代理两层将远端生成硬预算设为 1：

```bash
cd tests
HOGWARTS_REAL_MODEL_ACCEPTANCE=1 \
HOGWARTS_ACCEPTANCE_GENERATE_BUDGET=1 \
npx playwright test hogwarts-mud-single-model.e2e.js \
  --workers=1 --retries=0
```

`hogwarts-mud-single-model.e2e.js` 在 Task 8 实现前不得用临时脚本替代。正式 harness 必须断言生成尝试数、代理放行数和上游确认数均为 1；第二次尝试在到达上游前返回 429；玩家/助手消息各增加一条，`turn.count +1`、状态回到 `idle`，segments 与 transaction 合法；刷新后新增调用为 0，最后清理可丢弃存档。
