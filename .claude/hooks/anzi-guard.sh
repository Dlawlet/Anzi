#!/usr/bin/env bash
# PostToolUse Edit|Write — Anzi-specific red flags in the file just written.
# Exit 2 feeds the message back to Claude (the edit is not undone). Silent when clean.
command -v jq >/dev/null 2>&1 || exit 0
f="$(jq -r '.tool_input.file_path // empty')"
[ -z "$f" ] && exit 0
f="${f//\\//}"
[ -f "$f" ] || exit 0
case "$f" in */node_modules/*|*/.next/*) exit 0;; esac

msgs=""
add() { msgs="${msgs}- $1"$'\n'; }

case "$f" in
  */NextJS/public/*)
    case "$f" in
      *.png|*.jpg|*.jpeg|*.gif|*.mp4|*.webm|*.webp|*.avif)
        sz=$(wc -c <"$f")
        [ "$sz" -gt 153600 ] && add "public asset is $((sz / 1024)) KB (budget 150 KB). Resize and convert to webp/avif: users are on slow, expensive mobile data." ;;
    esac ;;
  */NextJS/*.ts|*/NextJS/*.tsx|*/NextJS/*.js|*/NextJS/*.jsx|*/NextJS/*.mjs)
    grep -qE 'setHTML\(|dangerouslySetInnerHTML|\.innerHTML[[:space:]]*=' "$f" &&
      add "HTML injection sink (setHTML / dangerouslySetInnerHTML / innerHTML). Place and street names are user-supplied: use textContent / setText, or escape."
    grep -qE 'NEXT_PUBLIC_[A-Z0-9_]*(MONGO|DB_|SECRET|PASSWORD|PRIVATE|SALT)' "$f" &&
      add "Secret-looking env var with the NEXT_PUBLIC_ prefix (inlined into the browser bundle). Use a server-only name."
    case "$f" in
      */api/*|*/models/*|*/utils/*)
        grep -qE 'error:[[:space:]]*(error|err|e)[[:space:]]*[,}]' "$f" &&
          add "Raw error object returned to the client. Log it server-side, return a generic message."
        grep -qiE 'console\.(log|info)\(.*(email|phone|tel)' "$f" &&
          add "Possible PII (email/phone) written to logs."
        grep -q '\$regex' "$f" && ! grep -q 'escapeRegex' "$f" &&
          add "\$regex built from input without escapeRegex(): injection / ReDoS. Escape, cap length, add .limit()."
        ;;
    esac
    case "$f" in
      */route.ts)
        grep -qE 'export (async )?function' "$f" && ! grep -q 'connectToDatabase' "$f" &&
          add "route.ts exports handlers but never calls connectToDatabase()." ;;
    esac ;;
esac

[ -z "$msgs" ] && exit 0
printf 'anzi-guard: fix before continuing (%s):\n%s' "${f##*/NextJS/}" "$msgs" >&2
exit 2
