import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type Acopio = { id: string; nombre: string; zona: string };

/** The operator's acopio (oldest if several). RLS already limits rows to the owner. */
export async function getMyAcopio(supabase: SupabaseClient): Promise<Acopio | null> {
  const { data, error } = await supabase
    .from("acopios")
    .select("id, nombre, zona")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
