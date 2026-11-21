import React, { useMemo, useState } from 'react';
import { CpuGpuPoint } from '../types/system';

interface CpuGpuWidgetProps {
  history: CpuGpuPoint[];
  cpuUsage: number;
  coreTempC: number;
  clockSpeedGhz: number;
  gpuLoad: number;
  gpuTempC: number;
  vramUsedGb: number;
  vramTotalGb: number;
  coreLoads: number[];
  cpuModel: string;
  gpuModel: string;
}

const CHART_WIDTH = 640;
const CHART_HEIGHT = 210;
const PAD_LEFT = 36;
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

export const CpuGpuWidget: React.FC<CpuGpuWidgetProps> = ({
  history,
  cpuUsage,
  coreTempC,
  clockSpeedGhz,
  gpuLoad,
  gpuTempC,
  vramUsedGb,
  vramTotalGb,
  coreLoads,
  cpuModel,
  gpuModel,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showCores, setShowCores] = useState(true);

  const plotWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const { cpuCoords, gpuCoords, cpuLine, cpuArea, gpuLine, gpuArea } = useMemo(() => {
    const count = Math.max(1, history.length - 1);
    const toY = (val: number) => PAD_TOP + plotHeight - (Math.min(100, Math.max(0, val)) / 100) * plotHeight;
    const toX = (idx: number) => PAD_LEFT + (idx / count) * plotWidth;

    const cPts = history.map((pt, idx) => ({ x: toX(idx), y: toY(pt.cpu) }));
    const gPts = history.map((pt, idx) => ({ x: toX(idx), y: toY(pt.gpu) }));

    const cLine = buildSmoothPath(cPts);
    const gLine = buildSmoothPath(gPts);
    const baselineY = PAD_TOP + plotHeight;

    const cArea =
      cPts.length > 0
        ? `${cLine} L ${cPts[cPts.length - 1].x.toFixed(1)} ${baselineY} L ${cPts[0].x.toFixed(1)} ${baselineY} Z`
        : '';
    const gArea =
      gPts.length > 0
        ? `${gLine} L ${gPts[gPts.length - 1].x.toFixed(1)} ${baselineY} L ${gPts[0].x.toFixed(1)} ${baselineY} Z`
        : '';

    return {
      cpuCoords: cPts,
      gpuCoords: gPts,
      cpuLine: cLine,
      cpuArea: cArea,
      gpuLine: gLine,
      gpuArea: gArea,
    };
  }, [history, plotHeight, plotWidth]);

  const thermalLabel =
    coreTempC >= 80 ? 'High' : coreTempC >= 68 ? 'Warm' : 'Normal';
  const thermalColor =
    coreTempC >= 80
      ? 'text-rose-400'
      : coreTempC >= 68
        ? 'text-amber-300'
        : 'text-emerald-400';

  const hoveredPoint = hoverIndex !== null ? history[hoverIndex] : null;
  const hoveredCpuCoord = hoverIndex !== null ? cpuCoords[hoverIndex] : null;
  const hoveredGpuCoord = hoverIndex !== null ? gpuCoords[hoverIndex] : null;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * CHART_WIDTH;
    const ratio = (relX - PAD_LEFT) / plotWidth;
    const idx = Math.round(ratio * (history.length - 1));
    if (idx >= 0 && idx < history.length) {
      setHoverIndex(idx);
    }
  };

  return (
    <section
      aria-label="CPU and GPU Telemetry"
      className="flex flex-col rounded-xl border border-white/10 bg-slate-900/55 p-5 backdrop-blur-xl"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-slate-100">
            CPU &amp; GPU Telemetry
          </h2>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            <span>{cpuModel}</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>{gpuModel}</span>
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="h-2 w-2 rounded-xs bg-cyan-400" aria-hidden="true" />
            <span>CPU Load</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="h-2 w-2 rounded-xs bg-violet-400" aria-hidden="true" />
            <span>GPU Load</span>
          </div>
          <button
            type="button"
            onClick={() => setShowCores((prev) => !prev)}
            className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white whitespace-nowrap shrink-0"
          >
            {showCores ? 'Hide Cores' : 'Show Cores'}
          </button>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 gap-4 border-b border-white/10 py-4 sm:grid-cols-4">
        <div>
          <div className="text-xs text-slate-400">CPU Utilization</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`font-mono text-2xl font-semibold tabular-nums ${
                cpuUsage >= 80
                  ? 'text-amber-300'
                  : 'text-cyan-300'
              }`}
            >
              {cpuUsage.toFixed(1)}%
            </span>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">Core Temperature</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums text-slate-100">
              {coreTempC.toFixed(1)}°C
            </span>
            <span className={`text-xs font-medium ${thermalColor}`}>{thermalLabel}</span>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">Clock Speed</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums text-slate-100">
              {clockSpeedGhz.toFixed(2)}
            </span>
            <span className="font-mono text-xs text-slate-400">GHz</span>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">GPU Load &amp; VRAM</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums text-violet-300">
              {gpuLoad.toFixed(1)}%
            </span>
            <span className="font-mono text-xs tabular-nums text-slate-400">
              {vramUsedGb.toFixed(1)}/{vramTotalGb} GB · {gpuTempC.toFixed(0)}°C
            </span>
          </div>
        </div>
      </div>

      {/* Real-time SVG Line Chart */}
      <div className="relative mt-4">
        {hoveredPoint && hoveredCpuCoord && (
          <div
            className="pointer-events-none absolute top-1 z-10 rounded-lg border border-white/15 bg-slate-950/90 px-3 py-2 text-xs shadow-lg backdrop-blur-md"
            style={{
              left: `${Math.min(72, Math.max(6, (hoveredCpuCoord.x / CHART_WIDTH) * 100))}%`,
            }}
          >
            <div className="font-mono text-[11px] text-slate-400">{hoveredPoint.timestamp}</div>
            <div className="mt-1 flex items-center gap-3 font-mono tabular-nums">
              <span className="text-cyan-300">CPU {hoveredPoint.cpu.toFixed(1)}%</span>
              <span className="text-violet-300">GPU {hoveredPoint.gpu.toFixed(1)}%</span>
              <span className="text-slate-300">{hoveredPoint.temp.toFixed(1)}°C</span>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-52 w-full select-none overflow-visible"
          role="img"
          aria-label="Real-time CPU and GPU utilization chart"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="cpuAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="gpuAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Y gridlines */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const y = PAD_TOP + plotHeight - (tick / 100) * plotHeight;
            return (
              <g key={tick}>
                <line
                  x1={PAD_LEFT}
                  x2={CHART_WIDTH - PAD_RIGHT}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.07)"
                  strokeDasharray={tick === 0 ? undefined : '3 3'}
                />
                <text
                  x={PAD_LEFT - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-500 font-mono text-[10px] tabular-nums"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {/* Area Fills */}
          <path d={gpuArea} fill="url(#gpuAreaGrad)" />
          <path d={cpuArea} fill="url(#cpuAreaGrad)" />

          {/* Lines */}
          <path
            d={gpuLine}
            fill="none"
            stroke="#a78bfa"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d={cpuLine}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.25"
            strokeLinecap="round"
          />

          {/* Hover Crosshair */}
          {hoveredCpuCoord && hoveredGpuCoord && (
            <g>
              <line
                x1={hoveredCpuCoord.x}
                x2={hoveredCpuCoord.x}
                y1={PAD_TOP}
                y2={PAD_TOP + plotHeight}
                stroke="rgba(255,255,255,0.22)"
                strokeDasharray="3 3"
              />
              <circle
                cx={hoveredGpuCoord.x}
                cy={hoveredGpuCoord.y}
                r="4"
                fill="#a78bfa"
                stroke="#060911"
                strokeWidth="2"
              />
              <circle
                cx={hoveredCpuCoord.x}
                cy={hoveredCpuCoord.y}
                r="4.5"
                fill="#22d3ee"
                stroke="#060911"
                strokeWidth="2"
              />
            </g>
          )}

          {/* X-axis sparse timestamps */}
          {[0, Math.floor(history.length / 2), history.length - 1].map((idx) => {
            const pt = history[idx];
            const coord = cpuCoords[idx];
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

      {/* Per-Core Utilization Strip */}
      {showCores && (
        <div className="mt-4 border-t border-white/10 pt-3.5">
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {coreLoads.map((load, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[11px] tabular-nums">
                  <span className="text-slate-400">C{idx}</span>
                  <span className="text-slate-200">{load}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      load >= 85
                        ? 'bg-amber-400'
                        : load >= 65
                          ? 'bg-cyan-300'
                          : 'bg-cyan-500/80'
                    }`}
                    style={{ width: `${load}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
