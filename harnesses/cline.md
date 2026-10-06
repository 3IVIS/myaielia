# Cline

> **Research notes.** Background for the layer-by-layer mapping on
> [myaielia.com/harness-comparison](https://myaielia.com/harness-comparison),
> which is the canonical, maintained version — star, release and token-volume figures there
> take precedence over this file. Figures below were read on 2026-10-06.

Cline is an autonomous coding agent from Cline Bot Inc., Apache-2.0 licensed (`cline/cline`, created 2024-07-06, ~69,900 stars). It ships as a VS Code extension, a JetBrains plugin, a CLI (latest release cli-v3.0.68 on 2026-10-02), a desktop app and a Node SDK. It works with Claude, GPT, Gemini, Ollama and 200+ other models via OpenRouter and compatible APIs. On OpenRouter's daily view it was #4 at ~914B tokens. It is the ancestor of Roo Code and, through it, Kilo Code's original codebase.

## The loop

The SDK docs describe the agent loop as "run() or continue() → model request → tool calls, if any → tool results → repeat until complete". Docs: "Every action requires your explicit approval" (in the IDE; see below for the CLI).

## Layer-relevant mechanisms

- **Plan / Act.** Plan mode "can read your codebase, run searches, and discuss strategy, but cannot modify any files or execute commands"; Act mode can modify files and run commands. The conversation carries over between modes.
- **Approvals.** Eight auto-approve categories (read project files, read all files, edit project files, edit all files, execute safe commands, execute all commands, browser, MCP). There is no fixed allowlist: "the model marks each command with a `requires_approval` flag based on the command and arguments". **YOLO mode** "disables all safety checks". In the CLI, `--auto-approve` defaults to `true` (false in ACP editor-integration mode).
- **Checkpoints.** A shadow Git repository, separate from the project's history, gets a commit after each tool use. Restore Files, Restore Task Only, or Restore Files & Task.
- **Context.** Auto-compact summarizes near the context limit, reusing the prompt cache; checkpoints can restore pre-summary state; with Focus Chain enabled, todo lists persist across summarizations.
- **Rules and memory.** `.clinerules/` or `.cline/rules/` (workspace), global rules in `~/Documents/Cline/Rules`, plus `.cursorrules`, `.windsurfrules` and `AGENTS.md`; conditional rules with `paths:` frontmatter. **Memory Bank is a user-created convention** implemented through a rules file, not a built-in feature.
- **Subagents.** Spawned automatically or on request for parallel exploration; each has its own context window and token budget, cannot nest, and is read-only (no writes, patches, browser, MCP or web search).
- **Also:** hooks and plugins (via the SDK), MCP, skills, agent teams, cron-based scheduling, `--json` output, `--zen` background sessions.
- **Compiler/linter awareness.** The README says it "maintains real-time awareness of compiler and linter errors".

## Known security issues

- "Clinejection" (disclosed 2026-02-09): prompt injection through a GitHub issue title in a Claude-powered issue-triage workflow, plus GitHub Actions cache poisoning, exposed Cline's npm publish token. On 2026-02-17 an unauthorized `cline@2.3.0` was published with a postinstall script running `npm install -g openclaw@latest`; it was live ~8 hours (until 2.4.0). Cline states openclaw is "a legitimate, non-malicious open source project" and reports no evidence of user-data exposure; 2.4.0+ uses OIDC provenance and ephemeral tokens. Third-party reports put downloads of the bad version at ~4,000.

## What's actually different

The loop is a standard tool-calling loop. Cline's lineage-defining idea is human-in-the-loop control — Plan/Act, per-category approvals, and a checkpoint after every tool use — which Kilo Code inherited and extended.

## Sources

- https://github.com/cline/cline
- https://docs.cline.bot/core-workflows/plan-and-act
- https://docs.cline.bot/core-workflows/checkpoints
- https://docs.cline.bot/features/auto-approve
- https://docs.cline.bot/features/subagents
- https://docs.cline.bot/features/auto-compact
- https://docs.cline.bot/customization/cline-rules
- https://docs.cline.bot/best-practices/memory-bank
- https://docs.cline.bot/cli/cli-reference
- https://docs.cline.bot/sdk/sessions
- https://cline.bot/blog/post-mortem-unauthorized-cline-cli-npm
- https://snyk.io/blog/cline-supply-chain-attack-prompt-injection-github-actions/
