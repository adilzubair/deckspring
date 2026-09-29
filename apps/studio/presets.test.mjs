import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { installStarterThemes, STARTER_THEMES } from './presets.mjs';
import { parseThemeMarkdown, renderThemeDemoSource, validateThemeSpec } from './theme.mjs';

async function withStudioDirs(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'deckspring-starters-'));
  const themesRoot = path.join(root, 'themes');
  const localRoot = path.join(root, '.local');
  await fs.mkdir(themesRoot);
  try {
    await run(themesRoot, localRoot);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('starter themes are validated and installed as trusted, paired Studio bundles', async () => {
  await withStudioDirs(async (themesRoot, localRoot) => {
    const ids = await installStarterThemes(themesRoot, localRoot);
    assert.deepEqual(
      ids,
      STARTER_THEMES.map(({ id }) => id),
    );
    for (const { id, spec } of STARTER_THEMES) {
      assert.deepEqual(validateThemeSpec(spec), spec);
      const markdown = await fs.readFile(path.join(themesRoot, `${id}.md`), 'utf8');
      const demo = await fs.readFile(path.join(themesRoot, `${id}.demo.tsx`), 'utf8');
      assert.deepEqual(parseThemeMarkdown(markdown), spec);
      assert.equal(demo, renderThemeDemoSource(spec));
    }
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(localRoot, 'starter-themes.json'))), {
      installed: ids,
    });
  });
});

test('restart preserves user edits and intentional deletion', async () => {
  await withStudioDirs(async (themesRoot, localRoot) => {
    await installStarterThemes(themesRoot, localRoot);
    await fs.appendFile(path.join(themesRoot, 'bright-sans.md'), '\nUser edit.\n');
    await fs.rm(path.join(themesRoot, 'aurora.md'));
    await fs.rm(path.join(themesRoot, 'aurora.demo.tsx'));

    await installStarterThemes(themesRoot, localRoot);

    assert.match(await fs.readFile(path.join(themesRoot, 'bright-sans.md'), 'utf8'), /User edit/);
    await assert.rejects(() => fs.access(path.join(themesRoot, 'aurora.md')), { code: 'ENOENT' });
    await assert.rejects(() => fs.access(path.join(themesRoot, 'aurora.demo.tsx')), {
      code: 'ENOENT',
    });
  });
});

test('pre-existing theme ID collision is never overwritten or paired automatically', async () => {
  await withStudioDirs(async (themesRoot, localRoot) => {
    const existing = path.join(themesRoot, 'bright-sans.md');
    await fs.writeFile(existing, '# My Bright Sans\n');

    await installStarterThemes(themesRoot, localRoot);

    assert.equal(await fs.readFile(existing, 'utf8'), '# My Bright Sans\n');
    await assert.rejects(() => fs.access(path.join(themesRoot, 'bright-sans.demo.tsx')), {
      code: 'ENOENT',
    });
    assert.match(await fs.readFile(path.join(themesRoot, 'aurora.md'), 'utf8'), /Aurora/);
  });
});
