/**
 * Adaptive Mobile Audio System v7.3.5
 * Comprehensive mobile optimization for ALL low-power devices
 * Integrates with existing lazy loading and 64kbps MP3 optimizations
 */

export interface DeviceCapabilities {
  cpuCores: number;
  memoryGB: number;
  estimatedCpuSpeed: 'low' | 'medium' | 'high';
  networkSpeed: 'slow' | 'medium' | 'fast';
  batteryLevel?: number;
  isMobile: boolean;
  isTablet: boolean;
  userAgent: string;
}

export interface AdaptiveAudioConfig {
  deviceTier: 'desktop-high' | 'desktop-standard' | 'mobile-high' | 'mobile-medium' | 'mobile-low' | 'mobile-problem';
  audioQuality: 'high' | 'medium' | 'low' | 'safe';
  recommendedSampleRate: number;
  maxPolyphony: number;
  preloadStrategy: 'aggressive' | 'moderate' | 'lazy' | 'minimal';
  use64kbpsPriority: boolean;
  memoryLimitMB: number;
  capabilities: DeviceCapabilities;
  reason: string;
}

export interface QualitySettings {
  sampleFormat: 'mp3-64' | 'mp3-128' | 'mp3-320';
  maxConcurrentLoads: number;
  cacheStrategy: 'aggressive' | 'moderate' | 'conservative';
  preloadCount: number;
}

export class AdaptiveMobileAudioSystem {
  private static instance: AdaptiveMobileAudioSystem | null = null;
  private static currentConfig: AdaptiveAudioConfig | null = null;
  private static isInitialized = false;

  static async initialize(): Promise<AdaptiveAudioConfig> {
    if (this.isInitialized && this.currentConfig) {
      return this.currentConfig;
    }

    console.log('🚀 Initializing Adaptive Mobile Audio System v7.3.5');
    
    try {
      // Detect device capabilities
      const capabilities = await this.detectDeviceCapabilities();
      console.log('📱 Device capabilities detected:', capabilities);
      
      // Classify device tier
      const config = this.classifyDeviceTier(capabilities);
      console.log('🎯 Device classified as:', config.deviceTier);
      
      this.currentConfig = config;
      this.isInitialized = true;
      
      // Expose to window for testing
      // @ts-ignore
      window.AdaptiveMobileAudioSystem = this;
      
      // Dispatch configuration event
      this.dispatchConfigurationChange(config, 'Initial configuration');
      
      return config;
    } catch (error) {
      console.error('❌ Failed to initialize Adaptive Mobile Audio System:', error);
      // Fallback to conservative mobile configuration
      const fallbackConfig = this.createFallbackConfig();
      this.currentConfig = fallbackConfig;
      this.isInitialized = true;
      return fallbackConfig;
    }
  }

  private static async detectDeviceCapabilities(): Promise<DeviceCapabilities> {
    const userAgent = navigator.userAgent;
    
    // CPU detection
    const cpuCores = navigator.hardwareConcurrency || 4;
    const estimatedCpuSpeed = await this.estimateCpuPerformance();
    
    // Memory detection
    const memoryGB = this.estimateMemoryCapacity();
    
    // Network detection
    const networkSpeed = await this.detectNetworkSpeed();
    
    // Battery detection
    const batteryLevel = await this.getBatteryLevel();
    
    // Device type detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?=.*Tablet)|TabletOS/i.test(userAgent);
    
    return {
      cpuCores,
      memoryGB,
      estimatedCpuSpeed,
      networkSpeed,
      batteryLevel,
      isMobile,
      isTablet,
      userAgent
    };
  }

  private static async estimateCpuPerformance(): Promise<'low' | 'medium' | 'high'> {
    const iterations = 100000;
    const startTime = performance.now();
    
    let result = 0;
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(Math.random() * i) + Math.sin(i * 0.01);
    }
    
    const timeMs = performance.now() - startTime;
    const opsPerMs = iterations / timeMs;
    
