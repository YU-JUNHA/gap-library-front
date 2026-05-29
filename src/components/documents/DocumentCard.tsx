import type { Document } from "@/types/document";
import { Card } from "@/components/ui/Card";

export function DocumentCard({ document }: { document: Document }) {
  return <Card><div className="font-semibold">{document.title}</div></Card>;
}
