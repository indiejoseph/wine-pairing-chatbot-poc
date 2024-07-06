/** @type {import('next').NextConfig} */

const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  output: 'standalone',
  typescript: {
    tsconfigPath: 'tsconfig.build.json',
    ignoreBuildErrors: true
  },
};

module.exports = nextConfig;
