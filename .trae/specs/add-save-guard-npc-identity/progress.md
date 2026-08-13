# 实施进度

## 2026-08-09：Task 9.6 + Task 10.6 最终验证完成

- 全量 Hogwarts Node `370/370`、Identity 专项 `32/32` 通过；模块无环/逆层/门面依赖、文件尺寸和 Task 4 边界均通过。
- 生产 ESLint `125` 文件、测试 ESLint `25` 文件、完整扩展 `node --check` `125` 模块及 `git diff --check` 通过。
- 当前 Tina JSONL 只读 dry-run 保持 `206` 条消息、Item、关系、记忆、位置和 actor references 不变；21/21 profile、23/23 runtime actor 已为 Identity V1，重复迁移 byte-stable，网络调用为 0。
- 用户 JSONL 前后 SHA-256 均为 `52e2471cd57c3aba2f7ccbc9009469d4e128987985c2a7ca77802c749f277116`，mtimeNs 均为 `1786279053946479245`，大小均为 `7,424,323` bytes。
- 当前存档 44 个 Identity birth 全部只含 `date/year/precision`，precision 仅为 exact/year/unknown；Canon 学年区间、year-only 年龄和旧 range/earliest/latest 专项均通过。
- Chrome 390px 回归本体 `1/1` 通过；真实 Harry dossier 显示 13 个字段级“权威”、2 个“派生”、2 个 unknown 无 badge，模块标题无来源标签且无横向溢出。生产 DOM fixture 同时验证 claim 行“自称/他称”和 year-only 年龄未知。
- 浏览器复验未发起模型、翻译、local observer 或 social 请求；真实页面初始化的 1 次 lifecycle chat save 已拦截。Chrome 退出后 TRAE 沙箱对系统 Crashpad `settings.dat` 报 restricted，发生在所有断言通过之后，不属于应用失败。
- 仅清理本轮 `tests/test-results/playwright` 与空 `.playwright-home`；既有 single-model evidence、`.dbg/`、debug 文件、`prototypes/` 和 browser evidence 均保留。

## 2026-08-09：Task 10.1–10.5 完成

- Birth Schema 已收敛为 `{ date, year, precision }`，precision 仅允许 exact/year/unknown；生产模块不再输出 range/earliest/latest。
- Canon 学年、日期区间和不确定文本统一映射为 unknown；exact date 与 exact year 保持确定性离线映射。
- Legacy migration 不再展开全年区间，并会重新规范化仍含旧 Birth 形状的 Identity V1 数据；重复迁移 byte-stable。
- year-only 不派生年龄、年龄段或相对年龄；Prompt authority projection 仅输出新 Birth Schema。
- Identity dossier 仅显示确切日期、确切年份或“未知”，不再渲染 Birth/年龄范围或“至”。
- revision Identity diff 继续按字段记录 `birth.date/year/precision` 的 before/after，不改变 Save Guard 语义。

## 2026-08-09：Ralph EIGHTH 系统化验收完成

- 逐项复核 Save Revision Guard、NPC Identity V1、Canon Registry、Claims/家庭边界、Prompt 权限、Identity UI 与 Verification checklist；无失败 checkpoint，Task 7.4、Task 8.5 及 Task 7/8 完成。
- 最终浏览器证据确认 Harry Identity dossier 显示 Canon 权威值、五个信息分组、身体/current presentation/家庭声明边界和真实空 claims；关系星图视觉、键盘焦点及 reduced-motion 规则有效，未调用剧情模型。
- 真实 stale 页面显示“时间线已在其他页面更新，请刷新后继续。”并禁用输入、移动、咒语、回滚、封存、判定、翻译与提交等写操作；fresh `?hpmud_identity_v1=final` 无冲突符合新 head 预期。
- Task 8 Chrome 390px Playwright 回归 `1/1` 通过，验证 app、顶部操作区和 Identity dossier 均无横向溢出；修复前 460px overflow 截图继续作为失败基线保留。
- 全量 Hogwarts Node 使用 VM modules 正确入口复跑 `360/360`；生产/测试 ESLint、完整 `node --check`、模块尺寸与依赖边界通过。
- Tina 只读 dry-run 再次确认原 SHA/mtime、206 条消息、Item、关系、记忆、位置和 actor references 不变；21/21 profile 与 23/23 runtime actor 获得 Identity V1，重复迁移 byte-stable，网络调用为 0。
- 仅清理本规格 Playwright `.last-run.json` 与清空后的临时结果目录；测试源、spec、两组 browser evidence、既有 `.dbg/`、debug 文件和 `prototypes/` 均保留。

