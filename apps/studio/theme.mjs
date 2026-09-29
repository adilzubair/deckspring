import { randomBytes, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const HEX_RE = /^#[0-9a-f]{6}$/i;
const MODES = new Set(['light', 'dark']);
const COMPOSITIONS = new Set(['editorial', 'modular', 'split', 'poster']);
const ALIGNMENTS = new Set(['left', 'center']);
const MOTIFS = new Set(['line', 'block', 'dot', 'frame', 'glow']);
const MOTIONS = new Set(['static', 'subtle', 'rich']);
export const THEME_ID_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

function text(value, max, label) {
  const result = typeof value === 'string' ? value.trim().slice(0, max) : '';
  if (!result) throw new Error(`${label} is required.`);
  return result;
}

function enumValue(value, choices, label) {
  if (!choices.has(value)) throw new Error(`Choose a valid ${label}.`);
  return value;
}

function color(value, label) {
  const result = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!HEX_RE.test(result)) throw new Error(`${label} must be a six-digit hex color.`);
  return result;
}

function integer(value, min, max, label) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < min || result > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }
  return result;
}

export function validateThemeSpec(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('The theme specification is missing.');
  const palette = raw.palette && typeof raw.palette === 'object' ? raw.palette : {};
  const typography = raw.typography && typeof raw.typography === 'object' ? raw.typography : {};
  const layout = raw.layout && typeof raw.layout === 'object' ? raw.layout : {};
  return {
    version: 1,
    name: text(raw.name, 80, 'Theme name'),
    description: text(raw.description, 180, 'Theme description'),
    mode: enumValue(raw.mode, MODES, 'theme mode'),
    palette: {
      background: color(palette.background, 'Background'),
      text: color(palette.text, 'Text'),
      accent: color(palette.accent, 'Accent'),
      muted: color(palette.muted, 'Muted'),
      surface: color(palette.surface, 'Surface'),
      border: color(palette.border, 'Border'),
    },
    typography: {
      display: text(typography.display, 180, 'Display font'),
      body: text(typography.body, 180, 'Body font'),
      mono: text(typography.mono, 180, 'Monospace font'),
      headingWeight: integer(typography.headingWeight, 400, 900, 'Heading weight'),
      bodyWeight: integer(typography.bodyWeight, 300, 700, 'Body weight'),
    },
    layout: {
      composition: enumValue(layout.composition, COMPOSITIONS, 'composition'),
      alignment: enumValue(layout.alignment, ALIGNMENTS, 'alignment'),
      padding: integer(layout.padding, 64, 180, 'Canvas padding'),
      radius: integer(layout.radius, 0, 48, 'Corner radius'),
    },
    motif: enumValue(raw.motif, MOTIFS, 'motif'),
    motion: enumValue(raw.motion, MOTIONS, 'motion level'),
    aesthetic: text(raw.aesthetic, 900, 'Aesthetic guidance'),
  };
}

