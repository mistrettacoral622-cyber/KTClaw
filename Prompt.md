# KTClaw 持久化开发提示词

工作目录：`C:\Users\22688\Desktop\ClawX-main`

---

## 角色分工

| 角色 | 工具 | 职责 |
|------|------|------|
| **Claude Code（你）** | 本体 | 架构师 + 质检师：分析需求、设计方案、审查代码、质量把关、不直接写业务代码 |
| **Codex MCP（GPT-5.4 high）** | `mcp__codex-mcp__codex` | 代码执行者：按架构师指令写代码、修改文件、运行命令 |

**调用 Codex 的标准姿势：**
```
mcp__codex-mcp__codex(
  prompt: "<精确的任务描述，含文件路径、接口签名、验收标准>",
  model: "gpt-5.3-codex",        // 或 o3 用于复杂推理
  reasoningEffort: "high",
  sandbox: "workspace-write",
  workingDirectory: "C:/Users/22688/Desktop/ClawX-main"
)
```

Claude Code 审查 Codex 输出后，若不合格则给出修改意见再次调用，直到通过。

---

## 持久化工作流（每次会话必须执行）

### 会话开始（恢复上下文）
```bash
git status --short --branch
git log --oneline -n 8
cat continue/task.json
tail -40 continue/progress.txt
```

### 会话进行中
- 单任务推进，不并行开多个 task
- 每个 task 状态严格按 `brainstorming → planned → in_progress → review → done` 流转
- 设计/实现状态实时写入 `continue/task.json`
- 阻塞时标记 `blocked` 并写明恢复步骤

### 会话结束（必须执行）
1. 更新 `continue/task.json`（task 状态、current_focus、last_updated）
2. 追加 `continue/progress.txt`（本次做了什么、决策、阻塞、下一步）
3. 每完成一个 task 做一次本地 commit

---

## 当前阶段：前后端对接（进行中）

**核心目标**：将已完成的 ClawX 前端与 OpenClaw Gateway 后端完整对接，ClawX 原有的能力（WebSocket RPC、SSE 事件、会话管理等）直接复用，不重复造轮子。

### 前端现有能力（已实现，直接用）
- `src/stores/gateway.ts` — Gateway 生命周期管理、WebSocket RPC、SSE 事件订阅
- `src/stores/chat.ts` — 会话列表、消息历史、流式输出、发送消息
- `src/stores/agents.ts` — Agent 列表拉取
- `src/stores/channels.ts` — 频道配置
- `src/stores/cron.ts` — 定时任务
- `src/stores/approvals.ts` — 审批队列（已实现）
- `src/stores/notifications.ts` — 通知系统（已实现，含 wireGatewayNotifications）
- `src/lib/host-api.ts` — Electron IPC / Host API 封装
- `src/lib/api-client.ts` — invokeIpc 封装

### 后端参考代码（`reference/` 目录）

| 目录 | 说明 |
|------|------|
| `reference/openclaw-main/` | OpenClaw 主程序（Gateway 服务端），含 WebSocket API、sessions、chat、cron、approvals 等接口 |
| `reference/openclaw-control-center-main/` | 控制中心后端，含 `src/clients/openclaw-live-client.ts`（如何调用 Gateway CLI）、`src/runtime/`（monitor、task-heartbeat、cron-overview 等运行时逻辑） |
| `reference/clawport-ui-main/` | ClawPort UI 参考，含页面组件和 API 调用模式 |

**Gateway 连接参数（来自 control-center config）：**
- 默认 WebSocket：`ws://127.0.0.1:18789`
- 轮询间隔：sessions 10s、sessionStatus 2s、cron 10s、approvals 2s

---

## 已完成功能清单（截至 2026-03-20）

### 页面 & 路由
| 路由 | 状态 | 说明 |
|------|------|------|
| `/` Chat | ✅ | 会话列表、消息收发、流式输出、Agent 切换下拉 |
| `/channels` | ✅ | 飞书/钉钉/企业微信频道配置，i18n 标签 |
| `/cron` | ✅ | 定时任务列表、Pipelines Tab（run log + stats）、Schedule Tab（即将执行面板）|
| `/kanban` | ✅ | 任务看板 + ApprovalsSection（审批队列，approve/reject）|
| `/team-overview` | ✅ | Agent 团队卡片总览 |
| `/team-map` | ✅ | 团队层级图 |
| `/activity` | ✅ | 运行日志浏览器（level 过滤、搜索、自动刷新、tail 行数选择）|
| `/settings` | ✅ | 分组设置中心（监控统计、迁移备份、记忆知识、Gateway 端口可编辑）|
| `/agents` | ✅ | Agent 列表 |
| `/models` | ✅ | 模型配置 |
| `/skills` | ✅ | 技能/MCP 管理 |
| `/setup` | ✅ | 首次启动向导 |

