import { NextResponse } from "next/server";
import { APP_CONFIG, missingEnvVars } from "@/app/lib/config";
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
  const { data, error } = await supabase.storage.from(APP_CONFIG.bucket).list("", {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const files = (data ?? []).map((item) => ({
    name: item.name,
    id: item.id,
    updatedAt: item.updated_at,
    createdAt: item.created_at,
    size: item.metadata?.size ?? 0,
  }));

  return NextResponse.json({ ok: true, files });
}

export async function DELETE(request: Request) {
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
  const { error: removeError } = await supabase.storage
    .from(APP_CONFIG.bucket)
    .remove([filePath]);

  if (removeError) {
    return NextResponse.json(
      { ok: false, error: removeError.message },
      { status: 500 },
    );
  }

  await supabase.from("documents").delete().eq("file_path", filePath);

  return NextResponse.json({ ok: true, removed: filePath });
}