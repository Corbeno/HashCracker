export interface SystemInfo {
  cpuName: string;
  cpuUsage: number;
  gpuName: string;
  gpuUsage: number;
  ramTotal: number;
  ramUsed: number;
  ramUsage: number;
}

export const EMPTY_SYSTEM_INFO: SystemInfo = {
  cpuName: 'Unknown CPU',
  cpuUsage: 0,
  gpuName: 'Unknown GPU',
  gpuUsage: 0,
  ramTotal: 0,
  ramUsed: 0,
  ramUsage: 0,
};
