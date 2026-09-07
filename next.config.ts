import path from 'path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    resolveAlias: {
      'osx-temperature-sensor': './src/shims/osx-temperature-sensor.ts',
    },
  },
  webpack(config) {
    config.resolve.alias['osx-temperature-sensor'] = path.resolve(
      process.cwd(),
      'src/shims/osx-temperature-sensor.ts'
    );
    return config;
  },
};

export default nextConfig;
