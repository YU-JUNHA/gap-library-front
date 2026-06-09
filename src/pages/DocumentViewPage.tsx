import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Heart, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import type { Document } from "@/types/document";
import { useAuth } from "@/hooks/useAuth";
import { getAvatarSrc } from "@/lib/avatar";

type ApiComment = {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName?: string;
  authorAvatarUrl?: string | null;
  authorAvatar?: string | null;
  authorOrganization?: string | null;
};

type DocComment = {
  id: string;
  text: string;
  createdAt: string;
  authorName: string;
  authorAvatar?: string;
  authorOrganization?: string;
};

type DocMeta = {
  likes: number;
  likedByMe: boolean;
  comments: DocComment[];
};

function toDocComment(comment: ApiComment): DocComment {
  return {
    id: comment.id,
    text: comment.content,
    createdAt: comment.createdAt,
    authorName: comment.authorName ?? comment.authorId,
    authorAvatar: comment.authorAvatarUrl ?? comment.authorAvatar ?? undefined,
    authorOrganization: comment.authorOrganization ?? undefined,
  };
}

export function DocumentViewPage() {
  const { documentId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [doc, setDoc] = useState<Document | null>(null);
  const [comment, setComment] = useState("");
  const [meta, setMeta] = useState<DocMeta>({ likes: 0, likedByMe: false, comments: [] });

  useEffect(() => {
    let active = true;

    async function load() {
      if (!documentId) return;

      const d = await api.getDocumentById(documentId);
      if (!d || !active) return;
      setDoc(d);

      const [reactions, comments] = await Promise.all([
        api.getReactions(documentId),
        api.getComments(documentId),
      ]);

      if (!active) return;

      setMeta({
        likes: reactions.likeCount,
        likedByMe: reactions.likedByMe,
        comments: comments.map(toDocComment),
      });
    }

    load();

    return () => {
      active = false;
    };
  }, [documentId]);

  const likeButtonClassName = useMemo(
    () =>
      meta.likedByMe
        ? "inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        : "inline-flex items-center gap-1 rounded-md border border-line px-3 py-1 text-sm dark:border-slate-700",
    [meta.likedByMe],
  );

  if (!doc) return <div>문서를 찾을 수 없습니다.</div>;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-line px-5 py-4 dark:border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[28px] font-semibold tracking-tight text-slate-950 dark:text-slate-50">{doc.title}</h2>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
                <img
                  src={getAvatarSrc(doc.ownerAvatarUrl || user?.avatarUrl)}
                  alt={doc.ownerName ?? doc.ownerId}
                  className="h-6 w-6 rounded-full"
                />
                <span>
                  작성자 {doc.ownerName ?? doc.ownerId} · {new Date(doc.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button onClick={() => nav(`/documents/${doc.id}/edit`)}>
                <Pencil size={14} />
                수정
              </Button>
              <Button
                className="bg-red-600"
                onClick={async () => {
                  await api.deleteDocument(doc.id);
                  nav("/documents");
                }}
              >
                <Trash2 size={14} />
                삭제
              </Button>
            </div>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">
            {doc.contentText || "내용이 없습니다."}
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={meta.likedByMe}
            className={likeButtonClassName}
            onClick={async () => {
              if (!documentId) return;
              if (meta.likedByMe) await api.unlike(documentId);
              else await api.like(documentId);
              const next = await api.getReactions(documentId);
              setMeta((prev) => ({ ...prev, likes: next.likeCount, likedByMe: next.likedByMe }));
            }}
          >
            <Heart size={14} fill={meta.likedByMe ? "currentColor" : "none"} />
            공감 {meta.likes}
          </button>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 font-semibold">댓글</h3>
          <div className="mb-3 flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-700"
              placeholder="댓글을 입력하세요"
            />
            <Button
              onClick={async () => {
                if (!comment.trim()) return;
                if (!documentId) return;
                await api.addComment(documentId, comment.trim());
                const comments = await api.getComments(documentId);
                setMeta((prev) => ({
                  ...prev,
                  comments: comments.map(toDocComment),
                }));
                setComment("");
              }}
            >
              <MessageSquare size={14} />
              등록
            </Button>
          </div>

          <ul className="space-y-2 text-sm">
            {meta.comments.map((c) => (
              <li key={c.id} className="rounded-md border border-line p-2 dark:border-slate-700">
                <div className="flex items-start gap-2">
                  <img src={getAvatarSrc(c.authorAvatar)} alt={c.authorName} className="mt-0.5 h-5 w-5 rounded-full" />
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">
                      {c.authorName}
                      {c.authorOrganization ? ` · ${c.authorOrganization}` : ""}
                    </div>
                    <div>{c.text}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
