/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      serverComponentsExternalPackages: ['sequelize', 'pg', 'pg-hstore'],
    },
    webpack: (config) => {
      // This makes Webpack treat pg-native as an external dependency
      config.externals.push('pg-native');
      return config;
    },
  };
  
  export default nextConfig;