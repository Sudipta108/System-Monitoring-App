export type NavSection = 'overview' | 'network' | 'storage' | 'terminal';

export type AppId = 'terminal' | 'notes' | 'settings';

export interface CpuGpuPoint {
  timestamp: string;
  cpu: number;
  gpu: number;
  temp: number;
  clockGhz: number;
}

export interface NetworkPoint {
  timestamp: string;
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
}

export interface SsdPoint {
  timestamp: string;
  readMbps: number;
  writeMbps: number;
}

export interface StorageMetrics {
  driveName: string;
  ssdInterface: string;
  mountPoint: string;
  ioLabel: string;
  usedGb: number;
  totalGb: number;
  readMbps: number;
  writeMbps: number;
  maxSpeedMbps: number;
  iops: number;
  tempC: number;
  healthPercent: number;
  latencyMs: number;
  queueDepth: number;
  totalWrittenTb: number;
  browserQuotaGb: number | null;
  browserUsedMb: number | null;
}

export interface MemoryMetrics {
  memoryModel: string;
  isBrowserCapped: boolean;
  usedGb: number;
  cachedGb: number;
  totalGb: number;
  swapUsedGb: number;
  swapTotalGb: number;
}

export interface SystemSnapshot {
  uptimeSeconds: number;
  osName: string;
  kernel: string;
  architecture: string;
  hostname: string;
  cpuModel: string;
  gpuModel: string;
  cpuUsage: number;
  coreLoads: number[];
  coreTempC: number;
  clockSpeedGhz: number;
  gpuLoad: number;
  gpuTempC: number;
  systemTempC: number;
  vrmTempC: number;
  chassisTempC: number;
  fanRpm: number;
  vramUsedGb: number;
  vramTotalGb: number;
  memory: MemoryMetrics;
  storage: StorageMetrics;
  network: {
    wifiEnabled: boolean;
    ipAddress: string;
    interfaceName: string;
    downloadMbps: number;
    uploadMbps: number;
    pingMs: number;
    packetsPerSec: number;
  };
  cpuGpuHistory: CpuGpuPoint[];
  networkHistory: NetworkPoint[];
  ssdHistory: SsdPoint[];
  ramHistory: number[];
  tempHistory: number[];
}
