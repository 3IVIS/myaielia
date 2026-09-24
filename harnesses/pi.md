# Pi

> **Research notes.** Background for the layer-by-layer mapping on
> [myaielia.com/harness-comparison](https://myaielia.com/harness-comparison),
> which is the canonical, maintained version — star and release figures there take
> precedence over this file. Figures below were read on 2026-09-24.

Pi (pi.dev) is an open-source, MIT-licensed terminal coding-agent harness created by Mario Zechner and now developed by Earendil Inc. (GitHub organization `earendil-works`, repository `earendil-works/pi`, created 2025-08-09). At the time of writing the repo had ~109,000 stars and the latest release was v0.87.1 (2026-09-22). Tagline: "There are many agent harnesses but this one is yours."

## Design thesis

Minimalism by default. Four core tools — `read`, `write`, `edit`, `bash` (optional read-only `grep`, `find`, `ls`) — and a system prompt plus tool definitions under 1,000 tokens. The author's argument is that frontier models are heavily RL-trained on coding tasks and need little scaffolding, and that exactly controlling what enters the context yields better output.

## Deliberately omitted (per pi.dev and the author's write-up)

MCP, sub-agents, permission popups, plan mode, built-in to-dos, background bash. Each is replaceable by an extension, a package, or a convention (e.g. `PLAN.md`, tmux). On permissions the author calls prompts "security theater" once an agent can write and run code; Pi runs unrestricted by default and leaves sandboxing (containers) to the user.

## What it does ship

- 15+ providers (Anthropic, OpenAI, Google, Azure, Bedrock, Mistral, Groq…), mid-session model switching.
- Four modes: interactive TUI, print/JSON, RPC, SDK embedding.
- Sessions stored as JSONL trees: `/tree` navigation, branching from any prior message, HTML/gist export.
- Context files (`AGENTS.md`, `SYSTEM.md`) and automatic or manual compaction, customizable through extensions.
- Extensions (TypeScript), skills, prompt templates, and packages installable from npm or git.
- Monorepo packages listed on the repo include `pi-coding-agent`, `pi-agent-core`, `pi-ai`, `pi-tui`, plus newer `chord`, `pi-telemetry` and `pi-durable`.

## Harness-layer reading

No layer at full coverage. Partial: Caller State (context files), World Model (static files + session tree), Execution (four tools + extensions), Recovery (session tree, compaction), Memory (sessions + compaction). Not described: Reasoning, Control State (omitted by design), Planning (omitted by design), Verification, Learning, Output & Reviewer Pass.

## Benchmark evidence

Databricks (2026-07-08, "Benchmarking Coding Agents on Databricks' Multi-Million Line Codebase"): Pi sent about 3x less context per turn than Claude Code/Codex on the same model, with cost differences above 2x at comparable quality. The authors state it is not comprehensive. The pre-Databricks Terminal-Bench 2.0 submission is discussed in the author's Nov 2025 post.

## Sources

- https://pi.dev/
- https://github.com/earendil-works/pi (and /releases)
- https://mariozechner.at/posts/2025-11-30-pi-coding-agent/
- https://www.databricks.com/blog/benchmarking-coding-agents-databricks-multi-million-line-codebase
- https://earendil.com/posts/pi-autoresearch-and-databricks/ (vendor post — corroborating color only)
- https://agentic-ai.readthedocs.io/en/latest/AgentHarness/pi-dev/ (third-party summary; its "225+ releases" figure is unverified)
