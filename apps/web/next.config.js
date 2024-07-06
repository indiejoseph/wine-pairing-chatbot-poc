/** @type {import('next').NextConfig} */

const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  output: 'standalone',
  webpack: config => {
    config.optimization.splitChunks = false;

    return config;
  },
  typescript: {
    tsconfigPath: 'tsconfig.build.json',
    ignoreBuildErrors: true
  },
};

module.exports = nextConfig;
