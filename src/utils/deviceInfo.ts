export interface DetectedDeviceInfo {
  cpuModel: string;
  gpuModel: string;
  osName: string;
  architecture: string;
  kernel: string;
  hostname: string;
  logicalCores: number;
  memoryModel: string;
  memoryTotalGb: number;
  memoryBrowserCapped: boolean;
  storageDriveName: string;
  storageInterface: string;
  storageMountPoint: string;
  storageIoLabel: string;
  storageTotalGb: number;
  storageMaxSpeedMbps: number;
  browserQuotaGb: number | null;
  browserUsedMb: number | null;
}

interface NavigatorUAData {
  platform?: string;
  mobile?: boolean;
  getHighEntropyValues?: (hints: string[]) => Promise<{
    architecture?: string;
    bitness?: string;
    platform?: string;
    platformVersion?: string;
    model?: string;
  }>;
}

interface GPUAdapterLike {
  info?: {
    vendor?: string;
    architecture?: string;
    device?: string;
    description?: string;
  };
  requestAdapterInfo?: () => Promise<{
    vendor?: string;
    architecture?: string;
    device?: string;
    description?: string;
  }>;
}

interface NavigatorWithExtras {
  userAgentData?: NavigatorUAData;
  deviceMemory?: number;
  storage?: {
    estimate?: () => Promise<{ quota?: number; usage?: number }>;
  };
  gpu?: {
    requestAdapter?: () => Promise<GPUAdapterLike | null>;
  };
}

function cleanGpuString(raw: string): string {
  let s = raw.trim();
  if (!s) return '';

  const angleMatch = s.match(
    /^ANGLE\s*\(([^,]+),\s*(.+?)(?:,\s*(?:OpenGL|Direct3D|Vulkan|Metal|Unspecified|SwiftShader).*)?\)$/i
  );
  if (angleMatch) {
    s = angleMatch[2].trim();
  }

  s = s.replace(/^ANGLE Metal Renderer:\s*/i, '');
  s = s.replace(/\s*\(0x[0-9a-fA-F]+\)/g, '');
  s = s.replace(/\s+Direct3D\d*\s+vs_\d+_\d+\s+ps_\d+_\d+.*$/i, '');
  s = s.replace(/\s+vs_\d+_\d+\s+ps_\d+_\d+.*$/i, '');
  s = s.replace(/\s*\(TM\)/gi, '');
  s = s.replace(/\s*\(R\)/gi, '');
  s = s.replace(/^Mesa\s+/i, '');
  s = s.replace(/\s{2,}/g, ' ').trim();

  return s;
}

export function detectWebGLGpuSync(): { gpuName: string; vendor: string } {
  if (typeof document === 'undefined') {
    return { gpuName: 'Integrated Graphics', vendor: '' };
  }

  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

    if (!gl) {
      return { gpuName: 'Software Graphics Renderer', vendor: '' };
    }

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rawRenderer = debugInfo
      ? (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string | null)
      : (gl.getParameter(gl.RENDERER) as string | null);
    const rawVendor = debugInfo
      ? (gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string | null)
      : (gl.getParameter(gl.VENDOR) as string | null);

    const cleanedRenderer = cleanGpuString(rawRenderer || '');
    const cleanedVendor = cleanGpuString(rawVendor || '');

    if (
      !cleanedRenderer ||
      /^WebKit WebGL$/i.test(cleanedRenderer) ||
      /^Mozilla$/i.test(cleanedRenderer)
    ) {
      return {
        gpuName: cleanedVendor ? `${cleanedVendor} GPU` : 'Hardware GPU (Masked)',
        vendor: cleanedVendor,
      };
    }

    return {
      gpuName: cleanedRenderer,
      vendor: cleanedVendor,
    };
  } catch {
    return { gpuName: 'Hardware GPU', vendor: '' };
  }
}

async function detectWebGPUGpuAsync(): Promise<string | null> {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as unknown as NavigatorWithExtras;
  if (!nav.gpu?.requestAdapter) return null;

  try {
    const adapter = await nav.gpu.requestAdapter();
    if (!adapter) return null;

    const info =
      adapter.info ||
      (adapter.requestAdapterInfo ? await adapter.requestAdapterInfo() : undefined);
    if (!info) return null;

    if (info.description && info.description.trim()) {
      return cleanGpuString(info.description);
    }
    if (info.device && info.vendor) {
      return cleanGpuString(`${info.vendor} ${info.device}`);
    }
    if (info.architecture && info.vendor) {
      return cleanGpuString(`${info.vendor} ${info.architecture}`);
    }
    return null;
  } catch {
    return null;
  }
}

