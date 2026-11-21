import React, { useEffect, useRef, useState } from 'react';
import {
  Maximize2,
  Minus,
  Settings,
  StickyNote,
  Terminal as TerminalIcon,
  X,
} from 'lucide-react';
import { AppId, SystemSnapshot } from '../types/system';

export interface AppWindowState {
  id: AppId;
  x: number;
  y: number;
  zIndex: number;
  minimized: boolean;
}

interface FloatingAppWindowsProps {
  windows: AppWindowState[];
  snapshot: SystemSnapshot;
  use24HourClock: boolean;
  onToggle24HourClock: () => void;
  refreshIntervalMs: number;
  onChangeRefreshInterval: (ms: number) => void;
  onToggleWifi: () => void;
  onFocusWindow: (id: AppId) => void;
  onMoveWindow: (id: AppId, x: number, y: number) => void;
  onToggleMinimize: (id: AppId) => void;
  onCloseWindow: (id: AppId) => void;
}

const APP_TITLES: Record<AppId, string> = {
  terminal: 'Terminal — Shell',
  notes: 'Notes Scratchpad',
  settings: 'System Settings',
};

const APP_ICONS: Record<AppId, React.ComponentType<{ className?: string }>> = {
  terminal: TerminalIcon,
  notes: StickyNote,
  settings: Settings,
};

const TerminalAppBody: React.FC<{ snapshot: SystemSnapshot }> = ({ snapshot }) => {
  const [input, setInput] = useState('');
  const [lines, setLines] = useState<string[]>([
    `Connected to ${snapshot.hostname} (${snapshot.osName})`,
    'Commands: help, status, ssd, free, uname, clear',
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim().toLowerCase();
    if (!cmd) return;
    setInput('');

    if (cmd === 'clear') {
      setLines([]);
      return;
    }

    let out: string[] = [];
    if (cmd === 'help') {
      out = ['help, status, ssd, free, uname, clear'];
    } else if (cmd === 'status') {
      out = [
        `CPU: ${snapshot.cpuModel} (${snapshot.cpuUsage.toFixed(1)}%)`,
        `GPU: ${snapshot.gpuModel} (${snapshot.gpuLoad.toFixed(1)}%)`,
        `RAM: ${snapshot.memory.usedGb.toFixed(1)}/${snapshot.memory.totalGb} GB · Net: ${snapshot.network.wifiEnabled ? `${snapshot.network.downloadMbps.toFixed(1)} Mbps` : 'Offline'}`,
      ];
    } else if (cmd === 'ssd') {
      out = [
        `${snapshot.storage.driveName} (${snapshot.storage.ssdInterface})`,
        `Read ${snapshot.storage.readMbps} MB/s · Write ${snapshot.storage.writeMbps} MB/s · ${snapshot.storage.healthPercent}% Healthy`,
      ];
    } else if (cmd === 'free') {
      out = [
        `Memory: ${snapshot.memory.usedGb.toFixed(1)} GiB used / ${snapshot.memory.totalGb} GiB total`,
      ];
    } else if (cmd === 'uname') {
      out = [`${snapshot.osName} ${snapshot.kernel} ${snapshot.architecture}`];
    } else {
      out = [`Command not found: ${cmd}`];
    }

    setLines((prev) => [...prev, `❯ ${cmd}`, ...out]);
  };

  return (
    <div className="flex h-72 flex-col justify-between bg-[#05080f]/95 p-3 font-mono text-xs">
      <div className="flex-1 space-y-1 overflow-y-auto pr-1 text-slate-300">
        {lines.map((line, i) => (
          <div
            key={i}
            className={line.startsWith('❯') ? 'text-cyan-300 font-medium' : 'text-slate-300'}
          >
            {line}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleRun} className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2">
        <span className="text-cyan-400">❯</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type command..."
          className="flex-1 bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
      </form>
    </div>
  );
};

const NotesAppBody: React.FC = () => {
  const [note, setNote] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('aegis_notes_pad_v1') ||
        'System Observations:\n- Keep GPU thermal headroom below 78°C during compilation.\n- Verify NVMe IOPS balance on large asset builds.'
      );
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('aegis_notes_pad_v1', note);
    } catch {
      // Ignore storage errors
    }
  }, [note]);

  return (
    <div className="flex h-72 flex-col bg-[#060a13]">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Write quick scratchpad notes..."
        aria-label="Notes scratchpad"
        className="flex-1 resize-none bg-transparent p-3.5 text-xs leading-relaxed text-slate-200 placeholder:text-slate-500 focus:outline-none"
      />
      <div className="flex items-center justify-between border-t border-white/10 px-3 py-1.5 text-[11px] text-slate-400">
        <span className="font-mono tabular-nums">{note.length} characters</span>
        <button
          type="button"
          onClick={() => setNote('')}
          className="text-slate-400 hover:text-rose-300"
        >
          Clear Pad
        </button>
      </div>
    </div>
  );
};

