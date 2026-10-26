"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getMyAcopio } from "@/lib/acopio";
import { acopioFieldErrors, acopioSchema, type AcopioFieldErrors } from "@/lib/schemas";
import { getUser } from "@/lib/supabase/server";

export type OnboardingState = { error?: string; fieldErrors?: AcopioFieldErrors };

export async function createAcopio(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const { supabase, user } = await getUser();
  if (!supabase || !user) redirect("/login");

  const parsed = acopioSchema.safeParse({
    nombre: formData.get("nombre"),
    zona: formData.get("zona"),
  });
  if (!parsed.success) return { fieldErrors: acopioFieldErrors(parsed.error) };

  // A double tap must not create two acopios.
  if (!(await getMyAcopio(supabase))) {
    const { error } = await supabase
      .from("acopios")
      .insert({ nombre: parsed.data.nombre, zona: parsed.data.zona, owner_id: user.id });
    if (error) return { error: "No se pudo guardar. Intenta otra vez." };
  }

  revalidatePath("/app", "layout");
  redirect("/app");
}
