import { createContext, useEffect, useMemo, useState } from "react";
import type React from "react";
import { storage } from "@/lib/storage";
import { mockApi } from "@/lib/mock-api";
import type { User } from "@/types/user";

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { name: string; email: string; password: string; inviteCode: string }) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(storage.get<User | null>(storage.keys.auth, null));
    setLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: !!user,
    loading,
    async login(email, password) {
      const next = await mockApi.login(email, password);
      setUser(next);
    },
    async register(payload) {
      const next = await mockApi.register(payload);
      setUser(next);
    },
    async logout() {
      await mockApi.logout();
      setUser(null);
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
