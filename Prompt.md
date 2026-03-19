请在 C:\Users\22688\Desktop\KTClaw-main 继续开发，严格遵循 continue\AGENT.MD 工作流：

- 单任务推进
- 先恢复上下文再行动
- 设计/实现状态都要写入 continue\task.json
- 每次结束都要更新 continue\progress.txt
- 每完成一个 task 做一次本地 commit
- 如果阻塞，按 continue\AGENT.MD 标记 blocked 并写明恢复步骤

---

## 当前阶段：前端像素级还原设计稿，直到与设计稿无任何差异、预览无任何 bug

**核心目标**：`docs/figma-review/kaitianclaw-design-board.html` 是唯一视觉标准，前端 React 实现必须与其完全一致，包括每一个颜色值、间距、圆角、字号、图标、文字内容。

**预览服务**：
- 设计稿：http://localhost:4174/（如已关闭请重新启动：`cd docs/figma-review && python -m http.server 4174`）
- 前端预览：先执行 `npm run build:vite`，再 `cd dist && python -m http.server 4176`，访问 http://localhost:4176/

---

## 恢复检查（先做这些）

```powershell
# 1. 项目状态
git status --short --branch
git log --oneline -n 12

# 2. 上下文文件
Get-Content continue\AGENT.MD
Get-Content continue\task.json
Get-Content -Tail 50 continue\progress.txt
```

---

## 当前进度摘要（上一个会话的成果）

已完成的模块：
- ✅ **Sidebar**：移除 logo，只保留 ☰ 和 ＋ 两个按钮；导航项用 emoji 图标（✦/🪶/💙/🍀/📋/📅/👥/🗺）；底部显示头像 + Administrator + ⚙ 设置按钮；分组标签已匹配设计稿（分身/团队管理/CHANNEL 频道/任务/设置）
- ✅ **Chat 页面**：顶栏 52px，消息气泡样式，ChatInput 容器和按钮
- ✅ **WorkbenchEmptyState**：56px 图标，26px 标题，2 列建议卡片
- ✅ **Settings 页面**：
  - 左侧导航已与设计稿对齐（220px，#fcfcfc 背景，11 个页面，无多余页面）
  - 移除了设计稿中不存在的"网络与代理"和"安全与审计"
  - 添加了返回按钮（返回工作台）
  - 卡片样式：border #c6c6c8，rounded-xl，白色背景
  - 主内容区：白色背景，px-[60px]，max-w-[640px]

**尚未提交**：以上所有改动（`git status` 有大量 M 文件）均未 commit，需要先 commit 当前改动，再继续。

---

## 下一步任务（按优先级）

1. **commit 当前所有未提交的改动**（先 `npm run typecheck` 验证无错后再 commit）
2. **截图逐帧对比**：
   - 打开两个浏览器窗口并排对比
   - 对照设计稿的每一个 Frame（01-10）检查实现
   - 重点检查：Sidebar、Chat 页面、Settings 设置页（尤其是常规设置的各个 section 内容是否匹配）
3. **逐差异修复**：每发现一处不匹配，立即修改代码，rebuild，再截图确认
4. **测试**：确保 `npm run typecheck` 和 `npm run test` 全部通过

---

## 关键技术规范

- **颜色**：`--bg: #ffffff`，`--bg2: #f2f2f7`，`--bg3: #e5e5ea`，`--tx: #000000`，`--tx2: #3c3c43`，`--tx3: #8e8e93`，`--bd: #c6c6c8`，`--ac: #007aff`
- **字体**：-apple-system, SF Pro，13px 正文，10px 大写标签
- **图标**：用 emoji 替代 Lucide（☰ ＋ ✦ 🪶 💙 🍀 📋 📅 👥 🗺 ⚙）
- **Sidebar 宽度**：260px（展开）/ 64px（收起）
- **设置页左侧导航**：220px，#fcfcfc 背景
- **预览命令**：`npm run build:vite`（只构建前端，无需 electron）

---

## 补充背景

- 这是一个 Electron + React 19 + TypeScript + Tailwind CSS 项目
- 设计稿是纯静态 HTML，我们以它为唯一视觉标准
- 不需要改动任何业务逻辑，只改样式和布局
- 如果卡片内有占位内容，直接用设计稿里的静态文本填充即可
- gstack skills 已安装（/browse、/design-review 等可用）
