// src/lib/performance.ts
// Performance monitoring และ metrics collection

// --- Add gtag type declaration to the window interface ---
declare global {
  interface Window {
    gtag?: (
      command: 'event',
      action: string,
      params?: { [key: string]: any }
    ) => void;
  }
}

export interface PerformanceMetrics {
  loadTime: number;
  ttfb: number; // Time to First Byte
  fcp: number;  // First Contentful Paint
  lcp: number;  // Largest Contentful Paint
  cls: number;  // Cumulative Layout Shift
  fid: number;  // First Input Delay
  cacheHitRate: number;
  apiResponseTime: number;
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private isClient = typeof window !== 'undefined';

  constructor() {
    if (this.isClient) {
      this.initializeWebVitals();
    }
  }

  private initializeWebVitals() {
    // Initialize Web Vitals monitoring
    if ('performance' in window) {
      // Measure page load time
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        this.metrics.loadTime = navigation.loadEventEnd - navigation.fetchStart;
        this.metrics.ttfb = navigation.responseStart - navigation.fetchStart;
      });

      // Observe Core Web Vitals
      this.observeWebVitals();
    }
  }

  private observeWebVitals() {
    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcp = entries[entries.length - 1];
      this.metrics.fcp = fcp.startTime;
    });
    
    try {
      fcpObserver.observe({ type: 'paint', buffered: true });
    } catch (e) {
      // Fallback for browsers that don't support paint timing
    }

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lcp = entries[entries.length - 1];
      this.metrics.lcp = lcp.startTime;
    });
    
    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // Fallback for browsers that don't support LCP
    }

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      this.metrics.cls = clsValue;
    });
    
    try {
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // Fallback for browsers that don't support layout shift
    }

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fid = entries[0];
      this.metrics.fid = (fid as any).processingStart - fid.startTime;
    });
    
    try {
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      // Fallback for browsers that don't support FID
    }
  }

  // Measure API response time
  public measureApiCall = async <T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ): Promise<{ data: T; responseTime: number }> => {
    const startTime = performance.now();
    
    try {
      const data = await apiCall();
      const responseTime = performance.now() - startTime;
      
      this.metrics.apiResponseTime = responseTime;
      
      // Log slow API calls
      if (responseTime > 1000) {
        console.warn(`🐌 Slow API call detected: ${endpoint} took ${responseTime.toFixed(2)}ms`);
      }
      
      return { data, responseTime };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      console.error(`❌ API call failed: ${endpoint} after ${responseTime.toFixed(2)}ms`, error);
      throw error;
    }
  };

  // Calculate cache hit rate
  public calculateCacheHitRate(hits: number, total: number): number {
    const hitRate = total > 0 ? (hits / total) * 100 : 0;
    this.metrics.cacheHitRate = hitRate;
    return hitRate;
  }

  // Get current metrics
  public getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  // Send metrics to analytics (optional)
  public sendMetrics(customData?: any): void {
    if (!this.isClient) return;

    const metricsData = {
      ...this.metrics,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...customData,
    };

    // Send to analytics service (implement based on your analytics provider)
    console.log('📊 Performance Metrics:', metricsData);
    
    // Example: Send to Google Analytics 4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'web_vitals', {
        lcp: metricsData.lcp,
        fid: metricsData.fid,
        cls: metricsData.cls,
        ttfb: metricsData.ttfb,
        loadTime: metricsData.loadTime,
        // Send other metrics as needed
      });
    }
  }

  // Performance recommendations based on metrics
  public getRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.metrics;

    if (metrics.lcp && metrics.lcp > 2500) {
      recommendations.push('Consider optimizing images and reducing server response time for better LCP');
    }

    if (metrics.fid && metrics.fid > 100) {
      recommendations.push('Reduce JavaScript execution time to improve First Input Delay');
    }

    if (metrics.cls && metrics.cls > 0.1) {
      recommendations.push('Add size attributes to images and reserve space for dynamic content to reduce CLS');
    }

    if (metrics.cacheHitRate && metrics.cacheHitRate < 80) {
      recommendations.push('Improve cache strategy to increase cache hit rate');
    }

    if (metrics.apiResponseTime && metrics.apiResponseTime > 500) {
      recommendations.push('Optimize API responses and consider implementing better caching');
    }

    return recommendations;
  }

  // Check if performance is good based on Core Web Vitals thresholds
  public isPerformanceGood(): boolean {
    const { lcp, fid, cls } = this.metrics;
    
    return (
      (!lcp || lcp <= 2500) &&
      (!fid || fid <= 100) &&
      (!cls || cls <= 0.1)
    );
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

// Utility functions for performance monitoring
export const measurePageLoad = () => {
  if (typeof window === 'undefined') return;
  
  const sendMetrics = () => {
    setTimeout(() => {
      performanceMonitor.sendMetrics({
        page: window.location.pathname,
      });
    }, 1000); // Wait for metrics to be collected
  };

  if (document.readyState === 'complete') {
    sendMetrics();
  } else {
    window.addEventListener('load', sendMetrics);
  }
};

export const measureApiPerformance = performanceMonitor.measureApiCall;
export const getCacheHitRate = performanceMonitor.calculateCacheHitRate;
export const getPerformanceMetrics = () => performanceMonitor.getMetrics();
export const getPerformanceRecommendations = () => performanceMonitor.getRecommendations();
export const isPerformanceGood = () => performanceMonitor.isPerformanceGood();

export default performanceMonitor; 