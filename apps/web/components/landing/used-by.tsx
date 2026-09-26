import { Container, SectionHeading } from './frame';

export function UsedBy() {
  return (
    <section id="used-by">
      <Container className="pb-24 sm:pb-32">
        <SectionHeading
          eyebrow="Your workflow"
          title="Start with a prompt. Keep control of the result."
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div
            data-reveal
            className="rounded-2xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] p-8"
          >
            <h3 className="text-[21px] font-medium text-[color:var(--color-text)]">
              Generate locally
            </h3>
            <p className="mt-3 max-w-[48ch] text-[15px] leading-[1.6] text-[color:var(--color-text-soft)]">
              Connect an OpenAI-compatible model and describe your deck. Studio creates structured,
              editable slides in your workspace.
            </p>
          </div>
          <div
            data-reveal
            className="rounded-2xl border border-[color:var(--color-rule)] bg-[color:var(--color-panel)] p-8"
          >
            <h3 className="text-[21px] font-medium text-[color:var(--color-text)]">
              Refine and export
            </h3>
            <p className="mt-3 max-w-[48ch] text-[15px] leading-[1.6] text-[color:var(--color-text-soft)]">
              Tweak the canvas, review AI suggestions, or edit the React source. Present the deck or
              export HTML, PDF, and PowerPoint.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
