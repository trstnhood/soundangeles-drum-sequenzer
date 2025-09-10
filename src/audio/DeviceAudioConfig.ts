/**
 * Device-Specific Audio Configuration
 * CRITICAL FIX for iPad Pro 12" Audio Corruption
 * 
 * This utility provides device detection and appropriate sample rate selection
 * to fix the "komplett zerbrochene" audio on iPad Pro while maintaining
 * compatibility with Desktop (48kHz) and iPhone (48kHz).
 */

export interface DeviceAudioConfig {
  deviceType: 'desktop' | 'iphone' | 'ipad-pro' | 'ipad' | 'android' | 'mobile-other';
  recommendedSampleRate: number;
  deviceInfo: string;
  fallbackSampleRate?: number;
  scheduleAheadTime: number;
  reason: string;
}

export class DeviceAudioConfigManager {
  
  /**
   * Detect device type and return optimal audio configuration
   */
  static getOptimalAudioConfig(): DeviceAudioConfig {
    const userAgent = navigator.userAgent;
    
    console.log(`🔍 Device Detection - UserAgent: ${userAgent}`);
    
    // iPad Pro Detection (the problematic device)
    if (this.isIPadPro(userAgent)) {
      return {
        deviceType: 'ipad-pro',
        recommendedSampleRate: 44100,  // CRITICAL: 44.1kHz for iPad Pro
        fallbackSampleRate: 22050,     // Emergency fallback
        scheduleAheadTime: 0.15,       // 150ms for iOS stability
        deviceInfo: 'iPad Pro 12" (Audio Fix Applied)',
        reason: 'iPad Pro requires 44.1kHz to prevent audio corruption'
      };
    }
    
    // Regular iPad Detection  
    if (this.isIPad(userAgent)) {
      return {
        deviceType: 'ipad',
        recommendedSampleRate: 44100,  // Also use 44.1kHz for safety on other iPads
        fallbackSampleRate: 22050,
        scheduleAheadTime: 0.15,
        deviceInfo: 'iPad (Standard)',
        reason: 'iPad family uses 44.1kHz for audio stability'
      };
    }
    
    // iPhone Detection (keep working 48kHz)
    if (this.isIPhone(userAgent)) {
      return {
        deviceType: 'iphone',
        recommendedSampleRate: 48000,  // Keep working 48kHz
        fallbackSampleRate: 44100,
        scheduleAheadTime: 0.15,
        deviceInfo: 'iPhone (Optimized)',
        reason: 'iPhone works well with 48kHz'
      };
    }
    
    // Android Detection
    if (this.isAndroid(userAgent)) {
      return {
        deviceType: 'android',
        recommendedSampleRate: 44100,  // Conservative choice for Android
        fallbackSampleRate: 22050,
        scheduleAheadTime: 0.05,
        deviceInfo: 'Android Device',
        reason: 'Android generally prefers 44.1kHz'
      };
    }
    
    // Mobile Other (catch-all)
    if (this.isMobile(userAgent)) {
      return {
        deviceType: 'mobile-other',
        recommendedSampleRate: 44100,  // Safe choice for unknown mobile
        fallbackSampleRate: 22050,
        scheduleAheadTime: 0.08,
        deviceInfo: 'Mobile Device (Unknown)',
        reason: 'Conservative 44.1kHz for unknown mobile device'
      };
    }
    
    // Desktop (keep working 48kHz)
    return {
      deviceType: 'desktop',
      recommendedSampleRate: 48000,  // Keep working 48kHz
      fallbackSampleRate: 44100,
      scheduleAheadTime: 0.08,
      deviceInfo: 'Desktop/Laptop',
      reason: 'Desktop systems handle 48kHz well'
    };
  }
  
