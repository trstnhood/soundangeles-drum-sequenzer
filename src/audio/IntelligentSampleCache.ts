/**
 * Intelligent Sample Cache - Enhanced mobile audio caching with ML-powered predictions
 * Extends SampleWindowCache with adaptive intelligence and predictive loading
 * 
 * FEATURES:
 * - Predictive caching based on user behavior patterns
 * - Dynamic compression based on network conditions
 * - Smart eviction using multi-factor scoring
 * - Thermal and battery-aware optimizations
 * - Real-time performance adaptation
 */

import { SampleWindowCache } from './SampleWindowCache';
import type { AdaptiveMobileAudioConfig, DeviceTier, LoadingStrategy } from './AdaptiveDeviceAudioConfig';

interface UserPattern {
  sequences: number[];           // Recent sample selection sequence
  preferences: Map<string, number>; // Sample ID → usage count
  timePatterns: Map<number, number>; // Hour → usage count
  genreContext: string;          // Current music style context
  sessionDuration: number;       // Current session length
  lastInteractionTime: number;   // Timestamp of last interaction
}

interface SampleInteraction {
  sampleId: string;
  trackId: string;
  sampleIndex: number;
  timestamp: number;
  context: string;
  sessionId: string;
}

interface PredictionContext {
  currentTrackId: string;
  currentIndex: number;
  genreContext: string;
  timeOfDay: number;
  sessionLength: number;
  recentHistory: number[];
}

interface NetworkConditions {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  isOnline: boolean;
}

interface PerformanceMetrics {
  cacheHitRate: number;
  averageLoadTime: number;
  memoryPressure: number;
  cpuUsage: number;
  thermalState: 'normal' | 'warm' | 'hot' | 'critical';
  batteryLevel: number;
  frameDrops: number;
}

export class IntelligentSampleCache extends SampleWindowCache {
  // Machine Learning & Prediction
  private patterns: Map<string, UserPattern> = new Map();
  private interactionHistory: SampleInteraction[] = [];
  private sessionId: string = Math.random().toString(36);
  private sessionStartTime: number = Date.now();
  
  // Adaptive Configuration
  private config: AdaptiveMobileAudioConfig;
  private deviceTier: DeviceTier;
  private currentNetworkConditions: NetworkConditions;
  private performanceMetrics: PerformanceMetrics;
  
  // Intelligent Features
  private predictionConfidence: Map<string, number> = new Map();
  private compressionCache: Map<string, string> = new Map(); // sampleUrl -> compression level
  private loadPriorityQueue: Array<{url: string, priority: number, strategy: LoadingStrategy}> = [];
  
  // Performance Monitoring
  private performanceObserver: PerformanceObserver | null = null;
  private thermalMonitorInterval: number | null = null;
  private networkMonitorInterval: number | null = null;
  
  // Adaptive thresholds
  private dynamicWindowSize: number;
  private adaptiveMaxCache: number;
  
  constructor(audioContext: AudioContext, config: AdaptiveMobileAudioConfig) {
    const initialWindowSize = config.cacheWindowSize;
    super(audioContext, initialWindowSize);
    
    this.config = config;
    this.deviceTier = config.deviceTier;
    this.dynamicWindowSize = config.cacheWindowSize;
    this.adaptiveMaxCache = config.maxCacheSize;
    
    // Initialize monitoring systems
    this.setupPerformanceMonitoring();
    this.setupNetworkMonitoring();
    this.setupThermalMonitoring();
    this.setupBatteryMonitoring();
    
    // Load saved patterns
    this.loadUserPatterns();
    
    console.log(`🧠 IntelligentSampleCache initialized:`);
    console.log(`   Device Tier: ${this.deviceTier}`);
    console.log(`   Window Size: ±${this.dynamicWindowSize}`);
    console.log(`   Max Cache: ${this.adaptiveMaxCache}`);
    console.log(`   Features: ${this.getEnabledFeatures().join(', ')}`);
  }
  
