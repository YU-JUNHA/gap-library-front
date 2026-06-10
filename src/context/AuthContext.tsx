import { createContext, useEffect, useMemo, useState } from "react";
import type React from "react";
import { storage } from "@/lib/storage";
import { api, clearTokens, setTokens } from "@/lib/api";
import type { User } from "@/types/user";

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: { name?: string; organization?: string; avatarUrl?: string | null }) => Promise<void>;
  changePassword: (payload: { currentPassword: string; newPassword: string }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = storage.get<User | null>(storage.keys.auth, null);
    if (!cached) {
      setLoading(false);
      return;
    }
    api.me().then((me) => {
      setUser(me);
      storage.set(storage.keys.auth, me);
    }).catch(() => {
      storage.remove(storage.keys.auth);
      clearTokens();
      setUser(null);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleForcedLogout = () => {
      storage.remove(storage.keys.auth);
      clearTokens();
      setUser(null);
    };

    window.addEventListener("gap-auth-forced-logout", handleForcedLogout);
    return () => window.removeEventListener("gap-auth-forced-logout", handleForcedLogout);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: !!user,
    loading,
    async login(email, password) {
      const next = await api.login(email, password);
      setTokens(next.accessToken, next.refreshToken);
      storage.set(storage.keys.auth, next.user);
      setUser(next.user);
    },
    async register(payload) {
      await api.register(payload);
    },
    async logout() {
      const refresh = storage.get<string | null>(storage.keys.refreshToken, null);
      if (refresh) await api.logout(refresh).catch(() => undefined);
      clearTokens();
      storage.remove(storage.keys.auth);
      setUser(null);
    },
    async updateProfile(patch) {
      const next = await api.updateProfile(patch);
      setUser(next);
      storage.set(storage.keys.auth, next);
    },
    async changePassword(payload) {
      await api.changePassword(payload);
    },
    async uploadAvatar(file) {
      const { avatarUrl } = await api.uploadMyAvatar(file);
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, avatarUrl };
        storage.set(storage.keys.auth, next);
        return next;
      });
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
