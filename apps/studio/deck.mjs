import { randomBytes } from 'node:crypto';

const LAYOUTS = new Set(['cover', 'statement', 'bullets', 'comparison', 'closing']);
export const THEMES = {
  cobalt: { background: '#F5F7FF', ink: '#142240', accent: '#3458E8', soft: '#DCE5FF' },
  citrus: { background: '#FFF9EA', ink: '#26311D', accent: '#DB5B22', soft: '#F6DFB4' },
  evergreen: { background: '#F2F7F0', ink: '#153629', accent: '#2F8063', soft: '#CFE7D9' },
  midnight: { background: '#101C33', ink: '#F4F7FF', accent: '#A6C3FF', soft: '#263A5C' },
};

function shortText(value, max = 240) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function shortList(value, maxItems = 5, maxChars = 85) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => shortText(item, maxChars))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function validateDeck(raw, requestedPages) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.slides)) {
    throw new Error('The model response did not include a slides array.');
  }
  if (raw.slides.length !== requestedPages) {
    throw new Error(
      `The model returned ${raw.slides.length} pages; expected ${requestedPages}. Try again.`,
    );
  }
  const title = shortText(raw.title, 100);
  if (!title) throw new Error('The model response did not include a deck title.');
  const slides = raw.slides.map((slide, index) => {
    if (!slide || typeof slide !== 'object') {
      throw new Error(`Page ${index + 1} is missing.`);
    }
    const page = {
      layout: LAYOUTS.has(slide.layout) ? slide.layout : 'bullets',
      kicker: shortText(slide.kicker, 60),
      title: shortText(slide.title, 100),
      body: shortText(slide.body, 240),
      bullets: shortList(slide.bullets),
      leftTitle: shortText(slide.leftTitle, 100),
      leftBullets: shortList(slide.leftBullets, 4, 65),
      rightTitle: shortText(slide.rightTitle, 100),
      rightBullets: shortList(slide.rightBullets, 4, 65),
      notes: shortText(slide.notes, 1200),
    };
    if (!page.title) throw new Error(`Page ${index + 1} has no title.`);
    return page;
  });
  return { title, subtitle: shortText(raw.subtitle, 180), slides };
}

export function deckPrompt(topic, pageCount, language = 'en') {
  return [
    `Create a ${pageCount}-page presentation about: ${topic}`,
    'Return only one JSON object, with no Markdown fence or explanation.',
    'Schema: {"title":"...","subtitle":"...","slides":[{"layout":"cover|statement|bullets|comparison|closing","kicker":"...","title":"...","body":"...","bullets":["..."],"leftTitle":"...","leftBullets":["..."],"rightTitle":"...","rightBullets":["..."],"notes":"..."}]}',
    `The slides array must have exactly ${pageCount} items. Use a cover first and a closing page last. Vary the middle layouts.`,
    'Write concise, specific copy that fits a 16:9 slide. Keep titles under 100 characters, body text under 240 characters, and bullets under 85 characters. Use at most five bullets on a page. Comparison pages use the left and right fields.',
    'Speaker notes may be longer than visible text. Do not invent statistics, quotes, or sources. When facts are uncertain, write qualitatively.',
    language === 'ar'
      ? 'Write the deck title, subtitle, and all slide content and speaker notes in natural Modern Standard Arabic. Keep product names and technical terms in their original language when useful. Do not transliterate Arabic into Latin characters.'
      : 'Write the deck title, subtitle, and all slide content and speaker notes in English.',
  ].join('\n');
}

export function makeDeckId(title) {
  const slug =
    title
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 44)
      .replace(/-$/g, '') || 'deck';
  return `${slug}-${randomBytes(3).toString('hex')}`;
}

