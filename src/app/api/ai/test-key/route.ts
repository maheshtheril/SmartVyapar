import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { cleanHumanReadableAiError } from "@/lib/ai-invoice-scanner";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(req);
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
