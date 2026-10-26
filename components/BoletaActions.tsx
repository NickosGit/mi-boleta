"use client";

import { useState, useTransition } from "react";

import { anular, desacuerdoOperador } from "@/app/app/boletas/actions";
import { firstError, motivoSchema, notaSchema } from "@/lib/schemas";

type Open = null | "desacuerdo" | "anular";

export function BoletaActions({ id, estado }: { id: string; estado: string }) {
  const [open, setOpen] = useState<Open>(null);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (estado === "anulada") return null;

  function submit() {
    const schema = open === "anular" ? motivoSchema : notaSchema;
    const parsed = schema.safeParse(text);
    if (!parsed.success) {
      setMsg(firstError(parsed.error));
      return;
    }
    start(async () => {
      const res = open === "anular" ? await anular(id, text) : await desacuerdoOperador(id, text);
      if (res.ok) {
        setOpen(null);
        setText("");
        setMsg(null);
      } else setMsg(res.error ?? "Error");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {estado === "emitida" && (
          <button
            type="button"
            onClick={() => setOpen(open === "desacuerdo" ? null : "desacuerdo")}
            className="min-h-12 flex-1 rounded-xl border border-line px-2 text-base font-semibold"
          >
            Registrar desacuerdo
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen(open === "anular" ? null : "anular")}
          className="min-h-12 flex-1 rounded-xl border border-line px-2 text-base font-semibold"
        >
          Anular
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={open === "anular" ? 140 : 280}
            placeholder={open === "anular" ? "Motivo (obligatorio, se ve en la boleta)" : "Nota (opcional)"}
            aria-label={open === "anular" ? "Motivo de anulación" : "Nota del desacuerdo"}
            className="min-h-12 rounded-xl border border-line px-3 text-base"
          />
          {msg && <p className="text-base text-accent">{msg}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="min-h-12 rounded-xl bg-ink text-base font-bold text-white disabled:opacity-60"
          >
            {open === "anular" ? "Confirmar anulación" : "Guardar desacuerdo"}
          </button>
          {open === "anular" && (
            <p className="text-sm text-muted">La boleta no se borra: queda visible como anulada, con su motivo.</p>
          )}
        </div>
      )}
    </div>
  );
}
