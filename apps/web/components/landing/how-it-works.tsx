import type { ReactNode } from 'react';
import { AgentIconList } from './agent-icon-list';
import { Container, SectionHeading } from './frame';

type Step = {
  num: string;
  title: string;
  body: string;
  code: {
    prompt: string;
    line: string;
    tail: ReactNode;
  };
};

const steps: Step[] = [
  {
    num: '01',
    title: 'Start Studio',
    body: 'Clone the repository and run the local Studio. Your generated decks stay on your machine.',
    code: {
      prompt: '$',
      line: 'pnpm dev:studio',
      tail: '✓ ready locally',
    },
  },
  {
    num: '02',
    title: 'Describe a deck',
    body: 'Connect an OpenAI-compatible model and describe the presentation you want.',
    code: {
      prompt: '›',
      line: 'Create a Q2 roadmap deck',
      tail: <AgentIconList />,
    },
  },
  {
    num: '03',
    title: 'Edit, comment, apply',
    body: 'Click any element to tweak it visually, or leave a comment for the agent to apply.',
    code: {
      prompt: '›',
      line: '/apply-comments',
      tail: '✓ applied change',
    },
  },
];

const SLASH_COMMAND = /\/[a-z][a-z-]*/g;

function renderLine(line: string) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of line.matchAll(SLASH_COMMAND)) {
    const start = match.index ?? 0;
    if (start > last) parts.push(line.slice(last, start));
    const cmd = match[0];
    parts.push(
      <span key={`cmd-${start}`}>
        <span className="text-[color:var(--color-accent)]">/</span>
        <span className="text-[color:var(--color-accent-soft)]">{cmd.slice(1)}</span>
      </span>,
    );
    last = start + cmd.length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return <>{parts}</>;
}

export function HowItWorks() {
  return (
    <section id="how-it-works">
      <Container className="py-24 sm:py-32">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps to a live deck."
          lead="Run Studio, describe your deck, then refine it on the canvas."
        />

        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <li
              key={s.num}
              data-reveal
              className="flex flex-col gap-6 rounded-2xl border border-[color:var(--color-rule-soft)] bg-[color:var(--color-panel)] p-6 transition-colors duration-300 hover:border-[color:var(--color-rule)] sm:p-7"
            >
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-[color:var(--color-panel-hi)] font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-text-soft)]">
                {s.num}
              </span>

              <div>
                <h3 className="text-[18px] font-medium leading-[1.3] tracking-[-0.02em] sm:text-[19px]">
                  {s.title}
                </h3>
                <p className="mt-2 max-w-[36ch] text-[14.5px] leading-[1.6] text-[color:var(--color-muted)]">
                  {s.body}
                </p>
              </div>

              <div className="mt-auto rounded-xl bg-[color:var(--color-panel-hi)] px-4 py-3.5 font-[family-name:var(--font-mono)] text-[13px]">
                <div className="flex items-center gap-2">
                  <span className="text-[color:var(--color-accent)]">{s.code.prompt}</span>
                  <span className="truncate text-[color:var(--color-text)]">
                    {renderLine(s.code.line)}
                  </span>
                </div>
                <div className="mt-3 text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-muted)]">
                  {s.code.tail}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