export function makeThemeId(name) {
  const slug = String(name ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
    .replace(/-$/g, '');
  return slug || `theme-${randomBytes(3).toString('hex')}`;
}

export function validateThemeId(id) {
  if (typeof id !== 'string' || !THEME_ID_RE.test(id)) {
    throw new Error('Theme ID must use lowercase letters, numbers, and hyphens.');
  }
  return id;
}

export function themePrompt(source) {
  const sourceText =
    source.kind === 'prompt'
      ? `Create a reusable presentation theme from this direction:\n${source.prompt}`
      : source.kind === 'slide'
        ? `Extract a reusable presentation theme from this React slide source. Preserve its actual visual identity instead of inventing a new one:\n${source.content}`
        : `Convert this existing theme bundle into a structured Deckspring theme while preserving its visual identity:\n${source.content}`;
  return [
    sourceText,
    'Return one JSON object only. Do not return Markdown, React, CSS, or explanation.',
    'Schema: {"name":"...","description":"...","mode":"light|dark","palette":{"background":"#RRGGBB","text":"#RRGGBB","accent":"#RRGGBB","muted":"#RRGGBB","surface":"#RRGGBB","border":"#RRGGBB"},"typography":{"display":"CSS font stack","body":"CSS font stack","mono":"CSS font stack","headingWeight":700,"bodyWeight":400},"layout":{"composition":"editorial|modular|split|poster","alignment":"left|center","padding":112,"radius":12},"motif":"line|block|dot|frame|glow","motion":"static|subtle|rich","aesthetic":"..."}',
    'Use exactly six-digit hex colors. Keep contrast readable. Font values must be practical CSS fallback stacks without remote imports. Commit to one distinctive visual direction and avoid generic gradient-heavy SaaS styling.',
  ].join('\n\n');
}

function quote(value) {
  return JSON.stringify(String(value));
}

export function renderThemeMarkdown(rawSpec) {
  const spec = validateThemeSpec(rawSpec);
  const { palette, typography, layout } = spec;
  return `---
name: ${quote(spec.name)}
description: ${quote(spec.description)}
mode: ${spec.mode}
studio-spec: 1
background: ${quote(palette.background)}
text: ${quote(palette.text)}
accent: ${quote(palette.accent)}
muted: ${quote(palette.muted)}
surface: ${quote(palette.surface)}
border: ${quote(palette.border)}
display-font: ${quote(typography.display)}
body-font: ${quote(typography.body)}
mono-font: ${quote(typography.mono)}
heading-weight: ${typography.headingWeight}
body-weight: ${typography.bodyWeight}
composition: ${layout.composition}
alignment: ${layout.alignment}
padding: ${layout.padding}
radius: ${layout.radius}
motif: ${spec.motif}
motion: ${spec.motion}
aesthetic: ${quote(spec.aesthetic)}
---

# ${spec.name}

## Palette

| Role | Value | Notes |
| --- | --- | --- |
| bg | \`${palette.background}\` | Page background |
| text | \`${palette.text}\` | Primary copy |
| accent | \`${palette.accent}\` | Emphasis and key marks |
| muted | \`${palette.muted}\` | Secondary copy |
| surface | \`${palette.surface}\` | Panels and content fields |
| border | \`${palette.border}\` | Structural lines |

## Typography

- Display font: \`${typography.display}\` — weight ${typography.headingWeight}.
- Body font: \`${typography.body}\` — weight ${typography.bodyWeight}.
- Mono font: \`${typography.mono}\` — metadata and counters.
- Hero title: 128 px; page heading: 72 px; body: 34 px; caption: 22 px.

## Layout

- Content padding: ${layout.padding} px on a 1920 × 1080 canvas.
- Composition: ${layout.composition}; ${layout.alignment}-aligned.
- Corners: ${layout.radius} px radius.
- Motif: one restrained ${spec.motif} treatment per page.

## Fixed components

### Title

\`\`\`tsx
const Title = ({ children }: { children: React.ReactNode }) => (
  <h1 style={{ margin: 0, color: '${palette.text}', fontFamily: ${quote(typography.display)}, fontSize: 128, fontWeight: ${typography.headingWeight}, lineHeight: 1.02, letterSpacing: '-0.045em' }}>
    {children}
  </h1>
);
\`\`\`

### Footer

\`\`\`tsx
import { useSlidePageNumber } from '@deckspring/core';

const Footer = () => {
  const { current, total } = useSlidePageNumber();
  return <div style={{ position: 'absolute', left: ${layout.padding}, right: ${layout.padding}, bottom: 54, display: 'flex', justifyContent: 'space-between', color: '${palette.muted}', fontFamily: ${quote(typography.mono)}, fontSize: 22 }}>
    <span>${spec.name}</span><span>{current} / {total}</span>
  </div>;
};
\`\`\`

### Eyebrow

\`\`\`tsx
const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ color: '${palette.accent}', fontFamily: ${quote(typography.mono)}, fontSize: 22, letterSpacing: '0.14em' }}>{children}</div>
);
\`\`\`

## Motion

- Philosophy: ${spec.motion}. ${spec.motion === 'static' ? 'Keep every page still.' : 'Use short, purposeful entrances and respect reduced-motion preferences.'}

## Aesthetic

${spec.aesthetic}

## Example usage

Use the Title, Footer, and Eyebrow components above with the palette and layout tokens. Keep one idea per page and repeat the ${spec.motif} motif with restraint.
`;
}

export function renderThemeDemoSource(rawSpec) {
  const spec = validateThemeSpec(rawSpec);
  const data = JSON.stringify(spec, null, 2);
  return `import type { CSSProperties, ReactNode } from 'react';
import { type Page, useSlidePageNumber } from '@deckspring/core';

const theme = ${data};
const p = theme.palette;
const t = theme.typography;
const l = theme.layout;
const enter = theme.motion === 'static' ? undefined : 'ds-theme-in 650ms cubic-bezier(0.22, 1, 0.36, 1) both';
const styles = \`@keyframes ds-theme-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } } @media (prefers-reduced-motion: reduce) { .ds-theme-motion { animation: none !important; } }\`;
const base: CSSProperties = { width: '100%', height: '100%', boxSizing: 'border-box', position: 'relative', overflow: 'hidden', padding: l.padding, background: p.background, color: p.text, fontFamily: t.body, textAlign: l.alignment };

const Title = ({ children }: { children: ReactNode }) => <h1 style={{ margin: 0, maxWidth: 1460, fontFamily: t.display, fontSize: 128, fontWeight: t.headingWeight, lineHeight: 1.02, letterSpacing: '-0.045em' }}>{children}</h1>;
const Eyebrow = ({ children }: { children: ReactNode }) => <div style={{ color: p.accent, fontFamily: t.mono, fontSize: 22, letterSpacing: '0.14em' }}>{children}</div>;
const Footer = () => { const { current, total } = useSlidePageNumber(); return <div style={{ position: 'absolute', left: l.padding, right: l.padding, bottom: 54, display: 'flex', justifyContent: 'space-between', color: p.muted, fontFamily: t.mono, fontSize: 22 }}><span>{theme.name}</span><span>{current} / {total}</span></div>; };
const Mark = () => theme.motif === 'glow' ? <div style={{ position: 'absolute', width: 760, height: 760, right: -180, top: -250, borderRadius: '50%', background: \`radial-gradient(circle, \${p.accent}55, transparent 68%)\` }} /> : theme.motif === 'frame' ? <div style={{ position: 'absolute', inset: 42, border: \`3px solid \${p.border}\`, borderRadius: l.radius }} /> : theme.motif === 'dot' ? <div style={{ position: 'absolute', right: l.padding, top: l.padding, width: 74, height: 74, borderRadius: '50%', background: p.accent }} /> : theme.motif === 'block' ? <div style={{ position: 'absolute', right: 0, top: 0, width: 360, height: '100%', background: p.surface }} /> : <div style={{ position: 'absolute', left: l.padding, right: l.padding, top: l.padding, height: 8, background: p.accent }} />;

const Cover: Page = () => <div style={{ ...base, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: l.alignment === 'center' ? 'center' : 'flex-start', gap: 30 }}><style>{styles}</style><Mark /><div className="ds-theme-motion" style={{ position: 'relative', zIndex: 1, display: 'grid', gap: 30, animation: enter }}><Eyebrow>THEME SPECIMEN</Eyebrow><Title>{theme.name}</Title><p style={{ margin: 0, maxWidth: 1120, color: p.muted, fontSize: 34, lineHeight: 1.35 }}>{theme.description}</p></div><Footer /></div>;
const Content: Page = () => <div style={{ ...base, display: 'flex', flexDirection: 'column', gap: 42 }}><style>{styles}</style><Mark /><div className="ds-theme-motion" style={{ position: 'relative', zIndex: 1, animation: enter }}><Eyebrow>DESIGN LANGUAGE</Eyebrow><h2 style={{ margin: '28px 0 0', maxWidth: 1320, fontFamily: t.display, fontSize: 72, lineHeight: 1.08 }}>A system for clear, memorable ideas.</h2><div style={{ display: 'grid', gridTemplateColumns: l.composition === 'split' ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 24, marginTop: 54 }}>{['Hierarchy', 'Rhythm', 'Voice'].map((label, index) => <div key={label} style={{ minHeight: 220, padding: 30, borderRadius: l.radius, background: p.surface, border: \`2px solid \${index === 0 ? p.accent : p.border}\` }}><div style={{ color: p.accent, fontFamily: t.mono, fontSize: 20 }}>0{index + 1}</div><div style={{ marginTop: 50, fontFamily: t.display, fontSize: 38, fontWeight: t.headingWeight }}>{label}</div><p style={{ color: p.muted, fontSize: 24, lineHeight: 1.4 }}>One deliberate visual decision, repeated with restraint.</p></div>)}</div></div><Footer /></div>;
const Closer: Page = () => <div style={{ ...base, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: l.alignment === 'center' ? 'center' : 'flex-start', gap: 26 }}><style>{styles}</style><Mark /><div className="ds-theme-motion" style={{ position: 'relative', zIndex: 1, animation: enter }}><Eyebrow>READY TO USE</Eyebrow><Title>Make the next deck unmistakable.</Title><p style={{ color: p.muted, fontSize: 34, maxWidth: 980, lineHeight: 1.35 }}>The theme is saved as a readable recipe and a live preview.</p></div><Footer /></div>;

export default [Cover, Content, Closer];
`;
}

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseThemeMarkdown(raw) {
  const match = String(raw).match(FM_RE);
  if (!match) return null;
  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^([a-z0-9-]+)\s*:\s*(.*)$/i);
    if (!item) continue;
    let value = item[2].trim();
    try {
      if (value.startsWith('"')) value = JSON.parse(value);
    } catch {}
    values[item[1]] = value;
  }
  if (String(values['studio-spec']) !== '1') return null;
  try {
    return validateThemeSpec({
      name: values.name,
      description: values.description,
      mode: values.mode,
      palette: {
        background: values.background,
        text: values.text,
        accent: values.accent,
        muted: values.muted,
        surface: values.surface,
        border: values.border,
      },
      typography: {
        display: values['display-font'],
        body: values['body-font'],
        mono: values['mono-font'],
        headingWeight: Number(values['heading-weight']),
        bodyWeight: Number(values['body-weight']),
      },
      layout: {
        composition: values.composition,
        alignment: values.alignment,
        padding: Number(values.padding),
        radius: Number(values.radius),
      },
      motif: values.motif,
      motion: values.motion,
      aesthetic: values.aesthetic || extractSection(raw, 'Aesthetic') || values.description,
    });
  } catch {
    return null;
  }
}

