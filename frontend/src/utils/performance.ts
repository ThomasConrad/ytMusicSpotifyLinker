// Performance monitoring utilities for Core Web Vitals tracking

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface PerformanceEntry {
  // Core Web Vitals
  LCP?: PerformanceMetric; // Largest Contentful Paint
  FID?: PerformanceMetric; // First Input Delay
  CLS?: PerformanceMetric; // Cumulative Layout Shift
  
  // Other Web Vitals
  FCP?: PerformanceMetric; // First Contentful Paint
  TTFB?: PerformanceMetric; // Time to First Byte
}

// Rating thresholds for Core Web Vitals
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 }
} as const;

/**
 * Rate a metric value based on Core Web Vitals thresholds
 */
function rateMetric(name: keyof typeof THRESHOLDS, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Create a performance metric object
 */
function createMetric(name: keyof typeof THRESHOLDS, value: number): PerformanceMetric {
  return {
    name,
    value,
    rating: rateMetric(name, value),
    timestamp: Date.now()
  };
}

/**
 * Get Largest Contentful Paint (LCP)
 */
function getLCP(): Promise<PerformanceMetric | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      resolve(null);
      return;
    }

    let lcp: PerformanceMetric | null = null;

    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      
      if (lastEntry) {
        lcp = createMetric('LCP', lastEntry.startTime);
      }
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });

    // Resolve after a short delay to catch the LCP value
    setTimeout(() => {
      observer.disconnect();
      resolve(lcp);
    }, 2500);
  });
}

/**
 * Get First Input Delay (FID)
 */
function getFID(): Promise<PerformanceMetric | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      resolve(null);
      return;
    }

    let fid: PerformanceMetric | null = null;

    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const firstEntry = entries[0] as PerformanceEventTiming;
      
      if (firstEntry) {
        const delay = firstEntry.processingStart - firstEntry.startTime;
        fid = createMetric('FID', delay);
        observer.disconnect();
        resolve(fid);
      }
    });

    observer.observe({ type: 'first-input', buffered: true });

    // If no input occurs within 10 seconds, resolve with null
    setTimeout(() => {
      if (!fid) {
        observer.disconnect();
        resolve(null);
      }
    }, 10000);
  });
}

/**
 * Get Cumulative Layout Shift (CLS)
 */
function getCLS(): Promise<PerformanceMetric | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      resolve(null);
      return;
    }

    let clsValue = 0;
    let sessionValue = 0;
    let sessionEntries: any[] = [];
    let cls: PerformanceMetric | null = null;

    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        // Only count layout shifts without recent user input
        if (!(entry as any).hadRecentInput) {
          const firstSessionEntry = sessionEntries[0];
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

          // If the entry occurred less than 1 second after the previous entry and
          // less than 5 seconds after the first entry in the session, include the
          // entry in the current session. Otherwise, start a new session.
          if (sessionValue && 
              entry.startTime - lastSessionEntry.startTime < 1000 &&
              entry.startTime - firstSessionEntry.startTime < 5000) {
            sessionValue += (entry as any).value;
            sessionEntries.push(entry);
          } else {
            sessionValue = (entry as any).value;
            sessionEntries = [entry];
          }

          // If the current session value is larger than the current CLS value,
          // update CLS and the entries contributing to it.
          if (sessionValue > clsValue) {
            clsValue = sessionValue;
            cls = createMetric('CLS', clsValue);
          }
        }
      }
    });

    observer.observe({ type: 'layout-shift', buffered: true });

    // Resolve after page load is complete
    setTimeout(() => {
      observer.disconnect();
      resolve(cls || createMetric('CLS', 0));
    }, 5000);
  });
}

/**
 * Get First Contentful Paint (FCP)
 */
function getFCP(): Promise<PerformanceMetric | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      resolve(null);
      return;
    }

    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      
      if (fcpEntry) {
        const fcp = createMetric('FCP', fcpEntry.startTime);
        observer.disconnect();
        resolve(fcp);
      }
    });

    observer.observe({ type: 'paint', buffered: true });

    // Timeout after 3 seconds
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, 3000);
  });
}

/**
 * Get Time to First Byte (TTFB)
 */
