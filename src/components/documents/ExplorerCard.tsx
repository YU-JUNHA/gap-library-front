import type { ChangeEvent, DragEvent, MouseEvent, PointerEvent, KeyboardEvent } from "react";
import { Folder, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Document } from "@/types/document";
import { getAvatarSrc } from "@/lib/avatar";

export type ExplorerFolderEntry = {
  kind: "folder";
  id: string;
  name: string;
};

export type ExplorerDocumentEntry = {
  kind: "doc";
  doc: Document;
};

type ExplorerCardProps = {
  entry: ExplorerFolderEntry | ExplorerDocumentEntry;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onDoubleClick?: () => void;
  onContextMenu?: (event: MouseEvent<HTMLButtonElement | HTMLDivElement>) => void;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: () => void;
  onDragOver?: (event: DragEvent<HTMLButtonElement>) => void;
  onDrop?: (event: DragEvent<HTMLButtonElement>) => void;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
  editing?: boolean;
  editValue?: string;
  onEditValueChange?: (value: string) => void;
  onEditCommit?: () => void;
  onEditCancel?: () => void;
  compact?: boolean;
  selected?: boolean;
  dragging?: boolean;
  cut?: boolean;
  draggable?: boolean;
};

function getAvatarUrl(document: Document) {
  return getAvatarSrc(document.ownerAvatarUrl);
}

function ExplorerIcon({ kind }: { kind: "folder" | "doc" }) {
  return kind === "folder" ? (
    <Folder size={18} className="shrink-0 text-amber-600" />
  ) : (
    <FileText size={18} className="shrink-0 text-slate-500 dark:text-slate-400" />
  );
}

