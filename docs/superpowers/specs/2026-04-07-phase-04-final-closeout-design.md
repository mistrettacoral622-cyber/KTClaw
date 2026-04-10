# Phase 04 Final Closeout Design

**Date:** 2026-04-07
**Scope:** Team Map Evolution final closeout

## Goal

Close Phase 04 truthfully so the codebase, runtime behavior, and `.planning` artifacts all agree that Team Map is ready to hand off to the next phase of team-task orchestration work.

## Non-Goals

- Do not start the next-generation team task system.
- Do not redesign Team Map beyond Phase 04 requirements.
- Do not fold Phase 05, Phase 06, or future agent-communication work into this closeout.

## Current Reality

- The main Team Map shell is already implemented: canonical `/team-map/:teamId` routing, team-scoped member rendering, add-member flow, detail sheet, memory editing, skills assignment, private chat sessions, activity tab, and hover summary.
- Focused unit coverage already exists for most of the Phase 04 surface.
- The remaining drift is around closeout quality rather than missing major subsystems:
  - some Team Map strings are still hardcoded instead of using the existing `teamMap` i18n namespace
  - at least one stale entry path still points at `/team-map` instead of the canonical team-scoped flow
  - `.planning` still shows Phase 04 as not fully closed because the final summary and manual verification checkpoint were never recorded

## Design Decision

Treat this as a bounded closeout pass, not a feature expansion pass.

That means:

1. Patch only the Phase 04 gaps that still create user-facing inconsistency or planning drift.
2. Prefer existing code paths and data sources over new abstractions.
3. Verify the result two ways:
   - focused automated tests
   - real app validation through the shipped UI flow
4. Record the result in `.planning` so the next phase can start from a clean baseline.

## Closeout Scope

### 1. Canonical Entry Consistency

Every remaining Team Map entry should respect the Phase 04 route contract.

- Team cards already link to `/team-map/:teamId`
- any stale global Team Map entry that still points to `/team-map` should be redirected to the closest truthful surface, not left as a dead-end alias in user navigation

### 2. Team Map Copy And I18n Consistency

Phase 04 already has a `teamMap` dictionary in both English and Chinese locale files. The closeout should finish the job by moving remaining hardcoded Team Map copy onto translation keys instead of mixing translated and hardcoded text in the same surface.

Priority surfaces:

- member detail sheet
- activity tab
- session list leader-chat badge
- any Team Map loading / add-member / hover strings still relying on defaults or inline literals when a stable key should exist

### 3. Focused Verification

Use TDD for any behavior change:

- write or tighten the failing test first
- confirm it fails for the expected reason
- patch the minimal production code
- re-run the focused suite

Verification should stay scoped to Team Map and private-session wiring rather than broad project-wide regression runs.

### 4. Real App Manual Validation

The final closeout must include an actual UI pass in the running app. The manual checklist should cover:

- Team Overview -> Team Map navigation
- invalid team handling
- add-member sheet and search reset / membership state
- member detail sheet tabs
- Open Chat from Team Map
- leader private-chat badge in the session list
- node hover summary
- loading / empty / recoverable states that are realistically reachable

### 5. Planning Sync

Once the implementation and real validation are complete:

- create `04-04-SUMMARY.md`
- record the manual verification outcome in Phase 04 planning artifacts
- leave a truthful paper trail for what was automated versus manually verified

## Architecture

The closeout uses existing boundaries rather than introducing new ones:

- `src/pages/TeamMap/index.tsx` remains the Team Map orchestration surface
- `src/components/team-map/*` remain focused UI units
- `src/stores/chat.ts` remains the owner of synthetic private-session behavior
- `src/components/sessions/SessionItem.tsx` remains the session-list presentation layer
- `src/i18n/locales/*/common.json` remains the source of Team Map copy
- `.planning/phases/04-team-map-evolution/*` remains the source of truth for closeout state

## Error Handling

- Real validation findings should be recorded as such rather than silently patched around in docs.
- If the running app exposes a deeper behavioral problem than the bounded closeout allows, stop the closeout and surface that as a blocker instead of smuggling Phase 05+ work into Phase 04.

## Testing Strategy

### Automated

- focused Vitest coverage for any changed Team Map behavior
- no “assume pass” claims without a fresh run

### Manual

- launch the app
- verify the main Phase 04 user journey end to end
- record the exact outcome in `.planning`

## Exit Criteria

Phase 04 is only considered closed when all of the following are true:

1. Team Map entry points are consistent with the canonical route model.
2. Remaining Team Map hardcoded copy is reduced to an intentional minimum and locale-backed where expected.
3. Focused tests pass on the changed surface.
4. Real app validation has been run and recorded.
5. `04-04-SUMMARY.md` exists and reflects the real closeout result.
