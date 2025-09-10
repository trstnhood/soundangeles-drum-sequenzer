/**
 * Adaptive Device Audio Configuration - Enhanced Intelligence System
 * Extends existing DeviceAudioConfig with 4-tier classification and real-time adaptation
 * 
 * INTEGRATION: Drop-in replacement for DeviceAudioConfigManager
 * FALLBACK: Automatic downgrade to original system on any failure
 */

export type DeviceTier = 'tier1' | 'tier2' | 'tier3' | 'tier4';
export type LoadingStrategy = 'aggressive' | 'smart' | 'conservative' | 'just-in-time';
export type AudioQuality = 'high' | 'medium' | 'low' | 'minimal' | 'auto';

export interface AdaptiveDeviceCapabilities {
  // Hardware Detection
  cpu: 'high' | 'medium' | 'low';
  memory: number; // GB
  storage: 'ssd' | 'emmc' | 'unknown';
  
  // Performance Indicators  
  devicePixelRatio: number;
  hardwareConcurrency: number;
  maxTouchPoints: number;
  
  // Network & Battery
  connection: NetworkInformation | null;
  batteryLevel?: number;
  isCharging?: boolean;
  effectiveType?: string;
  downlink?: number;
  
  // Audio Capabilities
  audioSampleRate: number;
  audioChannels: number;
  audioLatency: number;
  
  // Device Classification
  deviceType: 'desktop' | 'iphone' | 'ipad-pro' | 'ipad' | 'android' | 'mobile-other';
  tier: DeviceTier;
}

export interface AdaptiveMobileAudioConfig {
  // Enhanced audio config
  sampleRate: number;
  fallbackSampleRate?: number;
  scheduleAheadTime: number;
  bufferSize: 1024 | 2048 | 4096 | 8192;
  
  // Adaptive caching
  cacheWindowSize: number;      // ±N samples
  maxCacheSize: number;         // Total samples in memory
  compressionLevel: string;     // '128kbps' | '96kbps' | '80kbps' | '64kbps' | '48kbps'
  
  // Loading strategies
  preloadStrategy: LoadingStrategy;
  networkTolerance: 'high' | 'medium' | 'low' | 'critical';
  
  // Optimizations
  batteryOptimization: boolean;
  thermalOptimization: boolean;
  memoryOptimization: boolean;
  
  // Device info
  deviceType: string;
  deviceTier: DeviceTier;
  deviceInfo: string;
  reason: string;
  
  // Adaptive features
  enablePredictiveCaching: boolean;
  enableSmartEviction: boolean;
  enableQualityAdaptation: boolean;
  enableNetworkAdaptation: boolean;
}

export class AdaptiveDeviceAudioConfigManager {
  private static instance: AdaptiveDeviceAudioConfigManager | null = null;
  private currentCapabilities: AdaptiveDeviceCapabilities | null = null;
  private currentConfig: AdaptiveMobileAudioConfig | null = null;
  private performanceHistory: number[] = [];
  private lastUpdate: number = 0;
  private updateInterval: number = 30000; // 30 seconds
  
  // Fallback to original system
  private static fallbackMode = false;
  
  constructor() {
    this.setupPerformanceMonitoring();
    this.setupAdaptiveUpdates();
  }
  
  static getInstance(): AdaptiveDeviceAudioConfigManager {
    if (!this.instance) {
      this.instance = new AdaptiveDeviceAudioConfigManager();
    }
    return this.instance;
  }
  
  /**
   * Main entry point - Enhanced device detection with fallback
   */
  static async getOptimalAudioConfig(): Promise<AdaptiveMobileAudioConfig> {
    try {
      if (this.fallbackMode) {
        console.log('🛡️ Using fallback mode - original DeviceAudioConfig');
        return this.getFallbackConfig();
      }
      
      const manager = this.getInstance();
      return await manager.getAdaptiveConfig();
      
    } catch (error) {
      console.error('❌ Adaptive config failed, falling back:', error);
      this.fallbackMode = true;
      return this.getFallbackConfig();
    }
  }
  
