import Link from "next/link";

export function AppHeader({ acopio }: { acopio?: string }) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-line py-4">
      <Link href="/app" className="min-w-0">
        <span className="block text-xl font-extrabold text-ink">Mi Boleta</span>
        {acopio && <span className="block truncate text-base text-muted">{acopio}</span>}
      </Link>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="min-h-12 rounded-xl border border-line bg-card px-4 text-base font-semibold"
        >
          Salir
        </button>
      </form>
    </header>
  );
}
