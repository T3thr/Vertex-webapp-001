import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ==========================================
  // Core Configuration
  // ==========================================
  reactStrictMode: true,

  // ==========================================
  // Performance Optimizations
  // ==========================================
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'framer-motion', 'date-fns'],
  },

  // ==========================================
  // Turbopack Configuration (Stable)
  // ==========================================
  turbopack: {
    resolveAlias: {
      'lodash': 'lodash-es',
    },
  },

  // ==========================================
  // Build Optimizations
  // ==========================================
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // ==========================================
  // Image Optimizations
  // ==========================================
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'example.com',
        pathname: '/**',
      },
    ],
  },

  // ==========================================
  // Security Headers
  // ==========================================
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },

  // ==========================================
  // Bundle Analysis & Optimization (Webpack only)
  // ==========================================
  webpack: (config, { dev, isServer }) => {
    // ✅ ย้าย alias กลับมาไว้ใน webpack config สำหรับ Production build
    config.resolve.alias = {
      ...config.resolve.alias,
      'lodash': 'lodash-es',
    };

    // การตั้งค่านี้จะทำงานเฉพาะตอน 'next build' (production) เท่านั้น
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        cacheGroups: {
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            name: 'framework',
            chunks: 'all',
            priority: 40,
            enforce: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            chunks: 'all',
            priority: 30,
            reuseExistingChunk: true,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
            reuseExistingChunk: true,
          },
        },
      };
    }

    return config;
  },

  // ==========================================
  // Output & Compression
  // ==========================================
  compress: true,

  // ==========================================
  // Redirects & Rewrites
  // ==========================================
  async redirects() {
    return [
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
  devIndicators: {
    position: 'bottom-right',
  },

  // ==========================================
  // Production Optimizations
  // ==========================================
  ...(process.env.NODE_ENV === 'production' && {
    poweredByHeader: false,
    generateEtags: true,
    output: 'standalone',
  }),
};

export default nextConfig;