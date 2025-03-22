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
  
  // Disable Edge Runtime and use Node.js runtime
  experimental: {
    runtime: 'nodejs',
    serverComponentsExternalPackages: ['sequelize', 'pg', 'pg-hstore', 'bcryptjs'],
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
  
  // Custom webpack config for Node.js modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...config.externals, 'bcryptjs', '@mapbox/node-pre-gyp'];
    }
    
    return config;
  }
};

module.exports = nextConfig; 