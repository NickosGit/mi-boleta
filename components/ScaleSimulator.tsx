"use client";

import { useEffect, useRef, useState } from "react";

import { SimBadge } from "@/components/SimBadge";
import { gaussian } from "@/lib/stability";
import { createClient } from "@/lib/supabase/client";

const INTERVAL_MS = 500;
const SIGMA_ESTABLE = 0.02;
const SIGMA_INESTABLE = 0.3;

/** Simulated platform scale: target weight + Gaussian noise, one reading every 500 ms. */
export function ScaleSimulator({ acopioId }: { acopioId: string }) {
  const [target, setTarget] = useState(23.4);
  const [inestable, setInestable] = useState(false);
  const [on, setOn] = useState(true);
  const [lastKg, setLastKg] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const params = useRef({ target, inestable });
  useEffect(() => {
    params.current = { target, inestable };
  }, [target, inestable]);

  useEffect(() => {
    if (!on) return;
    const supabase = createClient();
    const id = setInterval(async () => {
      const { target: t, inestable: u } = params.current;
      const kg = t <= 0 ? 0 : Math.max(0, Math.round((t + gaussian(u ? SIGMA_INESTABLE : SIGMA_ESTABLE)) * 100) / 100);
      setLastKg(kg);
      const { error: err } = await supabase.from("scale_readings").insert({ acopio_id: acopioId, kg });
      setError(err ? "No se pudo enviar la lectura." : null);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [on, acopioId]);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-line bg-card p-5 text-center">
        <SimBadge>BÁSCULA SIMULADA</SimBadge>
        <p className="mt-3 font-mono text-6xl font-bold tabular-nums">
          {lastKg === null ? "—" : lastKg.toFixed(2)}
          <span className="text-2xl"> kg</span>
        </p>
        <p className="mt-2 text-base text-muted">
          {on ? `Enviando una lectura cada ${INTERVAL_MS} ms` : "Apagada"}
        </p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-lg font-semibold">Peso sobre la plataforma: {target.toFixed(1)} kg</span>
        <input
          type="range"
          min={0}
          max={150}
          step={0.1}
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          className="h-14 w-full accent-ink"
        />
      </label>

      <div className="grid grid-cols-3 gap-3">
        {[0, 23.4, 41.8].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setTarget(v)}
            className="min-h-14 rounded-xl border border-line bg-card text-lg font-semibold"
          >
            {v === 0 ? "Vacía" : `${v} kg`}
          </button>
        ))}
      </div>

      <label className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-card px-4 text-lg">
        <input
          type="checkbox"
          checked={inestable}
          onChange={(e) => setInestable(e.target.checked)}
          className="size-6"
        />
        Inestable (ruido ±0.3 kg)
      </label>

      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        className="min-h-14 rounded-2xl bg-ink px-5 text-lg font-bold text-white"
      >
        {on ? "Apagar báscula" : "Encender báscula"}
      </button>

      {error && (
        <p role="alert" className="rounded-xl bg-accent-soft p-3 text-base">
          {error}
        </p>
      )}
      <p className="text-base text-muted">
        Deja esta pantalla abierta (otra pestaña u otro celular) y abre “Nueva entrega”.
      </p>
    </div>
  );
}
