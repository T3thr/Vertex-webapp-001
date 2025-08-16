// src/lib/performance/IncrementalLoader.ts
// ===================================================================
// Incremental Loading System for Large Story Maps
// Professional-grade data loading optimization
// ===================================================================

import { Node, Edge } from '@xyflow/react';

// ===================================================================
// Incremental Loading Types
// ===================================================================

export interface LoadingConfig {
  chunkSize: number; // Number of items per chunk
  loadRadius: number; // Radius around viewport to load data
  preloadRadius: number; // Radius for preloading data
  maxConcurrentLoads: number; // Maximum concurrent loading operations
  cacheSize: number; // Maximum items in cache
  retryAttempts: number; // Number of retry attempts for failed loads
  retryDelay: number; // Delay between retry attempts (ms)
}

export interface LoadingRegion {
  id: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  priority: number; // Loading priority (lower = higher priority)
  status: 'pending' | 'loading' | 'loaded' | 'error';
  chunkIds: string[];
  lastAccessed: number;
}

export interface DataChunk {
  id: string;
  regionId: string;
  nodes: Node[];
  edges: Edge[];
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  loadedAt: number;
  accessCount: number;
  lastAccessed: number;
  status: 'cached' | 'stale' | 'loading' | 'error';
}

export interface LoadingMetrics {
  totalRegions: number;
  loadedRegions: number;
  cachedChunks: number;
  totalDataLoaded: number; // Total nodes + edges loaded
  averageLoadTime: number;
  cacheHitRatio: number;
  memoryUsage: number; // Estimated memory usage in MB
}

export interface LoadingProgress {
  isLoading: boolean;
  totalChunks: number;
  loadedChunks: number;
  progress: number; // 0-1
  currentOperation: string;
  estimatedTimeRemaining: number; // seconds
}

// ===================================================================
// Data Source Interface
// ===================================================================

export interface DataSource {
  loadRegion(bounds: { x: number; y: number; width: number; height: number }): Promise<{
    nodes: Node[];
    edges: Edge[];
  }>;
  
  searchNodes(query: string, bounds?: { x: number; y: number; width: number; height: number }): Promise<Node[]>;
  
  getMetadata(): Promise<{
    totalNodes: number;
    totalEdges: number;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
}

// ===================================================================
// Incremental Loader Class
// ===================================================================

export class IncrementalLoader {
  private config: LoadingConfig;
  private dataSource: DataSource;
  private regions: Map<string, LoadingRegion> = new Map();
  private chunks: Map<string, DataChunk> = new Map();
  private loadingQueue: LoadingRegion[] = [];
  private currentLoads: Set<string> = new Set();
  private metrics: LoadingMetrics;
  private progress: LoadingProgress;
  private loadingTimes: number[] = [];
  private cacheAccesses = 0;
  private cacheHits = 0;

