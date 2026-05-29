import { useMemo, useState } from "react";
import { ChevronRight, Folder, FolderOpen, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Document } from "@/types/document";

export type CategoryNode = {
  id: string;
  name: string;
  children?: CategoryNode[];
  documentIds?: string[];
};

type CategoryTreeProps = {
  tree: CategoryNode[];
  documents: Document[];
  onSelectDocument: (id: string) => void;
};

export function CategoryTree({ tree, documents, onSelectDocument }: CategoryTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const byId = useMemo(() => new Map(documents.map((d) => [d.id, d])), [documents]);

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNode = (node: CategoryNode, depth = 0) => {
    const isOpen = !!expanded[node.id];
    return (
      <div key={node.id}>
        <button
          type="button"
          onClick={() => toggle(node.id)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-100"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          <ChevronRight size={14} className={isOpen ? "rotate-90 transition-transform" : "transition-transform"} />
          {isOpen ? <FolderOpen size={15} className="text-amber-600" /> : <Folder size={15} className="text-amber-600" />}
          <span>{node.name}</span>
        </button>
        {isOpen && (
          <div className="space-y-1">
            {node.children?.map((child) => renderNode(child, depth + 1))}
            {(node.documentIds ?? []).map((docId) => {
              const doc = byId.get(docId);
              if (!doc) return null;
              return (
                <button
                  key={docId}
                  type="button"
                  onClick={() => onSelectDocument(docId)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                  style={{ paddingLeft: `${34 + depth * 14}px` }}
                >
                  <FileText size={14} />
                  <span className="truncate">{doc.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <h3 className="mb-2 font-semibold">카테고리 폴더</h3>
      <div className="space-y-1">{tree.map((node) => renderNode(node))}</div>
    </Card>
  );
}

