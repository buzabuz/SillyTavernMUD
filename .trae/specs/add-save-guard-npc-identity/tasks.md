# Tasks

- [x] Task 1: 实现 Save Revision Guard 核心与迁移。
  - [x] SubTask 1.1: 新增 revision schema、legacy migration、timeline epoch 与单调 revision 规则。
  - [x] SubTask 1.2: 新增 guarded save runtime，支持 Web Locks 与可测试 storage fallback。
  - [x] SubTask 1.3: 实现有界 revision history、Item diff 与 Identity diff。
  - [x] SubTask 1.4: 添加 stale save、rollback、chat-only save、迁移幂等单元测试。

- [x] Task 2: 将 Hogwarts 权威保存入口接入 Guard，并提供冲突恢复 UI。
  - [x] SubTask 2.1: 在 workflow/runtime/UI ports 暴露统一 guarded metadata/chat save。
  - [x] SubTask 2.2: 替换会携带 Hogwarts metadata 的直接保存入口，保留宿主非 Hogwarts 行为。
  - [x] SubTask 2.3: 在加载时间线时注册 revision head；新时间线生成 epoch。
  - [x] SubTask 2.4: stale conflict 时阻止继续写世界，显示简短刷新提示，不自动重试模型。
  - [x] SubTask 2.5: 添加两页面竞争、旧翻译保存、事件事务 diff 的集成测试。

- [x] Task 3: 实现 NPC Identity V1 Schema、派生规则与 Canon Identity Registry。
  - [x] SubTask 3.1: 新增 gender、birth、education、lineage、body、provenance 的 normalize/validate/project；body 包含发型、伤势和当前形态。
  - [x] SubTask 3.2: 实现年龄、相对年龄、当前年级和在学状态的时间派生。
  - [x] SubTask 3.3: 将现有 Canon catalog 确定性映射为完整 Identity Schema，缺失字段保持 unknown。
  - [x] SubTask 3.4: 为核心 Canon 人物补版本化官方/书籍身体基线，不混入电影演员外貌。
  - [x] SubTask 3.5: 实现现有 actorLibrary/runtime actor 的幂等 Identity migration；旧 hair/hairstyle/injury 从 presentation 迁入 body。
  - [x] SubTask 3.6: 添加 Canon 无模型 hydration、unknown、时间派生和迁移保持性测试。

- [x] Task 4: 实现精简 Identity Claims、Relationship Claims 与 Person References。
  - [x] SubTask 4.1: 在 Social Graph 中加入 identityClaims、relationshipClaims、personReferences normalizer。
  - [x] SubTask 4.2: 支持 self/other identity claim，禁止 claim 覆盖 authority Identity。
  - [x] SubTask 4.3: 支持 unresolved/resolved/nonexistent person reference；nonexistent 不细分原因。
  - [x] SubTask 4.4: 确保未知亲属不创建 actor、presence、memory、cast slot 或关系星图节点。
  - [x] SubTask 4.5: 只有 resolved + authority relationship 才形成正式 family edge。
  - [x] SubTask 4.6: 兼容迁移现有 social statements，无法安全结构化的 statement 原样保留。
  - [x] SubTask 4.7: 添加 claims 权限、冲突并存、未知哥哥和隐藏不存在判定测试。

- [x] Task 5: 将 Identity 权威与 Claims 接入 Actor/Director Prompt 边界。
  - [x] SubTask 5.1: 构建按 observer/clock 过滤的 Identity projection。
  - [x] SubTask 5.2: Ordinary Turn、Scene Transition、Daily/Pacing Director 使用投影，不读取越权 authority。
  - [x] SubTask 5.3: 模型仅提交 evidence-grounded claim proposal，不得写 authority、resolution 或 family edge。
  - [x] SubTask 5.4: 保持 current goal/mood/activity 与 Identity 分离。
  - [x] SubTask 5.5: 添加 self/other claim、未来身份泄漏与 hidden resolution Prompt 测试。

- [x] Task 6: 实现关系星图风格的 NPC Identity UI。
  - [x] SubTask 6.1: 在人物 Inspector 增加 Identity dossier 与 projection view model。
  - [x] SubTask 6.2: 实现基本身份、教育、血统、身体状态和已知说法分组。
  - [x] SubTask 6.3: authority/self/other 使用克制标签；家庭只留在关系声明区。
  - [x] SubTask 6.4: 复用关系星图的深夜蓝、墨绿、金线、紫色星点与档案式字体层级。
  - [x] SubTask 6.5: 完成 390px 单列、键盘焦点、unknown 状态和 reduced-motion。
  - [x] SubTask 6.6: 添加 DOM、视觉 class、窄屏和无世界写入 UI 测试。

