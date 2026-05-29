import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useDocuments } from "@/hooks/useDocuments";

export function DashboardPage() {
  const { user } = useAuth();
  const { documents } = useDocuments();
  const myDocs = documents.filter((d) => d.ownerId === user?.id);
  const recent = useMemo(
    () =>
      [...documents]
        .filter((d) => d.lastOpenedAt || d.updatedAt)
        .sort(
          (a, b) =>
            +new Date(b.lastOpenedAt ?? b.updatedAt) -
            +new Date(a.lastOpenedAt ?? a.updatedAt),
        )
        .slice(0, 5),
    [documents],
  );

  return <div className="space-y-6">
    <h2 className="text-2xl font-bold">안녕하세요, {user?.name}님</h2>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card>전체 문서 수 <div className="mt-2 text-2xl font-bold">{documents.length}</div></Card>
      <Card>내 문서 수 <div className="mt-2 text-2xl font-bold">{myDocs.length}</div></Card>
      <Card>최근 열람 문서 수 <div className="mt-2 text-2xl font-bold">{recent.length}</div></Card>
    </div>
    <Card>
      <h3 className="font-semibold">최근 열람 문서</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {recent.map((d) => <li key={d.id}>{d.title}</li>)}
      </ul>
    </Card>
  </div>;
}
