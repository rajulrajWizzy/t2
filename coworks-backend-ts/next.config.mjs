/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sequelize', 'pg', 'pg-hstore', 'bcryptjs'],
    esmExternals: true,
    missingSuspenseWithCSRBailout: true,
    runtime: 'nodejs',
    disableEdgeRuntime: true,
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  poweredByHeader: false,
  
<<<<<<< Updated upstream
  // Set api routes as dynamically rendered to avoid static generation errors
  experimental: {
    serverComponentsExternalPackages: ['sequelize', 'pg', 'pg-hstore', 'bcryptjs'],
  },
  
  // Explicitly configure which routes are dynamic
  // This is required for routes that use request.headers or request.url
  serverRuntimeConfig: {
    dynamicRoutes: true,
  },
  
=======
>>>>>>> Stashed changes
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
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  
  // Handle Node.js modules that cause issues in Next.js
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...config.externals, 'bcryptjs', '@mapbox/node-pre-gyp'];
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