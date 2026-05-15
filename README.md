# Creator Campaign OS

## Environment setup

Copy the example env file and fill in your local values:

```bash
cp .env.example .env.local
```

### Required env vars

These are required for the app to run against real data:

- `DATABASE_URL` — Supabase Postgres connection string. Use the pooled connection string with `pgbouncer=true`.
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase browser/server auth key.
- `NEXT_PUBLIC_APP_URL` — app URL, for example `http://localhost:3000` locally or your deployed URL in production.

Required for upload/storage features:

- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key for server-side storage uploads.

Optional integrations:

- `ANTHROPIC_API_KEY` — AI analysis, matching, discovery, and message generation.
- `BRAVE_API_KEY` — external web discovery.
- `SHOPIFY_WEBHOOK_SECRET` — Shopify webhook signature verification.
- `CONVERSION_WEBHOOK_SECRET` — generic conversion webhook signature verification.
- `PORTAL_SECRET` — creator portal token signing secret. Set a strong value in production.

## Build behavior

The app validates required environment variables with explicit error messages when a feature needs them. Database initialization is lazy so importing route modules during `next build` does not fail just because `DATABASE_URL` is missing.

If a required value is missing at runtime, the error will name the missing env var and point you back to `.env.example`.

## Common commands

```bash
npm install
npm run dev
npm run build
```
