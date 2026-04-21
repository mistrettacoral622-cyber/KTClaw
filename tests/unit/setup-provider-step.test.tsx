import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeIpcMock = vi.fn();
const hostApiFetchMock = vi.fn();
const subscribeHostEventMock = vi.fn(() => () => undefined);
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
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
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
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

async function goToProviderStep() {
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
}

describe('setup provider step verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

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

  it('keeps next disabled until the saved provider is verified as the default account', async () => {
    let snapshotReads = 0;
    let savedAccountId: string | null = null;
    hostApiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/provider-accounts' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body || '{}')) as { account?: { id?: string } };
        savedAccountId = body.account?.id || 'ollama-account-1';
        return {
          success: true,
          account: {
            id: savedAccountId,
            vendorId: 'ollama',
            label: 'Ollama',
            authMode: 'local',
            baseUrl: 'http://localhost:11434/v1',
            model: 'qwen3:latest',
            enabled: true,
            isDefault: false,
            createdAt: '2026-04-10T00:00:00.000Z',
            updatedAt: '2026-04-10T00:00:00.000Z',
          },
        };
      }
      if (path === '/api/provider-accounts/default' && init?.method === 'PUT') {
        return { success: true };
      }
      if (path === '/api/provider-vendors') {
        return [
          {
            id: 'ollama',
            name: 'Ollama',
            supportsMultipleAccounts: true,
          },
        ];
      }
      if (path === '/api/local-embeddings-runtime/status') {
        return {
          state: 'not_installed',
          version: '3.16.2',
          targetId: 'win32-x64',
          requiredByConfig: false,
        };
      }
      if (path === '/api/provider-accounts') {
        snapshotReads += 1;
        return snapshotReads >= 2 && savedAccountId
          ? [{
            id: savedAccountId,
            vendorId: 'ollama',
            label: 'Ollama',
            authMode: 'local',
            baseUrl: 'http://localhost:11434/v1',
            model: 'qwen3:latest',
            enabled: true,
            isDefault: false,
            createdAt: '2026-04-10T00:00:00.000Z',
            updatedAt: '2026-04-10T00:00:00.000Z',
          }]
          : [];
      }
      if (path === '/api/providers') {
        return [];
      }
      if (path === '/api/provider-accounts/default') {
        return { accountId: snapshotReads >= 2 ? 'different-account' : null };
      }
      if (path === `/api/providers/${savedAccountId}`) {
        return null;
      }
      if (path === `/api/providers/${savedAccountId}/api-key`) {
        return { apiKey: null };
      }
      if (path === '/api/providers/ollama') {
        return null;
      }
      if (path === '/api/providers/ollama/api-key') {
        return { apiKey: null };
      }
      throw new Error(`Unexpected hostApiFetch path: ${path} (${init?.method || 'GET'})`);
    });

    await goToProviderStep();

    fireEvent.click(screen.getByRole('button', { name: /provider\.selectPlaceholder/i }));
    fireEvent.click(screen.getByRole('option', { name: /Ollama/i }));

    fireEvent.change(screen.getByLabelText('provider.modelId'), {
      target: { value: 'qwen3:latest' },
    });

    const nextButton = screen.getByRole('button', { name: 'nav.next' });
    expect(nextButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'provider.save' }));

    await waitFor(() => {
      expect(hostApiFetchMock).toHaveBeenCalledWith(
        '/api/provider-accounts',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(hostApiFetchMock).toHaveBeenCalledWith(
        '/api/provider-accounts/default',
        expect.objectContaining({ method: 'PUT' }),
      );
    });

    await waitFor(() => {
      expect(nextButton).toBeDisabled();
    });
  }, 15000);

  it('enables next after the saved provider is verified as the default account', async () => {
    let snapshotReads = 0;
    let savedAccountId: string | null = null;
    hostApiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === '/api/provider-accounts' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body || '{}')) as { account?: { id?: string } };
        savedAccountId = body.account?.id || 'ollama-account-1';
        return {
          success: true,
          account: {
            id: savedAccountId,
            vendorId: 'ollama',
            label: 'Ollama',
            authMode: 'local',
            baseUrl: 'http://localhost:11434/v1',
            model: 'qwen3:latest',
            enabled: true,
            isDefault: true,
            createdAt: '2026-04-10T00:00:00.000Z',
            updatedAt: '2026-04-10T00:00:00.000Z',
          },
        };
      }
      if (path === '/api/provider-accounts/default' && init?.method === 'PUT') {
        return { success: true };
      }
      if (path === '/api/provider-vendors') {
        return [
          {
            id: 'ollama',
            name: 'Ollama',
            supportsMultipleAccounts: true,
          },
        ];
      }
      if (path === '/api/local-embeddings-runtime/status') {
        return {
          state: 'not_installed',
          version: '3.16.2',
          targetId: 'win32-x64',
          requiredByConfig: false,
        };
      }
      if (path === '/api/provider-accounts') {
        snapshotReads += 1;
        return snapshotReads >= 2 && savedAccountId
          ? [{
            id: savedAccountId,
            vendorId: 'ollama',
            label: 'Ollama',
            authMode: 'local',
            baseUrl: 'http://localhost:11434/v1',
            model: 'qwen3:latest',
            enabled: true,
            isDefault: true,
            createdAt: '2026-04-10T00:00:00.000Z',
            updatedAt: '2026-04-10T00:00:00.000Z',
          }]
          : [];
      }
      if (path === '/api/providers') {
        return [];
      }
      if (path === '/api/provider-accounts/default') {
        return { accountId: snapshotReads >= 2 ? savedAccountId : null };
      }
      if (path === `/api/providers/${savedAccountId}`) {
        return null;
      }
      if (path === `/api/providers/${savedAccountId}/api-key`) {
        return { apiKey: null };
      }
      if (path === '/api/providers/ollama') {
        return null;
      }
      if (path === '/api/providers/ollama/api-key') {
        return { apiKey: null };
      }
      throw new Error(`Unexpected hostApiFetch path: ${path} (${init?.method || 'GET'})`);
    });

    await goToProviderStep();

    fireEvent.click(screen.getByRole('button', { name: /provider\.selectPlaceholder/i }));
    fireEvent.click(screen.getByRole('option', { name: /Ollama/i }));

    fireEvent.change(screen.getByLabelText('provider.modelId'), {
      target: { value: 'qwen3:latest' },
    });

    const nextButton = screen.getByRole('button', { name: 'nav.next' });
    expect(nextButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'provider.save' }));

    await waitFor(() => {
      expect(nextButton).toBeEnabled();
    });
  }, 15000);
});
