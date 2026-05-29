import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { FileText, Home, LogOut, Settings, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";

const items = [
  { to: "/", label: "메인", icon: Home },
  { to: "/documents", label: "문서 자료실", icon: FileText },
  { to: "/mypage", label: "마이페이지", icon: User },
  { to: "/settings", label: "설정", icon: Settings },
];

const pageTitle = (path: string) => {
  if (path.startsWith("/documents/")) return "문서 편집";
  if (path === "/documents") return "문서 자료실";
  if (path === "/mypage") return "마이페이지";
  if (path === "/settings") return "설정";
  return "대시보드";
};

export function AppLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-line bg-white p-4">
        <Link to="/" className="mb-6 block text-lg font-semibold">GAP Library</Link>
        <div className="space-y-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-600"}`}>
              <Icon size={16} />{label}
            </NavLink>
          ))}
        </div>
        <div className="mt-8 text-xs text-slate-500">최근 문서 · 내 문서</div>
        <div className="mt-auto pt-8">
          <div className="card p-3 text-sm">
            <div className="font-medium">{user?.name}</div>
            <div className="text-xs text-slate-500">{user?.email}</div>
            <button className="mt-2 inline-flex items-center gap-1 text-xs text-red-500" onClick={async () => { await logout(); nav('/login'); }}><LogOut size={14}/>로그아웃</button>
          </div>
        </div>
      </aside>
      <main className="flex-1">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-white px-6 py-4">
          <h1 className="min-w-28 text-lg font-semibold">{pageTitle(location.pathname)}</h1>
          <Input placeholder="문서 검색" className="max-w-sm" />
        </header>
        <div className="p-6"><Outlet /></div>
      </main>
    </div>
  );
}
