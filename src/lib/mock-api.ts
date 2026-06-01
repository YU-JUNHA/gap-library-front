import { mockDocuments } from "@/data/mock-documents";
import { mockUsers } from "@/data/mock-users";
import { storage } from "@/lib/storage";
import { extractTextFromBlocks } from "@/lib/document-utils";
import type { User } from "@/types/user";
import type { Document } from "@/types/document";
import type { SignupRequest } from "@/types/admin";

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

const getDocs = () => {
  const existing = storage.get<Document[]>(storage.keys.docs, []);
  if (existing.length) return existing;
  storage.set(storage.keys.docs, mockDocuments);
  return mockDocuments;
};

const getUsers = () => {
  const existing = storage.get<User[]>(storage.keys.users, []);
  if (existing.length) return existing;
  storage.set(storage.keys.users, mockUsers);
  return mockUsers;
};

const getSignupRequests = () => storage.get<SignupRequest[]>(storage.keys.signupRequests, []);

export const mockApi = {
  async login(email: string, password: string): Promise<User> {
    await delay();
    const user = getUsers().find((u) => u.email === email);
    if (!user || password.length < 4) throw new Error("이메일 또는 비밀번호를 확인해주세요.");
    storage.set(storage.keys.auth, user);
    return user;
  },
  async register(payload: { name: string; email: string; password: string; inviteCode: string }): Promise<void> {
    await delay();
    if (!payload.inviteCode.trim()) throw new Error("초대 코드를 입력해주세요.");
    const users = getUsers();
    const hasUser = users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase());
    if (hasUser) throw new Error("이미 가입된 이메일입니다.");
    const requests = getSignupRequests();
    const hasRequest = requests.some((r) => r.email.toLowerCase() === payload.email.toLowerCase());
    if (hasRequest) throw new Error("이미 가입 승인 대기 중인 이메일입니다.");

    const req: SignupRequest = {
      id: `req-${Date.now()}`,
      name: payload.name,
      email: payload.email,
      password: payload.password,
      inviteCode: payload.inviteCode,
      organization: "GAP",
      requestedAt: new Date().toISOString(),
    };
    storage.set(storage.keys.signupRequests, [req, ...requests]);
  },
  async logout() {
    await delay(100);
    storage.remove(storage.keys.auth);
  },
  async updateProfile(patch: Partial<User>): Promise<User | null> {
    await delay(100);
    const current = storage.get<User | null>(storage.keys.auth, null);
    if (!current) return null;
    const next = { ...current, ...patch };
    storage.set(storage.keys.auth, next);
    storage.set(storage.keys.users, getUsers().map((u) => (u.id === current.id ? next : u)));
    return next;
  },
  async getUsers() {
    await delay(120);
    return getUsers();
  },
  async updateUserRole(userId: string, role: User["role"]) {
    await delay(120);
    const users = getUsers().map((u) => (u.id === userId ? { ...u, role } : u));
    storage.set(storage.keys.users, users);
    const current = storage.get<User | null>(storage.keys.auth, null);
    if (current && current.id === userId) storage.set(storage.keys.auth, { ...current, role });
    return users;
  },
  async getSignupRequests() {
    await delay(120);
    return getSignupRequests();
  },
  async approveSignupRequest(requestId: string) {
    await delay(150);
    const requests = getSignupRequests();
    const target = requests.find((r) => r.id === requestId);
    if (!target) throw new Error("가입 요청을 찾을 수 없습니다.");
    const user: User = {
      id: `user-${Date.now()}`,
      name: target.name,
      email: target.email,
      role: "member",
      organization: target.organization ?? "GAP",
      createdAt: new Date().toISOString(),
    };
    storage.set(storage.keys.users, [user, ...getUsers()]);
    storage.set(storage.keys.signupRequests, requests.filter((r) => r.id !== requestId));
    return user;
  },
  async rejectSignupRequest(requestId: string) {
    await delay(120);
    storage.set(storage.keys.signupRequests, getSignupRequests().filter((r) => r.id !== requestId));
  },
  async getDocuments() {
    await delay(150);
    return getDocs();
  },
  async getDocumentById(id: string) {
    await delay(100);
    return getDocs().find((d) => d.id === id) ?? null;
  },
  async saveDocument(input: Document) {
    await delay(150);
    const docs = getDocs();
    const next = docs.some((d) => d.id === input.id)
      ? docs.map((d) => (d.id === input.id ? input : d))
      : [input, ...docs];
    storage.set(storage.keys.docs, next);
    return input;
  },
  async deleteDocument(id: string) {
    await delay(120);
    const docs = getDocs().filter((d) => d.id !== id);
    storage.set(storage.keys.docs, docs);
  },
  createNewDocument(owner: User): Document {
    const now = new Date().toISOString();
    return {
      id: `doc-${Date.now()}`,
      title: "새 문서",
      content: [{ type: "paragraph", content: "새 문서를 시작하세요." }],
      contentText: "새 문서를 시작하세요.",
      tags: [],
      ownerId: owner.id,
      ownerName: owner.name,
      createdAt: now,
      updatedAt: now,
      status: "draft",
      ragStatus: "pending",
    };
  },
  patchDocument(doc: Document, patch: Partial<Document>) {
    const merged = { ...doc, ...patch, updatedAt: new Date().toISOString() };
    if (patch.content) merged.contentText = extractTextFromBlocks(patch.content);
    return merged;
  },
};
