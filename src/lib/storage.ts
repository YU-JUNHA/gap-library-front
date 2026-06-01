const KEYS = {
  auth: "gap-auth-user",
  accessToken: "gap-access-token",
  refreshToken: "gap-refresh-token",
  docs: "gap-documents",
  users: "gap-users",
  signupRequests: "gap-signup-requests",
};

export const storage = {
  get<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key: string) {
    localStorage.removeItem(key);
  },
  clearAll() {
    localStorage.clear();
  },
  keys: KEYS,
};
