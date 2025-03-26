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
    esmExternals: 'loose',
    missingSuspenseWithCSRBailout: false
  },

  // Add headers for CORS and security
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; img-src 'self' data: https://res.cloudinary.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.cloudinary.com;" },
        ],
      },
    ];
  },
  
  // Explicitly set the runtime for each route
  serverRuntimeConfig: {
    PROJECT_ROOT: __dirname,
  },
  
  // Custom webpack config for Node.js modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...config.externals, 'bcryptjs', '@mapbox/node-pre-gyp'];
    }
    return config;
  },
};

module.exports = nextConfig;