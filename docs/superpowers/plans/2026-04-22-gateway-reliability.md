# Gateway Reliability Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate avoidable gateway restarts, shorten and explain startup, suppress unmanaged plugin-driven cold-start cost, and make token/auth failures diagnosable and recoverable.

**Architecture:** Keep the existing `GatewayManager` and startup orchestration, but insert an explicit lifecycle classifier between config mutations and process actions. Separate hot-apply, secret reload, and restart paths; harden startup into critical versus optional phases; and surface structured diagnostics for token drift, restart causes, and plugin discovery.

**Tech Stack:** Electron 40, React 19, Vite 7, TypeScript 5.9, OpenClaw 2026.3.22, Vitest 4, pnpm 10

---

## File Map

- Create: `electron/gateway/refresh-classifier.ts`
  Owns the only allowed mapping from mutation type to `none | secrets_reload | reload | restart`.
- Create: `tests/unit/gateway-refresh-classifier.test.ts`
  Locks the refresh contract before implementation.
- Create: `electron/gateway/startup-diagnostics.ts`
  Records startup phase timing, last restart reason, plugin discovery summary, and auth failure summary.
- Create: `tests/unit/gateway-startup-diagnostics.test.ts`
  Verifies startup telemetry and auth-diagnostic behavior.
- Modify: `electron/gateway/manager.ts`
  Consume the classifier, stop duplicate restart/reconnect churn, expose structured diagnostics, and run optional warmups only once per app session.
- Modify: `electron/gateway/startup-orchestrator.ts`
  Emit named startup phases and preserve timing/failure context.
- Modify: `electron/gateway/restart-controller.ts`
  Drop or suppress deferred restarts that upstream restart already satisfied.
- Modify: `electron/gateway/startup-stderr.ts`
  Preserve auth/token mismatch evidence instead of dropping it as noise.
- Modify: `electron/gateway/config-sync.ts`
  Split critical prelaunch sync from optional sync, and enforce plugin gating for channel-owned extensions.
- Modify: `electron/gateway/supervisor.ts`
  Avoid repeated optional warmups and support bounded auth-repair helpers where needed.
- Modify: `electron/services/providers/provider-runtime-sync.ts`
  Replace direct reload/restart scheduling with refresh classification and secret-reload usage.
- Modify: `electron/api/routes/channels.ts`
  Route channel changes through the classifier instead of unconditional debounced restart/reload.
- Modify: `electron/api/routes/agents.ts`
  Route agent changes through the classifier and preserve the one special deletion case that still needs full restart.
- Modify: `electron/api/routes/settings.ts`
  Keep gateway-port and proxy changes restart-aware while leaving hot-safe config paths alone.
- Modify: `electron/main/ipc-handlers.ts`
  Align legacy IPC-based gateway refresh calls with the classifier.
- Modify: `electron/utils/openclaw-auth.ts`
  Enforce explicit plugin-enabled state for KTClaw-managed channel plugins and support token drift repair helpers.
- Modify: `electron/utils/channel-config.ts`
  Keep `plugins.allow` / `plugins.entries` aligned with configured channels and stale plugin disablement.
- Modify: `src/stores/gateway.ts`
  Surface structured diagnostics to the renderer.
- Modify: `tests/unit/provider-runtime-sync.test.ts`
  Lock provider save/default/model-change behavior to non-restart paths.
- Modify: `tests/unit/channels-routes.test.ts`
  Lock channel save paths to classified refresh behavior.
- Modify: `tests/unit/gateway-startup-hardening.test.ts`
  Cover startup-phase timing and one-time optional warmups.
- Modify: `tests/unit/gateway-supervisor-stability.test.ts`
  Cover token/auth drift diagnostics and process-recovery boundaries.

## Chunk 1: Lifecycle Contract

### Task 1: Lock the refresh matrix in failing tests

**Files:**
- Create: `tests/unit/gateway-refresh-classifier.test.ts`
- Modify: `tests/unit/provider-runtime-sync.test.ts`
- Modify: `tests/unit/channels-routes.test.ts`

- [ ] **Step 1: Write the failing test**

Add node tests that assert:

