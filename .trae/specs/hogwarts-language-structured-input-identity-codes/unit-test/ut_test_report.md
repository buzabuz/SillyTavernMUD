# 单元测试生成结果汇总
**生成状态**：成功；**生成耗时**：`7.2 分钟`
---
## 总体统计
**单测增量覆盖率**：`-`；**命中函数数**：2；**生成用例数**：4；**执行通过用例数**：1；
**修复编译失败包**：0；**修复执行失败用例数**：0；**发现缺陷数**：2
---
## 文件明细
| 文件路径 | 通过用例数 | 总用例数 | 覆盖率 |
|:---------|:----------:|:--------:|:------:|
| [public/scripts/extensions/hogwarts-mud/ui/map-renderer.js](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/ui/map-renderer.js) | 0 | 1 | 16.83% |
| [public/scripts/extensions/hogwarts-mud/style.css](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/style.css) | 1 | 3 | - |
---
## 生成明细
| 文件名 | 执行成功数/生成用例数 | 生成后增量覆盖率 |
|:-------|:--------------------:|:----------------:|
| [tests/hogwarts-mud-mobile-layout.test.mjs](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-mobile-layout.test.mjs) | 1/4 | - |
---
## 用例修复明细
暂无
---
## 缺陷明细
| 函数 | 场景 | 类型 | 问题 | 修复建议 |
|:-----|:-----|:-----|:-----|:---------|
| [renderMiniMap](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/ui/map-renderer.js#L809-L933) | 窄屏用户点击迷你地图右下角展开按钮 | Business Gaps · P1 | 仅重绘 Map Inspector 内容，没有打开响应式 Inspector，内容保持 `display:none`。 | 在渲染 Map tab 前添加 Inspector 打开类，并同步人物按钮的 `aria-expanded`。 |
| [mobile workspace and composer rules](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/style.css#L7943-L7983) | 390×844 视口加载正常游戏 | Business Gaps · P0 | 场景栏参与主网格并把正文压到 44px；Composer 工具组保留 250/390px flex-basis，输入框与当前场景标题重叠。 | 让场景栏成为覆盖层、正文独占移动端网格，并将两组工具的移动端 flex 重置为内容高度。 |
---
## 失败用例明细
| 用例名 | 目标函数 | 失败类型 | 错误摘要 | 修复建议 |
|:-------|:---------|:--------:|:---------|:---------|
| [mini-map expansion opens the inspector before rendering the map tab](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-mobile-layout.test.mjs#L82) | renderMiniMap | 执行失败 | 缺少打开 Inspector 和同步 aria-expanded 的生产逻辑。 | 修复 `renderMiniMap` 的展开处理后保留该断言。 |
| [mobile workspace keeps the story column full-height and overlays the scene panel](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-mobile-layout.test.mjs#L96) | mobile workspace rules | 执行失败 | 最终 760px media block 缺少单行主网格和覆盖式场景栏规则。 | 在最终移动端 media block 中补齐确定性布局约束。 |
| [mobile composer tool groups do not inherit desktop flex-basis heights](file:///Users/bytedance/sillytavern/SillyTavern/tests/hogwarts-mud-mobile-layout.test.mjs#L116) | mobile composer rules | 执行失败 | 两组工具继续继承桌面 `flex: 1 1 250px/390px`。 | 在移动端将两组工具重置为 `flex: 0 0 auto`。 |
---
## 跳过函数明细
暂无
---
## 补测建议
| 对象 | 标题 | 优先级 | 补测动作 |
|:-----|:-----|:------:|:---------|
| [public/scripts/extensions/hogwarts-mud/ui/map-renderer.js](file:///Users/bytedance/sillytavern/SillyTavern/public/scripts/extensions/hogwarts-mud/ui/map-renderer.js) | map-renderer.js 中 1 个函数存在未覆盖行 | P1 | renderMiniMap 未覆盖行: 810-932 |
