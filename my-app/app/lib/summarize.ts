import OpenAI from "openai";
import { APP_CONFIG } from "@/app/lib/config";

function fallbackSummary(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "文档为空，暂无可总结内容。";
  }
  const preview = normalized.slice(0, 360);
  return `自动摘要（回退模式）：${preview}${normalized.length > 360 ? "…" : ""}`;
}

export async function summarizeText(content: string) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      summary: fallbackSummary(content),
      model: "fallback",
    };
  }

  const client = new OpenAI({ apiKey });
  const prompt = `请对以下文档内容生成中文摘要。要求：\n1) 3-5 句\n2) 提炼核心信息\n3) 如果有风险/限制请指出\n\n文档内容：\n${content.slice(0, 15000)}`;

  const response = await client.responses.create({
    model: APP_CONFIG.openAiModel,
    input: prompt,
  });

  const summary = response.output_text?.trim() || fallbackSummary(content);

  return {
    summary,
    model: APP_CONFIG.openAiModel,
  };
}