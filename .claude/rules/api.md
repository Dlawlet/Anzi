---
paths:
  - NextJS/app/**/api/**
  - NextJS/models/**
  - NextJS/utils/**
---
# API and data rules (new or changed code)

- Every handler: `await connectToDatabase()`, validate input (schema validator), then act. No `await req.json()` outside try/catch; bad JSON is a 400.
- Status codes: 201 create, 400 invalid input, 401/403 not allowed, 404 not found, 409 conflict, 429 rate limited. Never 200 for a failure, never 500 for "not found".
- Return generic error messages. Log the real error server-side; never return Mongoose/Mongo error objects.
- Validate `id` with `mongoose.isValidObjectId` before any `findById*`.
- User-supplied search text: `escapeRegex()` + length cap + `.limit()`. Coordinates: parse to numbers, require finite lng/lat in range.
- Public reads select only public fields and are paginated. Contact data (phone, email) is never in a public response.
- Writes need an identity check (device token or session) and a rate limit. The client never sets `status`, `code` or ownership fields.
- Indexes (`2dsphere`, unique `code`) are declared in the schema, never created per request.
- Server-only config uses non-`NEXT_PUBLIC_` names. Domain model: see `docs/refresh-plan.md` (Place / Street / code).
