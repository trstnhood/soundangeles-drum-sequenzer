/**
 * Adaptive Sample Loader with 64kbps MP3 Prioritization
 * Device-aware sample loading with automatic quality selection
 * 
 * Features:
 * - 64kbps MP3 prioritization for mobile/slow connections
 * - Device-specific loading strategies
 * - Memory-aware caching
 * - Progressive quality enhancement
 * - Network-aware batch loading
 */

import { AdaptiveMobileAudioSystem, AdaptiveAudioConfig } from './AdaptiveMobileAudioSystem';

export interface SampleMetadata {
  id: string;
  name: string;
  basePath: string;
  formats: {
    wav?: string;
    mp3_320?: string;
    mp3_128?: string;
    mp3_64?: string;
  };
  size: {
    wav?: number;
    mp3_320?: number;
    mp3_128?: number;
    mp3_64?: number;
  };
  duration: number;
  priority: 'high' | 'medium' | 'low';
}

export interface LoadingStrategy {
  preferredFormat: 'wav' | 'mp3_320' | 'mp3_128' | 'mp3_64';
  fallbackFormats: string[];
  batchSize: number;
  maxConcurrent: number;
  preloadDistance: number;
  memoryThreshold: number;
}

export interface LoadingProgress {
  loaded: number;
  total: number;
  currentSample: string;
  estimatedTimeRemaining: number;
  bytesLoaded: number;
  bytesTotal: number;
}

export class AdaptiveSampleLoader {
  private audioContext: AudioContext;
  private config: AdaptiveAudioConfig;
  private sampleCache: Map<string, AudioBuffer> = new Map();
  private sampleMetadata: Map<string, SampleMetadata> = new Map();
  private loadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();
  private loadingQueue: string[] = [];
  private currentlyLoading: Set<string> = new Set();
  private loadingStrategy: LoadingStrategy;
  private totalBytesLoaded = 0;
  private loadingStartTime = 0;
  private onProgressCallback?: (progress: LoadingProgress) => void;
  
  constructor(audioContext: AudioContext, config: AdaptiveAudioConfig) {
    this.audioContext = audioContext;
    this.config = config;
    this.loadingStrategy = this.determineLoadingStrategy(config);
    
    console.log('🚀 Adaptive Sample Loader initialized:', {
      preferredFormat: this.loadingStrategy.preferredFormat,
      batchSize: this.loadingStrategy.batchSize,
      maxConcurrent: this.loadingStrategy.maxConcurrent
    });
  }
  