  constructor(config: Partial<LoadingConfig>, dataSource: DataSource) {
    this.config = {
      chunkSize: 100,
      loadRadius: 1000,
      preloadRadius: 2000,
      maxConcurrentLoads: 3,
      cacheSize: 50,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    this.dataSource = dataSource;
    this.metrics = this.createInitialMetrics();
    this.progress = this.createInitialProgress();
  }

  // ===================================================================
  // Public API
  // ===================================================================

  /**
   * Initialize loading system with viewport
   */
  async initialize(viewport: { x: number; y: number; width: number; height: number; zoom: number }): Promise<void> {
    try {
      // Get metadata to understand data bounds
      const metadata = await this.dataSource.getMetadata();
      
      // Create initial loading regions
      this.createLoadingRegions(metadata.bounds);
      
      // Start loading data for current viewport
      await this.loadForViewport(viewport);
      
      console.log('[IncrementalLoader] Initialized with', this.regions.size, 'regions');
    } catch (error) {
      console.error('[IncrementalLoader] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load data for specific viewport
   */
  async loadForViewport(viewport: { x: number; y: number; width: number; height: number; zoom: number }): Promise<void> {
    const loadBounds = this.calculateLoadBounds(viewport);
    const preloadBounds = this.calculatePreloadBounds(viewport);

    // Find regions to load
    const regionsToLoad = this.findRegionsInBounds(loadBounds);
    const regionsToPreload = this.findRegionsInBounds(preloadBounds);

    // Prioritize regions
    this.prioritizeRegions(regionsToLoad, 1); // High priority
    this.prioritizeRegions(regionsToPreload, 2); // Lower priority

    // Start loading
    await this.processLoadingQueue();
  }

  /**
   * Get currently loaded data for viewport
   */
  getLoadedData(viewport: { x: number; y: number; width: number; height: number; zoom: number }): {
    nodes: Node[];
    edges: Edge[];
  } {
    const loadBounds = this.calculateLoadBounds(viewport);
    const relevantChunks = this.findChunksInBounds(loadBounds);
    
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    for (const chunk of relevantChunks) {
      if (chunk.status === 'cached') {
        nodes.push(...chunk.nodes);
        edges.push(...chunk.edges);
        
        // Update access stats
        chunk.lastAccessed = Date.now();
        chunk.accessCount++;
        
        this.cacheAccesses++;
        this.cacheHits++;
      }
    }

    this.cacheAccesses++;
    this.updateMetrics();

    return { nodes, edges };
  }

  /**
   * Search for nodes with specific criteria
   */
  async searchNodes(query: string, viewport?: { x: number; y: number; width: number; height: number; zoom: number }): Promise<Node[]> {
    const bounds = viewport ? this.calculateLoadBounds(viewport) : undefined;
    
    try {
      const results = await this.dataSource.searchNodes(query, bounds);
      return results;
    } catch (error) {
      console.error('[IncrementalLoader] Search failed:', error);
      return [];
    }
  }

  /**
   * Preload data for predicted viewport
   */
  async preloadForPredictedViewport(predictedViewport: { x: number; y: number; width: number; height: number; zoom: number }): Promise<void> {
    const preloadBounds = this.calculatePreloadBounds(predictedViewport);
    const regionsToPreload = this.findRegionsInBounds(preloadBounds);
    
    this.prioritizeRegions(regionsToPreload, 3); // Low priority
    
    // Process queue without blocking
    this.processLoadingQueue().catch(error => {
      console.warn('[IncrementalLoader] Preload failed:', error);
    });
  }

  /**
   * Clear cache and reset
   */
  clearCache(): void {
    this.chunks.clear();
    this.regions.forEach(region => {
      region.status = 'pending';
    });
    this.currentLoads.clear();
    this.loadingQueue = [];
    this.updateMetrics();
  }

  /**
   * Get current loading metrics
   */
  getMetrics(): LoadingMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current loading progress
   */
  getProgress(): LoadingProgress {
    return { ...this.progress };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LoadingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Adjust cache size if needed
    if (newConfig.cacheSize && this.chunks.size > newConfig.cacheSize) {
      this.evictOldestChunks();
    }
  }

  // ===================================================================
  // Private Methods
  // ===================================================================

  private createLoadingRegions(bounds: { x: number; y: number; width: number; height: number }): void {
    const regionSize = this.config.loadRadius;
    const cols = Math.ceil(bounds.width / regionSize);
    const rows = Math.ceil(bounds.height / regionSize);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const regionId = `region_${row}_${col}`;
        const regionBounds = {
          x: bounds.x + col * regionSize,
          y: bounds.y + row * regionSize,
          width: regionSize,
          height: regionSize
        };

        this.regions.set(regionId, {
          id: regionId,
          bounds: regionBounds,
          priority: 999, // Will be set when needed
          status: 'pending',
          chunkIds: [],
          lastAccessed: 0
        });
      }
    }
  }

  private calculateLoadBounds(viewport: { x: number; y: number; width: number; height: number; zoom: number }): {
    x: number; y: number; width: number; height: number;
  } {
    const padding = this.config.loadRadius / viewport.zoom;
    
    return {
      x: viewport.x - padding,
      y: viewport.y - padding,
      width: viewport.width + padding * 2,
      height: viewport.height + padding * 2
    };
  }

  private calculatePreloadBounds(viewport: { x: number; y: number; width: number; height: number; zoom: number }): {
    x: number; y: number; width: number; height: number;
  } {
    const padding = this.config.preloadRadius / viewport.zoom;
    
    return {
      x: viewport.x - padding,
      y: viewport.y - padding,
      width: viewport.width + padding * 2,
      height: viewport.height + padding * 2
    };
  }

  private findRegionsInBounds(bounds: { x: number; y: number; width: number; height: number }): LoadingRegion[] {
    const regions: LoadingRegion[] = [];
    
    for (const region of this.regions.values()) {
      if (this.boundsIntersect(region.bounds, bounds)) {
        regions.push(region);
      }
    }
    
    return regions;
  }

  private findChunksInBounds(bounds: { x: number; y: number; width: number; height: number }): DataChunk[] {
    const chunks: DataChunk[] = [];
    
    for (const chunk of this.chunks.values()) {
      if (this.boundsIntersect(chunk.bounds, bounds)) {
        chunks.push(chunk);
      }
    }
    
    return chunks;
  }

  private boundsIntersect(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }

  private prioritizeRegions(regions: LoadingRegion[], priority: number): void {
    for (const region of regions) {
      if (region.status === 'pending') {
        region.priority = priority;
        
        if (!this.loadingQueue.includes(region)) {
          this.loadingQueue.push(region);
        }
      }
    }
    
    // Sort queue by priority
    this.loadingQueue.sort((a, b) => a.priority - b.priority);
  }

  private async processLoadingQueue(): Promise<void> {
    while (
      this.loadingQueue.length > 0 && 
      this.currentLoads.size < this.config.maxConcurrentLoads
    ) {
      const region = this.loadingQueue.shift();
      if (!region || this.currentLoads.has(region.id)) continue;

      this.loadRegion(region).catch(error => {
        console.error(`[IncrementalLoader] Failed to load region ${region.id}:`, error);
      });
    }
  }

  private async loadRegion(region: LoadingRegion): Promise<void> {
    if (region.status === 'loaded' || this.currentLoads.has(region.id)) {
      return;
    }

    this.currentLoads.add(region.id);
    region.status = 'loading';
    
    const startTime = performance.now();
    
    try {
      // Update progress
      this.updateProgress('loading', `Loading region ${region.id}`);
      
      const data = await this.dataSource.loadRegion(region.bounds);
      
      // Create data chunk
      const chunkId = `chunk_${region.id}_${Date.now()}`;
      const chunk: DataChunk = {
        id: chunkId,
        regionId: region.id,
        nodes: data.nodes,
        edges: data.edges,
        bounds: region.bounds,
        loadedAt: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
        status: 'cached'
      };

      // Add to cache
      this.chunks.set(chunkId, chunk);
      region.chunkIds.push(chunkId);
      region.status = 'loaded';
      region.lastAccessed = Date.now();

      // Track loading time
      const loadTime = performance.now() - startTime;
      this.loadingTimes.push(loadTime);
      if (this.loadingTimes.length > 100) {
        this.loadingTimes = this.loadingTimes.slice(-100);
      }

      // Evict old chunks if cache is full
      if (this.chunks.size > this.config.cacheSize) {
        this.evictOldestChunks();
      }

      console.log(`[IncrementalLoader] Loaded region ${region.id} with ${data.nodes.length} nodes and ${data.edges.length} edges in ${loadTime.toFixed(2)}ms`);

    } catch (error) {
      region.status = 'error';
      console.error(`[IncrementalLoader] Failed to load region ${region.id}:`, error);
      
      // Retry logic could be implemented here
    } finally {
      this.currentLoads.delete(region.id);
      this.updateMetrics();
      this.updateProgress();
      
      // Continue processing queue
      this.processLoadingQueue();
    }
  }

  private evictOldestChunks(): void {
    const chunks = Array.from(this.chunks.values());
    chunks.sort((a, b) => a.lastAccessed - b.lastAccessed);
    
    const chunksToRemove = chunks.slice(0, chunks.length - this.config.cacheSize);
    
    for (const chunk of chunksToRemove) {
      this.chunks.delete(chunk.id);
      
      // Remove from region
      const region = this.regions.get(chunk.regionId);
      if (region) {
        region.chunkIds = region.chunkIds.filter(id => id !== chunk.id);
        if (region.chunkIds.length === 0) {
          region.status = 'pending';
        }
      }
    }
  }

  private updateMetrics(): void {
    const loadedRegions = Array.from(this.regions.values()).filter(r => r.status === 'loaded').length;
    const totalDataLoaded = Array.from(this.chunks.values()).reduce(
      (sum, chunk) => sum + chunk.nodes.length + chunk.edges.length, 0
    );

    this.metrics = {
      totalRegions: this.regions.size,
      loadedRegions,
      cachedChunks: this.chunks.size,
      totalDataLoaded,
      averageLoadTime: this.loadingTimes.reduce((sum, time) => sum + time, 0) / Math.max(this.loadingTimes.length, 1),
      cacheHitRatio: this.cacheAccesses > 0 ? this.cacheHits / this.cacheAccesses : 0,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private updateProgress(status?: 'loading' | 'idle', operation?: string): void {
    const totalChunks = this.regions.size;
    const loadedChunks = Array.from(this.regions.values()).filter(r => r.status === 'loaded').length;
    
    this.progress = {
      isLoading: this.currentLoads.size > 0 || this.loadingQueue.length > 0,
      totalChunks,
      loadedChunks,
      progress: totalChunks > 0 ? loadedChunks / totalChunks : 1,
      currentOperation: operation || this.progress.currentOperation,
      estimatedTimeRemaining: this.estimateTimeRemaining()
    };
  }

  private estimateTimeRemaining(): number {
    if (this.loadingTimes.length === 0 || this.currentLoads.size === 0) {
      return 0;
    }
    
    const avgTime = this.metrics.averageLoadTime / 1000; // Convert to seconds
    const remainingLoads = this.loadingQueue.length;
    
    return (remainingLoads * avgTime) / this.config.maxConcurrentLoads;
  }

  private estimateMemoryUsage(): number {
    const nodeSize = 1000; // bytes per node (estimated)
    const edgeSize = 500; // bytes per edge (estimated)
    
    let totalSize = 0;
    for (const chunk of this.chunks.values()) {
      totalSize += chunk.nodes.length * nodeSize + chunk.edges.length * edgeSize;
    }
    
    return totalSize / 1024 / 1024; // Convert to MB
  }

  private createInitialMetrics(): LoadingMetrics {
    return {
      totalRegions: 0,
      loadedRegions: 0,
      cachedChunks: 0,
      totalDataLoaded: 0,
      averageLoadTime: 0,
      cacheHitRatio: 0,
      memoryUsage: 0
    };
  }

  private createInitialProgress(): LoadingProgress {
    return {
      isLoading: false,
      totalChunks: 0,
      loadedChunks: 0,
      progress: 0,
      currentOperation: 'Idle',
      estimatedTimeRemaining: 0
    };
  }
}

// ===================================================================
// Factory Function
// ===================================================================

export function createIncrementalLoader(config: Partial<LoadingConfig>, dataSource: DataSource): IncrementalLoader {
  return new IncrementalLoader(config, dataSource);
}

export default IncrementalLoader;
