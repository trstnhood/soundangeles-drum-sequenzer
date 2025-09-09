/**
 * Playwright Test - Production Drum Sequencer
 * Tests the live Vercel deployment for functionality
 */

import { test, expect, Page } from '@playwright/test';

const PRODUCTION_URL = 'https://soundangeles-drum-sequenzer.vercel.app/';

test.describe('SoundAngeles Drum Sequencer - Production Tests', () => {
  
  test('Should load production site without errors', async ({ page }) => {
    // Monitor console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to production site
    console.log(`🌐 Testing: ${PRODUCTION_URL}`);
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
    
    // Check title
    await expect(page).toHaveTitle(/SoundAngeles|Drum Sequencer/i);
    
    // Log any console errors
    if (consoleErrors.length > 0) {
      console.log('❌ Console Errors:', consoleErrors);
    }
  });

  test('Should test sample data loading', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
    // Wait for loading screen to complete
    console.log('⏳ Waiting for app initialization...');
    
    // Wait for either the full sequencer OR the fallback to load
    await page.waitForSelector('[data-testid="drum-sequencer"], .min-h-screen', { 
      timeout: 15000 
    });
    
    // Check what loaded
    const hasFullSequencer = await page.locator('[data-testid="drum-sequencer"]').isVisible().catch(() => false);
    const hasFallback = await page.locator('text=Mobile/Fallback Mode').isVisible().catch(() => false);
    
    if (hasFullSequencer) {
      console.log('✅ Full drum sequencer loaded successfully');
    } else if (hasFallback) {
      console.log('⚠️ Fallback mode activated');
      
      // Check fallback reason
      const errorMessage = await page.locator('text=Sample loading failed').textContent().catch(() => null);
      if (errorMessage) {
        console.log('❌ Fallback reason:', errorMessage);
      }
    } else {
      console.log('❌ Neither full sequencer nor fallback loaded');
    }
    
    expect(hasFullSequencer || hasFallback).toBeTruthy();
  });

  test('Should test static JSON data availability', async ({ page }) => {
    // Test direct access to static JSON
    const jsonResponse = await page.goto(`${PRODUCTION_URL}sample-packs-data.json`);
    expect(jsonResponse?.status()).toBe(200);
    
    const jsonData = await jsonResponse?.json();
    expect(jsonData).toHaveProperty('packs');
    expect(Array.isArray(jsonData.packs)).toBeTruthy();
    expect(jsonData.packs.length).toBeGreaterThan(0);
    
    console.log(`✅ Static JSON data loaded: ${jsonData.packs.length} packs available`);
    jsonData.packs.forEach((pack: any, index: number) => {
      console.log(`  📦 Pack ${index + 1}: ${pack.name} (${pack.instruments?.length || 0} instruments)`);
    });
  });

  test('Should test sample file accessibility', async ({ page }) => {
    // Test a few sample files directly
    const testSamples = [
      'sample-packs-mp3/I.L.L.%20Will%20-%20Drumsound%20Pack%20Vol.%201/01-Kick/1l%20kick.mp3',
      'sample-packs-mp3/I.L.L.%20Will%20-%20Drumsound%20Pack%20Vol.%201/02-Snare/1l%20snare.mp3',
      'sample-packs-mp3/I.L.L.%20Will%20-%20Drumsound%20Pack%20Vol.%201/03-Hi-hat/1l%20hihat.mp3'
    ];
    
    for (const samplePath of testSamples) {
      const sampleResponse = await page.goto(`${PRODUCTION_URL}${samplePath}`, {
        waitUntil: 'networkidle'
      });
      
      const status = sampleResponse?.status() || 0;
      console.log(`🎵 Sample test: ${samplePath.split('/').pop()} -> ${status}`);
      
      if (status === 200) {
        console.log('✅ Sample file accessible');
      } else if (status === 404) {
        console.log('❌ Sample file not found (404)');
      } else {
        console.log(`⚠️ Unexpected status: ${status}`);
      }
    }
  });

  test('Should test mobile compatibility', async ({ page, isMobile }) => {
    await page.goto(PRODUCTION_URL);
    
    if (isMobile) {
      console.log('📱 Testing mobile device behavior');
    } else {
      console.log('💻 Testing desktop device behavior');
    }
    
    // Wait for app to load
    await page.waitForSelector('text=Loading SoundAngeles Drum Sequencer, text=SoundAngeles Drum Sequencer', { 
      timeout: 15000 
    });
    
    // Check if loading completes
    const stillLoading = await page.locator('text=Loading SoundAngeles Drum Sequencer').isVisible().catch(() => false);
    expect(stillLoading).toBeFalsy();
    
    console.log('✅ App completed loading phase');
  });

  test('Should capture network requests and errors', async ({ page }) => {
    const networkFailures: string[] = [];
    const networkRequests: string[] = [];
    
    page.on('response', response => {
      const url = response.url();
      const status = response.status();
      
      if (url.includes('sample-packs') || url.includes('api/discover') || url.includes('.json')) {
        networkRequests.push(`${status}: ${url}`);
        
        if (status >= 400) {
          networkFailures.push(`${status}: ${url}`);
        }
      }
    });
    
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
    
    console.log('🌐 Network Requests:');
    networkRequests.forEach(req => console.log(`  ${req}`));
    
    if (networkFailures.length > 0) {
      console.log('❌ Network Failures:');
      networkFailures.forEach(failure => console.log(`  ${failure}`));
    } else {
      console.log('✅ No network failures detected');
    }
  });
  
  test('Should test JavaScript execution and console logs', async ({ page }) => {
    const consoleLogs: { type: string, message: string }[] = [];
    
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        message: msg.text()
      });
    });
    
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
    
    // Filter interesting console messages
    const smartSampleLogs = consoleLogs.filter(log => 
      log.message.includes('SmartSampleManager') ||
      log.message.includes('Static sample data') ||
      log.message.includes('Sample discovery') ||
      log.message.includes('Using ProductionSampleManager') ||
      log.message.includes('Using SampleManager')
    );
    
    console.log('📊 Sample Manager Console Logs:');
    smartSampleLogs.forEach(log => {
      const emoji = log.type === 'error' ? '❌' : log.type === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`  ${emoji} ${log.type.toUpperCase()}: ${log.message}`);
    });
    
    // Check for critical errors
    const errors = consoleLogs.filter(log => log.type === 'error');
    if (errors.length > 0) {
      console.log('❌ JavaScript Errors Found:');
      errors.forEach(error => console.log(`  ${error.message}`));
    }
  });

});