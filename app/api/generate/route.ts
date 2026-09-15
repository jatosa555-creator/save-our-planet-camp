import { generateImage } from "../../../lib/ai/provider";
import { acquireGenerationSlot, getGenerationLimit } from "../../../lib/ai/limits";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const sourceImage = typeof body.sourceImage === "string" ? body.sourceImage : undefined;
    if (!prompt) return Response.json({ error: "กรุณาใส่ไอเดียก่อนสร้างภาพ" }, { status: 400 });
    if (sourceImage && (!sourceImage.startsWith("data:image/") || sourceImage.length > 8_000_000)) {
      return Response.json({ error: "รูปอ้างอิงต้องเป็นไฟล์ภาพและมีขนาดไม่เกิน 6 MB หลังการย่อ" }, { status: 413 });
    }
    const sessionKey = request.headers.get("x-session-id") || "anonymous";
    const release = acquireGenerationSlot(sessionKey);
    try {
      return Response.json(await generateImage({ prompt, sourceImage }));
    } finally {
      release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("generate_route_error", message || "unknown error");
    if (message === "GENERATION_QUEUE_FULL") return Response.json({ error: "ตอนนี้มีคนกำลังสร้างภาพหลายคน ลองอีกครั้งในอีกสักครู่" }, { status: 429 });
    if (message === "SESSION_QUOTA_REACHED") return Response.json({ error: `ใช้สิทธิ์สร้างภาพครบ ${getGenerationLimit()} ครั้งแล้ว คัดลอก Visual Prompt และไอเดียของคุณไปใช้ต่อใน ChatGPT ของตัวเองได้เลย` }, { status: 429 });
    if (message === "IMAGE_PROVIDER_TIMEOUT") return Response.json({ error: "AI ใช้เวลานานเกินไป ลองสร้างใหม่อีกครั้งในอีกสักครู่ ไอเดียของคุณยังอยู่" }, { status: 504 });
    return Response.json({ error: "สร้างภาพไม่สำเร็จ ลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
