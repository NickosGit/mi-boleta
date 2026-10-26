# DECISIONS — Mi Boleta (Week 11)

## 2026-10-25 · Session 1 · F1

**Missing packet.** `IMPLEMENTATION_PROMPT.md` says to read `docs/PACKET.md` (sections 8, 12 and 14), but no Week 11 packet arrived; the only `PACKET.md` in Downloads is Week 10 (Mi Quincena). The team Blueprint (`docs/BLUEPRINT_team.pdf`, draft) is here and supplies the conditions. F1 doesn't depend on the packet. **F2 (seed), F4 (zod limits, PACKET §12) and F7 (17 tests, PACKET §14) do**, so the packet is needed before F2.

Decisions:

- **New app in `mi-boleta/`, port 3900.** Same stack and Supabase SSR + `proxy.ts` pattern as `mi-quincena` (Next 16, Tailwind 4, `@supabase/ssr`, zod 4).
- **`/app` is protected twice**: `proxy.ts` redirects to `/login`, and `app/app/layout.tsx` re-checks the user with `auth.getUser()` (validated, not just decoded from the cookie).
- **The acopios table ships in F1** (`supabase/migrations/0001_acopios.sql`), because onboarding needs it. RLS on; select/insert/update only where `owner_id = auth.uid()`; no DELETE policy; `anon` has no grants. F2 adds the rest in `0002_...`.
- **`zona` is one of the 16 CDMX alcaldías, picked from a list**, not free text. The zone median (F4) needs matching values, and a self-declared alcaldía is not geolocation. The form says so ("No usamos tu ubicación").
- **One acopio per operator in the UI.** The schema allows several (the spec has no unique constraint), the app uses the oldest one, and the server action skips the insert if one already exists, so a double tap can't create two.
- **Acopio name limit 2–80 characters**: a provisional value until PACKET §12 arrives.
- **No service-role key.** Not in `.env.example`, not in code.
- **Palette**: high-contrast light; amber accent. No colors that judge people. The green ESTABLE chip (F3) is about the scale, not a person.

**Tomorrow's first move:** get the Week 11 `PACKET.md` into `docs/`, then F2 (schema, RLS, seed).
