import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { UploadTrendChart, type TrendUnit } from "@/components/dashboard/UploadTrendChart";
import { Card } from "@/components/ui/Card";
import type { Document } from "@/types/document";

const RECENT_PUBLISHED_LIMIT = 5;
const MY_UPLOAD_PAGE_SIZE = 100;

type MyPublishedDocument = Pick<Document, "id" | "ownerId" | "updatedAt">;

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMyUploadPoints(docs: MyPublishedDocument[], unit: TrendUnit) {
  const now = new Date();

  if (unit === "week") {
    const weekStart = startOfDay(addDays(now, -now.getDay()));
    const labels = ["일", "월", "화", "수", "목", "금", "토"];
    return labels.map((label, index) => {
      const day = addDays(weekStart, index);
      return {
        label,
        count: docs.filter((doc) => isSameDay(new Date(doc.updatedAt), day)).length,
      };
    });
  }

  if (unit === "month") {
    const buckets = [
      { label: "1주차", start: 1, end: 7 },
      { label: "2주차", start: 8, end: 14 },
      { label: "3주차", start: 15, end: 21 },
      { label: "4주차", start: 22, end: 28 },
      { label: "5주차", start: 29, end: 31 },
    ];

    return buckets.map((bucket) => ({
      label: bucket.label,
      count: docs.filter((doc) => {
        const date = new Date(doc.updatedAt);
        if (date.getFullYear() !== now.getFullYear()) return false;
        if (date.getMonth() !== now.getMonth()) return false;
        const day = date.getDate();
        return day >= bucket.start && day <= bucket.end;
      }).length,
    }));
  }

  return Array.from({ length: 12 }, (_, index) => ({
    label: `${index + 1}월`,
    count: docs.filter((doc) => {
      const date = new Date(doc.updatedAt);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === index;
    }).length,
  }));
}

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    totalDocuments: number;
    myDocuments: number;
    recentEditedDocuments: Array<{ id: string; title: string; updatedAt: string }>;
    draftDocuments: Array<{
      id: string;
      title: string;
      updatedAt: string;
      categoryId?: string | null;
      categoryName?: string | null;
      summary?: string | null;
      ownerId?: string;
      ownerName?: string;
    }>;
    uploadTrend: { points: Array<{ label: string; userName: string; count: number }> };
  } | null>(null);
  const [recentPublishedDocuments, setRecentPublishedDocuments] = useState<Array<{
    id: string;
    title: string;
    updatedAt: string;
    ownerName?: string;
  }>>([]);
  const [myPublishedDocuments, setMyPublishedDocuments] = useState<MyPublishedDocument[]>([]);
  const [trendUnit, setTrendUnit] = useState<TrendUnit>("week");

  useEffect(() => {
    api.getDashboardStats().then(setStats).catch(() => setStats(null));
  }, []);

  useEffect(() => {
    api
      .getDocuments({
        page: 1,
        pageSize: RECENT_PUBLISHED_LIMIT,
        sort: "updatedAt",
        order: "desc",
        status: "published",
      })
      .then((response) => {
        setRecentPublishedDocuments(
          response.data.map((document) => ({
            id: document.id,
            title: document.title,
            updatedAt: document.updatedAt,
            ownerName: document.ownerName,
          })),
        );
      })
      .catch(() => setRecentPublishedDocuments([]));
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;

    const loadMyPublishedDocuments = async () => {
      const collected: MyPublishedDocument[] = [];
      let page = 1;

      while (alive) {
        const response = await api.getDocuments({
          page,
          pageSize: MY_UPLOAD_PAGE_SIZE,
          sort: "updatedAt",
          order: "desc",
          status: "published",
        });
        collected.push(
          ...response.data
            .filter((document) => document.ownerId === user.id)
            .map((document) => ({
              id: document.id,
              ownerId: document.ownerId,
              updatedAt: document.updatedAt,
            })),
        );
        if (!response.meta.hasNext) break;
        page += 1;
      }

      if (alive) setMyPublishedDocuments(collected);
    };

    loadMyPublishedDocuments().catch(() => {
      if (alive) setMyPublishedDocuments([]);
    });

    return () => {
      alive = false;
    };
  }, [user?.id]);

  const myUploadTrendPoints = useMemo(() => buildMyUploadPoints(myPublishedDocuments, trendUnit), [myPublishedDocuments, trendUnit]);

  return <div className="space-y-6">
    <h3 className="text-3xl font-bold tracking-[-0.03em] text-slate-950 dark:text-slate-50 sm:text-4xl">안녕하세요, {user?.name}님</h3>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>전체 문서 수 <div className="mt-2 text-2xl font-bold">{stats?.totalDocuments ?? 0}</div></Card>
      <Card>내 문서 수 <div className="mt-2 text-2xl font-bold">{stats?.myDocuments ?? 0}</div></Card>
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-[15px] font-medium tracking-[-0.01em] text-zinc-900 dark:text-zinc-50">최근 게시된 문서</h3>
          </div>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {recentPublishedDocuments.map((d) => (
            <li key={d.id} className="rounded-xl border border-transparent px-2 py-1.5 transition-colors hover:border-zinc-200 hover:bg-zinc-50 dark:hover:border-zinc-800 dark:hover:bg-zinc-900/40">
              <Link to={`/documents/${d.id}`} className="block text-zinc-700 hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-zinc-50">
                <div className="truncate font-medium">{d.title}</div>
                <div className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
                  {d.ownerName ? `${d.ownerName} · ` : ""}
                  {new Date(d.updatedAt).toLocaleDateString("ko-KR")}
                </div>
              </Link>
            </li>
          ))}
          {recentPublishedDocuments.length === 0 ? (
            <li className="rounded-xl border border-dashed border-zinc-200 px-3 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              최근 게시된 문서가 없습니다.
            </li>
          ) : null}
        </ul>
      </Card>
      <Card>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-[15px] font-medium tracking-[-0.01em] text-zinc-900 dark:text-zinc-50">작성 중인 문서 목록</h3>
            <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">작성 중이던 문서는 한 달 이후 삭제됩니다.</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {(stats?.draftDocuments ?? []).map((d) => (
            <li key={d.id} className="rounded-xl border border-transparent px-2 py-1.5 transition-colors hover:border-zinc-200 hover:bg-zinc-50 dark:hover:border-zinc-800 dark:hover:bg-zinc-900/40">
              <Link to={`/documents/${d.id}/edit`} className="block text-zinc-700 hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-zinc-50">
                <div className="truncate font-medium">{d.title}</div>
                <div className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
                  {d.categoryName ? `${d.categoryName} · ` : ""}
                  {new Date(d.updatedAt).toLocaleDateString("ko-KR")}
                </div>
              </Link>
            </li>
          ))}
          {(stats?.draftDocuments ?? []).length === 0 ? (
            <li className="rounded-xl border border-dashed border-zinc-200 px-3 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              편집 중인 문서가 없습니다.
            </li>
          ) : null}
        </ul>
      </Card>
    </div>
    <UploadTrendChart
      title="내 문서 업로드 현황"
      unit={trendUnit}
      onUnitChange={setTrendUnit}
      points={myUploadTrendPoints}
      emptyText="내 업로드 기록이 아직 없습니다."
    />
  </div>;
}
