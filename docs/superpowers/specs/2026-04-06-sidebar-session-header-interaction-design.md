# Sidebar Session Header Interaction Design

**Date:** 2026-04-06
**Scope:** Sidebar session-group header only

## Goal

Adjust the Sidebar session header so the new-session action is always available on the far right, while the collapse affordance moves next to the `会话` label and only appears on hover or keyboard focus.

## Current Problem

The current session header uses a single button with the collapse chevron anchored on the far right. That position is better used for a primary creation action because:

- creating a new session is a more common action than collapsing the list
- the current right-edge chevron competes visually with the per-session action rail below
- the collapse affordance is visually heavier than it needs to be

## Decision

Implement a session-specific header layout inside the Sidebar instead of generalizing the shared `SectionHeader`.

Reasoning:

- only the `会话` group needs this two-action layout right now
- `频道` should keep its current structure
- a local change avoids turning the generic header into a branching component

## Interaction Rules

### Expanded Sidebar

- The `会话` row becomes a two-part header.
- Left area:
  - session icon
  - `会话` label
  - collapse chevron immediately to the right of the label
- Right area:
  - a dedicated `+` button in the previous far-right chevron slot

### Behavior

- Clicking the left header area toggles expand/collapse.
- Clicking the `+` button creates a new session and navigates to `/`.
- If the session list is collapsed, clicking `+` also re-opens the session group so the result is visible.
- The chevron stays mounted for layout stability but is visually hidden by default.
- The chevron becomes visible on hover of the session header row and on keyboard focus within the row.

### Collapsed Sidebar

- Keep current compact behavior.
- Do not introduce a separate always-visible `+` button in collapsed mode.

## Accessibility

- The toggle target remains a button with the session section label.
- The new-session control is a separate button with its own accessible name.
- Hover-only visibility must also be mirrored by focus-visible/focus-within styling so keyboard users can discover the chevron.

## Files To Touch

- `src/components/layout/Sidebar.tsx`
- `tests/unit/workbench-sidebar.test.tsx`

## Verification Strategy

1. Add failing Sidebar tests for the new session header behavior.
2. Verify:
   - the new-session button is always visible in expanded mode
   - clicking `+` creates a session without toggling collapse
   - clicking the left header area toggles the session list
   - the chevron uses hidden-by-default, hover/focus-visible styling
3. Implement the minimal UI change in `Sidebar.tsx`.
