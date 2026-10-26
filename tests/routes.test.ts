import { describe, expect, it } from "vitest";

import { isProtectedPath, safeNext } from "@/lib/routes";

describe("isProtectedPath", () => {
  it("protects /app and everything under it", () => {
    expect(isProtectedPath("/app")).toBe(true);
    expect(isProtectedPath("/app/nueva")).toBe(true);
  });

  it("leaves login, the public boleta and the API prefix alone", () => {
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/b/123")).toBe(false);
    expect(isProtectedPath("/api/vision")).toBe(false);
    expect(isProtectedPath("/application")).toBe(false);
  });
});

describe("safeNext", () => {
  it("accepts same-site paths", () => {
    expect(safeNext("/app/precios")).toBe("/app/precios");
  });

  it("rejects open redirects", () => {
    expect(safeNext("https://evil.example")).toBe("/app");
    expect(safeNext("//evil.example")).toBe("/app");
    expect(safeNext("/\\evil.example")).toBe("/app");
    expect(safeNext(null)).toBe("/app");
  });
});
