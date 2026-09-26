# cover

An inherited slide-wall cover generator retained as a design example. Deckspring currently uses the rising-slide mark for its social image and README banner. Running this generator writes concept images under `out/` and does not replace those assets.

```bash
pnpm cover        # or: pnpm --filter cover render
```

This builds the `getting-started` template deck from `packages/cli/template`, screenshots the pages the wall uses, and writes:

| Output | Size |
| --- | --- |
| `out/legacy-og-concept.png` | 1200 × 630 |
| `out/legacy-readme-cover.png` | 1280 × 640 |

`cover.html` is the scene: `WALL` picks the deck pages and their positions, `FOCUS` picks the lit card. Run `pnpm core build` first if `packages/core/dist` is stale.
