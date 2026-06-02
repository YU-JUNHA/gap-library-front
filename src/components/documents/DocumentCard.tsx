import type { Document } from "@/types/document";
import { Card } from "@/components/ui/Card";
import { FileText } from "lucide-react";
import { getAvatarSrc } from "@/lib/avatar";

function getAvatarUrl(document: Document) {
  return getAvatarSrc(document.ownerAvatarUrl);
}

export function DocumentCard({ document }: { document: Document }) {
  return (
    <Card className="h-full p-4 hover:bg-slate-50 dark:hover:bg-slate-700">
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            <FileText size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 font-semibold leading-snug">{document.title}</div>
            <div className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{document.summary || document.contentText?.slice(0, 100)}</div>
          </div>
        </div>

        <div className="mt-auto flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
          <img src={getAvatarUrl(document)} alt={document.ownerName ?? document.ownerId} className="h-5 w-5 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-600" />
          <span className="min-w-0 truncate">{document.ownerName ?? document.ownerId}</span>
          <span className="shrink-0">·</span>
          <span className="shrink-0">{new Date(document.updatedAt).toLocaleString()}</span>
        </div>
      </div>
    </Card>
  );
}
