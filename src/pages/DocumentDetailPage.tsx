import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { mockApi } from "@/lib/mock-api";
import { extractTextFromBlocks } from "@/lib/document-utils";
import type { Document } from "@/types/document";
import { folderTree, type FolderNode } from "@/data/mock-categories";
import { storage } from "@/lib/storage";

function CategoryPicker({ node, onPick }: { node: FolderNode; onPick: (name: string) => void }) {
  const [open, setOpen] = useState(true);
  const hasChildren = (node.children?.length ?? 0) > 0;
  return (
    <div className="ml-2 mt-1">
      <div className="flex items-center gap-1">
        {hasChildren ? (
          <button type="button" className="rounded p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => setOpen((v) => !v)}>
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="inline-block w-4" />
        )}
        {node.id !== "root" ? <button type="button" className="text-sm hover:underline" onClick={() => onPick(node.name)}>{node.name}</button> : <span className="text-sm font-medium">전체 문서</span>}
      </div>
      {open && (node.children ?? []).map((child) => <CategoryPicker key={child.id} node={child} onPick={onPick} />)}
    </div>
  );
}

export function DocumentDetailPage() {
  const { documentId } = useParams();
  const [doc, setDoc] = useState<Document | null>(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [message, setMessage] = useState("");
  const [openCategory, setOpenCategory] = useState(false);
  const [openTemplate, setOpenTemplate] = useState(false);
  const [openSaveConfirm, setOpenSaveConfirm] = useState(false);
  const templates = storage.get<Array<{ id: string; name: string; content: string }>>("gap-markdown-templates", []);

  useEffect(() => {
    if (!documentId) return;
    mockApi.getDocumentById(documentId).then((d) => {
      if (!d) return;
      setDoc({ ...d, lastOpenedAt: new Date().toISOString() });
      setTitle(d.title);
    });
  }, [documentId]);

  const editor = useCreateBlockNote({ initialContent: doc?.content ?? [{ type: "paragraph", content: "" }] }, [doc?.id]);

  const save = async () => {
    if (!doc) return;
    setSaveState("saving");
    const blocks = editor.document;
    const next = mockApi.patchDocument(doc, { title, content: blocks, contentText: extractTextFromBlocks(blocks) });
    await mockApi.saveDocument(next);
    setDoc(next);
    setSaveState("saved");
    setMessage("임시저장되었습니다.");
  };

  const applyTemplate = async (template: { name: string; content: string }) => {
    if (!doc) return;
    const blocks = [{ type: "paragraph", content: template.content }];
    editor.replaceBlocks(editor.document, blocks as any);
    const next = mockApi.patchDocument(doc, { title: template.name, content: blocks as any, contentText: extractTextFromBlocks(blocks as any) });
    await mockApi.saveDocument(next);
    setDoc(next);
    setTitle(template.name);
    setSaveState("saved");
    setOpenTemplate(false);
    setMessage("서식을 불러왔습니다.");
  };

  useEffect(() => {
    if (!doc) return;
    if (title !== doc.title) setSaveState("dirty");
  }, [title, doc]);

  const saveLabel = useMemo(() => saveState === "saved" ? "저장됨" : saveState === "saving" ? "저장 중" : "변경사항 있음", [saveState]);

  if (!doc) return <div>문서를 찾을 수 없습니다.</div>;

  return <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
    <section className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
        <input className="flex-1 rounded-md border border-line px-3 py-2 dark:border-slate-700 dark:bg-slate-700" value={title} onChange={(e) => setTitle(e.target.value)} />
        <span className="text-sm text-slate-500 dark:text-slate-300">{saveLabel}</span>
        <Button className="bg-slate-700">PDF 추출</Button>
        <Button className="bg-slate-700">DOCX 추출</Button>
        <Button onClick={save}>임시저장</Button>
        <Button className="bg-slate-700" onClick={() => setOpenTemplate(true)}>서식 불러오기</Button>
      </div>
      <div className="editor-surface rounded-xl border border-line bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
        <BlockNoteView editor={editor} onChange={() => setSaveState("dirty")} />
      </div>
    </section>
    <aside className="space-y-4">
      <Card>
        <h3 className="font-semibold">문서 정보</h3>
        <div className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
          <div>작성자: {doc.ownerName}</div>
          <div>생성일: {new Date(doc.createdAt).toLocaleString()}</div>
          <div>수정일: {new Date(doc.updatedAt).toLocaleString()}</div>
          <div>상태: {doc.status}</div>
          <div className="flex items-center gap-2">
            <span>카테고리: {doc.category || "미분류"}</span>
            <button type="button" className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => setOpenCategory(true)}>
              <Pencil size={14} />
            </button>
          </div>
          <div>요약: {doc.summary || "-"}</div>
        </div>
      </Card>
      <Card>
        <h3 className="font-semibold">도구</h3>
        <div className="mt-3 grid gap-2">
          <Button onClick={async () => { const next = mockApi.patchDocument(doc, { summary: "이 문서는 GAP Library의 샘플 요약입니다." }); await mockApi.saveDocument(next); setDoc(next); setMessage("요약이 생성되었습니다."); }}>요약 생성</Button>
          <Button className="bg-slate-700" onClick={() => setMessage("맞춤법 검사가 완료되었습니다.")}>맞춤법 검사</Button>
          <Button className="bg-slate-700" onClick={() => setMessage("고급 문법 검사가 완료되었습니다.")}>고급 문법 검사</Button>
          <Button className="bg-slate-700" onClick={() => setOpenSaveConfirm(true)}>저장하기</Button>
        </div>
        {message && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{message}</p>}
      </Card>
    </aside>

    {openCategory && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-4 dark:bg-slate-800">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-semibold">카테고리 선택</h4>
            <button type="button" onClick={() => setOpenCategory(false)}>닫기</button>
          </div>
          <div className="max-h-80 overflow-auto rounded-lg border border-line p-2">
            <CategoryPicker node={folderTree} onPick={async (name) => { const next = mockApi.patchDocument(doc, { category: name }); await mockApi.saveDocument(next); setDoc(next); setOpenCategory(false); }} />
          </div>
        </div>
      </div>
    )}

    {openTemplate && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-4 dark:bg-slate-800">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-semibold">서식 불러오기</h4>
            <button type="button" onClick={() => setOpenTemplate(false)}>닫기</button>
          </div>
          <div className="max-h-80 space-y-2 overflow-auto">
            {templates.length === 0 && <div className="text-sm text-slate-500 dark:text-slate-300">등록된 서식이 없습니다.</div>}
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template)}
                className="w-full rounded-lg border border-line p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <div className="font-medium">{template.name}</div>
                <div className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-300">{template.content}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )}

    {openSaveConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-4 dark:bg-slate-800">
          <h4 className="mb-3 font-semibold">저장 확인</h4>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">변경 내용을 저장하시겠습니까?</p>
          <div className="flex justify-end gap-2">
            <Button className="bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-500" onClick={() => setOpenSaveConfirm(false)}>취소</Button>
            <Button className="bg-slate-700" onClick={() => { setOpenSaveConfirm(false); setOpenCategory(true); }}>카테고리 변경</Button>
            <Button onClick={async () => { await save(); setOpenSaveConfirm(false); }}>저장</Button>
          </div>
        </div>
      </div>
    )}
  </div>;
}
