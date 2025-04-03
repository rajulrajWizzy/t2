// Import JWT webpack fix helper
const jwtFix = require('./webpack-jwt-fix');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable type checking on build to speed up the process
  // Type checking is handled by the IDE and CI
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint checking on build to speed up the process
  // ESLint checking is handled by the IDE and CI
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Use standalone output for better Vercel compatibility
  output: 'standalone',
  
  // Remove serverActions option since it's available by default in Next.js 14+
  // serverActions: true,
  
  // Configure experimental options properly
  experimental: {
    serverComponentsExternalPackages: ["sequelize", "pg", "pg-hstore"],
    // Keep other experimental options
    esmExternals: true,
    },

  // Fix Google Fonts loading - ensure fonts can be downloaded
  assetPrefix: process.env.NEXT_PUBLIC_BASE_URL || '',
  images: {
    domains: ['res.cloudinary.com', 'localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fonts.googleapis.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'fonts.gstatic.com',
        pathname: '**',
      }
    ],
  },

  // Add headers for CORS
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
      // Add headers for font downloads
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' }
        ],
      },
    ];
  },
  
  // Explicitly set the runtime for each route
  // This ensures Sequelize and other Node.js modules work properly
  serverRuntimeConfig: {
    PROJECT_ROOT: __dirname,
    runtime: "nodejs"},
  
  // Disable static generation for API routes
  staticPageGenerationTimeout: 1000,
  
  // Custom webpack config for Node.js modules
  webpack: (config, { isServer }) => {
    // Apply JWT Edge Runtime fixes
    config = jwtFix.applyJwtFixes(config);

    if (isServer) {
      config.externals = [...config.externals, 'bcryptjs', '@mapbox/node-pre-gyp'];
    }
    
    // Fix for JWT modules in Edge Runtime
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
      };
    }
    
    return config;
  }
};

module.exports = nextConfig; 