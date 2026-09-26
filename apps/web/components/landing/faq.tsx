import { FaqItem } from './faq-item';
import { Container, SectionHeading } from './frame';

export type QA = { q: string; a: string };

export const faqs: QA[] = [
  {
    q: 'What is Deckspring?',
    a: 'Deckspring is a local AI slide workspace built on a React slide framework. Describe a deck to your own OpenAI-compatible model, then edit, present, and export it.',
  },
  {
    q: 'How is Deckspring different from Reveal.js, Slidev, or Spectacle?',
    a: 'Deckspring combines prompt-to-deck creation with a visual editor. Each page remains a React component on a 1920×1080 canvas, so you can refine it visually or in source.',
  },
  {
    q: 'Which AI coding agents work with Deckspring?',
    a: 'Any agent that edits React files can work with Deckspring decks. The bundled skills provide guidance for Claude Code, Codex, Cursor, and other coding agents.',
  },
  {
    q: 'Do I need to know React to use Deckspring?',
    a: 'No. Studio generates a deck from a prompt, and the editor lets you refine it visually. React knowledge gives you more control when you want to edit slide source.',
  },
  {
    q: 'How do I get started with Deckspring?',
    a: 'Clone github.com/adilzubair/deckspring, run `pnpm install` and `pnpm dev:studio`, then open the local address. Add an OpenAI-compatible model connection in the Slides view.',
  },
  {
    q: 'Is Deckspring open source?',
    a: 'Yes. Deckspring is MIT-licensed and built on Open Slide. Source lives at github.com/adilzubair/deckspring. Its renamed packages are local workspace packages and are not on npm yet.',
  },
];

export function FAQ() {
  return (
    <section id="faq">
      <Container className="pb-24 sm:pb-32">
        <SectionHeading eyebrow="FAQ" title="Questions, answered." />

        <dl
          data-reveal="stagger"
          className="mx-auto max-w-[760px] divide-y divide-[color:var(--color-rule-soft)] border-y border-[color:var(--color-rule-soft)]"
        >
          {faqs.map((item, idx) => (
            <FaqItem key={item.q} item={item} index={idx} />
          ))}
        </dl>
      </Container>
    </section>
  );
}
