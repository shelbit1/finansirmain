import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPaidUserIdOrForbidden, handleZod, jsonError, readJson } from "@/lib/api";
import { aiAskSchema } from "@/lib/rentierValidators";
import {
  buildPortfolioSystemPrompt,
  buildPortfolioUserMessage,
  buildPropertySystemPrompt,
  buildPropertyUserMessage,
} from "@/lib/rentierPrompts";
import { askKieAI, KIE_CLAUDE_MODEL } from "@/lib/kieai";

const AI_MODEL = KIE_CLAUDE_MODEL;

export async function GET(req: Request) {
  const auth = await getPaidUserIdOrForbidden();
  if ("response" in auth) return auth.response;

  const url = new URL(req.url);
  const propertyId = url.searchParams.get("propertyId");

  const analyses = await prisma.rentierAIAnalysis.findMany({
    where: {
      userId: auth.userId,
      propertyId: propertyId ?? null,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ analyses });
}

export async function POST(req: Request) {
  const auth = await getPaidUserIdOrForbidden();
  if ("response" in auth) return auth.response;

  let parsed;
  try {
    const body = await readJson(req);
    parsed = aiAskSchema.parse(body);
  } catch (e) {
    const zod = handleZod(e);
    if (zod) return zod;
    return jsonError((e as Error).message);
  }

  let systemPrompt: string;
  let userMessage: string;

  if (parsed.propertyId) {
    const property = await prisma.rentierProperty.findUnique({
      where: { id: parsed.propertyId },
      include: { tenants: true },
    });
    if (!property || property.userId !== auth.userId) {
      return jsonError("Объект не найден", 404);
    }
    systemPrompt = buildPropertySystemPrompt();
    userMessage = buildPropertyUserMessage(property, parsed.prompt);
  } else {
    const properties = await prisma.rentierProperty.findMany({
      where: { userId: auth.userId },
      include: { tenants: true },
      orderBy: { createdAt: "asc" },
    });
    if (properties.length === 0) {
      return jsonError(
        "В портфеле пока нет объектов — добавьте хотя бы один, чтобы спросить ИИ.",
      );
    }
    systemPrompt = buildPortfolioSystemPrompt();
    userMessage = buildPortfolioUserMessage(properties, parsed.prompt);
  }

  let response: string;
  try {
    response = await askKieAI(
      [{ role: "user", content: userMessage }],
      systemPrompt,
    );
  } catch (e) {
    return jsonError(
      `ИИ временно недоступен: ${(e as Error).message}`,
      502,
    );
  }

  const saved = await prisma.rentierAIAnalysis.create({
    data: {
      userId: auth.userId,
      propertyId: parsed.propertyId ?? null,
      prompt: parsed.prompt,
      response,
      model: AI_MODEL,
    },
  });

  return NextResponse.json({ id: saved.id, response });
}
