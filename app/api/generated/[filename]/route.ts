import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET(_request: Request, context: { params: Promise<{ filename: string }> }) {
  const { filename } = await context.params;
  if (!/^[a-zA-Z0-9-]+\.png$/.test(filename)) return new Response("Not found", { status: 404 });
  const dataRoot = process.env.GENERATED_DATA_DIR || (process.env.NODE_ENV === "production" ? "/data/generated" : path.join(process.cwd(), "data", "generated"));
  try {
    const bytes = await readFile(path.join(dataRoot, filename));
    return new Response(bytes, { headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
