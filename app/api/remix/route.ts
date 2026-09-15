import { generateImage } from "../../../lib/ai/provider";
import { acquireGenerationSlot, getGenerationLimit } from "../../../lib/ai/limits";

const recentRequests = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sourceImage = typeof body.sourceImage === "string" ? body.sourceImage : "";
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const sessionKey = request.headers.get("x-session-id") || "anonymous";
    const lastRequest = recentRequests.get(sessionKey) || 0;
    if (Date.now() - lastRequest < 1200) {
      return Response.json({ error: "กรุณารอสักครู่ก่อนสร้างภาพอีกครั้ง" }, { status: 429 });
    }
    if (!sourceImage || !prompt) return Response.json({ error: "ต้องมีภาพต้นฉบับและไอเดียก่อนสร้างภาพ" }, { status: 400 });
    recentRequests.set(sessionKey, Date.now());
    const release = acquireGenerationSlot(sessionKey);
    try {
      const result = await generateImage({ sourceImage, sourceImageId: body.sourceImageId, prompt, lens: body.lens });
      return Response.json(result);
    } finally {
      release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("remix_route_error", message || "unknown error");
    if (message === "GENERATION_QUEUE_FULL") return Response.json({ error: "ตอนนี้มีคนกำลังสร้างภาพหลายคน ลองอีกครั้งในอีกสักครู่" }, { status: 429 });
    if (message === "SESSION_QUOTA_REACHED") return Response.json({ error: `ใช้สิทธิ์สร้างภาพและ Remix ครบ ${getGenerationLimit()} ครั้งแล้ว คัดลอกคำสั่งตั้งต้นและไอเดียของคุณไปใช้ต่อใน ChatGPT ของตัวเองได้เลย` }, { status: 429 });
    if (message === "IMAGE_PROVIDER_TIMEOUT") return Response.json({ error: "AI ใช้เวลานานเกินไป ลองสร้างเวอร์ชันใหม่อีกครั้งในอีกสักครู่ ไอเดียของคุณยังอยู่" }, { status: 504 });
    return Response.json({ error: "สร้างภาพไม่สำเร็จ ลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
