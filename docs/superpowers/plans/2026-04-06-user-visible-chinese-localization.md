# User-Visible Chinese Localization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove remaining English from KTClaw's user-visible application surfaces while preserving required proper nouns and internal identifiers.

**Architecture:** Treat the active Chinese locale as the primary source of visible copy, then patch the remaining hardcoded UI literals in components. Keep this as a content correction pass rather than an i18n architecture refactor.

**Tech Stack:** React 19, TypeScript, i18next, Vitest

---

### Task 1: Lock the most visible English leaks with tests

**Files:**
- Modify: `tests/unit/i18n-config.test.ts`
- Modify: `tests/unit/team-map-page.test.tsx`
- Modify: `tests/unit/member-detail-sheet.test.tsx`
- Modify: `tests/unit/member-activity-tab.test.tsx`
- Modify: `tests/unit/settings-general-panel.test.tsx`
- Modify: `tests/unit/openclaw-vite-config.test.ts`

- [ ] **Step 1: Write failing assertions for current visible English**

Cover representative cases such as:
- English labels in Team Map / Agent detail
- English settings labels or status text
- locale values that still render English on the Chinese path

- [ ] **Step 2: Run the focused tests and confirm RED**

Run:

```bash
pnpm vitest run tests/unit/i18n-config.test.ts tests/unit/team-map-page.test.tsx tests/unit/member-detail-sheet.test.tsx tests/unit/member-activity-tab.test.tsx tests/unit/settings-general-panel.test.tsx tests/unit/openclaw-vite-config.test.ts
```

Expected: failures proving visible English still exists.

### Task 2: Clean the active Chinese locale

**Files:**
- Modify: `src/i18n/locales/zh/common.json`
- Modify: `src/i18n/locales/zh/agents.json`
- Modify: `src/i18n/locales/zh/channels.json`
- Modify: `src/i18n/locales/zh/chat.json`
- Modify: `src/i18n/locales/zh/cron.json`
- Modify: `src/i18n/locales/zh/dashboard.json`
- Modify: `src/i18n/locales/zh/settings.json`
- Modify: `src/i18n/locales/zh/setup.json`
- Modify: `src/i18n/locales/zh/skills.json`

- [ ] **Step 1: Translate generic UI nouns and helper text**

Examples:
- `Settings` -> `设置`
- `Details` -> `详情`
- `Overview` -> `概览`
- `Activity` -> `动态`
- `Runtime capabilities` -> `运行时能力`

- [ ] **Step 2: Preserve proper nouns and technical identifiers**

Keep values such as:
- `KTClaw`
- `OpenClaw`
- `OAuth`
- `API Key`
- external product names and model/provider names

- [ ] **Step 3: Re-run locale-focused tests**

Run:

```bash
pnpm vitest run tests/unit/i18n-config.test.ts
```

Expected: locale assertions pass and no required key regression appears.

### Task 3: Patch component-level hardcoded English

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/common/ErrorBoundary.tsx`
- Modify: `src/components/common/StatusBadge.tsx`
- Modify: `src/components/agents/detail/AgentActivityTab.tsx`
- Modify: `src/components/agents/detail/AgentDetailTabs.tsx`
- Modify: `src/components/search/GlobalSearchModal.tsx`
- Modify: `src/components/layout/TitleBar.tsx`
- Modify: `src/components/workbench/workbench-empty-state.tsx`
- Modify: `src/pages/Chat/ChatInput.tsx`
- Modify: `src/pages/Chat/ChatMessage.tsx`
- Modify: `src/pages/Setup/index.tsx`
- Modify: `src/components/settings/ProvidersSettings.tsx`
- Modify: any touched page/component surfaced by failing tests

- [ ] **Step 1: Replace hardcoded English in visible controls and toasts**

Focus on:
- modal titles
- tab labels
- placeholders
- status badges
- toast copy
- OAuth/setup prompt copy

- [ ] **Step 2: Keep internal values unchanged**

Do not rename:
- protocol enum values
- route IDs
- MCP transport values such as `stdio` / `http` / `sse`
- model IDs and provider IDs

- [ ] **Step 3: Re-run the focused UI tests**

Run:

```bash
pnpm vitest run tests/unit/team-map-page.test.tsx tests/unit/member-detail-sheet.test.tsx tests/unit/member-activity-tab.test.tsx tests/unit/settings-general-panel.test.tsx
```

Expected: all pass with Chinese-facing output.

### Task 4: Verify the application still holds together

**Files:**
- Verify only

- [ ] **Step 1: Run i18n parity**

Run:

```bash
pnpm run i18n:check
```

Expected: locale structure remains valid.

- [ ] **Step 2: Run the full affected regression slice**

Run:

```bash
pnpm vitest run tests/unit/i18n-config.test.ts tests/unit/team-map-page.test.tsx tests/unit/member-detail-sheet.test.tsx tests/unit/member-activity-tab.test.tsx tests/unit/settings-general-panel.test.tsx tests/unit/settings-shell-integration.test.tsx tests/unit/team-map-page.test.tsx
```

Expected: touched user-facing flows stay green.

- [ ] **Step 3: Report any remaining intentional English**

Document the strings intentionally kept because they are proper nouns, protocol values, or branded product names.
