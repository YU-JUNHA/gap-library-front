import type { Document } from "@/types/document";
import { useEffect, useMemo, useState } from "react";
import { mockApi } from "@/lib/mock-api";

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mockApi.getDocuments().then((d) => {
      setDocuments(d);
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: documents.length,
      recentlyUpdated: documents.filter((d) => now - new Date(d.updatedAt).getTime() < 1000 * 60 * 60 * 24 * 14).length,
    };
  }, [documents]);

  return { documents, setDocuments, loading, stats };
}
