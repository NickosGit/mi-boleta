# Implementation prompt — Mi Boleta (paste into Claude Code)

You are building **Mi Boleta**, a Week 11 slice for a university course. Read `docs/PACKET.md` first; it is the source of truth, and section 8 lists the team Blueprint conditions this build must honor. Build in small, testable features, commit after each one, and stop to show me the result after each feature before continuing.

## Context in one paragraph
Small recycling buyers ("centros de acopio") in Mexico City weigh material brought by informal waste pickers ("pepenadoras") and keep the record in a notebook. Mi Boleta lets the logged-in acopio operator issue a weight ticket ("boleta") in **≤ 5 seconds and ≤ 2 taps** after a SIMULATED scale reading stabilizes, falling back to a photo of a digital display read by a vision model, or to manual entry. The picker gets her copy via a `wa.me` link (no account) or a **printed 58 mm folio**. She never has to confirm anything for the ticket to count, and disputing never deletes it. **There is no score, rating, ranking, star, or color judging any person, and no geolocation anywhere. Do not add any of them, even as a placeholder.**

## Stack (free tier only)
Next.js App Router + TypeScript + Tailwind · Supabase (Postgres, Auth with Google, Realtime, Storage) · Gemini Flash via Google AI Studio (`GEMINI_MODEL` env var) · zod · `qrcode` · Vercel.

## Hard rules
1. Secrets only in env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL` (avoid the service role key; if used, server only). Create `.env.example` with empty values; put `.env*.local` in `.gitignore` before the first commit.
2. RLS enabled on every table. Operators only see rows of acopios they own.
3. Public access only through `security definer` SQL functions taking a UUID v4 token and returning minimal fields. Never expose `telefono`.
4. zod validation on client and server for every input (limits in PACKET section 12).
5. Vision route sends only the image with a fixed prompt. Parse the response as JSON and validate it with zod; on any failure return `{ ok: false }` and fall back to manual entry. Analog dials always go to manual entry.
6. Boletas are never deleted. No DELETE policy. Operators can only void (`anulada`) with a visible reason.
7. Aggregates (median price, weekly balance) always state what they exclude. Inconsistency is flagged as "inconsistente" at acopio + material + week level, never on a boleta or a person, and never with a cause.
8. Seed data is invented and labeled "(ejemplo)". UI labels: "BÁSCULA SIMULADA", "Lectura IA — sugerencia", "Precios de ejemplo".
9. UI text in Spanish (Mexico). Large touch targets (min 56 px) on the capture screen.

## Data model
- `acopios` (id uuid pk, owner_id uuid → auth.users, nombre, zona, created_at)
- `pepenadores` (id uuid pk, acopio_id, alias text, telefono text null, created_at)
- `precios` (id, acopio_id, material check in ('PET','Carton','Aluminio','Cobre','Fierro','Vidrio'), precio_kg numeric(8,2), updated_at); unique (acopio_id, material)
- `scale_readings` (id bigserial, acopio_id, kg numeric(7,2), created_at)
- `boletas` (id uuid pk, acopio_id, pepenador_id, folio int, material, kg numeric(7,2), precio_kg numeric(8,2), total numeric(10,2), fuente check in ('bascula_simulada','foto_ia','manual'), ia_confianza numeric null, foto_path text null, estable_at timestamptz null, emision_ms int null, entrega check in ('whatsapp','impreso','ninguna') default 'ninguna', token uuid default gen_random_uuid() unique, estado check in ('emitida','en_desacuerdo','anulada') default 'emitida', motivo_anulacion text null, created_at); unique (acopio_id, folio)
- `desacuerdos` (id, boleta_id unique, origen check in ('pepenadora','operador'), nota text null ≤ 280, created_at)
- `ventas_salientes` (id, acopio_id, material, kg numeric(9,2), semana date, comprador text, created_at) — invented outbound invoices
- Functions: `get_boleta(p_token)`; `registrar_desacuerdo(p_token, p_nota)` (idempotent); `mediana_precio(p_zona, p_material)` → `{ mediana, acopios_incluidos, acopios_excluidos }`, null median if fewer than 3 acopios with at least 5 boletas this week.
- View `balance_semanal` (acopio_id, material, semana, kg_entrada, kg_salida, estado: 'consistente' | 'inconsistente' | 'sin_salidas'), with a tolerance of ±10% (make it a constant).

## Features, in order

**F1 — Scaffold + auth + deploy #1**
Next.js app, Supabase helpers, Google sign-in, `/login`, protected `/app`, logout, and first-login onboarding to create my acopio.
✅ Incognito `/app` redirects to `/login`; Google login lands on `/app`; live on Vercel.
Commit: `feat: scaffold, google auth, acopio onboarding`

**F2 — Schema, RLS, seed**
Migration in `supabase/migrations/` with all tables, policies, functions, and the view. Seed: 3 invented acopios, 10 aliases, prices, and two weeks of boletas plus ventas salientes (one week deliberately inconsistent for PET).
✅ A second Google account sees 0 rows of the first acopio from the browser client. No DELETE possible on `boletas`.
Commit: `feat: schema with RLS, no-delete boletas, invented seed`

**F3 — Simulated scale (IoT/sensing)**
`/app/bascula` labeled BÁSCULA SIMULADA: target-weight slider plus Gaussian noise (σ 0.02 kg; "inestable" toggle σ 0.3 kg), inserting every 500 ms. `/app/nueva` subscribes via Realtime; stable = last 5 readings within ±0.05 kg → green ESTABLE chip, weight locks, and `estable_at` is captured.
✅ Steady 23.4 kg turns ESTABLE in ≤ 3 s; "inestable" never does.
Commit: `feat: simulated scale feed with stability detection`

**F4 — 2-tap boleta + prices + public view (marketplace logic)**
`/app/precios` to edit prices. `/app/nueva`: big alias buttons (last 8 used, plus "+ Nueva"), material preselected from the operator's last delivery with its price; tap alias → tap "Emitir boleta". Server computes folio and total and stores `emision_ms = now - estable_at`. Show a visible timer. After issuing: "Compartir por WhatsApp" (`https://wa.me/?text=` + encoded text + `/b/[token]` link, sets `entrega='whatsapp'`) and "Imprimir folio". `/b/[token]`: all 7 fields from condition 2, median zone price with its exclusions line, every simulated/AI/example label.
✅ ESTABLE → folio in ≤ 5 s with 2 taps; incognito `/b/[token]` works without phone data; fake token → "Boleta no encontrada".
Commit: `feat: two-tap boleta, price board, public boleta view`

