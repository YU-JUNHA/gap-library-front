import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { storage } from "@/lib/storage";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function SettingsPage() {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name ?? "");

  return <div className="space-y-4">
    <Card><h3 className="font-semibold">프로필 설정</h3><div className="mt-2 space-y-2"><Input value={name} onChange={(e) => setName(e.target.value)} /><div className="text-sm text-slate-500">이메일: {user?.email}</div></div></Card>
    <Card><h3 className="font-semibold">화면 설정</h3><select className="mt-2 rounded-lg border border-line px-3 py-2"><option>기본 테마</option><option>라이트</option></select></Card>
    <Card><h3 className="font-semibold">알림 설정</h3><label className="mt-2 block text-sm"><input type="checkbox" className="mr-2" defaultChecked/>업데이트 알림 받기</label></Card>
    <Card><h3 className="font-semibold">데이터 관리</h3><Button className="mt-2 bg-red-600" onClick={() => storage.clearAll()}>localStorage 초기화</Button></Card>
    <Card><h3 className="font-semibold">계정 관리</h3><Button className="mt-2" onClick={logout}>로그아웃</Button></Card>
  </div>;
}
