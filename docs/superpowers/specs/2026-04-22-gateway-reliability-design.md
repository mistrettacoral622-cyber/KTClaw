# Gateway Reliability and Lifecycle Design

Date: 2026-04-22
Status: Draft approved in conversation, awaiting written-spec review

## Context

KTClaw runs OpenClaw Gateway inside an Electron-managed utility process and treats it as the product's local control plane for chat, runtime RPC, channels, provider access, browser tooling, and diagnostics.

The current integration already contains substantial hardening in:

- `electron/gateway/manager.ts`
- `electron/gateway/startup-orchestrator.ts`
- `electron/gateway/supervisor.ts`
- `electron/services/providers/provider-runtime-sync.ts`
- `electron/utils/openclaw-auth.ts`

Even so, users still report four broad classes of failure:

- gateway startup feels slow or inconsistent
- switching model/provider can stop the gateway
- some boots take a very long time before the app becomes usable
- gateway occasionally fails to connect or reconnect

This design treats those as one lifecycle problem, not four unrelated bugs.

## Evidence

Local investigation produced concrete evidence rather than symptom-level guesses:

1. KTClaw startup logs show a real slow-start case on 2026-04-21 where `Gateway start requested` was logged at `07:36:42` and `Gateway auto-start succeeded` only appeared at `07:37:58`, roughly 76 seconds later.
2. During provider save / model switch flows, KTClaw logs show OpenClaw itself emitting `service restart`, while KTClaw simultaneously enters reconnect and deferred restart paths. That creates duplicate lifecycle churn.
3. OpenClaw documentation states that most config classes hot-apply without downtime, and only `gateway.*`, `plugins`, `discovery`, and similar server infrastructure changes require restart.
4. OpenClaw logs show that `OPENCLAW_SKIP_CHANNELS=1` skips channel start, but external plugins under `~/.openclaw/extensions` can still be discovered and loaded when `plugins.allow` is empty.
5. Existing KTClaw stderr classification intentionally drops `token_mismatch` lines, which hides one of the most important real connection-failure causes.
6. This machine has exhibited token drift between KTClaw settings, `~/.openclaw/openclaw.json`, and the running gateway command line, which is enough to explain intermittent `AUTH_TOKEN_MISMATCH` failures.

## Problem

The gateway integration is currently mixing together five concerns that need different lifecycle behavior:

1. config file writes
2. secret activation
3. gateway server process lifecycle
4. plugin discovery / extension loading
5. connection diagnostics / auth recovery

The product currently overuses restart as the default recovery tool, especially on Windows where `reload()` falls back to restart. That conflicts with OpenClaw's documented hot-apply model for agents, models, channels, tools, and many runtime settings.

The result is:

- benign model/provider changes cause visible downtime
- startup success can be followed immediately by a second restart
- unmanaged external plugins can still consume startup time even when channels are skipped
- auth drift is not surfaced clearly enough to self-heal
- logs show symptoms, but not a stable "why this restart happened" explanation

## Goal

Make KTClaw's gateway lifecycle deterministic, fast, and diagnosable:

- provider, model, agent, and channel edits should avoid process restart unless strictly required
- startup should have a bounded, explainable critical path
- unmanaged extension discovery should not inflate startup when the related channel is not configured
- token drift and auth mismatch should surface as first-class diagnostics
- reconnect behavior should stop stacking on top of upstream restart behavior

## Non-Goals

- no rewrite of OpenClaw itself
- no replacement of Electron `utilityProcess` with a different host model
- no attempt to remove all restarts forever; some changes legitimately require restart
- no redesign of the renderer transport policy (`WS -> HTTP -> IPC fallback`)
- no broad settings-center redesign beyond gateway-specific diagnostics surfaces

## Recommended Approach

Keep the current KTClaw `GatewayManager` architecture, but replace the current "restart-first" integration with an explicit lifecycle policy:

- classify changes before applying them
- use secret reload for secret changes
- rely on OpenClaw hot-apply for hot-safe config classes
- reserve restart for server/plugin/infrastructure changes only
- block unmanaged plugin discovery from dominating cold start
- surface token drift and auth mismatch as real status, not stderr noise

This is the least invasive path that still solves the actual failure modes seen in logs.

## Technical Design

### 1. Lifecycle classification

Introduce an explicit refresh classifier owned by KTClaw.

Suggested internal outcomes:

- `none`
- `secrets_reload`
- `reload`
- `restart`

Rules:

- `agents.*`, `models.*`, `routing`, provider-default changes, provider model changes, and channel config changes should not directly trigger restart.
- provider credential changes should go through secret activation, not process restart.
- `gateway.*`, plugin allowlist changes, extension-install changes, `discovery`, and similar infrastructure mutations remain restart-required.

This classifier becomes the only legal gateway-refresh entry point for:

- provider account routes
- agent routes
- channel routes
- settings routes
- any legacy IPC handlers that still schedule gateway lifecycle work

### 2. Secret activation path

KTClaw currently writes provider auth and gateway token material into OpenClaw-owned files, but does not have a distinct lifecycle for "config changed" versus "secret snapshot changed".

New rule:

