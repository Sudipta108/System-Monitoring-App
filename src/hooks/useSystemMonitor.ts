import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CpuGpuPoint,
  NetworkPoint,
  SsdPoint,
  SystemSnapshot,
} from '../types/system';
import {
  detectDeviceInfoAsync,
  getInitialDeviceInfoSync,
} from '../utils/deviceInfo';

const HISTORY_LENGTH = 40;

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function jitter(base: number, range: number): number {
  return base + (Math.random() - 0.5) * 2 * range;
}

function buildInitialHistory(): {
  cpuGpuHistory: CpuGpuPoint[];
  networkHistory: NetworkPoint[];
  ssdHistory: SsdPoint[];
  ramHistory: number[];
  tempHistory: number[];
} {
  const now = Date.now();
  const cpuGpuHistory: CpuGpuPoint[] = [];
  const networkHistory: NetworkPoint[] = [];
  const ssdHistory: SsdPoint[] = [];
  const ramHistory: number[] = [];
  const tempHistory: number[] = [];

  let prevCpu = 38;
  let prevGpu = 26;
  let prevDown = 185;
  let prevUp = 42;
  let prevRead = 1420;
  let prevWrite = 640;
  let prevRam = 58;
  let prevSysTemp = 44;

  for (let i = HISTORY_LENGTH - 1; i >= 0; i--) {
    const t = new Date(now - i * 1000);
    const label = formatTimeLabel(t);

    prevCpu = clamp(prevCpu + (Math.random() - 0.48) * 6, 22, 58);
    prevGpu = clamp(prevGpu + (Math.random() - 0.49) * 5, 16, 46);
    const temp = clamp(44 + prevCpu * 0.32 + (Math.random() - 0.5) * 1.4, 42, 68);
    const clock = clamp(3.4 + (prevCpu / 100) * 1.6 + (Math.random() - 0.5) * 0.15, 3.2, 5.1);

    cpuGpuHistory.push({
      timestamp: label,
      cpu: Number(prevCpu.toFixed(1)),
      gpu: Number(prevGpu.toFixed(1)),
      temp: Number(temp.toFixed(1)),
      clockGhz: Number(clock.toFixed(2)),
    });

    prevDown = clamp(prevDown + (Math.random() - 0.5) * 48, 85, 340);
    prevUp = clamp(prevUp + (Math.random() - 0.5) * 16, 18, 95);

    networkHistory.push({
      timestamp: label,
      downloadMbps: Number(prevDown.toFixed(1)),
      uploadMbps: Number(prevUp.toFixed(1)),
      pingMs: Math.round(clamp(10 + (Math.random() - 0.5) * 4, 7, 18)),
    });

    prevRead = clamp(prevRead + (Math.random() - 0.5) * 420, 480, 2800);
    prevWrite = clamp(prevWrite + (Math.random() - 0.5) * 240, 190, 1580);

    ssdHistory.push({
      timestamp: label,
      readMbps: Math.round(prevRead),
      writeMbps: Math.round(prevWrite),
    });

    prevRam = clamp(prevRam + (Math.random() - 0.5) * 2.2, 48, 68);
    ramHistory.push(Number(prevRam.toFixed(1)));

    prevSysTemp = clamp(prevSysTemp * 0.7 + (temp * 0.62 + 12) * 0.3, 36, 62);
    tempHistory.push(Number(prevSysTemp.toFixed(1)));
  }

  return { cpuGpuHistory, networkHistory, ssdHistory, ramHistory, tempHistory };
}

