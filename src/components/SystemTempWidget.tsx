import React, { useMemo, useState } from 'react';
import { Fan, Thermometer } from 'lucide-react';

interface SystemTempWidgetProps {
  systemTempC: number;
  coreTempC: number;
  gpuTempC: number;
  ssdTempC: number;
  vrmTempC: number;
  chassisTempC: number;
  fanRpm: number;
  tempHistory: number[];
}

const CHART_WIDTH = 480;
const CHART_HEIGHT = 135;
const PAD_LEFT = 36;
const PAD_RIGHT = 10;
const PAD_TOP = 12;
const PAD_BOTTOM = 16;

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

export const SystemTempWidget: React.FC<SystemTempWidgetProps> = ({
  systemTempC,
  coreTempC,
  gpuTempC,
  ssdTempC,
  vrmTempC,
  chassisTempC,
  fanRpm,
  tempHistory,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plotWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const { coords, linePath, areaPath } = useMemo(() => {
    const count = Math.max(1, tempHistory.length - 1);
    const minT = 25;
    const maxT = 85;
    const toX = (idx: number) => PAD_LEFT + (idx / count) * plotWidth;
    const toY = (val: number) =>
      PAD_TOP +
      plotHeight -
      ((Math.min(maxT, Math.max(minT, val)) - minT) / (maxT - minT)) * plotHeight;

    const pts = tempHistory.map((t, idx) => ({ x: toX(idx), y: toY(t) }));
    const line = buildSmoothPath(pts);
    const baselineY = PAD_TOP + plotHeight;
    const area =
      pts.length > 0
        ? `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${baselineY} L ${pts[0].x.toFixed(1)} ${baselineY} Z`
        : '';

    return { coords: pts, linePath: line, areaPath: area };
  }, [tempHistory, plotHeight, plotWidth]);

  const thermalState =
    systemTempC >= 72
      ? { label: 'High' as const, color: 'text-rose-400' }
      : systemTempC >= 58
        ? { label: 'Warm' as const, color: 'text-amber-300' }
        : { label: 'Normal' as const, color: 'text-emerald-400' };

  const thermalTiers = [
    {
      key: 'Normal' as const,
      range: '<58°C',
      activeClass: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
    },
    {
      key: 'Warm' as const,
      range: '58–71°C',
      activeClass: 'border-amber-400/40 bg-amber-500/15 text-amber-300',
    },
    {
      key: 'High' as const,
      range: '≥72°C',
      activeClass: 'border-rose-400/40 bg-rose-500/15 text-rose-300',
    },
  ];

  const sensors = [
    { name: 'CPU Package', value: coreTempC },
    { name: 'GPU Die', value: gpuTempC },
    { name: 'SSD Controller', value: ssdTempC },
    { name: 'Board VRM', value: vrmTempC },
    { name: 'Chassis Ambient', value: chassisTempC },
  ];

  const hoveredTemp = hoverIndex !== null ? tempHistory[hoverIndex] : null;
  const hoveredCoord = hoverIndex !== null ? coords[hoverIndex] : null;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * CHART_WIDTH;
    const ratio = (relX - PAD_LEFT) / plotWidth;
    const idx = Math.round(ratio * (tempHistory.length - 1));
    if (idx >= 0 && idx < tempHistory.length) {
      setHoverIndex(idx);
    }
  };

  return (
    <section
      aria-label="System Temperature"
      className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-900/55 p-5 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-amber-300" />
            <h2 className="text-base font-semibold tracking-tight text-slate-100">
              System Temperature
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            <span>Composite Thermal Sensors</span>
            <span className="mx-1.5" aria-hidden="true">
              ·
            </span>
            <span className={thermalState.color}>{thermalState.label}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Fan className="h-3.5 w-3.5 text-cyan-300" />
          <span className="font-mono tabular-nums">{fanRpm.toLocaleString()} RPM</span>
        </div>
      </div>

      {/* Primary Temp Readout + Trend Chart */}
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span
              className={`font-mono text-3xl font-semibold tabular-nums ${
                systemTempC >= 72
                  ? 'text-rose-400'
                  : systemTempC >= 58
                    ? 'text-amber-300'
                    : 'text-cyan-300'
              }`}
            >
              {systemTempC.toFixed(1)}°C
            </span>
            <span className="font-mono text-xs tabular-nums text-slate-400">
              {((systemTempC * 9) / 5 + 32).toFixed(1)}°F
            </span>
          </div>
          {hoveredTemp !== null && (
            <span className="font-mono text-xs tabular-nums text-amber-300">
              Sample: {hoveredTemp.toFixed(1)}°C
            </span>
          )}
        </div>

        {/* Thermal State 3-Tier Indicator */}
        <div
          className="grid grid-cols-3 gap-2 text-xs"
          role="group"
          aria-label="Thermal state thresholds"
        >
          {thermalTiers.map((tier) => {
            const isActive = thermalState.label === tier.key;
            return (
              <div
                key={tier.key}
                className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 transition-colors ${
                  isActive
                    ? tier.activeClass
                    : 'border-white/[0.06] bg-white/[0.02] text-slate-500'
                }`}
              >
                <span className="font-medium">{tier.key}</span>
                <span className="font-mono text-[10px] tabular-nums opacity-80">
                  {tier.range}
                </span>
              </div>
            );
          })}
        </div>

        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-32 w-full select-none overflow-visible"
          role="img"
          aria-label="System temperature trend chart"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="sysTempGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[30, 50, 70].map((tick) => {
            const y =
              PAD_TOP + plotHeight - ((tick - 25) / (85 - 25)) * plotHeight;
            return (
              <g key={tick}>
                <line
                  x1={PAD_LEFT}
                  x2={CHART_WIDTH - PAD_RIGHT}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.07)"
                  strokeDasharray="3 3"
                />
                <text
                  x={PAD_LEFT - 6}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-500 font-mono text-[10px] tabular-nums"
                >
                  {tick}°
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#sysTempGrad)" />
          <path
            d={linePath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {hoveredCoord && (
            <g>
              <line
                x1={hoveredCoord.x}
                x2={hoveredCoord.x}
                y1={PAD_TOP}
                y2={PAD_TOP + plotHeight}
                stroke="rgba(255,255,255,0.22)"
                strokeDasharray="3 3"
              />
              <circle
                cx={hoveredCoord.x}
                cy={hoveredCoord.y}
                r="4"
                fill="#f59e0b"
                stroke="#060911"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Sensor Breakdown List */}
      <div className="mt-3 space-y-2 border-t border-white/10 pt-3.5 text-xs">
        {sensors.map((sensor) => {
          const pct = Math.min(100, Math.max(10, ((sensor.value - 20) / 70) * 100));
          return (
            <div key={sensor.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{sensor.name}</span>
                <span className="font-mono tabular-nums text-slate-200">
                  {sensor.value.toFixed(1)}°C
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    sensor.value >= 75
                      ? 'bg-rose-400'
                      : sensor.value >= 60
                        ? 'bg-amber-400'
                        : 'bg-cyan-400/85'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
