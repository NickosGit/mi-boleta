import { redirect } from "next/navigation";

import { SimBadge } from "@/components/SimBadge";
import { VentaForm } from "@/components/VentaForm";
import { getMyAcopio } from "@/lib/acopio";
import { formatKg, formatSemana } from "@/lib/format";
import { MATERIAL_LABEL, type Material } from "@/lib/materiales";
import { getUser } from "@/lib/supabase/server";

export default async function VentasPage() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) redirect("/login");
  const acopio = await getMyAcopio(supabase);
  if (!acopio) redirect("/app");

  const { data } = await supabase
    .from("ventas_salientes")
    .select("id, material, kg, semana, comprador")
    .eq("acopio_id", acopio.id)
    .order("semana", { ascending: false })
    .limit(30);
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

  return (
    <main className="flex flex-col gap-4 pt-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-3xl font-extrabold text-ink">Ventas salientes</h1>
        <SimBadge>Facturas de ejemplo</SimBadge>
      </div>
      <p className="text-base text-muted">Lo que el acopio vende a su comprador. Se compara contra los kilos de las boletas.</p>
      <VentaForm hoy={hoy} />
      <ul className="flex flex-col gap-2">
        {(data ?? []).map((v) => (
          <li key={v.id} className="rounded-xl border border-line bg-card p-3 text-base">
            Semana del {formatSemana(v.semana)} · {MATERIAL_LABEL[v.material as Material]} · {formatKg(v.kg)} · {v.comprador}
          </li>
        ))}
      </ul>
    </main>
  );
}