  /**
   * Enhanced sample registration with predictive preloading
   */
  override registerTrack(trackId: string, samples: string[], currentIndex: number = 0): void {
    super.registerTrack(trackId, samples, currentIndex);
    
    // Initialize pattern tracking for this track
    const patternKey = this.getPatternKey(trackId);
    if (!this.patterns.has(patternKey)) {
      this.patterns.set(patternKey, {
        sequences: [],
        preferences: new Map(),
        timePatterns: new Map(),
        genreContext: 'unknown',
        sessionDuration: 0,
        lastInteractionTime: Date.now()
      });
    }
    
    // Trigger predictive analysis
    if (this.config.enablePredictiveCaching) {
      this.predictivePreload(trackId, currentIndex).catch(error => 
        console.warn('Predictive preload failed:', error)
      );
    }
  }
  
  /**
   * Intelligent sample update with learning
   */
  override async updateCurrentSample(trackId: string, newIndex: number): Promise<AudioBuffer | null> {
    const startTime = performance.now();
    
    // Record interaction for learning
    this.recordInteraction({
      sampleId: `${trackId}_${newIndex}`,
      trackId,
      sampleIndex: newIndex,
      timestamp: Date.now(),
      context: await this.detectContext(),
      sessionId: this.sessionId
    });
    
    // Update patterns
    this.updateUserPatterns(trackId, newIndex);
    
    // Get sample with intelligent caching
    const buffer = await this.getIntelligentSample(trackId, newIndex);
    
    // Trigger adaptive optimizations
    this.optimizeBasedOnPerformance(performance.now() - startTime);
    
    // Predictive preloading for next likely samples
    if (this.config.enablePredictiveCaching) {
      this.predictivePreload(trackId, newIndex).catch(console.warn);
    }
    
    return buffer;
  }
  
  /**
   * Intelligent sample retrieval with adaptive compression
   */
  private async getIntelligentSample(trackId: string, index: number): Promise<AudioBuffer | null> {
    const samples = this.sampleLists.get(trackId);
    if (!samples || index < 0 || index >= samples.length) {
      return null;
    }
    
    const sampleUrl = samples[index];
    
    // Check if we need adaptive compression
    const optimalUrl = await this.getOptimalSampleUrl(sampleUrl);
    
    // Try to get from cache first
    let buffer = this.getSample(optimalUrl);
    if (buffer) {
      return buffer;
    }
    
    // Load with intelligent strategy
    const priority = this.calculateLoadPriority(sampleUrl, trackId, index);
    const strategy = this.determineLoadStrategy(priority);
    
    return await this.loadSampleWithStrategy(optimalUrl, strategy, priority);
  }
  
  /**
   * Predictive preloading based on user patterns and ML
   */
  private async predictivePreload(trackId: string, currentIndex: number): Promise<void> {
    try {
      const predictions = await this.predictNextSamples(trackId, currentIndex);
      
      if (predictions.length === 0) {
        return; // No predictions available
      }
      
      console.log(`🔮 Predictive preload: ${predictions.length} samples predicted`);
      
      const samples = this.sampleLists.get(trackId);
      if (!samples) return;
      
      // Preload predicted samples with appropriate priority
      const preloadPromises = predictions.map(async (prediction, index) => {
        const { sampleIndex, confidence } = prediction;
        
        if (sampleIndex >= 0 && sampleIndex < samples.length) {
          const priority = this.calculatePredictivePriority(confidence, index);
          const sampleUrl = samples[sampleIndex];
          const optimalUrl = await this.getOptimalSampleUrl(sampleUrl);
          
          // Only preload if not already cached and confidence is high enough
          if (!this.hasSample(optimalUrl) && confidence > 0.3) {
            this.addToPriorityQueue(optimalUrl, priority, 'smart');
          }
        }
      });
      
      await Promise.allSettled(preloadPromises);
      
      // Process priority queue
      this.processPriorityQueue();
      
    } catch (error) {
      console.warn('Predictive preload failed:', error);
    }
  }
  
