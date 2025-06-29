import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ==========================================
  // Performance Optimizations
  // ==========================================
  
  experimental: {
    optimizeCss: true, // CSS optimization
    optimizePackageImports: ['lucide-react', 'framer-motion', 'date-fns'], // Tree shake popular packages
    turbo: {
      // Turbopack optimizations
      resolveAlias: {
        underscore: 'lodash',
        mocha: { browser: 'mocha/browser-entry.js' },
      },
    },
  },

  // ==========================================
  // Build Optimizations
  // ==========================================
  
  reactStrictMode: true,
  swcMinify: true, // Use SWC for minification (faster than Terser)
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep error and warn logs in production
    } : false,
  },

  // ==========================================
  // Image Optimizations
  // ==========================================
  
  images: {
    // Allowed domains for images
    domains: [
      "lh3.googleusercontent.com", 
      "example.com", 
      "via.placeholder.com", 
      "picsum.photos", 
      "res.cloudinary.com"
    ],
    
    // Image optimization settings
    formats: ['image/webp', 'image/avif'], // Modern formats first
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // Performance settings
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    
    // Cloudinary optimization
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/dr0ao4k6a/**',
      },
    ],
  },

  // ==========================================
  // Security Headers
  // ==========================================
  
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Security headers
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          
          // Performance headers
          { key: "X-DNS-Prefetch-Control", value: "on" },
          
          // Compression
          { key: "Accept-Encoding", value: "gzip, deflate, br" },
        ],
      },
      
      // Static assets caching
      {
        source: "/images/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable", // 1 year
          },
        ],
      },
      
      // Favicon caching
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400", // 1 day
          },
        ],
      },
      
      // API caching
      {
        source: "/api/novels",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=600, stale-while-revalidate=1200", // 10 min cache, 20 min stale
          },
        ],
      },
    ];
  },

  // ==========================================
  // Bundle Analysis & Optimization
  // ==========================================
  
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Bundle splitting for better caching
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test(module: any) {
              return module.size() > 160000 && /node_modules[/\\]/.test(module.identifier());
            },
            name(module: any) {
              const hash = require('crypto').createHash('sha1');
              hash.update(module.identifier());
              return hash.digest('hex').substring(0, 8);
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
          shared: {
            name: 'shared',
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };
    }

    // Optimize imports
    config.resolve.alias = {
      ...config.resolve.alias,
      // Map lodash to lodash-es for better tree shaking
      'lodash': 'lodash-es',
    };

    return config;
  },

  // ==========================================
  // Output & Compression
  // ==========================================
  
  compress: true, // Enable gzip compression
  
  // ==========================================
  // Redirects & Rewrites
  // ==========================================
  
  async redirects() {
    return [
      // SEO redirects
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // ==========================================
  // Development Optimizations
  // ==========================================
  
  ...(process.env.NODE_ENV === 'development' && {
    // Development-only settings
    devIndicators: {
      buildActivity: true,
      buildActivityPosition: 'bottom-right',
    },
  }),

  // ==========================================
  // Production Optimizations
  // ==========================================
  
  ...(process.env.NODE_ENV === 'production' && {
    // Production-only settings
    poweredByHeader: false, // Remove X-Powered-By header
    generateEtags: true, // Generate ETags for better caching
    
    // Output file tracing for smaller deployments
    output: 'standalone',
  }),
};

export default nextConfig;
