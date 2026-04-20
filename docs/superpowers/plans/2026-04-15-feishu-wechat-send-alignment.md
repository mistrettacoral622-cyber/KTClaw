# Feishu WeChat Send Alignment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Feishu `self` / `bot` send branching and make Feishu workbench sends follow the same single runtime-session path as WeChat.

**Architecture:** Keep Feishu conversation binding and workbench history behavior, but collapse outbound sending to one route: resolve the conversation binding, then call `chat.send` with the bound session key. UI and host code should stop depending on identity switching semantics for Feishu sends.

**Tech Stack:** Electron host routes, TypeScript, Vitest

---

## Chunk 1: Route Simplification

### Task 1: Lock the desired Feishu send behavior in tests

**Files:**
- Modify: `tests/unit/channel-sync-routes.test.ts`
- Test: `tests/unit/channel-sync-routes.test.ts`

- [ ] **Step 1: Write the failing test**

Add or update a test asserting that Feishu workbench sends call `chat.send` with the resolved scoped session key and do not depend on `identity: self`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/channel-sync-routes.test.ts`
Expected: FAIL in the Feishu send-path case because the route still branches through identity-specific logic.

- [ ] **Step 3: Write minimal implementation**

Update `electron/api/routes/channels.ts` so Feishu send handling mirrors WeChat:

- resolve Feishu conversation binding
- require a runtime session key
- send through `ctx.gatewayManager.rpc('chat.send', ...)`
- return a single success payload shape

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `pnpm vitest run tests/unit/channel-sync-routes.test.ts`
Expected: PASS

## Chunk 2: Regression Safety

### Task 2: Verify Feishu plugin/session compatibility stays intact

**Files:**
- Modify: `tests/unit/channel-sync-routes.test.ts` if needed
- Test: `tests/unit/openclaw-feishu-integration.test.ts`
- Test: `tests/unit/openclaw-feishu-routes.test.ts`
- Test: `tests/unit/feishu-plugin-session-scope.test.ts`

- [ ] **Step 1: Run compatibility and route regression tests**

Run: `pnpm vitest run tests/unit/feishu-plugin-session-scope.test.ts tests/unit/openclaw-feishu-integration.test.ts tests/unit/openclaw-feishu-routes.test.ts`
Expected: PASS

- [ ] **Step 2: Run comms replay and compare**

Run: `pnpm run comms:replay`
Run: `pnpm run comms:compare`
Expected: both commands succeed without regression output

- [ ] **Step 3: Manual restart note**

Restart KTClaw/Gateway so the installed Feishu plugin and host route changes are reloaded before user verification.
