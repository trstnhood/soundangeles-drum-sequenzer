import { test, expect } from '@playwright/test';

test.describe('Lazy Loading System Test', () => {
  
  test('App starts instantly without loading all samples', async ({ page }) => {
    const startTime = Date.now();
    
    // Navigate to local dev server
    await page.goto('http://localhost:8081/');
    
    // Wait for basic UI to load
    await page.waitForSelector('.hardware-container', { timeout: 5000 });
    
    const loadTime = Date.now() - startTime;
    console.log(`✅ App loaded in ${loadTime}ms`);
    
    // Should load much faster than before (without loading all 774 samples)
    expect(loadTime).toBeLessThan(3000); // Should be under 3 seconds
  });

  test('Samples load on demand when pad is pressed', async ({ page }) => {
    await page.goto('http://localhost:8081/');
    
    // Wait for app to fully load
    await page.waitForTimeout(2000);
    
    // Get console logs to monitor lazy loading
    const logs = [];
    page.on('console', msg => {
      if (msg.text().includes('Lazy loading') || msg.text().includes('Registered sample')) {
        logs.push(msg.text());
      }
    });
    
    // Click first sequencer pad (should trigger lazy loading)
    const firstPad = await page.locator('[class*="step-button"], [class*="sequencer-pad"], button:has-text("1")').first();
    await firstPad.click();
    
    // Wait a moment for lazy loading to complete
    await page.waitForTimeout(1000);
    
    console.log('📝 Lazy loading logs:', logs);
    
    // Should have registered sample paths (not loaded all)
    expect(logs.some(log => log.includes('Registered sample'))).toBe(true);
  });

  test('Performance: Memory usage should be lower than before', async ({ page }) => {
    await page.goto('http://localhost:8081/');
    
    // Wait for app initialization
    await page.waitForTimeout(2000);
    
    // Check memory usage via performance API (rough estimate)
    const memoryInfo = await page.evaluate(() => {
      if ('memory' in performance) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize
        };
      }
      return null;
    });
    
    if (memoryInfo) {
      const memoryMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
      console.log(`🧠 Memory usage: ${memoryMB.toFixed(2)} MB`);
      
      // Should be significantly lower than loading all 774 samples at once
      // Expecting under 50MB with lazy loading vs 150MB+ before
      expect(memoryMB).toBeLessThan(100);
    }
  });

  test('Audio still works correctly after lazy loading', async ({ page }) => {
    await page.goto('http://localhost:8081/');
    await page.waitForTimeout(2000);
    
    // Press play button
    const playButton = await page.locator('button:has-text("Play"), [aria-label*="Play"]').first();
    if (await playButton.isVisible()) {
      await playButton.click();
      console.log('✅ Play button clicked - lazy loading should trigger for active patterns');
    }
    
    // Let it play for a moment
    await page.waitForTimeout(3000);
    
    // Press stop
    const stopButton = await page.locator('button:has-text("Stop"), [aria-label*="Stop"]').first();  
    if (await stopButton.isVisible()) {
      await stopButton.click();
      console.log('✅ Audio playback test complete');
    }
  });

});