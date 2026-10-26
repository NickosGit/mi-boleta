import Link from "next/link";
import { redirect } from "next/navigation";

import { BoletaActions } from "@/components/BoletaActions";
import { getMyAcopio } from "@/lib/acopio";
import { formatFecha, formatFolio, formatKg, formatMoney } from "@/lib/format";
import { FUENTE_LABEL, MATERIAL_LABEL, type Fuente, type Material } from "@/lib/materiales";
import { getUser } from "@/lib/supabase/server";

const ESTADO: Record<string, string> = {
  emitida: "Emitida",
  en_desacuerdo: "En desacuerdo (sigue contando)",
  anulada: "Anulada",
};

export default async function BoletasPage() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) redirect("/login");
  const acopio = await getMyAcopio(supabase);
  if (!acopio) redirect("/app");

  const { data } = await supabase
    .from("boletas")
    .select("id, folio, material, kg, precio_kg, total, fuente, estado, motivo_anulacion, token, created_at, pepenadores(alias)")
    .eq("acopio_id", acopio.id)
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <main className="flex flex-col gap-3 pt-6">
      <h1 className="text-3xl font-extrabold text-ink">Boletas</h1>
      <p className="text-base text-muted">Las boletas no se borran. Solo se anulan con motivo visible.</p>
      {(data ?? []).map((b) => {
        const pep = b.pepenadores as unknown as { alias: string } | null;
        return (
          <article key={b.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-4">
            <div className="flex items-baseline justify-between gap-2">
              <Link href={`/b/${b.token}`} className="font-mono text-xl font-bold underline">
                {formatFolio(b.folio)}
              </Link>
              <span className="text-sm text-muted">{formatFecha(b.created_at)}</span>
            </div>
            <p className={`text-lg ${b.estado === "anulada" ? "line-through opacity-60" : ""}`}>
              {pep?.alias} · {formatKg(b.kg)} {MATERIAL_LABEL[b.material as Material]} × {formatMoney(b.precio_kg)} ={" "}
              <strong>{formatMoney(b.total)}</strong>
            </p>
            <p className="text-sm text-muted">
              {ESTADO[b.estado]} · {FUENTE_LABEL[b.fuente as Fuente]}
            </p>
            {b.estado === "anulada" && <p className="text-base">Motivo: {b.motivo_anulacion}</p>}
            <BoletaActions id={b.id} estado={b.estado} />
          </article>
        );
      })}
      {(data ?? []).length === 0 && <p className="text-lg">Aún no hay boletas.</p>}
    </main>
  );
}
