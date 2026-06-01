import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { FileText, FolderTree, Home, LogOut, Moon, NotebookPen, Shield, Sun, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

const items = [
  { to: "/", label: "메인", icon: Home },
  { to: "/documents", label: "문서 자료실", icon: FileText },
  { to: "/categories", label: "카테고리 관리", icon: FolderTree },
  { to: "/templates", label: "서식 관리", icon: NotebookPen },
  { to: "/mypage", label: "마이페이지", icon: User },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [theme, setTheme] = useState<"light" | "dark">((localStorage.getItem("gap-theme") as "light" | "dark") ?? "light");

  useEffect(() => {
    localStorage.setItem("gap-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <aside className="w-64 border-r border-line bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <Link to="/" className="mb-6 block text-lg font-semibold">GAP Library</Link>
        <div className="space-y-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isActive ? "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100" : "text-slate-600 dark:text-slate-300"}`}>
              <Icon size={16} />{label}
            </NavLink>
          ))}
          {user?.role === "admin" ? (
            <NavLink to="/admin" className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${isActive ? "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100" : "text-slate-600 dark:text-slate-300"}`}>
              <Shield size={16} />관리자
            </NavLink>
          ) : null}
        </div>
        <div className="mt-8 text-xs text-slate-500 dark:text-slate-400">최근 문서 · 내 문서</div>
        <div className="mt-auto pt-8">
          <Button className="mb-2 w-full bg-slate-700" onClick={() => setTheme((prev) => prev === "light" ? "dark" : "light")}>
            {theme === "light" ? <Moon size={16}/> : <Sun size={16}/>}
            {theme === "light" ? "다크모드" : "라이트모드"}
          </Button>
          <div className="card p-3 text-sm">
            <div className="font-medium">{user?.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-300">{user?.email}</div>
            <button className="mt-2 inline-flex items-center gap-1 text-xs text-red-500" onClick={async () => { await logout(); nav("/login"); }}><LogOut size={14}/>로그아웃</button>
          </div>
        </div>
      </aside>
      <main className="flex-1">
        <div className="p-6"><Outlet /></div>
      </main>
    </div>
  );
}
