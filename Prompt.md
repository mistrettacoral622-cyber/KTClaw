# ClawX 持久化开发指令

工作目录：`C:\Users\22688\Desktop\ClawX-main`

---

## 角色分工

| 角色 | 工具 | 职责 |
|------|------|------|
| **Claude Code（你）** | 本体 | 架构设计、任务拆分、代码审查、质量把关 |
| **Codex MCP（GPT-5.3 high）** | `mcp__codex-mcp__codex` | 批量写代码、修改文件、运行命令 |

优先用 Codex 写业务代码，Claude 负责架构与审查。

---

## 持久化工作流

### 会话开始

```bash
git log --oneline -8
cat continue/task.json | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('current_focus',''))"
tail -30 continue/progress.txt
```

### 会话结束

1. 更新 `continue/task.json`
2. 追加 `continue/progress.txt`
3. 每完成一批任务做一次本地 `commit`
4. 更新本文件 `Prompt.md`

---

## 技术约束

- 框架：Electron + React 19 + TypeScript + Tailwind CSS + Vite
- 状态管理：Zustand，stores 在 `src/stores/`
- API 调用：必须走 `hostApiFetch<T>()` / `invokeIpc`，不要直接 `fetch` backend
- 主题 token：
  - `--bg: #ffffff`
  - `--bg2: #f2f2f7`
  - `--bg3: #e5e5ea`
  - `--tx: #000000`
  - `--tx2: #3c3c43`
  - `--tx3: #8e8e93`
  - `--bd: #c6c6c8`
  - `--ac: #007aff`
- Sidebar：展开 `260px` / 收起 `64px`
- 验证命令：
  - `pnpm run typecheck`
  - `pnpm exec tsc -p tsconfig.node.json --noEmit`
  - `pnpm run lint`
  - `pnpm run build:vite`
  - `pnpm test`
  - `pnpm run test:e2e`

---

## 当前焦点

`PLAN-2026-03-24-PLATFORM-CLOSURE`

目标：平台级 P0 中的 `MCP runtime closure`、`Release / install / E2E 深化`、`日文支持移除 / zh-en i18n 基线` 已完成；P1 已完成一部分 `Chat / Workbench` 与 `Kanban` 深化，当前继续推进波次 2 剩余 runtime/kanban 联动，以及后续 `Cron / Channels / Costs / Memory / Settings / a11y`。

---

## 当前剩余需求

### P0

#### 1. i18n 收口

- 已补 locale parity / 覆盖检查：`scripts/i18n/check-parity.mjs`、`tests/unit/i18n-parity.test.ts`、`pnpm run i18n:check`
- 已将本批 `MCP` / `Settings` 新增文案迁回 locale
- 已移除全部日文支持：`README.ja-JP.md`、`src/i18n/locales/ja/*`、语言入口均已下线
- 剩余：继续清理仓库其他页面历史硬编码文案
- 说明：MCP 页面现已按用户补充定义收口为“KTClaw 本身可以调用的 MCP 服务管理页”，启停语义与 Skills 靠近，同时保留 runtime / tool discovery / logs

### P1

#### 4. Chat / Workbench 深化

- 已完成：
  - 流式 reasoning 自动展开 / 收起
  - reasoning 生成中状态提示
  - 对话左上角 `{分身名} 正在思考中`
  - QuickAction 二级 `PromptPanel`
  - QuickAction 技能映射标签
  - QuickAction 回填输入框
  - AskUserQuestion 支持结构化 `toolInput.questions`
  - AskUserQuestion 支持回填已有答案
  - AskUserQuestion 展示请求上下文
  - 工具调用确认 UI：专门 review dialog、完整 tool input、危险操作告警
  - 文件变更预览：按 turn/tool group 展开 `edit` / `write` / `multiedit` 的输入与结果

#### 5. Kanban 深化

- 已完成：
  - `assigneeRole`
  - 更完整的 ticket detail panel
  - 最小 runtime 联动：`Start work / Send follow-up / Stop runtime / Retry work`
  - 最小 ticket chat history（基于 runtime transcript）
  - 进行中任务禁止手动拖拽
  - active runtime ticket 轮询 `/wait`
  - `running / blocked / waiting_approval / completed / error/killed/stopped` → ticket `workState` / column 状态联动
  - `completed` 自动进入 review-ready 状态并展示 `workResult`
