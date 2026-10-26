import { redirect } from "next/navigation";

import { GoogleButton } from "@/components/GoogleButton";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getUser } from "@/lib/supabase/server";

const ERRORS: Record<string, string> = {
  enlace: "No se pudo terminar de entrar. Intenta otra vez.",
  sin_codigo: "Google no regresó la información completa. Intenta otra vez.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { user } = await getUser();
  if (user) redirect("/app");

  const params = await searchParams;
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;

  return (
    <main className="flex flex-1 flex-col gap-6 pt-12">
      <h1 className="text-4xl font-extrabold text-ink">Mi Boleta</h1>
      <p className="text-xl">
        La boleta de peso y precio para tu centro de acopio, en segundos. Quien entrega material recibe
        su copia por WhatsApp o en papel, sin cuenta y sin descargar nada.
      </p>

      {error && (
        <p role="alert" className="rounded-xl bg-accent-soft p-3 text-base text-ink">
          {error}
        </p>
      )}

      {hasSupabaseEnv ? (
        <GoogleButton />
      ) : (
        <p role="alert" className="rounded-xl bg-accent-soft p-3 text-base text-ink">
          Falta configurar Supabase en este despliegue.
        </p>
      )}

      <p className="text-base text-muted">
        Solo el operador del acopio entra con Google. Mi Boleta no califica ni ubica a nadie.
      </p>
    </main>
  );
}
