# Phase 04 Final Closeout Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the Team Map Phase 04 closeout by fixing the remaining route/copy drift, re-verifying the focused behavior, running the real app flow, and syncing `.planning`.

**Architecture:** Keep the existing Team Map implementation as the source of truth. Patch only bounded user-facing inconsistencies, prove behavior with focused tests, then run a real UI pass and backfill the missing closeout artifacts.

**Tech Stack:** React 19, Vite, Vitest, Electron renderer stores, i18next, Playwright/manual UI verification, GSD planning artifacts

---

## Chunk 1: Closeout Implementation

### Task 1: Fix remaining Team Map entry drift

**Files:**
- Modify: `src/components/search/GlobalSearchModal.tsx`
- Test: `tests/unit/global-search-modal.test.tsx`

- [ ] **Step 1: Write the failing test**

Add or tighten a test that proves the Team Map global-search result does not send the user to the stale `/team-map` alias.

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm test -- tests/unit/global-search-modal.test.tsx
```

Expected: a failure showing the old Team Map search entry still points at the wrong path.

- [ ] **Step 3: Write the minimal implementation**

Update the static Team Map search entry so it routes to the truthful recovery surface for Phase 04 instead of the stale global alias.

- [ ] **Step 4: Re-run the test to verify it passes**

Run:

```bash
pnpm test -- tests/unit/global-search-modal.test.tsx
```

Expected: PASS.

### Task 2: Finish Team Map i18n closeout

**Files:**
- Modify: `tests/unit/member-activity-tab.test.tsx`
- Modify: `tests/unit/member-detail-sheet.test.tsx`
- Modify: `tests/unit/session-item.test.tsx`
- Modify: `src/components/team-map/MemberActivityTab.tsx`
- Modify: `src/components/team-map/MemberDetailSheet.tsx`
- Modify: `src/components/sessions/SessionItem.tsx`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/zh/common.json`

- [ ] **Step 1: Write the failing tests**

Add or tighten tests around:

- Team Map activity labels
- Team Map member-detail actions and labels
- leader private-chat badge text

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
pnpm test -- tests/unit/member-activity-tab.test.tsx tests/unit/member-detail-sheet.test.tsx tests/unit/session-item.test.tsx
```

Expected: failures showing the remaining hardcoded copy or missing translation-backed labels.

- [ ] **Step 3: Write the minimal implementation**

Replace remaining Team Map hardcoded copy with `teamMap` / `sidebar` / `actions` locale keys where appropriate, adding only the keys actually needed by the closeout.

- [ ] **Step 4: Re-run the tests to verify they pass**

Run:

```bash
pnpm test -- tests/unit/member-activity-tab.test.tsx tests/unit/member-detail-sheet.test.tsx tests/unit/session-item.test.tsx
```

Expected: PASS.

### Task 3: Run the focused Phase 04 regression suite

**Files:**
- Verify only

- [ ] **Step 1: Run the focused suite**

Run:

```bash
pnpm test -- tests/unit/team-map-page.test.tsx tests/unit/team-map-selectors.test.ts tests/unit/add-member-sheet.test.tsx tests/unit/member-detail-sheet.test.tsx tests/unit/member-memory-tab.test.tsx tests/unit/member-skills-tab.test.tsx tests/unit/member-activity-tab.test.tsx tests/unit/chat-private-session.test.ts tests/unit/session-item.test.tsx tests/unit/global-search-modal.test.tsx
```

Expected: all targeted Team Map / private-session / entry-flow tests pass.

- [ ] **Step 2: Record any failures honestly**

If a non-closeout regression appears, stop and surface it before claiming Phase 04 is closed.

## Chunk 2: Real Validation And Planning Sync

### Task 4: Run the real app closeout validation

**Files:**
- Verify only

- [ ] **Step 1: Launch the app**

Run:

```bash
pnpm dev
```

Wait until the renderer is available and the Electron shell is stable enough for UI interaction.

- [ ] **Step 2: Execute the manual checklist**

Validate:

- Team Overview -> Team Map entry
- invalid team route recovery
- add-member sheet search and membership state
- member detail tabs
- Open Chat from Team Map
- leader badge in session list
- node hover summary

- [ ] **Step 3: Capture the result**

Record exactly what passed, what was flaky, and what had to be retried.

### Task 5: Sync Phase 04 planning artifacts

**Files:**
- Create: `.planning/phases/04-team-map-evolution/04-04-SUMMARY.md`
- Create or Modify: `.planning/phases/04-team-map-evolution/04-04-UAT.md` (only if needed to preserve manual validation evidence)

- [ ] **Step 1: Write the Phase 04 closeout summary**

Document:

- what code-level closeout changes landed
- what focused tests were run
- what real app validation was performed

- [ ] **Step 2: Preserve manual validation evidence**

If there is no existing verification artifact for the real UI pass, add a compact UAT/verification note for the closeout.

- [ ] **Step 3: Re-read the artifacts**

Confirm the planning files say only what was actually verified.

## Plan Self-Review

**Status:** Approved

**Notes:**
- Scope stays inside Phase 04 closeout.
- Tasks are atomic and test-first.
- No future team-task orchestration work is pulled into this plan.
