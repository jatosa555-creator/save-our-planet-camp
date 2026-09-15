import { isOpenRouterConfigured } from "../../../lib/ai/provider";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    status: "ok",
    app: "save-our-planet-camp",
    time: new Date().toISOString(),
    aiGateway: process.env.AI_GATEWAY || "openrouter",
    openRouterConfigured: isOpenRouterConfigured(),
    setupEnabled: process.env.NODE_ENV !== "production",
    textModelConfigured: Boolean(process.env.TEXT_MODEL),
    imageModelConfigured: Boolean(process.env.IMAGE_MODEL_DEFAULT),
  });
}
