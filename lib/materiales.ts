/** Must match the CHECK constraints in supabase/migrations/0002_schema.sql. */
export const MATERIALES = ["PET", "Carton", "Aluminio", "Cobre", "Fierro", "Vidrio"] as const;

export type Material = (typeof MATERIALES)[number];

export const MATERIAL_LABEL: Record<Material, string> = {
  PET: "PET",
  Carton: "Cartón",
  Aluminio: "Aluminio",
  Cobre: "Cobre",
  Fierro: "Fierro",
  Vidrio: "Vidrio",
};

export const FUENTES = ["bascula_simulada", "foto_ia", "manual"] as const;
export type Fuente = (typeof FUENTES)[number];

export const FUENTE_LABEL: Record<Fuente, string> = {
  bascula_simulada: "BÁSCULA SIMULADA",
  foto_ia: "Lectura IA — sugerencia",
  manual: "Peso escrito a mano",
};
