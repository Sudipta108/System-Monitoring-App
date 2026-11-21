import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { NetworkPoint } from '../types/system';

interface NetworkWidgetProps {
  history: NetworkPoint[];
  ipAddress: string;
  interfaceName: string;
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  packetsPerSec: number;
}

const CHART_WIDTH = 560;
const CHART_HEIGHT = 185;
const PAD_LEFT = 44;
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

export const NetworkWidget: React.FC<NetworkWidgetProps> = ({
  history,
  ipAddress,
  interfaceName,
  downloadMbps,
  uploadMbps,
  pingMs,
  packetsPerSec,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plotWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const { maxScale, downCoords, upCoords, downLine, downArea, upLine, upArea } = useMemo(() => {
    const rawMax = Math.max(
      250,
      ...history.map((h) => Math.max(h.downloadMbps, h.uploadMbps))
    );
    const scale = Math.ceil(rawMax / 200) * 200;
    const count = Math.max(1, history.length - 1);

    const toX = (idx: number) => PAD_LEFT + (idx / count) * plotWidth;
    const toY = (val: number) =>
      PAD_TOP + plotHeight - (Math.min(scale, Math.max(0, val)) / scale) * plotHeight;

    const dPts = history.map((pt, idx) => ({ x: toX(idx), y: toY(pt.downloadMbps) }));
    const uPts = history.map((pt, idx) => ({ x: toX(idx), y: toY(pt.uploadMbps) }));
    const dLine = buildSmoothPath(dPts);
    const uLine = buildSmoothPath(uPts);
    const baselineY = PAD_TOP + plotHeight;

    const dArea =
      dPts.length > 0
        ? `${dLine} L ${dPts[dPts.length - 1].x.toFixed(1)} ${baselineY} L ${dPts[0].x.toFixed(1)} ${baselineY} Z`
        : '';
    const uArea =
      uPts.length > 0
        ? `${uLine} L ${uPts[uPts.length - 1].x.toFixed(1)} ${baselineY} L ${uPts[0].x.toFixed(1)} ${baselineY} Z`
        : '';

    return {
      maxScale: scale,
      downCoords: dPts,
      upCoords: uPts,
      downLine: dLine,
      downArea: dArea,
      upLine: uLine,
      upArea: uArea,
    };
  }, [history, plotHeight, plotWidth]);

  const hoveredPoint = hoverIndex !== null ? history[hoverIndex] : null;
  const hoveredDown = hoverIndex !== null ? downCoords[hoverIndex] : null;
  const hoveredUp = hoverIndex !== null ? upCoords[hoverIndex] : null;

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
      aria-label="Network Traffic"
      className="flex flex-col rounded-xl border border-white/10 bg-slate-900/55 p-5 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-100">
            Network Traffic
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            <span className="font-mono text-slate-300">{ipAddress}</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span>{interfaceName}</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span className="font-mono tabular-nums text-emerald-300">{pingMs} ms ping</span>
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <ArrowDownLeft className="h-3.5 w-3.5 text-cyan-300" />
            <span>Download</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-300" />
            <span>Upload</span>
          </div>
        </div>
      </div>

      {/* Live Readout Strip */}
      <div className="grid grid-cols-3 gap-4 border-b border-white/10 py-3.5">
        <div>
          <div className="text-xs text-slate-400">Download Speed</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-semibold tabular-nums text-cyan-300">
              {downloadMbps.toFixed(1)}
            </span>
            <span className="font-mono text-xs text-slate-400">Mbps</span>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">Upload Speed</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-semibold tabular-nums text-emerald-300">
              {uploadMbps.toFixed(1)}
            </span>
            <span className="font-mono text-xs text-slate-400">Mbps</span>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400">Ping Latency</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`font-mono text-xl font-semibold tabular-nums ${
                pingMs >= 25 ? 'text-amber-300' : 'text-slate-100'
              }`}
            >
              {pingMs} ms
            </span>
            <span className="hidden font-mono text-[11px] tabular-nums text-slate-500 sm:inline">
              {(packetsPerSec / 1000).toFixed(1)}k pps
            </span>
          </div>
        </div>
      </div>

      {/* Dual-Line Area Chart */}
      <div className="relative mt-4">
        {hoveredPoint && hoveredDown && (
          <div
            className="pointer-events-none absolute top-1 z-10 rounded-lg border border-white/15 bg-slate-950/90 px-3 py-2 text-xs shadow-lg backdrop-blur-md"
            style={{
              left: `${Math.min(68, Math.max(8, (hoveredDown.x / CHART_WIDTH) * 100))}%`,
            }}
          >
            <div className="font-mono text-[11px] text-slate-400">{hoveredPoint.timestamp}</div>
            <div className="mt-1 flex items-center gap-3 font-mono tabular-nums">
              <span className="text-cyan-300">↓ {hoveredPoint.downloadMbps.toFixed(1)} Mbps</span>
              <span className="text-emerald-300">↑ {hoveredPoint.uploadMbps.toFixed(1)} Mbps</span>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-44 w-full select-none overflow-visible"
          role="img"
          aria-label="Live network download and upload area chart"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="netDownGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="netUpGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.0" />
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

          <path d={downArea} fill="url(#netDownGrad)" />
          <path d={upArea} fill="url(#netUpGrad)" />

          <path
            d={downLine}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d={upLine}
            fill="none"
            stroke="#34d399"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {hoveredDown && hoveredUp && (
            <g>
              <line
                x1={hoveredDown.x}
                x2={hoveredDown.x}
                y1={PAD_TOP}
                y2={PAD_TOP + plotHeight}
                stroke="rgba(255,255,255,0.22)"
                strokeDasharray="3 3"
              />
              <circle
                cx={hoveredUp.x}
                cy={hoveredUp.y}
                r="4"
                fill="#34d399"
                stroke="#060911"
                strokeWidth="2"
              />
              <circle
                cx={hoveredDown.x}
                cy={hoveredDown.y}
                r="4.5"
                fill="#22d3ee"
                stroke="#060911"
                strokeWidth="2"
              />
            </g>
          )}

          {[0, Math.floor(history.length / 2), history.length - 1].map((idx) => {
            const pt = history[idx];
            const coord = downCoords[idx];
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
    </section>
  );
};
