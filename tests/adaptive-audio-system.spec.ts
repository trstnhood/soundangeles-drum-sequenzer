/**
 * Comprehensive Test Suite for Adaptive Mobile Audio System
 * Tests device tier classification and audio optimization
 */

import { test, expect } from '@playwright/test';

test.describe('Adaptive Mobile Audio System', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the drum sequencer
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
  });
  
  test('should detect device capabilities and configure appropriately', async ({ page, browserName }) => {
    // Wait for adaptive audio system to initialize
    await page.waitForFunction(() => {
      return window.AdaptiveMobileAudioSystem !== undefined;
    }, { timeout: 10000 });
    
    // Get device configuration
    const config = await page.evaluate(async () => {
      // @ts-ignore
      return await window.AdaptiveMobileAudioSystem.getOptimalAudioConfig();
    });
    
    // Verify configuration structure
    expect(config).toHaveProperty('deviceTier');
    expect(config).toHaveProperty('capabilities');
    expect(config).toHaveProperty('audioQuality');
    expect(config).toHaveProperty('maxPolyphony');
    expect(config).toHaveProperty('use64kbpsPriority');
    
    // Verify device tier is appropriate for browser environment
    if (browserName === 'chromium') {
      expect(['desktop-high', 'desktop-standard']).toContain(config.deviceTier);
    }
    
    console.log('Device Configuration:', config);
  });
  
  test('should prioritize 64kbps MP3 on mobile devices', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip('Test only applies to mobile devices');
    }
    
    const qualitySettings = await page.evaluate(async () => {
      // @ts-ignore
      const config = await window.AdaptiveMobileAudioSystem.getOptimalAudioConfig();
      // @ts-ignore
      return window.AdaptiveMobileAudioSystem.getQualitySettings(config);
    });
    
    // Mobile devices should prefer lower quality formats
    expect(['mp3-64', 'mp3-128']).toContain(qualitySettings.sampleFormat);
    expect(qualitySettings.maxConcurrentLoads).toBeLessThanOrEqual(4);
    expect(qualitySettings.cacheStrategy).toBe('conservative');
  });
  
  test('should adapt polyphony based on device capabilities', async ({ page }) => {
    // Initialize audio engine and get polyphony limits
    const polyphonyInfo = await page.evaluate(async () => {
      // @ts-ignore
      const config = await window.AdaptiveMobileAudioSystem.getOptimalAudioConfig();
      return {
        maxPolyphony: config.maxPolyphony,
        deviceTier: config.deviceTier
      };
    });
    
    // Verify polyphony is reasonable for device tier
    if (polyphonyInfo.deviceTier.includes('desktop')) {
      expect(polyphonyInfo.maxPolyphony).toBeGreaterThanOrEqual(10);
    } else if (polyphonyInfo.deviceTier.includes('mobile-high')) {
      expect(polyphonyInfo.maxPolyphony).toBeGreaterThanOrEqual(8);
    } else {
      expect(polyphonyInfo.maxPolyphony).toBeGreaterThanOrEqual(4);
    }
  });
  
  test('should create optimized AudioContext based on device', async ({ page }) => {
    const audioContextInfo = await page.evaluate(async () => {
      // @ts-ignore
      const audioContext = await window.AdaptiveMobileAudioSystem.createOptimizedAudioContext();
      
      return {
        sampleRate: audioContext.sampleRate,
        state: audioContext.state,
        baseLatency: audioContext.baseLatency
      };
    });
    
    // Verify AudioContext was created successfully
    expect([44100, 48000]).toContain(audioContextInfo.sampleRate);
    expect(['running', 'suspended']).toContain(audioContextInfo.state);
    expect(typeof audioContextInfo.baseLatency).toBe('number');
  });
  
});

test.describe('Device Tier Testing', () => {
  
  test('Desktop Configuration', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
    
    const config = await page.evaluate(async () => {
      // @ts-ignore
      return await window.AdaptiveMobileAudioSystem.initialize();
    });
    
    // Desktop should have reasonable performance settings
    expect(config.deviceTier).toContain('desktop');
    expect(['high', 'medium']).toContain(config.audioQuality);
    expect(config.maxPolyphony).toBeGreaterThanOrEqual(8);
  });
  
});

test.describe('Integration Test', () => {
  
  test('should integrate with drum sequencer without breaking functionality', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
    
    // Wait for any component to load
    await page.waitForTimeout(3000);
    
    // Verify adaptive system is running
    const systemStatus = await page.evaluate(() => {
      // @ts-ignore
      return window.AdaptiveMobileAudioSystem !== undefined;
    });
    
    expect(systemStatus).toBe(true);
  });
  
});