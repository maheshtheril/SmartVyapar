import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { cleanHumanReadableAiError } from "@/lib/ai-invoice-scanner";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
    
    // Rate limit: 5 tests per 5 minutes per tenant
    const rateLimit = checkRateLimit(`ai-test:${session.tenantId}`, 5, 5 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many AI key tests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.resetInSeconds) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const keyToTest = body.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!keyToTest || keyToTest.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          error: "No Google Gemini API key provided to test. Please enter a key.",
        },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(keyToTest.trim());
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const startTime = Date.now();
    const result = await model.generateContent("Ping test for SmartVyapar ERP. Respond with 'OK'.");
    const latencyMs = Date.now() - startTime;
    const reply = result.response.text();

    return NextResponse.json({
      success: true,
      model: "gemini-2.5-flash",
      latencyMs,
      reply: reply.trim(),
      message: `Active & Operational. Connected to Gemini 2.5 Flash in ${latencyMs}ms.`,
    });
  } catch (err: any) {
    console.error("Error in /api/ai/test-key:", err);
    return NextResponse.json(
      {
        success: false,
        error: cleanHumanReadableAiError(err),
      },
      { status: 400 }
    );
  }
}
