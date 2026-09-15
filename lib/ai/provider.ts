import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { describeLens, visualGuidance } from "./prompt-guidance";

export type ImageRequest = {
  prompt: string;
  sourceImage?: string;
  sourceImageId?: string;
  lens?: string;
  premium?: boolean;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatMode = "coach" | "prompt";

const OPENROUTER_URL = "https://openrouter.ai/api/v1";
const IMAGE_REQUEST_TIMEOUT_MS = 120_000;

let runtimeOpenRouterKey = "";

export function getOpenRouterApiKey() {
  return runtimeOpenRouterKey || process.env.OPENROUTER_API_KEY || "";
}

export function configureOpenRouterKey(key: string) {
  runtimeOpenRouterKey = key;
  process.env.OPENROUTER_API_KEY = key;
}

export function isOpenRouterConfigured() {
  return Boolean(getOpenRouterApiKey());
}

function isConfigured() {
  return Boolean(getOpenRouterApiKey() && (process.env.IMAGE_MODEL_DEFAULT || process.env.IMAGE_MODEL_PREMIUM));
}

async function imageToDataUrl(sourceImage: string) {
  if (sourceImage.startsWith("http://") || sourceImage.startsWith("https://") || sourceImage.startsWith("data:")) return sourceImage;
  const safePath = sourceImage.replace(/^\/+/, "");
  if (safePath.includes("..")) throw new Error("invalid source image path");
  const filePath = path.join(process.cwd(), "public", safePath);
  const bytes = await readFile(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const mediaType = extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/png";
  return `data:${mediaType};base64,${bytes.toString("base64")}`;
}

/**
 * Provider boundary for the camp app. The UI only talks to our API routes.
 * Without server credentials the pilot returns a safe local preview, so the
 * learning flow can be tested without spending credits.
 */
export async function generateImage(request: ImageRequest) {
  if (!isConfigured()) {
    return {
      imageUrl: request.sourceImage || "/content/fair/fair-07.png",
      mock: true,
      message: "โหมดทดลอง: ตั้งค่า OpenRouter เพื่อสร้างภาพใหม่จริงได้ภายหลัง",
      model: "mock-preview",
    };
  }

  const model = request.premium ? process.env.IMAGE_MODEL_PREMIUM || process.env.IMAGE_MODEL_DEFAULT : process.env.IMAGE_MODEL_DEFAULT || process.env.IMAGE_MODEL_PREMIUM;
  const apiKey = getOpenRouterApiKey();
  if (!model || !apiKey) throw new Error("OpenRouter image configuration is incomplete");

  const inputReferences = request.sourceImage ? [{ type: "image_url", image_url: { url: await imageToDataUrl(request.sourceImage) } }] : undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${OPENROUTER_URL}/images`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Save Our Planet Camp - Environmental Exhibition",
      },
      body: JSON.stringify({
        model,
        prompt: request.prompt,
        n: 1,
        aspect_ratio: "16:9",
        output_format: "png",
        quality: "auto",
        input_references: inputReferences,
        provider: { allow_fallbacks: false },
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("IMAGE_PROVIDER_TIMEOUT");
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("openrouter_image_error", { status: response.status, body: errorText.slice(0, 1000) });
    throw new Error(`image provider request failed: ${response.status}`);
  }
  const data = await response.json();
  const encoded = data.data?.[0]?.b64_json;
  if (typeof encoded !== "string") throw new Error("image provider returned no image");

  const filename = `${randomUUID()}.png`;
  const dataRoot = process.env.GENERATED_DATA_DIR || (process.env.NODE_ENV === "production" ? "/data/generated" : path.join(process.cwd(), "data", "generated"));
  await mkdir(dataRoot, { recursive: true });
  await writeFile(path.join(dataRoot, filename), Buffer.from(encoded, "base64"));
  console.info("image_generation", { provider: "openrouter", model, sourceImageId: request.sourceImageId, usage: data.usage || null });
  return {
    imageUrl: `/api/generated/${filename}`,
    mock: false,
    message: "สร้างภาพใหม่จาก OpenRouter สำเร็จ",
    model,
  };
}

export async function chatIdea(idea: string, lens: string, history: ChatMessage[] = [], mode: ChatMode = "prompt") {
  const safeHistory = history
    .filter((message) => (message.role === "user" || message.role === "assistant") && typeof message.content === "string")
    .map((message) => ({ role: message.role, content: message.content.trim().slice(0, 600) }))
    .filter((message) => message.content)
    .slice(-6);
  const latestIdea = idea.trim() || [...safeHistory].reverse().find((message) => message.role === "user")?.content || "";
  const fallback = mode === "coach"
    ? "ไอเดียนี้เริ่มชัดขึ้นแล้ว ลองระบุสถานที่จริง วัตถุหลัก หรือสิ่งที่อยากเปลี่ยนเพียงหนึ่งอย่างดูนะ"
    : `ภาพเล่าเรื่องจากไอเดีย: ${latestIdea}\nใช้ Creative Lens: ${describeLens(lens)}\n${visualGuidance}`;
  const apiKey = getOpenRouterApiKey();
  if (!apiKey || !process.env.TEXT_MODEL) {
    return { prompt: fallback, mock: true };
  }

  const systemPrompt = mode === "coach"
    ? "ตอบภาษาไทยสั้น ๆ 1–2 ประโยค สะท้อนสิ่งที่นักเรียนต้องการสื่อ แล้วถามต่อเพียง 1 คำถามที่ช่วยระบุสถานที่ วัตถุ หรือการเปลี่ยนแปลงหนึ่งอย่าง ห้ามสรุปเป็น Visual Prompt และห้ามถามหลายข้อ"
    : `Write only one short Thai image prompt (2–3 sentences) for a student's environmental idea. Preserve their chosen subject, place and intent. Turn abstract concerns into visible objects, actions and one focal point using the supplied lens. If details are missing, add only the minimum coherent scene details; never invent statistics. Use age-appropriate imagery. No explanations, questions or alternative prompts. ${visualGuidance}`;

  const response = await fetch(`${OPENROUTER_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Save Our Planet Camp - Environmental Exhibition",
    },
    body: JSON.stringify({
      model: process.env.TEXT_MODEL,
      temperature: 0.6,
      max_tokens: mode === "coach" ? 140 : 220,
      reasoning: process.env.TEXT_REASONING_EFFORT ? {
        effort: process.env.TEXT_REASONING_EFFORT,
        exclude: true,
      } : undefined,
      messages: [
        { role: "system", content: systemPrompt },
        ...safeHistory,
        { role: "user", content: `Creative Lens: ${describeLens(lens)}\nStudent idea: ${idea}` },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("openrouter_text_error", { status: response.status, body: errorText.slice(0, 1000) });
    throw new Error(`text provider request failed: ${response.status}`);
  }
  const data = await response.json();
  return { prompt: data.choices?.[0]?.message?.content?.trim() || fallback, mock: false };
}
