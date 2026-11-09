"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const SessionContext = createContext({
  user: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

/**
 * One session read per page load, shared by the header, map, dashboard and
 * application forms. The API remains the source of truth for permissions.
 */
export default function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        setUser(null);
        return null;
      }
      const payload = await response.json();
      const nextUser = payload?.data?.user ?? null;
      setUser(nextUser);
      return nextUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ user, loading, refresh, signOut }), [user, loading, refresh, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
