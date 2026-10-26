"use client";

import { useState, useTransition } from "react";

import { guardarPrecio } from "@/app/app/precios/actions";
import { MATERIAL_LABEL, type Material } from "@/lib/materiales";
import { firstError, precioSchema } from "@/lib/schemas";

export function PriceRow({ material, precio }: { material: Material; precio: number | null }) {
  const [value, setValue] = useState(precio?.toFixed(2) ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    const parsed = precioSchema.safeParse({ material, precio: value });
    if (!parsed.success) {
      setMsg(firstError(parsed.error));
      return;
    }
    start(async () => {
      const res = await guardarPrecio(parsed.data);
      setMsg(res.ok ? "Guardado" : (res.error ?? "Error"));
    });
  }

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-card p-3">
      <div className="flex items-center gap-3">
        <span className="w-24 text-lg font-semibold">{MATERIAL_LABEL[material]}</span>
        <span className="text-lg">$</span>
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={`Precio por kg de ${MATERIAL_LABEL[material]}`}
          className="min-h-14 w-full min-w-0 rounded-xl border border-line px-3 text-xl"
        />
        <span className="text-base text-muted">/kg</span>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="min-h-14 rounded-xl bg-ink px-4 text-base font-bold text-white disabled:opacity-60"
        >
          Guardar
        </button>
      </div>
      {msg && <p className="text-base text-muted">{msg}</p>}
    </div>
  );
}
