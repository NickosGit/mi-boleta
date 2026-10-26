import { redirect } from "next/navigation";

import { getMyAcopio } from "@/lib/acopio";
import { formatKg, formatSemana } from "@/lib/format";
import { MATERIAL_LABEL, type Material } from "@/lib/materiales";
import { getUser } from "@/lib/supabase/server";

const ESTADO: Record<string, string> = {
  consistente: "consistente",
  inconsistente: "inconsistente",
  sin_salidas: "sin salidas",
};

export default async function BalancePage() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) redirect("/login");
  const acopio = await getMyAcopio(supabase);
  if (!acopio) redirect("/app");

  const { data } = await supabase
    .from("balance_semanal")
    .select("material, semana, kg_entrada, kg_salida, boletas_anuladas, estado")
    .eq("acopio_id", acopio.id)
    .order("semana", { ascending: false })
    .order("material");

  return (
    <main className="flex flex-col gap-4 pt-6">
      <h1 className="text-3xl font-extrabold text-ink">Balance semanal</h1>
      <p className="text-base text-muted">
        Kilos de boletas contra kilos de ventas salientes, por material y semana. Tolerancia ±10%. Incluye boletas en
        desacuerdo; excluye boletas anuladas. La marca es del acopio y la semana, nunca de una boleta ni de una persona.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="py-2 pr-2">Semana</th>
              <th className="py-2 pr-2">Material</th>
              <th className="py-2 pr-2 text-right">Entrada</th>
              <th className="py-2 pr-2 text-right">Salida</th>
              <th className="py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r) => (
              <tr key={`${r.semana}-${r.material}`} className="border-b border-line">
                <td className="py-2 pr-2">{formatSemana(r.semana)}</td>
                <td className="py-2 pr-2">{MATERIAL_LABEL[r.material as Material]}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{formatKg(r.kg_entrada)}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{formatKg(r.kg_salida)}</td>
                <td className={`py-2 ${r.estado === "inconsistente" ? "font-bold" : ""}`}>
                  {ESTADO[r.estado]}
                  {r.boletas_anuladas > 0 && (
                    <span className="block text-sm font-normal text-muted">excluye {r.boletas_anuladas} anulada(s)</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(data ?? []).length === 0 && <p className="text-lg">Aún no hay datos.</p>}
    </main>
  );
}
