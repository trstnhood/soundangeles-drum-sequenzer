import { test, expect } from '@playwright/test';

test.describe('Sample Selection Bug Debug', () => {
  test('Debug sample registration and playback', async ({ page }) => {
    // Capture all console messages
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      const message = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(message);
      console.log(message); // Also log to test output
    });

    // Navigate to the app
    await page.goto('http://localhost:8080');
    
    // Wait for app to load
    await page.waitForTimeout(3000);
    
    console.log('\n=== INITIAL LOAD COMPLETE ===');
    
    // Look for play button and sample selectors
    const playButton = page.locator('button').filter({ hasText: /play|▶/i }).first();
    const sampleSelectors = page.locator('select, [data-testid*="sample"], .sample-selector').first();
    
    if (await playButton.isVisible()) {
      console.log('✅ Found play button');
      
      // Start playback to trigger sample loading
      await playButton.click();
      await page.waitForTimeout(2000);
      
      console.log('\n=== AFTER PLAY BUTTON CLICK ===');
      
      // Look for sample selection dropdowns or buttons
      const sampleElements = await page.locator('select, button, [class*="sample"]').all();
      console.log(`Found ${sampleElements.length} potential sample selection elements`);
      
      // Try to find and interact with sample selection
      for (let i = 0; i < Math.min(sampleElements.length, 10); i++) {
        const element = sampleElements[i];
        const tagName = await element.evaluate(el => el.tagName);
        const className = await element.evaluate(el => el.className);
        const textContent = await element.textContent();
        
        console.log(`Element ${i}: ${tagName} class="${className}" text="${textContent?.substring(0, 50)}"`);
        
        // If it looks like a sample selector, try clicking it
        if (className?.includes('sample') || textContent?.includes('Kick') || textContent?.includes('Snare')) {
          try {
            await element.click();
            await page.waitForTimeout(1000);
            console.log(`✅ Clicked sample element ${i}`);
            break;
          } catch (error) {
            console.log(`❌ Could not click element ${i}: ${error}`);
          }
        }
      }
    }
    
    // Wait for any async operations
    await page.waitForTimeout(3000);
    
    console.log('\n=== FINAL CONSOLE ANALYSIS ===');
    
    // Analyze console messages for our debug patterns
    const unifiedMessages = consoleMessages.filter(msg => msg.includes('🎵 UNIFIED'));
    const registrationMessages = consoleMessages.filter(msg => msg.includes('📝 Registered'));
    const errorMessages = consoleMessages.filter(msg => msg.includes('❌') || msg.includes('⚠️'));
    const sampleIdMessages = consoleMessages.filter(msg => msg.includes('selectedSampleId'));
    
    console.log(`\n📊 ANALYSIS RESULTS:`);
    console.log(`- Unified messages: ${unifiedMessages.length}`);
    console.log(`- Registration messages: ${registrationMessages.length}`);
    console.log(`- Error/Warning messages: ${errorMessages.length}`);
    console.log(`- SampleId messages: ${sampleIdMessages.length}`);
    
    console.log(`\n🎵 UNIFIED SYSTEM LOGS:`);
    unifiedMessages.forEach(msg => console.log(msg));
    
    console.log(`\n📝 REGISTRATION LOGS:`);
    registrationMessages.forEach(msg => console.log(msg));
    
    console.log(`\n❌ ERROR/WARNING LOGS:`);
    errorMessages.forEach(msg => console.log(msg));
    
    console.log(`\n🆔 SAMPLE ID LOGS:`);
    sampleIdMessages.slice(0, 10).forEach(msg => console.log(msg)); // Limit output
    
    // Generate bug report
    console.log(`\n🐛 BUG REPORT SUMMARY:`);
    
    if (registrationMessages.length === 0) {
      console.log(`❌ CRITICAL: No samples were registered!`);
    } else {
      console.log(`✅ ${registrationMessages.length} samples were registered`);
    }
    
    if (unifiedMessages.length === 0) {
      console.log(`❌ CRITICAL: Unified system not being used!`);
    } else {
      console.log(`✅ Unified system is active (${unifiedMessages.length} calls)`);
    }
    
    const noSamplePathErrors = errorMessages.filter(msg => msg.includes('No sample path registered'));
    if (noSamplePathErrors.length > 0) {
      console.log(`❌ CRITICAL: ${noSamplePathErrors.length} "No sample path registered" errors found!`);
    }
    
    // Save full console log to file for detailed analysis
    const fullLog = consoleMessages.join('\n');
    console.log(`\n📄 Full console log (${consoleMessages.length} messages) - see test output above`);
  });
  
  test('Test sample switching behavior', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    await page.goto('http://localhost:8080');
    await page.waitForTimeout(3000);
    
    console.log('\n=== TESTING SAMPLE SWITCHING ===');
    
    // Try to find sample selection elements
    const selects = await page.locator('select').all();
    console.log(`Found ${selects.length} select elements`);
    
    for (let i = 0; i < selects.length && i < 3; i++) {
      try {
        const select = selects[i];
        const options = await select.locator('option').all();
        console.log(`Select ${i} has ${options.length} options`);
        
        if (options.length > 1) {
          // Get current selection
          const currentValue = await select.inputValue();
          console.log(`Current selection: ${currentValue}`);
          
          // Try to select second option
          const secondOption = options[1];
          const secondValue = await secondOption.getAttribute('value');
          const secondText = await secondOption.textContent();
          
          console.log(`Trying to select: ${secondText} (value: ${secondValue})`);
          
          await select.selectOption({ index: 1 });
          await page.waitForTimeout(1000);
          
          const newValue = await select.inputValue();
          console.log(`New selection: ${newValue}`);
          
          if (newValue !== currentValue) {
            console.log(`✅ Successfully changed selection from ${currentValue} to ${newValue}`);
            
            // Check if this triggered any relevant console messages
            const recentMessages = consoleMessages.slice(-10);
            const relevantMessages = recentMessages.filter(msg => 
              msg.includes('UNIFIED') || msg.includes('selectedSampleId') || msg.includes('Registered')
            );
            
            console.log(`Recent relevant messages after selection change:`);
            relevantMessages.forEach(msg => console.log(msg));
          } else {
            console.log(`❌ Selection did not change`);
          }
        }
      } catch (error) {
        console.log(`Error testing select ${i}: ${error}`);
      }
    }
  });
});