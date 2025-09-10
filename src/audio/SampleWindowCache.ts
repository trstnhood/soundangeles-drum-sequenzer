/**
 * Smart Sample Window Cache for Mobile Optimization
 * Maintains a sliding window of ±N samples around the current selection
 * Automatically manages memory by evicting samples outside the window
 */

export class SampleWindowCache {
  private windowSize: number = 4; // ±4 samples default
  private cache: Map<string, AudioBuffer> = new Map();
  private loadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();
  private currentIndices: Map<string, number> = new Map(); // trackId -> current sample index
  private sampleLists: Map<string, string[]> = new Map(); // trackId -> list of sample URLs
  private audioContext: AudioContext;
  private maxCacheSize: number = 32; // Maximum total samples in cache
  private lastAccessTime: Map<string, number> = new Map(); // For LRU eviction
  
  // Performance tracking
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    loads: 0
  };

  constructor(audioContext: AudioContext, windowSize: number = 4) {
    this.audioContext = audioContext;
    this.windowSize = windowSize;
    console.log(`🪟 SampleWindowCache initialized with window size: ±${windowSize}`);
  }

  /**
   * Register a track with its available samples
   */
  registerTrack(trackId: string, samples: string[], currentIndex: number = 0): void {
    this.sampleLists.set(trackId, samples);
    this.currentIndices.set(trackId, currentIndex);
    console.log(`📝 Registered track ${trackId} with ${samples.length} samples, current index: ${currentIndex}`);
  }

  /**
   * Update current sample index and preload window
   */
  async updateCurrentSample(trackId: string, newIndex: number): Promise<AudioBuffer | null> {
    const samples = this.sampleLists.get(trackId);
    if (!samples || newIndex < 0 || newIndex >= samples.length) {
      console.warn(`⚠️ Invalid sample index ${newIndex} for track ${trackId}`);
      return null;
    }

    this.currentIndices.set(trackId, newIndex);
    
    // Load the current sample immediately
    const currentSample = samples[newIndex];
    const buffer = await this.loadSample(currentSample, 'high');
    
    // Preload window asynchronously
    this.preloadWindow(trackId, newIndex).catch(err => 
      console.error(`❌ Window preload failed for ${trackId}:`, err)
    );
    
    return buffer;
  }

  /**
   * Preload samples within the window
   */
  private async preloadWindow(trackId: string, centerIndex: number): Promise<void> {
    const samples = this.sampleLists.get(trackId);
    if (!samples) return;

    const start = Math.max(0, centerIndex - this.windowSize);
    const end = Math.min(samples.length, centerIndex + this.windowSize + 1);
    
    console.log(`🔄 Preloading window for ${trackId}: [${start}-${end}) of ${samples.length} samples`);
    
    // Load samples in parallel but with priority
    const loadPromises: Promise<void>[] = [];
    
    // Load center first (highest priority)
    if (centerIndex >= 0 && centerIndex < samples.length) {
      loadPromises.push(
        this.loadSample(samples[centerIndex], 'high').then(() => {})
      );
    }
    
    // Load adjacent samples (medium priority)
    for (let offset = 1; offset <= this.windowSize; offset++) {
      const prevIdx = centerIndex - offset;
      const nextIdx = centerIndex + offset;
      
      if (prevIdx >= start) {
        loadPromises.push(
          this.loadSample(samples[prevIdx], 'normal').then(() => {})
        );
      }
      
      if (nextIdx < end) {
        loadPromises.push(
          this.loadSample(samples[nextIdx], 'normal').then(() => {})
        );
      }
    }
    
    await Promise.allSettled(loadPromises);
    
    // Evict samples outside the window
    this.evictOutsideWindow(trackId, start, end, samples);
  }

  /**
   * Load a single sample with caching
   */
  private async loadSample(sampleUrl: string, priority: 'high' | 'normal' = 'normal'): Promise<AudioBuffer | null> {
    // Check cache first
    if (this.cache.has(sampleUrl)) {
      this.stats.hits++;
      this.lastAccessTime.set(sampleUrl, Date.now());
      return this.cache.get(sampleUrl)!;
    }
    
    this.stats.misses++;
    
    // Check if already loading
    if (this.loadingPromises.has(sampleUrl)) {
      return await this.loadingPromises.get(sampleUrl)!;
    }
    
    // Start loading
    const loadPromise = this.loadSampleInternal(sampleUrl, priority);
    this.loadingPromises.set(sampleUrl, loadPromise);
    
    try {
      const buffer = await loadPromise;
      this.loadingPromises.delete(sampleUrl);
      
      if (buffer) {
        // Check cache size before adding
        this.enforceMaxCacheSize();
        
        this.cache.set(sampleUrl, buffer);
        this.lastAccessTime.set(sampleUrl, Date.now());
        this.stats.loads++;
        console.log(`✅ Loaded: ${sampleUrl.split('/').pop()} (cache size: ${this.cache.size})`);
      }
      
      return buffer;
    } catch (error) {
      this.loadingPromises.delete(sampleUrl);
      console.error(`❌ Failed to load ${sampleUrl}:`, error);
      return null;
    }
  }

  /**
   * Internal sample loading with timeout
   */
  private async loadSampleInternal(sampleUrl: string, priority: 'high' | 'normal'): Promise<AudioBuffer | null> {
    try {
      const controller = new AbortController();
      const timeout = priority === 'high' ? 5000 : 10000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(sampleUrl, {
        signal: controller.signal,
        priority: priority as RequestPriority
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      return audioBuffer;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn(`⏱️ Timeout loading: ${sampleUrl}`);
      }
      throw error;
    }
  }

  /**
   * Evict samples outside the current window
   */
  private evictOutsideWindow(trackId: string, windowStart: number, windowEnd: number, samples: string[]): void {
    const samplesToKeep = new Set<string>();
    
    // Mark samples in window to keep
    for (let i = windowStart; i < windowEnd; i++) {
      if (i >= 0 && i < samples.length) {
        samplesToKeep.add(samples[i]);
      }
    }
    
    // Also keep samples from other tracks' windows
    for (const [otherTrackId, otherSamples] of this.sampleLists) {
      if (otherTrackId === trackId) continue;
      
      const otherIndex = this.currentIndices.get(otherTrackId) || 0;
      const otherStart = Math.max(0, otherIndex - this.windowSize);
      const otherEnd = Math.min(otherSamples.length, otherIndex + this.windowSize + 1);
      
      for (let i = otherStart; i < otherEnd; i++) {
        if (i >= 0 && i < otherSamples.length) {
          samplesToKeep.add(otherSamples[i]);
        }
      }
    }
    
    // Evict samples not in any window
    let evicted = 0;
    for (const [sampleUrl] of this.cache) {
      if (!samplesToKeep.has(sampleUrl)) {
        this.cache.delete(sampleUrl);
        this.lastAccessTime.delete(sampleUrl);
        evicted++;
      }
    }
    
    if (evicted > 0) {
      this.stats.evictions += evicted;
      console.log(`🗑️ Evicted ${evicted} samples outside window (cache size: ${this.cache.size})`);
    }
  }

  /**
   * Enforce maximum cache size using LRU eviction
   */
  private enforceMaxCacheSize(): void {
    if (this.cache.size >= this.maxCacheSize) {
      // Find least recently used sample
      let oldestTime = Date.now();
      let oldestUrl = '';
      
      for (const [url, time] of this.lastAccessTime) {
        if (time < oldestTime) {
          oldestTime = time;
          oldestUrl = url;
        }
      }
      
      if (oldestUrl) {
        this.cache.delete(oldestUrl);
        this.lastAccessTime.delete(oldestUrl);
        this.stats.evictions++;
        console.log(`🗑️ LRU eviction: ${oldestUrl.split('/').pop()}`);
      }
    }
  }

  /**
   * Get a sample from cache
   */
  getSample(sampleUrl: string): AudioBuffer | null {
    const buffer = this.cache.get(sampleUrl) || null;
    if (buffer) {
      this.stats.hits++;
      this.lastAccessTime.set(sampleUrl, Date.now());
    } else {
      this.stats.misses++;
    }
    return buffer;
  }

  /**
   * Check if a sample is cached
   */
  hasSample(sampleUrl: string): boolean {
    return this.cache.has(sampleUrl);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    cacheSize: number;
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
    loads: number;
    memoryUsageMB: number;
  } {
    let memoryUsage = 0;
    for (const buffer of this.cache.values()) {
      memoryUsage += buffer.length * buffer.numberOfChannels * 4; // 4 bytes per float32
    }
    
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;
    
    return {
      cacheSize: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      evictions: this.stats.evictions,
      loads: this.stats.loads,
      memoryUsageMB: memoryUsage / (1024 * 1024)
    };
  }

  /**
   * Clear all cached samples
   */
  clear(): void {
    this.cache.clear();
    this.loadingPromises.clear();
    this.lastAccessTime.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, loads: 0 };
    console.log('🧹 Cache cleared');
  }

  /**
   * Set window size
   */
  setWindowSize(size: number): void {
    this.windowSize = Math.max(1, Math.min(10, size));
    console.log(`🪟 Window size changed to: ±${this.windowSize}`);
  }
}