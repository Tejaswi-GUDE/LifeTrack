import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * SessionContext — the foundation for the mock-login / role context described
 * in the Build Spec (§3, Auth/Session module). This step only establishes the
 * container: it holds a { role, name, token, scopeId } object in localStorage.
 * Wiring it to POST /api/auth/login happens in a later step.
 */
const STORAGE_KEY = 'lifetrack.session';
const SessionContext = createContext(null);

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(readStored);

  useEffect(() => {
    try {
      if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable — keep in-memory only */
    }
  }, [session]);

  const signIn = useCallback((next) => setSession(next), []);
  const signOut = useCallback(() => setSession(null), []);

  const value = useMemo(
    () => ({
      session,
      role: session?.role ?? null,
      isAuthenticated: Boolean(session),
      signIn,
      signOut,
    }),
    [session, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>');
  return ctx;
}
