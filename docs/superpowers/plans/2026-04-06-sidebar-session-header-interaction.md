# Sidebar Session Header Interaction Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the session collapse affordance next to the `会话` label, make it hover/focus-revealed, and reserve the far-right slot for an always-visible new-session `+` action.

**Architecture:** Keep the generic `SectionHeader` untouched for `频道` and add a session-specific header path inside `Sidebar.tsx`. Reuse the existing `newSession()` chat-store action and only change the `会话` group header structure and behavior.

**Tech Stack:** React 19, TypeScript, Zustand, Vitest, Testing Library

---

### Task 1: Lock the session-header behavior with tests

**Files:**
- Modify: `tests/unit/workbench-sidebar.test.tsx`

- [ ] **Step 1: Write failing tests**

Add assertions for:
- always-visible `+` button on the `会话` header in expanded mode
- `+` creates a new session and does not collapse the list
- clicking the left header area toggles session visibility
- chevron uses hidden-by-default hover/focus reveal classes

- [ ] **Step 2: Run the focused Sidebar test**

Run:

```bash
pnpm vitest run tests/unit/workbench-sidebar.test.tsx
```

Expected: fail on missing new-session header control and missing session-specific chevron behavior.

### Task 2: Implement the session-specific header

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add the new-session action wiring**

Use the existing chat store `newSession()` action and navigate to `/`.

- [ ] **Step 2: Split the `会话` header into two buttons**

Implement:
- left toggle button
- right `+` action button
- chevron beside the label, not at the far edge

- [ ] **Step 3: Add hover/focus reveal styling**

Keep the chevron mounted and use classes so it is hidden by default, visible on hover, and visible on focus-within.

- [ ] **Step 4: Re-run the Sidebar test**

Run:

```bash
pnpm vitest run tests/unit/workbench-sidebar.test.tsx
```

Expected: pass.

### Task 3: Regression verification

**Files:**
- Verify only

- [ ] **Step 1: Run the relevant sidebar slice**

Run:

```bash
pnpm vitest run tests/unit/workbench-sidebar.test.tsx tests/unit/sidebar-session-pinning.test.tsx tests/unit/workbench-global-search.test.tsx
```

Expected: pass without regressions to session rendering, pinning, or search.