export const FloatingAppWindows: React.FC<FloatingAppWindowsProps> = ({
  windows,
  snapshot,
  use24HourClock,
  onToggle24HourClock,
  refreshIntervalMs,
  onChangeRefreshInterval,
  onToggleWifi,
  onFocusWindow,
  onMoveWindow,
  onToggleMinimize,
  onCloseWindow,
}) => {
  const dragRef = useRef<{
    id: AppId;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const maxX = Math.max(16, window.innerWidth - 360);
      const maxY = Math.max(16, window.innerHeight - 120);
      const nextX = Math.min(maxX, Math.max(12, drag.origX + dx));
      const nextY = Math.min(maxY, Math.max(12, drag.origY + dy));
      onMoveWindow(drag.id, nextX, nextY);
    };

    const handlePointerUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [onMoveWindow]);

  if (windows.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {windows.map((win) => {
        const Icon = APP_ICONS[win.id];
        return (
          <div
            key={win.id}
            role="dialog"
            aria-label={APP_TITLES[win.id]}
            onPointerDown={() => onFocusWindow(win.id)}
            style={{
              left: `${win.x}px`,
              top: `${win.y}px`,
              zIndex: win.zIndex,
            }}
            className="pointer-events-auto fixed w-[min(92vw,440px)] overflow-hidden rounded-xl border border-white/15 bg-slate-900/90 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.75)] backdrop-blur-2xl"
          >
            {/* Draggable Title Bar */}
            <div
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                onFocusWindow(win.id);
                dragRef.current = {
                  id: win.id,
                  startX: e.clientX,
                  startY: e.clientY,
                  origX: win.x,
                  origY: win.y,
                };
              }}
              className="flex cursor-grab items-center justify-between border-b border-white/10 bg-slate-950/70 px-3.5 py-2.5 select-none active:cursor-grabbing"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
                <Icon className="h-3.5 w-3.5 text-cyan-300" />
                <span>{APP_TITLES[win.id]}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onToggleMinimize(win.id)}
                  aria-label={win.minimized ? 'Expand window' : 'Minimize window'}
                  className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {win.minimized ? (
                    <Maximize2 className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onCloseWindow(win.id)}
                  aria-label={`Close ${APP_TITLES[win.id]}`}
                  className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-rose-500/20 hover:text-rose-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Window Body */}
            {!win.minimized && (
              <div>
                {win.id === 'terminal' && <TerminalAppBody snapshot={snapshot} />}
                {win.id === 'notes' && <NotesAppBody />}
                {win.id === 'settings' && (
                  <div className="space-y-4 bg-[#060a13] p-4 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-200">24-Hour Digital Clock</div>
                        <div className="text-[11px] text-slate-400">
                          Format top status bar clock
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onToggle24HourClock}
                        className={`rounded-md border px-3 py-1 font-medium transition-colors ${
                          use24HourClock
                            ? 'border-cyan-400/40 bg-cyan-500/20 text-cyan-200'
                            : 'border-white/10 bg-white/[0.04] text-slate-300'
                        }`}
                      >
                        {use24HourClock ? '24h' : '12h'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-3">
                      <div>
                        <div className="font-medium text-slate-200">Telemetry Refresh Rate</div>
                        <div className="text-[11px] text-slate-400">
                          Sampling interval for live charts
                        </div>
                      </div>
                      <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-950/70 p-0.5">
                        {[1000, 2000].map((ms) => (
                          <button
                            key={ms}
                            type="button"
                            onClick={() => onChangeRefreshInterval(ms)}
                            className={`rounded px-2.5 py-1 font-mono text-[11px] ${
                              refreshIntervalMs === ms
                                ? 'bg-cyan-500/20 text-cyan-200'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {ms / 1000}s
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-3">
                      <div>
                        <div className="font-medium text-slate-200">Wireless Interface</div>
                        <div className="text-[11px] text-slate-400">
                          {snapshot.network.interfaceName}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onToggleWifi}
                        className={`rounded-md border px-3 py-1 font-medium transition-colors ${
                          snapshot.network.wifiEnabled
                            ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                            : 'border-rose-400/40 bg-rose-500/15 text-rose-200'
                        }`}
                      >
                        {snapshot.network.wifiEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
