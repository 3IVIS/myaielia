# Aielia — website

Static site for **Aielia**, the open-source AI agent you can hand real work to — kept in bounds by a harness.

**Live site:** https://myaielia.com
**Developer site:** https://buildaharness.com (Build A Harness — the framework Aielia is built on)
**Product repository:** https://github.com/3IVIS/buildaharness (assistant in `packages/aielia`)

## What's here

| Path | What |
|---|---|
| `index.html` | Home — what Aielia does, how the harness controls it, how to start |
| `how-it-works.html` | `/how-it-works` — what the harness controls, the 11 layers on a chat message, approval gates, install options |
| `harness-architecture.html` | `/harness-architecture` — the 11-layer control loop, each layer's popup, and the one-loop mechanisms around it (steering, Trajectory Supervisor, goal graph, next-step options) |
| `harness-comparison.html`, `harnesses/` | `/harness-comparison` — OpenClaw, Hermes Agent, Kilo Code and Pi compared layer by layer; `harnesses/*.md` are the per-harness notes |
| `harness-evaluation.html`, `harness-evaluation/` | `/harness-evaluation` — measured results and per-run transcript pages. **Generated** from the private eval tree (`eval/audit/`) — see below |
| `install.sh`, `install.ps1`, `aielia-latest.json` | Installers and the product-scoped update manifest (produced by `scripts/generate-aielia-manifest.mjs` in the product repo) |
| `_includes/` | Shared header and footer templates |
| `try/` | `/try` — the hosted browser build of Aielia. **Generated** — see below |
| `privacy.html`, `impressum.html` | Legal pages (same controller as buildaharness.com) |
| `llms.txt`, `sitemap.xml`, `robots.txt` | Crawler / LLM discovery |

## `/try` is a build artifact

Don't edit `try/` by hand. It is the `packages/chat-ui` build from the product repo,
pushed here by that repo's `.github/workflows/deploy-chat-ui.yml`.

## `harness-evaluation/` is generated

The transcript and probe pages are written by the audit generators in the private eval tree
(`eval/audit/gen-transcript-pages.mjs`, `gen-audit-entry.mjs`; prose lives in
`eval/audit/case-studies/*.mjs`). A hand edit here is overwritten on the next regeneration, so
change the case-study source as well.

## Local preview

```sh
python3 -m http.server 8080   # or: npx serve .
```

Served by GitHub Pages; `CNAME` points the custom domain at `myaielia.com`.

## License

Apache 2.0