function getTTFB(): PerformanceMetric | null {
  if (typeof window === 'undefined' || !('performance' in window)) {
    return null;
  }

  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  
  if (navEntry) {
    const ttfb = navEntry.responseStart - navEntry.requestStart;
    return createMetric('TTFB', ttfb);
  }

  return null;
}

/**
 * Collect all performance metrics
 */
export async function collectPerformanceMetrics(): Promise<PerformanceEntry> {
  const metrics: PerformanceEntry = {};

  // Collect synchronous metrics
  const ttfb = getTTFB();
  if (ttfb) metrics.TTFB = ttfb;

  // Collect asynchronous metrics
  const [lcp, fid, cls, fcp] = await Promise.all([
    getLCP(),
    getFID(),
    getCLS(),
    getFCP()
  ]);

  if (lcp) metrics.LCP = lcp;
  if (fid) metrics.FID = fid;
  if (cls) metrics.CLS = cls;
  if (fcp) metrics.FCP = fcp;

  return metrics;
}

/**
 * Report performance metrics (console in dev, analytics in prod)
 */
export function reportPerformanceMetrics(metrics: PerformanceEntry): void {
  const isDev = import.meta.env?.DEV || false;

  if (isDev) {
    console.group('📊 Performance Metrics');
    Object.entries(metrics).forEach(([name, metric]) => {
      if (metric) {
        const icon = metric.rating === 'good' ? '✅' : 
                    metric.rating === 'needs-improvement' ? '⚠️' : '❌';
        console.log(`${icon} ${name}: ${metric.value.toFixed(2)}ms (${metric.rating})`);
      }
    });
    console.groupEnd();
  } else {
    // In production, send to analytics service
    // This would integrate with services like Google Analytics, DataDog, etc.
    sendToAnalytics('performance', metrics);
  }
}

/**
 * Send metrics to analytics service
 */
function sendToAnalytics(event: string, data: any): void {
  // Example implementation for Google Analytics 4
  if (typeof gtag !== 'undefined') {
    gtag('event', event, {
      custom_parameters: data
    });
  }

  // Example implementation for custom analytics
  if (typeof fetch !== 'undefined') {
    fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        data,
        timestamp: Date.now(),
        url: window.location.href
      })
    }).catch(() => {
      // Silently fail analytics calls
    });
  }
}

/**
 * Monitor performance and report automatically
 */
export function startPerformanceMonitoring(): void {
  if (typeof window === 'undefined') return;

  // Wait for page load to complete
  if (document.readyState === 'complete') {
    collectAndReport();
  } else {
    window.addEventListener('load', collectAndReport, { once: true });
  }
}

async function collectAndReport(): Promise<void> {
  // Wait a bit for all metrics to be available
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    const metrics = await collectPerformanceMetrics();
    reportPerformanceMetrics(metrics);
  } catch (error) {
    console.warn('Failed to collect performance metrics:', error);
  }
}

/**
 * Measure custom performance timing
 */
export function measureTiming<T>(name: string, fn: () => T): T;
export function measureTiming<T>(name: string, fn: () => Promise<T>): Promise<T>;
export function measureTiming<T>(name: string, fn: () => T | Promise<T>): T | Promise<T> {
  const startTime = performance.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = performance.now() - startTime;
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    });
  } else {
    const duration = performance.now() - startTime;
    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    return result;
  }
}

/**
 * Create a performance mark
 */
export function mark(name: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure between two marks
 */
export function measure(name: string, startMark: string, endMark?: string): number | null {
  if (typeof performance === 'undefined' || !performance.measure) {
    return null;
  }

  try {
    performance.measure(name, startMark, endMark);
    const entry = performance.getEntriesByName(name, 'measure')[0];
    return entry ? entry.duration : null;
  } catch {
    return null;
  }
}

/**
 * Clear performance marks and measures
 */
export function clearPerformanceMarks(): void {
  if (typeof performance !== 'undefined') {
    if (performance.clearMarks) performance.clearMarks();
    if (performance.clearMeasures) performance.clearMeasures();
  }
}

// Auto-start performance monitoring in production
if (!import.meta.env?.DEV && typeof window !== 'undefined') {
  startPerformanceMonitoring();
}

declare global {
  function gtag(...args: any[]): void;
}