**F5 — Printed folio (condition 1)**
`/b/[token]/imprimir`: 58 mm print layout (`@media print`, monospace, high contrast) with folio, 7 fields, QR to `/b/[token]`, and the printed dispute route: "¿No estás de acuerdo? Dilo al operador o manda este folio por WhatsApp." It opens the print dialog automatically and sets `entrega='impreso'`.
✅ Prints on one 58 mm strip from Chrome print preview; QR resolves.
Commit: `feat: printable 58mm folio with QR and dispute route`

**F6 — Vision fallback (ML) + deploy #2**
"Foto del display digital" (`accept="image/*" capture="environment"`) → private bucket `displays/` → authenticated `/api/vision` (max 5 MB, JPEG/PNG, 20 calls per user per hour). The model returns `{ kg: number|null, display: 'digital'|'analogico'|'ilegible', confianza: number }`. Prefill only if display is digital and confianza ≥ 0.8 (fuente `foto_ia`); otherwise focus manual input (fuente `manual`). Keep the photo as evidence on the boleta.
✅ Legible digital photo prefills; analog or blurry falls back; the key is not in the client bundle.
Commit: `feat: digital display reading with manual fallback`

**F7 — Disputes, voiding, weekly balance + deploy #3**
"No estoy de acuerdo" on `/b/[token]` and an operator-side "Registrar desacuerdo" on `/app/boletas`; disputed boletas stay counted. "Anular" requires a reason and stays visible. `/app/ventas` to log outbound sales; `/app/balance` shows `balance_semanal` with "consistente / inconsistente / sin salidas" and no cause text. `/app/metricas`: median and p90 `emision_ms`, % by fuente, % printed vs WhatsApp, % disputed. Then run PACKET section 14, fix at least one bug, and log it in `DECISIONS.md`.
✅ All 17 tests pass.
Commit: `feat: disputes, voiding, weekly balance, metrics` then `fix: <bug from test pass>`

## Session close (every session)
Update `DECISIONS.md` (what was decided and why, plus tomorrow's first move), commit, push.