- provider save and provider default change do not classify as `restart`
- provider auth-only change classifies as `secrets_reload`
- agent model change does not classify as `restart`
- channel save for hot-safe channel types does not classify as `restart`
- gateway server changes still classify as `restart`

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/unit/gateway-refresh-classifier.test.ts tests/unit/provider-runtime-sync.test.ts tests/unit/channels-routes.test.ts --project node`
Expected: FAIL because the classifier does not exist and existing callers still use direct reload/restart scheduling.

- [ ] **Step 3: Write minimal implementation**

Create `electron/gateway/refresh-classifier.ts` and route provider/channel/agent callers through it.

Initial policy:

- `provider_auth_changed` -> `secrets_reload`
- `provider_model_changed` -> `none` or `reload`
- `provider_default_changed` -> `none` or `reload`
- `agent_model_changed` -> `none` or `reload`
- `channel_config_changed` -> `none` or `reload`
- `gateway_server_changed` -> `restart`
- `plugin_registry_changed` -> `restart`

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/unit/gateway-refresh-classifier.test.ts tests/unit/provider-runtime-sync.test.ts tests/unit/channels-routes.test.ts --project node`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/gateway/refresh-classifier.ts tests/unit/gateway-refresh-classifier.test.ts tests/unit/provider-runtime-sync.test.ts tests/unit/channels-routes.test.ts
git commit -m "feat: classify gateway refresh actions explicitly"
```

### Task 2: Align route and IPC callers with the classifier

**Files:**
- Modify: `electron/api/routes/channels.ts`
- Modify: `electron/api/routes/agents.ts`
- Modify: `electron/api/routes/settings.ts`
- Modify: `electron/main/ipc-handlers.ts`

- [ ] **Step 1: Write the failing test**

Add or extend tests that prove legacy IPC and HTTP routes no longer call `debouncedRestart()` for hot-safe provider/model/channel changes.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/unit/channels-routes.test.ts tests/unit/openclaw-agents-route.test.ts tests/unit/settings-gateway-port-route.test.ts --project node`
Expected: FAIL because hot-safe flows still use restart-oriented helpers in some code paths.

- [ ] **Step 3: Write minimal implementation**

Replace duplicated scheduling logic with one classifier-driven helper shared by route and IPC entry points. Preserve the special full-restart deletion behavior for agent deletion and gateway-port changes.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/unit/channels-routes.test.ts tests/unit/openclaw-agents-route.test.ts tests/unit/settings-gateway-port-route.test.ts --project node`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/api/routes/channels.ts electron/api/routes/agents.ts electron/api/routes/settings.ts electron/main/ipc-handlers.ts tests/unit/channels-routes.test.ts tests/unit/openclaw-agents-route.test.ts tests/unit/settings-gateway-port-route.test.ts
git commit -m "refactor: route gateway refresh through shared lifecycle policy"
```

## Chunk 2: Secret Reload and Restart De-Duplication

### Task 3: Drive auth-only changes through secret reload

**Files:**
- Modify: `electron/services/providers/provider-runtime-sync.ts`
- Modify: `electron/gateway/manager.ts`
- Modify: `tests/unit/provider-runtime-sync.test.ts`

- [ ] **Step 1: Write the failing test**

Add tests that assert auth-only provider changes request a secret-reload path and do not call restart/reconnect scheduling.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/unit/provider-runtime-sync.test.ts --project node`
Expected: FAIL because provider runtime sync currently goes through reload/restart-oriented scheduling.

- [ ] **Step 3: Write minimal implementation**

Implement a gateway-manager entry point for auth refresh that prefers `secrets.reload` and falls back only when the classifier says the mutation is restart-required.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/unit/provider-runtime-sync.test.ts --project node`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/services/providers/provider-runtime-sync.ts electron/gateway/manager.ts tests/unit/provider-runtime-sync.test.ts
git commit -m "feat: use secret reload for auth-only gateway changes"
```

### Task 4: Prevent duplicate KTClaw restart after upstream restart

**Files:**
- Modify: `electron/gateway/manager.ts`
- Modify: `electron/gateway/restart-controller.ts`
- Modify: `tests/unit/gateway-startup-hardening.test.ts`

- [ ] **Step 1: Write the failing test**

Add tests for:

- upstream restart close reason does not trigger a second KTClaw-owned deferred restart
- a hot-safe change that escalates to one upstream restart still results in exactly one lifecycle action

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/unit/gateway-startup-hardening.test.ts --project node`
Expected: FAIL because deferred restart logic still executes after the upstream restart path already fired.

- [ ] **Step 3: Write minimal implementation**

