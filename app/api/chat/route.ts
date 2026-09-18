import { chatIdea, type ChatMessage, type ChatMode } from "../../../lib/ai/provider";

const CHAT_ROUND_LIMIT = 4;
const chatRounds = new Map<string, number>();

function readHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter((message): message is { role: ChatMessage["role"]; content: string } => Boolean(message) && typeof message === "object" && "role" in message && "content" in message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string").map((message) => ({ role: message.role, content: message.content.trim().slice(0, 600) })).filter((message) => message.content).slice(-6);
}

export async function POST(request: Request) {
  let countedCoachRound = false; let previousRounds = 0; let sessionKey = "anonymous";
  try {
    const body = await request.json();
    const language = body.language === "en" ? "en" : "th";
    const idea = typeof body.idea === "string" ? body.idea.trim() : "";
    const lens = typeof body.lens === "string" ? body.lens : "Contrast";
    const mode: ChatMode = body.mode === "coach" ? "coach" : "prompt";
    const history = readHistory(body.history);
    if (mode === "coach" && !idea) return Response.json({ error: language === "en" ? "Please share an idea first." : "กรุณาเล่าไอเดียก่อนคุยต่อ" }, { status: 400 });
    if (mode === "prompt" && !idea && history.length === 0) return Response.json({ error: language === "en" ? "Please share an idea first." : "กรุณาเล่าไอเดียก่อน" }, { status: 400 });
    sessionKey = (request.headers.get("x-session-id") || "anonymous").slice(0, 120);
    previousRounds = chatRounds.get(sessionKey) || 0;
    if (mode === "coach") { if (previousRounds >= CHAT_ROUND_LIMIT) return Response.json({ error: language === "en" ? "4 rounds are complete. Create your Visual Prompt." : "คุยครบ 4 รอบแล้ว กดสร้าง Visual Prompt ได้เลย" }, { status: 429 }); chatRounds.set(sessionKey, previousRounds + 1); countedCoachRound = true; }
    return Response.json(await chatIdea(idea || (language === "en" ? "Summarize this conversation as a Visual Prompt" : "ช่วยสรุปบทสนทนานี้เป็น Visual Prompt"), lens, history, mode, language));
  } catch (error) {
    if (countedCoachRound) { if (previousRounds > 0) chatRounds.set(sessionKey, previousRounds); else chatRounds.delete(sessionKey); }
    console.error("chat_route_error", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "ช่วยสรุปไอเดียไม่สำเร็จ" }, { status: 500 });
  }
}
