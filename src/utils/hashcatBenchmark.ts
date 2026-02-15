import config from '@/config';

export interface BenchmarkResult {
  hashType: number;
  hashName: string;
  speed: string;
  speedPerHash: number;
  unit: string;
}

export function parseHashcatMachineReadableBenchmark(stdout: string): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];

  const lines = stdout.split('\n').filter(line => line.trim() !== '');

  for (const line of lines) {
    if (
      line.startsWith('#') ||
      line.startsWith('*') ||
      line.startsWith('Started:') ||
      line.startsWith('Stopped:')
    ) {
      continue;
    }

    // Machine-readable benchmark output format:
    // device-id:hash-mode:?:?:?:hashes-per-second
    // Example: 1:0:1683:4513:55.02:10240000000
    const parts = line.split(':');

    if (parts.length >= 6) {
      // Note: the first field is the device-id, not the hash type.
      const hashTypeId = parseInt(parts[1], 10);
      const rawSpeed = parseFloat(parts[5]);

      const hashTypeName = config.hashcat.hashTypes[hashTypeId]?.name || `Hash type ${hashTypeId}`;

      let formattedSpeed: string;
      let unit: string;

      if (rawSpeed >= 1_000_000_000) {
        formattedSpeed = `${(rawSpeed / 1_000_000_000).toFixed(2)} GH/s`;
        unit = 'GH/s';
      } else if (rawSpeed >= 1_000_000) {
        formattedSpeed = `${(rawSpeed / 1_000_000).toFixed(2)} MH/s`;
        unit = 'MH/s';
      } else if (rawSpeed >= 1_000) {
        formattedSpeed = `${(rawSpeed / 1_000).toFixed(2)} kH/s`;
        unit = 'kH/s';
      } else {
        formattedSpeed = `${rawSpeed.toFixed(2)} H/s`;
        unit = 'H/s';
      }

      results.push({
        hashType: hashTypeId,
        hashName: hashTypeName,
        speed: formattedSpeed,
        speedPerHash: rawSpeed,
        unit,
      });
    }
  }

  return results;
}
