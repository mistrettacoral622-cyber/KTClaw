import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { TitleBar } from '@/components/layout/TitleBar';
import { cn } from '@/lib/utils';

interface WizardShellStep {
  id: string;
}

interface WizardShellProps {
  steps: WizardShellStep[];
  activeStep: number;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  contentClassName?: string;
}

export function WizardShell({
  steps,
  activeStep,
  title,
  description,
  children,
  footer,
  contentClassName,
}: WizardShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="shrink-0 px-4 pt-6 md:px-8 md:pt-8">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6">
            <div className="flex items-center gap-2">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                      index < activeStep
                        ? 'border-primary bg-primary text-primary-foreground'
                        : index === activeStep
                          ? 'border-primary text-primary'
                          : 'border-slate-600 text-slate-600',
                    )}
                  >
                    {index < activeStep ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-sm">{index + 1}</span>
                    )}
                  </div>
                  {index < steps.length - 1 ? (
                    <div
                      className={cn(
                        'h-0.5 w-8 transition-colors',
                        index < activeStep ? 'bg-primary' : 'bg-slate-600',
                      )}
                    />
                  ) : null}
                </div>
              ))}
            </div>

            <div className="text-center">
              <h1 className="mb-2 text-3xl font-bold">{title}</h1>
              <p className="text-slate-400">{description}</p>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 md:px-8">
          <div className={cn('mx-auto w-full max-w-3xl py-6', contentClassName)}>
            {children}
          </div>
        </main>

        {footer ? (
          <footer
            data-testid="wizard-footer"
            className="sticky bottom-0 z-10 shrink-0 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-8"
          >
            <div className="mx-auto w-full max-w-3xl">
              {footer}
            </div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}

export default WizardShell;
