import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/OnboardingForm";
import { getMyAcopio } from "@/lib/acopio";
import { getUser } from "@/lib/supabase/server";

export default async function AppHome() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) redirect("/login");

  const acopio = await getMyAcopio(supabase);

  if (!acopio) {
    return (
      <main className="flex flex-col gap-6 pt-6">
        <h1 className="text-3xl font-extrabold text-ink">Primero, tu acopio</h1>
        <p className="text-lg">Las boletas salen a nombre de tu acopio. Solo tú ves sus datos.</p>
        <OnboardingForm />
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-4 pt-6">
      <h1 className="text-3xl font-extrabold text-ink">{acopio.nombre}</h1>
      <p className="text-lg text-muted">Alcaldía {acopio.zona}</p>
      <p className="rounded-2xl border border-line bg-card p-4 text-lg">
        Tu acopio está listo. La captura de boletas llega en las siguientes entregas.
      </p>
    </main>
  );
}