- if a change only affects auth material, prefer OpenClaw `secrets.reload`
- only restart when the changed field belongs to a restart-required server category

This aligns KTClaw with the documented OpenClaw activation model:

- startup activation
- config reload hot-apply path
- explicit `secrets.reload`

Expected impact:

- model switch stops bouncing the process
- provider save stops killing in-flight gateway availability

### 3. Startup critical path hardening

Startup should be split into:

- critical prelaunch sync
- optional warmups
- post-start housekeeping

Critical:

- load configured port
- sync the gateway token into OpenClaw config
- apply only config sanitation needed for successful gateway boot

Optional or post-start:

- Python environment warmup
- skill installation
- bootstrap file merge retries
- non-essential plugin migration cleanup

Specific hardening:

- `warmupManagedPythonReadiness()` should run at most once per app session, not once per reconnect/start attempt
- every startup phase should record start time, finish time, and failure reason
- KTClaw should persist the last startup timeline for diagnostics
- startup must not report success and immediately schedule a second KTClaw-owned restart unless the classifier says the post-start mutation is truly restart-required

### 4. Plugin discovery guard

`OPENCLAW_SKIP_CHANNELS=1` is not enough when external plugins remain discoverable under `~/.openclaw/extensions`.

KTClaw should actively constrain plugin activation for channel plugins:

- build an explicit desired plugin set from configured channels and explicitly enabled plugin-backed features
- write `plugins.entries.<id>.enabled` consistently for known channel plugins
- disable or clean up unmanaged channel-plugin entries when the related channel is not configured
- preserve user-installed unrelated plugins that KTClaw does not own

The product should not let stale Feishu/WeChat extension directories dominate startup when those channels are not in active use.

### 5. Token drift detection and recovery

KTClaw needs one diagnostic view of gateway auth state, not three silent sources of truth.

Before or during connect:

- compare KTClaw settings token
- compare `~/.openclaw/openclaw.json` gateway auth token
- capture the running managed process launch token summary where available

When mismatch is detected:

- expose a structured status reason
- stop dropping `token_mismatch` stderr
- attempt one bounded self-repair path for KTClaw-managed local gateway instances:
  - re-sync token to OpenClaw config
  - reconnect if possible
  - if drift persists, restart once with the repaired token state

This must be visible in diagnostics, not hidden in log noise.

### 6. Restart and reconnect de-duplication

OpenClaw can already restart itself for restart-required config changes. KTClaw must stop adding an overlapping reconnect/restart cycle on top of that.

Required behavior:

- recognize upstream restart close reasons as intentional lifecycle transitions
- suppress KTClaw-owned deferred restart if the upstream restart already covers the requested change
- avoid double restart loops when a hot-safe change unexpectedly escalates to one upstream restart

The integration target is "one lifecycle action per change", not "one from OpenClaw plus one from KTClaw".

### 7. Diagnostics surface

Gateway diagnostics should answer:

- why is the gateway not connected
- what was the last startup phase and how long did it take
- what triggered the last restart
- did auth fail because of token mismatch, pairing, wrong URL, or upstream process exit
- are external plugins being discovered and loaded unexpectedly

Renderer-facing gateway status should include enough structured detail for Settings > Advanced / Developer and future health panels.

At minimum KTClaw should preserve:

- last startup timeline
- last managed restart reason
- last auth/connect failure code
- plugin-discovery summary

## Files Likely Affected

- `electron/gateway/manager.ts`
- `electron/gateway/startup-orchestrator.ts`
- `electron/gateway/restart-controller.ts`
- `electron/gateway/startup-stderr.ts`
- `electron/gateway/config-sync.ts`
- `electron/gateway/supervisor.ts`
- `electron/services/providers/provider-runtime-sync.ts`
- `electron/api/routes/channels.ts`
- `electron/api/routes/agents.ts`
- `electron/api/routes/settings.ts`
- `electron/main/ipc-handlers.ts`
- `electron/utils/openclaw-auth.ts`
- `electron/utils/channel-config.ts`
- `src/stores/gateway.ts`
- targeted gateway/provider/channel unit tests

## Testing Strategy

The implementation must be test-first and cover:

- lifecycle classification for each mutation class
- provider/model switch does not schedule restart
- auth-only changes use secret reload path
- Windows reload path does not degrade hot-safe changes into restart
- startup records phase durations and avoids repeated optional warmups
- stale external channel plugins do not load when not configured
- token mismatch is surfaced as structured diagnostics
- deferred restart is suppressed when upstream restart already covers the change

Regression commands must include:

- focused Vitest node/jsdom suites for gateway, provider runtime sync, and channel routes
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run comms:replay`
- `pnpm run comms:compare`

## Risks

- OpenClaw may still escalate some nominally hot-safe changes into restart for internal reasons; KTClaw must observe and adapt rather than assume perfect hot-apply.
- Plugin ownership boundaries are delicate because users may place their own extensions under `~/.openclaw/extensions`.
- Token auto-repair must stay bounded to avoid self-made reconnect loops.

## Decision

Proceed with the lifecycle-policy rewrite using the existing `GatewayManager` foundation, not a full gateway-host rewrite.
