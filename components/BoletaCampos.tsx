import type { BoletaPublica, Mediana } from "@/lib/boleta-publica";
import { formatFecha, formatFolio, formatKg, formatMoney } from "@/lib/format";
import { FUENTE_LABEL, MATERIAL_LABEL } from "@/lib/materiales";

/** The 7 fields of Blueprint condition 2, shared by the public view and the print folio. */
export function campos(b: BoletaPublica) {
  return [
    ["Peso", formatKg(b.kg)],
    ["Material", MATERIAL_LABEL[b.material]],
    ["Precio por kilo", `${formatMoney(b.precio_kg)}/kg`],
    ["Total", formatMoney(b.total)],
    ["Fecha", formatFecha(b.fecha)],
    ["Acopio", b.acopio],
    ["Entregó", b.alias],
  ] as const;
}

export function fuenteTexto(b: BoletaPublica) {
  return FUENTE_LABEL[b.fuente];
}

export function medianaTexto(m: Mediana | null, materialLabel: string, zona: string): string {
  if (!m) return "Mediana de la zona no disponible.";
  const excl = `excluye ${m.acopios_excluidos} acopio${m.acopios_excluidos === 1 ? "" : "s"} sin precio o con menos de 5 boletas de ${materialLabel} esta semana`;
  if (m.mediana === null) {
    return `Mediana de ${zona}: no se muestra porque solo ${m.acopios_incluidos} acopio${m.acopios_incluidos === 1 ? "" : "s"} tiene${m.acopios_incluidos === 1 ? "" : "n"} datos suficientes (se necesitan 3); ${excl}.`;
  }
  return `Mediana de ${zona}: ${formatMoney(m.mediana)}/kg (${m.acopios_incluidos} acopios; ${excl}).`;
}

export { formatFolio };
