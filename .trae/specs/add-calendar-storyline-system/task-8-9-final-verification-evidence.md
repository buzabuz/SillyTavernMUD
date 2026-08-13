# Task 8/9 最终验证证据

## 环境与主存档

- 日期：2026-08-10
- 主存档：`data/default-user/chats/Hogwarts_World_Director/Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl`
- 本地 Playwright：包版本、CLI 版本与 npm 依赖树均为 `1.56.1`
- 运行态：端口 `8000` 无监听，本仓库 `node server.js` 未运行

| 指标 | 验收前 | 验收后 | 结果 |
|---|---|---|---|
| SHA-256 | `3d5eafaf4e4bc007ddb1a257b0ada7c044d494a7e69d115b995db3c423aeb1c1` | `3d5eafaf4e4bc007ddb1a257b0ada7c044d494a7e69d115b995db3c423aeb1c1` | 相等 |
| mtimeNs | `1786290082720102528` | `1786290082720102528` | 相等 |
| stateRevision | `26` | `26` | 相等 |
| clock | `1991-09-02 · 13:35` | `1991-09-02 · 13:35` | 相等 |
| 消息数 | `210` | `210` | 相等 |

后置采集使用 `assert.deepEqual(actual, expected)` 同时严格比较五项指标，命令 exit 0。

## 命令结果

| 分组 | 命令 | 结果 | Exit |
|---|---|---:|---:|
| Calendar E2E | `npm --prefix tests run test:e2e:calendar` | `6/6` | 0 |
| Calendar 专项 | `node --test tests/hogwarts-mud-calendar-schema-migration.test.mjs tests/hogwarts-mud-calendar-reducer-projection.test.mjs tests/hogwarts-mud-high-calendar-director.test.mjs tests/hogwarts-mud-medium-calendar-director.test.mjs tests/hogwarts-mud-calendar-moment.test.mjs tests/hogwarts-mud-calendar-ui.test.mjs` | `47/47` | 0 |
| workflow/save/identity/social/item | `node --test tests/hogwarts-mud-task5-workflows.test.mjs tests/hogwarts-mud-save-revision-guard.test.mjs tests/hogwarts-mud-save-revision-integration.test.mjs tests/hogwarts-mud-npc-identity-v1.test.mjs tests/hogwarts-mud-npc-identity-prompts.test.mjs tests/hogwarts-mud-npc-identity-ui.test.mjs tests/hogwarts-mud-npc-identity-claims.test.mjs tests/hogwarts-mud-npc-identity-observation.test.mjs tests/hogwarts-mud-npc-identity-task8.test.mjs tests/hogwarts-mud-social-contract.test.mjs tests/hogwarts-mud-item-system-v2.test.mjs` | `102/102` | 0 |
| 全量 Node 初次探测 | `node --test tests/hogwarts-mud*.test.mjs` | `419/422`；3 项未装载 `vm.SourceTextModule` | 1 |
| 全量 Node 有效门禁 | `node --experimental-vm-modules --test tests/hogwarts-mud*.test.mjs` | `422/422` | 0 |
| 生产 ESLint | `npm run lint` | 0 errors | 0 |
| 测试 ESLint | `npm --prefix tests run lint` | 0 errors；1 条既存 `MacroEngine.e2e.js` warning | 0 |
| JS/MJS 语法 | 对 138 个生产 JS、34 个测试 JS/MJS、2 个 dry-run 脚本逐文件执行 `node --check` | `174/174` | 0 |
| 模块体积与边界 | `node --experimental-vm-modules --test tests/hogwarts-mud-task1-baseline.test.mjs tests/hogwarts-mud-task2-modules.test.mjs tests/hogwarts-mud-task3-contract.test.mjs tests/hogwarts-mud-task4-boundaries.test.mjs tests/hogwarts-mud-task6-ui-contract.test.mjs tests/hogwarts-mud-medium-calendar-director.test.mjs tests/hogwarts-mud-calendar-ui.test.mjs` | `58/58` | 0 |
| 真实存档 dry-run | `node scripts/dry-run-hogwarts-calendar.mjs --dry-run --file 'data/default-user/chats/Hogwarts_World_Director/Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl'` | 通过 | 0 |
| Diff 门禁 | `git diff --check` | 通过 | 0 |

初次全量 Node 探测没有业务断言失败；当前 Node `v24.10.0` 仅在带 `--experimental-vm-modules` 时提供 `vm.SourceTextModule`。该失败已按 Ralph 规则登记为 Task 10，并以项目既有参数重跑关闭。

## Browser Checklist

- 1280、820、560、390px 均验证无横向溢出和日期目标至少 44px；桌面左右布局、窄屏单列布局断言通过。
- 历史 Scene 使用真实 archive renderer，显示 timeline 与 Author's Quill；无重新翻译和【进入场景】操作。
- 日期与条目键盘导航、Enter、Escape、关闭后入口焦点恢复，以及宿主 story/chat scrollTop 不变均通过。
- 打开和查看历史期间 state byte-stable，director、opening、translation、host save 与 POST 调用均为 0。
- 19:00 Calendar Moment 只提交一次，revision 26→27 的隔离 fixture 同时关联两项重叠安排、两项均 active、无 cancelled；真实 Tina JSONL 不参与该测试。
- Calendar UI 专项同时覆盖过去 Calendar 条目的全部 `relatedSceneIds[]` 列表、逐个读取原 archive 正文及只读行为。

## Dry-run 与边界

- 源文件 7,741,568 bytes，消息区 SHA-256 为 `0614955c3be58ebd59e22d5a375d3b6ebfe6e05b8ab1cf605f3845c6a349ac6e`。
- 现存 Calendar 5 条，migration no-op；真实 legacy clone 初始化空 entries，重复 migration byte-stable。
- legacy `agenda` 不迁移，sceneArchive 正文不复制；clock、scene、sceneArchive、actors、Item、Identity、Social、Memory、location 全部不变。
- 网络调用 `0`，模型调用 `0`。
- `index.js=600`、`helpers.js=251`；Calendar 生产模块最大为 `calendar-controller.js=1073` 行，全部低于 2000 行。

本轮只更新 `tasks.md`、`checklist.md` 与本 evidence；未修改业务代码，也未覆盖或追加 `progress.md`。
