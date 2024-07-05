/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: false,
    externalDir: true,
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
