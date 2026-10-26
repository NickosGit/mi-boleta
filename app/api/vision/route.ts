import { NextResponse } from "next/server";

import { getMyAcopio } from "@/lib/acopio";
import { readDisplay } from "@/lib/gemini";
import { IMAGE_MAX_BYTES, IMAGE_TYPES, visionSchema } from "@/lib/schemas";
import { getUser } from "@/lib/supabase/server";

const LIMIT_PER_HOUR = 20;

/**
 * Authenticated display reading. Stores the photo in the private `displays` bucket
 * (evidence, not proof), sends only the image to the model, validates the JSON with
 * zod. Any failure → { ok: false } and the client falls back to manual entry.
 */
export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return NextResponse.json({ ok: false }, { status: 401 });
  const acopio = await getMyAcopio(supabase);
  if (!acopio) return NextResponse.json({ ok: false }, { status: 403 });

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase
    .from("vision_llamadas")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= LIMIT_PER_HOUR) return NextResponse.json({ ok: false, limite: true }, { status: 429 });

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("foto");
    file = f instanceof File ? f : null;
  } catch {
    file = null;
  }
  if (!file || !(IMAGE_TYPES as readonly string[]).includes(file.type) || file.size > IMAGE_MAX_BYTES) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await supabase.from("vision_llamadas").insert({ user_id: user.id });

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "image/png" ? "png" : "jpg";
  const path = `${acopio.id}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("displays")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  const foto_path = upErr ? undefined : path;

  try {
    const raw = await readDisplay(bytes.toString("base64"), file.type);
    const parsed = visionSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ ok: false, foto_path });
    const v = parsed.data;
    // Analog dials always go to manual entry, whatever the model says.
    if (v.display !== "digital") return NextResponse.json({ ok: false, display: v.display, foto_path });
    return NextResponse.json({ ok: true, kg: v.kg, display: v.display, confianza: v.confianza, foto_path });
  } catch {
    return NextResponse.json({ ok: false, foto_path });
  }
}
