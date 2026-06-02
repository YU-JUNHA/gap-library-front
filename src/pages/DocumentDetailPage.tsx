import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { AlertTriangle, ChevronDown, ChevronRight, FileDown, Folder, FolderOpen, SpellCheck, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { extractTextFromBlocks } from "@/lib/document-utils";
import type { Document } from "@/types/document";

type TemplateItem = { id: string; name: string; content: string };
type CategoryItem = { id: string; name: string; parentId: string | null };
type CategoryNode = { id: string; name: string; parentId: string | null; children: CategoryNode[] };
type SaveMode = "saved" | "saving" | "dirty";

const ROOT_ID = "root";
const AUTOSAVE_INTERVAL_MS = 30000;

function toBlockNoteBlocks(content: unknown, fallbackText: string) {
  if (Array.isArray(content) && content.length > 0) return content as any[];
  return [{ type: "paragraph", content: fallbackText || "" }] as any[];
}

function buildCategoryTree(categories: CategoryItem[]) {
  const map = new Map<string, CategoryNode>();
  categories.forEach((category) => {
    map.set(category.id, { ...category, children: [] });
  });

  const root: CategoryNode = { id: ROOT_ID, name: "문서 자료실", parentId: null, children: [] };

  categories.forEach((category) => {
    const node = map.get(category.id)!;
    if (!category.parentId || !map.has(category.parentId)) {
      root.children.push(node);
      return;
    }
    map.get(category.parentId)!.children.push(node);
  });

  return root;
}

function findCategoryPath(tree: CategoryNode, categoryId: string | null): string {
  if (!categoryId) return "문서 자료실 / 루트";

  const walk = (node: CategoryNode, trail: string[]): string[] | null => {
    const nextTrail = node.id === ROOT_ID ? trail : [...trail, node.name];
    if (node.id === categoryId) return nextTrail;

    for (const child of node.children) {
      const found = walk(child, nextTrail);
      if (found) return found;
    }

    return null;
  };

  const foundPath = walk(tree, ["문서 자료실"]);
  return foundPath ? foundPath.join(" / ") : "문서 자료실 / 루트";
}

function ModalShell({
  title,
  onClose,
  maxWidthPx = 720,
  children,
}: {
  title: string;
  onClose: () => void;
  maxWidthPx?: number;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/72 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative flex min-h-screen items-center justify-center overflow-y-auto px-4 py-8">
        <div
          className="relative w-full overflow-hidden rounded-[48px] border border-slate-200/90 bg-white shadow-[0_32px_90px_rgba(2,8,23,0.42)] dark:border-slate-700 dark:bg-slate-900"
          style={{ maxWidth: `${maxWidthPx}px` }}
        >
        <div className="border-b border-slate-800 bg-slate-900 px-10 py-6 text-slate-50">
          <div className="flex min-h-[52px] items-center justify-between gap-4">
            <div className="min-w-0 pl-4">
              <h3 className="text-[30px] font-extrabold tracking-tight text-white">{title}</h3>
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
        <div className="px-10 py-8">{children}</div>
      </div>
      </div>
    </div>
  );
}

function TemplateModal({
  templates,
  onClose,
  onSelect,
}: {
  templates: TemplateItem[];
  onClose: () => void;
  onSelect: (template: TemplateItem) => void;
}) {
  return (
    <ModalShell
      title="서식 불러오기"
      onClose={onClose}
      maxWidthPx={620}
    >
      <div className="max-h-[480px] overflow-y-auto px-4 pr-1">
          {templates.length === 0 ? (
            <div className="rounded-[36px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              등록된 서식이 없습니다.
            </div>
          ) : (
            <div className="overflow-hidden rounded-[36px] bg-white dark:bg-slate-900">
              {templates.map((template, index) => (
                <button
                  key={template.id}
                  type="button"
                  className={`w-full px-8 py-5 text-left transition hover:bg-sky-50/60 dark:hover:bg-slate-800 ${
                    index < templates.length - 1 ? "border-b border-slate-200 dark:border-slate-700" : ""
                  }`}
                  onClick={() => onSelect(template)}
                >
                  <div className="flex items-start gap-4 pl-5">
                    <div className="min-w-0 flex-1 pl-10 pr-2">
                      <div className="font-semibold text-slate-900 dark:text-slate-50">{template.name}</div>
                      <div className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500 dark:text-slate-300">
                        {template.content || "본문 미리보기가 없습니다."}
                      </div>
                    </div>
                    <div className="mt-0.5 shrink-0 rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-950/60 dark:text-sky-200">
                      선택
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
      </div>
    </ModalShell>
  );
}

function CategoryPickerModal({
  tree,
  selectedCategoryId,
  onSelect,
  onClose,
  onConfirm,
}: {
  tree: CategoryNode;
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = { [ROOT_ID]: true };
    tree.children.forEach((child) => {
      initial[child.id] = true;
    });
    return initial;
  });

  const toggle = (id: string) => {
    setExpanded((current) => ({ ...current, [id]: !current[id] }));
  };

  const renderNode = (node: CategoryNode, depth = 0) => {
    const isRoot = node.id === ROOT_ID;
    const isOpen = expanded[node.id] ?? false;
    const isSelected = (selectedCategoryId ?? ROOT_ID) === node.id;

    return (
      <div key={node.id} className="space-y-1">
        <div
          className={`flex items-center gap-2 rounded-xl border px-2 py-2 text-left transition ${
            isSelected
              ? "border-sky-300 bg-sky-100 text-sky-950 ring-2 ring-sky-200 dark:border-sky-700 dark:bg-sky-950/70 dark:text-sky-50 dark:ring-sky-900"
              : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          {!isRoot ? (
            <button type="button" className={`shrink-0 ${isSelected ? "text-sky-700 dark:text-sky-200" : "text-slate-400"}`} onClick={() => toggle(node.id)}>
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          {isRoot ? <FolderOpen size={16} className={isSelected ? "text-sky-700 dark:text-sky-200" : "text-amber-600"} /> : isOpen ? <FolderOpen size={16} className={isSelected ? "text-sky-700 dark:text-sky-200" : "text-amber-600"} /> : <Folder size={16} className={isSelected ? "text-sky-700 dark:text-sky-200" : "text-amber-600"} />}
          <button
            type="button"
            className={`flex-1 text-left text-sm ${isSelected ? "font-semibold" : ""}`}
            onClick={() => onSelect(isRoot ? null : node.id)}
          >
            {node.name}
          </button>
        </div>
        {(isRoot || isOpen) && node.children.length > 0 ? (
          <div className="space-y-1">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <ModalShell
      title="저장 위치 선택"
      onClose={onClose}
      maxWidthPx={640}
    >
      <div className="max-h-[460px] overflow-y-auto rounded-[36px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/40">
          {renderNode(tree)}
      </div>
      <div className="mt-5 flex items-center justify-between gap-4">
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            선택 위치: {findCategoryPath(tree, selectedCategoryId)}
          </div>
          <div className="flex gap-2">
            <Button className="bg-slate-700" onClick={onClose}>취소</Button>
            <Button onClick={onConfirm}>여기에 저장</Button>
          </div>
      </div>
    </ModalShell>
  );
}

function TemplateConfirmModal({
  template,
  onCancel,
  onConfirm,
}: {
  template: TemplateItem;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell
      title="서식을 적용할까요?"
      onClose={onCancel}
      maxWidthPx={560}
    >
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-900/60 dark:bg-amber-950/30">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="font-semibold text-amber-900 dark:text-amber-100">{template.name}</div>
            <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-200">
              지금 편집 중이던 내용이 삭제되고 선택한 서식 내용으로 바뀝니다. 계속 진행할까요?
            </p>
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button className="bg-slate-700" onClick={onCancel}>취소</Button>
        <Button onClick={onConfirm}>서식 적용</Button>
      </div>
    </ModalShell>
  );
}

export function DocumentDetailPage() {
  const { documentId } = useParams();
  const nav = useNavigate();
  const [doc, setDoc] = useState<Document | null>(null);
  const [isDesktopLayout, setIsDesktopLayout] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1024;
  });
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState<SaveMode>("saved");
  const [message, setMessage] = useState("");
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<TemplateItem | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [dirtyTick, setDirtyTick] = useState(0);
  const saveLockRef = useRef(false);

  const editor = useCreateBlockNote({ initialContent: [{ type: "paragraph", content: "" }] });

  useEffect(() => {
    if (!documentId) return;

    api.getDocumentById(documentId).then((nextDoc) => {
      setDoc(nextDoc);
      setTitle(nextDoc.title);
      setSelectedCategoryId(nextDoc.categoryId ?? null);
    });
    api.getTemplates().then(setTemplates).catch(() => setTemplates([]));
    api.getCategories().then(setCategories).catch(() => setCategories([]));
  }, [documentId]);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktopLayout(window.innerWidth >= 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!doc) return;
    const blocks = toBlockNoteBlocks(doc.content, doc.contentText || "");
    editor.replaceBlocks(editor.document, blocks as any);
  }, [doc?.id]);

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const saveLabel = useMemo(() => {
    if (saveState === "saving") return "저장 중";
    if (saveState === "dirty") return "변경사항 있음";
    return "저장됨";
  }, [saveState]);

  const markDirty = (nextMessage?: string) => {
    setSaveState("dirty");
    setDirtyTick((current) => current + 1);
    if (nextMessage) setMessage(nextMessage);
  };

  const saveDocument = async (status: "draft" | "published", navigateAfterSave: boolean) => {
    if (!doc || saveLockRef.current) return;
    saveLockRef.current = true;
    setSaveState("saving");
    if (status === "published") {
      setMessage("최종 저장 중입니다.");
    }

    try {
      const blocks = editor.document as any[];
      const next = await api.patchDocument(doc.id, {
        title,
        content: blocks,
        contentText: extractTextFromBlocks(blocks),
        categoryId: selectedCategoryId,
        status,
      });
      setDoc(next);
      setTitle(next.title);
      setSelectedCategoryId(next.categoryId ?? null);
      setSaveState("saved");
      if (status === "draft") {
        setLastDraftSavedAt(
          new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        );
        setMessage("");
      }
      if (status === "published") {
        setMessage("문서를 저장했습니다.");
      }
      if (navigateAfterSave) nav("/documents");
    } catch (error) {
      setSaveState("dirty");
      setMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      saveLockRef.current = false;
    }
  };

  useEffect(() => {
    if (!doc) return;
    if (saveState !== "dirty") return;

    const timer = window.setInterval(() => {
      if (saveLockRef.current) return;
      void saveDocument("draft", false);
    }, AUTOSAVE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [doc?.id, dirtyTick, saveState, title, selectedCategoryId]);

  const applyTemplate = async (template: TemplateItem) => {
    const blocks = await editor.tryParseMarkdownToBlocks(template.content || "");
    editor.replaceBlocks(editor.document, blocks.length ? blocks : [{ type: "paragraph", content: "" }]);
    setTemplateModalOpen(false);
    markDirty("서식을 불러왔습니다. 저장하면 문서에 반영됩니다.");
  };

  const downloadExport = async (format: "pdf" | "docx" | "md" | "txt") => {
    setExportMenuOpen(false);
    if (!doc) return;

    if (format === "pdf" || format === "docx") {
      setMessage(`${format.toUpperCase()} 추출은 추후 구현 예정입니다.`);
      return;
    }

    const blocks = editor.document as any[];
    const text = extractTextFromBlocks(blocks);
    const markdown = await editor.blocksToMarkdownLossy(editor.document);
    const content = format === "md" ? markdown : text;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${title || doc.title}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage(`${format.toUpperCase()} 파일을 추출했습니다.`);
  };

  if (!doc) return <div>문서를 찾을 수 없습니다.</div>;

  return (
    <>
      <div
        className="gap-4"
        style={
          isDesktopLayout
            ? { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", alignItems: "start" }
            : { display: "flex", flexDirection: "column" }
        }
      >
        <section className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
            <input
              className="flex-1 rounded-md border border-line px-3 py-2 dark:border-slate-700 dark:bg-slate-700"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                markDirty();
              }}
            />
            <span className="text-sm text-slate-500 dark:text-slate-300">{saveLabel}</span>
          </div>
          <div className="editor-surface rounded-xl border border-line bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
            <BlockNoteView editor={editor} onChange={() => markDirty()} />
          </div>
        </section>

        <aside className="w-full space-y-4" style={isDesktopLayout ? { width: 320, minWidth: 320, maxWidth: 320 } : undefined}>
          <Card>
            <h3 className="font-semibold">문서 정보</h3>
            <div className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <div>작성자: {doc.ownerName || doc.ownerId}</div>
              <div>생성일: {new Date(doc.createdAt).toLocaleString()}</div>
              <div>수정일: {new Date(doc.updatedAt).toLocaleString()}</div>
              <div>상태: {doc.status ?? "draft"}</div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold">도구</h3>
            <div className="mt-3 space-y-2">
              <Button className="w-full justify-center" onClick={() => setTemplateModalOpen(true)}>
                <WandSparkles size={14} />
                서식 불러오기
              </Button>
              <Button
                className="w-full justify-center bg-slate-700"
                onClick={() => setMessage("맞춤법 검사는 추후 구현 예정입니다.")}
              >
                <SpellCheck size={14} />
                맞춤법 검사
              </Button>
              <Button
                className="w-full justify-center bg-slate-700"
                onClick={() => setMessage("고급 문법 검사는 추후 구현 예정입니다.")}
              >
                <SpellCheck size={14} />
                고급 문법 검사
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold">저장</h3>
            <div className="mt-3 space-y-2">
              <div
                className="relative"
                onMouseEnter={() => setExportMenuOpen(true)}
                onMouseLeave={() => setExportMenuOpen(false)}
              >
                <Button className="w-full justify-center bg-slate-700">
                  <FileDown size={14} />
                  추출
                </Button>
                {exportMenuOpen ? (
                  <div className="absolute left-full top-0 z-20 ml-2 w-44 rounded-xl border border-line bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    {(["pdf", "docx", "md", "txt"] as const).map((format) => (
                      <button
                        key={format}
                        type="button"
                        className="w-full rounded-lg px-3 py-2 text-left text-sm capitalize hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={() => void downloadExport(format)}
                      >
                        {format} 추출
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <Button className="w-full justify-center" onClick={() => setCategoryModalOpen(true)}>
                저장
              </Button>
              
              <Button
                className="w-full justify-center bg-slate-700"
                onClick={() => void saveDocument("draft", false)}
              >
                임시저장
              </Button>
            </div>

            {lastDraftSavedAt ? (
              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                마지막 임시저장: {lastDraftSavedAt}
              </div>
            ) : null}
            {message ? (
              <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {message}
              </div>
            ) : null}
          </Card>
        </aside>
      </div>

      {templateModalOpen ? (
        <TemplateModal
          templates={templates}
          onClose={() => setTemplateModalOpen(false)}
          onSelect={(template) => {
            setTemplateModalOpen(false);
            setPendingTemplate(template);
          }}
        />
      ) : null}

      {pendingTemplate ? (
        <TemplateConfirmModal
          template={pendingTemplate}
          onCancel={() => setPendingTemplate(null)}
          onConfirm={() => {
            void applyTemplate(pendingTemplate);
            setPendingTemplate(null);
          }}
        />
      ) : null}

      {categoryModalOpen ? (
        <CategoryPickerModal
          tree={categoryTree}
          selectedCategoryId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
          onClose={() => setCategoryModalOpen(false)}
          onConfirm={() => {
            setCategoryModalOpen(false);
            void saveDocument("published", true);
          }}
        />
      ) : null}
    </>
  );
}