## 2026-08-09：Task 7.1–7.3 完成

- 修复 lifecycle/new world/load 接线：Identity migration 已覆盖 initial world、opening/foundation、resident/pacing actor 和统一 lifecycle；legacy revision 在先 observe 后 register 时继续持久化 pending migration。
- 新增只读 `scripts/dry-run-hogwarts-save-revision-identity.mjs`，阻断网络并校验原文件 SHA/mtime、消息字节、Item、关系既有字段、记忆、位置和 actor references。
- Tina JSONL dry-run 保持 206 条消息、10 个 Item、34 条关系既有字段、记忆与位置不变；21/21 profile、23/23 runtime actor 获得 Identity V1。
- migration diff 为 `added=120 / removed=0 / changed=0`，仅新增 revision/identity/social schema 字段；第二次运行 byte-stable，网络与模型调用为 0，用户存档未写入。
- runtime spec、state fields、checklist、progress、README、Item presentation 边界和项目记忆已同步。
- 全量 Hogwarts Node `358/358`、生产与测试 ESLint、完整扩展 `node --check`、`git diff --check`、模块尺寸与依赖边界全部通过。
- Task 7.4 浏览器 Identity dossier 与 stale conflict 提示由独立线程验收，本任务不等待浏览器。

## 2026-08-09：Task 6 完成

- 人物 Inspector 已接入只读 Identity dossier，通过现有 port 复用 clock-scoped authority projection 与玩家可见 claims。
- dossier 包含基本身份、教育、血统、身体状态、已知说法五组；unknown 保留低对比占位，authority/self/other 使用克制中文标签。
- 身体状态展示发型、染发、伤势、疤痕与当前形态；currentPresentation 只展示服装、帽子饰品、穿戴 Item 与手持 Item。
- 家庭 relationship claims 仅进入原关系/声明区域；后台 revision、provenance source tier 与 nonexistent resolution 不进入 view model 或 DOM。
- 视觉延续关系星图的深夜蓝、墨绿、金线、紫色星点与 Georgia 档案层级，并覆盖 390px 单列、键盘焦点和 reduced-motion。
- 新增 `tests/hogwarts-mud-npc-identity-ui.test.mjs`，覆盖真实 projection、DOM/class、冲突 claims、家庭隔离、窄屏、无外部资源和无世界写入。
- Identity/Claims/Prompt/UI 相关定向回归 `39/39` 通过；目标 ESLint、`node --check`、`git diff --check` 与模块尺寸门禁通过。

## 2026-08-09：Task 5 完成

- 新增单一 `npc-identity-prompt-projection` 领域模块，统一执行 observer/clock、provenance 有效时间和 claim clock 过滤。
- actor 自身可读取当前有效 authority；玩家与其他 NPC 只读取 `witnessedBy`/speaker 边界内的 self/other claims。
- `nonexistent` person reference 在 prompt projection 中继续显示为 unresolved，不泄漏后台 resolution。
- Ordinary Turn、Scene Transition、Daily/Pacing Director 已通过现有 DI 使用投影；runtime actor 通过字段白名单移除 raw Identity。
- current goal、mood、intent、activity 保留为动态 actor state，不进入 Identity projection。
- Social Director 继续复用既有 `statements` Schema 作为 evidence-grounded claim proposal，不新增模型输出字段。
- 专项及相关回归测试 `45/45` 通过；本任务未修改 Identity UI/style 或 Save Guard。

