import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Heart, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import type { Document } from "@/types/document";
import { useAuth } from "@/hooks/useAuth";

type DocMeta = { likes: number; likedByMe: boolean; comments: Array<{ id: string; text: string; createdAt: string; authorName: string; authorAvatar?: string }> };

export function DocumentViewPage() {
  const { documentId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [doc, setDoc] = useState<Document | null>(null);
  const [comment, setComment] = useState("");
  const [meta, setMeta] = useState<DocMeta>({ likes: 0, likedByMe: false, comments: [] });

  useEffect(() => {
    if (!documentId) return;
    api.getDocumentById(documentId).then(async (d) => {
      if (!d) return;
      setDoc(d);
      const [reactions, comments] = await Promise.all([api.getReactions(documentId), api.getComments(documentId)]);
      setMeta({
        likes: reactions.likeCount,
        likedByMe: reactions.likedByMe,
        comments: comments.map((c) => ({ id: c.id, text: c.content, createdAt: c.createdAt, authorName: c.authorId })),
      });
    });
  }, [documentId]);

  if (!doc) return <div>문서를 찾을 수 없습니다.</div>;

  return <div className="space-y-4">
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{doc.title}</h2>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
            <img src={user?.avatarUrl ?? "https://i.pravatar.cc/40?img=8"} alt={doc.ownerName} className="h-6 w-6 rounded-full" />
            <span>작성자 {doc.ownerName} · {new Date(doc.updatedAt).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => nav(`/documents/${doc.id}/edit`)}><Pencil size={14}/>수정</Button>
          <Button className="bg-red-600" onClick={async () => { await api.deleteDocument(doc.id); nav("/documents"); }}><Trash2 size={14}/>삭제</Button>
        </div>
      </div>
      <div className="mt-4 whitespace-pre-wrap rounded-lg border border-line p-4 text-sm dark:border-slate-700">
        {doc.contentText || "내용이 없습니다."}
      </div>
    </Card>

    <Card>
      <div className="flex items-center gap-2">
        <button type="button" className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1 text-sm dark:border-slate-700" onClick={async () => {
          if (!documentId) return;
          if (meta.likedByMe) await api.unlike(documentId); else await api.like(documentId);
          const next = await api.getReactions(documentId);
          setMeta((prev) => ({ ...prev, likes: next.likeCount, likedByMe: next.likedByMe }));
        }}><Heart size={14}/>공감 {meta.likes}</button>
      </div>
      <div className="mt-4">
        <h3 className="mb-2 font-semibold">댓글</h3>
        <div className="mb-3 flex gap-2">
          <input value={comment} onChange={(e) => setComment(e.target.value)} className="w-full rounded-md border border-line px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-700" placeholder="댓글을 입력하세요" />
          <Button onClick={async () => {
            if (!comment.trim()) return;
            if (!documentId) return;
            await api.addComment(documentId, comment.trim());
            const comments = await api.getComments(documentId);
            setMeta((prev) => ({ ...prev, comments: comments.map((c) => ({ id: c.id, text: c.content, createdAt: c.createdAt, authorName: c.authorId })) }));
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
