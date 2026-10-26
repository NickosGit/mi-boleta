"use server";

import { revalidatePath } from "next/cache";

import { getMyAcopio } from "@/lib/acopio";
import { firstError, ventaSchema } from "@/lib/schemas";
import { getUser } from "@/lib/supabase/server";

/** Monday of the week (UTC date math on a YYYY-MM-DD string). */
function lunes(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export async function registrarVenta(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = ventaSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { supabase, user } = await getUser();
  if (!supabase || !user) return { ok: false, error: "Tu sesión terminó." };
  const acopio = await getMyAcopio(supabase);
  if (!acopio) return { ok: false, error: "Primero crea tu acopio." };

  const { error } = await supabase.from("ventas_salientes").insert({
    acopio_id: acopio.id,
    material: parsed.data.material,
    kg: parsed.data.kg,
    semana: lunes(parsed.data.semana),
    comprador: parsed.data.comprador,
  });
  if (error) return { ok: false, error: "No se pudo guardar." };
  revalidatePath("/app/ventas");
  revalidatePath("/app/balance");
  return { ok: true };
}
