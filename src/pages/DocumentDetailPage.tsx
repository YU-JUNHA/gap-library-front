import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { BlockNoteEditor } from "@blocknote/core";
import { AlertTriangle, ChevronDown, ChevronRight, FileDown, Folder, FolderOpen, SpellCheck, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { toBlockNoteBlocks } from "@/lib/blocknote-content";
import type { Document } from "@/types/document";
import { useAuth } from "@/hooks/useAuth";

type TemplateItem = { id: string; name: string; content: string };
type CategoryItem = { id: string; name: string; parentId: string | null };
type CategoryNode = { id: string; name: string; parentId: string | null; children: CategoryNode[] };
type SaveMode = "saved" | "saving" | "dirty";
type SpellCheckIssue = {
  type: "spacing" | "correction";
  original: string;
  suggestion: string;
  start: number;
  end: number;
};
type SpellCheckSection = {
  originalText: string;
  correctedText: string;
  issues: SpellCheckIssue[];
};
type SpellCheckLine = {
  index: number;
  start: number;
  end: number;
  originalText: string;
  correctedText: string;
  issues: SpellCheckIssue[];
};
type SpellCheckResult = {
  title: SpellCheckSection;
  body: SpellCheckSection;
  summary: { issueCount: number };
};

const ROOT_ID = "root";
const AUTOSAVE_INTERVAL_MS = 30000;

function splitTextIntoLines(text: string) {
  const normalized = text.replace(/\r\n/g, "\n");
  const parts = normalized.split("\n");
  let offset = 0;

  return parts.map((line, index) => {
    const start = offset;
    const end = start + line.length;
    offset = end + 1;
    return { index, text: line, start, end };
  });
}

function buildSpellCheckLines(result: SpellCheckSection): SpellCheckLine[] {
  const originalLines = splitTextIntoLines(result.originalText);
  const correctedLines = splitTextIntoLines(result.correctedText);

  return originalLines
    .map((line) => {
      const issues = result.issues.filter((issue) => issue.start < line.end && issue.end > line.start);
      if (issues.length === 0) return null;

      return {
        index: line.index,
        start: line.start,
        end: line.end,
        originalText: line.text,
        correctedText: correctedLines[line.index]?.text ?? line.text,
        issues,
      } satisfies SpellCheckLine;
    })
    .filter((line): line is SpellCheckLine => line !== null);
}

function replaceLineAtIndex(text: string, lineIndex: number, nextLine: string) {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (lineIndex < 0 || lineIndex >= lines.length) return normalized;
  lines[lineIndex] = nextLine;
  return lines.join("\n");
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
          className="relative flex w-full max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[48px] border border-slate-200/90 bg-white shadow-[0_32px_90px_rgba(2,8,23,0.42)] dark:border-slate-700 dark:bg-slate-900"
          style={{ maxWidth: `${maxWidthPx}px` }}
        >
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

function DeleteDocumentConfirmModal({
  title,
  onCancel,
  onConfirm,
}: {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell title="문서를 삭제할까요?" onClose={onCancel} maxWidthPx={560}>
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 dark:border-red-900/60 dark:bg-red-950/30">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-red-100 p-2 text-red-700 dark:bg-red-900/50 dark:text-red-200">
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="font-semibold text-red-900 dark:text-red-100">{title || "현재 문서"}</div>
            <p className="mt-1 text-sm leading-6 text-red-800 dark:text-red-200">
              삭제하면 문서가 완전히 제거되고 되돌릴 수 없습니다. 정말 삭제할까요?
            </p>
          </div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button className="bg-slate-700" onClick={onCancel}>
          취소
        </Button>
        <Button className="bg-red-600 hover:bg-red-700" onClick={onConfirm}>
          삭제
        </Button>
      </div>
    </ModalShell>
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
    { format: "pdf", label: "PDF", description: "현재 편집 중인 문서를 PDF로 내보냅니다." },
    { format: "docx", label: "DOCX", description: "현재 편집 중인 문서를 Word 파일로 내보냅니다." },
  ];

  return (
    <ModalShell title="추출 형식 선택" onClose={onClose} maxWidthPx={560}>
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

function SpellCheckResultModal({
  result,
  onApplyTitle,
  onApplyBodyLine,
  onClose,
}: {
  result: SpellCheckResult;
  onApplyTitle: (correctedTitle: string) => void;
  onApplyBodyLine: (lineIndex: number, correctedLine: string) => void;
  onClose: () => void;
}) {
  const issueCount = result.summary.issueCount;
  const [appliedTitle, setAppliedTitle] = useState(false);
  const [ignoredTitle, setIgnoredTitle] = useState(false);
  const [appliedBodyLines, setAppliedBodyLines] = useState<Record<number, boolean>>({});
  const [ignoredBodyLines, setIgnoredBodyLines] = useState<Record<number, boolean>>({});
  const titleLines = buildSpellCheckLines(result.title);
  const bodyLines = buildSpellCheckLines(result.body);
  const visibleTitleLines = titleLines.filter(() => !appliedTitle && !ignoredTitle);
  const visibleBodyLines = bodyLines.filter((line) => !appliedBodyLines[line.index] && !ignoredBodyLines[line.index]);

  const handleApplyTitle = () => {
    onApplyTitle(result.title.correctedText);
    setAppliedTitle(true);
  };

  const handleIgnoreTitle = () => {
    setIgnoredTitle(true);
  };

  const handleApplyBodyLine = (line: SpellCheckLine) => {
    onApplyBodyLine(line.index, line.correctedText);
    setAppliedBodyLines((current) => ({ ...current, [line.index]: true }));
  };

  const handleIgnoreBodyLine = (lineIndex: number) => {
    setIgnoredBodyLines((current) => ({ ...current, [lineIndex]: true }));
  };

  return (
    <ModalShell title="맞춤법 검사 결과" onClose={onClose} maxWidthPx={900}>
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">검사 결과</div>
            <div className="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">{issueCount}건</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">제목 이슈</div>
            <div className="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">{result.title.issues.length}건</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">본문 이슈</div>
            <div className="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">{result.body.issues.length}건</div>
          </div>
        </div>

        <div className="space-y-4">
          {visibleTitleLines.length > 0 ? (
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">제목</h4>
                <span className="text-xs text-slate-400">{visibleTitleLines.length}건</span>
              </div>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:bg-amber-900/60 dark:text-amber-100">
                    제목
                  </span>
                  <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white dark:bg-slate-100 dark:text-slate-900">
                    {result.title.issues.length}개 이슈
                  </span>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">원문</div>
                    <div className="mt-1 rounded-xl bg-white px-3 py-2 text-sm leading-7 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {result.title.originalText || "없음"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">교정 제안</div>
                    <div className="mt-1 rounded-xl bg-emerald-50 px-3 py-2 text-sm leading-7 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100">
                      {result.title.correctedText || "없음"}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button className="bg-slate-700" onClick={handleIgnoreTitle}>
                    취소
                  </Button>
                  <Button onClick={handleApplyTitle}>교정</Button>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">본문</h4>
              {visibleBodyLines.length > 0 ? (
                <span className="text-xs text-slate-400">{visibleBodyLines.length}개 줄</span>
              ) : (
                <span className="text-xs text-slate-400">적용 완료</span>
              )}
            </div>

            <div className="mt-3 space-y-3">
              {visibleBodyLines.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                  교정이 필요한 본문 줄이 없습니다.
                </div>
              ) : (
                visibleBodyLines.map((line) => (
                  <div
                    key={line.index}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/60"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white dark:bg-slate-100 dark:text-slate-900">
                        {line.index + 1}번째 줄
                      </span>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:bg-amber-900/60 dark:text-amber-100">
                        {line.issues.length}개 이슈
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">원문</div>
                        <div className="mt-1 min-h-12 whitespace-pre-wrap rounded-xl bg-white px-3 py-2 text-sm leading-7 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          {line.originalText || " "}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">교정 제안</div>
                        <div className="mt-1 min-h-12 whitespace-pre-wrap rounded-xl bg-emerald-50 px-3 py-2 text-sm leading-7 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100">
                          {line.correctedText || " "}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <Button className="bg-slate-700" onClick={() => handleIgnoreBodyLine(line.index)}>
                        취소
                      </Button>
                      <Button onClick={() => handleApplyBodyLine(line)}>교정</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>닫기</Button>
        </div>
      </div>
    </ModalShell>
  );
}

function DocumentContentEditor({
  doc,
  theme,
  onEditorReady,
  onDirty,
}: {
  doc: Document;
  theme: "light" | "dark";
  onEditorReady: (editor: BlockNoteEditor<any, any, any> | null) => void;
  onDirty: () => void;
}) {
  const editor = useCreateBlockNote({
    initialContent: toBlockNoteBlocks(doc.content),
  });

  useEffect(() => {
    onEditorReady(editor);
    return () => onEditorReady(null);
  }, [editor, onEditorReady]);

  return <BlockNoteView editor={editor} editable theme={theme} onChange={onDirty} />;
}

export function DocumentDetailPage() {
  const { documentId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDesktopLayout, setIsDesktopLayout] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1024;
  });
  const [title, setTitle] = useState("");
  const [saveState, setSaveState] = useState<SaveMode>("saved");
  const [, setMessage] = useState("");
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<TemplateItem | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState<"pdf" | "docx" | null>(null);
  const [spellCheckModalOpen, setSpellCheckModalOpen] = useState(false);
  const [spellCheckLoading, setSpellCheckLoading] = useState(false);
  const [spellCheckResult, setSpellCheckResult] = useState<SpellCheckResult | null>(null);
  const spellCheckWorkingBodyTextRef = useRef<string>("");
  const [dirtyTick, setDirtyTick] = useState(0);
  const saveLockRef = useRef(false);
  const editorRef = useRef<BlockNoteEditor<any, any, any> | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!documentId) {
        if (active) setLoading(false);
        return;
      }

      setLoading(true);
      const nextDoc = await api.getDocumentById(documentId).catch(() => null);
      if (!active) return;

      setDoc(nextDoc);
      if (nextDoc) {
        setTitle(nextDoc.title);
        setSelectedCategoryId(nextDoc.categoryId ?? null);
      }
      setLoading(false);
    }

    load();
    api.getTemplates().then(setTemplates).catch(() => setTemplates([]));
    api.getCategories().then(setCategories).catch(() => setCategories([]));
    return () => {
      active = false;
    };
  }, [documentId]);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktopLayout(window.innerWidth >= 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const editorTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
  const canEditDocument = !!user && user.id === doc?.ownerId;

  const markDirty = (nextMessage?: string) => {
    setSaveState("dirty");
    setDirtyTick((current) => current + 1);
    if (nextMessage) setMessage(nextMessage);
  };

  const saveDocument = async (status: "draft" | "published", navigateAfterSave: boolean) => {
    const editor = editorRef.current;
    if (!doc || !editor) return null;
    if (saveLockRef.current) return doc;
    saveLockRef.current = true;
    setSaveState("saving");

    try {
      const blocks = editor.document as any[];
      const next = await api.patchDocument(doc.id, {
        title,
        content: blocks,
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
      }
      if (navigateAfterSave) nav("/documents");
      return next;
    } catch (error) {
      setSaveState("dirty");
      return null;
    } finally {
      saveLockRef.current = false;
    }
  };

  const ensureDraftSaved = async () => {
    if (!doc) return false;
    if (saveState === "saved") return true;

    const saved = await saveDocument("draft", false);
    if (saved) return true;

    window.alert("임시저장에 실패해 작업을 이어갈 수 없습니다.");
    return false;
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
    const editor = editorRef.current;
    if (!editor) return;
    const blocks = await editor.tryParseMarkdownToBlocks(template.content || "");
    editor.replaceBlocks(editor.document, blocks.length ? blocks : [{ type: "paragraph", content: "" }]);
    setTemplateModalOpen(false);
    markDirty("서식을 불러왔습니다. 저장하면 문서에 반영됩니다.");
  };

  const downloadExport = async (format: "pdf" | "docx") => {
    setExportModalOpen(false);
    if (!doc) return;

    setExportLoading(format);
    try {
      const draftSaved = await ensureDraftSaved();
      if (!draftSaved) return;

      const editor = editorRef.current;
      if (!editor) {
        throw new Error("문서 편집기를 불러오지 못했습니다.");
      }

      const blocks = editor.document as any[];
      const { exportDocumentDocx, exportDocumentPdf } = await import("@/lib/document-export");
      const asset =
        format === "pdf"
          ? await exportDocumentPdf(blocks, title || doc.title || "document")
          : await exportDocumentDocx(blocks, title || doc.title || "document");

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

  const updateEditorBodyText = async (nextBodyText: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const blocks = await editor.tryParseMarkdownToBlocks(nextBodyText || "");
    editor.replaceBlocks(editor.document, blocks.length ? blocks : [{ type: "paragraph", content: "" }]);
  };

  const runSpellCheck = async () => {
    const editor = editorRef.current;
    if (!doc || !editor || spellCheckLoading) return;

    setSpellCheckLoading(true);
    try {
      const draftSaved = await ensureDraftSaved();
      if (!draftSaved) return;

      const result = await api.spellCheckDocument({
        title,
        content: editor.document as any[],
      });
      spellCheckWorkingBodyTextRef.current = result.body.originalText;
      setSpellCheckResult(result);
      setSpellCheckModalOpen(true);
    } finally {
      setSpellCheckLoading(false);
    }
  };

  const applySpellCheckTitle = (correctedTitle: string) => {
    setTitle(correctedTitle);
    markDirty();
  };

  const applySpellCheckBodyLine = (lineIndex: number, correctedLine: string) => {
    const nextBodyText = replaceLineAtIndex(spellCheckWorkingBodyTextRef.current, lineIndex, correctedLine);
    spellCheckWorkingBodyTextRef.current = nextBodyText;
    void updateEditorBodyText(nextBodyText);
    markDirty();
  };

  const deleteDocument = async () => {
    if (!doc) return;
    await api.deleteDocument(doc.id);
    nav("/documents");
  };

  if (loading) return <div>문서를 불러오는 중...</div>;
  if (!doc) return <div>문서를 찾을 수 없습니다.</div>;
  if (!canEditDocument) {
    return (
      <Card className="max-w-2xl">
        <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">수정 권한이 없습니다.</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-300">
          본인이 작성한 문서만 수정할 수 있습니다. 이 문서는 읽기와 추출만 가능합니다.
        </p>
        <div className="mt-5 flex gap-2">
          <Button onClick={() => nav(`/documents/${doc.id}`)}>문서 보기</Button>
          <Button className="bg-slate-700" onClick={() => nav("/documents")}>목록으로</Button>
        </div>
      </Card>
    );
  }

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
        <section className="min-w-0 flex-1">
          <div className="document-sheet overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-800">
            <div className="border-b border-line px-5 py-4 dark:border-slate-700 sm:px-8 lg:px-14">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">문서 편집</div>
              </div>
              <input
                className="mt-3 w-full border-0 bg-transparent p-0 text-[34px] font-semibold tracking-[-0.05em] text-slate-950 outline-none placeholder:text-slate-300 dark:text-slate-50 dark:placeholder:text-slate-500 sm:text-[40px] lg:text-[46px]"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  markDirty();
                }}
                placeholder="제목을 입력하세요"
              />
            </div>
            <div className="editor-surface px-5 py-4 sm:px-8 sm:py-6 lg:px-14 lg:py-8">
              <DocumentContentEditor
                key={doc.id}
                doc={doc}
                theme={editorTheme}
                onEditorReady={(nextEditor) => {
                  editorRef.current = nextEditor;
                }}
                onDirty={() => markDirty()}
              />
            </div>
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
                onClick={() => void runSpellCheck()}
                disabled={spellCheckLoading}
              >
                <SpellCheck size={14} />
                {spellCheckLoading ? "검사 중..." : "맞춤법 검사"}
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
              <Button className="w-full justify-center bg-slate-700" onClick={() => setExportModalOpen(true)}>
                <FileDown size={14} />
                {exportLoading ? `${exportLoading.toUpperCase()} 다운로드 중...` : "추출"}
              </Button>

              <Button className="w-full justify-center" onClick={() => setCategoryModalOpen(true)}>
                저장
              </Button>
              
              <Button
                className="w-full justify-center bg-slate-700"
                onClick={() => void saveDocument("draft", false)}
              >
                임시저장
              </Button>
              <Button
                className="w-full justify-center bg-red-600 hover:bg-red-700"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                삭제
              </Button>
            </div>

            {lastDraftSavedAt ? (
              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                마지막 임시저장: {lastDraftSavedAt}
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

      {exportModalOpen ? (
        <ExportFormatModal
          onClose={() => setExportModalOpen(false)}
          onSelect={(format) => {
            void downloadExport(format);
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

      {deleteConfirmOpen ? (
        <DeleteDocumentConfirmModal
          title={title}
          onCancel={() => setDeleteConfirmOpen(false)}
          onConfirm={() => {
            setDeleteConfirmOpen(false);
            void deleteDocument();
          }}
        />
      ) : null}

      {spellCheckModalOpen && spellCheckResult ? (
        <SpellCheckResultModal
          result={spellCheckResult}
          onApplyTitle={applySpellCheckTitle}
          onApplyBodyLine={applySpellCheckBodyLine}
          onClose={() => setSpellCheckModalOpen(false)}
        />
      ) : null}
    </>
  );
}
