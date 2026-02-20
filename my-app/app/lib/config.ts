export const APP_CONFIG = {
  bucket: process.env.SUPABASE_BUCKET ?? "documents",
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 5_000_000),
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
};

export function missingEnvVars() {
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  return required.filter((name) => !process.env[name]);
}