import React, { useMemo, useState } from 'react';
import { SsdPoint, StorageMetrics } from '../types/system';

interface SsdStatsWidgetProps {
  storage: StorageMetrics;
  history: SsdPoint[];
}

const CHART_WIDTH = 560;
const CHART_HEIGHT = 185;
const PAD_LEFT = 46;
const PAD_RIGHT = 12;
const PAD_TOP = 14;
const PAD_BOTTOM = 24;

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` C ${midX.toFixed(1)} ${p0.y.toFixed(1)}, ${midX.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

export const SsdStatsWidget: React.FC<SsdStatsWidgetProps> = ({
  storage,
  history,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plotWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const { maxScale, readCoords, writeCoords, readLine, readArea, writeLine, writeArea } =
    useMemo(() => {
      const rawMax = Math.max(
        2400,
        ...history.map((h) => Math.max(h.readMbps, h.writeMbps))
      );
      const scale = Math.ceil(rawMax / 500) * 500;
      const count = Math.max(1, history.length - 1);

      const toX = (idx: number) => PAD_LEFT + (idx / count) * plotWidth;
      const toY = (val: number) =>
        PAD_TOP + plotHeight - (Math.min(scale, Math.max(0, val)) / scale) * plotHeight;

      const rPts = history.map((pt, idx) => ({ x: toX(idx), y: toY(pt.readMbps) }));
      const wPts = history.map((pt, idx) => ({ x: toX(idx), y: toY(pt.writeMbps) }));
      const rLine = buildSmoothPath(rPts);
      const wLine = buildSmoothPath(wPts);
      const baselineY = PAD_TOP + plotHeight;

      const rArea =
        rPts.length > 0
          ? `${rLine} L ${rPts[rPts.length - 1].x.toFixed(1)} ${baselineY} L ${rPts[0].x.toFixed(1)} ${baselineY} Z`
          : '';
      const wArea =
        wPts.length > 0
          ? `${wLine} L ${wPts[wPts.length - 1].x.toFixed(1)} ${baselineY} L ${wPts[0].x.toFixed(1)} ${baselineY} Z`
          : '';

      return {
        maxScale: scale,
        readCoords: rPts,
        writeCoords: wPts,
        readLine: rLine,
        readArea: rArea,
        writeLine: wLine,
        writeArea: wArea,
      };
    }, [history, plotHeight, plotWidth]);

  const hoveredPoint = hoverIndex !== null ? history[hoverIndex] : null;
  const hoveredRead = hoverIndex !== null ? readCoords[hoverIndex] : null;
  const hoveredWrite = hoverIndex !== null ? writeCoords[hoverIndex] : null;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * CHART_WIDTH;
    const ratio = (relX - PAD_LEFT) / plotWidth;
    const idx = Math.round(ratio * (history.length - 1));
    if (idx >= 0 && idx < history.length) {
      setHoverIndex(idx);
    }
  };

  const freeGb = Math.max(0, storage.totalGb - storage.usedGb);
  const usedPercent = Math.round((storage.usedGb / storage.totalGb) * 100);

  return (
    <section
      aria-label="SSD Statistics"
      className="flex flex-col rounded-xl border border-white/10 bg-slate-900/55 p-5 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-slate-100">
            SSD Statistics
          </h2>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            <span className="font-medium text-slate-200">{storage.driveName}</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>{storage.ssdInterface}</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span className="font-mono text-slate-300">{storage.mountPoint}</span>
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="h-2 w-2 rounded-xs bg-emerald-400" aria-hidden="true" />
            <span>Read</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="h-2 w-2 rounded-xs bg-cyan-400" aria-hidden="true" />
            <span>Write</span>
          </div>
        </div>
      </div>

      {/* Top KPI Strip */}
      <div className="grid grid-cols-2 gap-4 border-b border-white/10 py-3.5 sm:grid-cols-4">
        <div>
          <div className="text-xs text-slate-400">Seq. Read</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-semibold tabular-nums text-emerald-300">
              {storage.readMbps.toLocaleString()}
            </span>
            <span className="font-mono text-xs text-slate-400">MB/s</span>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">Seq. Write</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-semibold tabular-nums text-cyan-300">
              {storage.writeMbps.toLocaleString()}
            </span>
            <span className="font-mono text-xs text-slate-400">MB/s</span>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">IOPS &amp; Latency</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-semibold tabular-nums text-slate-100">
              {(storage.iops / 1000).toFixed(1)}k
            </span>
            <span className="font-mono text-xs tabular-nums text-slate-400">
              · {storage.latencyMs.toFixed(2)} ms
            </span>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">SMART Health</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-xl font-semibold tabular-nums text-emerald-300">
              {storage.healthPercent}%
            </span>
            <span className="font-mono text-xs tabular-nums text-slate-400">
              Healthy · {storage.tempC}°C
            </span>
          </div>
        </div>
      </div>

      {/* Live Read/Write Throughput Area Chart */}
      <div className="relative mt-4">
        {hoveredPoint && hoveredRead && (
          <div
            className="pointer-events-none absolute top-1 z-10 rounded-lg border border-white/15 bg-slate-950/90 px-3 py-2 text-xs shadow-lg backdrop-blur-md"
            style={{
              left: `${Math.min(68, Math.max(8, (hoveredRead.x / CHART_WIDTH) * 100))}%`,
            }}
          >
            <div className="font-mono text-[11px] text-slate-400">{hoveredPoint.timestamp}</div>
            <div className="mt-1 flex items-center gap-3 font-mono tabular-nums">
              <span className="text-emerald-300">Read {hoveredPoint.readMbps} MB/s</span>
              <span className="text-cyan-300">Write {hoveredPoint.writeMbps} MB/s</span>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-44 w-full select-none overflow-visible"
          role="img"
          aria-label="Real-time SSD read and write throughput chart"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="ssdReadGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="ssdWriteGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const val = Math.round(maxScale * ratio);
            const y = PAD_TOP + plotHeight - ratio * plotHeight;
            return (
              <g key={ratio}>
                <line
                  x1={PAD_LEFT}
                  x2={CHART_WIDTH - PAD_RIGHT}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.07)"
                  strokeDasharray={ratio === 0 ? undefined : '3 3'}
                />
                <text
                  x={PAD_LEFT - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-500 font-mono text-[10px] tabular-nums"
                >
                  {val}
                </text>
              </g>
            );
          })}

          <path d={writeArea} fill="url(#ssdWriteGrad)" />
          <path d={readArea} fill="url(#ssdReadGrad)" />

          <path
            d={writeLine}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d={readLine}
            fill="none"
            stroke="#34d399"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {hoveredRead && hoveredWrite && (
            <g>
              <line
                x1={hoveredRead.x}
                x2={hoveredRead.x}
                y1={PAD_TOP}
                y2={PAD_TOP + plotHeight}
                stroke="rgba(255,255,255,0.22)"
                strokeDasharray="3 3"
              />
              <circle
                cx={hoveredWrite.x}
                cy={hoveredWrite.y}
                r="4"
                fill="#22d3ee"
                stroke="#060911"
                strokeWidth="2"
              />
              <circle
                cx={hoveredRead.x}
                cy={hoveredRead.y}
                r="4.5"
                fill="#34d399"
                stroke="#060911"
                strokeWidth="2"
              />
            </g>
          )}

          {[0, Math.floor(history.length / 2), history.length - 1].map((idx) => {
            const pt = history[idx];
            const coord = readCoords[idx];
            if (!pt || !coord) return null;
            return (
              <text
                key={idx}
                x={coord.x}
                y={CHART_HEIGHT - 4}
                textAnchor={idx === 0 ? 'start' : idx === history.length - 1 ? 'end' : 'middle'}
                className="fill-slate-500 font-mono text-[10px] tabular-nums"
              >
                {pt.timestamp}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Bottom Detailed SSD Stats Strip */}
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3.5 text-xs sm:grid-cols-4">
        <div>
          <div className="text-slate-400">Volume Usage</div>
          <div className="mt-0.5 font-mono tabular-nums text-slate-200">
            {storage.usedGb} / {storage.totalGb} GB ({usedPercent}%)
          </div>
        </div>
        <div>
          <div className="text-slate-400">Free Space</div>
          <div className="mt-0.5 font-mono tabular-nums text-slate-200">
            {freeGb} GB
          </div>
        </div>
        <div>
          <div className="text-slate-400">Queue · Written</div>
          <div className="mt-0.5 font-mono tabular-nums text-slate-200">
            QD{storage.queueDepth} · {storage.totalWrittenTb.toFixed(2)} TBW
          </div>
        </div>
        <div>
          <div className="text-slate-400">
            {storage.browserQuotaGb !== null ? 'Origin Quota' : 'Max Bus Speed'}
          </div>
          <div className="mt-0.5 font-mono tabular-nums text-slate-200">
            {storage.browserQuotaGb !== null
              ? `${storage.browserQuotaGb} GB (${storage.browserUsedMb ?? 0} MB)`
              : `${storage.maxSpeedMbps.toLocaleString()} MB/s`}
          </div>
        </div>
      </div>
    </section>
  );
};
