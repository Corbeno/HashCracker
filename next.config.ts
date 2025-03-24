// module.exports = {
//   async headers() {
//     return [
//       {
//         source: '/favicon.svg',
//         headers: [
//           {
//             key: 'Content-Type',
//             value: 'image/svg+xml',
//           },
//         ],
//       },
//     ];
//   },
//   // Enable source maps in production for debugging
//   productionBrowserSourceMaps: true,
//   // Enable webpack source maps during development
//   webpack: (config, { dev, isServer }) => {
//     // Enable source maps in development
//     if (dev) {
//       config.devtool = 'eval-source-map';
//     }

//     // Enable source maps for server-side code (where your utility files are used)
//     if (isServer) {
//       config.devtool = 'source-map';
//     }

//     // Fix for the systeminformation module error
//     config.resolve.fallback = {
//       ...config.resolve.fallback,
//       'osx-temperature-sensor': false,
//     };

//     return config;
//   },
// }

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
  },

  // Fix for the systeminformation module error
  webpack: (config, { dev, isServer }) => {
    // Enable source maps in development
    if (dev) {
      config.devtool = 'eval-source-map';
    }

    // Enable source maps for server-side code (where your utility files are used)
    if (isServer) {
      config.devtool = 'source-map';
    }

    // Fix for the systeminformation module error
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'osx-temperature-sensor': false,
    };

    return config;
  },
};

export default nextConfig;