export function ExplorerCard(props: ExplorerCardProps) {
  const {
    entry,
    compact = false,
    selected = false,
    dragging = false,
    cut = false,
    draggable = false,
    editing = false,
    editValue = "",
  } = props;
  const shellClass = [
    "h-full transition-colors",
    compact ? "min-h-[52px] p-2" : "min-h-[152px] p-4",
    selected ? "ring-2 ring-sky-400 bg-sky-50/80 dark:bg-sky-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-700",
    dragging ? "opacity-60" : "",
    cut ? "opacity-45" : "",
  ].join(" ");

  if (entry.kind === "folder") {
    return (
      <Card className={shellClass}>
        {editing ? (
          <div className={compact ? "flex h-full w-full items-center text-left" : "block h-full w-full text-left"}>
            <div className={`flex w-full ${compact ? "items-center gap-2" : "items-start gap-3"}`}>
              <div className={compact ? "shrink-0" : "mt-0.5"}>
                <ExplorerIcon kind="folder" />
              </div>
              <input
                autoFocus
                value={editValue}
                onChange={(event: ChangeEvent<HTMLInputElement>) => props.onEditValueChange?.(event.target.value)}
                onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                  if (event.key === "Enter") props.onEditCommit?.();
                  if (event.key === "Escape") props.onEditCancel?.();
                }}
                onBlur={props.onEditCancel}
                className="min-w-0 flex-1 rounded-md border border-sky-300 bg-white px-2 py-1 text-base font-semibold outline-none ring-2 ring-sky-100 dark:border-sky-700 dark:bg-slate-800 dark:ring-sky-950/50"
              />
            </div>
          </div>
        ) : (
            <button
              type="button"
              className={compact ? "flex h-full w-full items-center text-left" : "block h-full w-full text-left"}
              onClick={props.onClick}
              onDoubleClick={props.onDoubleClick}
            onContextMenu={props.onContextMenu}
            draggable={draggable}
            onDragStart={props.onDragStart}
            onDragEnd={props.onDragEnd}
            onDragOver={props.onDragOver}
            onDrop={props.onDrop}
            onPointerDown={props.onPointerDown}
          >
            <div className={`flex w-full ${compact ? "items-center gap-2" : "items-start gap-3"}`}>
              <div className={compact ? "shrink-0" : "mt-0.5"}>
                <ExplorerIcon kind="folder" />
              </div>
              <div className={`min-w-0 flex-1 ${compact ? "flex items-center" : ""}`}>
                <div className={`${compact ? "line-clamp-1 text-[15px]" : "line-clamp-2 text-base"} font-semibold leading-snug`}>
                  {entry.name}
                </div>
              </div>
            </div>
          </button>
        )}
      </Card>
    );
  }

  const document = entry.doc;

  return (
    <Card className={shellClass}>
      {editing ? (
        <div className={compact ? "flex h-full w-full items-center text-left" : "block h-full w-full text-left"}>
          <div className={`flex w-full ${compact ? "items-center gap-2" : "items-start gap-3"}`}>
            <div className={compact ? "shrink-0" : "mt-0.5"}>
              <ExplorerIcon kind="doc" />
            </div>
            <input
              autoFocus
              value={editValue}
              onChange={(event: ChangeEvent<HTMLInputElement>) => props.onEditValueChange?.(event.target.value)}
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                if (event.key === "Enter") props.onEditCommit?.();
                if (event.key === "Escape") props.onEditCancel?.();
              }}
              onBlur={props.onEditCancel}
              className="min-w-0 flex-1 rounded-md border border-sky-300 bg-white px-2 py-1 text-base font-semibold outline-none ring-2 ring-sky-100 dark:border-sky-700 dark:bg-slate-800 dark:ring-sky-950/50"
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={compact ? "flex h-full w-full items-center text-left" : "block h-full w-full text-left"}
          onClick={props.onClick}
          onDoubleClick={props.onDoubleClick}
          onContextMenu={props.onContextMenu}
          draggable={draggable}
          onDragStart={props.onDragStart}
          onDragEnd={props.onDragEnd}
          onDragOver={props.onDragOver}
          onDrop={props.onDrop}
          onPointerDown={props.onPointerDown}
        >
          <div className={`flex w-full ${compact ? "items-center gap-2" : "items-start gap-3"}`}>
            <div className={compact ? "shrink-0" : "mt-0.5"}>
              <ExplorerIcon kind="doc" />
            </div>
            <div className={`min-w-0 ${compact ? "flex flex-1 flex-wrap items-center gap-x-2 gap-y-0.5" : "flex-1"}`}>
              <div className={`${compact ? "truncate text-[15px]" : "line-clamp-2 text-base"} font-semibold leading-snug`}>
                {document.title}
              </div>
              {compact ? (
                <>
                  <span className="shrink-0 text-slate-300 dark:text-slate-600">|</span>
                  <div className="min-w-0 flex-1 truncate text-sm text-slate-600 dark:text-slate-300">
                    {document.summary || document.contentText?.slice(0, 100)}
                  </div>
                  <span className="shrink-0 text-slate-300 dark:text-slate-600">|</span>
                  <div className="flex min-w-0 items-center gap-1 text-xs text-slate-500 dark:text-slate-300">
                    <img
                      src={getAvatarUrl(document)}
                      alt={document.ownerName ?? document.ownerId}
                      className="h-4 w-4 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-600"
                    />
                    <span className="truncate">{document.ownerName ?? document.ownerId}</span>
                    <span className="shrink-0">·</span>
                    <span className="shrink-0">{new Date(document.updatedAt).toLocaleDateString()}</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {!compact ? (
            <>
              <div className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                {document.summary || document.contentText?.slice(0, 100)}
              </div>

              <div className="mt-auto flex items-center gap-2 pt-3 text-xs text-slate-500 dark:text-slate-300">
                <img
                  src={getAvatarUrl(document)}
                  alt={document.ownerName ?? document.ownerId}
                  className="h-5 w-5 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-600"
                />
                <span className="min-w-0 truncate">{document.ownerName ?? document.ownerId}</span>
                <span className="shrink-0">·</span>
                <span className="shrink-0">{new Date(document.updatedAt).toLocaleString()}</span>
              </div>
            </>
          ) : null}
        </button>
      )}
    </Card>
  );
}