  /**
   * Get adaptive configuration with real-time optimization
   */
  async getAdaptiveConfig(): Promise<AdaptiveMobileAudioConfig> {
    const now = Date.now();
    
    // Use cached config if recent and performance is stable
    if (this.currentConfig && 
        now - this.lastUpdate < this.updateInterval && 
        this.isPerformanceStable()) {
      return this.currentConfig;
    }
    
    console.log('🔄 Updating adaptive audio configuration...');
    
    // Detect current device capabilities
    this.currentCapabilities = await this.detectDeviceCapabilities();
    
    // Generate optimal configuration
    const baseConfig = this.generateTierConfig(this.currentCapabilities.tier);
    const adaptedConfig = await this.applyRealTimeAdaptations(baseConfig, this.currentCapabilities);
    
    this.currentConfig = adaptedConfig;
    this.lastUpdate = now;
    
    console.log(`✅ Adaptive config updated: ${adaptedConfig.deviceTier} | ${adaptedConfig.compressionLevel} | ${adaptedConfig.preloadStrategy}`);
    
    return adaptedConfig;
  }
  
  /**
   * Enhanced device capability detection
   */
  async detectDeviceCapabilities(): Promise<AdaptiveDeviceCapabilities> {
    const nav = navigator as any;
    const userAgent = navigator.userAgent;
    
    // Basic device type detection (reuse existing logic)
    const deviceType = this.detectBasicDeviceType(userAgent);
    
    // CPU Performance benchmark
    const cpuPerformance = await this.benchmarkCPU();
    
    // Memory detection
    const memory = nav.deviceMemory || this.estimateMemoryFromUserAgent(userAgent);
    
    // Network capabilities
    const connection = nav.connection || null;
    const networkSpeed = await this.measureNetworkSpeed();
    
    // Battery status
    const { batteryLevel, isCharging } = await this.getBatteryInfo();
    
    // Audio capabilities
    const audioCapabilities = await this.detectAudioCapabilities();
    
    // Classify device tier based on all factors
    const capabilities: AdaptiveDeviceCapabilities = {
      cpu: cpuPerformance,
      memory,
      storage: this.detectStorageType(),
      devicePixelRatio: window.devicePixelRatio,
      hardwareConcurrency: nav.hardwareConcurrency || 4,
      maxTouchPoints: nav.maxTouchPoints || 1,
      connection,
      batteryLevel,
      isCharging,
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 1,
      audioSampleRate: audioCapabilities.sampleRate,
      audioChannels: 2,
      audioLatency: audioCapabilities.latency,
      deviceType,
      tier: 'tier2' // Will be calculated below
    };
    
    capabilities.tier = this.classifyDeviceTier(capabilities);
    
    console.log(`🔍 Device capabilities detected:`, {
      type: deviceType,
      tier: capabilities.tier,
      cpu: cpuPerformance,
      memory: `${memory}GB`,
      network: capabilities.effectiveType,
      battery: batteryLevel ? `${Math.round(batteryLevel * 100)}%` : 'unknown'
    });
    
    return capabilities;
  }
  
