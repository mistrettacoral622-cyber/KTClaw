import { cn } from '@/lib/utils';

export type SettingsGroupId = 'basic' | 'workflow' | 'capability' | 'governance';

type SettingsNavItem = {
  id: SettingsGroupId;
  label: string;
  description: string;
};

type SettingsNavProps = {
  items: SettingsNavItem[];
  activeId: SettingsGroupId;
  onChange: (id: SettingsGroupId) => void;
};

export function SettingsNav({ items, activeId, onChange }: SettingsNavProps) {
  return (
    <nav className="w-full md:w-56 shrink-0">
      <div className="sticky top-0 rounded-2xl border border-black/10 dark:border-white/10 bg-card/60 backdrop-blur-sm p-2">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={cn(
                'w-full text-left rounded-xl px-3 py-2.5 transition-colors',
                active
                  ? 'bg-black/10 dark:bg-white/10 text-foreground'
                  : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5',
              )}
            >
              <div className="text-[14px] font-semibold">{item.label}</div>
              <div className="text-[12px] mt-0.5">{item.description}</div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
