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
  updateProfile: (patch: Partial<User>) => Promise<void>;
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
      await mockApi.register(payload);
    },
    async logout() {
      await mockApi.logout();
      setUser(null);
    },
    async updateProfile(patch) {
      const next = await mockApi.updateProfile(patch);
      if (next) setUser(next);
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
