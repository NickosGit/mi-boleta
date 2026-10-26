"use client";

import { useActionState, useState } from "react";

import { createAcopio, type OnboardingState } from "@/app/app/actions";
import { acopioFieldErrors, acopioSchema, type AcopioFieldErrors } from "@/lib/schemas";
import { ZONAS } from "@/lib/zonas";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(createAcopio, {});
  const [clientErrors, setClientErrors] = useState<AcopioFieldErrors>({});

  // Same zod schema as the server: bad input never leaves the phone.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(e.currentTarget);
    const parsed = acopioSchema.safeParse({ nombre: data.get("nombre"), zona: data.get("zona") });
    if (parsed.success) {
      setClientErrors({});
      return;
    }
    e.preventDefault();
    setClientErrors(acopioFieldErrors(parsed.error));
  }

  const errors = { ...state.fieldErrors, ...clientErrors };

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-lg font-semibold">Nombre del acopio</span>
        <input
          name="nombre"
          type="text"
          maxLength={80}
          autoComplete="organization"
          placeholder="Ej. Recicladora San Miguel"
          aria-invalid={Boolean(errors.nombre)}
          aria-describedby={errors.nombre ? "nombre-error" : undefined}
          className="min-h-14 rounded-xl border border-line bg-card px-4 text-lg"
        />
        {errors.nombre && (
          <span id="nombre-error" className="text-base text-accent">
            {errors.nombre}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-lg font-semibold">Alcaldía</span>
        <select
          name="zona"
          defaultValue=""
          aria-invalid={Boolean(errors.zona)}
          aria-describedby={errors.zona ? "zona-error" : "zona-help"}
          className="min-h-14 rounded-xl border border-line bg-card px-4 text-lg"
        >
          <option value="" disabled>
            Elige una
          </option>
          {ZONAS.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
        <span id="zona-help" className="text-base text-muted">
          Solo sirve para comparar tu precio con la mediana de tu alcaldía. No usamos tu ubicación.
        </span>
        {errors.zona && (
          <span id="zona-error" className="text-base text-accent">
            {errors.zona}
          </span>
        )}
      </label>

      {state.error && (
        <p role="alert" className="rounded-xl bg-accent-soft p-3 text-base text-ink">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-14 rounded-2xl bg-ink px-5 text-lg font-bold text-white disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Crear mi acopio"}
      </button>
    </form>
  );
}
