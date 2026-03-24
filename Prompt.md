# ClawX 持久化开发命令

工作目录：`C:\Users\22688\Desktop\ClawX-main`

---

## 角色分工

| 角色 | 工具 | 职责 |
|------|------|------|
| **Claude Code（你）** | 本体 | 架构师 + 质检师：分析需求、设计方案、审查代码、质量把关 |
| **Codex MCP（GPT-5.3 high）** | `mcp__codex-mcp__codex` | 代码执行者：按架构师指令写代码、修改文件、运行命令 |

**调用 Codex 的标准姿势：**
```text
mcp__codex-mcp__codex(
  prompt: "<精确的任务描述，含文件路径、接口签名、验收标准>",
  model: "gpt-5.3-codex",
  reasoningEffort: "high",
  sandbox: "workspace-write",
  workingDirectory: "C:/Users/22688/Desktop/ClawX-main"
)
````

> ⚠️ Codex MCP 已恢复可用。优先用 Codex 写业务代码，Claude 负责架构设计和审查。

---

## 持久化工作流（每次会话必须执行）

### 会话开始（恢复上下文）

```bash
git log --oneline -8
cat continue/task.json | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('current_focus',''))"
tail -30 continue/progress.txt
```

### 会话结束（必须执行）

1. 更新 `continue/task.json`（task 状态、current_focus、last_updated）
2. 追加 `continue/progress.txt`（本次做了什么、决策、阻塞、下一步）
3. 每完成一个 task 做一次本地 commit
4. 更新本文件 `Prompt.md`（已完成清单、待实现清单）

---

## 技术规范

* **框架**：Electron + React 19 + TypeScript + Tailwind CSS + Vite
* **状态管理**：Zustand（stores 在 `src/stores/`）
* **API 调用**：必须走 `hostApiFetch<T>()` / `invokeIpc`，不直接 fetch
* **颜色系统**：

  * `--bg: #ffffff` / `--bg2: #f2f2f7` / `--bg3: #e5e5ea`
  * `--tx: #000000` / `--tx2: #3c3c43` / `--tx3: #8e8e93`
  * `--bd: #c6c6c8` / `--ac: #007aff`（运行时可被 settings store 覆盖）
  * **Tailwind token**：`bg-clawx-ac`、`text-clawx-ac`、`border-clawx-ac`（支持 `/10`、`/40` 等透明度修饰符）
  * 主色调高亮：`#ff6a00`
* **字体**：`-apple-system, SF Pro`，正文 13px
* **Sidebar**：展开 260px / 收起 64px
* **预览命令**：`pnpm run build:vite`
* **类型检查**：`npx tsc --noEmit`（必须零报错）

---

## 当前待实现功能（优先级排序）

### P1 — 已完成

#### 6. 记忆提取增强（规则 + LLM judge）✅ session-7

* **状态**：已完成
* **实现**：`electron/api/routes/memory-extract.ts` — 加减分评分模型、LLM 缓存（TTL 10min, max 256）、borderline 检测（0.08 margin）、request-style 检测、长度调整
* **测试**：`tests/unit/memory-extract-scoring.test.ts`（13 条）+ `tests/unit/openclaw-memory-extract.test.ts`（3 条）

### P2 — 后续

#### 11. 应用自动更新（链路一致性待补）

* **当前状态**：update store + Settings UI 已有 `check/download/install/progress`
* **剩余工作**：决定是否补 Host API update route，并继续保证更新链路一致性

---

## 当前 backlog / 已知问题

### P0 — 安全 / 持久化 / 验证基线 ✅ 全部关闭

| # | 问题 | 状态 | 关闭原因 |
| - | --- | --- | --- |
| 1 | Host API CORS 全开放 | ✅ session-7 | `isAuthorizedHostApiRequest` 会话密钥校验已就位；`applyCorsOrigin()` 仅对受信 origin 设置 `Access-Control-Allow-Origin`（defense-in-depth） |
| 2 | Host API / SSE 暴露敏感数据 | ✅ session-6/7 | API key 已 `maskSecret()`；SSE 在 session-token auth 之后；control UI URL 已剥离 token |

---

### P1 — 后端 / 架构 / 数据正确性 ✅ 全部关闭

| #  | 问题 | 状态 | 关闭原因 |
| -- | --- | --- | --- |
| 5  | 传输策略漂移 | ✅ session-7 验证 | `gateway:rpc` 已固定 `['ipc']`，无 localStorage 控制 |
| 6  | renderer 保留 localhost fetch 回退 | ✅ session-7 验证 | 仅在 `isBrowserPreviewMode()` 下启用，正常 Electron 不触发 |
| 10 | secret 仍落在 electron-store | ✅ session-7 验证 | `secret-store.ts` 已使用 `safeStorage` 加密（`ktclaw-safe-storage/v1`） |
| 12 | 删除 agent 误杀进程 | ✅ session-7 验证 | 已有 `isGatewayPid` 安全门，无 PID 时拒绝 port-kill 并返回错误 |
| 13 | 删除 default account 残留镜像 | ✅ session-7 验证 | `remirrorDefaultAccountToTopLevel` 先调 `clearTopLevelChannelMirror` 再重镜像 |
| 14 | channel 校验假阳性 | ✅ session-7 验证 | `validateChannelConfig` 已正确使用 `runOpenClawDoctor()`，失败时返回 `valid: false` |

---

### P1 — 测试债务 / 假红修复 ✅ 全部关闭

