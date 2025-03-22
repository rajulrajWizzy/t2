/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable TypeScript and ESLint checks during build for faster deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Use standalone output for better Vercel compatibility
  output: 'standalone',
  
  // Configure experimental options properly
  experimental: {
    serverComponentsExternalPackages: ['sequelize', 'pg', 'pg-hstore', 'bcryptjs'],
    esmExternals: 'loose'
  },

  // Add headers for CORS
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  
  // Explicitly set the runtime for each route
  // This ensures Sequelize and other Node.js modules work properly
  serverRuntimeConfig: {
    PROJECT_ROOT: __dirname,
  },
  
  // Remove sequelize from transpilePackages since it's in serverComponentsExternalPackages
  // Ensure all middleware and API routes use Node.js runtime, not Edge
  
  // Custom webpack config for Node.js modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...config.externals, 'bcryptjs', '@mapbox/node-pre-gyp'];
    }
    
    return config;
  }
};

module.exports = nextConfig; 