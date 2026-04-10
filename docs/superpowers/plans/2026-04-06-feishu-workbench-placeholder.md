# Feishu Workbench Placeholder Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a temporary development placeholder in the Feishu right pane without changing the rest of the Channels page structure.

**Architecture:** Add one small Feishu-only placeholder component and mount it as a visual overlay from the Channels page. Keep the existing workbench tree in place so this temporary state is easy to remove and does not force unrelated page rewrites.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library

---

### Task 1: Lock the visible behavior with a failing test

**Files:**
- Modify: `tests/unit/channels-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a test that renders the Feishu Channels page and expects:
- `飞书同步工作台开发中`
- `功能尚未开发完毕`
- `打开频道设置`

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest tests/unit/channels-page.test.tsx -t "shows a development placeholder in the feishu workbench pane"`

- [ ] **Step 3: Write minimal implementation**

Add the placeholder component and render it only when the active channel family is `feishu`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest tests/unit/channels-page.test.tsx -t "shows a development placeholder in the feishu workbench pane"`

### Task 2: Keep the temporary UI bounded and maintainable

**Files:**
- Create: `src/components/channels/FeishuWorkbenchPlaceholder.tsx`
- Modify: `src/pages/Channels/index.tsx`

- [ ] **Step 1: Add a focused placeholder component**

The component should:
- show a Chinese title and explanatory copy
- show one primary action button
- accept props for whether a Feishu channel exists and what action to run

- [ ] **Step 2: Wire it into the Channels page**

Use a Feishu-only overlay in the right pane and route the primary action to:
- `setSettingsOpen(true)` when a channel exists
- `handleQuickAddCurrentType()` when it does not

- [ ] **Step 3: Run targeted verification**

Run:
- `pnpm vitest tests/unit/channels-page.test.tsx -t "shows a development placeholder in the feishu workbench pane"`
- `pnpm vitest tests/unit/channels-page.test.tsx -t "renders the chat-first workbench shell for feishu instead of the old detail panel"`
