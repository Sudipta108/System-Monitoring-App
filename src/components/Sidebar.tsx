import React from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  Network,
  Terminal as TerminalIcon,
  X,
} from 'lucide-react';
import { NavSection } from '../types/system';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  hostname: string;
  cpuModel: string;
  gpuModel: string;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'network', label: 'Network', icon: Network },
  { id: 'storage', label: 'Storage', icon: HardDrive },
  { id: 'terminal', label: 'Terminal', icon: TerminalIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  hostname,
  cpuModel,
  gpuModel,
}) => {
  const handleNavClick = (id: NavSection) => {
    onSelectSection(id);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Primary Sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-[#080d18]/90 backdrop-blur-2xl transition-all duration-200 ease-out lg:static lg:z-auto ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'lg:w-[74px]' : 'w-[250px]'}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <button
            type="button"
            onClick={() => handleNavClick('overview')}
            className="flex items-center gap-3 overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_16px_-4px_rgba(34,211,238,0.45)]">
              <Activity className="h-4.5 w-4.5" />
            </span>
            {!collapsed && (
              <span className="text-base font-semibold tracking-tight text-slate-100 whitespace-nowrap">
                Aegis Monitor
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition-colors hover:border-cyan-400/30 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 lg:flex"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 hover:text-slate-100 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                title={collapsed ? item.label : undefined}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  isActive
                    ? 'border border-cyan-400/25 bg-cyan-500/12 text-cyan-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
                    : 'border border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                } ${collapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon
                  className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                    isActive ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                {!collapsed && (
                  <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="border-t border-white/10 px-4 py-4 text-xs text-slate-400">
            <div className="font-medium text-slate-200 truncate">{hostname}</div>
            <div className="mt-1.5 space-y-1 font-mono text-[11px] leading-relaxed text-slate-400">
              <div className="truncate" title={cpuModel}>
                {cpuModel}
              </div>
              <div className="truncate text-slate-500" title={gpuModel}>
                {gpuModel}
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
