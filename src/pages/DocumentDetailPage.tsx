import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { extractTextFromBlocks } from "@/lib/document-utils";
import type { Document } from "@/types/document";

function toBlockNoteBlocks(content: unknown, fallbackText: string) {
  if (Array.isArray(content) && content.length > 0) return content as any[];
  return [{ type: "paragraph", content: fallbackText || "" }] as any[];
}

export function DocumentDetailPage() {
  const { documentId } = useParams();
  const [doc, setDoc] = useState<Document | null>(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [message, setMessage] = useState("");
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; content: string }>>([]);

  useEffect(() => {
    if (!documentId) return;
    api.getDocumentById(documentId).then((d) => {
      setDoc(d);
      setTitle(d.title);
    });
    api.getTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, [documentId]);

  const editor = useCreateBlockNote({ initialContent: [{ type: "paragraph", content: "" }] });

  useEffect(() => {
    if (!doc) return;
    const blocks = toBlockNoteBlocks(doc.content, doc.contentText || "");
    editor.replaceBlocks(editor.document, blocks as any);
  }, [doc?.id]);

  const save = async () => {
    if (!doc) return;
    setSaveState("saving");
    const blocks = editor.document as any[];
    const next = await api.patchDocument(doc.id, { title, content: blocks, contentText: extractTextFromBlocks(blocks) });
    setDoc(next);
    setSaveState("saved");
    setMessage("저장되었습니다.");
  };

  const saveLabel = useMemo(() => saveState === "saved" ? "저장됨" : saveState === "saving" ? "저장 중" : "변경사항 있음", [saveState]);
  if (!doc) return <div>문서를 찾을 수 없습니다.</div>;

  return <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
    <section className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
        <input className="flex-1 rounded-md border border-line px-3 py-2 dark:border-slate-700 dark:bg-slate-700" value={title} onChange={(e) => { setTitle(e.target.value); setSaveState("dirty"); }} />
        <span className="text-sm text-slate-500 dark:text-slate-300">{saveLabel}</span>
        <Button onClick={save}>저장</Button>
      </div>
      <div className="editor-surface rounded-xl border border-line bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
        <BlockNoteView editor={editor} onChange={() => setSaveState("dirty")} />
      </div>
    </section>
    <aside className="space-y-4">
      <Card>
        <h3 className="font-semibold">문서 정보</h3>
        <div className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
          <div>작성자: {doc.ownerName || doc.ownerId}</div>
          <div>생성일: {new Date(doc.createdAt).toLocaleString()}</div>
          <div>수정일: {new Date(doc.updatedAt).toLocaleString()}</div>
        </div>
      </Card>
      <Card>
        <h3 className="font-semibold">서식 적용</h3>
        <div className="mt-2 space-y-2">
          {templates.map((template) => (
            <Button key={template.id} className="w-full" onClick={async () => {
              await api.applyTemplate(template.id, doc.id);
              const next = await api.getDocumentById(doc.id);
              setDoc(next);
              setTitle(next.title);
              setMessage("서식을 적용했습니다.");
            }}>{template.name}</Button>
          ))}
        </div>
        {message && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{message}</p>}
      </Card>
    </aside>
  </div>;
}
