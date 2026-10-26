import type { Metadata } from "next";
import Link from "next/link";

import { campos, fuenteTexto, medianaTexto } from "@/components/BoletaCampos";
import { DisputeButton } from "@/components/DisputeButton";
import { SimBadge } from "@/components/SimBadge";
import { getBoletaPublica, getMediana } from "@/lib/boleta-publica";
import { formatFolio } from "@/lib/format";
import { MATERIAL_LABEL } from "@/lib/materiales";

export const metadata: Metadata = { title: "Boleta · Mi Boleta", robots: { index: false, follow: false } };

export default async function BoletaPublicaPage({ params }: PageProps<"/b/[token]">) {
  const { token } = await params;
  const b = await getBoletaPublica(token);

  if (!b) {
    return (
      <main className="flex flex-col gap-4 pt-12">
        <h1 className="text-3xl font-extrabold text-ink">Boleta no encontrada</h1>
        <p className="text-lg">Revisa que el link esté completo o pide al acopio que te lo mande otra vez.</p>
      </main>
    );
  }

  const mediana = await getMediana(b.zona, b.material);
  const anulada = b.estado === "anulada";

  return (
    <main className="flex flex-col gap-4 pt-6">
      <p className="text-base text-muted">Mi Boleta · tu copia</p>
      <h1 className="font-mono text-4xl font-bold">Boleta {formatFolio(b.folio)}</h1>

      <div className="flex flex-wrap gap-2">
        <SimBadge>{fuenteTexto(b)}</SimBadge>
        <SimBadge>Precios de ejemplo</SimBadge>
        <SimBadge>Datos de ejemplo</SimBadge>
      </div>

      {anulada && (
        <p className="rounded-xl border-2 border-ink p-3 text-lg">
          <strong>Anulada por el acopio.</strong> Motivo: {b.motivo_anulacion}
        </p>
      )}
      {b.en_desacuerdo && (
        <p className="rounded-xl bg-accent-soft p-3 text-lg">
          Hay un desacuerdo registrado. La boleta sigue contando para ti.
        </p>
      )}

      <dl className={`divide-y divide-line rounded-2xl border border-line bg-card ${anulada ? "opacity-70" : ""}`}>
        {campos(b).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 px-4 py-3 text-lg">
            <dt className="text-muted">{k}</dt>
            <dd className={`text-right font-semibold ${k === "Total" ? "text-2xl" : ""}`}>{v}</dd>
          </div>
        ))}
      </dl>

      <p className="text-base text-muted">{medianaTexto(mediana, MATERIAL_LABEL[b.material], b.zona)}</p>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-xl font-bold">¿No estás de acuerdo?</h2>
        <p className="text-lg">Dilo al operador o márcalo aquí. Nadie tiene que aprobarlo y tu boleta no se borra.</p>
        {b.en_desacuerdo ? (
          <p className="text-lg font-semibold">Ya quedó registrado.</p>
        ) : (
          <DisputeButton token={token} />
        )}
      </section>

      <Link href={`/b/${token}/imprimir`} className="text-center text-base text-ink underline">
        Ver folio para imprimir
      </Link>
      <p className="text-sm text-muted">
        Esta página no pide cuenta ni guarda tu ubicación. No muestra teléfono ni nombre real.
      </p>
    </main>
  );
}
