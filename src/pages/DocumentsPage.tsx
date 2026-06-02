import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import type { Document } from "@/types/document";
import { ExplorerCard, type ExplorerDocumentEntry, type ExplorerFolderEntry } from "@/components/documents/ExplorerCard";

type Category = { id: string; name: string; parentId: string | null };
type CategoryNode = { id: string; name: string; children: CategoryNode[] };
type ExplorerEntry = (ExplorerFolderEntry | ExplorerDocumentEntry) & { key: string };

type ClipboardItem = {
  key: string;
  kind: "folder" | "doc";
};

type SortMode = "created-desc" | "created-asc" | "updated-desc" | "updated-asc" | "author";
type SortQuery = { sort: "createdAt" | "updatedAt" | "author"; order: "asc" | "desc" };
type PagedMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

const ROOT_ID = "root";
const DEFAULT_PAGE_SIZE = 9;

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: "created-desc", label: "생성일 내림차순" },
  { value: "created-asc", label: "생성일 오름차순" },
  { value: "updated-desc", label: "수정일 내림차순" },
  { value: "updated-asc", label: "수정일 오름차순" },
  { value: "author", label: "작성자별" },
];

function getFolderKey(id: string) {
  return `folder:${id}`;
}

function getDocKey(id: string) {
  return `doc:${id}`;
}

function buildTree(categories: Category[]): CategoryNode {
  const map = new Map<string, CategoryNode>();
  categories.forEach((category) => map.set(category.id, { id: category.id, name: category.name, children: [] }));
  const root: CategoryNode = { id: ROOT_ID, name: "전체 문서", children: [] };

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

function findNode(node: CategoryNode, id: string): CategoryNode | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

function findPath(
  node: CategoryNode,
  targetId: string,
  acc: Array<{ id: string; name: string }> = [],
): Array<{ id: string; name: string }> | null {
  const next = [...acc, { id: node.id, name: node.name }];
  if (node.id === targetId) return next;
  for (const child of node.children) {
    const found = findPath(child, targetId, next);
    if (found) return found;
  }
  return null;
}

function collectDescendantIds(node: CategoryNode): Set<string> {
  const ids = new Set<string>();
  const walk = (current: CategoryNode) => {
    ids.add(current.id);
    current.children.forEach(walk);
  };
  walk(node);
  return ids;
}

function normalizeRect(a: { x: number; y: number }, b: { x: number; y: number }) {
  return {
    left: Math.min(a.x, b.x),
    right: Math.max(a.x, b.x),
    top: Math.min(a.y, b.y),
    bottom: Math.max(a.y, b.y),
  };
}

function intersects(a: DOMRect, b: { left: number; right: number; top: number; bottom: number }) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

function stripDuplicateNestedFolders(selectedFolderIds: string[], categories: Category[]): string[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const selectedSet = new Set(selectedFolderIds);

  return selectedFolderIds.filter((folderId) => {
    let current = byId.get(folderId)?.parentId ?? null;
    while (current) {
      if (selectedSet.has(current)) return false;
      current = byId.get(current)?.parentId ?? null;
    }
    return true;
  });
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("button, input, select, textarea, a, [data-entry-key], [data-context-menu]"));
}

function sortQueryFromMode(sortMode: SortMode): SortQuery {
  switch (sortMode) {
    case "created-asc":
      return { sort: "createdAt", order: "asc" };
    case "updated-desc":
      return { sort: "updatedAt", order: "desc" };
    case "updated-asc":
      return { sort: "updatedAt", order: "asc" };
    case "author":
      return { sort: "author", order: "desc" };
    case "created-desc":
    default:
      return { sort: "createdAt", order: "desc" };
  }
}

