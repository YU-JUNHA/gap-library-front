import { useMemo, useState, type DragEvent } from "react";
import { Folder, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { addFolderToTree, findFolderById, folderTree, moveFolderInTree, removeFolderFromTree, renameFolderInTree, type FolderNode } from "@/data/mock-categories";
import { storage } from "@/lib/storage";

function TreeNode(props: {
  node: FolderNode;
  level?: number;
  selectedId: string;
  draggingId: string | null;
  onSelect: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: DragEvent<HTMLButtonElement>) => void;
  onDrop: (targetId: string) => void;
}) {
  const { node, level = 0, selectedId, draggingId, onSelect, onDragStart, onDragOver, onDrop } = props;
  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        draggable={node.id !== "root"}
        onDragStart={() => onDragStart(node.id)}
        onDragOver={onDragOver}
        onDrop={() => onDrop(node.id)}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm ${selectedId === node.id ? "bg-slate-100 dark:bg-slate-700" : "hover:bg-slate-50 dark:hover:bg-slate-800"} ${draggingId === node.id ? "opacity-50" : ""}`}
        style={{ paddingLeft: `${8 + level * 16}px` }}
      >
        <Folder size={14} className="text-amber-600" />
        <span>{node.name}</span>
      </button>
      {(node.children ?? []).map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          level={level + 1}
          selectedId={selectedId}
          draggingId={draggingId}
          onSelect={onSelect}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
        />
      ))}
    </div>
  );
}

export function CategoriesPage() {
  const [tree, setTree] = useState<FolderNode>(() => storage.get<FolderNode>("gap-folder-tree", folderTree));
  const [selectedId, setSelectedId] = useState("root");
  const [newFolderName, setNewFolderName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
  const [confirmMove, setConfirmMove] = useState(false);

  const selected = useMemo(() => findFolderById(tree, selectedId) ?? tree, [tree, selectedId]);
  const draggingFolder = useMemo(() => (draggingId ? findFolderById(tree, draggingId) : null), [tree, draggingId]);
  const moveTargetFolder = useMemo(() => (moveTargetId ? findFolderById(tree, moveTargetId) : null), [tree, moveTargetId]);

  const persist = (next: FolderNode) => {
    setTree(next);
    storage.set("gap-folder-tree", next);
  };

  const onAdd = () => {
    if (!newFolderName.trim()) return;
    const next = addFolderToTree(tree, selected.id, newFolderName.trim());
    persist(next);
    setNewFolderName("");
  };

  const onRename = () => {
    if (!renameValue.trim()) return;
    const next = renameFolderInTree(tree, selected.id, renameValue.trim());
    persist(next);
    setRenameValue("");
  };

  const onDelete = () => {
    if (selected.id === "root") return;
    const ok = window.confirm(`'${selected.name}' 폴더를 삭제할까요?`);
    if (!ok) return;
    const next = removeFolderFromTree(tree, selected.id);
    persist(next);
    setSelectedId("root");
  };

  const openMoveConfirm = (targetId: string) => {
    if (!draggingId || draggingId === targetId || draggingId === "root") return;
    setMoveTargetId(targetId);
    setConfirmMove(false);
  };

  const onMoveConfirm = () => {
    if (!draggingId || !moveTargetId || !confirmMove) return;
    const next = moveFolderInTree(tree, draggingId, moveTargetId);
    persist(next);
    setDraggingId(null);
    setMoveTargetId(null);
    setConfirmMove(false);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">카테고리 관리</h1>
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit">
          <div className="mb-2 text-sm font-medium">폴더 트리</div>
          <div className="mb-2 text-xs text-slate-500 dark:text-slate-300">폴더를 드래그해서 다른 폴더 위에 드롭하면 이동할 수 있습니다.</div>
          <div className="space-y-1">
            <TreeNode
              node={tree}
              selectedId={selectedId}
              draggingId={draggingId}
              onSelect={setSelectedId}
              onDragStart={setDraggingId}
              onDragOver={(e) => e.preventDefault()}
              onDrop={openMoveConfirm}
            />
          </div>
        </Card>
        <Card className="space-y-4">
          <div>
            <div className="text-sm text-slate-500 dark:text-slate-300">선택 폴더</div>
            <div className="mt-1 text-lg font-semibold">{selected.name}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">하위 폴더 추가</div>
            <div className="flex gap-2">
              <Input placeholder="새 폴더 이름" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} />
              <Button onClick={onAdd}><Plus size={14} />추가</Button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">폴더 이름 변경</div>
            <div className="flex gap-2">
              <Input placeholder="변경할 이름" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
              <Button onClick={onRename}><Pencil size={14} />변경</Button>
            </div>
          </div>
          <div>
            <Button
              onClick={onDelete}
              disabled={selected.id === "root"}
              className="bg-red-600 hover:bg-red-500 disabled:bg-slate-400"
            >
              <Trash2 size={14} />
              폴더 삭제
            </Button>
          </div>
        </Card>
      </div>

      {moveTargetId && draggingFolder && moveTargetFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-line bg-white p-4 dark:bg-slate-800">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">폴더 이동 확인</h3>
              <button type="button" onClick={() => { setMoveTargetId(null); setConfirmMove(false); }} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <strong>{draggingFolder.name}</strong> 폴더 및 하위 항목들을 <strong>{moveTargetFolder.name}</strong>(으)로 옮기시겠습니까?
            </p>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={confirmMove} onChange={(e) => setConfirmMove(e.target.checked)} />
              확인했습니다. 이동을 진행합니다.
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <Button className="bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-500" onClick={() => { setMoveTargetId(null); setConfirmMove(false); }}>취소</Button>
              <Button onClick={onMoveConfirm} disabled={!confirmMove}>이동하기</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
