import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocuments } from "@/hooks/useDocuments";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";

export function MyPage() {
  const { user } = useAuth();
  const { documents } = useDocuments();
  const [uploads, setUploads] = useState<number[]>([]);
  useEffect(() => {
    api.getMyStats().then((s) => setUploads(s.myUploadTrend.points.map((p) => p.count))).catch(() => setUploads([]));
  }, []);
  const myDocs = documents.filter((d) => d.ownerId === user?.id);

  return <div className="space-y-4">
    <Card>
      <h3 className="font-semibold">사용자 프로필</h3>
      <div className="mt-3 flex items-center gap-3">
        <img src={user?.avatarUrl ?? "https://i.pravatar.cc/100?img=10"} alt={user?.name} className="h-14 w-14 rounded-full" />
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
      <div className="mt-2 text-2xl font-bold">{myDocs.length}</div>
    </Card>

    <Card>
      <h3 className="font-semibold">최근 업로드 파일 목록</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {myDocs.slice(0, 6).map((d) => <li key={d.id}><Link to={`/documents/${d.id}`} className="hover:underline">{d.title}</Link></li>)}
      </ul>
    </Card>

    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">기간별 업로드 수</h3>
      </div>
      <div className="flex items-end gap-2">
        {uploads.map((v, i) => (
          <div key={i} className="flex-1">
            <div className="rounded-t bg-slate-800 dark:bg-slate-300" style={{ height: `${v * 8}px` }} />
            <div className="mt-1 text-center text-xs">{i + 1}</div>
          </div>
        ))}
      </div>
    </Card>
  </div>;
}
