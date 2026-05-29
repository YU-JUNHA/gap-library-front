import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { mockApi } from "@/lib/mock-api";
import { extractTextFromBlocks } from "@/lib/document-utils";
import type { Document } from "@/types/document";

export function DocumentDetailPage() {
  const { documentId } = useParams();
  const nav = useNavigate();
  const [doc, setDoc] = useState<Document | null>(null);
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!documentId) return;
    mockApi.getDocumentById(documentId).then((d) => {
      if (!d) return;
      setDoc({ ...d, lastOpenedAt: new Date().toISOString() });
      setTitle(d.title);
    });
  }, [documentId]);

  const editor = useCreateBlockNote({ initialContent: doc?.content ?? [{ type: "paragraph", content: "" }] }, [doc?.id]);

  useEffect(() => {
    if (!doc) return;
    if (title === doc.title) return;
    setSaveState("dirty");
  }, [title, doc]);

  const save = async () => {
    if (!doc) return;
    setSaveState("saving");
    const blocks = editor.document;
    const next = mockApi.patchDocument(doc, { title, content: blocks, contentText: extractTextFromBlocks(blocks) });
    await mockApi.saveDocument(next);
    setDoc(next);
    setSaveState("saved");
  };

  useEffect(() => {
    if (saveState !== "dirty") return;
    const t = setTimeout(() => { void save(); }, 800);
    return () => clearTimeout(t);
  }, [saveState]);

  const saveLabel = useMemo(() => saveState === "saved" ? "저장됨" : saveState === "saving" ? "저장 중" : "변경사항 있음", [saveState]);

  if (!doc) return <div>문서를 찾을 수 없습니다.</div>;

  return <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
    <section className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-white p-3">
        <Button className="bg-slate-700" onClick={() => nav('/documents')}>뒤로가기</Button>
        <input className="flex-1 rounded-md border border-line px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
        <span className="text-sm text-slate-500">{saveLabel}</span>
        <Button className="bg-slate-700">PDF 추출</Button><Button className="bg-slate-700">DOCX 추출</Button><Button className="bg-slate-700">공유</Button>
      </div>
      <div className="rounded-xl border border-line bg-white p-3">
        <BlockNoteView editor={editor} onChange={() => setSaveState("dirty")} />
      </div>
    </section>
    <aside className="space-y-4">
      <Card><h3 className="font-semibold">문서 정보</h3><div className="mt-2 space-y-1 text-sm text-slate-600"><div>작성자: {doc.ownerName}</div><div>생성일: {new Date(doc.createdAt).toLocaleString()}</div><div>수정일: {new Date(doc.updatedAt).toLocaleString()}</div><div>상태: {doc.status}</div><div>태그: {doc.tags.join(', ') || '-'}</div><div>카테고리: {doc.category || '-'}</div><div>요약: {doc.summary || '-'}</div><div>RAG: {doc.ragStatus || 'pending'}</div></div></Card>
      <Card><h3 className="font-semibold">AI 도구</h3><div className="mt-3 grid gap-2"><Button onClick={async () => { const next = mockApi.patchDocument(doc, { summary: "이 문서는 GAP Library의 샘플 요약입니다." }); await mockApi.saveDocument(next); setDoc(next); }}>요약하기</Button><Button className="bg-slate-700" onClick={() => setMessage("맞춤법 검사가 완료되었습니다.")}>맞춤법 검사</Button><Button className="bg-slate-700" onClick={async () => { const tags = Array.from(new Set([...(doc.tags ?? []), "GAP", "자료", "운영"])); const next = mockApi.patchDocument(doc, { tags }); await mockApi.saveDocument(next); setDoc(next); }}>태그 자동 생성</Button><Button className="bg-slate-700" onClick={async () => { const next = mockApi.patchDocument(doc, { ragStatus: doc.ragStatus === "completed" ? "pending" : "completed" }); await mockApi.saveDocument(next); setDoc(next); }}>RAG 등록하기</Button></div>{message && <p className="mt-2 text-sm text-slate-600">{message}</p>}</Card>
    </aside>
  </div>;
}
