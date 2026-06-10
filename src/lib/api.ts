import { storage } from "@/lib/storage";
import type { Document } from "@/types/document";
import type { User } from "@/types/user";
import type { SignupRequest } from "@/types/admin";
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000/api/v1";
const AUTH_FORCED_LOGOUT_EVENT = "gap-auth-forced-logout";

type ApiEnvelope<T> = { data: T; meta?: { page: number; pageSize: number; total: number } };
type PagedMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};
type PagedResponse<T> = { data: T[]; meta: PagedMeta };
type DocumentListQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  sort?: "createdAt" | "updatedAt" | "author";
  order?: "asc" | "desc";
  categoryId?: string | null;
  uncategorized?: boolean;
  status?: "draft" | "published" | "archived";
};
type TrendUnit = "week" | "month" | "year";
type SpellCheckIssue = {
  type: "spacing" | "correction";
  original: string;
  suggestion: string;
  start: number;
  end: number;
};
type SpellCheckSection = {
  originalText: string;
  correctedText: string;
  issues: SpellCheckIssue[];
};
type SpellCheckResult = {
  title: SpellCheckSection;
  body: SpellCheckSection;
  summary: { issueCount: number };
};

type ValidationIssue = {
  field?: string;
  message?: string;
  msg?: string;
  path?: string | string[];
  loc?: Array<string | number>;
};

function buildQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function fetchWithAuth(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const accessToken = storage.get<string | null>(storage.keys.accessToken, null);
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401 && retry) {
    const refreshed = await refreshToken();
    if (refreshed) return fetchWithAuth(path, init, false);
    forceLogoutIfNeeded(path);
  }
  return res;
}

function prettifyFieldName(field: string) {
  const normalized = field.replace(/\.\d+\./g, ".").replace(/\[\d+\]/g, "");
  const fieldMap: Record<string, string> = {
    name: "이름",
    email: "이메일",
    password: "비밀번호",
    confirmPassword: "비밀번호 확인",
    title: "제목",
    content: "내용",
  };
  return fieldMap[normalized] ?? normalized;
}

function extractValidationIssues(payload: any): ValidationIssue[] {
  const candidates = [
    payload?.error?.details,
    payload?.error?.issues,
    payload?.details,
    payload?.issues,
    payload?.errors,
    payload?.detail,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((issue) => issue && typeof issue === "object");
    }
  }

  return [];
}

function formatValidationIssue(issue: ValidationIssue) {
  const rawField =
    issue.field
    ?? (Array.isArray(issue.path) ? issue.path.join(".") : issue.path)
    ?? (Array.isArray(issue.loc) ? issue.loc.filter((part) => part !== "body").join(".") : undefined);
  const message = issue.message ?? issue.msg;
  if (!rawField && message) return message;
  if (!rawField) return null;

  const fieldLabel = prettifyFieldName(rawField);
  if (!message) return `${fieldLabel} 값을 확인해주세요.`;
  return `${fieldLabel}: ${message}`;
}

function extractApiErrorMessage(payload: any) {
  const directMessage =
    payload?.error?.message
    ?? payload?.message
    ?? (typeof payload?.error === "string" ? payload.error : null)
    ?? (typeof payload?.detail === "string" ? payload.detail : null);

  const issueMessages = extractValidationIssues(payload)
    .map(formatValidationIssue)
    .filter((message): message is string => Boolean(message));

  if (issueMessages.length > 0) {
    return Array.from(new Set(issueMessages)).join("\n");
  }

  if (directMessage && directMessage !== "요청 데이터가 올바르지 않습니다.") {
    return directMessage;
  }

  if (directMessage) return `${directMessage}\n입력한 항목을 다시 확인해주세요.`;
  return "API 요청 중 오류가 발생했습니다.";
}

async function requestEnvelope<T>(path: string, init: RequestInit = {}, retry = true): Promise<ApiEnvelope<T>> {
  const res = await fetchWithAuth(path, init, retry);
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(extractApiErrorMessage(payload));
  }
  return res.json() as Promise<ApiEnvelope<T>>;
}

async function requestPage<T>(path: string, init: RequestInit = {}, retry = true): Promise<PagedResponse<T>> {
  const payload = await requestEnvelope<T[]>(path, init, retry);
  return {
    data: payload.data,
    meta: payload.meta as PagedMeta,
  };
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const payload = await requestEnvelope<T>(path, init, retry);
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

function forceLogoutIfNeeded(path: string) {
  const authPaths = ["/auth/login", "/auth/refresh", "/signup-requests"];
  if (authPaths.some((prefix) => path.startsWith(prefix))) return;

  clearTokens();
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(AUTH_FORCED_LOGOUT_EVENT));
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
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
  register: (payload: { name: string; email: string; password: string }) => request<SignupRequest>("/signup-requests", { method: "POST", body: JSON.stringify(payload) }),
  logout: (refreshTokenValue: string) => request<{ success: boolean }>("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: refreshTokenValue }) }),
  updateProfile: (patch: { name?: string; organization?: string; avatarUrl?: string | null }) => request<User>("/users/me", { method: "PATCH", body: JSON.stringify(patch) }),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    request<{ success: boolean }>("/users/me/password", { method: "PATCH", body: JSON.stringify(payload) }),
  uploadMyAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ avatarUrl: string }>("/users/me/avatar", { method: "POST", body: formData });
  },
  spellCheckDocument: (payload: { title?: string; content: any[] }) =>
    request<SpellCheckResult>("/documents/spell-check", { method: "POST", body: JSON.stringify(payload) }),
  getDocuments: (params: DocumentListQuery = {}) =>
    requestPage<Document>(
      `/documents${buildQuery({
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 9,
        q: params.q?.trim() ?? "",
        sort: params.sort ?? "createdAt",
        order: params.order ?? "desc",
        categoryId: params.categoryId,
        uncategorized: params.uncategorized,
        status: params.status,
      })}`,
    ),
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
  getComments: (documentId: string) =>
    request<
      Array<{
        id: string;
        content: string;
        createdAt: string;
        authorId: string;
        authorName?: string;
        authorAvatarUrl?: string | null;
        authorAvatar?: string | null;
        authorOrganization?: string | null;
      }>
    >(`/documents/${documentId}/comments`),
  addComment: (documentId: string, content: string) => request<{ id: string }>(`/documents/${documentId}/comments`, { method: "POST", body: JSON.stringify({ content }) }),

  getDashboardStats: (draftLimit = 5) =>
    request<{
      totalDocuments: number;
      myDocuments: number;
      recentEditedDocuments: Array<{ id: string; title: string; updatedAt: string }>;
      draftDocuments: Array<{
        id: string;
        title: string;
        updatedAt: string;
        categoryId?: string | null;
        categoryName?: string | null;
        summary?: string | null;
        ownerId?: string;
        ownerName?: string;
      }>;
      uploadTrend: { points: Array<{ label: string; userName: string; count: number }> };
    }>(`/stats/dashboard${buildQuery({ draftLimit })}`),
  getMyStats: (unit: TrendUnit = "month") =>
    request<{
      uploadedFileCount: number;
      recentUploads: Array<{ documentId: string; title: string; updatedAt?: string }>;
      myUploadTrend: { unit: TrendUnit; points: Array<{ label: string; count: number }> };
    }>(`/stats/mypage${buildQuery({ unit })}`),
};
