# KaiTianClaw Continue Protocol

## Purpose
This directory is the durable session-memory checkpoint for KaiTianClaw Control Plane work.

## Mandatory Session Recovery Workflow
1. Read `continue/task.json` first.
2. Read `continue/progress.txt` second.
3. Confirm `current_focus`, task dependencies, and latest progress entry before making edits.
4. If `task.json` and `progress.txt` conflict, resolve the conflict in both files before implementation work.

## Required Status Flow
Allowed lifecycle:
`brainstorming -> planned -> in_progress -> review -> done`

Rules:
- Do not skip forward statuses.
- Do not move a task backward unless blocked by explicit new evidence.
- Keep `current_focus` aligned with the active task in `task.json`.

## Design-to-Implementation Gate
- Design tasks (`DESIGN-*`) and planning tasks (`PLAN-*`) must not jump directly to implementation outputs without reaching `done`.
- Build tasks (`BUILD-*`) cannot start until prerequisite design/planning dependencies are `done`.

## Session End Requirements
At the end of every session:
1. Update `continue/task.json` task states, `current_focus`, and `last_updated`.
2. Append a new entry to `continue/progress.txt` with what changed, decisions, blockers, and next step.
3. Ensure both files describe the same current state before handing off.
