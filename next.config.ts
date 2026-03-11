import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      'osx-temperature-sensor': './src/shims/osx-temperature-sensor.ts',
    },
  },
};

export default nextConfig;
