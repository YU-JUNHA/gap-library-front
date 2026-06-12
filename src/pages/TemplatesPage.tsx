import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

type TemplateItem = { id: string; name: string; content: string; updatedAt: string };

export function TemplatesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draftName, setDraftName] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const editor = useCreateBlockNote({ initialContent: [{ type: "paragraph", content: "" }] });
  const syncingRef = useRef(false);

  const selected = useMemo(() => templates.find((t) => t.id === selectedId) ?? null, [templates, selectedId]);
  const editorTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";

  const refreshTemplates = async (preferredId?: string) => {
    const next = await api.getTemplates();
    setTemplates(next);

    if (preferredId && next.some((template) => template.id === preferredId)) {
      setSelectedId(preferredId);
      return next;
    }

    setSelectedId(next[0]?.id ?? "");
    return next;
  };

  const syncEditorFromMarkdown = async (markdown: string) => {
    syncingRef.current = true;
    try {
      const blocks = await editor.tryParseMarkdownToBlocks(markdown || "");
      editor.replaceBlocks(editor.document, blocks.length ? blocks : [{ type: "paragraph", content: "" }]);
    } finally {
      syncingRef.current = false;
    }
  };

  useEffect(() => {
    void refreshTemplates().catch(() => {
      setTemplates([]);
      setSelectedId("");
    });
  }, []);

  useEffect(() => {
    if (!selected) {
      setDraftName("");
      setEditing(false);
      return;
    }

    setDraftName(selected.name);
    void syncEditorFromMarkdown(selected.content);
    setEditing(false);
  }, [selected?.id, selected?.updatedAt]);

  const createTemplate = async () => {
    if (!isAdmin) return;

    const created = await api.createTemplate({
      name: "새 서식",
      content: "# 새 서식\n\n내용을 작성하세요.",
    });
    setMessage("새 서식을 추가했습니다.");
    await refreshTemplates(created.id);
  };

  const saveTemplate = async () => {
    if (!selected || !isAdmin) return;

    const name = draftName.trim();
    if (!name) {
      setMessage("서식 이름을 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      const content = editor.blocksToMarkdownLossy(editor.document as any[]);
      await api.updateTemplate(selected.id, {
        name,
        content,
      });
      setMessage("서식을 저장했습니다.");
      await refreshTemplates(selected.id);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = async () => {
    if (!selected) return;
    setDraftName(selected.name);
    await syncEditorFromMarkdown(selected.content);
    setEditing(false);
  };

  const deleteTemplate = async () => {
    if (!selected || !isAdmin) return;
    const confirmed = window.confirm(`"${selected.name}" 서식을 삭제할까요?`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      await api.deleteTemplate(selected.id);
      setMessage("서식을 삭제했습니다.");
      await refreshTemplates();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">서식 목록</div>
              <div className="text-xs text-slate-500 dark:text-slate-300">조회와 선택은 모든 사용자가 가능합니다.</div>
            </div>
            {isAdmin ? (
              <Button onClick={() => void createTemplate()} className="px-2 py-1 text-xs">
                <Plus size={14} />
                추가
              </Button>
            ) : null}
          </div>

          <div className="space-y-1">
            {templates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                등록된 서식이 없습니다.
              </div>
            ) : (
              templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedId(tpl.id)}
                  className={`w-full rounded-lg px-2 py-2 text-left text-sm ${
                    tpl.id === selectedId ? "bg-slate-100 dark:bg-slate-700" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="font-medium">{tpl.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-300">{new Date(tpl.updatedAt).toLocaleString()}</div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          {!selected ? (
            <div className="text-sm text-slate-500 dark:text-slate-300">서식을 선택해주세요.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {editing && isAdmin ? draftName || selected.name : selected.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    마지막 수정: {new Date(selected.updatedAt).toLocaleString()}
                  </div>
                </div>
                {isAdmin ? (
                  editing ? (
                    <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                      편집 중
                    </div>
                  ) : (
                    <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                      읽기 모드
                    </div>
                  )
                ) : (
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    읽기 전용
                  </div>
                )}
              </div>

              {isAdmin && editing ? (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">서식 이름</label>
                    <Input value={draftName} onChange={(event) => setDraftName(event.target.value)} />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">서식 내용</label>
                    <div className="editor-surface rounded-lg border border-line bg-white p-3 dark:bg-slate-800">
                      <BlockNoteView editor={editor} editable theme={editorTheme} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="editor-surface rounded-lg border border-line bg-white p-3 dark:bg-slate-800">
                  <BlockNoteView editor={editor} editable={false} theme={editorTheme} />
                </div>
              )}

              {isAdmin ? (
                <div className="flex flex-wrap gap-2">
                  {editing ? (
                    <>
                      <Button onClick={() => void saveTemplate()} disabled={saving}>
                        <Save size={14} />
                        {saving ? "저장 중..." : "저장"}
                      </Button>
                      <Button className="bg-slate-700" onClick={() => void cancelEditing()} disabled={saving}>
                        <X size={14} />
                        취소
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setEditing(true)}>
                      <Pencil size={14} />
                      수정
                    </Button>
                  )}
                  <Button className="bg-red-600 hover:bg-red-700" onClick={() => void deleteTemplate()} disabled={deleting || saving}>
                    <Trash2 size={14} />
                    {deleting ? "삭제 중..." : "삭제"}
                  </Button>
                </div>
              ) : null}

              {message ? <div className="text-sm text-slate-600 dark:text-slate-300">{message}</div> : null}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
