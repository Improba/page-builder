import { expect, test } from '@playwright/test';
import path from 'node:path';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'docs', 'images');

test.describe('capture docs screenshots', () => {
  test('saves read-mode and edit-mode screenshots to docs/images', async ({ page }) => {
    await page.goto('/');

    const readModeButton = page.getByRole('button', { name: 'Read Mode' });
    const editModeButton = page.getByRole('button', { name: 'Edit Mode' });
    await expect(readModeButton).toBeVisible();
    await expect(editModeButton).toBeVisible();

    // Read mode: switch and capture (content only, no editor UI)
    await readModeButton.click();
    await expect(readModeButton).toHaveClass(/active/);
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'read-mode.png'),
      fullPage: false,
    });

    // Edit mode: switch and capture (toolbar + palette + canvas + props)
    await editModeButton.click();
    await expect(editModeButton).toHaveClass(/active/);
    await expect(page.getByRole('toolbar', { name: 'Editor toolbar' })).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'edit-mode.png'),
      fullPage: false,
    });
  });
});
