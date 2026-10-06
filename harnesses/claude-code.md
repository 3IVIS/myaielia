# Claude Code

> **Research notes.** Background for the layer-by-layer mapping on
> [myaielia.com/harness-comparison](https://myaielia.com/harness-comparison),
> which is the canonical, maintained version — star, release and token-volume figures there
> take precedence over this file. Figures below were read on 2026-10-06.

Claude Code is Anthropic's agentic coding tool. It is **proprietary**: the `anthropics/claude-code` repository (created 2025-02-22, ~149,600 stars, latest release v2.1.291 on 2026-10-06) holds the issue tracker, plugins, examples and changelog, and its `LICENSE.md` reads "© Anthropic PBC. All rights reserved. Use is subject to Anthropic's Commercial Terms of Service." On OpenRouter's daily view it was #2 at ~1.06T tokens (OpenRouter likely undercounts tools usually run against their vendor's own API — see the caveat on the comparison page).

## The loop

The docs describe three phases that "blend together": **gather context, take action, verify results**, repeating until the task is done, with the user able to interrupt or queue corrections at any point. The loop is "powered by two components: models that reason and tools that act", and the docs call the surrounding layer "the agentic harness". Built-in tools fall into five categories: file operations, search, execution, web, and code intelligence (type errors after edits, via plugins).

## Layer-relevant mechanisms

- **Permissions.** Modes cycle with Shift+Tab: Manual, Accept edits, Plan, and Auto (a background classifier reviews most actions and blocks risky ones; the built-in starting mode in v2.1.283+). Rules are evaluated **deny → ask → allow**; the first match wins and specificity doesn't change the order. A bare `Bash` deny rule removes the tool from the model's context. Per the docs, Bash rules match command text and "aren't a security boundary around the program" — for filesystem/network enforcement use the sandbox. `bypassPermissions` skips prompts (including for `.git` / `.claude`) and is meant for containers or VMs. Managed settings can disable bypass and auto modes org-wide.
- **Checkpoints.** File contents are snapshotted before each edit; Esc-Esc rewinds. Checkpoints are separate from git and cover file changes only — not databases, APIs or deployments.
- **Context.** Compaction is automatic: older tool outputs are cleared first, then the conversation is summarized. If a single file or output refills context after each summary, it stops auto-compacting after a few attempts rather than looping.
- **Memory.** `CLAUDE.md` files (org / user / project; `AGENTS.md` can be read too) plus **auto memory** — notes Claude writes itself from corrections and preferences; the first 200 lines / 25KB of `MEMORY.md` load each session. Sessions otherwise start fresh; transcripts are JSONL under `~/.claude/projects/` and can be resumed or forked.
- **Hooks.** Deterministic shell hooks at lifecycle points, plus prompt-based (single-turn LLM) and agent-based (multi-turn, experimental) hooks. A `Stop` hook can ask a model whether the work is complete and make Claude keep going; the harness overrides a Stop hook after 8 consecutive blocks with no tool call in between.
- **Subagents.** Built-in Explore (read-only), Plan (read-only) and general-purpose; each runs in its own context window. Default nesting depth 3, default 20 concurrent. Skills load on demand; MCP tool definitions are deferred and loaded via tool search.
- **Review commands.** On-demand `/code-review` (alias `/review`) reviews the current diff, a PR, branch or path for correctness bugs; `/security-review` reviews the branch diff for security issues; `/ultrareview` runs a multi-agent review in the cloud. None runs automatically before a reply.
- **Surfaces.** Terminal, VS Code, JetBrains, desktop, web/mobile, Slack, GitHub Actions / GitLab CI, Remote Control, scheduled routines. Models: Claude, via Claude plans, the Anthropic Console, Amazon Bedrock, Google Cloud, Microsoft Foundry or an LLM gateway.

## Known security issues

- CVE-2026-33068 (GHSA-mmgp-wc2j-qcv7, CVSS 4.0: 7.7, published 2026-03-19, fixed in 2.1.53): a repo-committed `.claude/settings.json` could set `permissions.defaultMode` to `bypassPermissions` and cause the workspace-trust dialog to be skipped.
- CVE-2026-25724 (CVSS 4.0: 2.3, fixed in 2.1.7): deny rules not enforced through symbolic links.

## What's actually different

The loop is the commodity part. What Claude Code builds around it is a deep permission and hook system, file-level checkpoints, an auto-memory loop, and a very wide set of surfaces — against a closed-source core and a single model family.

## Sources

- https://code.claude.com/docs/en/how-claude-code-works
- https://code.claude.com/docs/en/permissions
- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/hooks-guide
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/third-party-integrations
- https://github.com/anthropics/claude-code
- https://github.com/advisories/GHSA-mmgp-wc2j-qcv7
