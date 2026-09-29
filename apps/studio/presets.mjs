import fs from 'node:fs/promises';
import path from 'node:path';
import { validateThemeSpec, writeThemeBundle } from './theme.mjs';

const baseThemes = [
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
  {
    id: 'replit',
    spec: {
      name: 'Replit',
      description: 'Warm developer workspace with orange signals, code labels, and clear panels.',
      mode: 'light',
      palette: {
        background: '#FAF6F1',
        text: '#2F3034',
        accent: '#FF3C00',
        muted: '#6E6F77',
        surface: '#FFFFFF',
        border: '#D9D1C9',
      },
      typography: {
        display: 'Space Grotesk, Trebuchet MS, Arial, sans-serif',
        body: 'IBM Plex Sans, Arial, sans-serif',
        mono: 'IBM Plex Mono, Consolas, monospace',
        headingWeight: 700,
        bodyWeight: 400,
      },
      layout: { composition: 'split', alignment: 'left', padding: 128, radius: 10 },
      motif: 'dot',
      motion: 'subtle',
      aesthetic:
        'Borrow the rhythm of an IDE, not its clutter. Use an orange focal point, terminal-like labels, warm cream space, and precise white panels with short purposeful transitions.',
    },
  },
  {
    id: 'minecraft',
    spec: {
      name: 'Minecraft',
      description: 'Dark stone, grass-green blocks, square corners, and pixel-interface rhythm.',
      mode: 'dark',
      palette: {
        background: '#26222B',
        text: '#F9FFFF',
        accent: '#6CC349',
        muted: '#B4B6AC',
        surface: '#313036',
        border: '#7A5333',
      },
      typography: {
        display: 'Press Start 2P, Courier New, monospace',
        body: 'VT323, Courier New, monospace',
        mono: 'Courier New, monospace',
        headingWeight: 400,
        bodyWeight: 400,
      },
      layout: { composition: 'modular', alignment: 'left', padding: 120, radius: 0 },
      motif: 'pixel',
      motion: 'static',
      aesthetic:
        'Build the composition from crisp square units. Use grass-green only for key marks, dark stone as the field, recessed inventory-like panels, and no blurred shadows or rounded edges.',
    },
  },
];

const original = Object.fromEntries(baseThemes.map(({ id, spec }) => [id, spec]));
const variants = [
  {
    id: 'bright-sans-graphite',
    spec: {
      ...original['bright-sans'],
      name: 'Bright Sans / Graphite',
      description: 'A dark, high-contrast version of Bright Sans for product and data briefings.',
      mode: 'dark',
      palette: {
        background: '#111827',
        text: '#F9FAFB',
        accent: '#93C5FD',
        muted: '#B1BDCB',
        surface: '#1F2937',
        border: '#374151',
      },
      layout: { composition: 'editorial', alignment: 'left', padding: 124, radius: 8 },
      motif: 'line',
      motion: 'static',
      aesthetic:
        'Keep the Bright Sans hierarchy but sharpen it for a graphite canvas. Use a single icy-blue rule or datum, tight headings, and restrained structural lines rather than glow.',
    },
  },
  {
    id: 'aurora-polar',
    spec: {
      ...original.aurora,
      name: 'Aurora / Polar',
      description:
        'An icy daylight interpretation of Aurora with teal signals and spacious splits.',
      mode: 'light',
      palette: {
        background: '#EAF5F7',
        text: '#123641',
        accent: '#14788F',
        muted: '#52717B',
        surface: '#FFFFFF',
        border: '#B9D4DB',
      },
      layout: { composition: 'split', alignment: 'left', padding: 128, radius: 16 },
      aesthetic:
        'Keep Aurora’s quiet technical structure, but move into cold daylight. Use one teal atmospheric halo, large calm headings, and generous unfilled space between paired ideas.',
    },
  },
  {
    id: 'sticker-pop-mint',
    spec: {
      ...original['sticker-pop'],
      name: 'Sticker Pop / Mint',
      description: 'A fresh mint variation with grape ink and bright pink punctuation.',
      palette: {
        background: '#E9FFE8',
        text: '#25315E',
        accent: '#D83681',
        muted: '#667493',
        surface: '#D3F7BA',
        border: '#25315E',
      },
      aesthetic:
        'Let the mint field feel like cut paper. Use one bright pink sticker-like point, bold grape headings, and rounded panels with plenty of breathing room.',
    },
  },
  {
    id: 'replit-night',
    spec: {
      ...original.replit,
      name: 'Replit / Night',
      description: 'A low-light developer canvas with orange prompts and dark terminal panels.',
      mode: 'dark',
      palette: {
        background: '#15191F',
        text: '#F1F3EF',
        accent: '#FF7042',
        muted: '#A7B1B0',
        surface: '#20262D',
        border: '#3A434D',
      },
      layout: { composition: 'modular', alignment: 'left', padding: 128, radius: 10 },
      aesthetic:
        'Translate the workspace into night mode without neon overload. Keep terminal labels small, content panels structured, and one orange prompt as the focus of each page.',
    },
  },
  {
    id: 'minecraft-nether',
    spec: {
      ...original.minecraft,
      name: 'Minecraft / Nether',
      description: 'Obsidian, portal purple, and crisp pixel blocks for a darker game-world story.',
      palette: {
        background: '#140C20',
        text: '#FFF4FF',
        accent: '#A24CF0',
        muted: '#B7A6C4',
        surface: '#2A153E',
        border: '#6F3B96',
      },
      layout: { composition: 'poster', alignment: 'left', padding: 120, radius: 0 },
      aesthetic:
        'Use the same square inventory logic in a Nether register. Let one portal-purple block anchor each page; avoid gradients, soft shadows, and smooth ornamental motion.',
    },
  },
];

export const STARTER_THEMES = [...baseThemes, ...variants].map(({ id, spec }) => ({
  id,
  spec: validateThemeSpec(spec),
}));

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
