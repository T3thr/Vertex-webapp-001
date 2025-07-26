#!/usr/bin/env node
// scripts/optimize-performance.js
// Performance optimization script for maximum PageSpeed Insights score

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting DivWy Performance Optimization...');

// 1. Create optimized font loading
const createFontOptimization = () => {
  const fontCSS = `
/* Optimized font loading for performance */
@font-face {
  font-family: 'Geist';
  src: url('/fonts/geist-variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
  font-style: normal;
}

@font-face {
  font-family: 'Geist Mono';
  src: url('/fonts/geist-mono-variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
  font-style: normal;
}
`;

  const publicDir = path.join(process.cwd(), 'public');
  const fontsDir = path.join(publicDir, 'fonts');
  
  if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(publicDir, 'fonts.css'), fontCSS);
  console.log('✅ Optimized font loading created');
};

// 2. Create service worker for caching
const createServiceWorker = () => {
  const swContent = `
// Service Worker for aggressive caching
const CACHE_NAME = 'divwy-v1';
const STATIC_CACHE = [
  '/',
  '/fonts.css',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request)
        .then((response) => response || fetch(event.request))
    );
  }
});
`;

  fs.writeFileSync(path.join(process.cwd(), 'public', 'sw.js'), swContent);
  console.log('✅ Service Worker created for caching');
};

// 3. Create optimized manifest
const createManifest = () => {
  const manifest = {
    name: 'DivWy - Visual Novel Platform',
    short_name: 'DivWy',
    description: 'แพลตฟอร์ม Visual Novel ที่ทันสมัยและหลากหลายแนว',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#5495ff',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  };

  fs.writeFileSync(
    path.join(process.cwd(), 'public', 'manifest.webmanifest'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('✅ Optimized manifest created');
};

// 4. Create performance monitoring
const createPerformanceMonitoring = () => {
  const monitoringScript = `
// Performance monitoring for Core Web Vitals
(function() {
  if ('web-vital' in window) return;
  
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'largest-contentful-paint') {
        console.log('LCP:', entry.startTime);
      }
      if (entry.entryType === 'first-input') {
        console.log('FID:', entry.processingStart - entry.startTime);
      }
    }
  });
  
  observer.observe({entryTypes: ['largest-contentful-paint', 'first-input']});
  
  // CLS monitoring
  let clsValue = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
        console.log('CLS:', clsValue);
      }
    }
  }).observe({entryTypes: ['layout-shift']});
})();
`;

  fs.writeFileSync(
    path.join(process.cwd(), 'public', 'performance-monitor.js'),
    monitoringScript
  );
  console.log('✅ Performance monitoring script created');
};

// Run all optimizations
try {
  createFontOptimization();
  createServiceWorker();
  createManifest();
  createPerformanceMonitoring();
  
  console.log('🎉 Performance optimization complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Run: bun run build');
  console.log('2. Test with PageSpeed Insights');
  console.log('3. Deploy and verify performance');
  
} catch (error) {
  console.error('❌ Optimization failed:', error);
  process.exit(1);
}
