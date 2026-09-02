import { test, expect } from '@playwright/test';

test.describe('Advanced Animations E2E', () => {
  test('should open animation modal and set an entrance animation', async ({ page }) => {
    // Navigate to the editor page (replace with an actual valid ID or setup data)
    await page.goto('/advertising/test-campaign-id/edit');

    // Wait for the builder to load
    await expect(page.locator('text=Editor')).toBeVisible({ timeout: 10000 });

    // Select an element (e.g., header)
    const headerElement = page.locator('header').first();
    await headerElement.click();

    // Verify Property Panel opens
    const propertyPanel = page.locator('text=Editor');
    await expect(propertyPanel).toBeVisible();

    // Click Advanced Animations button
    const advancedAnimationsBtn = page.locator('text=Advanced Animations');
    await advancedAnimationsBtn.click();

    // Verify Animation Modal opens
    const animationModal = page.locator('text=Animation Properties');
    await expect(animationModal).toBeVisible();

    // Select 'fade-in' from preset
    await page.selectOption('select', 'fade-in');

    // Adjust duration slider
    const durationInput = page.locator('input[type="range"]').first();
    await durationInput.fill('1.5');

    // Close the modal
    await page.locator('button:has-text("Close")').click();

    // Verify that the animation properties were applied (e.g., config updated or classes added)
    // Note: Since this renders with framer-motion, we can verify if the style/animation data attributes updated on the header.
  });
});
