# Channel Workbench Bug Sweep Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the reported cross-platform packaging, channel workbench flicker, session isolation, and gateway refresh regressions without regressing the existing KTClaw chat/session model.

**Architecture:** Fix the bug set in three waves. First stabilize the Channels page selection and refresh state machine so WeChat and Feishu no longer cross-render or default to the wrong placeholder. Next tighten channel workbench conversation identity and persistence around explicit `(channelType, accountId, externalConversationId)` scoping, then align Feishu send/writeback behavior with WeChat. Finally add system-level regression coverage for packaging shortcuts, Linux asset resolution, and gateway reload behavior.

**Tech Stack:** React 19, Zustand, Electron main/host routes, OpenClaw gateway RPC, Vitest

---

## File Structure

- `src/pages/Channels/index.tsx`
  - Active-channel selection, neutral placeholder behavior, session polling/subscription logic, optimistic send UI.
- `src/pages/Channels/channel-selection.ts`
  - Pure selection helpers; should stop hardcoding Feishu as the default fallback.
- `tests/unit/channel-workbench-selection.test.ts`
  - Small unit tests for requested-channel/selected-channel resolution.
- `tests/unit/channels-page.test.tsx`
  - Integration coverage for WeChat/Feishu mount behavior, workbench refresh, and optimistic send rendering.
- `electron/api/routes/channels.ts`
  - Workbench session listing, derived-session merging, conversation binding, channel send routes, and gateway refresh scheduling.
- `electron/services/channel-conversation-bindings.ts`
  - Persisted channel conversation identity keyed by `(channelType, accountId, externalConversationId)`.
- `tests/unit/channel-conversation-bindings.test.ts`
  - Binding-store persistence and isolation coverage.
- `tests/unit/feishu-send-path.test.ts`
  - Direct-send/runtime-fallback coverage.
- `tests/unit/openclaw-windows-package-config.test.ts`
  - Windows packaging shortcut assertions.
- `tests/unit/linux-package-config.test.ts`
  - Linux desktop-entry/icon regression coverage.
- `electron-builder.yml`
  - Desktop shortcut and Linux desktop-entry packaging metadata.

## Chunk 1: Channels Selection And Refresh Stability

### Task 1: Lock down neutral default selection and no-Feishu flash

**Files:**
- Modify: `tests/unit/channel-workbench-selection.test.ts`
- Modify: `tests/unit/channels-page.test.tsx`
- Modify: `src/pages/Channels/channel-selection.ts`
- Modify: `src/pages/Channels/index.tsx`

- [ ] Add failing tests showing that no route parameter must not default to Feishu and that WeChat mount does not request Feishu workbench state.
- [ ] Run targeted tests and confirm failure.
- [ ] Update selection helpers so route param is optional and neutral when absent.
- [ ] Update Channels render flow so Feishu placeholder appears only when Feishu is explicitly selected.
- [ ] Re-run targeted tests and confirm green.

### Task 2: Stop duplicate refresh paths from destabilizing the workbench

**Files:**
- Modify: `tests/unit/channels-page.test.tsx`
- Modify: `src/pages/Channels/index.tsx`

- [ ] Add failing tests that prove unrelated gateway notifications do not reset the selected channel/session and that refresh subscriptions do not create duplicated loads.
- [ ] Run the failing tests.
- [ ] Consolidate/guard polling and `gateway:notification` refresh logic around the active channel/conversation identity.
- [ ] Re-run targeted tests and confirm green.

## Chunk 2: Session Isolation, Persistence, And Send Writeback

### Task 3: Enforce scoped conversation identity through derived sessions and bindings

**Files:**
- Modify: `tests/unit/channel-conversation-bindings.test.ts`
- Modify: `tests/unit/channels-page.test.tsx`
- Modify: `electron/services/channel-conversation-bindings.ts`
- Modify: `electron/api/routes/channels.ts`

- [ ] Add failing tests covering `(channelType, accountId, externalConversationId)` isolation and WeChat new-user routing into a conversation list instead of a top-level channel entry.
- [ ] Run the failing tests.
- [ ] Normalize derived-session IDs, binding upserts, and lookup paths around the scoped compound key.
- [ ] Re-run tests and confirm green.

### Task 4: Align Feishu send/writeback with WeChat optimistic behavior

**Files:**
- Modify: `tests/unit/channels-page.test.tsx`
- Modify: `tests/unit/feishu-send-path.test.ts`
- Modify: `electron/api/routes/channels.ts`
- Modify: `src/pages/Channels/index.tsx`

- [ ] Add failing tests showing Feishu send returns enough identity for optimistic refresh/writeback and that the UI keeps the optimistic bubble until confirmed.
- [ ] Run the failing tests.
- [ ] Return consistent send metadata for Feishu and preserve optimistic reload behavior through runtime/direct-send paths.
- [ ] Re-run tests and confirm green.

## Chunk 3: Packaging, Resource Paths, And Gateway Refresh

### Task 5: Add packaging/resource regression coverage before changing config

**Files:**
- Create: `tests/unit/linux-package-config.test.ts`
- Modify: `tests/unit/openclaw-windows-package-config.test.ts`
- Modify: `electron-builder.yml`
- Modify: any runtime resource resolver files identified during investigation

- [ ] Add failing tests for Windows desktop shortcuts and Linux desktop-entry/icon metadata.
- [ ] Run the failing tests.
- [ ] Update builder config and any runtime resource-path helpers needed for packaged Linux image/icon loading.
- [ ] Re-run tests and confirm green.

### Task 6: Prefer gateway hot reload over full restart where supported

**Files:**
- Modify: `tests/unit/gateway-manager-reload-policy-refresh.test.ts`
- Modify: `tests/unit/settings-gateway-port-route.test.ts`
- Modify: `electron/api/routes/channels.ts`
- Modify: `electron/main/ipc-handlers.ts`
- Modify: `electron/gateway/manager.ts` if required

- [ ] Add failing tests for config-save flows that should debounce into reload instead of restart.
- [ ] Run the failing tests.
- [ ] Route supported provider/channel saves through reload-first behavior and keep restart as explicit fallback.
- [ ] Re-run targeted tests and confirm green.

