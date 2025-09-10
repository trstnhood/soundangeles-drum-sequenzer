import { test, expect } from '@playwright/test';

test.describe('Mobile Arrow Button Sample Switching', () => {
  test('Test arrow buttons trigger on-demand loading', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      const message = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(message);
      console.log(message);
    });

    // Navigate to app
    await page.goto('http://localhost:8080');
    
    // Wait for app to fully load with Smart Lazy Loading
    await page.waitForTimeout(8000);
    
    console.log('\n=== TESTING MOBILE ARROW BUTTON SAMPLE SWITCHING ===');
    
    // Check Smart Lazy Loading completed
    const smartLazyMessages = consoleMessages.filter(msg => 
      msg.includes('SMART LAZY: Loaded 8/8 essential samples')
    );
    
    console.log(`✅ Smart Lazy Loading completed: ${smartLazyMessages.length > 0}`);
    
    // Find arrow buttons
    const rightArrowButton = page.locator('button:has-text("→")').first();
    const leftArrowButton = page.locator('button:has-text("←")').first();
    
    const rightButtonVisible = await rightArrowButton.isVisible();
    const leftButtonVisible = await leftArrowButton.isVisible();
    
    console.log(`Arrow buttons found: Right: ${rightButtonVisible}, Left: ${leftButtonVisible}`);
    
    if (rightButtonVisible) {
      console.log('🔄 Testing RIGHT ARROW button click...');
      
      // Clear previous messages to isolate arrow button effects
      consoleMessages.length = 0;
      
      // Click right arrow button
      await rightArrowButton.click();
      await page.waitForTimeout(2000);
      
      console.log('\n=== MESSAGES AFTER RIGHT ARROW CLICK ===');
      
      // Look for key messages
      const onDemandMessages = consoleMessages.filter(msg => 
        msg.includes('ON-DEMAND') || 
        msg.includes('Sample switching') ||
        msg.includes('🔄 MOBILE: Sample switching')
      );
      
      const sampleLoadedMessages = consoleMessages.filter(msg => 
        msg.includes('✅ ON-DEMAND: Successfully loaded') ||
        msg.includes('✅ MOBILE: Successfully cached sample')
      );
      
      const sampleSwitchSuccessMessages = consoleMessages.filter(msg => 
        msg.includes('✅ MOBILE: Sample switched successfully')
      );
      
      console.log(`On-demand loading messages: ${onDemandMessages.length}`);
      console.log(`Sample loaded messages: ${sampleLoadedMessages.length}`);
      console.log(`Sample switch success messages: ${sampleSwitchSuccessMessages.length}`);
      
      onDemandMessages.forEach(msg => console.log(`  ${msg}`));
      sampleLoadedMessages.forEach(msg => console.log(`  ${msg}`));
      sampleSwitchSuccessMessages.forEach(msg => console.log(`  ${msg}`));
      
      // Test LEFT ARROW as well
      if (leftButtonVisible) {
        console.log('\n🔄 Testing LEFT ARROW button click...');
        
        // Clear messages again
        consoleMessages.length = 0;
        
        await leftArrowButton.click();
        await page.waitForTimeout(2000);
        
        console.log('\n=== MESSAGES AFTER LEFT ARROW CLICK ===');
        
        const leftOnDemandMessages = consoleMessages.filter(msg => 
          msg.includes('ON-DEMAND') || 
          msg.includes('Sample switching') ||
          msg.includes('🔄 MOBILE: Sample switching')
        );
        
        console.log(`Left arrow on-demand messages: ${leftOnDemandMessages.length}`);
        leftOnDemandMessages.forEach(msg => console.log(`  ${msg}`));
      }
      
      console.log('\n🎯 SUMMARY:');
      console.log(`- Right arrow on-demand loading: ${onDemandMessages.length > 0 ? 'WORKING' : 'NOT WORKING'}`);
      console.log(`- Sample switching success: ${sampleSwitchSuccessMessages.length > 0 ? 'WORKING' : 'NOT WORKING'}`);
      
    } else {
      console.log('❌ No arrow buttons found - mobile navigation UI missing');
    }
  });
});