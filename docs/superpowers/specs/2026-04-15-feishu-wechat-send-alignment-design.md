# Feishu WeChat Send Alignment Design

**Date:** 2026-04-15

**Goal**

Make Feishu message sending follow the same product model as WeChat: one outbound path, one visible sender identity, and no user-facing `self` / `bot` switching.

**Decision**

Feishu will no longer be treated as a special multi-identity channel in KTClaw. The workbench send flow should behave like WeChat:

- Renderer does not expose a sender identity choice for Feishu.
- Host routes do not branch on `identity: self`.
- Feishu workbench sends resolve a conversation binding and send through the runtime session path.
- Existing Feishu personal-authorization code may remain for onboarding or future internal capability, but it must not participate in the main message-send path.

**Why**

- The current dual-path Feishu flow adds routing ambiguity and makes failures harder to reason about.
- The user does not want a self/bot identity model.
- WeChat already proves that a single-path channel model is sufficient for this product.
- Aligning both channels reduces maintenance cost and debugging time.

**Architecture**

The authoritative outbound route for Feishu becomes:

1. Workbench/UI issues a send request without identity switching semantics.
2. Host resolves the Feishu conversation binding to a scoped session key.
3. Host sends through `ctx.gatewayManager.rpc('chat.send', ...)`.
4. Workbench reads history back from the same scoped session/runtime path.

Any direct plugin send helper remains non-authoritative and should not be used as the default workbench send path.

**Scope**

In scope:

- Remove Feishu workbench dependence on `identity: self` / `identity: bot`.
- Align Feishu send routing with WeChat runtime send behavior.
- Keep or add regression tests covering the new single-path behavior.

Out of scope:

- Reworking Feishu onboarding/auth UX.
- Removing every low-level Feishu helper from the codebase.
- Broad channel-architecture refactors outside the send path.

**Files Expected To Change**

- `electron/api/routes/channels.ts`
- `tests/unit/channel-sync-routes.test.ts`
- Possibly small supporting tests/helpers if the current send-path tests are too Feishu-specific

**Success Criteria**

- Sending a Feishu workbench message no longer branches on `self` vs `bot`.
- Feishu sends use the bound runtime session key the same way WeChat does.
- Existing Feishu integration tests still pass.
- A user sending a message from Feishu gets a reply through the single runtime path after restart.
