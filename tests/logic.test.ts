import { describe, expect, it } from "vitest";

import { formatFolio } from "@/lib/format";
import { aliasSchema, emitirSchema, kgSchema, tokenSchema, visionSchema } from "@/lib/schemas";
import { detectStable, gaussian } from "@/lib/stability";
import { percentile } from "@/lib/stats";

const at = (i: number) => new Date(Date.UTC(2026, 9, 25, 12, 0, 0, i * 500)).toISOString();
const feed = (target: number, sigma: number, n: number) =>
  Array.from({ length: n }, (_, i) => ({ kg: Math.max(0, target + gaussian(sigma)), created_at: at(i) }));

describe("detectStable", () => {
  it("locks a steady 23.4 kg within 5 readings (2.5 s)", () => {
    let hits = 0;
    for (let t = 0; t < 200; t++) if (detectStable(feed(23.4, 0.02, 5))) hits++;
    expect(hits).toBeGreaterThan(190);
    const r = detectStable([23.41, 23.39, 23.4, 23.42, 23.38].map((kg, i) => ({ kg, created_at: at(i) })));
    expect(r).toEqual({ kg: 23.4, estableAt: at(4) });
  });

  it("never locks in 'inestable' mode (σ 0.3 kg)", () => {
    for (let t = 0; t < 500; t++) expect(detectStable(feed(23.4, 0.3, 5))).toBeNull();
  });

  it("ignores an empty platform and short feeds", () => {
    expect(detectStable(feed(0, 0, 5))).toBeNull();
    expect(detectStable(feed(23.4, 0, 4))).toBeNull();
  });
});

describe("zod limits (PACKET §12, test 7)", () => {
  it("rejects bad weights", () => {
    for (const v of [-1, 0, 2001, "abc", ""]) expect(kgSchema.safeParse(v).success).toBe(false);
    expect(kgSchema.parse("23.456")).toBe(23.46);
  });

  it("rejects script tags and digits in an alias", () => {
    expect(aliasSchema.safeParse("<script>").success).toBe(false);
    expect(aliasSchema.safeParse("Lupe2").success).toBe(false);
    expect(aliasSchema.safeParse("María-José").success).toBe(true);
  });

  it("only accepts v4 tokens", () => {
    expect(tokenSchema.safeParse("123").success).toBe(false);
    expect(tokenSchema.safeParse("6f1c2a5e-3b7d-4c8e-9f10-2a3b4c5d6e7f").success).toBe(true);
  });

  it("validates a boleta request", () => {
    const ok = emitirSchema.safeParse({
      pepenadorId: "6f1c2a5e-3b7d-4c8e-9f10-2a3b4c5d6e7f",
      material: "PET",
      kg: 23.4,
      fuente: "bascula_simulada",
      estableAt: "2026-10-25T18:00:00.000Z",
    });
    expect(ok.success).toBe(true);
    expect(emitirSchema.safeParse({ pepenadorId: "x", material: "Oro", kg: 1, fuente: "manual" }).success).toBe(false);
  });

  it("validates the vision JSON strictly", () => {
    expect(visionSchema.safeParse({ kg: 23.4, display: "digital", confianza: 0.93 }).success).toBe(true);
    expect(visionSchema.safeParse({ kg: "23.4", display: "digital", confianza: 0.93 }).success).toBe(false);
    expect(visionSchema.safeParse({ kg: null, display: "dial", confianza: 1 }).success).toBe(false);
  });
});

describe("helpers", () => {
  it("formats folios and percentiles", () => {
    expect(formatFolio(142)).toBe("A-0142");
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 50)).toBe(5);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBe(9);
    expect(percentile([], 50)).toBeNull();
  });
});