function extractSection(raw, heading) {
  const match = String(raw).match(new RegExp(`^## ${heading}\\r?\\n+([\\s\\S]*?)(?=^## |$)`, 'm'));
  return match?.[1]?.trim() ?? '';
}

export async function readThemeBundle(themesRoot, id) {
  validateThemeId(id);
  const markdownPath = path.join(themesRoot, `${id}.md`);
  const demoPath = path.join(themesRoot, `${id}.demo.tsx`);
  const markdown = await fs.readFile(markdownPath, 'utf8');
  const demo = await fs.readFile(demoPath, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  return { id, markdown, demo, spec: parseThemeMarkdown(markdown) };
}

async function restoreFile(file, content) {
  if (content === null) await fs.rm(file, { force: true });
  else await fs.writeFile(file, content, 'utf8');
}

export async function writeThemeBundle(themesRoot, id, rawSpec, options = {}) {
  validateThemeId(id);
  const spec = validateThemeSpec(rawSpec);
  await fs.mkdir(themesRoot, { recursive: true });
  const markdownPath = path.join(themesRoot, `${id}.md`);
  const demoPath = path.join(themesRoot, `${id}.demo.tsx`);
  const oldMarkdown = await fs.readFile(markdownPath, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  const oldDemo = await fs.readFile(demoPath, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!options.replace && oldMarkdown !== null)
    throw new Error('A theme with this ID already exists.');
  const token = randomUUID();
  const markdownTemp = path.join(themesRoot, `.${id}.${token}.md`);
  const demoTemp = path.join(themesRoot, `.${id}.demo.${token}.tsx`);
  try {
    await fs.writeFile(markdownTemp, renderThemeMarkdown(spec), { flag: 'wx' });
    await fs.writeFile(demoTemp, renderThemeDemoSource(spec), { flag: 'wx' });
    if (options.formatDemo) await options.formatDemo(demoTemp);
    await fs.writeFile(markdownPath, await fs.readFile(markdownTemp, 'utf8'), 'utf8');
    await fs.writeFile(demoPath, await fs.readFile(demoTemp, 'utf8'), 'utf8');
  } catch (error) {
    await restoreFile(markdownPath, oldMarkdown);
    await restoreFile(demoPath, oldDemo);
    throw error;
  } finally {
    await fs.rm(markdownTemp, { force: true });
    await fs.rm(demoTemp, { force: true });
  }
  return { id, spec, markdownPath, demoPath };
}

export async function repairThemeDemo(themesRoot, id, options = {}) {
  const bundle = await readThemeBundle(themesRoot, id);
  if (!bundle.spec) throw new Error('Import this theme into Studio before repairing its preview.');
  const demoPath = path.join(themesRoot, `${id}.demo.tsx`);
  const oldDemo = bundle.demo;
  const temp = path.join(themesRoot, `.${id}.demo.${randomUUID()}.tsx`);
  try {
    await fs.writeFile(temp, renderThemeDemoSource(bundle.spec), { flag: 'wx' });
    if (options.formatDemo) await options.formatDemo(temp);
    await fs.writeFile(demoPath, await fs.readFile(temp, 'utf8'));
  } catch (error) {
    await restoreFile(demoPath, oldDemo);
    throw error;
  } finally {
    await fs.rm(temp, { force: true });
  }
  return bundle.spec;
}

export function sourceUsesTheme(source, themeId) {
  const escaped = themeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:theme|["']theme["'])\\s*:\\s*["']${escaped}["']`).test(source);
}

export function detachThemeReference(source, themeId) {
  if (!sourceUsesTheme(source, themeId)) return source;
  const escaped = themeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const property = `(?:theme|["']theme["'])\\s*:\\s*["']${escaped}["']`;
  let next = source.replace(new RegExp(`${property}\\s*,`), '');
  if (next === source) next = source.replace(new RegExp(`,\\s*${property}`), '');
  if (next === source) next = source.replace(new RegExp(property), '');
  return next.replace(/\{\s*,/, '{').replace(/,\s*}/, ' }');
}
