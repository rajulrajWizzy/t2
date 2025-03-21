/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  poweredByHeader: false,
  
  // Set api routes as dynamically rendered to avoid static generation errors
  experimental: {
    serverComponentsExternalPackages: ['sequelize', 'pg', 'pg-hstore'],
  },
  
  // Explicitly configure which routes are dynamic
  // This is required for routes that use request.headers or request.url
  serverRuntimeConfig: {
    dynamicRoutes: true,
  },
  
  // Define dynamic routes that should be server rendered
  // These routes use request.headers or request.url which can't be statically generated
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'x-nextjs-render',
            value: 'dynamic',
          },
        ],
      },
    ];
  },
  
  // Handle Node.js modules that cause issues in Next.js
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...config.externals, 'bcrypt', '@mapbox/node-pre-gyp'];
    }
    
    // Add fallbacks for node modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'mock-aws-s3': false,
      'aws-sdk': false,
      'nock': false,
    };
    
    return config;
  }
};

export default nextConfig;