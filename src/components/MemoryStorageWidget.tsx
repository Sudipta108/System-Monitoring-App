import React from 'react';
import { MemoryMetrics, StorageMetrics } from '../types/system';

interface MemoryStorageWidgetProps {
  memory: MemoryMetrics;
  storage: StorageMetrics;
}

interface RadialGaugeProps {
  valuePercent: number;
  primaryText: string;
  secondaryText: string;
  strokeColor: string;
  trackColor?: string;
}

const RadialGauge: React.FC<RadialGaugeProps> = ({
  valuePercent,
  primaryText,
  secondaryText,
  strokeColor,
  trackColor = 'rgba(255,255,255,0.08)',
}) => {
  const size = 148;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, valuePercent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex h-[148px] w-[148px] shrink-0 items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={`${primaryText} ${secondaryText}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-xl font-semibold tabular-nums text-slate-100">
          {primaryText}
        </span>
        <span className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-400">
          {secondaryText}
        </span>
      </div>
    </div>
  );
};

export const MemoryStorageWidget: React.FC<MemoryStorageWidgetProps> = ({
  memory,
  storage,
}) => {
  const ramPercent = (memory.usedGb / memory.totalGb) * 100;
  const totalIoMbps = storage.readMbps + storage.writeMbps;
  const ioPercent = Math.min(100, (totalIoMbps / storage.maxSpeedMbps) * 100);
  const diskUsedPercent = (storage.usedGb / storage.totalGb) * 100;
  const ramCapacitySuffix = memory.isBrowserCapped ? '+' : '';

  return (
    <section
      aria-label="Memory and Storage"
      className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-900/55 p-5 backdrop-blur-xl"
    >
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-base font-semibold tracking-tight text-slate-100">
          Memory &amp; Storage
        </h2>
        <p className="mt-0.5 truncate text-xs text-slate-400">
          <span>{memory.memoryModel}</span>
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          <span>{storage.driveName}</span>
        </p>
      </div>

      {/* RAM Gauge Row */}
      <div className="flex flex-col items-center gap-5 border-b border-white/10 py-5 sm:flex-row">
        <RadialGauge
          valuePercent={ramPercent}
          primaryText={`${ramPercent.toFixed(0)}%`}
          secondaryText={`${memory.usedGb.toFixed(1)} / ${memory.totalGb}${ramCapacitySuffix} GB`}
          strokeColor={ramPercent >= 85 ? '#f59e0b' : '#22d3ee'}
        />

        <div className="w-full flex-1 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-200">Physical RAM</span>
            <span className="font-mono tabular-nums text-cyan-300">
              {memory.usedGb.toFixed(1)} GB / {memory.totalGb}{ramCapacitySuffix} GB
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Page Cache</span>
            <span className="font-mono tabular-nums text-slate-200">
              {memory.cachedGb.toFixed(1)} GB
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Available</span>
            <span className="font-mono tabular-nums text-slate-200">
              {(memory.totalGb - memory.usedGb).toFixed(1)} GB
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Swap ({memory.swapTotalGb} GB)</span>
            <span className="font-mono tabular-nums text-slate-200">
              {memory.swapUsedGb.toFixed(1)} GB
            </span>
          </div>
        </div>
      </div>

      {/* Storage Gauge Row */}
      <div className="flex flex-col items-center gap-5 pt-5 sm:flex-row">
        <RadialGauge
          valuePercent={ioPercent}
          primaryText={`${(totalIoMbps / 1000).toFixed(1)} GB/s`}
          secondaryText={storage.ioLabel}
          strokeColor="#34d399"
        />

        <div className="w-full flex-1 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-200">Read Speed</span>
            <span className="font-mono tabular-nums text-emerald-300">
              {storage.readMbps.toLocaleString()} MB/s
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-200">Write Speed</span>
            <span className="font-mono tabular-nums text-cyan-300">
              {storage.writeMbps.toLocaleString()} MB/s
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>IOPS · Temp</span>
            <span className="font-mono tabular-nums text-slate-200">
              {(storage.iops / 1000).toFixed(1)}k · {storage.tempC}°C
            </span>
          </div>
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="truncate pr-2">{storage.mountPoint}</span>
              <span className="font-mono tabular-nums text-slate-200 shrink-0">
                {storage.usedGb} / {storage.totalGb} GB ({diskUsedPercent.toFixed(0)}%)
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-emerald-400/85 transition-all duration-300"
                style={{ width: `${diskUsedPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
