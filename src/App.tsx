/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useState } from 'react';
import { CpuGpuWidget } from './components/CpuGpuWidget';
import { AppWindowState, FloatingAppWindows } from './components/FloatingAppWindows';
import { Header } from './components/Header';
import { MemoryStorageWidget } from './components/MemoryStorageWidget';
import { MiniTerminal } from './components/MiniTerminal';
import { NetworkWidget } from './components/NetworkWidget';
import { QuickAppLauncher } from './components/QuickAppLauncher';
import { ResourceMiniBar } from './components/ResourceMiniBar';
import { Sidebar } from './components/Sidebar';
import { SsdStatsWidget } from './components/SsdStatsWidget';
import { SystemTempWidget } from './components/SystemTempWidget';
import { TaskFocusWidget } from './components/TaskFocusWidget';
import { useSystemMonitor } from './hooks/useSystemMonitor';
import { AppId, NavSection } from './types/system';

export function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [use24HourClock, setUse24HourClock] = useState(true);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(1000);
  const [openWindows, setOpenWindows] = useState<AppWindowState[]>([]);
  const [topZIndex, setTopZIndex] = useState(60);

  const { snapshot, toggleWifi } = useSystemMonitor(refreshIntervalMs);

  const handleLaunchApp = useCallback((appId: AppId) => {
    setTopZIndex((prevZ) => {
      const nextZ = prevZ + 1;
      setOpenWindows((prev) => {
        const existing = prev.find((w) => w.id === appId);
        if (existing) {
          return prev.map((w) =>
            w.id === appId ? { ...w, zIndex: nextZ, minimized: false } : w
          );
        }
        const offset = (prev.length % 5) * 28;
        const baseX =
          typeof window !== 'undefined'
            ? Math.max(
                24,
                Math.min(
                  window.innerWidth - 460,
                  Math.round(window.innerWidth * 0.28) + offset
                )
              )
            : 180 + offset;
        const baseY = 96 + offset;
        return [
          ...prev,
          { id: appId, x: baseX, y: baseY, zIndex: nextZ, minimized: false },
        ];
      });
      return nextZ;
    });
  }, []);

  const handleFocusWindow = useCallback((appId: AppId) => {
    setTopZIndex((prevZ) => {
      const nextZ = prevZ + 1;
      setOpenWindows((prev) =>
        prev.map((w) => (w.id === appId ? { ...w, zIndex: nextZ } : w))
      );
      return nextZ;
    });
  }, []);

  const handleMoveWindow = useCallback((appId: AppId, x: number, y: number) => {
    setOpenWindows((prev) =>
      prev.map((w) => (w.id === appId ? { ...w, x, y } : w))
    );
  }, []);

  const handleToggleMinimize = useCallback((appId: AppId) => {
    setOpenWindows((prev) =>
      prev.map((w) =>
        w.id === appId ? { ...w, minimized: !w.minimized } : w
      )
    );
  }, []);

  const handleCloseWindow = useCallback((appId: AppId) => {
    setOpenWindows((prev) => prev.filter((w) => w.id !== appId));
  }, []);

  return (
    <div className="relative flex min-h-screen bg-[#060911] text-slate-100">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/4 h-[520px] w-[520px] rounded-full bg-cyan-500/[0.06] blur-[130px]" />
        <div className="absolute right-1/6 bottom-0 h-[440px] w-[440px] rounded-full bg-indigo-500/[0.06] blur-[140px]" />
      </div>

      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        hostname={snapshot.hostname}
        cpuModel={snapshot.cpuModel}
        gpuModel={snapshot.gpuModel}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header
          activeSection={activeSection}
          uptimeSeconds={snapshot.uptimeSeconds}
          osName={snapshot.osName}
          architecture={snapshot.architecture}
          systemTempC={snapshot.systemTempC}
          wifiEnabled={snapshot.network.wifiEnabled}
          onToggleWifi={toggleWifi}
          use24HourClock={use24HourClock}
          onSelectSection={setActiveSection}
          onLaunchApp={handleLaunchApp}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-[1600px] space-y-5">
            {activeSection === 'overview' && (
              <>
                <ResourceMiniBar
                  cpuUsage={snapshot.cpuUsage}
                  cpuHistory={snapshot.cpuGpuHistory.map((p) => p.cpu)}
                  clockSpeedGhz={snapshot.clockSpeedGhz}
                  ramUsedGb={snapshot.memory.usedGb}
                  ramTotalGb={snapshot.memory.totalGb}
                  ramCapped={snapshot.memory.isBrowserCapped}
                  ramHistory={snapshot.ramHistory}
                  systemTempC={snapshot.systemTempC}
                  tempHistory={snapshot.tempHistory}
                  ssdReadMbps={snapshot.storage.readMbps}
                  ssdWriteMbps={snapshot.storage.writeMbps}
                  wifiEnabled={snapshot.network.wifiEnabled}
                  downloadMbps={snapshot.network.downloadMbps}
                />

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                  <div className="xl:col-span-5">
                    <QuickAppLauncher
                      openAppIds={openWindows.map((w) => w.id)}
                      onLaunchApp={handleLaunchApp}
                    />
                  </div>
                  <div className="xl:col-span-7">
                    <TaskFocusWidget />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                  <div className="xl:col-span-7">
                    <CpuGpuWidget
                      history={snapshot.cpuGpuHistory}
                      cpuUsage={snapshot.cpuUsage}
                      coreTempC={snapshot.coreTempC}
                      clockSpeedGhz={snapshot.clockSpeedGhz}
                      gpuLoad={snapshot.gpuLoad}
                      gpuTempC={snapshot.gpuTempC}
                      vramUsedGb={snapshot.vramUsedGb}
                      vramTotalGb={snapshot.vramTotalGb}
                      coreLoads={snapshot.coreLoads}
                      cpuModel={snapshot.cpuModel}
                      gpuModel={snapshot.gpuModel}
                    />
                  </div>
                  <div className="xl:col-span-5">
                    <MemoryStorageWidget
                      memory={snapshot.memory}
                      storage={snapshot.storage}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                  <div className="xl:col-span-6">
                    <SsdStatsWidget
                      storage={snapshot.storage}
                      history={snapshot.ssdHistory}
                    />
                  </div>
                  <div className="xl:col-span-6">
                    <NetworkWidget
                      history={snapshot.networkHistory}
                      ipAddress={snapshot.network.ipAddress}
                      interfaceName={snapshot.network.interfaceName}
                      downloadMbps={snapshot.network.downloadMbps}
                      uploadMbps={snapshot.network.uploadMbps}
                      pingMs={snapshot.network.pingMs}
                      packetsPerSec={snapshot.network.packetsPerSec}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                  <div className="xl:col-span-5">
                    <SystemTempWidget
                      systemTempC={snapshot.systemTempC}
                      coreTempC={snapshot.coreTempC}
                      gpuTempC={snapshot.gpuTempC}
                      ssdTempC={snapshot.storage.tempC}
                      vrmTempC={snapshot.vrmTempC}
                      chassisTempC={snapshot.chassisTempC}
                      fanRpm={snapshot.fanRpm}
                      tempHistory={snapshot.tempHistory}
                    />
                  </div>
                  <div className="xl:col-span-7">
                    <MiniTerminal snapshot={snapshot} />
                  </div>
                </div>
              </>
            )}

            {activeSection === 'network' && (
              <div className="space-y-5">
                <NetworkWidget
                  history={snapshot.networkHistory}
                  ipAddress={snapshot.network.ipAddress}
                  interfaceName={snapshot.network.interfaceName}
                  downloadMbps={snapshot.network.downloadMbps}
                  uploadMbps={snapshot.network.uploadMbps}
                  pingMs={snapshot.network.pingMs}
                  packetsPerSec={snapshot.network.packetsPerSec}
                />
                <MiniTerminal snapshot={snapshot} />
              </div>
            )}

            {activeSection === 'storage' && (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                <div className="xl:col-span-7">
                  <SsdStatsWidget
                    storage={snapshot.storage}
                    history={snapshot.ssdHistory}
                  />
                </div>
                <div className="xl:col-span-5">
                  <MemoryStorageWidget
                    memory={snapshot.memory}
                    storage={snapshot.storage}
                  />
                </div>
              </div>
            )}

            {activeSection === 'terminal' && (
              <MiniTerminal snapshot={snapshot} expanded />
            )}
          </div>
        </main>
      </div>

      <FloatingAppWindows
        windows={openWindows}
        snapshot={snapshot}
        use24HourClock={use24HourClock}
        onToggle24HourClock={() => setUse24HourClock((prev) => !prev)}
        refreshIntervalMs={refreshIntervalMs}
        onChangeRefreshInterval={setRefreshIntervalMs}
        onToggleWifi={toggleWifi}
        onFocusWindow={handleFocusWindow}
        onMoveWindow={handleMoveWindow}
        onToggleMinimize={handleToggleMinimize}
        onCloseWindow={handleCloseWindow}
      />
    </div>
  );
}

export default App;
