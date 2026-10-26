import Link from "next/link";
import { redirect } from "next/navigation";

import { CaptureFlow, type PepOption } from "@/components/CaptureFlow";
import { getMyAcopio } from "@/lib/acopio";
import type { Material } from "@/lib/materiales";
import { getUser } from "@/lib/supabase/server";

export default async function NuevaPage() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) redirect("/login");
  const acopio = await getMyAcopio(supabase);
  if (!acopio) redirect("/app");

  const [{ data: peps }, { data: recientes }, { data: precios }] = await Promise.all([
    supabase.from("pepenadores").select("id, alias").eq("acopio_id", acopio.id).order("created_at", { ascending: false }),
    supabase
      .from("boletas")
      .select("pepenador_id, material")
      .eq("acopio_id", acopio.id)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("precios").select("material, precio_kg").eq("acopio_id", acopio.id),
  ]);

  // Last 8 used first (with each one's last material), then the newest others.
  const lastMat = new Map<string, Material>();
  for (const b of recientes ?? []) if (!lastMat.has(b.pepenador_id)) lastMat.set(b.pepenador_id, b.material as Material);
  const usados = [...lastMat.keys()];
  const all = peps ?? [];
  const ordered: PepOption[] = [
    ...usados.map((id) => all.find((p) => p.id === id)).filter((p): p is { id: string; alias: string } => Boolean(p)),
    ...all.filter((p) => !lastMat.has(p.id)),
  ].map((p) => ({ id: p.id, alias: p.alias, lastMaterial: lastMat.get(p.id) ?? null }));

  const preciosMap: Partial<Record<Material, number>> = {};
  for (const p of precios ?? []) preciosMap[p.material as Material] = Number(p.precio_kg);

  return (
    <main className="flex flex-col gap-4 pt-4">
      <h1 className="text-2xl font-extrabold text-ink">Nueva entrega</h1>
      {Object.keys(preciosMap).length === 0 && (
        <p className="rounded-xl bg-accent-soft p-3 text-base">
          Aún no tienes precios. <Link href="/app/precios" className="font-bold underline">Ponlos aquí</Link>.
        </p>
      )}
      <CaptureFlow
        acopioId={acopio.id}
        acopioNombre={acopio.nombre}
        pepenadores={ordered}
        precios={preciosMap}
        ultimoMaterial={(recientes?.[0]?.material as Material | undefined) ?? null}
      />
    </main>
  );
}
