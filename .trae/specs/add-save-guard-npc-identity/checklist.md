# Save Revision Guard

- [x] 旧档获得稳定 timelineEpoch、非负 stateRevision 和空 revisionHistory。
- [x] 重复 revision migration byte-stable，且不调用模型。
- [x] 新时间线使用新的 timelineEpoch。
- [x] stateRevision 单调递增，rollback 不降低 revision。
- [x] 两个页面从同一 revision 打开时，后提交的旧页面被拒绝。
- [x] stale metadata/chat/translation save 都不能覆盖新世界。
- [x] Web Locks 和 storage fallback 均有测试。
- [x] revision conflict 不自动合并、不自动调用模型。
- [x] 冲突 UI 明确要求重新载入，并阻止继续写世界。
- [x] chat-only 且世界未变化的保存不制造空 revision。
- [x] revisionHistory 最多 48 条，不保存完整世界或秘密。
- [x] Item before/after diff 只包含 ID、owner、holder、location、state。
- [x] Identity before/after diff 只包含 actor ID、field path 和值。

# NPC Identity V1

- [x] 每个稳定 actorLibrary profile 都有 `identity.version=1`。
- [x] gender、birth、education、lineage、body、provenance 均有规范化 unknown。
- [x] birth 只允许 exact date、exact year 或 unknown。
- [x] birth 不包含 range、earliest、latest。
- [x] Canon 学年出生区间映射为 unknown。
- [x] year-only birth 不派生伪精确年龄。
- [x] 年龄、相对年龄、当前年级和在学状态按世界时钟派生。
- [x] `roleEn` 不再承担学校/学院/年级唯一权威。
- [x] 父母、兄弟姐妹、监护、婚姻不存入 Identity。
- [x] 血统反推不会创建父母 actor 或权威家庭边。
- [x] identity.body 包含发型、染发、伤势、疤痕和当前身体形态，并带 asOfClock。
- [x] 主动检查的 narration 有逐字证据时写入 injuryAssessment 和 direct_observation provenance。
- [x] 未观察到伤势不写入 injuries[]，档案显示“未观察到伤势【观察】”及观察时钟。
- [x] NPC 自述“我没受伤”不能单独升级为权威观察。
- [x] Identity observation 同步更新 actorLibrary 与 runtime actor，重复回放 byte-stable。
- [x] currentPresentation 只包含帽子、衣服、首饰、穿戴 Item 和手持 Item。
- [x] 旧 presentation 的 hair/hairstyle/injury 确定性迁入 identity.body。
- [x] 身高描述不会无依据生成厘米数，并支持 asOfClock。
- [x] Identity migration 保留现有 ID、aliases、memory、knowledge、social、presentation 和位置。
- [x] 重复 Identity migration byte-stable。

# Canon Identity Registry

- [x] Canon actor 由离线注册表确定性填充，不调用模型。
- [x] 所有可入库 Canon 人物具备完整 Identity Schema。
- [x] 缺失事实保持 unknown，不猜测。
- [x] 核心人物外貌使用书籍/官方资料，不混入电影演员外貌。
- [x] 未来职业、组织、学院状态按有效时间过滤。
- [x] 当前 Canon 名称、本地化和 aliases 保持稳定。

# Claims 与家庭边界

- [x] self/other identity claim 不覆盖 authority Identity。
- [x] claim 有合法 speaker、subject、sourceMessageIds、witnessedBy 和 clock。
- [x] 冲突 identity claims 可以并存。
- [x] “自称有哥哥”创建 personRef + relationshipClaim，不创建 actor。
- [x] personRef 仅使用 unresolved/resolved/nonexistent 三种状态。
- [x] nonexistent 不再区分 imaginary/fabricated。
- [x] unresolved/nonexistent reference 不进入 actorLibrary、presence、memory、cast slot 或关系星图节点。
- [x] resolved reference 必须绑定正式 actor。
- [x] 只有 authority 确认的 resolved 家庭关系形成正式 family edge。
- [x] 后台 nonexistent resolution 不泄漏给未获知角色。
- [x] 旧 family/background statements 无损保留。

# Prompt 权限

- [x] Performer 与 Directors 只读取 observer/clock 允许的 Identity projection。
- [x] 玩家/NPC 只看到其获知的 self/other claims。
- [x] 模型不能直接写 authority Identity、person resolution 或正式 family edge。
- [x] claim proposal 必须 evidence-grounded。
- [x] current goal、mood、activity 不写入 Identity。
- [x] 未来 Canon 身份不泄漏到较早年份。

# Identity UI

- [x] 人物 Inspector 显示 Identity dossier。
- [x] UI 包含基本身份、教育、血统、身体状态、已知说法分组。
- [x] authority/self/other 有清晰但低干扰的中文标签。
- [x] 模块标题不显示 authority/self/other/derived 来源标签。
- [x] 已知权威值在对应字段行显示“权威”。
- [x] 年龄、当前年级等计算值在对应字段行显示“派生”。
- [x] self/other claim 在各自 claim 行显示“自称/他称”。
- [x] unknown 字段不显示“权威”。
- [x] 出生日期 UI 永不显示范围或“至”。
- [x] 观察来源标签跟随伤势字段，不显示在模块标题。
- [x] unknown 字段以低对比方式保留。
- [x] 家庭只显示在关系/声明区域，不显示为 Identity 字段。
- [x] 后台 revision、source tier 和 nonexistent resolution 不显示。
- [x] 视觉延续关系星图的深夜蓝、墨绿、金色细线与紫罗兰星点。
- [x] 不增加外部字体、图片或模型依赖。
- [x] 390px 窄屏单列，无横向溢出。
- [x] 键盘焦点和 reduced-motion 可用。
- [x] UI 不写世界、不强制滚动。

# Verification

- [x] Save guard、Identity、Claims、Prompt 与 UI 目标测试通过。
- [x] Identity Prompt、Claims 与现有 workflow 目标测试通过。
- [x] Tina 真实存档 dry-run 不改变 Item、关系、记忆、位置和消息。
- [x] 浏览器显示正确 Identity dossier。
- [x] 浏览器 stale conflict 提示可恢复。
- [x] 全量 Hogwarts Node `370/370` 测试通过。
- [x] Hogwarts ESLint、完整 node --check、git diff --check 通过。
- [x] 模块尺寸与依赖边界通过。
- [x] runtime contracts、字段表、README、progress 与项目记忆已同步。
- [x] 所有临时测试/debug 文件均已清理。