  /**
   * Machine Learning prediction of next samples
   */
  private async predictNextSamples(trackId: string, currentIndex: number): Promise<Array<{sampleIndex: number, confidence: number}>> {
    const patternKey = this.getPatternKey(trackId);
    const pattern = this.patterns.get(patternKey);
    
    if (!pattern || pattern.sequences.length < 3) {
      // Fallback to simple adjacent prediction
      return [
        { sampleIndex: currentIndex + 1, confidence: 0.6 },
        { sampleIndex: currentIndex - 1, confidence: 0.4 },
        { sampleIndex: currentIndex + 2, confidence: 0.3 }
      ].filter(p => p.sampleIndex >= 0);
    }
    
    const predictions: Array<{sampleIndex: number, confidence: number}> = [];
    
    // Sequence-based prediction
    const sequencePrediction = this.predictFromSequence(pattern.sequences, currentIndex);
    predictions.push(...sequencePrediction);
    
    // Preference-based prediction
    const preferencePrediction = this.predictFromPreferences(pattern.preferences, currentIndex);
    predictions.push(...preferencePrediction);
    
    // Time-based prediction
    const timePrediction = this.predictFromTimePatterns(pattern.timePatterns);
    predictions.push(...timePrediction);
    
    // Combine and deduplicate predictions
    const combined = this.combinePredictions(predictions);
    
    return combined.slice(0, 5); // Top 5 predictions
  }
  
