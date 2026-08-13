# Task 9 Tina 存档基线证据

## 路径

- 主存档：`data/default-user/chats/Hogwarts_World_Director/Hogwarts World Director - 2026-08-02@22h16m07s339ms.jsonl`
- 可信 baseline：`data/default-user/backups/chat_hogwarts_world_director_20260809-234122.jsonl`
- revision 27 备份：`data/default-user/backups/manual_tina_task_9_revision_27_before_baseline_restore_20260810-003029.jsonl`

## 写入源与隔离

- revision 26 与 revision 27 的消息字节完全相同；clock、scene 和 Calendar 也未变化。
- 唯一有效差异是 `knowledgeBase.lastSyncedAt` 从 `2026-08-09T15:41:22.352Z` 变为 `2026-08-09T16:10:02.082Z`，随后 `stateRevision` 从 26 变为 27，并追加 `source=metadata` 的 revision history。
- 写入链为 `syncKnowledgeBase()` 更新同步时间，`createKnowledgeAdapter.syncLocalKnowledge()` 调用 `context.saveMetadata()`，宿主再向 `/api/chats/save` 提交当前 Tina 会话。
- 宿主在本地 `2026-08-10 00:10:02` 生成的自动备份与 revision 27 主档逐字节相同，SHA 均为 `9965b9bedab482a04efd97fd81b30edc360398e249c025b49e0148067521bce9`。
- 负责接收保存请求的唯一 SillyTavern 进程是 PID `97758`，启动命令为本仓库的 `node server.js`，监听 `127.0.0.1:8000`。
- PID `97758` 已通过 `SIGTERM` 结束；结束后 PID 不存在，端口 `8000` 无监听。Chrome、Trae、Ollama 和其他用户进程未停止。

## 备份与恢复

- 恢复前 revision 27 已复制到上述手工备份，备份与当时主档通过 `cmp` 且 SHA 相同。
- baseline 临时文件先在主档同目录内通过 `cmp` 和 SHA 核验，再以同文件系统 rename 原子替换主档。
- 恢复后的主档与可信 baseline 通过 `cmp`，SHA 为目标值 `3d5eafaf4e4bc007ddb1a257b0ada7c044d494a7e69d115b995db3c423aeb1c1`。

## 五项指标

| 阶段 | SHA-256 | mtimeNs | revision | clock | 消息数 |
|---|---|---:|---:|---|---:|
| 恢复前 revision 27 | `9965b9bedab482a04efd97fd81b30edc360398e249c025b49e0148067521bce9` | `1786291802351191857` | 27 | `1991-09-02 · 13:35` | 210 |
| 原子恢复后 | `3d5eafaf4e4bc007ddb1a257b0ada7c044d494a7e69d115b995db3c423aeb1c1` | `1786290082720102528` | 26 | `1991-09-02 · 13:35` | 210 |
| 稳定观察 30 秒后 | `3d5eafaf4e4bc007ddb1a257b0ada7c044d494a7e69d115b995db3c423aeb1c1` | `1786290082720102528` | 26 | `1991-09-02 · 13:35` | 210 |
| 后续只读命令后 | `3d5eafaf4e4bc007ddb1a257b0ada7c044d494a7e69d115b995db3c423aeb1c1` | `1786290082720102528` | 26 | `1991-09-02 · 13:35` | 210 |

后续只读命令包括 Calendar dry-run、`shasum`、`wc`、`cmp`、`ps` 和 `lsof`。Calendar dry-run 报告源文件与 mtime 不变，网络调用和模型调用均为 0。