Track restart intent and upstream-restart completion in `GatewayManager`, then suppress duplicate deferred restart execution in `GatewayRestartController`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/unit/gateway-startup-hardening.test.ts --project node`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/gateway/manager.ts electron/gateway/restart-controller.ts tests/unit/gateway-startup-hardening.test.ts
git commit -m "fix: suppress duplicate gateway restart churn"
```

## Chunk 3: Startup Critical Path

### Task 5: Add startup diagnostics and one-time optional warmups

**Files:**
- Create: `electron/gateway/startup-diagnostics.ts`
- Create: `tests/unit/gateway-startup-diagnostics.test.ts`
- Modify: `electron/gateway/manager.ts`
- Modify: `electron/gateway/startup-orchestrator.ts`
- Modify: `electron/gateway/supervisor.ts`

- [ ] **Step 1: Write the failing test**

Add tests that assert:

- startup phases are recorded with duration and outcome
- optional warmups run once per app session, not once per reconnect
- startup status includes last phase and last failure summary

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/unit/gateway-startup-diagnostics.test.ts tests/unit/gateway-startup-hardening.test.ts tests/unit/gateway-supervisor-stability.test.ts --project node`
Expected: FAIL because phase diagnostics and one-shot warmup logic do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create a startup diagnostics recorder and wire named phases such as:

- `sync-config`
- `find-existing`
- `wait-port`
- `spawn`
- `wait-ready`
- `connect`

Move Python warmup behind a per-session guard.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/unit/gateway-startup-diagnostics.test.ts tests/unit/gateway-startup-hardening.test.ts tests/unit/gateway-supervisor-stability.test.ts --project node`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/gateway/startup-diagnostics.ts tests/unit/gateway-startup-diagnostics.test.ts electron/gateway/manager.ts electron/gateway/startup-orchestrator.ts electron/gateway/supervisor.ts tests/unit/gateway-startup-hardening.test.ts tests/unit/gateway-supervisor-stability.test.ts
git commit -m "feat: add gateway startup diagnostics and bounded warmups"
```

### Task 6: Move non-critical work off the boot-critical path

**Files:**
- Modify: `electron/gateway/config-sync.ts`
- Modify: `electron/main/index.ts`
- Modify if needed: `electron/utils/skill-config.ts`

- [ ] **Step 1: Write the failing test**

Add or extend startup tests to assert that non-critical work does not block the gateway-ready path.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/unit/gateway-startup-hardening.test.ts --project node`
Expected: FAIL because optional sync and warmup work is still intertwined with startup.

- [ ] **Step 3: Write minimal implementation**

Split prelaunch work into:

- critical sync required for boot
- optional post-start tasks such as context merge retries and skill-install side effects

Do not move anything that would make gateway token / config invalid at start time.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/unit/gateway-startup-hardening.test.ts --project node`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/gateway/config-sync.ts electron/main/index.ts electron/utils/skill-config.ts tests/unit/gateway-startup-hardening.test.ts
git commit -m "perf: trim non-critical work from gateway startup path"
```

## Chunk 4: Plugin Discovery Guard

### Task 7: Lock explicit plugin gating for channel-owned extensions

**Files:**
- Modify: `electron/utils/openclaw-auth.ts`
- Modify: `electron/utils/channel-config.ts`
- Modify: `electron/gateway/config-sync.ts`
- Create or modify: `tests/unit/openclaw-auth.test.ts`
- Create or modify: `tests/unit/channel-config.test.ts`

- [ ] **Step 1: Write the failing test**

Add tests that assert:

