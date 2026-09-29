import assert from 'node:assert/strict';
import test from 'node:test';
import { deckPrompt, renderDeckSource, resolveDeckMotion, validateDeck } from './deck.mjs';

const slide = {
  layout: 'cover',
  kicker: '',
  title: 'A deck',
  body: 'Summary',
  bullets: [],
  leftTitle: '',
  leftBullets: [],
  rightTitle: '',
  rightBullets: [],
  notes: '',
};

test('validates the requested page count and page titles', () => {
  assert.throws(() => validateDeck({ title: 'Deck', slides: [slide] }, 2), /expected 2/);
  assert.throws(
    () => validateDeck({ title: 'Deck', slides: [{ ...slide, title: '' }] }, 1),
    /no title/,
  );
});

test('serializes model text as data inside the slide source', () => {
  const title = "A deck'; process.exit(1); //";
  const deck = validateDeck({ title, slides: [{ ...slide, title }] }, 1);
  const source = renderDeckSource(deck, 'cobalt');
  assert.ok(source.includes(JSON.stringify(title)));
  assert.ok(source.includes('export default pages;'));
  assert.ok(!source.includes(`const title = '${title}'`));
});

test('requests Arabic copy and renders a right-to-left slide', () => {
  const deck = validateDeck({ title: 'خطة إطلاق', slides: [{ ...slide, title: 'خطة إطلاق' }] }, 1);
  const prompt = deckPrompt('إطلاق منتج', 1, 'ar');
  const source = renderDeckSource(deck, 'cobalt', '2026-09-27T00:00:00.000Z', 'ar');
  assert.match(prompt, /Modern Standard Arabic/);
  assert.match(source, /const rtl = true/);
  assert.match(source, /direction: rtl \? 'rtl' : 'ltr'/);
  assert.match(source, /lang=\{rtl \? 'ar' : 'en'\}/);
  assert.match(source, /dir="ltr"/);
});

test('renders a saved Studio theme and links the generated deck metadata', () => {
  const source = renderDeckSource(
    validateDeck({ title: 'Themed', slides: [{ layout: 'cover', title: 'One' }] }, 1),
    {
      kind: 'theme',
      id: 'signal-frame',
      spec: {
        name: 'Signal Frame',
        description: 'A precise editorial theme.',
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
        aesthetic: 'One deliberate cobalt rule per page.',
      },
    },
    '2026-01-01T00:00:00.000Z',
  );
  assert.match(source, /theme: "signal-frame"/);
  assert.match(source, /#3157D5/);
  assert.match(source, /padding: visual.padding/);
  assert.match(source, /visual\.composition/);
  assert.match(source, /prefers-reduced-motion/);
});

test('resolves and validates deck motion without accepting arbitrary effects', () => {
  assert.deepEqual(resolveDeckMotion(undefined, 'rich'), {
    entrance: 'rich',
    transition: 'cut',
    revealBullets: false,
  });
  assert.deepEqual(
    resolveDeckMotion({ entrance: 'theme', transition: 'theme', revealBullets: true }, 'subtle'),
    { entrance: 'subtle', transition: 'fade', revealBullets: true },
  );
  assert.throws(() => resolveDeckMotion({ entrance: 'spin' }), /motion settings/);
  assert.throws(() => resolveDeckMotion({ transition: '<script>' }), /motion settings/);
  assert.throws(() => resolveDeckMotion({ revealBullets: 'yes' }), /bullet points/);
});

test('renders selected page transitions and keyboard-paced bullet reveals', () => {
  const deck = validateDeck(
    {
      title: 'Motion study',
      slides: [
        { ...slide, title: 'Opening' },
        { ...slide, layout: 'bullets', title: 'Three ideas', bullets: ['One', 'Two', 'Three'] },
      ],
    },
    2,
  );
  const source = renderDeckSource(deck, 'cobalt', '2026-09-29T00:00:00.000Z', 'en', {
    entrance: 'rich',
    transition: 'slide',
    revealBullets: true,
  });
  assert.match(source, /export const transition: SlideTransition/);
  assert.match(source, /translateX\(80px\)/);
  assert.match(source, /<Steps>/);
  assert.match(source, /<Step key=\{index\}/);
  assert.match(source, /"revealBullets":true/);
  assert.match(source, /prefers-reduced-motion/);
  const arabic = renderDeckSource(deck, 'cobalt', '2026-09-29T00:00:00.000Z', 'ar', {
    transition: 'slide',
  });
  assert.match(arabic, /translateX\(-80px\)/);
});
