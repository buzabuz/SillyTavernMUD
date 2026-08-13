# Save Revision Guard 与 NPC Identity V1 Spec

## Why

当前世界状态没有跨页面 revision 门禁，旧浏览器运行态可以覆盖较新的 JSONL 权威；未来事件跳跃会同时结算 Item、NPC 与 Calendar，这个风险会被放大。NPC 目前也只有分散的长期字段，缺少可迁移、可审计、无需模型补全的正式 Identity Schema。

## What Changes

* 新增 `timelineEpoch + stateRevision` 保存门禁，所有 Hogwarts MUD metadata/chat 保存先检查 revision，再决定提交或拒绝。

* 新增有界 revision history，保留 Item 与 NPC Identity 的结构化 before/after 对比，供未来事件跳跃、重车与审计使用。

* 新增 NPC Identity V1：性别、出生、教育、血统和结构化身体状态。

* 新增 Identity authority/self/other 三类写入边界：权威写 Identity，自称/他称只写 claim。

* 家庭完全保留在人际关系系统，不进入 NPC Identity。

* “自称有一个哥哥”创建未知 `personRef + relationshipClaim`，不创建 actor；权威只用一个 `nonexistent` 状态表示该人物并不存在。

* Canon 人物由离线版本化注册表确定性填充完整 Identity Schema；缺失事实为 `unknown`，禁止调用模型猜测。

* NPC Identity UI 延续关系星图的深夜蓝、墨绿、金色细线、紫罗兰星点和档案式信息层级，同时保持当前 Inspector 交互与响应式布局。

本变更不实现 Calendar、蒙太奇、经济账本或模型直接写 Item。未来事件跳跃仍只能提交 proposal，由各领域 Reducer 生成 diff 后通过 revision guard。

## Impact

* Affected specs:

  * Hogwarts runtime contracts

  * Social Graph / relationship claims

  * Actor library / Canon registry

  * Save / lifecycle / diagnostics

  * Inspector UI

* Affected code:

  * `public/scripts/extensions/hogwarts-mud/runtime/*`

  * `public/scripts/extensions/hogwarts-mud/domain/actor-*`

  * `public/scripts/extensions/hogwarts-mud/domain/social-*`

  * `public/scripts/extensions/hogwarts-mud/canon-characters.js`

  * `public/scripts/extensions/hogwarts-mud/ui/inspector-controller.js`

  * `public/scripts/extensions/hogwarts-mud/style.css`

  * workflow/application save ports and tests

## Design Constraints

### 精简原则

* `imaginary` 与 `fabricated` 不分开，统一为 `nonexistent`。

* 不创建通用知识图谱，不为每条声明创建 NPC。

* Identity 保存非关系型人物事实和身体本身；家庭、亲属、监护与婚姻全部属于人际关系系统。

* 当前 goal、mood、activity 不进入 Identity。

* `currentPresentation` 只保存附着物与手持物：帽子、衣服、首饰、穿戴 Item、手持 Item。

* 发型、染发、伤势、疤痕和当前身体形态属于 `identity.body`，使用 `asOfClock` 表示当前身体状态。

* 自称/他称不覆盖权威；冲突声明并存。

* 用户不接触 revision、字段置信度、来源优先级等技术参数。

### 权威层次

```text
actor.identity
  = 世界权威，未必对玩家可见

socialGraph.identityClaims[]
  = 自称/他称的结构化身份说法

socialGraph.relationshipClaims[]
  = 家庭等关系说法

socialGraph.personReferences[]
  = 尚未成为 actor 的被提及人物

Identity UI
  = 按玩家已知 authority/claims 生成的只读 projection
```

## ADDED Requirements

### Requirement: Save Revision State

系统 SHALL 为每条 Hogwarts 时间线维护：

```text
saveRevisionVersion = 1
timelineEpoch
stateRevision
revisionHistory[]
```

* `timelineEpoch` 在同一时间线内稳定；新时间线生成新 epoch。

* `stateRevision` 是非负、单调递增整数；rollback 不得降低 revision。

