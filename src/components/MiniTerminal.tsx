import React, { useEffect, useRef, useState } from 'react';
import { CornerDownLeft, Terminal as TerminalIcon } from 'lucide-react';
import { SystemSnapshot } from '../types/system';

interface MiniTerminalProps {
  snapshot: SystemSnapshot;
  expanded?: boolean;
}

interface TerminalEntry {
  id: number;
  command?: string;
  lines: string[];
  tone?: 'normal' | 'accent' | 'error';
}

function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${d} days, ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const MiniTerminal: React.FC<MiniTerminalProps> = ({
  snapshot,
  expanded = false,
}) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [entries, setEntries] = useState<TerminalEntry[]>([
    {
      id: 1,
      lines: [
        `Connected to ${snapshot.hostname} (${snapshot.osName} ${snapshot.architecture})`,
        'Type "help" to list available diagnostic commands.',
      ],
      tone: 'accent',
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextIdRef = useRef(2);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const runCommand = (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    setHistory((prev) => [trimmed, ...prev.slice(0, 29)]);
    setHistoryIdx(-1);

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    if (cmd === 'clear') {
      setEntries([]);
      return;
    }

    let lines: string[] = [];
    let tone: TerminalEntry['tone'] = 'normal';

    switch (cmd) {
      case 'help':
        lines = [
          'Available commands:',
          '  help         Show this command reference',
          '  status       Print live CPU, GPU, RAM, SSD, thermal, and network telemetry',
          '  temp         Show system temperature sensor breakdown and fan speed',
          '  ssd          Show detailed device SSD statistics and SMART health',
          '  free         Display physical and swap memory allocation',
          '  df           Display storage volume usage and throughput',
          '  uptime       Show system uptime and load average',
          '  uname        Print kernel and hardware architecture info',
          '  clear        Clear terminal output buffer',
        ];
        tone = 'accent';
        break;

      case 'status': {
        const thermalState =
          snapshot.systemTempC >= 72
            ? 'High'
            : snapshot.systemTempC >= 58
              ? 'Warm'
              : 'Normal';
        lines = [
          `Host:       ${snapshot.hostname} (${snapshot.osName})`,
          `CPU:        ${snapshot.cpuModel} · ${snapshot.cpuUsage.toFixed(1)}% · ${snapshot.clockSpeedGhz.toFixed(2)} GHz · ${snapshot.coreTempC.toFixed(1)}°C`,
          `GPU:        ${snapshot.gpuModel} · ${snapshot.gpuLoad.toFixed(1)}% · ${snapshot.gpuTempC.toFixed(0)}°C`,
          `Thermal:    System ${snapshot.systemTempC.toFixed(1)}°C (${thermalState}) · VRM ${snapshot.vrmTempC.toFixed(1)}°C · Fan ${snapshot.fanRpm} RPM`,
          `Memory:     ${snapshot.memory.memoryModel} (${snapshot.memory.usedGb.toFixed(1)} / ${snapshot.memory.totalGb} GB)`,
          `SSD:        ${snapshot.storage.driveName} · Read ${snapshot.storage.readMbps} MB/s · Write ${snapshot.storage.writeMbps} MB/s`,
          `Network:    ${snapshot.network.ipAddress} · ↓ ${snapshot.network.downloadMbps.toFixed(1)} Mbps · ↑ ${snapshot.network.uploadMbps.toFixed(1)} Mbps · ${snapshot.network.pingMs} ms`,
        ];
        break;
      }

      case 'temp':
      case 'sensors': {
        const thermalState =
          snapshot.systemTempC >= 72
            ? 'High'
            : snapshot.systemTempC >= 58
              ? 'Warm'
              : 'Normal';
        lines = [
          `System Temp:      ${snapshot.systemTempC.toFixed(1)}°C (${((snapshot.systemTempC * 9) / 5 + 32).toFixed(1)}°F)`,
          `Thermal State:    ${thermalState} (Normal <58°C | Warm 58–71°C | High ≥72°C)`,
          `CPU Package:      ${snapshot.coreTempC.toFixed(1)}°C`,
          `GPU Die:          ${snapshot.gpuTempC.toFixed(1)}°C`,
          `SSD Controller:   ${snapshot.storage.tempC.toFixed(1)}°C`,
          `Motherboard VRM:  ${snapshot.vrmTempC.toFixed(1)}°C`,
          `Chassis Ambient:  ${snapshot.chassisTempC.toFixed(1)}°C`,
          `Cooling Fan:      ${snapshot.fanRpm} RPM`,
        ];
        break;
      }

      case 'ssd':
        lines = [
          `Drive:      ${snapshot.storage.driveName} (${snapshot.storage.ssdInterface})`,
          `Mount:      ${snapshot.storage.mountPoint}`,
          `Capacity:   ${snapshot.storage.usedGb} GB / ${snapshot.storage.totalGb} GB (${Math.round((snapshot.storage.usedGb / snapshot.storage.totalGb) * 100)}% used)`,
          `Throughput: Read ${snapshot.storage.readMbps} MB/s · Write ${snapshot.storage.writeMbps} MB/s`,
          `IOPS/Lat:   ${(snapshot.storage.iops / 1000).toFixed(1)}k IOPS · ${snapshot.storage.latencyMs.toFixed(2)} ms · QD${snapshot.storage.queueDepth}`,
          `Health:     ${snapshot.storage.healthPercent}% Healthy · ${snapshot.storage.tempC}°C · ${snapshot.storage.totalWrittenTb.toFixed(2)} TBW`,
        ];
        break;

      case 'free':
        lines = [
          '               total        used        free      cached',
          `Mem:          ${snapshot.memory.totalGb.toFixed(1)} Gi    ${snapshot.memory.usedGb.toFixed(1)} Gi    ${(snapshot.memory.totalGb - snapshot.memory.usedGb).toFixed(1)} Gi    ${snapshot.memory.cachedGb.toFixed(1)} Gi`,
          `Swap:          ${snapshot.memory.swapTotalGb.toFixed(1)} Gi     ${snapshot.memory.swapUsedGb.toFixed(1)} Gi     ${(snapshot.memory.swapTotalGb - snapshot.memory.swapUsedGb).toFixed(1)} Gi`,
        ];
        break;

      case 'df':
        lines = [
          'Volume                  Size    Used   Avail  Use%  Read/Write',
          `${snapshot.storage.mountPoint.slice(0, 22).padEnd(23)} ${snapshot.storage.totalGb >= 1024 ? (snapshot.storage.totalGb / 1024).toFixed(1) + 'T' : snapshot.storage.totalGb + 'G'}   ${snapshot.storage.usedGb}G   ${snapshot.storage.totalGb - snapshot.storage.usedGb}G   ${Math.round((snapshot.storage.usedGb / snapshot.storage.totalGb) * 100)}%   ${snapshot.storage.readMbps}/${snapshot.storage.writeMbps} MB/s`,
        ];
        break;

      case 'uptime':
        lines = [
          `up ${formatDuration(snapshot.uptimeSeconds)}, 1 user, load average: ${(snapshot.cpuUsage / 18).toFixed(2)}, ${(snapshot.cpuUsage / 22).toFixed(2)}, ${(snapshot.cpuUsage / 25).toFixed(2)}`,
        ];
        break;

      case 'uname':
        lines = [
          `${snapshot.osName} ${snapshot.hostname} ${snapshot.kernel} ${snapshot.architecture}`,
        ];
        break;

      default:
        lines = [`zsh: command not found: ${cmd}. Type "help" for valid commands.`];
        tone = 'error';
        break;
    }

    const id = nextIdRef.current++;
    setEntries((prev) => [...prev, { id, command: trimmed, lines, tone }]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runCommand(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = Math.min(history.length - 1, historyIdx + 1);
      setHistoryIdx(nextIdx);
      setInput(history[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx <= 0) {
        setHistoryIdx(-1);
        setInput('');
      } else {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInput(history[nextIdx]);
      }
    }
  };

  return (
    <section
      aria-label="Interactive Mini-Terminal"
      className="flex flex-col rounded-xl border border-white/10 bg-slate-900/55 p-5 backdrop-blur-xl"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-2.5">
          <TerminalIcon className="h-4 w-4 text-cyan-300" />
          <h2 className="text-base font-semibold tracking-tight text-slate-100">
            System Terminal
          </h2>
          <span className="font-mono text-xs text-slate-500">
            aniruddha@{snapshot.hostname}:~
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {['help', 'status', 'ssd', 'free', 'clear'].map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                runCommand(quick);
              }}
              className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-cyan-200 whitespace-nowrap shrink-0"
            >
              {quick}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        className={`mt-3 overflow-y-auto rounded-lg border border-white/[0.06] bg-[#05080f]/85 p-3.5 font-mono text-xs leading-relaxed ${
          expanded ? 'h-[420px]' : 'h-48'
        }`}
      >
        {entries.length === 0 ? (
          <div className="text-slate-500">Buffer cleared. Type &quot;help&quot; to begin.</div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="space-y-1">
                {entry.command && (
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="text-cyan-400">❯</span>
                    <span className="font-medium">{entry.command}</span>
                  </div>
                )}
                <div
                  className={`whitespace-pre-wrap pl-4 ${
                    entry.tone === 'error'
                      ? 'text-rose-300'
                      : entry.tone === 'accent'
                        ? 'text-cyan-200/90'
                        : 'text-slate-300'
                  }`}
                >
                  {entry.lines.join('\n')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2.5">
        <div className="relative flex flex-1 items-center">
          <span className="pointer-events-none absolute left-3.5 font-mono text-xs font-semibold text-cyan-400">
            ❯
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command (help, status, free, df, clear)..."
            aria-label="Terminal command input"
            className="h-10 w-full rounded-lg border border-white/10 bg-[#05080f]/90 pr-3 pl-8 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-4 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 whitespace-nowrap shrink-0"
        >
          <span>Run</span>
          <CornerDownLeft className="h-3.5 w-3.5" />
        </button>
      </form>
    </section>
  );
};
