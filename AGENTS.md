# Deckspring — Repository Guide

You are working on **Deckspring**, a local AI slide workspace and its underlying framework. The workspace packages are private for the GitHub-only release.

(Slide-authoring guidance lives in the `slide-authoring` / `create-slide` skills under `apps/demo/.claude/skills/`. Use those only when editing files inside `apps/demo/slides/`.)

## Layout

pnpm + Turbo monorepo.

| Path | Package | Role |
| --- | --- | --- |
| `packages/core` | `@deckspring/core` | Runtime (viewer, present mode, inspector), Vite plugin, `deckspring` dev/build CLI. |
| `packages/cli` | `@deckspring/cli` | Starter scaffolder source and template. External use is deferred until package distribution. |
| `apps/demo` | private | Local consumer of `@deckspring/core` via `workspace:*`. Dogfood target — run `pnpm dev` here to exercise the framework. |
| `apps/studio` | private | Local prompt-to-deck wrapper with user-supplied OpenAI-compatible model connections. |
| `apps/web` | private | Marketing site (Next.js). |
| `apps/marketing/launch-video` | private | Launch films (one per `films/<id>/`) and their render studio (`pnpm dev:video`). New films via the `launch-video` skill. |
| `apps/marketing/cover` | private | Cinematic slide-wall cover → web OG image + README banner (`pnpm cover`). |

Shared config: `biome.json`, `turbo.json`, `pnpm-workspace.yaml`, `tsconfig` per package.

## Workflow

```bash
pnpm dev          # turbo: runs demo against local core
pnpm dev:studio   # local prompt-to-deck studio
pnpm build        # build all packages
pnpm typecheck    # tsc across the graph
pnpm check        # biome (format + lint + organize imports)
pnpm check:fix    # auto-fix what biome can
pnpm test         # vitest
```

Filter to one package: `pnpm core <script>` / `pnpm cli <script>`.

## Hard rules

- **Biome must pass before commit.** Run `pnpm check` (or `pnpm check:fix`). CI and the user's review both expect a clean tree.
- Keep pending changesets accurate when core or CLI behavior changes. Package publishing is disabled until a separate release decision.
- **Changeset descriptions: short and direct.** One line, present-tense, what changed from a user's perspective. Match the tone of `.changeset/*.md` already in the repo. No paragraphs, no rationale, no "this PR…".
  - Good: `Replace spinner with a hairline + sliding bar for slide and presenter loading states.`
  - Bad: `This change introduces a new loading indicator because the previous spinner felt heavy and we wanted something more subtle for presentation contexts…`
- Historical package changelogs describe upstream Open Slide releases. Do not rewrite them as Deckspring release notes.
- Don't add dependencies casually. The `core` runtime ships to users; every dep inflates install size.
- `packages/core/src/app/components/ui` is shadcn-generated and biome-ignored — leave it alone unless regenerating.
- **Default to writing no comments.** Only add one when the WHY is non-obvious — a hidden constraint, a subtle invariant, a workaround for a specific bug, behavior that would surprise a reader. Don't explain WHAT the code does (well-named identifiers handle that), don't reference tasks/PRs/callers ("added for X", "used by Y"), don't write section-divider banners (`// ── Section ──`) or module-header descriptions, and don't leave commented-out code. If removing a comment wouldn't confuse a future reader, don't write it.

## Publishing

This repository is GitHub-only. Do not publish packages or deploy the website without a separate request.
