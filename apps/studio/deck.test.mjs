import assert from 'node:assert/strict';
import test from 'node:test';
import { deckPrompt, renderDeckSource, validateDeck } from './deck.mjs';

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