    console.log(`🔬 CPU benchmark: ${opsPerMs.toFixed(1)} ops/ms`);
    return opsPerMs > 50 ? 'high' : opsPerMs > 20 ? 'medium' : 'low';
  }

  private static estimateMemoryCapacity(): number {
    // Try actual device memory API
    // @ts-ignore
    if (navigator.deviceMemory) {
      // @ts-ignore
      return navigator.deviceMemory;
    }
    
    const userAgent = navigator.userAgent;
    
    // iPhone patterns
    if (/iPhone1[5-9]/.test(userAgent)) return 8; // iPhone 15+
    if (/iPhone1[4]/.test(userAgent)) return 6; // iPhone 14
    if (/iPhone1[0-3]/.test(userAgent)) return 4; // iPhone 10-13
    if (/iPhone[89]/.test(userAgent)) return 3; // iPhone 8-9
    if (/iPhone[67]/.test(userAgent)) return 2; // iPhone 6-7
    
    // iPad patterns
    if (/iPad/.test(userAgent)) {
      if (/Pro/.test(userAgent)) return 8; // iPad Pro
      return 4; // Regular iPad
    }
    
    // Android patterns
    if (/Android/.test(userAgent)) {
      if (/Galaxy S2[0-9]/.test(userAgent)) return 12; // Galaxy S20+
      if (/Galaxy S1[0-9]/.test(userAgent)) return 8; // Galaxy S10-19
      if (/Pixel [6-9]/.test(userAgent)) return 8; // Pixel 6+
      return 4; // Default Android
    }
    
    return 8; // Desktop default
  }

  private static async detectNetworkSpeed(): Promise<'slow' | 'medium' | 'fast'> {
    try {
      // Try Navigator Connection API
      // @ts-ignore
      const connection = navigator.connection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        if (effectiveType === '4g' && connection.downlink > 10) return 'fast';
        if (effectiveType === '4g' || effectiveType === '3g') return 'medium';
        return 'slow';
      }
      
      // Fallback: small download test
      const startTime = performance.now();
      await fetch('/favicon.ico', { cache: 'no-cache' });
      const timeMs = performance.now() - startTime;
      
      console.log(`🌐 Network test: ${timeMs.toFixed(0)}ms`);
      return timeMs < 100 ? 'fast' : timeMs < 300 ? 'medium' : 'slow';
    } catch (error) {
      console.warn('Network speed detection failed:', error);
      return 'medium';
    }
  }

  private static async getBatteryLevel(): Promise<number | undefined> {
    try {
      // @ts-ignore
      const battery = await navigator.getBattery?.();
      return battery ? Math.round(battery.level * 100) : undefined;
    } catch {
      return undefined;
    }
  }

  private static classifyDeviceTier(capabilities: DeviceCapabilities): AdaptiveAudioConfig {
    const { cpuCores, memoryGB, estimatedCpuSpeed, networkSpeed, batteryLevel, isMobile, userAgent } = capabilities;
    
    // Check for known problematic devices first
    if (this.isIPadPro(userAgent)) {
      return {
        deviceTier: 'mobile-problem',
        audioQuality: 'safe',
        recommendedSampleRate: 44100, // CRITICAL: Prevents iPad Pro audio corruption
        maxPolyphony: 6,
        preloadStrategy: 'minimal',
        use64kbpsPriority: true,
        memoryLimitMB: 100,
        capabilities,
        reason: 'iPad Pro 12" detected - using 44.1kHz to prevent audio corruption'
      };
    }
    
    // Desktop classification
    if (!isMobile) {
      if (cpuCores >= 8 && memoryGB >= 8 && estimatedCpuSpeed === 'high') {
        return {
          deviceTier: 'desktop-high',
          audioQuality: 'high',
          recommendedSampleRate: 48000,
          maxPolyphony: 16,
          preloadStrategy: 'aggressive',
          use64kbpsPriority: false,
          memoryLimitMB: 500,
          capabilities,
          reason: 'High-performance desktop - optimal settings'
        };
      } else {
        return {
          deviceTier: 'desktop-standard',
          audioQuality: 'high',
          recommendedSampleRate: 48000,
          maxPolyphony: 12,
          preloadStrategy: 'moderate',
          use64kbpsPriority: false,
          memoryLimitMB: 300,
          capabilities,
          reason: 'Standard desktop - high quality settings'
        };
      }
    }
    
    // Mobile classification
    const isLowBattery = batteryLevel !== undefined && batteryLevel < 20;
    const isSlowNetwork = networkSpeed === 'slow';
    
    // High-end mobile
    if (cpuCores >= 6 && memoryGB >= 4 && estimatedCpuSpeed === 'high' && !isLowBattery) {
      return {
        deviceTier: 'mobile-high',
        audioQuality: 'medium',
        recommendedSampleRate: 48000,
        maxPolyphony: 10,
        preloadStrategy: 'moderate',
        use64kbpsPriority: isSlowNetwork,
        memoryLimitMB: 200,
        capabilities,
        reason: 'High-end mobile - good performance settings'
      };
    }
    
    // Mid-range mobile
    if (cpuCores >= 4 && memoryGB >= 3) {
      return {
        deviceTier: 'mobile-medium',
        audioQuality: 'medium',
        recommendedSampleRate: 44100,
        maxPolyphony: 8,
        preloadStrategy: 'lazy',
        use64kbpsPriority: true, // Always use 64kbps for mid-range devices
        memoryLimitMB: 150,
        capabilities,
        reason: 'Mid-range mobile - balanced settings with 64kbps priority'
      };
    }
    
    // Low-power mobile
    return {
      deviceTier: 'mobile-low',
      audioQuality: 'low',
      recommendedSampleRate: 44100,
      maxPolyphony: 6,
      preloadStrategy: 'lazy',
      use64kbpsPriority: true, // Critical for low-power devices
      memoryLimitMB: 100,
      capabilities,
      reason: 'Low-power mobile - conservative settings with 64kbps optimization'
    };
  }

  private static isIPadPro(userAgent: string): boolean {
    // Detect iPad Pro 12" models that have audio corruption issues
    return /iPad/.test(userAgent) && /Pro/.test(userAgent);
  }

  private static createFallbackConfig(): AdaptiveAudioConfig {
    return {
      deviceTier: 'mobile-low',
      audioQuality: 'safe',
      recommendedSampleRate: 44100,
      maxPolyphony: 4,
      preloadStrategy: 'minimal',
      use64kbpsPriority: true,
      memoryLimitMB: 80,
      capabilities: {
        cpuCores: 2,
        memoryGB: 2,
        estimatedCpuSpeed: 'low',
        networkSpeed: 'slow',
        isMobile: true,
        isTablet: false,
        userAgent: navigator.userAgent
      },
      reason: 'Fallback configuration - ultra-conservative settings'
    };
  }

  static async createOptimizedAudioContext(): Promise<AudioContext> {
    const config = this.currentConfig || await this.initialize();
    
    const audioContext = new AudioContext({
      sampleRate: config.recommendedSampleRate,
      latencyHint: config.audioQuality === 'high' ? 'interactive' : 'balanced'
    });
    
    console.log(`🎵 Optimized AudioContext created: ${audioContext.sampleRate}Hz for ${config.deviceTier}`);
    return audioContext;
  }

  static getQualitySettings(config: AdaptiveAudioConfig): QualitySettings {
    switch (config.audioQuality) {
      case 'high':
        return {
          sampleFormat: config.use64kbpsPriority ? 'mp3-128' : 'mp3-320',
          maxConcurrentLoads: 8,
          cacheStrategy: 'aggressive',
          preloadCount: 6
        };
      case 'medium':
        return {
          sampleFormat: config.use64kbpsPriority ? 'mp3-64' : 'mp3-128',
          maxConcurrentLoads: 4,
          cacheStrategy: 'moderate',
          preloadCount: 4
        };
      case 'low':
        return {
          sampleFormat: 'mp3-64', // Always 64kbps for low-power devices
          maxConcurrentLoads: 2,
          cacheStrategy: 'conservative',
          preloadCount: 2
        };
      case 'safe':
        return {
          sampleFormat: 'mp3-64', // Ultra-conservative
          maxConcurrentLoads: 1,
          cacheStrategy: 'conservative',
          preloadCount: 1
        };
    }
  }

  static getRecommendations(config: AdaptiveAudioConfig): string[] {
    const recommendations: string[] = [];
    
    if (config.use64kbpsPriority) {
      recommendations.push('Using 64kbps MP3 for faster loading and reduced memory usage');
    }
    
    if (config.preloadStrategy === 'lazy' || config.preloadStrategy === 'minimal') {
      recommendations.push('Lazy loading enabled - samples load on demand');
    }
    
    if (config.capabilities.batteryLevel !== undefined && config.capabilities.batteryLevel < 30) {
      recommendations.push('Battery optimization active - reduced quality to save power');
    }
    
    if (config.deviceTier === 'mobile-problem') {
      recommendations.push('Problem device mode - using proven stable settings');
    }
    
    if (config.recommendedSampleRate === 44100) {
      recommendations.push('Using 44.1kHz sample rate for maximum compatibility');
    }
    
    return recommendations;
  }

  static async monitorPerformance(): Promise<{
    shouldDegrade: boolean;
    newConfig?: AdaptiveAudioConfig;
    reason: string;
  }> {
    if (!this.currentConfig) {
      return { shouldDegrade: false, reason: 'No configuration available' };
    }
    
    try {
      const currentCpuSpeed = await this.estimateCpuPerformance();
      const batteryLevel = await this.getBatteryLevel();
      
      // Check if we need to degrade
      const shouldDegrade = 
        currentCpuSpeed === 'low' ||
        (batteryLevel !== undefined && batteryLevel < 15);
      
      if (shouldDegrade && this.currentConfig.deviceTier !== 'mobile-problem') {
        const degradedConfig = { ...this.currentConfig };
        degradedConfig.audioQuality = 'safe';
        degradedConfig.use64kbpsPriority = true;
        degradedConfig.maxPolyphony = Math.max(4, degradedConfig.maxPolyphony - 2);
        
        this.currentConfig = degradedConfig;
        this.dispatchConfigurationChange(degradedConfig, 'Performance degradation');
        
        return {
          shouldDegrade: true,
          newConfig: degradedConfig,
          reason: `Performance issue detected: CPU=${currentCpuSpeed}, Battery=${batteryLevel}%`
        };
      }
      
      return { shouldDegrade: false, reason: 'Performance acceptable' };
    } catch (error) {
      return { shouldDegrade: false, reason: `Monitoring failed: ${error.message}` };
    }
  }

  static async getDiagnosticInfo(): Promise<{
    config: AdaptiveAudioConfig;
    systemInfo: any;
    recommendations: string[];
  }> {
    const config = this.currentConfig || await this.initialize();
    const recommendations = this.getRecommendations(config);
    
    const systemInfo = {
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      // @ts-ignore
      deviceMemory: navigator.deviceMemory,
      // @ts-ignore
      connection: navigator.connection ? {
        // @ts-ignore
        effectiveType: navigator.connection.effectiveType,
        // @ts-ignore
        downlink: navigator.connection.downlink
      } : null
    };
    
    return {
      config,
      systemInfo,
      recommendations
    };
  }

  private static dispatchConfigurationChange(config: AdaptiveAudioConfig, reason: string) {
    const event = new CustomEvent('audioConfigChanged', {
      detail: { config, reason }
    });
    window.dispatchEvent(event);
  }

  static getOptimalAudioConfig(): Promise<AdaptiveAudioConfig> {
    return this.initialize();
  }
}

// Export for use in other components
export { AdaptiveMobileAudioSystem };