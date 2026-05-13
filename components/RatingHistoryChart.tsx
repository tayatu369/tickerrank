"use client";

import Link from "next/link";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AreaSeries,
  ColorType,
  createChart,
  CrosshairMode,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from "lightweight-charts";

export type RatingHistoryPoint = {
  date: string | Date;
  score: number;
  rating: string;
  /** Included in Pro hover tooltips */
  reasons?: string[];
};

const BG_GRID = "rgba(148, 163, 184, 0.08)";
const ACCENT = "#3B82F6";
const STOCK_LINE = "#64748B";

function normalizeDateKey(date: string | Date): string {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    return date.trim();
  }
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function timeKeyFromChart(t: Time | undefined): string | null {
  if (t === undefined) return null;
  if (typeof t === "string") return t;
  if (typeof t === "number") {
    return new Date(t * 1000).toISOString().slice(0, 10);
  }
  return `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;
}

type TooltipState = {
  left: number;
  top: number;
  point: RatingHistoryPoint;
} | null;

export type RatingHistoryChartProps = {
  points: RatingHistoryPoint[];
  isPro: boolean;
  /** When set, daily close prices are loaded and drawn behind the AI score. */
  symbol?: string;
};

export function RatingHistoryChart({
  points,
  isPro,
  symbol,
}: RatingHistoryChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const byTimeRef = useRef<Map<string, RatingHistoryPoint>>(new Map());
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [stockPoints, setStockPoints] = useState<
    { time: string; value: number }[] | null
  >(null);

  const sorted = useMemo(() => {
    return [...points].sort((a, b) =>
      normalizeDateKey(a.date).localeCompare(normalizeDateKey(b.date)),
    );
  }, [points]);

  useEffect(() => {
    if (!symbol || sorted.length === 0) {
      startTransition(() => setStockPoints(null));
      return;
    }

    const from = normalizeDateKey(sorted[0]!.date);
    const to = normalizeDateKey(sorted[sorted.length - 1]!.date);
    if (!from || !to) {
      startTransition(() => setStockPoints(null));
      return;
    }

    let cancelled = false;
    startTransition(() => setStockPoints(null));

    void fetch(
      `/api/stock/close-history?symbol=${encodeURIComponent(symbol)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    )
      .then(async (r) => {
        if (!r.ok) return [];
        const j = (await r.json()) as {
          points?: { date: string; close: number }[];
        };
        return j.points ?? [];
      })
      .then((pts) => {
        if (cancelled) return;
        setStockPoints(
          pts
            .filter(
              (p) =>
                p.close != null &&
                typeof p.close === "number" &&
                !Number.isNaN(p.close),
            )
            .map((p) => ({ time: p.date, value: p.close })),
        );
      })
      .catch(() => {
        if (!cancelled) setStockPoints([]);
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, sorted]);

  const blurOverlayFraction = useMemo(() => {
    const n = sorted.length;
    if (isPro || n <= 3) return 0;
    return (n - 3) / Math.max(1, n - 1);
  }, [isPro, sorted.length]);

  const initCrosshairHandler = useCallback(
    (chart: IChartApi, series: ISeriesApi<"Area">) => {
      const handler = (param: MouseEventParams) => {
        if (!isPro) {
          setTooltip(null);
          return;
        }
        if (!param.point || param.time === undefined) {
          setTooltip(null);
          return;
        }
        const row = param.seriesData.get(series);
        if (!row || typeof row !== "object" || !("value" in row)) {
          setTooltip(null);
          return;
        }
        const key = timeKeyFromChart(param.time);
        const meta = key ? byTimeRef.current.get(key) : undefined;
        if (!meta) {
          setTooltip(null);
          return;
        }
        const el = containerRef.current;
        const cw = el?.clientWidth ?? 300;
        const ch = el?.clientHeight ?? 200;
        const tw = 280;
        const left = Math.max(8, Math.min(param.point.x + 16, cw - tw - 8));
        const top = Math.max(8, Math.min(param.point.y + 16, ch - 100));
        setTooltip({ left, top, point: meta });
      };
      chart.subscribeCrosshairMove(handler);
      return () => chart.unsubscribeCrosshairMove(handler);
    },
    [isPro],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el || sorted.length === 0) {
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
      setTooltip(null);
      return;
    }

    chartRef.current?.remove();
    chartRef.current = null;
    seriesRef.current = null;

    const byTime = new Map<string, RatingHistoryPoint>();
    const chartData: { time: string; value: number }[] = [];
    for (const p of sorted) {
      const key = normalizeDateKey(p.date);
      if (!key) continue;
      byTime.set(key, { ...p, date: key });
      chartData.push({
        time: key,
        value: Math.min(100, Math.max(0, p.score)),
      });
    }
    byTimeRef.current = byTime;

    if (chartData.length === 0) {
      return;
    }

    const hasStock = !!(stockPoints && stockPoints.length > 0);

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94A3B8",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: BG_GRID },
        horzLines: { color: BG_GRID },
      },
      leftPriceScale: {
        visible: hasStock,
        borderColor: "rgba(148, 163, 184, 0.15)",
        scaleMargins: { top: 0.1, bottom: 0.08 },
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.15)",
        scaleMargins: { top: 0.1, bottom: 0.08 },
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.15)",
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: {
        mode: isPro ? CrosshairMode.Magnet : CrosshairMode.Hidden,
      },
      handleScroll: {
        mouseWheel: isPro,
        pressedMouseMove: isPro,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: isPro,
        pinch: isPro,
        axisPressedMouseMove: isPro,
        axisDoubleClickReset: isPro,
      },
    });

    if (hasStock) {
      const priceLine = chart.addSeries(LineSeries, {
        color: STOCK_LINE,
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        priceScaleId: "left",
        lastValueVisible: true,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        priceFormat: {
          type: "price",
          precision: 2,
          minMove: 0.01,
        },
      });
      priceLine.setData(stockPoints!);
    }

    const series = chart.addSeries(AreaSeries, {
      lineColor: ACCENT,
      topColor: "rgba(59, 130, 246, 0.35)",
      bottomColor: "rgba(59, 130, 246, 0.02)",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: isPro,
    });

    series.setData(chartData);
    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = series;

    const unsubCrosshair = initCrosshairHandler(chart, series);

    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      chart.resize(Math.floor(r.width), Math.floor(r.height));
    });
    ro.observe(el);

    return () => {
      unsubCrosshair();
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [sorted, isPro, initCrosshairHandler, stockPoints]);

  const proTooltip = isPro ? tooltip : null;

  if (sorted.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-sm text-slate-500">
        No rating history yet.
      </div>
    );
  }

  const blurPct = blurOverlayFraction * 100;
  const showLock = !isPro && sorted.length > 3;

  return (
    <div className="w-full">
      <div className="mb-2 flex flex-wrap items-center justify-end gap-5 text-xs text-slate-400">
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-0.5 w-8 rounded-sm bg-[#3B82F6]"
            aria-hidden
          />
          <span className="font-medium text-slate-300">AI Score</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block w-8 border-t-2 border-dashed border-[#64748B]"
            aria-hidden
          />
          <span className="font-medium text-slate-300">Stock Price</span>
        </span>
      </div>

      <div className="relative isolate h-56 w-full sm:h-64">
        <div ref={containerRef} className="absolute inset-0 min-h-[220px]" />

        {showLock ? (
          <>
            <div
              className="pointer-events-auto absolute inset-y-0 left-0 z-10 backdrop-blur-[10px]"
              style={{
                width: `${blurPct}%`,
                backgroundColor: "rgba(11, 17, 32, 0.45)",
                borderRight: "1px solid rgba(148, 163, 184, 0.12)",
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-20 flex items-center justify-center px-4"
              style={{ width: `${blurPct}%` }}
            >
              <div className="pointer-events-auto max-w-[220px] rounded-xl border border-white/15 bg-[#0B1120]/90 px-4 py-3 text-center shadow-xl shadow-black/40">
                <p className="text-xs font-medium leading-snug text-slate-200">
                  Upgrade to Pro to unlock full history
                </p>
                <Link
                  href="/pricing"
                  className="mt-3 inline-flex items-center justify-center rounded-lg bg-[#3B82F6] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2563EB]"
                >
                  View plans
                </Link>
              </div>
            </div>
          </>
        ) : null}

        {proTooltip ? (
          <div
            className="pointer-events-none absolute z-30 max-w-[280px] rounded-lg border border-white/15 bg-[#0B1120]/95 px-3 py-2.5 text-left text-xs shadow-xl shadow-black/50"
            style={{
              left: proTooltip.left,
              top: proTooltip.top,
            }}
          >
            <p className="font-semibold tabular-nums text-slate-100">
              {normalizeDateKey(proTooltip.point.date)}{" "}
              <span className="text-[#93C5FD]">
                · {proTooltip.point.rating}
              </span>
            </p>
            <p className="mt-1 tabular-nums text-slate-400">
              Score {Math.round(proTooltip.point.score)}
            </p>
            {proTooltip.point.reasons && proTooltip.point.reasons.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-slate-300">
                {proTooltip.point.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        Historical AI ratings vs. actual price movement. Past ratings do not
        guarantee future results.
      </p>
    </div>
  );
}
