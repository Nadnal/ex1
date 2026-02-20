import { NextResponse } from "next/server";
import { missingEnvVars } from "@/app/lib/config";
import { createSupabaseServerClient } from "@/app/lib/supabase-server";

export async function GET() {
  const missing = missingEnvVars();
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Missing env vars: ${missing.join(", ")}` },
      { status: 500 },
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("document_summaries")
    .select("id, document_path, summary, model, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, summaries: data ?? [] });
}