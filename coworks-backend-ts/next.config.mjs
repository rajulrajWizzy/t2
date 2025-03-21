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
  // Skip CSS processing with webpack
  webpack: (config) => {
    // Find the CSS rules
    const rules = config.module.rules.find((rule) => typeof rule.oneOf === 'object').oneOf;
    
    // Simplify CSS processing by removing PostCSS
    for (const rule of rules) {
      if (!rule.test || !rule.test.toString().includes('css')) continue;
      
      if (rule.use && Array.isArray(rule.use)) {
        rule.use = rule.use.filter(u => 
          typeof u === 'string' 
            ? !u.includes('postcss-loader') 
            : !u.loader || !u.loader.includes('postcss-loader')
        );
      }
    }
    
    return config;
  }
};

export default nextConfig;