- 剩余：
  - 更深的 agent work / retry / 状态联动（跨重启持久化、approval 更细粒度绑定、后续 agent work 深化）

#### 6. Cron 深化

- 已完成第一批总览层：
  - 状态筛选
  - delivery 配置概览
  - 配置错误 / 执行错误 banner
  - 最近更新时间
- Pipeline 建模 / 编辑闭环：
  - `PipelineWizard`
  - `PipelineGraph`
- 失败重试 / 失败告警 / 投递策略：
  - `failureAlertAfter`
  - `failureAlertCooldownSeconds`
  - `failureAlertChannel`
  - `deliveryBestEffort`

#### 7. Costs 深化

- 按 job / cron 提供 drill-down
- 已完成：`TopCrons`
- job cost table
- 更完整图表与明细层
- 优化分析：
  - optimization score
  - anomaly detection
  - week-over-week
  - cache savings
  - insights
- realtime usage stream

#### 8. Memory 深化

- 按照不同的分身agent，可以看到它们不同的memory，以及它们的其他文件：AGENTS.md、HEARTBEAT.md、IDENTITY.md、SOUL.md、TOOLS.md、USER.md。并且可编辑
- full-text search
- 命中数与高亮
- editor helpers：
  - copy / download
  - unsaved changes 提示
  - reindex after save
- safer write pipeline：
  - 路径白名单
  - mtime 冲突检测
  - 内容规范化
  - git snapshot
  - 原子写入
- health analysis：
  - health score
  - stale daily logs
  - AI-powered analysis
- 多路径知识源 / `extraPaths` / QMD collection

#### 9. Multi-agent runtime / tool registry

- 已完成第一批 backend skeleton：
  - `sessions_spawn`
  - subagent `list/kill/steer/wait`
  - thread / session mode、attachments / sandbox / timeout 字段骨架
  - Gateway-backed runtime adapter：`chat.send` / `chat.abort` / `sessions.list` / `chat.history`
  - runtime record 持有真实 `sessionKey` / `runId` / `status` / `lastError` / transcript
  - spawn-time capability snapshot：connected MCP tools + enabled skills
- 剩余：
  - 更完整的 subagent tree orchestration / durable persistence
  - runtime 工具执行路径与 registry 深化
  - skills 到 runtime 的更深层执行桥接

#### 10. Channels / backend runtime 能力

- IM 消息格式适配与 capability runtime
- `actions/capabilities/schema/status` 抽象
- 本地 API auth gate 深化
- 多用户隔离与 rate limiting

#### 11. Agent detail page

- 独立 agent 详情页
- metadata / hierarchy
- `reportsTo / directReports`
- cron 关联视图
- avatar upload / remove

#### 12. Settings 深化

- 全局 logo / icon 上传
- agent 图片 override
- `Re-run Setup`
- `Reset All Settings`
- `Clear Server Data`

#### 13. Docs / Help system

- 当前按用户要求保持停用
- 仅在用户再次明确要求时恢复
- 恢复时需补齐：
  - `/docs`
  - 章节导航
  - 页面内搜索
  - deep link
  - 内置文档体系

### P2

#### 14. 应用自动更新链路一致性

- 决定是否补 Host API update route
- 继续保证 update 链路一致
- 渐进发布 / 多 channel 策略继续补齐：
  - rollout delay / jitter
  - beta check interval
  - attempt state persistence

#### 15. 通用 UX 收尾

- unified toast
- 持久可关闭反馈
- skeleton
- motion token
- empty-state illustration
- mobile chat adaptation

#### 16. a11y / 工程治理

- a11y 自动化防回归
- a11y lint / test gate
- docs governance
- boundary / dead-code / cycle 脚本化检查

---

## 明确不要回退

- 不要重新加回聊天页顶部 `Export` 按钮
- `Docs / Help` 继续保持停用，除非用户再次明确要求恢复

---

## 当前参考优先级

1. `Wave 2 剩余：multi-agent runtime / Kanban 更深联动`
2. `Wave 3：Channels / Costs / Cron pipeline`
3. `Wave 4：Memory / Agent detail / Settings`
4. `Wave 5：Update / UX / a11y / 工程治理`
