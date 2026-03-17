import { useTranslation } from 'react-i18next';

type WorkbenchEmptyStateProps = {
  agentName: string;
};

export function WorkbenchEmptyState({ agentName }: WorkbenchEmptyStateProps) {
  const { t } = useTranslation('chat');

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-foreground/90 text-2xl font-semibold text-foreground/90">
        K
      </div>
      <h1 className="text-5xl font-semibold tracking-tight text-foreground">
        {agentName}
      </h1>
      <p className="mt-4 max-w-xl text-[16px] leading-7 text-muted-foreground">
        {t('workbench.hero.subtitle')}
      </p>
      <div className="mt-8 w-full max-w-md rounded-[28px] border border-black/10 bg-card/90 p-6 text-left shadow-sm dark:border-white/10">
        <p className="text-lg font-semibold text-foreground">{t('workbench.quickConfig')}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {t('workbench.quickConfigDescription')}
        </p>
      </div>
    </div>
  );
}