- [x] Task 7: 完成真实存档迁移、契约文档与全量验证。
  - [x] SubTask 7.1: 对 Tina 存档 dry-run Identity/revision migration，核对 Item、关系、记忆和位置不变。
  - [x] SubTask 7.2: 更新 runtime spec、state fields、checklist、README 和项目记忆。
  - [x] SubTask 7.3: 运行全量 Hogwarts Node、ESLint、node --check、diff 与模块尺寸门禁。
  - [x] SubTask 7.4: 浏览器验证 Identity dossier 与 stale conflict 提示，不调用剧情模型。

- [x] Task 8: 修复浏览器验收发现的 Identity hydration 与窄屏溢出。
  - [x] SubTask 8.1: 修复 Canon actor 在真实存档 load/migration 后的 Identity authority projection，Harry 不得全部显示 unknown。
  - [x] SubTask 8.2: 确保玩家已知的 Identity claims 正确进入“已知说法”，无 claim 时保持真实空态。
  - [x] SubTask 8.3: 修复 390px 顶部操作区和 Identity dossier 横向溢出。
  - [x] SubTask 8.4: 添加真实 load projection 与 390px overflow 回归测试。
  - [x] SubTask 8.5: 重新执行浏览器验收与全量门禁。

- [x] Task 9: 将 Identity 来源标签从模块级改为字段级。
  - [x] SubTask 9.1: Identity projection/view model 为每个字段值提供 authority/derived 来源类型。
  - [x] SubTask 9.2: 移除模块标题上的“权威”标签。
  - [x] SubTask 9.3: 已知权威字段逐行显示“权威”，派生年龄/年级逐行显示“派生”。
  - [x] SubTask 9.4: self/other claim 分别在 claim 行显示“自称/他称”，unknown 字段不显示权威。
  - [x] SubTask 9.5: 添加字段级标签 DOM、冲突 claim 和模块标题无标签回归测试。
  - [x] SubTask 9.6: 完成浏览器复验与全量门禁。

- [x] Task 10: 删除出生日期区间与伪精度。
  - [x] SubTask 10.1: Birth Schema 收敛为 exact date / exact year / unknown，删除 range、earliest、latest。
  - [x] SubTask 10.2: Canon academic-year birth range 映射为 unknown，不推断具体日期或年份。
  - [x] SubTask 10.3: Legacy migration 删除区间写入；year-only 不派生伪精确年龄。
  - [x] SubTask 10.4: UI 只显示确切日期、确切年份或未知，永不显示“至”。
  - [x] SubTask 10.5: 更新 Prompt projection、revision diff 与专项测试，证明数据库无 range/earliest/latest。
  - [x] SubTask 10.6: 完成浏览器复验、真实存档 dry-run 与全量门禁。

- [x] Task 11: 将直接身体检查写入 NPC Identity。
  - [x] SubTask 11.1: 增加 injuryAssessment 与 direct_observation 来源契约，不用“无伤”污染 injuries[]。
  - [x] SubTask 11.2: post-turn observer 输出 evidence-grounded identityObservations，禁止 dialogue 自述升级为观察。
  - [x] SubTask 11.3: 事务校验与 Identity Reducer 同步更新 actorLibrary/runtime actor。
  - [x] SubTask 11.4: lifecycle 幂等回放已有明确检查事务，修复赫敏当前档案。
  - [x] SubTask 11.5: 档案字段显示“未观察到伤势【观察】”及观察时钟。
  - [x] SubTask 11.6: 完成专项、真实存档与全量门禁。

# Task Dependencies

- Task 1 与 Task 3 可并行。
- Task 2 depends on Task 1。
- Task 4 depends on Task 3，可与 Task 2 并行。
- Task 5 depends on Task 3 与 Task 4。
- Task 6 depends on Task 3 与 Task 4。
- Task 7 depends on Task 1–6。
- Task 8 depends on Task 7.1–7.4 的失败证据。
- Task 9 depends on Task 6 与 Task 8。
- Task 10 depends on Task 3、Task 8 与 Task 9。
- Task 11 depends on Task 3、Task 5、Task 9。
