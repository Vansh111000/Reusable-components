/**
 * app/api/ask-ai/route.js
 *
 * The server-side endpoint that lib/ai/askAi.js calls. This is where your
 * GEMINI_API_KEY / GROQ_API_KEY actually get used — they never reach the
 * browser.
 *
 * POST /api/ask-ai
 * Request body:
 *   {
 *     prompt: string,              // required
 *     context?: string,            // optional system prompt / persona
 *     provider?: "gemini" | "groq",// optional, defaults to config.js
 *     model?: string,              // optional, defaults to provider's default
 *     temperature?: number,
 *     maxTokens?: number
 *   }
 *
 * Response body (200):
 *   { text: string, provider: string, model: string }
 * Response body (400/500):
 *   { error: string }
 */

import { NextResponse } from "next/server";
import { callGemini } from "@/lib/ai/providers/gemini";
import { callGroq } from "@/lib/ai/providers/groq";
import { AI_PROVIDERS, DEFAULT_PROVIDER, DEFAULT_MODEL } from "@/lib/ai/config";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      prompt,
      context,
      provider = DEFAULT_PROVIDER,
      model,
      temperature,
      maxTokens,
    } = body || {};

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "`prompt` (string) is required." },
        { status: 400 }
      );
    }

    if (!AI_PROVIDERS[provider]) {
      return NextResponse.json(
        {
          error: `Unknown provider "${provider}". Use one of: ${Object.keys(
            AI_PROVIDERS
          ).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const resolvedModel =
      model || AI_PROVIDERS[provider].defaultModel || DEFAULT_MODEL;

    const callArgs = {
      prompt,
      context,
      model: resolvedModel,
      temperature,
      maxTokens,
    };

    const result =
      provider === "gemini" ? await callGemini(callArgs) : await callGroq(callArgs);

    return NextResponse.json({
      text: result.text,
      provider,
      model: resolvedModel,
    });
  } catch (err) {
    console.error("[/api/ask-ai] error:", err);
    return NextResponse.json(
      { error: err.message || "Something went wrong while calling the AI provider." },
      { status: 500 }
    );
  }
}
