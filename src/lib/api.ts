import { storage } from "@/lib/storage";
import type { Document } from "@/types/document";
import type { User } from "@/types/user";
import type { SignupRequest } from "@/types/admin";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000/api/v1";

type ApiEnvelope<T> = { data: T; meta?: { page: number; pageSize: number; total: number } };

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const accessToken = storage.get<string | null>(storage.keys.accessToken, null);
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401 && retry) {
    const refreshed = await refreshToken();
    if (refreshed) return request<T>(path, init, false);
  }
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.error?.message ?? "API 요청 중 오류가 발생했습니다.");
  }
  const payload = await res.json() as ApiEnvelope<T>;
  return payload.data;
}

export function setTokens(accessToken: string, refreshTokenValue: string) {
  storage.set(storage.keys.accessToken, accessToken);
  storage.set(storage.keys.refreshToken, refreshTokenValue);
}

export function clearTokens() {
  storage.remove(storage.keys.accessToken);
  storage.remove(storage.keys.refreshToken);
}

async function refreshToken(): Promise<boolean> {
  const refresh = storage.get<string | null>(storage.keys.refreshToken, null);
  if (!refresh) return false;
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh }),
  });
  if (!res.ok) {
    clearTokens();
    return false;
  }
  const data = await res.json() as ApiEnvelope<{ accessToken: string; refreshToken: string }>;
  setTokens(data.data.accessToken, data.data.refreshToken);
  return true;
}

export const api = {
  login: (email: string, password: string) => request<{ accessToken: string; refreshToken: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request<User>("/auth/me"),
  register: (payload: { name: string; email: string; password: string; inviteCode: string }) => request<SignupRequest>("/signup-requests", { method: "POST", body: JSON.stringify(payload) }),
  logout: (refreshTokenValue: string) => request<{ success: boolean }>("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: refreshTokenValue }) }),
  updateProfile: (patch: Partial<User>) => request<User>("/users/me", { method: "PATCH", body: JSON.stringify(patch) }),

  getDocuments: () => request<Document[]>("/documents"),
  getDocumentById: (id: string) => request<Document>(`/documents/${id}`),
  createDocument: (payload: { title: string; content: any[]; categoryId?: string | null; status?: "draft" | "published" }) => request<Document>("/documents", { method: "POST", body: JSON.stringify(payload) }),
  patchDocument: (id: string, patch: Partial<Document> & { categoryId?: string | null }) => request<Document>(`/documents/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteDocument: (id: string) => request<{ success?: boolean }>(`/documents/${id}`, { method: "DELETE" }),

  getUsers: () => request<User[]>("/admin/users"),
  updateUserRole: (userId: string, role: User["role"]) => request<User>(`/admin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  getSignupRequests: () => request<SignupRequest[]>("/admin/signup-requests"),
  approveSignupRequest: (requestId: string) => request<{ success?: boolean }>(`/admin/signup-requests/${requestId}/approve`, { method: "POST" }),
  rejectSignupRequest: (requestId: string) => request<{ success?: boolean }>(`/admin/signup-requests/${requestId}/reject`, { method: "POST" }),

  getCategories: () => request<Array<{ id: string; name: string; parentId: string | null }>>("/categories/tree"),
  createCategory: (name: string, parentId: string | null) => request<{ id: string }>("/categories", { method: "POST", body: JSON.stringify({ name, parentId }) }),
  renameCategory: (id: string, name: string) => request<{ id: string }>(`/categories/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  deleteCategory: (id: string) => request<{ success?: boolean }>(`/categories/${id}`, { method: "DELETE" }),
  moveCategory: (id: string, newParentId: string | null, includeChildren = true, newOrder = 0) => request<{ success?: boolean }>(`/categories/${id}/move`, { method: "POST", body: JSON.stringify({ newParentId, includeChildren, newOrder }) }),

  getTemplates: () => request<Array<{ id: string; name: string; content: string; updatedAt: string }>>("/templates"),
  createTemplate: (payload: { name: string; content: string }) => request<{ id: string; name: string; content: string; updatedAt: string }>("/templates", { method: "POST", body: JSON.stringify(payload) }),
  updateTemplate: (id: string, payload: { name: string; content: string }) => request<{ id: string; name: string; content: string; updatedAt: string }>(`/templates/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteTemplate: (id: string) => request<{ success?: boolean }>(`/templates/${id}`, { method: "DELETE" }),
  applyTemplate: (templateId: string, documentId: string) => request<{ success?: boolean }>(`/templates/${templateId}/apply`, { method: "POST", body: JSON.stringify({ documentId }) }),

  getReactions: (documentId: string) => request<{ likeCount: number; likedByMe: boolean }>(`/documents/${documentId}/reactions`),
  like: (documentId: string) => request<{ success?: boolean }>(`/documents/${documentId}/reactions`, { method: "POST", body: JSON.stringify({ type: "like" }) }),
  unlike: (documentId: string) => request<{ success?: boolean }>(`/documents/${documentId}/reactions`, { method: "DELETE" }),
  getComments: (documentId: string) => request<Array<{ id: string; content: string; createdAt: string; authorId: string }>>(`/documents/${documentId}/comments`),
  addComment: (documentId: string, content: string) => request<{ id: string }>(`/documents/${documentId}/comments`, { method: "POST", body: JSON.stringify({ content }) }),

  getDashboardStats: () => request<{ totalDocuments: number; myDocuments: number; recentEditedDocuments: Array<{ id: string; title: string; updatedAt: string }>; uploadTrend: { points: Array<{ label: string; userName: string; count: number }> } }>("/stats/dashboard"),
  getMyStats: () => request<{ uploadedFileCount: number; recentUploads: Array<{ documentId: string; title: string }>; myUploadTrend: { points: Array<{ label: string; count: number }> } }>("/stats/mypage"),
};