| #  | 问题 | 状态 | 关闭原因 |
| -- | --- | --- | --- |
| 28 | chat-input 签名断言过时 | ✅ session-7 验证 | 测试已有 4 参数断言（含 `workingDirectory`） |
| 33 | sidebar 测试隔离不足 | ✅ session-7 验证 | `fetchAgents`/`fetchChannels` 已正确 mock，无 API 噪声 |

---

### P2 — 文档 / 脚本 / 清理 ✅ 全部关闭

| #  | 问题 | 状态 | 关闭原因 |
| -- | --- | --- | --- |
| 38 | 后端 console.* 清理 | ✅ session-7 验证 | 所有 electron/ 代码已统一使用 `logger`，仅 `logger.ts` 自身保留 `console.*` |

---

## 全量代码审计结果 (2026-03) ✅ 全部关闭

### 新增与已验证的 Backlog 补充
1. **Host API CORS 与鉴权设计** ✅：`applyCorsOrigin()` 已添加 origin 白名单；`isAuthorizedHostApiRequest` 会话密钥校验已就位。
2. **Renderer 层的直接网络请求** ✅：仅在 `isBrowserPreviewMode()` 下启用，正常 Electron 不触发。
3. **明文存储风险** ✅：`secret-store.ts` 已使用 `safeStorage` 加密（`ktclaw-safe-storage/v1` 格式）。
4. **编译与类型基线** ✅：`typecheck` + `tsc -p tsconfig.node.json` 零错误；`build:vite` 通过。
5. **任务管理与进程清理机制** ✅：`isGatewayPid` 安全门已就位，无 PID 时拒绝 port-kill。

---

## 持久化开发分桶（后续任务组织方式）

* `Persistence / Session Integrity`：只处理 `continue/task.json`、`continue/progress.txt`、编码/结构校验、单一 `current_focus`、恢复命令可执行性。
* `Verification Hygiene`：统一标准验证命令，新增非破坏性 `lint:check`，明确哪些任务必须跑 full test / targeted test / build / comms compare。
* `Test Harness Repair`：拆分 Vitest `node` / `jsdom` 环境，修复 Electron/Node util 测试归位问题。
* `UI Test Refresh`：重写 Chat / Workbench / Settings 的陈旧断言，避免硬编码视觉类名、过时文案、旧 IA。
* `Static vs Live Contracts`：逐页标注“真实 API”“静态占位”“过渡态 mock”，防止继续误报“已全量接真实数据”。
* `Accessibility & Test Seams`：补 `aria-label` / landmark / 可访问角色，并为 `hostApiFetch`、store 注入点等建立稳定 mock seam。
* `Docs & Script Safety Sync`：README / Prompt / continue 三处同步规则、命令副作用、已完成声明的更新责任。
* `E2E / Release Verification`：补 Playwright 命令、关键流程 smoke、更新链路 / 打包链路验证。

---

## LobsterAI 参考价值总结

| 模块          | 参考文件                                                        | 可借鉴内容                  |
| ----------- | ----------------------------------------------------------- | ---------------------- |
| Markdown 渲染 | `src/renderer/components/MarkdownContent.tsx`               | 代码高亮、数学公式、本地文件链接、复制按钮  |
| 审批 Wizard   | `src/renderer/components/cowork/CoworkQuestionWizard.tsx`   | AskUserQuestion 多步骤 UI |
| 快捷操作        | `src/renderer/components/quick-actions/QuickActionBar.tsx`  | 空会话快捷入口                |
| 工作区选择       | `src/renderer/components/cowork/FolderSelectorPopover.tsx`  | 文件夹选择 popover          |
| 会话列表        | `src/renderer/components/cowork/CoworkSessionItem.tsx`      | 置顶、批量删除、相对时间           |
| 记忆提取        | `src/main/libs/coworkMemoryExtractor.ts`                    | 规则引擎自动提取记忆             |
| 记忆判断        | `src/main/libs/coworkMemoryJudge.ts`                        | LLM 辅助判断是否值得记忆         |
| MCP 管理      | `src/main/libs/mcpServerManager.ts`                         | MCP 服务器生命周期管理          |
| 定时任务历史      | `src/renderer/components/scheduledTasks/AllRunsHistory.tsx` | 运行历史 UI                |
| Toast 通知    | `src/renderer/components/Toast.tsx`                         | 简洁 toast 样式参考          |

---

## 架构师审查清单（每次 Codex 输出后执行）

* [ ] TypeScript 类型正确，无 `any` 滥用，`npx tsc --noEmit` 零报错
* [ ] API 调用走 `hostApiFetch<T>()` / `invokeIpc`，不直接 fetch
* [ ] 复用已有 store/hook，不重复实现
* [ ] 错误边界处理（loading / error / empty state）
* [ ] 与设计稿颜色/间距一致（`clawx-ac` 主色 token / `var(--ac)` CSS 变量、`#f2f2f7` 背景）
* [ ] 无 `console.log` 遗留
* [ ] 无 `require()` 混用（electron 端用 import）

---

## 快速参考命令

```bash
# 类型检查（renderer）
pnpm run typecheck

# 类型检查（Electron / main / preload）
pnpm exec tsc -p tsconfig.node.json --noEmit

# 构建前端
pnpm run build:vite

# 单测全量
pnpm test

# 查看最近提交
git log --oneline -8

# 查看当前任务
cat continue/task.json | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('current_focus',''))"

# 查看进度日志
tail -40 continue/progress.txt
```

