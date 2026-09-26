const agents = ['Claude', 'Codex', 'Cursor', 'Gemini CLI'];

export function AgentIconList() {
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 normal-case tracking-normal">
      {agents.map((agent) => (
        <span key={agent} className="text-[10px] text-[color:var(--color-muted)]">
          {agent}
        </span>
      ))}
      <span className="text-[10px] tracking-[0.08em] uppercase text-[color:var(--color-muted)]">
        ...
      </span>
    </span>
  );
}
