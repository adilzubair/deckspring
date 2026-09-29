# Deckspring Studio

This is the local AI workspace for `@deckspring/core`. It asks an OpenAI-compatible chat completions model for structured deck or theme data, validates the result, and renders trusted React source. Decks are written under `slides/<id>/index.tsx`; Studio themes are paired `themes/<id>.md` and `themes/<id>.demo.tsx` files.

## Run

From the repository root:

```bash
pnpm install --filter studio... --filter .
pnpm dev:studio
```

Open <http://127.0.0.1:5173/>. In the Slides view, add a model connection with its API base URL (for example, `https://api.example.com/v1`), model name, and API key. Local OpenAI-compatible servers such as `http://localhost:11434/v1` can omit the key. Then enter a prompt and generate a deck. The resulting deck opens directly in Deckspring and appears in the slide library. The same selected model and connection editor are shared by deck generation, theme authoring, and comment application.

The app binds to `127.0.0.1` and accepts HTTPS model endpoints or HTTP endpoints on loopback. It sends requests to the endpoint's `/chat/completions` route with Bearer authentication. Other provider protocols need adapters.

Model names and URLs are saved in `.local/models.json`, which is ignored by Git. API keys remain in server memory and must be entered again after restarting. Generated decks stay in `slides/` so Deckspring can edit, present, build, and export them. Studio-created themes stay in `themes/`; both directories are ignored locally. When you export a PPTX from the local Studio, it also saves a copy in `.local/exports/` for easy access. The studio itself is a development interface; `pnpm --filter studio build` produces a static Deckspring site for the decks.

On first run, Studio installs three editable starter themes: **Bright Sans**, **Aurora**, and **Sticker Pop**. They are adapted from the demo's visual directions and appear in Themes and the deck generator. Studio records the installation in `.local/starter-themes.json` so edits and intentional deletions survive restarts. The demo's sample decks remain in `apps/demo`; they are showcase content, not generated user decks.

The prompt-to-deck generator uses fixed layouts and validated text data. The theme editor similarly accepts a validated `ThemeSpecV1`, stores its fields as frontmatter plus a readable recipe, and generates the three-page preview from a trusted template. It does not accept model-produced code. You can use Deckspring's editor and asset manager to refine the result.

## Themes

Open **Themes** and choose **Create theme**. Start with a written visual direction or extract the system from an existing deck, choose a model, and generate an editable draft. Palette, typography, composition, motif, spacing, corner style, motion, and identity all update the live preview before anything is written. Saving creates the markdown recipe and matching preview together.

Saved Studio themes can be edited, duplicated, repaired, deleted, or selected when generating a deck. Their IDs are immutable after the first save. Deleting a theme lists how many decks reference it and removes only those `meta.theme` links; every deck's rendered source remains intact. Existing free-form themes remain browseable and expose **Import into Studio** to convert them into the validated format.

Inspector comments can be applied in the local GUI. Open a deck's comments panel, choose a model, and select **Review AI edits**. The model proposes exact source replacements for comments near the selected elements. Review the before/after text, choose which changes to accept, and select **Apply changes** to write them. The app checks that the slide has not changed since the proposal; skipped and unselected comments remain pending. This workflow sends the comment and nearby slide source to the selected model.