export function renderDeckSource(
  deck,
  theme,
  createdAt = new Date().toISOString(),
  language = 'en',
) {
  if (!THEMES[theme]) throw new Error('Choose a valid theme.');
  if (language !== 'en' && language !== 'ar') throw new Error('Choose a valid language.');
  const data = JSON.stringify(deck.slides, null, 2);
  const colors = JSON.stringify(THEMES[theme]);
  const meta = JSON.stringify({ title: deck.title, createdAt });
  return `import type { CSSProperties } from 'react';
import type { Page, SlideMeta } from '@deckspring/core';

type SlideData = {
  layout: 'cover' | 'statement' | 'bullets' | 'comparison' | 'closing';
  kicker: string;
  title: string;
  body: string;
  bullets: string[];
  leftTitle: string;
  leftBullets: string[];
  rightTitle: string;
  rightBullets: string[];
  notes: string;
};

const colors = ${colors};
const rtl = ${language === 'ar'};
const slideData: SlideData[] = ${data};
const frame: CSSProperties = {
  width: 1920,
  height: 1080,
  boxSizing: 'border-box',
  position: 'relative',
  overflow: 'hidden',
  padding: '105px 125px',
  background: colors.background,
  color: colors.ink,
  fontFamily: rtl ? 'Arial, Tahoma, sans-serif' : 'Aptos, Inter, system-ui, sans-serif',
  direction: rtl ? 'rtl' : 'ltr',
  textAlign: rtl ? 'right' : 'left',
};

function BulletList({ items }: { items: string[] }) {
  return <div style={{ display: 'grid', gap: 29, marginTop: 48 }}>
    {items.map((item, index) => <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: 25, fontSize: 37, lineHeight: 1.25 }}>
      <span style={{ width: 12, height: 12, marginTop: 17, flexShrink: 0, borderRadius: 99, background: colors.accent }} />
      <span>{item}</span>
    </div>)}
  </div>;
}

function SlideContent({ item, index }: { item: SlideData; index: number }) {
  const isCover = item.layout === 'cover';
  const isClosing = item.layout === 'closing';
  return <div lang={rtl ? 'ar' : 'en'} style={frame}>
    <div style={{ position: 'absolute', [rtl ? 'left' : 'right']: -215, top: -245, width: 800, height: 800, borderRadius: '50%', background: colors.soft }} />
    <div style={{ position: 'absolute', [rtl ? 'left' : 'right']: 116, top: 120, width: 105, height: 105, borderRadius: '50%', background: colors.accent }} />
    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ color: colors.accent, fontSize: 23, fontWeight: 700, letterSpacing: rtl ? 0 : '0.14em', textTransform: rtl ? 'none' : 'uppercase' }}>{item.kicker || (isCover ? (rtl ? 'عرض تقديمي' : 'Presentation') : 'Deckspring')}</div>
      {isCover || isClosing ? <div style={{ marginTop: 'auto', marginBottom: 'auto', maxWidth: 1280 }}>
        <div style={{ width: 105, height: 10, background: colors.accent, marginBottom: 48 }} />
        <h1 style={{ margin: 0, fontSize: isCover ? (rtl ? 108 : 126) : (rtl ? 98 : 112), lineHeight: rtl ? 1.2 : 1.01, letterSpacing: rtl ? 0 : '-0.055em', fontWeight: 750 }}>{item.title}</h1>
        {(item.body || ${JSON.stringify(deck.subtitle)}) && <p style={{ margin: '38px 0 0', maxWidth: 1100, fontSize: 38, lineHeight: 1.3 }}>{item.body || ${JSON.stringify(deck.subtitle)}}</p>}
      </div> : <>
        <h1 style={{ margin: '62px 0 0', maxWidth: 1500, fontSize: item.layout === 'statement' ? (rtl ? 96 : 112) : (rtl ? 74 : 82), lineHeight: rtl ? 1.2 : 1.07, letterSpacing: rtl ? 0 : '-0.045em', fontWeight: 730 }}>{item.title}</h1>
        {item.layout === 'statement' && item.body && <p style={{ margin: '55px 0 0', maxWidth: 1260, fontSize: 43, lineHeight: 1.3 }}>{item.body}</p>}
        {item.layout === 'bullets' && <div style={{ maxWidth: 1430 }}>
          {item.body && <p style={{ margin: '28px 0 0', fontSize: 38, lineHeight: 1.3 }}>{item.body}</p>}
          <BulletList items={item.bullets} />
        </div>}
        {item.layout === 'comparison' && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 38, marginTop: 68 }}>
          {[{ title: item.leftTitle, bullets: item.leftBullets }, { title: item.rightTitle, bullets: item.rightBullets }].map((column, side) =>
            <div key={side} style={{ minHeight: 450, padding: '43px 48px', background: colors.soft, borderTop: \`9px solid \${colors.accent}\` }}>
              <h2 style={{ margin: 0, fontSize: 48, letterSpacing: rtl ? 0 : '-0.03em' }}>{column.title}</h2>
              <BulletList items={column.bullets} />
            </div>)}
        </div>}
      </>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 32, borderTop: \`2px solid \${colors.soft}\`, fontSize: 22 }}>
        <span>${JSON.stringify(deck.title)}</span><span dir="ltr">{String(index + 1).padStart(2, '0')} / {String(slideData.length).padStart(2, '0')}</span>
      </div>
    </div>
  </div>;
}

export const meta: SlideMeta = ${meta};
export const notes = slideData.map((item) => item.notes);
const pages: Page[] = slideData.map((item, index) => function SlidePage() {
  return <SlideContent item={item} index={index} />;
});
export default pages;
`;
}
