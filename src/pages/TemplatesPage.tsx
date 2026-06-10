import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";

type TemplateItem = { id: string; name: string; content: string; updatedAt: string };

export function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [message, setMessage] = useState("");
  const selected = useMemo(() => templates.find((t) => t.id === selectedId) ?? null, [templates, selectedId]);
  const editor = useCreateBlockNote({ initialContent: [{ type: "paragraph", content: "" }] });

  const load = async () => {
    const next = await api.getTemplates();
    setTemplates(next);
    if (!selectedId && next[0]) setSelectedId(next[0].id);
  };
  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const blocks = await editor.tryParseMarkdownToBlocks(selected.content || "");
      editor.replaceBlocks(editor.document, blocks.length ? blocks : [{ type: "paragraph", content: "" }]);
    })();
  }, [selectedId, selected?.id]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">서식 목록</div>
            <Button onClick={async () => { await api.createTemplate({ name: "새 서식", content: "# 새 서식\n\n내용을 작성하세요." }); await load(); setMessage("새 서식을 추가했습니다."); }} className="px-2 py-1 text-xs"><Plus size={14} />추가</Button>
          </div>
          <div className="space-y-1">
            {templates.map((tpl) => (
              <button key={tpl.id} type="button" onClick={() => setSelectedId(tpl.id)} className={`w-full rounded-lg px-2 py-2 text-left text-sm ${tpl.id === selectedId ? "bg-slate-100 dark:bg-slate-700" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                <div className="font-medium">{tpl.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-300">{new Date(tpl.updatedAt).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </Card>
        <Card className="space-y-3">
          {!selected ? <div className="text-sm text-slate-500 dark:text-slate-300">서식을 선택해주세요.</div> : (
            <>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">{selected.name}</div>
              <div className="editor-surface rounded-lg border border-line bg-white p-3 dark:bg-slate-800">
                <BlockNoteView editor={editor} editable={false} />
              </div>
              {message && <div className="text-sm text-slate-600 dark:text-slate-300">{message}</div>}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
