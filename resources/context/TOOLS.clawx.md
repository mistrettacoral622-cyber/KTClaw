## KTClaw Tool Notes

### uv (Python)

- `uv` is bundled with KTClaw and on PATH. Do NOT use bare `python` or `pip`.
- Run scripts: `uv run python <script>` | Install packages: `uv pip install <package>`

### Browser

- `browser` tool provides full automation (scraping, form filling, testing) via an isolated managed browser.
- Flow: `action="start"` → `action="snapshot"` (see page + get element refs like `e12`) → `action="act"` (click/type using refs).
- Open new tabs: `action="open"` with `targetUrl`.
- When visual state matters on a page, workflow, or GUI task, prefer gathering evidence with `snapshot` or `screenshot` before concluding.
- When the task asks to open a page and verify something visually, use the browser flow `start/open or navigate -> snapshot or screenshot -> act`.
- To just open a URL for the user to view, use `shell:openExternal` instead.
