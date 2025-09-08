import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 } // iPhone 13 Pro size
  });
  const page = await context.newPage();

  console.log('🎯 TESTING: Bank A → Bank B copying issue');
  console.log('📱 Mobile viewport: 375x812 (iPhone 13 Pro)');
  
  try {
    // Navigate to the mobile version
    console.log('1. Navigating to mobile version...');
    await page.goto('http://localhost:8081');
    
    // Wait for the page to load
    console.log('2. Waiting for page to load...');
    await page.waitForTimeout(3000);
    
    // Check if we're in preloading state and wait for completion
    console.log('3. Checking loading state...');
    try {
      await page.waitForSelector('text="Preparing samples..."', { timeout: 2000 });
      console.log('   - Found preloading screen, waiting for completion...');
      await page.waitForSelector('text="Preparing samples..."', { state: 'hidden', timeout: 30000 });
      console.log('   ✅ Preloading completed');
    } catch (e) {
      console.log('   ✅ No preloading screen found - already loaded');
    }
    
    // Wait for the main UI to be visible
    console.log('4. Waiting for main UI...');
    await page.waitForSelector('text="Pattern A"', { timeout: 10000 });
    console.log('   ✅ Main UI loaded');
    
    // Step 1: Program a pattern in Bank A
    console.log('5. Programming pattern in Bank A...');
    
    // Find and click some pads to create a pattern
    const pads = await page.locator('.mobile-pad').all();
    console.log(`   - Found ${pads.length} pads`);
    
    if (pads.length > 0) {
      // Click a few pads to create a pattern
      console.log('   - Clicking pads to create pattern...');
      await pads[0].click(); // First pad
      await page.waitForTimeout(200);
      await pads[4].click(); // Fifth pad  
      await page.waitForTimeout(200);
      await pads[8].click(); // Ninth pad
      await page.waitForTimeout(200);
      console.log('   ✅ Pattern created in Bank A');
    } else {
      console.log('   ❌ No pads found!');
      await browser.close();
      return;
    }
    
    // Step 2: Take screenshot of Bank A with pattern
    console.log('6. Taking screenshot of Bank A...');
    await page.screenshot({ path: 'bank-a-before-copy.png' });
    
    // Step 3: Copy from Bank A to Bank B
    console.log('7. Copying from Bank A to Bank B...');
    
    // Find the copy button or menu
    try {
      // Look for copy options in the pattern bank area
      const copyButton = page.locator('text="Copy"').first();
      if (await copyButton.isVisible()) {
        await copyButton.click();
        await page.waitForTimeout(500);
        console.log('   - Clicked copy button');
        
        // Look for Bank B option
        const bankBOption = page.locator('text="B"').first();
        if (await bankBOption.isVisible()) {
          await bankBOption.click();
          await page.waitForTimeout(1000);
          console.log('   ✅ Copied to Bank B');
        }
      } else {
        // Alternative: Look for dropdown or other copy mechanism
        console.log('   - Looking for alternative copy method...');
        
        // Check if there's a dropdown or menu system
        const dropdown = page.locator('select').first();
        if (await dropdown.isVisible()) {
          await dropdown.selectOption('B');
          await page.waitForTimeout(1000);
          console.log('   ✅ Switched to Bank B via dropdown');
        }
      }
    } catch (e) {
      console.log('   ❌ Could not find copy mechanism:', e.message);
    }
    
    // Step 4: Check if we're now in Bank B
    console.log('8. Checking current bank...');
    const currentBank = await page.locator('text="Pattern B"').isVisible();
    if (currentBank) {
      console.log('   ✅ Successfully switched to Bank B');
    } else {
      console.log('   ⚠️ Still in Bank A or unknown state');
    }
    
    // Step 5: Take screenshot of Bank B
    console.log('9. Taking screenshot of Bank B...');
    await page.screenshot({ path: 'bank-b-after-copy.png' });
    
    // Step 6: Switch back to Bank A to check if pattern is preserved
    console.log('10. Switching back to Bank A...');
    try {
      const bankAButton = page.locator('text="A"').first();
      if (await bankAButton.isVisible()) {
        await bankAButton.click();
        await page.waitForTimeout(1000);
        console.log('    ✅ Switched back to Bank A');
      }
    } catch (e) {
      console.log('    ❌ Could not switch back to Bank A');
    }
    
    // Step 7: Take final screenshot of Bank A
    console.log('11. Taking final screenshot of Bank A...');
    await page.screenshot({ path: 'bank-a-after-copy-check.png' });
    
    // Step 8: Count active pads in Bank A
    console.log('12. Checking Bank A pattern preservation...');
    const activePads = await page.locator('.mobile-pad.active').count();
    console.log(`    - Found ${activePads} active pads in Bank A`);
    
    if (activePads > 0) {
      console.log('    ✅ SUCCESS: Bank A pattern is preserved!');
    } else {
      console.log('    ❌ FAILURE: Bank A pattern was deleted!');
    }
    
    console.log('\n📊 TEST RESULTS:');
    console.log(`- Bank A active pads after copy: ${activePads}`);
    console.log('- Screenshots saved:');
    console.log('  • bank-a-before-copy.png');
    console.log('  • bank-b-after-copy.png');
    console.log('  • bank-a-after-copy-check.png');
    
    // Keep browser open for manual inspection
    console.log('\n⏸️ Browser kept open for manual inspection...');
    console.log('Press Ctrl+C to close when done.');
    
    // Wait indefinitely
    await page.waitForTimeout(999999);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Don't close automatically - let user inspect
    // await browser.close();
  }
})();