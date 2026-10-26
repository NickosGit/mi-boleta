import "server-only";

import { createClient as createSupabase } from "@supabase/supabase-js";

import type { Fuente, Material } from "@/lib/materiales";
import { tokenSchema } from "@/lib/schemas";
import { requireSupabaseEnv } from "@/lib/supabase/env";

export type BoletaPublica = {
  folio: number;
  fecha: string;
  acopio: string;
  zona: string;
  alias: string;
  material: Material;
  kg: number;
  precio_kg: number;
  total: number;
  fuente: Fuente;
  ia_confianza: number | null;
  estado: "emitida" | "en_desacuerdo" | "anulada";
  motivo_anulacion: string | null;
  en_desacuerdo: boolean;
};

export type Mediana = { mediana: number | null; acopios_incluidos: number; acopios_excluidos: number };

/** Anonymous client: the public view works the same with or without a session. */
export function anonClient() {
  const { url, anonKey } = requireSupabaseEnv();
  return createSupabase(url, anonKey, { auth: { persistSession: false } });
}

/** Null for a malformed or unknown token (same answer either way, nothing leaks). */
export async function getBoletaPublica(token: string): Promise<BoletaPublica | null> {
  if (!tokenSchema.safeParse(token).success) return null;
  const { data, error } = await anonClient().rpc("get_boleta", { p_token: token });
  if (error || !data) return null;
  return data as BoletaPublica;
}

export async function getMediana(zona: string, material: string): Promise<Mediana | null> {
  const { data, error } = await anonClient().rpc("mediana_precio", { p_zona: zona, p_material: material });
  if (error || !data) return null;
  return data as Mediana;
}
