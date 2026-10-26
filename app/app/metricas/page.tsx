import { redirect } from "next/navigation";

import { getMyAcopio } from "@/lib/acopio";
import { FUENTE_LABEL, FUENTES } from "@/lib/materiales";
import { pct, percentile } from "@/lib/stats";
import { getUser } from "@/lib/supabase/server";

export default async function MetricasPage() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) redirect("/login");
  const acopio = await getMyAcopio(supabase);
  if (!acopio) redirect("/app");

  const { data } = await supabase
    .from("boletas")
    .select("fuente, entrega, estado, emision_ms")
    .eq("acopio_id", acopio.id)
    .limit(5000);
  const all = data ?? [];
  const vivas = all.filter((b) => b.estado !== "anulada");
  const ms = vivas.filter((b) => b.fuente === "bascula_simulada" && b.emision_ms !== null).map((b) => b.emision_ms as number);
  const s = (v: number | null) => (v === null ? "—" : `${(v / 1000).toFixed(1)} s`);

  const rows: [string, string][] = [
    ["Mediana ESTABLE → folio", s(percentile(ms, 50))],
    ["p90 ESTABLE → folio", s(percentile(ms, 90))],
    ...FUENTES.map((f): [string, string] => [`Fuente: ${FUENTE_LABEL[f]}`, pct(vivas.filter((b) => b.fuente === f).length, vivas.length)]),
    ["Entregadas impresas", pct(vivas.filter((b) => b.entrega === "impreso").length, vivas.length)],
    ["Entregadas por WhatsApp", pct(vivas.filter((b) => b.entrega === "whatsapp").length, vivas.length)],
    ["Sin entrega registrada", pct(vivas.filter((b) => b.entrega === "ninguna").length, vivas.length)],
    ["En desacuerdo", pct(vivas.filter((b) => b.estado === "en_desacuerdo").length, vivas.length)],
  ];

  return (
    <main className="flex flex-col gap-4 pt-6">
      <h1 className="text-3xl font-extrabold text-ink">Métricas del acopio</h1>
      <p className="text-base text-muted">
        {vivas.length} boletas. Excluye {all.length - vivas.length} anulada(s). Los tiempos solo cuentan boletas de
        báscula ({ms.length}); foto y manual no tienen momento ESTABLE. Meta: mediana ≤ 5 s. Estas métricas son del
        acopio, nunca de una persona.
      </p>
      <dl className="divide-y divide-line rounded-2xl border border-line bg-card">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 px-4 py-3 text-lg">
            <dt>{k}</dt>
            <dd className="font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
