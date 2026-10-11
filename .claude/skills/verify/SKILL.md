---
name: verify
description: Run the project's verification (typecheck, lint, tests, build) and report. Use before declaring any task done, before committing, or when the user asks to check/validate the work.
allowed-tools: Bash Read Grep
---
# Verify

1. Read `.claude/jarvis.json` → `commands`. Run, in order, every non-empty one of: `typecheck`, `lint`, `test`, `build`.
2. If a command is empty, say so once; do not invent one. Suggest filling it in `jarvis.json`.
3. On failure: show only the relevant error lines (last ~40), fix the root cause, re-run that command, then the rest.
4. Report in 3 lines max: what ran, pass/fail, what you fixed. No victory laps.
5. Never weaken a test or lint rule to get green; if you think one is wrong, say so and ask.
