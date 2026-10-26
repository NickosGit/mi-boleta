# Setup: the steps only you can do

Replace `<ref>` with your Supabase project ref and `<vercel-url>` with the deployed host (e.g. `mi-boleta-xxx.vercel.app`).

## 1. Supabase

1. https://supabase.com/dashboard → **New project**. Name `mi-boleta`, free plan, region East US. The free plan allows **2 active projects**: pause an old week's project if you're at the limit.
2. **Project Settings → API Keys**: copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` and the **anon / publishable** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` into `mi-boleta/.env.local`. Never the service-role / secret key.
3. **SQL Editor** → paste each file in `supabase/migrations/` in order → Run.
4. **Authentication → URL Configuration**: Site URL `http://localhost:3900` (then `https://<vercel-url>`); Redirect URLs `http://localhost:3900/auth/callback` and `https://<vercel-url>/auth/callback`.
5. **Authentication → Sign In / Providers → Google**: copy the Callback URL (`https://<ref>.supabase.co/auth/v1/callback`).

## 2. Google OAuth client

Reuse a previous week's Web client, adding:

- Authorized JavaScript origins: `http://localhost:3900` and `https://<vercel-url>`
- Authorized redirect URIs: `https://<ref>.supabase.co/auth/v1/callback`

Paste its Client ID and secret into the Supabase Google provider → Enable → Save. Add a second Gmail as a test user (for the F2 RLS check).

## 3. Gemini (from F6)

https://aistudio.google.com → API key → `GEMINI_API_KEY`; the free-tier Flash model ID → `GEMINI_MODEL`.

## 4. GitHub + Vercel

1. https://github.com/new → `mi-boleta`, empty (no README/.gitignore/license).
2. https://vercel.com/new → Import → add the two `NEXT_PUBLIC_SUPABASE_*` env vars → Deploy.
3. Add `<vercel-url>` to Supabase (1.4) and Google origins (2).
