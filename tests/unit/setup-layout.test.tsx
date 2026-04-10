import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeIpcMock = vi.fn();
const hostApiFetchMock = vi.fn();
const subscribeHostEventMock = vi.fn(() => () => undefined);
const translate = (key: string, vars?: Record<string, unknown>) => {
  if (vars && Object.keys(vars).length > 0) {
    return `${key}:${JSON.stringify(vars)}`;
  }
  return key;
};
const settingsState = {
  language: 'en',
  setLanguage: vi.fn(),
  markSetupComplete: vi.fn(),
  devModeUnlocked: false,
  brandName: 'KTClaw',
  brandIconDataUrl: null as string | null,
  brandLogoDataUrl: null as string | null,
};
const gatewayState = {
  status: { state: 'running', port: 18789 },
  start: vi.fn(),
};

function createStoreHook<T extends object>(state: T) {
  const hook = ((selector?: (value: T) => unknown) => (typeof selector === 'function' ? selector(state) : state)) as {
    <R>(selector: (value: T) => R): R;
    (): T;
    getState: () => T;
  };
  hook.getState = () => state;
  return hook;
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: translate,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/i18n', () => ({
  SUPPORTED_LANGUAGES: [{ code: 'en', label: 'English' }],
}));

vi.mock('framer-motion', () => {
  const MotionDiv = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>;
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: MotionDiv,
    },
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/api-client', () => ({
  invokeIpc: (...args: unknown[]) => invokeIpcMock(...args),
}));

vi.mock('@/lib/host-api', () => ({
  hostApiFetch: (...args: unknown[]) => hostApiFetchMock(...args),
}));

vi.mock('@/lib/host-events', () => ({
  subscribeHostEvent: (...args: unknown[]) => subscribeHostEventMock(...args),
}));

vi.mock('@/assets/logo.svg', () => ({
  default: 'logo.svg',
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: createStoreHook(settingsState),
}));

vi.mock('@/stores/gateway', () => ({
  useGatewayStore: createStoreHook(gatewayState),
}));

describe('setup layout shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    settingsState.language = 'en';
    settingsState.devModeUnlocked = false;

    hostApiFetchMock.mockImplementation(async (path: string) => {
      if (path === '/api/provider-accounts') return [];
      if (path === '/api/providers') return [];
      if (path === '/api/provider-vendors') {
        return [
          {
            id: 'ollama',
            name: 'Ollama',
            supportsMultipleAccounts: true,
          },
        ];
      }
      if (path === '/api/provider-accounts/default') return { accountId: null };
      if (path === '/api/settings') return {};
      throw new Error(`Unexpected hostApiFetch path: ${path}`);
    });

    invokeIpcMock.mockImplementation(async (channel: string) => {
      if (channel === 'openclaw:status') {
        return {
          packageExists: true,
          isBuilt: true,
          dir: 'C:/openclaw',
          version: '2026.3.22',
        };
      }
      if (channel === 'window:isMaximized') return false;
      return { success: true };
    });
  });

  it('shows a previous action on provider step and keeps the footer action area rendered', async () => {
    const { Setup } = await import('@/pages/Setup');

    render(
      <MemoryRouter initialEntries={['/setup']}>
        <Setup />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'nav.next' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'nav.next' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'nav.next' }));

    await waitFor(() => {
      expect(screen.getByText('steps.provider.title')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'nav.back' })).toBeInTheDocument();
    expect(screen.getByTestId('wizard-footer')).toBeInTheDocument();
  });
});
