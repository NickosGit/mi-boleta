import { z } from "zod";

import { ZONAS } from "./zonas";

/** Shared by the onboarding form (client) and the server action. */
export const acopioSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "Escribe al menos 2 letras.")
    .max(80, "Máximo 80 caracteres."),
  zona: z.enum(ZONAS, { error: "Elige la alcaldía de tu acopio." }),
});

export type AcopioInput = z.infer<typeof acopioSchema>;
export type AcopioFieldErrors = Partial<Record<keyof AcopioInput, string>>;

/** First message per field, for showing next to each input. */
export function acopioFieldErrors(error: z.ZodError): AcopioFieldErrors {
  const out: AcopioFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if ((key === "nombre" || key === "zona") && !out[key]) out[key] = issue.message;
  }
  return out;
}
