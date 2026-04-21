# Local Embeddings Runtime On-Demand Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `node-llama-cpp` from the default KTClaw package and replace it with an on-demand CPU runtime install flow for local embeddings.

**Architecture:** Keep OpenClaw bundled, but stop shipping `node-llama-cpp` runtime assets in the default desktop package. Add a main-process runtime manager plus structured error mapping so Memory operations can prompt the user to install the runtime only when the local embeddings path is actually needed.

**Tech Stack:** Electron main/IPC, Host API routes, React settings UI, Vitest, packaging scripts (`zx`, `electron-builder`)

---

## File Map

- Create: `electron/services/local-embeddings-runtime-manager.ts`
  Owns runtime manifest loading, platform resolution, install status, download/install/remove logic, and progress reporting.
- Create: `resources/runtime-manifests/local-embeddings.json`
  Pins exact runtime versions, URLs, sizes, checksums, and per-platform CPU targets.
- Create: `tests/unit/local-embeddings-runtime-manager.test.ts`
  Covers manifest parsing, status transitions, install failures, and checksum handling.
- Modify: `scripts/bundle-openclaw.mjs`
  Stop bundling `node-llama-cpp` by default and keep script-level regression coverage.
- Modify: `scripts/after-pack.cjs`
  Ensure after-pack logic does not restore removed runtime payloads into packaged resources.
- Modify: `tests/unit/openclaw-bundle-script.test.ts`
  Lock the new packaging contract.
- Modify: `electron/main/ipc-handlers.ts`
  Expose install/status/remove IPC calls and progress events for the renderer.
- Modify: `electron/api/routes/memory.ts`
  Detect/install-required local embeddings failures and return structured responses instead of raw errors.
- Modify: `src/components/settings-center/settings-memory-strategy.tsx`
  Add a Local Embeddings Runtime settings card plus install/reinstall/remove actions.
- Create or modify: `src/lib/local-embeddings-runtime.ts`
  Renderer-side API helpers and response typing for runtime status/install flow.
- Create or modify: `src/components/settings-center/local-embeddings-runtime-card.tsx`
  Focused UI surface for install status and actions if `settings-memory-strategy.tsx` would become too crowded.
- Create or modify: `tests/unit/settings-memory-strategy.test.tsx`
  Covers settings UI status rendering and button behavior.
- Create or modify: `tests/unit/memory-routes-runtime-required.test.ts`
  Covers structured install-required response mapping for memory actions.

## Chunk 1: Packaging Contract

### Task 1: Lock the bundle contract in tests

**Files:**
- Modify: `tests/unit/openclaw-bundle-script.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test that asserts `scripts/bundle-openclaw.mjs` no longer keeps `@node-llama-cpp` runtime payloads in the default bundle.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/openclaw-bundle-script.test.ts`
Expected: FAIL because the script still references bundled `node-llama-cpp` payload.

- [ ] **Step 3: Write minimal implementation**

Update `scripts/bundle-openclaw.mjs` so default bundle cleanup removes:

- `node_modules/@node-llama-cpp`
- `node_modules/node-llama-cpp`

Keep the rest of OpenClaw intact.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/openclaw-bundle-script.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/unit/openclaw-bundle-script.test.ts scripts/bundle-openclaw.mjs
git commit -m "build: stop bundling local embeddings runtime by default"
```

### Task 2: Ensure after-pack does not reintroduce the removed runtime

**Files:**
- Modify: `scripts/after-pack.cjs`

- [ ] **Step 1: Write the failing test**

If coverage is not already implicit, add a script-level assertion that after-pack cleanup logic treats `@node-llama-cpp` as optional and never assumes it exists.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/openclaw-bundle-script.test.ts`
Expected: FAIL if after-pack assumptions are too strict.

- [ ] **Step 3: Write minimal implementation**

