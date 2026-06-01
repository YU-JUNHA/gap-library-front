import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Folder, Plus } from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

type Category = { id: string; name: string; parentId: string | null };
type CategoryNode = { id: string; name: string; children: CategoryNode[] };

const ROOT_ID = "root";

function buildTree(categories: Category[]): CategoryNode {
  const map = new Map<string, CategoryNode>();
  categories.forEach((c) => map.set(c.id, { id: c.id, name: c.name, children: [] }));
  const root: CategoryNode = { id: ROOT_ID, name: "전체 문서", children: [] };
  categories.forEach((c) => {
    const node = map.get(c.id)!;
    if (!c.parentId || !map.has(c.parentId)) root.children.push(node);
    else map.get(c.parentId)!.children.push(node);
  });
  return root;
}

function findNode(node: CategoryNode, id: string): CategoryNode | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

function findPath(node: CategoryNode, targetId: string, acc: Array<{ id: string; name: string }> = []): Array<{ id: string; name: string }> | null {
  const next = [...acc, { id: node.id, name: node.name }];
  if (node.id === targetId) return next;
  for (const child of node.children) {
    const found = findPath(child, targetId, next);
    if (found) return found;
  }
  return null;
}

export function DocumentsPage() {
  const nav = useNavigate();
  const { documents, loading } = useDocuments();
  const [categories, setCategories] = useState<Category[]>([]);
  const [folderId, setFolderId] = useState(ROOT_ID);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"folder" | "list">("folder");

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const tree = useMemo(() => buildTree(categories), [categories]);
  const currentFolder = useMemo(() => findNode(tree, folderId) ?? tree, [tree, folderId]);
  const breadcrumbs = useMemo(() => findPath(tree, folderId) ?? [{ id: ROOT_ID, name: "전체 문서" }], [tree, folderId]);

  const docsInFolder = useMemo(() => {
    if (folderId === ROOT_ID) return documents.filter((d) => !d.categoryId);
    return documents.filter((d) => d.categoryId === folderId);
  }, [documents, folderId]);

  const filteredDocs = useMemo(
    () => docsInFolder.filter((d) => [d.title, d.summary, d.contentText].join(" ").toLowerCase().includes(q.toLowerCase())),
    [docsInFolder, q],
  );

  const createDocInCurrentFolder = async () => {
    const next = await api.createDocument({
      title: folderId === ROOT_ID ? "새 문서" : `${currentFolder.name} 새 문서`,
      content: [{ type: "paragraph", content: "새 문서를 시작하세요." }],
      status: "draft",
      categoryId: folderId === ROOT_ID ? null : folderId,
    });
    nav(`/documents/${next.id}/edit`);
  };

  const folderEntries = (currentFolder.children ?? [])
    .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
    .map((c) => ({ type: "folder" as const, id: c.id, name: c.name }));
  const fileEntries = filteredDocs.map((d) => ({ type: "doc" as const, doc: d }));
  const entries = [...folderEntries, ...fileEntries];

  return <div className="space-y-4">
    <div className="text-sm text-slate-500 dark:text-slate-300">
      {breadcrumbs.map((b, i) => (
        <button type="button" key={b.id} onClick={() => setFolderId(b.id)} className="mr-1 hover:underline">
          {i > 0 ? "> " : ""}{b.name}
        </button>
      ))}
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <Input placeholder="현재 폴더 검색" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
      <Button className="whitespace-nowrap" onClick={createDocInCurrentFolder}><Plus size={16}/>문서 작성</Button>
      <select className="rounded-lg border border-line bg-white px-3 py-2 text-sm dark:bg-slate-700" value={view} onChange={(e) => setView(e.target.value as "folder" | "list")}>
        <option value="list">세로보기</option>
        <option value="folder">폴더보기</option>
      </select>
    </div>

    {loading ? <div>불러오는 중...</div> : (
      entries.length === 0 ? <Card>현재 폴더에 항목이 없습니다.</Card> : (
        <div className={view === "folder" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
          {entries.map((entry) => {
            if (entry.type === "folder") {
              return (
                <Card key={entry.id} className={view === "folder" ? "h-36 p-0 hover:bg-slate-50 dark:hover:bg-slate-700" : "p-0 hover:bg-slate-50 dark:hover:bg-slate-700"}>
                  <button type="button" className={`flex w-full items-start gap-3 px-4 text-left font-semibold ${view === "folder" ? "h-full pt-4 text-lg" : "py-4 text-base"}`} onClick={() => setFolderId(entry.id)}>
                    <Folder size={24} className="mt-0.5 shrink-0 text-amber-600" />
                    <span className="leading-tight">{entry.name}</span>
                  </button>
                </Card>
              );
            }
            return (
              <Link to={`/documents/${entry.doc.id}`} key={entry.doc.id}>
                <Card className={view === "folder" ? "h-36 hover:bg-slate-50 dark:hover:bg-slate-700" : "hover:bg-slate-50 dark:hover:bg-slate-700"}>
                  <div className="font-semibold">{entry.doc.title}</div>
                  <div className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{entry.doc.summary || entry.doc.contentText?.slice(0, 100)}</div>
                  <div className="mt-3 text-xs text-slate-500 dark:text-slate-300">{new Date(entry.doc.updatedAt).toLocaleString()}</div>
                </Card>
              </Link>
            );
          })}
        </div>
      )
    )}
  </div>;
}
