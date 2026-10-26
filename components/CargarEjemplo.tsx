"use client";

import { useState, useTransition } from "react";

import { cargarEjemplo } from "@/app/app/actions";

export function CargarEjemplo() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setMsg(await cargarEjemplo()))}
        className="min-h-14 rounded-2xl border-2 border-dashed border-ink px-4 text-lg font-bold text-ink disabled:opacity-60"
      >
        {pending ? "Cargando…" : "Cargar datos de ejemplo"}
      </button>
      <p className="text-sm text-muted">
        10 alias, precios y dos semanas de boletas inventadas, marcadas “(ejemplo)”. La semana pasada de PET queda
        inconsistente a propósito.
      </p>
      {msg && <p className="text-base">{msg}</p>}
    </div>
  );
}
