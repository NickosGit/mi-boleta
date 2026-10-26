"use server";

import { revalidatePath } from "next/cache";

import { getMyAcopio } from "@/lib/acopio";
import { firstError, precioSchema } from "@/lib/schemas";
import { getUser } from "@/lib/supabase/server";

export async function guardarPrecio(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = precioSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { supabase, user } = await getUser();
  if (!supabase || !user) return { ok: false, error: "Tu sesión terminó. Vuelve a entrar." };
  const acopio = await getMyAcopio(supabase);
  if (!acopio) return { ok: false, error: "Primero crea tu acopio." };

  const { error } = await supabase.from("precios").upsert(
    {
      acopio_id: acopio.id,
      material: parsed.data.material,
      precio_kg: parsed.data.precio,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "acopio_id,material" },
  );
  if (error) return { ok: false, error: "No se pudo guardar." };
  revalidatePath("/app/precios");
  return { ok: true };
}
