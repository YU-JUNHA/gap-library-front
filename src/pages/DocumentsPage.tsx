import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Folder, Plus } from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { mockApi } from "@/lib/mock-api";
import { useAuth } from "@/hooks/useAuth";
import { mockUsers } from "@/data/mock-users";
import { findFolderById, folderTree, type FolderNode } from "@/data/mock-categories";
import { storage } from "@/lib/storage";

export function DocumentsPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { documents, loading } = useDocuments();
  const [tree] = useState<FolderNode>(() => storage.get<FolderNode>("gap-folder-tree", folderTree));
  const [folderId, setFolderId] = useState("root");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"folder" | "list">("folder");

  const currentFolder = findFolderById(tree, folderId) ?? tree;

  const docsInFolder = useMemo(() => {
    const ids = new Set(currentFolder.documentIds ?? []);
    return documents.filter((d) => ids.has(d.id));
  }, [documents, currentFolder]);

  const filteredDocs = useMemo(
    () => docsInFolder.filter((d) => [d.title, d.summary, d.contentText].join(" ").toLowerCase().includes(q.toLowerCase())),
    [docsInFolder, q],
  );

  const breadcrumbs = useMemo(() => {
    const path: Array<{ id: string; name: string }> = [];
    const walk = (node: FolderNode, targetId: string, acc: Array<{ id: string; name: string }>): boolean => {
      acc.push({ id: node.id, name: node.name });
      if (node.id === targetId) return true;
      for (const child of node.children ?? []) {
        const cloned = [...acc];
        if (walk(child, targetId, cloned)) {
          path.splice(0, path.length, ...cloned);
          return true;
        }
      }
      return false;
    };
    walk(tree, folderId, []);
    return path.length ? path : [{ id: "root", name: "전체 문서" }];
  }, [folderId, tree]);

  const createDocInCategory = async (categoryName: string) => {
    if (!user) return;
    const doc = mockApi.createNewDocument(user);
    const next = mockApi.patchDocument(doc, { category: categoryName, title: `${categoryName} 새 문서` });
    await mockApi.saveDocument(next);
    nav(`/documents/${next.id}/edit`);
  };

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2">
      <div className="text-sm text-slate-500 dark:text-slate-300">{breadcrumbs.map((b, i) => <button type="button" key={b.id} onClick={() => setFolderId(b.id)} className="mr-1 hover:underline">{i > 0 ? "> " : ""}{b.name}</button>)}</div>
      <div className="ml-auto flex items-center gap-2">
        <Input placeholder="현재 폴더 검색" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
        <select className="rounded-lg border border-line bg-white px-3 py-2 text-sm dark:bg-slate-700" value={view} onChange={(e) => setView(e.target.value as "folder" | "list")}>
          <option value="folder">폴더형 보기</option>
          <option value="list">가로 목록 보기</option>
        </select>
        <Button className="whitespace-nowrap" onClick={() => createDocInCategory(currentFolder.name)}><Plus size={16}/>문서 작성</Button>
      </div>
    </div>

    {loading ? <div>불러오는 중...</div> :
      (() => {
        const folderEntries = (currentFolder.children ?? [])
          .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
          .map((c) => ({ type: "folder" as const, id: c.id, name: c.name }));
        const fileEntries = filteredDocs.map((d) => ({ type: "doc" as const, doc: d }));
        const entries = [...folderEntries, ...fileEntries];
        if (entries.length === 0) return <Card>현재 폴더에 항목이 없습니다.</Card>;
        return (
          <div className={view === "folder" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
            {entries.map((entry) => {
              if (entry.type === "folder") {
                return (
                  <Card key={entry.id} className={view === "folder" ? "h-36 p-0 hover:bg-slate-50 dark:hover:bg-slate-700" : "p-0 hover:bg-slate-50 dark:hover:bg-slate-700"}>
                    <button
                      type="button"
                      className={`flex w-full items-start gap-3 px-4 text-left font-semibold ${view === "folder" ? "h-full pt-4 text-lg" : "py-4 text-base"}`}
                      onClick={() => setFolderId(entry.id)}
                    >
                      <Folder size={24} className="mt-0.5 shrink-0 text-amber-600" />
                      <span className="leading-tight">{entry.name}</span>
                    </button>
                  </Card>
                );
              }
              const owner = mockUsers.find((u) => u.id === entry.doc.ownerId);
              return (
                <Link to={`/documents/${entry.doc.id}`} key={entry.doc.id}>
                  <Card className={view === "folder" ? "h-36 hover:bg-slate-50 dark:hover:bg-slate-700" : "hover:bg-slate-50 dark:hover:bg-slate-700"}>
                    <div className="font-semibold">{entry.doc.title}</div>
                    <div className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{entry.doc.summary || entry.doc.contentText.slice(0, 100)}</div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
                      <img src={owner?.avatarUrl ?? "https://i.pravatar.cc/40?img=5"} alt={entry.doc.ownerName} className="h-5 w-5 rounded-full" />
                      <span>{entry.doc.ownerName}</span>
                      <span>·</span>
                      <span>{new Date(entry.doc.updatedAt).toLocaleString()}</span>
                    </div>
                  </Card>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => createDocInCategory(currentFolder.name)}
              className={view === "folder"
                ? "card flex min-h-[112px] items-center justify-center gap-2 border-dashed text-slate-600 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                : "card flex w-full items-center justify-center gap-2 border-dashed py-4 text-slate-600 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"}
            >
              <Plus size={18} />
              <span className="font-medium">추가하기</span>
            </button>
          </div>
        );
      })()}
  </div>;
}
