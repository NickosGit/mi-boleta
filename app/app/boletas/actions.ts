"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { firstError, motivoSchema, notaSchema } from "@/lib/schemas";
import { getUser } from "@/lib/supabase/server";

const id = z.uuid();

export async function anular(boletaId: string, motivo: string): Promise<{ ok: boolean; error?: string }> {
  const m = motivoSchema.safeParse(motivo);
  if (!id.safeParse(boletaId).success) return { ok: false, error: "Boleta inválida." };
  if (!m.success) return { ok: false, error: firstError(m.error) };
  const { supabase, user } = await getUser();
  if (!supabase || !user) return { ok: false, error: "Tu sesión terminó." };
  const { error } = await supabase.rpc("anular_boleta", { p_boleta: boletaId, p_motivo: m.data });
  if (error) return { ok: false, error: "No se pudo anular." };
  revalidatePath("/app/boletas");
  return { ok: true };
}

export async function desacuerdoOperador(boletaId: string, nota: string): Promise<{ ok: boolean; error?: string }> {
  const n = notaSchema.safeParse(nota);
  if (!id.safeParse(boletaId).success) return { ok: false, error: "Boleta inválida." };
  if (!n.success) return { ok: false, error: firstError(n.error) };
  const { supabase, user } = await getUser();
  if (!supabase || !user) return { ok: false, error: "Tu sesión terminó." };
  const { error } = await supabase.rpc("registrar_desacuerdo_operador", { p_boleta: boletaId, p_nota: n.data ?? null });
  if (error) return { ok: false, error: "No se pudo registrar." };
  revalidatePath("/app/boletas");
  return { ok: true };
}
