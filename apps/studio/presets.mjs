import fs from 'node:fs/promises';
import path from 'node:path';
import { validateThemeSpec, writeThemeBundle } from './theme.mjs';

export const STARTER_THEMES = [
  {
    id: 'bright-sans',
    spec: {
      name: 'Bright Sans',
      description: 'A clear product story on white, with generous space and precise blue accents.',
      mode: 'light',
      palette: {
        background: '#FFFFFF',
        text: '#202124',
        accent: '#1A73E8',
        muted: '#5F6368',
        surface: '#F7F9FC',
        border: '#E8EAED',
      },
      typography: {
        display: 'Inter Tight, Inter, Arial, sans-serif',
        body: 'Inter, Arial, sans-serif',
        mono: 'IBM Plex Mono, Consolas, monospace',
        headingWeight: 600,
        bodyWeight: 400,
      },
      layout: { composition: 'modular', alignment: 'left', padding: 120, radius: 24 },
      motif: 'block',
      motion: 'subtle',
      aesthetic:
        'Lead with one blue focal point. Use open white space, soft inset cards, and crisp geometric headings. Keep dividers light and let content carry the page.',
    },
  },
  {
    id: 'aurora',
    spec: {
      name: 'Aurora',
      description:
        'A dark technical deck with violet signals, code-friendly type, and quiet depth.',
      mode: 'dark',
      palette: {
        background: '#0E0E0E',
        text: '#F5F5F5',
        accent: '#A78BFA',
        muted: '#8B8B8B',
        surface: '#161616',
        border: '#2A2A2A',
      },
      typography: {
        display: 'Inter, SF Pro Display, Arial, sans-serif',
        body: 'Inter, Arial, sans-serif',
        mono: 'JetBrains Mono, SFMono-Regular, Consolas, monospace',
        headingWeight: 600,
        bodyWeight: 400,
      },
      layout: { composition: 'split', alignment: 'left', padding: 120, radius: 16 },
      motif: 'glow',
      motion: 'subtle',
      aesthetic:
        'Use one off-center violet halo or signal per page. Pair compact monospace metadata with large calm headings. Let dark surfaces differ through borders and spacing, not heavy shadows.',
    },
  },
  {
    id: 'sticker-pop',
    spec: {
      name: 'Sticker Pop',
      description: 'A lively peach and pink system for energetic ideas and playful launches.',
      mode: 'light',
      palette: {
        background: '#FFF2E8',
        text: '#2D1B4E',
        accent: '#FF4D8D',
        muted: '#806F94',
        surface: '#FFE6D3',
        border: '#2D1B4E',
      },
      typography: {
        display: 'Outfit, Arial Rounded MT Bold, Arial, sans-serif',
        body: 'Inter, Arial, sans-serif',
        mono: 'Consolas, ui-monospace, monospace',
        headingWeight: 800,
        bodyWeight: 500,
      },
      layout: { composition: 'poster', alignment: 'left', padding: 110, radius: 24 },
      motif: 'dot',
      motion: 'rich',
      aesthetic:
        'Treat the title like a bold poster. Place one hot-pink sticker or dot cluster beside the idea, not behind it. Use rounded peach panels and short, cheerful entrances.',
    },
  },
].map(({ id, spec }) => ({ id, spec: validateThemeSpec(spec) }));

async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function installStarterThemes(themesRoot, localRoot, options = {}) {
  const statePath = path.join(localRoot, 'starter-themes.json');
  const state = await fs.readFile(statePath, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  let installed = [];
  if (state) {
    try {
      const parsed = JSON.parse(state);
      if (Array.isArray(parsed?.installed)) {
        installed = parsed.installed.filter((id) => typeof id === 'string');
      }
    } catch {}
  }
  const installedIds = new Set(installed);
  for (const { id, spec } of STARTER_THEMES) {
    if (installedIds.has(id)) continue;
    const markdownPath = path.join(themesRoot, `${id}.md`);
    const demoPath = path.join(themesRoot, `${id}.demo.tsx`);
    if (!(await pathExists(markdownPath)) && !(await pathExists(demoPath))) {
      await writeThemeBundle(themesRoot, id, spec, options);
    }
    installedIds.add(id);
  }
  await fs.mkdir(localRoot, { recursive: true });
  await fs.writeFile(statePath, `${JSON.stringify({ installed: [...installedIds] }, null, 2)}\n`, {
    mode: 0o600,
  });
  return [...installedIds];
}