  /**
   * Detect iPad Pro specifically (the problem device)
   * iPad Pro has distinctive characteristics in UserAgent
   */
  private static isIPadPro(userAgent: string): boolean {
    // iPad Pro detection patterns
    const patterns = [
      /iPad.*OS.*Version.*Safari.*\(Version.*\)/,  // General iPad pattern
      /iPad.*11_0|12_0|13_0|14_0|15_0|16_0|17_0|18_0/,  // iOS versions often seen on iPad Pro
      /Mozilla.*iPad.*AppleWebKit.*Version.*Mobile.*Safari/
    ];
    
    const isIPad = /iPad/.test(userAgent);
    const hasModernIOSVersion = /OS [1][1-8]_/.test(userAgent);
    const hasHighResolutionIndicators = this.hasHighResolutionIndicators();
    
    // If it's an iPad with modern iOS and high resolution, likely iPad Pro
    const likelyIPadPro = isIPad && (hasModernIOSVersion || hasHighResolutionIndicators);
    
    if (likelyIPadPro) {
      console.log('🎯 DETECTED: iPad Pro (probable) - applying audio fix');
    }
    
    return likelyIPadPro;
  }
  
  /**
   * Detect regular iPad (not Pro)
   */
  private static isIPad(userAgent: string): boolean {
    return /iPad/.test(userAgent);
  }
  
  /**
   * Detect iPhone
   */
  private static isIPhone(userAgent: string): boolean {
    return /iPhone/.test(userAgent);
  }
  
  /**
   * Detect Android
   */
  private static isAndroid(userAgent: string): boolean {
    return /Android/.test(userAgent);
  }
  
  /**
   * General mobile detection
   */
  private static isMobile(userAgent: string): boolean {
    return /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(userAgent);
  }
  
  /**
   * Check for high resolution indicators that suggest iPad Pro
   */
  private static hasHighResolutionIndicators(): boolean {
    if (typeof window !== 'undefined' && window.screen) {
      const { width, height } = window.screen;
      const devicePixelRatio = window.devicePixelRatio || 1;
      
      // iPad Pro 12.9" often reports these dimensions
      const highResWidth = width * devicePixelRatio >= 2048;
      const highResHeight = height * devicePixelRatio >= 2732;
      const highDPR = devicePixelRatio >= 2;
      
      return (highResWidth || highResHeight) && highDPR;
    }
    
    return false;
  }
  
  /**
   * Create AudioContext with optimal settings
   */
  static createOptimalAudioContext(): AudioContext {
    const config = this.getOptimalAudioConfig();
    
    console.log(`🎵 Creating AudioContext for ${config.deviceType}:`);
    console.log(`   Sample Rate: ${config.recommendedSampleRate}Hz`);
    console.log(`   Schedule Ahead: ${config.scheduleAheadTime * 1000}ms`);
    console.log(`   Reason: ${config.reason}`);
    
    try {
      // Try primary recommended rate
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({
        latencyHint: 'interactive',
        sampleRate: config.recommendedSampleRate
      });
      
      console.log(`✅ AudioContext created successfully:`);
      console.log(`   Requested: ${config.recommendedSampleRate}Hz`);
      console.log(`   Actual: ${audioContext.sampleRate}Hz`);
      console.log(`   Device: ${config.deviceInfo}`);
      
      return audioContext;
      
    } catch (error) {
      console.warn(`⚠️ Primary sample rate ${config.recommendedSampleRate}Hz failed, trying fallback...`);
      
      try {
        // Try fallback rate
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass({
          latencyHint: 'interactive',
          sampleRate: config.fallbackSampleRate
        });
        
        console.log(`✅ AudioContext created with fallback:`);
        console.log(`   Fallback Rate: ${config.fallbackSampleRate}Hz`);
        console.log(`   Actual: ${audioContext.sampleRate}Hz`);
        
        return audioContext;
        
      } catch (fallbackError) {
        console.error('❌ Both primary and fallback AudioContext creation failed, using default');
        
        // Last resort - browser default
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        return new AudioContextClass({ latencyHint: 'interactive' });
      }
    }
  }
  
  /**
   * Get current device configuration
   */
  static getCurrentDeviceInfo(): string {
    const config = this.getOptimalAudioConfig();
    return `${config.deviceInfo} | ${config.recommendedSampleRate}Hz | ${config.reason}`;
  }
  
  /**
   * Test if current device likely has audio issues with 48kHz
   */
  static isProblematicDevice(): boolean {
    const config = this.getOptimalAudioConfig();
    return config.deviceType === 'ipad-pro' || config.deviceType === 'ipad';
  }
}