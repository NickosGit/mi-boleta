# DECISIONS — Mi Boleta (Week 11)

## 2026-10-25 · Session 1 · F1

**Packet arrived after the F1 commit** and is now in `docs/PACKET.md`. Reconciled with F1:
- §14 test 1 (Google login/logout, `/app` → `/login` without a session) is what F1 built.
- §12 limits (kg 0.01–2000, alias 2–40 letters/spaces/hyphen, optional 10-digit phone, note ≤ 280, void reason ≤ 140, JPEG/PNG ≤ 5 MB) apply from F2/F4 on. The packet sets no limit for the acopio name, so 2–80 stays.
- §4 mockup accent is navy `#1F3A5F`: `--ink` and `themeColor` switched to it.
- §12 says the service-role key may live in Vercel env; the app still doesn't use it.
- The Blueprint is still a draft (Pepenador rails vs. water vote pending). The packet assumes Pepenador rails; so does this build.

Decisions:

- **New app in `mi-boleta/`, port 3900.** Same stack and Supabase SSR + `proxy.ts` pattern as `mi-quincena` (Next 16, Tailwind 4, `@supabase/ssr`, zod 4).
- **`/app` is protected twice**: `proxy.ts` redirects to `/login`, and `app/app/layout.tsx` re-checks the user with `auth.getUser()` (validated, not just decoded from the cookie).
- **The acopios table ships in F1** (`supabase/migrations/0001_acopios.sql`), because onboarding needs it. RLS on; select/insert/update only where `owner_id = auth.uid()`; no DELETE policy; `anon` has no grants. F2 adds the rest in `0002_...`.
- **`zona` is one of the 16 CDMX alcaldías, picked from a list**, not free text. The zone median (F4) needs matching values, and a self-declared alcaldía is not geolocation. The form says so ("No usamos tu ubicación").
- **One acopio per operator in the UI.** The schema allows several (the spec has no unique constraint), the app uses the oldest one, and the server action skips the insert if one already exists, so a double tap can't create two.
- **Acopio name limit 2–80 characters** (PACKET §12 doesn't cover it).
- **No service-role key.** Not in `.env.example`, not in code.
- **Palette**: high-contrast light; amber accent. No colors that judge people. The green ESTABLE chip (F3) is about the scale, not a person.

## 2026-10-25 · Session 1 · F2–F7 (speed run)

The user asked to finish in ~30 min, so F2–F7 were built in one pass with one commit each, without stopping after every feature.

- **Boletas are written only through `security definer` functions** (`emitir_boleta`, `marcar_entrega`, `anular_boleta`, `registrar_desacuerdo[_operador]`). Authenticated users have SELECT only; INSERT/UPDATE/DELETE are revoked, so a browser DELETE fails with "permission denied" instead of silently affecting 0 rows.
- **`emision_ms` uses server clocks only**: `estable_at` is the `created_at` of the 5th stable reading (set by Postgres), and the function subtracts it from `clock_timestamp()`. Only scale boletas have it; photo/manual boletas don't have an ESTABLE moment, and the metrics page says so.
- **Stability** = last 5 readings within ±0.05 kg of their mean, platform > 0.1 kg (`lib/stability.ts`, unit-tested with σ 0.02 and σ 0.3).
- **Seed**: 3 invented acopios in Iztapalapa owned by placeholder `auth.users` rows (`*@mi-boleta.invalid`, no password, can't sign in), so the zone median has 3 included acopios. A "Cargar datos de ejemplo" button runs `cargar_ejemplo()` on the operator's own acopio (10 aliases, prices, 2 weeks, last week's PET sales at 70% → "inconsistente").
- **Median**: includes acopios in the zone with ≥ 5 non-voided boletas of that material this week; null under 3; always prints how many were excluded and why.
- **Balance view** is `security_invoker`, tolerance in `balance_tolerancia()` (0.10). Includes disputed, excludes voided, and says so.
- **Vision**: photo goes to the private `displays/{acopio_id}/` bucket first (evidence), then only the image + fixed prompt to Gemini; zod-validated; analog/illegible/low-confidence → manual with focus. Editing an AI-prefilled weight switches `fuente` to `manual`. Limit 20 calls/user/hour via the `vision_llamadas` table (survives cold starts, unlike last week's in-memory limiter).
- **Public pages** use a session-less anon client, so `/b/[token]` behaves the same signed-in or not. Malformed tokens never hit the DB; unknown and malformed both say "Boleta no encontrada".

**Pending:** run migrations 0002 + 0003, Vercel deploy, PACKET §14 test pass, one bug → `fix:` commit.

**Tomorrow's first move:** PACKET §14 test pass on the live URL.
