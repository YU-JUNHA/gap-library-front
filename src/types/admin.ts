export type SignupRequest = {
  id: string;
  name: string;
  email: string;
  password?: string;
  inviteCode?: string;
  organization?: string;
  status?: "pending" | "approved" | "rejected";
  requestedAt: string;
};
