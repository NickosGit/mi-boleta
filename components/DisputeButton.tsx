"use client";

import { useState, useTransition } from "react";

import { noEstoyDeAcuerdo } from "@/app/b/[token]/actions";
import { firstError, notaSchema } from "@/lib/schemas";

export function DisputeButton({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [nota, setNota] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function enviar() {
    const n = notaSchema.safeParse(nota);
    if (!n.success) {
      setMsg(firstError(n.error));
      return;
    }
    start(async () => {
      const res = await noEstoyDeAcuerdo(token, nota);
      setMsg(res.ok ? null : (res.error ?? "Error"));
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-14 rounded-2xl border-2 border-ink bg-card px-5 text-lg font-bold text-ink"
      >
        No estoy de acuerdo
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-4">
      <label className="flex flex-col gap-2">
        <span className="text-lg">¿Qué no está bien? (opcional)</span>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          maxLength={280}
          rows={3}
          className="rounded-xl border border-line p-3 text-lg"
        />
      </label>
      {msg && <p className="text-base text-accent">{msg}</p>}
      <button
        type="button"
        onClick={enviar}
        disabled={pending}
        className="min-h-14 rounded-2xl bg-ink px-5 text-lg font-bold text-white disabled:opacity-60"
      >
        Enviar desacuerdo
      </button>
      <p className="text-base text-muted">Tu boleta no se borra. Sigue contando para ti.</p>
    </div>
  );
}