## 2026-08-09：Task 4 完成

- Social Graph 已接入 `identityClaims`、`relationshipClaims` 与 `personReferences` 的规范化、迁移、Reducer 和 audience projection。
- self/other claims 保持冲突并存，不写入 authority Identity；未知亲属只创建 unresolved reference 与 claim。
- person reference 仅保留 unresolved/resolved/nonexistent，旧 imaginary/fabricated 确定性折叠为 nonexistent。
- 正式 family edge 仅由 resolved reference 与既有 authority relationship claim 生成。
- 社交导演新增 claim 必须有 accepted ID、合法消息证据与 clock，且不能新增 authority claim、写 resolution 或覆盖既有 claim。
- 旧 statement 原文和自定义 evidence 字段保留；非数组 witness 数据不再导致旧档加载失败。
- 专项测试 `tests/hogwarts-mud-npc-identity-claims.test.mjs` 当前 10/10 通过。

本任务未修改 Save Guard、Prompt 或 Identity UI。

## Round 1

- 完成 Save Revision Guard、统一 guarded save 接线、NPC Identity V1、Canon 离线注册表、Claims/Person References、Prompt 权限边界和关系星图风格 Identity dossier；最终 Hogwarts Node `360/360`、Task8 Chrome `1/1`、ESLint、完整 `node --check`、CSS、diff、模块尺寸与依赖门禁通过。
- 浏览器验收先发现 Canon authority 全 unknown 与 390px 横向溢出；已修复真实 load hydration、claims 空态和窄屏 topbar/dossier，并保留 stale conflict 的真实页面证据。
- 关键决策：发型、染发、伤势、疤痕与当前身体形态属于 `identity.body`；currentPresentation 仅表示帽子、衣服、首饰、穿戴与手持 Item；家庭只属于 Social Graph；imaginary/fabricated 统一为 `nonexistent`；Canon 未知字段保持 unknown，不调用模型猜测。
- 主要变更：新增 save revision domain/runtime、NPC identity/canon/migration/prompt projection、social claims domain、Identity dossier、guarded save ports、dry-run 脚本与 6 组专项测试；同步 runtime contracts、README、项目记忆、tasks/checklist 和浏览器证据。

## Round 3

- 完成字段级来源标签：模块标题不再承载“权威”，已知字段、派生字段和 self/other claim 分别在自身行显示来源；unknown 不显示权威。
- 删除 birth range/earliest/latest 与学年区间伪精度；Identity birth 仅保留 exact date、exact year 或 unknown，year-only 不派生伪精确年龄，UI 不再显示“至”。
- 浏览器确认 Harry 的 Canon 权威值、字段 badge、身体/presentation 边界、390px 布局与 exact birthday；真实存档无 claims 时保持空态，冲突 claim 标签由 DOM 回归覆盖。
- 最终 Hogwarts Node `370/370`、Identity 专项 `32/32`、Chrome `1/1`、ESLint、完整 `node --check`、CSS、diff、模块尺寸与依赖门禁通过；真实 JSONL SHA/mtime/大小不变。

## Round 4

- 新增 evidence-grounded `identityObservations`：主动身体检查的 narration 可由授权 Reducer 写入稳定 Identity，NPC 自述不能单独升级为观察。
- “未观察到伤势”保存为 `body.injuryAssessment=no_visible_injury` 与 `direct_observation` provenance，不向 `injuries[]` 写负面伪记录；档案在伤势字段显示“观察”和时钟。
- lifecycle 可零模型、幂等回放已提交事务；真实 Tina 存档只读预演命中赫敏消息 206/207，原 JSONL 的消息、物品、关系、记忆、位置、SHA 与 mtime 均不变。
- 新增 observation contract、Reducer、migration 与专项测试；Hogwarts Node `375/375`、ESLint、完整 `node --check`、diff、模块体积与依赖边界通过。
