import { test, expect } from '@playwright/test';

test.describe('Immediate Sample Switching Test', () => {
  test('Test sample switching with programmed step', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      const message = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(message);
      console.log(message);
    });

    await page.goto('http://localhost:8080');
    await page.waitForTimeout(6000);
    
    console.log('\n=== TESTING IMMEDIATE SAMPLE SWITCHING ===');
    
    // 1. First program a step (click on pad 1 of the first track)
    console.log('🎯 Step 1: Programming step 1 for first track...');
    
    const firstPadButton = page.locator('button').filter({ hasText: '1' }).first();
    if (await firstPadButton.isVisible()) {
      await firstPadButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ Step 1 programmed');
    }
    
    // 2. Start playback to hear the current sample
    console.log('🎯 Step 2: Starting playback...');
    
    const playButton = page.locator('button').filter({ hasText: /play|▶/i }).first();
    if (await playButton.isVisible()) {
      await playButton.click();
      await page.waitForTimeout(2000);
      console.log('✅ Playback started');
    }
    
    // 3. Now switch sample using arrow button
    console.log('🎯 Step 3: Switching sample with arrow button...');
    
    // Clear console to isolate sample switching
    consoleMessages.length = 0;
    
    const rightArrowButton = page.locator('button:has-text("→")').first();
    
    if (await rightArrowButton.isVisible()) {
      await rightArrowButton.click();
      await page.waitForTimeout(3000); // Wait longer to hear the difference
      
      console.log('\n=== SAMPLE SWITCHING ANALYSIS ===');
      
      // Check for on-demand loading
      const onDemandMessages = consoleMessages.filter(msg => 
        msg.includes('🔄 MOBILE: Sample switching') ||
        msg.includes('ON-DEMAND') ||
        msg.includes('✅ MOBILE: Sample switched successfully')
      );
      
      console.log(`Sample switching messages: ${onDemandMessages.length}`);
      onDemandMessages.forEach(msg => console.log(`  ${msg}`));
      
      // Check sample counter update  
      const sampleCounter = page.locator('.grid-cols-2 .flex-1').first();
      if (await sampleCounter.isVisible()) {
        const counterText = await sampleCounter.textContent();
        console.log(`📊 Sample counter shows: ${counterText}`);
        
        if (counterText?.includes('2/')) {
          console.log('✅ SUCCESS: Sample counter shows we switched to sample 2!');
        } else {
          console.log('❌ Sample counter still shows sample 1 - switching failed');
        }
      }
      
      console.log('\n🎵 USER EXPERIENCE TEST:');
      console.log('- Step 1 is programmed and playing');
      console.log('- Arrow button clicked → should immediately hear different sample');
      console.log(`- On-demand loading working: ${onDemandMessages.length > 0 ? 'YES' : 'NO'}`);
      
    } else {
      console.log('❌ No arrow button found');
    }
  });
});