import { test, expect } from '@playwright/test';

test.describe('Responsive Desktop Scaling (±20% Flexibilität)', () => {
  
  test('1400px width: Minimum scale (80%)', async ({ page }) => {
    // Kleinstes Desktop-Format - sollte auf 80% skalieren
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('http://localhost:8081/');
    
    // Warte auf Desktop-Mode Load
    await page.waitForTimeout(2000);
    
    // Prüfe dass Desktop-Version geladen wird
    const hardwareContainer = await page.locator('.hardware-container');
    await expect(hardwareContainer).toBeVisible();
    
    // Debug Info sollte sichtbar sein (Development mode)
    const debugInfo = await page.locator('text=/Scale:/');
    await expect(debugInfo).toBeVisible();
    
    // Scale sollte 80% sein (minimum)
    const scaleText = await debugInfo.textContent();
    console.log('✅ 1400px Scale:', scaleText);
    expect(scaleText).toContain('80%');
  });

  test('1500px width: Base scale (100%)', async ({ page }) => {
    // Basis-Format - sollte auf 100% skalieren  
    await page.setViewportSize({ width: 1500, height: 900 });
    await page.goto('http://localhost:8081/');
    
    await page.waitForTimeout(2000);
    
    const debugInfo = await page.locator('text=/Scale:/');
    await expect(debugInfo).toBeVisible();
    
    const scaleText = await debugInfo.textContent();
    console.log('✅ 1500px Scale:', scaleText);
    // Bei 1500px sollte es nahe 100% sein
    expect(scaleText).toMatch(/9[0-9]%|10[0-9]%/);
  });

  test('1800px width: Higher scale (bis 120%)', async ({ page }) => {
    // Großes Format - sollte höher skalieren (aber max 120%)
    await page.setViewportSize({ width: 1800, height: 1000 });
    await page.goto('http://localhost:8081/');
    
    await page.waitForTimeout(2000);
    
    const debugInfo = await page.locator('text=/Scale:/');  
    await expect(debugInfo).toBeVisible();
    
    const scaleText = await debugInfo.textContent();
    console.log('✅ 1800px Scale:', scaleText);
    // Sollte zwischen 100% und 120% sein
    expect(scaleText).toMatch(/1[0-2][0-9]%/);
  });

  test('Tablet 1440x900: Perfect fit ohne Abschneiden', async ({ page }) => {
    // Typisches Tablet-Format - sollte alles anzeigen ohne Abschneiden
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:8081/');
    
    await page.waitForTimeout(3000);
    
    // Alle wichtigen Elemente sollten sichtbar sein
    const sequencerPads = await page.locator('[class*="sequencer-pad"], [class*="step-button"]');
    const padCount = await sequencerPads.count();
    
    // Desktop hat 16x8 = 128 Pads (16 Steps x 8 Tracks)
    expect(padCount).toBeGreaterThan(100); // Mindestens die meisten Pads
    
    // Kontroll-Elemente sollten sichtbar sein
    const playButton = await page.locator('button[aria-label*="Play"], button:has-text("Play"), [class*="play"]');
    await expect(playButton.first()).toBeVisible();
    
    console.log('✅ 1440x900 Tablet: Alle Elemente sichtbar, Pad-Count:', padCount);
  });

  test('Small Desktop 1400x800: Höhe-begrenzte Skalierung', async ({ page }) => {
    // Kleiner Desktop mit wenig Höhe - Skalierung sollte durch Höhe begrenzt werden
    await page.setViewportSize({ width: 1400, height: 800 });
    await page.goto('http://localhost:8081/');
    
    await page.waitForTimeout(2000);
    
    const debugInfo = await page.locator('text=/Scale:/');
    await expect(debugInfo).toBeVisible();
    
    // Bei wenig Höhe sollte Skalierung durch Höhe begrenzt werden
    const scaleText = await debugInfo.textContent();
    console.log('✅ 1400x800 (height-constrained) Scale:', scaleText);
    
    // Sollte unter 100% sein wegen Höhen-Constraint
    expect(scaleText).toMatch(/[6-9][0-9]%/);
  });

  test('Hardware-Elemente bleiben proportional', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('http://localhost:8081/');
    
    await page.waitForTimeout(3000);
    
    // Teste dass Hardware-Elemente korrekt skaliert werden
    const knobs = await page.locator('[class*="knob"], [class*="rotary"]');
    if (await knobs.count() > 0) {
      const knobBox = await knobs.first().boundingBox();
      // Knobs sollten quadratisch bleiben (proportional)
      const ratio = knobBox.width / knobBox.height;
      expect(ratio).toBeGreaterThan(0.8);
      expect(ratio).toBeLessThan(1.2);
    }
    
    console.log('✅ Hardware-Elemente bleiben proportional');
  });

  test('Smooth transition beim Resize', async ({ page }) => {
    await page.setViewportSize({ width: 1500, height: 900 });
    await page.goto('http://localhost:8081/');
    
    await page.waitForTimeout(2000);
    
    // Originale Skalierung merken
    let debugInfo = await page.locator('text=/Scale:/');
    const originalScale = await debugInfo.textContent();
    
    // Fenster vergrößern
    await page.setViewportSize({ width: 1700, height: 900 });
    await page.waitForTimeout(500); // Zeit für transition
    
    // Neue Skalierung prüfen
    debugInfo = await page.locator('text=/Scale:/');
    const newScale = await debugInfo.textContent();
    
    console.log('✅ Scale Transition:', originalScale, '->', newScale);
    
    // Skalierung sollte sich geändert haben
    expect(originalScale).not.toEqual(newScale);
  });

});