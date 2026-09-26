# @deckspring/cli

Starter scaffolder source for [Deckspring](https://github.com/adilzubair/deckspring). The external `init` flow is deferred until the renamed core package is distributed. For now, clone the repository and run `pnpm dev:studio`.

## Local development

```bash
git clone https://github.com/adilzubair/deckspring.git
cd deckspring
pnpm install
pnpm dev:studio
```

When package distribution is enabled, `deckspring init` will create a workspace containing:

- `slides/getting-started/` — a starter slide you can edit or delete.
- `package.json` — depends on `@deckspring/core`, which provides the runtime (home page, slide viewer, fullscreen mode) and the `deckspring` CLI.
- `deckspring.config.ts` — optional typed config (slidesDir, port).
- `.claude/skills/` and `.agents/skills/` — Claude Code skills (`create-slide`, `apply-comments`, …).
- `CLAUDE.md` — agent guide for authoring slides.

The generated workspace keeps Vite, React, and tsconfig inside `@deckspring/core`.

## Commands

| Command | Description |
| --- | --- |
| `deckspring init [dir]` | Scaffold a new workspace in `dir` (defaults to current dir). |
| `deckspring init --force` | Scaffold into a non-empty directory. |
| `deckspring init --name <name>` | Override the generated `package.json` name. |

(Once installed in the workspace, `@deckspring/core` provides `deckspring dev`, `deckspring build`, and `deckspring preview` via its own bin.)

## Authoring

Inside the scaffolded workspace, slides live under `slides/<kebab-case-id>/index.tsx` and default-export an array of `Page` components. Each page renders into a fixed 1920×1080 canvas; the framework handles scaling.

Ask Claude Code to "make slides about X" and the `create-slide` skill will take it from there.
