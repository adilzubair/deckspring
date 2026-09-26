<p align="center"><img src="apps/web/public/deckspring-banner.svg" alt="Deckspring — create and refine slide decks with AI" width="100%" /></p>

# Deckspring

Create a presentation from a prompt, then refine every slide in a visual editor. Deckspring runs locally, connects to an OpenAI-compatible model you choose, and keeps each deck as editable React source. You can present it or export HTML, PDF, and PowerPoint.

Deckspring is built on [Open Slide](https://github.com/open-slide/open-slide). See [Attribution](#attribution) and [LICENSE](LICENSE).

## Run locally

Requires Node.js 20.19+ and pnpm 10.

```bash
git clone https://github.com/adilzubair/deckspring.git
cd deckspring
pnpm install
pnpm dev:studio
```

Open <http://127.0.0.1:5173/>. In the Slides view, add an OpenAI-compatible model endpoint, model name, and API key if your provider requires one. Enter a prompt to create a deck, then edit it in the canvas. Model URLs and names are saved locally; API keys stay in memory for the session. Generated decks and local model settings are excluded from Git by default.

You can also run the framework demo with `pnpm dev:demo`. The website and documentation source live in this repository but are not hosted as part of this release.

## What you can do

- Generate a deck from a prompt with your own model connection.
- Edit slides visually or in their React source, and review AI-proposed edits before applying them.
- Present with speaker notes, a timer, and a next-slide preview.
- Export to static HTML, PDF, or editable PowerPoint.
- Organize decks and local assets in the slide library.

The Studio currently expects an OpenAI-compatible chat completions endpoint. It generates structured slide content in fixed layouts; it does not ask the model to write arbitrary code or fetch images. See [Studio details](apps/studio/README.md).

## Repository

This is a pnpm and Turbo monorepo. `packages/core` contains the runtime and local `deckspring` command. `packages/cli` contains a starter CLI whose external setup flow is deferred until Deckspring packages are distributed. `apps/studio` is the local AI workspace, `apps/demo` exercises the framework, and `apps/web` contains the future marketing and documentation site.

```bash
pnpm check       # formatting and lint
pnpm typecheck   # TypeScript checks
pnpm test        # unit tests
pnpm build       # build workspace packages and apps
pnpm test:e2e    # browser tests
```

The `@deckspring/core` and `@deckspring/cli` names are local workspace package names. They are **not published on npm**. Use this repository's setup instructions; `npx @deckspring/cli init` is not available yet.

## Attribution

Deckspring is a modified project built on [Open Slide](https://github.com/open-slide/open-slide), created by Yiwei Ho and its contributors. The original project is licensed under MIT. The complete original copyright and permission notice remains in [LICENSE](LICENSE). Historical upstream changelogs and example media are retained as provenance; they describe Open Slide releases and are not Deckspring release records.

## License

MIT. See [LICENSE](LICENSE). A bundled frontend-design skill retains its separate [Apache 2.0 license](.agents/skills/frontend-design/LICENSE.txt).
