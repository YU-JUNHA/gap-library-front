import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="p-8">로딩 중...</div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
