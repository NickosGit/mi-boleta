import Link from "next/link";
import { redirect } from "next/navigation";

import { CargarEjemplo } from "@/components/CargarEjemplo";
import { OnboardingForm } from "@/components/OnboardingForm";
import { getMyAcopio } from "@/lib/acopio";
import { getUser } from "@/lib/supabase/server";

const MENU = [
  ["/app/nueva", "Nueva entrega"],
  ["/app/bascula", "Báscula simulada"],
  ["/app/boletas", "Boletas"],
  ["/app/precios", "Precios"],
  ["/app/ventas", "Ventas salientes"],
  ["/app/balance", "Balance semanal"],
  ["/app/metricas", "Métricas"],
] as const;

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

  const { count } = await supabase
    .from("pepenadores")
    .select("id", { count: "exact", head: true })
    .eq("acopio_id", acopio.id);

  return (
    <main className="flex flex-col gap-4 pt-6">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">{acopio.nombre}</h1>
        <p className="text-lg text-muted">Alcaldía {acopio.zona}</p>
      </div>
      <nav className="grid grid-cols-2 gap-3">
        {MENU.map(([href, label], i) => (
          <Link
            key={href}
            href={href}
            className={`flex min-h-16 items-center justify-center rounded-2xl px-3 text-center text-lg font-bold ${
              i === 0 ? "col-span-2 min-h-20 bg-ink text-2xl text-white" : "border border-line bg-card text-ink"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {!count && <CargarEjemplo />}
    </main>
  );
}