function parseFallbackOsAndArch(): { osName: string; architecture: string; kernel: string } {
  if (typeof navigator === 'undefined') {
    return { osName: 'Unknown OS', architecture: 'x86_64', kernel: 'generic' };
  }

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';

  let osName = platform || 'Unknown OS';
  let kernel = 'generic';

  if (/Windows NT 10\.0/i.test(ua)) {
    osName = 'Windows 10 / 11';
    kernel = 'NT 10.0';
  } else if (/Windows/i.test(ua)) {
    osName = 'Windows';
    kernel = 'NT';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    const iosMatch = ua.match(/OS (\d+[_\d]*)/);
    const ver = iosMatch ? iosMatch[1].replace(/_/g, '.') : '';
    osName = ver ? `iOS ${ver}` : 'iOS';
    kernel = 'Darwin';
  } else if (/Mac OS X|Macintosh/i.test(ua)) {
    const macMatch = ua.match(/Mac OS X (\d+[._\d]*)/);
    const ver = macMatch ? macMatch[1].replace(/_/g, '.') : '';
    osName = ver ? `macOS ${ver}` : 'macOS';
    kernel = 'Darwin';
  } else if (/Android/i.test(ua)) {
    const andMatch = ua.match(/Android (\d+(?:\.\d+)?)/);
    osName = andMatch ? `Android ${andMatch[1]}` : 'Android';
    kernel = 'Linux (Android)';
  } else if (/CrOS/i.test(ua)) {
    osName = 'ChromeOS';
    kernel = 'Linux (CrOS)';
  } else if (/Linux/i.test(ua) || /Linux/i.test(platform)) {
    osName = 'Linux';
    kernel = 'Linux';
  }

  let architecture = 'x86_64';
  if (/arm64|aarch64|Apple/i.test(ua) || /arm/i.test(platform)) {
    architecture = 'arm64';
  } else if (/iPhone|iPad|iPod|Android/i.test(ua)) {
    architecture = 'arm64';
  } else if (/Win64|x64|x86_64|amd64|WOW64/i.test(ua) || /x86_64|amd64/i.test(platform)) {
    architecture = 'x86_64';
  }

  return { osName, architecture, kernel };
}

function deriveCpuModel(
  gpuModel: string,
  architecture: string,
  osName: string,
  logicalCores: number
): string {
  const appleM = gpuModel.match(/Apple\s+M\d+(?:\s+(?:Pro|Max|Ultra))?/i);
  if (appleM) {
    return `${appleM[0]} (${logicalCores}-Core CPU)`;
  }

  if (/Apple\s*GPU/i.test(gpuModel) || (/macOS|iOS/i.test(osName) && architecture === 'arm64')) {
    return `Apple Silicon (${logicalCores}-Core CPU)`;
  }

  if (/Adreno/i.test(gpuModel)) {
    return `Qualcomm Snapdragon (${logicalCores}-Core ${architecture})`;
  }

  if (/Mali|Immortalis|PowerVR/i.test(gpuModel)) {
    return `ARM64 SoC (${logicalCores}-Core)`;
  }

  return `${architecture} Processor (${logicalCores} Logical Cores)`;
}

function deriveMemoryInfo(
  gpuModel: string,
  osName: string,
  architecture: string
): { memoryModel: string; memoryTotalGb: number; memoryBrowserCapped: boolean } {
  const nav = (typeof navigator !== 'undefined' ? navigator : {}) as unknown as NavigatorWithExtras;
  const reportedGb = typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 ? nav.deviceMemory : null;
  const isBrowserCapped = reportedGb === 8;

  const isAppleSilicon =
    /Apple\s+M\d+|Apple\s*GPU/i.test(gpuModel) ||
    (/macOS|iOS/i.test(osName) && architecture === 'arm64');

  const isMobile = /Android|iOS/i.test(osName);

  let baseType = 'System DDR Memory';
  if (isAppleSilicon) {
    if (/Apple\s+M[234]/i.test(gpuModel)) {
      baseType = 'Apple Unified LPDDR5';
    } else if (/Apple\s+M1/i.test(gpuModel)) {
      baseType = 'Apple Unified LPDDR4X';
    } else {
      baseType = 'Apple Unified Memory';
    }
  } else if (isMobile) {
    baseType = 'LPDDR Mobile RAM';
  } else if (/macOS/i.test(osName)) {
    baseType = 'macOS System Memory';
  } else if (/Windows/i.test(osName)) {
    baseType = 'Windows System RAM';
  } else if (/ChromeOS/i.test(osName)) {
    baseType = 'ChromeOS System RAM';
  } else if (/Linux/i.test(osName)) {
    baseType = 'Linux System RAM';
  }

  if (reportedGb !== null) {
    const capLabel = isBrowserCapped ? `≥${reportedGb} GB` : `${reportedGb} GB`;
    return {
      memoryModel: `${capLabel} ${baseType}`,
      memoryTotalGb: reportedGb,
      memoryBrowserCapped: isBrowserCapped,
    };
  }

  const fallbackGb = isMobile ? 8 : 16;
  return {
    memoryModel: baseType,
    memoryTotalGb: fallbackGb,
    memoryBrowserCapped: false,
  };
}

