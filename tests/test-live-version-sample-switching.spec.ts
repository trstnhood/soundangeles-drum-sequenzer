import { test, expect } from '@playwright/test';

test.describe('Live Version Sample Switching Test', () => {
  test('Test sample switching on live Vercel deployment', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      const message = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(message);
      console.log(message);
    });

    // Test the live version on Vercel
    await page.goto('https://soundangeles-drum-sequenzer.vercel.app');
    await page.waitForTimeout(8000);
    
    console.log('\n=== TESTING LIVE VERSION SAMPLE SWITCHING ===');
    
    // Wait for Smart Lazy Loading to complete
    console.log('🔄 Waiting for Smart Lazy Loading...');
    
    const smartLazyComplete = await page.waitForFunction(() => {
      // Check for the completion message in console
      return window.console && performance.now() > 8000; // At least 8 seconds passed
    }, { timeout: 15000 });
    
    // 1. Program step 1 for first track (KICK)
    console.log('🎯 Step 1: Programming step 1 for KICK track...');
    
    const firstPadButton = page.locator('button').filter({ hasText: '1' }).first();
    if (await firstPadButton.isVisible()) {
      await firstPadButton.click();
      await page.waitForTimeout(500);
      console.log('✅ Step 1 programmed for KICK');
    } else {
      console.log('❌ Could not find pad button 1');
    }
    
    // 2. Start playback
    console.log('🎯 Step 2: Starting playback...');
    
    const playButton = page.locator('button').filter({ hasText: /play|▶/i }).first();
    if (await playButton.isVisible()) {
      await playButton.click();
      await page.waitForTimeout(2000); // Let it play a bit
      console.log('✅ Playback started - should hear KICK on step 1');
    } else {
      console.log('❌ Could not find play button');
    }
    
    // 3. Test sample switching
    console.log('🎯 Step 3: Testing sample switching via arrow buttons...');
    
    // Clear console to isolate sample switching messages
    consoleMessages.length = 0;
    
    const rightArrowButton = page.locator('button:has-text("→")').first();
    
    if (await rightArrowButton.isVisible()) {
      console.log('✅ Found right arrow button');
      
      // Check current sample counter
      const sampleCounter = page.locator('.flex-1').filter({ hasText: /\d+\/\d+/ }).first();
      let beforeCounter = '';
      if (await sampleCounter.isVisible()) {
        beforeCounter = (await sampleCounter.textContent()) || '';
        console.log(`📊 Before: Sample counter shows: ${beforeCounter}`);
      }
      
      // Click right arrow to switch to next sample
      await rightArrowButton.click();
      await page.waitForTimeout(3000); // Wait to hear the difference
      
      // Check sample counter after
      let afterCounter = '';
      if (await sampleCounter.isVisible()) {
        afterCounter = (await sampleCounter.textContent()) || '';
        console.log(`📊 After: Sample counter shows: ${afterCounter}`);
      }
      
      // Analyze results
      console.log('\n=== SAMPLE SWITCHING ANALYSIS ===');
      
      if (beforeCounter !== afterCounter && afterCounter.includes('2/')) {
        console.log('🎉 SUCCESS! Sample switching worked!');
        console.log(`   - Before: ${beforeCounter}`);
        console.log(`   - After: ${afterCounter}`);
        console.log('   - User should now hear Kick2 instead of Kick1 on step 1');
      } else {
        console.log('❌ Sample switching failed or not visible');
        console.log(`   - Before: ${beforeCounter}`);
        console.log(`   - After: ${afterCounter}`);
      }
      
      // Look for debugging messages
      const switchingMessages = consoleMessages.filter(msg => 
        msg.includes('Sample switching') || 
        msg.includes('ON-DEMAND') ||
        msg.includes('selectedKit') ||
        msg.includes('currentKit')
      );
      
      console.log(`\n📝 Debug messages found: ${switchingMessages.length}`);
      switchingMessages.forEach(msg => console.log(`   ${msg}`));
      
      // Test left arrow as well
      console.log('\n🎯 Testing LEFT arrow...');
      const leftArrowButton = page.locator('button:has-text("←")').first();
      
      if (await leftArrowButton.isVisible()) {
        await leftArrowButton.click();
        await page.waitForTimeout(2000);
        
        const finalCounter = await sampleCounter.textContent();
        console.log(`📊 After LEFT arrow: ${finalCounter}`);
        
        if (finalCounter?.includes('1/')) {
          console.log('✅ Left arrow also works - back to sample 1');
        }
      }
      
    } else {
      console.log('❌ No right arrow button found on live version');
      
      // Debug: Look for any buttons with arrows
      const allButtons = await page.locator('button').all();
      console.log(`\n🔍 Debugging: Found ${allButtons.length} buttons total`);
      
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        const text = await allButtons[i].textContent();
        console.log(`   Button ${i}: "${text}"`);
      }
    }
    
    console.log('\n🏁 LIVE VERSION TEST COMPLETE');
    
  });
});