"use client";

import { memo, useId } from "react";

const LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

/** Demo trend — scores 0–100 */
const DATA = [71, 73, 72, 76, 77, 78];

const Y_MIN = 60;
const Y_MAX = 100;

/**
 * Declarative SVG trend (no Chart.js): avoids document-level observers
 * and canvas lifecycle that can race with React 19 concurrent updates.
 * Memoized so API-driven parent re-renders do not reconcile this subtree.
 */
export const RatingHistoryChart = memo(function RatingHistoryChart() {
  const rawId = useId();
  const fillId = `ratingHistoryFill-${rawId.replace(/:/g, "")}`;
  const w = 480;
  const h = 220;
  const pad = { top: 28, right: 16, bottom: 32, left: 40 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const last = DATA.length - 1;

  const points = DATA.map((v, i) => {
    const x = pad.left + (last === 0 ? chartW / 2 : (i / last) * chartW);
    const t = (v - Y_MIN) / (Y_MAX - Y_MIN);
    const y = pad.top + chartH * (1 - Math.min(1, Math.max(0, t)));
    return { x, y, v, i };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[last]!.x.toFixed(2)} ${(pad.top + chartH).toFixed(2)} L ${points[0]!.x.toFixed(2)} ${(pad.top + chartH).toFixed(2)} Z`;

  const yTicks = [60, 70, 80, 90, 100];

  return (
    <div className="relative h-56 w-full sm:h-64">
      <svg
        className="size-full"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Rating history trend chart"
      >
        <title>Sample composite score trend over six months</title>

        <text
          x={pad.left}
          y={18}
          fill="#94a3b8"
          fontSize={11}
          fontWeight={600}
        >
          Composite score
        </text>

        {yTicks.map((tick) => {
          const t = (tick - Y_MIN) / (Y_MAX - Y_MIN);
          const y = pad.top + chartH * (1 - t);
          return (
            <g key={tick}>
              <line
                x1={pad.left}
                y1={y}
                x2={pad.left + chartW}
                y2={y}
                stroke="rgba(148, 163, 184, 0.12)"
                strokeWidth={1}
              />
              <text
                x={pad.left - 8}
                y={y + 4}
                textAnchor="end"
                fill="#64748b"
                fontSize={11}
              >
                {tick}
              </text>
            </g>
          );
        })}

        <defs>
          <linearGradient
            id={fillId}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.22)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.02)" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill={`url(#${fillId})`} />

        <path
          d={linePath}
          fill="none"
          stroke="#3B82F6"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p) => (
          <g key={p.i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={5}
              fill="#3B82F6"
              stroke="#0B1120"
              strokeWidth={2}
            />
            <title>{`${LABELS[p.i]}: ${p.v}`}</title>
          </g>
        ))}

        {LABELS.map((label, i) => {
          const x =
            pad.left + (last === 0 ? chartW / 2 : (i / last) * chartW);
          return (
            <text
              key={label}
              x={x}
              y={h - 10}
              textAnchor="middle"
              fill="#64748b"
              fontSize={11}
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
});
