import { redirect } from "next/navigation";

import { ScaleSimulator } from "@/components/ScaleSimulator";
import { getMyAcopio } from "@/lib/acopio";
import { getUser } from "@/lib/supabase/server";

export default async function BasculaPage() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) redirect("/login");
  const acopio = await getMyAcopio(supabase);
  if (!acopio) redirect("/app");

  return (
    <main className="flex flex-col gap-4 pt-6">
      <h1 className="text-3xl font-extrabold text-ink">Báscula simulada</h1>
      <ScaleSimulator acopioId={acopio.id} />
    </main>
  );
}
