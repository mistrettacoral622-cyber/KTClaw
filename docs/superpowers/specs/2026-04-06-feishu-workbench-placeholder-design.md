# Feishu Workbench Placeholder Design

## Goal

In the Channels page, show a temporary "not finished yet" placeholder in the Feishu right-hand workbench pane so users do not treat the unfinished Feishu sync surface as complete.

## Scope

- Keep the existing Channels page route and left-side structure intact.
- Only replace the visible right-side Feishu workbench experience with a placeholder surface.
- Keep underlying settings and add-channel actions reachable from the placeholder.

## UI Behavior

- When the active channel family is `feishu`, the right pane shows a centered placeholder card.
- The placeholder clearly states that the Feishu sync workbench is still under development.
- If a Feishu channel is already selected, the primary action opens channel settings.
- If no Feishu channel is configured, the primary action opens the add-channel flow.

## Implementation Notes

- Add a focused `FeishuWorkbenchPlaceholder` component under `src/components/channels/`.
- Render it from `src/pages/Channels/index.tsx` only for Feishu.
- Use a visual overlay instead of removing the underlying workbench tree so the page structure stays stable and this temporary state is easy to remove later.

## Testing

- Add a Channels page test that verifies the Feishu placeholder renders with the expected title and action button.
