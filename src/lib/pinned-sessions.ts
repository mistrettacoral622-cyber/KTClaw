import { useCallback, useEffect, useMemo, useState } from 'react';

export const PINNED_SESSIONS_STORAGE_KEY = 'clawx-sidebar-pinned-sessions';
const PINNED_SESSIONS_EVENT = 'clawx:pinned-sessions-updated';

function parsePinnedSessionKeys(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function readPinnedSessionKeys(): string[] {
  return parsePinnedSessionKeys(localStorage.getItem(PINNED_SESSIONS_STORAGE_KEY));
}

export function writePinnedSessionKeys(keys: string[]): void {
  localStorage.setItem(PINNED_SESSIONS_STORAGE_KEY, JSON.stringify(keys));
  window.dispatchEvent(new CustomEvent(PINNED_SESSIONS_EVENT, { detail: keys }));
}

export function togglePinnedSessionKey(sessionKey: string): string[] {
  const next = readPinnedSessionKeys();
  const updated = next.includes(sessionKey)
    ? next.filter((key) => key !== sessionKey)
    : [...next, sessionKey];
  writePinnedSessionKeys(updated);
  return updated;
}

export function usePinnedSessions() {
  const [pinnedSessionKeys, setPinnedSessionKeys] = useState<string[]>(() => readPinnedSessionKeys());

  useEffect(() => {
    const syncFromStorage = () => setPinnedSessionKeys(readPinnedSessionKeys());
    const handlePinnedSessionsUpdated = () => syncFromStorage();

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener(PINNED_SESSIONS_EVENT, handlePinnedSessionsUpdated);
    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener(PINNED_SESSIONS_EVENT, handlePinnedSessionsUpdated);
    };
  }, []);

  const pinnedSessionKeySet = useMemo(() => new Set(pinnedSessionKeys), [pinnedSessionKeys]);
  const toggleSessionPinned = useCallback((sessionKey: string) => {
    const updated = togglePinnedSessionKey(sessionKey);
    setPinnedSessionKeys(updated);
  }, []);

  return {
    pinnedSessionKeys,
    pinnedSessionKeySet,
    toggleSessionPinned,
  };
}
