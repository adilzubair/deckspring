import { expect, test } from '@playwright/test';
import { deckspring, deleteSlide, duplicateSlide, readSlideSource } from './helpers.ts';

test.describe('design panel', () => {
  test('shuffling and saving writes a design declaration to disk', async ({ page, request }) => {
    try {
      await duplicateSlide(request, 'edit-target', 'design-ui');
      await deckspring(page, 'design-ui');

      await page.keyboard.press('d');
      const shuffle = page.getByRole('button', { name: 'Shuffle design' });
      await expect(shuffle).toBeVisible();
      await shuffle.click();

      const saved = page.waitForResponse(
        (res) => res.url().includes('/__design') && res.request().method() === 'PUT',
      );
      await page.getByRole('button', { name: 'Save' }).click();
      expect((await saved).status()).toBe(200);
      await expect.poll(() => readSlideSource('design-ui')).toContain('const design');
    } finally {
      await deleteSlide(request, 'design-ui');
    }
  });
});