Guard the after-pack `cleanupNodeLlamaCpp` path so packaging still succeeds when the runtime directory is absent.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/openclaw-bundle-script.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/after-pack.cjs tests/unit/openclaw-bundle-script.test.ts
git commit -m "build: tolerate absent local embeddings runtime in after-pack"
```

## Chunk 2: Runtime Manager

### Task 3: Add the runtime manifest and loader

**Files:**
- Create: `resources/runtime-manifests/local-embeddings.json`
- Create: `electron/services/local-embeddings-runtime-manager.ts`
- Test: `tests/unit/local-embeddings-runtime-manager.test.ts`

- [ ] **Step 1: Write the failing test**

Add tests that:

- load the manifest
- resolve the current platform/arch target
- return `not_installed` when no runtime exists

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/local-embeddings-runtime-manager.test.ts`
Expected: FAIL because the manager does not exist yet

- [ ] **Step 3: Write minimal implementation**

Implement:

- manifest parsing
- target resolution
- install root resolution under `app.getPath('userData')/runtimes/node-llama-cpp/...`
- `getStatus()`

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/local-embeddings-runtime-manager.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add resources/runtime-manifests/local-embeddings.json electron/services/local-embeddings-runtime-manager.ts tests/unit/local-embeddings-runtime-manager.test.ts
git commit -m "feat: add local embeddings runtime manager skeleton"
```

### Task 4: Implement download, checksum, and cleanup behavior

**Files:**
- Modify: `electron/services/local-embeddings-runtime-manager.ts`
- Modify: `tests/unit/local-embeddings-runtime-manager.test.ts`

- [ ] **Step 1: Write the failing test**

Add tests for:

- successful install flow
- checksum mismatch cleanup
- remove/reinstall paths
- version mismatch status

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/local-embeddings-runtime-manager.test.ts`
Expected: FAIL on unimplemented install/remove paths

- [ ] **Step 3: Write minimal implementation**

Implement:

- archive download to temp file
- SHA256 validation
- unpack into final path
- atomic activation
- cleanup on failure
- remove/reinstall support

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/local-embeddings-runtime-manager.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/services/local-embeddings-runtime-manager.ts tests/unit/local-embeddings-runtime-manager.test.ts
git commit -m "feat: support install lifecycle for local embeddings runtime"
```

## Chunk 3: Main Process and Memory Route Integration

### Task 5: Expose runtime status/install/remove to renderer

**Files:**
- Modify: `electron/main/ipc-handlers.ts`
- Create or modify: `src/lib/local-embeddings-runtime.ts`
- Test: `tests/unit/local-embeddings-runtime-ipc.test.ts`

- [ ] **Step 1: Write the failing test**

Add tests that assert IPC handlers expose:

- `localEmbeddingsRuntime:getStatus`
- `localEmbeddingsRuntime:install`
- `localEmbeddingsRuntime:remove`

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/local-embeddings-runtime-ipc.test.ts`
Expected: FAIL because handlers do not exist

- [ ] **Step 3: Write minimal implementation**

Register IPC handlers and a small renderer helper module that wraps them.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/local-embeddings-runtime-ipc.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/main/ipc-handlers.ts src/lib/local-embeddings-runtime.ts tests/unit/local-embeddings-runtime-ipc.test.ts
git commit -m "feat: expose local embeddings runtime management over ipc"
```

### Task 6: Map missing-runtime failures in memory routes

**Files:**
- Modify: `electron/api/routes/memory.ts`
- Create or modify: `tests/unit/memory-routes-runtime-required.test.ts`

- [ ] **Step 1: Write the failing test**

Add tests that assert memory routes return a structured install-required payload when local embeddings runtime is missing.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/memory-routes-runtime-required.test.ts`
Expected: FAIL because routes currently return raw error strings

- [ ] **Step 3: Write minimal implementation**

Update memory route execution to:

- detect `node-llama-cpp` missing / local embeddings unavailable errors
- return stable structured payload with code `LOCAL_EMBEDDINGS_RUNTIME_REQUIRED`
- include status metadata needed by the UI

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/memory-routes-runtime-required.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/api/routes/memory.ts tests/unit/memory-routes-runtime-required.test.ts
git commit -m "feat: return install-required errors for local embeddings runtime"
```

### Task 7: Retry memory reindex after successful install

**Files:**
- Modify: `electron/api/routes/memory.ts`
- Modify: `tests/unit/memory-routes-runtime-required.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test for:

