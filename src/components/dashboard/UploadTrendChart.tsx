import { Card } from "@/components/ui/Card";

export type TrendUnit = "week" | "month" | "year";

type TrendPoint = { label: string; count: number };

export function UploadTrendChart({
  title,
  points,
  unit,
  onUnitChange,
  emptyText = "표시할 업로드 데이터가 없습니다.",
}: {
  title: string;
  points: TrendPoint[];
  unit: TrendUnit;
  onUnitChange: (unit: TrendUnit) => void;
  emptyText?: string;
  }) {
  const maxCount = Math.max(1, ...points.map((point) => point.count));
  const width = 1000;
  const height = 380;
  const padding = { top: 26, right: 20, bottom: 56, left: 32 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const step = points.length > 0 ? chartWidth / points.length : chartWidth;
  const barWidth = Math.min(52, Math.max(18, step * 0.38));

  return (
    <Card className="overflow-hidden border border-zinc-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-zinc-950 dark:text-zinc-50">{title}</h3>
          </div>

          <label className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[13px] text-zinc-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <span className="whitespace-nowrap">보기</span>
            <select
              className="min-w-[82px] bg-transparent text-[13px] outline-none"
              value={unit}
              onChange={(event) => onUnitChange(event.target.value as TrendUnit)}
            >
              <option value="week">주</option>
              <option value="month">월</option>
              <option value="year">년</option>
            </select>
          </label>
        </div>

        {points.length === 0 ? (
          <div className="flex min-h-[250px] items-center justify-center rounded-[20px] border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
            {emptyText}
          </div>
        ) : (
          <div className="rounded-[20px] border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-3 dark:border-zinc-800 dark:from-zinc-900/60 dark:to-zinc-950">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-[320px] w-full overflow-visible" role="img" aria-label={title}>
              <line
                x1={padding.left}
                y1={padding.top + chartHeight}
                x2={width - padding.right}
                y2={padding.top + chartHeight}
                stroke="currentColor"
                strokeOpacity="0.08"
              />

              {points.map((point, index) => {
                const ratio = point.count / maxCount;
                const barHeight = Math.max(10, chartHeight * ratio);
                const x = padding.left + index * step + (step - barWidth) / 2;
                const y = padding.top + chartHeight - barHeight;
                const labelX = x + barWidth / 2;
                const labelFill = point.count === maxCount ? "text-zinc-800 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400";

                return (
                  <g key={`${point.label}-${index}`} className="text-zinc-900 dark:text-zinc-100">
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx={11}
                      fill="currentColor"
                      opacity={point.count === 0 ? 0.2 : point.count === maxCount ? 0.92 : 0.8}
                    />
                    <text x={labelX} y={y - 10} textAnchor="middle" className={`text-[12px] font-medium ${labelFill}`}>
                      {point.count}
                    </text>
                    <text x={labelX} y={height - 22} textAnchor="middle" className="fill-zinc-500 text-[11px] font-medium dark:fill-zinc-400">
                      {point.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>
    </Card>
  );
}
