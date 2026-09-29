import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const scratchThemes = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../.scratch/dev/themes',
);

const spec = {
  version: 1,
  name: 'Signal Frame',
  description: 'A precise editorial system for clear product stories.',
  mode: 'light',
  palette: {
    background: '#F6F7FB',
    text: '#172033',
    accent: '#3157D5',
    muted: '#61708A',
    surface: '#FFFFFF',
    border: '#CAD2E1',
  },
  typography: {
    display: 'Aptos, system-ui, sans-serif',
    body: 'Aptos, system-ui, sans-serif',
    mono: 'Consolas, monospace',
    headingWeight: 700,
    bodyWeight: 400,
  },
  layout: { composition: 'editorial', alignment: 'left', padding: 112, radius: 8 },
  motif: 'line',
  motion: 'subtle',
  aesthetic: 'Direct and spacious, with one cobalt rule per page.',
};

async function mockStudio(page: import('@playwright/test').Page) {
  await page.route('**/__studio/models', async (route) => {
    await route.fulfill({
      json: {
        models: [
          {
            id: 'local-model',
            name: 'Local model',
            baseUrl: 'http://127.0.0.1:11434/v1',
            model: 'test-model',
            hasKey: false,
          },
        ],
      },
    });
  });
  await page.route('**/__studio/themes/propose', async (route) => {
    await route.fulfill({ json: { spec, suggestedId: 'signal-frame' } });
  });
  await page.route('**/__studio/themes', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        json: { id: 'signal-frame', url: '/themes/signal-frame' },
      });
      return;
    }
    await route.fallback();
  });
}

test('offers a keyboard-accessible empty-state CTA and both theme source modes', async ({
  page,
}) => {
  await mockStudio(page);
  await page.goto('/themes');

  await expect(page.getByText('No themes yet')).toBeVisible();
  await expect(page.getByText('/create-theme')).toHaveCount(0);
  const createButtons = page.getByRole('button', { name: 'Create theme' });
  await expect(createButtons).toHaveCount(2);
  await createButtons.last().focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/themes\/new$/);

  await expect(page.getByRole('button', { name: 'Describe a theme' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Extract from deck' }).click();
  await expect(page.getByLabel('Choose a deck')).toBeVisible();
  await page.getByRole('button', { name: 'Describe a theme' }).click();
  await expect(page.getByLabel('What should this theme feel like?')).toBeVisible();
});

test('edits a generated theme against the preview and saves explicit data', async ({ page }) => {
  await mockStudio(page);
  await page.goto('/themes/new');
  await page
    .getByLabel('What should this theme feel like?')
    .fill('A crisp cobalt editorial system with precise rules and generous whitespace.');
  await page.getByRole('button', { name: 'Generate draft' }).click();

  await expect(page.getByText('Live preview')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Signal Frame' })).toBeVisible();
  await page.getByLabel('Theme name').fill('Signal Atlas');
  await expect(page.getByRole('heading', { name: 'Signal Atlas' })).toBeVisible();
  await page.getByRole('button', { name: 'Next preview' }).click();
  await expect(page.getByText('Design language', { exact: true })).toBeVisible();

  const saveRequest = page.waitForRequest(
    (request) => request.url().endsWith('/__studio/themes') && request.method() === 'POST',
  );
  await page.getByRole('button', { name: 'Save theme' }).click();
  const request = await saveRequest;
  expect(request.postDataJSON()).toMatchObject({
    id: 'signal-frame',
    spec: { name: 'Signal Atlas', palette: { accent: '#3157D5' } },
  });
});

test('edits, duplicates, repairs, deletes, and imports themes from the gallery', async ({
  page,
}) => {
  const markdown = `---
name: "Signal Frame"
description: "A precise editorial system."
mode: light
studio-spec: 1
background: "#F6F7FB"
text: "#172033"
accent: "#3157D5"
muted: "#61708A"
surface: "#FFFFFF"
border: "#CAD2E1"
display-font: "Aptos, system-ui, sans-serif"
body-font: "Aptos, system-ui, sans-serif"
mono-font: "Consolas, monospace"
heading-weight: 700
body-weight: 400
composition: editorial
alignment: left
padding: 112
radius: 8
motif: line
motion: subtle
---

## Aesthetic

Direct and spacious, with one cobalt rule per page.
`;
  const demo = `import type { Page } from '@deckspring/core';
const Preview: Page = () => <div style={{ width: '100%', height: '100%', background: '#F6F7FB', color: '#172033' }}>Signal preview</div>;
export default [Preview];
`;
  const files = [
    path.join(scratchThemes, 'signal-frame.md'),
    path.join(scratchThemes, 'signal-frame.demo.tsx'),
    path.join(scratchThemes, 'legacy.md'),
  ];
  await fs.writeFile(files[0], markdown);
  await fs.writeFile(files[1], demo);
  await fs.writeFile(
    files[2],
    '---\nname: Legacy\ndescription: A free-form theme.\n---\n\n# Legacy\n',
  );
  await new Promise((resolve) => setTimeout(resolve, 300));

  await mockStudio(page);
  await page.route('**/__studio/themes/signal-frame', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ json: { ok: true, detached: ['linked-deck'] } });
      return;
    }
    await route.fulfill({
      json: {
        id: 'signal-frame',
        spec,
        markdown,
        hasDemo: true,
        usedBy: ['linked-deck'],
      },
    });
  });
  await page.route('**/__studio/themes/signal-frame/repair', async (route) => {
    await route.fulfill({ json: { ok: true } });
  });

  try {
    await page.goto('/themes/signal-frame');
    await page.getByRole('button', { name: 'Edit theme' }).click();
    await expect(page).toHaveURL(/\/themes\/signal-frame\/edit$/);
    await expect(page.getByLabel('Theme ID')).toBeDisabled();

    await page.goto('/themes/signal-frame');
    await page.getByRole('button', { name: 'Duplicate' }).click();
    await expect(page).toHaveURL(/\/themes\/new\?duplicate=signal-frame$/);

    await page.goto('/themes/signal-frame');
    const repairRequest = page.waitForRequest((request) =>
      request.url().endsWith('/__studio/themes/signal-frame/repair'),
    );
    await page.getByRole('button', { name: 'Repair preview' }).click();
    await repairRequest;

    await page.goto('/themes/legacy');
    await expect(page.getByRole('button', { name: 'Import into Studio' })).toBeVisible();

    await page.goto('/themes/signal-frame');
    page.once('dialog', (dialog) => dialog.accept());
    const deleteRequest = page.waitForRequest(
      (request) =>
        request.url().endsWith('/__studio/themes/signal-frame') && request.method() === 'DELETE',
    );
    await page.getByRole('button', { name: 'Delete' }).click();
    await deleteRequest;
    await expect(page).toHaveURL(/\/themes$/);
  } finally {
    await Promise.all(files.map((file) => fs.rm(file, { force: true })));
  }
});

test('uses Arabic copy without mobile overflow and honors reduced motion', async ({ page }) => {
  await mockStudio(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/themes');
  await page.getByRole('button', { name: 'Change language' }).click();
  await page.getByRole('menuitem', { name: 'العربية' }).click();
  await expect(page.getByRole('button', { name: 'إنشاء سمة' }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
    true,
  );
});
