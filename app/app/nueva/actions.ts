"use server";

import { z } from "zod";

import { getMyAcopio } from "@/lib/acopio";
import { emitirSchema, firstError, pepenadorSchema, tokenSchema } from "@/lib/schemas";
import { getUser } from "@/lib/supabase/server";

export type Emitida = {
  folio: number;
  total: number;
  token: string;
  precio_kg: number;
  emision_ms: number | null;
};

export async function emitirBoleta(raw: unknown): Promise<{ ok: true; boleta: Emitida } | { ok: false; error: string }> {
  const parsed = emitirSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { supabase, user } = await getUser();
  if (!supabase || !user) return { ok: false, error: "Tu sesión terminó. Vuelve a entrar." };

  const d = parsed.data;
  const { data, error } = await supabase.rpc("emitir_boleta", {
    p_pepenador: d.pepenadorId,
    p_material: d.material,
    p_kg: d.kg,
    p_fuente: d.fuente,
    p_estable_at: d.fuente === "bascula_simulada" ? (d.estableAt ?? null) : null,
    p_ia_confianza: d.fuente === "foto_ia" ? (d.iaConfianza ?? null) : null,
    p_foto_path: d.fotoPath ?? null,
  });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) {
    const msg = error?.message ?? "";
    if (msg.includes("sin precio")) return { ok: false, error: "Ese material no tiene precio. Ponlo en Precios." };
    return { ok: false, error: "No se pudo emitir. Intenta otra vez." };
  }
  return {
    ok: true,
    boleta: {
      folio: row.folio,
      total: Number(row.total),
      token: row.token,
      precio_kg: Number(row.precio_kg),
      emision_ms: row.emision_ms,
    },
  };
}

export async function crearPepenador(
  raw: unknown,
): Promise<{ ok: true; pepenador: { id: string; alias: string } } | { ok: false; error: string }> {
  const parsed = pepenadorSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { supabase, user } = await getUser();
  if (!supabase || !user) return { ok: false, error: "Tu sesión terminó. Vuelve a entrar." };
  const acopio = await getMyAcopio(supabase);
  if (!acopio) return { ok: false, error: "Primero crea tu acopio." };

  const { data, error } = await supabase
    .from("pepenadores")
    .insert({ acopio_id: acopio.id, alias: parsed.data.alias, telefono: parsed.data.telefono ?? null })
    .select("id, alias")
    .single();
  if (error || !data) return { ok: false, error: "No se pudo guardar el alias." };
  return { ok: true, pepenador: data };
}

const entregaSchema = z.object({ token: tokenSchema, entrega: z.enum(["whatsapp", "impreso"]) });

export async function marcarEntrega(token: string, entrega: "whatsapp" | "impreso"): Promise<void> {
  const parsed = entregaSchema.safeParse({ token, entrega });
  if (!parsed.success) return;
  const { supabase, user } = await getUser();
  if (!supabase || !user) return; // a visitor without a session records nothing
  await supabase.rpc("marcar_entrega", { p_token: parsed.data.token, p_entrega: parsed.data.entrega });
}
