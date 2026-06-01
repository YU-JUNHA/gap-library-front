import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { storage } from "@/lib/storage";
import { extractTextFromBlocks } from "@/lib/document-utils";

type TemplateItem = {
  id: string;
  name: string;
  content: string;
  updatedAt: string;
};

const defaultTemplates: TemplateItem[] = [
  {
    id: "tpl-1",
    name: "회의록 서식",
    content: "# 회의록\n\n## 일시\n- \n\n## 참석자\n- \n\n## 안건\n1. \n\n## 결정사항\n- ",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl-2",
    name: "업무 보고서",
    content: "# 업무 보고서\n\n## 요약\n\n## 진행 내용\n\n## 이슈\n\n## 다음 계획",
    updatedAt: new Date().toISOString(),
  },
];

const KEY = "gap-markdown-templates";

export function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>(() => storage.get<TemplateItem[]>(KEY, defaultTemplates));
  const [selectedId, setSelectedId] = useState<string>(templates[0]?.id ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [message, setMessage] = useState("");
  const selected = useMemo(() => templates.find((t) => t.id === selectedId) ?? null, [templates, selectedId]);
  const editor = useCreateBlockNote({ initialContent: [{ type: "paragraph", content: "" }] });

  useEffect(() => {
    if (!selected) return;
    setDraftName(selected.name);
    setIsEditing(false);
    (async () => {
      const blocks = await editor.tryParseMarkdownToBlocks(selected.content || "");
      editor.replaceBlocks(editor.document, blocks.length ? blocks : [{ type: "paragraph", content: "" }]);
    })();
  }, [selectedId]);

  const persist = (next: TemplateItem[]) => {
    setTemplates(next);
    storage.set(KEY, next);
    if (!next.find((item) => item.id === selectedId)) setSelectedId(next[0]?.id ?? "");
  };

  const addTemplate = () => {
    const nextItem: TemplateItem = {
      id: `tpl-${Date.now()}`,
      name: "새 서식",
      content: "# 새 서식\n\n내용을 작성하세요.",
      updatedAt: new Date().toISOString(),
    };
    const next = [nextItem, ...templates];
    persist(next);
    setSelectedId(nextItem.id);
  };

  const saveSelected = async () => {
    if (!selected) return;
    const markdown = await editor.blocksToMarkdownLossy(editor.document);
    const next = templates.map((t) =>
      t.id === selected.id ? { ...t, name: draftName.trim() || t.name, content: markdown || extractTextFromBlocks(editor.document as any), updatedAt: new Date().toISOString() } : t,
    );
    persist(next);
    setIsEditing(false);
    setMessage("서식이 수정되었습니다.");
  };

  const removeSelected = () => {
    if (!selected) return;
    if (!window.confirm(`'${selected.name}' 서식을 삭제할까요?`)) return;
    persist(templates.filter((t) => t.id !== selected.id));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">서식 관리</h1>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">서식 목록</div>
            <Button onClick={addTemplate} className="px-2 py-1 text-xs"><Plus size={14} />추가</Button>
          </div>
          <div className="space-y-1">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setSelectedId(tpl.id)}
                className={`w-full rounded-lg px-2 py-2 text-left text-sm ${tpl.id === selectedId ? "bg-slate-100 dark:bg-slate-700" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
              >
                <div className="font-medium">{tpl.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-300">{new Date(tpl.updatedAt).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </Card>
        <Card className="space-y-3">
          {!selected ? (
            <div className="text-sm text-slate-500 dark:text-slate-300">서식을 선택해주세요.</div>
          ) : (
            <>
              <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} disabled={!isEditing} />
              <div className="editor-surface rounded-lg border border-line bg-white p-3 dark:bg-slate-800">
                <BlockNoteView editor={editor} editable={isEditing} />
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <Button onClick={() => { void saveSelected(); }}>저장</Button>
                ) : (
                  <>
                    <Button onClick={() => { setIsEditing(true); setMessage("수정 모드입니다. 변경 후 저장 버튼을 눌러주세요."); }}>수정</Button>
                    <Button className="bg-red-600 hover:bg-red-500" onClick={removeSelected}><Trash2 size={14} />삭제</Button>
                  </>
                )}
              </div>
              {message && <div className="text-sm text-slate-600 dark:text-slate-300">{message}</div>}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
