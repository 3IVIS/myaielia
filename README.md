# Aielia — website

Static site for **Aielia**, the open-source AI assistant that asks before it acts.

**Live site:** https://myaielia.com
**Developer site:** https://buildaharness.com (Build A Harness — the framework Aielia is built on)
**Product repository:** https://github.com/3IVIS/buildaharness (assistant in `packages/aielia`)

## What's here

| Path | What |
|---|---|
| `index.html` | Home — what Aielia is, why it can be trusted, how to start |
| `how-it-works.html` | `/how-it-works` — the 11 layers on a chat message, risk gate, install options |
| `try/` | `/try` — the hosted browser build of Aielia. **Generated** — see below |
| `privacy.html`, `impressum.html` | Legal pages (same controller as buildaharness.com) |
| `llms.txt`, `sitemap.xml`, `robots.txt` | Crawler / LLM discovery |

## `/try` is a build artifact

Don't edit `try/` by hand. It is the `packages/chat-ui` build from the product repo,
pushed here by that repo's `.github/workflows/deploy-chat-ui.yml`.

## Local preview

```sh
python3 -m http.server 8080   # or: npx serve .
```

Served by GitHub Pages; `CNAME` points the custom domain at `myaielia.com`.

## License

Apache 2.0
