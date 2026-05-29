export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  organization: string;
  avatarUrl?: string;
  createdAt: string;
};
