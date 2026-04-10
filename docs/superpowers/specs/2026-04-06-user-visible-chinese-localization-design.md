# User-Visible Chinese Localization Design

**Date:** 2026-04-06
**Scope:** KTClaw application UI only; excludes README, developer-facing docs, comments, and internal identifiers

## Goal

Make the product feel Chinese-first for end users by removing remaining English from visible application surfaces while preserving required product names and technical proper nouns.

## Product Boundary

This change applies only to user-visible application content:

- Page titles, section headers, buttons, tabs, empty states, placeholders, helper text
- Toasts, dialogs, confirmations, onboarding copy, runtime status text
- Accessibility labels when they describe visible controls

This change does not apply to:

- `README*`, planning docs, comments, tests names, or developer-facing logs
- Internal IDs, route names, protocol values, config keys, or persisted schema fields
- Product names and necessary technical proper nouns such as `KTClaw`, `OpenClaw`, `OAuth`, `API Key`

## Translation Policy

### Keep As Proper Nouns

- `KTClaw`
- `OpenClaw`
- `OAuth`
- `API Key`
- brand/platform names such as `Telegram`, `Discord`, `WhatsApp`, `LINE`, `Google Chat`
- model/provider names where the English form is the recognizable product name

### Convert To Chinese

- Generic UI nouns such as `Settings`, `Details`, `Overview`, `Activity`, `Models`, `Skills`, `Chat`, `Memory`, `Runtime`, `Gateway`
- Role labels shown to end users such as `Leader`, `Worker`, `direct`, `leader_only`
- Status copy such as `Loading`, `Connected`, `Disconnected`, `Running`, `Stopped`, `Error`
- Mixed-language helper copy such as `OpenClaw doctor`, `Runtime capabilities`, `Actions`, `Schema`

### Preserve Internal Values Behind User Labels

When a field stores an internal value like `leader_only`, `direct`, `running`, or `stdio`, the persisted value stays untouched. Only the rendered label changes.

## Implementation Approach

### 1. Fix the Chinese locale first

The fastest way to remove visible English is to clean the active `zh` locale files. The app already exposes only `zh`, so these files are the highest-leverage surface. Update all mixed or English values that are user-facing, especially:

- `common.json`
- `agents.json`
- `channels.json`
- `chat.json`
- `cron.json`
- `dashboard.json`
- `settings.json`
- `setup.json`
- `skills.json`

### 2. Patch hardcoded UI literals in components

Some pages still render English directly rather than through i18n. Replace those literals or route them through existing translation keys where appropriate. Prioritize:

- global error and status surfaces
- search dialogs
- chat/workbench export and run-state toasts
- setup/provider OAuth flows
- team/agent detail tabs and labels

### 3. Avoid risky i18n architecture changes

This is a content pass, not an i18n refactor. Do not remove the English locale, change language negotiation, or redesign translation key structure unless required to unblock a visible Chinese string.

## Risks And Guards

- Some English text is actually a required platform or protocol name. Over-translating those would make setup instructions less usable.
- Some strings appear in tests only; changing those is unnecessary unless the test asserts rendered UI copy.
- Some current files are already dirty. Edits must avoid reverting unrelated work.

## Verification Strategy

1. Add or update focused tests around high-visibility surfaces that still show English today.
2. Run those tests red first to prove the strings are currently wrong.
3. Implement the minimal copy changes.
4. Re-run the focused tests plus parity checks for locale integrity.
5. Run a broader smoke set across the touched UI areas before claiming the pass is complete.
