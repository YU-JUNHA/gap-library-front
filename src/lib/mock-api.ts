import { mockDocuments } from "@/data/mock-documents";
import { mockUsers } from "@/data/mock-users";
import { storage } from "@/lib/storage";
import { extractTextFromBlocks } from "@/lib/document-utils";
import type { User } from "@/types/user";
import type { Document } from "@/types/document";

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

const getDocs = () => {
  const existing = storage.get<Document[]>(storage.keys.docs, []);
  if (existing.length) return existing;
  storage.set(storage.keys.docs, mockDocuments);
  return mockDocuments;
};

export const mockApi = {
  async login(email: string, password: string): Promise<User> {
    await delay();
    const user = mockUsers.find((u) => u.email === email);
    if (!user || password.length < 4) throw new Error("이메일 또는 비밀번호를 확인해주세요.");
    storage.set(storage.keys.auth, user);
    return user;
  },
  async register(payload: { name: string; email: string; password: string; inviteCode: string }): Promise<User> {
    await delay();
    if (!payload.inviteCode.trim()) throw new Error("초대 코드를 입력해주세요.");
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: payload.name,
      email: payload.email,
      role: "member",
      organization: "GAP",
      createdAt: new Date().toISOString(),
    };
    storage.set(storage.keys.auth, newUser);
    return newUser;
  },
  async logout() {
    await delay(100);
    storage.remove(storage.keys.auth);
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
