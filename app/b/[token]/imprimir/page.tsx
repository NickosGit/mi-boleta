import type { Metadata } from "next";
import { headers } from "next/headers";
import QRCode from "qrcode";

import { campos, fuenteTexto } from "@/components/BoletaCampos";
import { AutoPrint } from "@/components/AutoPrint";
import { getBoletaPublica } from "@/lib/boleta-publica";
import { formatFolio } from "@/lib/format";

import "./print.css";

export const metadata: Metadata = { title: "Folio · Mi Boleta", robots: { index: false, follow: false } };

export default async function ImprimirPage({ params }: PageProps<"/b/[token]/imprimir">) {
  const { token } = await params;
  const b = await getBoletaPublica(token);
  if (!b) {
    return <main className="pt-12 text-2xl font-bold">Boleta no encontrada</main>;
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3900";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/b/${token}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 300, errorCorrectionLevel: "M" });

  return (
    <main className="folio">
      <AutoPrint token={token} />
      <p className="folio-center folio-small">MI BOLETA · COPIA DE QUIEN ENTREGA</p>
      <p className="folio-center folio-big">{formatFolio(b.folio)}</p>
      {b.estado === "anulada" && <p className="folio-center folio-bold">ANULADA: {b.motivo_anulacion}</p>}
      <hr />
      {campos(b).map(([k, v]) => (
        <p key={k} className={k === "Total" ? "folio-row folio-bold" : "folio-row"}>
          <span>{k}</span>
          <span>{v}</span>
        </p>
      ))}
      <hr />
      <p className="folio-small">
        {fuenteTexto(b)} · Precios de ejemplo · Datos de ejemplo
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="Código QR de la boleta" className="folio-qr" />
      <p className="folio-center folio-small">Escanea para ver tu boleta</p>
      <hr />
      <p className="folio-bold">¿No estás de acuerdo? Dilo al operador o manda este folio por WhatsApp.</p>
      <p className="folio-small">Tu boleta no se borra aunque reclames.</p>
      <button type="button" className="folio-noprint" data-print>
        Imprimir otra vez
      </button>
    </main>
  );
}
