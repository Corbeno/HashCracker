import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
    resolveAlias: {
      'osx-temperature-sensor': './src/shims/osx-temperature-sensor.ts',
    },
  },
  webpack: config => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'osx-temperature-sensor': path.resolve(process.cwd(), 'src/shims/osx-temperature-sensor.ts'),
    };
    return config;
  },
};

export default nextConfig;
