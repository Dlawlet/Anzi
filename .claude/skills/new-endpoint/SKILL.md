---
name: new-endpoint
description: Add or change an Anzi API route the safe way (route.ts + controller, validation, status codes, privacy, tests). Use whenever creating or modifying anything under NextJS/app/**/api/.
allowed-tools: Bash Read Grep Edit Write
---
# New or changed endpoint

1. Read `.claude/rules/api.md` and the data model section of `docs/refresh-plan.md`. Reuse existing helpers (`connectToDatabase`, validators, `escapeRegex`); do not duplicate them.
2. Structure: `route.ts` only maps verbs to controller functions; logic lives in `<name>_controller` next to it.
3. Write the failing test first when a test runner exists (`commands.test` in `.claude/jarvis.json`): happy path, invalid input (400), not found (404), unauthorized (401/403), and one abuse case (oversized or malformed input).
4. Implement: validate, then act. Return only public fields. Decide explicitly: who may call this (anonymous / owner / admin), what is rate limited, what is logged (never PII).
5. Check privacy: does any response expose phone, email, exact location of a `visibility != "public"` place? If yes, stop and fix.
6. Run the `verify` skill. Report in 3 lines: endpoint, who can call it, what you tested.
