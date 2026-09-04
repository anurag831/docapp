# Architecture Note

Single-service Express + React SPA. Express serves the built Vite bundle
in production, giving one Railway URL with no CORS complexity.

SQLite chosen over Postgres to eliminate external DB provisioning — Railway's
persistent disk is sufficient for demo scale. Documents store TipTap's
ProseMirror JSON, preserving rich-text structure across saves.

Auth is simulated via seeded users and an `x-user-id` header. Real auth
would replace this with JWT middleware in a production context.

Sharing is intentionally minimal: owner-only grant, no revocation UI, to
keep scope within 3 hours. The data model supports revocation trivially
(DELETE from shares).

Prioritized: editor quality, sharing logic, persistence correctness.
Deprioritized: auth security, mobile layout, document versioning.
