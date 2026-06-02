import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { getAvatarSrc } from "@/lib/avatar";

export function MyPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{ uploadedFileCount: number; recentUploads: Array<{ documentId: string; title: string }>; myUploadTrend: { points: Array<{ label: string; count: number }> } } | null>(null);
  useEffect(() => {
    api.getMyStats().then(setStats).catch(() => setStats(null));
  }, []);

  return <div className="space-y-4">
    <Card>
      <h3 className="font-semibold">사용자 프로필</h3>
      <div className="mt-3 flex items-center gap-3">
        <img src={getAvatarSrc(user?.avatarUrl)} alt={user?.name} className="h-14 w-14 rounded-full" />
        <div className="text-sm">
          <div>이름: {user?.name}</div>
          <div>이메일: {user?.email}</div>
          <div>역할: {user?.role}</div>
          <div>조직: {user?.organization}</div>
        </div>
      </div>
      <Link to="/mypage/edit" className="mt-3 inline-block text-sm text-slate-700 underline dark:text-slate-200">프로필 정보 변경</Link>
    </Card>

    <Card>
      <h3 className="font-semibold">업로드 파일 수</h3>
      <div className="mt-2 text-2xl font-bold">{stats?.uploadedFileCount ?? 0}</div>
    </Card>

    <Card>
      <h3 className="font-semibold">최근 업로드 파일 목록</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {(stats?.recentUploads ?? []).map((d) => <li key={d.documentId}><Link to={`/documents/${d.documentId}`} className="hover:underline">{d.title}</Link></li>)}
      </ul>
    </Card>

    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">기간별 업로드 수</h3>
      </div>
      <div className="flex items-end gap-2">
        {(stats?.myUploadTrend.points ?? []).map((point, i) => (
          <div key={i} className="flex-1">
            <div className="rounded-t bg-slate-800 dark:bg-slate-300" style={{ height: `${point.count * 8}px` }} />
            <div className="mt-1 text-center text-xs">{i + 1}</div>
          </div>
        ))}
      </div>
    </Card>
  </div>;
}