- unconfigured Feishu and WeChat extensions are marked disabled before startup
- configured channel plugins remain enabled
- KTClaw does not wipe unrelated user-managed plugins

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/unit/openclaw-auth.test.ts tests/unit/channel-config.test.ts --project node`
Expected: FAIL because plugin gating currently depends too heavily on discovered extension state and empty allowlists.

- [ ] **Step 3: Write minimal implementation**

Enforce explicit `plugins.entries.<id>.enabled` state for KTClaw-managed channel plugins and keep that state aligned with configured channels during prelaunch sync.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/unit/openclaw-auth.test.ts tests/unit/channel-config.test.ts --project node`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/utils/openclaw-auth.ts electron/utils/channel-config.ts electron/gateway/config-sync.ts tests/unit/openclaw-auth.test.ts tests/unit/channel-config.test.ts
git commit -m "fix: gate unmanaged channel plugins out of gateway startup"
```

## Chunk 5: Auth Drift and Diagnostics

### Task 8: Surface token mismatch as structured diagnostics

**Files:**
- Modify: `electron/gateway/startup-stderr.ts`
- Modify: `electron/gateway/manager.ts`
- Modify: `src/stores/gateway.ts`
- Modify: `tests/unit/gateway-startup-recovery.test.ts`
- Modify or create: `tests/unit/gateway-startup-diagnostics.test.ts`

- [ ] **Step 1: Write the failing test**

Add tests that assert:

- `token_mismatch` is preserved as a structured auth failure
- gateway status exposes the last auth/connect error code
- renderer store captures that diagnostic instead of only a generic error string

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/unit/gateway-startup-recovery.test.ts tests/unit/gateway-startup-diagnostics.test.ts tests/unit/stores.test.ts --project node`
Expected: FAIL because token mismatch is still treated as dropped stderr noise and not surfaced structurally.

- [ ] **Step 3: Write minimal implementation**

Stop dropping token mismatch lines, normalize them into a stable diagnostic code, and publish the result through gateway status and host events.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/unit/gateway-startup-recovery.test.ts tests/unit/gateway-startup-diagnostics.test.ts tests/unit/stores.test.ts --project node`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/gateway/startup-stderr.ts electron/gateway/manager.ts src/stores/gateway.ts tests/unit/gateway-startup-recovery.test.ts tests/unit/gateway-startup-diagnostics.test.ts tests/unit/stores.test.ts
git commit -m "feat: expose gateway auth drift diagnostics"
```

### Task 9: Add bounded self-repair for KTClaw-managed token drift

**Files:**
- Modify: `electron/gateway/manager.ts`
- Modify: `electron/utils/openclaw-auth.ts`
- Modify: `tests/unit/gateway-supervisor-stability.test.ts`
- Modify or create: `tests/unit/gateway-auth-repair.test.ts`

- [ ] **Step 1: Write the failing test**

Add tests that assert a managed local gateway with token drift:

- re-syncs KTClaw token into OpenClaw config once
- attempts one bounded reconnect or restart
- does not enter an infinite retry loop

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/unit/gateway-supervisor-stability.test.ts tests/unit/gateway-auth-repair.test.ts --project node`
Expected: FAIL because no bounded repair path exists yet.

- [ ] **Step 3: Write minimal implementation**

Add a one-shot token-repair path for locally managed gateway instances only. Keep the retry bounded and observable.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/unit/gateway-supervisor-stability.test.ts tests/unit/gateway-auth-repair.test.ts --project node`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/gateway/manager.ts electron/utils/openclaw-auth.ts tests/unit/gateway-supervisor-stability.test.ts tests/unit/gateway-auth-repair.test.ts
git commit -m "fix: repair managed gateway token drift once"
```

## Chunk 6: Verification and Docs

### Task 10: Run regression, comms, and documentation sync

**Files:**
- Modify if needed: `README.md`
- Modify if needed: `README.zh-CN.md`
- Modify if needed: `README.ja-JP.md`

- [ ] **Step 1: Run focused unit suites**

Run:

```bash
pnpm exec vitest run tests/unit/gateway-refresh-classifier.test.ts tests/unit/provider-runtime-sync.test.ts tests/unit/channels-routes.test.ts tests/unit/gateway-startup-hardening.test.ts tests/unit/gateway-startup-diagnostics.test.ts tests/unit/gateway-supervisor-stability.test.ts tests/unit/openclaw-auth.test.ts tests/unit/channel-config.test.ts --project node
```

Expected: PASS

- [ ] **Step 2: Run broader app validation**

Run:

```bash
pnpm run typecheck
pnpm run lint
pnpm test
```

Expected: PASS

- [ ] **Step 3: Run comms regression checks**

Run:

```bash
pnpm run comms:replay
pnpm run comms:compare
```

Expected: PASS with no unexplained gateway reconnect regression.

- [ ] **Step 4: Review docs for lifecycle behavior changes**

Update README files if user-visible gateway startup, recovery, or diagnostics behavior changed.

- [ ] **Step 5: Commit**

```bash
git add README.md README.zh-CN.md README.ja-JP.md
git commit -m "docs: update gateway lifecycle and diagnostics behavior"
```
