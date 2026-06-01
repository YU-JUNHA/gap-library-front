import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { mockApi } from "@/lib/mock-api";
import type { User } from "@/types/user";
import type { SignupRequest } from "@/types/admin";

export function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [u, r] = await Promise.all([mockApi.getUsers(), mockApi.getSignupRequests()]);
    setUsers(u);
    setRequests(r);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const changeRole = async (userId: string, role: User["role"]) => {
    await mockApi.updateUserRole(userId, role);
    await load();
  };

  const approve = async (requestId: string) => {
    await mockApi.approveSignupRequest(requestId);
    await load();
  };

  const reject = async (requestId: string) => {
    await mockApi.rejectSignupRequest(requestId);
    await load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">관리자 페이지</h1>
      <Card>
        <h2 className="mb-3 text-lg font-semibold">회원가입 요청 승인</h2>
        {loading ? (
          <div>불러오는 중...</div>
        ) : requests.length === 0 ? (
          <div className="text-sm text-slate-500 dark:text-slate-300">대기 중인 가입 요청이 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-3 dark:border-slate-700">
                <div className="min-w-[220px]">
                  <div className="font-medium">{req.name}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-300">{req.email}</div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-300">요청일: {new Date(req.requestedAt).toLocaleString()}</div>
                <div className="ml-auto flex gap-2">
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => approve(req.id)}>승인</Button>
                  <Button className="bg-red-600 hover:bg-red-700" onClick={() => reject(req.id)}>거절</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">사용자 역할 변경</h2>
        {loading ? (
          <div>불러오는 중...</div>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-3 dark:border-slate-700">
                <img src={u.avatarUrl ?? "https://i.pravatar.cc/40?img=9"} alt={u.name} className="h-8 w-8 rounded-full" />
                <div className="min-w-[220px]">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-300">{u.email}</div>
                </div>
                <select
                  className="rounded-lg border border-line bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700"
                  value={u.role}
                  onChange={(e) => changeRole(u.id, e.target.value as User["role"])}
                >
                  <option value="admin">admin</option>
                  <option value="member">member</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

