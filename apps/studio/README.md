# Deckspring Studio

This is a local prompt-to-deck extension for `@deckspring/core`. It asks an OpenAI-compatible chat completions model for structured slide content, validates the result, and writes a React deck under `slides/<id>/index.tsx`. The generator lives inside Deckspring's Slides view and uses its navigation and theme.

## Run

From the repository root:

```bash
pnpm install --filter studio... --filter .
pnpm dev:studio
```

Open <http://127.0.0.1:5173/>. In the Slides view, add a model connection with its API base URL (for example, `https://api.example.com/v1`), model name, and API key. Local OpenAI-compatible servers such as `http://localhost:11434/v1` can omit the key. Then enter a prompt and generate a deck. The resulting deck opens directly in Deckspring and appears in the slide library.

The app binds to `127.0.0.1` and accepts HTTPS model endpoints or HTTP endpoints on loopback. It sends requests to the endpoint's `/chat/completions` route with Bearer authentication. Other provider protocols need adapters.

Model names and URLs are saved in `.local/models.json`, which is ignored by Git. API keys remain in server memory and must be entered again after restarting. Generated decks stay in `slides/` so Deckspring can edit, present, build, and export them. When you export a PPTX from the local Studio, it also saves a copy in `.local/exports/` for easy access. The studio itself is a development interface; `pnpm --filter studio build` produces a static Deckspring site for the decks.

The prompt-to-deck generator uses fixed layouts and validated text data. It does not accept model-produced code for new decks or fetch images in this first version. You can use Deckspring's editor and asset manager to refine the result.

Inspector comments can be applied in the local GUI. Open a deck's comments panel, choose a model, and select **Review AI edits**. The model proposes exact source replacements for comments near the selected elements. Review the before/after text, choose which changes to accept, and select **Apply changes** to write them. The app checks that the slide has not changed since the proposal; skipped and unselected comments remain pending. This workflow sends the comment and nearby slide source to the selected model.
