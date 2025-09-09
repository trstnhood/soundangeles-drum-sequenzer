import { test, expect } from '@playwright/test';

test.describe('Mobile Responsiveness with 1400px Breakpoint', () => {
  test('1399px width shows mobile version', async ({ page }) => {
    // Set viewport to 1399px (should show mobile)
    await page.setViewportSize({ width: 1399, height: 800 });
    await page.goto('https://soundangeles-drum-sequenzer.vercel.app/');
    
    // Wait for app to load
    await page.waitForTimeout(3000);
    
    // Mobile version should have TouchFriendly container
    const mobileContainer = await page.locator('[class*="mobile"]').first();
    await expect(mobileContainer).toBeVisible();
    
    console.log('✅ 1399px width correctly shows mobile version');
  });

  test('1400px width shows desktop version', async ({ page }) => {
    // Set viewport to 1400px (should show desktop)
    await page.setViewportSize({ width: 1400, height: 800 });
    await page.goto('https://soundangeles-drum-sequenzer.vercel.app/');
    
    // Wait for app to load
    await page.waitForTimeout(3000);
    
    // Desktop version should have hardware-container
    const desktopContainer = await page.locator('.hardware-container').first();
    await expect(desktopContainer).toBeVisible();
    
    console.log('✅ 1400px width correctly shows desktop version');
  });

  test('Samsung A53 typical width (360px) shows mobile version', async ({ page }) => {
    // Samsung A53 viewport
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('https://soundangeles-drum-sequenzer.vercel.app/');
    
    // Wait for app to load
    await page.waitForTimeout(3000);
    
    // Should show mobile version with 16 pads
    const mobilePads = await page.locator('[class*="pad"]');
    const padCount = await mobilePads.count();
    expect(padCount).toBeGreaterThanOrEqual(16);
    
    console.log('✅ Samsung A53 width correctly shows mobile with 16 pads');
  });

  test('Tablet typical width (1280px) now shows mobile version', async ({ page }) => {
    // Tablet viewport (was showing desktop before fix)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('https://soundangeles-drum-sequenzer.vercel.app/');
    
    // Wait for app to load
    await page.waitForTimeout(3000);
    
    // Should now show mobile version (not truncated desktop)
    const mobileContainer = await page.locator('[class*="mobile"]').first();
    await expect(mobileContainer).toBeVisible();
    
    console.log('✅ 1280px tablet width now correctly shows mobile version');
  });
});