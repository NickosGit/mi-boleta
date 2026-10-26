"use client";

import { useEffect, useRef, useState } from "react";

import { STABLE_WINDOW, type Reading } from "@/lib/stability";
import { createClient } from "@/lib/supabase/client";

/**
 * Live readings for one acopio over Supabase Realtime (RLS applies). Keeps the last
 * few and calls `onReadings` with the new window on every insert.
 */
export function useScaleFeed(acopioId: string, onReadings: (readings: Reading[]) => void) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [connected, setConnected] = useState(false);
  const buffer = useRef<Reading[]>([]);
  const callback = useRef(onReadings);
  useEffect(() => {
    callback.current = onReadings;
  }, [onReadings]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel = supabase
        .channel(`scale-${acopioId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "scale_readings", filter: `acopio_id=eq.${acopioId}` },
          (payload) => {
            const row = payload.new as { kg: number | string; created_at: string };
            const next = [...buffer.current, { kg: Number(row.kg), created_at: row.created_at }].slice(-STABLE_WINDOW * 2);
            buffer.current = next;
            setReadings(next);
            callback.current(next);
          },
        )
        .subscribe((status) => setConnected(status === "SUBSCRIBED"));
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [acopioId]);

  function clear() {
    buffer.current = [];
    setReadings([]);
  }

  return { readings, connected, clear };
}
