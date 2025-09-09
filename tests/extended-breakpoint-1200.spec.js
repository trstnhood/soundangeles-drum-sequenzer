import { test, expect } from '@playwright/test';

test.describe('Extended Breakpoint: 1200px Desktop Scaling', () => {
  
  test('1200px: Desktop version with 85% minimum scale', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('http://localhost:8081/');
    
    await page.waitForTimeout(2000);
    
    // Desktop-Version sollte geladen werden
    const hardwareContainer = await page.locator('.hardware-container');
    await expect(hardwareContainer).toBeVisible();
    
    // Debug-Info prüfen
    const debugInfo = await page.locator('text=/Scale:/');
    await expect(debugInfo).toBeVisible();
    
    const scaleText = await debugInfo.textContent();
    console.log('✅ 1200px Scale:', scaleText);
    
    // Sollte mindestens 85% sein (nicht zu klein)
    const scaleMatch = scaleText.match(/(\d+)%/);
    const scaleValue = parseInt(scaleMatch[1]);
    expect(scaleValue).toBeGreaterThanOrEqual(85);
  });

  test('1199px: Mobile version (nahtloser Übergang)', async ({ page }) => {
    await page.setViewportSize({ width: 1199, height: 900 });
    await page.goto('http://localhost:8081/');
    
    await page.waitForTimeout(2000);
    
    // Mobile-Version sollte geladen werden
    const mobileElement = await page.locator('body').first();
    // Debug info sollte NICHT da sein (mobile version)
    const debugInfo = await page.locator('text=/Scale:/');
    await expect(debugInfo).not.toBeVisible();
    
    console.log('✅ 1199px: Mobile Version korrekt geladen');
  });

  test('1280px: Tablet mit verbesserter Desktop-Skalierung', async ({ page }) => {
    // Typische Tablet-Breite - sollte jetzt Desktop zeigen statt Mobile
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('http://localhost:8081/');
    
    await page.waitForTimeout(2000);
    
    const hardwareContainer = await page.locator('.hardware-container');
    await expect(hardwareContainer).toBeVisible();
    
    const debugInfo = await page.locator('text=/Scale:/');
    const scaleText = await debugInfo.textContent();
    console.log('✅ 1280px Tablet Scale:', scaleText);
    
    // Sollte über 85% sein (gute Lesbarkeit)
    const scaleMatch = scaleText.match(/(\d+)%/);
    const scaleValue = parseInt(scaleMatch[1]);
    expect(scaleValue).toBeGreaterThanOrEqual(85);
    expect(scaleValue).toBeLessThanOrEqual(120);
  });

  test('1300px: Sanfte Einführung (kein zu kleiner Scale)', async ({ page }) => {
    await page.setViewportSize({ width: 1300, height: 900 });
    await page.goto('http://localhost:8081/');
    
    await page.waitForTimeout(2000);
    
    const debugInfo = await page.locator('text=/Scale:/');
    const scaleText = await debugInfo.textContent();
    console.log('✅ 1300px Scale:', scaleText);
    
    // Bei 1200-1300px Range sollte mindestens 85% garantiert sein
    const scaleMatch = scaleText.match(/(\d+)%/);
    const scaleValue = parseInt(scaleMatch[1]);
    expect(scaleValue).toBeGreaterThanOrEqual(85);
  });

  test('1600px: Optimale Desktop-Erfahrung', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto('http://localhost:8081/');
    
    await page.waitForTimeout(2000);
    
    const debugInfo = await page.locator('text=/Scale:/');
    const scaleText = await debugInfo.textContent();
    console.log('✅ 1600px Scale:', scaleText);
    
    // Sollte nahe 100% oder darüber sein
    const scaleMatch = scaleText.match(/(\d+)%/);
    const scaleValue = parseInt(scaleMatch[1]);
    expect(scaleValue).toBeGreaterThanOrEqual(100);
    expect(scaleValue).toBeLessThanOrEqual(120);
  });

  test('Sehr großer Viewport 2000px: Maximum 120%', async ({ page }) => {
    await page.setViewportSize({ width: 2000, height: 1200 });
    await page.goto('http://localhost:8081/');
    
    await page.waitForTimeout(2000);
    
    const debugInfo = await page.locator('text=/Scale:/');
    const scaleText = await debugInfo.textContent();
    console.log('✅ 2000px Scale:', scaleText);
    
    // Sollte maximal 120% sein
    const scaleMatch = scaleText.match(/(\d+)%/);
    const scaleValue = parseInt(scaleMatch[1]);
    expect(scaleValue).toBeLessThanOrEqual(120);
    expect(scaleValue).toBeGreaterThanOrEqual(100);
  });

});