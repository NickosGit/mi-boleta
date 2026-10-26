const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export function formatMoney(n: number | string): string {
  return money.format(Number(n));
}

export function formatKg(n: number | string): string {
  return `${Number(n).toFixed(2)} kg`;
}

/** Folio 142 → "A-0142". */
export function formatFolio(folio: number): string {
  return `A-${String(folio).padStart(4, "0")}`;
}

export function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatSemana(isoDate: string): string {
  return new Date(isoDate + "T12:00:00Z").toLocaleDateString("es-MX", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