  /**
   * CPU Performance Benchmark (non-blocking)
   */
  private async benchmarkCPU(): Promise<'high' | 'medium' | 'low'> {
    return new Promise((resolve) => {
      // Use requestIdleCallback for non-blocking benchmark
      const callback = (deadline: IdleDeadline) => {
        const startTime = performance.now();
        let operations = 0;
        
        // Perform operations until we run out of idle time
        while (deadline.timeRemaining() > 0 && operations < 100000) {
          Math.random() * Math.random();
          operations++;
        }
        
        const endTime = performance.now();
        const opsPerMs = operations / (endTime - startTime);
        
        if (opsPerMs > 5000) resolve('high');
        else if (opsPerMs > 2000) resolve('medium');
        else resolve('low');
      };
      
      if ('requestIdleCallback' in window) {
        requestIdleCallback(callback, { timeout: 1000 });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => callback({ timeRemaining: () => 50 } as IdleDeadline), 0);
      }
    });
  }
  
  /**
   * Device tier classification using multi-factor scoring
   */
  private classifyDeviceTier(caps: AdaptiveDeviceCapabilities): DeviceTier {
    let score = 0;
    
    // CPU Performance (35% weight)
    score += caps.cpu === 'high' ? 35 : caps.cpu === 'medium' ? 20 : 8;
    
    // Memory (30% weight)  
    score += Math.min(caps.memory * 6, 30);
    
    // Device characteristics (25% weight)
    if (caps.devicePixelRatio >= 3) score += 8;
    if (caps.hardwareConcurrency >= 8) score += 8;
    if (caps.deviceType === 'iphone' || caps.deviceType === 'ipad') score += 9;
    
    // Network quality (10% weight)
    if (caps.effectiveType === '4g' || caps.effectiveType === '5g') score += 5;
    else if (caps.effectiveType === '3g') score += 3;
    else score += 1;
    
    // Special handling for known problem devices
    if (caps.deviceType === 'ipad-pro') {
      return 'tier4'; // Known audio issues
    }
    
    // Tier classification
    if (score >= 75) return 'tier1';
    if (score >= 50) return 'tier2';
    if (score >= 25) return 'tier3';
    return 'tier4';
  }
  
  /**
   * Generate base configuration for device tier
   */
  private generateTierConfig(tier: DeviceTier): AdaptiveMobileAudioConfig {
    const configs = {
      tier1: {
        sampleRate: 48000,
        bufferSize: 1024 as const,
        cacheWindowSize: 6,
        maxCacheSize: 64,
        compressionLevel: '96kbps',
        preloadStrategy: 'aggressive' as LoadingStrategy,
        networkTolerance: 'high' as const,
        batteryOptimization: false,
        thermalOptimization: true,
        scheduleAheadTime: 0.05
      },
      tier2: {
        sampleRate: 44100,
        bufferSize: 2048 as const,
        cacheWindowSize: 4,
        maxCacheSize: 32,
        compressionLevel: '80kbps',
        preloadStrategy: 'smart' as LoadingStrategy,
        networkTolerance: 'medium' as const,
        batteryOptimization: true,
        thermalOptimization: true,
        scheduleAheadTime: 0.08
      },
      tier3: {
        sampleRate: 44100,
        bufferSize: 4096 as const,
        cacheWindowSize: 2,
        maxCacheSize: 16,
        compressionLevel: '64kbps',
        preloadStrategy: 'conservative' as LoadingStrategy,
        networkTolerance: 'low' as const,
        batteryOptimization: true,
        thermalOptimization: true,
        scheduleAheadTime: 0.12
      },
      tier4: {
        sampleRate: 44100, // Fixed for iPad Pro
        bufferSize: 8192 as const,
        cacheWindowSize: 1,
        maxCacheSize: 8,
        compressionLevel: '48kbps',
        preloadStrategy: 'just-in-time' as LoadingStrategy,
        networkTolerance: 'critical' as const,
        batteryOptimization: true,
        thermalOptimization: true,
        scheduleAheadTime: 0.15
      }
    };
    
    const base = configs[tier];
    
    return {
      ...base,
      fallbackSampleRate: 22050,
      memoryOptimization: true,
      deviceType: this.currentCapabilities?.deviceType || 'unknown',
      deviceTier: tier,
      deviceInfo: `${tier.toUpperCase()} Mobile Device`,
      reason: `Adaptive configuration for ${tier} performance tier`,
      enablePredictiveCaching: tier === 'tier1' || tier === 'tier2',
      enableSmartEviction: true,
      enableQualityAdaptation: true,
      enableNetworkAdaptation: tier !== 'tier4'
    };
  }
  
  /**
   * Apply real-time adaptations based on current conditions
   */
  private async applyRealTimeAdaptations(
    config: AdaptiveMobileAudioConfig, 
    capabilities: AdaptiveDeviceCapabilities
  ): Promise<AdaptiveMobileAudioConfig> {
    let adapted = { ...config };
    
    // Battery-based adaptations
    if (capabilities.batteryLevel && capabilities.batteryLevel < 0.2 && !capabilities.isCharging) {
      console.log('🔋 Low battery detected - enabling power save mode');
      adapted.compressionLevel = '48kbps';
      adapted.cacheWindowSize = Math.max(1, Math.floor(adapted.cacheWindowSize / 2));
      adapted.preloadStrategy = 'just-in-time';
      adapted.batteryOptimization = true;
    }
    
    // Network-based adaptations
    if (capabilities.connection) {
      const { effectiveType, downlink } = capabilities.connection;
      
      if (effectiveType === 'slow-2g' || effectiveType === '2g' || (downlink && downlink < 0.5)) {
        console.log('🌐 Slow network detected - optimizing for bandwidth');
        adapted.compressionLevel = this.downgradeCompression(adapted.compressionLevel);
        adapted.preloadStrategy = 'conservative';
        adapted.networkTolerance = 'critical';
      }
    }
    
    // Performance-based adaptations
    if (this.performanceHistory.length > 5) {
      const avgPerformance = this.performanceHistory.reduce((a, b) => a + b) / this.performanceHistory.length;
      
      if (avgPerformance > 20) { // High frame times indicate performance issues
        console.log('⚡ Performance issues detected - reducing load');
        adapted.cacheWindowSize = Math.max(1, adapted.cacheWindowSize - 1);
        adapted.compressionLevel = this.downgradeCompression(adapted.compressionLevel);
      }
    }
    
    // Memory pressure adaptations
    if ('memory' in performance && (performance as any).memory) {
      const memInfo = (performance as any).memory;
      const memoryPressure = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
      
      if (memoryPressure > 0.8) {
        console.log('💾 High memory pressure - reducing cache');
        adapted.maxCacheSize = Math.max(4, Math.floor(adapted.maxCacheSize / 2));
        adapted.memoryOptimization = true;
      }
    }
    
    return adapted;
  }
  
  /**
   * Network speed measurement
   */
  private async measureNetworkSpeed(): Promise<number> {
    try {
      const startTime = performance.now();
      // Test with a small sample file (if available)
      const response = await fetch('/api/speed-test', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      const endTime = performance.now();
      
      if (response.ok) {
        const latency = endTime - startTime;
        return latency < 100 ? 10 : latency < 300 ? 5 : 1; // Rough estimate
      }
    } catch (error) {
      // Fallback to connection API
      const connection = (navigator as any).connection;
      return connection?.downlink || 1;
    }
    return 1;
  }
  
  /**
   * Battery information detection
   */
  private async getBatteryInfo(): Promise<{batteryLevel?: number, isCharging?: boolean}> {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        return {
          batteryLevel: battery.level,
          isCharging: battery.charging
        };
      }
    } catch (error) {
      // Battery API not available
    }
    return {};
  }
  
  /**
   * Audio capabilities detection
   */
  private async detectAudioCapabilities(): Promise<{sampleRate: number, latency: number}> {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const tempContext = new AudioContextClass();
      
      const sampleRate = tempContext.sampleRate;
      const latency = tempContext.baseLatency || 0.02; // 20ms default
      
      tempContext.close();
      
      return { sampleRate, latency };
    } catch (error) {
      return { sampleRate: 44100, latency: 0.02 };
    }
  }
  
  /**
   * Performance monitoring setup
   */
  private setupPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'measure' || entry.entryType === 'navigation') {
              this.performanceHistory.push(entry.duration);
              
              // Keep only recent history
              if (this.performanceHistory.length > 20) {
                this.performanceHistory.shift();
              }
            }
          });
        });
        
        observer.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        console.log('Performance monitoring not available');
      }
    }
  }
  
  /**
   * Adaptive update scheduling
   */
  private setupAdaptiveUpdates(): void {
    // Monitor for significant changes
    window.addEventListener('online', () => this.invalidateConfig());
    window.addEventListener('offline', () => this.invalidateConfig());
    
    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', () => {
        this.invalidateConfig();
      });
    }
  }
  
  /**
   * Helper methods
   */
  private invalidateConfig(): void {
    this.lastUpdate = 0; // Force recalculation on next request
  }
  
  private isPerformanceStable(): boolean {
    if (this.performanceHistory.length < 5) return true;
    
    const recent = this.performanceHistory.slice(-5);
    const variance = this.calculateVariance(recent);
    
    return variance < 100; // Stable if variance is low
  }
  
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    return squareDiffs.reduce((a, b) => a + b) / values.length;
  }
  
  private downgradeCompression(current: string): string {
    const levels = ['128kbps', '96kbps', '80kbps', '64kbps', '48kbps'];
    const currentIndex = levels.indexOf(current);
    return levels[Math.min(currentIndex + 1, levels.length - 1)] || current;
  }
  
  private detectBasicDeviceType(userAgent: string): AdaptiveDeviceCapabilities['deviceType'] {
    // Reuse existing logic from original DeviceAudioConfig
    if (/iPad.*OS.*Version.*Safari.*\(Version.*\)/.test(userAgent) && 
        this.hasHighResolutionIndicators()) {
      return 'ipad-pro';
    }
    if (/iPad/.test(userAgent)) return 'ipad';
    if (/iPhone/.test(userAgent)) return 'iphone';
    if (/Android/.test(userAgent)) return 'android';
    if (/iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(userAgent)) return 'mobile-other';
    return 'desktop';
  }
  
  private hasHighResolutionIndicators(): boolean {
    if (typeof window !== 'undefined' && window.screen) {
      const { width, height } = window.screen;
      const devicePixelRatio = window.devicePixelRatio || 1;
      
      const highResWidth = width * devicePixelRatio >= 2048;
      const highResHeight = height * devicePixelRatio >= 2732;
      const highDPR = devicePixelRatio >= 2;
      
      return (highResWidth || highResHeight) && highDPR;
    }
    return false;
  }
  
  private estimateMemoryFromUserAgent(userAgent: string): number {
    // Rough estimates based on device patterns
    if (/iPhone 1[2-9]|iPad Pro/.test(userAgent)) return 8;
    if (/iPhone [8-9]|iPad/.test(userAgent)) return 4;
    if (/iPhone [6-7]/.test(userAgent)) return 2;
    if (/Android.*[8-9]\.\d/.test(userAgent)) return 6;
    if (/Android.*[6-7]\.\d/.test(userAgent)) return 4;
    return 2; // Conservative fallback
  }
  
  private detectStorageType(): 'ssd' | 'emmc' | 'unknown' {
    // Detection heuristics based on performance
    const start = performance.now();
    localStorage.setItem('storage-test', 'test');
    const writeTime = performance.now() - start;
    localStorage.removeItem('storage-test');
    
    if (writeTime < 1) return 'ssd';
    if (writeTime < 5) return 'emmc';
    return 'unknown';
  }
  
  /**
   * Fallback to original DeviceAudioConfig system
   */
  private static getFallbackConfig(): AdaptiveMobileAudioConfig {
    const userAgent = navigator.userAgent;
    
    // Use original logic but return in new format
    let deviceType: AdaptiveDeviceCapabilities['deviceType'] = 'mobile-other';
    let sampleRate = 44100;
    let scheduleAheadTime = 0.08;
    
    if (/iPad/.test(userAgent)) {
      deviceType = /iPad.*OS.*Version.*Safari.*\(Version.*\)/.test(userAgent) ? 'ipad-pro' : 'ipad';
      sampleRate = 44100; // iPad Pro fix
      scheduleAheadTime = 0.15;
    } else if (/iPhone/.test(userAgent)) {
      deviceType = 'iphone';
      sampleRate = 48000;
      scheduleAheadTime = 0.15;
    } else if (/Android/.test(userAgent)) {
      deviceType = 'android';
    } else if (!/iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(userAgent)) {
      deviceType = 'desktop';
      sampleRate = 48000;
    }
    
    return {
      sampleRate,
      fallbackSampleRate: 22050,
      scheduleAheadTime,
      bufferSize: 2048,
      cacheWindowSize: 4,
      maxCacheSize: 32,
      compressionLevel: '80kbps',
      preloadStrategy: 'smart',
      networkTolerance: 'medium',
      batteryOptimization: deviceType !== 'desktop',
      thermalOptimization: true,
      memoryOptimization: true,
      deviceType,
      deviceTier: 'tier2',
      deviceInfo: `Fallback configuration for ${deviceType}`,
      reason: 'Using fallback mode due to adaptive system failure',
      enablePredictiveCaching: false,
      enableSmartEviction: true,
      enableQualityAdaptation: false,
      enableNetworkAdaptation: false
    };
  }
  
  /**
   * Create AudioContext with adaptive settings
   */
  static createOptimalAudioContext(): AudioContext {
    try {
      return AdaptiveDeviceAudioConfigManager.getInstance().createAdaptiveAudioContext();
    } catch (error) {
      console.error('❌ Adaptive AudioContext creation failed, using fallback');
      return this.createFallbackAudioContext();
    }
  }
  
  private createAdaptiveAudioContext(): AudioContext {
    if (!this.currentConfig) {
      throw new Error('No current configuration available');
    }
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    
    console.log(`🎵 Creating adaptive AudioContext:`);
    console.log(`   Sample Rate: ${this.currentConfig.sampleRate}Hz`);
    console.log(`   Buffer Size: ${this.currentConfig.bufferSize}`);
    console.log(`   Device Tier: ${this.currentConfig.deviceTier}`);
    
    const audioContext = new AudioContextClass({
      latencyHint: 'interactive',
      sampleRate: this.currentConfig.sampleRate
    });
    
    console.log(`✅ Adaptive AudioContext created successfully:`);
    console.log(`   Requested: ${this.currentConfig.sampleRate}Hz`);
    console.log(`   Actual: ${audioContext.sampleRate}Hz`);
    console.log(`   Tier: ${this.currentConfig.deviceTier}`);
    
    return audioContext;
  }
  
  private static createFallbackAudioContext(): AudioContext {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    return new AudioContextClass({ 
      latencyHint: 'interactive',
      sampleRate: 44100 
    });
  }
}