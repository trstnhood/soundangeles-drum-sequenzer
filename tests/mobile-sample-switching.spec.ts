import { test, expect } from '@playwright/test';

test.describe('Mobile Sample Switching', () => {
  test('Test mobile sample switching with arrow buttons', async ({ page }) => {
    // Capture console messages
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      const message = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(message);
      console.log(message);
    });

    // Navigate to mobile version
    await page.goto('http://localhost:8080');
    
    // Wait for app to load and smart lazy loading to complete
    await page.waitForTimeout(5000);
    
    console.log('\n=== TESTING MOBILE SAMPLE SWITCHING ===');
    
    // Look for mobile sample navigation buttons (← →)
    const leftArrowButtons = await page.locator('button:has-text("←")').all();
    const rightArrowButtons = await page.locator('button:has-text("→")').all();
    
    console.log(`Found ${leftArrowButtons.length} left arrow buttons`);
    console.log(`Found ${rightArrowButtons.length} right arrow buttons`);
    
    if (rightArrowButtons.length > 0) {
      console.log('✅ Found right arrow button - testing sample switching');
      
      // Test clicking right arrow to switch to next sample
      await rightArrowButtons[0].click();
      await page.waitForTimeout(2000);
      
      console.log('\n=== AFTER RIGHT ARROW CLICK ===');
      
      // Check for on-demand loading messages
      const onDemandMessages = consoleMessages.filter(msg => 
        msg.includes('ON-DEMAND') || msg.includes('Sample switching') || msg.includes('MOBILE:')
      );
      
      console.log(`Found ${onDemandMessages.length} on-demand loading messages:`);
      onDemandMessages.slice(-10).forEach(msg => console.log(msg));
      
      // Test clicking left arrow
      if (leftArrowButtons.length > 0) {
        await leftArrowButtons[0].click();
        await page.waitForTimeout(2000);
        
        console.log('\n=== AFTER LEFT ARROW CLICK ===');
        
        const moreLazyLoadMessages = consoleMessages.filter(msg => 
          msg.includes('ON-DEMAND') || msg.includes('Sample switching')
        );
        
        console.log(`Total lazy loading messages: ${moreLazyLoadMessages.length}`);
      }
    } else {
      console.log('❌ No arrow buttons found - mobile navigation might be different');
      
      // Look for alternative mobile navigation elements
      const allButtons = await page.locator('button').all();
      console.log(`Found ${allButtons.length} total buttons`);
      
      for (let i = 0; i < Math.min(allButtons.length, 20); i++) {
        const button = allButtons[i];
        const text = await button.textContent();
        const className = await button.getAttribute('class');
        console.log(`Button ${i}: "${text}" class="${className?.substring(0, 50)}..."`);
      }
    }
    
    // Check if Smart Lazy Loading is working
    const smartLazyMessages = consoleMessages.filter(msg => 
      msg.includes('SMART LAZY') || msg.includes('Memory optimized')
    );
    
    console.log(`\n📊 SMART LAZY LOADING ANALYSIS:`);
    console.log(`Smart Lazy messages: ${smartLazyMessages.length}`);
    smartLazyMessages.forEach(msg => console.log(msg));
    
    // Final summary
    console.log(`\n🎯 TEST SUMMARY:`);
    console.log(`- Console messages captured: ${consoleMessages.length}`);
    console.log(`- Smart Lazy Loading active: ${smartLazyMessages.length > 0}`);
    console.log(`- Sample switching attempts: ${rightArrowButtons.length > 0 ? 'YES' : 'NO'}`);
  });
});