export function useSystemMonitor(refreshIntervalMs = 1000) {
  const initialHistoryRef = useRef(buildInitialHistory());
  const initialDeviceRef = useRef(getInitialDeviceInfoSync());
  const wifiRef = useRef(true);

  const [snapshot, setSnapshot] = useState<SystemSnapshot>(() => {
    const {
      cpuGpuHistory,
      networkHistory,
      ssdHistory,
      ramHistory,
      tempHistory,
    } = initialHistoryRef.current;
    const device = initialDeviceRef.current;
    const latestCpu = cpuGpuHistory[cpuGpuHistory.length - 1];
    const latestNet = networkHistory[networkHistory.length - 1];
    const latestSsd = ssdHistory[ssdHistory.length - 1];
    const latestSysTemp = tempHistory[tempHistory.length - 1];
    const displayCoreCount = Math.min(16, Math.max(4, device.logicalCores));
    const totalRam = device.memoryTotalGb;
    const initialUsedRam = Number((totalRam * 0.58).toFixed(1));
    const initialCachedRam = Number((totalRam * 0.17).toFixed(1));
    const swapTotal = Math.max(2, Math.round(totalRam * 0.25));
    const storageTotal = device.storageTotalGb;
    const storageUsed = Math.round(storageTotal * 0.38);

    return {
      uptimeSeconds: 14 * 86400 + 7 * 3600 + 42 * 60 + 18,
      osName: device.osName,
      kernel: device.kernel,
      architecture: device.architecture,
      hostname: device.hostname,
      cpuModel: device.cpuModel,
      gpuModel: device.gpuModel,
      cpuUsage: latestCpu.cpu,
      coreLoads: Array.from({ length: displayCoreCount }, () =>
        Number(clamp(jitter(latestCpu.cpu, 14), 8, 85).toFixed(0))
      ),
      coreTempC: latestCpu.temp,
      clockSpeedGhz: latestCpu.clockGhz,
      gpuLoad: latestCpu.gpu,
      gpuTempC: 48,
      systemTempC: latestSysTemp,
      vrmTempC: 43.2,
      chassisTempC: 33.8,
      fanRpm: 1620,
      vramUsedGb: 4.2,
      vramTotalGb: 16,
      memory: {
        memoryModel: device.memoryModel,
        isBrowserCapped: device.memoryBrowserCapped,
        usedGb: initialUsedRam,
        cachedGb: initialCachedRam,
        totalGb: totalRam,
        swapUsedGb: Number((swapTotal * 0.08).toFixed(1)),
        swapTotalGb: swapTotal,
      },
      storage: {
        driveName: device.storageDriveName,
        ssdInterface: device.storageInterface,
        mountPoint: device.storageMountPoint,
        ioLabel: device.storageIoLabel,
        usedGb: storageUsed,
        totalGb: storageTotal,
        readMbps: latestSsd.readMbps,
        writeMbps: latestSsd.writeMbps,
        maxSpeedMbps: device.storageMaxSpeedMbps,
        iops: 142800,
        tempC: 41,
        healthPercent: 99,
        latencyMs: 0.18,
        queueDepth: 8,
        totalWrittenTb: 14.62,
        browserQuotaGb: device.browserQuotaGb,
        browserUsedMb: device.browserUsedMb,
      },
      network: {
        wifiEnabled: true,
        ipAddress: '192.168.1.42',
        interfaceName: 'en0 · Wi-Fi 6E',
        downloadMbps: latestNet.downloadMbps,
        uploadMbps: latestNet.uploadMbps,
        pingMs: latestNet.pingMs,
        packetsPerSec: 18420,
      },
      cpuGpuHistory,
      networkHistory,
      ssdHistory,
      ramHistory,
      tempHistory,
    };
  });

  const toggleWifi = useCallback(() => {
    setSnapshot((prev) => {
      const nextEnabled = !prev.network.wifiEnabled;
      wifiRef.current = nextEnabled;
      return {
        ...prev,
        network: {
          ...prev.network,
          wifiEnabled: nextEnabled,
          ipAddress: nextEnabled ? '192.168.1.42' : 'Disconnected',
          downloadMbps: nextEnabled ? 142.4 : 0,
          uploadMbps: nextEnabled ? 34.8 : 0,
          pingMs: nextEnabled ? 11 : 0,
          packetsPerSec: nextEnabled ? 12400 : 0,
        },
      };
    });
  }, []);

  useEffect(() => {
    let active = true;
    detectDeviceInfoAsync().then((detected) => {
      if (!active) return;
      const displayCoreCount = Math.min(16, Math.max(4, detected.logicalCores));
      setSnapshot((prev) => {
        const memRatio = clamp(prev.memory.usedGb / prev.memory.totalGb, 0.35, 0.78);
        const newTotalRam = detected.memoryTotalGb;
        const newSwapTotal = Math.max(2, Math.round(newTotalRam * 0.25));
        const newStorageTotal = detected.storageTotalGb;
        const storageRatio = clamp(prev.storage.usedGb / prev.storage.totalGb, 0.25, 0.75);

        return {
          ...prev,
          osName: detected.osName,
          kernel: detected.kernel,
          architecture: detected.architecture,
          hostname: detected.hostname,
          cpuModel: detected.cpuModel,
          gpuModel: detected.gpuModel,
          coreLoads:
            prev.coreLoads.length === displayCoreCount
              ? prev.coreLoads
              : Array.from({ length: displayCoreCount }, () =>
                  Number(clamp(jitter(prev.cpuUsage, 14), 8, 85).toFixed(0))
                ),
          memory: {
            ...prev.memory,
            memoryModel: detected.memoryModel,
            isBrowserCapped: detected.memoryBrowserCapped,
            totalGb: newTotalRam,
            usedGb: Number((newTotalRam * memRatio).toFixed(1)),
            cachedGb: Number((newTotalRam * 0.17).toFixed(1)),
            swapTotalGb: newSwapTotal,
            swapUsedGb: Number((newSwapTotal * 0.08).toFixed(1)),
          },
          storage: {
            ...prev.storage,
            driveName: detected.storageDriveName,
            ssdInterface: detected.storageInterface,
            mountPoint: detected.storageMountPoint,
            ioLabel: detected.storageIoLabel,
            totalGb: newStorageTotal,
            usedGb: Math.round(newStorageTotal * storageRatio),
            maxSpeedMbps: detected.storageMaxSpeedMbps,
            browserQuotaGb: detected.browserQuotaGb,
            browserUsedMb: detected.browserUsedMb,
          },
        };
      });
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nowLabel = formatTimeLabel(new Date());
      const wifiOn = wifiRef.current;

      setSnapshot((prev) => {
        const cpuUsage = Number(
          clamp(prev.cpuUsage + (Math.random() - 0.49) * 6.5, 16, 68).toFixed(1)
        );

        const targetTemp = 42 + cpuUsage * 0.42;
        const coreTempC = Number(
          clamp(prev.coreTempC * 0.7 + targetTemp * 0.3 + (Math.random() - 0.5) * 1.1, 38, 82).toFixed(1)
        );

        const targetClock = 3.2 + (cpuUsage / 100) * 2.2;
        const clockSpeedGhz = Number(
          clamp(prev.clockSpeedGhz * 0.5 + targetClock * 0.5 + (Math.random() - 0.5) * 0.08, 3.1, 5.5).toFixed(2)
        );

        const targetGpu = clamp(18 + cpuUsage * 0.25 + (Math.random() - 0.5) * 8, 8, 56);
        const gpuLoad = Number(
          clamp(prev.gpuLoad * 0.45 + targetGpu * 0.55, 5, 85).toFixed(1)
        );
        const gpuTempC = Number(
          clamp(prev.gpuTempC * 0.8 + (38 + gpuLoad * 0.42) * 0.2, 36, 78).toFixed(1)
        );
        const vramUsedGb = Number(
          clamp(prev.vramUsedGb + (Math.random() - 0.5) * 0.2, 3.2, 7.6).toFixed(1)
        );

        const coreLoads = prev.coreLoads.map((c) => {
          const target = clamp(cpuUsage + (Math.random() - 0.5) * 24, 4, 96);
          return Math.round(c * 0.4 + target * 0.6);
        });

        const totalRam = prev.memory.totalGb;
        const minUsedRam = Number((totalRam * 0.45).toFixed(1));
        const maxUsedRam = Number((totalRam * 0.74).toFixed(1));
        const usedGb = Number(
          clamp(
            prev.memory.usedGb + (Math.random() - 0.5) * (totalRam * 0.015),
            minUsedRam,
            maxUsedRam
          ).toFixed(1)
        );
        const cachedGb = Number(
          clamp(
            prev.memory.cachedGb + (Math.random() - 0.5) * (totalRam * 0.008),
            totalRam * 0.12,
            totalRam * 0.22
          ).toFixed(1)
        );
        const ramPercent = Number(((usedGb / totalRam) * 100).toFixed(1));

        const targetRead = clamp(1350 + (Math.random() - 0.5) * 650, 420, 2900);
        const targetWrite = clamp(680 + (Math.random() - 0.5) * 320, 180, 1650);
        const readMbps = Math.round(prev.storage.readMbps * 0.45 + targetRead * 0.55);
        const writeMbps = Math.round(prev.storage.writeMbps * 0.45 + targetWrite * 0.55);
        const iops = Math.round((readMbps + writeMbps) * 72 + Math.random() * 4500);
        const storageTempC = Number(
          clamp(prev.storage.tempC * 0.85 + 41 * 0.15 + (Math.random() - 0.5) * 0.4, 37, 52).toFixed(0)
        );
        const latencyMs = Number(
          clamp(0.14 + ((readMbps + writeMbps) / prev.storage.maxSpeedMbps) * 0.24 + (Math.random() - 0.5) * 0.04, 0.09, 0.55).toFixed(2)
        );
        const queueDepth = Math.max(2, Math.round(((readMbps + writeMbps) / 300) + Math.random() * 4));
        const totalWrittenTb = Number(
          (prev.storage.totalWrittenTb + writeMbps / (1024 * 1024 * 10)).toFixed(4)
        );

        // System thermal model combining CPU, GPU, and SSD sensors
        const targetSystemTemp = coreTempC * 0.42 + gpuTempC * 0.34 + storageTempC * 0.24;
        const systemTempC = Number(
          clamp(prev.systemTempC * 0.72 + targetSystemTemp * 0.28 + (Math.random() - 0.5) * 0.4, 34, 78).toFixed(1)
        );
        const vrmTempC = Number(
          clamp(prev.vrmTempC * 0.75 + (systemTempC - 1.5) * 0.25 + (Math.random() - 0.5) * 0.3, 33, 74).toFixed(1)
        );
        const chassisTempC = Number(
          clamp(prev.chassisTempC * 0.85 + (systemTempC - 10.5) * 0.15 + (Math.random() - 0.5) * 0.2, 26, 48).toFixed(1)
        );
        const fanRpm = Math.round(
          clamp(1150 + (systemTempC - 34) * 48 + (Math.random() - 0.5) * 45, 950, 3600)
        );

        const targetDown = wifiOn ? clamp(195 + (Math.random() - 0.5) * 110, 45, 420) : 0;
        const targetUp = wifiOn ? clamp(48 + (Math.random() - 0.5) * 26, 12, 115) : 0;

        const downloadMbps = wifiOn
          ? Number(clamp(prev.network.downloadMbps * 0.4 + targetDown * 0.6, 5, 900).toFixed(1))
          : 0;
        const uploadMbps = wifiOn
          ? Number(clamp(prev.network.uploadMbps * 0.4 + targetUp * 0.6, 2, 300).toFixed(1))
          : 0;
        const pingMs = wifiOn ? Math.round(clamp(11 + (Math.random() - 0.5) * 4, 6, 24)) : 0;

        const nextCpuGpuPoint: CpuGpuPoint = {
          timestamp: nowLabel,
          cpu: cpuUsage,
          gpu: gpuLoad,
          temp: coreTempC,
          clockGhz: clockSpeedGhz,
        };

        const nextNetPoint: NetworkPoint = {
          timestamp: nowLabel,
          downloadMbps,
          uploadMbps,
          pingMs,
        };

        const nextSsdPoint: SsdPoint = {
          timestamp: nowLabel,
          readMbps,
          writeMbps,
        };

        return {
          ...prev,
          uptimeSeconds: prev.uptimeSeconds + Math.round(refreshIntervalMs / 1000),
          cpuUsage,
          coreLoads,
          coreTempC,
          clockSpeedGhz,
          gpuLoad,
          gpuTempC,
          systemTempC,
          vrmTempC,
          chassisTempC,
          fanRpm,
          vramUsedGb,
          memory: {
            ...prev.memory,
            usedGb,
            cachedGb,
          },
          storage: {
            ...prev.storage,
            readMbps,
            writeMbps,
            iops,
            tempC: storageTempC,
            latencyMs,
            queueDepth,
            totalWrittenTb,
          },
          network: {
            ...prev.network,
            wifiEnabled: wifiOn,
            downloadMbps,
            uploadMbps,
            pingMs,
            packetsPerSec: wifiOn ? Math.round((downloadMbps + uploadMbps) * 96) : 0,
          },
          cpuGpuHistory: [...prev.cpuGpuHistory.slice(1), nextCpuGpuPoint],
          networkHistory: [...prev.networkHistory.slice(1), nextNetPoint],
          ssdHistory: [...prev.ssdHistory.slice(1), nextSsdPoint],
          ramHistory: [...prev.ramHistory.slice(1), ramPercent],
          tempHistory: [...prev.tempHistory.slice(1), systemTempC],
        };
      });
    }, refreshIntervalMs);

    return () => window.clearInterval(timer);
  }, [refreshIntervalMs]);

  return {
    snapshot,
    toggleWifi,
  };
}
