/** Stable = the last 5 readings all within ±0.05 kg of their mean (PACKET §10). */
export const STABLE_WINDOW = 5;
export const STABLE_TOLERANCE_KG = 0.05;
/** Below this the platform is empty, so there is nothing to lock. */
export const MIN_LOAD_KG = 0.1;

export type Reading = { kg: number; created_at: string };

/** Returns the locked weight and the moment it became stable, or null. */
export function detectStable(readings: Reading[]): { kg: number; estableAt: string } | null {
  if (readings.length < STABLE_WINDOW) return null;
  const last = readings.slice(-STABLE_WINDOW);
  const mean = last.reduce((s, r) => s + r.kg, 0) / last.length;
  if (mean < MIN_LOAD_KG) return null;
  if (last.some((r) => Math.abs(r.kg - mean) > STABLE_TOLERANCE_KG)) return null;
  return { kg: Math.round(mean * 100) / 100, estableAt: last[last.length - 1].created_at };
}

/** Box-Muller Gaussian noise for the simulated scale. */
export function gaussian(sigma: number, rand: () => number = Math.random): number {
  const u = 1 - rand();
  const v = rand();
  return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
