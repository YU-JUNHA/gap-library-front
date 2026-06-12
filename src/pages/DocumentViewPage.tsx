import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { FileDown, Heart, MessageSquare, Pencil, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { toBlockNoteBlocks } from "@/lib/blocknote-content";
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

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/72 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative flex min-h-screen items-center justify-center overflow-y-auto px-4 py-8">
        <div className="relative flex w-full max-w-[560px] max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[48px] border border-slate-200/90 bg-white shadow-[0_32px_90px_rgba(2,8,23,0.42)] dark:border-slate-700 dark:bg-slate-900">
          <div className="shrink-0 border-b border-slate-800 bg-slate-900 px-10 py-6 text-slate-50">
            <div className="flex min-h-[52px] items-center justify-between gap-4">
              <div className="min-w-0 pl-4">
                <h3 className="text-[22px] font-extrabold tracking-tight text-white lg:text-[24px]">{title}</h3>
              </div>
              <button
                type="button"
                className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white text-slate-900 shadow-sm transition hover:bg-slate-100"
                onClick={onClose}
                aria-label="모달 닫기"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-10 py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ExportFormatModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (format: "pdf" | "docx") => void;
}) {
  const formats: Array<{ format: "pdf" | "docx"; label: string; description: string }> = [
    { format: "pdf", label: "PDF", description: "현재 문서를 PDF로 내보냅니다." },
    { format: "docx", label: "DOCX", description: "현재 문서를 Word 파일로 내보냅니다." },
  ];

  return (
    <ModalShell title="추출 형식 선택" onClose={onClose}>
      <div className="space-y-2">
        {formats.map((item) => (
          <button
            key={item.format}
            type="button"
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-sky-300 hover:bg-sky-50/60 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-700 dark:hover:bg-slate-800"
            onClick={() => onSelect(item.format)}
          >
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-50">{item.label}</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">{item.description}</div>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              선택
            </div>
          </button>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <Button className="bg-slate-700" onClick={onClose}>
          닫기
        </Button>
      </div>
    </ModalShell>
  );
}

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
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState<"pdf" | "docx" | null>(null);
  const editor = useCreateBlockNote({
    initialContent: [{ type: "paragraph", content: "" }],
  });

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

  useEffect(() => {
    if (!doc) return;
    const blocks = toBlockNoteBlocks(doc.content);
    editor.replaceBlocks(editor.document, blocks.length ? blocks : [{ type: "paragraph", content: "" }]);
  }, [doc?.id, editor]);

  const canManageDocument = !!user && (user.role === "admin" || user.id === doc?.ownerId);

  const likeButtonClassName = useMemo(
    () =>
      meta.likedByMe
        ? "inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        : "inline-flex items-center gap-1 rounded-md border border-line px-3 py-1 text-sm dark:border-slate-700",
    [meta.likedByMe],
  );

  const downloadExport = async (format: "pdf" | "docx") => {
    setExportModalOpen(false);
    if (!doc) return;

    setExportLoading(format);
    try {
      const blocks = toBlockNoteBlocks(doc.content);
      const { exportDocumentDocx, exportDocumentPdf } = await import("@/lib/document-export");
      const asset =
        format === "pdf"
          ? await exportDocumentPdf(blocks, doc.title || "document")
          : await exportDocumentDocx(blocks, doc.title || "document");

      const url = URL.createObjectURL(asset.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = asset.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : "문서 추출에 실패했습니다.");
    } finally {
      setExportLoading(null);
    }
  };

  if (!doc) return <div>문서를 찾을 수 없습니다.</div>;

  return (
    <div className="space-y-6">
      <div className="w-full">
        <Card className="document-sheet overflow-hidden border-slate-200 bg-[#fcfbf7] shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200/80 px-6 py-6 dark:border-slate-700 sm:px-8 lg:px-14 lg:py-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Document</div>
                <h2 className="mt-2 text-[36px] font-semibold tracking-[-0.06em] text-slate-950 dark:text-slate-50 sm:text-[42px] lg:text-[48px]">
                  {doc.title}
                </h2>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
                  <img
                    src={getAvatarSrc(doc.ownerAvatarUrl || user?.avatarUrl)}
                    alt={doc.ownerName ?? doc.ownerId}
                    className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                  <span>
                    작성자 {doc.ownerName ?? doc.ownerId} · {new Date(doc.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 lg:pt-1">
                <Button className="bg-slate-700" onClick={() => setExportModalOpen(true)}>
                  <FileDown size={14} />
                  {exportLoading ? `${exportLoading.toUpperCase()} 다운로드 중...` : "추출"}
                </Button>
                {canManageDocument ? (
                  <>
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
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="editor-surface px-6 py-8 sm:px-8 lg:px-14 lg:py-10">
            <div className="rounded-none border-0 bg-transparent p-0">
              <BlockNoteView
                editor={editor}
                editable={false}
                theme={document.documentElement.classList.contains("dark") ? "dark" : "light"}
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="w-full">
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

      {exportModalOpen ? (
        <ExportFormatModal
          onClose={() => setExportModalOpen(false)}
          onSelect={(format) => {
            void downloadExport(format);
          }}
        />
      ) : null}
    </div>
  );
}
