import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function PublicRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="p-8">로딩 중...</div>;
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}
