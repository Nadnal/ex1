import { NextResponse } from "next/server";
import { APP_CONFIG, missingEnvVars } from "@/app/lib/config";
import { summarizeText } from "@/app/lib/summarize";
import { createSupabaseServerClient } from "@/app/lib/supabase-server";

export async function POST(request: Request) {
  const missing = missingEnvVars();
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Missing env vars: ${missing.join(", ")}` },
      { status: 500 },
    );
  }

  const { filePath } = (await request.json()) as { filePath?: string };

  if (!filePath) {
    return NextResponse.json(
      { ok: false, error: "filePath is required" },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(APP_CONFIG.bucket)
    .download(filePath);

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to download file" },
      { status: 500 },
    );
  }

  const content = await data.text();
  const { summary, model } = await summarizeText(content);

  const payload = {
    document_path: filePath,
    summary,
    model,
  };

  const { error: dbError } = await supabase.from("document_summaries").insert(payload);

  return NextResponse.json({
    ok: true,
    data: payload,
    dbSynced: !dbError,
    dbMessage: dbError?.message,
  });
}