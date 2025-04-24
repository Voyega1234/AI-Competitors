/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APIFY_API_KEY: process.env.NEXT_PUBLIC_APIFY_API_KEY,
  },
  reactStrictMode: true,
  eslint: {
    // Skip ESLint checks during build
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
    
    // Simple configuration to ignore the node-DeepResearch directory
    if (!config.watchOptions) {
      config.watchOptions = {};
    }
    
    config.watchOptions.ignored = config.watchOptions.ignored || [];
    
    if (Array.isArray(config.watchOptions.ignored)) {
      config.watchOptions.ignored.push('**/src/node-DeepResearch/**');
    } else {
      config.watchOptions.ignored = ['**/src/node-DeepResearch/**'];
    }
    
    return config;
  },
  // Skip building directories that have their own package.json
  distDir: '.next'
};

module.exports = nextConfig; 