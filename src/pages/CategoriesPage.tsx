import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Folder, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";

type FolderNode = { id: string; name: string; children: FolderNode[] };
type Category = { id: string; name: string; parentId: string | null };

type ActiveAction = "add-child" | "rename" | null;
type ContextMenuState = { nodeId: string; x: number; y: number } | null;

const ROOT_ID = "root";

function buildTree(categories: Category[]): FolderNode {
  const map = new Map<string, FolderNode>();
  categories.forEach((c) => map.set(c.id, { id: c.id, name: c.name, children: [] }));
  const root: FolderNode = { id: ROOT_ID, name: "전체 문서", children: [] };
  categories.forEach((c) => {
    const node = map.get(c.id);
    if (!node) return;
    if (!c.parentId || !map.has(c.parentId)) root.children.push(node);
    else map.get(c.parentId)!.children.push(node);
  });
  return root;
}

function findNode(node: FolderNode, id: string): FolderNode | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

function collectDescendantIds(node: FolderNode): string[] {
  const ids: string[] = [];
  for (const child of node.children) {
    ids.push(child.id, ...collectDescendantIds(child));
  }
  return ids;
}

function TreeNode(props: {
  node: FolderNode;
  level?: number;
  selectedId: string;
  draggingId: string | null;
  editingNodeId: string | null;
  actionMode: ActiveAction;
  draftName: string;
  onDraftNameChange: (value: string) => void;
  onSelect: (id: string) => void;
  onContextMenu: (id: string, x: number, y: number) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (targetId: string) => void;
  onBeginAddChild: (parentId: string) => void;
  onBeginRename: (nodeId: string) => void;
  onCommitAddChild: () => void;
  onCommitRename: () => void;
  onDeleteNode: (id: string, name: string) => void;
  onCancelAction: () => void;
}) {
  const {
    node,
    level = 0,
    selectedId,
    draggingId,
    editingNodeId,
    actionMode,
    draftName,
    onDraftNameChange,
    onSelect,
    onContextMenu,
    onDragStart,
    onDragOver,
    onDrop,
    onBeginAddChild,
    onBeginRename,
    onCommitAddChild,
    onCommitRename,
    onDeleteNode,
    onCancelAction,
  } = props;

  const isRoot = node.id === ROOT_ID;
  const isEditingRename = actionMode === "rename" && editingNodeId === node.id;
  const showHoverButtons = selectedId === node.id || editingNodeId === node.id;

  return (
    <div className="relative">
      {level > 0 && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-2 top-0 bottom-0 w-px bg-slate-200/80 dark:bg-slate-700/80"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-2 top-6 h-px w-3 bg-slate-200/80 dark:bg-slate-700/80"
          />
        </>
      )}
      <div
        role="button"
        tabIndex={0}
        draggable={!isRoot}
        onClick={() => onSelect(node.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(node.id);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(node.id, e.clientX, e.clientY);
        }}
        onDragStart={() => onDragStart(node.id)}
        onDragOver={onDragOver}
        onDrop={() => onDrop(node.id)}
        className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
          selectedId === node.id ? "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-50" : "hover:bg-slate-100/80 dark:hover:bg-slate-700/70"
        } ${draggingId === node.id ? "opacity-50" : ""}`}
        style={{ paddingLeft: `${8 + level * 16}px` }}
      >
        <Folder size={14} className="shrink-0 text-amber-600" />
        {isEditingRename ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              autoFocus
              value={draftName}
              onChange={(e) => onDraftNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (draftName.trim()) onCommitRename();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  onCancelAction();
                }
              }}
              className="h-8 max-w-sm"
            />
            <Button type="button" className="h-8 px-3 py-1" onClick={onCommitRename}>
              저장
            </Button>
            <Button type="button" className="h-8 bg-slate-700 px-3 py-1" onClick={onCancelAction}>
              취소
            </Button>
          </div>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate">{node.name}</span>
            {showHoverButtons && (
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-600"
                  title="하위 폴더 추가"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBeginAddChild(node.id);
                  }}
                >
                  <Plus size={12} />
                </button>
                <button
                  type="button"
                  className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-30"
                  title="이름 수정"
                  disabled={isRoot}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isRoot) return;
                    onBeginRename(node.id);
                  }}
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-30"
                  title="삭제"
                  disabled={isRoot}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isRoot) return;
                    onDeleteNode(node.id, node.name);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </span>
            )}
          </>
        )}
      </div>

      {actionMode === "add-child" && editingNodeId === node.id && (
        <div style={{ paddingLeft: `${24 + level * 16}px` }} className="py-1.5">
          <div className="flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1.5 dark:bg-slate-800">
            <Folder size={14} className="shrink-0 text-amber-600" />
            <Input
              autoFocus
              value={draftName}
              onChange={(e) => onDraftNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (draftName.trim()) onCommitAddChild();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  onCancelAction();
                }
              }}
              placeholder="새 폴더 이름"
              className="h-8 max-w-sm"
            />
            <Button type="button" className="h-8 px-3 py-1" onClick={onCommitAddChild}>
              추가
            </Button>
            <Button type="button" className="h-8 bg-slate-700 px-3 py-1" onClick={onCancelAction}>
              취소
            </Button>
          </div>
        </div>
      )}

      {node.children.length > 0 && (
        <div className="space-y-1">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              draggingId={draggingId}
              editingNodeId={editingNodeId}
              actionMode={actionMode}
              draftName={draftName}
              onDraftNameChange={onDraftNameChange}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onBeginAddChild={onBeginAddChild}
              onBeginRename={onBeginRename}
              onCommitAddChild={onCommitAddChild}
              onCommitRename={onCommitRename}
              onDeleteNode={onDeleteNode}
              onCancelAction={onCancelAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoriesPage() {
  const treeRef = useRef<HTMLDivElement | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState(ROOT_ID);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(ROOT_ID);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<ActiveAction>(null);
  const [draftName, setDraftName] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [message, setMessage] = useState("");

  const load = async () => setCategories(await api.getCategories());

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, []);

  useEffect(() => {
    if (!actionMode) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!treeRef.current) return;
      if (treeRef.current.contains(event.target as Node)) return;
      cancelAction();
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [actionMode]);

  const tree = useMemo(() => buildTree(categories), [categories]);
  const contextTarget = useMemo(() => (contextMenu ? findNode(tree, contextMenu.nodeId) : null), [tree, contextMenu]);

  const cancelAction = () => {
    setActionMode(null);
    setDraftName("");
    setEditingNodeId(selectedId);
  };

  const selectNode = (id: string) => {
    setSelectedId(id);
    setEditingNodeId(id);
    setActionMode(null);
    setContextMenu(null);
    setMessage("");
  };

  const openAction = (mode: ActiveAction, nodeId: string) => {
    setSelectedId(nodeId);
    setEditingNodeId(nodeId);
    setActionMode(mode);
    setDraftName(mode === "rename" ? findNode(tree, nodeId)?.name ?? "" : "");
    setContextMenu(null);
  };

  const createCategory = async () => {
    if (!draftName.trim() || !editingNodeId) return;
    await api.createCategory(draftName.trim(), editingNodeId === ROOT_ID ? null : editingNodeId);
    setMessage("폴더를 추가했습니다.");
    cancelAction();
    await load();
  };

  const renameCategory = async () => {
    if (!draftName.trim() || !editingNodeId || editingNodeId === ROOT_ID) return;
    await api.renameCategory(editingNodeId, draftName.trim());
    setMessage("이름을 수정했습니다.");
    cancelAction();
    await load();
  };

  const deleteCategory = async (targetId: string, targetName: string) => {
    if (targetId === ROOT_ID) return;
    if (!window.confirm(`'${targetName}' 폴더를 삭제할까요?`)) return;
    await api.deleteCategory(targetId);
    if (selectedId === targetId) setSelectedId(ROOT_ID);
    if (editingNodeId === targetId) setEditingNodeId(ROOT_ID);
    setActionMode(null);
    setMessage("폴더를 삭제했습니다.");
    await load();
  };

  const onDrop = async (targetId: string) => {
    if (!draggingId || draggingId === targetId || draggingId === ROOT_ID) return;
    const source = findNode(tree, draggingId);
    if (!source) return;
    if (collectDescendantIds(source).includes(targetId)) return;
    await api.moveCategory(draggingId, targetId === ROOT_ID ? null : targetId, true, 0);
    setDraggingId(null);
    setMessage("폴더 위치를 변경했습니다.");
    await load();
  };

  const beginAddFromRoot = () => {
    setSelectedId(ROOT_ID);
    setEditingNodeId(ROOT_ID);
    setActionMode("add-child");
    setDraftName("");
    setContextMenu(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">카테고리 관리</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">폴더 트리 내부에서 바로 추가, 수정, 삭제를 처리합니다.</p>
      </div>

      <div ref={treeRef}>
        <Card className="min-h-[72vh] overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3 dark:border-slate-700">
          <div>
            <div className="text-sm font-semibold">폴더 트리</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">우클릭 메뉴와 인라인 입력을 모두 지원합니다.</div>
          </div>
        </div>

        <div className="space-y-3 p-3">
          <div
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium ${
              selectedId === ROOT_ID ? "bg-slate-100 dark:bg-slate-700" : "hover:bg-slate-100/80 dark:hover:bg-slate-700/70"
            }`}
            onClick={() => selectNode(ROOT_ID)}
            onContextMenu={(e) => {
              e.preventDefault();
              setSelectedId(ROOT_ID);
              setEditingNodeId(ROOT_ID);
              setContextMenu({ nodeId: ROOT_ID, x: e.clientX, y: e.clientY });
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(ROOT_ID)}
            role="button"
            tabIndex={0}
          >
            <Folder size={14} className="text-amber-600" />
            <span className="flex-1">{tree.name}</span>
            <button
              type="button"
              className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-600"
              title="하위 폴더 추가"
              onClick={(e) => {
                e.stopPropagation();
                beginAddFromRoot();
              }}
            >
              <Plus size={12} />
            </button>
          </div>

          {actionMode === "add-child" && editingNodeId === ROOT_ID && (
            <div className="py-1.5 pl-4">
              <div className="flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1.5 dark:bg-slate-800">
                <Folder size={14} className="shrink-0 text-amber-600" />
                <Input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (draftName.trim()) void createCategory();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelAction();
                    }
                  }}
                  placeholder="새 폴더 이름"
                  className="h-8 max-w-sm"
                />
                <Button type="button" className="h-8 px-3 py-1" onClick={() => void createCategory()}>
                  추가
                </Button>
                <Button type="button" className="h-8 bg-slate-700 px-3 py-1" onClick={cancelAction}>
                  취소
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {tree.children.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                selectedId={selectedId}
                draggingId={draggingId}
                editingNodeId={editingNodeId}
                actionMode={actionMode}
                draftName={draftName}
                onDraftNameChange={setDraftName}
                onSelect={selectNode}
                onContextMenu={(id, x, y) => setContextMenu({ nodeId: id, x, y })}
                onDragStart={setDraggingId}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onBeginAddChild={(nodeId) => openAction("add-child", nodeId)}
                onBeginRename={(nodeId) => openAction("rename", nodeId)}
                onCommitAddChild={createCategory}
                onCommitRename={renameCategory}
                onDeleteNode={deleteCategory}
                onCancelAction={cancelAction}
              />
            ))}
          </div>

          {message && <div className="text-sm text-emerald-600 dark:text-emerald-300">{message}</div>}
        </div>
        </Card>
      </div>

      {contextMenu && contextTarget && (
        <div
          className="fixed z-50 min-w-44 rounded-xl border border-line bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={() => openAction("add-child", contextTarget.id)}
          >
            <Plus size={14} /> 하위 폴더 추가
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={contextTarget.id === ROOT_ID}
            onClick={() => openAction("rename", contextTarget.id)}
          >
            <Pencil size={14} /> 이름 수정
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={contextTarget.id === ROOT_ID}
            onClick={() => void deleteCategory(contextTarget.id, contextTarget.name)}
          >
            <Trash2 size={14} /> 삭제
          </button>
        </div>
      )}
    </div>
  );
}
