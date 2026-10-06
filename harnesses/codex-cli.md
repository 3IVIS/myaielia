# Codex CLI

> **Research notes.** Background for the layer-by-layer mapping on
> [myaielia.com/harness-comparison](https://myaielia.com/harness-comparison),
> which is the canonical, maintained version — star, release and token-volume figures there
> take precedence over this file. Figures below were read on 2026-10-06.

Codex CLI is OpenAI's terminal coding agent, written mostly in Rust and released under Apache-2.0 (`openai/codex`, created 2025-04-13, ~128,000 stars, latest release rust-v0.160.1 on 2026-10-05). It is one surface of a wider Codex product: the same harness also backs the IDE extensions (VS Code, Cursor, Windsurf), a desktop app and Codex Web. On OpenRouter's daily view it was #7 at ~464B tokens.

## The loop

OpenAI's "Unrolling the Codex agent loop" (Michael Bolin, 2026-01-23) calls the agent loop "the core logic in Codex CLI that is responsible for orchestrating the interaction between the user, the model, and the tools the model invokes". As summarized by independent write-ups of that post (the OpenAI page itself returned 403 to our fetcher): each turn assembles a prompt, calls the Responses API with streaming, and processes events; a `function_call` event runs the matching tool and its result is appended; requests are stateless — the full history is sent every time and `previous_response_id` is not used (to support Zero Data Retention); cache hits need exact prefix matches; conversations are compacted automatically past a token threshold.

## Layer-relevant mechanisms

- **Two-axis control.** Sandbox mode (what the OS permits) and approval policy (when the agent must ask) are independent. Docs: *read-only* ("can inspect files, but can't edit files or run commands without approval"), *workspace-write* ("the default low-friction mode for local work"), *danger-full-access* ("removes the filesystem and network boundaries"). Approval policies include on-request ("works inside the sandbox by default and asks when it needs to go beyond that boundary") and never. Enforcement is OS-native: Seatbelt on macOS, bubblewrap on Linux/WSL2, a native Windows sandbox. An execution-policy rules engine and an optional auto-review subagent ("guardian") can answer approval requests.
- **Hooks.** Events: PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact, UserPromptSubmit, Stop, SubagentStop, SessionStart, SessionEnd, SubagentStart, Interrupt. PreToolUse can deny a call; a Stop hook returning "block" makes Codex continue, using the reason as a new user prompt.
- **Subagents.** Spawned on explicit request or when project/skill instructions ask for it (proactive spawning only on ChatGPT Ultra); they inherit the parent's sandbox policy, permission mode, model and tools; concurrency is capped via `agents.max_concurrent_threads_per_session`.
- **Plan mode, review, resume.** Plan mode; `/review` runs a dedicated review of uncommitted changes, commits or branches without modifying the working tree; recent sessions can be resumed; web search and image input are supported; AGENTS.md and skills customize behavior.
- **Memory.** Local memories are **disabled by default** (enable in settings or `memories = true`); once on, Codex distills prior chats into files under `~/.codex/memories/` (summaries, durable entries, recent inputs, supporting evidence), skipping active sessions and stripping sensitive data. `/memories` toggles per chat.
- **No file checkpoints.** We found no built-in file-level checkpoint/rewind in the docs; issue #11626 ("CLI: Add /rewind checkpoint restore that reverts both chat context and Codex-applied code edits", 226 reactions) was still open on 2026-10-03.
- **Models.** OpenAI models via ChatGPT sign-in (Plus, Pro, Business, Edu, Enterprise) or an API key; other providers (OpenRouter, Ollama, LM Studio) through configuration.

## Known security issues (both published 2026-09-01)

- CVE-2026-19591 (GHSA-2frj-4qr5-m2rf, CVSS 8.8): the command-safety parser misread PowerShell's stop-parsing token (`--%`), classifying certain commands as safe, so a file-writing Git command could run without approval and modify Codex's configuration. The advisory notes the bypass does not disable filesystem sandboxing.
- CVE-2026-19592 (GHSA-26wp-42v3-96xp, CVSS 7.3): Git metadata collection did not disable a repo-local `core.fsmonitor`, so a prepared repository's helper ran outside the command sandbox and without an approval prompt.
- We did not find fixed-version data in the advisories.

## What's actually different

The loop is plain. Codex's bet is OS-enforced containment (sandbox mode × approval policy) rather than checkpoints or memory — and a Rust core with a lot of surfaces layered on one harness.

## Sources

- https://github.com/openai/codex
- https://developers.openai.com/codex/concepts/sandboxing
- https://developers.openai.com/codex/cli/features
- https://developers.openai.com/codex/hooks
- https://developers.openai.com/codex/subagents
- https://developers.openai.com/codex/memories
- https://openai.com/index/unrolling-the-codex-agent-loop
- https://github.com/openai/codex/issues/11626
- https://github.com/advisories/GHSA-2frj-4qr5-m2rf
- https://github.com/advisories/GHSA-26wp-42v3-96xp
