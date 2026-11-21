import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Battery,
  BatteryCharging,
  BatteryLow,
  Menu,
  Search,
  Thermometer,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { AppId, NavSection } from '../types/system';

interface HeaderProps {
  activeSection: NavSection;
  uptimeSeconds: number;
  osName: string;
  architecture: string;
  systemTempC: number;
  wifiEnabled: boolean;
  onToggleWifi: () => void;
  use24HourClock: boolean;
  onSelectSection: (section: NavSection) => void;
  onLaunchApp: (appId: AppId) => void;
  onOpenMobileSidebar: () => void;
}

interface BatteryManagerLike {
  level: number;
  charging: boolean;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

interface SearchTarget {
  id: string;
  label: string;
  category: string;
  keywords: string;
  action: () => void;
}

const SECTION_TITLES: Record<NavSection, string> = {
  overview: 'System Overview',
  network: 'Network Telemetry',
  storage: 'Memory & Storage',
  terminal: 'Interactive Terminal',
};

function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  uptimeSeconds,
  osName,
  architecture,
  systemTempC,
  wifiEnabled,
  onToggleWifi,
  use24HourClock,
  onSelectSection,
  onLaunchApp,
  onOpenMobileSidebar,
}) => {
  const [now, setNow] = useState(() => new Date());
  const [batteryLevel, setBatteryLevel] = useState<number>(87);
  const [batteryCharging, setBatteryCharging] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // Live digital local clock tick (500ms prevents second-skip drift)
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  // Real device battery status via Battery Status API when available
  useEffect(() => {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<BatteryManagerLike>;
    };
    if (!nav.getBattery) return;

    let batteryObj: BatteryManagerLike | null = null;
    const syncBattery = () => {
      if (!batteryObj) return;
      setBatteryLevel(Math.round(batteryObj.level * 100));
      setBatteryCharging(batteryObj.charging);
    };

    nav
      .getBattery()
      .then((bat) => {
        batteryObj = bat;
        syncBattery();
        bat.addEventListener('levelchange', syncBattery);
        bat.addEventListener('chargingchange', syncBattery);
      })
      .catch(() => {
        // Keep default fallback battery state
      });

    return () => {
      if (batteryObj) {
        batteryObj.removeEventListener('levelchange', syncBattery);
        batteryObj.removeEventListener('chargingchange', syncBattery);
      }
    };
  }, []);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchTargets = useMemo<SearchTarget[]>(
    () => [
      {
        id: 'sec-overview',
        label: 'System Overview',
        category: 'Section',
        keywords: 'overview dashboard cpu gpu ram',
        action: () => onSelectSection('overview'),
      },
      {
        id: 'sec-network',
        label: 'Network Telemetry',
        category: 'Section',
        keywords: 'network wifi download upload ping ip',
        action: () => onSelectSection('network'),
      },
      {
        id: 'sec-storage',
        label: 'Memory & SSD Storage',
        category: 'Section',
        keywords: 'storage ssd disk memory ram nvme smart',
        action: () => onSelectSection('storage'),
      },
      {
        id: 'sec-terminal',
        label: 'System Terminal',
        category: 'Section',
        keywords: 'terminal shell cli console command',
        action: () => onSelectSection('terminal'),
      },
      {
        id: 'app-terminal',
        label: 'Terminal Window',
        category: 'App',
        keywords: 'terminal shell command window',
        action: () => onLaunchApp('terminal'),
      },
      {
        id: 'app-notes',
        label: 'Notes Scratchpad',
        category: 'App',
        keywords: 'notes memo text pad',
        action: () => onLaunchApp('notes'),
      },
      {
        id: 'app-settings',
        label: 'System Settings',
        category: 'App',
        keywords: 'settings preferences clock refresh wifi',
        action: () => onLaunchApp('settings'),
      },
    ],
    [onLaunchApp, onSelectSection]
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return searchTargets.slice(0, 6);
    return searchTargets.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.keywords.includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [searchQuery, searchTargets]);

  const clockText = now.toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Dhaka',
    hour12: !use24HourClock,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateText = now.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Dhaka',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const BatteryIcon = batteryCharging
    ? BatteryCharging
    : batteryLevel <= 20
      ? BatteryLow
      : Battery;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-white/10 bg-[#070b14]/85 px-4 backdrop-blur-xl sm:px-6">
      {/* Left: Mobile Menu + Title & OS/Uptime */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation menu"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 transition-colors hover:border-cyan-400/30 hover:text-white lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-slate-100 sm:text-lg">
            {SECTION_TITLES[activeSection]}
          </h1>
          <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
            <span className="truncate">{osName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{architecture}</span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap">
              Up{' '}
              <span className="font-mono tabular-nums text-slate-200">
                {formatUptime(uptimeSeconds)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Right Status Controls: Quick Search, Wi-Fi Toggle, Battery, Live Digital Clock */}
      <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
        {/* Quick Search Bar */}
        <div ref={searchWrapperRef} className="relative hidden md:block">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchFocused(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchFocused(false);
                } else if (e.key === 'Enter' && searchResults.length > 0) {
                  searchResults[0].action();
                  setSearchQuery('');
                  setSearchFocused(false);
                }
              }}
              placeholder="Quick search..."
              aria-label="Quick search sections and apps"
              className="h-9 w-48 rounded-lg border border-white/10 bg-slate-950/75 pr-8 pl-8 text-xs text-slate-100 placeholder:text-slate-500 transition-all focus:w-60 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 text-slate-400 hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {searchFocused && (
            <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-white/15 bg-slate-950/95 py-1.5 shadow-2xl backdrop-blur-xl">
              {searchResults.length === 0 ? (
                <div className="px-3 py-2.5 text-xs text-slate-400">
                  No matching views or apps.
                </div>
              ) : (
                searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      item.action();
                      setSearchQuery('');
                      setSearchFocused(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-cyan-500/15"
                  >
                    <span className="font-medium text-slate-100">{item.label}</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {item.category}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Wi-Fi Toggle */}
        <button
          type="button"
          onClick={onToggleWifi}
          aria-pressed={wifiEnabled}
          aria-label={wifiEnabled ? 'Disable Wi-Fi' : 'Enable Wi-Fi'}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 whitespace-nowrap shrink-0 ${
            wifiEnabled
              ? 'border-cyan-400/25 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
          }`}
        >
          {wifiEnabled ? (
            <Wifi className="h-3.5 w-3.5 text-cyan-300" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-rose-300" />
          )}
          <span className="hidden sm:inline">{wifiEnabled ? 'Wi-Fi' : 'Offline'}</span>
        </button>

        {/* Battery Status Indicator */}
        <div
          className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-xs whitespace-nowrap shrink-0"
          title={batteryCharging ? 'Charging' : 'On Battery'}
        >
          <BatteryIcon
            className={`h-4 w-4 ${
              batteryCharging
                ? 'text-emerald-400'
                : batteryLevel <= 20
                  ? 'text-rose-400'
                  : 'text-slate-300'
            }`}
          />
          <span className="font-mono tabular-nums text-slate-200">{batteryLevel}%</span>
        </div>

        {/* System Temperature & Thermal State Indicator */}
        <div
          className="hidden h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-xs whitespace-nowrap shrink-0 sm:flex"
          title={`System Temperature: ${systemTempC.toFixed(1)}°C (${systemTempC >= 72 ? 'High' : systemTempC >= 58 ? 'Warm' : 'Normal'})`}
        >
          <Thermometer
            className={`h-3.5 w-3.5 ${
              systemTempC >= 72
                ? 'text-rose-400'
                : systemTempC >= 58
                  ? 'text-amber-300'
                  : 'text-emerald-400'
            }`}
          />
          <span className="font-mono tabular-nums text-slate-200">
            {systemTempC.toFixed(0)}°C
          </span>
          <span
            className={`hidden font-medium lg:inline ${
              systemTempC >= 72
                ? 'text-rose-400'
                : systemTempC >= 58
                  ? 'text-amber-300'
                  : 'text-emerald-400'
            }`}
          >
            {systemTempC >= 72 ? 'High' : systemTempC >= 58 ? 'Warm' : 'Normal'}
          </span>
        </div>

        {/* Live Digital Clock — Bangladesh Standard Time (UTC+6) */}
        <div
          title="Bangladesh Standard Time (Asia/Dhaka · UTC+06:00)"
          aria-label={`Bangladesh Standard Time ${clockText} BST`}
          className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs whitespace-nowrap shrink-0"
        >
          <span className="hidden text-slate-400 xl:inline">{dateText}</span>
          <span className="font-mono font-medium tabular-nums text-slate-100">
            {clockText}
          </span>
          <span className="hidden font-mono text-[11px] text-cyan-300/90 sm:inline">
            BST · UTC+6
          </span>
        </div>
      </div>
    </header>
  );
};
