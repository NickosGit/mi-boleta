import { redirect } from "next/navigation";

import { PriceRow } from "@/components/PriceRow";
import { SimBadge } from "@/components/SimBadge";
import { getMyAcopio } from "@/lib/acopio";
import { MATERIALES, type Material } from "@/lib/materiales";
import { getUser } from "@/lib/supabase/server";

export default async function PreciosPage() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) redirect("/login");
  const acopio = await getMyAcopio(supabase);
  if (!acopio) redirect("/app");

  const { data } = await supabase.from("precios").select("material, precio_kg").eq("acopio_id", acopio.id);
  const map = new Map((data ?? []).map((p) => [p.material as Material, Number(p.precio_kg)]));

  return (
    <main className="flex flex-col gap-4 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-ink">Precios por kilo</h1>
        <SimBadge>Precios de ejemplo</SimBadge>
      </div>
      <p className="text-base text-muted">Cada boleta toma el precio vigente al momento de emitirse.</p>
      {MATERIALES.map((m) => (
        <PriceRow key={m} material={m} precio={map.get(m) ?? null} />
      ))}
    </main>
  );
}