- install succeeds
- `memory reindex` is retried once
- route returns success

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/memory-routes-runtime-required.test.ts`
Expected: FAIL because retry flow is absent

- [ ] **Step 3: Write minimal implementation**

Integrate runtime manager install flow and single safe retry for `memory reindex`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/memory-routes-runtime-required.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/api/routes/memory.ts tests/unit/memory-routes-runtime-required.test.ts
git commit -m "feat: retry memory reindex after runtime install"
```

## Chunk 4: Settings UI and Prompt Flow

### Task 8: Add a settings runtime management card

**Files:**
- Modify: `src/components/settings-center/settings-memory-strategy.tsx`
- Optionally create: `src/components/settings-center/local-embeddings-runtime-card.tsx`
- Modify or create: `tests/unit/settings-memory-strategy.test.tsx`

- [ ] **Step 1: Write the failing test**

Add tests for:

- runtime status rendering
- install button state
- reinstall/remove actions

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/settings-memory-strategy.test.tsx`
Expected: FAIL because UI card does not exist

- [ ] **Step 3: Write minimal implementation**

Add a focused status card that uses the renderer helper:

- show status
- show progress
- provide install/reinstall/remove buttons

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/settings-memory-strategy.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/settings-center/settings-memory-strategy.tsx src/components/settings-center/local-embeddings-runtime-card.tsx tests/unit/settings-memory-strategy.test.tsx
git commit -m "feat: add local embeddings runtime settings panel"
```

### Task 9: Add install-required prompt handling for memory actions

**Files:**
- Modify: `src/components/settings-center/settings-memory-strategy.tsx`
- Modify or create: `tests/unit/settings-memory-strategy.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a UI test that:

- simulates `LOCAL_EMBEDDINGS_RUNTIME_REQUIRED`
- shows the install prompt
- starts installation when user confirms

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/unit/settings-memory-strategy.test.tsx`
Expected: FAIL because prompt flow is missing

- [ ] **Step 3: Write minimal implementation**

On memory action failure:

- detect the structured install-required response
- open confirmation dialog
- run install flow
- retry or signal retry-ready

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/unit/settings-memory-strategy.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/settings-center/settings-memory-strategy.tsx tests/unit/settings-memory-strategy.test.tsx
git commit -m "feat: prompt to install local embeddings runtime on demand"
```

## Chunk 5: Final Verification and Documentation

### Task 10: Update docs and verify end-to-end behavior

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify any settings/help copy that mentions memory/vector behavior

- [ ] **Step 1: Add doc expectations**

Document:

- default package no longer includes local embeddings runtime
- runtime is installed on demand
- Ollama is unaffected

- [ ] **Step 2: Run targeted verification**

Run:

```bash
pnpm test tests/unit/openclaw-bundle-script.test.ts tests/unit/local-embeddings-runtime-manager.test.ts tests/unit/local-embeddings-runtime-ipc.test.ts tests/unit/memory-routes-runtime-required.test.ts tests/unit/settings-memory-strategy.test.tsx
```

Expected: PASS

- [ ] **Step 3: Run broad verification**

Run:

```bash
pnpm run typecheck
pnpm test
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add README.md README.zh-CN.md
git add electron/services/local-embeddings-runtime-manager.ts electron/main/ipc-handlers.ts electron/api/routes/memory.ts
git add src/components/settings-center/settings-memory-strategy.tsx src/components/settings-center/local-embeddings-runtime-card.tsx src/lib/local-embeddings-runtime.ts
git add resources/runtime-manifests/local-embeddings.json
git add tests/unit/openclaw-bundle-script.test.ts tests/unit/local-embeddings-runtime-manager.test.ts tests/unit/local-embeddings-runtime-ipc.test.ts tests/unit/memory-routes-runtime-required.test.ts tests/unit/settings-memory-strategy.test.tsx
git commit -m "feat: install local embeddings runtime on demand"
```
