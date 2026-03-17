import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccordionGroupProps {
  title: string;
  icon: React.ReactNode;
  collapsed?: boolean;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}

export function AccordionGroup({
  title,
  icon,
  collapsed = false,
  defaultOpen = true,
  children,
}: AccordionGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (collapsed) {
    return (
      <button
        type="button"
        aria-label={title}
        className={cn(
          'flex h-9 w-full items-center justify-center rounded-lg text-muted-foreground transition-colors',
          'hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10',
        )}
      >
        {icon}
      </button>
    );
  }

  return (
    <section className="rounded-lg">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] font-medium',
          'text-foreground/85 transition-colors hover:bg-black/5 dark:hover:bg-white/5',
        )}
      >
        <span className="flex shrink-0 items-center justify-center text-muted-foreground">{icon}</span>
        <span className="flex-1">{title}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open ? 'rotate-180' : 'rotate-0')} />
      </button>
      {open && <div className="space-y-1 px-2 pb-2 pt-1">{children}</div>}
    </section>
  );
}
