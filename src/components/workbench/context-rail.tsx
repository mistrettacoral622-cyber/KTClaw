import { FALLBACK_WORKBENCH_DATA, shapeWorkbenchData } from '@/components/workbench/workbench-data';
import { useSettingsStore } from '@/stores/settings';

export function ContextRail() {
  const contextRailCollapsed = useSettingsStore((state) => state.contextRailCollapsed);
  const setContextRailCollapsed = useSettingsStore((state) => state.setContextRailCollapsed);
  const data = shapeWorkbenchData(FALLBACK_WORKBENCH_DATA);

  if (contextRailCollapsed) {
    return (
      <aside className="flex h-full items-center border-l border-border px-2 py-3">
        <button
          type="button"
          aria-label="展开上下文栏 Expand context rail"
          onClick={() => setContextRailCollapsed(false)}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground/80 transition-colors hover:bg-accent"
        >
          {'>'}
        </button>
      </aside>
    );
  }

  return (
    <aside className="h-full w-80 space-y-3 border-l border-border bg-background p-3">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-foreground">上下文 Context</h2>
        <button
          type="button"
          aria-label="收起上下文栏 Collapse context rail"
          onClick={() => setContextRailCollapsed(true)}
          className="rounded-md border border-border px-2 py-1 text-xs text-foreground/70 transition-colors hover:bg-accent"
        >
          收起 Hide
        </button>
      </header>

      <section className="space-y-2 rounded-lg border border-border bg-card p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">团队 Team</p>
        <p className="text-sm font-medium text-foreground">{data.team.name}</p>
        <p className="text-xs text-muted-foreground">{data.team.description}</p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-card p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">频道 Channel</p>
        <p className="text-sm font-medium text-foreground">{data.channel.name}</p>
        <p className="text-xs text-muted-foreground">{data.channel.status}</p>
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-card p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">任务 Task</p>
        <p className="text-sm font-medium text-foreground">{data.task.title}</p>
        <p className="text-xs text-muted-foreground">{data.task.due}</p>
      </section>
    </aside>
  );
}
