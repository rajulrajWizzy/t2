/** @type {import('next').NextConfig} */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sequelize', 'pg', 'pg-hstore'],
  },
  webpack: (config) => {
    // Handle path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': resolve(__dirname, 'src'),
    };
    
    // This makes Webpack treat pg-native as an external dependency
    config.externals.push('pg-native');
    return config;
  },
  // Add TypeScript checking
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  // Add ESLint checking
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;