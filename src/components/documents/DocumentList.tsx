import type { Document } from "@/types/document";
import { DocumentCard } from "@/components/documents/DocumentCard";

export function DocumentList({ documents }: { documents: Document[] }) {
  return <div className="grid gap-3">{documents.map((d) => <DocumentCard key={d.id} document={d} />)}</div>;
}
