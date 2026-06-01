import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { AdminRoute } from "@/routes/AdminRoute";
import { PublicRoute } from "@/routes/PublicRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DocumentsPage } from "@/pages/DocumentsPage";
import { DocumentViewPage } from "@/pages/DocumentViewPage";
import { DocumentDetailPage } from "@/pages/DocumentDetailPage";
import { MyPage } from "@/pages/MyPage";
import { ProfileEditPage } from "@/pages/ProfileEditPage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { TemplatesPage } from "@/pages/TemplatesPage";
import { AdminPage } from "@/pages/AdminPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="documents/:documentId" element={<DocumentViewPage />} />
          <Route path="documents/:documentId/edit" element={<DocumentDetailPage />} />
          <Route path="mypage" element={<MyPage />} />
          <Route path="mypage/edit" element={<ProfileEditPage />} />
          <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