  /**
   * Determine loading strategy based on device configuration
   */
  private determineLoadingStrategy(config: AdaptiveAudioConfig): LoadingStrategy {
    const qualitySettings = AdaptiveMobileAudioSystem.getQualitySettings(config);
    
    let preferredFormat: 'wav' | 'mp3_320' | 'mp3_128' | 'mp3_64';
    let fallbackFormats: string[];
    
    // Determine preferred format based on quality and network
    if (config.use64kbpsPriority || config.audioQuality === 'safe' || config.audioQuality === 'low') {
      preferredFormat = 'mp3_64';
      fallbackFormats = ['mp3_128', 'mp3_320', 'wav'];
    } else if (config.audioQuality === 'medium') {
      preferredFormat = config.capabilities.networkSpeed === 'fast' ? 'mp3_128' : 'mp3_64';
      fallbackFormats = ['mp3_64', 'mp3_320', 'wav'];
    } else {
      preferredFormat = config.capabilities.networkSpeed === 'fast' ? 'mp3_320' : 'mp3_128';
      fallbackFormats = ['mp3_128', 'mp3_64', 'wav'];
    }
    
    return {
      preferredFormat,
      fallbackFormats,
      batchSize: this.getBatchSize(config),
      maxConcurrent: qualitySettings.maxConcurrentLoads,
      preloadDistance: this.getPreloadDistance(config),
      memoryThreshold: config.memoryLimitMB * 1024 * 1024 * 0.8 // 80% of memory limit
    };\n  }\n  \n  /**\n   * Get batch size based on device capabilities\n   */\n  private getBatchSize(config: AdaptiveAudioConfig): number {\n    switch (config.preloadStrategy) {\n      case 'aggressive': return 8;\n      case 'moderate': return 4;\n      case 'lazy': return 2;\n      case 'minimal': return 1;\n      default: return 2;\n    }\n  }\n  \n  /**\n   * Get preload distance based on device capabilities\n   */\n  private getPreloadDistance(config: AdaptiveAudioConfig): number {\n    switch (config.preloadStrategy) {\n      case 'aggressive': return 16; // Preload all samples\n      case 'moderate': return 8;    // Preload next 8 samples\n      case 'lazy': return 4;        // Preload next 4 samples\n      case 'minimal': return 1;     // Only preload next sample\n      default: return 4;\n    }\n  }\n  \n  /**\n   * Register sample metadata for adaptive loading\n   */\n  registerSample(metadata: SampleMetadata): void {\n    this.sampleMetadata.set(metadata.id, metadata);\n  }\n  \n  /**\n   * Register multiple samples from pack data\n   */\n  registerSamplesFromPack(packData: any, packPath: string): void {\n    console.log(`📦 Registering samples from pack: ${packData.name}`);\n    \n    let registeredCount = 0;\n    \n    // Process each instrument folder\n    Object.entries(packData.instruments || {}).forEach(([folderName, samples]: [string, any]) => {\n      (samples as any[]).forEach((sample, index) => {\n        const sampleId = `${this.getTrackIdFromFolder(folderName)}_${index + 1}`;\n        const basePath = `${packPath}/${folderName}/${sample.fileName.replace(/\\.(wav|mp3)$/i, '')}`;\n        \n        const metadata: SampleMetadata = {\n          id: sampleId,\n          name: sample.fileName.replace(/\\.(wav|mp3)$/i, ''),\n          basePath,\n          formats: {\n            wav: `${basePath}.wav`,\n            mp3_320: `${basePath}_320.mp3`,\n            mp3_128: `${basePath}_128.mp3`,\n            mp3_64: `${basePath}_64.mp3`\n          },\n          size: {\n            wav: sample.size?.wav || 1000000,\n            mp3_320: sample.size?.mp3_320 || 300000,\n            mp3_128: sample.size?.mp3_128 || 120000,\n            mp3_64: sample.size?.mp3_64 || 60000\n          },\n          duration: sample.duration || 1.0,\n          priority: this.determineSamplePriority(folderName)\n        };\n        \n        this.registerSample(metadata);\n        registeredCount++;\n      });\n    });\n    \n    console.log(`✅ Registered ${registeredCount} samples with adaptive loading metadata`);\n  }\n  \n  /**\n   * Determine sample priority based on instrument type\n   */\n  private determineSamplePriority(folderName: string): 'high' | 'medium' | 'low' {\n    const folder = folderName.toLowerCase();\n    \n    // High priority: core drums\n    if (folder.includes('kick') || folder.includes('snare') || folder.includes('hi-hat')) {\n      return 'high';\n    }\n    \n    // Medium priority: secondary drums\n    if (folder.includes('tom') || folder.includes('crash') || folder.includes('ride') || folder.includes('clap')) {\n      return 'medium';\n    }\n    \n    // Low priority: percussion and effects\n    return 'low';\n  }\n  \n  /**\n   * Convert folder name to track ID\n   */\n  private getTrackIdFromFolder(folderName: string): string {\n    return folderName\n      .toLowerCase()\n      .replace(/[^a-z0-9\\s-]/g, '')\n      .replace(/\\s+/g, '-')\n      .replace(/^-+|-+$/g, '');\n  }\n  \n  /**\n   * Load sample with adaptive quality selection\n   */\n  async loadSample(sampleId: string): Promise<AudioBuffer | null> {\n    // Return cached if available\n    if (this.sampleCache.has(sampleId)) {\n      return this.sampleCache.get(sampleId)!;\n    }\n    \n    // Return existing promise if loading\n    if (this.loadingPromises.has(sampleId)) {\n      return this.loadingPromises.get(sampleId)!;\n    }\n    \n    const metadata = this.sampleMetadata.get(sampleId);\n    if (!metadata) {\n      console.warn(`⚠️ No metadata found for sample: ${sampleId}`);\n      return null;\n    }\n    \n    // Start loading process\n    const loadingPromise = this.loadSampleWithFallback(metadata);\n    this.loadingPromises.set(sampleId, loadingPromise);\n    \n    try {\n      const buffer = await loadingPromise;\n      if (buffer) {\n        this.cacheSample(sampleId, buffer);\n      }\n      return buffer;\n    } finally {\n      this.loadingPromises.delete(sampleId);\n    }\n  }\n  \n  /**\n   * Load sample with format fallback\n   */\n  private async loadSampleWithFallback(metadata: SampleMetadata): Promise<AudioBuffer | null> {\n    const formats = [this.loadingStrategy.preferredFormat, ...this.loadingStrategy.fallbackFormats];\n    \n    console.log(`🔄 Loading sample: ${metadata.name} (trying ${this.loadingStrategy.preferredFormat} first)`);\n    \n    for (const format of formats) {\n      const url = this.getUrlForFormat(metadata, format);\n      if (!url) continue;\n      \n      try {\n        const buffer = await this.fetchAndDecodeAudio(url, metadata);\n        if (buffer) {\n          console.log(`✅ Loaded ${metadata.name} in ${format} format`);\n          return buffer;\n        }\n      } catch (error) {\n        console.warn(`⚠️ Failed to load ${metadata.name} in ${format} format:`, error);\n      }\n    }\n    \n    console.error(`❌ Failed to load ${metadata.name} in any format`);\n    return null;\n  }\n  \n  /**\n   * Get URL for specific format\n   */\n  private getUrlForFormat(metadata: SampleMetadata, format: string): string | null {\n    switch (format) {\n      case 'wav': return metadata.formats.wav || null;\n      case 'mp3_320': return metadata.formats.mp3_320 || null;\n      case 'mp3_128': return metadata.formats.mp3_128 || null;\n      case 'mp3_64': return metadata.formats.mp3_64 || null;\n      default: return null;\n    }\n  }\n  \n  /**\n   * Fetch and decode audio with progress tracking\n   */\n  private async fetchAndDecodeAudio(url: string, metadata: SampleMetadata): Promise<AudioBuffer | null> {\n    const controller = new AbortController();\n    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout\n    \n    try {\n      const response = await fetch(url, { \n        signal: controller.signal,\n        cache: this.config.capabilities.networkSpeed === 'slow' ? 'force-cache' : 'default'\n      });\n      \n      clearTimeout(timeoutId);\n      \n      if (!response.ok) {\n        throw new Error(`HTTP ${response.status}: ${response.statusText}`);\n      }\n      \n      const arrayBuffer = await response.arrayBuffer();\n      this.totalBytesLoaded += arrayBuffer.byteLength;\n      \n      // Update progress\n      this.updateProgress(metadata.name, arrayBuffer.byteLength);\n      \n      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);\n      return audioBuffer;\n      \n    } catch (error) {\n      clearTimeout(timeoutId);\n      throw error;\n    }\n  }\n  \n  /**\n   * Cache sample with memory management\n   */\n  private cacheSample(sampleId: string, buffer: AudioBuffer): void {\n    // Check memory usage before caching\n    if (this.shouldEvictCache()) {\n      this.evictLeastRecentlyUsed();\n    }\n    \n    this.sampleCache.set(sampleId, buffer);\n    \n    // Track memory usage\n    const bufferSize = buffer.length * buffer.numberOfChannels * 4; // 4 bytes per float32\n    console.log(`💾 Cached ${sampleId} (${(bufferSize / 1024).toFixed(1)}KB)`);\n  }\n  \n  /**\n   * Check if cache should be evicted\n   */\n  private shouldEvictCache(): boolean {\n    const currentMemoryUsage = this.getEstimatedMemoryUsage();\n    return currentMemoryUsage > this.loadingStrategy.memoryThreshold;\n  }\n  \n  /**\n   * Get estimated memory usage of cache\n   */\n  private getEstimatedMemoryUsage(): number {\n    let totalBytes = 0;\n    for (const buffer of this.sampleCache.values()) {\n      totalBytes += buffer.length * buffer.numberOfChannels * 4;\n    }\n    return totalBytes;\n  }\n  \n  /**\n   * Evict least recently used samples from cache\n   */\n  private evictLeastRecentlyUsed(): void {\n    // Simple eviction: remove first 25% of cache\n    const cacheSize = this.sampleCache.size;\n    const toEvict = Math.ceil(cacheSize * 0.25);\n    const keys = Array.from(this.sampleCache.keys());\n    \n    for (let i = 0; i < toEvict && i < keys.length; i++) {\n      this.sampleCache.delete(keys[i]);\n    }\n    \n    console.log(`🗑️ Evicted ${toEvict} samples from cache (was ${cacheSize}, now ${this.sampleCache.size})`);\n  }\n  \n  /**\n   * Preload samples based on strategy\n   */\n  async preloadSamples(sampleIds: string[], priority: 'high' | 'medium' | 'low' = 'medium'): Promise<void> {\n    if (this.config.preloadStrategy === 'minimal') {\n      console.log('📱 Minimal preload strategy - skipping bulk preload');\n      return;\n    }\n    \n    // Filter to samples not already cached or loading\n    const samplesToLoad = sampleIds.filter(id => \n      !this.sampleCache.has(id) && \n      !this.loadingPromises.has(id)\n    );\n    \n    if (samplesToLoad.length === 0) {\n      return;\n    }\n    \n    // Sort by priority and metadata priority\n    const sortedSamples = this.prioritizeSamples(samplesToLoad);\n    \n    console.log(`🔄 Preloading ${sortedSamples.length} samples with ${this.config.preloadStrategy} strategy`);\n    \n    // Load in batches to avoid overwhelming the system\n    await this.loadInBatches(sortedSamples);\n  }\n  \n  /**\n   * Prioritize samples for loading\n   */\n  private prioritizeSamples(sampleIds: string[]): string[] {\n    return sampleIds.sort((a, b) => {\n      const metadataA = this.sampleMetadata.get(a);\n      const metadataB = this.sampleMetadata.get(b);\n      \n      if (!metadataA || !metadataB) return 0;\n      \n      const priorityOrder = { high: 0, medium: 1, low: 2 };\n      return priorityOrder[metadataA.priority] - priorityOrder[metadataB.priority];\n    });\n  }\n  \n  /**\n   * Load samples in batches\n   */\n  private async loadInBatches(sampleIds: string[]): Promise<void> {\n    const batchSize = this.loadingStrategy.batchSize;\n    \n    for (let i = 0; i < sampleIds.length; i += batchSize) {\n      const batch = sampleIds.slice(i, i + batchSize);\n      \n      // Load batch concurrently but respect max concurrent limit\n      const loadingBatch = batch.map(id => this.loadSample(id));\n      await Promise.allSettled(loadingBatch);\n      \n      // Small delay between batches on mobile to prevent overwhelming\n      if (this.config.deviceTier.includes('mobile') && i + batchSize < sampleIds.length) {\n        await new Promise(resolve => setTimeout(resolve, 100));\n      }\n    }\n  }\n  \n  /**\n   * Update loading progress\n   */\n  private updateProgress(currentSample: string, bytesLoaded: number): void {\n    if (this.onProgressCallback) {\n      const progress: LoadingProgress = {\n        loaded: this.sampleCache.size,\n        total: this.sampleMetadata.size,\n        currentSample,\n        estimatedTimeRemaining: this.estimateTimeRemaining(),\n        bytesLoaded: this.totalBytesLoaded,\n        bytesTotal: this.estimateTotalBytes()\n      };\n      \n      this.onProgressCallback(progress);\n    }\n  }\n  \n  /**\n   * Estimate time remaining for loading\n   */\n  private estimateTimeRemaining(): number {\n    if (this.loadingStartTime === 0) return 0;\n    \n    const elapsedTime = (Date.now() - this.loadingStartTime) / 1000;\n    const loadedRatio = this.sampleCache.size / this.sampleMetadata.size;\n    \n    if (loadedRatio === 0) return 0;\n    \n    const totalEstimatedTime = elapsedTime / loadedRatio;\n    return Math.max(0, totalEstimatedTime - elapsedTime);\n  }\n  \n  /**\n   * Estimate total bytes to load\n   */\n  private estimateTotalBytes(): number {\n    let totalBytes = 0;\n    const format = this.loadingStrategy.preferredFormat;\n    \n    for (const metadata of this.sampleMetadata.values()) {\n      totalBytes += this.getEstimatedSizeForFormat(metadata, format);\n    }\n    \n    return totalBytes;\n  }\n  \n  /**\n   * Get estimated size for format\n   */\n  private getEstimatedSizeForFormat(metadata: SampleMetadata, format: string): number {\n    switch (format) {\n      case 'wav': return metadata.size.wav || 1000000;\n      case 'mp3_320': return metadata.size.mp3_320 || 300000;\n      case 'mp3_128': return metadata.size.mp3_128 || 120000;\n      case 'mp3_64': return metadata.size.mp3_64 || 60000;\n      default: return 120000;\n    }\n  }\n  \n  /**\n   * Set progress callback\n   */\n  setProgressCallback(callback: (progress: LoadingProgress) => void): void {\n    this.onProgressCallback = callback;\n  }\n  \n  /**\n   * Start loading session\n   */\n  startLoadingSession(): void {\n    this.loadingStartTime = Date.now();\n    this.totalBytesLoaded = 0;\n  }\n  \n  /**\n   * Get cache statistics\n   */\n  getCacheStats(): {\n    cached: number;\n    loading: number;\n    totalRegistered: number;\n    memoryUsage: string;\n    hitRate: number;\n  } {\n    const memoryUsage = this.getEstimatedMemoryUsage();\n    const hitRate = this.sampleCache.size / Math.max(1, this.sampleMetadata.size);\n    \n    return {\n      cached: this.sampleCache.size,\n      loading: this.loadingPromises.size,\n      totalRegistered: this.sampleMetadata.size,\n      memoryUsage: `${(memoryUsage / 1024 / 1024).toFixed(1)}MB`,\n      hitRate: Math.round(hitRate * 100)\n    };\n  }\n  \n  /**\n   * Clear cache and reset\n   */\n  clearCache(): void {\n    this.sampleCache.clear();\n    this.loadingPromises.clear();\n    this.totalBytesLoaded = 0;\n    console.log('🧹 Adaptive sample loader cache cleared');\n  }\n  \n  /**\n   * Get sample from cache\n   */\n  getCachedSample(sampleId: string): AudioBuffer | null {\n    return this.sampleCache.get(sampleId) || null;\n  }\n  \n  /**\n   * Check if sample is cached\n   */\n  isCached(sampleId: string): boolean {\n    return this.sampleCache.has(sampleId);\n  }\n  \n  /**\n   * Check if sample is currently loading\n   */\n  isLoading(sampleId: string): boolean {\n    return this.loadingPromises.has(sampleId);\n  }\n  \n  /**\n   * Get loading strategy info\n   */\n  getLoadingStrategyInfo(): {\n    strategy: string;\n    preferredFormat: string;\n    batchSize: number;\n    maxConcurrent: number;\n    memoryLimit: string;\n  } {\n    return {\n      strategy: this.config.preloadStrategy,\n      preferredFormat: this.loadingStrategy.preferredFormat,\n      batchSize: this.loadingStrategy.batchSize,\n      maxConcurrent: this.loadingStrategy.maxConcurrent,\n      memoryLimit: `${this.config.memoryLimitMB}MB`\n    };\n  }\n}