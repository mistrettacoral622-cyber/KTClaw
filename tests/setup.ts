/**
 * Vitest Test Setup
 * Global test configuration and mocks
 */
import { afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

if (typeof window !== 'undefined') {
  // Mock window.electron API for renderer/jsdom tests.
  const mockElectron = {
    ipcRenderer: {
      invoke: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      off: vi.fn(),
    },
    openExternal: vi.fn(),
    platform: 'darwin',
    isDev: true,
  };

  Object.defineProperty(window, 'electron', {
    value: mockElectron,
    writable: true,
    configurable: true,
  });

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