### 后端路由（`electron/api/routes/`）
| 路由文件 | 状态 | 说明 |
|----------|------|------|
| `health.ts` | ✅ | GET /healthz, /api/healthz — 返回 gateway 状态 |
| `approvals.ts` | ✅ | GET /api/approvals, POST approve/reject |
| `logs.ts` | ✅ | GET /api/logs（已有）|
| `gateway.ts` | ✅ | Gateway 生命周期 |
| `settings.ts` | ✅ | 设置读写 |
| `agents.ts` | ✅ | Agent CRUD |
| `channels.ts` | ✅ | 频道 CRUD |
| `cron.ts` | ✅ | 定时任务 CRUD |
| `sessions.ts` | ✅ | 会话管理 |

### 通知系统
- `src/stores/notifications.ts` — Zustand store（addNotification / markRead / dismiss / clearAll）
- `wireGatewayNotifications()` — 已在 `App.tsx` 中订阅 Gateway 状态变化
- Sidebar 通知铃铛 — 已添加（Bell 图标 + unreadCount 徽章 + NotificationPanel 下拉）

---

## 待实现功能（优先级排序）

### P0 — 本周期优先
1. **通知铃铛 NotificationPanel 组件** — Sidebar.tsx 中已占位，需完成 `NotificationPanel` 组件实现（当前会话中断，代码未完成）
2. **记忆页面 `/memory`** — 独立路由，参考 `reference/clawport-ui-main/` 的 memory 实现，对接 `/api/memory` 接口
3. **费用/用量页面 `/costs`** — 对接 `/api/usage` 接口，展示 token 消耗和费用统计

### P1 — 下一周期
4. **预算治理设置** — Settings 中的 budget limit / alert threshold 对接真实 API
5. **审计时间线页面** — 操作历史记录，对接 `/api/logs` 扩展
6. **头像偏好持久化** — 当前 Sidebar 头像选择仅本地 state，需持久化到 settings store

### P2 — 后续
7. **主题定制** — 自定义颜色主题，超出当前 light/dark/system 三档
8. **CLI 洞察** — 命令行使用统计和建议
9. **新手引导标记 API** — onboarding 完成状态持久化

---

## 技术规范

- **框架**：Electron + React 19 + TypeScript + Tailwind CSS + Vite
- **状态管理**：Zustand（stores 在 `src/stores/`）
- **颜色系统**：
  - `--bg: #ffffff` / `--bg2: #f2f2f7` / `--bg3: #e5e5ea`
  - `--tx: #000000` / `--tx2: #3c3c43` / `--tx3: #8e8e93`
  - `--bd: #c6c6c8` / `--ac: #007aff`
  - 主色调高亮：`#ff6a00`
- **字体**：`-apple-system, SF Pro`，正文 13px
- **Sidebar**：展开 260px / 收起 64px
- **预览命令**：`npm run build:vite`（纯前端构建，无需 Electron）
- **预览服务**：`cd dist && python -m http.server 4176` → http://localhost:4176/

---

## 架构师审查清单（每次 Codex 输出后执行）

- [ ] TypeScript 类型正确，无 `any` 滥用
- [ ] 复用已有 store/hook，不重复实现
- [ ] API 调用走 `hostApiFetch` / `invokeIpc`，不直接 fetch
- [ ] 错误边界处理（loading / error / empty state）
- [ ] 与设计稿颜色/间距一致
- [ ] `npm run typecheck` 零报错
- [ ] 无 console.log 遗留

---

## 快速参考命令

```bash
# 类型检查
npm run typecheck

# 构建前端
npm run build:vite

# 查看最近进度
tail -40 continue/progress.txt

# 查看当前任务
cat continue/task.json | python -c "import sys,json; d=json.load(sys.stdin); print(d['current_focus'])"
```

---

## 未提交变更（当前会话遗留，下次会话需先 commit）

以下文件已修改但未 commit（截至 2026-03-20 会话中断）：
- `src/App.tsx` — 添加 `wireGatewayNotifications(useGatewayStore)` 订阅
- `src/components/layout/Sidebar.tsx` — 添加 Bell 图标、unreadCount 徽章、notifOpen 状态、NotificationPanel 占位（**NotificationPanel 组件尚未实现，需在下次会话补全**）
- `electron/api/server.ts` — 注册 handleHealthRoutes + handleApprovalRoutes
- `electron/api/routes/health.ts` — 新文件（healthz 端点）
- `src/pages/Activity/index.tsx` — 新文件（运行日志页面）
- `src/stores/notifications.ts` — 新文件（通知 store）
