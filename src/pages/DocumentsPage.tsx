import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDocuments } from "@/hooks/useDocuments";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CategoryTree, type CategoryNode } from "@/components/documents/CategoryTree";

const categoryTree: CategoryNode[] = [
  {
    id: "cat-ops",
    name: "운영",
    documentIds: ["doc-1"],
    children: [
      { id: "cat-ops-manual", name: "매뉴얼", documentIds: ["doc-5"] },
      { id: "cat-ops-project", name: "프로젝트", documentIds: ["doc-4"] },
    ],
  },
  {
    id: "cat-meeting",
    name: "회의",
    documentIds: ["doc-2"],
    children: [{ id: "cat-meeting-edu", name: "교육", documentIds: ["doc-3"] }],
  },
];

export function DocumentsPage() {
  const nav = useNavigate();
  const { documents, loading } = useDocuments();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => documents.filter((d) => {
    const hit = [d.title, d.summary, d.contentText, d.category, ...d.tags].join(" ").toLowerCase().includes(q.toLowerCase());
    const s = status === "all" || d.status === status;
    return hit && s;
  }), [documents, q, status]);

  return <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
    <CategoryTree
      tree={categoryTree}
      documents={documents}
      onSelectDocument={(id) => nav(`/documents/${id}`)}
    />
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="문서 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded-lg border border-line px-3" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">전체 상태</option><option value="draft">초안</option><option value="published">발행</option><option value="archived">보관</option>
        </select>
      </div>
      {loading ? <div>불러오는 중...</div> : filtered.length === 0 ? <Card>문서가 없습니다.</Card> :
        <div className="grid gap-3">{filtered.map((d) => <Link to={`/documents/${d.id}`} key={d.id}><Card className="hover:bg-slate-50"><div className="font-semibold">{d.title}</div><div className="mt-1 text-sm text-slate-600">{d.summary || d.contentText.slice(0, 100)}</div><div className="mt-2 flex gap-2">{d.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div><div className="mt-2 text-xs text-slate-500">{d.ownerName} · {new Date(d.updatedAt).toLocaleString()}</div></Card></Link>)}</div>}
    </div>
  </div>;
}
