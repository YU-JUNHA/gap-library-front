export type DocumentStatus = "draft" | "published" | "archived";

export type Document = {
  id: string;
  title: string;
  content: any[];
  contentText?: string;
  summary?: string;
  tags: string[];
  category?: string;
  categoryId?: string | null;
  ownerId: string;
  ownerName?: string;
  ownerAvatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
  status?: DocumentStatus;
  ragStatus?: "pending" | "completed";
};