* 旧档通过确定性迁移获得 epoch/revision，不调用模型。

* `revisionHistory` 最多保留 48 条。

#### Scenario: 旧档首次加载

* **WHEN** 存档没有 revision 字段

* **THEN** 系统确定性补齐 epoch、revision 和空 history

* **AND** 第二次加载 byte-stable

#### Scenario: 新时间线

* **WHEN** 玩家建立新时间线

* **THEN** 系统生成不同于其他时间线的 epoch

* **AND** revision 从初始值开始单调增加

### Requirement: Stale Save Rejection

系统 SHALL 在 Hogwarts 扩展发起 metadata 或 chat 保存前，对比页面持有的 `timelineEpoch/stateRevision` 与同时间线最新 head。

* 同源页面优先使用 Web Locks 串行化 revision claim；不支持 Web Locks 时使用同步 storage adapter fallback。

* 页面 revision 落后时必须拒绝保存，不得覆盖新状态。

* 冲突不自动合并、不自动重放模型、不自动刷新。

* UI 显示简短中文冲突提示并禁用会继续写世界的操作，直到用户重新载入时间线。

* translation/settings 等非剧情保存也必须先通过 stale 检查，防止其携带旧 metadata 覆盖新世界。

#### Scenario: 两个页面先后保存

* **WHEN** 页面 A 与 B 都从 revision 12 打开

* **AND** A 成功提交 revision 13

* **AND** B 尝试保存旧 revision 12

* **THEN** B 的保存被拒绝

* **AND** revision 13 的世界状态保持不变

* **AND** B 收到可恢复的冲突结果

#### Scenario: rollback 后保存

* **WHEN** revision 20 的时间线回滚到较早剧情状态

* **THEN** rollback 作为 revision 21 提交

* **AND** timelineEpoch 不变

* **AND** 旧 revision 20 页面不能覆盖 revision 21

### Requirement: Revision Diff

每次产生世界状态变化的成功提交 SHALL 追加一条有界日志：

```text
id
baseRevision
revision
source
committedAt
changedDomains[]
itemChanges[]
identityChanges[]
```

* `itemChanges` 只保存稳定 Item ID 及 owner/holder/location/state 的 before/after。

* `identityChanges` 只保存 actor ID、field path 及 before/after。

* 不保存完整世界快照、不保存 secrets、不复制聊天正文。

* 没有世界变化的 chat-only 保存只执行 stale 检查，不制造空 revision。

* 未来事件跳跃必须以 `baseRevision` 提交 proposal；Reducer dry-run 的 diff 可直接复用该格式。

#### Scenario: 事件结算改变物品

* **WHEN** Reducer 将一个 Item 从 `holder=player` 改为 `holder=npc`

* **THEN** revision history 保存该 Item 的 before/after

* **AND** 模型原始输出不能作为最终权威 diff

### Requirement: NPC Identity V1

每个稳定 actorLibrary profile SHALL 具备：

```text
identity.version = 1
identity.gender
identity.birth
identity.education[]
identity.lineage
identity.body
identity.provenance
```

#### Gender

```text
code = female | male | nonbinary | other | unknown
label
```

#### Birth

```text
date
year
precision = exact | year | unknown
```

* 只有官方确认到日的生日保存 `date + exact`。

* 只有官方确认到年的出生信息保存 `year + year`。

* “某学年出生”“某两日期之间出生”之类区间不存 earliest/latest，不作为生日展示，统一为 unknown。

* 年龄、相对年龄和年龄段只在 exact date 下由当前世界时钟派生；year-only 不输出伪精确年龄。

* 教育年级由 enrollment 独立派生，不允许用出生区间污染 birth。

#### Education

```text
schoolId
houseId
entryYear
exitYear
status = prospective | enrolled | graduated | left | expelled | unknown
yearOverride
```

* 当前年级与在学状态由世界日期、入学记录和 override 派生。

* `roleEn` 继续作为兼容显示字段，不再是学校/年级权威。

#### Lineage

