"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { crearPepenador, emitirBoleta, marcarEntrega, type Emitida } from "@/app/app/nueva/actions";
import { SimBadge } from "@/components/SimBadge";
import { formatFolio, formatKg, formatMoney } from "@/lib/format";
import { MATERIAL_LABEL, MATERIALES, type Fuente, type Material } from "@/lib/materiales";
import { IMAGE_MAX_BYTES, IMAGE_TYPES, kgSchema, pepenadorSchema, firstError } from "@/lib/schemas";
import { detectStable, type Reading } from "@/lib/stability";
import { useScaleFeed } from "@/lib/useScaleFeed";

export type PepOption = { id: string; alias: string; lastMaterial: Material | null };

type Props = {
  acopioId: string;
  acopioNombre: string;
  pepenadores: PepOption[];
  precios: Partial<Record<Material, number>>;
  ultimoMaterial: Material | null;
};

type Locked = { kg: number; estableAt: string; localAt: number };
type Mode = "bascula" | "manual";
const IA_MIN_CONFIANZA = 0.8;
const NEW_LOAD_KG = 0.5;

export function CaptureFlow({ acopioId, acopioNombre, pepenadores: initialPeps, precios, ultimoMaterial }: Props) {
  const [mode, setMode] = useState<Mode>("bascula");
  const [locked, setLocked] = useState<Locked | null>(null);
  const [emitida, setEmitida] = useState<Emitida | null>(null);

  // Lock on stability; a clearly different load unlocks (only before issuing).
  const onReadings = useCallback(
    (rs: Reading[]) => {
      if (mode !== "bascula" || emitida) return;
      const latest = rs[rs.length - 1];
      if (locked) {
        if (latest && Math.abs(latest.kg - locked.kg) > NEW_LOAD_KG) setLocked(null);
        return;
      }
      const s = detectStable(rs);
      if (s) setLocked({ ...s, localAt: Date.now() });
    },
    [mode, emitida, locked],
  );
  const { readings, connected, clear } = useScaleFeed(acopioId, onReadings);
  const [now, setNow] = useState(() => Date.now());

  const [manualKg, setManualKg] = useState("");
  const [manualFuente, setManualFuente] = useState<Fuente>("manual");
  const [iaConfianza, setIaConfianza] = useState<number | undefined>();
  const [fotoPath, setFotoPath] = useState<string | undefined>();
  const [visionMsg, setVisionMsg] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const manualRef = useRef<HTMLInputElement>(null);

  const [peps, setPeps] = useState(initialPeps);
  const [pepId, setPepId] = useState<string | null>(null);
  const firstPriced = MATERIALES.find((m) => precios[m] !== undefined) ?? null;
  const [material, setMaterial] = useState<Material | null>(
    ultimoMaterial && precios[ultimoMaterial] !== undefined ? ultimoMaterial : firstPriced,
  );
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [nuevoAlias, setNuevoAlias] = useState("");
  const [nuevoTel, setNuevoTel] = useState("");
  const [nuevaError, setNuevaError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!locked || emitida) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [locked, emitida]);

  const liveKg = readings.length ? readings[readings.length - 1].kg : null;
  const manualParsed = kgSchema.safeParse(manualKg);
  const kg = mode === "bascula" ? (locked?.kg ?? null) : manualParsed.success ? manualParsed.data : null;
  const precio = material ? precios[material] : undefined;
  const canEmit = kg !== null && pepId !== null && material !== null && precio !== undefined && !pending && !emitida;
  const total = kg !== null && precio !== undefined ? Math.round(kg * precio * 100) / 100 : null;

  const elapsed = useMemo(() => (locked ? Math.max(0, now - locked.localAt) / 1000 : null), [now, locked]);

  function pickPep(p: PepOption) {
    setPepId(p.id);
    if (p.lastMaterial && precios[p.lastMaterial] !== undefined) setMaterial(p.lastMaterial);
  }

  function emitir() {
    if (!canEmit || kg === null || !pepId || !material) return;
    setError(null);
    const fuente: Fuente = mode === "bascula" ? "bascula_simulada" : manualFuente;
    startTransition(async () => {
      const res = await emitirBoleta({
        pepenadorId: pepId,
        material,
        kg,
        fuente,
        estableAt: mode === "bascula" ? locked?.estableAt : undefined,
        iaConfianza: fuente === "foto_ia" ? iaConfianza : undefined,
        fotoPath,
      });
      if (res.ok) setEmitida(res.boleta);
      else setError(res.error);
    });
  }

  function reset() {
    setEmitida(null);
    setLocked(null);
    clear();
    setPepId(null);
    setManualKg("");
    setManualFuente("manual");
    setIaConfianza(undefined);
    setFotoPath(undefined);
    setVisionMsg(null);
    setError(null);
  }

  function goManual(msg: string | null) {
    setMode("manual");
    setVisionMsg(msg);
    setTimeout(() => manualRef.current?.focus(), 0);
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    if (!(IMAGE_TYPES as readonly string[]).includes(file.type) || file.size > IMAGE_MAX_BYTES) {
      goManual("La foto debe ser JPEG o PNG de máximo 5 MB. Escribe el peso.");
      return;
    }
    setReading(true);
    setMode("manual");
    const body = new FormData();
    body.append("foto", file);
    try {
      const res = await fetch("/api/vision", { method: "POST", body });
      const json = (await res.json()) as {
        ok: boolean;
        kg?: number | null;
        display?: string;
        confianza?: number;
        foto_path?: string;
      };
      if (json.foto_path) setFotoPath(json.foto_path);
      if (json.ok && json.display === "digital" && json.kg != null && (json.confianza ?? 0) >= IA_MIN_CONFIANZA) {
        setManualKg(json.kg.toFixed(2));
        setManualFuente("foto_ia");
        setIaConfianza(json.confianza);
        setVisionMsg(`Lectura IA — sugerencia (confianza ${Math.round((json.confianza ?? 0) * 100)}%). Revisa el número.`);
      } else {
        setManualFuente("manual");
        goManual(
          json.display === "analogico"
            ? "Carátula analógica: escribe el peso a mano."
            : "No se pudo leer con seguridad. Escribe el peso.",
        );
      }
    } catch {
      goManual("No se pudo leer la foto. Escribe el peso.");
    } finally {
      setReading(false);
    }
  }

  function guardarNueva() {
    const parsed = pepenadorSchema.safeParse({ alias: nuevoAlias, telefono: nuevoTel });
    if (!parsed.success) {
      setNuevaError(firstError(parsed.error));
      return;
    }
    setNuevaError(null);
    startTransition(async () => {
      const res = await crearPepenador(parsed.data);
      if (!res.ok) {
        setNuevaError(res.error);
        return;
      }
      const p = { ...res.pepenador, lastMaterial: null };
      setPeps((prev) => [p, ...prev]);
      setPepId(p.id);
      setNuevaOpen(false);
      setNuevoAlias("");
      setNuevoTel("");
    });
  }

  if (emitida) {
    const pep = peps.find((p) => p.id === pepId);
    const url = `${window.location.origin}/b/${emitida.token}`;
    const text =
      `Boleta ${formatFolio(emitida.folio)} · ${acopioNombre}\n` +
      `${formatKg(kg ?? 0)} de ${material ? MATERIAL_LABEL[material] : ""} × ${formatMoney(emitida.precio_kg)}/kg = ${formatMoney(emitida.total)}\n` +
      `Tu copia: ${url}`;
    return (
      <section className="flex flex-col gap-4">
        <div className="rounded-2xl border-2 border-ink bg-card p-5">
          <p className="text-base text-muted">Boleta emitida</p>
          <p className="font-mono text-4xl font-bold">{formatFolio(emitida.folio)}</p>
          <p className="mt-2 text-xl">
            {pep?.alias} · {formatKg(kg ?? 0)} {material && MATERIAL_LABEL[material]}
          </p>
          <p className="text-xl">
            {formatMoney(emitida.precio_kg)}/kg · <strong>Total {formatMoney(emitida.total)}</strong>
          </p>
          {emitida.emision_ms !== null && (
            <p className="mt-2 text-base text-muted">
              De ESTABLE a folio: {(emitida.emision_ms / 1000).toFixed(1)} s
            </p>
          )}
        </div>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void marcarEntrega(emitida.token, "whatsapp")}
          className="flex min-h-14 items-center justify-center rounded-2xl bg-green-700 px-5 text-lg font-bold text-white"
        >
          Compartir por WhatsApp
        </a>
        <a
          href={`/b/${emitida.token}/imprimir`}
          target="_blank"
          rel="noopener"
          className="flex min-h-14 items-center justify-center rounded-2xl border-2 border-ink bg-card px-5 text-lg font-bold text-ink"
        >
          Imprimir folio
        </a>
        <Link href={`/b/${emitida.token}`} target="_blank" className="text-center text-base text-ink underline">
          Ver la boleta como la ve ella
        </Link>
        <button
          type="button"
          onClick={reset}
          className="min-h-14 rounded-2xl bg-ink px-5 text-lg font-bold text-white"
        >
          Nueva entrega
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      {/* Weight */}
      <div className="rounded-2xl border border-line bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {mode === "bascula" ? <SimBadge>BÁSCULA SIMULADA</SimBadge> : <span className="text-base font-semibold">Peso a mano</span>}
          {mode === "bascula" &&
            (locked ? (
              <span className="rounded-full bg-green-700 px-3 py-1 text-base font-bold text-white">ESTABLE</span>
            ) : (
              <span className="rounded-full bg-tag-soft px-3 py-1 text-base text-tag">
                {connected ? "Esperando peso estable" : "Conectando…"}
              </span>
            ))}
        </div>

        {mode === "bascula" ? (
          <>
            <p className="mt-2 text-center font-mono text-6xl font-bold tabular-nums">
              {(locked?.kg ?? liveKg)?.toFixed(2) ?? "—"}
              <span className="text-2xl"> kg</span>
            </p>
            {elapsed !== null && (
              <p className="text-center text-lg font-semibold tabular-nums" aria-live="off">
                {elapsed.toFixed(1)} s
              </p>
            )}
            {!connected && readings.length === 0 && (
              <p className="mt-2 text-center text-base text-muted">
                Abre <Link href="/app/bascula" target="_blank" className="underline">la báscula simulada</Link> en otra pestaña.
              </p>
            )}
          </>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            <input
              ref={manualRef}
              inputMode="decimal"
              value={manualKg}
              onChange={(e) => {
                setManualKg(e.target.value);
                if (manualFuente === "foto_ia") setManualFuente("manual"); // edited: no longer the AI's number
              }}
              placeholder="0.00"
              aria-label="Peso en kg"
              aria-invalid={manualKg !== "" && !manualParsed.success}
              className="min-h-16 rounded-xl border border-line px-4 text-center font-mono text-4xl"
            />
            {manualKg !== "" && !manualParsed.success && (
              <p className="text-base text-accent">{firstError(manualParsed.error)}</p>
            )}
            {manualFuente === "foto_ia" && <SimBadge>Lectura IA — sugerencia</SimBadge>}
          </div>
        )}
        {reading && <p className="mt-2 text-base text-muted">Leyendo la foto…</p>}
        {visionMsg && <p className="mt-2 text-base">{visionMsg}</p>}
        {fotoPath && <p className="text-sm text-muted">La foto queda guardada como evidencia en la boleta.</p>}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-xl border border-line px-2 text-center text-base font-semibold">
            Foto del display digital
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => void onPhoto(e.target.files?.[0])}
            />
          </label>
          {mode === "bascula" ? (
            <button
              type="button"
              onClick={() => goManual(null)}
              className="min-h-14 rounded-xl border border-line text-base font-semibold"
            >
              Escribir peso
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode("bascula");
                setVisionMsg(null);
                setFotoPath(undefined);
              }}
              className="min-h-14 rounded-xl border border-line text-base font-semibold"
            >
              Usar báscula
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-muted">Carátula de aguja: escribe el peso a mano.</p>
      </div>

      {/* Who */}
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">¿Quién entrega?</h2>
        <div className="grid grid-cols-3 gap-2">
          {peps.slice(0, 8).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pickPep(p)}
              aria-pressed={pepId === p.id}
              className={`min-h-16 rounded-2xl border-2 px-2 text-lg font-bold ${
                pepId === p.id ? "border-ink bg-ink text-white" : "border-line bg-card"
              }`}
            >
              {p.alias}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setNuevaOpen((v) => !v)}
            className="min-h-16 rounded-2xl border-2 border-dashed border-line bg-card px-2 text-lg font-bold"
          >
            + Nueva
          </button>
        </div>
        {nuevaOpen && (
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-3">
            <input
              value={nuevoAlias}
              onChange={(e) => setNuevoAlias(e.target.value)}
              placeholder="Alias (ej. Lupe)"
              maxLength={40}
              aria-label="Alias"
              className="min-h-14 rounded-xl border border-line px-3 text-lg"
            />
            <input
              value={nuevoTel}
              onChange={(e) => setNuevoTel(e.target.value)}
              placeholder="Teléfono (opcional, 10 dígitos)"
              inputMode="numeric"
              maxLength={10}
              aria-label="Teléfono opcional"
              className="min-h-14 rounded-xl border border-line px-3 text-lg"
            />
            <p className="text-sm text-muted">Solo el alias es obligatorio. El teléfono nunca aparece en la boleta.</p>
            {nuevaError && <p className="text-base text-accent">{nuevaError}</p>}
            <button
              type="button"
              onClick={guardarNueva}
              disabled={pending}
              className="min-h-14 rounded-xl bg-ink text-lg font-bold text-white disabled:opacity-60"
            >
              Guardar alias
            </button>
          </div>
        )}
      </div>

      {/* Material */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Material</h2>
          <SimBadge>Precios de ejemplo</SimBadge>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MATERIALES.map((m) => {
            const p = precios[m];
            return (
              <button
                key={m}
                type="button"
                disabled={p === undefined}
                onClick={() => setMaterial(m)}
                aria-pressed={material === m}
                className={`min-h-14 rounded-xl border-2 px-1 text-base font-semibold disabled:opacity-40 ${
                  material === m ? "border-ink bg-ink text-white" : "border-line bg-card"
                }`}
              >
                {MATERIAL_LABEL[m]}
                <span className="block text-sm font-normal">{p !== undefined ? `${formatMoney(p)}/kg` : "sin precio"}</span>
              </button>
            );
          })}
        </div>
      </div>

      {total !== null && (
        <p className="text-center text-xl">
          Total: <strong>{formatMoney(total)}</strong>
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-accent-soft p-3 text-base">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={emitir}
        disabled={!canEmit}
        className="min-h-20 rounded-2xl bg-ink px-5 text-2xl font-extrabold text-white disabled:opacity-40"
      >
        {pending ? "Emitiendo…" : "Emitir boleta"}
      </button>
    </section>
  );
}
