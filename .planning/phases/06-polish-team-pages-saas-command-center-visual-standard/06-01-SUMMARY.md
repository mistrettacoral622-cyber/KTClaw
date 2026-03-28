---
phase: "06"
plan: "01"
subsystem: "TeamOverview"
tags: [visual, tailwind, status-indicators, saas-ui]
dependency_graph:
  requires: []
  provides: [StatusDot-component, MetricCard-left-border, AgentCard-status-badge, WorkItem-left-border]
  affects: [src/pages/TeamOverview/index.tsx]
tech_stack:
  added: []
  patterns: [colored-left-border-accent, status-dot-pill, justify-between-header-row]
key_files:
  modified: [src/pages/TeamOverview/index.tsx]
  created: []
decisions:
  - "StatusDot placed before CreateAgentModal (after helper functions) for clean top-of-file grouping"
  - "border border-l-4 combination used per plan note — toneClass supplies base border color, leftBorderClass overrides left side"
  - "StatusDot uses t() with {defaultValue: statusKey} fallback to handle unknown status keys gracefully"
metrics:
  duration: "~8 minutes"
  completed: "2026-03-28"
  tasks_completed: 4
  files_modified: 1
---

# Phase 06 Plan 01: Upgrade TeamOverview metric cards, hero section, and member card visual system Summary

**One-liner:** Added status-colored left-border accents and StatusDot pill badges to MetricCards, AgentCard headers, and active work items to raise TeamOverview from admin panel to SaaS command-center visual quality.

## What Was Changed

### `src/pages/TeamOverview/index.tsx`

**Task 1 — MetricCard enhanced (lines 565-604)**

Added two new color maps to `MetricCard`:
- `leftBorderClass`: maps tone to `border-l-{color}` for the 4px accent
- `dotColorClass`: maps tone to `bg-{color}` for the status dot circle

Updated the outer `<div>` from `border` to `border border-l-4` with `leftBorderClass` appended via `cn()`. Replaced the plain `<p>` label with a `<div className="flex items-center gap-2">` containing a `<span className={cn('h-2 w-2 rounded-full shrink-0', dotColorClass)} />` dot and the label text.

**Task 2 — StatusDot helper component added (lines 76-92)**

New `StatusDot({ statusKey })` component inserted after the helper functions (`getOwnedEntryPoints`) and before `CreateAgentModal`. Renders a colored pill (`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold`) with a 1.5×1.5 dot span inside. Config table covers: `working` (blue-500), `active` (blue-400), `blocked` (amber-500), `waiting_approval` (violet-500), `idle` (slate-300). Falls back to `idle` for unknown keys.

**Task 3 — AgentCard header row updated (lines 456-466)**

Replaced `<div className="flex items-center gap-1.5">` with a two-level structure:
- Outer: `<div className="flex items-center justify-between gap-2">`
- Inner left: `<div className="flex min-w-0 items-center gap-1.5">` (name + default badge)
- Inner right: `<StatusDot statusKey={activityKey} />` (right-aligned)

**Task 4 — Active work items updated (lines 311-332)**

Replaced static `className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"` with a `cn()` expression that adds `border-l-4`:
- amber accent (`border-l-amber-400`) for `blocked` and `waiting_approval`
- blue accent (`border-l-blue-400`) for all other states

Replaced the `<span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">` floating badge with `<StatusDot statusKey={item.statusKey} />`.

## Deviations from Plan

None — plan executed exactly as written.

The plan note about `border border-l-4 border-slate-200 border-l-blue-400` was honored: `border border-l-4` appears in the static className string; the tone-specific base border color comes from `toneClass` (which includes e.g. `border-blue-100`), and `leftBorderClass` (e.g. `border-l-blue-500`) overrides just the left side. This matches the described Tailwind override behavior.

## Verification

- `pnpm run typecheck` — PASSED (no errors)
- `pnpm test -- --run tests/unit/team-overview-page.test.tsx` — PASSED (2/2 tests)
  - "shows header and empty state when no agents exist" — passed
  - "renders a command-center dashboard before the secondary member section" — passed

The test at line 131 (`screen.getAllByText('teamOverview.activity.blocked')`) continues to pass because `StatusDot` renders `t('teamOverview.activity.${statusKey}')` — with the mock returning the key string, the rendered text is identical to before.

## Self-Check

- [x] `src/pages/TeamOverview/index.tsx` — exists and modified
- [x] Commit `a9970db` — verified present

## Self-Check: PASSED
