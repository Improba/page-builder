import { expect, test } from '@playwright/test';

async function openPlaygroundAndEnterEditMode(page: import('@playwright/test').Page) {
  await page.goto('/');

  const readModeButton = page.getByRole('button', { name: 'Read Mode' });
  const editModeButton = page.getByRole('button', { name: 'Edit Mode' });

  await expect(readModeButton).toBeVisible();
  await expect(editModeButton).toBeVisible();

  // Exercise the real mode switch path before editing.
  await readModeButton.click();
  await expect(readModeButton).toHaveClass(/active/);

  await editModeButton.click();
  await expect(editModeButton).toHaveClass(/active/);
}

test.describe('playground editor workflow', () => {
  test('opens playground and can switch read/edit mode', async ({ page }) => {
    await openPlaygroundAndEnterEditMode(page);
    await expect(page.getByRole('toolbar', { name: 'Editor toolbar' })).toBeVisible();
  });

  test('selects a node, edits prop and saves @smoke', async ({ page }) => {
    await openPlaygroundAndEnterEditMode(page);

    const nodeTree = page.getByRole('tree', { name: 'Node tree' });
    await expect(nodeTree).toBeVisible();

    const firstTreeNode = nodeTree.locator('.ipb-tree-panel__item').first();
    await firstTreeNode.click();
    await expect(firstTreeNode).toHaveAttribute('aria-selected', 'true');

    const gapPropInput = page.locator('[data-prop-key="gap"] input.ipb-prop-editor--text');
    await expect(gapPropInput).toBeVisible();
    await gapPropInput.fill('32px');

    await expect(page.locator('.ipb-toolbar__dirty-indicator')).toBeVisible();

    const saveLogPromise = page.waitForEvent('console', {
      predicate: (msg) => msg.type() === 'log' && msg.text().includes('[Playground] Save:'),
    });

    await page.getByRole('button', { name: 'Save page' }).click();

    const saveLog = await saveLogPromise;
    expect(saveLog.text()).toContain('"gap": "32px"');
  });
});
