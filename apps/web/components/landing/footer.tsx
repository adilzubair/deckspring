import Image from 'next/image';
import { Container } from './frame';

export function Footer() {
  return (
    <footer className="border-t border-[color:var(--color-rule-soft)]">
      <Container className="grid grid-cols-12 gap-x-6 gap-y-10 py-14 sm:py-16">
        <div className="col-span-12 flex flex-col gap-4 lg:col-span-6">
          <div className="flex items-center gap-2.5 text-[14px] font-medium">
            <Image
              src="/deckspring.png"
              alt=""
              aria-hidden
              width={24}
              height={24}
              className="h-6 w-6 rounded-[4px]"
            />
            <span className="tracking-[-0.01em]">Deckspring</span>
          </div>
          <p className="max-w-[38ch] text-[14px] leading-[1.6] text-[color:var(--color-muted)]">
            Create and refine slide decks locally with your own AI model. Free and open source under
            the MIT license.
          </p>
        </div>

        <FooterCol
          title="Product"
          links={[
            ['Live demo', '#demo'],
            ['Features', '#features'],
            ['Docs', '/docs'],
            ['FAQ', '#faq'],
          ]}
        />
        <FooterCol
          title="Source"
          links={[
            ['Repository', 'https://github.com/adilzubair/deckspring'],
            ['Local Studio', 'https://github.com/adilzubair/deckspring/tree/main/apps/studio'],
          ]}
        />
        <FooterCol
          title="Elsewhere"
          links={[
            ['GitHub', 'https://github.com/adilzubair/deckspring'],
            ['Open Slide', 'https://github.com/open-slide/open-slide'],
            ['Issues', 'https://github.com/adilzubair/deckspring/issues'],
          ]}
        />
      </Container>

      <div className="border-t border-[color:var(--color-rule-soft)]">
        <Container className="flex flex-col items-start justify-between gap-3 py-5 text-[13px] text-[color:var(--color-muted)] sm:flex-row sm:items-center sm:gap-0">
          <span>
            Built on{' '}
            <a
              href="https://github.com/open-slide/open-slide"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--color-text)] transition-colors hover:text-[color:var(--color-muted)]"
            >
              Open Slide
            </a>{' '}
            by Yiwei Ho and contributors.
          </span>
        </Container>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="col-span-6 flex flex-col gap-4 md:col-span-4 lg:col-span-2">
      <div className="caption">{title}</div>
      <ul className="flex flex-col gap-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <a
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="text-[14px] text-[color:var(--color-text-soft)] transition-colors hover:text-[color:var(--color-text)]"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
