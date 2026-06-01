import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useDocuments } from "@/hooks/useDocuments";

const uploadStats = {
  week: [
    { user: "GAP 관리자", count: 5 },
    { user: "운영팀 김민수", count: 3 },
    { user: "교육팀 박하나", count: 4 },
  ],
  month: [
    { user: "GAP 관리자", count: 18 },
    { user: "운영팀 김민수", count: 12 },
    { user: "교육팀 박하나", count: 15 },
  ],
  year: [
    { user: "GAP 관리자", count: 120 },
    { user: "운영팀 김민수", count: 82 },
    { user: "교육팀 박하나", count: 96 },
  ],
};

export function DashboardPage() {
  const { user } = useAuth();
  const { documents } = useDocuments();
  const [range, setRange] = useState<"week" | "month" | "year">("week");

  const myDocs = documents.filter((d) => d.ownerId === user?.id);
  const recentEdited = useMemo(
    () => [...documents].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 6),
    [documents],
  );

  return <div className="space-y-6">
    <h2 className="text-2xl font-bold">안녕하세요, {user?.name}님</h2>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>전체 문서 수 <div className="mt-2 text-2xl font-bold">{documents.length}</div></Card>
      <Card>내 문서 수 <div className="mt-2 text-2xl font-bold">{myDocs.length}</div></Card>
    </div>
    <Card>
      <h3 className="font-semibold">최근 편집 문서 목록</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {recentEdited.map((d) => (
          <li key={d.id}>
            <Link to={`/documents/${d.id}`} className="text-slate-700 hover:underline dark:text-slate-200">{d.title}</Link>
          </li>
        ))}
      </ul>
    </Card>
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">기간별 사용자 문서 업로드 수</h3>
        <select className="rounded-lg border border-line bg-white px-2 py-1 text-sm dark:bg-slate-700" value={range} onChange={(e) => setRange(e.target.value as "week" | "month" | "year")}>
          <option value="week">주</option>
          <option value="month">월</option>
          <option value="year">년</option>
        </select>
      </div>
      <div className="space-y-3">
        {uploadStats[range].map((row) => (
          <div key={row.user}>
            <div className="mb-1 flex justify-between text-sm"><span>{row.user}</span><span>{row.count}개</span></div>
            <div className="h-3 rounded bg-slate-200 dark:bg-slate-700"><div className="h-3 rounded bg-slate-800 dark:bg-slate-300" style={{ width: `${Math.min(100, row.count)}%` }} /></div>
          </div>
        ))}
      </div>
    </Card>
  </div>;
}
