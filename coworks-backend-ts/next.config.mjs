/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sequelize', 'pg', 'pg-hstore'],
  },
  webpack: (config) => {
    // This makes Webpack treat pg-native as an external dependency
    config.externals.push('pg-native');
    
    // Add path alias resolver for Webpack
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src')
    };
    
    return config;
  },
};

export default nextConfig;