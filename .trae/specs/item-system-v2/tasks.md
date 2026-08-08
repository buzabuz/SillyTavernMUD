# Item System V2 Tasks

- [x] Task 1: 建立 V2 数据契约
  - [x] Item 类型、状态、操作、可见性和来源 Schema
  - [x] current presentation ID 契约
  - [x] pending/ignored proposal 契约

- [x] Task 2: 实现 Reducer 与迁移
  - [x] 十二种操作及 owner/holder/location 不变量
  - [x] V1 items 与 legacy presentation 迁移
  - [x] Canon 标志物目录与确定性 seed
  - [x] scene item projection 与转场跟随

- [x] Task 3: 接入回合工作流
  - [x] 旧 proposal action 兼容映射
  - [x] 新物品拆为 pending candidate
  - [x] 已有物品操作直接走 Reducer
  - [x] 收录/忽略 action、保存和幂等处理
  - [x] medium/high proposal 来源预留但不接调用

- [x] Task 4: 统一 current presentation
  - [x] 普通整体 outfit
  - [x] wornItemIds / heldItemIds 同步
  - [x] legacy free-text fallback
  - [x] 玩家与 NPC 可见性过滤

- [x] Task 5: 统一前端展示
  - [x] 共享 Item card/view model
  - [x] 物品库分组与状态摘要
  - [x] 人物卡正式物品与整体造型
  - [x] 回合后安静候选卡及键盘操作
  - [x] 390px 与 reduced-motion

- [x] Task 6: 验证与文档
  - [x] Schema/Reducer/迁移/候选单测
  - [x] 现有 Hogwarts 全量回归
  - [x] 浏览器桌面与窄屏验收
  - [x] 更新 runtime PRD、字段注册表、checklist、progress
  - [x] 更新项目记忆

- [x] Task 7: Composer Item 操作协议
  - [x] 双段 operation/reference directive 与 parser
  - [x] 插入表达展示十二操作并打开物品库
  - [x] 物品卡插入稳定 Item ID 引用
  - [x] low performer 与 local observer 识别意图协议
  - [x] parser、UI、浏览器和全量回归
