"use client";

import { useEffect } from "react";

import { marcarEntrega } from "@/app/app/nueva/actions";

/** Opens the print dialog once and records entrega = 'impreso' (only for the owning operator). */
export function AutoPrint({ token }: { token: string }) {
  useEffect(() => {
    void marcarEntrega(token, "impreso");
    const t = setTimeout(() => window.print(), 400);
    const again = document.querySelector("[data-print]");
    const onClick = () => window.print();
    again?.addEventListener("click", onClick);
    return () => {
      clearTimeout(t);
      again?.removeEventListener("click", onClick);
    };
  }, [token]);
  return null;
}
