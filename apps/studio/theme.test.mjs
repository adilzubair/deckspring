import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  detachThemeReference,
  makeThemeId,
  parseThemeMarkdown,
  renderThemeDemoSource,
  renderThemeMarkdown,
  repairThemeDemo,
  sourceUsesTheme,
  themePrompt,
  validateThemeSpec,
  writeThemeBundle,
} from './theme.mjs';

const spec = {
  name: 'Signal Frame',
  description: 'A precise editorial system with a cobalt line motif.',
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
  aesthetic: 'Direct and spacious. Use one cobalt rule per page and no decorative gradients.',
};

test('validates and round-trips a Studio theme through markdown', () => {
  const validated = validateThemeSpec(spec);
  const markdown = renderThemeMarkdown(validated);
  assert.deepEqual(parseThemeMarkdown(markdown), validated);
  assert.match(markdown, /studio-spec: 1/);
  assert.match(markdown, /## Fixed components/);
  assert.match(renderThemeDemoSource(validated), /export default \[Cover, Content, Closer\]/);
});

test('rejects unsafe IDs and malformed colors', () => {
  assert.equal(makeThemeId(' Signal Frame! '), 'signal-frame');
  assert.throws(() => validateThemeSpec({ ...spec, palette: { ...spec.palette, accent: 'blue' } }));
});

test('builds prompt-only theme requests without asking for executable code', () => {
  const prompt = themePrompt({ kind: 'prompt', prompt: 'Airy museum labels and ultramarine ink.' });
  assert.match(prompt, /Return one JSON object only/);
  assert.match(prompt, /Do not return Markdown, React, CSS/);
});

test('writes paired files, prevents collisions, and repairs a missing demo', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'deckspring-theme-'));
  try {
    await writeThemeBundle(root, 'signal-frame', spec);
    assert.match(await fs.readFile(path.join(root, 'signal-frame.md'), 'utf8'), /Signal Frame/);
    assert.match(
      await fs.readFile(path.join(root, 'signal-frame.demo.tsx'), 'utf8'),
      /DESIGN LANGUAGE/,
    );
    await assert.rejects(() => writeThemeBundle(root, 'signal-frame', spec));
    await fs.rm(path.join(root, 'signal-frame.demo.tsx'));
    await repairThemeDemo(root, 'signal-frame');
    assert.match(await fs.readFile(path.join(root, 'signal-frame.demo.tsx'), 'utf8'), /Cover/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('restores the previous bundle when staged validation fails', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'deckspring-theme-rollback-'));
  try {
    await writeThemeBundle(root, 'signal-frame', spec);
    const markdownBefore = await fs.readFile(path.join(root, 'signal-frame.md'), 'utf8');
    const demoBefore = await fs.readFile(path.join(root, 'signal-frame.demo.tsx'), 'utf8');
    await assert.rejects(() =>
      writeThemeBundle(
        root,
        'signal-frame',
        { ...spec, name: 'Changed' },
        {
          replace: true,
          formatDemo: async () => {
            throw new Error('invalid generated source');
          },
        },
      ),
    );
    assert.equal(await fs.readFile(path.join(root, 'signal-frame.md'), 'utf8'), markdownBefore);
    assert.equal(await fs.readFile(path.join(root, 'signal-frame.demo.tsx'), 'utf8'), demoBefore);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('detaches quoted and unquoted theme metadata without changing slide visuals', () => {
  const multiline = `export const meta = {\n  title: 'Deck',\n  theme: 'signal-frame',\n};\nconst color = '#3157D5';`;
  const json = `export const meta = {"title":"Deck","theme":"signal-frame","createdAt":"now"};`;
  assert.equal(sourceUsesTheme(multiline, 'signal-frame'), true);
  assert.doesNotMatch(detachThemeReference(multiline, 'signal-frame'), /theme:/);
  assert.match(detachThemeReference(multiline, 'signal-frame'), /#3157D5/);
  const detachedJson = detachThemeReference(json, 'signal-frame');
  assert.doesNotMatch(detachedJson, /"theme"/);
  assert.match(detachedJson, /"title":"Deck","createdAt":"now"/);
});