function deriveStorageBase(
  osName: string,
  gpuModel: string,
  architecture: string
): {
  storageDriveName: string;
  storageInterface: string;
  storageMountPoint: string;
  storageIoLabel: string;
  storageMaxSpeedMbps: number;
  defaultTotalGb: number;
} {
  const appleM = gpuModel.match(/Apple\s+M\d+(?:\s+(?:Pro|Max|Ultra))?/i);
  const isAppleSilicon =
    Boolean(appleM) ||
    /Apple\s*GPU/i.test(gpuModel) ||
    (/macOS|iOS/i.test(osName) && architecture === 'arm64');

  if (/iOS/i.test(osName)) {
    return {
      storageDriveName: 'Apple NVMe Flash SSD',
      storageInterface: 'Apple NVMe · APFS',
      storageMountPoint: '/var/mobile',
      storageIoLabel: 'SSD I/O',
      storageMaxSpeedMbps: 3200,
      defaultTotalGb: 256,
    };
  }
  if (/macOS/i.test(osName)) {
    return {
      storageDriveName: appleM
        ? `${appleM[0]} Internal NVMe SSD`
        : isAppleSilicon
          ? 'Apple Fabric NVMe SSD'
          : 'Apple PCIe NVMe SSD',
      storageInterface: isAppleSilicon
        ? 'Apple Fabric PCIe · APFS'
        : 'PCIe NVMe · APFS',
      storageMountPoint: '/System/Volumes/Data',
      storageIoLabel: 'SSD I/O',
      storageMaxSpeedMbps: isAppleSilicon ? 6500 : 3500,
      defaultTotalGb: 512,
    };
  }
  if (/Windows/i.test(osName)) {
    return {
      storageDriveName: 'Windows System NVMe SSD',
      storageInterface: 'PCIe NVMe · NTFS',
      storageMountPoint: 'C:\\',
      storageIoLabel: 'SSD I/O',
      storageMaxSpeedMbps: 5000,
      defaultTotalGb: 512,
    };
  }
  if (/Android/i.test(osName)) {
    return {
      storageDriveName: 'Android UFS Flash Storage',
      storageInterface: 'UFS Flash · f2fs',
      storageMountPoint: '/data',
      storageIoLabel: 'Flash I/O',
      storageMaxSpeedMbps: 3600,
      defaultTotalGb: 256,
    };
  }
  if (/ChromeOS/i.test(osName)) {
    return {
      storageDriveName: 'ChromeOS Internal SSD',
      storageInterface: 'NVMe / eMMC · ext4',
      storageMountPoint: '/mnt/stateful_partition',
      storageIoLabel: 'SSD I/O',
      storageMaxSpeedMbps: 3200,
      defaultTotalGb: 256,
    };
  }
  return {
    storageDriveName: 'Linux System NVMe SSD',
    storageInterface: 'PCIe NVMe · ext4',
    storageMountPoint: '/',
    storageIoLabel: 'SSD I/O',
    storageMaxSpeedMbps: 5500,
    defaultTotalGb: 512,
  };
}

function snapCapacityFromQuotaGb(quotaGb: number): number | null {
  if (!Number.isFinite(quotaGb) || quotaGb < 20) {
    return null;
  }
  const estimatedRawGb = quotaGb / 0.65;
  const standardTiers = [64, 128, 256, 512, 1024, 2048, 4096];
  for (const tier of standardTiers) {
    if (estimatedRawGb <= tier * 1.15) {
      return tier;
    }
  }
  return 4096;
}

export function getInitialDeviceInfoSync(): DetectedDeviceInfo {
  const logicalCores =
    typeof navigator !== 'undefined' && navigator.hardwareConcurrency
      ? navigator.hardwareConcurrency
      : 8;

  const { gpuName } = detectWebGLGpuSync();
  const { osName, architecture, kernel } = parseFallbackOsAndArch();

  const finalArch = /Apple\s+M\d+|Apple\s*GPU/i.test(gpuName) ? 'arm64' : architecture;
  const cpuModel = deriveCpuModel(gpuName, finalArch, osName, logicalCores);
  const memInfo = deriveMemoryInfo(gpuName, osName, finalArch);
  const storageBase = deriveStorageBase(osName, gpuName, finalArch);

  return {
    cpuModel,
    gpuModel: gpuName,
    osName,
    architecture: finalArch,
    kernel,
    hostname: 'local-device',
    logicalCores,
    memoryModel: memInfo.memoryModel,
    memoryTotalGb: memInfo.memoryTotalGb,
    memoryBrowserCapped: memInfo.memoryBrowserCapped,
    storageDriveName: storageBase.storageDriveName,
    storageInterface: storageBase.storageInterface,
    storageMountPoint: storageBase.storageMountPoint,
    storageIoLabel: storageBase.storageIoLabel,
    storageTotalGb: storageBase.defaultTotalGb,
    storageMaxSpeedMbps: storageBase.storageMaxSpeedMbps,
    browserQuotaGb: null,
    browserUsedMb: null,
  };
}

