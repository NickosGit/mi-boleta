/** Yellow label for anything simulated, AI-read or invented (PACKET hard rule 8). */
export function SimBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-yellow-300 px-2 py-0.5 text-sm font-bold tracking-wide text-black">
      {children}
    </span>
  );
}
