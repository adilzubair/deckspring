const agents = ['Claude Code', 'Codex', 'Cursor', 'Gemini CLI', 'OpenCode', 'Windsurf', 'Zed'];

export function AgentLogos() {
  return (
    <ul className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
      {agents.map((agent) => (
        <li
          key={agent}
          className="rounded-lg border border-[color:var(--color-border)] px-3 py-2 text-center text-xs font-medium text-[color:var(--color-text)]"
        >
          {agent}
        </li>
      ))}
    </ul>
  );
}
