"use client";

import { useState, useTransition } from "react";

import { registrarVenta } from "@/app/app/ventas/actions";
import { MATERIAL_LABEL, MATERIALES } from "@/lib/materiales";
import { firstError, ventaSchema } from "@/lib/schemas";

export function VentaForm({ hoy }: { hoy: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const parsed = ventaSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      setMsg(firstError(parsed.error));
      return;
    }
    start(async () => {
      const res = await registrarVenta(parsed.data);
      setMsg(res.ok ? "Venta registrada" : (res.error ?? "Error"));
      if (res.ok) form.reset();
    });
  }

  const cls = "min-h-14 rounded-xl border border-line bg-card px-3 text-lg";
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <select name="material" defaultValue="PET" className={cls} aria-label="Material">
        {MATERIALES.map((m) => (
          <option key={m} value={m}>
            {MATERIAL_LABEL[m]}
          </option>
        ))}
      </select>
      <input name="kg" inputMode="decimal" placeholder="Kilos vendidos" aria-label="Kilos vendidos" className={cls} />
      <label className="flex flex-col gap-1">
        <span className="text-base text-muted">Semana (cualquier día; se guarda el lunes)</span>
        <input name="semana" type="date" defaultValue={hoy} className={cls} />
      </label>
      <input name="comprador" maxLength={80} placeholder="Comprador" aria-label="Comprador" className={cls} />
      {msg && <p className="text-base">{msg}</p>}
      <button type="submit" disabled={pending} className="min-h-14 rounded-2xl bg-ink text-lg font-bold text-white disabled:opacity-60">
        Registrar venta saliente
      </button>
    </form>
  );
}