```text
status = pure_blood | half_blood | muggle_born | muggle | unknown
basis
```

* 父母 actor ID 和家庭关系不存入 Identity。

* 血统可由权威 Canon 直接写入，或由已确认的人际关系事实派生。

* 从孩子血统反推父母时只能生成约束/claim，不能创建父母 actor 或权威家庭关系。

#### Body

```text
height = category / centimeters / precision / asOfClock
build
naturalHairColor
hairColor
hairStyle
eyeColor
features[]
injuries[]
injuryAssessment
form
```

* 不从描述词捏造厘米数。

* 儿童身高可随 `asOfClock` 更新。

* `naturalHairColor` 保存身体基线；`hairColor/hairStyle` 保存当前身体状态。

* injuries 保存 type、description、status、startedClock、resolvedClock；已恢复伤势可保留有界历史。

* injuryAssessment 保存最近一次有证据的身体检查结论：visible\_injury、no\_visible\_injury 或 unknown，并带 asOfClock；“未观察到伤势”不写入 injuries\[]。

* form 保存当前身体形态及 `asOfClock`，用于人形/Animagus/其他已证实变形连续性。

* 帽子、衣服、首饰、穿戴 Item 与手持 Item 继续属于 current presentation。

* 污渍若附着于身体写 body condition；若附着于衣物或物品写 current presentation/material。

#### Scenario: 派生当前年级

* **WHEN** actor 在 1991 年入学且当前世界日期处于 1991 学年

* **THEN** projection 显示一年级和在学

* **AND** 不把派生结果反写成不可变出生事实

#### Scenario: Canon 只有出生学年范围

* **WHEN** Canon 原始目录写 `1 September 1979 - 31 August 1980`

* **THEN** Identity birth 为 unknown

* **AND** 不保存 earliest/latest

* **AND** UI 不显示日期区间或“至”

#### Scenario: 身体与当前呈现分离

* **WHEN** 权威自然发色为棕色，角色将头发染成绿色并戴上帽子

* **THEN** Identity body 保存 naturalHairColor=棕色、hairColor=绿色

* **AND** current presentation 只保存帽子及其他附着物

#### Scenario: 伤势属于身体

* **WHEN** 角色手臂受伤且有已提交证据

* **THEN** Identity body injuries 增加 active 伤势和 startedClock

* **AND** current presentation 不保存该伤势

#### Scenario: 主动检查未发现伤势

* **WHEN** 玩家明确检查在场 NPC 的伤势，且 narration 明确写出未观察到可见伤害

* **THEN** 授权 Identity Reducer 写入 body.injuryAssessment=no\_visible\_injury、asOfClock 和 direct\_observation provenance

* **AND** injuries\[] 保持为空

* **AND** 档案字段显示“未观察到伤势【观察】”

* **AND** NPC 单独说“我没受伤”只属于 self claim，不能作为权威观察写入

### Requirement: Identity Claims

自称和他称 SHALL 写入 `socialGraph.identityClaims[]`，不直接修改 `actor.identity`。

```text
id
subjectId
fieldPath
value
sourceKind = self | other
speakerId
sourceMessageIds[]
witnessedBy[]
clock
```

* self 表示 `speakerId == subjectId`。

* other 表示说话者对另一人物的说法。

* claim 必须有合法 speaker、subject、消息证据和 witness。

* 权威写入只由 Canon、用户确认、迁移或授权 Reducer 完成。

* 同一字段的冲突 claims 并存；玩家 projection 只展示玩家知道的说法。

#### Scenario: NPC 自称血统

* **WHEN** Draco 自称 pure-blood，玩家亲耳听见

* **THEN** 创建 self identity claim

* **AND** 不覆盖 authority lineage

* **AND** 玩家人物档案可看到“自称”

### Requirement: Family Claims Outside Identity

家庭 SHALL 继续属于 Social Graph。系统 SHALL 支持：

