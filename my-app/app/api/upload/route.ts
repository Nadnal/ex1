import { NextResponse } from "next/server";
import { APP_CONFIG, missingEnvVars } from "@/app/lib/config";
import { createSupabaseServerClient } from "@/app/lib/supabase-server";

export async function POST(request: Request) {
  const missing = missingEnvVars();
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: `Missing env vars: ${missing.join(", ")}` },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "file is required" },
      { status: 400 },
    );
  }

  if (file.size > APP_CONFIG.maxUploadBytes) {
    return NextResponse.json(
      {
        ok: false,
        error: `File is too large. Limit is ${APP_CONFIG.maxUploadBytes} bytes`,
      },
      { status: 400 },
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${Date.now()}-${safeName}`;

  const supabase = createSupabaseServerClient();
  const { error: uploadError } = await supabase.storage
    .from(APP_CONFIG.bucket)
    .upload(filePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { ok: false, error: uploadError.message },
      { status: 500 },
    );
  }

  const metadata = {
    filename: file.name,
    file_path: filePath,
    size: file.size,
    mime_type: file.type || "application/octet-stream",
  };

  const { error: dbError } = await supabase.from("documents").insert(metadata);

  return NextResponse.json({
    ok: true,
    data: metadata,
    dbSynced: !dbError,
    dbMessage: dbError?.message,
  });
}