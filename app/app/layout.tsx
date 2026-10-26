import { redirect } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { getMyAcopio } from "@/lib/acopio";
import { getUser } from "@/lib/supabase/server";

/** Second barrier after proxy.ts: every /app page needs a validated session. */
export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const { supabase, user } = await getUser();
  if (!supabase || !user) redirect("/login");

  const acopio = await getMyAcopio(supabase);

  return (
    <>
      <AppHeader acopio={acopio?.nombre} />
      {children}
    </>
  );
}
