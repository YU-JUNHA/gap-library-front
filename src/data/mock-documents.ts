import type { Document } from "@/types/document";

const now = new Date().toISOString();
const p = (text: string) => [{ type: "paragraph", content: text }];

export const mockDocuments: Document[] = [
  "GAP 운영 매뉴얼",
  "회의록 샘플",
  "교육 자료 정리",
  "프로젝트 자료 아카이브",
  "AI 활용 가이드",
].map((title, i) => ({
  id: `doc-${i + 1}`,
  title,
  content: p(`${title} 문서입니다.`),
  contentText: `${title} 문서입니다.`,
  tags: ["GAP", "내부"],
  category: i % 2 ? "회의" : "운영",
  ownerId: "user-1",
  ownerName: "GAP 관리자",
  createdAt: now,
  updatedAt: now,
  status: "draft",
}));
