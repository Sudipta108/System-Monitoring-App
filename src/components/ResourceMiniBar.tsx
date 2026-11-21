import React from 'react';

interface ResourceMiniBarProps {
  cpuUsage: number;
  cpuHistory: number[];
  clockSpeedGhz: number;
  ramUsedGb: number;
  ramTotalGb: number;
  ramCapped: boolean;
  ramHistory: number[];
  systemTempC: number;
  tempHistory: number[];
  ssdReadMbps: number;
  ssdWriteMbps: number;
  wifiEnabled: boolean;
  downloadMbps: number;
}

const SparklineBars: React.FC<{
  values: number[];
  barColorClass: string;
  highColorClass: string;
  threshold?: number;
  minScale?: number;
  maxScale?: number;
  label: string;
}> = ({
  values,
  barColorClass,
  highColorClass,
  threshold = 75,
  minScale = 0,
  maxScale = 100,
  label,
}) => {
  const slice = values.slice(-20);

  return (
    <div
      className="flex h-7 items-end gap-[2px]"
      role="img"
      aria-label={label}
    >
      {slice.map((val, idx) => {
        const normalized =
          ((val - minScale) / Math.max(1, maxScale - minScale)) * 100;
        const clamped = Math.min(100, Math.max(12, normalized));
        const isHigh = val >= threshold;
        return (
          <span
            key={idx}
            className={`w-1.5 rounded-t-[2px] transition-all duration-300 ${
              isHigh ? highColorClass : barColorClass
            }`}
            style={{
              height: `${clamped}%`,
              opacity: 0.45 + (idx / Math.max(1, slice.length - 1)) * 0.55,
            }}
          />
        );
      })}
    </div>
  );
};

export const ResourceMiniBar: React.FC<ResourceMiniBarProps> = ({
  cpuUsage,
  cpuHistory,
  clockSpeedGhz,
  ramUsedGb,
  ramTotalGb,
  ramCapped,
  ramHistory,
  systemTempC,
  tempHistory,
  ssdReadMbps,
  ssdWriteMbps,
  wifiEnabled,
  downloadMbps,
}) => {
  const ramPercent = (ramUsedGb / ramTotalGb) * 100;

  return (
    <section
      aria-label="System Resource Mini-Bar"
      className="grid grid-cols-1 gap-4 rounded-xl border border-white/10 bg-slate-900/55 px-5 py-3.5 backdrop-blur-xl sm:grid-cols-2 xl:grid-cols-5"
    >
      {/* CPU Sparkline Mini-Bar */}
      <div className="flex items-center justify-between gap-4 sm:border-r sm:border-white/10 sm:pr-4">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-slate-400">CPU Sparkline</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="font-mono text-lg font-semibold tabular-nums text-cyan-300">
              {cpuUsage.toFixed(1)}%
            </span>
            <span className="font-mono text-xs tabular-nums text-slate-400">
              {clockSpeedGhz.toFixed(2)} GHz
            </span>
          </div>
        </div>
        <SparklineBars
          values={cpuHistory}
          barColorClass="bg-cyan-400"
          highColorClass="bg-amber-400"
          label="CPU utilization sparkline bars"
        />
      </div>

      {/* RAM Sparkline Mini-Bar */}
      <div className="flex items-center justify-between gap-4 xl:border-r xl:border-white/10 xl:pr-4">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-slate-400">RAM Sparkline</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="font-mono text-lg font-semibold tabular-nums text-violet-300">
              {ramPercent.toFixed(0)}%
            </span>
            <span className="font-mono text-xs tabular-nums text-slate-400">
              {ramUsedGb.toFixed(1)}/{ramTotalGb}{ramCapped ? '+' : ''} GB
            </span>
          </div>
        </div>
        <SparklineBars
          values={ramHistory}
          barColorClass="bg-violet-400"
          highColorClass="bg-amber-400"
          label="RAM usage sparkline bars"
        />
      </div>

      {/* System Temperature Mini-Bar */}
      <div className="flex items-center justify-between gap-4 sm:border-r sm:border-white/10 sm:pr-4">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-slate-400">System Temp</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span
              className={`font-mono text-lg font-semibold tabular-nums ${
                systemTempC >= 72
                  ? 'text-rose-400'
                  : systemTempC >= 58
                    ? 'text-amber-300'
                    : 'text-emerald-300'
              }`}
            >
              {systemTempC.toFixed(1)}°C
            </span>
            <span className="text-xs text-slate-400">
              {systemTempC >= 72 ? 'High' : systemTempC >= 58 ? 'Warm' : 'Normal'}
            </span>
          </div>
        </div>
        <SparklineBars
          values={tempHistory}
          barColorClass="bg-emerald-400"
          highColorClass="bg-amber-400"
          threshold={58}
          minScale={25}
          maxScale={85}
          label="System temperature sparkline bars"
        />
      </div>

      {/* SSD Throughput Summary */}
      <div className="flex items-center justify-between gap-3 xl:border-r xl:border-white/10 xl:pr-4">
        <div>
          <div className="text-[11px] font-medium text-slate-400">SSD Activity</div>
          <div className="mt-0.5 flex items-baseline gap-1.5 font-mono text-sm tabular-nums">
            <span className="text-emerald-300">R {ssdReadMbps}</span>
            <span className="text-slate-500">·</span>
            <span className="text-cyan-300">W {ssdWriteMbps}</span>
            <span className="text-[11px] text-slate-400">MB/s</span>
          </div>
        </div>
      </div>

      {/* Network Link Summary */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium text-slate-400">Network Link</div>
          <div className="mt-0.5 font-mono text-sm tabular-nums">
            {wifiEnabled ? (
              <span className="text-slate-100">
                ↓ {downloadMbps.toFixed(1)} Mbps
              </span>
            ) : (
              <span className="text-rose-300">Wi-Fi Offline</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