export function DocumentsPage() {
  const nav = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [folderId, setFolderId] = useState(ROOT_ID);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"folder" | "list">("folder");
  const [sortMode, setSortMode] = useState<SortMode>("created-desc");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsMeta, setDocumentsMeta] = useState<PagedMeta>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [anchorKey, setAnchorKey] = useState<string | null>(null);
  const [draggingKeys, setDraggingKeys] = useState<string[] | null>(null);
  const [clipboard, setClipboard] = useState<{ items: ClipboardItem[]; mode: "cut" | "copy" } | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const activeSelectionPointerId = useRef<number | null>(null);

  const searchQuery = q.trim();
  const currentSort = useMemo(() => sortQueryFromMode(sortMode), [sortMode]);

  const loadCategories = useCallback(async () => {
    const nextCategories = await api.getCategories();
    setCategories(nextCategories);
  }, []);

  const loadDocuments = useCallback(async () => {
    setDocumentsLoading(true);
    try {
      const response = await api.getDocuments({
        page,
        pageSize,
        q: searchQuery || undefined,
        sort: currentSort.sort,
        order: currentSort.order,
        categoryId: searchQuery ? undefined : folderId === ROOT_ID ? null : folderId,
      });
      const safeTotalPages = Math.max(1, response.meta.totalPages || 1);
      if (page > safeTotalPages) {
        setPage(safeTotalPages);
        return;
      }
      setDocuments(response.data);
      setDocumentsMeta(response.meta);
    } catch {
      setDocuments([]);
      setDocumentsMeta({
        page,
        pageSize,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    } finally {
      setDocumentsLoading(false);
    }
  }, [currentSort.order, currentSort.sort, folderId, page, pageSize, searchQuery]);

  useEffect(() => {
    void loadCategories().catch(() => setCategories([]));
  }, [loadCategories]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const tree = useMemo(() => buildTree(categories), [categories]);
  const currentFolder = useMemo(() => findNode(tree, folderId) ?? tree, [tree, folderId]);
  const breadcrumbs = useMemo(() => findPath(tree, folderId) ?? [{ id: ROOT_ID, name: "전체 문서" }], [tree, folderId]);
  const folderEntries = useMemo<ExplorerEntry[]>(() => {
    const normalizedQuery = q.trim().toLowerCase();
    return (currentFolder.children ?? [])
      .filter((category) => category.name.toLowerCase().includes(normalizedQuery))
      .map((category) => ({
        key: getFolderKey(category.id),
        kind: "folder" as const,
        id: category.id,
        name: category.name,
      }));
  }, [currentFolder.children, q]);

  const fileEntries = useMemo<ExplorerEntry[]>(() => {
    return documents.map((document) => ({
      key: getDocKey(document.id),
      kind: "doc" as const,
      doc: document,
    }));
  }, [documents]);

  const entries = useMemo(() => [...folderEntries, ...fileEntries], [folderEntries, fileEntries]);
  const entriesByKey = useMemo(() => new Map(entries.map((entry) => [entry.key, entry])), [entries]);

  useEffect(() => {
    const visible = new Set(entries.map((entry) => entry.key));
    setSelectedKeys((current) => current.filter((key) => visible.has(key)));
    setAnchorKey((current) => (current && visible.has(current) ? current : null));
    setEditingKey((current) => (current && visible.has(current) ? current : null));
  }, [entries]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (isTypingTarget) return;

      const hasModifier = event.ctrlKey || event.metaKey;
      if (hasModifier && event.key.toLowerCase() === "c") {
        if (selectedKeys.length === 0) return;
        event.preventDefault();
        setClipboard({
          items: selectedKeys.map((key) => ({
            key,
            kind: key.startsWith("folder:") ? "folder" : "doc",
          })),
          mode: "copy",
        });
        setStatusMessage(`${selectedKeys.length}개 항목을 복사했습니다.`);
        return;
      }
      if (hasModifier && event.key.toLowerCase() === "x") {
        if (selectedKeys.length === 0) return;
        event.preventDefault();
        setClipboard({
          items: selectedKeys.map((key) => ({
            key,
            kind: key.startsWith("folder:") ? "folder" : "doc",
          })),
          mode: "cut",
        });
        setStatusMessage(`${selectedKeys.length}개 항목을 잘라냈습니다.`);
        return;
      }
      if (hasModifier && event.key.toLowerCase() === "v") {
        event.preventDefault();
        void pasteClipboard();
        return;
      }

      if (event.key === "Escape") {
        setSelectedKeys([]);
        setAnchorKey(null);
        setDraggingKeys(null);
        setSelectionBox(null);
        setContextMenu(null);
        setEditingKey(null);
        return;
      }

      if (event.key === "F2" && selectedKeys.length === 1) {
        event.preventDefault();
        beginRename(selectedKeys[0]);
        return;
      }

      if (event.key === "Enter" && selectedKeys.length === 1) {
        const entry = entriesByKey.get(selectedKeys[0]);
        if (!entry) return;
        if (entry.kind === "folder") setFolderId(entry.id);
        else nav(`/documents/${entry.doc.id}`);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [entriesByKey, nav, selectedKeys]);

  useEffect(() => {
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (!contextMenu) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-context-menu]")) return;
      setContextMenu(null);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [contextMenu]);

  useEffect(() => {
    const onWindowPointerDown = (event: globalThis.PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement | null;
      if (isInteractiveTarget(target)) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const withinContainer =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!withinContainer) return;
      setContextMenu(null);
      setSelectionBox({ startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY });
      setSelectedKeys([]);
      setAnchorKey(null);
      activeSelectionPointerId.current = event.pointerId;
    };

    const onWindowPointerMove = (event: globalThis.PointerEvent) => {
      if (activeSelectionPointerId.current !== event.pointerId) return;
      if (!selectionBox) return;
      setSelectionBox((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : current));

      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const dragRect = normalizeRect(
        { x: selectionBox.startX, y: selectionBox.startY },
        { x: event.clientX, y: event.clientY },
      );

      const nextSelected = entries
        .filter((entry) => {
          const el = itemRefs.current.get(entry.key);
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          return intersects(rect, dragRect) && rect.right >= containerRect.left && rect.left <= containerRect.right;
        })
        .map((entry) => entry.key);

      setSelectedKeys(nextSelected);
    };

    const onWindowPointerUp = (event: globalThis.PointerEvent) => {
      if (activeSelectionPointerId.current !== event.pointerId) return;
      activeSelectionPointerId.current = null;
      setSelectionBox(null);
    };

    window.addEventListener("pointerdown", onWindowPointerDown);
    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("pointercancel", onWindowPointerUp);
    return () => {
      window.removeEventListener("pointerdown", onWindowPointerDown);
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("pointerup", onWindowPointerUp);
      window.removeEventListener("pointercancel", onWindowPointerUp);
    };
  }, [entries, selectionBox]);

  const refreshCategories = async () => {
    const nextCategories = await api.getCategories();
    setCategories(nextCategories);
  };

  const refreshDocuments = async () => {
    await loadDocuments();
  };

  const createDocInCurrentFolder = async () => {
    const next = await api.createDocument({
      title: folderId === ROOT_ID ? "새 문서" : `${currentFolder.name} 새 문서`,
      content: [{ type: "paragraph", content: "새 문서를 시작하세요." }],
      status: "draft",
      categoryId: folderId === ROOT_ID ? null : folderId,
    });
    nav(`/documents/${next.id}/edit`);
  };

  const startSelection = (key: string, event: ReactMouseEvent | ReactPointerEvent) => {
    if (event.shiftKey && anchorKey) {
      const anchorIndex = entries.findIndex((entry) => entry.key === anchorKey);
      const nextIndex = entries.findIndex((entry) => entry.key === key);
      if (anchorIndex !== -1 && nextIndex !== -1) {
        const [start, end] = [anchorIndex, nextIndex].sort((a, b) => a - b);
        const range = entries.slice(start, end + 1).map((entry) => entry.key);
        setSelectedKeys(range);
        return;
      }
    }

    if (event.ctrlKey || event.metaKey) {
      setSelectedKeys((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
      setAnchorKey(key);
      return;
    }

    setSelectedKeys([key]);
    setAnchorKey(key);
  };

  const beginRename = (key: string) => {
    const entry = entriesByKey.get(key);
    if (!entry) return;
    setEditingKey(key);
    setSelectedKeys([key]);
    setAnchorKey(key);
    setEditValue(entry.kind === "folder" ? entry.name : entry.doc.title);
    setContextMenu(null);
  };

  const commitRename = async () => {
    if (!editingKey) return;
    const nextName = editValue.trim();
    if (!nextName) {
      setEditingKey(null);
      return;
    }

    const entry = entriesByKey.get(editingKey);
    if (!entry) {
      setEditingKey(null);
      return;
    }

    try {
      if (entry.kind === "folder") {
        await api.renameCategory(entry.id, nextName);
        await refreshCategories();
      } else {
        await api.patchDocument(entry.doc.id, { title: nextName });
        await refreshDocuments();
      }
    } finally {
      setEditingKey(null);
    }
  };

  const deleteSelection = async () => {
    const uniqueKeys = Array.from(new Set(selectedKeys));
    if (uniqueKeys.length === 0) return;
    const confirmed = window.confirm(`${uniqueKeys.length}개 항목을 삭제할까요?`);
    if (!confirmed) return;

    const folders = uniqueKeys.filter((key) => key.startsWith("folder:"));
    const docs = uniqueKeys.filter((key) => key.startsWith("doc:"));
    const folderIds = folders.map((key) => key.replace("folder:", ""));
    const docIds = docs.map((key) => key.replace("doc:", ""));

    await Promise.all([
      ...docIds.map((id) => api.deleteDocument(id)),
      ...folderIds.map((id) => api.deleteCategory(id)),
    ]);

    if (folderIds.length > 0) {
      await refreshCategories();
    }
    if (docIds.length > 0) {
      await refreshDocuments();
    }

    setSelectedKeys([]);
    setAnchorKey(null);
    setEditingKey(null);
    setContextMenu(null);
    setStatusMessage("삭제했습니다.");
  };

  const copySelection = () => {
    if (selectedKeys.length === 0) return;
    setClipboard({
      items: selectedKeys.map((key) => ({
        key,
        kind: key.startsWith("folder:") ? "folder" : "doc",
      })),
      mode: "copy",
    });
    setContextMenu(null);
    setStatusMessage(`${selectedKeys.length}개 항목을 복사했습니다.`);
  };

  const cutSelection = () => {
    if (selectedKeys.length === 0) return;
    setClipboard({
      items: selectedKeys.map((key) => ({
        key,
        kind: key.startsWith("folder:") ? "folder" : "doc",
      })),
      mode: "cut",
    });
    setContextMenu(null);
    setStatusMessage(`${selectedKeys.length}개 항목을 잘라냈습니다.`);
  };

  const handleMoveDocuments = async (docIds: string[], targetFolderId: string | null) => {
    await Promise.all(docIds.map((id) => api.patchDocument(id, { categoryId: targetFolderId })));
    await refreshDocuments();
  };

  const handleMoveFolders = async (folderIds: string[], targetFolderId: string | null) => {
    const movedFolderIds = stripDuplicateNestedFolders(folderIds, categories);
    const invalidTargets = new Set<string>();

    for (const folderIdToMove of movedFolderIds) {
      if (folderIdToMove === targetFolderId) {
        invalidTargets.add(folderIdToMove);
        continue;
      }
      const movingNode = findNode(tree, folderIdToMove);
      if (!movingNode) continue;
      const descendantIds = collectDescendantIds(movingNode);
      if (targetFolderId && descendantIds.has(targetFolderId)) {
        invalidTargets.add(folderIdToMove);
        continue;
      }
      await api.moveCategory(folderIdToMove, targetFolderId === ROOT_ID ? null : targetFolderId, true, 0);
    }

    if (movedFolderIds.length > 0) {
      await refreshCategories();
      await refreshDocuments();
    }

    if (invalidTargets.size > 0) {
      setStatusMessage("자기 자신 또는 하위 폴더로는 이동할 수 없습니다.");
    }
  };

  const copyDocument = async (documentId: string, targetFolderId: string | null) => {
    const source = documents.find((document) => document.id === documentId);
    const detail = source?.content ? source : await api.getDocumentById(documentId);
    const created = await api.createDocument({
      title: `Copy of ${detail.title}`,
      content: detail.content ?? [],
      categoryId: targetFolderId,
      status: detail.status === "published" ? "published" : "draft",
    });
    await refreshDocuments();
    return created;
  };

  const copyFolder = async (folderIdToCopy: string, targetFolderId: string | null) => {
    const source = categories.find((category) => category.id === folderIdToCopy);
    if (!source) return;
    await api.createCategory(`Copy of ${source.name}`, targetFolderId === ROOT_ID ? null : targetFolderId);
    await refreshCategories();
  };

  const pasteClipboard = async (targetFolderId = folderId) => {
    if (!clipboard || clipboard.items.length === 0) return;
    const docs = clipboard.items.filter((item) => item.kind === "doc").map((item) => item.key.replace("doc:", ""));
    const folders = clipboard.items.filter((item) => item.kind === "folder").map((item) => item.key.replace("folder:", ""));
    const normalizedTarget = targetFolderId === ROOT_ID ? null : targetFolderId;

    if (clipboard.mode === "cut") {
      await handleMoveDocuments(docs, normalizedTarget);
      await handleMoveFolders(folders, normalizedTarget);
      setClipboard(null);
      setStatusMessage("이동했습니다.");
      return;
    }

    for (const id of docs) {
      await copyDocument(id, normalizedTarget);
    }
    for (const id of folders) {
      await copyFolder(id, normalizedTarget);
    }
    await refreshCategories();
    await refreshDocuments();
    setStatusMessage("복사했습니다.");
  };

  const openEntry = (entry: ExplorerEntry) => {
    if (entry.kind === "folder") {
      setPage(1);
      setFolderId(entry.id);
    }
    else nav(`/documents/${entry.doc.id}`);
  };

  const handleEntryContextMenu = (entry: ExplorerEntry, event: ReactMouseEvent<HTMLButtonElement | HTMLDivElement>) => {
    event.preventDefault();
    const key = entry.key;
    if (!selectedKeys.includes(key)) {
      setSelectedKeys([key]);
      setAnchorKey(key);
    }
    setContextMenu({ x: event.clientX, y: event.clientY });
  };

  const handleItemDragStart = (entry: ExplorerEntry, event: ReactDragEvent<HTMLButtonElement>) => {
    const nextSelected = selectedKeys.includes(entry.key) ? selectedKeys : [entry.key];
    setSelectedKeys(nextSelected);
    setAnchorKey(entry.key);
    setDraggingKeys(nextSelected);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(nextSelected));
  };

  const handleItemDragEnd = () => {
    setDraggingKeys(null);
  };

  const handleDropToFolder = async (targetFolderId: string | null) => {
    const sourceKeys = draggingKeys ?? selectedKeys;
    if (sourceKeys.length === 0) return;

    const docIds = sourceKeys.filter((key) => key.startsWith("doc:")).map((key) => key.replace("doc:", ""));
    const folderIds = sourceKeys.filter((key) => key.startsWith("folder:")).map((key) => key.replace("folder:", ""));

    if (docIds.length > 0) {
      await handleMoveDocuments(docIds, targetFolderId);
    }
    if (folderIds.length > 0) {
      await handleMoveFolders(folderIds, targetFolderId);
    }

    setDraggingKeys(null);
    setStatusMessage("이동했습니다.");
  };

  const handleContainerPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (isInteractiveTarget(event.target)) return;

    setContextMenu(null);
    setSelectionBox({ startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY });
    setSelectedKeys([]);
    setAnchorKey(null);
    activeSelectionPointerId.current = event.pointerId;
  };

  const handleDropOnContainer = async (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    await handleDropToFolder(folderId === ROOT_ID ? null : folderId);
  };

  const selectionBoxStyle = selectionBox && containerRef.current
    ? (() => {
        const rect = containerRef.current.getBoundingClientRect();
        const left = Math.min(selectionBox.startX, selectionBox.x) - rect.left;
        const top = Math.min(selectionBox.startY, selectionBox.y) - rect.top;
        return {
          left,
          top,
          width: Math.abs(selectionBox.x - selectionBox.startX),
          height: Math.abs(selectionBox.y - selectionBox.startY),
        };
      })()
    : null;

  const totalPages = Math.max(1, documentsMeta.totalPages || 1);

  return (
    <div
      ref={containerRef}
      className="relative min-h-[calc(100vh-12rem)] space-y-4 pb-24"
      onPointerDown={handleContainerPointerDown}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDropOnContainer}
    >
      <div className="text-sm text-slate-500 dark:text-slate-300">
        {breadcrumbs.map((breadcrumb, index) => (
          <button
            type="button"
            key={breadcrumb.id}
            onClick={() => {
              setPage(1);
              setFolderId(breadcrumb.id);
            }}
            className="mr-1 hover:underline"
          >
            {index > 0 ? "> " : ""}
            {breadcrumb.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="문서 검색"
          value={q}
          onChange={(event) => {
            setPage(1);
            setQ(event.target.value);
          }}
          className="w-56"
        />
        <Button className="whitespace-nowrap" onClick={createDocInCurrentFolder}>
          <Plus size={16} />
          문서 작성
        </Button>
        <select
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm dark:bg-slate-700"
          value={view}
          onChange={(event) => setView(event.target.value as "folder" | "list")}
        >
          <option value="list">세로보기</option>
          <option value="folder">폴더보기</option>
        </select>
        <select
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm dark:bg-slate-700"
          value={sortMode}
          onChange={(event) => {
            setPage(1);
            setSortMode(event.target.value as SortMode);
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-300">
        <span>선택 {selectedKeys.length}개</span>
        {clipboard ? <span>{clipboard.mode === "cut" ? "잘라내기 준비됨" : "복사 준비됨"}</span> : null}
        {statusMessage ? <span>{statusMessage}</span> : null}
      </div>

      {documentsLoading ? (
        <div>불러오는 중...</div>
      ) : entries.length === 0 ? (
        <Card>현재 폴더에 항목이 없습니다.</Card>
      ) : (
        <div className={view === "folder" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
          {entries.map((entry) => {
            const selected = selectedKeys.includes(entry.key);
            const dragging = draggingKeys?.includes(entry.key) ?? false;
            const editing = editingKey === entry.key;
            const cut = clipboard?.mode === "cut" && clipboard.items.some((item) => item.key === entry.key);
            return (
              <div
                key={entry.key}
                data-entry-key={entry.key}
                ref={(element) => {
                  if (!element) itemRefs.current.delete(entry.key);
                  else itemRefs.current.set(entry.key, element);
                }}
                className="relative"
              >
                <ExplorerCard
                  entry={entry.kind === "folder" ? { kind: "folder", id: entry.id, name: entry.name } : { kind: "doc", doc: entry.doc }}
                  compact={view === "list"}
                  selected={selected}
                  dragging={dragging}
                  cut={cut}
                  draggable
                  editing={editing}
                  editValue={editValue}
                  onEditValueChange={setEditValue}
                  onEditCommit={() => void commitRename()}
                  onEditCancel={() => setEditingKey(null)}
                  onClick={(event) => {
                    if (event.ctrlKey || event.metaKey || event.shiftKey) {
                      event.preventDefault();
                      event.stopPropagation();
                      startSelection(entry.key, event);
                      return;
                    }
                    setSelectedKeys([]);
                    setAnchorKey(null);
                    openEntry(entry);
                  }}
                  onDoubleClick={() => openEntry(entry)}
                  onContextMenu={(event) => handleEntryContextMenu(entry, event)}
                  onDragStart={(event) => handleItemDragStart(entry, event)}
                  onDragEnd={handleItemDragEnd}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={async (event) => {
                    event.preventDefault();
                    if (entry.kind === "folder") {
                      await handleDropToFolder(entry.id);
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3 pt-2 text-sm">
          <Button type="button" className="bg-slate-700 px-3 py-2" disabled={!documentsMeta.hasPrev} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            이전
          </Button>
          <div className="text-slate-600 dark:text-slate-300">
            {documentsMeta.page} / {totalPages} 페이지
          </div>
          <Button type="button" className="bg-slate-700 px-3 py-2" disabled={!documentsMeta.hasNext} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
            다음
          </Button>
        </div>
      ) : null}

      {selectionBoxStyle ? (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-sky-400/70 bg-sky-400/15"
          style={{
            left: selectionBoxStyle.left,
            top: selectionBoxStyle.top,
            width: selectionBoxStyle.width,
            height: selectionBoxStyle.height,
          }}
        />
      ) : null}

      {contextMenu ? (
        <div
          data-context-menu
          className="fixed z-50 min-w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700" type="button" onClick={copySelection}>
            복사하기
          </button>
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700" type="button" onClick={cutSelection}>
            잘라내기
          </button>
          {selectedKeys.length === 1 ? (
            <button
              className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
              type="button"
              onClick={() => {
                beginRename(selectedKeys[0]);
                setContextMenu(null);
              }}
            >
              이름 수정
            </button>
          ) : null}
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" type="button" onClick={deleteSelection}>
            삭제
          </button>
        </div>
      ) : null}
    </div>
  );
}
