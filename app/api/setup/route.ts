import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { configureOpenRouterKey, getOpenRouterApiKey } from "../../../lib/ai/provider";

export const dynamic = "force-dynamic";

function isLocalSetupEnabled() {
  return process.env.NODE_ENV !== "production";
}

async function saveKeyToEnvFile(key: string) {
  const envPath = path.join(process.cwd(), ".env.local");
  let content = "";
  try {
    content = await readFile(envPath, "utf8");
  } catch {
    content = "";
  }

  const lines = content.split(/\r?\n/);
  let replaced = false;
  const nextLines = lines.map((line) => {
    if (/^OPENROUTER_API_KEY=/.test(line)) {
      replaced = true;
      return `OPENROUTER_API_KEY=${key}`;
    }
    return line;
  });
  if (!replaced) nextLines.push(`OPENROUTER_API_KEY=${key}`);
  await writeFile(envPath, `${nextLines.filter((line, index, all) => index < all.length - 1 || line !== "").join("\n")}\n`, "utf8");
}

export async function GET() {
  return Response.json({
    configured: Boolean(getOpenRouterApiKey()),
    enabled: isLocalSetupEnabled(),
  });
}

export async function POST(request: Request) {
  if (!isLocalSetupEnabled()) {
    return Response.json({ error: "ตั้งค่าคีย์ผ่านไฟล์ Environment ของเซิร์ฟเวอร์เท่านั้น" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const key = typeof body.key === "string" ? body.key.trim() : "";
    if (!key || /\s/.test(key) || key.length > 500) {
      return Response.json({ error: "รูปแบบ API Key ไม่ถูกต้อง" }, { status: 400 });
    }

    const validation = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!validation.ok) {
      return Response.json({ error: "คีย์นี้ใช้เชื่อมต่อ OpenRouter ไม่ได้ กรุณาตรวจอีกครั้ง" }, { status: 400 });
    }

    await saveKeyToEnvFile(key);
    configureOpenRouterKey(key);
    return Response.json({ ok: true, configured: true });
  } catch {
    return Response.json({ error: "บันทึกคีย์ไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
}
