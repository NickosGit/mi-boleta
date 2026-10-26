import { z } from "zod";

import { FUENTES, MATERIALES } from "./materiales";
import { ZONAS } from "./zonas";

// Limits from PACKET §12. Every schema runs on the client and again on the server.

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

export const kgSchema = z.coerce
  .number({ error: "Escribe el peso en números." })
  .refine(Number.isFinite, "Escribe el peso en números.")
  .min(0.01, "El peso debe ser de al menos 0.01 kg.")
  .max(2000, "El peso máximo es 2000 kg.")
  .transform((n) => Math.round(n * 100) / 100);

export const aliasSchema = z
  .string()
  .trim()
  .min(2, "El alias lleva de 2 a 40 letras.")
  .max(40, "El alias lleva de 2 a 40 letras.")
  .regex(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ -]+$/, "Solo letras, espacios y guion.");

export const pepenadorSchema = z.object({
  alias: aliasSchema,
  telefono: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "El teléfono lleva 10 dígitos.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const materialSchema = z.enum(MATERIALES, { error: "Elige un material." });

export const emitirSchema = z.object({
  pepenadorId: z.uuid({ error: "Elige a quién se le emite." }),
  material: materialSchema,
  kg: kgSchema,
  fuente: z.enum(FUENTES),
  estableAt: z.iso.datetime({ offset: true }).optional(),
  iaConfianza: z.number().min(0).max(1).optional(),
  fotoPath: z
    .string()
    .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png)$/)
    .optional(),
});

export const precioSchema = z.object({
  material: materialSchema,
  precio: z.coerce
    .number({ error: "Escribe el precio en números." })
    .min(0.01, "El precio debe ser mayor a 0.")
    .max(9999.99, "Precio demasiado alto.")
    .transform((n) => Math.round(n * 100) / 100),
});

export const notaSchema = z
  .string()
  .trim()
  .max(280, "La nota lleva máximo 280 caracteres.")
  .optional()
  .transform((s) => (s ? s : undefined));

export const motivoSchema = z
  .string()
  .trim()
  .min(3, "Escribe el motivo (3 a 140 caracteres).")
  .max(140, "El motivo lleva máximo 140 caracteres.");

/** Public tokens are UUID v4. Anything else is "not found" without touching the DB. */
export const tokenSchema = z.uuidv4();

export const ventaSchema = z.object({
  material: materialSchema,
  kg: z.coerce
    .number({ error: "Escribe los kilos en números." })
    .min(0.01, "Los kilos deben ser mayores a 0.")
    .max(100000, "Máximo 100,000 kg.")
    .transform((n) => Math.round(n * 100) / 100),
  semana: z.iso.date({ error: "Elige la fecha." }),
  comprador: z.string().trim().min(2, "Escribe el comprador (2 a 80).").max(80, "Máximo 80 caracteres."),
});

/** What the vision model must return. Anything else → manual entry. */
export const visionSchema = z.object({
  kg: z.number().min(0).max(2000).nullable(),
  display: z.enum(["digital", "analogico", "ilegible"]),
  confianza: z.number().min(0).max(1),
});

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png"] as const;

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dato inválido.";
}
