import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Heart, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { mockApi } from "@/lib/mock-api";
import type { Document } from "@/types/document";
import { storage } from "@/lib/storage";
import { mockUsers } from "@/data/mock-users";
import { useAuth } from "@/hooks/useAuth";

type DocMeta = { likes: number; comments: Array<{ id: string; text: string; createdAt: string; authorName: string; authorAvatar?: string }> };

export function DocumentViewPage() {
  const { documentId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [doc, setDoc] = useState<Document | null>(null);
  const [comment, setComment] = useState("");
  const [meta, setMeta] = useState<DocMeta>({ likes: 0, comments: [] });

  useEffect(() => {
    if (!documentId) return;
    mockApi.getDocumentById(documentId).then((d) => {
      if (!d) return;
      setDoc(d);
      const all = storage.get<Record<string, DocMeta>>("gap-doc-meta", {});
      setMeta(all[documentId] ?? { likes: 0, comments: [] });
    });
  }, [documentId]);

  const saveMeta = (next: DocMeta) => {
    if (!documentId) return;
    const all = storage.get<Record<string, DocMeta>>("gap-doc-meta", {});
    all[documentId] = next;
    storage.set("gap-doc-meta", all);
    setMeta(next);
  };

  if (!doc) return <div>문서를 찾을 수 없습니다.</div>;
  const owner = mockUsers.find((u) => u.id === doc.ownerId);

  return <div className="space-y-4">
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{doc.title}</h2>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
            <img src={owner?.avatarUrl ?? "https://i.pravatar.cc/40?img=8"} alt={doc.ownerName} className="h-6 w-6 rounded-full" />
            <span>작성자 {doc.ownerName} · {new Date(doc.updatedAt).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => nav(`/documents/${doc.id}/edit`)}><Pencil size={14}/>수정</Button>
          <Button className="bg-red-600" onClick={async () => { await mockApi.deleteDocument(doc.id); nav("/documents"); }}><Trash2 size={14}/>삭제</Button>
        </div>
      </div>
      <div className="mt-4 whitespace-pre-wrap rounded-lg border border-line p-4 text-sm dark:border-slate-700">
        {doc.contentText || "내용이 없습니다."}
      </div>
    </Card>

    <Card>
      <div className="flex items-center gap-2">
        <button type="button" className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1 text-sm dark:border-slate-700" onClick={() => saveMeta({ ...meta, likes: meta.likes + 1 })}><Heart size={14}/>공감 {meta.likes}</button>
      </div>
      <div className="mt-4">
        <h3 className="mb-2 font-semibold">댓글</h3>
        <div className="mb-3 flex gap-2">
          <input value={comment} onChange={(e) => setComment(e.target.value)} className="w-full rounded-md border border-line px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-700" placeholder="댓글을 입력하세요" />
          <Button onClick={() => {
            if (!comment.trim()) return;
            saveMeta({ ...meta, comments: [...meta.comments, { id: `c-${Date.now()}`, text: comment.trim(), createdAt: new Date().toISOString(), authorName: user?.name ?? "사용자", authorAvatar: user?.avatarUrl }] });
            setComment("");
          }}><MessageSquare size={14}/>등록</Button>
        </div>
        <ul className="space-y-2 text-sm">
          {meta.comments.map((c) => <li key={c.id} className="rounded-md border border-line p-2 dark:border-slate-700"><div className="flex items-start gap-2"><img src={c.authorAvatar ?? "https://i.pravatar.cc/40?img=6"} alt={c.authorName} className="mt-0.5 h-5 w-5 rounded-full" /><div><div className="text-xs text-slate-500 dark:text-slate-300">{c.authorName}</div><div>{c.text}</div></div></div></li>)}
        </ul>
      </div>
    </Card>
  </div>;
}
