"use server";

import { revalidatePath } from "next/cache";

import { anonClient } from "@/lib/boleta-publica";
import { firstError, notaSchema, tokenSchema } from "@/lib/schemas";

/** Public dispute from the picker's copy. Idempotent; the boleta keeps counting. */
export async function noEstoyDeAcuerdo(token: string, nota: string): Promise<{ ok: boolean; error?: string }> {
  if (!tokenSchema.safeParse(token).success) return { ok: false, error: "Boleta no encontrada." };
  const n = notaSchema.safeParse(nota);
  if (!n.success) return { ok: false, error: firstError(n.error) };
  const { data, error } = await anonClient().rpc("registrar_desacuerdo", { p_token: token, p_nota: n.data ?? null });
  if (error || data !== true) return { ok: false, error: "No se pudo registrar. Intenta otra vez." };
  revalidatePath(`/b/${token}`);
  return { ok: true };
}