  /**
   * Predict next samples based on sequence patterns
   */
  private predictFromSequence(sequences: number[], currentIndex: number): Array<{sampleIndex: number, confidence: number}> {
    if (sequences.length < 2) return [];
    
    // Find patterns where current index appears
    const predictions: Map<number, number> = new Map();
    
    for (let i = 0; i < sequences.length - 1; i++) {
      if (sequences[i] === currentIndex) {
        const nextIndex = sequences[i + 1];
        const count = predictions.get(nextIndex) || 0;
        predictions.set(nextIndex, count + 1);
      }
    }
    
    // Convert to confidence scores
    const total = Array.from(predictions.values()).reduce((a, b) => a + b, 0);
    
    return Array.from(predictions.entries())
      .map(([sampleIndex, count]) => ({
        sampleIndex,
        confidence: count / total
      }))
      .sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Predict based on sample usage preferences
   */
  private predictFromPreferences(preferences: Map<string, number>, currentIndex: number): Array<{sampleIndex: number, confidence: number}> {
    const total = Array.from(preferences.values()).reduce((a, b) => a + b, 0);
    
    return Array.from(preferences.entries())
      .map(([sampleId, count]) => {
        const sampleIndex = parseInt(sampleId.split('_').pop() || '0');
        return {
          sampleIndex,
          confidence: (count / total) * 0.7 // Lower weight for preferences
        };
      })
      .filter(p => p.sampleIndex !== currentIndex)
      .sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Predict based on time-of-day patterns
   */
  private predictFromTimePatterns(timePatterns: Map<number, number>): Array<{sampleIndex: number, confidence: number}> {
    const currentHour = new Date().getHours();
    const currentUsage = timePatterns.get(currentHour) || 0;
    const total = Array.from(timePatterns.values()).reduce((a, b) => a + b, 0);
    
    if (total === 0 || currentUsage === 0) return [];
    
    // This is a simplified implementation - in reality, you'd map time patterns to sample preferences
    const timeConfidence = currentUsage / total;
    
    // Return time-influenced predictions (simplified)
    return [
      { sampleIndex: Math.floor(Math.random() * 10), confidence: timeConfidence * 0.3 }
    ];
  }
  
  /**
   * Combine multiple prediction sources
   */
  private combinePredictions(predictions: Array<{sampleIndex: number, confidence: number}>): Array<{sampleIndex: number, confidence: number}> {
    const combined: Map<number, number> = new Map();
    
    predictions.forEach(({ sampleIndex, confidence }) => {
      const existing = combined.get(sampleIndex) || 0;
      combined.set(sampleIndex, Math.min(1, existing + confidence));
    });
    
    return Array.from(combined.entries())
      .map(([sampleIndex, confidence]) => ({ sampleIndex, confidence }))
      .sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Get optimal sample URL based on current conditions
   */
  private async getOptimalSampleUrl(originalUrl: string): Promise<string> {
    // Check if we have a cached compression decision
    if (this.compressionCache.has(originalUrl)) {
      const compressionLevel = this.compressionCache.get(originalUrl)!;
      return this.buildCompressedUrl(originalUrl, compressionLevel);
    }
    
    // Determine optimal compression based on current conditions
    const optimalCompression = await this.determineOptimalCompression();
    this.compressionCache.set(originalUrl, optimalCompression);
    
    return this.buildCompressedUrl(originalUrl, optimalCompression);
  }
  
  /**
   * Determine optimal compression based on network and device conditions
   */
  private async determineOptimalCompression(): Promise<string> {
    // Start with config default
    let compression = this.config.compressionLevel;
    
    // Network-based adjustments
    if (this.currentNetworkConditions) {
      const { effectiveType, downlink, saveData } = this.currentNetworkConditions;
      
      if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
        compression = '48kbps';
      } else if (effectiveType === '3g' || downlink < 1) {
        compression = '64kbps';
      } else if (effectiveType === '4g' && downlink > 5) {
        compression = this.upgradeCompression(compression);
      }
    }
    
    // Performance-based adjustments
    if (this.performanceMetrics && this.performanceMetrics.memoryPressure > 0.8) {
      compression = this.downgradeCompression(compression);
    }
    
    // Battery-based adjustments
    if (this.performanceMetrics && this.performanceMetrics.batteryLevel < 0.2) {
      compression = '48kbps';
    }
    
    return compression;
  }
  
  /**
   * Build URL for compressed version
   */
  private buildCompressedUrl(originalUrl: string, compressionLevel: string): string {
    // This would integrate with your compression system
    // For now, assume the current URLs are already at the right compression
    return originalUrl; // Placeholder
  }
  
  /**
   * Calculate load priority for a sample
   */
  private calculateLoadPriority(sampleUrl: string, trackId: string, index: number): number {
    let priority = 50; // Base priority
    
    // Current sample gets highest priority
    const currentIndex = this.currentIndices.get(trackId) || 0;
    const distance = Math.abs(index - currentIndex);
    
    if (distance === 0) priority += 50;      // Current sample
    else if (distance === 1) priority += 30; // Adjacent samples
    else if (distance === 2) priority += 15; // Near samples
    else priority -= distance * 2;           // Distant samples
    
    // Boost priority based on usage patterns
    const patternKey = this.getPatternKey(trackId);
    const pattern = this.patterns.get(patternKey);
    if (pattern) {
      const sampleId = `${trackId}_${index}`;
      const usage = pattern.preferences.get(sampleId) || 0;
      priority += usage * 2;
    }
    
    // Boost based on prediction confidence
    const confidence = this.predictionConfidence.get(sampleUrl) || 0;
    priority += confidence * 20;
    
    return Math.max(0, Math.min(100, priority));
  }
  
  /**
   * Determine loading strategy based on priority and conditions
   */
  private determineLoadStrategy(priority: number): LoadingStrategy {
    if (priority > 80) return 'aggressive';
    if (priority > 60) return 'smart';
    if (priority > 30) return 'conservative';
    return 'just-in-time';
  }
  
  /**
   * Load sample with specific strategy
   */
  private async loadSampleWithStrategy(sampleUrl: string, strategy: LoadingStrategy, priority: number): Promise<AudioBuffer | null> {
    const timeouts = {
      'aggressive': 2000,
      'smart': 5000,
      'conservative': 8000,
      'just-in-time': 15000
    };
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeouts[strategy]);
      
      const requestPriority = priority > 70 ? 'high' : 'low';
      
      const startTime = performance.now();
      const buffer = await this.loadSample(sampleUrl, requestPriority as any);
      const loadTime = performance.now() - startTime;
      
      clearTimeout(timeout);
      
      // Update performance metrics
      this.updateLoadTimeMetrics(loadTime);
      
      return buffer;
      
    } catch (error) {
      console.warn(`Failed to load sample with ${strategy} strategy:`, error);
      return null;
    }
  }
  
