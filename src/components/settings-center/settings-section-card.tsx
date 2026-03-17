import type { ReactNode } from 'react';

type SettingsSectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function SettingsSectionCard({ title, description, children }: SettingsSectionCardProps) {
  return (
    <section className="rounded-3xl border border-black/10 dark:border-white/10 bg-card p-6 md:p-7 space-y-5">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
