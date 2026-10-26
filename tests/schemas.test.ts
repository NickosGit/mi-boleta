import { describe, expect, it } from "vitest";

import { acopioSchema } from "@/lib/schemas";

describe("acopioSchema", () => {
  it("accepts a trimmed name and a known alcaldía", () => {
    const r = acopioSchema.safeParse({ nombre: "  Recicladora Don Beto ", zona: "Iztapalapa" });
    expect(r.success && r.data.nombre).toBe("Recicladora Don Beto");
  });

  it("rejects short or long names and unknown zones", () => {
    expect(acopioSchema.safeParse({ nombre: "a", zona: "Iztapalapa" }).success).toBe(false);
    expect(acopioSchema.safeParse({ nombre: "x".repeat(81), zona: "Iztapalapa" }).success).toBe(false);
    expect(acopioSchema.safeParse({ nombre: "Acopio", zona: "Ecatepec" }).success).toBe(false);
  });
});