```text
socialGraph.personReferences[]
  id
  label
  status = unresolved | resolved | nonexistent
  actorId

socialGraph.relationshipClaims[]
  id
  subjectId
  relationshipKind
  targetRefId
  sourceKind = self | other | authority
  speakerId
  sourceMessageIds[]
  witnessedBy[]
  clock
```

* `personReference` 不是 actor，不进入 actorLibrary、presence、memory、cast budget 或人物星图节点。

* `resolved` 必须绑定现有或正式新建 actor。

* `nonexistent` 同时覆盖幻想、编造或不存在，不再细分。

* 后台 authority resolution 默认隐藏；玩家仍只知道自己获得的 claim。

* 只有 resolved 且 authority 确认的家庭关系才能成为正式 Social Graph family edge。

#### Scenario: 自称有一个哥哥

* **WHEN** NPC 说“我有一个哥哥”且没有可解析 actor

* **THEN** 创建 unresolved person reference

* **AND** 创建 sibling relationship claim

* **AND** 不创建 NPC

#### Scenario: 权威确认人物不存在

* **WHEN** authority 将该 person reference 标记为 nonexistent

* **THEN** 不创建 actor 或 family edge

* **AND** 原始自称及其 witness 记录继续保留

* **AND** 未获知真相的角色不能自动识破

### Requirement: Canon Identity Registry

系统 SHALL 为 Canon 人物提供离线、版本化、确定性的 Identity Registry。

* 所有可进入 actorLibrary 的 Canon 人物都得到完整 Identity Schema。

* 原始目录已有 gender/species/ancestry/house/role/born 等字段必须确定性映射。

* 核心人物的结构化身体基线使用书籍或官方资料；电影演员外貌不混入默认 Canon。

* 缺少的字段写 `unknown`，禁止调用模型推理。

* 每个已知字段保留 source tier 和有效时间，避免把未来职业、组织或年级投影到较早年份。

* Identity migration 和 Canon hydration 不调用低、中、高档模型。

#### Scenario: Canon 人物首次入场

* **WHEN** Harry 通过 Canon catalog 加入 actorLibrary

* **THEN** Identity 从离线注册表填充

* **AND** 不产生身份模型请求

* **AND** 当前年级按世界日期派生

#### Scenario: Canon 字段未知

* **WHEN** 某个边缘 Canon 人物没有权威 eye color

* **THEN** eyeColor 为 unknown

* **AND** 系统不根据电影演员或语言模型补值

### Requirement: Identity Migration

系统 SHALL 将现有 actorLibrary/runtime actor 确定性迁移到 Identity V1。

* 保留 actor ID、names、aliases、memory、knowledge、social state 和 presentation。

* 旧 presentation 中的 hair/hairstyle/visible injury 确定性迁入 identity.body；衣服、帽子、饰品和手持物继续留在 presentation。

* 现有 `fixedBirthText/birthYear/roleEn/settingTags` 作为受限迁移输入。

* Canon profile 优先使用 Canon Identity Registry。

* 原创/临时人物缺失字段为 unknown。

* runtime actor 可以保留轻量 identity projection，但 actorLibrary 是稳定 Identity 权威。

* 重复迁移 byte-stable。

#### Scenario: 当前存档迁移

* **WHEN** 加载现有 Tina 时间线

* **THEN** 21 个稳定 actorLibrary profile 获得 Identity V1

* **AND** 原有记忆、关系、位置和 Item 引用不变

### Requirement: Identity Prompt Boundary

低、中、高档模型 SHALL 只读取与其权限和当前时间匹配的 Identity projection。

* authority Identity 不等于玩家或 NPC 已知事实。

* self/other claims 按 witnessedBy/knowledge boundary 投影。

* 模型不得直接写 authority Identity、person reference resolution 或正式 family edge。

* 模型只可提交 evidence-grounded claim proposal。

* Daily goal/current intent 不得写入 Identity。

#### Scenario: 隐藏的不存在判定

* **WHEN** authority 知道某 claimed brother nonexistent，但当前 NPC 未获知

* **THEN** NPC prompt 只能看到原 claim