export async function detectDeviceInfoAsync(): Promise<DetectedDeviceInfo> {
  const syncInfo = getInitialDeviceInfoSync();
  const nav = (typeof navigator !== 'undefined' ? navigator : {}) as unknown as NavigatorWithExtras;

  let osName = syncInfo.osName;
  let architecture = syncInfo.architecture;
  let kernel = syncInfo.kernel;
  let gpuModel = syncInfo.gpuModel;

  if (nav.userAgentData?.getHighEntropyValues) {
    try {
      const hints = await nav.userAgentData.getHighEntropyValues([
        'architecture',
        'bitness',
        'platform',
        'platformVersion',
      ]);

      if (hints.architecture) {
        if (hints.architecture === 'arm') {
          architecture = hints.bitness === '64' ? 'arm64' : 'arm';
        } else if (hints.architecture === 'x86') {
          architecture = hints.bitness === '64' ? 'x86_64' : 'x86';
        } else {
          architecture = hints.architecture;
        }
      }

      if (hints.platform) {
        if (hints.platform === 'Windows') {
          const major = parseInt((hints.platformVersion || '0').split('.')[0], 10);
          osName = major >= 13 ? 'Windows 11' : major >= 1 ? 'Windows 10' : 'Windows';
          kernel = 'NT 10.0';
        } else if (hints.platform === 'macOS') {
          osName = hints.platformVersion ? `macOS ${hints.platformVersion}` : 'macOS';
          kernel = 'Darwin';
        } else if (hints.platform === 'Android') {
          osName = hints.platformVersion ? `Android ${hints.platformVersion}` : 'Android';
          kernel = 'Linux (Android)';
        } else {
          osName = hints.platform;
        }
      }
    } catch {
      // Fallback to UA values
    }
  }

  const webGpuName = await detectWebGPUGpuAsync();
  if (
    webGpuName &&
    (/Hardware GPU|Masked|Apple GPU|Software/i.test(gpuModel) ||
      webGpuName.length > gpuModel.length)
  ) {
    gpuModel = webGpuName;
  }

  if (/Apple\s+M\d+|Apple\s*GPU/i.test(gpuModel)) {
    architecture = 'arm64';
  }

  const cpuModel = deriveCpuModel(gpuModel, architecture, osName, syncInfo.logicalCores);
  const memInfo = deriveMemoryInfo(gpuModel, osName, architecture);
  const storageBase = deriveStorageBase(osName, gpuModel, architecture);

  let storageTotalGb = storageBase.defaultTotalGb;
  let browserQuotaGb: number | null = null;
  let browserUsedMb: number | null = null;

  if (nav.storage?.estimate) {
    try {
      const est = await nav.storage.estimate();
      if (typeof est.quota === 'number' && est.quota > 0) {
        const quotaGb = est.quota / (1024 * 1024 * 1024);
        browserQuotaGb = Number(quotaGb.toFixed(1));
        const snapped = snapCapacityFromQuotaGb(quotaGb);
        if (snapped !== null) {
          storageTotalGb = snapped;
        }
      }
      if (typeof est.usage === 'number') {
        browserUsedMb = Number((est.usage / (1024 * 1024)).toFixed(2));
      }
    } catch {
      // Keep platform default
    }
  }

  return {
    cpuModel,
    gpuModel,
    osName,
    architecture,
    kernel,
    hostname: 'local-device',
    logicalCores: syncInfo.logicalCores,
    memoryModel: memInfo.memoryModel,
    memoryTotalGb: memInfo.memoryTotalGb,
    memoryBrowserCapped: memInfo.memoryBrowserCapped,
    storageDriveName: storageBase.storageDriveName,
    storageInterface: storageBase.storageInterface,
    storageMountPoint: storageBase.storageMountPoint,
    storageIoLabel: storageBase.storageIoLabel,
    storageTotalGb,
    storageMaxSpeedMbps: storageBase.storageMaxSpeedMbps,
    browserQuotaGb,
    browserUsedMb,
  };
}
