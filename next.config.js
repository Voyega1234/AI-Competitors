/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APIFY_API_KEY: process.env.NEXT_PUBLIC_APIFY_API_KEY,
  },
  reactStrictMode: true,
  eslint: {
    // Skip ESLint checks for the node-DeepResearch directory during build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip type checking during build
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        child_process: false
      };
    }
    return config;
  },
};

module.exports = nextConfig; 