* **AND** 不得看到 nonexistent resolution

### Requirement: Identity UI

人物 Inspector SHALL 增加只读 Identity dossier，并保持关系星图视觉语言：

* 深夜蓝/墨绿基底、低饱和金色边框、紫罗兰星点、轻微星图纹理；

* Georgia/现有 display font，禁止引入新外部字体依赖；

* 顶部身份徽记与名称，下面按“基本身份 / 教育 / 血统 / 身体状态 / 已知说法”分组；

* authority、自称、他称、派生标签必须跟随具体字段值或具体 claim，不得标在“基本身份 / 教育 / 血统 / 身体状态”等模块标题上；

* 每个已知权威字段显示“权威”；按出生日期或入学记录计算的年龄/年级显示“派生”；每条 claim 分别显示“自称”或“他称”；

* unknown 字段不显示“权威”，避免把“权威未知”误读为已确认事实；

* unknown 使用低对比占位，不隐藏整个字段；

* 家庭说法只出现在关系/声明区域，不出现在 Identity 基本字段；

* 不显示后台 source tier、revision 或 nonexistent resolution；

* 390px 窄屏单列；键盘可达；支持 `prefers-reduced-motion`；

* 不使用定时滚动、强制定位或模型调用。

#### Scenario: 玩家查看 Canon NPC

* **WHEN** 玩家在人物栏或关系星图打开 Harry

* **THEN** Inspector 显示 Identity dossier

* **AND** 视觉与关系星图一致

* **AND** 学院、年级和身体状态来自 deterministic projection

#### Scenario: 玩家查看冲突说法

* **WHEN** 玩家知道两个不同的血统说法

* **THEN** UI 在“已知说法”中分别显示来源

* **AND** 不擅自选择一个作为玩家已知真相

#### Scenario: 来源标签跟随字段

* **WHEN** 性别来自 Canon authority、年级由入学记录派生、血统存在一条 NPC 自称

* **THEN** 性别字段行显示“权威”

* **AND** 年级字段行显示“派生”

* **AND** 血统 claim 行显示“自称”

* **AND** 模块标题不显示任何来源标签

### Requirement: Diagnostics and Tests

系统 SHALL 为 revision conflict、identity migration、claim validation 和 Canon hydration 提供可读取 diagnostics 与自动化测试。

* revision conflict 至少记录 epoch、expectedRevision、actualRevision、source，不记录秘密字段。

* Identity tests 覆盖正常值、unknown、时间派生、迁移幂等和权限隔离。

* Relationship claim tests 覆盖 unresolved、resolved、nonexistent 及“不创建 actor”。

* UI tests 覆盖内容分组、窄屏、键盘焦点和 reduced motion。

* 全量 Hogwarts 测试、ESLint、语法、diff 与模块尺寸门禁必须通过。

## MODIFIED Requirements

### Requirement: Existing Save Calls

现有 Hogwarts MUD 直接 `context.saveMetadata()/saveChat()` 调用 SHALL 通过统一 guarded save port。宿主非 Hogwarts 功能不受影响。

### Requirement: Existing Social Statements

现有家庭/出身/教育/身份声明 SHALL 保留原始文本和 evidence。可结构化映射的声明迁移为 identity/relationship claim；无法安全映射的声明继续作为旧 statement，不猜测 target 或 field value。

### Requirement: Existing Actor Inspector

现有人物印象、共同记忆、关系、Item 和对话快捷操作 SHALL 保留。Identity dossier 是新增分组，不替代关系星图或 current presentation。

## REMOVED Requirements

### Requirement: Family as NPC Identity

**Reason**: 家庭是人物之间的关系事实或关系说法，不是单个人物的非关系型身份字段。

**Migration**: 已有 family statement 保留在人际关系系统；只有已解析 actor 间的 authority family relation 才形成正式 family edge。

### Requirement: Separate Imaginary and Fabricated States

**Reason**: 第一版不需要区分幻想、编造与其他不存在原因。

**Migration**: 统一映射为 `personReference.status = nonexistent`。
