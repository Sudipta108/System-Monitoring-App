import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  StickyNote,
  Terminal as TerminalIcon,
} from 'lucide-react';
import { AppId } from '../types/system';

interface QuickAppLauncherProps {
  openAppIds: AppId[];
  onLaunchApp: (appId: AppId) => void;
}

interface ShortcutConfig {
  id: AppId;
  enabled: boolean;
}

interface AppMeta {
  id: AppId;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
}

const APP_CATALOG: Record<AppId, AppMeta> = {
  terminal: {
    id: 'terminal',
    label: 'Terminal',
    subtitle: 'Command Shell',
    icon: TerminalIcon,
    accentClass: 'text-cyan-300 border-cyan-400/25 bg-cyan-500/10',
  },
  notes: {
    id: 'notes',
    label: 'Notes',
    subtitle: 'Scratchpad',
    icon: StickyNote,
    accentClass: 'text-amber-300 border-amber-400/25 bg-amber-500/10',
  },
  settings: {
    id: 'settings',
    label: 'System Settings',
    subtitle: 'Preferences',
    icon: Settings,
    accentClass: 'text-slate-200 border-white/20 bg-white/[0.06]',
  },
};

const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  { id: 'terminal', enabled: true },
  { id: 'notes', enabled: true },
  { id: 'settings', enabled: true },
];

const STORAGE_KEY_SHORTCUTS = 'aegis_launcher_shortcuts_v2';

export const QuickAppLauncher: React.FC<QuickAppLauncherProps> = ({
  openAppIds,
  onLaunchApp,
}) => {
  const [customizing, setCustomizing] = useState(false);
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHORTCUTS);
      if (saved) {
        const parsed = JSON.parse(saved) as ShortcutConfig[];
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(
            (s): s is ShortcutConfig =>
              s && (s.id === 'terminal' || s.id === 'notes' || s.id === 'settings')
          );
          if (valid.length === DEFAULT_SHORTCUTS.length) {
            return valid;
          }
        }
      }
    } catch {
      // Ignore storage errors
    }
    return DEFAULT_SHORTCUTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SHORTCUTS, JSON.stringify(shortcuts));
    } catch {
      // Ignore storage errors
    }
  }, [shortcuts]);

  const toggleEnabled = (id: AppId) => {
    setShortcuts((prev) => {
      const enabledCount = prev.filter((s) => s.enabled).length;
      return prev.map((s) => {
        if (s.id !== id) return s;
        if (s.enabled && enabledCount <= 1) return s;
        return { ...s, enabled: !s.enabled };
      });
    });
  };

  const moveShortcut = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= shortcuts.length) return;
    setShortcuts((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const resetShortcuts = () => {
    setShortcuts(DEFAULT_SHORTCUTS);
  };

  const visibleShortcuts = customizing
    ? shortcuts
    : shortcuts.filter((s) => s.enabled);

  return (
    <section
      aria-label="Quick App Launcher"
      className="flex flex-col justify-between rounded-xl border border-white/10 bg-slate-900/55 p-5 backdrop-blur-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-100">
            Quick App Launcher
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {customizing
              ? 'Reorder or toggle shortcuts in your grid'
              : 'Click any shortcut to open a floating window'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {customizing && (
            <button
              type="button"
              onClick={resetShortcuts}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setCustomizing((prev) => !prev)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              customizing
                ? 'border-cyan-400/40 bg-cyan-500/20 text-cyan-200'
                : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{customizing ? 'Done' : 'Customize'}</span>
          </button>
        </div>
      </div>

      {/* App Grid */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {visibleShortcuts.map((shortcut, index) => {
          const meta = APP_CATALOG[shortcut.id];
          const Icon = meta.icon;
          const isOpen = openAppIds.includes(shortcut.id);

          if (customizing) {
            return (
              <div
                key={shortcut.id}
                className={`flex flex-col justify-between gap-2.5 rounded-xl border p-3 transition-colors ${
                  shortcut.enabled
                    ? 'border-white/15 bg-white/[0.03]'
                    : 'border-white/[0.06] bg-white/[0.01] opacity-55'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${meta.accentClass}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="truncate text-xs font-medium text-slate-200">
                    {meta.label}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-1 pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveShortcut(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${meta.label} left`}
                      className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] disabled:opacity-30"
                    >
                      <ArrowLeft className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveShortcut(index, 1)}
                      disabled={index === shortcuts.length - 1}
                      aria-label={`Move ${meta.label} right`}
                      className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] disabled:opacity-30"
                    >
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleEnabled(shortcut.id)}
                    aria-label={shortcut.enabled ? `Hide ${meta.label}` : `Show ${meta.label}`}
                    className="flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]"
                  >
                    {shortcut.enabled ? (
                      <Eye className="h-3.5 w-3.5 text-cyan-300" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>
            );
          }

          return (
            <button
              key={shortcut.id}
              type="button"
              onClick={() => onLaunchApp(shortcut.id)}
              className={`group flex flex-col items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                isOpen
                  ? 'border-cyan-400/35 bg-cyan-500/[0.08]'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border ${meta.accentClass}`}
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>
                {isOpen && (
                  <span className="font-mono text-[10px] font-medium text-cyan-300">
                    Open
                  </span>
                )}
              </div>

              <div className="min-w-0 w-full">
                <div className="truncate text-xs font-semibold text-slate-100">
                  {meta.label}
                </div>
                <div className="truncate text-[11px] text-slate-400">
                  {meta.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
