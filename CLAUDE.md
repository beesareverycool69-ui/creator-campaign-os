# Creator Campaign OS — Claude Code Rules

## Project Overview
B2B influencer/creator campaign CRM. Next.js 14 App Router, Drizzle ORM, Supabase Postgres, TypeScript.

## Stack
- **Framework:** Next.js 14 (App Router, Server Actions)
- **Database:** Postgres via Supabase, Drizzle ORM
- **Auth:** Supabase Auth
- **Styling:** Tailwind CSS
- **AI:** Anthropic SDK (direct API calls, no abstraction layers)

## Conventions
- Server actions live in `src/lib/actions/`
- AI logic lives in `src/lib/ai/`
- DB schema lives in `src/lib/db/schema/`
- Components live in `src/components/features/[domain]/` and export from an `index.ts`
- Use `db:push` to apply schema changes (or apply SQL directly if interactive confirmation is needed)
- No heavy abstractions. No wrapper libraries around the Anthropic SDK.
- Use Haiku for extraction tasks, Sonnet for reasoning/prose generation
- Native HTML `<select>` via `@/components/ui/select` — NOT Radix UI

## Environment
- `.env.local` holds all secrets (Supabase, Anthropic API key, DB URL)
- `ANTHROPIC_API_KEY` is set in `.env.local`

## STUCK PROTOCOL

When you encounter an error or blocker:

1. TRY TO FIX IT YOURSELF FIRST. Make at least 3 different attempts.
2. Re-read the error. Search the codebase for similar patterns.
3. ONLY after 3+ failed attempts, text Bee using this exact command:

```
osascript -e 'tell application "Messages" to send "🚨 STUCK: [what you were building] | ERROR: [what failed] | NEED: [what you need]" to buddy "+18018880650"'
```

4. After sending, STOP and WAIT. Do not continue until Bee responds.
5. Do NOT text for minor things you can solve yourself.