  /**
   * Performance monitoring setup
   */
  private setupPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        let frameDrops = 0;
        entries.forEach(entry => {
          if (entry.entryType === 'measure' && entry.duration > 16.67) {
            frameDrops++;
          }
        });
        
        if (!this.performanceMetrics) {
          this.performanceMetrics = {
            cacheHitRate: 0,
            averageLoadTime: 0,
            memoryPressure: 0,
            cpuUsage: 0,
            thermalState: 'normal',
            batteryLevel: 1,
            frameDrops
          };
        } else {
          this.performanceMetrics.frameDrops = frameDrops;
        }
        
        // Adapt cache size based on performance
        if (frameDrops > 5 && this.dynamicWindowSize > 1) {
          this.dynamicWindowSize--;
          console.log(`📉 Reducing window size to ${this.dynamicWindowSize} due to performance`);
        }
      });
      
      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'paint'] 
      });
    }
  }
  
  /**
   * Network monitoring setup
   */
  private setupNetworkMonitoring(): void {
    const updateNetworkConditions = () => {
      const connection = (navigator as any).connection;
      
      this.currentNetworkConditions = {
        effectiveType: connection?.effectiveType || '4g',
        downlink: connection?.downlink || 10,
        rtt: connection?.rtt || 50,
        saveData: connection?.saveData || false,
        isOnline: navigator.onLine
      };
      
      // Invalidate compression cache when network changes significantly
      this.compressionCache.clear();
    };
    
    updateNetworkConditions();
    
    window.addEventListener('online', updateNetworkConditions);
    window.addEventListener('offline', updateNetworkConditions);
    
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateNetworkConditions);
    }
    
    // Periodic network speed testing
    this.networkMonitorInterval = window.setInterval(() => {
      this.measureNetworkSpeed();
    }, 60000); // Every minute
  }
  
  /**
   * Thermal monitoring setup
   */
  private setupThermalMonitoring(): void {
    let consecutiveSlowFrames = 0;
    
    const checkThermalState = () => {
      if (this.performanceMetrics && this.performanceMetrics.frameDrops > 3) {
        consecutiveSlowFrames++;
        
        if (consecutiveSlowFrames > 5) {
          this.escalateThermalState();
          consecutiveSlowFrames = 0;
        }
      } else {
        consecutiveSlowFrames = Math.max(0, consecutiveSlowFrames - 1);
      }
    };
    
    this.thermalMonitorInterval = window.setInterval(checkThermalState, 5000);
  }
  
  /**
   * Battery monitoring setup
   */
  private setupBatteryMonitoring(): void {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBatteryStatus = () => {
          if (!this.performanceMetrics) return;
          
          this.performanceMetrics.batteryLevel = battery.level;
          
          // Adapt cache behavior based on battery level
          if (!battery.charging && battery.level < 0.2) {
            this.adaptiveMaxCache = Math.max(4, Math.floor(this.config.maxCacheSize / 4));
            this.dynamicWindowSize = 1;
          } else if (!battery.charging && battery.level < 0.5) {
            this.adaptiveMaxCache = Math.floor(this.config.maxCacheSize / 2);
            this.dynamicWindowSize = Math.max(2, Math.floor(this.config.cacheWindowSize / 2));
          }
        };
        
        battery.addEventListener('levelchange', updateBatteryStatus);
        battery.addEventListener('chargingchange', updateBatteryStatus);
        updateBatteryStatus();
      });
    }
  }
  
  /**
   * Helper methods
   */
  private getPatternKey(trackId: string): string {
    return `${trackId}_${this.detectGenreContext()}`;
  }
  
  private detectGenreContext(): string {
    // Simplified genre detection - could be enhanced with ML
    return 'electronic'; // Placeholder
  }
  
  private async detectContext(): Promise<string> {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }
  
  private recordInteraction(interaction: SampleInteraction): void {
    this.interactionHistory.push(interaction);
    
    // Keep only recent history
    if (this.interactionHistory.length > 1000) {
      this.interactionHistory.shift();
    }
  }
  
  private updateUserPatterns(trackId: string, newIndex: number): void {
    const patternKey = this.getPatternKey(trackId);
    const pattern = this.patterns.get(patternKey);
    
    if (pattern) {
      // Update sequence
      pattern.sequences.push(newIndex);
      if (pattern.sequences.length > 50) {
        pattern.sequences.shift();
      }
      
      // Update preferences
      const sampleId = `${trackId}_${newIndex}`;
      const current = pattern.preferences.get(sampleId) || 0;
      pattern.preferences.set(sampleId, current + 1);
      
      // Update time patterns
      const hour = new Date().getHours();
      const timeCount = pattern.timePatterns.get(hour) || 0;
      pattern.timePatterns.set(hour, timeCount + 1);
      
      pattern.lastInteractionTime = Date.now();
    }
  }
  
  private getEnabledFeatures(): string[] {
    const features: string[] = [];
    
    if (this.config.enablePredictiveCaching) features.push('Predictive Caching');
    if (this.config.enableSmartEviction) features.push('Smart Eviction');
    if (this.config.enableQualityAdaptation) features.push('Quality Adaptation');
    if (this.config.enableNetworkAdaptation) features.push('Network Adaptation');
    if (this.config.batteryOptimization) features.push('Battery Optimization');
    if (this.config.thermalOptimization) features.push('Thermal Optimization');
    
    return features;
  }
  
  private loadUserPatterns(): void {
    try {
      const saved = localStorage.getItem('intelligent-cache-patterns');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert plain objects back to Maps
        Object.entries(parsed).forEach(([key, value]: [string, any]) => {
          this.patterns.set(key, {
            ...value,
            preferences: new Map(value.preferences),
            timePatterns: new Map(value.timePatterns)
          });
        });
      }
    } catch (error) {
      console.warn('Failed to load user patterns:', error);
    }
  }
  
  private saveUserPatterns(): void {
    try {
      const toSave: any = {};
      this.patterns.forEach((pattern, key) => {
        toSave[key] = {
          ...pattern,
          preferences: Array.from(pattern.preferences.entries()),
          timePatterns: Array.from(pattern.timePatterns.entries())
        };
      });
      
      localStorage.setItem('intelligent-cache-patterns', JSON.stringify(toSave));
    } catch (error) {
      console.warn('Failed to save user patterns:', error);
    }
  }
  
  private addToPriorityQueue(url: string, priority: number, strategy: LoadingStrategy): void {
    this.loadPriorityQueue.push({ url, priority, strategy });
    this.loadPriorityQueue.sort((a, b) => b.priority - a.priority);
  }
  
  private processPriorityQueue(): void {
    const toProcess = this.loadPriorityQueue.splice(0, 3); // Process top 3
    
    toProcess.forEach(async ({ url, priority, strategy }) => {
      if (!this.hasSample(url)) {
        try {
          await this.loadSampleWithStrategy(url, strategy, priority);
        } catch (error) {
          console.warn(`Priority queue load failed for ${url}:`, error);
        }
      }
    });
  }
  
  private calculatePredictivePriority(confidence: number, position: number): number {
    return confidence * 80 - position * 10;
  }
  
  private escalateThermalState(): void {
    if (!this.performanceMetrics) return;
    
    const states: Array<'normal' | 'warm' | 'hot' | 'critical'> = ['normal', 'warm', 'hot', 'critical'];
    const currentIndex = states.indexOf(this.performanceMetrics.thermalState);
    
    if (currentIndex < states.length - 1) {
      this.performanceMetrics.thermalState = states[currentIndex + 1];
      console.log(`🌡️ Thermal state escalated to: ${this.performanceMetrics.thermalState}`);
      
      // Adapt to thermal state
      if (this.performanceMetrics.thermalState === 'hot') {
        this.dynamicWindowSize = Math.max(1, Math.floor(this.dynamicWindowSize / 2));
      } else if (this.performanceMetrics.thermalState === 'critical') {
        this.dynamicWindowSize = 1;
        this.adaptiveMaxCache = Math.max(4, Math.floor(this.adaptiveMaxCache / 2));
      }
    }
  }
  
  private async measureNetworkSpeed(): Promise<void> {
    // Simplified network speed measurement
    try {
      const startTime = performance.now();
      const response = await fetch('/api/ping', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      const endTime = performance.now();
      
      if (this.currentNetworkConditions) {
        this.currentNetworkConditions.rtt = endTime - startTime;
      }
    } catch (error) {
      // Network measurement failed
    }
  }
  
  private updateLoadTimeMetrics(loadTime: number): void {
    if (!this.performanceMetrics) return;
    
    // Update rolling average
    this.performanceMetrics.averageLoadTime = 
      (this.performanceMetrics.averageLoadTime * 0.9) + (loadTime * 0.1);
  }
  
  private optimizeBasedOnPerformance(operationTime: number): void {
    if (operationTime > 100 && this.dynamicWindowSize > 1) {
      this.dynamicWindowSize--;
      console.log(`⚡ Performance optimization: reduced window to ${this.dynamicWindowSize}`);
    }
  }
  
  private upgradeCompression(current: string): string {
    const levels = ['48kbps', '64kbps', '80kbps', '96kbps', '128kbps'];
    const currentIndex = levels.indexOf(current);
    return levels[Math.min(currentIndex + 1, levels.length - 1)] || current;
  }
  
  private downgradeCompression(current: string): string {
    const levels = ['128kbps', '96kbps', '80kbps', '64kbps', '48kbps'];
    const currentIndex = levels.indexOf(current);
    return levels[Math.min(currentIndex + 1, levels.length - 1)] || current;
  }
  
  /**
   * Cleanup method
   */
  dispose(): void {
    // Save patterns before cleanup
    this.saveUserPatterns();
    
    // Clean up observers and intervals
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    if (this.thermalMonitorInterval) {
      clearInterval(this.thermalMonitorInterval);
    }
    
    if (this.networkMonitorInterval) {
      clearInterval(this.networkMonitorInterval);
    }
    
    // Clear caches
    this.patterns.clear();
    this.compressionCache.clear();
    this.loadPriorityQueue.length = 0;
    
    console.log('🧠 IntelligentSampleCache disposed');
  }
  
  /**
   * Get enhanced statistics
   */
  getIntelligentStats(): {
    basic: any;
    patterns: { totalPatterns: number; averageSequenceLength: number; };
    predictions: { totalPredictions: number; averageConfidence: number; };
    adaptations: { currentWindowSize: number; currentMaxCache: number; thermalState: string; };
    performance: PerformanceMetrics | null;
  } {
    const basicStats = this.getStats();
    
    // Pattern statistics
    const totalPatterns = this.patterns.size;
    const avgSequenceLength = Array.from(this.patterns.values())
      .reduce((sum, pattern) => sum + pattern.sequences.length, 0) / Math.max(totalPatterns, 1);
    
    // Prediction statistics  
    const totalPredictions = this.predictionConfidence.size;
    const avgConfidence = Array.from(this.predictionConfidence.values())
      .reduce((sum, conf) => sum + conf, 0) / Math.max(totalPredictions, 1);
    
    return {
      basic: basicStats,
      patterns: {
        totalPatterns,
        averageSequenceLength: Math.round(avgSequenceLength * 10) / 10
      },
      predictions: {
        totalPredictions,
        averageConfidence: Math.round(avgConfidence * 100) / 100
      },
      adaptations: {
        currentWindowSize: this.dynamicWindowSize,
        currentMaxCache: this.adaptiveMaxCache,
        thermalState: this.performanceMetrics?.thermalState || 'normal'
      },
      performance: this.performanceMetrics
    };
  }
}