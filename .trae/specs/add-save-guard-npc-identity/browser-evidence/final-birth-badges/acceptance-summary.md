# Final Birth Badges Browser Acceptance

- Overall: **FAIL**
- PASS: 模块标题不含“权威/派生/自称/他称”。
- PASS: 已知字段显示“权威”；当前年龄、当前学籍显示“派生”；未知字段无“权威”。
- FAIL: “已知说法”显示“暂无已知说法”，claims 行数与自称/他称 badge 数均为 0，未满足“claims 逐行自称/他称”。
- PASS: 出生仅显示 `1980-07-31`；页面文本与 DOM 均无 `1979-09-01 至 1980-08-31`，出生区域无“至”。
- PASS: 发型、伤势位于身体状态；当前呈现仅含正式穿戴 Item 与手持物。
- PASS: 精确 390px 测量中 app/topbar/workspace/inspector/content/dossier 均 `scrollWidth == clientWidth`，无横向溢出。
- PASS: 100 条网络请求中无剧情模型生成请求；仅有 status 探测与 tokenizer count。
